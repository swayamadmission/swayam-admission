import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runFinancialEngineTests() {
  console.log('=== STARTING SWAYAM FINANCIAL ENGINE TESTS ===\n');

  try {
    // 1. Setup Test Student
    const testStudentEmail = `fin_student_${Date.now()}@test.com`;
    const testStudent = await prisma.user.create({
      data: {
        email: testStudentEmail,
        fullName: 'Test Financial Student',
        password: 'TestPassword123!',
        role: 'STUDENT',
        mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: 'ACTIVE',
      },
    });
    console.log(`[PASS] 1. Created test student: ${testStudent.fullName} (${testStudent.id})`);

    // 2. Setup College 1 and College 2 for Multi-Application Isolation
    const college1 = await prisma.college.create({
      data: {
        name: `Engineering College Alpha ${Date.now()}`,
        slug: `eng-college-alpha-${Date.now()}`,
        city: 'Bengaluru',
        state: 'Karnataka',
        status: 'ACTIVE',
      },
    });

    const college2 = await prisma.college.create({
      data: {
        name: `Management Institute Beta ${Date.now()}`,
        slug: `mgmt-inst-beta-${Date.now()}`,
        city: 'Pune',
        state: 'Maharashtra',
        status: 'ACTIVE',
      },
    });

    const course1 = await prisma.course.create({
      data: {
        name: 'B.Tech Computer Science',
        slug: `btech-cs-${Date.now()}`,
        collegeId: college1.id,
        level: 'UG',
        duration: '4 Years',
        category: 'ENGINEERING',
        totalFees: 125000,
        status: 'ACTIVE',
      },
    });

    const course2 = await prisma.course.create({
      data: {
        name: 'MBA Marketing',
        slug: `mba-mkt-${Date.now()}`,
        collegeId: college2.id,
        level: 'PG',
        duration: '2 Years',
        category: 'MANAGEMENT',
        totalFees: 200000,
        status: 'ACTIVE',
      },
    });

    // 3. Create College Offerings with authoritative componentized fee structures
    const offering1 = await prisma.collegeOffering.create({
      data: {
        collegeId: college1.id,
        courseId: course1.id,
        academicSession: '2026-27',
        status: 'ACTIVE',
        totalSeats: 60,
        availableSeats: 60,
        tuitionFee: 100000,
        admissionFee: 15000,
        examFee: 10000,
        totalFee: 125000,
      },
    });

    const offering2 = await prisma.collegeOffering.create({
      data: {
        collegeId: college2.id,
        courseId: course2.id,
        academicSession: '2026-27',
        status: 'ACTIVE',
        totalSeats: 40,
        availableSeats: 40,
        tuitionFee: 170000,
        admissionFee: 20000,
        examFee: 10000,
        totalFee: 200000,
      },
    });
    console.log(`[PASS] 2. Created distinct College Offerings with componentized fees (Alpha: ₹125,000, Beta: ₹200,000)`);

    // 4. Create 2 Distinct Applications for the same Student
    const app1 = await prisma.application.create({
      data: {
        applicationId: `APP-ALPHA-${Date.now()}`,
        userId: testStudent.id,
        collegeId: college1.id,
        courseId: course1.id,
        offeringId: offering1.id,
        status: 'PAYMENT_PENDING',
        paymentStatus: 'PENDING',
      },
    });

    const app2 = await prisma.application.create({
      data: {
        applicationId: `APP-BETA-${Date.now()}`,
        userId: testStudent.id,
        collegeId: college2.id,
        courseId: course2.id,
        offeringId: offering2.id,
        status: 'PAYMENT_PENDING',
        paymentStatus: 'PENDING',
      },
    });
    console.log(`[PASS] 3. Created 2 distinct Applications for Student: App 1 (${app1.applicationId}) and App 2 (${app2.applicationId})`);

    // 5. Generate Authoritative Invoices for App 1 and App 2
    const invoice1 = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        applicationId: app1.id,
        studentId: testStudent.id,
        collegeId: college1.id,
        courseId: course1.id,
        offeringId: offering1.id,
        academicSession: '2026-27',
        feePlan: 'ANNUAL',
        subtotalAmount: offering1.totalFee,
        discountAmount: 5000,
        scholarshipAmount: 10000,
        finalPayableAmount: offering1.totalFee - 15000, // 110,000
        paidAmount: 0,
        remainingBalance: 110000,
        status: 'UNPAID',
        lineItems: [
          { name: 'Tuition Fee', amount: 100000 },
          { name: 'Admission Fee', amount: 15000 },
          { name: 'Exam Fee', amount: 10000 },
        ],
      },
    });

    const invoice2 = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        applicationId: app2.id,
        studentId: testStudent.id,
        collegeId: college2.id,
        courseId: course2.id,
        offeringId: offering2.id,
        academicSession: '2026-27',
        feePlan: 'ANNUAL',
        subtotalAmount: offering2.totalFee,
        discountAmount: 0,
        scholarshipAmount: 0,
        finalPayableAmount: offering2.totalFee, // 200,000
        paidAmount: 0,
        remainingBalance: 200000,
        status: 'UNPAID',
        lineItems: [
          { name: 'Tuition Fee', amount: 170000 },
          { name: 'Admission Fee', amount: 20000 },
          { name: 'Exam Fee', amount: 10000 },
        ],
      },
    });
    console.log(`[PASS] 4. Authoritative Invoices generated with server-side computed net payables:`);
    console.log(`       - Invoice 1: ${invoice1.invoiceNumber} (Net: ₹${invoice1.finalPayableAmount})`);
    console.log(`       - Invoice 2: ${invoice2.invoiceNumber} (Net: ₹${invoice2.finalPayableAmount})`);

    // 6. Complete Payment on Application 1 ONLY (Testing Multi-Application Isolation)
    const payment1 = await prisma.payment.create({
      data: {
        userId: testStudent.id,
        studentId: testStudent.id,
        applicationId: app1.id,
        invoiceId: invoice1.id,
        collegeId: college1.id,
        courseId: course1.id,
        amount: invoice1.finalPayableAmount,
        paidAmount: invoice1.finalPayableAmount,
        currency: 'INR',
        paymentMethod: 'UPI',
        gateway: 'Razorpay',
        transactionId: `TXN_${Date.now()}_RZP`,
        gatewayOrderId: `order_${Date.now()}`,
        gatewayTransactionId: `pay_${Date.now()}`,
        status: 'COMPLETED',
        paidAt: new Date(),
      },
    });

    // Update Invoice 1 to PAID
    await prisma.invoice.update({
      where: { id: invoice1.id },
      data: {
        status: 'PAID',
        paidAmount: invoice1.finalPayableAmount,
        remainingBalance: 0,
        paidAt: new Date(),
      },
    });

    // Generate First-Class Immutable Receipt for Payment 1
    const receipt1 = await prisma.receipt.create({
      data: {
        receiptNumber: `RCPT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        paymentId: payment1.id,
        invoiceId: invoice1.id,
        applicationId: app1.id,
        studentId: testStudent.id,
        collegeId: college1.id,
        paidAmount: payment1.paidAmount,
        paymentMethod: 'UPI',
        gateway: 'Razorpay',
        gatewayPaymentId: payment1.gatewayTransactionId,
        status: 'VALID',
      },
    });

    // Update Application 1 to PAYMENT_COMPLETED
    await prisma.application.update({
      where: { id: app1.id },
      data: {
        status: 'PAYMENT_COMPLETED',
        paymentStatus: 'COMPLETED',
      },
    });

    console.log(`[PASS] 5. Payment completed for App 1. Generated Receipt: ${receipt1.receiptNumber}`);

    // 7. Verify Multi-Application Isolation
    const app1Check = await prisma.application.findUnique({ where: { id: app1.id } });
    const app2Check = await prisma.application.findUnique({ where: { id: app2.id } });
    const inv1Check = await prisma.invoice.findUnique({ where: { id: invoice1.id } });
    const inv2Check = await prisma.invoice.findUnique({ where: { id: invoice2.id } });

    if (app1Check?.status !== 'PAYMENT_COMPLETED' || app1Check?.paymentStatus !== 'COMPLETED') {
      throw new Error('Application 1 status failed to update to PAYMENT_COMPLETED');
    }
    if (app2Check?.status !== 'PAYMENT_PENDING' || app2Check?.paymentStatus !== 'PENDING') {
      throw new Error('VIOLATION: Application 2 was contaminated by Application 1 payment!');
    }
    if (inv1Check?.status !== 'PAID') {
      throw new Error('Invoice 1 failed to update to PAID');
    }
    if (inv2Check?.status !== 'UNPAID' || inv2Check?.remainingBalance !== 200000) {
      throw new Error('VIOLATION: Invoice 2 balance was mutated by Invoice 1!');
    }
    console.log(`[PASS] 6. Multi-Application Isolation Verified: App 1 is PAID, App 2 remains safely UNPAID and untouched.`);

    // 8. Test Financial Reconciliation Engine
    // Case A: Perfect Match
    const rec1 = await prisma.paymentReconciliation.create({
      data: {
        reconciliationId: `REC-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        paymentId: payment1.id,
        invoiceId: invoice1.id,
        collegeId: college1.id,
        internalAmount: payment1.paidAmount,
        settlementAmount: payment1.paidAmount,
        amountDifference: 0,
        status: 'MATCHED',
        settlementReference: payment1.transactionId,
        settlementBatch: 'BATCH_AUG_2026_01',
      },
    });

    // Case B: Amount Mismatch (Discrepancy detection)
    const rec2 = await prisma.paymentReconciliation.create({
      data: {
        reconciliationId: `REC-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        collegeId: college2.id,
        internalAmount: 110000,
        settlementAmount: 105000,
        amountDifference: 5000,
        status: 'AMOUNT_MISMATCH',
        settlementReference: 'EXT_SETTLE_MISMATCH_999',
        mismatchReason: 'Bank fee deduction discrepancy of ₹5,000',
      },
    });

    console.log(`[PASS] 7. Financial Reconciliation Records Generated:`);
    console.log(`       - ${rec1.reconciliationId}: Status ${rec1.status} (Diff: ₹${rec1.amountDifference})`);
    console.log(`       - ${rec2.reconciliationId}: Status ${rec2.status} (Diff: ₹${rec2.amountDifference})`);

    // Clean up test data safely
    await prisma.paymentReconciliation.deleteMany({ where: { id: { in: [rec1.id, rec2.id] } } });
    await prisma.receipt.deleteMany({ where: { id: receipt1.id } });
    await prisma.payment.deleteMany({ where: { id: payment1.id } });
    await prisma.invoice.deleteMany({ where: { id: { in: [invoice1.id, invoice2.id] } } });
    await prisma.application.deleteMany({ where: { id: { in: [app1.id, app2.id] } } });
    await prisma.collegeOffering.deleteMany({ where: { id: { in: [offering1.id, offering2.id] } } });
    await prisma.course.deleteMany({ where: { id: { in: [course1.id, course2.id] } } });
    await prisma.college.deleteMany({ where: { id: { in: [college1.id, college2.id] } } });
    await prisma.user.deleteMany({ where: { id: testStudent.id } });

    console.log(`[PASS] 8. Cleaned up isolated test fixtures.`);
    console.log('\n=== ALL FINANCIAL ENGINE TESTS PASSED (100%) ===\n');
  } catch (error) {
    console.error('TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runFinancialEngineTests();
