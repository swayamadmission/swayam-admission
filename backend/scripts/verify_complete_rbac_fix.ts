import { PrismaClient, DataScope, RoleStatus } from '@prisma/client';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { RolesService } from '../src/roles/roles.service';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { BlogController } from '../src/blog/blog.controller';
import { TestimonialsController } from '../src/testimonials/testimonials.controller';
import { PermissionGuard } from '../src/auth/guards/permission.guard';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('SWAYAM ADMISSION — COMPLETE RBAC & MODULES VERIFICATION');
  console.log('================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const rolesService = app.get(RolesService);
  const permissionGuard = app.get(PermissionGuard);

  const testRoleName = `QA-Enterprise-Role-${Date.now()}`;
  let createdRoleId: string | null = null;
  let testUserId: string | null = null;
  let restrictedRoleId: string | null = null;
  let restrictedUserId: string | null = null;

  try {
    // -------------------------------------------------------------
    // TEST 1: Create Enterprise Access Role (Basic + Perms + Scope + Governance)
    // -------------------------------------------------------------
    console.log('👉 [TEST 1] Creating Enterprise Access Role...');
    const createPayload = {
      name: testRoleName,
      description: 'Senior regional admissions director with CMS & Success Stories management',
      department: 'Admissions',
      level: 4,
      priority: 65,
      color: '#4A7B5B',
      dataScope: DataScope.STATE,
      states: ['Delhi', 'Maharashtra'],
      stateRestricted: true,
      isProtected: true,
      selfRegistrable: false,
      approvalRequired: true,
      permissionsMatrix: {
        guides: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          export: true,
          approve: true,
        },
        'success-stories': {
          view: true,
          create: true,
          edit: true,
          delete: true,
          export: true,
          approve: true,
        },
        leads: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          export: true,
          approve: false,
        },
      },
    };

    const role = await rolesService.createRole(createPayload as any);
    createdRoleId = role.id;
    console.log(`✅ [TEST 1 PASSED] Role created successfully with ID: ${role.id}, Name: ${role.name}`);

    // Verify DB records
    const dbRole = await prisma.roleEntity.findUnique({
      where: { id: role.id },
      include: {
        permissions: { include: { permission: true } },
        stateRestrictions: true,
      },
    });

    console.log(`   - DataScope: ${dbRole?.dataScope}`);
    console.log(`   - IsProtected: ${dbRole?.isProtected}`);
    console.log(`   - State Restrictions Count: ${dbRole?.stateRestrictions.length} (states: ${dbRole?.stateRestrictions.map(s => s.state).join(', ')})`);
    console.log(`   - Permissions Assigned Count: ${dbRole?.permissions.length}`);

    // Check specific permissions for guides and success-stories
    const guidePerms = dbRole?.permissions.map(p => p.permission.code).filter(c => c.startsWith('guides.') || c.startsWith('blogs.'));
    const successPerms = dbRole?.permissions.map(p => p.permission.code).filter(c => c.startsWith('success-stories.') || c.startsWith('testimonials.'));
    console.log(`   - Guides/CMS Permissions in DB:`, guidePerms);
    console.log(`   - Success Stories Permissions in DB:`, successPerms);

    if (!guidePerms?.length || !successPerms?.length) {
      throw new Error('Guides or Success Stories permissions were NOT saved in DB!');
    }

    // Verify Audit Log was created
    const auditLogs = await prisma.roleAuditLog.findMany({
      where: { roleId: role.id },
    });
    console.log(`   - Audit Trail Entries: ${auditLogs.length} (action: ${auditLogs[0]?.action})`);
    if (auditLogs.length === 0 || auditLogs[0].action !== 'ROLE_CREATED') {
      throw new Error('Audit trail entry for ROLE_CREATED missing!');
    }

    // -------------------------------------------------------------
    // TEST 2: Conflict & Validation Handling (No 500s)
    // -------------------------------------------------------------
    console.log('\n👉 [TEST 2] Duplicate & Validation Error Handling...');
    try {
      await rolesService.createRole({
        name: testRoleName,
        department: 'Admissions',
      } as any);
      throw new Error('FAIL: Should have rejected duplicate role name');
    } catch (err: any) {
      if (err instanceof ConflictException) {
        console.log(`✅ [TEST 2.1 PASSED] Duplicate active role rejected with 409 ConflictException: "${err.message}"`);
      } else {
        throw new Error(`Unexpected error type: ${err}`);
      }
    }

    // Test with archived role name
    const archivedRole = await prisma.roleEntity.findFirst({
      where: { deletedAt: { not: null } },
    });
    if (archivedRole) {
      try {
        await rolesService.createRole({
          name: archivedRole.name,
          department: 'Admissions',
        } as any);
        throw new Error('FAIL: Should have rejected archived role name');
      } catch (err: any) {
        if (err instanceof ConflictException) {
          console.log(`✅ [TEST 2.2 PASSED] Archived role name rejected with 409 ConflictException: "${err.message}"`);
        } else {
          throw new Error(`Unexpected error type: ${err}`);
        }
      }
    }

    // -------------------------------------------------------------
    // SETUP USERS FOR AUTHORIZATION TESTS
    // -------------------------------------------------------------
    // User A has Enterprise Role (with guides.* and success-stories.*)
    const testUser = await prisma.user.create({
      data: {
        email: `qa-user-full-${Date.now()}@swayam.test`,
        password: 'dummy-password-hash',
        fullName: 'QA User Full Perms',
        role: 'COUNSELOR',
      },
    });
    testUserId = testUser.id;
    await prisma.userRole.create({
      data: {
        userId: testUser.id,
        roleId: createdRoleId,
      },
    });

    // User B has a restricted role (only leads.view, NO guides, NO success-stories)
    const restrictedRole = await rolesService.createRole({
      name: `QA-Restricted-Role-${Date.now()}`,
      department: 'Admissions',
      permissionsMatrix: {
        leads: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
      },
    } as any);
    restrictedRoleId = restrictedRole.id;

    const restrictedUser = await prisma.user.create({
      data: {
        email: `qa-user-restricted-${Date.now()}@swayam.test`,
        password: 'dummy-password-hash',
        fullName: 'QA User Restricted',
        role: 'COUNSELOR',
      },
    });
    restrictedUserId = restrictedUser.id;
    await prisma.userRole.create({
      data: {
        userId: restrictedUser.id,
        roleId: restrictedRole.id,
      },
    });

    const createMockExecutionContext = (userId: string, handler: Function, controllerClass: any) => {
      const mockReq = {
        user: {
          id: userId,
        },
      };
      return {
        getHandler: () => handler,
        getClass: () => controllerClass,
        switchToHttp: () => ({
          getRequest: () => mockReq,
          getResponse: () => ({}),
        }),
      } as any;
    };

    // -------------------------------------------------------------
    // TEST 3: Guard Authorization Checks for Guides & CMS
    // -------------------------------------------------------------
    console.log('\n👉 [TEST 3] Career & Admission Guides / CMS Authorization Checks...');
    
    // 3.1: Admin findAll endpoint
    const findAllHandler = BlogController.prototype.findAll;
    const ctxAllowedFindAll = createMockExecutionContext(testUserId, findAllHandler, BlogController);
    const ctxDeniedFindAll = createMockExecutionContext(restrictedUserId, findAllHandler, BlogController);

    const allowedFindAll = await permissionGuard.canActivate(ctxAllowedFindAll);
    let deniedFindAll = false;
    try {
      await permissionGuard.canActivate(ctxDeniedFindAll);
    } catch (e) {
      if (e instanceof ForbiddenException) deniedFindAll = true;
    }

    console.log(`   - Authorized User accessing blog.findAll: allowed=${allowedFindAll}`);
    console.log(`   - Restricted User accessing blog.findAll: denied(403)=${deniedFindAll}`);
    if (!allowedFindAll || !deniedFindAll) {
      throw new Error('Guides view permission guard failed!');
    }
    console.log('✅ [TEST 3.1 PASSED] Guides View permission guard correctly enforced');

    // 3.2: Publish endpoint
    const publishHandler = BlogController.prototype.publish;
    const ctxAllowedPublish = createMockExecutionContext(testUserId, publishHandler, BlogController);
    const ctxDeniedPublish = createMockExecutionContext(restrictedUserId, publishHandler, BlogController);

    const allowedPublish = await permissionGuard.canActivate(ctxAllowedPublish);
    let deniedPublish = false;
    try {
      await permissionGuard.canActivate(ctxDeniedPublish);
    } catch (e) {
      if (e instanceof ForbiddenException) deniedPublish = true;
    }

    console.log(`   - Authorized User accessing blog.publish: allowed=${allowedPublish}`);
    console.log(`   - Restricted User accessing blog.publish: denied(403)=${deniedPublish}`);
    if (!allowedPublish || !deniedPublish) {
      throw new Error('Guides approve/publish permission guard failed!');
    }
    console.log('✅ [TEST 3.2 PASSED] Guides Approve/Publish permission guard correctly enforced');

    // -------------------------------------------------------------
    // TEST 4: Guard Authorization Checks for Success Stories
    // -------------------------------------------------------------
    console.log('\n👉 [TEST 4] Success Stories Authorization Checks...');
    const testimonialsFindAdmin = TestimonialsController.prototype.findAdmin;
    const ctxAllowedStoryView = createMockExecutionContext(testUserId, testimonialsFindAdmin, TestimonialsController);
    const ctxDeniedStoryView = createMockExecutionContext(restrictedUserId, testimonialsFindAdmin, TestimonialsController);

    const allowedStoryView = await permissionGuard.canActivate(ctxAllowedStoryView);
    let deniedStoryView = false;
    try {
      await permissionGuard.canActivate(ctxDeniedStoryView);
    } catch (e) {
      if (e instanceof ForbiddenException) deniedStoryView = true;
    }

    console.log(`   - Authorized User accessing testimonials.findAdmin: allowed=${allowedStoryView}`);
    console.log(`   - Restricted User accessing testimonials.findAdmin: denied(403)=${deniedStoryView}`);
    if (!allowedStoryView || !deniedStoryView) {
      throw new Error('Success Stories view permission guard failed!');
    }
    console.log('✅ [TEST 4.1 PASSED] Success Stories View permission guard correctly enforced');

    const testimonialsPublish = TestimonialsController.prototype.publish;
    const ctxAllowedStoryPublish = createMockExecutionContext(testUserId, testimonialsPublish, TestimonialsController);
    const ctxDeniedStoryPublish = createMockExecutionContext(restrictedUserId, testimonialsPublish, TestimonialsController);

    const allowedStoryPublish = await permissionGuard.canActivate(ctxAllowedStoryPublish);
    let deniedStoryPublish = false;
    try {
      await permissionGuard.canActivate(ctxDeniedStoryPublish);
    } catch (e) {
      if (e instanceof ForbiddenException) deniedStoryPublish = true;
    }

    console.log(`   - Authorized User accessing testimonials.publish: allowed=${allowedStoryPublish}`);
    console.log(`   - Restricted User accessing testimonials.publish: denied(403)=${deniedStoryPublish}`);
    if (!allowedStoryPublish || !deniedStoryPublish) {
      throw new Error('Success Stories approve/publish permission guard failed!');
    }
    console.log('✅ [TEST 4.2 PASSED] Success Stories Approve/Publish permission guard correctly enforced');

    // -------------------------------------------------------------
    // TEST 5: Permission Matrix Update & Synchronization
    // -------------------------------------------------------------
    console.log('\n👉 [TEST 5] Updating Permissions Matrix & Territory Synchronization...');
    await rolesService.updateRole(
      createdRoleId,
      {
        description: 'Updated description for QA Enterprise Role',
        dataScope: DataScope.STATE,
        states: ['Karnataka', 'Tamil Nadu', 'Delhi'],
        permissionsMatrix: {
          guides: {
            view: true,
            create: false,
            edit: false,
            delete: false,
            export: false,
            approve: false,
          },
          'success-stories': {
            view: true,
            create: true,
            edit: false,
            delete: false,
            export: false,
            approve: false,
          },
        },
      } as any,
    );

    // Verify updated state restrictions
    const updatedRestrictions = await prisma.stateRestriction.findMany({
      where: { roleId: createdRoleId },
    });
    console.log(`   - Updated state restrictions in DB:`, updatedRestrictions.map(s => s.state));
    if (updatedRestrictions.length !== 3) {
      throw new Error(`Expected 3 state restrictions, got ${updatedRestrictions.length}`);
    }

    // Verify updated audit logs
    const latestAuditLogs = await prisma.roleAuditLog.findMany({
      where: { roleId: createdRoleId },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`   - Latest Audit Trail Actions:`, latestAuditLogs.map(l => l.action));
    const hasPermissionChanged = latestAuditLogs.some(l => l.action === 'PERMISSION_CHANGED');
    const hasRoleUpdated = latestAuditLogs.some(l => l.action === 'ROLE_UPDATED');
    if (!hasPermissionChanged || !hasRoleUpdated) {
      throw new Error('Audit trail did not register PERMISSION_CHANGED or ROLE_UPDATED!');
    }
    console.log('✅ [TEST 5 PASSED] State restrictions and audit trail immediately updated and synchronized');

    console.log('\n================================================================');
    console.log('🎉 ALL 5 TEST SUITES PASSED SUCCESSFULLY WITH ZERO REGRESSIONS!');
    console.log('================================================================\n');
  } finally {
    console.log('Cleaning up test data...');
    if (testUserId) {
      await prisma.userRole.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    if (restrictedUserId) {
      await prisma.userRole.deleteMany({ where: { userId: restrictedUserId } });
      await prisma.user.delete({ where: { id: restrictedUserId } }).catch(() => {});
    }
    if (createdRoleId) {
      await prisma.stateRestriction.deleteMany({ where: { roleId: createdRoleId } });
      await prisma.rolePermission.deleteMany({ where: { roleId: createdRoleId } });
      await prisma.roleAuditLog.deleteMany({ where: { roleId: createdRoleId } });
      await prisma.roleEntity.delete({ where: { id: createdRoleId } }).catch(() => {});
    }
    if (restrictedRoleId) {
      await prisma.stateRestriction.deleteMany({ where: { roleId: restrictedRoleId } });
      await prisma.rolePermission.deleteMany({ where: { roleId: restrictedRoleId } });
      await prisma.roleAuditLog.deleteMany({ where: { roleId: restrictedRoleId } });
      await prisma.roleEntity.delete({ where: { id: restrictedRoleId } }).catch(() => {});
    }
    console.log('Cleanup completed.');
    await app.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
