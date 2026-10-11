import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RolesService } from '../src/roles/roles.service';
import { GovernanceService } from '../src/roles/governance.service';
import { DataScopeService } from '../src/auth/data-scope.service';
import { AuthorizationService } from '../src/auth/authorization.service';
import { ALL_35_MODULES } from '../src/roles/seed-permissions';
import { RoleStatus } from '@prisma/client';

async function runRbacMasterVerification() {
  console.log('================================================================');
  console.log('🛡️ SWAYAM ADMISSION — ROLES & PERMISSIONS MASTER VERIFICATION');
  console.log('================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const prisma = app.get(PrismaService);
  const rolesService = app.get(RolesService);
  const governanceService = app.get(GovernanceService);
  const dataScopeService = app.get(DataScopeService);
  const authorizationService = app.get(AuthorizationService);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Verify all 35 modules are seeded in DB
    // -------------------------------------------------------------
    console.log('\n[1] Checking Permission Matrix & 35 Modules Seeding...');
    const dbPermissions = await prisma.permission.findMany();
    console.log(`    Total permissions in DB: ${dbPermissions.length}`);

    assert(dbPermissions.length >= 210, 'Database contains permissions for all modules (>= 210)');

    const dbModules = new Set(dbPermissions.map(p => p.module));
    let missingModules: string[] = [];
    for (const mod of ALL_35_MODULES) {
      if (!dbModules.has(mod.id)) {
        missingModules.push(mod.id);
      }
    }
    assert(missingModules.length === 0, 'All 35 modules exist in permissions database', missingModules.join(', '));

    // Verify all 6 actions exist
    const actions = new Set(dbPermissions.map(p => p.action));
    const expectedActions = ['view', 'create', 'edit', 'delete', 'export', 'approve'];
    const hasAllActions = expectedActions.every(a => actions.has(a));
    assert(hasAllActions, 'All 6 standard actions (view, create, edit, delete, export, approve) are present');

    // -------------------------------------------------------------
    // Test 2: Verify Authorization Service Alias Resolution
    // -------------------------------------------------------------
    console.log('\n[2] Checking Bidirectional Alias & Wildcard Resolution in AuthorizationService...');
    const userWithLeadsView = ['leads.view', 'staff-onboarding.approve', 'college-rankings.export'];
    assert(
      authorizationService.matchesPermission(userWithLeadsView, 'lead.view'),
      'Canonical alias matches: leads.view satisfies lead.view'
    );
    assert(
      authorizationService.matchesPermission(userWithLeadsView, 'staff.onboard.approve'),
      'Hyphen/dot alias matches: staff-onboarding.approve satisfies staff.onboard.approve'
    );
    assert(
      authorizationService.matchesPermission(userWithLeadsView, 'rankings.export'),
      'Rankings alias matches: college-rankings.export satisfies rankings.export'
    );

    // -------------------------------------------------------------
    // Test 3: Get or create test users
    // -------------------------------------------------------------
    console.log('\n[3] Setting up test admin users...');
    let admin1 = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!admin1) {
      admin1 = await prisma.user.create({
        data: {
          fullName: 'Test Super Admin 1',
          email: 'test.admin1.rbac@swayam.test',
          role: 'SUPER_ADMIN',
        },
      });
    }

    let admin2 = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN', id: { not: admin1.id } },
    });
    if (!admin2) {
      admin2 = await prisma.user.create({
        data: {
          fullName: 'Test Super Admin 2',
          email: 'test.admin2.rbac@swayam.test',
          role: 'SUPER_ADMIN',
        },
      });
    }
    console.log(`    Admin 1: ${admin1.fullName} (${admin1.id})`);
    console.log(`    Admin 2: ${admin2.fullName} (${admin2.id})`);

    // Clean up any lingering test roles from previous runs
    const testRoleNames = ['Regional Director Test', 'Senior Counselor Test', 'Protected Academic Officer', 'Invalid Senior Child'];
    const existingTestRoles = await prisma.roleEntity.findMany({
      where: { name: { in: testRoleNames } },
      select: { id: true },
    });
    const existingTestRoleIds = existingTestRoles.map(r => r.id);
    if (existingTestRoleIds.length > 0) {
      await prisma.roleAuditLog.deleteMany({ where: { roleId: { in: existingTestRoleIds } } });
      await prisma.governanceRequest.deleteMany({ where: { targetRoleId: { in: existingTestRoleIds } } });
      await prisma.rolePermission.deleteMany({ where: { roleId: { in: existingTestRoleIds } } });
      await prisma.userRole.deleteMany({ where: { roleId: { in: existingTestRoleIds } } });
      await prisma.roleEntity.deleteMany({ where: { id: { in: existingTestRoleIds } } });
    }

    // -------------------------------------------------------------
    // Test 4: Role Creation with Validation & Parent Level Rules
    // -------------------------------------------------------------
    console.log('\n[4] Testing Role Creation & Level/Hierarchy Validation...');
    const parentRole = await rolesService.createRole(
      {
        name: 'Regional Director Test',
        department: 'Admissions',
        level: 2,
        priority: 80,
        dataScope: 'REGION' as any,
        isProtected: false,
      },
      admin1.id
    );
    assert(parentRole.name === 'Regional Director Test', 'Parent role created successfully');

    // Child with higher authority than parent should be rejected
    let childErrorCaught = false;
    try {
      await rolesService.createRole(
        {
          name: 'Invalid Senior Child',
          department: 'Admissions',
          parentRoleId: parentRole.id,
          level: 1, // level 1 is higher authority than level 2
        },
        admin1.id
      );
    } catch (e: any) {
      childErrorCaught = true;
    }
    assert(childErrorCaught, 'Child role with higher authority than parent is rejected (Level 1 < Level 2)');

    // Child with valid level
    const childRole = await rolesService.createRole(
      {
        name: 'Senior Counselor Test',
        department: 'Admissions',
        parentRoleId: parentRole.id,
        level: 4,
        dataScope: 'STATE' as any,
        permissionsMatrix: {
          leads: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
          applications: { view: true, create: true, edit: true, delete: false, export: false, approve: true },
        },
      },
      admin1.id,
    );
    assert(
      (childRole as any).parentRoleId === parentRole.id,
      'Valid child role created with parent inheritance link',
    );

    // Verify formatted permissions map returned by rolesService
    const childRoleDetail = await rolesService.findOne(childRole.id);
    assert(
      childRoleDetail.permissions?.leads?.view === true && childRoleDetail.permissions?.leads?.export === true,
      'Direct permissions matrix persisted and formatted properly in rolesService'
    );

    // -------------------------------------------------------------
    // Test 5: Circular Hierarchy Prevention
    // -------------------------------------------------------------
    console.log('\n[5] Testing Circular Hierarchy Cycle Prevention...');
    let cycleErrorCaught = false;
    try {
      // Attempting to make parent point to child
      await rolesService.reparentRole(parentRole.id, childRole.id);
    } catch (e: any) {
      cycleErrorCaught = true;
    }
    assert(cycleErrorCaught, 'Reparenting role to its own child/descendant is strictly prevented');

    // -------------------------------------------------------------
    // Test 6: Permissions Matrix Update
    // -------------------------------------------------------------
    console.log('\n[6] Testing Permissions Matrix Update (DB Persistence)...');
    await rolesService.updatePermissionsMatrix(
      childRole.id,
      {
        students: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        documents: { view: true, create: false, edit: false, delete: false, export: false, approve: true },
      },
      admin1.id
    );

    const updatedChild = await rolesService.findOne(childRole.id);
    assert(
      updatedChild.permissions?.students?.export === true && updatedChild.permissions?.documents?.approve === true,
      'updatePermissionsMatrix successfully updated student.export and document.approve in DB'
    );

    // -------------------------------------------------------------
    // Test 7: Role Lifecycle: Disable, Lock, Archive, Restore
    // -------------------------------------------------------------
    console.log('\n[7] Testing Role Lifecycle (Disable, Lock, Archive, Restore)...');
    
    // Disable
    await rolesService.disableRole(childRole.id, admin1.id);
    let checkRole = await rolesService.findOne(childRole.id);
    assert(checkRole.status === RoleStatus.DISABLED, 'Role successfully disabled');

    // Restore from Disabled
    await rolesService.restoreRole(childRole.id, admin1.id, 'Re-enabling test role');
    checkRole = await rolesService.findOne(childRole.id);
    assert(checkRole.status === RoleStatus.ACTIVE, 'Role successfully restored to ACTIVE');

    // Lock with reason
    await rolesService.lockRole(childRole.id, admin1.id, 'Compromise test lockdown');
    checkRole = await rolesService.findOne(childRole.id);
    assert(
      checkRole.status === RoleStatus.LOCKED && checkRole.lockReason === 'Compromise test lockdown',
      'Role locked with reason and status LOCKED',
    );

    // Unlock
    await rolesService.unlockRole(childRole.id, admin1.id);
    checkRole = await rolesService.findOne(childRole.id);
    assert(checkRole.status === RoleStatus.ACTIVE, 'Role unlocked back to ACTIVE');

    // -------------------------------------------------------------
    // Test 8: User Role Assignment & Immediate Revocation
    // -------------------------------------------------------------
    console.log('\n[8] Testing User Role Assignment, Removal & Session Revocation...');
    const testStaffUser = await prisma.user.create({
      data: {
        fullName: 'Test Operational Counselor',
        email: `test.staff.${Date.now()}@swayam.test`,
        role: 'COUNSELOR',
      },
    });

    await rolesService.assignUserRole(childRole.id, testStaffUser.id, admin1.id);
    const assignedUserRoles = await prisma.userRole.findMany({
      where: { userId: testStaffUser.id, roleId: childRole.id },
    });
    assert(assignedUserRoles.length === 1, 'UserRole successfully created in database');

    await rolesService.removeUserRole(childRole.id, testStaffUser.id, admin1.id);
    const removedUserRoles = await prisma.userRole.findMany({
      where: { userId: testStaffUser.id, roleId: childRole.id },
    });
    assert(removedUserRoles.length === 0, 'UserRole successfully removed from database');

    // -------------------------------------------------------------
    // Test 9: Two-Person Governance Approval Workflow
    // -------------------------------------------------------------
    console.log('\n[9] Testing Two-Person Governance Rule & Approval Execution...');
    // Create protected role
    const protectedRole = await rolesService.createRole(
      {
        name: 'Protected Academic Officer',
        department: 'Academic',
        level: 3,
        isProtected: true,
      },
      admin1.id,
    );

    // Request mutation (Disable request)
    const govReq = await governanceService.createRequest(
      {
        actionType: 'ROLE_DISABLE',
        targetRoleId: protectedRole.id,
        reason: 'Scheduled maintenance of academic officer role',
      },
      admin1.id,
    );
    assert(govReq.status === 'PENDING', 'Governance request created with PENDING status');

    // Rule: Requester CANNOT approve their own request
    let selfApprovalBlocked = false;
    try {
      await rolesService.executeGovernanceApproval(govReq.id, admin1.id);
    } catch (e: any) {
      selfApprovalBlocked = true;
    }
    assert(selfApprovalBlocked, 'Two-Person Rule: Request creator cannot approve their own governance request');

    // Admin 2 approves
    await rolesService.executeGovernanceApproval(govReq.id, admin2.id);
    const completedReq = await prisma.governanceRequest.findUnique({ where: { id: govReq.id } });
    const disabledProtectedRole = await rolesService.findOne(protectedRole.id);
    assert(
      completedReq?.status === 'APPROVED' && disabledProtectedRole.status === RoleStatus.DISABLED,
      'Second administrator approved request and action ROLE_DISABLE was executed on protected role',
    );

    // -------------------------------------------------------------
    // Test 10: Data Scope Service State & Multiple District Filtering
    // -------------------------------------------------------------
    console.log('\n[10] Testing Senior Counselor Geographic Data Scopes...');
    
    // Assign counselor to state "Maharashtra" and districts "Pune, Mumbai Suburban"
    await prisma.counselorProfile.upsert({
      where: { userId: testStaffUser.id },
      create: {
        userId: testStaffUser.id,
        counselorId: `CNS-${Date.now()}`,
        state: 'Maharashtra',
        district: 'Pune, Mumbai Suburban',
      },
      update: {
        state: 'Maharashtra',
        district: 'Pune, Mumbai Suburban',
      },
    });

    const resolvedCtx = await dataScopeService.resolveDataScope(testStaffUser.id);
    assert(
      resolvedCtx.states.includes('Maharashtra'),
      'resolveDataScope extracts assigned state: Maharashtra',
    );
    assert(
      resolvedCtx.districts.includes('Pune') && resolvedCtx.districts.includes('Mumbai Suburban'),
      'resolveDataScope extracts multiple districts (Pune, Mumbai Suburban)',
    );

    const stateContext: any = {
      userId: testStaffUser.id,
      dataScopes: ['STATE'],
      states: ['Maharashtra'],
      districts: ['Pune', 'Mumbai Suburban'],
      isSuperAdmin: false,
    };
    const leadStateFilter: any = dataScopeService.buildLeadScopeFilter(stateContext);
    assert(
      leadStateFilter.state?.in?.includes('Maharashtra'),
      'Lead scope filter enforces assigned state: Maharashtra for STATE scope',
    );

    const districtContext: any = {
      userId: testStaffUser.id,
      dataScopes: ['DISTRICT'],
      states: ['Maharashtra'],
      districts: ['Pune', 'Mumbai Suburban'],
      isSuperAdmin: false,
    };
    const districtFilter: any = dataScopeService.buildLeadScopeFilter(districtContext);
    assert(
      districtFilter.OR && districtFilter.OR.some((cond: any) => cond.district?.in?.includes('Pune')),
      'Lead scope filter enforces assigned multiple districts for DISTRICT scope',
    );

    // -------------------------------------------------------------
    // Test 11: Audit Trail Verification
    // -------------------------------------------------------------
    console.log('\n[11] Testing IAM Audit Trail Action Coverage...');
    const auditLogs = await prisma.roleAuditLog.findMany({
      where: {
        roleId: { in: [parentRole.id, childRole.id, protectedRole.id] },
      },
    });
    const loggedActions = new Set(auditLogs.map(a => a.action));
    console.log('    Recorded Audit Actions:', Array.from(loggedActions).join(', '));

    assert(loggedActions.has('ROLE_CREATED'), 'Audit logged: ROLE_CREATED');
    assert(loggedActions.has('PERMISSION_CHANGED'), 'Audit logged: PERMISSION_CHANGED');
    assert(loggedActions.has('ROLE_DISABLED'), 'Audit logged: ROLE_DISABLED');
    assert(loggedActions.has('ROLE_LOCKED'), 'Audit logged: ROLE_LOCKED');
    assert(loggedActions.has('ROLE_ASSIGNED'), 'Audit logged: ROLE_ASSIGNED');
    assert(loggedActions.has('ROLE_REMOVED'), 'Audit logged: ROLE_REMOVED');
    assert(loggedActions.has('APPROVAL_REQUESTED'), 'Audit logged: APPROVAL_REQUESTED');
    assert(loggedActions.has('APPROVED'), 'Audit logged: APPROVED');

    // Cleanup test artifacts from database
    console.log('\n[12] Cleaning up test data...');
    await prisma.roleAuditLog.deleteMany({
      where: { roleId: { in: [parentRole.id, childRole.id, protectedRole.id] } },
    });
    await prisma.governanceRequest.deleteMany({
      where: { targetRoleId: { in: [parentRole.id, childRole.id, protectedRole.id] } },
    });
    await prisma.rolePermission.deleteMany({
      where: { roleId: { in: [parentRole.id, childRole.id, protectedRole.id] } },
    });
    await prisma.userRole.deleteMany({
      where: { roleId: { in: [parentRole.id, childRole.id, protectedRole.id] } },
    });
    await prisma.roleEntity.deleteMany({
      where: { id: { in: [parentRole.id, childRole.id, protectedRole.id] } },
    });
    await prisma.user.delete({ where: { id: testStaffUser.id } });
    console.log('    Cleanup complete.');

    console.log('\n================================================================');
    console.log(`📊 FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    await app.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err: any) {
    console.error('Unhandled test failure:', err);
    await app.close();
    process.exit(1);
  }
}

runRbacMasterVerification();
