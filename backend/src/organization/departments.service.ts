import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GovernanceService } from '../roles/governance.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentQueryDto,
  DepartmentStatusEnum,
} from './dto/department.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly governanceService: GovernanceService,
  ) {}

  /**
   * Generates a safe slug from a name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Validates manager user eligibility
   */
  private async validateManager(managerId?: string | null): Promise<void> {
    if (!managerId) return;

    const user = await this.prisma.user.findUnique({
      where: { id: managerId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      throw new NotFoundException(
        `Manager user with ID "${managerId}" not found`,
      );
    }

    if (!user.isActive) {
      throw new BadRequestException(
        `Manager user "${user.fullName}" is currently inactive`,
      );
    }

    const lockedRole = user.userRoles.some((ur) => ur.role.status === 'LOCKED');
    if (lockedRole) {
      throw new ForbiddenException(
        `Manager user "${user.fullName}" has a security-locked role and cannot be assigned as manager`,
      );
    }
  }

  /**
   * Cycle detection for department hierarchy (BFS/DFS)
   */
  private async validateNoHierarchyCycle(
    departmentId: string,
    targetParentId: string | null,
  ): Promise<void> {
    if (!targetParentId) return;
    if (departmentId === targetParentId) {
      throw new BadRequestException('A department cannot be its own parent');
    }

    let currentParentId: string | null = targetParentId;
    const visited = new Set<string>([departmentId]);

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        throw new BadRequestException(
          'Hierarchy Cycle Detected: Assigning this parent department would create a circular dependency',
        );
      }
      visited.add(currentParentId);

      const parent = await this.prisma.department.findUnique({
        where: { id: currentParentId },
        select: { id: true, parentDepartmentId: true },
      });

      if (!parent) break;
      currentParentId = parent.parentDepartmentId;
    }
  }

  /**
   * List departments with unit & member counts, manager info, and status filtering
   */
  async findAll(query: DepartmentQueryDto) {
    const where: Prisma.DepartmentWhereInput = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.parentDepartmentId !== undefined) {
      where.parentDepartmentId = query.parentDepartmentId || null;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const departments = await this.prisma.department.findMany({
      where,
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatar: true,
          },
        },
        parentDepartment: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: {
            teams: { where: { deletedAt: null } },
            roles: { where: { deletedAt: null } },
            users: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Compute distinct total members inside department units
    const departmentIds = departments.map((d) => d.id);
    const teamMembers = await this.prisma.teamMember.findMany({
      where: {
        team: { departmentId: { in: departmentIds }, deletedAt: null },
        status: 'ACTIVE',
      },
      select: {
        userId: true,
        team: { select: { departmentId: true } },
      },
    });

    const membersCountMap = new Map<string, Set<string>>();
    for (const tm of teamMembers) {
      const depId = tm.team.departmentId;
      if (!membersCountMap.has(depId)) {
        membersCountMap.set(depId, new Set<string>());
      }
      membersCountMap.get(depId)!.add(tm.userId);
    }

    return departments.map((dep) => ({
      id: dep.id,
      name: dep.name,
      code: dep.code,
      slug: dep.slug || this.generateSlug(dep.name),
      description: dep.description,
      status: dep.status,
      parentDepartmentId: dep.parentDepartmentId,
      parentDepartment: dep.parentDepartment,
      managerId: dep.managerId,
      manager: dep.manager,
      createdAt: dep.createdAt,
      updatedAt: dep.updatedAt,
      unitsCount: dep._count.teams,
      rolesCount: dep._count.roles,
      directUsersCount: dep._count.users,
      totalMembersCount:
        (membersCountMap.get(dep.id)?.size || 0) + dep._count.users,
    }));
  }

  /**
   * Get single department with units, manager, member count, and audit trail
   */
  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatar: true,
            designation: true,
          },
        },
        parentDepartment: {
          select: { id: true, name: true, slug: true, status: true },
        },
        childDepartments: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            _count: { select: { teams: true } },
          },
        },
        teams: {
          where: { deletedAt: null },
          include: {
            manager: { select: { id: true, fullName: true, email: true } },
            _count: { select: { members: true, childTeams: true } },
          },
        },
        roles: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            level: true,
            dataScope: true,
          },
        },
        _count: {
          select: { users: true, teams: true },
        },
      },
    });

    if (!department || department.deletedAt) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    // Get audit logs for this department
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: id, module: 'ORGANIZATION' },
          { entityName: department.name, module: 'ORGANIZATION' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      ...department,
      auditLogs,
    };
  }

  /**
   * Create a new Department
   */
  async create(dto: CreateDepartmentDto, actorUserId?: string) {
    const slug = dto.slug
      ? this.generateSlug(dto.slug)
      : this.generateSlug(dto.name);
    const code = (dto.code || slug).toUpperCase();

    // Check unique constraints
    const existing = await this.prisma.department.findFirst({
      where: {
        OR: [
          { name: { equals: dto.name, mode: 'insensitive' } },
          { slug },
          { code },
        ],
        deletedAt: null,
      },
    });

    if (existing) {
      if (existing.name.toLowerCase() === dto.name.toLowerCase()) {
        throw new BadRequestException(
          `A department named "${dto.name}" already exists`,
        );
      }
      if (existing.slug === slug) {
        throw new BadRequestException(
          `A department with slug "${slug}" already exists`,
        );
      }
      throw new BadRequestException(
        `A department with code "${code}" already exists`,
      );
    }

    await this.validateManager(dto.managerId);

    if (dto.parentDepartmentId) {
      const parent = await this.prisma.department.findUnique({
        where: { id: dto.parentDepartmentId },
      });
      if (!parent || parent.deletedAt) {
        throw new NotFoundException(
          `Parent department ID "${dto.parentDepartmentId}" not found`,
        );
      }
    }

    const department = await this.prisma.department.create({
      data: {
        name: dto.name.trim(),
        slug,
        code,
        description: dto.description?.trim() || null,
        status: dto.status || DepartmentStatusEnum.ACTIVE,
        parentDepartmentId: dto.parentDepartmentId || null,
        managerId: dto.managerId || null,
        createdById: actorUserId || null,
      },
      include: {
        manager: { select: { id: true, fullName: true, email: true } },
        parentDepartment: { select: { id: true, name: true } },
      },
    });

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'DEPARTMENT_CREATED',
      entity: 'DEPARTMENT',
      entityId: department.id,
      entityName: department.name,
      userId: actorUserId,
      newValue: {
        name: department.name,
        slug: department.slug,
        status: department.status,
        managerId: department.managerId,
      },
      description: `Department "${department.name}" (${department.code}) created`,
    });

    return department;
  }

  /**
   * Update Department details
   */
  async update(id: string, dto: UpdateDepartmentDto, actorUserId?: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department || department.deletedAt) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    const dataToUpdate: Prisma.DepartmentUpdateInput = {};

    if (dto.name && dto.name.trim() !== department.name) {
      const existingName = await this.prisma.department.findFirst({
        where: {
          name: { equals: dto.name.trim(), mode: 'insensitive' },
          id: { not: id },
          deletedAt: null,
        },
      });
      if (existingName) {
        throw new BadRequestException(
          `A department named "${dto.name}" already exists`,
        );
      }
      dataToUpdate.name = dto.name.trim();
    }

    if (dto.slug && dto.slug !== department.slug) {
      const cleanSlug = this.generateSlug(dto.slug);
      const existingSlug = await this.prisma.department.findFirst({
        where: { slug: cleanSlug, id: { not: id }, deletedAt: null },
      });
      if (existingSlug) {
        throw new BadRequestException(
          `A department with slug "${cleanSlug}" already exists`,
        );
      }
      dataToUpdate.slug = cleanSlug;
    }

    if (dto.code && dto.code !== department.code) {
      const cleanCode = dto.code.toUpperCase().trim();
      const existingCode = await this.prisma.department.findFirst({
        where: { code: cleanCode, id: { not: id }, deletedAt: null },
      });
      if (existingCode) {
        throw new BadRequestException(
          `A department with code "${cleanCode}" already exists`,
        );
      }
      dataToUpdate.code = cleanCode;
    }

    if (dto.description !== undefined) {
      dataToUpdate.description = dto.description?.trim() || null;
    }

    if (dto.parentDepartmentId !== undefined) {
      await this.validateNoHierarchyCycle(id, dto.parentDepartmentId);
      dataToUpdate.parentDepartment = dto.parentDepartmentId
        ? { connect: { id: dto.parentDepartmentId } }
        : { disconnect: true };
    }

    if (dto.managerId !== undefined) {
      await this.validateManager(dto.managerId);
      dataToUpdate.manager = dto.managerId
        ? { connect: { id: dto.managerId } }
        : { disconnect: true };
    }

    if (dto.status) {
      dataToUpdate.status = dto.status;
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: dataToUpdate,
      include: {
        manager: { select: { id: true, fullName: true, email: true } },
        parentDepartment: { select: { id: true, name: true } },
      },
    });

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'DEPARTMENT_UPDATED',
      entity: 'DEPARTMENT',
      entityId: updated.id,
      entityName: updated.name,
      userId: actorUserId,
      oldValue: {
        name: department.name,
        description: department.description,
        status: department.status,
        managerId: department.managerId,
        parentDepartmentId: department.parentDepartmentId,
      },
      newValue: {
        name: updated.name,
        description: updated.description,
        status: updated.status,
        managerId: updated.managerId,
        parentDepartmentId: updated.parentDepartmentId,
      },
      description: `Department "${updated.name}" updated`,
    });

    return updated;
  }

  /**
   * Update Department Status (ACTIVE, DISABLED, ARCHIVED)
   */
  async updateStatus(
    id: string,
    status: DepartmentStatusEnum,
    actorUserId?: string,
    reason?: string,
  ) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { teams: true, users: true } } },
    });

    if (!department || department.deletedAt) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    // Critical department safeguard
    const isCritical = [
      'finance',
      'admissions',
      'counseling',
      'executive',
    ].includes(department.slug || this.generateSlug(department.name));

    if (
      isCritical &&
      (status === DepartmentStatusEnum.DISABLED ||
        status === DepartmentStatusEnum.ARCHIVED)
    ) {
      this.logger.warn(
        `Critical department ${department.name} status change to ${status}`,
      );
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: { status },
      include: {
        manager: { select: { id: true, fullName: true, email: true } },
      },
    });

    const actionName =
      status === DepartmentStatusEnum.ACTIVE
        ? 'DEPARTMENT_ENABLED'
        : status === DepartmentStatusEnum.DISABLED
          ? 'DEPARTMENT_DISABLED'
          : 'DEPARTMENT_ARCHIVED';

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: actionName,
      entity: 'DEPARTMENT',
      entityId: updated.id,
      entityName: updated.name,
      userId: actorUserId,
      oldValue: { status: department.status },
      newValue: { status: updated.status, reason },
      description: `Department "${updated.name}" status changed to ${status}${reason ? ` (Reason: ${reason})` : ''}`,
    });

    return updated;
  }

  /**
   * Soft-delete a Department
   */
  async softDelete(id: string, actorUserId?: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teams: { where: { deletedAt: null } },
            users: true,
            roles: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!department || department.deletedAt) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    if (
      department._count.teams > 0 ||
      department._count.users > 0 ||
      department._count.roles > 0
    ) {
      throw new BadRequestException(
        `Cannot delete department "${department.name}" because it contains active units (${department._count.teams}), members (${department._count.users}), or roles (${department._count.roles}). Archive it instead to preserve historical records.`,
      );
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: DepartmentStatusEnum.ARCHIVED,
      },
    });

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'DEPARTMENT_ARCHIVED',
      entity: 'DEPARTMENT',
      entityId: updated.id,
      entityName: updated.name,
      userId: actorUserId,
      description: `Department "${updated.name}" deleted/archived`,
    });

    return {
      success: true,
      message: `Department "${updated.name}" has been safely archived`,
    };
  }
}
