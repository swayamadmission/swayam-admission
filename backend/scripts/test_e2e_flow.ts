import { PrismaClient } from '@prisma/client';
import { CoursesService } from '../src/courses/courses.service';
import { LeadService } from '../src/lead/lead.service';

const prisma = new PrismaClient();

async function runE2ETests() {
  console.log('====================================================');
  console.log('🧪 RUNNING END-TO-END FLOW VERIFICATION');
  console.log('====================================================\n');

  const mockAuditService: any = { logAction: async () => {} };
  const mockLeadRoutingService: any = {
    routeLead: async () => ({ success: true }),
    rerouteLeadOnGeographyChange: async () => ({ success: true }),
  };
  const mockDataScopeService: any = {
    resolveDataScope: async () => ({ isSuperAdmin: true }),
    enforceLeadScope: () => {},
  };

  const mockConfigService: any = {
    getEffectiveConfig: async () => ({ value: null }),
    getBoolean: async () => true,
    getNumber: async () => 0,
    getString: async () => '',
  };

  const coursesService = new CoursesService(prisma as any, mockAuditService);
  const leadService = new LeadService(
    prisma as any,
    mockDataScopeService,
    mockLeadRoutingService,
    mockAuditService,
    mockConfigService,
  );

  // ── Test 1: Fetch Courses with educationLevel & stream filter ──
  console.log('Test 1: Querying courses for 12th (Science)...');
  const scienceCourses = await coursesService.findAll({
    educationLevel: '12th',
    stream: 'Science',
    status: 'PUBLISHED',
    limit: 100,
  });
  console.log(`  → Found ${scienceCourses.total} eligible courses for 12th Science`);
  const btech = scienceCourses.data.find((c) => c.slug === 'btech-bachelor-of-technology');
  if (!btech) throw new Error('B.Tech not found for 12th Science');
  console.log(`  ✔ B.Tech is present (branches count in _count: ${btech._count?.branches})`);

  // ── Test 2: Fetch Public Branches for Parent Courses ──
  console.log('\nTest 2: Fetching public branches for B.Tech...');
  const btechBranches = await coursesService.getBranchesForCourse(btech.id);
  console.log(`  → B.Tech branches returned: ${btechBranches.data.length} branches`);
  for (const b of btechBranches.data) {
    console.log(`     • ${b.name} (${b.code || 'NO_CODE'}) - Status: ${b.status}`);
  }
  if (btechBranches.data.length !== 10) {
    throw new Error(`Expected 10 B.Tech branches, got ${btechBranches.data.length}`);
  }
  console.log('  ✔ B.Tech branches verified (10/10 active)');

  // ── Test 3: Fetch Branches for BBA ──
  console.log('\nTest 3: Fetching public branches for BBA...');
  const bba = await prisma.course.findUnique({ where: { slug: 'bba-bachelor-of-business-administration' } });
  if (!bba) throw new Error('BBA course not found');
  const bbaBranches = await coursesService.getBranchesForCourse(bba.id);
  console.log(`  → BBA branches returned: ${bbaBranches.data.length} branches`);
  if (bbaBranches.data.length !== 5) {
    throw new Error(`Expected 5 BBA branches, got ${bbaBranches.data.length}`);
  }
  console.log('  ✔ BBA branches verified (5/5 active)');

  // ── Test 4: Course findById Detail ──
  console.log('\nTest 4: Testing coursesService.findById for detail drawer...');
  const btechDetail = await coursesService.findById(btech.id);
  console.log(`  → B.Tech detail fetched: ${btechDetail.name}`);
  console.log(`  → Attached branches in detail: ${btechDetail.branches.length}`);
  console.log(`  → Attached eligibilities in detail: ${btechDetail.eligibilities.length}`);
  if (btechDetail.branches.length === 0) throw new Error('Expected branches in findById response');
  console.log('  ✔ Course findById detail verified');

  // ── Test 5: Lead Submission with Standard Branch ──
  console.log('\nTest 5: Submitting Lead with Standard Course & Branch...');
  const cseBranch = btechBranches.data.find((b) => b.slug === 'btech-cse');
  if (!cseBranch) throw new Error('B.Tech CSE branch not found');

  const testLead1 = await leadService.createLead({
    fullName: 'Automated Test Student 1',
    mobile: '9876543210',
    email: 'test.student1@example.com',
    educationLevel: '12th',
    stream: 'Science',
    courseId: btech.id,
    preferredCourse: btech.name,
    branchId: cseBranch.id,
    preferredBranch: cseBranch.name,
    hasConsent: true,
  });
  console.log(`  → Lead created with ID: ${testLead1.id}`);
  console.log(`  → Stored courseId: ${testLead1.courseId}`);
  console.log(`  → Stored branchId: ${testLead1.branchId}`);
  if (testLead1.branchId !== cseBranch.id) throw new Error('Lead branchId mismatch');
  console.log('  ✔ Lead with standard branch verified');

  // ── Test 6: Lead Submission with Custom "Other" Branch ──
  console.log('\nTest 6: Submitting Lead with Custom "Other" Branch...');
  const testLead2 = await leadService.createLead({
    fullName: 'Automated Test Student 2',
    mobile: '9876543211',
    email: 'test.student2@example.com',
    educationLevel: '12th',
    stream: 'Science',
    courseId: btech.id,
    preferredCourse: btech.name,
    branchId: undefined,
    customBranchText: 'Robotics & Automation',
    hasConsent: true,
  });
  console.log(`  → Lead created with ID: ${testLead2.id}`);
  console.log(`  → Stored branchId: ${testLead2.branchId} (expected null)`);
  console.log(`  → Stored customBranchText: "${testLead2.customBranchText}"`);
  if (testLead2.branchId !== null || testLead2.customBranchText !== 'Robotics & Automation') {
    throw new Error('Custom branch lead mismatch');
  }
  console.log('  ✔ Lead with custom "Other" branch verified');

  // Clean up test leads
  await prisma.lead.deleteMany({
    where: { id: { in: [testLead1.id, testLead2.id] } },
  });
  console.log('\nCleaned up ephemeral test leads.');

  console.log('\n====================================================');
  console.log('🎉 ALL END-TO-END FLOW TESTS COMPLETED SUCCESSFULLY!');
  console.log('====================================================\n');
}

runE2ETests()
  .catch((err) => {
    console.error('❌ E2E test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
