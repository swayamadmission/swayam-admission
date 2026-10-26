import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CommunicationChannel,
  CommunicationDeliveryStatus,
  NotificationPriority,
  NotificationType,
} from '@prisma/client';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import {
  buildOtpEmailHtml,
  buildForgotPasswordOtpEmailHtml,
  buildPasswordResetSuccessEmailHtml,
  buildWelcomeEmailHtml,
  buildEmployeeActivationEmailHtml,
  buildEmployeeActivationSuccessEmailHtml,
  buildEmployeeAdminPasswordResetEmailHtml,
  EmployeeActivationEmailTemplateParams,
  EmployeeActivationSuccessTemplateParams,
  EmployeePasswordResetEmailTemplateParams,
} from './email-templates';

export interface ChannelSendResult {
  channel: CommunicationChannel;
  success: boolean;
  status: CommunicationDeliveryStatus;
  providerMessageId?: string;
  errorMessage?: string;
  failureReason?: string;
  isRetryable?: boolean;
  isQuotaExceeded?: boolean;
}

export interface ChannelMessagePayload {
  title: string;
  subject?: string;
  message: string;
  smsBody?: string;
  whatsAppTemplateName?: string;
  whatsAppBody?: string;
  emailHtml?: string;
  emailText?: string;
  actionUrl?: string;
  priority?: NotificationPriority;
  category?: string;
}

export interface INotificationChannel {
  readonly channelName: CommunicationChannel;
  send(
    recipient: { id: string; name: string; email?: string; mobile?: string; type: string },
    payload: ChannelMessagePayload,
    metadata?: Record<string, any>,
  ): Promise<ChannelSendResult>;
  isEnabled(): boolean;
  getHealth():
    | {
        status:
          | 'HEALTHY'
          | 'READY'
          | 'CONFIGURED'
          | 'UNCONFIGURED'
          | 'DEGRADED'
          | 'BLOCKED'
          | 'FAILED'
          | 'DISABLED'
          | 'STUB_ACTIVE';
        message: string;
        [key: string]: any;
      }
    | Promise<{
        status:
          | 'HEALTHY'
          | 'READY'
          | 'CONFIGURED'
          | 'UNCONFIGURED'
          | 'DEGRADED'
          | 'BLOCKED'
          | 'FAILED'
          | 'DISABLED'
          | 'STUB_ACTIVE';
        message: string;
        [key: string]: any;
      }>;
}

/**
 * In-App Notification Channel — stores persistent notifications in database.
 */
@Injectable()
export class InAppChannel implements INotificationChannel {
  private readonly logger = new Logger(InAppChannel.name);
  readonly channelName = CommunicationChannel.IN_APP;

  constructor(private readonly prisma: PrismaService) {}

  isEnabled(): boolean {
    return true; // Always enabled
  }

  getHealth() {
    return { status: 'HEALTHY' as const, message: 'Database persistent storage active' };
  }

  async send(
    recipient: { id: string; name: string; email?: string; mobile?: string; type: string },
    payload: ChannelMessagePayload,
    metadata?: Record<string, any>,
  ): Promise<ChannelSendResult> {
    try {
      if (recipient.type === 'LEAD') {
        return {
          channel: this.channelName,
          success: false,
          status: CommunicationDeliveryStatus.SKIPPED,
          failureReason: 'In-app notification requires a registered user account',
          isRetryable: false,
        };
      }

      const notif = await this.prisma.notification.create({
        data: {
          title: payload.title,
          message: payload.message,
          shortMessage: payload.message.slice(0, 100),
          userId: recipient.id,
          receiverId: recipient.id,
          type: (payload.category as NotificationType) || NotificationType.SYSTEM,
          priority: payload.priority || NotificationPriority.MEDIUM,
          category: payload.category || 'SYSTEM',
          actionUrl: payload.actionUrl || null,
          metadata: metadata ? (metadata as any) : undefined,
        },
      });

      return {
        channel: this.channelName,
        success: true,
        status: CommunicationDeliveryStatus.DELIVERED,
        providerMessageId: notif.id,
      };
    } catch (err: any) {
      this.logger.error(`InApp delivery error: ${err.message}`);
      return {
        channel: this.channelName,
        success: false,
        status: CommunicationDeliveryStatus.FAILED,
        errorMessage: err.message,
        failureReason: 'Database insertion error',
        isRetryable: true,
      };
    }
  }
}

export {
  buildOtpEmailHtml,
  buildForgotPasswordOtpEmailHtml,
  buildPasswordResetSuccessEmailHtml,
  buildWelcomeEmailHtml,
};

/**
 * Email Notification Channel — Nodemailer SMTP backed with graceful dev fallback.
 */
@Injectable()
export class EmailChannel implements INotificationChannel {
  private readonly logger = new Logger(EmailChannel.name);
  readonly channelName = CommunicationChannel.EMAIL;
  private cachedTransporter: nodemailer.Transporter | null = null;
  private lastTransporterKey = '';
  private lastHealthStatus: 'UNCONFIGURED' | 'CONFIGURED' | 'READY' | 'DEGRADED' | 'BLOCKED' = 'UNCONFIGURED';
  private lastHealthMessage = '';
  private lastTestedAt: Date | null = null;
  private quotaBlockedUntil: Date | null = null;

  constructor(private readonly prisma: PrismaService) {}

  isEnabled(): boolean {
    return true;
  }

  /**
   * Sets the email provider quota cooldown on this channel.
   */
  setQuotaCooldown(cooldownUntil: Date, reason: string = 'PROVIDER_QUOTA_EXCEEDED') {
    this.quotaBlockedUntil = cooldownUntil;
    this.lastHealthStatus = 'BLOCKED';
    this.lastHealthMessage = `Provider sending quota exceeded: ${reason}`;
    this.logger.warn(`[EMAIL CHANNEL] Quota cooldown set until ${cooldownUntil.toISOString()}`);
  }

  /**
   * Resets the email provider quota cooldown on this channel.
   */
  resetQuotaCooldown() {
    this.quotaBlockedUntil = null;
    this.lastHealthStatus = 'CONFIGURED';
    this.lastHealthMessage = 'Quota cooldown reset. Ready for outbound delivery attempts.';
    this.logger.log('[EMAIL CHANNEL] Provider quota cooldown manually reset.');
  }

  async getHealth() {
    const config = await this.resolveSmtpConfig();
    const isConfigured = Boolean(config.user && config.pass);

    if (!isConfigured) {
      return {
        status: 'UNCONFIGURED' as const,
        provider: config.provider,
        host: config.host,
        port: config.port,
        secure: config.secure,
        fromEmail: config.fromEmail,
        source: config.source,
        message:
          'Email transport unconfigured. Set SMTP_USER and SMTP_PASSWORD / SMTP_PASS in environment or Admin OTP settings.',
      };
    }

    // Check persistent DB cooldown if in-memory is not set or expired
    if ((!this.quotaBlockedUntil || new Date() >= this.quotaBlockedUntil) && this.prisma) {
      try {
        const dbConfig = await this.prisma.otpConfiguration.findUnique({
          where: { channel: 'EMAIL' },
          select: { providerUrl: true },
        });
        if (dbConfig?.providerUrl) {
          try {
            const meta = JSON.parse(dbConfig.providerUrl);
            if (meta?.quotaCooldownUntil) {
              const pDate = new Date(meta.quotaCooldownUntil);
              if (!isNaN(pDate.getTime()) && new Date() < pDate) {
                this.quotaBlockedUntil = pDate;
                this.lastHealthStatus = 'BLOCKED';
              }
            }
          } catch {
            // ignore non-JSON
          }
        }
      } catch {
        // safe fallback
      }
    }

    const isQuotaBlocked = Boolean(this.quotaBlockedUntil && new Date() < this.quotaBlockedUntil);
    const healthStatus: 'CONFIGURED' | 'READY' | 'DEGRADED' | 'BLOCKED' = isQuotaBlocked
      ? 'BLOCKED'
      : this.lastHealthStatus === 'READY'
      ? 'READY'
      : this.lastHealthStatus === 'DEGRADED'
      ? 'DEGRADED'
      : 'CONFIGURED';

    const maskedUser = config.user.includes('@')
      ? `${config.user.slice(0, 3)}***@${config.user.split('@')[1]}`
      : `${config.user.slice(0, 3)}***`;

    const statusMessage = isQuotaBlocked
      ? `Email transport BLOCKED: daily quota sending limit exceeded. Blocked until ${this.quotaBlockedUntil?.toISOString()}`
      : healthStatus === 'READY'
      ? `Email transport READY: ${config.provider} active on ${config.host}:${config.port} via ${maskedUser}`
      : healthStatus === 'DEGRADED'
      ? `Email transport DEGRADED: ${this.lastHealthMessage || 'Recent connection error'}`
      : `Email transport CONFIGURED: ${config.provider} configured on ${config.host}:${config.port} via ${maskedUser}. Awaiting verified delivery.`;

    return {
      status: healthStatus,
      provider: config.provider,
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: maskedUser,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      source: config.source,
      quotaBlocked: isQuotaBlocked,
      quotaBlockedUntil: this.quotaBlockedUntil ? this.quotaBlockedUntil.toISOString() : null,
      lastTestedAt: this.lastTestedAt ? this.lastTestedAt.toISOString() : null,
      message: statusMessage,
    };
  }

  /**
   * Diagnostic test: performs live SMTP handshake and authentication without sending email.
   * Accurately transitions health state to READY, BLOCKED, or DEGRADED.
   */
  async verifyConnection(): Promise<{
    success: boolean;
    status: 'READY' | 'DEGRADED' | 'BLOCKED' | 'UNCONFIGURED';
    message: string;
    provider: string;
  }> {
    const config = await this.resolveSmtpConfig();
    if (!config.user || !config.pass) {
      this.lastHealthStatus = 'UNCONFIGURED';
      return {
        success: false,
        status: 'UNCONFIGURED',
        message: 'SMTP credentials are not configured on the server',
        provider: config.provider,
      };
    }

    try {
      const { transporter } = await this.getTransporter();
      if (!transporter) {
        this.lastHealthStatus = 'UNCONFIGURED';
        return {
          success: false,
          status: 'UNCONFIGURED',
          message: 'Transporter creation failed',
          provider: config.provider,
        };
      }

      await transporter.verify();
      this.lastTestedAt = new Date();

      if (this.quotaBlockedUntil && new Date() < this.quotaBlockedUntil) {
        return {
          success: false,
          status: 'BLOCKED',
          message: `SMTP connection established, but outbound data transmission is BLOCKED by daily sending quota until ${this.quotaBlockedUntil.toISOString()}`,
          provider: config.provider,
        };
      }

      this.lastHealthStatus = 'READY';
      this.lastHealthMessage = `SMTP handshake and authentication verified for ${config.provider} (${config.host}:${config.port})`;
      return {
        success: true,
        status: 'READY',
        message: this.lastHealthMessage,
        provider: config.provider,
      };
    } catch (err: any) {
      this.lastTestedAt = new Date();
      const errStr = (err?.message || '').toLowerCase();
      if (
        errStr.includes('550-5.4.5') ||
        errStr.includes('daily user sending limit') ||
        errStr.includes('quota exceeded') ||
        errStr.includes('sending limit exceeded')
      ) {
        this.lastHealthStatus = 'BLOCKED';
        this.quotaBlockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        this.lastHealthMessage = `Provider sending quota exceeded: ${err.message}`;
        return {
          success: false,
          status: 'BLOCKED',
          message: this.lastHealthMessage,
          provider: config.provider,
        };
      }

      this.lastHealthStatus = 'DEGRADED';
      this.lastHealthMessage = `SMTP connection failed: ${err.message}`;
      return {
        success: false,
        status: 'DEGRADED',
        message: this.lastHealthMessage,
        provider: config.provider,
      };
    }
  }

  public async resolveSmtpConfig(): Promise<{
    provider: 'AMAZON_SES' | 'SENDGRID' | 'GMAIL' | 'SMTP';
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromEmail: string;
    fromName: string;
    source: 'DATABASE' | 'ENVIRONMENT' | 'UNCONFIGURED';
  }> {
    // 1. Resolve Provider and Credentials from Environment Variables (.env / Render runtime)
    const rawProvider = (process.env.EMAIL_PROVIDER || '').trim().toUpperCase();
    const rawEnvHost = (process.env.SMTP_HOST || '').trim();

    let provider: 'AMAZON_SES' | 'SENDGRID' | 'GMAIL' | 'SMTP' = 'SMTP';
    let defaultHost = 'smtp.gmail.com';
    let defaultUser = (process.env.SMTP_USER || '').trim();
    const rawPass = (process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '').trim();
    let defaultPass = rawPass.replace(/\s+/g, '');

    if (rawProvider === 'SES' || rawProvider === 'AMAZON_SES' || rawEnvHost.includes('amazonaws.com')) {
      provider = 'AMAZON_SES';
      const sesRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
      defaultHost = rawEnvHost || `email-smtp.${sesRegion}.amazonaws.com`;
      defaultUser = (process.env.SMTP_USER || process.env.AWS_SES_SMTP_USERNAME || '').trim();
      defaultPass = (process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.AWS_SES_SMTP_PASSWORD || '').trim().replace(/\s+/g, '');
    } else if (rawProvider === 'SENDGRID' || rawEnvHost.includes('sendgrid.net')) {
      provider = 'SENDGRID';
      defaultHost = rawEnvHost || 'smtp.sendgrid.net';
      defaultUser = (process.env.SMTP_USER || 'apikey').trim();
      defaultPass = (process.env.SENDGRID_API_KEY || process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');
    } else if (rawProvider === 'GMAIL' || rawEnvHost.includes('gmail.com')) {
      provider = 'GMAIL';
      defaultHost = rawEnvHost || 'smtp.gmail.com';
    } else {
      provider = 'SMTP';
      defaultHost = rawEnvHost || 'smtp.gmail.com';
    }

    const envPort = parseInt(process.env.SMTP_PORT || '587', 10);
    // Port 587 uses STARTTLS (secure: false); Port 465 uses direct SSL/TLS (secure: true)
    const isSecure = process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : envPort === 465;

    const envFromName = (process.env.SMTP_FROM_NAME || 'Swayam Admission').trim();
    const envFromEmail = (
      process.env.SMTP_FROM ||
      process.env.SMTP_FROM_EMAIL ||
      defaultUser ||
      'swayamadmissions@gmail.com'
    ).trim();

    if (defaultUser && defaultPass && !defaultPass.includes('*') && !defaultPass.includes('•')) {
      return {
        provider,
        host: defaultHost,
        port: envPort,
        secure: isSecure,
        user: defaultUser,
        pass: defaultPass,
        fromEmail: envFromEmail,
        fromName: envFromName,
        source: 'ENVIRONMENT',
      };
    }

    // 2. Check DB OtpConfiguration if explicitly enabled with unmasked credentials
    try {
      const dbConfig = await this.prisma.otpConfiguration.findUnique({
        where: { channel: 'EMAIL' },
      });
      const rawDbPass = (dbConfig?.apiPassword || '').trim();
      const cleanDbPass = rawDbPass.replace(/\s+/g, '');
      const user = (dbConfig?.apiUser || dbConfig?.fromEmail || dbConfig?.senderId || '').trim();
      const port = dbConfig?.apiPort || envPort;
      const host = dbConfig?.apiHost?.trim() || defaultHost;

      if (
        dbConfig &&
        dbConfig.enabled &&
        cleanDbPass &&
        !cleanDbPass.includes('*') &&
        !cleanDbPass.includes('•') &&
        user
      ) {
        const dbProvider = host.includes('amazonaws.com')
          ? 'AMAZON_SES'
          : host.includes('sendgrid.net')
          ? 'SENDGRID'
          : host.includes('gmail.com')
          ? 'GMAIL'
          : 'SMTP';

        return {
          provider: dbProvider,
          host,
          port,
          secure: port === 465,
          user,
          pass: cleanDbPass,
          fromEmail: dbConfig.fromEmail || user,
          fromName: dbConfig.fromName || envFromName,
          source: 'DATABASE',
        };
      }
    } catch {
      // Safe fallback if DB is unreachable
    }

    // 3. Unconfigured state fallback
    return {
      provider,
      host: defaultHost,
      port: envPort,
      secure: isSecure,
      user: '',
      pass: '',
      fromEmail: envFromEmail || 'swayamadmissions@gmail.com',
      fromName: envFromName,
      source: 'UNCONFIGURED',
    };
  }

  private async getTransporter(): Promise<{ transporter: nodemailer.Transporter | null; from: string }> {
    const config = await this.resolveSmtpConfig();
    const from = `"${config.fromName}" <${config.fromEmail || config.user || 'swayamadmissions@gmail.com'}>`;

    if (!config.user || !config.pass) {
      return { transporter: null, from };
    }

    const currentKey = `${config.host}:${config.port}:${config.user}:${config.secure}:${config.pass}`;
    if (!this.cachedTransporter || this.lastTransporterKey !== currentKey) {
      this.cachedTransporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        family: 4, // Enforce IPv4 to prevent ENETUNREACH errors on IPv6-restricted cloud runtimes
        secure: config.secure, // Port 587 = STARTTLS (false); Port 465 = direct TLS (true)
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        },
        connectionTimeout: 10000, // 10s connection timeout
        greetingTimeout: 10000,   // 10s greeting timeout
        socketTimeout: 15000,    // 15s socket timeout
      } as any);
      this.lastTransporterKey = currentKey;
    }

    return { transporter: this.cachedTransporter, from };
  }

  async send(
    recipient: { id: string; name: string; email?: string; mobile?: string; type: string },
    payload: ChannelMessagePayload,
    _metadata?: Record<string, any>,
  ): Promise<ChannelSendResult> {
    if (!recipient.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
      return {
        channel: this.channelName,
        success: false,
        status: CommunicationDeliveryStatus.SKIPPED,
        failureReason: 'Missing or invalid recipient email address',
        isRetryable: false,
      };
    }

    const normEmail = recipient.email.trim().toLowerCase();

    // Workstream D & Deliverability Safety: Check recipient suppression list
    // Suppress dispatch ONLY if recipient previously had a confirmed permanent hard bounce or complaint.
    // Soft bounces, mailbox full, rate limits, and temporary deferrals are explicitly excluded.
    try {
      const suppressed = await this.prisma.communicationDelivery.findFirst({
        where: {
          recipientEmail: normEmail,
          channel: CommunicationChannel.EMAIL,
          failureReason: { in: ['HARD_BOUNCE', 'COMPLAINT', 'PERMANENT_REJECTION', 'SPAM_REPORT'] },
        },
        select: { id: true, failureReason: true, updatedAt: true },
      });

      if (suppressed) {
        const suppressionReason =
          suppressed.failureReason === 'COMPLAINT' || suppressed.failureReason === 'SPAM_REPORT'
            ? 'RECIPIENT_SUPPRESSED_PREVIOUS_COMPLAINT'
            : 'RECIPIENT_SUPPRESSED_PREVIOUS_HARD_BOUNCE';

        this.logger.warn(
          `[EMAIL SUPPRESSION] Recipient ${normEmail} skipped dispatch due to prior ${suppressed.failureReason || 'BOUNCE'} (Delivery ID: ${suppressed.id})`,
        );

        return {
          channel: this.channelName,
          success: false,
          status: CommunicationDeliveryStatus.SKIPPED,
          failureReason: suppressionReason,
          errorMessage: `Delivery skipped: recipient address is permanently suppressed due to prior bounce/complaint`,
          isRetryable: false,
        };
      }
    } catch (suppressionCheckErr: any) {
      this.logger.warn(`Failed suppression check for ${normEmail}: ${suppressionCheckErr.message}`);
    }

    const subject = payload.subject || payload.title;

    try {
      const { transporter, from } = await this.getTransporter();

      if (!transporter) {
        this.logger.error(
          `[SMTP NOT CONFIGURED] Missing credentials. Delivery to ${recipient.email} skipped.`,
        );
        return {
          channel: this.channelName,
          success: false,
          status: CommunicationDeliveryStatus.FAILED,
          errorMessage: 'SMTP credentials are not configured on the server',
          failureReason: 'MISSING_SMTP_CREDENTIALS',
          isRetryable: true,
        };
      }

      // Live delivery to recipient inbox
      const info = await transporter.sendMail({
        from,
        to: recipient.email,
        subject,
        text: payload.emailText || payload.message,
        html:
          payload.emailHtml ||
          `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1F2937; padding: 16px;">${payload.message.replace(/\n/g, '<br/>')}</div>`,
      });

      this.logger.log(
        `[EMAIL ACCEPTED] ID: ${info.messageId} | To: ${recipient.email} | Subject: "${subject}"`,
      );

      this.lastHealthStatus = 'READY';

      return {
        channel: this.channelName,
        success: true,
        status: CommunicationDeliveryStatus.SENT,
        providerMessageId: info.messageId,
      };
    } catch (err: any) {
      const errMessage = (err?.message || '').toLowerCase();
      const errCode = (err?.code || '').toUpperCase();

      const isQuotaError =
        errMessage.includes('550-5.4.5') ||
        errMessage.includes('daily user sending limit exceeded') ||
        errMessage.includes('sending limit exceeded') ||
        errMessage.includes('quota exceeded') ||
        errMessage.includes('too many messages') ||
        errCode === 'EQUT';

      const isPermanentRejection =
        errMessage.includes('550 5.1.1') ||
        errMessage.includes('user unknown') ||
        errMessage.includes('recipient address rejected') ||
        errMessage.includes('no such user') ||
        errMessage.includes('mailbox unavailable') ||
        errMessage.includes('invalid address') ||
        errCode === 'EENVELOPE';

      if (isQuotaError) {
        this.lastHealthStatus = 'BLOCKED';
        this.quotaBlockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      } else if (isPermanentRejection) {
        // Do not degrade overall health on single bad recipient address
      } else {
        this.lastHealthStatus = 'DEGRADED';
      }

      const failureReason = isQuotaError
        ? 'PROVIDER_QUOTA_EXCEEDED'
        : isPermanentRejection
        ? 'PERMANENT_REJECTION'
        : err?.code || 'SMTP_DISPATCH_ERROR';

      const isRetryable = isQuotaError ? true : isPermanentRejection ? false : true;

      this.logger.error(
        `[EMAIL DELIVERY FAILED] To: ${recipient.email} | Subject: "${subject}" | Reason: ${failureReason} | Error: ${err.message}`,
      );

      return {
        channel: this.channelName,
        success: false,
        status: CommunicationDeliveryStatus.FAILED,
        errorMessage: err.message,
        failureReason,
        isRetryable,
        isQuotaExceeded: isQuotaError,
      };
    }
  }

  /**
   * Helper: Send secure employee activation email with single-use link
   * Never includes any password.
   */
  async sendEmployeeActivationEmail(params: EmployeeActivationEmailTemplateParams): Promise<ChannelSendResult> {
    const html = buildEmployeeActivationEmailHtml(params);
    const text = `Welcome to Swayam Admission, ${params.employeeName}!
Your Employee ID is ${params.employeeId}.
Please activate your account and set your permanent password using this secure link:
${params.activationUrl}

This single-use activation link is valid for ${params.expiryHours || 24} hours. For security reasons, no temporary password is provided.
Login Portal: ${params.portalUrl || process.env.ADMIN_PORTAL_URL || process.env.PORTAL_URL || 'https://swayam-admission-eg2x.vercel.app'}`;

    return this.send(
      {
        id: params.employeeId,
        name: params.employeeName || params.recipientName || 'Staff Member',
        email: params.officialEmail,
        type: 'EMPLOYEE',
      },
      {
        title: 'Activate Your Swayam Admission Staff Account',
        subject: `Welcome to Swayam Admission — Activate Your Account (ID: ${params.employeeId})`,
        message: text,
        emailHtml: html,
        emailText: text,
      },
    );
  }

  /**
   * Helper: Send confirmation email upon successful employee activation
   */
  async sendEmployeeActivationSuccessEmail(params: EmployeeActivationSuccessTemplateParams): Promise<ChannelSendResult> {
    const html = buildEmployeeActivationSuccessEmailHtml(params);
    const text = `Welcome ${params.employeeName}! Your Swayam Admission employee account (ID: ${params.employeeId}) has been successfully activated. You can now log in at ${params.portalUrl}`;

    return this.send(
      {
        id: params.employeeId,
        name: params.employeeName,
        email: params.officialEmail,
        type: 'EMPLOYEE',
      },
      {
        title: 'Account Activated Successfully — Swayam Admission',
        subject: 'Account Activated Successfully — Swayam Admission',
        message: text,
        emailHtml: html,
        emailText: text,
      },
    );
  }

  /**
   * Helper: Send secure single-use employee password reset link (admin-initiated)
   * Never includes any plaintext temporary password.
   */
  async sendEmployeePasswordResetEmail(
    params: EmployeePasswordResetEmailTemplateParams,
  ): Promise<ChannelSendResult> {
    const html = buildEmployeeAdminPasswordResetEmailHtml(params);
    const text = `Dear ${params.employeeName},
An authorized administrator has issued a secure password recovery request for your official Swayam Admission account (Employee ID: ${params.employeeId}).
Please click the link below to configure your permanent password:
${params.resetUrl}

This single-use link is valid for ${params.expiryHours || 24} hours. For security reasons, no temporary password has been generated.
Portal: ${params.portalUrl || process.env.ADMIN_PORTAL_URL || process.env.PORTAL_URL || 'https://swayam-admission-eg2x.vercel.app'}`;

    return this.send(
      {
        id: params.employeeId,
        name: params.employeeName,
        email: params.officialEmail,
        type: 'EMPLOYEE',
      },
      {
        title: 'Password Recovery Request — Swayam Admission',
        subject: `Password Recovery Request for Employee ID: ${params.employeeId} — Swayam Admission`,
        message: text,
        emailHtml: html,
        emailText: text,
      },
    );
  }
}

/**
 * SMS Notification Channel — Twilio / MSG91 / HTTP SMS Gateway backed.
 */
@Injectable()
export class SmsChannel implements INotificationChannel {
  private readonly logger = new Logger(SmsChannel.name);
  readonly channelName = CommunicationChannel.SMS;

  constructor(private readonly prisma: PrismaService) {}

  isEnabled(): boolean {
    return true;
  }

  async resolveSmsConfig() {
    try {
      const dbConfig = await this.prisma.otpConfiguration.findUnique({
        where: { channel: 'SMS' },
      });
      const rawApiKey = (dbConfig?.apiKey || '').trim();
      const apiKey = (
        rawApiKey && !rawApiKey.includes('*') && !rawApiKey.includes('•')
          ? rawApiKey
          : (process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY || '')
      ).trim();

      const route = (process.env.FAST2SMS_ROUTE || (dbConfig?.provider === 'dlt' ? 'dlt' : 'q')).trim();
      const senderId = (dbConfig?.senderId || process.env.FAST2SMS_SENDER_ID || '').trim();
      const isEnabled = dbConfig ? dbConfig.enabled : true;
      const isConfigured = Boolean(isEnabled && apiKey);

      return {
        isConfigured,
        apiKey,
        route,
        senderId,
      };
    } catch {
      const apiKey = (process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY || '').trim();
      return {
        isConfigured: Boolean(apiKey),
        apiKey,
        route: (process.env.FAST2SMS_ROUTE || 'q').trim(),
        senderId: (process.env.FAST2SMS_SENDER_ID || '').trim(),
      };
    }
  }

  async getHealth() {
    const config = await this.resolveSmsConfig();
    if (!config.isConfigured || !config.apiKey) {
      return {
        status: 'UNCONFIGURED' as const,
        message: 'Fast2SMS Gateway unconfigured. Configure FAST2SMS_API_KEY in server environment or Admin OTP settings.',
      };
    }
    return {
      status: 'CONFIGURED' as const,
      message: `Fast2SMS Gateway configured (Route: ${config.route}${config.senderId ? `, Sender: ${config.senderId}` : ''})`,
    };
  }

  async send(
    recipient: { id: string; name: string; email?: string; mobile?: string; type: string },
    payload: ChannelMessagePayload,
    _metadata?: Record<string, any>,
  ): Promise<ChannelSendResult> {
    if (!recipient.mobile || recipient.mobile.length < 8) {
      return {
        channel: this.channelName,
        success: false,
        status: CommunicationDeliveryStatus.SKIPPED,
        failureReason: 'Missing or invalid recipient mobile number',
        isRetryable: false,
      };
    }

    const config = await this.resolveSmsConfig();
    if (!config.isConfigured || !config.apiKey) {
      this.logger.warn(
        `[SMS UNCONFIGURED] No SMS provider credentials configured. Delivery to ${recipient.mobile} failed.`,
      );
      return {
        channel: this.channelName,
        success: false,
        status: CommunicationDeliveryStatus.FAILED,
        errorMessage: 'SMS Gateway is not configured. Please configure an approved SMS provider in server environment or Admin OTP settings.',
        failureReason: 'UNCONFIGURED_PROVIDER',
        isRetryable: false,
      };
    }

    try {
      const cleanMobile = recipient.mobile.replace(/\D/g, '').slice(-10);
      const body = payload.smsBody || payload.message;

      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: config.route || 'q',
          message: body,
          language: 'english',
          flash: 0,
          numbers: cleanMobile,
          ...(config.senderId ? { sender_id: config.senderId } : {}),
        }),
      });

      const data = (await response.json()) as any;
      if (!response.ok || data?.return === false) {
        const errorMsg = data?.message?.[0] || data?.message || `SMS Provider Error (${response.status})`;
        return {
          channel: this.channelName,
          success: false,
          status: CommunicationDeliveryStatus.FAILED,
          errorMessage: errorMsg,
          failureReason: 'SMS_GATEWAY_ERROR',
          isRetryable: response.status >= 500,
        };
      }

      const providerMessageId = data?.request_id || `sms_${Date.now()}`;
      return {
        channel: this.channelName,
        success: true,
        status: CommunicationDeliveryStatus.SENT,
        providerMessageId,
      };
    } catch (err: any) {
      this.logger.error(`SMS delivery error: ${err.message}`);
      return {
        channel: this.channelName,
        success: false,
        status: CommunicationDeliveryStatus.FAILED,
        errorMessage: err.message,
        failureReason: 'SMS Gateway Timeout',
        isRetryable: true,
      };
    }
  }
}

/**
 * WhatsApp Notification Channel — WhatsApp Business Cloud API backed.
 */
@Injectable()
export class WhatsAppChannel implements INotificationChannel {
  private readonly logger = new Logger(WhatsAppChannel.name);
  readonly channelName = CommunicationChannel.WHATSAPP;

  constructor(private readonly prisma: PrismaService) {}

  isEnabled(): boolean {
    return true;
  }

  async resolveWhatsAppConfig() {
    try {
      const dbConfig = await this.prisma.otpConfiguration.findUnique({
        where: { channel: 'WHATSAPP' },
      });
      const phoneNumberId = (
        dbConfig?.phoneNumberId ||
        dbConfig?.senderId ||
        process.env.WHATSAPP_PHONE_NUMBER_ID ||
        ''
      ).trim();
      const rawApiKey = (dbConfig?.apiKey || '').trim();
      const accessToken = (
        rawApiKey && !rawApiKey.includes('*') && !rawApiKey.includes('•')
          ? rawApiKey
          : (process.env.WHATSAPP_ACCESS_TOKEN || '')
      ).trim();

      const apiVersion = (process.env.WHATSAPP_API_VERSION || 'v20.0').trim().replace(/^v?/, 'v');

      const isConfigured = Boolean(
        dbConfig?.enabled && phoneNumberId && accessToken,
      );

      return {
        isConfigured,
        phoneNumberId,
        accessToken,
        apiVersion,
        templateName: dbConfig?.templateName || dbConfig?.templateId || 'hello_world',
      };
    } catch {
      return {
        isConfigured: false,
        phoneNumberId: '',
        accessToken: '',
        apiVersion: (process.env.WHATSAPP_API_VERSION || 'v20.0').trim().replace(/^v?/, 'v'),
        templateName: 'hello_world',
      };
    }
  }

  async getHealth() {
    const config = await this.resolveWhatsAppConfig();
    if (!config.isConfigured) {
      return {
        status: 'UNCONFIGURED' as const,
        message:
          'Meta WhatsApp Cloud API unconfigured. Configure Phone Number ID and Access Token in Admin OTP Settings.',
      };
    }
    return {
      status: 'CONFIGURED' as const,
      message: `Meta WhatsApp Cloud API configured (Phone Number ID: ${config.phoneNumberId}, Version: ${config.apiVersion})`,
    };
  }

  async send(
    recipient: { id: string; name: string; email?: string; mobile?: string; type: string },
    payload: ChannelMessagePayload,
    _metadata?: Record<string, any>,
  ): Promise<ChannelSendResult> {
    if (!recipient.mobile || recipient.mobile.length < 8) {
      return {
        channel: this.channelName,
        success: false,
        status: CommunicationDeliveryStatus.SKIPPED,
        failureReason: 'Missing or invalid mobile number for WhatsApp',
        isRetryable: false,
      };
    }

    const config = await this.resolveWhatsAppConfig();
    if (!config.isConfigured || !config.phoneNumberId || !config.accessToken) {
      this.logger.warn(
        `[WHATSAPP UNCONFIGURED] Missing Meta Cloud API credentials. Delivery to ${recipient.mobile} failed.`,
      );
      return {
        channel: this.channelName,
        success: false,
        status: CommunicationDeliveryStatus.FAILED,
        errorMessage: 'Meta WhatsApp Cloud API credentials are not configured on this server.',
        failureReason: 'UNCONFIGURED_PROVIDER',
        isRetryable: false,
      };
    }

    const cleanMobile = recipient.mobile.replace(/\D/g, ''); // Digits only with country code
    const templateName = payload.whatsAppTemplateName || config.templateName;

    try {
      const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
      let requestBody: any;

      if (templateName && templateName !== 'text_only') {
        requestBody = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanMobile,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en_US' },
          },
        };
      } else {
        requestBody = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanMobile,
          type: 'text',
          text: {
            preview_url: false,
            body: payload.whatsAppBody || payload.message,
          },
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        const errorMsg = data?.error?.message || `Meta API Error (${response.status})`;
        this.logger.error(`Meta WhatsApp dispatch error: ${errorMsg}`);
        return {
          channel: this.channelName,
          success: false,
          status: CommunicationDeliveryStatus.FAILED,
          errorMessage: errorMsg,
          failureReason: 'META_WHATSAPP_API_ERROR',
          isRetryable: response.status >= 500,
        };
      }

      const providerMessageId = data?.messages?.[0]?.id || `wa_${Date.now()}`;
      this.logger.log(`[WHATSAPP DELIVERED] ID: ${providerMessageId} | To: ${cleanMobile}`);

      return {
        channel: this.channelName,
        success: true,
        status: CommunicationDeliveryStatus.SENT,
        providerMessageId,
      };
    } catch (err: any) {
      this.logger.error(`Meta WhatsApp dispatch network exception: ${err.message}`);
      return {
        channel: this.channelName,
        success: false,
        status: CommunicationDeliveryStatus.FAILED,
        errorMessage: err.message,
        failureReason: 'WHATSAPP_NETWORK_ERROR',
        isRetryable: true,
      };
    }
  }
}

/**
 * Authoritative Central Notification Dispatcher.
 */
@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);
  private readonly channels: Map<CommunicationChannel, INotificationChannel>;

  constructor(
    private readonly inAppChannel: InAppChannel,
    private readonly emailChannel: EmailChannel,
    private readonly smsChannel: SmsChannel,
    private readonly whatsAppChannel: WhatsAppChannel,
    @Optional() private readonly prisma?: PrismaService,
  ) {
    this.channels = new Map<CommunicationChannel, INotificationChannel>();
    this.channels.set(CommunicationChannel.IN_APP, this.inAppChannel);
    this.channels.set(CommunicationChannel.EMAIL, this.emailChannel);
    this.channels.set(CommunicationChannel.SMS, this.smsChannel);
    this.channels.set(CommunicationChannel.WHATSAPP, this.whatsAppChannel);
  }

  /**
   * Dispatch a message to a single recipient on specific channel.
   */
  async dispatchChannel(
    channelName: CommunicationChannel,
    recipient: { id: string; name: string; email?: string; mobile?: string; type: string },
    payload: ChannelMessagePayload,
    metadata?: Record<string, any>,
  ): Promise<ChannelSendResult> {
    const channel = this.channels.get(channelName);
    if (!channel || !channel.isEnabled()) {
      return {
        channel: channelName,
        success: false,
        status: CommunicationDeliveryStatus.SKIPPED,
        failureReason: `Channel ${channelName} is disabled or unavailable`,
        isRetryable: false,
      };
    }

    return channel.send(recipient, payload, metadata);
  }

  /**
   * Diagnostic Provider Health status for all channels.
   */
  async getProviderHealth() {
    const [inApp, email, sms, whatsApp] = await Promise.all([
      Promise.resolve(this.inAppChannel.getHealth()),
      this.emailChannel.getHealth(),
      this.smsChannel.getHealth(),
      this.whatsAppChannel.getHealth(),
    ]);

    const isAnyConfigured =
      email.status === 'CONFIGURED' ||
      sms.status === 'CONFIGURED' ||
      whatsApp.status === 'CONFIGURED';

    return {
      IN_APP: inApp,
      EMAIL: email,
      SMS: sms,
      WHATSAPP: whatsApp,
      overallStatus: isAnyConfigured ? 'OPERATIONAL' : 'DEGRADED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Process webhook delivery status callback with idempotency and strict state precedence.
   */
  async handleDeliveryWebhook(
    providerMessageId: string,
    eventStatus: 'SENT' | 'DELIVERED' | 'BOUNCED' | 'FAILED' | 'READ',
    details?: { failureReason?: string; timestamp?: Date; recipientEmail?: string },
  ) {
    if (!providerMessageId && !details?.recipientEmail) {
      return { processed: false, reason: 'Missing providerMessageId and recipientEmail' };
    }

    const cleanMsgId = (providerMessageId || '').trim();
    this.logger.log(
      `[DELIVERY WEBHOOK] ProviderMsgId: ${cleanMsgId || 'N/A'} | Recipient: ${details?.recipientEmail || 'N/A'} -> Status: ${eventStatus}`,
    );

    const deliveryStatusMap: Record<string, CommunicationDeliveryStatus> = {
      SENT: CommunicationDeliveryStatus.SENT,
      DELIVERED: CommunicationDeliveryStatus.DELIVERED,
      READ: CommunicationDeliveryStatus.DELIVERED,
      BOUNCED: CommunicationDeliveryStatus.BOUNCED,
      FAILED: CommunicationDeliveryStatus.FAILED,
    };

    const targetStatus = deliveryStatusMap[eventStatus];
    if (!targetStatus) {
      return { processed: false, reason: `Unknown event status: ${eventStatus}` };
    }

    const prismaClient = this.prisma || (this.inAppChannel as any).prisma;

    // 1. Try matching by providerMessageId variations (with/without angle brackets, with/without SendGrid filter prefix)
    let delivery = cleanMsgId
      ? await prismaClient.communicationDelivery.findFirst({
          where: {
            OR: [
              { providerMessageId: cleanMsgId },
              { providerMessageId: `<${cleanMsgId}>` },
              { providerMessageId: cleanMsgId.replace(/[<>]/g, '') },
              ...(cleanMsgId.includes('.') ? [{ providerMessageId: cleanMsgId.split('.')[0] }] : []),
            ],
          },
        })
      : null;

    // 2. Fallback matching by recipient email if messageId was not registered or differed
    if (!delivery && details?.recipientEmail) {
      const normEmail = details.recipientEmail.trim().toLowerCase();
      delivery = await prismaClient.communicationDelivery.findFirst({
        where: {
          recipientEmail: normEmail,
          channel: CommunicationChannel.EMAIL,
          status: {
            in: [
              CommunicationDeliveryStatus.SENT,
              CommunicationDeliveryStatus.SENDING,
              CommunicationDeliveryStatus.QUEUED,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!delivery) {
      return { processed: false, reason: 'Delivery record not found' };
    }

    // Workstream D: Cross-Attribution Guard
    // The same provider message cannot be attributed to an unrelated recipient's delivery record
    if (details?.recipientEmail && delivery.recipientEmail) {
      const incomingEmail = details.recipientEmail.trim().toLowerCase();
      const deliveryEmail = delivery.recipientEmail.trim().toLowerCase();
      if (incomingEmail !== deliveryEmail) {
        this.logger.warn(
          `[DELIVERY WEBHOOK] Cross-attribution rejected: incoming recipient ${incomingEmail} does not match delivery recipient ${deliveryEmail} (delivery ID ${delivery.id})`,
        );
        return {
          processed: false,
          reason: 'Cross-attribution mismatch: recipient email does not match delivery record',
        };
      }
    }

    // Strict State Precedence Model to prevent out-of-order regression:
    // QUEUED (1) < SENDING (2) < SENT (3) < DELIVERED / FAILED / BOUNCED (4)
    const STATUS_PRECEDENCE: Record<CommunicationDeliveryStatus, number> = {
      QUEUED: 1,
      SENDING: 2,
      SENT: 3,
      DELIVERED: 4,
      BOUNCED: 4,
      FAILED: 4,
      SKIPPED: 4,
    };

    const currentPrecedence = STATUS_PRECEDENCE[delivery.status] || 0;
    const incomingPrecedence = STATUS_PRECEDENCE[targetStatus] || 0;

    // Idempotency: exact same state received again
    if (delivery.status === targetStatus) {
      return { processed: true, idempotencySkipped: true, status: targetStatus };
    }

    // Out-of-order rejection: e.g. already DELIVERED, but delayed SENT arrives
    if (currentPrecedence >= incomingPrecedence && delivery.status !== CommunicationDeliveryStatus.QUEUED) {
      this.logger.warn(
        `[DELIVERY WEBHOOK] Out-of-order status ${eventStatus} ignored for delivery ${delivery.id} (current: ${delivery.status})`,
      );
      return {
        processed: true,
        outOfOrderIgnored: true,
        currentStatus: delivery.status,
      };
    }

    const eventDate = details?.timestamp || new Date();
    await prismaClient.communicationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: targetStatus,
        sentAt: targetStatus === CommunicationDeliveryStatus.SENT ? (delivery.sentAt || eventDate) : delivery.sentAt,
        deliveredAt: targetStatus === CommunicationDeliveryStatus.DELIVERED ? eventDate : delivery.deliveredAt,
        failedAt: (targetStatus === CommunicationDeliveryStatus.FAILED || targetStatus === CommunicationDeliveryStatus.BOUNCED) ? eventDate : delivery.failedAt,
        failureReason: details?.failureReason || delivery.failureReason,
      },
    });

    return { processed: true, deliveryId: delivery.id, status: targetStatus };
  }
}
