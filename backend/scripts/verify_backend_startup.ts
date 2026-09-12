import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { LeadService } from '../src/lead/lead.service';
import { SystemConfigurationService } from '../src/settings/system-configuration.service';
import { SettingsService } from '../src/settings/settings.service';
import { TasksService } from '../src/tasks/tasks.service';
import { DocumentsService } from '../src/documents/documents.service';
import { AnalyticsService } from '../src/analytics/analytics.service';

async function verifyFullBackendStartup() {
  console.log('===========================================================');
  console.log('🔍 SWAYAM ADMISSION — FULL NESTJS DI & ENDPOINT VERIFICATION');
  console.log('===========================================================\n');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

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

  const PORT = 3334;
  await app.listen(PORT);
  console.log(`\n🚀 NestJS application successfully started on port ${PORT}`);

  try {
    // 1. Verify DI Resolution directly from container
    console.log('\n[1] Verifying NestJS Dependency Injection Resolution...');
    const leadService = app.get(LeadService);
    const systemConfigService = app.get(SystemConfigurationService);
    const settingsService = app.get(SettingsService);
    const tasksService = app.get(TasksService);
    const documentsService = app.get(DocumentsService);
    const analyticsService = app.get(AnalyticsService);

    console.log(`    ✔ LeadService resolved: ${!!leadService}`);
    console.log(`    ✔ SystemConfigurationService resolved: ${!!systemConfigService}`);
    console.log(`    ✔ SettingsService resolved: ${!!settingsService}`);
    console.log(`    ✔ TasksService resolved: ${!!tasksService}`);
    console.log(`    ✔ DocumentsService resolved: ${!!documentsService}`);
    console.log(`    ✔ AnalyticsService resolved: ${!!analyticsService}`);

    if (!leadService || !systemConfigService || !settingsService) {
      throw new Error('Critical service DI resolution failed');
    }

    // 2. Health Endpoint
    console.log('\n[2] Testing GET /v1/health...');
    const healthRes = await fetch(`http://localhost:${PORT}/v1/health`);
    const healthData = await healthRes.json();
    console.log(`    Status: ${healthRes.status}, Body: ${JSON.stringify(healthData)}`);
    if (healthRes.status !== 200 || healthData.status !== 'ok') {
      throw new Error(`Health check failed with status ${healthRes.status}`);
    }

    // 3. Admin Authentication
    console.log('\n[3] Testing POST /v1/auth/login (Admin)...');
    const adminLoginRes = await fetch(`http://localhost:${PORT}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@swayamadmission.in',
        password: 'Admin@123',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    console.log(`    Status: ${adminLoginRes.status}`);
    if (adminLoginRes.status !== 200 || !adminLoginData.access_token) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
    }
    const token = adminLoginData.access_token;
    console.log(`    ✔ Logged in as ${adminLoginData.user.fullName} (${adminLoginData.user.role})`);

    // 4. Authenticated /v1/users/me
    console.log('\n[4] Testing GET /v1/users/me...');
    const meRes = await fetch(`http://localhost:${PORT}/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    console.log(`    Status: ${meRes.status}, User: ${meData.fullName} (${meData.email})`);
    if (meRes.status !== 200 || !meData.id) {
      throw new Error(`GET /v1/users/me failed`);
    }

    // 5. Public Settings Endpoint
    console.log('\n[5] Testing GET /v1/settings/public...');
    const publicSettingsRes = await fetch(`http://localhost:${PORT}/v1/settings/public`);
    const publicSettingsData = await publicSettingsRes.json();
    console.log(`    Status: ${publicSettingsRes.status}, Platform: ${publicSettingsData?.platformName || 'N/A'}`);
    if (publicSettingsRes.status !== 200) {
      throw new Error(`GET /v1/settings/public failed`);
    }

    // 6. Leads Endpoint (Authenticated)
    console.log('\n[6] Testing GET /v1/leads...');
    const leadsRes = await fetch(`http://localhost:${PORT}/v1/leads?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const leadsData = await leadsRes.json();
    console.log(`    Status: ${leadsRes.status}, Total leads: ${leadsData?.total ?? leadsData?.data?.length ?? 'OK'}`);
    if (leadsRes.status !== 200) {
      throw new Error(`GET /v1/leads failed: ${JSON.stringify(leadsData)}`);
    }

    // 7. Tasks Endpoint (Authenticated)
    console.log('\n[7] Testing GET /v1/tasks/my and GET /v1/tasks/all...');
    const tasksRes = await fetch(`http://localhost:${PORT}/v1/tasks/my?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const tasksData = await tasksRes.json();
    console.log(`    GET /v1/tasks/my -> Status: ${tasksRes.status}, Tasks found: ${Array.isArray(tasksData) ? tasksData.length : tasksData?.data?.length ?? 'OK'}`);
    if (tasksRes.status !== 200) {
      throw new Error(`GET /v1/tasks/my failed: ${JSON.stringify(tasksData)}`);
    }

    const allTasksRes = await fetch(`http://localhost:${PORT}/v1/tasks/all?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const allTasksData = await allTasksRes.json();
    console.log(`    GET /v1/tasks/all -> Status: ${allTasksRes.status}, Total tasks: ${Array.isArray(allTasksData) ? allTasksData.length : allTasksData?.data?.length ?? 'OK'}`);
    if (allTasksRes.status !== 200) {
      throw new Error(`GET /v1/tasks/all failed: ${JSON.stringify(allTasksData)}`);
    }

    // 8. Analytics Overview Endpoint (Authenticated)
    console.log('\n[8] Testing GET /v1/analytics/overview...');
    const analyticsRes = await fetch(`http://localhost:${PORT}/v1/analytics/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const analyticsData = await analyticsRes.json();
    console.log(`    Status: ${analyticsRes.status}`);
    if (analyticsRes.status !== 200) {
      throw new Error(`GET /v1/analytics/overview failed: ${JSON.stringify(analyticsData)}`);
    }

    console.log('\n===========================================================');
    console.log('🎉 ALL NESTJS DI & API ENDPOINT TESTS PASSED WITH 100% SUCCESS!');
    console.log('===========================================================');
  } finally {
    await app.close();
  }
}

verifyFullBackendStartup().catch((err) => {
  console.error('❌ Backend startup verification failed:', err);
  process.exit(1);
});
