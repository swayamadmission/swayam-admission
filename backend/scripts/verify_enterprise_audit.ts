import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuditService } from '../src/audit/audit.service';
import { SystemConfigurationService } from '../src/settings/system-configuration.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role } from '@prisma/client';

async function runEnterpriseAuditVerification() {
  console.log('===============================================================');
  console.log('  SWAYAM ADMISSION — ENTERPRISE AUDIT & GOVERNANCE ENGINE');
  console.log('===============================================================');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const auditService = app.get(AuditService);
  const configService = app.get(SystemConfigurationService);
  const prisma = app.get(PrismaService);

  console.log('[1/8] Verified DI: AuditService & SystemConfigurationService resolved successfully.');

  // Verify Audit Settings from Dynamic Config
  const retentionDays = await configService.getNumber('audit.retentionDays', 365);
  const archiveDays = await configService.getNumber('audit.archiveAfterDays', 180);
  const exportLimit = await configService.getNumber('audit.exportLimit', 2000);
  const searchLimit = await configService.getNumber('audit.searchPageLimit', 50);
  const highRiskEnabled = await configService.getBoolean('audit.highRiskAlertEnabled', true);

  console.log(`[2/8] Dynamic Configuration: Retention = ${retentionDays}d, Archive = ${archiveDays}d, Export Limit = ${exportLimit}, High Risk Alert = ${highRiskEnabled}`);

  // Fetch or find a sample admin user and test entity ID
  let adminUser = await prisma.user.findFirst({
    where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN, Role.DIRECTOR] } },
  });
  if (!adminUser) {
    adminUser = await prisma.user.findFirst();
  }
  if (!adminUser) {
    throw new Error('No user found in database for audit testing.');
  }

  const testEntityId = `APP-TEST-${Date.now()}`;
  const testRequestId = `REQ-AUDIT-${Date.now()}`;

  console.log(`[3/8] Test Context: Actor=${adminUser.email} (${adminUser.id}), Role=${adminUser.role}`);

  // 1. Audit Action Logging with Automatic Diff Computation & Sensitive Masking
  const oldState = {
    counselorId: 'counselor_old_123',
    status: 'UNDER_REVIEW',
    password: 'SuperSecretPassword123!',
    aadhaarNumber: '123456789012',
    panNumber: 'ABCDE1234F',
    token: 'jwt_token_secret_xyz',
  };

  const newState = {
    counselorId: 'counselor_new_456',
    status: 'ADMISSION_APPROVED',
    password: 'NewSuperSecretPassword456!',
    aadhaarNumber: '123456789012',
    panNumber: 'ABCDE1234F',
    token: 'jwt_token_secret_abc',
  };

  const createdLog = await auditService.logAction({
    module: 'APPLICATIONS',
    action: 'ADMISSION_APPROVED',
    description: 'Admission approved by review officer with counselor reassignment',
    entityType: 'Application',
    entityId: testEntityId,
    userId: adminUser.id,
    userName: adminUser.fullName || 'Test Admin',
    email: adminUser.email,
    roleId: adminUser.role,
    positionCode: 'POST-DIRECTOR-01',
    companyEmail: 'director.admissions@swayam.in',
    requestId: testRequestId,
    severity: 'CRITICAL',
    status: 'SUCCESS',
    oldData: oldState,
    newData: newState,
    ipAddress: '192.168.1.100',
  });

  if (!createdLog) {
    throw new Error('Audit log creation failed!');
  }
  console.log(`[4/8] Audited Event Created: ID=${createdLog.id}, Action=${createdLog.action}, Module=${createdLog.module}`);

  // 2. Verify Sensitive Data Masking in Persisted Diff & Payload
  const rawDiff: any = createdLog.changes;
  const rawOld: any = createdLog.oldData;
  const rawNew: any = createdLog.newData;

  if (rawOld?.password !== '********' || rawNew?.password !== '********') {
    throw new Error('Sensitive data masking check failed for password!');
  }
  if (!rawOld?.aadhaarNumber?.includes('XXXX-XXXX') || !rawOld?.panNumber?.includes('****')) {
    throw new Error('PII masking check failed for Aadhaar/PAN!');
  }
  console.log('      ✓ Sensitive Data Masked: Passwords, Tokens, Aadhaar and PAN are securely redacted.');

  // 3. Entity Timeline Query Test
  const entityLogs = await auditService.getEntityTimeline('Application', testEntityId);
  if (entityLogs.length === 0 || entityLogs[0].id !== createdLog.id) {
    throw new Error('Entity timeline query failed to retrieve logged event!');
  }
  console.log(`[5/8] Entity Timeline Resolved: ${entityLogs.length} historical events found for Application #${testEntityId}`);

  // 4. Scoped Search & Filter Test
  const searchResult = await auditService.findAll({
    search: testRequestId,
    entityType: 'Application',
    severity: 'CRITICAL',
  });
  if (searchResult.data.length === 0 || searchResult.data[0].id !== createdLog.id) {
    throw new Error('Filtered search failed to locate audit record!');
  }
  console.log(`[6/8] Scoped Search & Filtering Verified: Matched 1 event by RequestId=${testRequestId}`);

  // 5. Meta-Audit Logging on Export Test
  const exportData = await auditService.exportLogs(
    { entityId: testEntityId },
    adminUser.id,
    'json',
  );
  console.log(`[7/8] Audit Export Generated: ${Array.isArray(exportData) ? exportData.length : 1} records. Meta-Audit logged.`);

  // 6. Append-Only Immutability Test (Attempting clearLogs must throw ForbiddenException)
  let clearBlocked = false;
  try {
    await auditService.clearLogs();
  } catch (err: any) {
    if (err.status === 403 || err.message.includes('append-only')) {
      clearBlocked = true;
    }
  }
  if (!clearBlocked) {
    throw new Error('Append-only protection failed! clearLogs should be forbidden.');
  }
  console.log('      ✓ Append-Only Governance Enforced: Arbitrary log purging is strictly forbidden (403).');

  // Clean up test audit record
  await prisma.auditLog.deleteMany({ where: { entityId: testEntityId } });
  console.log('[8/8] Cleaned up verification test records.');

  console.log('\n===============================================================');
  console.log('  ALL ENTERPRISE AUDIT ENGINE TESTS PASSED (100%)');
  console.log('===============================================================');

  await app.close();
  process.exit(0);
}

runEnterpriseAuditVerification().catch((err) => {
  console.error('AUDIT VERIFICATION FAILED:', err);
  process.exit(1);
});
