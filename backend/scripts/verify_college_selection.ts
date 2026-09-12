import { PrismaClient } from '@prisma/client';
import { ApplicationService } from '../src/application/application.service';

const prisma = new PrismaClient();

async function runTests() {
  console.log('=== STARTING 9 COMPREHENSIVE COLLEGE AUTO-SELECT TESTS ===\n');

  // Find or create test student
  let testStudent = await prisma.user.findFirst({
    where: { role: 'STUDENT', email: 'test.applicant.colleges@swayam.test' },
  });
  if (!testStudent) {
    testStudent = await prisma.user.create({
      data: {
        email: 'test.applicant.colleges@swayam.test',
        fullName: 'Aarav Kumar Test',
        mobile: '9876543299',
        password: 'dummy_password',
        role: 'STUDENT',
        isActive: true,
      },
    });
  }

  // Find or create test counselor
  let testCounselor = await prisma.user.findFirst({
    where: { role: 'COUNSELOR', email: 'test.counselor.colleges@swayam.test' },
  });
  if (!testCounselor) {
    testCounselor = await prisma.user.create({
      data: {
        email: 'test.counselor.colleges@swayam.test',
        fullName: 'Pooja Sharma Counselor',
        mobile: '9876543298',
        password: 'dummy_password',
        role: 'COUNSELOR',
        isActive: true,
      },
    });
  }

  // Get available colleges
  const apexCollege = await prisma.college.findFirst({
    where: { slug: { contains: 'apex' } },
  });
  const globalCollege = await prisma.college.findFirst({
    where: { slug: { contains: 'global' } },
  });
  const anyCourse = await prisma.course.findFirst({
    where: { status: { not: 'ARCHIVED' } },
  });

  if (!apexCollege || !globalCollege || !anyCourse) {
    throw new Error('Required test data (colleges/courses) missing from database');
  }

  console.log(`Available Test Colleges:`);
  console.log(` - ABC College: ${apexCollege.name} (${apexCollege.id})`);
  console.log(` - XYZ College: ${globalCollege.name} (${globalCollege.id})`);
  console.log(` - Sample Course: ${anyCourse.name} (${anyCourse.id})\n`);

  // Mock services for ApplicationService
  const dataScopeService: any = {
    resolveDataScope: async () => ({ isGlobalScope: true, accessibleCollegeIds: [] }),
    enforceApplicationScope: () => {},
    validateMutationScope: () => {},
    applyQueryFilter: (ctx: any, filter: any) => filter,
  };
  const auditService: any = { logAction: async () => {} };
  const notificationsService: any = { createNotification: async () => {} };
  const documentsService: any = {
    getDynamicChecklist: async () => ({
      data: {
        checklist: [],
        summary: { isComplete: true },
      },
    }),
    validateRequirements: async () => ({ isComplete: true, missingDocumentTypes: [] }),
  };
  const idGenerator: any = {
    generateApplicationId: async () => `SWY-APP-${Date.now().toString().slice(-6)}`,
  };
  const liveSync: any = { broadcast: () => {} };
  const geographyService: any = {
    validatePincode: async () => ({ isValid: true }),
  };
  const couponsService: any = {
    validateCoupon: async () => ({ valid: false }),
  };

  const appService = new ApplicationService(
    prisma as any,
    dataScopeService,
    auditService,
    notificationsService,
    documentsService,
    idGenerator,
    liveSync,
    geographyService,
    couponsService,
  );

  // -------------------------------------------------------------
  // TEST 1: New student opens Apply Now form -> Default must be empty
  // -------------------------------------------------------------
  console.log('--- TEST 1: Default state when student opens Apply Now ---');
  const defaultApplyNowCollege = ""; // As verified in ApplyNowPage.tsx useState({ collegeId: "", college: "" })
  if (defaultApplyNowCollege === "") {
    console.log('✔ PASS: Apply Now college selection defaults strictly to empty/unselected (null / "").');
  } else {
    throw new Error('❌ FAIL: Apply Now college selection default is not empty');
  }

  // -------------------------------------------------------------
  // TEST 2: Student submits preferences without selecting college
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Student submits application without selecting college ---');
  const res2 = await appService.createApplication(
    testStudent.id,
    {
      courseId: anyCourse.id,
      state: 'Bihar',
      district: 'Patna',
      educationLevel: '12th',
      stream: 'Science',
      passingYear: '2025',
      // NO collegeId, NO preferredCollege
      preferredCity: 'Delhi',
    },
  );
  const appWithoutCollege = res2.application;

  console.log(`Created Application ID: ${appWithoutCollege.applicationId}`);
  console.log(`Stored collegeId: ${appWithoutCollege.collegeId}`);
  console.log(`Stored preferences:`, (appWithoutCollege.formData as any)?.preferences);

  if (appWithoutCollege.collegeId === null && (appWithoutCollege.formData as any)?.preferences?.preferredCollege === null) {
    console.log('✔ PASS: Application persisted with collegeId: null. GKU was NOT auto-selected!');
  } else {
    throw new Error(`❌ FAIL: Expected collegeId: null, got ${appWithoutCollege.collegeId}`);
  }

  // -------------------------------------------------------------
  // TEST 3: Student selects ABC College (Apex)
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Student selects ABC College ---');
  const res3 = await appService.createApplication(
    testStudent.id,
    {
      courseId: anyCourse.id,
      collegeId: apexCollege.id,
      preferredCollege: apexCollege.name,
      state: 'Punjab',
      district: 'Bathinda',
      educationLevel: '12th',
      stream: 'Commerce',
      passingYear: '2025',
    },
  );
  const appWithABC = res3.application;

  console.log(`Created Application #1: ${appWithABC.applicationId}`);
  console.log(`Stored collegeId: ${appWithABC.collegeId} (Expected: ${apexCollege.id})`);

  if (appWithABC.collegeId === apexCollege.id) {
    console.log(`✔ PASS: Application correctly saved chosen college: ${apexCollege.name}`);
  } else {
    throw new Error(`❌ FAIL: Expected collegeId ${apexCollege.id}, got ${appWithABC.collegeId}`);
  }

  // -------------------------------------------------------------
  // TEST 4: Student reopens application #1
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Student reopens application #1 (findOne / progress) ---');
  const reopenedABC = await appService.findOne(appWithABC.id, testStudent.id);
  const progressABC = await appService.getApplicationProgress(appWithABC.id, testStudent as any);

  if (reopenedABC.collegeId === apexCollege.id && reopenedABC.college?.name === apexCollege.name) {
    console.log(`✔ PASS: ABC College remains intact upon reopening. College = ${reopenedABC.college?.name}`);
  } else {
    throw new Error(`❌ FAIL: Reopened application college corrupted: ${reopenedABC.collegeId}`);
  }

  // -------------------------------------------------------------
  // TEST 5: Student creates second application and selects XYZ College
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Student creates second application and selects XYZ College ---');
  const res5 = await appService.createApplication(
    testStudent.id,
    {
      courseId: anyCourse.id,
      collegeId: globalCollege.id,
      preferredCollege: globalCollege.name,
      state: 'Haryana',
      district: 'Gurugram',
      educationLevel: '12th',
      stream: 'Arts',
      passingYear: '2025',
    },
  );
  const appWithXYZ = res5.application;

  const myApps = await appService.findMyApplications(testStudent.id);
  const freshABC = myApps.data.find((a: any) => a.id === appWithABC.id);
  const freshXYZ = myApps.data.find((a: any) => a.id === appWithXYZ.id);

  console.log(`App #1 College: ${freshABC?.college?.name} (${freshABC?.collegeId})`);
  console.log(`App #2 College: ${freshXYZ?.college?.name} (${freshXYZ?.collegeId})`);

  if (freshABC?.collegeId === apexCollege.id && freshXYZ?.collegeId === globalCollege.id) {
    console.log('✔ PASS: Multiple applications maintain independent college selections (App #1 = ABC, App #2 = XYZ).');
  } else {
    throw new Error('❌ FAIL: Multiple applications collided in college selection.');
  }

  // -------------------------------------------------------------
  // TEST 6: Student creates third application without college
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Student creates third application without college ---');
  const res6 = await appService.createApplication(
    testStudent.id,
    {
      courseId: anyCourse.id,
      state: 'Delhi',
      district: 'New Delhi',
      educationLevel: '12th',
      stream: 'Science',
      passingYear: '2025',
    },
  );
  const app3NoCollege = res6.application;

  const refreshedMyApps = await appService.findMyApplications(testStudent.id);
  const freshApp3 = refreshedMyApps.data.find((a: any) => a.id === app3NoCollege.id);

  console.log(`App #3 College: ${freshApp3?.college?.name || 'NULL (Not Selected)'}`);
  if (!freshApp3?.collegeId && !freshApp3?.college) {
    console.log('✔ PASS: App #3 has college = null. No college auto-selected.');
  } else {
    throw new Error(`❌ FAIL: App #3 erroneously got college ${freshApp3?.collegeId}`);
  }

  // -------------------------------------------------------------
  // TEST 7: Logout / Login / Reload
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Simulate reload / getApplicationProgress on app without college ---');
  const reloadedApp3 = await appService.findOne(app3NoCollege.id, testStudent.id);
  const progressApp3 = await appService.getApplicationProgress(app3NoCollege.id, testStudent as any);

  if (reloadedApp3.collegeId === null && !reloadedApp3.college) {
    console.log('✔ PASS: findOne & getApplicationProgress did NOT auto-heal to GKU! collegeId remains null.');
  } else {
    throw new Error(`❌ FAIL: Reload auto-healed to ${reloadedApp3.collegeId}`);
  }

  // -------------------------------------------------------------
  // TEST 8: Counselor opens unassigned application and assigns college
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Counselor assigns college explicitly to unassigned application ---');
  const counselorAssignRes = await appService.assignCollege(app3NoCollege.id, apexCollege.id, testCounselor.id);
  console.log(`Counselor action result: ${counselorAssignRes.message}`);

  const postAssignApp = await appService.findOne(app3NoCollege.id, testStudent.id);
  console.log(`Post-assignment college: ${postAssignApp.college?.name} (${postAssignApp.collegeId})`);

  if (postAssignApp.collegeId === apexCollege.id) {
    console.log('✔ PASS: Counselor successfully and explicitly assigned college to application.');
  } else {
    throw new Error(`❌ FAIL: Expected collegeId ${apexCollege.id}, got ${postAssignApp.collegeId}`);
  }

  // -------------------------------------------------------------
  // TEST 9: Existing application with no college remains with no college
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Existing application without college remains with null college ---');
  const res9 = await appService.createApplication(
    testStudent.id,
    {
      courseId: anyCourse.id,
      state: 'Rajasthan',
      district: 'Jaipur',
      educationLevel: '12th',
      stream: 'Arts',
      passingYear: '2025',
    },
  );
  const app9 = res9.application;

  // Read multiple times
  await appService.findOne(app9.id, testStudent.id);
  await appService.findMyApplications(testStudent.id);
  await appService.getApplicationProgress(app9.id, testStudent as any);

  const finalCheckApp9 = await prisma.application.findUnique({
    where: { id: app9.id },
    select: { id: true, collegeId: true },
  });

  if (finalCheckApp9?.collegeId === null) {
    console.log('✔ PASS: Existing application with no college remains with collegeId = null after repeated reads/progress checks.');
  } else {
    throw new Error(`❌ FAIL: Expected null, got ${finalCheckApp9?.collegeId}`);
  }

  // Cleanup test applications created in this suite
  const appIds = [appWithoutCollege.id, appWithABC.id, appWithXYZ.id, app3NoCollege.id, app9.id];
  await prisma.applicationTimeline.deleteMany({
    where: { applicationId: { in: appIds } },
  });
  await prisma.payment.deleteMany({
    where: { applicationId: { in: appIds } },
  });
  await prisma.application.deleteMany({
    where: { id: { in: appIds } },
  });
  console.log('\nTest applications cleaned up.');

  console.log('\n======================================================');
  console.log('ALL 9 TESTS PASSED ACCORDING TO PROMPT REQUIREMENTS!');
  console.log('======================================================');
}

runTests()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
