import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOtpConfigDto } from './dto/otp-config.dto';
import { EmailChannel, WhatsAppChannel } from '../notifications/notification-channels.service';

@Injectable()
export class OtpAdminService {
  private readonly logger = new Logger(OtpAdminService.name);

  constructor(
    private prisma: PrismaService,
    private moduleRef: ModuleRef,
  ) { }

  private getEmailChannel(): EmailChannel {
    try {
      const channel = this.moduleRef.get(EmailChannel, { strict: false });
      if (channel) return channel;
    } catch {
      // safe fallback
    }
    return new EmailChannel(this.prisma);
  }

  private getWhatsAppChannel(): WhatsAppChannel {
    try {
      const channel = this.moduleRef.get(WhatsAppChannel, { strict: false });
      if (channel) return channel;
    } catch {
      // safe fallback
    }
    return new WhatsAppChannel(this.prisma);
  }

  async getConfig(channel: 'WHATSAPP' | 'EMAIL' | string) {
    const normalizedChannel = channel?.toUpperCase();
    if (normalizedChannel !== 'WHATSAPP' && normalizedChannel !== 'EMAIL') {
      throw new BadRequestException('Invalid OTP channel: must be WHATSAPP or EMAIL');
    }

    let config = await this.prisma.otpConfiguration.findUnique({
      where: { channel: normalizedChannel },
    });

    if (!config) {
      config = await this.prisma.otpConfiguration.create({
        data: {
          channel: normalizedChannel,
          enabled: false,
          provider: normalizedChannel === 'WHATSAPP' ? 'Meta Cloud API' : 'SMTP',
          expirySeconds: 300,
          maxAttempts: 5,
          resendCooldownSec: 30,
          rateLimitCount: 10,
          rateLimitWindowSec: 3600,
        },
      });
    }

    // Mask sensitive fields
    const maskedConfig: any = { ...config };
    if (maskedConfig.apiPassword) maskedConfig.apiPassword = '********';
    if (maskedConfig.apiKey) maskedConfig.apiKey = '********';

    // Ensure fallback mappings so frontend receives consistent field names
    maskedConfig.providerUrl = config.providerUrl || config.apiHost || '';
    maskedConfig.senderId =
      config.senderId ||
      (normalizedChannel === 'EMAIL' ? config.fromEmail : config.phoneNumberId) ||
      '';
    maskedConfig.templateId = config.templateId || config.templateName || '';

    return maskedConfig;
  }

  async updateConfig(
    adminUserId: string,
    channel: 'WHATSAPP' | 'EMAIL' | string,
    dto: UpdateOtpConfigDto,
    ipAddress?: string,
  ) {
    const normalizedChannel = channel?.toUpperCase();
    if (normalizedChannel !== 'WHATSAPP' && normalizedChannel !== 'EMAIL') {
      throw new BadRequestException('Invalid OTP channel: must be WHATSAPP or EMAIL');
    }

    // Ensure existing configuration record exists
    let existing = await this.prisma.otpConfiguration.findUnique({
      where: { channel: normalizedChannel },
    });

    if (!existing) {
      existing = await this.prisma.otpConfiguration.create({
        data: {
          channel: normalizedChannel,
          enabled: false,
          expirySeconds: 300,
          maxAttempts: 5,
          resendCooldownSec: 30,
          rateLimitCount: 10,
          rateLimitWindowSec: 3600,
        },
      });
    }

    const dataToUpdate: any = {};

    // 1. Basic flags & text settings
    if (dto.enabled !== undefined) dataToUpdate.enabled = Boolean(dto.enabled);
    if (dto.provider !== undefined) dataToUpdate.provider = dto.provider;

    // 2. URLs and Hosts
    if (dto.providerUrl !== undefined) {
      dataToUpdate.providerUrl = dto.providerUrl;
      dataToUpdate.apiHost = dto.providerUrl;
    } else if (dto.apiHost !== undefined) {
      dataToUpdate.apiHost = dto.apiHost;
      dataToUpdate.providerUrl = dto.apiHost;
    }

    // 3. Sender identifiers
    if (dto.senderId !== undefined) {
      dataToUpdate.senderId = dto.senderId;
      if (normalizedChannel === 'EMAIL') {
        dataToUpdate.fromEmail = dto.senderId;
      } else {
        dataToUpdate.phoneNumberId = dto.senderId;
      }
    }

    // 4. Template identifiers
    if (dto.templateId !== undefined) {
      dataToUpdate.templateId = dto.templateId;
      dataToUpdate.templateName = dto.templateId;
    } else if (dto.templateName !== undefined) {
      dataToUpdate.templateName = dto.templateName;
      dataToUpdate.templateId = dto.templateName;
    }

    // 5. Numeric policies & limits
    if (dto.expirySeconds !== undefined && !isNaN(Number(dto.expirySeconds))) {
      dataToUpdate.expirySeconds = Number(dto.expirySeconds);
    }
    if (dto.maxAttempts !== undefined && !isNaN(Number(dto.maxAttempts))) {
      dataToUpdate.maxAttempts = Number(dto.maxAttempts);
    }
    if (dto.resendCooldownSec !== undefined && !isNaN(Number(dto.resendCooldownSec))) {
      dataToUpdate.resendCooldownSec = Number(dto.resendCooldownSec);
    }
    if (dto.rateLimitCount !== undefined && !isNaN(Number(dto.rateLimitCount))) {
      dataToUpdate.rateLimitCount = Number(dto.rateLimitCount);
    }
    if (dto.rateLimitWindowSec !== undefined && !isNaN(Number(dto.rateLimitWindowSec))) {
      dataToUpdate.rateLimitWindowSec = Number(dto.rateLimitWindowSec);
    }

    // 6. Optional metadata fields
    if (dto.accountId !== undefined) dataToUpdate.accountId = dto.accountId;
    if (dto.phoneNumberId !== undefined) dataToUpdate.phoneNumberId = dto.phoneNumberId;
    if (dto.apiPort !== undefined && !isNaN(Number(dto.apiPort))) {
      dataToUpdate.apiPort = Number(dto.apiPort);
    }
    if (dto.apiUser !== undefined) dataToUpdate.apiUser = dto.apiUser;
    if (dto.apiSecure !== undefined) dataToUpdate.apiSecure = Boolean(dto.apiSecure);
    if (dto.fromName !== undefined) dataToUpdate.fromName = dto.fromName;
    if (dto.fromEmail !== undefined) dataToUpdate.fromEmail = dto.fromEmail;
    if (dto.templateLanguage !== undefined) dataToUpdate.templateLanguage = dto.templateLanguage;

    // 7. SECURE CREDENTIALS HANDLING:
    // Never overwrite existing secrets if input is masked ('********') or blank/empty
    if (
      dto.apiKey !== undefined &&
      dto.apiKey !== '********' &&
      dto.apiKey.trim().length > 0
    ) {
      dataToUpdate.apiKey = dto.apiKey.trim();
    }

    if (
      dto.apiPassword !== undefined &&
      dto.apiPassword !== '********' &&
      dto.apiPassword.trim().length > 0
    ) {
      dataToUpdate.apiPassword = dto.apiPassword.trim();
    }

    dataToUpdate.updatedBy = adminUserId || null;

    // Persist configuration update
    await this.prisma.otpConfiguration.update({
      where: { channel: normalizedChannel },
      data: dataToUpdate,
    });

    // Audit log without leaking secret values
    const safeAuditChanges = Object.keys(dataToUpdate).filter(
      (key) => key !== 'apiPassword' && key !== 'apiKey',
    );
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: adminUserId || null,
          action: `${normalizedChannel}_OTP_SETTINGS_UPDATED`,
          description: `OTP settings for ${normalizedChannel} were updated.`,
          module: 'AUTH_OTP',
          severity: 'INFO',
          status: 'SUCCESS',
          ipAddress: ipAddress || null,
          changes: { changedFields: safeAuditChanges },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Failed to create audit log: ${auditErr?.message}`);
    }

    return this.getConfig(normalizedChannel);
  }

  async testWhatsAppConfig(adminUserId: string, testMobile: string) {
    if (!testMobile || typeof testMobile !== 'string') {
      throw new BadRequestException('Recipient mobile number is required.');
    }

    const cleanMobile = testMobile.trim().replace(/[^\d+]/g, '');
    if (cleanMobile.length < 10) {
      throw new BadRequestException('A valid recipient mobile number (10+ digits) is required.');
    }

    const config = await this.prisma.otpConfiguration.findUnique({
      where: { channel: 'WHATSAPP' },
    });

    if (!config || !config.enabled) {
      throw new BadRequestException('WhatsApp OTP is currently disabled. Please enable it and save settings first.');
    }

    if (!config.provider && !config.apiKey && !config.providerUrl) {
      throw new BadRequestException('WhatsApp provider is not configured. Please enter provider details and save.');
    }

    const whatsappChannel = this.getWhatsAppChannel();

    const testPayload = {
      title: 'WhatsApp OTP Test',
      message: 'This is a test of the Swayam Admission WhatsApp OTP system.',
      whatsAppBody: 'Your test OTP code is 123456 (Valid for 5 minutes).',
      whatsAppTemplateName: config.templateId || config.templateName || 'otp_verification',
    };

    let res: any;
    try {
      res = await whatsappChannel.send(
        { id: adminUserId || 'admin-test', name: 'Admin', mobile: cleanMobile, type: 'ADMIN' },
        testPayload,
      );
    } catch (err: any) {
      res = {
        success: false,
        errorMessage: err.message || 'WhatsApp dispatch failed',
      };
    }

    const isSuccess = Boolean(res?.success);

    // Audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: adminUserId || null,
          action: 'WHATSAPP_OTP_TESTED',
          description: `Tested WhatsApp OTP delivery to ${cleanMobile}`,
          module: 'AUTH_OTP',
          severity: 'INFO',
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          changes: { success: isSuccess, error: res?.errorMessage || res?.failureReason },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Failed to audit WhatsApp OTP test: ${auditErr?.message}`);
    }

    if (!isSuccess) {
      const errorMsg = res?.errorMessage || res?.failureReason || 'Failed to send WhatsApp OTP. Please verify provider settings.';
      return { success: false, message: errorMsg };
    }

    return { success: true, message: 'WhatsApp OTP test sent successfully.' };
  }

  async testEmailConfig(adminUserId: string, testEmail: string) {
    if (!testEmail || typeof testEmail !== 'string') {
      throw new BadRequestException('Recipient email address is required.');
    }

    const cleanEmail = testEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new BadRequestException('A valid recipient email address is required.');
    }

    const config = await this.prisma.otpConfiguration.findUnique({
      where: { channel: 'EMAIL' },
    });

    if (!config || !config.enabled) {
      throw new BadRequestException('Email OTP is currently disabled. Please enable it and save settings first.');
    }

    if (!config.provider && !config.providerUrl && !config.apiHost && !config.apiKey) {
      throw new BadRequestException('Email provider is not configured. Please enter provider details and save.');
    }

    const emailChannel = this.getEmailChannel();

    const testPayload = {
      title: 'Email OTP Test',
      subject: 'Swayam Admission: Email OTP Verification Test',
      message: 'This is a test of the Swayam Admission Email OTP delivery system.',
      emailHtml: '<p>This is a test of the Swayam Admission Email OTP system.</p><p>Your test OTP code is: <strong>123456</strong></p>',
    };

    let res: any;
    try {
      res = await emailChannel.send(
        { id: adminUserId || 'admin-test', name: 'Admin', email: cleanEmail, type: 'ADMIN' },
        testPayload,
      );
    } catch (err: any) {
      res = {
        success: false,
        errorMessage: err.message || 'Email dispatch failed',
      };
    }

    const isSuccess = Boolean(res?.success);

    // Audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: adminUserId || null,
          action: 'EMAIL_OTP_TESTED',
          description: `Tested Email OTP delivery to ${cleanEmail}`,
          module: 'AUTH_OTP',
          severity: 'INFO',
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          changes: { success: isSuccess, error: res?.errorMessage || res?.failureReason },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Failed to audit Email OTP test: ${auditErr?.message}`);
    }

    if (!isSuccess) {
      const errorMsg = res?.errorMessage || res?.failureReason || 'Failed to send Email OTP. Please verify provider settings.';
      return { success: false, message: errorMsg };
    }

    return { success: true, message: 'Email OTP test sent successfully.' };
  }

  async getDashboardStats() {
    const whatsapp = await this.getConfig('WHATSAPP');
    const email = await this.getConfig('EMAIL');

    return {
      whatsapp: {
        enabled: whatsapp.enabled,
        provider: whatsapp.provider || 'Meta Cloud API',
        expirySeconds: whatsapp.expirySeconds,
        maxAttempts: whatsapp.maxAttempts,
        resendCooldownSec: whatsapp.resendCooldownSec,
        rateLimitWindowSec: whatsapp.rateLimitWindowSec,
        lastUpdated: whatsapp.updatedAt,
      },
      email: {
        enabled: email.enabled,
        provider: email.provider || 'SMTP',
        expirySeconds: email.expirySeconds,
        maxAttempts: email.maxAttempts,
        resendCooldownSec: email.resendCooldownSec,
        rateLimitWindowSec: email.rateLimitWindowSec,
        lastUpdated: email.updatedAt,
      },
    };
  }
}
