import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { AudienceController } from './audience.controller';
import { CommunicationTemplateController } from './communication-template.controller';
import { CommunicationCampaignController } from './communication-campaign.controller';
import { NotificationsService } from './notifications.service';
import { AudienceBuilderService } from './audience-builder.service';
import { TemplateEngineService } from './template-engine.service';
import { CommunicationCampaignService } from './communication-campaign.service';
import {
  InAppChannel,
  EmailChannel,
  SmsChannel,
  WhatsAppChannel,
  NotificationDispatcher,
} from './notification-channels.service';
import { DurableOutboxService } from './durable-outbox.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesModule } from '../roles/roles.module';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => RolesModule),
    forwardRef(() => AuditModule),
    forwardRef(() => SettingsModule),
  ],
  controllers: [
    CommunicationCampaignController,
    CommunicationTemplateController,
    AudienceController,
    NotificationsController,
  ],
  providers: [
    NotificationsService,
    AudienceBuilderService,
    TemplateEngineService,
    CommunicationCampaignService,
    DurableOutboxService,
    InAppChannel,
    EmailChannel,
    SmsChannel,
    WhatsAppChannel,
    NotificationDispatcher,
  ],
  exports: [
    NotificationsService,
    AudienceBuilderService,
    TemplateEngineService,
    CommunicationCampaignService,
    NotificationDispatcher,
    DurableOutboxService,
    EmailChannel,
    WhatsAppChannel,
    SmsChannel,
    InAppChannel,
  ],
})
export class NotificationsModule implements OnModuleInit {
  constructor(private readonly templateEngine: TemplateEngineService) {}

  async onModuleInit() {
    // Seed default system notification templates
    try {
      await this.templateEngine.seedDefaultTemplates();
    } catch {
      // safe fallback if db not connected during initialization
    }
  }
}
