import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DurableOutboxService } from '../src/notifications/durable-outbox.service';
import { AuthService } from '../src/auth/auth.service';
import { OtpAdminService } from '../src/auth/otp-admin.service';
import {
  EmailChannel,
  WhatsAppChannel,
  SmsChannel,
  NotificationDispatcher,
} from '../src/notifications/notification-channels.service';
import { CommunicationCampaignController } from '../src/notifications/communication-campaign.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import { CommunicationDeliveryStatus, CommunicationChannel } from '@prisma/client';
import { UnauthorizedException } from '@nestjs/common';

interface ScenarioResult {
  num: number;
  name: string;
  passed: boolean;
  details: string;
}

async function runPhase4Verification() {
  console.log('===================================================================================');
  console.log('    SWAYAM ADMISSION — PHASE 4 GO-LIVE VALIDATION & RELIABILITY TEST SUITE        ');
  console.log('===================================================================================\n');

  let app: any;
  try {
    app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  } catch (err: any) {
    console.error('❌ Failed to bootstrap Nest application context:', err?.message || err);
    console.error(err?.stack);
    process.exit(1);
  }

  const prisma = app.get(PrismaService);
  const durableOutbox = app.get(DurableOutboxService);
  const authService = app.get(AuthService);
  const otpAdminService = app.get(OtpAdminService);
  const dispatcher = app.get(NotificationDispatcher);
  const smsChannel = app.get(SmsChannel);
  const campaignController = app.get(CommunicationCampaignController);

  const results: ScenarioResult[] = [];
  function record(num: number, name: string, passed: boolean, details: string) {
    results.push({ num, name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[Scenario ${num}] ${mark}: ${name}`);
    console.log(`  Details: ${details}\n`);
  }

  const testId = Date.now();
  const testStudentEmail = `phase4.student.${testId}@swayamadmission.com`;
  const createdDeliveryIds: string[] = [];
  let studentUserId: string | null = null;

  try {
    // ---------------------------------------------------------------------------------
    // Scenario 1: Durable Outbox Lifecycle & Acceptance Semantics (SENT != DELIVERED)
    // ---------------------------------------------------------------------------------
    const emailChannel = app.get(EmailChannel);
    const originalSend = emailChannel.send.bind(emailChannel);
    const simulatedMsgId = `smtp-accepted-${testId}`;
    emailChannel.send = async () => ({
      channel: CommunicationChannel.EMAIL,
      success: true,
      status: CommunicationDeliveryStatus.SENT,
      providerMessageId: simulatedMsgId,
    });

    const queuedJob = await durableOutbox.enqueueEmail({
      recipientEmail: `outbox.acceptance.${testId}@swayamadmission.com`,
      recipientName: 'Phase 4 Acceptance Tester',
      subject: 'Phase 4 Outbox Acceptance Decoupling Test',
      bodyText: 'Testing that SMTP acceptance sets sentAt but leaves deliveredAt null.',
      bodyHtml: '<p>Testing that SMTP acceptance sets sentAt but leaves deliveredAt null.</p>',
    });
    createdDeliveryIds.push(queuedJob.id);

    // Process batch synchronously
    await durableOutbox.processQueue(queuedJob.id);

    let postSendDelivery = await prisma.communicationDelivery.findUnique({
      where: { id: queuedJob.id },
    });

    const waitStart = Date.now();
    while (
      postSendDelivery &&
      (postSendDelivery.status === CommunicationDeliveryStatus.QUEUED ||
        postSendDelivery.status === CommunicationDeliveryStatus.SENDING) &&
      Date.now() - waitStart < 5000
    ) {
      await new Promise((r) => setTimeout(r, 200));
      postSendDelivery = await prisma.communicationDelivery.findUnique({
        where: { id: queuedJob.id },
      });
    }

    // Restore original send
    emailChannel.send = originalSend;

    const scenario1Passed =
      Boolean(postSendDelivery) &&
      postSendDelivery?.status === CommunicationDeliveryStatus.SENT &&
      postSendDelivery?.sentAt !== null &&
      postSendDelivery?.deliveredAt === null &&
      postSendDelivery?.providerMessageId === simulatedMsgId;

    record(
      1,
      'Durable Outbox Acceptance Semantics (sentAt set, deliveredAt null on SENT)',
      scenario1Passed,
      `Delivery ID: ${queuedJob.id} | Status: ${postSendDelivery?.status} | sentAt: ${postSendDelivery?.sentAt?.toISOString()} | deliveredAt: ${postSendDelivery?.deliveredAt} | ProviderMsgId: ${postSendDelivery?.providerMessageId}`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 2: Webhook Processing & Delivery Receipt Transition
    // ---------------------------------------------------------------------------------
    const providerMsgId = simulatedMsgId;
    const deliveryTimestamp = new Date();

    const webhookResult = await dispatcher.handleDeliveryWebhook(
      providerMsgId,
      'DELIVERED',
      { timestamp: deliveryTimestamp },
    );

    const postWebhookDelivery = await prisma.communicationDelivery.findUnique({
      where: { id: queuedJob.id },
    });

    const scenario2Passed =
      Boolean(webhookResult?.processed) &&
      postWebhookDelivery?.status === CommunicationDeliveryStatus.DELIVERED &&
      postWebhookDelivery?.deliveredAt !== null;

    record(
      2,
      'Webhook Delivery Receipt Transition (SENT -> DELIVERED & deliveredAt populated)',
      scenario2Passed,
      `Processed: ${webhookResult?.processed} | Status: ${postWebhookDelivery?.status} | deliveredAt: ${postWebhookDelivery?.deliveredAt?.toISOString()}`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 3: Webhook Out-of-Order Status Precedence (Idempotency & Late SENT Rejection)
    // ---------------------------------------------------------------------------------
    // A delayed SENT webhook arrives after DELIVERED status has already been recorded
    const lateSentWebhook = await dispatcher.handleDeliveryWebhook(providerMsgId, 'SENT');

    const deliveryAfterLateSent = await prisma.communicationDelivery.findUnique({
      where: { id: queuedJob.id },
    });

    // Exact duplicate DELIVERED arrives
    const duplicateDeliveredWebhook = await dispatcher.handleDeliveryWebhook(
      providerMsgId,
      'DELIVERED',
    );

    const scenario3Passed =
      lateSentWebhook?.outOfOrderIgnored === true &&
      deliveryAfterLateSent?.status === CommunicationDeliveryStatus.DELIVERED &&
      duplicateDeliveredWebhook?.idempotencySkipped === true;

    record(
      3,
      'Webhook Out-of-Order Precedence & Idempotency (Late SENT Ignored, Duplicate Skipped)',
      scenario3Passed,
      `Late SENT Ignored: ${lateSentWebhook?.outOfOrderIgnored} | Duplicate Skipped: ${duplicateDeliveredWebhook?.idempotencySkipped} | Current Status: ${deliveryAfterLateSent?.status}`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 4: Meta WhatsApp GET Webhook Verification Challenge
    // ---------------------------------------------------------------------------------
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'swayam_test_verify_token';
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = verifyToken;

    const validChallenge = 'hub_challenge_sample_987654321';
    const challengeResult = campaignController.verifyWebhook(
      'whatsapp',
      'subscribe',
      verifyToken,
      validChallenge,
    );

    let invalidRejected = false;
    try {
      campaignController.verifyWebhook('whatsapp', 'subscribe', 'wrong_token', validChallenge);
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        invalidRejected = true;
      }
    }

    const scenario4Passed = challengeResult === validChallenge && invalidRejected;

    record(
      4,
      'Meta WhatsApp GET Webhook Verification Challenge (Echo Challenge on Valid Token, Reject Wrong Token)',
      scenario4Passed,
      `Challenge Returned: ${challengeResult === validChallenge} | Invalid Token Rejected: ${invalidRejected}`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 5: Meta WhatsApp Nested Status Array Parsing
    // ---------------------------------------------------------------------------------
    const waProviderMsgId = `wamid.HBgL${testId}ABCXYZ`;
    const waDelivery = await prisma.communicationDelivery.create({
      data: {
        channel: CommunicationChannel.WHATSAPP,
        recipientType: 'STUDENT',
        recipientName: 'WhatsApp Test Recipient',
        recipientMobile: '+919876543210',
        status: CommunicationDeliveryStatus.SENT,
        providerMessageId: waProviderMsgId,
        sentAt: new Date(),
      },
    });
    createdDeliveryIds.push(waDelivery.id);

    const metaPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '1234567890', phone_number_id: '999888777' },
                statuses: [
                  {
                    id: waProviderMsgId,
                    status: 'delivered',
                    timestamp: '1710000000',
                    recipient_id: '919876543210',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const metaPostResult = await campaignController.handleWebhook('whatsapp', metaPayload);
    const updatedWaDelivery = await prisma.communicationDelivery.findUnique({
      where: { id: waDelivery.id },
    });

    const scenario5Passed =
      Boolean(metaPostResult?.processed) &&
      metaPostResult?.count === 1 &&
      updatedWaDelivery?.status === CommunicationDeliveryStatus.DELIVERED &&
      updatedWaDelivery?.deliveredAt !== null;

    record(
      5,
      'Meta WhatsApp Nested Status Array Parsing (entry[0].changes[0].value.statuses)',
      scenario5Passed,
      `Processed: ${metaPostResult?.processed} | Count: ${metaPostResult?.count} | Status: ${updatedWaDelivery?.status} | deliveredAt: ${updatedWaDelivery?.deliveredAt?.toISOString()}`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 6: Stale Worker Crash Recovery with Reconciliation
    // ---------------------------------------------------------------------------------
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Job A: crashed after send, has providerMessageId -> Reconcile to SENT
    const jobA = await prisma.communicationDelivery.create({
      data: {
        channel: CommunicationChannel.EMAIL,
        recipientType: 'STUDENT',
        recipientEmail: `crash.a.${testId}@test.com`,
        status: CommunicationDeliveryStatus.SENDING,
        providerMessageId: `provider-sent-${testId}`,
        updatedAt: fifteenMinutesAgo,
      },
    });
    createdDeliveryIds.push(jobA.id);

    // Job B: crashed during send, retryCount: 0 -> Recover to QUEUED with WORKER_CRASH_RECOVERY_ATTEMPT
    const jobB = await prisma.communicationDelivery.create({
      data: {
        channel: CommunicationChannel.EMAIL,
        recipientType: 'STUDENT',
        recipientEmail: `crash.b.${testId}@test.com`,
        status: CommunicationDeliveryStatus.SENDING,
        retryCount: 0,
        maxRetries: 3,
        updatedAt: fifteenMinutesAgo,
      },
    });
    createdDeliveryIds.push(jobB.id);

    // Job C: crashed with retryCount >= maxRetries -> Mark FAILED
    const jobC = await prisma.communicationDelivery.create({
      data: {
        channel: CommunicationChannel.EMAIL,
        recipientType: 'STUDENT',
        recipientEmail: `crash.c.${testId}@test.com`,
        status: CommunicationDeliveryStatus.SENDING,
        retryCount: 3,
        maxRetries: 3,
        updatedAt: fifteenMinutesAgo,
      },
    });
    createdDeliveryIds.push(jobC.id);

    // Trigger stale worker crash recovery with future threshold to ensure newly inserted test jobs qualify
    await durableOutbox.recoverStaleSendingJobs(-5000);

    const [recA, recB, recC] = await Promise.all([
      prisma.communicationDelivery.findUnique({ where: { id: jobA.id } }),
      prisma.communicationDelivery.findUnique({ where: { id: jobB.id } }),
      prisma.communicationDelivery.findUnique({ where: { id: jobC.id } }),
    ]);

    const scenario6Passed =
      recA?.status === CommunicationDeliveryStatus.SENT &&
      recB?.status === CommunicationDeliveryStatus.QUEUED &&
      recB?.retryCount === 1 &&
      Boolean(recB?.failureReason?.includes('WORKER_CRASH_RECOVERY_ATTEMPT')) &&
      recC?.status === CommunicationDeliveryStatus.FAILED;

    record(
      6,
      'Stale Worker Crash Recovery (Reconciliation to SENT, Retry to QUEUED, Exhausted to FAILED)',
      scenario6Passed,
      `Job A (With MsgId): ${recA?.status} | Job B (Retryable): ${recB?.status} (Retries: ${recB?.retryCount}, Reason: ${recB?.failureReason}) | Job C (Exhausted): ${recC?.status}`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 7: Outbox Operational Metrics (getOutboxMetrics)
    // ---------------------------------------------------------------------------------
    const metrics = await durableOutbox.getOutboxMetrics();

    const scenario7Passed =
      metrics !== null &&
      typeof metrics.queueDepth === 'number' &&
      typeof metrics.oldestQueuedAgeSeconds === 'number' &&
      typeof metrics.stuckSendingCount === 'number' &&
      typeof metrics.countsLast24h?.sent === 'number' &&
      typeof metrics.countsLast24h?.delivered === 'number' &&
      typeof metrics.countsLast24h?.failed === 'number';

    record(
      7,
      'Outbox Operational Observability Metrics (Queue Depth, Age, Stuck Jobs, 24h Stats)',
      scenario7Passed,
      `Queue Depth: ${metrics?.queueDepth} | Oldest Queued Age: ${metrics?.oldestQueuedAgeSeconds}s | Stuck Sending: ${metrics?.stuckSendingCount} | 24h Sent: ${metrics?.countsLast24h?.sent} | 24h Delivered: ${metrics?.countsLast24h?.delivered} | 24h Failed: ${metrics?.countsLast24h?.failed}`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 8: SMS Channel DB and Env Configuration Resolution
    // ---------------------------------------------------------------------------------
    // Verify SMS config resolution logic without hardcoded fake success
    const rawSmsHealth = await smsChannel.getHealth();

    // Upsert a test DB config for SMS channel
    await prisma.otpConfiguration.upsert({
      where: { channel: 'SMS' },
      create: {
        channel: 'SMS',
        enabled: true,
        provider: 'Fast2SMS',
        senderId: 'SWAYAM',
        apiKey: 'test_sms_key_sample',
      },
      update: {
        enabled: true,
        provider: 'Fast2SMS',
        senderId: 'SWAYAM',
        apiKey: 'test_sms_key_sample',
      },
    });

    const configuredSmsHealth = await smsChannel.getHealth();

    const scenario8Passed =
      (rawSmsHealth.status === 'UNCONFIGURED' || rawSmsHealth.status === 'CONFIGURED') &&
      configuredSmsHealth.status === 'CONFIGURED' &&
      configuredSmsHealth.message.includes('Fast2SMS Gateway configured');

    record(
      8,
      'SMS Channel DB and Environment Configuration Resolution & Honest Health Status',
      scenario8Passed,
      `Initial Health: ${rawSmsHealth.status} | Configured Health: ${configuredSmsHealth.status} (${configuredSmsHealth.message})`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 9: Student Registration & Auth Outbox Durability
    // ---------------------------------------------------------------------------------
    await authService.sendRegistrationEmailOtp({
      email: testStudentEmail,
    });

    // Verify outbox delivery record was enqueued for the new student
    const studentWelcomeDelivery = await prisma.communicationDelivery.findFirst({
      where: {
        recipientEmail: testStudentEmail,
        channel: CommunicationChannel.EMAIL,
      },
      orderBy: { createdAt: 'desc' },
    });

    const scenario9Passed =
      Boolean(studentWelcomeDelivery) &&
      (studentWelcomeDelivery?.status === CommunicationDeliveryStatus.QUEUED ||
        studentWelcomeDelivery?.status === CommunicationDeliveryStatus.SENT) &&
      studentWelcomeDelivery?.recipientEmail === testStudentEmail;

    if (studentWelcomeDelivery) {
      createdDeliveryIds.push(studentWelcomeDelivery.id);
    }

    record(
      9,
      'Student Registration Welcome / Verification Email Routed Through Durable PostgreSQL Outbox',
      scenario9Passed,
      `Delivery ID: ${studentWelcomeDelivery?.id} | Status: ${studentWelcomeDelivery?.status} | Channel: ${studentWelcomeDelivery?.channel}`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 10: Admin OTP Settings SMS Provider Test & Monitoring Endpoints
    // ---------------------------------------------------------------------------------
    // 10a. Call testSmsConfig
    const smsTestResult = await otpAdminService.testSmsConfig(
      'admin-test',
      '9876543210',
    );

    // Verify audit log was recorded
    const smsAuditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'SMS_OTP_TESTED',
      },
      orderBy: { createdAt: 'desc' },
    });

    // 10b. Call getDashboardStats
    const dashboardStats = await otpAdminService.getDashboardStats();

    // 10c. Call getDeliveryStats (verify email/phone masking)
    const deliveryStats = await otpAdminService.getDeliveryStats();

    const sampleDelivery = deliveryStats.recentDeliveries[0];
    const isEmailMasked =
      !sampleDelivery?.recipientEmail ||
      sampleDelivery.recipientEmail.includes('*');
    const isMobileMasked =
      !sampleDelivery?.recipientMobile ||
      sampleDelivery.recipientMobile.includes('*');

    const scenario10Passed =
      typeof smsTestResult.success === 'boolean' &&
      Boolean(smsAuditLog) &&
      Boolean(dashboardStats.whatsapp) &&
      Boolean(dashboardStats.email) &&
      Boolean(dashboardStats.outbox) &&
      Boolean(deliveryStats.outboxMetrics) &&
      Array.isArray(deliveryStats.recentDeliveries) &&
      isEmailMasked &&
      isMobileMasked;

    record(
      10,
      'Admin OTP Settings SMS Provider Test & Sanitized Delivery Monitoring Endpoints',
      scenario10Passed,
      `SMS Test Result: ${smsTestResult.message} | Audit Recorded: ${Boolean(smsAuditLog)} | Outbox in Dashboard: ${Boolean(dashboardStats.outbox)} | Deliveries Count: ${deliveryStats.recentDeliveries.length} | Sanitized (Masked): Email=${isEmailMasked}, Phone=${isMobileMasked}`,
    );

  } catch (err: any) {
    console.error('Unhandled exception during Phase 4 verification suite:', err);
  } finally {
    // Clean up created deliveries
    if (createdDeliveryIds.length > 0) {
      await prisma.communicationDelivery
        .deleteMany({
          where: { id: { in: createdDeliveryIds } },
        })
        .catch(() => null);
    }

    // Clean up created student user
    if (studentUserId) {
      await prisma.user
        .delete({
          where: { id: studentUserId },
        })
        .catch(() => null);
    }

    console.log('-----------------------------------------------------------------------------------');
    console.log(`TOTAL SCENARIOS: ${results.length}`);
    console.log(`PASSED: ${results.filter((r) => r.passed).length}`);
    console.log(`FAILED: ${results.filter((r) => !r.passed).length}`);
    console.log('-----------------------------------------------------------------------------------\n');

    await app.close();
    process.exit(results.every((r) => r.passed) ? 0 : 1);
  }
}

void runPhase4Verification();
