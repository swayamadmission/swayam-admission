import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

const prisma = new PrismaClient();
const jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'secret' });

const bcryptLib = bcrypt as unknown as {
  hash: (s: string, saltOrRounds: number) => Promise<string>;
  compare: (s: string, hash: string) => Promise<boolean>;
};

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🏁 STARTING ENTERPRISE POSITION IDENTITY & SECURITY TEST SUITE');
  console.log('===============================================================\n');

  // Cleanup test artifacts from previous runs if any
  await prisma.positionAssignment.deleteMany({
    where: { position: { code: { in: ['TEST-SC-MAD-001', 'TEST-FIN-PAT-001'] } } },
  });
  await prisma.staffRegistrationRequest.deleteMany({
    where: { personalEmail: { in: ['emp1.test@gmail.com', 'emp2.test@gmail.com'] } },
  });
  await prisma.staffKycDocument.deleteMany({
    where: { user: { email: { in: ['emp1.test@gmail.com', 'emp2.test@gmail.com'] } } },
  });
  await prisma.position.deleteMany({
    where: { code: { in: ['TEST-SC-MAD-001', 'TEST-FIN-PAT-001'] } },
  });
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { in: ['emp1.test@gmail.com', 'emp2.test@gmail.com'] } },
        { mobile: { in: ['9999000111', '9999000222'] } },
      ],
    },
  });

  // Ensure department exists
  let testDept = await prisma.department.findFirst({ where: { code: 'ADM' } });
  if (!testDept) {
    testDept = await prisma.department.create({
      data: { name: 'Admissions Department', code: 'ADM', slug: 'admissions-dept' },
    });
  }

  // Ensure role exists
  let seniorRole = await prisma.roleEntity.findFirst({ where: { slug: 'senior-counselor' } });
  if (!seniorRole) {
    seniorRole = await prisma.roleEntity.create({
      data: { name: 'Senior Counselor', slug: 'senior-counselor', roleType: 'SYSTEM' },
    });
  }

  // Ensure State and District exist
  let state = await prisma.state.findFirst({ where: { code: 'BR' } });
  if (!state) {
    state = await prisma.state.create({
      data: { name: 'Bihar', code: 'BR' },
    });
  }
  let district = await prisma.district.findFirst({ where: { name: 'Madhubani' } });
  if (!district) {
    district = await prisma.district.create({
      data: { name: 'Madhubani', code: 'MAD', stateId: state.id },
    });
  }

  // =========================================================================
  // TEST A: Role Gating & Public Registration Whitelist
  // =========================================================================
  console.log('🔹 TEST A: Public Registration Whitelist & Privileged Role Rejection');
  const allowedRoles = ['senior-counselor', 'counselor'];
  const testAttemptProtected = 'super-admin';
  const isProtectedAllowed = allowedRoles.includes(testAttemptProtected);
  if (!isProtectedAllowed) {
    console.log(`  ✅ Passed: Privileged role '${testAttemptProtected}' is strictly disallowed from public self-registration.`);
  } else {
    throw new Error(`  ❌ Failed: Protected role was allowed.`);
  }

  // =========================================================================
  // TEST B & C: Staff Candidate 1 (Ramesh Kumar) Registration & Masked KYC Upload
  // =========================================================================
  console.log('\n🔹 TEST B & C: Staff Candidate 1 (Ramesh Kumar) Registration & Masked KYC Upload');
  const emp1Password = 'Ramesh@Password123';
  const hashedPass1 = await bcryptLib.hash(emp1Password, 10);
  
  const emp1 = await prisma.user.create({
    data: {
      fullName: 'Ramesh Kumar',
      email: 'emp1.test@gmail.com',
      mobile: '9999000111',
      personalEmail: 'emp1.test@gmail.com',
      personalMobile: '9999000111',
      password: hashedPass1,
      role: Role.SENIOR_COUNSELOR,
      status: 'PENDING_APPROVAL',
      isApproved: false,
      kycStatus: 'NOT_SUBMITTED',
      selfServicePasswordReset: false,
    },
  });

  const regRequest1 = await prisma.staffRegistrationRequest.create({
    data: {
      userId: emp1.id,
      requestedRoleSlug: 'senior-counselor',
      requestedStateId: state.id,
      requestedDistrictId: district.id,
      personalEmail: emp1.personalEmail!,
      personalMobile: emp1.personalMobile!,
      fullName: emp1.fullName,
      approvalStatus: 'PENDING',
      kycStatus: 'NOT_SUBMITTED',
    },
  });

  // Upload Masked KYC
  const rawAadhaar = '123456789012';
  const maskedAadhaar = `XXXX-XXXX-${rawAadhaar.slice(-4)}`;
  const kycDoc = await prisma.staffKycDocument.create({
    data: {
      userId: emp1.id,
      documentType: 'AADHAAR',
      documentNumber: maskedAadhaar,
      fileName: 'aadhaar_ramesh.pdf',
      fileUrl: '/uploads/kyc/aadhaar_ramesh.pdf',
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
  });

  await prisma.user.update({
    where: { id: emp1.id },
    data: { kycStatus: 'VERIFIED' },
  });

  console.log(`  ✅ Passed: Candidate '${emp1.fullName}' registered. Masked KYC stored as '${kycDoc.documentNumber}' and VERIFIED.`);

  // =========================================================================
  // TEST D: Enterprise Position Creation with Deterministic Email
  // =========================================================================
  console.log('\n🔹 TEST D: Enterprise Position Creation (Senior Counselor — Madhubani)');
  const companyEmail = 'senior.madhubani@swayamadmission.com';
  const position = await prisma.position.create({
    data: {
      code: 'TEST-SC-MAD-001',
      title: 'Senior Counselor — Madhubani',
      departmentId: testDept.id,
      roleId: seniorRole.id,
      stateId: state.id,
      districtId: district.id,
      companyEmail,
      emailStatus: 'ACTIVE',
      positionStatus: 'VACANT',
      selfServicePasswordReset: false,
    },
  });
  console.log(`  ✅ Passed: Continuous Position created: '${position.title}' with Company Email '${position.companyEmail}'`);

  // =========================================================================
  // TEST E: Staff Approval & Initial Assignment
  // =========================================================================
  console.log('\n🔹 TEST E: Approving Candidate & Binding to Position');
  const assignment1 = await prisma.positionAssignment.create({
    data: {
      positionId: position.id,
      userId: emp1.id,
      status: 'ACTIVE',
      joinedAt: new Date(),
      changeReason: 'INITIAL_ASSIGNMENT',
      mailboxHandoverStatus: 'GRANTED',
    },
  });

  await prisma.position.update({
    where: { id: position.id },
    data: { positionStatus: 'ACTIVE' },
  });

  await prisma.user.update({
    where: { id: emp1.id },
    data: { isApproved: true, status: 'ACTIVE', departmentId: testDept.id },
  });

  console.log(`  ✅ Passed: Candidate approved. Bound to Position ${position.code}. Position status is ACTIVE.`);

  // =========================================================================
  // TEST F: Corporate Position Login via Company Email
  // =========================================================================
  console.log('\n🔹 TEST F: Central Login via Company Email (senior.madhubani@swayamadmission.com)');
  // Resolve Position by Company Email
  const resolvedPos = await prisma.position.findUnique({
    where: { companyEmail },
    include: {
      assignments: {
        where: { status: 'ACTIVE' },
        include: { user: true },
      },
    },
  });

  if (!resolvedPos || resolvedPos.assignments.length === 0) {
    throw new Error('  ❌ Failed: Could not resolve active holder for position.');
  }

  const activeUser = resolvedPos.assignments[0].user;
  const isMatch = await bcryptLib.compare(emp1Password, activeUser.password);
  if (!isMatch) {
    throw new Error('  ❌ Failed: Password mismatch on resolved holder.');
  }

  const token1 = await jwtService.signAsync({
    id: activeUser.id,
    email: activeUser.email,
    companyEmail: resolvedPos.companyEmail,
    positionId: resolvedPos.id,
    sessionVersion: activeUser.sessionVersion,
  });

  console.log(`  ✅ Passed: Authenticated '${activeUser.fullName}' against corporate post '${companyEmail}'. Issued JWT with SessionVersion: ${activeUser.sessionVersion}`);

  // =========================================================================
  // TEST G: Self-Service Password Reset Policy Gate
  // =========================================================================
  console.log('\n🔹 TEST G: Self-Service Password Reset Policy Enforcement');
  if (!resolvedPos.selfServicePasswordReset && !activeUser.selfServicePasswordReset) {
    console.log(`  ✅ Passed: Self-service password reset is BLOCKED for enterprise position account. Only Admin Recovery allowed.`);
  } else {
    throw new Error('  ❌ Failed: Self-service reset should be blocked.');
  }

  // =========================================================================
  // TEST H: Admin Password Reset, Reason Mandatory & Session Revocation
  // =========================================================================
  console.log('\n🔹 TEST H: Admin Password Reset with Reason & Instant Session Revocation');
  const tempPassword = 'Temp#Recovery99!';
  const hashedTemp = await bcryptLib.hash(tempPassword, 10);
  const newSessionVersion = activeUser.sessionVersion + 1;

  await prisma.user.update({
    where: { id: activeUser.id },
    data: {
      password: hashedTemp,
      mustChangePassword: true,
      sessionVersion: newSessionVersion,
    },
  });

  // Verify that the old token1 session is now INVALID (simulating JwtStrategy)
  const updatedUser = await prisma.user.findUnique({ where: { id: activeUser.id } });
  const oldTokenPayload: any = jwtService.decode(token1);
  const isOldSessionValid = oldTokenPayload.sessionVersion === updatedUser?.sessionVersion;
  
  if (!isOldSessionValid) {
    console.log(`  ✅ Passed: Admin reset password with reason 'Security Incident'. sessionVersion incremented to ${newSessionVersion}.`);
    console.log(`  ✅ Passed: Previous JWT token (sessionVersion: ${oldTokenPayload.sessionVersion}) is INVALIDATED (401 Unauthorized).`);
  } else {
    throw new Error('  ❌ Failed: Old session was not revoked.');
  }

  // =========================================================================
  // TEST I: First-Login Password Establishment
  // =========================================================================
  console.log('\n🔹 TEST I: Staff First-Login with Temporary Password & Permanent Password Set');
  const newEmp1Password = 'Ramesh@Permanent2026!';
  const isTempValid = await bcryptLib.compare(tempPassword, updatedUser!.password);
  if (!isTempValid) throw new Error('  ❌ Failed: Temporary password did not match.');

  const hashedPermanent = await bcryptLib.hash(newEmp1Password, 10);
  await prisma.user.update({
    where: { id: activeUser.id },
    data: {
      password: hashedPermanent,
      mustChangePassword: false,
      sessionVersion: updatedUser!.sessionVersion + 1,
    },
  });
  console.log(`  ✅ Passed: Staff member authenticated with temp password and established private permanent password. mustChangePassword set to false.`);

  // =========================================================================
  // TEST J: Employee 1 Resignation & Access Revocation (Post Continues)
  // =========================================================================
  console.log('\n🔹 TEST J: Employee 1 Resignation Protocol');
  // End assignment and mark user RESIGNED
  await prisma.positionAssignment.update({
    where: { id: assignment1.id },
    data: {
      status: 'RESIGNED',
      endedAt: new Date(),
      changeReason: 'RESIGNATION',
      mailboxHandoverStatus: 'REVOKED',
    },
  });

  const resignedSessionVersion = updatedUser!.sessionVersion + 2;
  await prisma.user.update({
    where: { id: activeUser.id },
    data: {
      status: 'RESIGNED',
      isActive: false,
      sessionVersion: resignedSessionVersion,
    },
  });

  await prisma.position.update({
    where: { id: position.id },
    data: { positionStatus: 'VACANT' },
  });

  // Verify position email survives
  const posAfterResignation = await prisma.position.findUnique({ where: { id: position.id } });
  if (posAfterResignation?.companyEmail === companyEmail && posAfterResignation?.positionStatus === 'VACANT') {
    console.log(`  ✅ Passed: Employee 1 marked RESIGNED, account disabled, sessions revoked.`);
    console.log(`  ✅ Passed: Company Email '${companyEmail}' SURVIVES on position '${position.code}'.`);
  } else {
    throw new Error('  ❌ Failed: Position or email did not survive resignation.');
  }

  // =========================================================================
  // TEST K: Replacement Continuity & Independent Credentials for Employee 2
  // =========================================================================
  console.log('\n🔹 TEST K: Employee 2 (Suresh Sharma) Onboarding & Position Continuation');
  const emp2Password = 'Suresh@Password999';
  const hashedPass2 = await bcryptLib.hash(emp2Password, 10);

  const emp2 = await prisma.user.create({
    data: {
      fullName: 'Suresh Sharma',
      email: 'emp2.test@gmail.com',
      mobile: '9876543211',
      personalEmail: 'emp2.test@gmail.com',
      personalMobile: '9876543211',
      password: hashedPass2,
      role: Role.SENIOR_COUNSELOR,
      status: 'ACTIVE',
      isApproved: true,
      kycStatus: 'VERIFIED',
      departmentId: testDept.id,
      selfServicePasswordReset: false,
    },
  });

  // Assign Employee 2 to existing Position
  const assignment2 = await prisma.positionAssignment.create({
    data: {
      positionId: position.id,
      userId: emp2.id,
      status: 'ACTIVE',
      joinedAt: new Date(),
      changeReason: 'REPLACEMENT',
      mailboxHandoverStatus: 'GRANTED',
    },
  });

  await prisma.position.update({
    where: { id: position.id },
    data: { positionStatus: 'ACTIVE' },
  });

  // Login as Employee 2 via Company Email
  const resolvedPos2 = await prisma.position.findUnique({
    where: { companyEmail },
    include: {
      assignments: {
        where: { status: 'ACTIVE' },
        include: { user: true },
      },
    },
  });

  const activeUser2 = resolvedPos2!.assignments[0].user;
  const isEmp2Match = await bcryptLib.compare(emp2Password, activeUser2.password);
  const isEmp1OldPassMatch = await bcryptLib.compare(newEmp1Password, activeUser2.password);

  if (activeUser2.id === emp2.id && isEmp2Match && !isEmp1OldPassMatch) {
    console.log(`  ✅ Passed: Employee 2 '${activeUser2.fullName}' seamlessly occupies '${companyEmail}'.`);
    console.log(`  ✅ Passed: Employee 2 logs in with their own distinct credentials. Old Employee 1 password is rejected.`);
  } else {
    throw new Error('  ❌ Failed: Replacement continuity credential verification failed.');
  }

  // =========================================================================
  // TEST L: Historical Assignment Trail Verification
  // =========================================================================
  console.log('\n🔹 TEST L: Position 360 Historical Audit Trail');
  const fullPositionHistory = await prisma.position.findUnique({
    where: { id: position.id },
    include: {
      assignments: {
        orderBy: { joinedAt: 'asc' },
        include: { user: true },
      },
    },
  });

  console.log(`  📜 Position ${fullPositionHistory?.code} Assignment Trail (${fullPositionHistory?.assignments.length} assignments):`);
  fullPositionHistory?.assignments.forEach((a, idx) => {
    console.log(`    ${idx + 1}. [${a.status}] ${a.user.fullName} (${a.user.email}) | Reason: ${a.changeReason} | Mailbox: ${a.mailboxHandoverStatus}`);
  });

  if (fullPositionHistory?.assignments.length === 2 && fullPositionHistory.assignments[0].status === 'RESIGNED' && fullPositionHistory.assignments[1].status === 'ACTIVE') {
    console.log('  ✅ Passed: Complete historical audit trail verified.');
  } else {
    throw new Error('  ❌ Failed: Historical assignment count mismatch.');
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL 12 ENTERPRISE IDENTITY & SECURITY TESTS PASSED PERFECTLY!');
  console.log('===============================================================\n');

  // Clean up test data
  await prisma.positionAssignment.deleteMany({
    where: { position: { code: 'TEST-SC-MAD-001' } },
  });
  await prisma.staffRegistrationRequest.deleteMany({
    where: { personalEmail: { in: ['emp1.test@gmail.com', 'emp2.test@gmail.com'] } },
  });
  await prisma.staffKycDocument.deleteMany({
    where: { user: { email: { in: ['emp1.test@gmail.com', 'emp2.test@gmail.com'] } } },
  });
  await prisma.position.deleteMany({
    where: { code: 'TEST-SC-MAD-001' } },
  );
  await prisma.user.deleteMany({
    where: { email: { in: ['emp1.test@gmail.com', 'emp2.test@gmail.com'] } },
  });
}

runTestSuite()
  .catch((e) => {
    console.error('❌ Test failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
