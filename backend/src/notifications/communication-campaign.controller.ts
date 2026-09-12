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
} from '@nestjs/common';
import {
  CommunicationCampaignService,
  CreateCampaignDto,
  UpdateCampaignDto,
} from './communication-campaign.service';
import { NotificationDispatcher } from './notification-channels.service';
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
  ) {}

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

  // ─── DELIVERY WEBHOOKS ──────────────────────────────────────────────────────

  @Post('webhook/:provider')
  handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
    @Headers('x-webhook-signature') signature?: string,
  ) {
    const providerMessageId =
      payload.messageId || payload.id || payload.providerMessageId || payload.data?.id;
    const status = payload.status || payload.event || 'DELIVERED';

    return this.dispatcher.handleDeliveryWebhook(
      providerMessageId,
      status.toUpperCase() as any,
      { failureReason: payload.error || payload.reason },
    );
  }
}
