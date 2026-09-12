import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateUnitDto,
  UpdateUnitDto,
  AssignMemberDto,
  AssignManagerDto,
  UnitQueryDto,
  UnitStatusEnum,
} from './dto/unit.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UnitsService {
  private readonly logger = new Logger(UnitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Validate manager eligibility
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
   * Hierarchy cycle prevention for units/teams
   */
  private async validateNoHierarchyCycle(
    unitId: string,
    targetParentId: string | null,
  ): Promise<void> {
    if (!targetParentId) return;
    if (unitId === targetParentId) {
      throw new BadRequestException('A unit/team cannot be its own parent');
    }

    let currentParentId: string | null = targetParentId;
    const visited = new Set<string>([unitId]);

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        throw new BadRequestException(
          'Hierarchy Cycle Detected: Assigning this parent unit would create a circular team hierarchy',
        );
      }
      visited.add(currentParentId);

      const parent = await this.prisma.team.findUnique({
        where: { id: currentParentId },
        select: { id: true, parentTeamId: true },
      });

      if (!parent) break;
      currentParentId = parent.parentTeamId;
    }
  }

  /**
   * List units/teams with hierarchy, manager, and member count
   */
  async findAll(query: UnitQueryDto) {
    const where: Prisma.TeamWhereInput = {
      deletedAt: null,
    };

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.unitType) {
      where.unitType = query.unitType;
    }

    if (query.parentTeamId !== undefined) {
      where.parentTeamId = query.parentTeamId || null;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const units = await this.prisma.team.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true, slug: true, status: true },
        },
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatar: true,
          },
        },
        parentTeam: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: {
            members: { where: { status: 'ACTIVE' } },
            childTeams: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
    });

    return units.map((u) => ({
      id: u.id,
      name: u.name,
      code: u.code,
      slug: u.slug || this.generateSlug(u.name),
      description: u.description,
      status: u.status,
      unitType: u.unitType,
      departmentId: u.departmentId,
      department: u.department,
      managerId: u.managerId,
      manager: u.manager,
      parentTeamId: u.parentTeamId,
      parentTeam: u.parentTeam,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      membersCount: u._count.members,
      childUnitsCount: u._count.childTeams,
    }));
  }

  /**
   * Get single unit with full details, member list, represented roles, and audit trail
   */
  async findOne(id: string) {
    const unit = await this.prisma.team.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            manager: { select: { id: true, fullName: true } },
          },
        },
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
        parentTeam: {
          select: { id: true, name: true, slug: true, status: true },
        },
        childTeams: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            unitType: true,
            manager: { select: { id: true, fullName: true } },
            _count: { select: { members: true } },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                mobile: true,
                role: true,
                designation: true,
                isActive: true,
                avatar: true,
                userRoles: {
                  include: {
                    role: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                        dataScope: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!unit || unit.deletedAt) {
      throw new NotFoundException(
        `Organizational unit with ID "${id}" not found`,
      );
    }

    // Extract unique roles represented in this unit
    const representedRolesMap = new Map<string, any>();
    for (const m of unit.members) {
      for (const ur of m.user.userRoles || []) {
        if (!representedRolesMap.has(ur.role.id)) {
          representedRolesMap.set(ur.role.id, ur.role);
        }
      }
    }

    // Get audit history
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: id, module: 'ORGANIZATION' },
          { entityName: unit.name, module: 'ORGANIZATION' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    return {
      ...unit,
      representedRoles: Array.from(representedRolesMap.values()),
      auditLogs,
    };
  }

  /**
   * Create an Organizational Unit or Team
   */
  async create(dto: CreateUnitDto, actorUserId?: string) {
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });

    if (!department || department.deletedAt) {
      throw new NotFoundException(
        `Department with ID "${dto.departmentId}" not found`,
      );
    }

    if (department.status === 'ARCHIVED') {
      throw new BadRequestException(
        `Cannot add units to department "${department.name}" because it is ARCHIVED`,
      );
    }

    const slug = dto.slug
      ? this.generateSlug(dto.slug)
      : this.generateSlug(dto.name);
    const code = (dto.code || `${department.code}-${slug}`).toUpperCase();

    // Check unique code/slug
    const existing = await this.prisma.team.findFirst({
      where: {
        OR: [{ slug }, { code }],
        deletedAt: null,
      },
    });

    if (existing) {
      if (existing.slug === slug) {
        throw new BadRequestException(
          `An organizational unit with slug "${slug}" already exists`,
        );
      }
      throw new BadRequestException(
        `An organizational unit with code "${code}" already exists`,
      );
    }

    await this.validateManager(dto.managerId);

    if (dto.parentTeamId) {
      const parent = await this.prisma.team.findUnique({
        where: { id: dto.parentTeamId },
      });
      if (!parent || parent.deletedAt) {
        throw new NotFoundException(
          `Parent unit ID "${dto.parentTeamId}" not found`,
        );
      }
      if (parent.departmentId !== dto.departmentId) {
        throw new BadRequestException(
          'Parent unit must belong to the same department',
        );
      }
    }

    const unit = await this.prisma.team.create({
      data: {
        name: dto.name.trim(),
        slug,
        code,
        description: dto.description?.trim() || null,
        status: dto.status || UnitStatusEnum.ACTIVE,
        unitType: dto.unitType || 'UNIT',
        departmentId: dto.departmentId,
        managerId: dto.managerId || null,
        parentTeamId: dto.parentTeamId || null,
        createdById: actorUserId || null,
      },
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'UNIT_CREATED',
      entity: 'UNIT',
      entityId: unit.id,
      entityName: unit.name,
      userId: actorUserId,
      newValue: {
        name: unit.name,
        slug: unit.slug,
        department: unit.department.name,
        unitType: unit.unitType,
        managerId: unit.managerId,
      },
      description: `Organizational Unit "${unit.name}" created under "${department.name}"`,
    });

    return unit;
  }

  /**
   * Update Organizational Unit
   */
  async update(id: string, dto: UpdateUnitDto, actorUserId?: string) {
    const unit = await this.prisma.team.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!unit || unit.deletedAt) {
      throw new NotFoundException(
        `Organizational unit with ID "${id}" not found`,
      );
    }

    const dataToUpdate: Prisma.TeamUpdateInput = {};

    if (dto.name && dto.name.trim() !== unit.name) {
      dataToUpdate.name = dto.name.trim();
    }

    if (dto.slug && dto.slug !== unit.slug) {
      const cleanSlug = this.generateSlug(dto.slug);
      const existingSlug = await this.prisma.team.findFirst({
        where: { slug: cleanSlug, id: { not: id }, deletedAt: null },
      });
      if (existingSlug) {
        throw new BadRequestException(
          `A unit with slug "${cleanSlug}" already exists`,
        );
      }
      dataToUpdate.slug = cleanSlug;
    }

    if (dto.code && dto.code !== unit.code) {
      const cleanCode = dto.code.toUpperCase().trim();
      const existingCode = await this.prisma.team.findFirst({
        where: { code: cleanCode, id: { not: id }, deletedAt: null },
      });
      if (existingCode) {
        throw new BadRequestException(
          `A unit with code "${cleanCode}" already exists`,
        );
      }
      dataToUpdate.code = cleanCode;
    }

    if (dto.description !== undefined) {
      dataToUpdate.description = dto.description?.trim() || null;
    }

    if (dto.unitType) {
      dataToUpdate.unitType = dto.unitType;
    }

    if (dto.parentTeamId !== undefined) {
      await this.validateNoHierarchyCycle(id, dto.parentTeamId);
      if (dto.parentTeamId) {
        const parent = await this.prisma.team.findUnique({
          where: { id: dto.parentTeamId },
        });
        if (!parent || parent.deletedAt) {
          throw new NotFoundException(
            `Parent unit ID "${dto.parentTeamId}" not found`,
          );
        }
        if (parent.departmentId !== unit.departmentId) {
          throw new BadRequestException(
            'Parent unit must belong to the same department',
          );
        }
      }
      dataToUpdate.parentTeam = dto.parentTeamId
        ? { connect: { id: dto.parentTeamId } }
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

    const updated = await this.prisma.team.update({
      where: { id },
      data: dataToUpdate,
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, fullName: true, email: true } },
        parentTeam: { select: { id: true, name: true } },
      },
    });

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'UNIT_UPDATED',
      entity: 'UNIT',
      entityId: updated.id,
      entityName: updated.name,
      userId: actorUserId,
      oldValue: {
        name: unit.name,
        status: unit.status,
        managerId: unit.managerId,
        parentTeamId: unit.parentTeamId,
      },
      newValue: {
        name: updated.name,
        status: updated.status,
        managerId: updated.managerId,
        parentTeamId: updated.parentTeamId,
      },
      description: `Organizational Unit "${updated.name}" updated`,
    });

    return updated;
  }

  /**
   * Update Unit Status (ACTIVE, DISABLED, ARCHIVED)
   */
  async updateStatus(
    id: string,
    status: UnitStatusEnum,
    actorUserId?: string,
    reason?: string,
  ) {
    const unit = await this.prisma.team.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!unit || unit.deletedAt) {
      throw new NotFoundException(
        `Organizational unit with ID "${id}" not found`,
      );
    }

    const updated = await this.prisma.team.update({
      where: { id },
      data: { status },
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, fullName: true, email: true } },
      },
    });

    const actionName =
      status === UnitStatusEnum.ACTIVE
        ? 'UNIT_ENABLED'
        : status === UnitStatusEnum.DISABLED
          ? 'UNIT_DISABLED'
          : 'UNIT_ARCHIVED';

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: actionName,
      entity: 'UNIT',
      entityId: updated.id,
      entityName: updated.name,
      userId: actorUserId,
      oldValue: { status: unit.status },
      newValue: { status: updated.status, reason },
      description: `Unit "${updated.name}" status changed to ${status}${reason ? ` (Reason: ${reason})` : ''}`,
    });

    return updated;
  }

  /**
   * Assign or Change Unit Responsible Manager
   */
  async assignManager(id: string, dto: AssignManagerDto, actorUserId?: string) {
    const unit = await this.prisma.team.findUnique({
      where: { id },
      include: { manager: true },
    });

    if (!unit || unit.deletedAt) {
      throw new NotFoundException(
        `Organizational unit with ID "${id}" not found`,
      );
    }

    await this.validateManager(dto.managerId);

    const newManager = await this.prisma.user.findUnique({
      where: { id: dto.managerId },
      select: { id: true, fullName: true, email: true, role: true },
    });

    const updated = await this.prisma.team.update({
      where: { id },
      data: { managerId: dto.managerId },
      include: {
        manager: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        department: { select: { id: true, name: true } },
      },
    });

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'UNIT_MANAGER_CHANGED',
      entity: 'UNIT',
      entityId: unit.id,
      entityName: unit.name,
      userId: actorUserId,
      oldValue: {
        managerId: unit.managerId,
        managerName: unit.manager?.fullName || 'Unassigned',
      },
      newValue: {
        managerId: newManager?.id,
        managerName: newManager?.fullName,
      },
      description: `Unit "${unit.name}" manager changed to ${newManager?.fullName}`,
    });

    return updated;
  }

  /**
   * Assign a User to an Organizational Unit / Team
   */
  async assignMember(
    unitId: string,
    dto: AssignMemberDto,
    actorUserId?: string,
  ) {
    const unit = await this.prisma.team.findUnique({
      where: { id: unitId },
      include: { department: true },
    });

    if (!unit || unit.deletedAt) {
      throw new NotFoundException(
        `Organizational unit with ID "${unitId}" not found`,
      );
    }

    if (unit.status === 'ARCHIVED' || unit.status === 'DISABLED') {
      throw new BadRequestException(
        `Cannot assign members to a ${unit.status} organizational unit`,
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, fullName: true, email: true, isActive: true },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID "${dto.userId}" not found`);
    }

    if (!targetUser.isActive) {
      throw new BadRequestException(
        `Cannot assign inactive user "${targetUser.fullName}" to unit`,
      );
    }

    // Upsert membership
    const membership = await this.prisma.teamMember.upsert({
      where: {
        teamId_userId: { teamId: unitId, userId: dto.userId },
      },
      create: {
        teamId: unitId,
        userId: dto.userId,
        memberRole: dto.memberRole || 'MEMBER',
        isPrimary: dto.isPrimary ?? true,
        status: 'ACTIVE',
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : new Date(),
        effectiveUntil: dto.effectiveUntil
          ? new Date(dto.effectiveUntil)
          : null,
      },
      update: {
        memberRole: dto.memberRole || 'MEMBER',
        isPrimary: dto.isPrimary ?? true,
        status: 'ACTIVE',
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : undefined,
        effectiveUntil: dto.effectiveUntil
          ? new Date(dto.effectiveUntil)
          : null,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
        team: {
          select: {
            id: true,
            name: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    // Optionally sync user's departmentId if primary
    if (dto.isPrimary) {
      await this.prisma.user.update({
        where: { id: dto.userId },
        data: { departmentId: unit.departmentId },
      });
    }

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'USER_ASSIGNED_TO_UNIT',
      entity: 'UNIT_MEMBER',
      entityId: membership.id,
      entityName: `${targetUser.fullName} -> ${unit.name}`,
      userId: actorUserId,
      newValue: {
        userId: targetUser.id,
        userName: targetUser.fullName,
        unitId: unit.id,
        unitName: unit.name,
        departmentName: unit.department.name,
        memberRole: membership.memberRole,
        isPrimary: membership.isPrimary,
      },
      description: `User "${targetUser.fullName}" assigned to "${unit.name}" (${membership.memberRole})`,
    });

    return membership;
  }

  /**
   * Remove a User from an Organizational Unit / Team
   */
  async removeMember(unitId: string, userId: string, actorUserId?: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: unitId, userId } },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!membership) {
      throw new NotFoundException(
        'User is not a member of this organizational unit',
      );
    }

    await this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId: unitId, userId } },
    });

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'USER_REMOVED_FROM_UNIT',
      entity: 'UNIT_MEMBER',
      entityId: membership.id,
      entityName: `${membership.user.fullName} -> ${membership.team.name}`,
      userId: actorUserId,
      oldValue: {
        userId: membership.user.id,
        userName: membership.user.fullName,
        unitId: membership.team.id,
        unitName: membership.team.name,
      },
      description: `User "${membership.user.fullName}" removed from "${membership.team.name}"`,
    });

    return {
      success: true,
      message: `User removed from unit "${membership.team.name}"`,
    };
  }

  /**
   * Soft-delete Organizational Unit
   */
  async softDelete(id: string, actorUserId?: string) {
    const unit = await this.prisma.team.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: { where: { status: 'ACTIVE' } },
            childTeams: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!unit || unit.deletedAt) {
      throw new NotFoundException(
        `Organizational unit with ID "${id}" not found`,
      );
    }

    if (unit._count.members > 0 || unit._count.childTeams > 0) {
      throw new BadRequestException(
        `Cannot delete unit "${unit.name}" because it contains active members (${unit._count.members}) or nested teams (${unit._count.childTeams}). Archive it instead to preserve history.`,
      );
    }

    const updated = await this.prisma.team.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: UnitStatusEnum.ARCHIVED,
      },
    });

    await this.auditService.logAction({
      module: 'ORGANIZATION',
      action: 'UNIT_ARCHIVED',
      entity: 'UNIT',
      entityId: updated.id,
      entityName: updated.name,
      userId: actorUserId,
      description: `Unit "${updated.name}" deleted/archived`,
    });

    return {
      success: true,
      message: `Unit "${updated.name}" has been safely archived`,
    };
  }
}
