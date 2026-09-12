import { ForbiddenException } from '@nestjs/common';
import { DataScopeService, DataScopeContext } from './data-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoleHierarchyService } from '../roles/role-hierarchy.service';
import { DataScope } from '@prisma/client';

function createMockContext(
  overrides: Partial<DataScopeContext> = {},
): DataScopeContext {
  return {
    userId: 'user-default',
    roles: [],
    roleSlugs: [],
    permissions: [],
    dataScopes: [],
    isSuperAdmin: false,
    isLocked: false,
    departmentIds: [],
    departments: [],
    teamIds: [],
    teamMemberUserIds: [],
    regionIds: [],
    regions: [],
    stateIds: [],
    states: [],
    districtIds: [],
    districts: [],
    isCollegeStaff: false,
    ...overrides,
  };
}

describe('Phase 13: Enterprise Authorization Integration & DataScope Enforcement', () => {
  let dataScopeService: DataScopeService;
  let mockPrisma: any;
  let mockRoleHierarchyService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      roleEntity: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      userRole: {
        findMany: jest.fn(),
      },
      team: {
        findMany: jest.fn(),
      },
      teamMember: {
        findMany: jest.fn(),
      },
      lead: {
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    mockRoleHierarchyService = {
      getEffectivePermissions: jest
        .fn()
        .mockResolvedValue({ direct: [], inherited: [], effective: [] }),
      getEffectivePermissionsForRole: jest
        .fn()
        .mockResolvedValue({ direct: [], inherited: [], effective: [] }),
    };

    dataScopeService = new DataScopeService(
      mockPrisma as unknown as PrismaService,
      mockRoleHierarchyService as unknown as RoleHierarchyService,
    );
  });

  describe('1. DataScope Context Resolution', () => {
    it('should resolve Super Admin with GLOBAL scope', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'super-admin-id',
        role: 'SUPER_ADMIN',
        department: 'Executive',
        state: 'Delhi',
        city: 'New Delhi',
        userRoles: [
          {
            role: {
              id: 'role-sa',
              name: 'Super Admin',
              slug: 'super-admin',
              status: 'ACTIVE',
              isActive: true,
              dataScope: 'GLOBAL',
              permissions: [{ permission: { code: 'system.manage' } }],
            },
          },
        ],
      });

      mockRoleHierarchyService.getEffectivePermissionsForRole.mockResolvedValue(
        {
          direct: ['system.manage'],
          inherited: ['student.*'],
          effective: ['system.manage', 'student.*'],
        },
      );

      const ctx = await dataScopeService.resolveDataScope('super-admin-id');
      expect(ctx.isSuperAdmin).toBe(true);
      expect(ctx.dataScopes).toContain('GLOBAL');
      expect(ctx.permissions).toContain('system.manage');
    });

    it('should flag isLocked=true if user role is LOCKED (Emergency Lockout)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'locked-user-id',
        role: 'ADMIN',
        userRoles: [
          {
            role: {
              id: 'role-locked',
              name: 'Locked Role',
              slug: 'locked-role',
              status: 'LOCKED',
              isActive: true,
              dataScope: 'GLOBAL',
              permissions: [],
            },
          },
        ],
      });

      const ctx = await dataScopeService.resolveDataScope('locked-user-id');
      expect(ctx.isLocked).toBe(true);
      expect(ctx.permissions).toHaveLength(0);
      expect(ctx.dataScopes).toHaveLength(0);
    });

    it('should resolve Counselor with ASSIGNED data scope and assigned leads', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'counselor-1',
        role: 'COUNSELOR',
        department: 'Admissions',
        state: 'Maharashtra',
        city: 'Mumbai',
        counselorProfile: {
          assignedRegion: 'West Region',
          assignedStates: ['Maharashtra', 'Gujarat'],
        },
        userRoles: [
          {
            role: {
              id: 'role-c1',
              name: 'Senior Counselor',
              slug: 'senior-counselor',
              status: 'ACTIVE',
              isActive: true,
              dataScope: 'ASSIGNED',
              permissions: [{ permission: { code: 'student.view' } }],
            },
          },
        ],
      });

      mockPrisma.lead.findMany.mockResolvedValue([
        { mobile: '+919999900001', email: 'student1@test.com' },
      ]);
      mockPrisma.teamMember.findMany.mockResolvedValue([]);

      mockRoleHierarchyService.getEffectivePermissionsForRole.mockResolvedValue(
        {
          direct: ['student.view'],
          inherited: ['lead.view', 'lead.edit'],
          effective: ['student.view', 'lead.view', 'lead.edit'],
        },
      );

      const ctx = await dataScopeService.resolveDataScope('counselor-1');
      expect(ctx.isSuperAdmin).toBe(false);
      expect(ctx.dataScopes).toContain('ASSIGNED');
      expect(ctx.regions).toContain('West Region');
      expect(ctx.states).toContain('Maharashtra');
    });
  });

  describe('2. Query Filters across all 8 DataScopes', () => {
    it('should return empty filter {} for GLOBAL scope', () => {
      const ctx = createMockContext({
        userId: 'admin-1',
        dataScopes: [DataScope.GLOBAL],
        isSuperAdmin: true,
        permissions: ['student.view'],
      });

      expect(dataScopeService.buildStudentScopeFilter(ctx)).toEqual({});
      expect(dataScopeService.buildLeadScopeFilter(ctx)).toEqual({});
      expect(dataScopeService.buildCounselorScopeFilter(ctx)).toEqual({});
      expect(dataScopeService.buildApplicationScopeFilter(ctx)).toEqual({});
      expect(dataScopeService.buildDocumentScopeFilter(ctx)).toEqual({});
      expect(dataScopeService.buildPaymentScopeFilter(ctx)).toEqual({});
    });

    it('should build correct filter for ASSIGNED scope', () => {
      const ctx = createMockContext({
        userId: 'counselor-1',
        dataScopes: [DataScope.ASSIGNED],
        permissions: ['student.view'],
      });

      const leadFilter = dataScopeService.buildLeadScopeFilter(ctx);
      expect(leadFilter).toEqual({ assignedCounselorId: 'counselor-1' });

      const appFilter = dataScopeService.buildApplicationScopeFilter(ctx);
      expect(appFilter.OR).toBeDefined();
      expect(appFilter.OR).toContainEqual({ counselorId: 'counselor-1' });
    });

    it('should build correct filter for REGION, STATE, and DISTRICT scopes', () => {
      const ctx = createMockContext({
        userId: 'regional-head',
        dataScopes: [DataScope.REGION, DataScope.STATE],
        permissions: ['student.view'],
        regions: ['North India'],
        states: ['Delhi', 'Haryana'],
        districts: ['New Delhi'],
      });

      const counselorFilter = dataScopeService.buildCounselorScopeFilter(ctx);
      expect(counselorFilter.OR).toBeDefined();

      const studentFilter = dataScopeService.buildStudentScopeFilter(ctx);
      expect(studentFilter.OR).toBeDefined();
    });

    it('should build correct filter for SELF scope (Student Portal Isolation)', () => {
      const ctx = createMockContext({
        userId: 'student-123',
        dataScopes: [DataScope.SELF],
        permissions: ['student.view'],
      });

      const studentFilter = dataScopeService.buildStudentScopeFilter(ctx);
      expect(studentFilter.id).toBe('student-123');

      const appFilter = dataScopeService.buildApplicationScopeFilter(ctx);
      expect(appFilter.userId).toBe('student-123');

      const paymentFilter = dataScopeService.buildPaymentScopeFilter(ctx);
      expect(paymentFilter.userId).toBe('student-123');
    });
  });

  describe('3. Record-Level Scope Enforcement & IDOR Protection', () => {
    it('should reject IDOR student profile access by unauthorized counselor', () => {
      const ctx = createMockContext({
        userId: 'counselor-A',
        dataScopes: [DataScope.ASSIGNED],
        permissions: ['student.view'],
      });

      const foreignStudent = {
        id: 'student-victim',
        assignedCounselorId: 'counselor-B',
        mobile: '+919000000099',
        email: 'victim@test.com',
        applications: [],
      };

      expect(() =>
        dataScopeService.enforceStudentScope(ctx, foreignStudent),
      ).toThrow(ForbiddenException);
    });

    it('should allow student profile access when student is assigned to counselor', () => {
      const ctx = createMockContext({
        userId: 'counselor-A',
        dataScopes: [DataScope.ASSIGNED],
        permissions: ['student.view'],
      });

      const assignedStudent = {
        id: 'student-assigned',
        assignedCounselorId: 'counselor-A',
        mobile: '+919000000001',
        email: 'assigned@test.com',
        applications: [],
      };

      expect(() =>
        dataScopeService.enforceStudentScope(ctx, assignedStudent),
      ).not.toThrow();
    });

    it('should reject payment inspection by unauthorized student (IDOR Payment Isolation)', () => {
      const ctx = createMockContext({
        userId: 'student-attacker',
        dataScopes: [DataScope.SELF],
        permissions: ['payment.view'],
      });

      const foreignPayment = {
        id: 'pay-999',
        userId: 'student-victim',
        studentId: 'student-victim',
        amount: 50000,
      };

      expect(() =>
        dataScopeService.enforcePaymentScope(ctx, foreignPayment),
      ).toThrow(ForbiddenException);
    });

    it('should reject document download by unauthorized counselor', () => {
      const ctx = createMockContext({
        userId: 'counselor-X',
        dataScopes: [DataScope.ASSIGNED],
        permissions: ['document.download'],
      });

      const document = {
        id: 'doc-888',
        userId: 'student-other',
        counselorId: 'counselor-Y',
      };

      expect(() =>
        dataScopeService.enforceDocumentScope(ctx, document),
      ).toThrow(ForbiddenException);
    });
  });

  describe('4. Mutation Boundary & Role Escalation Prevention', () => {
    it('should prevent non-super-admin from altering assignedRegion or department on counselor', () => {
      const ctx = createMockContext({
        userId: 'admin-regular',
        dataScopes: [DataScope.REGION],
        permissions: ['counselor.edit'],
        departments: ['Admissions'],
        regions: ['North India'],
        states: ['Delhi'],
      });

      expect(() =>
        dataScopeService.validateMutationScope(ctx, 'COUNSELOR', {
          assignedRegion: 'South India',
        }),
      ).toThrow(ForbiddenException);
    });

    it('should allow Super Admin to update any counselor configuration', () => {
      const ctx = createMockContext({
        userId: 'super-admin-user',
        dataScopes: [DataScope.GLOBAL],
        permissions: ['counselor.edit', 'system.manage'],
        isSuperAdmin: true,
      });

      expect(() =>
        dataScopeService.validateMutationScope(ctx, 'COUNSELOR', {
          assignedRegion: 'South India',
        }),
      ).not.toThrow();
    });
  });
});
