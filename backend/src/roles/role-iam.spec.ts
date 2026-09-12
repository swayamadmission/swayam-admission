import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RoleHierarchyService } from './role-hierarchy.service';
import { GovernanceService } from './governance.service';
import { RolesService } from './roles.service';
import { PrismaService } from '../prisma/prisma.service';

describe('IAM & Role Hierarchy & Governance Unit Tests', () => {
  let hierarchyService: RoleHierarchyService;
  let governanceService: GovernanceService;
  let rolesService: RolesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      roleEntity: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      userRole: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      governanceRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      roleAuditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      permission: {
        findMany: jest.fn(),
      },
      rolePermission: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    hierarchyService = new RoleHierarchyService(
      mockPrisma as unknown as PrismaService,
    );
    governanceService = new GovernanceService(
      mockPrisma as unknown as PrismaService,
    );
    rolesService = new RolesService(
      mockPrisma as unknown as PrismaService,
      hierarchyService,
      governanceService,
    );
  });

  describe('Hierarchy Cycle Detection (BFS)', () => {
    it('should reject self-parenting', async () => {
      await expect(
        hierarchyService.validateHierarchyAssignment('role-1', 'role-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject assigning a descendant as the new parent (cycle prevention)', async () => {
      mockPrisma.roleEntity.findUnique
        .mockResolvedValueOnce({ id: 'role-A', name: 'Role A' })
        .mockResolvedValueOnce({ id: 'role-C', name: 'Role C' });

      // role-A's descendants are role-B and role-C
      mockPrisma.roleEntity.findMany
        .mockResolvedValueOnce([{ id: 'role-B' }])
        .mockResolvedValueOnce([{ id: 'role-C' }])
        .mockResolvedValueOnce([]);

      await expect(
        hierarchyService.validateHierarchyAssignment('role-A', 'role-C'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid parent assignment when no cycles exist', async () => {
      mockPrisma.roleEntity.findUnique
        .mockResolvedValueOnce({ id: 'role-C', name: 'Role C' })
        .mockResolvedValueOnce({ id: 'role-A', name: 'Role A' });

      mockPrisma.roleEntity.findMany.mockResolvedValue([]); // no descendants of role-C

      await expect(
        hierarchyService.validateHierarchyAssignment('role-C', 'role-A'),
      ).resolves.not.toThrow();
    });
  });

  describe('Effective Permission Inheritance', () => {
    it('should calculate direct and inherited permissions accurately', async () => {
      mockPrisma.roleEntity.findUnique.mockResolvedValueOnce({
        id: 'role-counselor',
        status: 'ACTIVE',
        isActive: true,
        deletedAt: null,
        parentRoleId: 'role-lead',
        permissions: [{ permission: { code: 'leads.view' } }],
      });

      jest
        .spyOn(hierarchyService, 'getAncestorRoleIds')
        .mockResolvedValue(['role-lead']);

      mockPrisma.rolePermission.findMany.mockResolvedValueOnce([
        {
          roleId: 'role-lead',
          permission: { code: 'leads.export' },
        },
      ]);

      const result =
        await hierarchyService.getEffectivePermissionsForRole('role-counselor');
      expect(result.direct).toContain('leads.view');
      expect(result.inherited).toContain('leads.export');
      expect(result.effective).toEqual(
        expect.arrayContaining(['leads.view', 'leads.export']),
      );
    });
  });

  describe('Two-Person Governance Approval & Safeguards', () => {
    it('should enforce Two-Person Rule and reject self-approval', async () => {
      mockPrisma.governanceRequest.findUnique.mockResolvedValueOnce({
        id: 'gov-req-101',
        status: 'PENDING',
        actionType: 'LOCK_ROLE',
        requestedById: 'admin-user-1',
        targetRoleId: 'role-finance',
      });

      await expect(
        rolesService.executeGovernanceApproval('gov-req-101', 'admin-user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent privilege lockout when disabling the last admin', async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([
        { id: 'admin-1', email: 'admin@swayam.com' },
      ]);
      mockPrisma.userRole.findMany.mockResolvedValueOnce([
        { userId: 'admin-1' },
      ]);

      await expect(
        governanceService.ensureNoLockout('role-super-admin'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
