import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';

async function runHttpAuthSmokeTest() {
  console.log('====================================================');
  console.log(' SWAYAM ADMISSION — FULL AUTH & ROUTE SMOKE SUITE  ');
  console.log('====================================================\n');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('v1', {
    exclude: ['documents/file/(.*)'],
  });

  app.enableCors();

  const TEST_PORT = 3333;
  await app.listen(TEST_PORT);
  console.log(`✅ Test server running on http://localhost:${TEST_PORT}\n`);

  try {
    // 1. Health Check (GET /v1/health)
    console.log('[1] Testing HTTP GET /v1/health...');
    const healthRes = await fetch(`http://localhost:${TEST_PORT}/v1/health`);
    const healthData = await healthRes.json();
    console.log(`    Status Code: ${healthRes.status}`);
    if (healthRes.status !== 200 || healthData.status !== 'ok') {
      throw new Error(`Health check failed with status ${healthRes.status}`);
    }
    console.log('    ✅ System health check operational.');

    // 2. Auth Health Check (GET /v1/health/auth)
    console.log('\n[2] Testing HTTP GET /v1/health/auth...');
    const authHealthRes = await fetch(`http://localhost:${TEST_PORT}/v1/health/auth`);
    const authHealthData = await authHealthRes.json();
    console.log(`    Status Code: ${authHealthRes.status}`);
    if (authHealthRes.status !== 200 || authHealthData.authRoute !== '/v1/auth/login') {
      throw new Error(`Auth health check failed with status ${authHealthRes.status}`);
    }
    console.log('    ✅ Auth diagnostic check operational.');

    // 3. Public Geography Endpoints (GET /v1/geography/states & districts)
    console.log('\n[3] Testing Public Geography Endpoints...');
    const geoRes = await fetch(`http://localhost:${TEST_PORT}/v1/geography/states`);
    const geoData = await geoRes.json();
    console.log(`    GET /v1/geography/states -> Status: ${geoRes.status}, Found: ${Array.isArray(geoData) ? geoData.length : 0} states`);
    if (geoRes.status !== 200 || !Array.isArray(geoData)) {
      throw new Error(`Geography states endpoint failed with status ${geoRes.status}`);
    }
    if (geoData.length > 0) {
      const stateId = geoData[0].id;
      const distRes = await fetch(`http://localhost:${TEST_PORT}/v1/geography/states/${stateId}/districts`);
      const distData = await distRes.json();
      console.log(`    GET /v1/geography/states/${stateId}/districts -> Status: ${distRes.status}, Found: ${Array.isArray(distData) ? distData.length : 0} districts`);
      if (distRes.status !== 200) {
        throw new Error(`Geography districts endpoint failed with status ${distRes.status}`);
      }
    }
    console.log('    ✅ Public geography endpoints verified.');

    // 4. Public Staff Onboarding Allowed Roles (GET /v1/staff-onboarding/allowed-roles)
    console.log('\n[4] Testing Public Staff Onboarding Allowed Roles...');
    const rolesRes = await fetch(`http://localhost:${TEST_PORT}/v1/staff-onboarding/allowed-roles`);
    const rolesData = await rolesRes.json();
    console.log(`    Status Code: ${rolesRes.status}, Open Roles Found: ${Array.isArray(rolesData) ? rolesData.length : 0}`);
    if (rolesRes.status !== 200) {
      throw new Error(`Allowed roles endpoint failed with status ${rolesRes.status}`);
    }
    console.log('    ✅ Public candidate role discovery verified.');

    // 5. Admin Login with Valid Credentials (POST /v1/auth/login)
    console.log('\n[5] Testing Admin Login with Valid Credentials (admin@swayamadmission.in)...');
    const adminLoginRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@swayamadmission.in',
        password: 'Admin@123',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    console.log(`    Status Code: ${adminLoginRes.status}`);
    if (adminLoginRes.status !== 200 || !adminLoginData.access_token || !adminLoginData.user) {
      throw new Error(`Admin valid login failed: ${JSON.stringify(adminLoginData)}`);
    }
    const adminToken = adminLoginData.access_token;
    console.log(`    ✅ Admin login succeeded. Token issued: ${adminToken.substring(0, 20)}...`);
    console.log(`    User Role: ${adminLoginData.user.role}, Permissions count: ${adminLoginData.user.effectivePermissions?.length || 0}`);

    // 6. Admin Login with Invalid Credentials (POST /v1/auth/login)
    console.log('\n[6] Testing Admin Login with Invalid Password...');
    const invalidLoginRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@swayamadmission.in',
        password: 'WrongPassword_456',
      }),
    });
    const invalidLoginData = await invalidLoginRes.json();
    console.log(`    Status Code: ${invalidLoginRes.status} (Expected: 401)`);
    if (invalidLoginRes.status !== 401) {
      throw new Error(`Expected 401 for invalid login, but received ${invalidLoginRes.status}`);
    }
    console.log('    ✅ Invalid password correctly denied with 401 Unauthorized.');

    // 7. Verify Authenticated User Profile (GET /v1/users/me)
    console.log('\n[7] Testing Authenticated Current User (GET /v1/users/me with Bearer token)...');
    const meRes = await fetch(`http://localhost:${TEST_PORT}/v1/users/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meData = await meRes.json();
    console.log(`    Status Code: ${meRes.status}`);
    if (meRes.status !== 200 || meData.email !== 'admin@swayamadmission.in') {
      throw new Error(`GET /v1/users/me failed: ${JSON.stringify(meData)}`);
    }
    console.log(`    ✅ Current user resolved: ${meData.fullName} (${meData.email}), isSuperAdmin: ${meData.isSuperAdmin}`);

    // 8. Test Non-existent User Login
    console.log('\n[8] Testing Non-existent User Login...');
    const nonExistentRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent.user.test@example.com',
        password: 'Password123!',
      }),
    });
    console.log(`    Status Code: ${nonExistentRes.status} (Expected: 401)`);
    if (nonExistentRes.status !== 401) {
      throw new Error(`Expected 401 for non-existent user, but got ${nonExistentRes.status}`);
    }
    console.log('    ✅ Non-existent user correctly denied with 401.');

    console.log('\n====================================================');
    console.log(' ✅ ALL AUTH & ROUTE SMOKE TESTS PASSED 100%!       ');
    console.log('====================================================');
  } finally {
    await app.close();
  }
}

runHttpAuthSmokeTest().catch((err) => {
  console.error('❌ HTTP Auth smoke test failed:', err);
  process.exit(1);
});

