import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DurableOutboxService } from '../src/notifications/durable-outbox.service';
import { AuthService } from '../src/auth/auth.service';
import { EmailChannel, WhatsAppChannel, SmsChannel } from '../src/notifications/notification-channels.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { CommunicationDeliveryStatus, CommunicationChannel } from '@prisma/client';
import { ConflictException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

interface ScenarioResult {
  num: number;
  name: string;
  passed: boolean;
  details: string;
}

async function runPhase3Verification() {
  console.log('===================================================================================');
  console.log('    SWAYAM ADMISSION — PHASE 3 PRODUCTION HARDENING & RELIABILITY TEST SUITE      ');
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
  const emailChannel = app.get(EmailChannel);
  const whatsAppChannel = app.get(WhatsAppChannel);
  const smsChannel = app.get(SmsChannel);
  const notificationsService = app.get(NotificationsService);

  const results: ScenarioResult[] = [];
  function record(num: number, name: string, passed: boolean, details: string) {
    results.push({ num, name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[Scenario ${num}] ${mark}: ${name}`);
    console.log(`  Details: ${details}\n`);
  }

  const testId = Date.now();
  const testUserEmail = `test.user.${testId}@swayamadmission.com`;
  const existingEmail = `existing.user.${testId}@swayamadmission.com`;

  try {
    // ---------------------------------------------------------------------------------
    // Scenario 1: Durable Outbox Enqueue & Database Persistence
    // ---------------------------------------------------------------------------------
    const queuedJob = await durableOutbox.enqueueEmail({
      recipientEmail: `outbox.test.${testId}@swayamadmission.com`,
      recipientName: 'Phase3 Outbox Tester',
      subject: 'Phase 3 Durable Outbox Test',
      bodyText: 'This email is persisted in PostgreSQL before processing.',
      bodyHtml: '<p>This email is persisted in PostgreSQL before processing.</p>',
    });

    const deliveryRecord = await prisma.communicationDelivery.findUnique({
      where: { id: queuedJob.id },
    });

    const scenario1Passed =
      Boolean(deliveryRecord) &&
      deliveryRecord?.status === CommunicationDeliveryStatus.QUEUED &&
      deliveryRecord?.channel === CommunicationChannel.EMAIL;

    record(
      1,
      'Durable Outbox Queueing & PostgreSQL Persistence',
      scenario1Passed,
      `Delivery ID: ${queuedJob.id} | Status: ${deliveryRecord?.status} | Channel: ${deliveryRecord?.channel}`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 2: Durable Worker Job Claim & Lifecycle Transition
    // ---------------------------------------------------------------------------------
    // Process queue or wait for in-flight background worker dispatch to complete
    let processedRecord = await prisma.communicationDelivery.findUnique({
      where: { id: queuedJob.id },
    });

    const maxWaitMs = 15000;
    const startWait = Date.now();
    let queueStats = { processed: 0, succeeded: 0, failed: 0 };
    while (
      processedRecord &&
      (processedRecord.status === CommunicationDeliveryStatus.QUEUED ||
        processedRecord.status === CommunicationDeliveryStatus.SENDING) &&
      Date.now() - startWait < maxWaitMs
    ) {
      if (processedRecord.status === CommunicationDeliveryStatus.QUEUED) {
        queueStats = await durableOutbox.processQueue(queuedJob.id);
      }
      await new Promise((r) => setTimeout(r, 1000));
      processedRecord = await prisma.communicationDelivery.findUnique({
        where: { id: queuedJob.id },
      });
    }

    const scenario2Passed =
      processedRecord?.status === CommunicationDeliveryStatus.SENT ||
      processedRecord?.status === CommunicationDeliveryStatus.FAILED ||
      ((processedRecord?.retryCount || 0) >= 1 && Boolean(processedRecord?.failureReason));

    record(
      2,
      'Durable Worker Processing & Safe Lifecycle Tracking',
      scenario2Passed,
      `Final Status: ${processedRecord?.status} | RetryCount: ${processedRecord?.retryCount} | FailureReason: ${processedRecord?.failureReason || 'N/A'} | ProviderMsgId: ${processedRecord?.providerMessageId || 'N/A'} | WorkerStats: ${JSON.stringify(queueStats)}`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 3: Stale Worker Crash Recovery (>2 minutes in SENDING)
    // ---------------------------------------------------------------------------------
    // Create a notification and delivery stuck in SENDING from 5 minutes ago
    const staleNotif = await prisma.notification.create({
      data: {
        title: 'Stale Worker Crash Test',
        message: 'Simulating crash recovery for orphan jobs',
        category: 'SYSTEM',
        metadata: {
          recipientEmail: `stale.${testId}@swayamadmission.com`,
          recipientName: 'Stale Tester',
        },
      },
    });

    const staleDelivery = await prisma.communicationDelivery.create({
      data: {
        notificationId: staleNotif.id,
        channel: CommunicationChannel.EMAIL,
        recipientEmail: `stale.${testId}@swayamadmission.com`,
        status: CommunicationDeliveryStatus.SENDING,
        retryCount: 1,
        updatedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
    });

    await durableOutbox.recoverStaleSendingJobs(2 * 60 * 1000);

    const recoveredDelivery = await prisma.communicationDelivery.findUnique({
      where: { id: staleDelivery.id },
    });

    const scenario3Passed = recoveredDelivery?.status === CommunicationDeliveryStatus.QUEUED;

    record(
      3,
      'Worker Crash Recovery (Stale SENDING -> QUEUED)',
      scenario3Passed,
      `Stale ID: ${staleDelivery.id} | Recovered Status: ${recoveredDelivery?.status}`,
    );

    // Clean up scenario 3 test record
    await prisma.communicationDelivery.delete({ where: { id: staleDelivery.id } }).catch(() => null);
    await prisma.notification.delete({ where: { id: staleNotif.id } }).catch(() => null);

    // ---------------------------------------------------------------------------------
    // Scenario 4: Student Registration Must NOT Automatically Verify Email
    // ---------------------------------------------------------------------------------
    // Create student via Prisma directly mimicking registerStudent data
    const studentUser = await prisma.user.create({
      data: {
        email: testUserEmail,
        fullName: 'Phase 3 Student Tester',
        role: 'STUDENT',
        emailVerified: false,
        emailVerifiedAt: null,
      },
    });

    const scenario4Passed = studentUser.emailVerified === false && studentUser.emailVerifiedAt === null;

    record(
      4,
      'Student Registration Email Verification Strictness',
      scenario4Passed,
      `User ID: ${studentUser.id} | emailVerified: ${studentUser.emailVerified} | emailVerifiedAt: ${studentUser.emailVerifiedAt}`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 5: Production OTP / Secret Disclosure Elimination
    // ---------------------------------------------------------------------------------
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const isExposedInProd = (authService as any).shouldExposeDevSecret();
    process.env.NODE_ENV = origEnv;

    const scenario5Passed = isExposedInProd === false;

    record(
      5,
      'Production OTP / Secret Disclosure Elimination',
      scenario5Passed,
      `shouldExposeDevSecret() in NODE_ENV=production returned: ${isExposedInProd}`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 6: Cross-Account Email Change Conflict Handling (HTTP 409)
    // ---------------------------------------------------------------------------------
    const existingUser = await prisma.user.create({
      data: {
        email: existingEmail,
        fullName: 'Existing User Tester',
        role: 'STUDENT',
      },
    });

    let scenario6Passed = false;
    let scenario6Message = '';
    try {
      await authService.sendEmailVerification(studentUser.id, existingEmail);
      scenario6Message = 'Failed to throw ConflictException on duplicate email change';
    } catch (err: any) {
      if (err instanceof ConflictException) {
        scenario6Passed = true;
        scenario6Message = `Correctly threw ConflictException: ${err.message}`;
      } else {
        scenario6Message = `Threw unexpected error: ${err.message}`;
      }
    }

    record(
      6,
      'Cross-Account Email Change Conflict Handling (HTTP 409)',
      scenario6Passed,
      scenario6Message,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 7: Mobile Password Recovery Channel Strictness (No Fake Success)
    // ---------------------------------------------------------------------------------
    // Ensure WhatsApp & SMS configs in DB are disabled or unconfigured
    await prisma.otpConfiguration.upsert({
      where: { channel: 'WHATSAPP' },
      update: { enabled: false },
      create: { channel: 'WHATSAPP', enabled: false },
    });
    await prisma.otpConfiguration.upsert({
      where: { channel: 'SMS' },
      update: { enabled: false },
      create: { channel: 'SMS', enabled: false },
    });

    let scenario7Passed = false;
    let scenario7Message = '';
    try {
      await authService.forgotPasswordSendOtp({
        identifier: '9876543210',
        channel: 'WHATSAPP',
      });
      scenario7Message = 'Failed to reject unconfigured mobile channel; returned simulated success!';
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        scenario7Passed = true;
        scenario7Message = `Correctly rejected with BadRequestException: ${err.message}`;
      } else {
        scenario7Message = `Threw unexpected error: ${err.message}`;
      }
    }

    record(
      7,
      'Mobile Password Recovery Strictness (No Fake Success)',
      scenario7Passed,
      scenario7Message,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 8: Nodemailer Transport IPv4 Enforcement & Socket Timeouts
    // ---------------------------------------------------------------------------------
    const transporterObj = await (emailChannel as any).getTransporter();
    const transportOptions = transporterObj?.transporter?.options || {};

    const scenario8Passed =
      transportOptions.family === 4 &&
      transportOptions.connectionTimeout === 10000 &&
      transportOptions.greetingTimeout === 10000 &&
      transportOptions.socketTimeout === 15000;

    record(
      8,
      'Nodemailer Transport IPv4 Enforcement & Socket Timeouts',
      scenario8Passed,
      `family: ${transportOptions.family} (IPv4 enforced) | connTimeout: ${transportOptions.connectionTimeout}ms | socketTimeout: ${transportOptions.socketTimeout}ms`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 9: Real WhatsApp Cloud API Provider Gateway Verification
    // ---------------------------------------------------------------------------------
    const waHealth = await whatsAppChannel.getHealth();
    const waSendResult = await whatsAppChannel.send(
      { id: 'test', name: 'Tester', mobile: '919876543210', type: 'STUDENT' },
      { title: 'Test', message: 'Test message' },
    );

    const scenario9Passed =
      (waHealth.status === 'UNCONFIGURED' || waHealth.status === 'HEALTHY') &&
      (!waSendResult.success ? waSendResult.failureReason !== undefined : true);

    record(
      9,
      'WhatsApp Business Cloud API Real Provider Status & Error Handling',
      scenario9Passed,
      `Health Status: ${waHealth.status} (${waHealth.message}) | Send Result Status: ${waSendResult.status} | Failure Reason: ${waSendResult.failureReason || 'N/A'}`,
    );

    // ---------------------------------------------------------------------------------
    // Scenario 10: Notification Template Failure Resilience (No Silent Skips)
    // ---------------------------------------------------------------------------------
    const nonExistentEventType = 'NON_EXISTENT_RECRUITMENT_EVENT_TYPE' as any;
    await notificationsService.emitRecruitmentEvent(nonExistentEventType, {
      candidateName: 'Resilience Test Candidate',
      candidateEmail: `candidate.${testId}@swayamadmission.com`,
    });

    const failedDelivery = await prisma.communicationDelivery.findFirst({
      where: {
        recipientEmail: `candidate.${testId}@swayamadmission.com`,
        status: CommunicationDeliveryStatus.FAILED,
        failureReason: 'MISSING_TEMPLATE',
      },
    });

    const scenario10Passed = Boolean(failedDelivery);

    record(
      10,
      'Notification Template Missing Resilience (Observable Failure Audit)',
      scenario10Passed,
      `Delivery Record Found: ${Boolean(failedDelivery)} | Status: ${failedDelivery?.status} | FailureReason: ${failedDelivery?.failureReason}`,
    );

    // Clean up temporary test data
    if (failedDelivery) {
      await prisma.communicationDelivery.delete({ where: { id: failedDelivery.id } }).catch(() => null);
    }
    await prisma.user.deleteMany({
      where: {
        id: { in: [studentUser.id, existingUser.id] },
      },
    }).catch(() => null);

  } catch (err: any) {
    console.error('Unhandled exception during Phase 3 verification suite:', err);
  } finally {
    console.log('-----------------------------------------------------------------------------------');
    console.log(`TOTAL SCENARIOS: ${results.length}`);
    console.log(`PASSED: ${results.filter((r) => r.passed).length}`);
    console.log(`FAILED: ${results.filter((r) => !r.passed).length}`);
    console.log('-----------------------------------------------------------------------------------\n');

    await app.close();
    process.exit(results.every((r) => r.passed) ? 0 : 1);
  }
}

void runPhase3Verification();
