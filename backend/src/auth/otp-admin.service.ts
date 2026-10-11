import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOtpConfigDto } from './dto/otp-config.dto';
import { EmailChannel, WhatsAppChannel } from '../notifications/notification-channels.service';
import { CommunicationChannel } from '@prisma/client';

@Injectable()
export class OtpAdminService {
  private readonly logger = new Logger(OtpAdminService.name);

  constructor(
    private prisma: PrismaService,
    private emailChannel: EmailChannel,
    private whatsappChannel: WhatsAppChannel,
  ) {}

  async getConfig(channel: 'WHATSAPP' | 'EMAIL') {
    let config = await this.prisma.otpConfiguration.findUnique({
      where: { channel },
    });
    
    if (!config) {
      // Create default
      config = await this.prisma.otpConfiguration.create({
        data: {
          channel,
          enabled: false,
          expirySeconds: 300,
          maxAttempts: 5,
          resendCooldownSec: 30,
          rateLimitCount: 10,
          rateLimitWindowSec: 3600,
        },
      });
    }

    // Mask sensitive fields
    const maskedConfig = { ...config };
    if (maskedConfig.apiPassword) maskedConfig.apiPassword = '********';
    if (maskedConfig.apiKey) maskedConfig.apiKey = '********';

    return maskedConfig;
  }

  async updateConfig(
    adminUserId: string,
    channel: 'WHATSAPP' | 'EMAIL',
    dto: UpdateOtpConfigDto,
    ipAddress?: string,
  ) {
    const existing = await this.getConfig(channel);

    // If password or key is sent as masked, we don't update it
    const dataToUpdate: any = { ...dto };
    if (dataToUpdate.apiPassword === '********') delete dataToUpdate.apiPassword;
    if (dataToUpdate.apiKey === '********') delete dataToUpdate.apiKey;

    const updated = await this.prisma.otpConfiguration.update({
      where: { channel },
      data: {
        ...dataToUpdate,
        updatedBy: adminUserId,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: `${channel}_OTP_SETTINGS_UPDATED`,
        description: `OTP settings for ${channel} were updated.`,
        module: 'AUTH_OTP',
        severity: 'INFO',
        status: 'SUCCESS',
        ipAddress: ipAddress || null,
        changes: { changedFields: Object.keys(dataToUpdate) },
      },
    });

    return this.getConfig(channel);
  }

  async testWhatsAppConfig(adminUserId: string, testMobile: string) {
    const config = await this.getConfig('WHATSAPP');
    if (!config.enabled) {
      throw new BadRequestException('WhatsApp OTP is currently disabled.');
    }

    const testPayload = {
      title: 'WhatsApp OTP Test',
      message: 'This is a test of the WhatsApp OTP system.',
      whatsAppBody: 'Test OTP: 123456',
    };

    const res = await this.whatsappChannel.send(
      { id: adminUserId, name: 'Admin', mobile: testMobile, type: 'ADMIN' },
      testPayload,
    );

    // Audit
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'WHATSAPP_OTP_TESTED',
        description: `Tested WhatsApp OTP delivery to ${testMobile}`,
        module: 'AUTH_OTP',
        severity: 'INFO',
        status: res.success ? 'SUCCESS' : 'FAILED',
        changes: { success: res.success, error: res.errorMessage },
      },
    });

    return { success: res.success, message: res.success ? 'WhatsApp OTP sent successfully.' : res.errorMessage || 'Failed to send WhatsApp OTP.' };
  }

  async testEmailConfig(adminUserId: string, testEmail: string) {
    const config = await this.getConfig('EMAIL');
    if (!config.enabled) {
      throw new BadRequestException('Email OTP is currently disabled.');
    }

    const testPayload = {
      title: 'Email OTP Test',
      subject: 'Email OTP Test',
      message: 'This is a test of the Email OTP system.',
      emailHtml: '<p>Test OTP: <strong>123456</strong></p>',
    };

    const res = await this.emailChannel.send(
      { id: adminUserId, name: 'Admin', email: testEmail, type: 'ADMIN' },
      testPayload,
    );

    // Audit
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'EMAIL_OTP_TESTED',
        description: `Tested Email OTP delivery to ${testEmail}`,
        module: 'AUTH_OTP',
        severity: 'INFO',
        status: res.success ? 'SUCCESS' : 'FAILED',
        changes: { success: res.success, error: res.errorMessage },
      },
    });

    return { success: res.success, message: res.success ? 'Email OTP sent successfully.' : res.errorMessage || 'Failed to send Email OTP.' };
  }

  async getDashboardStats() {
    const whatsapp = await this.getConfig('WHATSAPP');
    const email = await this.getConfig('EMAIL');

    return {
      whatsapp: {
        enabled: whatsapp.enabled,
        provider: whatsapp.provider || 'Meta WhatsApp Cloud API',
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
