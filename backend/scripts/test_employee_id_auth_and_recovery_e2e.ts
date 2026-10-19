import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { EmployeesService } from '../src/employees/employees.service';
import { EmailChannel } from '../src/notifications/notification-channels.service';
import { PrismaService } from '../src/prisma/prisma.service';
import * as crypto from 'crypto';
import * as bcryptLib from 'bcrypt';
import { Role } from '@prisma/client';

async function runComprehensiveVerification() {
  console.log('=================================================================================');
  console.log('  SWAYAM ADMISSION — EMPLOYEE ID LOGIN & RECOVERY MASTER AUDIT SUITE             ');
  console.log('=================================================================================\n');

  let app: any;
  try {
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  } catch (err: any) {
    console.error('❌ Failed to bootstrap Nest application context:', err);
    process.exit(1);
  }

  const authService = app.get(AuthService);
  const prisma = app.get(PrismaService);
  const emailChannel = app.get(EmailChannel);

  const timestamp = Date.now();
  const testCandidatePersonalEmail = `arun.personal.${timestamp}@gmail.com`;
  const testOfficialEmail = `arun.counselor.${timestamp}@swayamadmission.com`;
  const testAdminEmail = `admin.iam.${timestamp}@swayamadmission.com`;
  const testSuperAdminEmail = `superadmin.master.${timestamp}@swayamadmission.com`;
  const testMobile = `91${Math.floor(10000000 + Math.random() * 90000000)}`;

  let normalUserId = '';
  let normalEmployeeId = '';
  let adminUserId = '';
  let adminEmployeeId = '';
  let superAdminUserId = '';
  let pendingUserId = '';
  let pendingEmployeeId = '';

  const initialPassword = 'InitialSecurePass@2026';
  const newPassword = 'NewSecretPassword@2026!';
  const adminPassword = 'AdminSecurePass@2026#';
  const superAdminPassword = 'SuperAdminMasterPass@2026$';

  const results: { testId: string; category: string; description: string; passed: boolean; details: string }[] = [];

  function record(testId: string, category: string, description: string, passed: boolean, details: string) {
    results.push({ testId, category, description, passed, details });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${testId}] [${category}] ${status} — ${description}`);
    console.log(`  Details: ${details}\n`);
  }

  try {
    // SETUP: Generate unique IDs
    const empCount = await prisma.user.count({ where: { employeeId: { not: null } } });
    normalEmployeeId = `EMP-TEST-${String(empCount + 501).padStart(4, '0')}`;
    adminEmployeeId = `EMP-ADM-${String(empCount + 502).padStart(4, '0')}`;
    pendingEmployeeId = `EMP-PND-${String(empCount + 503).padStart(4, '0')}`;

    // 1. Create a normal counselor employee with personalEmail and official email
    const normalUser = await prisma.user.create({
      data: {
        fullName: 'Arun Kumar',
        email: testOfficialEmail,
        personalEmail: testCandidatePersonalEmail,
        mobile: testMobile,
        personalMobile: testMobile,
        employeeId: normalEmployeeId,
        role: Role.COUNSELOR,
        status: 'ACTIVE',
        isActive: true,
        emailVerified: true,
        password: await bcryptLib.hash(initialPassword, 12),
        isApproved: true,
      },
    });
    normalUserId = normalUser.id;

    // 2. Create an authorized protected Admin with Employee ID and Admin Email
    const adminUser = await prisma.user.create({
      data: {
        fullName: 'Pooja Sharma (IAM Admin)',
        email: testAdminEmail,
        personalEmail: `pooja.admin.${timestamp}@gmail.com`,
        employeeId: adminEmployeeId,
        role: Role.ADMIN,
        status: 'ACTIVE',
        isActive: true,
        emailVerified: true,
        password: await bcryptLib.hash(adminPassword, 12),
        isApproved: true,
        selfServicePasswordReset: false,
      },
    });
    adminUserId = adminUser.id;

    // 3. Create a Super Admin account
    const superAdminUser = await prisma.user.create({
      data: {
        fullName: 'Chief Super Admin',
        email: testSuperAdminEmail,
        role: Role.SUPER_ADMIN,
        status: 'ACTIVE',
        isActive: true,
        emailVerified: true,
        password: await bcryptLib.hash(superAdminPassword, 12),
        isApproved: true,
        selfServicePasswordReset: false,
      },
    });
    superAdminUserId = superAdminUser.id;

    // 4. Create a pending activation user
    const pendingUser = await prisma.user.create({
      data: {
        fullName: 'Pending Candidate',
        email: `pending.${timestamp}@swayamadmission.com`,
        personalEmail: `pending.candidate.${timestamp}@gmail.com`,
        employeeId: pendingEmployeeId,
        role: Role.COUNSELOR,
        status: 'PENDING_ACTIVATION',
        isActive: false,
        emailVerified: false,
        password: null,
        isApproved: true,
      },
    });
    pendingUserId = pendingUser.id;

    // =================================================================================
    // SECTION A: EMPLOYEE ERP LOGIN TESTS (https://erp.swayamadmission.com)
    // =================================================================================

    // Test A1: Valid Employee ID and password on ERP -> Success
    try {
      const loginA1 = await authService.login({
        email: normalEmployeeId,
        password: initialPassword,
        domain: 'ERP',
      });
      const passA1 = Boolean(loginA1.access_token) && loginA1.employeeId === normalEmployeeId;
      record('A1', 'ERP Login', 'Valid Employee ID and password successfully logs in', passA1,
        `Token issued: ${Boolean(loginA1.access_token)}, Role: ${loginA1.user?.role}, Employee ID: ${loginA1.employeeId}`);
    } catch (err: any) {
      record('A1', 'ERP Login', 'Valid Employee ID and password successfully logs in', false, err.message);
    }

    // Test A2: Invalid Employee ID -> Rejected with generic message
    try {
      await authService.login({
        email: 'NON-EXISTENT-EMPID',
        password: initialPassword,
        domain: 'ERP',
      });
      record('A2', 'ERP Login', 'Invalid Employee ID is rejected', false, 'Expected rejection but login succeeded');
    } catch (err: any) {
      const passA2 = err.message.toLowerCase().includes('invalid');
      record('A2', 'ERP Login', 'Invalid Employee ID is rejected with generic error', passA2,
        `Status: ${err.status}, Message: "${err.message}"`);
    }

    // Test A3: Incorrect password with valid Employee ID -> Rejected
    try {
      await authService.login({
        email: normalEmployeeId,
        password: 'WrongPassword@123',
        domain: 'ERP',
      });
      record('A3', 'ERP Login', 'Incorrect password is rejected', false, 'Expected rejection but login succeeded');
    } catch (err: any) {
      const passA3 = err.message.toLowerCase().includes('invalid');
      record('A3', 'ERP Login', 'Incorrect password is rejected with generic error', passA3,
        `Status: ${err.status}, Message: "${err.message}"`);
    }

    // Test A4: Pending activation employee cannot log in
    try {
      await authService.login({
        email: pendingEmployeeId,
        password: 'AnyPassword@123',
        domain: 'ERP',
      });
      record('A4', 'ERP Login', 'Pending activation account is rejected', false, 'Expected rejection but login succeeded');
    } catch (err: any) {
      const passA4 = err.message.toLowerCase().includes('activation');
      record('A4', 'ERP Login', 'Pending activation account is rejected with guidance', passA4,
        `Message: "${err.message}"`);
    }

    // Test A5: Non-admin employee attempted login using email address instead of Employee ID -> REJECTED
    try {
      await authService.login({
        email: testOfficialEmail,
        password: initialPassword,
        domain: 'ERP',
      });
      record('A5', 'ERP Login', 'Attempted login using email address is rejected for non-admin', false,
        'Expected rejection when employee logged in with email, but succeeded');
    } catch (err: any) {
      const passA5 = err.message.includes('Non-admin employees must sign in using their assigned Employee ID');
      record('A5', 'ERP Login', 'Attempted login using email address is rejected for non-admin', passA5,
        `Rejection verified: "${err.message}"`);
    }

    // Test A6: Case-insensitive Employee ID login on ERP (e.g. lowercase input) -> Success
    try {
      const loginA6 = await authService.login({
        email: normalEmployeeId.toLowerCase(),
        password: initialPassword,
        domain: 'ERP',
      });
      const passA6 = Boolean(loginA6.access_token) && loginA6.employeeId === normalEmployeeId;
      record('A6', 'ERP Login', 'Employee ID case normalization works seamlessly', passA6,
        `Logged in with lowercase "${normalEmployeeId.toLowerCase()}" -> Bound to: ${loginA6.employeeId}`);
    } catch (err: any) {
      record('A6', 'ERP Login', 'Employee ID case normalization works seamlessly', false, err.message);
    }

    // =================================================================================
    // SECTION B: PROTECTED ADMIN PORTAL LOGIN TESTS (https://admin.swayamadmission.com)
    // =================================================================================

    // Test B1: Authorized Super Admin login with administrator email -> Success
    try {
      const loginB1 = await authService.login({
        email: testSuperAdminEmail,
        password: superAdminPassword,
        domain: 'ADMIN',
      });
      const passB1 = Boolean(loginB1.access_token) && loginB1.user?.role === Role.SUPER_ADMIN;
      record('B1', 'Admin Portal', 'Super Admin signs in using administrator email', passB1,
        `Super Admin Access Token: ${Boolean(loginB1.access_token)}, Role: ${loginB1.user?.role}`);
    } catch (err: any) {
      record('B1', 'Admin Portal', 'Super Admin signs in using administrator email', false, err.message);
    }

    // Test B2: Authorized Admin login using permitted Employee ID -> Success
    try {
      const loginB2 = await authService.login({
        email: adminEmployeeId,
        password: adminPassword,
        domain: 'ADMIN',
      });
      const passB2 = Boolean(loginB2.access_token) && loginB2.user?.role === Role.ADMIN;
      record('B2', 'Admin Portal', 'Authorized Administrator signs in using permitted Employee ID', passB2,
        `Admin Employee ID: ${adminEmployeeId}, Access Granted: ${Boolean(loginB2.access_token)}`);
    } catch (err: any) {
      record('B2', 'Admin Portal', 'Authorized Administrator signs in using permitted Employee ID', false, err.message);
    }

    // Test B3: Authorized Admin login using administrator email -> Success
    try {
      const loginB3 = await authService.login({
        email: testAdminEmail,
        password: adminPassword,
        domain: 'ADMIN',
      });
      const passB3 = Boolean(loginB3.access_token) && loginB3.user?.role === Role.ADMIN;
      record('B3', 'Admin Portal', 'Authorized Administrator signs in using administrator email', passB3,
        `Admin Email: ${testAdminEmail}, Access Granted: ${Boolean(loginB3.access_token)}`);
    } catch (err: any) {
      record('B3', 'Admin Portal', 'Authorized Administrator signs in using administrator email', false, err.message);
    }

    // Test B4: Normal employee enters Employee ID on Admin Portal -> Strictly 403 Forbidden
    try {
      await authService.login({
        email: normalEmployeeId,
        password: initialPassword,
        domain: 'ADMIN',
      });
      record('B4', 'Admin Portal', 'Normal employee is blocked from Protected Admin Portal', false,
        'Expected 403 Forbidden but normal employee accessed Admin Portal');
    } catch (err: any) {
      const passB4 = err.status === 403 && err.message.includes('restricted to authorized administrative personnel');
      record('B4', 'Admin Portal', 'Normal employee entering Employee ID is blocked from Admin Portal with 403 Forbidden', passB4,
        `Status: ${err.status}, Message: "${err.message}"`);
    }

    // Test B5: Invalid administrator credentials on Admin Portal -> Rejected
    try {
      await authService.login({
        email: adminEmployeeId,
        password: 'InvalidAdminPassword@999',
        domain: 'ADMIN',
      });
      record('B5', 'Admin Portal', 'Invalid administrator credentials rejected', false, 'Expected rejection but login succeeded');
    } catch (err: any) {
      const passB5 = err.message.toLowerCase().includes('invalid');
      record('B5', 'Admin Portal', 'Invalid administrator credentials rejected', passB5,
        `Status: ${err.status}, Message: "${err.message}"`);
    }

    // =================================================================================
    // SECTION C: FORGOT PASSWORD RECOVERY TESTS (Employee ID & Personal Email)
    // =================================================================================

    // Test C1: Case A - Recovery using valid Employee ID dispatches OTP to personal email
    let otpDispatchedToPersonalEmail = false;
    let maskedEmailReceived = '';
    try {
      const recC1 = await authService.forgotPasswordSendOtp({
        identifier: normalEmployeeId,
        method: 'EMAIL',
      });
      maskedEmailReceived = recC1.maskedEmail || recC1.maskedDestination || '';
      otpDispatchedToPersonalEmail =
        recC1.success === true &&
        recC1.identifier?.toLowerCase() === testCandidatePersonalEmail.toLowerCase();

      record('C1', 'Password Recovery', 'Recovery using valid Employee ID resolves registered personal email', otpDispatchedToPersonalEmail,
        `Identifer Entered: ${normalEmployeeId} -> Resolved Target: ${recC1.identifier} (Personal Email: ${testCandidatePersonalEmail}), Masked: "${maskedEmailReceived}"`);
    } catch (err: any) {
      record('C1', 'Password Recovery', 'Recovery using valid Employee ID resolves registered personal email', false, err.message);
    }

    // Test C2: Case B - Recovery using registered personal email resolves the exact same account
    let recC2Target = '';
    try {
      // Clear cooldown for test purpose
      await prisma.otpVerification.deleteMany({
        where: { identifier: testCandidatePersonalEmail.toLowerCase() },
      });

      const recC2 = await authService.forgotPasswordSendOtp({
        identifier: testCandidatePersonalEmail,
        method: 'EMAIL',
      });
      recC2Target = recC2.identifier || '';
      const passC2 = recC2.success === true && recC2Target.toLowerCase() === testCandidatePersonalEmail.toLowerCase();
      record('C2', 'Password Recovery', 'Recovery using registered personal email resolves correctly', passC2,
        `Identifier Entered: ${testCandidatePersonalEmail} -> Target: ${recC2Target}, Masked: "${recC2.maskedEmail}"`);
    } catch (err: any) {
      record('C2', 'Password Recovery', 'Recovery using registered personal email resolves correctly', false, err.message);
    }

    // Test C3: Unknown / non-existent identifier returns generic anti-enumeration response
    try {
      const nonExistentRes = await authService.forgotPasswordSendOtp({
        identifier: 'EMP-9999-DOESNOTEXIST',
        method: 'EMAIL',
      });
      const passC3 =
        nonExistentRes.success === true &&
        nonExistentRes.message.includes('If an account exists');
      record('C3', 'Password Recovery', 'Unknown identifier returns generic anti-enumeration response', passC3,
        `Message: "${nonExistentRes.message}", No internal data leaked: ${passC3}`);
    } catch (err: any) {
      record('C3', 'Password Recovery', 'Unknown identifier returns generic anti-enumeration response', false, err.message);
    }

    // Test C4: Verify OTP and reset password flow
    let resetToken = '';
    try {
      // Find latest OTP in DB
      const otpRecord = await prisma.otpVerification.findFirst({
        where: {
          identifier: testCandidatePersonalEmail.toLowerCase(),
          type: 'FORGOT_PASSWORD_EMAIL',
          isUsed: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Find the 6-digit code
      const salt = process.env.JWT_SECRET || 'swayam-secret-otp-salt';
      let foundOtp = '';
      for (let c = 100000; c <= 999999; c++) {
        const codeStr = String(c);
        const testHash = crypto.createHash('sha256').update(`${codeStr}:${salt}`).digest('hex');
        if (testHash === otpRecord?.otpHash) {
          foundOtp = codeStr;
          break;
        }
      }

      // Enter Employee ID in verify step (verifying that Employee ID resolves to same OTP!)
      const verifyRes = await authService.forgotPasswordVerifyOtp({
        identifier: normalEmployeeId,
        otp: foundOtp,
        method: 'EMAIL',
      });

      resetToken = verifyRes.resetToken;

      const resetRes = await authService.resetPasswordWithToken({
        resetToken: verifyRes.resetToken,
        newPassword: newPassword,
        confirmPassword: newPassword,
      });

      const passC4 = verifyRes.success === true && Boolean(resetToken) && resetRes.message.includes('successfully');
      record('C4', 'Password Recovery', 'OTP verification with Employee ID issues single-use reset token and resets password', passC4,
        `Reset Token Issued: ${Boolean(resetToken)}, Message: "${resetRes.message}"`);
    } catch (err: any) {
      record('C4', 'Password Recovery', 'OTP verification with Employee ID issues single-use reset token and resets password', false, err.message);
    }

    // Test C5: Login with new password succeeds (using Employee ID)
    try {
      const loginNew = await authService.login({
        email: normalEmployeeId,
        password: newPassword,
        domain: 'ERP',
      });
      const passC5 = Boolean(loginNew.access_token);
      record('C5', 'Password Recovery', 'Login with updated password succeeds via Employee ID', passC5,
        `New Login Token: ${Boolean(loginNew.access_token)}, Employee ID: ${loginNew.employeeId}`);
    } catch (err: any) {
      record('C5', 'Password Recovery', 'Login with updated password succeeds via Employee ID', false, err.message);
    }

    // Test C6: Old password no longer works
    try {
      await authService.login({
        email: normalEmployeeId,
        password: initialPassword,
        domain: 'ERP',
      });
      record('C6', 'Password Recovery', 'Old password is permanently invalidated', false,
        'Expected old password to fail, but it succeeded');
    } catch (err: any) {
      const passC6 = err.message.toLowerCase().includes('invalid');
      record('C6', 'Password Recovery', 'Old password is permanently invalidated', passC6,
        `Old password rejection: "${err.message}"`);
    }

    // Test C7: Protected accounts (Super Admin, Admin) self-service recovery is blocked
    try {
      const adminRecoveryRes = await authService.forgotPasswordSendOtp({
        identifier: testAdminEmail,
        method: 'EMAIL',
      });
      const passC7 = adminRecoveryRes.isProtected === true && adminRecoveryRes.requiresAdminRecovery === true;
      record('C7', 'Security Gate', 'Self-service recovery is strictly blocked for protected administrative accounts', passC7,
        `isProtected: ${adminRecoveryRes.isProtected}, requiresAdminRecovery: ${adminRecoveryRes.requiresAdminRecovery}, Message: "${adminRecoveryRes.message}"`);
    } catch (err: any) {
      record('C7', 'Security Gate', 'Self-service recovery is strictly blocked for protected administrative accounts', false, err.message);
    }

    // =================================================================================
    // SECTION D: SMTP & INFRASTRUCTURE INTEGRITY CHECKS
    // =================================================================================
    const smtpHealth = emailChannel.getHealth();
    const passD1 = smtpHealth.status === 'HEALTHY' || smtpHealth.status === 'DEGRADED';
    record('D1', 'SMTP Integration', 'Centralized SMTP health check operational', passD1,
      `Status: ${smtpHealth.status}, Details: "${smtpHealth.message}"`);

  } catch (err: any) {
    console.error('❌ Unexpected failure during master audit:', err);
  } finally {
    console.log('\nCleaning up ephemeral test records...');
    if (normalUserId) {
      await prisma.userDeviceSession.deleteMany({ where: { userId: normalUserId } }).catch(() => {});
      await prisma.refreshToken.deleteMany({ where: { userId: normalUserId } }).catch(() => {});
      await prisma.passwordResetToken.deleteMany({ where: { userId: normalUserId } }).catch(() => {});
      await prisma.accountActivationToken.deleteMany({ where: { userId: normalUserId } }).catch(() => {});
      await prisma.otpVerification.deleteMany({ where: { identifier: testCandidatePersonalEmail.toLowerCase() } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { OR: [{ userId: normalUserId }, { entityId: normalUserId }] } }).catch(() => {});
      await prisma.user.delete({ where: { id: normalUserId } }).catch(() => {});
    }
    if (adminUserId) {
      await prisma.auditLog.deleteMany({ where: { OR: [{ userId: adminUserId }, { entityId: adminUserId }] } }).catch(() => {});
      await prisma.user.delete({ where: { id: adminUserId } }).catch(() => {});
    }
    if (superAdminUserId) {
      await prisma.auditLog.deleteMany({ where: { OR: [{ userId: superAdminUserId }, { entityId: superAdminUserId }] } }).catch(() => {});
      await prisma.user.delete({ where: { id: superAdminUserId } }).catch(() => {});
    }
    if (pendingUserId) {
      await prisma.user.delete({ where: { id: pendingUserId } }).catch(() => {});
    }

    await app?.close();

    console.log('\n=================================================================================');
    console.log('                          MASTER AUDIT SUMMARY                                   ');
    console.log('=================================================================================');
    const totalPassed = results.filter((r) => r.passed).length;
    console.log(`Total Test Scenarios: ${results.length}`);
    console.log(`Passed: ${totalPassed} / ${results.length}`);
    console.log(`Failed: ${results.length - totalPassed} / ${results.length}`);

    if (totalPassed === results.length && results.length > 0) {
      console.log('\n🎉 ALL MASTER PROMPT REQUIREMENTS VERIFIED WITH 100% SUCCESS!');
    } else {
      console.log('\n⚠️ Some scenarios did not pass. Inspect details above.');
    }
    console.log('=================================================================================\n');
  }
}

runComprehensiveVerification();
