import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role } from '@prisma/client';

async function runGoogleOAuthVerification() {
  console.log('================================================================');
  console.log('🧪 SWAYAM ADMISSION — PRODUCTION GOOGLE OAUTH & SECURITY SUITE');
  console.log('================================================================\n');

  // Set environment variable for test execution
  process.env.ALLOW_TEST_AUTH = 'true';
  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('v1');
  app.enableCors();

  const TEST_PORT = 3337;
  await app.listen(TEST_PORT);
  console.log(`✅ Test server initialized on http://localhost:${TEST_PORT}\n`);

  const prisma = app.get(PrismaService);
  const cleanupUserIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: REJECT MISSING ID TOKEN
    // -------------------------------------------------------------------------
    console.log('[Test 1] Testing rejection of missing Google ID token...');
    const noTokenRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'unauthenticated@example.com',
        fullName: 'Hacker',
      }),
    });
    console.log(`    Status: ${noTokenRes.status} (Expected: 400 Bad Request)`);
    if (noTokenRes.status !== 400) {
      throw new Error(`Expected status 400 for missing idToken, got ${noTokenRes.status}`);
    }
    const noTokenBody = await noTokenRes.json();
    console.log(`    Response message: "${noTokenBody.message}"`);
    console.log('    ✅ Missing credential was rejected successfully.');

    // -------------------------------------------------------------------------
    // TEST 2: REJECT INVALID / MALFORMED GOOGLE ID TOKEN
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Testing rejection of invalid / forged Google ID token...');
    const invalidTokenRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      }),
    });
    console.log(`    Status: ${invalidTokenRes.status} (Expected: 401 Unauthorized)`);
    if (invalidTokenRes.status !== 401) {
      throw new Error(`Expected status 401 for invalid Google token, got ${invalidTokenRes.status}`);
    }
    const invalidTokenBody = await invalidTokenRes.json();
    console.log(`    Response message: "${invalidTokenBody.message}"`);
    console.log('    ✅ Invalid / forged token was rejected with 401 Unauthorized.');

    // -------------------------------------------------------------------------
    // TEST 3: NEW STUDENT REGISTRATION VIA VERIFIED GOOGLE IDENTITY
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Testing brand new student registration via verified Google identity...');
    const testSub1 = `g-sub-${Date.now()}`;
    const testEmail1 = `google.student.${Date.now()}@gmail.com`;
    const testName1 = 'Aditi Sharma';
    const testToken1 = `test-google-token-:${testSub1}:${testEmail1}:${testName1}:https://example.com/avatar1.jpg`;

    const registerRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: testToken1,
      }),
    });
    console.log(`    Status: ${registerRes.status} (Expected: 200 OK)`);
    if (registerRes.status !== 200) {
      const errText = await registerRes.text();
      throw new Error(`Google student registration failed (${registerRes.status}): ${errText}`);
    }
    const registerBody = await registerRes.json();
    console.log(`    User Registered: ${registerBody.user.fullName} (${registerBody.user.email})`);
    console.log(`    Role: ${registerBody.user.role} (Expected: STUDENT)`);
    console.log(`    Student ID: ${registerBody.user.studentId}`);
    console.log(`    Registration Number: ${registerBody.user.registrationNumber}`);
    console.log(`    Email Verified: ${registerBody.user.emailVerified}`);
    console.log(`    JWT Access Token issued: ${registerBody.access_token.substring(0, 20)}...`);

    if (registerBody.user.role !== 'STUDENT') {
      throw new Error(`Expected role STUDENT, got ${registerBody.user.role}`);
    }
    if (!registerBody.user.studentId || !registerBody.user.registrationNumber) {
      throw new Error('Student identifiers were not generated');
    }
    if (!registerBody.user.emailVerified) {
      throw new Error('Google email was not marked as verified');
    }
    if (registerBody.isNewUser !== true) {
      throw new Error('isNewUser flag should be true for first-time Google sign-up');
    }

    const createdStudentId = registerBody.user.id;
    cleanupUserIds.push(createdStudentId);

    // Verify AuthIdentity record in database
    const authIdentity1 = await prisma.authIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'GOOGLE',
          providerAccountId: testSub1,
        },
      },
    });
    if (!authIdentity1 || authIdentity1.userId !== createdStudentId) {
      throw new Error('AuthIdentity not properly created or linked to User in database');
    }
    console.log('    ✅ New student registered and AuthIdentity record persisted.');

    // -------------------------------------------------------------------------
    // TEST 4: EXISTING GOOGLE STUDENT LOGIN (IDEMPOTENCY & NO DUPLICATION)
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Testing existing Google student login (no duplicates)...');
    const loginRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: testToken1,
      }),
    });
    console.log(`    Status: ${loginRes.status} (Expected: 200 OK)`);
    const loginBody = await loginRes.json();
    if (loginBody.user.id !== createdStudentId) {
      throw new Error('Existing Google user did not resolve to same account ID');
    }
    if (loginBody.isNewUser === true) {
      throw new Error('isNewUser must be false for existing user');
    }

    const identityCount = await prisma.authIdentity.count({
      where: { provider: 'GOOGLE', providerAccountId: testSub1 },
    });
    if (identityCount !== 1) {
      throw new Error(`Expected exactly 1 AuthIdentity, found ${identityCount}`);
    }
    console.log('    ✅ Existing student logged in successfully with zero duplicate records.');

    // -------------------------------------------------------------------------
    // TEST 5: PREVENT ACCOUNT TAKEOVER (MISMATCHED GOOGLE ID FOR EXISTING USER)
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Testing anti-account takeover protection (mismatched Google sub)...');
    const attackerSub = `g-attacker-${Date.now()}`;
    const takeoverToken = `test-google-token-:${attackerSub}:${testEmail1}:Attacker:`;

    const takeoverRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: takeoverToken,
      }),
    });
    console.log(`    Status: ${takeoverRes.status} (Expected: 401 Unauthorized)`);
    if (takeoverRes.status !== 401) {
      throw new Error(`Expected status 401 for takeover attempt, got ${takeoverRes.status}`);
    }
    const takeoverBody = await takeoverRes.json();
    console.log(`    Response message: "${takeoverBody.message}"`);
    console.log('    ✅ Anti-takeover protection blocked mismatched Google ID successfully.');

    // -------------------------------------------------------------------------
    // TEST 6: PRIVILEGE ESCALATION PROTECTION (RBAC PRESERVATION)
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Testing privilege escalation protection...');
    // Existing admin account should NEVER be downgraded to STUDENT or modified via Google login
    const adminEmail = 'admin@swayamadmission.in';
    const adminSub = `g-admin-${Date.now()}`;
    const adminToken = `test-google-token-:${adminSub}:${adminEmail}:Administrator:`;

    const adminGoogleRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: adminToken,
      }),
    });
    console.log(`    Status: ${adminGoogleRes.status} (Expected: 200 OK)`);
    const adminGoogleBody = await adminGoogleRes.json();
    console.log(`    Role returned: ${adminGoogleBody.user.role} (Expected: SUPER_ADMIN or ADMIN)`);
    if (adminGoogleBody.user.role === 'STUDENT') {
      throw new Error('CRITICAL: Admin account role was overwritten with STUDENT!');
    }
    console.log('    ✅ Privileged role preserved and protected.');

    // -------------------------------------------------------------------------
    // TEST 7: ACCOUNT STATUS ENFORCEMENT (LOCKED / DEACTIVATED)
    // -------------------------------------------------------------------------
    console.log('\n[Test 7] Testing account status enforcement (locked / disabled accounts)...');
    // Temporarily lock the test student
    await prisma.user.update({
      where: { id: createdStudentId },
      data: { status: 'LOCKED', lockReason: 'Security audit' },
    });

    const lockedRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: testToken1,
      }),
    });
    console.log(`    Status: ${lockedRes.status} (Expected: 401 Unauthorized)`);
    if (lockedRes.status !== 401) {
      throw new Error(`Expected status 401 for locked user, got ${lockedRes.status}`);
    }
    const lockedBody = await lockedRes.json();
    console.log(`    Response message: "${lockedBody.message}"`);
    console.log('    ✅ Locked account was correctly blocked from Google login.');

    // -------------------------------------------------------------------------
    // TEST 8: VERIFY STANDARD PASSWORD LOGIN STILL OPERATIONAL
    // -------------------------------------------------------------------------
    console.log('\n[Test 8] Testing standard email + password login (regression check)...');
    const pwdRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@swayamadmission.in',
        password: 'Admin@123',
      }),
    });
    console.log(`    Status: ${pwdRes.status} (Expected: 200 OK)`);
    if (pwdRes.status !== 200) {
      throw new Error(`Password login failed: status ${pwdRes.status}`);
    }
    const pwdBody = await pwdRes.json();
    if (!pwdBody.access_token) {
      throw new Error('Password login did not return access_token');
    }
    console.log(`    ✅ Standard password login functioning normally.`);

    console.log('\n================================================================');
    console.log(' 🎉 ALL 8 PRODUCTION GOOGLE OAUTH SECURITY SCENARIOS PASSED!   ');
    console.log('================================================================\n');
  } finally {
    // Clean up created test data
    if (cleanupUserIds.length > 0) {
      await prisma.authIdentity.deleteMany({
        where: { userId: { in: cleanupUserIds } },
      });
      await prisma.studentProfile.deleteMany({
        where: { userId: { in: cleanupUserIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: cleanupUserIds } },
      });
      console.log('🧹 Cleaned up temporary test users.');
    }
    await app.close();
  }
}

runGoogleOAuthVerification().catch((err) => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
