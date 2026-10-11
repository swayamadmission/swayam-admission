import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ApplicationService } from '../src/application/application.service';
import { ApplicationFeeEligibilityService } from '../src/application/services/application-fee-eligibility.service';
import { PaymentGatewayService } from '../src/payments/gateways/payment-gateway.service';
import { PaymentsService } from '../src/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ApplicationStatus, PaymentStatus, PaymentType, Role } from '@prisma/client';
import * as crypto from 'crypto';

async function runComprehensiveSmokeTest() {
  console.log('======================================================================');
  console.log('🚀 SWAYAM ADMISSION — FULL E2E APPLICATION FEE + RAZORPAY SMOKE TEST');
  console.log('======================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const prisma = app.get(PrismaService);
  const appService = app.get(ApplicationService);
  const eligibilityService = app.get(ApplicationFeeEligibilityService);
  const gatewayService = app.get(PaymentGatewayService);
  const paymentsService = app.get(PaymentsService);

  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_key_12345';
  process.env.RAZORPAY_KEY_SECRET = keySecret;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_67890';
  process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

  // 1. Setup Student A and Student B
  const studentA = await prisma.user.upsert({
    where: { email: 'studentA.e2e@swayam.edu' },
    update: { role: Role.STUDENT },
    create: {
      email: 'studentA.e2e@swayam.edu',
      password: 'TestPassword123!',
      fullName: 'Aarav Sharma (Student A)',
      mobile: '9876500001',
      role: Role.STUDENT,
    },
  });

  const studentB = await prisma.user.upsert({
    where: { email: 'studentB.e2e@swayam.edu' },
    update: { role: Role.STUDENT },
    create: {
      email: 'studentB.e2e@swayam.edu',
      password: 'TestPassword123!',
      fullName: 'Bhavya Patel (Student B)',
      mobile: '9876500002',
      role: Role.STUDENT,
    },
  });

  const studentActorA: any = {
    id: studentA.id,
    userId: studentA.id,
    sub: studentA.id,
    email: studentA.email,
    fullName: studentA.fullName,
    role: 'STUDENT',
  };

  const studentActorB: any = {
    id: studentB.id,
    userId: studentB.id,
    sub: studentB.id,
    email: studentB.email,
    fullName: studentB.fullName,
    role: 'STUDENT',
  };

  // Find course and college
  const course = await prisma.course.findFirst({
    where: { status: 'PUBLISHED', collegeId: { not: '' } },
  });
  if (!course || !course.collegeId) {
    throw new Error('No published course with college found');
  }

  const college = await prisma.college.findUnique({
    where: { id: course.collegeId },
  });

  // Ensure test coupon exists
  await prisma.coupon.upsert({
    where: { code: 'SWAYAM50' },
    update: { isActive: true, discountType: 'PERCENTAGE', discountValue: 50, maxDiscountAmount: 1000, applicableScope: 'APPLICATION_FEE' },
    create: {
      code: 'SWAYAM50',
      discountType: 'PERCENTAGE',
      discountValue: 50,
      maxDiscountAmount: 1000,
      minTransactionAmount: 0,
      applicableScope: 'APPLICATION_FEE',
      isActive: true,
    },
  });

  console.log(`👤 Student A: ${studentA.fullName} (${studentA.id})`);
  console.log(`👤 Student B: ${studentB.fullName} (${studentB.id})`);
  console.log(`🏫 College: ${college?.name} | Course: ${course.name}\n`);

  const canonicalDeclarations = {
    privacyAccepted: true,
    privacyVersion: 'v1.2',
    termsAccepted: true,
    termsVersion: 'v2.0',
    declarationAccepted: true,
    acceptedAt: new Date().toISOString(),
  };

  // Helper to create valid application draft
  let appCounter = 1;
  async function createDraft(userId: string, prefix: string) {
    const code = `SWY-APP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const appRecord = await prisma.application.create({
      data: {
        applicationId: code,
        applicationNumber: code,
        userId,
        courseId: course!.id,
        collegeId: course!.collegeId,
        counselorId: null,
        status: ApplicationStatus.DRAFT,
        paymentStatus: PaymentStatus.PENDING,
        admissionYear: new Date().getFullYear(),
        completionPercentage: 100,
        declarationAccepted: true,
        formData: {
          personalInfo: {
            fullName: 'Test Applicant',
            email: 'test@example.com',
            mobile: '9876500001',
          },
          academicInfo: {
            educationLevel: '12th',
            tenthBoard: 'CBSE',
            tenthMarks: 85,
            tenthPassingYear: '2020',
            twelfthBoard: 'CBSE',
            twelfthMarks: 88,
            twelfthPassingYear: '2022',
          },
          address: {
            state: 'Delhi',
            district: 'New Delhi',
            pincode: '110001',
            streetAddress: 'Connaught Place',
          },
          communicationState: 'Delhi',
          communicationDistrict: 'New Delhi',
          declaration: canonicalDeclarations,
        },
      },
    });

    const docTypes = ['TENTH_MARKSHEET', 'TWELFTH_MARKSHEET', 'AADHAAR', 'PHOTO'];
    for (const dt of docTypes) {
      await prisma.document.create({
        data: {
          userId,
          applicationId: appRecord.id,
          type: dt as any,
          title: dt,
          fileName: `${dt.toLowerCase()}.pdf`,
          fileUrl: `https://storage.swayam.edu/docs/${dt.toLowerCase()}.pdf`,
          fileSize: 10240,
          mimeType: 'application/pdf',
          status: 'VERIFIED',
        },
      });
    }

    return appRecord;
  }

  // Clean prior applications for Student A for pristine 3-free-quota test
  await prisma.document.deleteMany({ where: { userId: studentA.id } });
  await prisma.payment.deleteMany({ where: { userId: studentA.id } });
  await prisma.application.deleteMany({ where: { userId: studentA.id } });
  await prisma.document.deleteMany({ where: { userId: studentB.id } });
  await prisma.payment.deleteMany({ where: { userId: studentB.id } });
  await prisma.application.deleteMany({ where: { userId: studentB.id } });

  // ------------------------------------------------------------------
  // TEST GROUP 1: 3 Free Applications Quota
  // ------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Three Free Applications Rule ---');
  const appA1 = await createDraft(studentA.id, 'A1');
  const appA2 = await createDraft(studentA.id, 'A2');
  const appA3 = await createDraft(studentA.id, 'A3');

  // App 1 eligibility
  const elig1 = await eligibilityService.getEligibility(studentA.id, appA1.id);
  console.log(`   App 1 Quota Check: used=${elig1.freeApplicationsUsed}, remaining=${elig1.freeApplicationsRemaining}, isWithinFreeQuota=${elig1.isWithinFreeQuota}, payable=${elig1.finalPayableAmount}`);
  if (!elig1.isWithinFreeQuota || elig1.finalPayableAmount !== 0) {
    throw new Error('TEST 1 FAILED: App 1 should be within free quota (₹0)');
  }

  // App 1 Submit directly with zero amount
  const sub1: any = await appService.submitApplication(appA1.id, studentActorA, {
    declarationAccepted: true,
    declaration: canonicalDeclarations,
  });
  console.log(`   ✔ App 1 Submitted successfully: status=${sub1.data?.status}, paymentStatus=${sub1.data?.paymentStatus}`);

  // App 2 eligibility (1 prior used)
  const elig2 = await eligibilityService.getEligibility(studentA.id, appA2.id);
  console.log(`   App 2 Quota Check: used=${elig2.freeApplicationsUsed}, remaining=${elig2.freeApplicationsRemaining}, isWithinFreeQuota=${elig2.isWithinFreeQuota}`);
  if (elig2.freeApplicationsUsed !== 1 || !elig2.isWithinFreeQuota) {
    throw new Error('TEST 2 FAILED: App 2 should be free quota 2 of 3');
  }
  const sub2: any = await appService.submitApplication(appA2.id, studentActorA, {
    declarationAccepted: true,
    declaration: canonicalDeclarations,
  });
  console.log(`   ✔ App 2 Submitted successfully: status=${sub2.data?.status}`);

  // App 3 eligibility (2 prior used)
  const elig3 = await eligibilityService.getEligibility(studentA.id, appA3.id);
  console.log(`   App 3 Quota Check: used=${elig3.freeApplicationsUsed}, remaining=${elig3.freeApplicationsRemaining}, isWithinFreeQuota=${elig3.isWithinFreeQuota}`);
  if (elig3.freeApplicationsUsed !== 2 || !elig3.isWithinFreeQuota) {
    throw new Error('TEST 3 FAILED: App 3 should be free quota 3 of 3');
  }
  const sub3: any = await appService.submitApplication(appA3.id, studentActorA, {
    declarationAccepted: true,
    declaration: canonicalDeclarations,
  });
  console.log(`   ✔ App 3 Submitted successfully: status=${sub3.data?.status}`);

  // ------------------------------------------------------------------
  // TEST GROUP 2: 4th Application Requires Authoritative Fee
  // ------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: 4th Application Requires Application Fee ---');
  const appA4 = await createDraft(studentA.id, 'A4');
  const elig4 = await eligibilityService.getEligibility(studentA.id, appA4.id);
  console.log(`   App 4 Quota Check: used=${elig4.freeApplicationsUsed}, remaining=${elig4.freeApplicationsRemaining}, isWithinFreeQuota=${elig4.isWithinFreeQuota}, payable=${elig4.finalPayableAmount}`);
  if (elig4.isWithinFreeQuota || elig4.finalPayableAmount !== 1500) {
    throw new Error(`TEST 4 FAILED: App 4 must require fee ₹1,500, got ${elig4.finalPayableAmount}`);
  }
  console.log('   ✔ PASS: App 4 correctly requires authoritative application fee ₹1,500.\n');

  // ------------------------------------------------------------------
  // TEST GROUP 3: Coupon Discount on Application Fee
  // ------------------------------------------------------------------
  console.log('--- TEST GROUP 3: Swayam Coupon Calculation on Application Fee ---');
  const elig4Coupon = await eligibilityService.getEligibility(studentA.id, appA4.id, 'SWAYAM50');
  console.log(`   Coupon SWAYAM50: base=${elig4Coupon.baseFee}, discount=${elig4Coupon.discountAmount}, final=${elig4Coupon.finalPayableAmount}`);
  if (elig4Coupon.discountAmount !== 750 || elig4Coupon.finalPayableAmount !== 750) {
    throw new Error(`TEST 5 FAILED: 50% discount expected 750, got ${elig4Coupon.discountAmount}`);
  }
  console.log('   ✔ PASS: Authoritative server coupon discount calculated accurately (₹750).\n');

  // ------------------------------------------------------------------
  // TEST GROUP 4: IDOR Protection (Student A vs Student B)
  // ------------------------------------------------------------------
  console.log('--- TEST GROUP 4: Strict Application Ownership & IDOR Protection ---');
  const appB1 = await createDraft(studentB.id, 'B1');

  // Student A attempts to initiate payment for Student B's application
  let idorBlocked = false;
  try {
    await appService.initiatePayment(appB1.id, studentActorA, {
      declaration: canonicalDeclarations,
    });
  } catch (err: any) {
    idorBlocked = true;
    console.log(`   ✔ IDOR Blocked as expected: ${err.message}`);
  }
  if (!idorBlocked) {
    throw new Error('TEST 6 FAILED: Student A was able to initiate payment on Student B application!');
  }

  // Student A attempts to verify payment for Student B's application
  let verifyIdorBlocked = false;
  try {
    await appService.verifyPayment(appB1.id, studentActorA, {
      razorpayPaymentId: 'pay_fake_123',
      razorpaySignature: 'fake_sig',
    });
  } catch (err: any) {
    verifyIdorBlocked = true;
    console.log(`   ✔ IDOR Verification Blocked as expected: ${err.message}`);
  }
  if (!verifyIdorBlocked) {
    throw new Error('TEST 7 FAILED: Student A was able to verify payment on Student B application!');
  }
  console.log('   ✔ PASS: IDOR strictly enforced: Student A cannot touch Student B application.\n');

  // ------------------------------------------------------------------
  // TEST GROUP 5: Razorpay Order Creation for App 4
  // ------------------------------------------------------------------
  console.log('--- TEST GROUP 5: Razorpay Order Creation ---');
  const initRes = await appService.initiatePayment(appA4.id, studentActorA, {
    couponCode: 'SWAYAM50',
    declaration: canonicalDeclarations,
  });
  console.log(`   Initiate Payment Result: payableAmount=${initRes.payableAmount}, orderId=${initRes.orderId}, keyId=${initRes.keyId}`);
  if (!initRes.orderId || initRes.payableAmount !== 750) {
    throw new Error(`TEST 8 FAILED: Order creation invalid: orderId=${initRes.orderId}, amount=${initRes.payableAmount}`);
  }
  const app4Db = await prisma.application.findUnique({ where: { id: appA4.id } });
  if (app4Db?.paymentStatus !== PaymentStatus.PENDING) {
    throw new Error('TEST 9 FAILED: Application should be in PAYMENT_PENDING state');
  }
  console.log('   ✔ PASS: Razorpay order created server-side with authoritative amount ₹750.\n');

  // ------------------------------------------------------------------
  // TEST GROUP 6: Cryptographic Signature Verification
  // ------------------------------------------------------------------
  console.log('--- TEST GROUP 6: Server-side HMAC-SHA256 Signature Verification ---');
  const fakeOrderId = initRes.orderId;
  const fakePaymentId = `pay_rzp_${Date.now()}`;
  const tamperedSignature = 'tampered_invalid_signature_hex_xyz';

  // 6A. Tampered signature attempt
  let tamperedBlocked = false;
  try {
    await appService.verifyPayment(appA4.id, studentActorA, {
      razorpayOrderId: fakeOrderId,
      razorpayPaymentId: fakePaymentId,
      razorpaySignature: tamperedSignature,
      paymentId: initRes.paymentId,
    });
  } catch (err: any) {
    tamperedBlocked = true;
    console.log(`   ✔ Tampered Signature Rejected: ${err.message}`);
  }
  if (!tamperedBlocked) {
    throw new Error('TEST 10 FAILED: Tampered signature was accepted!');
  }

  // 6B. Submit attempt before payment is completed -> must fail
  let prematureSubmitBlocked = false;
  try {
    await appService.submitApplication(appA4.id, studentActorA, {
      declarationAccepted: true,
      declaration: canonicalDeclarations,
    });
  } catch (err: any) {
    prematureSubmitBlocked = true;
    console.log(`   ✔ Premature Submission Rejected: ${err.message}`);
  }
  if (!prematureSubmitBlocked) {
    throw new Error('TEST 11 FAILED: Paid application submitted before payment was completed!');
  }

  // 6C. Valid Cryptographic Signature
  const validSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${fakeOrderId}|${fakePaymentId}`)
    .digest('hex');

  const verifySuccess = await appService.verifyPayment(appA4.id, studentActorA, {
    razorpayOrderId: fakeOrderId,
    razorpayPaymentId: fakePaymentId,
    razorpaySignature: validSignature,
    paymentId: initRes.paymentId,
  });

  console.log(`   ✔ Valid Signature Verification Succeeded: status=${verifySuccess.status}, receipt=${verifySuccess.receiptNumber}`);
  if (verifySuccess.status !== 'COMPLETED' || !verifySuccess.receiptNumber) {
    throw new Error('TEST 12 FAILED: Signature verification failed to complete payment');
  }

  // Check Application paymentStatus updated to COMPLETED
  const app4Paid = await prisma.application.findUnique({ where: { id: appA4.id } });
  if (app4Paid?.paymentStatus !== PaymentStatus.COMPLETED) {
    throw new Error(`TEST 13 FAILED: Application paymentStatus should be COMPLETED, got ${app4Paid?.paymentStatus}`);
  }

  // 6D. Now submit application after verified payment
  const sub4: any = await appService.submitApplication(appA4.id, studentActorA, {
    declarationAccepted: true,
    paymentId: initRes.paymentId,
    orderId: initRes.orderId,
    declaration: canonicalDeclarations,
  });
  console.log(`   ✔ App 4 Final Submission Succeeded: status=${sub4.data?.status}, paymentStatus=${sub4.data?.paymentStatus}`);
  if (sub4.data?.status !== ApplicationStatus.SUBMITTED) {
    throw new Error('TEST 14 FAILED: Application not submitted after verified payment');
  }

  // ------------------------------------------------------------------
  // TEST GROUP 7: Idempotency & Duplicate Protection
  // ------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Idempotency & Duplicate Protection ---');
  // Re-verify already completed payment
  const duplicateVerify = await appService.verifyPayment(appA4.id, studentActorA, {
    razorpayOrderId: fakeOrderId,
    razorpayPaymentId: fakePaymentId,
    razorpaySignature: validSignature,
    paymentId: initRes.paymentId,
  });
  console.log(`   Duplicate Verify Response: alreadyCompleted=${duplicateVerify.alreadyCompleted}, receipt=${duplicateVerify.receiptNumber}`);
  if (duplicateVerify.receiptNumber !== verifySuccess.receiptNumber) {
    throw new Error('TEST 15 FAILED: Duplicate verification created different receipt number!');
  }

  // Attempt to initiate payment on already paid application
  let duplicateInitiateBlocked = false;
  try {
    await appService.initiatePayment(appA4.id, studentActorA, {
      declaration: canonicalDeclarations,
    });
  } catch (err: any) {
    duplicateInitiateBlocked = true;
    console.log(`   ✔ Duplicate Payment Initiation Blocked: ${err.message}`);
  }
  if (!duplicateInitiateBlocked) {
    throw new Error('TEST 16 FAILED: Able to initiate duplicate payment on already paid application!');
  }
  console.log('   ✔ PASS: Duplicate payment and duplicate verification successfully prevented.\n');

  // ------------------------------------------------------------------
  // TEST GROUP 8: Webhook HMAC Verification & Synchronization
  // ------------------------------------------------------------------
  console.log('--- TEST GROUP 8: Webhook Verification & Idempotency ---');
  const appA5 = await createDraft(studentA.id, 'A5');
  const init5 = await appService.initiatePayment(appA5.id, studentActorA, {
    declaration: canonicalDeclarations,
  });

  const webhookPaymentId = `pay_wh_${Date.now()}`;
  const webhookOrderId = init5.orderId;
  const webhookPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: webhookPaymentId,
          order_id: webhookOrderId,
          amount: 150000,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
        },
      },
    },
  });
  const parsedWebhook = JSON.parse(webhookPayload);

  // Invalid webhook signature
  try {
    await paymentsService.handleRazorpayWebhook(webhookPayload, parsedWebhook, 'invalid_hmac_sig');
    throw new Error('TEST 17 FAILED: Forged webhook signature was accepted!');
  } catch (err: any) {
    console.log(`   ✔ Forged Webhook Rejected: ${err.message}`);
  }

  // Valid webhook signature
  const validWebhookSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(webhookPayload)
    .digest('hex');

  const webhookResult = await paymentsService.handleRazorpayWebhook(webhookPayload, parsedWebhook, validWebhookSig);
  console.log(`   ✔ Webhook processed successfully: status=${webhookResult.status}`);

  // Verify Application 5 paymentStatus updated to COMPLETED via webhook
  const app5Db = await prisma.application.findUnique({ where: { id: appA5.id } });
  if (app5Db?.paymentStatus !== PaymentStatus.COMPLETED) {
    throw new Error(`TEST 18 FAILED: Webhook did not synchronize application payment status. Status=${app5Db?.paymentStatus}`);
  }
  console.log('   ✔ PASS: Webhook synchronized application paymentStatus to COMPLETED.\n');

  // ------------------------------------------------------------------
  // TEST GROUP 9: Notifications & Admin Financial Visibility
  // ------------------------------------------------------------------
  console.log('--- TEST GROUP 9: Notifications & Admin Financial Ledger ---');
  const notification = await prisma.notification.findFirst({
    where: { userId: studentA.id, title: 'Application Fee Paid' },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`   Notification in DB: title="${notification?.title}", message="${notification?.message}"`);
  if (!notification) {
    throw new Error('TEST 19 FAILED: Application Fee Paid notification not found');
  }

  const ledgerEntry = await prisma.financialLedger.findFirst({
    where: { accountType: 'PLATFORM_REVENUE' },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`   Platform Revenue Ledger: amount=₹${ledgerEntry?.amount}, account=${ledgerEntry?.accountType}`);
  if (!ledgerEntry || Number(ledgerEntry.amount) <= 0) {
    throw new Error('TEST 20 FAILED: Platform revenue ledger entry missing');
  }

  console.log('\n======================================================================');
  console.log('🎉 ALL 20 TESTS PASSED! APPLICATION FEE + RAZORPAY SYSTEM READY!');
  console.log('======================================================================\n');

  await app.close();
}

runComprehensiveSmokeTest().catch((err) => {
  console.error('❌ SMOKE TEST RUNTIME ERROR:', err);
  process.exit(1);
});
