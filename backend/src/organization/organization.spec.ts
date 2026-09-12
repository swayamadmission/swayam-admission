import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { UnitsService } from './units.service';
import { GeographyService } from './geography.service';
import { DepartmentStatusEnum } from './dto/department.dto';
import { UnitStatusEnum } from './dto/unit.dto';
import { GeographicStatusEnum } from './dto/geography.dto';

describe('Enterprise Organizational Structure Module', () => {
  let departmentsService: DepartmentsService;
  let unitsService: UnitsService;
  let geographyService: GeographyService;

  let mockPrisma: any;
  let mockAudit: any;
  let mockGovernance: any;

  beforeEach(() => {
    mockPrisma = {
      department: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      team: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      teamMember: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      state: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      district: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      geographicAssignment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    mockAudit = {
      logAction: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
    };

    mockGovernance = {
      requireApprovalIfProtected: jest
        .fn()
        .mockResolvedValue({ allowed: true }),
    };

    departmentsService = new DepartmentsService(
      mockPrisma,
      mockAudit,
      mockGovernance,
    );
    unitsService = new UnitsService(mockPrisma, mockAudit);
    geographyService = new GeographyService(mockPrisma, mockAudit);
  });

  describe('DepartmentsService', () => {
    it('should create a department and log audit event', async () => {
      mockPrisma.department.findFirst.mockResolvedValue(null);
      mockPrisma.department.create.mockResolvedValue({
        id: 'dept-1',
        name: 'Counseling & Admissions',
        slug: 'counseling-admissions',
        code: 'COUNSEL',
        status: DepartmentStatusEnum.ACTIVE,
        managerId: null,
      });

      const result = await departmentsService.create(
        {
          name: 'Counseling & Admissions',
          code: 'COUNSEL',
        },
        'admin-1',
      );

      expect(result.id).toBe('dept-1');
      expect(result.name).toBe('Counseling & Admissions');
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DEPARTMENT_CREATED',
          entity: 'DEPARTMENT',
        }),
      );
    });

    it('should prevent creating a department with duplicate name or slug', async () => {
      mockPrisma.department.findFirst.mockResolvedValue({
        id: 'dept-existing',
        name: 'Counseling & Admissions',
        slug: 'counseling-admissions',
      });

      await expect(
        departmentsService.create(
          { name: 'Counseling & Admissions' },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect and prevent circular hierarchy in departments', async () => {
      // Setup cycle: dept-1 -> dept-2 -> dept-1
      mockPrisma.department.findUnique
        .mockResolvedValueOnce({ id: 'dept-1', name: 'Dept 1' })
        .mockResolvedValueOnce({ id: 'dept-2', parentDepartmentId: 'dept-1' });

      await expect(
        departmentsService.update(
          'dept-1',
          { parentDepartmentId: 'dept-2' },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent hard deletion when active units exist and recommend archiving', async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: 'dept-1',
        name: 'Admissions',
        _count: { teams: 3, users: 10, roles: 2 },
      });

      await expect(
        departmentsService.softDelete('dept-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('UnitsService', () => {
    it('should create an organizational unit under a valid department', async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: 'dept-1',
        name: 'Counseling',
        code: 'COUNSEL',
        status: 'ACTIVE',
      });
      mockPrisma.team.findFirst.mockResolvedValue(null);
      mockPrisma.team.create.mockResolvedValue({
        id: 'unit-1',
        name: 'Verification Squad',
        departmentId: 'dept-1',
        unitType: 'UNIT',
        department: { name: 'Counseling' },
      });

      const result = await unitsService.create(
        {
          name: 'Verification Squad',
          departmentId: 'dept-1',
          unitType: 'UNIT' as any,
        },
        'admin-1',
      );

      expect(result.id).toBe('unit-1');
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UNIT_CREATED' }),
      );
    });

    it('should assign a user to a unit with specific memberRole (distinct from IAM role)', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: 'unit-1',
        name: 'Inbound Sales Team',
        status: 'ACTIVE',
        department: { name: 'Marketing' },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-counselor-1',
        fullName: 'Rahul Sharma',
        isActive: true,
      });
      mockPrisma.teamMember.upsert.mockResolvedValue({
        id: 'tm-1',
        teamId: 'unit-1',
        userId: 'user-counselor-1',
        memberRole: 'LEAD',
        isPrimary: true,
        status: 'ACTIVE',
      });

      const result = await unitsService.assignMember(
        'unit-1',
        {
          userId: 'user-counselor-1',
          memberRole: 'LEAD',
          isPrimary: true,
        },
        'admin-1',
      );

      expect(result.memberRole).toBe('LEAD');
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_ASSIGNED_TO_UNIT' }),
      );
    });
  });

  describe('GeographyService', () => {
    it('should create geographic assignment for a state and counselor', async () => {
      mockPrisma.state.findUnique.mockResolvedValue({
        id: 'state-bihar',
        name: 'Bihar',
        code: 'BR',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-sr-counselor',
        fullName: 'Amit Kumar',
        isActive: true,
        userRoles: [],
      });
      mockPrisma.geographicAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.geographicAssignment.create.mockResolvedValue({
        id: 'geo-1',
        stateId: 'state-bihar',
        responsibleUserId: 'user-sr-counselor',
        status: GeographicStatusEnum.ACTIVE,
        state: { name: 'Bihar' },
        responsibleUser: { fullName: 'Amit Kumar', email: 'amit@swayam.com' },
      });

      const result = await geographyService.createAssignment(
        {
          stateId: 'state-bihar',
          responsibleUserId: 'user-sr-counselor',
        },
        'admin-1',
      );

      expect(result.id).toBe('geo-1');
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'GEOGRAPHIC_ASSIGNMENT_CREATED' }),
      );
    });

    it('should prevent conflicting active assignments for the exact same state/district', async () => {
      mockPrisma.state.findUnique.mockResolvedValue({
        id: 'state-bihar',
        name: 'Bihar',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-new',
        fullName: 'Priya Singh',
        isActive: true,
        userRoles: [],
      });
      mockPrisma.geographicAssignment.findFirst.mockResolvedValue({
        id: 'geo-existing-active',
        stateId: 'state-bihar',
        status: 'ACTIVE',
      });

      await expect(
        geographyService.createAssignment(
          {
            stateId: 'state-bihar',
            responsibleUserId: 'user-new',
          },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should safely reassign counselor by archiving previous assignment while preserving historical student ownership', async () => {
      const existingAssignment = {
        id: 'geo-1',
        stateId: 'state-bihar',
        districtId: null,
        responsibleUserId: 'counselor-old',
        status: 'ACTIVE',
        assignedRole: 'SENIOR_COUNSELOR',
        state: { name: 'Bihar' },
        district: null,
        responsibleUser: { id: 'counselor-old', fullName: 'Old Counselor' },
      };

      mockPrisma.geographicAssignment.findUnique.mockResolvedValue(
        existingAssignment,
      );
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'counselor-new',
        fullName: 'New Counselor',
        isActive: true,
        userRoles: [],
      });

      mockPrisma.geographicAssignment.update.mockResolvedValue({
        ...existingAssignment,
        status: 'ARCHIVED',
      });
      mockPrisma.geographicAssignment.create.mockResolvedValue({
        id: 'geo-2',
        stateId: 'state-bihar',
        responsibleUserId: 'counselor-new',
        status: 'ACTIVE',
        state: { name: 'Bihar' },
        responsibleUser: { fullName: 'New Counselor' },
      });

      const result = await geographyService.updateAssignment(
        'geo-1',
        {
          responsibleUserId: 'counselor-new',
        },
        'admin-1',
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GEOGRAPHIC_ASSIGNMENT_UPDATED',
          description: expect.stringContaining(
            'Historical ownership preserved',
          ),
        }),
      );
    });
  });
});
