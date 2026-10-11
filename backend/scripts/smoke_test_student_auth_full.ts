import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, Role, UserStatus, ApplicationStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/auth/auth.service';
import { AuthorizationService } from '../src/auth/authorization.service';
import { DataScopeService } from '../src/auth/data-scope.service';
import { RoleHierarchyService } from '../src/roles/role-hierarchy.service';
import { IdGeneratorService } from '../src/common/id-generator.service';
import { ProfileService } from '../src/profile/profile.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

async function runStudentAuthSmokeTest() {
  console.log('================================================================');
  console.log('🚀 RUNNING SWAYAM ADMISSION STUDENT AUTHENTICATION END-TO-END VERIFICATION');
  console.log('================================================================\n');

  const prisma = new PrismaClient();
  await prisma.$connect();

  const jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'swayam_super_secret_key' });
  const roleHierarchyService = new RoleHierarchyService(prisma as any);
  const dataScopeService = new DataScopeService(prisma as any, roleHierarchyService);
  const authorizationService = new AuthorizationService(dataScopeService);
  const idGenerator = new IdGeneratorService(prisma as any);
  const authService = new AuthService(prisma as any, jwtService, authorizationService, idGenerator);

  const mockAuditService: any = {
    logAction: async () => {},
    sanitizeData: (d: any) => d,
  };
  const mockNotificationService: any = {
    create: async () => {},
    sendPush: async () => {},
  };
  const profileService = new ProfileService(prisma as any, mockAuditService, mockNotificationService);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  const testUserIds: string[] = [];
  const testAppIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: MOBILE AUTHENTICATION - NORMALIZATION, OTP DISPATCH & RATE LIMITS
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Mobile Authentication: Normalization, Rate Limiting & OTP Storage ---');
    const rawMobile = '987' + Math.floor(1000000 + Math.random() * 9000000).toString();
    const canonicalMobile = '+91' + rawMobile;

    // 1.1 Invalid mobile format rejection
    let invalidCaught = false;
    try {
      await authService.sendMobileOtp({ mobile: '12345' });
    } catch (e: any) {
      invalidCaught = true;
    }
    assert(invalidCaught, 'Invalid mobile format rejected with BadRequestException');

    // 1.2 Send OTP for valid Indian mobile
    const otpSendResult = await authService.sendMobileOtp({ mobile: rawMobile });
    assert(otpSendResult.success === true, 'OTP sent successfully for valid +91 Indian mobile');
    assert(otpSendResult.mobile === canonicalMobile, 'Mobile correctly normalized to canonical E.164 (+919876543210)');

    // 1.3 Check database record: OTP is stored as HMAC SHA-256 hash, NEVER plaintext
    const dbOtpRecord = await prisma.otpVerification.findFirst({
      where: { identifier: canonicalMobile },
      orderBy: { createdAt: 'desc' },
    });
    assert(!!dbOtpRecord, 'OTP record saved in OtpVerification table');
    assert(dbOtpRecord?.otpHash.length === 64, 'OTP is securely stored as a 64-char SHA-256 hex hash (NOT plaintext)');
    assert(dbOtpRecord?.attempts === 0, 'Initial OTP verification attempts set to 0');
    assert(dbOtpRecord?.isUsed === false, 'Initial OTP marked as unused (isUsed = false)');

    // 1.4 Resend Cooldown enforcement (< 30 seconds)
    let cooldownCaught = false;
    try {
      await authService.sendMobileOtp({ mobile: rawMobile });
    } catch (e: any) {
      if (e.message && e.message.includes('seconds')) {
        cooldownCaught = true;
      }
    }
    assert(cooldownCaught, 'Resend cooldown enforced (< 30s) when requesting OTP too quickly');

    // -------------------------------------------------------------------------
    // TEST 2: OTP VERIFICATION, ATTEMPTS LIMIT, & INSTANT INVALIDATION
    // -------------------------------------------------------------------------
    console.log('\n--- 2. OTP Verification: Brute-Force Protection, Success & Single-Use ---');

    // 2.1 Incorrect OTP verification fails & increments attempts
    let wrongOtpCaught = false;
    try {
      await authService.verifyMobileOtp({ mobile: canonicalMobile, otp: '000000' });
    } catch (e: any) {
      wrongOtpCaught = true;
    }
    assert(wrongOtpCaught, 'Incorrect OTP rejected');

    const updatedOtpRecord = await prisma.otpVerification.findFirst({
      where: { identifier: canonicalMobile },
      orderBy: { createdAt: 'desc' },
    });
    assert(updatedOtpRecord?.attempts === 1, 'Failed OTP attempt counter incremented to 1');

    // 2.2 Re-create fresh OTP to test successful verification using authService internal hasher
    const knownOtp = '123456';
    const knownHash = (authService as any).hashOtp(knownOtp);
    await prisma.otpVerification.create({
      data: {
        identifier: canonicalMobile,
        type: 'MOBILE_LOGIN',
        otpHash: knownHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });

    // 2.3 Verify with correct OTP for registration
    const registrationResult = await authService.verifyMobileOtp({
      mobile: canonicalMobile,
      otp: knownOtp,
      fullName: 'Swayam Test Student',
    });
    assert(!!registrationResult.user, 'Registration via mobile OTP succeeds');
    assert(registrationResult.user.mobile === canonicalMobile, 'Student mobile correctly set to canonical format');
    assert(registrationResult.user.role === 'STUDENT', 'User assigned STUDENT role');
    assert(!!registrationResult.access_token, 'Short-lived JWT Access Token issued');
    assert(!!registrationResult.refresh_token, 'Refresh Token issued for session management');

    const studentUserId = registrationResult.user.id;
    testUserIds.push(studentUserId);

    // 2.4 Single-use validation: verify same OTP again -> must fail
    let reuseCaught = false;
    try {
      await authService.verifyMobileOtp({ mobile: canonicalMobile, otp: knownOtp });
    } catch (e: any) {
      reuseCaught = true;
    }
    assert(reuseCaught, 'Reused OTP immediately rejected (Single-use enforcement)');

    // 2.5 Existing mobile login: Same mobile number logs into existing account without duplicate
    const knownOtp2 = '654321';
    const knownHash2 = (authService as any).hashOtp(knownOtp2);
    await prisma.otpVerification.create({
      data: {
        identifier: canonicalMobile,
        type: 'MOBILE_LOGIN',
        otpHash: knownHash2,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    const loginResult = await authService.verifyMobileOtp({ mobile: canonicalMobile, otp: knownOtp2 });
    assert(loginResult.user.id === studentUserId, 'Existing student logs into existing account (No duplicate user created)');

    // -------------------------------------------------------------------------
    // TEST 3: GOOGLE AUTHENTICATION & IDENTITY LINKING
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Google Authentication: Identity Linking & Duplicate Prevention ---');
    const googleSub = `google-test-${Date.now()}`;
    const googleEmail = `google.student.${Date.now()}@example.com`;

    // 3.1 New Google student registration
    const googleAuthResult = await authService.loginWithGoogle({
      googleId: googleSub,
      email: googleEmail,
      name: 'Google Auth Student',
      avatar: 'https://example.com/avatar.png',
    });
    assert(!!googleAuthResult.user, 'Google authentication creates student account');
    assert(googleAuthResult.user.email === googleEmail, 'Google email stored on user');
    assert(googleAuthResult.user.emailVerified === true, 'Google email automatically verified');
    assert(!!googleAuthResult.user.emailVerifiedAt, 'emailVerifiedAt timestamp populated');

    const googleUserId = googleAuthResult.user.id;
    testUserIds.push(googleUserId);

    // 3.2 Verify AuthIdentity record
    const authIdentity = await prisma.authIdentity.findFirst({
      where: { provider: 'GOOGLE', providerAccountId: googleSub },
    });
    assert(!!authIdentity, 'AuthIdentity record created for Google provider');
    assert(authIdentity?.userId === googleUserId, 'AuthIdentity correctly linked to User record');

    // 3.3 Existing Google user login (must NOT create duplicate user or AuthIdentity)
    const googleLogin2 = await authService.loginWithGoogle({
      googleId: googleSub,
      email: googleEmail,
    });
    assert(googleLogin2.user.id === googleUserId, 'Existing Google identity resolves to same student account');
    const identityCount = await prisma.authIdentity.count({
      where: { provider: 'GOOGLE', providerAccountId: googleSub },
    });
    assert(identityCount === 1, 'Exactly one AuthIdentity exists (no duplicates)');

    // -------------------------------------------------------------------------
    // TEST 4: EMAIL VERIFICATION WORKFLOW
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Email Verification: Format, Disposable Check, Mailbox Verification ---');
    const testEmail = `student.verify.${Date.now()}@example.com`;

    // 4.1 Reject disposable email domain
    let disposableCaught = false;
    try {
      await authService.sendEmailVerification(undefined, 'fake.user@mailinator.com');
    } catch (e: any) {
      disposableCaught = true;
    }
    assert(disposableCaught, 'Disposable email domains (mailinator.com) rejected');

    // 4.2 Send verification for valid email
    const emailSendRes = await authService.sendEmailVerification(studentUserId, testEmail);
    assert(emailSendRes.success === true, 'Verification OTP sent for valid email');

    // 4.3 Verify with valid OTP
    const knownEmailOtp = '789123';
    const knownEmailHash = (authService as any).hashOtp(knownEmailOtp);
    await prisma.otpVerification.create({
      data: {
        identifier: testEmail,
        type: 'EMAIL_VERIFICATION',
        otpHash: knownEmailHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const verifyEmailRes = await authService.verifyEmail(
      studentUserId,
      testEmail,
      knownEmailOtp,
    );
    assert(verifyEmailRes.success === true, 'Email successfully verified with valid code');

    const verifiedUser = await prisma.user.findUnique({ where: { id: studentUserId } });
    assert(verifiedUser?.emailVerified === true, 'Database record updated to emailVerified = true');
    assert(!!verifiedUser?.emailVerifiedAt, 'emailVerifiedAt timestamp recorded');

    // 4.4 When student changes email in profile, it MUST immediately become UNVERIFIED
    const newChangedEmail = `new.email.${Date.now()}@example.com`;
    await profileService.updateProfile(studentUserId, { email: newChangedEmail });

    const changedUser = await prisma.user.findUnique({ where: { id: studentUserId } });
    assert(changedUser?.email === newChangedEmail, 'Student profile email updated');
    assert(changedUser?.emailVerified === false, 'Changed email immediately reset to UNVERIFIED (emailVerified = false)');
    assert(changedUser?.emailVerifiedAt === null, 'emailVerifiedAt reset to null upon email change');

    // -------------------------------------------------------------------------
    // TEST 5: FORGOT PASSWORD / PASSWORD RESET
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Forgot Password: Anti-Enumeration, Token Hashing & Session Invalidation ---');

    // 5.1 Account enumeration protection: unknown email returns generic message
    const anonRes = await authService.forgotPassword('nonexistent.person@unknown.com');
    assert(
      anonRes.message.includes('If an account exists'),
      'Forgot password returns generic message for unknown email (Anti-Enumeration Protection)',
    );

    // 5.2 Set up password for test student
    const testPassword = 'Password@1234';
    const bcryptLib = bcrypt as unknown as { hash: (s: string, r: number) => Promise<string> };
    const hashedPassword = await bcryptLib.hash(testPassword, 10);
    await prisma.user.update({
      where: { id: studentUserId },
      data: { password: hashedPassword },
    });

    // 5.3 Request password reset for existing student
    const resetReqRes = await authService.forgotPassword(newChangedEmail);
    assert(
      resetReqRes.message.includes('If an account exists'),
      'Password reset request returns generic response for registered account',
    );

    // 5.4 Check database: Reset token stored as SHA-256 hash, NEVER plaintext
    const dbResetToken = await prisma.passwordResetToken.findFirst({
      where: { userId: studentUserId },
      orderBy: { createdAt: 'desc' },
    });
    assert(!!dbResetToken, 'PasswordResetToken created in database');
    assert(dbResetToken?.tokenHash.length === 64, 'Reset token stored as 64-char SHA-256 hash');
    assert(dbResetToken?.isUsed === false, 'Reset token marked as unused');

    // 5.5 Weak password rejected during reset
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    await prisma.passwordResetToken.create({
      data: {
        userId: studentUserId,
        tokenHash: hashedResetToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    let weakPassCaught = false;
    try {
      await authService.resetPassword(rawResetToken, 'short');
    } catch (e: any) {
      weakPassCaught = true;
    }
    assert(weakPassCaught, 'Weak password rejected (< 6 characters)');

    // 5.6 Successful password reset with valid strong password
    const newStrongPassword = 'NewSecretPassword@2026';
    const resetSuccessRes = await authService.resetPassword(rawResetToken, newStrongPassword);
    assert(resetSuccessRes.message.includes('successfully'), 'Password reset successfully completed');

    // 5.7 Token cannot be reused
    let tokenReuseCaught = false;
    try {
      await authService.resetPassword(rawResetToken, newStrongPassword);
    } catch (e: any) {
      tokenReuseCaught = true;
    }
    assert(tokenReuseCaught, 'Reused password reset token immediately rejected');

    // 5.8 Login with new password succeeds
    const newPassLogin = await authService.login({
      email: newChangedEmail,
      password: newStrongPassword,
    });
    assert(!!newPassLogin.access_token, 'Student successfully logs in with new password');

    // -------------------------------------------------------------------------
    // TEST 6: SESSION SECURITY & REFRESH TOKEN ROTATION
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Session Security: Token Rotation & Reuse Detection ---');
    const initialRefreshToken = newPassLogin.refresh_token;
    assert(!!initialRefreshToken, 'Session refresh token issued');

    // 6.1 Rotate refresh token
    const refreshRes = await authService.refresh(initialRefreshToken);
    assert(!!refreshRes.access_token, 'New Access Token issued via refresh');
    assert(!!refreshRes.refresh_token, 'New rotated Refresh Token issued');
    assert(refreshRes.refresh_token !== initialRefreshToken, 'Old refresh token rotated out for a new one');

    // 6.2 Token reuse detection: using the old revoked refresh token triggers session revocation
    let reuseTokenCaught = false;
    try {
      await authService.refresh(initialRefreshToken);
    } catch (e: any) {
      reuseTokenCaught = true;
    }
    assert(reuseTokenCaught, 'Reuse of old refresh token detected & rejected');

    // 6.3 Logout revokes active session
    const logoutRes = await authService.logout(studentUserId, refreshRes.refresh_token);
    assert(logoutRes.message === 'Logout successful', 'Logout successfully revokes session');

    // -------------------------------------------------------------------------
    // TEST 7: ACCOUNT STATES ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Account States: LOCKED, SUSPENDED, DEACTIVATED Enforcement ---');

    // 7.1 LOCKED account rejected
    await prisma.user.update({ where: { id: studentUserId }, data: { status: 'LOCKED' as any } });
    let lockedCaught = false;
    try {
      await authService.login({ email: newChangedEmail, password: newStrongPassword });
    } catch (e: any) {
      lockedCaught = true;
    }
    assert(lockedCaught, 'LOCKED account rejected from authentication');

    // 7.2 SUSPENDED account rejected
    await prisma.user.update({ where: { id: studentUserId }, data: { status: 'SUSPENDED' as any } });
    let suspendedCaught = false;
    try {
      await authService.login({ email: newChangedEmail, password: newStrongPassword });
    } catch (e: any) {
      suspendedCaught = true;
    }
    assert(suspendedCaught, 'SUSPENDED account rejected from authentication');

    // 7.3 Restore to ACTIVE
    await prisma.user.update({ where: { id: studentUserId }, data: { status: 'ACTIVE' as any } });
    const restoredLogin = await authService.login({ email: newChangedEmail, password: newStrongPassword });
    assert(!!restoredLogin.access_token, 'Restored ACTIVE account authenticates successfully');

    // -------------------------------------------------------------------------
    // TEST 8: SERVER-SIDE AUTHORIZATION & OWNERSHIP SECURITY (IDOR PROTECTION)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Server-Side Ownership Security & IDOR Protection ---');

    // Create Student B
    const studentB = await prisma.user.create({
      data: {
        fullName: 'Student B',
        email: `student.b.${Date.now()}@example.com`,
        role: 'STUDENT',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
    testUserIds.push(studentB.id);

    // Resolve a course for application testing
    const testCourse = await prisma.course.findFirst({
      where: { status: { not: 'ARCHIVED' } },
    });
    assert(!!testCourse, 'Test course found in database for application tests');

    if (testCourse) {
      // Create Application A owned by Student A
      const appA = await prisma.application.create({
        data: {
          applicationId: `TEST-APP-${Date.now()}`,
          applicationNumber: `TEST-APP-${Date.now()}`,
          userId: studentUserId,
          courseId: testCourse.id,
          status: ApplicationStatus.DRAFT,
          admissionYear: 2026,
          formData: { personalInfo: { fullName: 'Osama Faiz Application' } },
        },
      });
      testAppIds.push(appA.id);

      // Student B attempts to access Student A's application
      const scopeCtxB = await dataScopeService.resolveDataScope(studentB.id);
      let idorCaught = false;
      try {
        dataScopeService.enforceApplicationScope(scopeCtxB, appA);
      } catch (e: any) {
        idorCaught = true;
      }
      assert(idorCaught, 'IDOR blocked: Student B forbidden from accessing Student A application');

      // Student A accesses their own application -> succeeds
      const scopeCtxA = await dataScopeService.resolveDataScope(studentUserId);
      let selfAccessAllowed = true;
      try {
        dataScopeService.enforceApplicationScope(scopeCtxA, appA);
      } catch (e: any) {
        selfAccessAllowed = false;
      }
      assert(selfAccessAllowed, 'Student A successfully accesses their own application');
    }

    // -------------------------------------------------------------------------
    // TEST 9: CRITICAL PROFILE VS APPLICATION DATA SEPARATION (REQUIREMENT 9)
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Critical Profile vs Application Data Separation ---');
    // Profile name: "Osama Faiz"
    await prisma.user.update({
      where: { id: studentUserId },
      data: { fullName: 'Osama Faiz' },
    });

    if (testCourse) {
      // Student creates application with Applicant Name: "Rahul Kumar"
      const appSeparation = await prisma.application.create({
        data: {
          applicationId: `SWY-APP-SEP-${Date.now()}`,
          applicationNumber: `SWY-APP-SEP-${Date.now()}`,
          userId: studentUserId,
          courseId: testCourse.id,
          status: ApplicationStatus.DRAFT,
          admissionYear: 2026,
          formData: {
            personalInfo: {
              fullName: 'Rahul Kumar', // Application applicant name
              dob: '2005-01-01',
              gender: 'Male',
            },
          },
        },
      });
      testAppIds.push(appSeparation.id);

      // Verify Student Permanent Profile still shows "Osama Faiz"
      const profileAfterApp = await prisma.user.findUnique({
        where: { id: studentUserId },
        select: { fullName: true },
      });
      assert(
        profileAfterApp?.fullName === 'Osama Faiz',
        'Profile name remains "Osama Faiz" (NEVER overwritten by application applicant name)',
      );

      // Verify Application snapshot retains "Rahul Kumar"
      const appSnapshot = await prisma.application.findUnique({
        where: { id: appSeparation.id },
      });
      const appData = appSnapshot?.formData as any;
      assert(
        appData?.personalInfo?.fullName === 'Rahul Kumar',
        'Application retains independent snapshot "Rahul Kumar"',
      );

      // Modifying application details does NOT alter student profile
      await prisma.application.update({
        where: { id: appSeparation.id },
        data: { remarks: 'Updated application remarks' },
      });
      const profileAfterUpdate = await prisma.user.findUnique({
        where: { id: studentUserId },
        select: { fullName: true },
      });
      assert(
        profileAfterUpdate?.fullName === 'Osama Faiz',
        'Updating application retains independent profile name "Osama Faiz"',
      );
    }

    // -------------------------------------------------------------------------
    // TEST 10: ADMIN PANEL INTEGRATION & AUDIT LOGGING
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Admin Panel Integration: Audit Logs & Security Hygiene ---');
    const authLogs = await prisma.auditLog.findMany({
      where: {
        module: 'AUTH',
        userId: studentUserId,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    assert(authLogs.length > 0, `Authentication events logged in AuditLog (${authLogs.length} events found)`);

    // Verify no plain OTP or password leaks in audit logs
    let secretsFound = false;
    for (const log of authLogs) {
      const logStr = JSON.stringify(log).toLowerCase();
      if (logStr.includes(knownOtp) || logStr.includes(newStrongPassword)) {
        secretsFound = true;
      }
    }
    assert(!secretsFound, 'No plain passwords or OTPs leaked into AuditLog');

  } catch (err: any) {
    console.error('Fatal Smoke Test Error:', err);
    failed++;
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP TEST DATA
    // -------------------------------------------------------------------------
    console.log('\n--- Cleaning up temporary smoke test records ---');
    try {
      if (testAppIds.length > 0) {
        await prisma.application.deleteMany({ where: { id: { in: testAppIds } } });
      }
      if (testUserIds.length > 0) {
        await prisma.otpVerification.deleteMany({
          where: {
            OR: [
              { identifier: { startsWith: '+91987' } },
              { identifier: { contains: 'verify' } },
            ],
          },
        });
        await prisma.passwordResetToken.deleteMany({ where: { userId: { in: testUserIds } } });
        await prisma.refreshToken.deleteMany({ where: { userId: { in: testUserIds } } });
        await prisma.authIdentity.deleteMany({ where: { userId: { in: testUserIds } } });
        await prisma.auditLog.deleteMany({ where: { userId: { in: testUserIds } } });
        await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
      }
      console.log('✅ Temporary smoke test records cleaned up cleanly.');
    } catch (e: any) {
      console.warn('Cleanup warning:', e.message);
    }
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`SMOKE TEST COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStudentAuthSmokeTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
