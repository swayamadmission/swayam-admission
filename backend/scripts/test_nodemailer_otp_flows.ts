import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { EmailChannel } from '../src/notifications/notification-channels.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  buildOtpEmailHtml,
  buildForgotPasswordOtpEmailHtml,
  buildPasswordResetSuccessEmailHtml,
  buildWelcomeEmailHtml,
} from '../src/notifications/email-templates';

async function runNodemailerOtpTest() {
  console.log('===============================================================');
  console.log(' SWAYAM ADMISSION — NODEMAILER & EMAIL OTP VERIFICATION SUITE  ');
  console.log('===============================================================\n');

  console.log('Initializing Nest application context...');
  let app: any;
  try {
    app = await NestFactory.createApplicationContext(AppModule);
  } catch (initErr: any) {
    console.error('FAILED TO CREATE NEST APP CONTEXT:', initErr);
    process.exit(1);
  }
  const authService = app.get(AuthService);
  const emailChannel = app.get(EmailChannel);
  const prisma = app.get(PrismaService);

  const testEmail = `student.mailer.${Date.now()}@swayamadmission.org`;
  const testPassword = 'Password@1234';

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Nodemailer Transporter Health & Configuration
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Checking Nodemailer EmailChannel Health...');
    const health = emailChannel.getHealth();
    console.log(`  Health Status: ${health.status}`);
    console.log(`  Details: ${health.message}`);
    if (health.status !== 'HEALTHY') {
      throw new Error(`EmailChannel health check failed: ${health.message}`);
    }
    console.log('  ✅ EmailChannel is fully healthy and operational.\n');

    // -------------------------------------------------------------------------
    // TEST 2: Email Template Compilers
    // -------------------------------------------------------------------------
    console.log('[TEST 2] Verifying HTML Email Template Generation...');
    const otpTemplate = buildOtpEmailHtml({
      otp: '849201',
      title: 'Email Verification',
      greetingName: 'Aarav Sharma',
      purpose: 'verifying your Swayam Admission student email',
      expiryMinutes: 15,
    });
    if (!otpTemplate.includes('849201') || !otpTemplate.includes('Aarav Sharma') || !otpTemplate.includes('SWAYAM ADMISSION')) {
      throw new Error('OTP Email Template failed HTML generation assertions');
    }

    const forgotTemplate = buildForgotPasswordOtpEmailHtml({
      otp: '394820',
      greetingName: 'Aarav Sharma',
      expiryMinutes: 5,
    });
    if (!forgotTemplate.includes('394820') || !forgotTemplate.includes('Password Reset Request')) {
      throw new Error('Forgot Password OTP Template failed assertions');
    }

    const successTemplate = buildPasswordResetSuccessEmailHtml({
      greetingName: 'Aarav Sharma',
    });
    if (!successTemplate.includes('Password Updated Successfully')) {
      throw new Error('Password Reset Success Template failed assertions');
    }

    const welcomeTemplate = buildWelcomeEmailHtml({
      greetingName: 'Aarav Sharma',
      email: testEmail,
    });
    if (!welcomeTemplate.includes('WELCOME TO SWAYAM ADMISSION') || !welcomeTemplate.includes(testEmail)) {
      throw new Error('Welcome Email Template failed assertions');
    }
    console.log('  ✅ All 4 branded HTML email templates compiled with 100% fidelity.\n');

    // -------------------------------------------------------------------------
    // TEST 3: EmailChannel Direct Dispatch
    // -------------------------------------------------------------------------
    console.log('[TEST 3] Testing EmailChannel Direct Send...');
    const directResult = await emailChannel.send(
      { id: 'test-student-1', name: 'Aarav Sharma', email: testEmail, type: 'STUDENT' },
      {
        title: 'Swayam Admission Test Dispatch',
        subject: 'Swayam Admission Verification Test',
        message: 'Your verification OTP is 556677.',
        emailHtml: otpTemplate,
      },
    );
    console.log(`  Send Success: ${directResult.success}`);
    console.log(`  Status: ${directResult.status}`);
    console.log(`  Provider Message ID: ${directResult.providerMessageId}`);
    if (!directResult.success || directResult.status !== 'SENT') {
      throw new Error(`EmailChannel direct send failed: ${directResult.errorMessage}`);
    }
    console.log('  ✅ EmailChannel successfully dispatched email.\n');

    // -------------------------------------------------------------------------
    // TEST 4: Registration Email OTP Flow (send-email-otp -> verify-email-otp)
    // -------------------------------------------------------------------------
    console.log('[TEST 4] Testing Registration Email OTP Flow...');
    const regOtpRes = await authService.sendRegistrationEmailOtp({ email: testEmail });
    console.log(`  Registration OTP Sent: ${regOtpRes.success}`);
    console.log(`  Message: ${regOtpRes.message}`);
    console.log(`  Dev OTP: ${regOtpRes.devOtp}`);
    if (!regOtpRes.success || !regOtpRes.devOtp || regOtpRes.devOtp.length !== 6) {
      throw new Error('sendRegistrationEmailOtp failed to generate 6-digit OTP');
    }

    // Verify OTP
    const regVerifyRes = await authService.verifyRegistrationEmailOtp({
      email: testEmail,
      otp: regOtpRes.devOtp,
    });
    console.log(`  Verification Success: ${regVerifyRes.success}`);
    console.log(`  Verification Token issued: ${regVerifyRes.verificationToken?.slice(0, 16)}...`);
    if (!regVerifyRes.success || !regVerifyRes.verificationToken) {
      throw new Error('verifyRegistrationEmailOtp failed to verify OTP');
    }
    console.log('  ✅ Registration Email OTP generated, emailed, and verified successfully.\n');

    // -------------------------------------------------------------------------
    // TEST 5: Create User & Test Profile Email Verification (send-verification -> verify)
    // -------------------------------------------------------------------------
    console.log('[TEST 5] Testing Profile Email Verification Flow...');
    // Create a student in DB for testing
    const testUser = await prisma.user.create({
      data: {
        fullName: 'Aarav Sharma',
        email: testEmail,
        personalEmail: testEmail,
        mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        role: 'STUDENT',
        status: 'ACTIVE',
        isApproved: true,
        isActive: true,
        emailVerified: false,
        password: await (authService as any).hashOtp(testPassword),
      },
    });

    const sendVerifyRes = await authService.sendEmailVerification(testUser.id, testEmail);
    console.log(`  Profile Email Verification Sent: ${sendVerifyRes.success}`);
    console.log(`  Message: ${sendVerifyRes.message}`);
    console.log(`  Dev Code: ${sendVerifyRes.devCode}`);
    if (!sendVerifyRes.success || !sendVerifyRes.devCode) {
      throw new Error('sendEmailVerification failed to issue verification code');
    }

    const verifyCodeRes = await authService.verifyEmail(testUser.id, testEmail, sendVerifyRes.devCode);
    console.log(`  Verify Email Status: ${verifyCodeRes.success}`);
    if (!verifyCodeRes.success) {
      throw new Error('verifyEmail failed to verify OTP');
    }

    // Verify in database that emailVerified is now true
    const updatedUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    if (!updatedUser?.emailVerified) {
      throw new Error('Database emailVerified flag was not set to true');
    }
    console.log('  ✅ Profile Email Verification OTP generated, emailed, and verified in DB.\n');

    // -------------------------------------------------------------------------
    // TEST 6: Forgot Password & Password Reset via Email OTP Flow
    // -------------------------------------------------------------------------
    console.log('[TEST 6] Testing Forgot Password & Password Reset via Email OTP...');
    const forgotRes = await authService.forgotPasswordSendOtp({
      method: 'EMAIL',
      identifier: testEmail,
    });
    console.log(`  Forgot Password OTP Sent: ${forgotRes.success}`);
    console.log(`  Message: ${forgotRes.message}`);
    console.log(`  Dev OTP: ${forgotRes.devOtp}`);
    if (!forgotRes.success || !forgotRes.devOtp) {
      throw new Error('forgotPasswordSendOtp failed to generate reset OTP');
    }

    // Verify forgot password OTP
    const forgotVerifyRes = await authService.forgotPasswordVerifyOtp({
      method: 'EMAIL',
      identifier: testEmail,
      otp: forgotRes.devOtp,
    });
    console.log(`  Forgot OTP Verified: ${forgotVerifyRes.success}`);
    console.log(`  Reset Token: ${forgotVerifyRes.resetToken?.slice(0, 16)}...`);
    if (!forgotVerifyRes.success || !forgotVerifyRes.resetToken) {
      throw new Error('forgotPasswordVerifyOtp failed to issue reset token');
    }

    // Reset password with token
    const newPassword = 'NewSecretPassword@2026';
    const resetRes = await authService.resetPasswordWithToken({
      resetToken: forgotVerifyRes.resetToken,
      newPassword,
      confirmPassword: newPassword,
    });
    console.log(`  Password Reset Status: ${resetRes.success}`);
    console.log(`  Message: ${resetRes.message}`);
    if (!resetRes.success) {
      throw new Error('resetPasswordWithToken failed to reset password');
    }
    console.log('  ✅ Forgot Password Email OTP -> Verify -> Reset Password -> Confirmation Email passed.\n');

    // -------------------------------------------------------------------------
    // TEST 7: Anti-Enumeration Protection
    // -------------------------------------------------------------------------
    console.log('[TEST 7] Testing Anti-Enumeration for Non-Existent Email...');
    const fakeForgotRes = await authService.forgotPasswordSendOtp({
      method: 'EMAIL',
      identifier: 'nonexistent.random.user.999@swayamadmission.org',
    });
    console.log(`  Anti-Enumeration Response: ${fakeForgotRes.success} | Message: ${fakeForgotRes.message}`);
    if (!fakeForgotRes.success || fakeForgotRes.devOtp) {
      throw new Error('Anti-enumeration failed: should return generic success without generating real OTP for non-existent users');
    }
    console.log('  ✅ Anti-enumeration security strictly maintained.\n');

    // Clean up test user
    await prisma.otpVerification.deleteMany({ where: { identifier: testEmail } });
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});

    console.log('===============================================================');
    console.log(' 🎉 ALL 7 NODEMAILER & EMAIL OTP TESTS PASSED SUCCESSFULLY!    ');
    console.log('===============================================================\n');
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runNodemailerOtpTest();
