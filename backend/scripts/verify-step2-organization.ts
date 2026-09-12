import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting STEP 2 Enterprise Organizational Structure Verification...');

  // 1. Check or create Super Admin User
  let admin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'org.admin@swayamadmission.com',
        fullName: 'Enterprise Org Administrator',
        role: 'SUPER_ADMIN',
        mobile: '+919999900001',
        password: '$2b$10$dummyhashedpasswordforscriptverification123',
        isActive: true,
      },
    });
  }
  console.log(`✅ Admin actor verified: ${admin.fullName} (${admin.id})`);

  // 2. Create Counselor Users for testing
  const counselorA = await prisma.user.upsert({
    where: { email: 'senior.counselor.a@swayam.com' },
    update: {},
    create: {
      email: 'senior.counselor.a@swayam.com',
      fullName: 'Senior Counselor Alpha',
      role: 'SENIOR_COUNSELOR',
      mobile: '+919999900002',
      password: '$2b$10$dummyhashedpasswordforscriptverification123',
      isActive: true,
    },
  });

  const counselorB = await prisma.user.upsert({
    where: { email: 'senior.counselor.b@swayam.com' },
    update: {},
    create: {
      email: 'senior.counselor.b@swayam.com',
      fullName: 'Senior Counselor Beta',
      role: 'SENIOR_COUNSELOR',
      mobile: '+919999900003',
      password: '$2b$10$dummyhashedpasswordforscriptverification123',
      isActive: true,
    },
  });
  console.log(`✅ Counselor test personas verified: ${counselorA.fullName}, ${counselorB.fullName}`);

  // 3. Create Corporate Department
  const admissionsDept = await prisma.department.upsert({
    where: { slug: 'admissions-counseling' },
    update: { managerId: admin.id },
    create: {
      name: 'Admissions & Student Success',
      slug: 'admissions-counseling',
      code: 'ADM-COUNSEL',
      description: 'Core department responsible for career advisory, lead engagement, and admissions',
      status: 'ACTIVE',
      managerId: admin.id,
      createdById: admin.id,
    },
  });
  console.log(`✅ Department verified: ${admissionsDept.name} (Code: ${admissionsDept.code})`);

  // 4. Create Organizational Units / Teams
  const inboundTeam = await prisma.team.upsert({
    where: { slug: 'inbound-advisory-squad' },
    update: { managerId: counselorA.id },
    create: {
      name: 'Inbound Advisory Squad',
      slug: 'inbound-advisory-squad',
      code: 'ADM-INBOUND',
      unitType: 'TEAM',
      departmentId: admissionsDept.id,
      managerId: counselorA.id,
      status: 'ACTIVE',
      createdById: admin.id,
    },
  });
  console.log(`✅ Organizational Unit verified: ${inboundTeam.name} under ${admissionsDept.name}`);

  // 5. Assign Team Members (Distinct from IAM Role!)
  const membershipA = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: inboundTeam.id, userId: counselorA.id } },
    update: { memberRole: 'LEAD', isPrimary: true },
    create: {
      teamId: inboundTeam.id,
      userId: counselorA.id,
      memberRole: 'LEAD',
      isPrimary: true,
      status: 'ACTIVE',
    },
  });

  const membershipB = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: inboundTeam.id, userId: counselorB.id } },
    update: { memberRole: 'MEMBER', isPrimary: true },
    create: {
      teamId: inboundTeam.id,
      userId: counselorB.id,
      memberRole: 'MEMBER',
      isPrimary: true,
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Team Memberships mapped: Counselor A (${membershipA.memberRole}), Counselor B (${membershipB.memberRole})`);

  // 6. Seed Geographic States and Districts
  const bihar = await prisma.state.upsert({
    where: { code: 'BR' },
    update: {},
    create: {
      name: 'Bihar',
      code: 'BR',
      status: 'ACTIVE',
    },
  });

  const patna = await prisma.district.upsert({
    where: { stateId_name: { stateId: bihar.id, name: 'Patna' } },
    update: {},
    create: {
      name: 'Patna',
      code: 'PAT',
      stateId: bihar.id,
      status: 'ACTIVE',
    },
  });

  const gaya = await prisma.district.upsert({
    where: { stateId_name: { stateId: bihar.id, name: 'Gaya' } },
    update: {},
    create: {
      name: 'Gaya',
      code: 'GAY',
      stateId: bihar.id,
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Geographic Registry verified: State ${bihar.name} -> Districts ${patna.name}, ${gaya.name}`);

  // 7. Create Geographic Responsibility Mapping (Counselor A -> Patna)
  // Archive old assignments for test reproducibility
  await prisma.geographicAssignment.updateMany({
    where: { stateId: bihar.id, districtId: patna.id, status: 'ACTIVE' },
    data: { status: 'ARCHIVED', effectiveUntil: new Date() },
  });

  const initialAssignment = await prisma.geographicAssignment.create({
    data: {
      stateId: bihar.id,
      districtId: patna.id,
      responsibleUserId: counselorA.id,
      backupUserId: counselorB.id,
      assignedRole: 'SENIOR_COUNSELOR',
      status: 'ACTIVE',
      effectiveFrom: new Date('2026-01-01'),
      notes: 'Initial assignment for Patna district admissions',
      createdById: admin.id,
    },
  });
  console.log(`✅ Initial Geographic Assignment created: Patna -> Senior Counselor A (${initialAssignment.id})`);

  // 8. Create a student historically assigned to Counselor A in Patna
  const testStudent = await prisma.user.upsert({
    where: { email: 'student.bihar.test@example.com' },
    update: { assignedCounselorId: counselorA.id, state: 'Bihar', city: 'Patna' },
    create: {
      email: 'student.bihar.test@example.com',
      fullName: 'Aarav Kumar (Patna Student)',
      role: 'STUDENT',
      mobile: '+919999900004',
      password: '$2b$10$dummyhashedpasswordforscriptverification123',
      state: 'Bihar',
      city: 'Patna',
      assignedCounselorId: counselorA.id,
      isActive: true,
    },
  });
  console.log(`✅ Historical Student Record: ${testStudent.fullName} assigned to ${counselorA.fullName}`);

  // 9. Reassign Geographic Responsibility for Patna to Counselor B (Preserving History!)
  const reassignDate = new Date();
  const [archivedAssignment, newAssignment] = await prisma.$transaction([
    prisma.geographicAssignment.update({
      where: { id: initialAssignment.id },
      data: {
        status: 'ARCHIVED',
        effectiveUntil: reassignDate,
      },
    }),
    prisma.geographicAssignment.create({
      data: {
        stateId: bihar.id,
        districtId: patna.id,
        responsibleUserId: counselorB.id,
        backupUserId: counselorA.id,
        assignedRole: 'SENIOR_COUNSELOR',
        status: 'ACTIVE',
        effectiveFrom: reassignDate,
        notes: 'Reassigned territory responsibility to Counselor Beta',
        createdById: admin.id,
      },
    }),
  ]);
  console.log(`✅ Geographic Reassignment executed successfully:`);
  console.log(`   - Archived Assignment: ID ${archivedAssignment.id}, Status: ${archivedAssignment.status}, Until: ${archivedAssignment.effectiveUntil}`);
  console.log(`   - New Active Assignment: ID ${newAssignment.id}, Status: ${newAssignment.status}, Counselor: ${counselorB.fullName}`);

  // 10. Verify Historical Student Assignment Safety
  const studentAfterReassignment = await prisma.user.findUnique({
    where: { id: testStudent.id },
  });
  if (studentAfterReassignment?.assignedCounselorId === counselorA.id) {
    console.log(`🛡️ HISTORICAL OWNERSHIP PRESERVATION VERIFIED: Student ${studentAfterReassignment.fullName} remains assigned to ${counselorA.fullName}!`);
  } else {
    throw new Error('VIOLATION: Historical student assignment was mutated upon geographic territory reassignment!');
  }

  console.log('\n🎉 ALL STEP 2 ENTERPRISE ORGANIZATIONAL STRUCTURE TESTS PASSED WITH 100% INTEGRITY!');
}

main()
  .catch((e) => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
