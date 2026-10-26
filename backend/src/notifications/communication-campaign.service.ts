import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AudienceBuilderService, AudienceFilterPayload } from './audience-builder.service';
import { TemplateEngineService } from './template-engine.service';
import { NotificationDispatcher } from './notification-channels.service';
import {
  CommunicationChannel,
  CommunicationCampaignStatus,
  CommunicationDeliveryStatus,
  CampaignAudienceType,
  CommCampaignType,
} from '@prisma/client';

export class CreateCampaignDto {
  @IsOptional()
  @IsString()
  campaignName?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: 'TRANSACTIONAL' | 'PROMOTIONAL';

  @IsOptional()
  @IsArray()
  channels: ('IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP')[];

  @IsOptional()
  @IsString()
  targetEntity?: 'STUDENT' | 'LEAD' | 'STAFF' | 'ALL';

  @IsOptional()
  @IsString()
  audienceId?: string;

  @IsOptional()
  @IsObject()
  audienceFilter: AudienceFilterPayload;

  @IsOptional()
  @IsString()
  audienceType?: 'DYNAMIC' | 'SNAPSHOT';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  messageTitle?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  emailSubject?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  messageBody?: string;

  @IsOptional()
  @IsString()
  smsBody?: string;

  @IsOptional()
  @IsString()
  whatsAppTemplateName?: string;

  @IsOptional()
  @IsString()
  whatsAppBody?: string;

  @IsOptional()
  @IsString()
  emailHtml?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsNumber()
  estimatedCost?: number;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  campaignName?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: 'TRANSACTIONAL' | 'PROMOTIONAL';

  @IsOptional()
  @IsArray()
  channels?: ('IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP')[];

  @IsOptional()
  @IsString()
  targetEntity?: 'STUDENT' | 'LEAD' | 'STAFF' | 'ALL';

  @IsOptional()
  @IsString()
  audienceId?: string;

  @IsOptional()
  @IsObject()
  audienceFilter?: AudienceFilterPayload;

  @IsOptional()
  @IsString()
  audienceType?: 'DYNAMIC' | 'SNAPSHOT';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  messageTitle?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  emailSubject?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  messageBody?: string;

  @IsOptional()
  @IsString()
  smsBody?: string;

  @IsOptional()
  @IsString()
  whatsAppTemplateName?: string;

  @IsOptional()
  @IsString()
  whatsAppBody?: string;

  @IsOptional()
  @IsString()
  emailHtml?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsNumber()
  estimatedCost?: number;
}

@Injectable()
export class CommunicationCampaignService {
  private readonly logger = new Logger(CommunicationCampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audienceBuilder: AudienceBuilderService,
    private readonly templateEngine: TemplateEngineService,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  /**
   * List all campaigns with filters and pagination.
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: CommunicationCampaignStatus;
    type?: CommCampaignType;
    channel?: CommunicationChannel;
  }) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { title: { contains: params.search, mode: 'insensitive' } },
        { campaignCode: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;
    if (params.channel) where.channels = { has: params.channel };

    const [total, campaigns] = await Promise.all([
      this.prisma.communicationCampaign.count({ where }),
      this.prisma.communicationCampaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { id: true, name: true, code: true } },
          savedAudience: { select: { id: true, name: true, entityType: true } },
        },
      }),
    ]);

    return {
      data: campaigns,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieve Single Campaign.
   */
  async findOne(id: string) {
    const campaign = await this.prisma.communicationCampaign.findUnique({
      where: { id },
      include: {
        template: true,
        savedAudience: true,
        _count: { select: { deliveries: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID "${id}" not found.`);
    }

    return campaign;
  }

  /**
   * Create Campaign in DRAFT.
   */
  async createCampaign(dto: CreateCampaignDto, userId?: string) {
    const rawName = dto.campaignName !== undefined ? dto.campaignName : dto.name;
    const name = (rawName || '').trim();
    if (!name) {
      throw new BadRequestException('Campaign name is required.');
    }

    const rawTitle = dto.messageTitle !== undefined ? dto.messageTitle : dto.title;
    const title = (rawTitle || name).trim();
    const rawMessage = dto.messageBody !== undefined ? dto.messageBody : dto.message;
    const message = (rawMessage || title).trim();
    if (!message) {
      throw new BadRequestException('Campaign message body is required.');
    }

    const subject = dto.emailSubject !== undefined ? dto.emailSubject : dto.subject;

    const channels = Array.isArray(dto.channels) && dto.channels.length > 0
      ? (dto.channels as CommunicationChannel[])
      : [CommunicationChannel.IN_APP];

    const audienceFilter = dto.audienceFilter || {
      targetEntity: dto.targetEntity || 'STUDENT',
      conditions: [],
      exclusions: [],
      collegeRelationship: 'ANY',
    };

    // Initial audience estimate with error resilience
    let audienceEstimate = {
      totalCount: 0,
      eligibleCount: 0,
      excludedConsentCount: 0,
      invalidContactCount: 0,
    };

    try {
      audienceEstimate = await this.audienceBuilder.resolveAudience(audienceFilter, {
        campaignType: (dto.type as any) || 'PROMOTIONAL',
        channels,
        limit: 5,
      });
    } catch (err: any) {
      this.logger.warn(`Audience estimate error during creation: ${err.message}`);
    }

    let scheduledDate: Date | null = null;
    let campaignStatus: CommunicationCampaignStatus = CommunicationCampaignStatus.DRAFT;

    if (dto.scheduledAt && typeof dto.scheduledAt === 'string' && dto.scheduledAt.trim() !== '') {
      const parsed = new Date(dto.scheduledAt);
      if (!isNaN(parsed.getTime())) {
        scheduledDate = parsed;
        campaignStatus = CommunicationCampaignStatus.SCHEDULED;
      }
    }

    const campaignCode = `CAMP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    return this.prisma.communicationCampaign.create({
      data: {
        name,
        campaignCode,
        type: (dto.type as CommCampaignType) || CommCampaignType.PROMOTIONAL,
        status: campaignStatus,
        channels,
        targetEntity: dto.targetEntity || 'STUDENT',
        audienceId: dto.audienceId || null,
        audienceFilter: audienceFilter as any,
        audienceType: (dto.audienceType as CampaignAudienceType) || CampaignAudienceType.DYNAMIC,
        subject: subject || null,
        title,
        message,
        smsBody: dto.smsBody || null,
        whatsAppTemplateName: dto.whatsAppTemplateName || null,
        whatsAppBody: dto.whatsAppBody || null,
        emailHtml: dto.emailHtml || null,
        templateId: dto.templateId || null,
        scheduledAt: scheduledDate,
        timezone: dto.timezone || 'Asia/Kolkata',
        totalAudience: audienceEstimate.totalCount || 0,
        eligibleCount: audienceEstimate.eligibleCount || 0,
        excludedConsentCount: audienceEstimate.excludedConsentCount || 0,
        invalidContactCount: audienceEstimate.invalidContactCount || 0,
        estimatedCost: Number(dto.estimatedCost || 0.0),
        createdById: userId || null,
      },
    });
  }

  /**
   * Update Campaign (only editable if in DRAFT, REVIEW, or SCHEDULED).
   */
  async updateCampaign(id: string, dto: UpdateCampaignDto, userId?: string) {
    const campaign = await this.findOne(id);

    if (
      campaign.status === CommunicationCampaignStatus.PROCESSING ||
      campaign.status === CommunicationCampaignStatus.SENT
    ) {
      throw new BadRequestException('Cannot edit a campaign that is already processing or sent.');
    }

    const updateData: any = {};
    const rawName = dto.campaignName !== undefined ? dto.campaignName : dto.name;
    if (rawName !== undefined) updateData.name = rawName.trim();

    const rawTitle = dto.messageTitle !== undefined ? dto.messageTitle : dto.title;
    if (rawTitle !== undefined) updateData.title = rawTitle.trim();

    const rawMessage = dto.messageBody !== undefined ? dto.messageBody : dto.message;
    if (rawMessage !== undefined) updateData.message = rawMessage.trim();

    const rawSubject = dto.emailSubject !== undefined ? dto.emailSubject : dto.subject;
    if (rawSubject !== undefined) updateData.subject = rawSubject;

    if (dto.smsBody !== undefined) updateData.smsBody = dto.smsBody;
    if (dto.emailHtml !== undefined) updateData.emailHtml = dto.emailHtml;
    if (dto.whatsAppBody !== undefined) updateData.whatsAppBody = dto.whatsAppBody;
    if (dto.type) updateData.type = dto.type as CommCampaignType;
    if (dto.targetEntity) updateData.targetEntity = dto.targetEntity;
    if (dto.audienceId !== undefined) updateData.audienceId = dto.audienceId || null;
    if (dto.channels && dto.channels.length > 0) updateData.channels = dto.channels as CommunicationChannel[];
    if (dto.audienceFilter) updateData.audienceFilter = dto.audienceFilter as any;
    if (dto.audienceType) updateData.audienceType = dto.audienceType as CampaignAudienceType;

    if (dto.scheduledAt !== undefined) {
      if (dto.scheduledAt && typeof dto.scheduledAt === 'string' && dto.scheduledAt.trim() !== '') {
        const parsed = new Date(dto.scheduledAt);
        if (!isNaN(parsed.getTime())) {
          updateData.scheduledAt = parsed;
          updateData.status = CommunicationCampaignStatus.SCHEDULED;
        }
      } else {
        updateData.scheduledAt = null;
        updateData.status = CommunicationCampaignStatus.DRAFT;
      }
    }

    return this.prisma.communicationCampaign.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Cancel a scheduled campaign.
   */
  async cancelCampaign(id: string, userId?: string) {
    const campaign = await this.findOne(id);

    if (campaign.status === CommunicationCampaignStatus.PROCESSING) {
      throw new BadRequestException('Campaign is already processing and cannot be cancelled.');
    }
    if (campaign.status === CommunicationCampaignStatus.SENT) {
      throw new BadRequestException('Campaign has already been sent.');
    }

    return this.prisma.communicationCampaign.update({
      where: { id },
      data: { status: CommunicationCampaignStatus.CANCELLED },
    });
  }

  /**
   * Authoritative Campaign Execution & Batch Chunk Dispatcher.
   */
  async sendCampaign(id: string, userId?: string) {
    const campaign = await this.findOne(id);

    // Double-send idempotency lock
    if (campaign.sendLock || campaign.status === CommunicationCampaignStatus.PROCESSING) {
      throw new BadRequestException('Campaign is currently being processed by another worker.');
    }
    if (campaign.status === CommunicationCampaignStatus.SENT) {
      throw new BadRequestException('Campaign has already been sent.');
    }

    // Acquire send lock & set status to PROCESSING
    await this.prisma.communicationCampaign.update({
      where: { id },
      data: {
        sendLock: true,
        status: CommunicationCampaignStatus.PROCESSING,
        sentAt: new Date(),
      },
    });

    try {
      // Resolve true audience at actual send time
      const audienceRes = await this.audienceBuilder.resolveAudience(
        campaign.audienceFilter as any,
        {
          campaignType: campaign.type as any,
          channels: campaign.channels,
          fetchAll: true,
        },
      );

      const allRecipients = audienceRes.allRecipients || [];

      let sentCount = 0;
      let deliveredCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      // Process recipients in chunks of 250 to prevent memory spikes
      const CHUNK_SIZE = 250;
      for (let i = 0; i < allRecipients.length; i += CHUNK_SIZE) {
        const chunk = allRecipients.slice(i, i + CHUNK_SIZE);

        for (const recipient of chunk) {
          // Render personalized variables per recipient
          const context = {
            studentName: recipient.name,
            courseName: recipient.course || '',
            branchName: recipient.branch || '',
            role: recipient.role || '',
            state: recipient.state || '',
            district: recipient.district || '',
          };

          const renderedTitle = this.templateEngine.render(campaign.title, context);
          const renderedMessage = this.templateEngine.render(campaign.message, context);
          const renderedSubject = this.templateEngine.render(campaign.subject || campaign.title, context);
          const renderedSms = this.templateEngine.render(campaign.smsBody || campaign.message, context);
          const renderedWa = this.templateEngine.render(campaign.whatsAppBody || campaign.message, context);
          const renderedHtml = this.templateEngine.render(campaign.emailHtml || campaign.message, context);

          // Dispatch to all selected channels for this recipient
          for (const channel of campaign.channels) {
            // Check if recipient has consent / validity for this channel
            const isEligibleForChannel = recipient.channelsAvailable.includes(channel);

            if (!isEligibleForChannel) {
              skippedCount++;
              await this.prisma.communicationDelivery.create({
                data: {
                  campaignId: campaign.id,
                  channel,
                  recipientType: recipient.recipientType,
                  recipientId: recipient.recipientId,
                  recipientName: recipient.name,
                  recipientEmail: recipient.email || null,
                  recipientMobile: recipient.mobile || null,
                  status: CommunicationDeliveryStatus.SKIPPED,
                  failureReason: recipient.exclusionReason || recipient.invalidContactReason || 'Channel not eligible',
                  isRetryable: false,
                },
              });
              continue;
            }

            // Dispatch via authoritative channel provider
            const sendResult = await this.dispatcher.dispatchChannel(
              channel,
              {
                id: recipient.recipientId,
                name: recipient.name,
                email: recipient.email,
                mobile: recipient.mobile,
                type: recipient.recipientType,
              },
              {
                title: renderedTitle,
                subject: renderedSubject,
                message: renderedMessage,
                smsBody: renderedSms,
                whatsAppTemplateName: campaign.whatsAppTemplateName || undefined,
                whatsAppBody: renderedWa,
                emailHtml: renderedHtml,
              },
              { campaignId: campaign.id, campaignCode: campaign.campaignCode },
            );

            if (sendResult.success) {
              sentCount++;
              if (sendResult.status === CommunicationDeliveryStatus.DELIVERED) {
                deliveredCount++;
              }
            } else {
              failedCount++;
            }

            // Record delivery trace
            await this.prisma.communicationDelivery.create({
              data: {
                campaignId: campaign.id,
                channel,
                recipientType: recipient.recipientType,
                recipientId: recipient.recipientId,
                recipientName: recipient.name,
                recipientEmail: recipient.email || null,
                recipientMobile: recipient.mobile || null,
                status: sendResult.status,
                providerMessageId: sendResult.providerMessageId || null,
                errorMessage: sendResult.errorMessage || null,
                failureReason: sendResult.failureReason || null,
                isRetryable: sendResult.isRetryable !== undefined ? sendResult.isRetryable : true,
                sentAt: sendResult.success ? new Date() : null,
                deliveredAt: sendResult.status === CommunicationDeliveryStatus.DELIVERED ? new Date() : null,
                failedAt: !sendResult.success ? new Date() : null,
              },
            });
          }
        }
      }

      // Final status determination
      const finalStatus =
        failedCount > 0 && sentCount > 0
          ? CommunicationCampaignStatus.PARTIALLY_SENT
          : failedCount > 0 && sentCount === 0
          ? CommunicationCampaignStatus.FAILED
          : CommunicationCampaignStatus.SENT;

      return this.prisma.communicationCampaign.update({
        where: { id: campaign.id },
        data: {
          sendLock: false,
          status: finalStatus,
          totalAudience: audienceRes.totalCount,
          eligibleCount: audienceRes.eligibleCount,
          excludedConsentCount: audienceRes.excludedConsentCount,
          invalidContactCount: audienceRes.invalidContactCount,
          sentCount,
          deliveredCount,
          failedCount,
          skippedCount,
          completedAt: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.error(`Campaign execution failed for ${id}: ${err.message}`);
      await this.prisma.communicationCampaign.update({
        where: { id },
        data: {
          sendLock: false,
          status: CommunicationCampaignStatus.FAILED,
          failureReason: err.message,
        },
      });
      throw err;
    }
  }

  /**
   * Retry all failed deliveries for a campaign.
   */
  async retryFailedDeliveries(campaignId: string, userId?: string) {
    const campaign = await this.findOne(campaignId);

    const failedDeliveries = await this.prisma.communicationDelivery.findMany({
      where: {
        campaignId,
        status: CommunicationDeliveryStatus.FAILED,
        isRetryable: true,
      },
    });

    if (failedDeliveries.length === 0) {
      return { retried: 0, message: 'No retryable failed deliveries found.' };
    }

    let retriedSuccess = 0;
    let retriedFailed = 0;

    for (const item of failedDeliveries) {
      const result = await this.dispatcher.dispatchChannel(
        item.channel,
        {
          id: item.recipientId || '',
          name: item.recipientName || '',
          email: item.recipientEmail || undefined,
          mobile: item.recipientMobile || undefined,
          type: item.recipientType,
        },
        {
          title: campaign.title,
          subject: campaign.subject || campaign.title,
          message: campaign.message,
          smsBody: campaign.smsBody || campaign.message,
          whatsAppTemplateName: campaign.whatsAppTemplateName || undefined,
          whatsAppBody: campaign.whatsAppBody || campaign.message,
          emailHtml: campaign.emailHtml || campaign.message,
        },
        { campaignId: campaign.id, retry: true },
      );

      if (result.success) {
        retriedSuccess++;
        await this.prisma.communicationDelivery.update({
          where: { id: item.id },
          data: {
            status: result.status,
            providerMessageId: result.providerMessageId,
            errorMessage: null,
            failureReason: null,
            retryCount: { increment: 1 },
            sentAt: new Date(),
          },
        });
      } else {
        retriedFailed++;
        await this.prisma.communicationDelivery.update({
          where: { id: item.id },
          data: {
            status: CommunicationDeliveryStatus.FAILED,
            errorMessage: result.errorMessage,
            failureReason: result.failureReason,
            retryCount: { increment: 1 },
            failedAt: new Date(),
          },
        });
      }
    }

    return {
      retried: failedDeliveries.length,
      retriedSuccess,
      retriedFailed,
    };
  }

  /**
   * Get Campaign Analytics & Delivery Breakdown.
   */
  async getCampaignAnalytics(id: string) {
    const campaign = await this.findOne(id);

    const [channelStats, statusStats] = await Promise.all([
      this.prisma.communicationDelivery.groupBy({
        by: ['channel', 'status'],
        where: { campaignId: id },
        _count: true,
      }),
      this.prisma.communicationDelivery.groupBy({
        by: ['status'],
        where: { campaignId: id },
        _count: true,
      }),
    ]);

    const totalDeliveries = statusStats.reduce((acc, curr) => acc + curr._count, 0);

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        code: campaign.campaignCode,
        status: campaign.status,
        type: campaign.type,
        channels: campaign.channels,
        createdAt: campaign.createdAt,
        sentAt: campaign.sentAt,
        completedAt: campaign.completedAt,
      },
      summary: {
        totalAudience: campaign.totalAudience,
        eligibleCount: campaign.eligibleCount,
        excludedConsentCount: campaign.excludedConsentCount,
        invalidContactCount: campaign.invalidContactCount,
        sentCount: campaign.sentCount,
        deliveredCount: campaign.deliveredCount,
        failedCount: campaign.failedCount,
        skippedCount: campaign.skippedCount,
        deliveryRate: campaign.sentCount > 0 ? ((campaign.deliveredCount / campaign.sentCount) * 100).toFixed(1) + '%' : '0%',
      },
      statusDistribution: statusStats.map((s) => ({ status: s.status, count: s._count })),
      channelDistribution: channelStats.map((c) => ({
        channel: c.channel,
        status: c.status,
        count: c._count,
      })),
    };
  }

  /**
   * Query paginated delivery logs.
   */
  async getDeliveryLogs(params: {
    campaignId?: string;
    channel?: CommunicationChannel;
    status?: CommunicationDeliveryStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.campaignId) where.campaignId = params.campaignId;
    if (params.channel) where.channel = params.channel;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { recipientName: { contains: params.search, mode: 'insensitive' } },
        { recipientEmail: { contains: params.search, mode: 'insensitive' } },
        { recipientMobile: { contains: params.search, mode: 'insensitive' } },
        { providerMessageId: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.communicationDelivery.count({ where }),
      this.prisma.communicationDelivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: { select: { id: true, name: true, campaignCode: true } },
        },
      }),
    ]);

    return {
      data: logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves durable list of suppressed email recipients (hard bounces, complaints).
   */
  async getSuppressionList(params: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = {
      channel: CommunicationChannel.EMAIL,
      failureReason: { in: ['HARD_BOUNCE', 'COMPLAINT', 'PERMANENT_REJECTION', 'SPAM_REPORT'] },
      recipientEmail: { not: null },
    };

    if (params.search) {
      where.recipientEmail = { contains: params.search.trim().toLowerCase(), mode: 'insensitive' };
    }

    const [total, records] = await Promise.all([
      this.prisma.communicationDelivery.count({ where }),
      this.prisma.communicationDelivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          recipientEmail: true,
          recipientName: true,
          recipientType: true,
          failureReason: true,
          errorMessage: true,
          status: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      data: records,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Manually overrides / removes suppression for a recipient with audit trail.
   */
  async removeSuppression(recipientEmail: string, removedByUserId?: string, overrideReason?: string) {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      throw new BadRequestException('A valid recipient email address is required');
    }

    const normEmail = recipientEmail.trim().toLowerCase();

    const affected = await this.prisma.communicationDelivery.updateMany({
      where: {
        recipientEmail: normEmail,
        channel: CommunicationChannel.EMAIL,
        failureReason: { in: ['HARD_BOUNCE', 'COMPLAINT', 'PERMANENT_REJECTION', 'SPAM_REPORT'] },
      },
      data: {
        failureReason: 'SUPPRESSION_OVERRIDDEN',
        errorMessage: `Suppression manually overridden by admin${overrideReason ? `: ${overrideReason}` : ''}`,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `[SUPPRESSION OVERRIDE] Admin removed suppression for ${normEmail}. Cleared ${affected.count} records.`,
    );

    return {
      success: true,
      recipientEmail: normEmail,
      clearedRecordsCount: affected.count,
      message: `Suppression removed for ${normEmail}. Recipient is now eligible for future communications.`,
    };
  }
}

