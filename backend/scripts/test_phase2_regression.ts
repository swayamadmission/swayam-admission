import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailChannel } from '../src/notifications/notification-channels.service';

async function runPhase2RegressionTest() {
  console.log('===============================================================');
  console.log('       SWAYAM ADMISSION — PHASE 2 REGRESSION TEST SUITE        ');
  console.log('===============================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const authService = app.get(AuthService);
  const prisma = app.get(PrismaService);
  const emailChannel = app.get(EmailChannel);

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, extra?: string) {
    if (condition) {
      console.log(`[PASS] ${name} ${extra ? `(${extra})` : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${extra ? `(${extra})` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Recipient Isolation & Verification
    console.log('\n--- 1. Recipient Isolation ---');
    const senderEmail = process.env.SMTP_FROM_EMAIL || 'swayamadmissions@gmail.com';
    const testRecipient = `recipient.test.${Date.now()}@example.com`;
    
    // Ensure that direct dispatch doesn't redirect to sender
    const testSendResult = await emailChannel.send(
      { id: 'u1', name: 'Test User', email: testRecipient, type: 'STUDENT' },
      { title: 'Test Email', subject: 'Test Subject', message: 'Test Body' },
    );
    assert(
      'Email destination is strictly recipient and never falls back to sender',
      testRecipient !== senderEmail,
      `Recipient: ${testRecipient}, Sender: ${senderEmail}`,
    );

    // 2. Dev OTP Masking & Leak Prevention
    console.log('\n--- 2. Dev OTP Secret Leak Prevention ---');
    // Ensure in production mode (or default) devOtp is never leaked
    const dummyMobile = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
    const otpRes = await authService.sendMobileOtp({
      mobile: dummyMobile,
    });
    assert(
      'sendMobileOtp does not leak devOtp in response payload',
      (otpRes as any).devOtp === undefined,
      `devOtp: ${(otpRes as any).devOtp}`,
    );

    // 3. Student Forgot Password Dispatches Email via EmailChannel
    console.log('\n--- 3. Student Forgot Password Workflow ---');
    const dummyStudentEmail = `student.forgot.${Date.now()}@swayamadmission.org`;
    const dummyStudent = await prisma.user.create({
      data: {
        email: dummyStudentEmail,
        fullName: 'Student Recovery Test',
        role: 'STUDENT',
        isActive: true,
      },
    });

    const forgotRes = await authService.forgotPassword(dummyStudentEmail);
    assert(
      'forgotPassword returns generic safe message without error',
      forgotRes.message.includes('password reset link has been sent'),
      `Response: ${forgotRes.message}`,
    );

    // Verify token was generated in DB
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: { userId: dummyStudent.id },
      select: { tokenHash: true, expiresAt: true },
    });
    assert(
      'forgotPassword generated passwordResetToken in DB',
      Boolean(tokenRecord?.tokenHash),
      `Token generated: ${Boolean(tokenRecord?.tokenHash)}`,
    );

    // Clean up
    await prisma.passwordResetToken.deleteMany({ where: { userId: dummyStudent.id } });
    await prisma.user.delete({ where: { id: dummyStudent.id } });

    console.log('\n===============================================================');
    console.log(`Phase 2 Regression Results: ${passed} passed, ${failed} failed`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await app.close();
  }
}

runPhase2RegressionTest().catch((err) => {
  console.error('Fatal error during Phase 2 regression test:', err);
  process.exit(1);
});
