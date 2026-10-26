import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Headers,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  CommunicationCampaignService,
  CreateCampaignDto,
  UpdateCampaignDto,
} from './communication-campaign.service';
import { NotificationDispatcher, EmailChannel } from './notification-channels.service';
import { DurableOutboxService } from './durable-outbox.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';
import {
  CommunicationChannel,
  CommunicationCampaignStatus,
  CommunicationDeliveryStatus,
  CommCampaignType,
} from '@prisma/client';

@Controller('notifications')
export class CommunicationCampaignController {
  constructor(
    private readonly campaignService: CommunicationCampaignService,
    private readonly dispatcher: NotificationDispatcher,
    @Optional() private readonly outboxService?: DurableOutboxService,
    @Optional() private readonly emailChannel?: EmailChannel,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  private readonly logger = new Logger(CommunicationCampaignController.name);
  private readonly snsCertCache = new Map<string, string>();

  /**
   * Strictly validates AWS SNS SigningCertURL to prevent SSRF:
   * 1. Must use https: scheme
   * 2. Hostname must match AWS SNS trusted domain
   * 3. Path must end with .pem
   */
  public validateSnsCertificateUrl(urlStr: string): boolean {
    if (!urlStr || typeof urlStr !== 'string') return false;
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== 'https:') return false;
      const trustedHostRegex = /^sns\.[a-zA-Z0-9-]+\.amazonaws\.com(\.cn)?$/;
      if (!trustedHostRegex.test(parsed.hostname)) return false;
      if (!parsed.pathname.endsWith('.pem')) return false;
      if (parsed.search || parsed.hash) return false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Strictly validates AWS SNS SubscribeURL to prevent SSRF:
   * 1. Must use https: scheme
   * 2. Hostname must match AWS SNS trusted domain
   */
  public validateSnsSubscribeUrl(urlStr: string): boolean {
    if (!urlStr || typeof urlStr !== 'string') return false;
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== 'https:') return false;
      const trustedHostRegex = /^sns\.[a-zA-Z0-9-]+\.amazonaws\.com(\.cn)?$/;
      return trustedHostRegex.test(parsed.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Securely fetches and caches the AWS SNS X.509 certificate over HTTPS with strict timeout & size limits.
   */
  public async fetchSnsCertificate(urlStr: string): Promise<string> {
    if (!this.validateSnsCertificateUrl(urlStr)) {
      throw new BadRequestException('Untrusted AWS SNS SigningCertURL');
    }

    if (this.snsCertCache.has(urlStr)) {
      return this.snsCertCache.get(urlStr)!;
    }

    const https = await import('https');
    return new Promise((resolve, reject) => {
      const req = https.get(urlStr, { timeout: 5000 }, (res) => {
        if (res.statusCode !== 200) {
          return reject(
            new UnauthorizedException(
              `Failed to fetch SNS certificate: HTTP ${res.statusCode}`,
            ),
          );
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
          if (data.length > 128 * 1024) {
            req.destroy();
            reject(
              new BadRequestException(
                'SNS certificate exceeds maximum allowable size (128KB)',
              ),
            );
          }
        });
        res.on('end', () => {
          this.snsCertCache.set(urlStr, data);
          resolve(data);
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new UnauthorizedException('Timeout fetching AWS SNS certificate'));
      });

      req.on('error', (err) => {
        reject(
          new UnauthorizedException(
            `Error fetching AWS SNS certificate: ${err.message}`,
          ),
        );
      });
    });
  }

  /**
   * Builds the canonical string for AWS SNS message signature verification.
   */
  public buildSnsSignableString(payload: any): string {
    if (!payload || !payload.Type) return '';
    if (payload.Type === 'Notification') {
      let str = `Message\n${payload.Message}\nMessageId\n${payload.MessageId}\n`;
      if (payload.Subject) {
        str += `Subject\n${payload.Subject}\n`;
      }
      str += `Timestamp\n${payload.Timestamp}\nTopicArn\n${payload.TopicArn}\nType\n${payload.Type}\n`;
      return str;
    } else if (payload.Type === 'SubscriptionConfirmation' || payload.Type === 'UnsubscribeConfirmation') {
      return `Message\n${payload.Message}\nMessageId\n${payload.MessageId}\nSubscribeURL\n${payload.SubscribeURL}\nTimestamp\n${payload.Timestamp}\nToken\n${payload.Token}\nTopicArn\n${payload.TopicArn}\nType\n${payload.Type}\n`;
    }
    return '';
  }

  // ─── CAMPAIGNS ─────────────────────────────────────────────────────────────

  @Get('campaigns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: CommunicationCampaignStatus,
    @Query('type') type?: CommCampaignType,
    @Query('channel') channel?: CommunicationChannel,
  ) {
    return this.campaignService.findAll({ page, limit, search, status, type, channel });
  }

  @Get('campaigns/provider-health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  getProviderHealth() {
    return this.dispatcher.getProviderHealth();
  }

  @Get('campaigns/delivery-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  getDeliveryLogs(
    @Query('campaignId') campaignId?: string,
    @Query('channel') channel?: CommunicationChannel,
    @Query('status') status?: CommunicationDeliveryStatus,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.campaignService.getDeliveryLogs({
      campaignId,
      channel,
      status,
      search,
      page,
      limit,
    });
  }

  // ─── RECIPIENT SUPPRESSION MANAGEMENT ──────────────────────────────────────

  @Get('campaigns/suppressions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getSuppressions(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.campaignService.getSuppressionList({ search, page, limit });
  }

  @Post('campaigns/suppressions/remove')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async removeSuppression(
    @CurrentUser() user: IUser,
    @Body('email') email: string,
    @Body('reason') reason?: string,
  ) {
    const result = await this.campaignService.removeSuppression(email, user?.id, reason);
    if (this.auditService && user?.id) {
      await this.auditService.logAction({
        userId: user.id,
        action: 'REMOVE_EMAIL_SUPPRESSION',
        module: 'COMMUNICATIONS',
        description: `Admin removed suppression for ${email}`,
        metadata: { recipientEmail: email, reason, clearedCount: result.clearedRecordsCount },
      });
    }
    return result;
  }

  @Get('campaigns/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  findOne(@Param('id') id: string) {
    return this.campaignService.findOne(id);
  }

  @Get('campaigns/:id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  getAnalytics(@Param('id') id: string) {
    return this.campaignService.getCampaignAnalytics(id);
  }

  @Post('campaigns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: IUser) {
    return this.campaignService.createCampaign(dto, user?.id);
  }

  @Patch('campaigns/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() user: IUser,
  ) {
    return this.campaignService.updateCampaign(id, dto, user?.id);
  }

  @Post('campaigns/:id/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  sendNow(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.campaignService.sendCampaign(id, user?.id);
  }

  @Post('campaigns/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  cancel(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.campaignService.cancelCampaign(id, user?.id);
  }

  @Post('campaigns/:id/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  retryFailed(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.campaignService.retryFailedDeliveries(id, user?.id);
  }

  // ─── ADMIN OBSERVABILITY & OUTBOX CONTROLS ─────────────────────────────────

  @Get('campaigns/outbox-metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  async getOutboxMetrics() {
    if (this.outboxService) {
      return this.outboxService.getOutboxMetrics();
    }
    return { queueDepth: 0, oldestQueuedAgeSeconds: 0, isQuotaCooldownActive: false };
  }

  @Post('campaigns/outbox/reset-cooldown')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async resetCooldown(@CurrentUser() user: IUser) {
    if (this.outboxService) {
      this.outboxService.resetQuotaCooldown();
    }
    if (this.emailChannel) {
      this.emailChannel.resetQuotaCooldown();
    }
    if (this.auditService && user?.id) {
      await this.auditService.logAction({
        userId: user.id,
        action: 'RESET_EMAIL_QUOTA_COOLDOWN',
        module: 'COMMUNICATIONS',
        description: 'Admin manually reset email quota cooldown',
      });
    }
    return { success: true, message: 'Email provider quota cooldown manually reset' };
  }

  @Post('campaigns/outbox/retry-quota-blocked')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async retryQuotaBlocked(@CurrentUser() user: IUser) {
    let recoveredCount = 0;
    if (this.outboxService) {
      recoveredCount = await this.outboxService.retryQuotaBlockedDeliveries();
    }
    if (this.emailChannel) {
      this.emailChannel.resetQuotaCooldown();
    }
    if (this.auditService && user?.id) {
      await this.auditService.logAction({
        userId: user.id,
        action: 'RETRY_QUOTA_BLOCKED_DELIVERIES',
        module: 'COMMUNICATIONS',
        description: `Admin requeued ${recoveredCount} quota-blocked deliveries for retry`,
        metadata: { recoveredCount },
      });
    }
    return {
      success: true,
      recoveredCount,
      message: `Re-queued ${recoveredCount} quota-blocked deliveries for retry`,
    };
  }

  @Post('campaigns/test-email-connection')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async testEmailConnection() {
    if (!this.emailChannel) {
      return { success: false, status: 'UNCONFIGURED', message: 'Email channel not initialized' };
    }
    return this.emailChannel.verifyConnection();
  }

  // ─── DELIVERY WEBHOOKS ──────────────────────────────────────────────────────

  @Get('webhook/:provider')
  verifyWebhook(
    @Param('provider') provider: string,
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    if (provider.toLowerCase() === 'whatsapp' || provider.toLowerCase() === 'meta') {
      const configuredToken = (
        process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
        process.env.WHATSAPP_VERIFY_TOKEN ||
        ''
      ).trim();

      // Security requirement: fail-closed if token is unconfigured or mismatched
      if (
        mode === 'subscribe' &&
        configuredToken &&
        token === configuredToken &&
        challenge
      ) {
        return challenge;
      }
      throw new UnauthorizedException('Invalid or unconfigured webhook verify token');
    }
    return { status: 'OK', provider };
  }

  @Post('webhook/:provider')
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-hub-signature-256') hubSignature?: string,
    @Headers('x-twilio-email-event-webhook-signature') sgSignature?: string,
    @Headers('x-twilio-email-event-webhook-timestamp') sgTimestamp?: string,
  ) {
    const provLower = provider.toLowerCase();

    // Check HMAC signature if generic secret is configured (fail-closed for WhatsApp / Meta / generic)
    const webhookSecret = (
      process.env.WHATSAPP_WEBHOOK_SECRET ||
      process.env.META_APP_SECRET ||
      process.env.NOTIFICATION_WEBHOOK_SECRET ||
      ''
    ).trim();

    if (webhookSecret && (provLower === 'whatsapp' || provLower === 'meta' || provLower === 'generic')) {
      const sigHeader = hubSignature || signature;
      if (!sigHeader) {
        throw new UnauthorizedException('Missing webhook signature header');
      }
      const sigToVerify = sigHeader.replace(/^sha256=/, '');
      const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const computed = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');
      if (sigToVerify !== computed) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // 1. Meta WhatsApp Cloud API nested status format
    if (provLower === 'whatsapp' || provLower === 'meta') {
      const metaStatuses = payload?.entry?.[0]?.changes?.[0]?.value?.statuses;
      if (Array.isArray(metaStatuses) && metaStatuses.length > 0) {
        const results: any[] = [];
        for (const st of metaStatuses) {
          const providerMessageId = st.id;
          const rawStatus = (st.status || '').toUpperCase();
          const eventStatus: any =
            rawStatus === 'DELIVERED'
              ? 'DELIVERED'
              : rawStatus === 'READ'
              ? 'READ'
              : rawStatus === 'SENT'
              ? 'SENT'
              : rawStatus === 'FAILED'
              ? 'FAILED'
              : 'DELIVERED';

          const timestamp = st.timestamp ? new Date(Number(st.timestamp) * 1000) : new Date();
          const failureReason = st.errors?.[0]?.message || st.errors?.[0]?.title || undefined;

          const res = await this.dispatcher.handleDeliveryWebhook(
            providerMessageId,
            eventStatus,
            { failureReason, timestamp },
          );
          results.push(res);
        }
        return { processed: true, count: results.length, results };
      }
    }

    // 2. SendGrid Event Webhook format (array of event objects or single object)
    if (provLower === 'sendgrid') {
      // Replay attack protection on timestamp
      if (sgTimestamp) {
        const tsNum = Number(sgTimestamp);
        if (!isNaN(tsNum)) {
          const nowSec = Math.floor(Date.now() / 1000);
          if (Math.abs(nowSec - tsNum) > 600) {
            throw new UnauthorizedException('SendGrid webhook timestamp expired or replayed');
          }
        }
      }

      // Webhook cryptographic verification if configured
      const sgVerificationKey = (process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY || '').trim();
      const sgSecret = (process.env.SENDGRID_WEBHOOK_SECRET || '').trim();

      if (sgVerificationKey) {
        if (!sgSignature || !sgTimestamp) {
          throw new UnauthorizedException('Missing SendGrid webhook signature or timestamp');
        }
        const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
        try {
          const verifier = crypto.createVerify('sha256');
          verifier.update(sgTimestamp + rawPayload);
          const isValid = verifier.verify(sgVerificationKey, sgSignature, 'base64');
          if (!isValid) {
            throw new UnauthorizedException('Invalid SendGrid ECDSA signature');
          }
        } catch (err: any) {
          throw new UnauthorizedException(`SendGrid signature verification error: ${err.message}`);
        }
      } else if (sgSecret) {
        const activeSig = (sgSignature || signature || '').replace(/^sha256=/, '');
        if (!activeSig) {
          throw new UnauthorizedException('Missing SendGrid webhook signature');
        }
        const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const dataToHash = sgTimestamp ? sgTimestamp + rawPayload : rawPayload;
        const hmacBase64 = crypto.createHmac('sha256', sgSecret).update(dataToHash).digest('base64');
        const hmacHex = crypto.createHmac('sha256', sgSecret).update(dataToHash).digest('hex');
        if (activeSig !== hmacBase64 && activeSig !== hmacHex) {
          throw new UnauthorizedException('Invalid SendGrid webhook signature');
        }
      }

      const events: any[] = Array.isArray(payload) ? payload : [payload];
      const results: any[] = [];

      for (const ev of events) {
        const evType = (ev.event || '').toLowerCase();
        const msgId = (ev.sg_message_id || ev['smtp-id'] || ev.message_id || '').trim();
        const email = ev.email ? String(ev.email).trim().toLowerCase() : undefined;
        const timestamp = ev.timestamp ? new Date(Number(ev.timestamp) * 1000) : new Date();

        let eventStatus: 'SENT' | 'DELIVERED' | 'BOUNCED' | 'FAILED' = 'DELIVERED';
        let failureReason: string | undefined = undefined;

        if (evType === 'delivered') {
          eventStatus = 'DELIVERED';
        } else if (evType === 'bounce') {
          const isHard =
            ev.type === 'bounce' ||
            (ev.bounce_classification || '').toLowerCase().includes('hard') ||
            (ev.reason || '').includes('550');
          eventStatus = isHard ? 'BOUNCED' : 'FAILED';
          failureReason = isHard ? 'HARD_BOUNCE' : 'SOFT_BOUNCE';
        } else if (evType === 'spamreport') {
          eventStatus = 'BOUNCED';
          failureReason = 'COMPLAINT';
        } else if (evType === 'dropped') {
          eventStatus = 'FAILED';
          failureReason = 'DROPPED';
        } else if (evType === 'deferred') {
          eventStatus = 'SENT';
          failureReason = 'DEFERRED_DELIVERY';
        } else if (evType === 'processed' || evType === 'sent') {
          eventStatus = 'SENT';
        }

        const res = await this.dispatcher.handleDeliveryWebhook(
          msgId,
          eventStatus,
          {
            failureReason: failureReason || ev.reason || undefined,
            timestamp,
            recipientEmail: email,
          },
        );
        results.push(res);
      }

      return { processed: true, count: results.length, results };
    }

    // 3. Amazon SES via SNS Notification format
    if (
      provLower === 'ses' ||
      provLower === 'amazonses' ||
      provLower === 'aws-sns' ||
      provLower === 'sns'
    ) {
      // Security Requirement: Strictly validate SigningCertURL against SSRF if present
      if (payload.SigningCertURL) {
        if (!this.validateSnsCertificateUrl(payload.SigningCertURL)) {
          this.logger.warn(`[SNS SSRF ATTEMPT] Blocked untrusted SigningCertURL: ${payload.SigningCertURL}`);
          throw new BadRequestException('Invalid or untrusted AWS SNS SigningCertURL');
        }
      }

      // Security Requirement: Strictly validate SubscribeURL against SSRF on SubscriptionConfirmation
      if (payload.Type === 'SubscriptionConfirmation') {
        if (!payload.SubscribeURL || !this.validateSnsSubscribeUrl(payload.SubscribeURL)) {
          this.logger.warn(`[SNS SSRF ATTEMPT] Blocked untrusted SubscribeURL: ${payload.SubscribeURL}`);
          throw new BadRequestException('Invalid or untrusted AWS SNS SubscribeURL');
        }

        // If automated confirmation is enabled, confirm via safe HTTPS GET
        if (process.env.AWS_SNS_AUTO_CONFIRM_SUBSCRIPTION === 'true') {
          try {
            const https = await import('https');
            await new Promise<void>((resolve, reject) => {
              const req = https.get(payload.SubscribeURL, { timeout: 5000 }, (res) => {
                if (res.statusCode && res.statusCode < 400) {
                  this.logger.log(`[SNS SUBSCRIPTION CONFIRMED] TopicArn: ${payload.TopicArn}`);
                  resolve();
                } else {
                  reject(new Error(`HTTP ${res.statusCode}`));
                }
              });
              req.on('timeout', () => {
                req.destroy();
                reject(new Error('Timeout'));
              });
              req.on('error', reject);
            });
            return {
              status: 'SUBSCRIPTION_CONFIRMED',
              topicArn: payload.TopicArn,
            };
          } catch (confirmErr: any) {
            this.logger.error(`Failed to auto-confirm SNS subscription: ${confirmErr.message}`);
          }
        }

        return {
          status: 'SUBSCRIPTION_CONFIRMATION_RECEIVED',
          topicArn: payload.TopicArn,
          subscribeUrl: payload.SubscribeURL,
        };
      }

      // Timestamp freshness check (1 hour window to protect against replays)
      if (payload.Timestamp) {
        const eventTime = new Date(payload.Timestamp).getTime();
        if (!isNaN(eventTime) && Math.abs(Date.now() - eventTime) > 60 * 60 * 1000) {
          throw new UnauthorizedException('AWS SNS notification timestamp expired or replayed');
        }
      }

      // Cryptographic signature check (fetches certificate securely over HTTPS if not in cache)
      if (payload.Signature && payload.SigningCertURL) {
        const signableString = this.buildSnsSignableString(payload);
        if (signableString) {
          try {
            const cert = await this.fetchSnsCertificate(payload.SigningCertURL);
            const verifier = crypto.createVerify(
              payload.SignatureVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1',
            );
            verifier.update(signableString, 'utf8');
            if (!verifier.verify(cert, payload.Signature, 'base64')) {
              throw new UnauthorizedException('Invalid AWS SNS signature');
            }
          } catch (err: any) {
            if (err instanceof BadRequestException || err instanceof UnauthorizedException) {
              throw err;
            }
            throw new UnauthorizedException(`AWS SNS signature verification failed: ${err.message}`);
          }
        }
      }

      let innerMessage: any = payload;
      if (typeof payload.Message === 'string') {
        try {
          innerMessage = JSON.parse(payload.Message);
        } catch {
          innerMessage = payload;
        }
      }

      const evType = (innerMessage.eventType || innerMessage.notificationType || '').toLowerCase();
      const mail = innerMessage.mail || {};
      const msgId = (mail.messageId || payload.MessageId || '').trim();
      const destination = Array.isArray(mail.destination) ? mail.destination[0] : undefined;
      const timestamp = mail.timestamp ? new Date(mail.timestamp) : new Date();

      let eventStatus: 'SENT' | 'DELIVERED' | 'BOUNCED' | 'FAILED' = 'DELIVERED';
      let failureReason: string | undefined = undefined;

      if (evType === 'delivery') {
        eventStatus = 'DELIVERED';
      } else if (evType === 'bounce') {
        const isPermanent = innerMessage.bounce?.bounceType === 'Permanent';
        eventStatus = isPermanent ? 'BOUNCED' : 'FAILED';
        failureReason = isPermanent ? 'HARD_BOUNCE' : 'SOFT_BOUNCE';
      } else if (evType === 'complaint') {
        eventStatus = 'BOUNCED';
        failureReason = 'COMPLAINT';
      } else if (evType === 'send') {
        eventStatus = 'SENT';
      }

      const res = await this.dispatcher.handleDeliveryWebhook(
        msgId,
        eventStatus,
        {
          failureReason: failureReason || innerMessage.bounce?.bouncedRecipients?.[0]?.diagnosticCode,
          timestamp,
          recipientEmail: destination,
        },
      );

      return { processed: true, result: res };
    }

    // 4. Generic / Fast2SMS status payload
    const providerMessageId =
      payload.messageId || payload.id || payload.providerMessageId || payload.request_id || payload.data?.id;
    const rawStatus = (payload.status || payload.event || 'DELIVERED').toUpperCase();
    const eventStatus: any =
      rawStatus === 'DELIVERED' || rawStatus === 'SUCCESS'
        ? 'DELIVERED'
        : rawStatus === 'SENT'
        ? 'SENT'
        : rawStatus === 'BOUNCED'
        ? 'BOUNCED'
        : rawStatus === 'FAILED'
        ? 'FAILED'
        : 'DELIVERED';

    return this.dispatcher.handleDeliveryWebhook(
      providerMessageId,
      eventStatus,
      { failureReason: payload.error || payload.reason },
    );
  }
}
