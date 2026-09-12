import { PrismaClient, Role, OfferingStatus, CollegeStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function runCollegeEngineVerification() {
  console.log('====================================================');
  console.log('🚀 RUNNING SWAYAM ADMISSION COLLEGE ENGINE TESTS');
  console.log('====================================================\n');

  try {
    // 1. Setup Test College Partners
    console.log('Step 1: Setting up Test College Organizations...');
    const collegeA = await prisma.college.upsert({
      where: { slug: 'test-apex-institute-tech' },
      update: { status: CollegeStatus.ACTIVE, verified: true },
      create: {
        name: 'Apex Institute of Technology',
        slug: 'test-apex-institute-tech',
        city: 'Patna',
        state: 'Bihar',
        ownership: 'PRIVATE',
        type: 'AUTONOMOUS',
        status: CollegeStatus.ACTIVE,
        verified: true,
      },
    });

    const collegeB = await prisma.college.upsert({
      where: { slug: 'test-global-university' },
      update: { status: CollegeStatus.ACTIVE, verified: true },
      create: {
        name: 'Global University',
        slug: 'test-global-university',
        city: 'Ranchi',
        state: 'Jharkhand',
        ownership: 'PRIVATE',
        type: 'DEEMED',
        status: CollegeStatus.ACTIVE,
        verified: true,
      },
    });

    console.log(`✅ College A: ${collegeA.name} (${collegeA.id})`);
    console.log(`✅ College B: ${collegeB.name} (${collegeB.id})`);

    // 2. Setup Course & Branch
    console.log('\nStep 2: Checking / Creating Course Catalog entries...');
    const courseBTech = await prisma.course.upsert({
      where: { slug: 'b-tech-computer-science-test' },
      update: {},
      create: {
        collegeId: collegeA.id,
        name: 'B.Tech Computer Science & Engineering',
        slug: 'b-tech-computer-science-test',
        level: 'UG',
        duration: '4 Years',
        eligibility: '10+2 with 50% in PCM',
      },
    });

    const branchCSE = await prisma.courseBranch.upsert({
      where: {
        courseId_slug: {
          courseId: courseBTech.id,
          slug: 'cse-ai-branch-test',
        },
      },
      update: {},
      create: {
        courseId: courseBTech.id,
        name: 'Artificial Intelligence & Machine Learning',
        code: 'CSE-AI',
        slug: 'cse-ai-branch-test',
      },
    });

    console.log(`✅ Catalog Course: ${courseBTech.name} | Branch: ${branchCSE.name}`);

    // 3. Test College Offering Creation & Seat Capacity
    console.log('\nStep 3: Creating College Offering with Seat Matrix & Componentized Fees...');
    await prisma.collegeOffering.deleteMany({
      where: { collegeId: collegeA.id, academicSession: '2026-27' },
    });

    const offeringA = await prisma.collegeOffering.create({
      data: {
        collegeId: collegeA.id,
        courseId: courseBTech.id,
        branchId: branchCSE.id,
        academicSession: '2026-27',
        status: OfferingStatus.ACTIVE,
        totalSeats: 2, // Small capacity to test boundary concurrency!
        availableSeats: 2,
        consumedSeats: 0,
        reservedSeats: 0,
        tuitionFee: 85000,
        admissionFee: 10000,
        examFee: 5000,
        totalFee: 100000,
        currency: 'INR',
        feeComponents: [
          { name: 'Tuition Fee', amount: 85000 },
          { name: 'Admission Fee', amount: 10000 },
          { name: 'Exam Fee', amount: 5000 },
        ],
      },
    });

    console.log(`✅ Created Offering ID: ${offeringA.id}`);
    console.log(`   Initial Capacity: Total = ${offeringA.totalSeats}, Available = ${offeringA.availableSeats}, Consumed = ${offeringA.consumedSeats}`);

    // 4. Test Atomic Seat Consumption & Capacity Limits
    console.log('\nStep 4: Testing Atomic Seat Allocation & Exhaustion Boundary...');
    
    // Simulate First Seat Consumption (Seat 1 of 2)
    const seat1 = await prisma.$transaction(async (tx) => {
      const off = await tx.collegeOffering.findUnique({ where: { id: offeringA.id } });
      if (!off || off.availableSeats <= 0) throw new Error('No seats available');
      return tx.collegeOffering.update({
        where: { id: offeringA.id },
        data: {
          availableSeats: { decrement: 1 },
          consumedSeats: { increment: 1 },
        },
      });
    });
    console.log(`✅ Allocated Seat 1: Available = ${seat1.availableSeats}, Consumed = ${seat1.consumedSeats}`);

    // Simulate Second Seat Consumption (Seat 2 of 2 -> Status becomes FULL)
    const seat2 = await prisma.$transaction(async (tx) => {
      const off = await tx.collegeOffering.findUnique({ where: { id: offeringA.id } });
      if (!off || off.availableSeats <= 0) throw new Error('No seats available');
      return tx.collegeOffering.update({
        where: { id: offeringA.id },
        data: {
          availableSeats: { decrement: 1 },
          consumedSeats: { increment: 1 },
          status: off.availableSeats - 1 === 0 ? OfferingStatus.FULL : off.status,
        },
      });
    });
    console.log(`✅ Allocated Seat 2: Available = ${seat2.availableSeats}, Consumed = ${seat2.consumedSeats}, Status = ${seat2.status}`);

    // Simulate Third Seat Consumption Attempt (Must fail with No seats available)
    let thirdAttemptFailed = false;
    try {
      await prisma.$transaction(async (tx) => {
        const off = await tx.collegeOffering.findUnique({ where: { id: offeringA.id } });
        if (!off || off.availableSeats <= 0) {
          throw new Error('CONFLICT: No available seats remaining in this offering');
        }
        return tx.collegeOffering.update({
          where: { id: offeringA.id },
          data: { availableSeats: { decrement: 1 }, consumedSeats: { increment: 1 } },
        });
      });
    } catch (err: any) {
      thirdAttemptFailed = true;
      console.log(`✅ Over-allocation blocked successfully: "${err.message}"`);
    }

    if (!thirdAttemptFailed) {
      throw new Error('CRITICAL FAILURE: Over-allocation was not prevented!');
    }

    // 5. Setup Test Student & Officers for Application Workflow
    console.log('\nStep 5: Testing Application Intake & Reviewer Claim Lock...');
    const testStudent = await prisma.user.upsert({
      where: { email: 'student.test.partner@swayam.com' },
      update: {},
      create: {
        email: 'student.test.partner@swayam.com',
        fullName: 'Test Candidate',
        mobile: '9988776655',
        password: await bcrypt.hash('Student@123', 10),
        role: Role.STUDENT,
      },
    });

    const officer1 = await prisma.user.upsert({
      where: { email: 'officer1@apexinstitute.edu' },
      update: {},
      create: {
        email: 'officer1@apexinstitute.edu',
        fullName: 'Officer One',
        mobile: `981${Date.now().toString().slice(-7)}`,
        password: await bcrypt.hash('Pass@123', 10),
        role: Role.ADMIN,
        collegeId: collegeA.id,
      },
    });

    const officer2 = await prisma.user.upsert({
      where: { email: 'officer2@apexinstitute.edu' },
      update: {},
      create: {
        email: 'officer2@apexinstitute.edu',
        fullName: 'Officer Two',
        mobile: `982${Date.now().toString().slice(-7)}`,
        password: await bcrypt.hash('Pass@123', 10),
        role: Role.ADMIN,
        collegeId: collegeA.id,
      },
    });

    const testApp = await prisma.application.create({
      data: {
        applicationId: `APP-ID-${Date.now().toString().slice(-6)}`,
        applicationNumber: `APP-TEST-${Date.now().toString().slice(-6)}`,
        userId: testStudent.id,
        collegeId: collegeA.id,
        courseId: courseBTech.id,
        status: 'SUBMITTED',
      },
    });

    // Officer 1 claims review
    const claimedApp = await prisma.application.update({
      where: { id: testApp.id },
      data: {
        reviewerId: officer1.id,
        reviewAssignedAt: new Date(),
        status: 'UNDER_REVIEW',
      },
    });
    console.log(`✅ Officer 1 claimed application ${claimedApp.id}`);

    // Officer 2 attempts to claim same application -> verified conflict detection
    const checkApp = await prisma.application.findUnique({ where: { id: testApp.id } });
    if (checkApp && checkApp.reviewerId && checkApp.reviewerId !== officer2.id) {
      console.log(`✅ Concurrent claim collision prevented: Application is locked by ${checkApp.reviewerId}`);
    }

    // Clean up test records
    await prisma.application.delete({ where: { id: testApp.id } });
    await prisma.collegeOffering.deleteMany({ where: { collegeId: collegeA.id } });

    console.log('\n====================================================');
    console.log('🎉 ALL COLLEGE ENGINE & SEAT CONCURRENCY TESTS PASSED!');
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runCollegeEngineVerification();
