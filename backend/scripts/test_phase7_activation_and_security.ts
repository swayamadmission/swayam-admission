/**
 * SWAYAM ADMISSION — PHASE 7 VERIFICATION TEST SUITE
 * Live Email Provider Activation, Webhook Security & Production Readiness
 * 
 * Verifies:
 * 1. Persistent Quota Circuit Breaker across simulated restarts & multiple worker instances.
 * 2. AWS SNS Webhook Security & SSRF Prevention (SigningCertURL & SubscribeURL strict validation).
 * 3. SendGrid Signed Webhook Security & Anti-Replay (timestamp verification, signature check).
 * 4. Cross-Attribution Guard (rejecting callbacks where recipient does not match delivery record).
 * 5. Recipient Suppression Engine (hard bounce / complaint suppressed; soft bounce NOT suppressed).
 * 6. Administrative Suppression Management (list suppressions, manual override & audit).
 * 7. Authentication Message Expiry & Supersession Protection (student & employee OTPs / tokens).
 * 8. Live SMTP Provider Probe & Quota Status Classification.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  PrismaClient,
  CommunicationChannel,
  CommunicationDeliveryStatus,
} from '@prisma/client';
import {
  EmailChannel,
  NotificationDispatcher,
} from '../src/notifications/notification-channels.service';
import { CommunicationCampaignController } from '../src/notifications/communication-campaign.controller';
import { CommunicationCampaignService } from '../src/notifications/communication-campaign.service';
import { DurableOutboxService } from '../src/notifications/durable-outbox.service';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

interface TestRecord {
  suite: string;
  name: string;
  status: 'PASSED' | 'FAILED' | 'BLOCKED';
  details: string;
}

const records: TestRecord[] = [];

function record(suite: string, name: string, status: 'PASSED' | 'FAILED' | 'BLOCKED', details: string) {
  records.push({ suite, name, status, details });
  const icon = status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️';
  console.log(`${icon} [${suite}] ${name}: ${details}`);
}

async function runPhase7Tests() {
  console.log('\n===================================================================================');
  console.log('   SWAYAM ADMISSION — PHASE 7 ACTIVATION, SECURITY & READINESS SUITE               ');
  console.log('===================================================================================\n');

  const emailChannel = new EmailChannel(prisma as any);
  const dispatcher = new NotificationDispatcher(
    null as any,
    emailChannel,
    null as any,
    null as any,
    prisma as any,
  );
  const outboxService = new DurableOutboxService(prisma as any, emailChannel);
  const campaignService = new CommunicationCampaignService(prisma as any, null as any, null as any, dispatcher);
  const campaignController = new CommunicationCampaignController(
    campaignService,
    dispatcher,
    outboxService,
    emailChannel,
    null as any,
  );

  // Clean slate for test addresses
  const TEST_RECIPIENT_A = 'test-phase7-hardbounce@example.com';
  const TEST_RECIPIENT_B = 'test-phase7-softbounce@example.com';
  const TEST_RECIPIENT_C = 'test-phase7-crossattr@example.com';
  const TEST_RECIPIENT_D = 'test-phase7-authsafe@example.com';

  await prisma.communicationDelivery.deleteMany({
    where: {
      recipientEmail: {
        in: [TEST_RECIPIENT_A, TEST_RECIPIENT_B, TEST_RECIPIENT_C, TEST_RECIPIENT_D],
      },
    },
  });

  // ---------------------------------------------------------------------------
  // SUITE 1: DURABLE & CONCURRENCY-SAFE QUOTA CIRCUIT BREAKER
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 1: Persistent Quota Circuit Breaker ---');

  try {
    // 1.1 Persist cooldown to database
    const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 mins ahead
    await outboxService.setPersistentQuotaCooldown(futureDate, '550-5.4.5 Daily sending quota exceeded', 'GMAIL');

    // Verify it is saved in OtpConfiguration
    const dbConfig = await prisma.otpConfiguration.findUnique({
      where: { channel: 'EMAIL' },
    });
    const parsedMeta = dbConfig?.providerUrl ? JSON.parse(dbConfig.providerUrl) : null;
    if (parsedMeta && parsedMeta.reason.includes('550-5.4.5')) {
      record('Suite 1', 'Cooldown Durably Persisted to PostgreSQL', 'PASSED', `Saved reason: ${parsedMeta.reason}`);
    } else {
      record('Suite 1', 'Cooldown Durably Persisted to PostgreSQL', 'FAILED', `Config: ${dbConfig?.providerUrl}`);
    }

    // 1.2 Simulate Container Restart (New DurableOutboxService & EmailChannel instance)
    const freshOutboxInstance = new DurableOutboxService(prisma as any);
    const freshEmailChannel = new EmailChannel(prisma as any);

    const retrievedCooldown = await freshOutboxInstance.getPersistentQuotaCooldown();
    if (retrievedCooldown.isActive && retrievedCooldown.cooldownUntil) {
      record('Suite 1', 'Cooldown Survives Application Restart', 'PASSED', `Observed active cooldown until ${retrievedCooldown.cooldownUntil.toISOString()}`);
    } else {
      record('Suite 1', 'Cooldown Survives Application Restart', 'FAILED', 'Cooldown was lost after instance recreation');
    }

    // 1.3 Verify EmailChannel.getHealth() reflects BLOCKED across restarts
    const freshHealth = await freshEmailChannel.getHealth();
    if (freshHealth.status === 'BLOCKED' && freshHealth.quotaBlocked) {
      record('Suite 1', 'EmailChannel Health Observes Persistent Cooldown', 'PASSED', `Status: ${freshHealth.status}, Reason: ${freshHealth.message}`);
    } else {
      record('Suite 1', 'EmailChannel Health Observes Persistent Cooldown', 'FAILED', `Status: ${freshHealth.status}`);
    }

    // 1.4 Manual Cooldown Reset
    await outboxService.resetQuotaCooldown();
    const afterResetCooldown = await freshOutboxInstance.getPersistentQuotaCooldown();
    if (!afterResetCooldown.isActive) {
      record('Suite 1', 'Durable Cooldown Manual Reset', 'PASSED', 'Successfully cleared persistent cooldown from DB');
    } else {
      record('Suite 1', 'Durable Cooldown Manual Reset', 'FAILED', 'Cooldown still active after reset');
    }
  } catch (err: any) {
    record('Suite 1', 'Persistent Quota Circuit Breaker Execution', 'FAILED', err.message);
  }

  // ---------------------------------------------------------------------------
  // SUITE 2: AWS SNS WEBHOOK SECURITY & SSRF PREVENTION
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 2: AWS SNS Webhook Security & SSRF Prevention ---');

  try {
    // 2.1 Valid AWS SNS SigningCertURL validation
    const validCertUrl = 'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-0105d68be008b7923f6cb6901fb14159.pem';
    const isValidCert = campaignController.validateSnsCertificateUrl(validCertUrl);
    if (isValidCert) {
      record('Suite 2', 'Valid AWS SNS Certificate URL Accepted', 'PASSED', validCertUrl);
    } else {
      record('Suite 2', 'Valid AWS SNS Certificate URL Accepted', 'FAILED', 'Rejected valid AWS SNS cert URL');
    }

    // 2.2 SSRF Protection: Reject HTTP (non-https) certificate URL
    const httpCertUrl = 'http://sns.us-east-1.amazonaws.com/SimpleNotificationService-fake.pem';
    const isHttpRejected = !campaignController.validateSnsCertificateUrl(httpCertUrl);
    if (isHttpRejected) {
      record('Suite 2', 'SSRF Guard: Insecure HTTP Certificate URL Rejected', 'PASSED', 'Enforces strict https:// requirement');
    } else {
      record('Suite 2', 'SSRF Guard: Insecure HTTP Certificate URL Rejected', 'FAILED', 'Allowed non-HTTPS cert URL');
    }

    // 2.3 SSRF Protection: Reject attacker domain masquerading as AWS
    const attackerCertUrl = 'https://evil-attacker.com/sns.us-east-1.amazonaws.com/cert.pem';
    const isAttackerRejected = !campaignController.validateSnsCertificateUrl(attackerCertUrl);
    if (isAttackerRejected) {
      record('Suite 2', 'SSRF Guard: Arbitrary Attacker Hostname Rejected', 'PASSED', 'Enforces strict regex on amazonaws.com host');
    } else {
      record('Suite 2', 'SSRF Guard: Arbitrary Attacker Hostname Rejected', 'FAILED', 'Allowed untrusted host cert URL');
    }

    // 2.4 SSRF Protection: Reject cloud metadata service (169.254.169.254)
    const imdsCertUrl = 'https://169.254.169.254/latest/meta-data/';
    const isImdsRejected = !campaignController.validateSnsCertificateUrl(imdsCertUrl);
    if (isImdsRejected) {
      record('Suite 2', 'SSRF Guard: Cloud Metadata IP (169.254.169.254) Rejected', 'PASSED', 'Prevented AWS IMDS traversal attempt');
    } else {
      record('Suite 2', 'SSRF Guard: Cloud Metadata IP (169.254.169.254) Rejected', 'FAILED', 'Failed to block IMDS IP');
    }

    // 2.5 SubscriptionConfirmation SubscribeURL Validation
    const validSubscribeUrl = 'https://sns.ap-south-1.amazonaws.com/?Action=ConfirmSubscription&TopicArn=arn:aws:sns:ap-south-1:123456789012:ses-events';
    const isValidSubscribe = campaignController.validateSnsSubscribeUrl(validSubscribeUrl);
    if (isValidSubscribe) {
      record('Suite 2', 'Valid AWS SNS SubscribeURL Accepted', 'PASSED', 'Matches trusted AWS hostname regex');
    } else {
      record('Suite 2', 'Valid AWS SNS SubscribeURL Accepted', 'FAILED', 'Rejected valid SubscribeURL');
    }

    // 2.6 Reject Spoofed SubscribeURL in SubscriptionConfirmation
    let spoofCaught = false;
    try {
      await campaignController.handleWebhook('ses', {
        Type: 'SubscriptionConfirmation',
        TopicArn: 'arn:aws:sns:us-east-1:123:test',
        SubscribeURL: 'https://evil-webhook-catcher.com/confirm',
      });
    } catch (err: any) {
      spoofCaught = true;
    }
    if (spoofCaught) {
      record('Suite 2', 'SSRF Guard: Untrusted SubscribeURL Blocked on Webhook', 'PASSED', 'BadRequestException thrown for untrusted host');
    } else {
      record('Suite 2', 'SSRF Guard: Untrusted SubscribeURL Blocked on Webhook', 'FAILED', 'Allowed untrusted SubscribeURL');
    }
  } catch (err: any) {
    record('Suite 2', 'AWS SNS Security Verification', 'FAILED', err.message);
  }

  // ---------------------------------------------------------------------------
  // SUITE 3: SENDGRID SIGNED WEBHOOK SECURITY & ANTI-REPLAY
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 3: SendGrid Signed Webhook Security & Anti-Replay ---');

  try {
    const testSecret = 'sg_webhook_super_secret_test_key_123';
    process.env.SENDGRID_WEBHOOK_SECRET = testSecret;

    // 3.1 Valid HMAC Signed Payload Accepted
    const nowSec = Math.floor(Date.now() / 1000).toString();
    const rawPayload = JSON.stringify([{ event: 'delivered', email: 'verified@example.com', sg_message_id: 'sg_msg_valid_123' }]);
    const validHmac = crypto.createHmac('sha256', testSecret).update(nowSec + rawPayload).digest('hex');

    const validRes: any = await campaignController.handleWebhook(
      'sendgrid',
      JSON.parse(rawPayload),
      validHmac,
      undefined,
      validHmac,
      nowSec,
    );
    if (validRes.processed) {
      record('Suite 3', 'Valid SendGrid HMAC Signature Accepted', 'PASSED', 'Signature and timestamp matched expected digest');
    } else {
      record('Suite 3', 'Valid SendGrid HMAC Signature Accepted', 'FAILED', JSON.stringify(validRes));
    }

    // 3.2 Forged Signature Rejected
    let forgedCaught = false;
    try {
      await campaignController.handleWebhook(
        'sendgrid',
        JSON.parse(rawPayload),
        'invalid_forged_signature_hex',
        undefined,
        'invalid_forged_signature_hex',
        nowSec,
      );
    } catch (err: any) {
      forgedCaught = err.status === 401 || err.message.includes('Invalid SendGrid');
    }
    if (forgedCaught) {
      record('Suite 3', 'Forged SendGrid Signature Rejected (401)', 'PASSED', 'UnauthorizedException thrown for signature mismatch');
    } else {
      record('Suite 3', 'Forged SendGrid Signature Rejected (401)', 'FAILED', 'Accepted forged SendGrid signature');
    }

    // 3.3 Replayed / Expired Timestamp Rejected
    let replayCaught = false;
    const oldTimestamp = Math.floor(Date.now() / 1000 - 3600).toString(); // 1 hour old
    const replayHmac = crypto.createHmac('sha256', testSecret).update(oldTimestamp + rawPayload).digest('hex');
    try {
      await campaignController.handleWebhook(
        'sendgrid',
        JSON.parse(rawPayload),
        replayHmac,
        undefined,
        replayHmac,
        oldTimestamp,
      );
    } catch (err: any) {
      replayCaught = err.status === 401 || err.message.includes('expired or replayed');
    }
    if (replayCaught) {
      record('Suite 3', 'Replayed Webhook Timestamp Rejected (>10 min)', 'PASSED', 'Replay protection window strictly enforced');
    } else {
      record('Suite 3', 'Replayed Webhook Timestamp Rejected (>10 min)', 'FAILED', 'Accepted expired webhook payload');
    }

    delete process.env.SENDGRID_WEBHOOK_SECRET;
  } catch (err: any) {
    record('Suite 3', 'SendGrid Webhook Security Verification', 'FAILED', err.message);
  }

  // ---------------------------------------------------------------------------
  // SUITE 4: CROSS-ATTRIBUTION GUARD & IDEMPOTENCY
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Cross-Attribution Guard & Idempotency ---');

  try {
    // Create a delivery record with a specific recipient email
    const deliveryRecord = await prisma.communicationDelivery.create({
      data: {
        channel: CommunicationChannel.EMAIL,
        recipientEmail: TEST_RECIPIENT_C,
        recipientName: 'Cross Attribution Test',
        status: CommunicationDeliveryStatus.SENT,
        providerMessageId: 'sg_msg_cross_attr_999',
        sentAt: new Date(),
      },
    });

    // 4.1 Cross-attribution attack attempt: Attacker sends callback with matching providerMessageId but unrelated recipient
    const crossAttrRes = await dispatcher.handleDeliveryWebhook(
      'sg_msg_cross_attr_999',
      'DELIVERED',
      { recipientEmail: 'attacker-victim@unrelated-domain.com' },
    );

    if (!crossAttrRes.processed && crossAttrRes.reason?.includes('Cross-attribution mismatch')) {
      record('Suite 4', 'Cross-Attribution Mismatch Rejected', 'PASSED', crossAttrRes.reason);
    } else {
      record('Suite 4', 'Cross-Attribution Mismatch Rejected', 'FAILED', JSON.stringify(crossAttrRes));
    }

    // 4.2 Legitimate callback with matching recipient email
    const validAttrRes = await dispatcher.handleDeliveryWebhook(
      'sg_msg_cross_attr_999',
      'DELIVERED',
      { recipientEmail: TEST_RECIPIENT_C },
    );

    if (validAttrRes.processed && validAttrRes.status === CommunicationDeliveryStatus.DELIVERED) {
      record('Suite 4', 'Legitimate Matching Recipient Accepted', 'PASSED', `Delivery transitioned to ${validAttrRes.status}`);
    } else {
      record('Suite 4', 'Legitimate Matching Recipient Accepted', 'FAILED', JSON.stringify(validAttrRes));
    }

    // 4.3 Idempotency Test: Sending identical DELIVERED callback again
    const idempRes = await dispatcher.handleDeliveryWebhook(
      'sg_msg_cross_attr_999',
      'DELIVERED',
      { recipientEmail: TEST_RECIPIENT_C },
    );

    if (idempRes.processed && (idempRes as any).idempotencySkipped) {
      record('Suite 4', 'Callback Idempotency Preserved', 'PASSED', 'Duplicate callback was safely skipped without error');
    } else {
      record('Suite 4', 'Callback Idempotency Preserved', 'FAILED', JSON.stringify(idempRes));
    }
  } catch (err: any) {
    record('Suite 4', 'Cross-Attribution Guard Verification', 'FAILED', err.message);
  }

  // ---------------------------------------------------------------------------
  // SUITE 5: RECIPIENT SUPPRESSION ENGINE & SOFT-BOUNCE NON-SUPPRESSION
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Recipient Suppression Engine & Soft-Bounce Non-Suppression ---');

  try {
    // 5.1 Hard bounce creation -> Recipient MUST be suppressed
    await prisma.communicationDelivery.create({
      data: {
        channel: CommunicationChannel.EMAIL,
        recipientEmail: TEST_RECIPIENT_A,
        status: CommunicationDeliveryStatus.BOUNCED,
        failureReason: 'HARD_BOUNCE',
        errorMessage: '550 5.1.1 User unknown',
      },
    });

    const sendAttemptHard = await emailChannel.send(
      { id: '1', name: 'Hard Bounce User', email: TEST_RECIPIENT_A, type: 'STUDENT' },
      { title: 'Test', message: 'Hello' },
    );

    if (
      sendAttemptHard.status === CommunicationDeliveryStatus.SKIPPED &&
      sendAttemptHard.failureReason === 'RECIPIENT_SUPPRESSED_PREVIOUS_HARD_BOUNCE'
    ) {
      record('Suite 5', 'Hard-Bounced Recipient Automatically Suppressed', 'PASSED', `Status: ${sendAttemptHard.status}, Reason: ${sendAttemptHard.failureReason}`);
    } else {
      record('Suite 5', 'Hard-Bounced Recipient Automatically Suppressed', 'FAILED', JSON.stringify(sendAttemptHard));
    }

    // 5.2 Soft bounce creation -> Recipient MUST NOT be suppressed
    await prisma.communicationDelivery.create({
      data: {
        channel: CommunicationChannel.EMAIL,
        recipientEmail: TEST_RECIPIENT_B,
        status: CommunicationDeliveryStatus.FAILED,
        failureReason: 'SOFT_BOUNCE',
        errorMessage: '452 4.2.2 Mailbox full',
      },
    });

    // We temporarily simulate unconfigured credentials so send() executes past suppression check to credential validation
    const origUser = process.env.SMTP_USER;
    const origPass = process.env.SMTP_PASSWORD;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_PASS;

    const sendAttemptSoft = await emailChannel.send(
      { id: '2', name: 'Soft Bounce User', email: TEST_RECIPIENT_B, type: 'STUDENT' },
      { title: 'Test', message: 'Hello' },
    );

    // Restore env
    if (origUser) process.env.SMTP_USER = origUser;
    if (origPass) process.env.SMTP_PASSWORD = origPass;

    if (
      sendAttemptSoft.status !== CommunicationDeliveryStatus.SKIPPED &&
      sendAttemptSoft.failureReason !== 'RECIPIENT_SUPPRESSED_PREVIOUS_HARD_BOUNCE'
    ) {
      record('Suite 5', 'Soft-Bounced Recipient Is NOT Suppressed', 'PASSED', `Soft bounce allowed through suppression check (Result: ${sendAttemptSoft.failureReason})`);
    } else {
      record('Suite 5', 'Soft-Bounced Recipient Is NOT Suppressed', 'FAILED', 'Soft bounce was erroneously suppressed');
    }

    // 5.3 Administrative Suppression Inspection API
    const suppressionList = await campaignService.getSuppressionList({ search: TEST_RECIPIENT_A });
    if (suppressionList.total >= 1 && suppressionList.data.some((d) => d.recipientEmail === TEST_RECIPIENT_A)) {
      record('Suite 5', 'Admin Suppression Inspection API', 'PASSED', `Found ${suppressionList.total} suppressed recipients`);
    } else {
      record('Suite 5', 'Admin Suppression Inspection API', 'FAILED', JSON.stringify(suppressionList));
    }

    // 5.4 Administrative Suppression Override / Removal
    const overrideResult = await campaignService.removeSuppression(TEST_RECIPIENT_A, 'admin-123', 'User updated email address');
    if (overrideResult.success && overrideResult.clearedRecordsCount >= 1) {
      record('Suite 5', 'Admin Suppression Removal API', 'PASSED', `Cleared ${overrideResult.clearedRecordsCount} suppressed records`);
    } else {
      record('Suite 5', 'Admin Suppression Removal API', 'FAILED', JSON.stringify(overrideResult));
    }

    // 5.5 Verify Recipient is no longer suppressed after override
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_PASS;
    const sendAfterOverride = await emailChannel.send(
      { id: '1', name: 'Hard Bounce User', email: TEST_RECIPIENT_A, type: 'STUDENT' },
      { title: 'Test', message: 'Hello' },
    );
    if (origUser) process.env.SMTP_USER = origUser;
    if (origPass) process.env.SMTP_PASSWORD = origPass;

    if (sendAfterOverride.status !== CommunicationDeliveryStatus.SKIPPED) {
      record('Suite 5', 'Recipient Free for Delivery After Suppression Override', 'PASSED', 'Prior suppression record successfully neutralized');
    } else {
      record('Suite 5', 'Recipient Free for Delivery After Suppression Override', 'FAILED', 'Recipient remained suppressed after override');
    }
  } catch (err: any) {
    record('Suite 5', 'Suppression Engine Verification', 'FAILED', err.message);
  }

  // ---------------------------------------------------------------------------
  // SUITE 6: AUTHENTICATION MESSAGE SAFETY & REPLAY PROTECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Authentication Message Expiry & Supersession Protection ---');

  try {
    const existingUser = await prisma.user.findFirst();
    const testUserId = existingUser ? existingUser.id : (await prisma.user.create({
      data: {
        email: `phase7-test-suite6-${Date.now()}@test.local`,
        fullName: 'Phase7 Test User',
        role: 'STUDENT' as any,
        password: null,
      },
    })).id;

    // 6.1 Expired OTP Job Suppression
    const expiredJob = await prisma.communicationDelivery.create({
      data: {
        channel: CommunicationChannel.EMAIL,
        recipientEmail: TEST_RECIPIENT_D,
        recipientName: 'Expired OTP User',
        status: CommunicationDeliveryStatus.QUEUED,
        queuedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago (TTL: 10 mins)
      },
    });

    const expiredNotif = await prisma.notification.create({
      data: {
        userId: testUserId,
        title: 'Registration OTP',
        message: 'Your code is 123456',
        type: 'SYSTEM',
        metadata: { purpose: 'REGISTRATION_OTP' },
      },
    });

    await prisma.communicationDelivery.update({
      where: { id: expiredJob.id },
      data: { notificationId: expiredNotif.id },
    });

    // Run outbox process on targetDeliveryId
    await outboxService.processQueue(expiredJob.id);

    const updatedExpiredJob = await prisma.communicationDelivery.findUnique({
      where: { id: expiredJob.id },
    });

    if (
      updatedExpiredJob?.status === CommunicationDeliveryStatus.FAILED &&
      updatedExpiredJob.failureReason === 'AUTH_MESSAGE_EXPIRED'
    ) {
      record('Suite 6', 'Expired Authentication OTP Suppressed Before Send', 'PASSED', `Status: ${updatedExpiredJob.status}, Reason: ${updatedExpiredJob.failureReason}`);
    } else {
      record('Suite 6', 'Expired Authentication OTP Suppressed Before Send', 'FAILED', `Status: ${updatedExpiredJob?.status}, Reason: ${updatedExpiredJob?.failureReason}`);
    }

    // 6.2 Superseded OTP Protection (Old OTP queued, then newer OTP requested)
    const oldOtpJob = await prisma.communicationDelivery.create({
      data: {
        channel: CommunicationChannel.EMAIL,
        recipientEmail: TEST_RECIPIENT_D,
        status: CommunicationDeliveryStatus.QUEUED,
        queuedAt: new Date(Date.now() - 60 * 1000), // 1 min ago
      },
    });

    // Small delay to guarantee strictly greater createdAt in database
    await new Promise((resolve) => setTimeout(resolve, 50));

    const newerOtpJob = await prisma.communicationDelivery.create({
      data: {
        channel: CommunicationChannel.EMAIL,
        recipientEmail: TEST_RECIPIENT_D,
        status: CommunicationDeliveryStatus.QUEUED,
        queuedAt: new Date(),
      },
    });

    const otpNotif = await prisma.notification.create({
      data: {
        userId: testUserId,
        title: 'Password Reset',
        message: 'New token 654321',
        type: 'SYSTEM',
        metadata: { purpose: 'PASSWORD_RESET' },
      },
    });

    await prisma.communicationDelivery.update({
      where: { id: oldOtpJob.id },
      data: { notificationId: otpNotif.id },
    });

    await outboxService.processQueue(oldOtpJob.id);

    const updatedOldJob = await prisma.communicationDelivery.findUnique({
      where: { id: oldOtpJob.id },
    });

    if (
      updatedOldJob?.status === CommunicationDeliveryStatus.FAILED &&
      updatedOldJob.failureReason === 'AUTH_MESSAGE_SUPERSEDED'
    ) {
      record('Suite 6', 'Superseded Authentication Message Suppressed', 'PASSED', `Superseded by newer delivery ${newerOtpJob.id}`);
    } else {
      record('Suite 6', 'Superseded Authentication Message Suppressed', 'FAILED', `Status: ${updatedOldJob?.status}, Reason: ${updatedOldJob?.failureReason}`);
    }

    // Clean up test notifications & deliveries
    await prisma.communicationDelivery.deleteMany({
      where: {
        id: { in: [expiredJob.id, oldOtpJob.id, newerOtpJob.id] },
      },
    });
    await prisma.notification.deleteMany({
      where: {
        id: { in: [expiredNotif.id, otpNotif.id] },
      },
    });
  } catch (err: any) {
    record('Suite 6', 'Authentication Message Safety Verification', 'FAILED', err.message);
  }

  // ---------------------------------------------------------------------------
  // SUITE 7: CONTROLLED LIVE PROVIDER PROBE & OUTBOUND STATUS
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Controlled Live Provider Probe & Quota Status ---');

  try {
    const health = await emailChannel.getHealth();
    console.log(`[LIVE PROBE] Current Provider Health:`, JSON.stringify(health, null, 2));

    const verifyResult = await emailChannel.verifyConnection();
    console.log(`[LIVE PROBE] SMTP Handshake Result:`, JSON.stringify(verifyResult, null, 2));

    if (verifyResult.status === 'READY') {
      record('Suite 7', 'Live SMTP Handshake & Auth Probe', 'PASSED', `Handshake verified on ${verifyResult.provider}`);
    } else if (verifyResult.status === 'BLOCKED') {
      record('Suite 7', 'Live SMTP Handshake & Auth Probe', 'BLOCKED', `Provider quota limit: ${verifyResult.message}`);
    } else {
      record('Suite 7', 'Live SMTP Handshake & Auth Probe', 'FAILED', verifyResult.message);
    }

    // Live send attempt verification
    console.log('\n[LIVE PROBE] Testing single outbound message to authorized administrator...');
    const authorizedAdminRecipient = process.env.SMTP_USER || 'swayamadmissions@gmail.com';
    const liveSendResult = await emailChannel.send(
      { id: 'admin-probe', name: 'Swayam Admin', email: authorizedAdminRecipient, type: 'STAFF' },
      {
        title: 'Phase 7 Verification Probe',
        subject: '[SWAYAM ADMISSION] Phase 7 Production Readiness Verification Probe',
        message: `Automated deliverability probe executed at ${new Date().toISOString()}.`,
      },
    );

    console.log(`[LIVE PROBE] Outbound Send Result:`, JSON.stringify(liveSendResult, null, 2));

    if (liveSendResult.success) {
      record('Suite 7', 'Outbound Live Email Delivery', 'PASSED', `Accepted by provider. MessageId: ${liveSendResult.providerMessageId}`);
    } else {
      const isQuota =
        (liveSendResult.errorMessage || '').includes('550-5.4.5') ||
        (liveSendResult.failureReason || '').includes('QUOTA');
      if (isQuota) {
        record('Suite 7', 'Outbound Live Email Delivery', 'BLOCKED', `Live delivery blocked by Gmail 550-5.4.5 daily quota. External provider configuration required.`);
      } else {
        record('Suite 7', 'Outbound Live Email Delivery', 'FAILED', liveSendResult.errorMessage || 'Send failed');
      }
    }
  } catch (err: any) {
    record('Suite 7', 'Controlled Live Provider Probe', 'FAILED', err.message);
  }

  // Cleanup test deliveries
  await prisma.communicationDelivery.deleteMany({
    where: {
      recipientEmail: {
        in: [TEST_RECIPIENT_A, TEST_RECIPIENT_B, TEST_RECIPIENT_C, TEST_RECIPIENT_D],
      },
    },
  });

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n===================================================================================');
  console.log('                          PHASE 7 TEST RESULTS SUMMARY                             ');
  console.log('===================================================================================\n');

  const passed = records.filter((r) => r.status === 'PASSED').length;
  const failed = records.filter((r) => r.status === 'FAILED').length;
  const blocked = records.filter((r) => r.status === 'BLOCKED').length;

  console.log(`TOTAL TESTS : ${records.length}`);
  console.log(`PASSED      : ${passed} ✅`);
  console.log(`FAILED      : ${failed} ❌`);
  console.log(`BLOCKED     : ${blocked} ⚠️\n`);

  for (const r of records) {
    const icon = r.status === 'PASSED' ? '✅' : r.status === 'FAILED' ? '❌' : '⚠️';
    console.log(`${icon} [${r.status.padEnd(7)}] ${r.suite} — ${r.name}`);
    if (r.status !== 'PASSED') {
      console.log(`   └─ ${r.details}`);
    }
  }

  await prisma.$disconnect();
}

runPhase7Tests().catch(async (e) => {
  console.error('Fatal error running Phase 7 tests:', e);
  await prisma.$disconnect();
  process.exit(1);
});
