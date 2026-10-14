import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

async function runOtpSettingsSmokeTest() {
  console.log('====================================================');
  console.log(' SWAYAM ADMISSION — OTP SETTINGS API & PERSISTENCE  ');
  console.log('====================================================\n');

  let app: NestExpressApplication;
  try {
    app = await NestFactory.create<NestExpressApplication>(AppModule);
  } catch (initErr: any) {
    console.error('FAILED TO CREATE NEST APP:', initErr);
    throw initErr;
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('v1', {
    exclude: ['documents/file/(.*)'],
  });

  const TEST_PORT = 3334;
  await app.listen(TEST_PORT);
  console.log(`✅ Test server running on http://localhost:${TEST_PORT}\n`);

  const prisma = new PrismaClient();

  try {
    // 1. Admin Login to obtain Bearer token
    console.log('[1] Logging in as Admin to obtain access token...');
    const loginRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@swayamadmission.in',
        password: 'Admin@123',
      }),
    });
    const loginData = await loginRes.json();
    if (loginRes.status !== 200 || !loginData.access_token) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginData)}`);
    }
    const token = loginData.access_token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    console.log(`    ✅ Admin logged in successfully.`);

    // 2. Test Dashboard Stats
    console.log('\n[2] Testing GET /v1/admin/otp-settings/dashboard...');
    const dashRes = await fetch(`http://localhost:${TEST_PORT}/v1/admin/otp-settings/dashboard`, {
      headers: authHeaders,
    });
    const dashData = await dashRes.json();
    console.log(`    Status Code: ${dashRes.status}`);
    if (dashRes.status !== 200 || !dashData.whatsapp || !dashData.email) {
      throw new Error(`Dashboard stats failed: ${JSON.stringify(dashData)}`);
    }
    console.log(`    ✅ Dashboard stats returned successfully: WhatsApp and Email channels available.`);

    // 3. Test GET /v1/admin/otp-settings/config/EMAIL
    console.log('\n[3] Testing GET /v1/admin/otp-settings/config/EMAIL...');
    const getEmailRes = await fetch(`http://localhost:${TEST_PORT}/v1/admin/otp-settings/config/EMAIL`, {
      headers: authHeaders,
    });
    const getEmailData = await getEmailRes.json();
    console.log(`    Status Code: ${getEmailRes.status}`);
    if (getEmailRes.status !== 200 || getEmailData.channel !== 'EMAIL') {
      throw new Error(`GET EMAIL config failed: ${JSON.stringify(getEmailData)}`);
    }
    console.log(`    ✅ Default/existing EMAIL configuration retrieved.`);

    // 4. Test PUT /v1/admin/otp-settings/config/EMAIL
    console.log('\n[4] Testing PUT /v1/admin/otp-settings/config/EMAIL (Save EMAIL config)...');
    const updateEmailPayload = {
      enabled: true,
      provider: 'SendGrid SMTP Gateway',
      providerUrl: 'smtp.sendgrid.net',
      apiKey: 'sg_api_user_test',
      apiPassword: 'SuperSecretPassword123!',
      senderId: 'otp@swayamadmission.in',
      expirySeconds: 240,
      maxAttempts: 4,
      resendCooldownSec: 45,
      rateLimitCount: 15,
      rateLimitWindowSec: 1800,
    };
    const putEmailRes = await fetch(`http://localhost:${TEST_PORT}/v1/admin/otp-settings/config/EMAIL`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(updateEmailPayload),
    });
    const putEmailData = await putEmailRes.json();
    console.log(`    Status Code: ${putEmailRes.status}`);
    if (putEmailRes.status !== 200) {
      throw new Error(`PUT EMAIL config failed: ${JSON.stringify(putEmailData)}`);
    }
    if (
      putEmailData.provider !== 'SendGrid SMTP Gateway' ||
      putEmailData.providerUrl !== 'smtp.sendgrid.net' ||
      putEmailData.senderId !== 'otp@swayamadmission.in' ||
      putEmailData.expirySeconds !== 240 ||
      putEmailData.maxAttempts !== 4 ||
      putEmailData.resendCooldownSec !== 45 ||
      putEmailData.rateLimitCount !== 15 ||
      putEmailData.rateLimitWindowSec !== 1800
    ) {
      throw new Error(`Saved fields mismatch in response: ${JSON.stringify(putEmailData)}`);
    }
    // Verify secret is masked
    if (putEmailData.apiPassword !== '********' || putEmailData.apiKey !== '********') {
      throw new Error(`Secrets were not properly masked in response! Found: ${putEmailData.apiPassword}`);
    }
    console.log('    ✅ EMAIL configuration saved successfully and secrets are properly masked.');

    // 5. Verify EMAIL persistence across reload
    console.log('\n[5] Verifying EMAIL persistence across page refresh (GET /v1/admin/otp-settings/config/EMAIL)...');
    const reloadEmailRes = await fetch(`http://localhost:${TEST_PORT}/v1/admin/otp-settings/config/EMAIL`, {
      headers: authHeaders,
    });
    const reloadEmailData = await reloadEmailRes.json();
    if (
      reloadEmailData.provider !== 'SendGrid SMTP Gateway' ||
      reloadEmailData.providerUrl !== 'smtp.sendgrid.net' ||
      reloadEmailData.senderId !== 'otp@swayamadmission.in' ||
      reloadEmailData.expirySeconds !== 240 ||
      reloadEmailData.enabled !== true
    ) {
      throw new Error(`EMAIL configuration did not persist across reload: ${JSON.stringify(reloadEmailData)}`);
    }
    console.log('    ✅ EMAIL configuration verified persisted across reload.');

    // 6. Verify Secret Preservation when password input is left blank or masked
    console.log('\n[6] Testing secret preservation when saving with blank or masked passwords...');
    const blankSecretPayload = {
      enabled: true,
      provider: 'SendGrid SMTP Gateway Updated',
      providerUrl: 'smtp.sendgrid.net',
      apiKey: '', // blank: should preserve previous secret
      apiPassword: '********', // masked: should preserve previous secret
      senderId: 'otp-updated@swayamadmission.in',
      expirySeconds: 300,
      maxAttempts: 5,
      resendCooldownSec: 30,
      rateLimitCount: 10,
      rateLimitWindowSec: 3600,
    };
    const preserveRes = await fetch(`http://localhost:${TEST_PORT}/v1/admin/otp-settings/config/EMAIL`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(blankSecretPayload),
    });
    const preserveData = await preserveRes.json();
    console.log(`    Status Code: ${preserveRes.status}`);
    if (preserveRes.status !== 200) {
      throw new Error(`Save with blank/masked secrets failed: ${JSON.stringify(preserveData)}`);
    }

    // Direct database check to ensure actual secret is retained in DB
    const dbEmailConfig = await prisma.otpConfiguration.findUnique({ where: { channel: 'EMAIL' } });
    if (dbEmailConfig?.apiPassword !== 'SuperSecretPassword123!') {
      throw new Error(`Existing password was overwritten in DB! Found: ${dbEmailConfig?.apiPassword}`);
    }
    if (dbEmailConfig?.apiKey !== 'sg_api_user_test') {
      throw new Error(`Existing API key was overwritten in DB! Found: ${dbEmailConfig?.apiKey}`);
    }
    console.log('    ✅ Secrets successfully preserved in database when input is left blank or masked.');

    // 7. Test GET /v1/admin/otp-settings/config/WHATSAPP
    console.log('\n[7] Testing GET /v1/admin/otp-settings/config/WHATSAPP...');
    const getWaRes = await fetch(`http://localhost:${TEST_PORT}/v1/admin/otp-settings/config/WHATSAPP`, {
      headers: authHeaders,
    });
    const getWaData = await getWaRes.json();
    console.log(`    Status Code: ${getWaRes.status}`);
    if (getWaRes.status !== 200 || getWaData.channel !== 'WHATSAPP') {
      throw new Error(`GET WHATSAPP config failed: ${JSON.stringify(getWaData)}`);
    }
    console.log('    ✅ WHATSAPP configuration retrieved.');

    // 8. Test PUT /v1/admin/otp-settings/config/WHATSAPP
    console.log('\n[8] Testing PUT /v1/admin/otp-settings/config/WHATSAPP (Save WHATSAPP config)...');
    const updateWaPayload = {
      enabled: true,
      provider: 'Meta WhatsApp Cloud API',
      providerUrl: 'https://graph.facebook.com/v18.0',
      apiKey: 'Meta_App_ID_12345',
      apiPassword: 'Meta_Permanent_Bearer_Token_Secret!',
      senderId: '10987654321',
      templateId: 'swayam_otp_verify_v2',
      expirySeconds: 180,
      maxAttempts: 3,
      resendCooldownSec: 60,
      rateLimitCount: 5,
      rateLimitWindowSec: 1800,
    };
    const putWaRes = await fetch(`http://localhost:${TEST_PORT}/v1/admin/otp-settings/config/WHATSAPP`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(updateWaPayload),
    });
    const putWaData = await putWaRes.json();
    console.log(`    Status Code: ${putWaRes.status}`);
    if (putWaRes.status !== 200) {
      throw new Error(`PUT WHATSAPP config failed: ${JSON.stringify(putWaData)}`);
    }
    if (
      putWaData.provider !== 'Meta WhatsApp Cloud API' ||
      putWaData.providerUrl !== 'https://graph.facebook.com/v18.0' ||
      putWaData.senderId !== '10987654321' ||
      putWaData.templateId !== 'swayam_otp_verify_v2' ||
      putWaData.expirySeconds !== 180 ||
      putWaData.maxAttempts !== 3 ||
      putWaData.resendCooldownSec !== 60
    ) {
      throw new Error(`WHATSAPP saved fields mismatch: ${JSON.stringify(putWaData)}`);
    }
    if (putWaData.apiPassword !== '********' || putWaData.apiKey !== '********') {
      throw new Error(`WHATSAPP secrets not masked in response!`);
    }
    console.log('    ✅ WHATSAPP configuration saved successfully and secrets are masked.');

    // 9. Verify WHATSAPP persistence across reload
    console.log('\n[9] Verifying WHATSAPP persistence across reload...');
    const reloadWaRes = await fetch(`http://localhost:${TEST_PORT}/v1/admin/otp-settings/config/WHATSAPP`, {
      headers: authHeaders,
    });
    const reloadWaData = await reloadWaRes.json();
    if (
      reloadWaData.provider !== 'Meta WhatsApp Cloud API' ||
      reloadWaData.providerUrl !== 'https://graph.facebook.com/v18.0' ||
      reloadWaData.senderId !== '10987654321' ||
      reloadWaData.templateId !== 'swayam_otp_verify_v2' ||
      reloadWaData.expirySeconds !== 180
    ) {
      throw new Error(`WHATSAPP configuration did not persist: ${JSON.stringify(reloadWaData)}`);
    }
    console.log('    ✅ WHATSAPP configuration verified persisted.');

    // 10. Test Invalid Channel Handling
    console.log('\n[10] Testing Invalid Channel (GET /v1/admin/otp-settings/config/TELEGRAM)...');
    const invalidChanRes = await fetch(`http://localhost:${TEST_PORT}/v1/admin/otp-settings/config/TELEGRAM`, {
      headers: authHeaders,
    });
    console.log(`    Status Code: ${invalidChanRes.status} (Expected: 400)`);
    if (invalidChanRes.status !== 400) {
      throw new Error(`Expected 400 for invalid channel, got ${invalidChanRes.status}`);
    }
    console.log('    ✅ Invalid channel rejected with 400 Bad Request.');

    // 11. Test Send Test OTP validations
    console.log('\n[11] Testing Send Test OTP Validations...');
    // Invalid email test
    const testInvalidEmailRes = await fetch(`http://localhost:${TEST_PORT}/v1/admin/otp-settings/test/email`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    console.log(`    Invalid Email Status: ${testInvalidEmailRes.status} (Expected: 400)`);
    if (testInvalidEmailRes.status !== 400) {
      throw new Error(`Expected 400 for invalid email test, got ${testInvalidEmailRes.status}`);
    }

    // Invalid mobile test
    const testInvalidMobileRes = await fetch(`http://localhost:${TEST_PORT}/v1/admin/otp-settings/test/whatsapp`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ mobile: '123' }),
    });
    console.log(`    Invalid Mobile Status: ${testInvalidMobileRes.status} (Expected: 400)`);
    if (testInvalidMobileRes.status !== 400) {
      throw new Error(`Expected 400 for invalid mobile test, got ${testInvalidMobileRes.status}`);
    }

    // Valid Email OTP test
    const testValidEmailRes = await fetch(`http://localhost:${TEST_PORT}/v1/admin/otp-settings/test/email`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ email: 'test.admin@swayamadmission.in' }),
    });
    const testValidEmailData = await testValidEmailRes.json();
    console.log(`    Valid Email Test Status: ${testValidEmailRes.status}, Response: ${JSON.stringify(testValidEmailData)}`);
    if ((testValidEmailRes.status !== 200 && testValidEmailRes.status !== 201) || !testValidEmailData.success) {
      throw new Error(`Valid email test failed: ${JSON.stringify(testValidEmailData)}`);
    }
    console.log('    ✅ Email test OTP dispatch verified.');

    // Valid WhatsApp OTP test
    const testValidWaRes = await fetch(`http://localhost:${TEST_PORT}/v1/admin/otp-settings/test/whatsapp`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ mobile: '+919876543210' }),
    });
    const testValidWaData = await testValidWaRes.json();
    console.log(`    Valid WhatsApp Test Status: ${testValidWaRes.status}, Response: ${JSON.stringify(testValidWaData)}`);
    if ((testValidWaRes.status !== 200 && testValidWaRes.status !== 201) || !testValidWaData.success) {
      throw new Error(`Valid WhatsApp test failed: ${JSON.stringify(testValidWaData)}`);
    }
    console.log('    ✅ WhatsApp test OTP dispatch verified.');

    // 12. Audit log creation check
    console.log('\n[12] Checking Audit Log records for OTP configuration updates...');
    const auditLogs = await prisma.auditLog.findMany({
      where: { module: 'AUTH_OTP' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log(`    Found ${auditLogs.length} AUTH_OTP audit log records.`);
    if (auditLogs.length === 0) {
      throw new Error('No audit log entries created for OTP settings updates!');
    }
    // Verify audit logs do not contain secrets
    for (const log of auditLogs) {
      const changesStr = JSON.stringify(log.changes || {});
      if (changesStr.includes('SuperSecretPassword123!') || changesStr.includes('Meta_Permanent_Bearer_Token_Secret!')) {
        throw new Error('Audit log contains leaked plaintext secret!');
      }
    }
    console.log('    ✅ Audit logs verified with secrets safely excluded.');

    console.log('\n====================================================');
    console.log(' ✅ ALL OTP SETTINGS VERIFICATION TESTS PASSED 100%! ');
    console.log('====================================================');
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

runOtpSettingsSmokeTest().catch((err) => {
  console.error('\n❌ OTP Settings Smoke Test Failed:', err);
  process.exit(1);
});
