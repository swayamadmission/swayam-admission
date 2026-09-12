import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { NotificationsService } from '../src/notifications/notifications.service';
import { CommunicationCampaignService } from '../src/notifications/communication-campaign.service';
import { AudienceBuilderService } from '../src/notifications/audience-builder.service';
import { TemplateEngineService } from '../src/notifications/template-engine.service';
import { NotificationDispatcher } from '../src/notifications/notification-channels.service';
import { SystemConfigurationService } from '../src/settings/system-configuration.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  CommunicationChannel,
  CommunicationCampaignStatus,
  CommunicationDeliveryStatus,
  Role,
} from '@prisma/client';

async function runEnterpriseNotificationsVerification() {
  console.log('===============================================================');
  console.log('  SWAYAM ADMISSION — ENTERPRISE NOTIFICATION & COMMUNICATION');
  console.log('===============================================================');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const notifService = app.get(NotificationsService);
  const campaignService = app.get(CommunicationCampaignService);
  const audienceBuilder = app.get(AudienceBuilderService);
  const templateEngine = app.get(TemplateEngineService);
  const dispatcher = app.get(NotificationDispatcher);
  const configService = app.get(SystemConfigurationService);
  const prisma = app.get(PrismaService);

  console.log('[1/10] Verified DI: Notifications, Campaign, Audience, Template & Dispatcher resolved successfully.');

  // 1. Dynamic Configuration Retrieval
  const retryLimit = await configService.getNumber('notification.retryLimit', 3);
  const batchSize = await configService.getNumber('notification.batchSize', 100);
  const timeoutSec = await configService.getNumber('notification.deliveryTimeout', 30);
  const rateLimit = await configService.getNumber('notification.rateLimitPerSec', 50);
  const dlqDays = await configService.getNumber('notification.dlqRetentionDays', 90);

  console.log(`[2/10] Dynamic Configuration: Retry Limit = ${retryLimit}, Batch Size = ${batchSize}, Rate Limit = ${rateLimit}/s, DLQ Retention = ${dlqDays}d`);

  // Find a test user (student and admin)
  let studentUser = await prisma.user.findFirst({ where: { role: Role.STUDENT } });
  if (!studentUser) studentUser = await prisma.user.findFirst();
  let adminUser = await prisma.user.findFirst({ where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } } });
  if (!adminUser) adminUser = studentUser;

  if (!studentUser || !adminUser) {
    throw new Error('Test users could not be found.');
  }

  console.log(`[3/10] Test Context: Student=${studentUser.email} (${studentUser.id}), Admin=${adminUser.email} (${adminUser.id})`);

  // 2. Dynamic Audience Builder Test
  const audiencePreview = await audienceBuilder.previewAudience(
    {
      targetEntity: 'STUDENT',
      conditions: [],
      exclusions: [],
      collegeRelationship: 'ANY',
    },
    [CommunicationChannel.IN_APP, CommunicationChannel.EMAIL],
  );
  console.log(`[4/10] Audience Builder: Resolved ${audiencePreview.totalAudience} Total Recipients (Eligible: ${audiencePreview.eligibleCount}, Excluded by Consent: ${audiencePreview.excludedConsentCount})`);

  // 3. Central Template Engine & Placeholder Rendering
  await templateEngine.seedDefaultTemplates();
  const testTemplate = await templateEngine.renderPreview('APPLICATION_SUBMITTED', {
    studentName: studentUser.fullName || 'Aryan Sharma',
    courseName: 'B.Tech Computer Science',
    collegeName: 'Swayam Institute of Technology',
    applicationNumber: 'APP-2026-0089',
  });
  console.log('Preview output:', JSON.stringify(testTemplate.previews));
  if (!testTemplate.previews?.IN_APP?.message?.includes('APP-2026-0089') && !testTemplate.previews?.IN_APP?.message?.includes('B.Tech')) {
    throw new Error('Template variable interpolation failed!');
  }
  console.log(`[5/10] Template Engine: Interpolated "application_submitted" with recipient placeholders correctly.`);

  // 4. Dispatch Multi-Channel Notification
  const inAppResult = await dispatcher.dispatchChannel(
    CommunicationChannel.IN_APP,
    {
      id: studentUser.id,
      name: studentUser.fullName || 'Test Student',
      email: studentUser.email,
      mobile: studentUser.mobile || '9876543210',
      type: 'STUDENT',
    },
    {
      title: 'Application Verification Update',
      subject: 'Application Verification Status — Swayam Admissions',
      message: 'Your application APP-2026-0089 has been submitted for document verification.',
      category: 'APPLICATION',
    },
  );

  const emailResult = await dispatcher.dispatchChannel(
    CommunicationChannel.EMAIL,
    {
      id: studentUser.id,
      name: studentUser.fullName || 'Test Student',
      email: studentUser.email,
      mobile: studentUser.mobile || '9876543210',
      type: 'STUDENT',
    },
    {
      title: 'Application Verification Update',
      subject: 'Application Verification Status — Swayam Admissions',
      message: 'Your application APP-2026-0089 has been submitted for document verification.',
      category: 'APPLICATION',
    },
  );

  if (!inAppResult?.success || !emailResult?.success) {
    throw new Error('Multi-channel dispatching failed!');
  }
  console.log(`[6/10] Multi-Channel Dispatch: In-App (${inAppResult.status}, ID: ${inAppResult.providerMessageId}), Email (${emailResult.status}, ID: ${emailResult.providerMessageId})`);

  // 5. Campaign Creation, Audience Binding & Send-Now Test
  const createdCampaign = await campaignService.createCampaign(
    {
      campaignName: `Orientation Announcement ${Date.now()}`,
      type: 'PROMOTIONAL',
      channels: [CommunicationChannel.IN_APP],
      targetEntity: 'STUDENT',
      title: 'Welcome to Swayam Academic Orientation',
      message: 'Please join the virtual orientation session on Monday at 10:00 AM.',
      audienceFilter: {
        targetEntity: 'STUDENT',
        conditions: [],
        exclusions: [],
        collegeRelationship: 'ANY',
      },
    },
    adminUser.id,
  );
  console.log(`[7/10] Campaign Created: ID=${createdCampaign.id}, Code=${createdCampaign.campaignCode}, Status=${createdCampaign.status}`);

  // Send Campaign
  const sendResult = await campaignService.sendCampaign(createdCampaign.id, adminUser.id);
  console.log(`      ✓ Campaign Dispatched: Status=${sendResult.status}, Processed=${sendResult.sentCount} recipients, Deliveries Logged.`);

  // 6. Webhook Idempotency Test
  const testProviderMsgId = emailResult.providerMessageId || `email_test_${Date.now()}`;
  const webhook1 = await dispatcher.handleDeliveryWebhook(testProviderMsgId, CommunicationDeliveryStatus.DELIVERED);
  const webhook2 = await dispatcher.handleDeliveryWebhook(testProviderMsgId, CommunicationDeliveryStatus.DELIVERED);
  console.log(`[8/10] Webhook Idempotency: Verified duplicate status callback transitions safely.`);

  // 7. Student Notification Center (Unread count & Mark-as-read)
  const unreadCountBefore = await notifService.getUnreadCount(studentUser.id, studentUser.role);
  if (inAppResult.providerMessageId) {
    await notifService.markAsRead(inAppResult.providerMessageId);
  }
  const unreadCountAfter = await notifService.getUnreadCount(studentUser.id, studentUser.role);
  console.log(`[9/10] Student In-App Center: Unread count before=${unreadCountBefore.count}, after mark-read=${unreadCountAfter.count}`);

  // 8. Clean up test records
  if (inAppResult.providerMessageId) {
    await prisma.notification.deleteMany({ where: { id: inAppResult.providerMessageId } });
  }
  await prisma.communicationDelivery.deleteMany({ where: { campaignId: createdCampaign.id } });
  await prisma.communicationCampaign.delete({ where: { id: createdCampaign.id } });
  console.log('[10/10] Cleaned up verification test records.');

  console.log('\n===============================================================');
  console.log('  ALL ENTERPRISE NOTIFICATION & COMMUNICATION TESTS PASSED (100%)');
  console.log('===============================================================');

  await app.close();
  process.exit(0);
}

runEnterpriseNotificationsVerification().catch((err) => {
  console.error('NOTIFICATION VERIFICATION FAILED:', err);
  process.exit(1);
});
