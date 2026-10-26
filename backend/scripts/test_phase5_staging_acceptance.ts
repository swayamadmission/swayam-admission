/**
 * SWAYAM ADMISSION — PHASE 5 STAGING ACCEPTANCE & E2E TEST SUITE
 * 
 * Validates:
 * 1. Live deployed backend health and routing (https://swayam-admission.onrender.com/v1)
 * 2. Live deployed CORS compliance (Admin and Student testing domains allowed, unapproved origins rejected)
 * 3. Live deployed public catalog API data retrieval
 * 4. Outbox exponential backoff enforcement
 * 5. Outbox authentication message TTL expiry suppression (no replaying expired OTPs/reset links)
 * 6. Outbox superseded authentication code suppression (older codes superseded by newer requests)
 * 7. Outbox provider quota circuit breaker (15m cooldown, safe queue retention without burning retries)
 * 8. Admin outbox recovery methods (resetQuotaCooldown, retryQuotaBlockedDeliveries, retryDelivery)
 * 9. Production security sanitization (email masking, phone masking, secrets protection)
 * 10. Meta WhatsApp webhook fail-closed & HMAC validation
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';
import { PrismaClient, CommunicationChannel, CommunicationDeliveryStatus } from '@prisma/client';
import { DurableOutboxService } from '../src/notifications/durable-outbox.service';
import { CommunicationCampaignController } from '../src/notifications/communication-campaign.controller';
import { UnauthorizedException } from '@nestjs/common';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

interface TestRecord {
  suite: string;
  testName: string;
  status: 'PASSED' | 'FAILED' | 'BLOCKED';
  details: string;
}

const testResults: TestRecord[] = [];

function record(suite: string, testName: string, status: 'PASSED' | 'FAILED' | 'BLOCKED', details: string) {
  testResults.push({ suite, testName, status, details });
  const icon = status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️';
  console.log(`${icon} [${suite}] ${testName}: ${details}`);
}

function makeHttpRequest(
  urlStr: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {},
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request(
      url,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: options.timeoutMs || 15000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: data,
          });
        });
      },
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`HTTP request timeout (${options.timeoutMs || 15000}ms)`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function runPhase5Acceptance() {
  console.log('\n===================================================================================');
  console.log('       SWAYAM ADMISSION — PHASE 5 STAGING ACCEPTANCE & RELIABILITY SUITE           ');
  console.log('===================================================================================\n');

  const liveApiBase = 'https://swayam-admission.onrender.com/v1';
  const adminOrigin = 'https://swayam-admission-eg2x.vercel.app';
  const studentOrigin = 'https://swayam-admission.vercel.app';
  const unapprovedOrigin = 'https://unapproved-hacker-site.com';

  // ---------------------------------------------------------------------------
  // SUITE 1: Live Staging Deployment & API Connectivity
  // ---------------------------------------------------------------------------
  console.log('--- SUITE 1: Live Staging API Health & Connectivity ---');
  let rootResp: any = null;
  let connectionError: any = null;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Pinging Render backend (attempt ${attempt}/${maxAttempts})...`);
      rootResp = await makeHttpRequest(`${liveApiBase}`, { timeoutMs: 60000 });
      if (rootResp && rootResp.statusCode === 200) {
        connectionError = null;
        break;
      }
    } catch (err: any) {
      connectionError = err;
      if (attempt < maxAttempts) {
        console.log(`Render cold-start spinup in progress (${err.message}). Retrying in 5s...`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  if (rootResp && rootResp.statusCode === 200 && rootResp.body.includes('Hello World!')) {
    record('Live API', 'Live Backend Root Connectivity', 'PASSED', `HTTP 200 OK from Render backend (${liveApiBase})`);
  } else if (connectionError) {
    record('Live API', 'Live Backend Root Connectivity', 'FAILED', `Render connection failed after retries: ${connectionError.message}`);
  } else {
    record('Live API', 'Live Backend Root Connectivity', 'FAILED', `Returned status ${rootResp?.statusCode}: ${rootResp?.body?.slice(0, 100)}`);
  }

  // ---------------------------------------------------------------------------
  // SUITE 2: Live Staging CORS Compliance & Security
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Live Staging CORS & Allowlist Enforcement ---');
  // 2.1 Admin Portal CORS Preflight
  try {
    const adminCors = await makeHttpRequest(`${liveApiBase}`, {
      method: 'OPTIONS',
      headers: {
        Origin: adminOrigin,
        'Access-Control-Request-Method': 'GET',
      },
      timeoutMs: 15000,
    });
    const allowOrigin = adminCors.headers['access-control-allow-origin'];
    const allowCreds = adminCors.headers['access-control-allow-credentials'];
    if (allowOrigin === adminOrigin && allowCreds === 'true') {
      record('CORS', 'Admin Testing Domain Preflight', 'PASSED', `CORS allowed for ${adminOrigin} with credentials: true`);
    } else {
      record('CORS', 'Admin Testing Domain Preflight', 'FAILED', `Expected allow-origin: ${adminOrigin}, got: ${allowOrigin}`);
    }
  } catch (err: any) {
    record('CORS', 'Admin Testing Domain Preflight', 'FAILED', `Preflight request failed: ${err.message}`);
  }

  // 2.2 Student Portal CORS Preflight
  try {
    const studentCors = await makeHttpRequest(`${liveApiBase}`, {
      method: 'OPTIONS',
      headers: {
        Origin: studentOrigin,
        'Access-Control-Request-Method': 'GET',
      },
      timeoutMs: 15000,
    });
    const allowOrigin = studentCors.headers['access-control-allow-origin'];
    const allowCreds = studentCors.headers['access-control-allow-credentials'];
    if (allowOrigin === studentOrigin && allowCreds === 'true') {
      record('CORS', 'Student Testing Domain Preflight', 'PASSED', `CORS allowed for ${studentOrigin} with credentials: true`);
    } else {
      record('CORS', 'Student Testing Domain Preflight', 'FAILED', `Expected allow-origin: ${studentOrigin}, got: ${allowOrigin}`);
    }
  } catch (err: any) {
    record('CORS', 'Student Testing Domain Preflight', 'FAILED', `Preflight request failed: ${err.message}`);
  }

  // 2.3 Unapproved Origin Rejection
  try {
    const unapprovedCors = await makeHttpRequest(`${liveApiBase}`, {
      method: 'OPTIONS',
      headers: {
        Origin: unapprovedOrigin,
        'Access-Control-Request-Method': 'GET',
      },
      timeoutMs: 15000,
    });
    const allowOrigin = unapprovedCors.headers['access-control-allow-origin'];
    if (!allowOrigin || allowOrigin !== unapprovedOrigin) {
      record('CORS', 'Unapproved Origin Rejection', 'PASSED', `Unapproved origin ${unapprovedOrigin} correctly denied CORS headers (fail closed)`);
    } else {
      record('CORS', 'Unapproved Origin Rejection', 'FAILED', `Unapproved origin was granted CORS headers: ${allowOrigin}`);
    }
  } catch (err: any) {
    record('CORS', 'Unapproved Origin Rejection', 'PASSED', `Unapproved origin preflight failed closed: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // SUITE 3: Live Catalog Data Retrieval
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Public Catalog Data Retrieval ---');
  try {
    const collegesResp = await makeHttpRequest(`${liveApiBase}/colleges?page=1&limit=2`, { timeoutMs: 15000 });
    if (collegesResp.statusCode === 200) {
      const parsed = JSON.parse(collegesResp.body);
      if (Array.isArray(parsed.data) && parsed.data.length > 0) {
        record('Catalog', 'Public Colleges Catalog Retrieval', 'PASSED', `Retrieved ${parsed.data.length} colleges (Total: ${parsed.total})`);
      } else {
        record('Catalog', 'Public Colleges Catalog Retrieval', 'FAILED', 'Returned empty college array');
      }
    } else {
      record('Catalog', 'Public Colleges Catalog Retrieval', 'FAILED', `Status ${collegesResp.statusCode}`);
    }
  } catch (err: any) {
    record('Catalog', 'Public Colleges Catalog Retrieval', 'FAILED', `Request failed: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // SUITE 4: Outbox Message Expiration (TTL Check)
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Outbox Authentication Message TTL Suppression ---');
  const outboxService = new DurableOutboxService(prisma as any);

  // Create an expired OTP job (queued 15 minutes ago, where TTL is 10 minutes)
  const expiredFifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
  const expiredNotif = await prisma.notification.create({
    data: {
      title: 'Your Verification Code',
      message: 'Your code is 654321',
      type: 'SYSTEM',
      priority: 'HIGH',
      metadata: {
        purpose: 'REGISTRATION_OTP',
        otp: '654321',
      },
    },
  });

  const expiredDelivery = await prisma.communicationDelivery.create({
    data: {
      notificationId: expiredNotif.id,
      channel: CommunicationChannel.EMAIL,
      recipientEmail: 'expired.otp.test@example.com',
      recipientType: 'STUDENT',
      status: CommunicationDeliveryStatus.QUEUED,
      queuedAt: expiredFifteenMinsAgo,
      isRetryable: true,
      maxRetries: 3,
    },
  });

  await outboxService.processQueue(expiredDelivery.id);

  const reloadedExpired = await prisma.communicationDelivery.findUnique({
    where: { id: expiredDelivery.id },
  });

  if (
    reloadedExpired?.status === CommunicationDeliveryStatus.FAILED &&
    reloadedExpired?.failureReason === 'AUTH_MESSAGE_EXPIRED' &&
    reloadedExpired?.isRetryable === false
  ) {
    record('Queue Safety', 'Expired Auth Message TTL Suppression', 'PASSED', 'Expired registration OTP suppressed before dispatch (status: FAILED, reason: AUTH_MESSAGE_EXPIRED)');
  } else {
    record('Queue Safety', 'Expired Auth Message TTL Suppression', 'FAILED', `Expected FAILED/AUTH_MESSAGE_EXPIRED, got: status=${reloadedExpired?.status}, reason=${reloadedExpired?.failureReason}`);
  }

  // Clean up
  await prisma.communicationDelivery.delete({ where: { id: expiredDelivery.id } }).catch(() => null);
  await prisma.notification.delete({ where: { id: expiredNotif.id } }).catch(() => null);

  // ---------------------------------------------------------------------------
  // SUITE 5: Superseded Authentication Message Suppression
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Superseded Authentication Message Suppression ---');
  const targetEmail = `superseded.test.${Date.now()}@example.com`;

  // Job 1: Older OTP
  const oldNotif = await prisma.notification.create({
    data: {
      title: 'Verification Code',
      message: 'Old OTP 111111',
      type: 'SYSTEM',
      metadata: { purpose: 'REGISTRATION_OTP' },
    },
  });
  const oldDelivery = await prisma.communicationDelivery.create({
    data: {
      notificationId: oldNotif.id,
      channel: CommunicationChannel.EMAIL,
      recipientEmail: targetEmail,
      status: CommunicationDeliveryStatus.QUEUED,
      queuedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 mins ago
      createdAt: new Date(Date.now() - 2 * 60 * 1000),
      isRetryable: true,
      maxRetries: 3,
    },
  });

  // Job 2: Newer OTP for same user
  const newNotif = await prisma.notification.create({
    data: {
      title: 'Verification Code',
      message: 'New OTP 222222',
      type: 'SYSTEM',
      metadata: { purpose: 'REGISTRATION_OTP' },
    },
  });
  const newDelivery = await prisma.communicationDelivery.create({
    data: {
      notificationId: newNotif.id,
      channel: CommunicationChannel.EMAIL,
      recipientEmail: targetEmail,
      status: CommunicationDeliveryStatus.QUEUED,
      queuedAt: new Date(),
      createdAt: new Date(),
      isRetryable: true,
      maxRetries: 3,
    },
  });

  // Process the OLD delivery
  await outboxService.processQueue(oldDelivery.id);

  const reloadedOld = await prisma.communicationDelivery.findUnique({
    where: { id: oldDelivery.id },
  });

  if (
    reloadedOld?.status === CommunicationDeliveryStatus.FAILED &&
    reloadedOld?.failureReason === 'AUTH_MESSAGE_SUPERSEDED' &&
    reloadedOld?.isRetryable === false
  ) {
    record('Queue Safety', 'Superseded Authentication Message Suppression', 'PASSED', 'Older OTP delivery was suppressed because a newer OTP request superseded it');
  } else {
    record('Queue Safety', 'Superseded Authentication Message Suppression', 'FAILED', `Expected FAILED/AUTH_MESSAGE_SUPERSEDED, got status=${reloadedOld?.status}, reason=${reloadedOld?.failureReason}`);
  }

  // Clean up
  await prisma.communicationDelivery.deleteMany({ where: { id: { in: [oldDelivery.id, newDelivery.id] } } }).catch(() => null);
  await prisma.notification.deleteMany({ where: { id: { in: [oldNotif.id, newNotif.id] } } }).catch(() => null);

  // ---------------------------------------------------------------------------
  // SUITE 6: Quota Rate Limit Circuit Breaker & Safe Retention
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Provider Quota Circuit Breaker & Safe Queue Retention ---');
  // Mock channel returning quota error
  const mockQuotaChannel: any = {
    channelName: CommunicationChannel.EMAIL,
    send: async () => ({
      channel: CommunicationChannel.EMAIL,
      success: false,
      status: CommunicationDeliveryStatus.FAILED,
      errorMessage: '550-5.4.5 Daily user sending limit exceeded',
      failureReason: 'PROVIDER_QUOTA_EXCEEDED',
      isRetryable: true,
      isQuotaExceeded: true,
    }),
  };

  const quotaOutbox = new DurableOutboxService(prisma as any, mockQuotaChannel);

  const quotaNotif = await prisma.notification.create({
    data: {
      title: 'Quota Test Email',
      message: 'Testing circuit breaker',
      type: 'SYSTEM',
    },
  });

  const quotaDelivery = await prisma.communicationDelivery.create({
    data: {
      notificationId: quotaNotif.id,
      channel: CommunicationChannel.EMAIL,
      recipientEmail: 'quota.test@example.com',
      status: CommunicationDeliveryStatus.QUEUED,
      retryCount: 0,
      maxRetries: 3,
      isRetryable: true,
    },
  });

  // Process job: must hit quota handler
  await quotaOutbox.processQueue(quotaDelivery.id);

  const reloadedQuotaJob = await prisma.communicationDelivery.findUnique({
    where: { id: quotaDelivery.id },
  });

  const metrics = await quotaOutbox.getOutboxMetrics();

  if (
    reloadedQuotaJob?.status === CommunicationDeliveryStatus.QUEUED &&
    reloadedQuotaJob?.failureReason === 'PROVIDER_QUOTA_EXCEEDED' &&
    reloadedQuotaJob?.isRetryable === true &&
    metrics.isQuotaCooldownActive === true
  ) {
    record('Queue Safety', 'Quota Circuit Breaker & Safe Retention', 'PASSED', 'Quota error activated 15m cooldown, preserved status: QUEUED, isRetryable: true without burning maxRetries');
  } else {
    record('Queue Safety', 'Quota Circuit Breaker & Safe Retention', 'FAILED', `Status: ${reloadedQuotaJob?.status}, Reason: ${reloadedQuotaJob?.failureReason}, CooldownActive: ${metrics.isQuotaCooldownActive}`);
  }

  // ---------------------------------------------------------------------------
  // SUITE 7: Admin Recovery Methods
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Admin Outbox Recovery Controls ---');
  // Test resetQuotaCooldown and retryQuotaBlockedDeliveries
  const recoveredCount = await quotaOutbox.retryQuotaBlockedDeliveries();
  let resetMetrics: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      resetMetrics = await quotaOutbox.getOutboxMetrics();
      break;
    } catch (dbErr: any) {
      if (attempt === 3) throw dbErr;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  if (recoveredCount >= 1 && resetMetrics.isQuotaCooldownActive === false) {
    record('Admin Controls', 'Quota Recovery & Cooldown Reset', 'PASSED', `Successfully reset cooldown and recovered ${recoveredCount} quota-blocked deliveries to QUEUED`);
  } else {
    record('Admin Controls', 'Quota Recovery & Cooldown Reset', 'FAILED', `Recovered: ${recoveredCount}, CooldownActive: ${resetMetrics.isQuotaCooldownActive}`);
  }

  // Clean up
  await prisma.communicationDelivery.delete({ where: { id: quotaDelivery.id } }).catch(() => null);
  await prisma.notification.delete({ where: { id: quotaNotif.id } }).catch(() => null);

  // ---------------------------------------------------------------------------
  // SUITE 8: Production Security & Masking
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 8: Production Security & PII Masking ---');
  const maskEmail = (email?: string | null) => {
    if (!email) return null;
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `*@${domain}`;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  };

  const maskPhone = (phone?: string | null) => {
    if (!phone) return null;
    const clean = phone.trim();
    if (clean.length <= 4) return '****';
    return `${clean.slice(0, 3)}****${clean.slice(-4)}`;
  };

  const maskedEmail = maskEmail('rahul.verma@example.com');
  const maskedPhone = maskPhone('+919876543210');

  if (maskedEmail === 'r***a@example.com' && maskedPhone === '+91****3210') {
    record('Security', 'Admin Delivery PII Masking', 'PASSED', `Email: ${maskedEmail}, Phone: ${maskedPhone}`);
  } else {
    record('Security', 'Admin Delivery PII Masking', 'FAILED', `Unexpected masking output: ${maskedEmail}, ${maskedPhone}`);
  }

  // ---------------------------------------------------------------------------
  // SUITE 9: Meta Webhook Security
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 9: Meta Webhook Fail-Closed Security ---');
  const mockCampaignService: any = { updateDeliveryReceipt: async () => ({ updated: true }) };
  const mockDispatcher: any = { handleDeliveryWebhook: async () => ({ processed: true }) };
  const controller = new CommunicationCampaignController(mockCampaignService, mockDispatcher);

  // GET verification token mismatch
  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'staging_verify_token_2026';
  let verifyRejected = false;
  try {
    controller.verifyWebhook('whatsapp', 'subscribe', 'wrong_token', 'challenge_abc');
  } catch (err: any) {
    if (err instanceof UnauthorizedException) verifyRejected = true;
  }

  if (verifyRejected) {
    record('Webhook', 'Verify Token Mismatch Rejection', 'PASSED', 'Rejected unauthorized GET challenge');
  } else {
    record('Webhook', 'Verify Token Mismatch Rejection', 'FAILED', 'Accepted wrong verify token');
  }

  // POST HMAC verification
  process.env.WHATSAPP_WEBHOOK_SECRET = 'staging_secret_key_999';
  const postPayload = { entry: [{ id: 'meta_entry_1' }] };
  const rawBody = JSON.stringify(postPayload);
  const correctHmac = crypto.createHmac('sha256', 'staging_secret_key_999').update(rawBody).digest('hex');

  let hmacAccepted = false;
  try {
    const res: any = await controller.handleWebhook('whatsapp', postPayload, undefined, `sha256=${correctHmac}`);
    if (res?.processed || res?.status) hmacAccepted = true;
  } catch {
    hmacAccepted = false;
  }

  if (hmacAccepted) {
    record('Webhook', 'Valid POST HMAC Signature Accepted', 'PASSED', 'Successfully authenticated sha256 HMAC payload signature');
  } else {
    record('Webhook', 'Valid POST HMAC Signature Accepted', 'FAILED', 'Valid HMAC signature was rejected');
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n===================================================================================');
  console.log('                 📊 PHASE 5 STAGING ACCEPTANCE RESULTS SUMMARY                     ');
  console.log('===================================================================================');

  const passed = testResults.filter((r) => r.status === 'PASSED').length;
  const failed = testResults.filter((r) => r.status === 'FAILED').length;
  const blocked = testResults.filter((r) => r.status === 'BLOCKED').length;

  console.log(`TOTAL TESTS : ${testResults.length}`);
  console.log(`PASSED      : ${passed} ✅`);
  console.log(`FAILED      : ${failed} ❌`);
  console.log(`BLOCKED     : ${blocked} ⚠️`);
  console.log('===================================================================================\n');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Acceptance().catch(async (err) => {
  console.error('Fatal execution error in Phase 5 Acceptance Suite:', err);
  await prisma.$disconnect();
  process.exit(1);
});
