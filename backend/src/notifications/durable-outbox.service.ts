import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import {
  CommunicationChannel,
  CommunicationDeliveryStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  EmailChannel,
  WhatsAppChannel,
  SmsChannel,
  ChannelSendResult,
} from './notification-channels.service';
import {
  buildEmployeeActivationEmailHtml,
  EmployeeActivationEmailTemplateParams,
  buildEmployeeAdminPasswordResetEmailHtml,
  EmployeePasswordResetEmailTemplateParams,
} from './email-templates';

export interface EnqueueJobDto {
  channel: CommunicationChannel;
  recipientType?: string;
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientMobile?: string;
  title: string;
  message: string;
  emailSubject?: string;
  emailHtml?: string;
  emailText?: string;
  smsBody?: string;
  whatsAppTemplateName?: string;
  whatsAppBody?: string;
  metadata?: Record<string, any>;
  isRetryable?: boolean;
  maxRetries?: number;
}

@Injectable()
export class DurableOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DurableOutboxService.name);
  private workerInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private emailQuotaCooldownUntil: Date | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly emailChannel?: EmailChannel,
    @Optional() private readonly whatsAppChannel?: WhatsAppChannel,
    @Optional() private readonly smsChannel?: SmsChannel,
  ) {}

  onModuleInit() {
    this.logger.log('Starting Durable Outbox Worker background processor...');
    // Process queue every 5 seconds
    this.workerInterval = setInterval(() => {
      void this.processQueue();
    }, 5000);
    // Initial run immediately after startup
    setTimeout(() => {
      void this.processQueue();
    }, 2000);
  }

  onModuleDestroy() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
      this.logger.log('Durable Outbox Worker stopped.');
    }
  }

  private getEmailChannel(): EmailChannel {
    if (this.emailChannel) return this.emailChannel;
    return new EmailChannel(this.prisma);
  }

  private getWhatsAppChannel(): WhatsAppChannel {
    if (this.whatsAppChannel) return this.whatsAppChannel;
    return new WhatsAppChannel(this.prisma);
  }

  private getSmsChannel(): SmsChannel {
    if (this.smsChannel) return this.smsChannel;
    return new SmsChannel(this.prisma);
  }

  /**
   * Enqueues a notification job durably into PostgreSQL.
   * Can participate in an existing Prisma transaction client (txClient) for atomic commit.
   */
  async enqueueJob(dto: EnqueueJobDto, txClient?: Prisma.TransactionClient) {
    const client = txClient || this.prisma;

    // 1. Persist the delivery payload into Notification record
    const title = dto.title || dto.emailSubject || 'System Notification';
    const message = dto.message || dto.emailText || dto.emailSubject || title;

    const notification = await client.notification.create({
      data: {
        title,
        message,
        type: 'SYSTEM',
        priority: 'HIGH',
        category: 'OUTBOX_DELIVERY',
        receiverId: dto.recipientId || null,
        metadata: {
          emailSubject: dto.emailSubject || title,
          emailHtml: dto.emailHtml,
          emailText: dto.emailText || message,
          smsBody: dto.smsBody,
          whatsAppTemplateName: dto.whatsAppTemplateName,
          whatsAppBody: dto.whatsAppBody,
          ...(dto.metadata || {}),
        },
      },
    });

    // 2. Persist the durable delivery job record
    const delivery = await client.communicationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: dto.channel,
        recipientType: dto.recipientType || 'STAFF',
        recipientId: dto.recipientId || null,
        recipientName: dto.recipientName || null,
        recipientEmail: dto.recipientEmail?.trim().toLowerCase() || null,
        recipientMobile: dto.recipientMobile?.trim() || null,
        status: CommunicationDeliveryStatus.QUEUED,
        maxRetries: dto.maxRetries ?? 3,
        retryCount: 0,
        isRetryable: dto.isRetryable ?? true,
        queuedAt: new Date(),
      },
    });

    this.logger.log(
      `[OUTBOX ENQUEUED] Delivery ID: ${delivery.id} | Channel: ${delivery.channel} | To: ${delivery.recipientEmail || delivery.recipientMobile || delivery.recipientId}`,
    );

    // Trigger near-instant processing asynchronously if not within an uncommitted transaction
    if (!txClient) {
      setImmediate(() => {
        void this.processQueue();
      });
    }

    return delivery;
  }

  /**
   * Helper method to durably queue an email.
   */
  async enqueueEmail(
    params: {
      recipientEmail: string;
      recipientName?: string;
      recipientId?: string;
      recipientType?: string;
      subject: string;
      title?: string;
      message?: string;
      bodyText?: string;
      bodyHtml?: string;
      html?: string;
      text?: string;
      metadata?: Record<string, any>;
      maxRetries?: number;
    },
    txClient?: Prisma.TransactionClient,
  ) {
    const textContent = params.text || params.bodyText || params.message || params.subject;
    const htmlContent = params.html || params.bodyHtml;
    const title = params.title || params.subject;

    return this.enqueueJob(
      {
        channel: CommunicationChannel.EMAIL,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        recipientId: params.recipientId,
        recipientType: params.recipientType || 'STAFF',
        title,
        message: textContent,
        emailSubject: params.subject,
        emailHtml: htmlContent,
        emailText: textContent,
        metadata: params.metadata,
        maxRetries: params.maxRetries,
      },
      txClient,
    );
  }

  /**
   * Helper method to durably queue an employee activation email.
   */
  async enqueueEmployeeActivationEmail(
    params: EmployeeActivationEmailTemplateParams,
    txClient?: Prisma.TransactionClient,
  ) {
    const html = buildEmployeeActivationEmailHtml(params);
    const hours = params.expiryHours || params.expiresInHours || 24;
    const text = `Welcome to Swayam Admission, ${params.employeeName}!
Your Employee ID is ${params.employeeId}.
Please activate your account and set your permanent password using this secure link:
${params.activationUrl}

This single-use activation link is valid for ${hours} hours. For security reasons, no temporary password is provided.
Login Portal: ${params.portalUrl || process.env.ADMIN_PORTAL_URL || process.env.PORTAL_URL || 'https://swayam-admission-eg2x.vercel.app'}`;

    return this.enqueueEmail(
      {
        recipientEmail: params.officialEmail,
        recipientName: params.employeeName,
        recipientId: params.recipientUserId || params.employeeId,
        recipientType: 'EMPLOYEE',
        title: 'Activate Your Swayam Admission Staff Account',
        subject: `Welcome to Swayam Admission — Activate Your Account (ID: ${params.employeeId})`,
        message: text,
        html,
        text,
        metadata: {
          employeeId: params.employeeId,
          activationUrl: params.activationUrl,
          purpose: 'EMPLOYEE_ACTIVATION',
        },
      },
      txClient,
    );
  }

  /**
   * Helper method to durably queue an employee password reset email.
   */
  async enqueueEmployeePasswordResetEmail(
    params: EmployeePasswordResetEmailTemplateParams,
    txClient?: Prisma.TransactionClient,
  ) {
    const html = buildEmployeeAdminPasswordResetEmailHtml(params);
    const text = `Hello ${params.employeeName},
An administrator has initiated a password reset for your Swayam Admission account (ID: ${params.employeeId}).
Reason: ${params.reason || 'Administrative maintenance'}

Please use the secure link below to set your new password:
${params.resetUrl}

This link is single-use and will expire in ${params.expiryHours || 24} hours.`;

    return this.enqueueEmail(
      {
        recipientEmail: params.officialEmail,
        recipientName: params.employeeName,
        recipientId: params.employeeId,
        recipientType: 'EMPLOYEE',
        title: 'Reset Your Swayam Admission Account Password',
        subject: 'Reset Your Swayam Admission Account Password',
        message: text,
        html,
        text,
        metadata: {
          employeeId: params.employeeId,
          resetUrl: params.resetUrl,
          purpose: 'EMPLOYEE_ADMIN_PASSWORD_RESET',
        },
      },
      txClient,
    );
  }

  /**
   * Recovers jobs stuck in SENDING state (e.g. from an unclean shutdown/crash)
   * Prevents duplicate sends by checking providerMessageId, marks exhausted jobs as FAILED,
   * and resets retryable jobs back to QUEUED with recovery tracking.
   */
  async recoverStaleSendingJobs(staleThresholdMs = 2 * 60 * 1000): Promise<number> {
    const thresholdDate = new Date(Date.now() - staleThresholdMs);

    // 1. If any stale SENDING jobs already have a providerMessageId, mark them SENT
    const completedWithMsgId = await this.prisma.communicationDelivery.updateMany({
      where: {
        status: CommunicationDeliveryStatus.SENDING,
        updatedAt: { lt: thresholdDate },
        providerMessageId: { not: null },
      },
      data: {
        status: CommunicationDeliveryStatus.SENT,
        sentAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (completedWithMsgId.count > 0) {
      this.logger.log(
        `[OUTBOX RECOVERY] Reconciled ${completedWithMsgId.count} stale SENDING deliveries with providerMessageId to SENT`,
      );
    }

    // 2. If any stale SENDING jobs have exhausted max retries, mark them FAILED
    const exhausted = await this.prisma.communicationDelivery.updateMany({
      where: {
        status: CommunicationDeliveryStatus.SENDING,
        updatedAt: { lt: thresholdDate },
        providerMessageId: null,
        retryCount: { gte: 3 },
      },
      data: {
        status: CommunicationDeliveryStatus.FAILED,
        isRetryable: false,
        failedAt: new Date(),
        failureReason: 'STALE_SENDING_TIMEOUT_EXCEEDED_MAX_RETRIES',
        updatedAt: new Date(),
      },
    });

    if (exhausted.count > 0) {
      this.logger.warn(
        `[OUTBOX RECOVERY] Marked ${exhausted.count} exhausted stale SENDING deliveries as FAILED`,
      );
    }

    // 3. Reset remaining retryable stale jobs to QUEUED
    const staleCandidates = await this.prisma.communicationDelivery.findMany({
      where: {
        status: CommunicationDeliveryStatus.SENDING,
        updatedAt: { lt: thresholdDate },
        providerMessageId: null,
        isRetryable: true,
      },
      take: 20,
    });

    let recoveredCount = 0;
    for (const stale of staleCandidates) {
      const nextRetry = stale.retryCount + 1;
      const canRetry = nextRetry < stale.maxRetries;
      await this.prisma.communicationDelivery.update({
        where: { id: stale.id },
        data: {
          status: canRetry ? CommunicationDeliveryStatus.QUEUED : CommunicationDeliveryStatus.FAILED,
          retryCount: nextRetry,
          isRetryable: canRetry,
          failureReason: canRetry ? 'WORKER_CRASH_RECOVERY_ATTEMPT' : 'MAX_RETRIES_EXCEEDED',
          updatedAt: new Date(),
        },
      }).catch(() => null);
      recoveredCount++;
    }

    if (recoveredCount > 0) {
      this.logger.warn(
        `[OUTBOX RECOVERY] Recovered ${recoveredCount} stale SENDING deliveries back to QUEUED`,
      );
    }
    return recoveredCount + completedWithMsgId.count + exhausted.count;
  }

  /**
   * Retrieves real-time outbox operational metrics for administrative monitoring.
   */
  async getOutboxMetrics() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const [
      queueDepth,
      oldestQueued,
      stuckSendingCount,
      sent24h,
      delivered24h,
      failed24h,
    ] = await Promise.all([
      this.prisma.communicationDelivery.count({
        where: { status: CommunicationDeliveryStatus.QUEUED },
      }),
      this.prisma.communicationDelivery.findFirst({
        where: { status: CommunicationDeliveryStatus.QUEUED },
        orderBy: { queuedAt: 'asc' },
        select: { queuedAt: true },
      }),
      this.prisma.communicationDelivery.count({
        where: {
          status: CommunicationDeliveryStatus.SENDING,
          updatedAt: { lt: twoMinutesAgo },
        },
      }),
      this.prisma.communicationDelivery.count({
        where: {
          status: CommunicationDeliveryStatus.SENT,
          updatedAt: { gte: oneDayAgo },
        },
      }),
      this.prisma.communicationDelivery.count({
        where: {
          status: CommunicationDeliveryStatus.DELIVERED,
          updatedAt: { gte: oneDayAgo },
        },
      }),
      this.prisma.communicationDelivery.count({
        where: {
          status: CommunicationDeliveryStatus.FAILED,
          updatedAt: { gte: oneDayAgo },
        },
      }),
    ]);

    const oldestQueuedAgeSeconds = oldestQueued?.queuedAt
      ? Math.floor((Date.now() - oldestQueued.queuedAt.getTime()) / 1000)
      : 0;

    const cooldownInfo = await this.getPersistentQuotaCooldown();

    return {
      queueDepth,
      oldestQueuedAgeSeconds,
      stuckSendingCount,
      isQuotaCooldownActive: cooldownInfo.isActive,
      quotaCooldownUntil: cooldownInfo.cooldownUntil,
      quotaCooldownRemainingSeconds: cooldownInfo.cooldownUntil
        ? Math.max(0, Math.floor((cooldownInfo.cooldownUntil.getTime() - Date.now()) / 1000))
        : 0,
      quotaReason: cooldownInfo.reason,
      countsLast24h: {
        sent: sent24h,
        delivered: delivered24h,
        failed: failed24h,
      },
    };
  }

  /**
   * Operational metrics alias for monitoring and health controllers.
   */
  async getOperationalMetrics() {
    return this.getOutboxMetrics();
  }

  /**
   * Retrieves the active email quota cooldown, checking both in-memory cache and persistent database storage.
   * This guarantees that multiple instances and workers observe the exact same cooldown across restarts.
   */
  async getPersistentQuotaCooldown(): Promise<{
    isActive: boolean;
    cooldownUntil: Date | null;
    reason: string | null;
    provider: string | null;
  }> {
    // Query persistent OtpConfiguration as the source of truth across workers:
    try {
      const dbConfig = await this.prisma.otpConfiguration.findUnique({
        where: { channel: 'EMAIL' },
        select: { providerUrl: true, provider: true },
      });

      if (dbConfig?.providerUrl) {
        try {
          const meta = JSON.parse(dbConfig.providerUrl);
          if (meta?.quotaCooldownUntil) {
            const parsedDate = new Date(meta.quotaCooldownUntil);
            if (!isNaN(parsedDate.getTime()) && new Date() < parsedDate) {
              this.emailQuotaCooldownUntil = parsedDate;
              return {
                isActive: true,
                cooldownUntil: parsedDate,
                reason: meta.reason || 'PROVIDER_QUOTA_EXCEEDED',
                provider: meta.provider || dbConfig.provider || null,
              };
            }
          }
        } catch {
          // not JSON, ignore
        }
      }

      // If DB has no active cooldown, invalidate in-memory cache across this worker instance
      this.emailQuotaCooldownUntil = null;
      return { isActive: false, cooldownUntil: null, reason: null, provider: null };
    } catch {
      // Safe fallback if DB temporarily unreachable: inspect in-memory cache
      if (this.emailQuotaCooldownUntil && new Date() < this.emailQuotaCooldownUntil) {
        return {
          isActive: true,
          cooldownUntil: this.emailQuotaCooldownUntil,
          reason: 'PROVIDER_QUOTA_EXCEEDED',
          provider: null,
        };
      }
      return { isActive: false, cooldownUntil: null, reason: null, provider: null };
    }
  }

  /**
   * Durably sets the provider quota cooldown in both in-memory state and persistent PostgreSQL storage.
   */
  async setPersistentQuotaCooldown(
    cooldownUntil: Date,
    reason: string = 'PROVIDER_QUOTA_EXCEEDED',
    provider?: string,
  ): Promise<void> {
    this.emailQuotaCooldownUntil = cooldownUntil;
    if (this.emailChannel && typeof (this.emailChannel as any).setQuotaCooldown === 'function') {
      (this.emailChannel as any).setQuotaCooldown(cooldownUntil);
    }

    try {
      const payload = JSON.stringify({
        quotaCooldownUntil: cooldownUntil.toISOString(),
        reason,
        provider: provider || 'EMAIL_PROVIDER',
        updatedAt: new Date().toISOString(),
      });

      await this.prisma.otpConfiguration.upsert({
        where: { channel: 'EMAIL' },
        update: { providerUrl: payload },
        create: {
          channel: 'EMAIL',
          enabled: true,
          providerUrl: payload,
        },
      });
      this.logger.warn(
        `[OUTBOX PERSISTENT COOLDOWN] Cooldown until ${cooldownUntil.toISOString()} persisted to PostgreSQL.`,
      );
    } catch (err: any) {
      this.logger.error(`Failed to persist quota cooldown to DB: ${err.message}`);
    }
  }

  /**
   * Resets the email provider quota cooldown in both in-memory cache and persistent database storage.
   * Can be triggered when quota rolls over or alternative transport is configured.
   */
  async resetQuotaCooldown(): Promise<void> {
    this.emailQuotaCooldownUntil = null;
    if (this.emailChannel && typeof (this.emailChannel as any).resetQuotaCooldown === 'function') {
      this.emailChannel.resetQuotaCooldown();
    }

    try {
      await this.prisma.otpConfiguration.updateMany({
        where: { channel: 'EMAIL' },
        data: { providerUrl: null },
      });
    } catch {
      // safe fallback
    }

    this.logger.log('[OUTBOX COOLDOWN RESET] Email provider quota cooldown manually reset in memory and DB.');
  }

  /**
   * Recovers quota-blocked deliveries back to QUEUED and resumes queue processing.
   */
  async retryQuotaBlockedDeliveries(): Promise<number> {
    await this.resetQuotaCooldown();
    const result = await this.prisma.communicationDelivery.updateMany({
      where: {
        failureReason: 'PROVIDER_QUOTA_EXCEEDED',
        status: { in: [CommunicationDeliveryStatus.QUEUED, CommunicationDeliveryStatus.FAILED] },
      },
      data: {
        status: CommunicationDeliveryStatus.QUEUED,
        isRetryable: true,
        retryCount: 0,
        updatedAt: new Date(),
      },
    });
    this.logger.log(`[OUTBOX RECOVERY] Reset ${result.count} quota-blocked deliveries for retry.`);
    setImmediate(() => {
      void this.processQueue();
    });
    return result.count;
  }

  /**
   * Manually retries a specific delivery by ID.
   */
  async retryDelivery(deliveryId: string): Promise<boolean> {
    const delivery = await this.prisma.communicationDelivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) return false;

    await this.prisma.communicationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: CommunicationDeliveryStatus.QUEUED,
        isRetryable: true,
        retryCount: 0,
        updatedAt: new Date(),
      },
    });

    setImmediate(() => {
      void this.processQueue(deliveryId);
    });
    return true;
  }

  /**
   * Durable Worker Loop.
   * 1. Claims QUEUED jobs or stale SENDING jobs (older than 2 minutes).
   * 2. Prevents concurrent processing via optimistic locking update.
   * 3. Dispatches via the actual provider channel.
   * 4. Enforces exponential backoff, auth TTL expiry, superseded message suppression, and quota circuit breaker.
   * 5. Updates delivery status (SENT or FAILED with retry/exponential backoff).
   * If targetDeliveryId is passed, processes that single job specifically.
   */
  async processQueue(targetDeliveryId?: string): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isProcessing && !targetDeliveryId) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    if (!targetDeliveryId) {
      this.isProcessing = true;
    }
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      const whereClause = targetDeliveryId
        ? { id: targetDeliveryId }
        : {
            OR: [
              {
                status: CommunicationDeliveryStatus.QUEUED,
                isRetryable: true,
              },
              {
                status: CommunicationDeliveryStatus.SENDING,
                updatedAt: { lt: twoMinutesAgo },
                isRetryable: true,
              },
            ],
          };

      // Find jobs eligible for processing:
      const candidates = await this.prisma.communicationDelivery.findMany({
        where: whereClause,
        orderBy: { queuedAt: 'asc' },
        take: targetDeliveryId ? 1 : 10,
      });

      for (const job of candidates) {
        if (job.retryCount >= job.maxRetries) {
          // Exceeded max retries: mark FAILED
          await this.prisma.communicationDelivery.update({
            where: { id: job.id },
            data: {
              status: CommunicationDeliveryStatus.FAILED,
              isRetryable: false,
              failedAt: new Date(),
              failureReason: 'MAX_RETRIES_EXCEEDED',
            },
          });
          continue;
        }

        // 1. Exponential Backoff Check:
        if (job.retryCount > 0 && !targetDeliveryId) {
          const backoffMs =
            job.retryCount === 1
              ? 30 * 1000
              : job.retryCount === 2
              ? 2 * 60 * 1000
              : 10 * 60 * 1000;
          if (Date.now() - job.updatedAt.getTime() < backoffMs) {
            // Job is still within backoff delay; skip this cycle
            continue;
          }
        }

        // 2. Email Provider Quota Cooldown Check:
        if (job.channel === CommunicationChannel.EMAIL && !targetDeliveryId) {
          const cooldown = await this.getPersistentQuotaCooldown();
          if (cooldown.isActive && cooldown.cooldownUntil && new Date() < cooldown.cooldownUntil) {
            this.logger.debug(
              `[OUTBOX COOLDOWN] Email provider is quota-limited until ${cooldown.cooldownUntil.toISOString()}. Retaining queued job ${job.id}.`,
            );
            continue;
          }
        }

        // Atomically claim the job using optimistic concurrency check
        const claimResult = await this.prisma.communicationDelivery.updateMany({
          where: {
            id: job.id,
            status: job.status,
            updatedAt: job.updatedAt,
          },
          data: {
            status: CommunicationDeliveryStatus.SENDING,
            updatedAt: new Date(),
          },
        });

        if (claimResult.count === 0) {
          // Another worker instance claimed this record
          continue;
        }

        processed++;

        // Fetch payload from associated Notification
        let notification: any = null;
        if (job.notificationId) {
          notification = await this.prisma.notification.findUnique({
            where: { id: job.notificationId },
          });
        }

        const metadata = (notification?.metadata as Record<string, any>) || {};
        const title = notification?.title || 'Notification';
        const message = notification?.message || '';

        // 3. TTL Expiry Check for Authentication Messages
        const purpose = metadata.purpose;
        let isExpired = Boolean(notification?.expiresAt && new Date() > notification.expiresAt);
        if (!isExpired && purpose) {
          const ageMs = Date.now() - job.queuedAt.getTime();
          if (purpose === 'REGISTRATION_OTP' && ageMs > 10 * 60 * 1000) {
            isExpired = true;
          } else if (purpose === 'EMAIL_VERIFICATION' && ageMs > 20 * 60 * 1000) {
            isExpired = true;
          } else if ((purpose === 'PASSWORD_RESET' || purpose === 'EMPLOYEE_PASSWORD_RESET') && ageMs > 60 * 60 * 1000) {
            isExpired = true;
          } else if (purpose === 'EMPLOYEE_ACTIVATION' && ageMs > 24 * 60 * 60 * 1000) {
            isExpired = true;
          }
        }

        if (isExpired) {
          this.logger.warn(
            `[OUTBOX TTL EXPIRED] Delivery ID: ${job.id} | Purpose: ${purpose || 'UNKNOWN'} | Expired. Suppressing delivery to avoid replaying expired credentials.`,
          );
          await this.prisma.communicationDelivery.update({
            where: { id: job.id },
            data: {
              status: CommunicationDeliveryStatus.FAILED,
              isRetryable: false,
              failedAt: new Date(),
              failureReason: 'AUTH_MESSAGE_EXPIRED',
              errorMessage: 'Authentication message expired before dispatch; suppressed to protect recipient',
            },
          });
          failed++;
          continue;
        }

        // 4. Superseded Authentication Message Check (newer OTP / reset token already requested)
        if (
          purpose &&
          job.recipientEmail &&
          (purpose === 'REGISTRATION_OTP' ||
            purpose === 'EMAIL_VERIFICATION' ||
            purpose === 'PASSWORD_RESET' ||
            purpose === 'EMPLOYEE_ACTIVATION' ||
            purpose === 'EMPLOYEE_PASSWORD_RESET')
        ) {
          const newerDelivery = await this.prisma.communicationDelivery.findFirst({
            where: {
              recipientEmail: job.recipientEmail,
              channel: job.channel,
              createdAt: { gt: job.createdAt },
              id: { not: job.id },
            },
            select: { id: true, createdAt: true },
          });

          if (newerDelivery) {
            this.logger.warn(
              `[OUTBOX SUPERSEDED] Delivery ID: ${job.id} for ${job.recipientEmail} (Purpose: ${purpose}) is superseded by newer delivery ${newerDelivery.id}. Suppressing delivery.`,
            );
            await this.prisma.communicationDelivery.update({
              where: { id: job.id },
              data: {
                status: CommunicationDeliveryStatus.FAILED,
                isRetryable: false,
                failedAt: new Date(),
                failureReason: 'AUTH_MESSAGE_SUPERSEDED',
                errorMessage: `Superseded by newer request (ID: ${newerDelivery.id}) for this recipient`,
              },
            });
            failed++;
            continue;
          }
        }

        let sendResult: ChannelSendResult;

        try {
          if (job.channel === CommunicationChannel.EMAIL) {
            const channel = this.getEmailChannel();
            sendResult = await channel.send(
              {
                id: job.recipientId || job.id,
                name: job.recipientName || 'Recipient',
                email: job.recipientEmail || undefined,
                type: job.recipientType,
              },
              {
                title,
                subject: metadata.emailSubject || title,
                message,
                emailHtml: metadata.emailHtml,
                emailText: metadata.emailText || message,
              },
              metadata,
            );
          } else if (job.channel === CommunicationChannel.WHATSAPP) {
            const channel = this.getWhatsAppChannel();
            sendResult = await channel.send(
              {
                id: job.recipientId || job.id,
                name: job.recipientName || 'Recipient',
                mobile: job.recipientMobile || undefined,
                type: job.recipientType,
              },
              {
                title,
                message,
                whatsAppBody: metadata.whatsAppBody || message,
                whatsAppTemplateName: metadata.whatsAppTemplateName,
              },
              metadata,
            );
          } else if (job.channel === CommunicationChannel.SMS) {
            const channel = this.getSmsChannel();
            sendResult = await channel.send(
              {
                id: job.recipientId || job.id,
                name: job.recipientName || 'Recipient',
                mobile: job.recipientMobile || undefined,
                type: job.recipientType,
              },
              {
                title,
                message,
                smsBody: metadata.smsBody || message,
              },
              metadata,
            );
          } else {
            sendResult = {
              channel: job.channel,
              success: false,
              status: CommunicationDeliveryStatus.FAILED,
              failureReason: `UNSUPPORTED_CHANNEL: ${job.channel}`,
              isRetryable: false,
            };
          }
        } catch (err: any) {
          sendResult = {
            channel: job.channel,
            success: false,
            status: CommunicationDeliveryStatus.FAILED,
            errorMessage: err?.message || 'Unexpected dispatch error',
            failureReason: 'DISPATCH_EXCEPTION',
            isRetryable: true,
          };
        }

        if (sendResult.success) {
          succeeded++;
          const finalStatus =
            sendResult.status === CommunicationDeliveryStatus.DELIVERED
              ? CommunicationDeliveryStatus.DELIVERED
              : CommunicationDeliveryStatus.SENT;

          try {
            await this.prisma.communicationDelivery.update({
              where: { id: job.id },
              data: {
                status: finalStatus,
                sentAt: new Date(),
                deliveredAt:
                  finalStatus === CommunicationDeliveryStatus.DELIVERED
                    ? new Date()
                    : null,
                providerMessageId: sendResult.providerMessageId || null,
                errorMessage: null,
                failureReason: null,
              },
            });

            this.logger.log(
              `[OUTBOX SENT] Delivery ID: ${job.id} | Channel: ${job.channel} | Status: ${finalStatus} | ProviderMsgId: ${sendResult.providerMessageId || 'N/A'}`,
            );
          } catch (updateErr: any) {
            if (updateErr?.code === 'P2025') {
              this.logger.warn(`[OUTBOX UPDATE] Delivery ID ${job.id} no longer exists; skipped post-send update.`);
            } else {
              throw updateErr;
            }
          }
        } else {
          // Handle Quota Exceeded differently from regular errors:
          if (sendResult.isQuotaExceeded || sendResult.failureReason === 'PROVIDER_QUOTA_EXCEEDED') {
            const cooldownUntil = new Date(Date.now() + 15 * 60 * 1000);
            await this.setPersistentQuotaCooldown(cooldownUntil, 'PROVIDER_QUOTA_EXCEEDED');
            this.logger.warn(
              `[OUTBOX PROVIDER QUOTA EXCEEDED] Daily sending limit exceeded on email channel. Activating 15m cooldown until ${cooldownUntil.toISOString()}. Retaining pending jobs safely.`,
            );
            failed++;
            try {
              await this.prisma.communicationDelivery.update({
                where: { id: job.id },
                data: {
                  status: CommunicationDeliveryStatus.QUEUED,
                  isRetryable: true,
                  retryCount: Math.min(job.retryCount + 1, job.maxRetries - 1),
                  failedAt: new Date(),
                  failureReason: 'PROVIDER_QUOTA_EXCEEDED',
                  errorMessage: 'Provider daily user sending limit exceeded (550-5.4.5). Retained safely in queue.',
                  updatedAt: new Date(),
                },
              });
            } catch (updateErr: any) {
              if (updateErr?.code !== 'P2025') throw updateErr;
            }
            // Break loop for further emails while provider is quota-blocked
            break;
          }

          failed++;
          const nextRetryCount = job.retryCount + 1;
          const canRetry =
            Boolean(sendResult.isRetryable) && nextRetryCount < job.maxRetries;

          try {
            await this.prisma.communicationDelivery.update({
              where: { id: job.id },
              data: {
                status: canRetry
                  ? CommunicationDeliveryStatus.QUEUED
                  : CommunicationDeliveryStatus.FAILED,
                retryCount: nextRetryCount,
                isRetryable: canRetry,
                failedAt: new Date(),
                errorMessage: sendResult.errorMessage
                  ? String(sendResult.errorMessage).slice(0, 500)
                  : null,
                failureReason: sendResult.failureReason || 'PROVIDER_FAILURE',
                updatedAt: new Date(),
              },
            });

            this.logger.warn(
              `[OUTBOX FAILED] Delivery ID: ${job.id} | Channel: ${job.channel} | RetryCount: ${nextRetryCount}/${job.maxRetries} | CanRetry: ${canRetry} | Error: ${sendResult.errorMessage || sendResult.failureReason}`,
            );
          } catch (updateErr: any) {
            if (updateErr?.code === 'P2025') {
              this.logger.warn(`[OUTBOX UPDATE] Delivery ID ${job.id} no longer exists; skipped failure update.`);
            } else {
              throw updateErr;
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Error processing durable outbox queue: ${err.message}`, err.stack);
    } finally {
      this.isProcessing = false;
    }

    return { processed, succeeded, failed };
  }
}
