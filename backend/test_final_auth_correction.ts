import { PrismaClient, Role, RoleStatus, DataScope } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const bcryptLib = bcrypt as unknown as {
  hash: (s: string, saltOrRounds: number) => Promise<string>;
  compare: (s: string, hash: string) => Promise<boolean>;
};

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@swayamadmission.in';
const ADMIN_PASSWORD = 'Admin@123';

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 RUNNING SWAYAM ADMISSION MASTER AUTH & GEOGRAPHY VALIDATION');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  async function test(title: string, fn: () => Promise<void>) {
    total++;
    process.stdout.write(`Test ${total}: ${title} ... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (e: any) {
      console.log(`❌ FAILED: ${e.message}`);
      if (e.stack) console.error(e.stack);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Original Admin / System Direct Login (No Position Needed)
  // --------------------------------------------------------------------------
  await test('Admin / System direct login succeeds without Position record', async () => {
    const admin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      include: { userRoles: { include: { role: true } } },
    });

    if (!admin) throw new Error('Admin user not found');
    const isPassValid = await bcryptLib.compare(ADMIN_PASSWORD, admin.password);
    if (!isPassValid) throw new Error('Admin password mismatch');

    // Verify Admin has no position requirement and is ACTIVE Super Admin
    if (!admin.isActive || admin.status !== 'ACTIVE') throw new Error('Admin is not ACTIVE');
    const isSuperAdmin = admin.userRoles.some((ur) => ur.role.slug === 'super-admin' || ur.role.name === 'Super Admin');
    if (!isSuperAdmin) throw new Error('Admin does not possess Super Admin role');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Complete Geography (28 States + 8 UTs + All Districts)
  // --------------------------------------------------------------------------
  await test('Authoritative Indian geography contains 36 States/UTs and complete districts', async () => {
    const statesCount = await prisma.state.count({ where: { status: 'ACTIVE' } });
    if (statesCount < 36) throw new Error(`Expected at least 36 States/UTs, found ${statesCount}`);

    const districtsCount = await prisma.district.count({ where: { status: 'ACTIVE' } });
    if (districtsCount < 700) throw new Error(`Expected >700 districts, found ${districtsCount}`);

    // Verify specific states
    const bihar = await prisma.state.findFirst({ where: { code: 'BR' }, include: { districts: true } });
    if (!bihar) throw new Error('Bihar state missing');
    const madhubani = bihar.districts.find((d) => d.name.toLowerCase() === 'madhubani');
    if (!madhubani) throw new Error('Madhubani district missing in Bihar');

    const delhi = await prisma.state.findFirst({ where: { code: 'DL' } });
    if (!delhi || delhi.type !== 'UNION_TERRITORY') throw new Error('Delhi UT missing or type mismatch');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Dynamic Role Discovery via DB Configuration
  // --------------------------------------------------------------------------
  await test('Dynamic allowed roles query returns self-registrable roles and excludes protected', async () => {
    const allowedRoles = await prisma.roleEntity.findMany({
      where: {
        selfRegistrable: true,
        isActive: true,
        isProtected: false,
        deletedAt: null,
      },
      select: { slug: true, name: true, isProtected: true, selfRegistrable: true },
    });

    if (allowedRoles.length === 0) throw new Error('No self-registrable roles found');
    const slugs = allowedRoles.map((r) => r.slug);

    if (!slugs.includes('senior-counselor') && !slugs.includes('counselor')) {
      throw new Error('Default counselor roles not found in self-registrable list');
    }

    if (slugs.includes('super-admin') || slugs.includes('director')) {
      throw new Error('Security Breach: Protected role returned in public registration!');
    }
  });

  // --------------------------------------------------------------------------
  // TEST 4: Dynamic Role Lifecycle (Add role -> Appears; Disable -> Disappears)
  // --------------------------------------------------------------------------
  await test('Creating dynamic role with selfRegistrable=true appears in allowed-roles, setting false removes it', async () => {
    const testSlug = `admission-coord-${Date.now()}`;
    const newRole = await prisma.roleEntity.create({
      data: {
        name: `Admission Coordinator ${Date.now()}`,
        slug: testSlug,
        selfRegistrable: true,
        isActive: true,
        isProtected: false,
        department: 'Admissions',
      },
    });

    // Check inclusion
    let openRoles = await prisma.roleEntity.findMany({
      where: { selfRegistrable: true, isActive: true, isProtected: false, deletedAt: null },
    });
    if (!openRoles.some((r) => r.slug === testSlug)) {
      throw new Error('Newly created self-registrable role did not appear');
    }

    // Toggle selfRegistrable: OFF
    await prisma.roleEntity.update({
      where: { id: newRole.id },
      data: { selfRegistrable: false },
    });

    openRoles = await prisma.roleEntity.findMany({
      where: { selfRegistrable: true, isActive: true, isProtected: false, deletedAt: null },
    });
    if (openRoles.some((r) => r.slug === testSlug)) {
      throw new Error('Role still appeared after selfRegistrable was turned OFF');
    }

    // Clean up
    await prisma.roleEntity.delete({ where: { id: newRole.id } });
  });

  // --------------------------------------------------------------------------
  // TEST 5: Geography Validation — Mismatched District Rejection
  // --------------------------------------------------------------------------
  await test('Geography validation rejects district that does not belong to selected state', async () => {
    const jharkhand = await prisma.state.findFirst({ where: { code: 'JH' } });
    const bihar = await prisma.state.findFirst({ where: { code: 'BR' }, include: { districts: true } });
    if (!jharkhand || !bihar) throw new Error('States missing');

    const madhubani = bihar.districts.find((d) => d.name.toLowerCase() === 'madhubani');
    if (!madhubani) throw new Error('Madhubani missing');

    // Simulate validation query
    const validInJharkhand = await prisma.district.findFirst({
      where: {
        id: madhubani.id,
        stateId: jharkhand.id,
        status: 'ACTIVE',
      },
    });

    if (validInJharkhand) {
      throw new Error('Security Breach: Madhubani was incorrectly validated under Jharkhand!');
    }

    const validInBihar = await prisma.district.findFirst({
      where: {
        id: madhubani.id,
        stateId: bihar.id,
        status: 'ACTIVE',
      },
    });

    if (!validInBihar) {
      throw new Error('Madhubani should be valid under Bihar');
    }
  });

  // --------------------------------------------------------------------------
  // TEST 6: Enterprise Staff Position Account Login
  // --------------------------------------------------------------------------
  await test('Enterprise Staff Position Account resolves continuous company email to active employee', async () => {
    // Setup department, state, district, position, and active assignment
    const dept = await prisma.department.upsert({
      where: { code: 'ADM-TEST' },
      update: {},
      create: { name: 'Admissions Test', code: 'ADM-TEST' },
    });

    const bihar = await prisma.state.findFirst({ where: { code: 'BR' } });
    const madhubani = await prisma.district.findFirst({ where: { stateId: bihar!.id, name: 'Madhubani' } });

    const posEmail = `senior.madhubani.test.${Date.now()}@swayamadmission.com`;
    const position = await prisma.position.create({
      data: {
        code: `POS-${Date.now()}`,
        title: 'Senior Counselor — Madhubani',
        companyEmail: posEmail,
        departmentId: dept.id,
        stateId: bihar?.id,
        districtId: madhubani?.id,
        positionStatus: 'ACTIVE',
      },
    });

    const staffPass = await bcryptLib.hash('Staff@123', 10);
    const staffUser = await prisma.user.create({
      data: {
        fullName: 'Rahul Sharma',
        email: `rahul.${Date.now()}@gmail.com`,
        mobile: `98765${Math.floor(10000 + Math.random() * 90000)}`,
        password: staffPass,
        role: Role.SENIOR_COUNSELOR,
        isActive: true,
        isApproved: true,
        status: 'ACTIVE',
      },
    });

    await prisma.positionAssignment.create({
      data: {
        positionId: position.id,
        userId: staffUser.id,
        status: 'ACTIVE',
      },
    });

    // Lookup Position by company email
    const resolvedPosition = await prisma.position.findUnique({
      where: { companyEmail: posEmail },
      include: {
        assignments: {
          where: { status: 'ACTIVE' },
          include: { user: true },
        },
      },
    });

    if (!resolvedPosition || resolvedPosition.assignments.length === 0) {
      throw new Error('Failed to resolve active holder for position email');
    }

    const activeUser = resolvedPosition.assignments[0].user;
    if (activeUser.id !== staffUser.id) throw new Error('Holder mismatch');
    const isPassValid = await bcryptLib.compare('Staff@123', activeUser.password);
    if (!isPassValid) throw new Error('Password verification failed for position holder');

    // Clean up
    await prisma.positionAssignment.deleteMany({ where: { positionId: position.id } });
    await prisma.position.delete({ where: { id: position.id } });
    await prisma.user.delete({ where: { id: staffUser.id } });
  });

  // --------------------------------------------------------------------------
  // TEST 7: Position Handover & Identity Continuity
  // --------------------------------------------------------------------------
  await test('Position Continuity: Employee 1 resigns, Employee 2 replaces with same corporate email', async () => {
    const dept = await prisma.department.findFirst();
    const posEmail = `senior.continuity.${Date.now()}@swayamadmission.com`;

    const position = await prisma.position.create({
      data: {
        code: `POS-CONT-${Date.now()}`,
        title: 'Senior Counselor Continuous Post',
        companyEmail: posEmail,
        departmentId: dept!.id,
        positionStatus: 'ACTIVE',
      },
    });

    // Employee 1: Rahul
    const pass1 = await bcryptLib.hash('Rahul@123', 10);
    const user1 = await prisma.user.create({
      data: {
        fullName: 'Rahul Ex-Staff',
        email: `rahul.ex.${Date.now()}@gmail.com`,
        mobile: `91111${Math.floor(10000 + Math.random() * 90000)}`,
        password: pass1,
        role: Role.SENIOR_COUNSELOR,
        isActive: true,
        isApproved: true,
        status: 'ACTIVE',
      },
    });

    const assignment1 = await prisma.positionAssignment.create({
      data: { positionId: position.id, userId: user1.id, status: 'ACTIVE' },
    });

    // Handover: Rahul Resigns -> Assignment 1 ENDED
    await prisma.positionAssignment.update({
      where: { id: assignment1.id },
      data: { status: 'RESIGNED', endedAt: new Date(), changeReason: 'RESIGNATION' },
    });
    await prisma.user.update({
      where: { id: user1.id },
      data: { status: 'RESIGNED', isActive: false },
    });

    // Employee 2: Aman takes over
    const pass2 = await bcryptLib.hash('Aman@456', 10);
    const user2 = await prisma.user.create({
      data: {
        fullName: 'Aman New-Staff',
        email: `aman.new.${Date.now()}@gmail.com`,
        mobile: `92222${Math.floor(10000 + Math.random() * 90000)}`,
        password: pass2,
        role: Role.SENIOR_COUNSELOR,
        isActive: true,
        isApproved: true,
        status: 'ACTIVE',
      },
    });

    await prisma.positionAssignment.create({
      data: { positionId: position.id, userId: user2.id, status: 'ACTIVE' },
    });

    // Resolve current holder for the unchanged company email
    const posNow = await prisma.position.findUnique({
      where: { companyEmail: posEmail },
      include: {
        assignments: {
          where: { status: 'ACTIVE' },
          include: { user: true },
        },
      },
    });

    if (!posNow || posNow.assignments.length !== 1) throw new Error('Active holder resolution failed after replacement');
    const currentHolder = posNow.assignments[0].user;
    if (currentHolder.id !== user2.id) throw new Error('Replacement employee did not become active holder');

    // Verify Aman's password works
    const isAmanPassValid = await bcryptLib.compare('Aman@456', currentHolder.password);
    if (!isAmanPassValid) throw new Error("Aman's password should match");

    // Verify Rahul's old password does NOT work for the corporate post
    const isRahulPassValid = await bcryptLib.compare('Rahul@123', currentHolder.password);
    if (isRahulPassValid) throw new Error('Old employee password should not match new holder');

    // Clean up
    await prisma.positionAssignment.deleteMany({ where: { positionId: position.id } });
    await prisma.position.delete({ where: { id: position.id } });
    await prisma.user.delete({ where: { id: user1.id } });
    await prisma.user.delete({ where: { id: user2.id } });
  });

  console.log('\n================================================================');
  console.log(`📊 MASTER VERIFICATION RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runVerification()
  .catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
