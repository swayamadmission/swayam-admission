import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  RoleStatus,
  DataScope,
  GovernanceRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleQueryDto } from './dto/role-query.dto';
import { SYSTEM_PERMISSIONS } from './seed-permissions';
import { RoleHierarchyService } from './role-hierarchy.service';
import { GovernanceService } from './governance.service';

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: RoleHierarchyService,
    private readonly governanceService: GovernanceService,
  ) {}

  private async resolveAuditUserId(userId?: string): Promise<string | null> {
    if (!userId) return null;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      return user ? user.id : null;
    } catch {
      return null;
    }
  }

  async onModuleInit() {
    await this.seedPermissionsAndDefaultRoles();
  }

  /**
   * Seed default permissions and system roles if database is empty or missing them
   */
  private async seedPermissionsAndDefaultRoles() {
    try {
      // 1. Seed Permissions
      for (const p of SYSTEM_PERMISSIONS) {
        await this.prisma.permission.upsert({
          where: { code: p.code },
          update: {
            module: p.module,
            resource: p.resource,
            action: p.action,
            description: p.description,
            category: p.category,
            group: p.group,
          },
          create: p,
        });
      }

      // 2. Seed System Roles with Hierarchy, Status, Data Scope, and Protected flags
      const defaultRoles = [
        {
          name: 'Super Admin',
          slug: 'super-admin',
          description:
            'Full un-restricted system, governance & workspace administration access',
          color: '#DC2626',
          icon: 'Shield',
          level: 1,
          priority: 100,
          department: 'Executive',
          isSystem: true,
          isDefault: false,
          isProtected: true,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.GLOBAL,
          roleType: 'GOVERNANCE',
        },
        {
          name: 'Director',
          slug: 'director',
          description:
            'Executive management with full visibility across CRM and reports',
          color: '#7C3AED',
          icon: 'Users',
          level: 2,
          priority: 90,
          department: 'Management',
          isSystem: true,
          isDefault: false,
          isProtected: true,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.GLOBAL,
          roleType: 'EXECUTIVE',
        },
        {
          name: 'CFO',
          slug: 'cfo',
          description:
            'Chief Financial Officer managing fiscal governance, ledger audits and refunds',
          color: '#D97706',
          icon: 'CreditCard',
          level: 3,
          priority: 85,
          department: 'Finance',
          isSystem: true,
          isDefault: false,
          isProtected: true,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.DEPARTMENT,
          roleType: 'EXECUTIVE',
        },
        {
          name: 'State Manager',
          slug: 'state-manager',
          description:
            'Regional lead managing state-level admissions and counselor teams',
          color: '#2563EB',
          icon: 'MapPin',
          level: 4,
          priority: 80,
          department: 'Operations',
          isSystem: true,
          isDefault: false,
          isProtected: false,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.STATE,
          roleType: 'OPERATIONAL',
          stateRestricted: true,
        },
        {
          name: 'Senior Counselor',
          slug: 'senior-counselor',
          description:
            'Lead student counselor with lead assignment and review privileges',
          color: '#0EA5E9',
          icon: 'UserCheck',
          level: 5,
          priority: 70,
          department: 'Admissions',
          isSystem: true,
          isDefault: false,
          isProtected: false,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.TEAM,
          roleType: 'OPERATIONAL',
        },
        {
          name: 'Counselor',
          slug: 'counselor',
          description:
            'Student guidance counselor managing assigned leads and applications',
          color: '#4A7B5B',
          icon: 'GraduationCap',
          level: 6,
          priority: 60,
          department: 'Admissions',
          isSystem: true,
          isDefault: true,
          isProtected: false,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.ASSIGNED,
          roleType: 'OPERATIONAL',
        },
        {
          name: 'Finance',
          slug: 'finance',
          description:
            'Financial auditor managing payment verification, receipts, and refunds',
          color: '#F0AE1A',
          icon: 'CreditCard',
          level: 6,
          priority: 50,
          department: 'Finance',
          isSystem: true,
          isDefault: false,
          isProtected: false,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.DEPARTMENT,
          roleType: 'OPERATIONAL',
        },
        {
          name: 'Support',
          slug: 'support',
          description:
            'Helpdesk support staff assisting students with document queries',
          color: '#64748B',
          icon: 'Info',
          level: 7,
          priority: 40,
          department: 'Support',
          isSystem: true,
          isDefault: false,
          isProtected: false,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.GLOBAL,
          roleType: 'OPERATIONAL',
        },
        {
          name: 'College Admin',
          slug: 'college-admin',
          description:
            'Partner college institutional administrator managing offerings, staff, applications, and documents',
          color: '#4A7B5B',
          icon: 'Building2',
          level: 5,
          priority: 75,
          department: 'College Operations',
          isSystem: true,
          isDefault: false,
          isProtected: false,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.COLLEGE,
          roleType: 'COLLEGE_PARTNER',
        },
        {
          name: 'College Admission Officer',
          slug: 'college-admission-officer',
          description:
            'College admission reviewer handling application intake, eligibility check, review lock, and approvals',
          color: '#0D9488',
          icon: 'GraduationCap',
          level: 6,
          priority: 65,
          department: 'Admissions',
          isSystem: true,
          isDefault: false,
          isProtected: false,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.COLLEGE,
          roleType: 'COLLEGE_PARTNER',
        },
        {
          name: 'College Finance Officer',
          slug: 'college-finance-officer',
          description:
            'College finance officer tracking institutional fees and verifying college-direct payments',
          color: '#D97706',
          icon: 'DollarSign',
          level: 6,
          priority: 60,
          department: 'Finance',
          isSystem: true,
          isDefault: false,
          isProtected: false,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.COLLEGE,
          roleType: 'COLLEGE_PARTNER',
        },
        {
          name: 'College Reporting Officer',
          slug: 'college-reporting-officer',
          description:
            'College campus verification officer verifying physical reporting and confirming final student enrollment',
          color: '#2563EB',
          icon: 'CheckCircle2',
          level: 6,
          priority: 60,
          department: 'Admissions',
          isSystem: true,
          isDefault: false,
          isProtected: false,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.COLLEGE,
          roleType: 'COLLEGE_PARTNER',
        },
        {
          name: 'College Counselor',
          slug: 'college-counselor',
          description:
            'College-side counselor engaging with incoming prospective college applicants',
          color: '#8B5CF6',
          icon: 'Users',
          level: 7,
          priority: 50,
          department: 'Counseling',
          isSystem: true,
          isDefault: false,
          isProtected: false,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.COLLEGE,
          roleType: 'COLLEGE_PARTNER',
        },
        {
          name: 'College Viewer',
          slug: 'college-viewer',
          description:
            'Read-only institutional analytics viewer for college management',
          color: '#94A3B8',
          icon: 'Eye',
          level: 8,
          priority: 30,
          department: 'Management',
          isSystem: true,
          isDefault: false,
          isProtected: false,
          status: RoleStatus.ACTIVE,
          isActive: true,
          dataScope: DataScope.COLLEGE,
          roleType: 'COLLEGE_PARTNER',
        },
      ];

      const allPerms = await this.prisma.permission.findMany();

      for (const r of defaultRoles) {
        const role = await this.prisma.roleEntity.upsert({
          where: { slug: r.slug },
          update: {
            description: r.description,
            color: r.color,
            level: r.level,
            priority: r.priority,
            department: r.department,
            isProtected: r.isProtected,
            status: r.status,
            dataScope: r.dataScope,
            roleType: r.roleType,
          },
          create: r,
        });

        // Grant permissions to default system roles
        for (const p of allPerms) {
          const allow =
            r.slug === 'super-admin'
              ? true
              : r.slug === 'director'
                ? p.action !== 'delete'
                : r.slug === 'cfo'
                  ? p.module === 'payments' ||
                    p.module === 'analytics' ||
                    p.module === 'dashboard' ||
                    p.module === 'governance'
                  : r.slug === 'finance'
                    ? p.module === 'payments' ||
                      p.module === 'analytics' ||
                      p.module === 'dashboard'
                    : r.slug === 'senior-counselor'
                      ? [
                          'lead.view',
                          'lead.create',
                          'lead.edit',
                          'lead.assign',
                          'student.view',
                          'application.view',
                          'document.view',
                          'counselor.view',
                          'dashboard.view',
                        ].includes(p.code)
                      : r.slug === 'counselor'
                        ? [
                            'lead.view',
                            'lead.create',
                            'student.view',
                            'application.view',
                            'document.view',
                            'dashboard.view',
                          ].includes(p.code)
                        : r.slug === 'college-admin'
                          ? [
                              'college.view',
                              'college.manage',
                              'college.offering.view',
                              'college.offering.create',
                              'college.offering.edit',
                              'college.offering.submit',
                              'college.offering.close',
                              'college.application.view',
                              'college.application.claim',
                              'college.application.review',
                              'college.application.approve',
                              'college.application.reject',
                              'college.application.reopen',
                              'college.reporting.view',
                              'college.reporting.verify',
                              'college.enrollment.view',
                              'college.enrollment.confirm',
                              'college.staff.manage',
                              'college.documents.manage',
                              'document.view',
                              'dashboard.view',
                            ].includes(p.code)
                          : r.slug === 'college-admission-officer'
                            ? [
                                'college.view',
                                'college.offering.view',
                                'college.application.view',
                                'college.application.claim',
                                'college.application.review',
                                'college.application.approve',
                                'college.application.reject',
                                'college.application.reopen',
                                'document.view',
                                'dashboard.view',
                              ].includes(p.code)
                            : r.slug === 'college-finance-officer'
                              ? [
                                  'college.view',
                                  'college.offering.view',
                                  'payment.view',
                                  'payment.verify',
                                  'college.application.view',
                                  'dashboard.view',
                                ].includes(p.code)
                              : r.slug === 'college-reporting-officer'
                                ? [
                                    'college.view',
                                    'college.reporting.view',
                                    'college.reporting.verify',
                                    'college.enrollment.view',
                                    'college.enrollment.confirm',
                                    'college.application.view',
                                    'dashboard.view',
                                  ].includes(p.code)
                                : r.slug === 'college-counselor'
                                  ? [
                                      'college.view',
                                      'college.offering.view',
                                      'college.application.view',
                                      'dashboard.view',
                                    ].includes(p.code)
                                  : r.slug === 'college-viewer'
                                    ? [
                                        'college.view',
                                        'college.offering.view',
                                        'college.application.view',
                                        'dashboard.view',
                                      ].includes(p.code)
                                    : true;

          if (allow) {
            await this.prisma.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: role.id,
                  permissionId: p.id,
                },
              },
              update: { allow: true },
              create: {
                roleId: role.id,
                permissionId: p.id,
                allow: true,
              },
            });
          }
        }
      }

      this.logger.log(
        'Permissions and Default IAM Roles synchronized successfully.',
      );
    } catch (err: any) {
      this.logger.warn(
        `Roles & permissions seed skipped or delayed: ${err.message}`,
      );
    }
  }

  /**
   * Get IAM Statistics for Admin Dashboard
   */
  async getStats() {
    const [
      totalRoles,
      activeRoles,
      disabledRoles,
      lockedRoles,
      archivedRoles,
      protectedRoles,
      systemRoles,
      customRoles,
      restrictedRoles,
      totalPermissions,
      totalUsersWithRoles,
      departmentsCount,
      pendingGovernanceCount,
    ] = await Promise.all([
      this.prisma.roleEntity.count({ where: { deletedAt: null } }),
      this.prisma.roleEntity.count({
        where: { status: 'ACTIVE', deletedAt: null },
      }),
      this.prisma.roleEntity.count({
        where: { status: 'DISABLED', deletedAt: null },
      }),
      this.prisma.roleEntity.count({
        where: { status: 'LOCKED', deletedAt: null },
      }),
      this.prisma.roleEntity.count({ where: { status: 'ARCHIVED' } }),
      this.prisma.roleEntity.count({
        where: { isProtected: true, deletedAt: null },
      }),
      this.prisma.roleEntity.count({
        where: { isSystem: true, deletedAt: null },
      }),
      this.prisma.roleEntity.count({
        where: { isSystem: false, deletedAt: null },
      }),
      this.prisma.roleEntity.count({
        where: { stateRestricted: true, deletedAt: null },
      }),
      this.prisma.permission.count(),
      this.prisma.userRole.count(),
      this.prisma.department.count(),
      this.prisma.governanceRequest.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      totalRoles,
      activeRoles,
      disabledRoles,
      lockedRoles,
      archivedRoles,
      protectedRoles,
      systemRoles,
      customRoles,
      restrictedRoles,
      totalPermissions,
      totalUsersWithRoles,
      departmentsCount: departmentsCount || 7,
      pendingGovernanceCount,
    };
  }

  /**
   * Get all roles with pagination, search, status, and permissions
   */
  async findAll(dto: RoleQueryDto) {
    const where: any = { deletedAt: null };

    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { description: { contains: dto.search, mode: 'insensitive' } },
        { department: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    if (dto.department) {
      where.department = dto.department;
    }

    if (dto.status) {
      where.status = dto.status;
    } else if (dto.isActive !== undefined) {
      where.isActive = dto.isActive;
    }

    if (dto.isProtected !== undefined) {
      where.isProtected = dto.isProtected;
    }

    if (dto.isSystem !== undefined) {
      where.isSystem = dto.isSystem;
    }

    const [roles, total] = await Promise.all([
      this.prisma.roleEntity.findMany({
        where,
        include: {
          parentRole: { select: { id: true, name: true, slug: true } },
          childRoles: {
            select: { id: true, name: true, slug: true, status: true },
          },
          permissions: {
            where: { allow: true },
            include: { permission: true },
          },
          userRoles: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true, role: true },
              },
            },
          },
          stateRestrictions: true,
          permissionPolicies: true,
          _count: { select: { userRoles: true } },
        },
        orderBy: [{ priority: 'desc' }, { level: 'asc' }],
      }),
      this.prisma.roleEntity.count({ where }),
    ]);

    // Format roles for UI
    const formattedRoles = roles.map((r) => {
      const permissionsMap: Record<string, Record<string, boolean>> = {};

      for (const rp of r.permissions) {
        const mod = rp.permission.module;
        const act = rp.permission.action;
        if (!permissionsMap[mod]) {
          permissionsMap[mod] = {
            view: false,
            create: false,
            edit: false,
            delete: false,
            export: false,
            approve: false,
          };
        }
        permissionsMap[mod][act] = rp.allow;
      }

      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description || '',
        color: r.color || '#4A7B5B',
        icon: r.icon || 'Shield',
        level: r.level,
        priority: r.priority,
        department: r.department || 'General',
        parentRoleId: r.parentRoleId,
        parentRoleName: r.parentRole?.name || null,
        childRoles: r.childRoles,
        isSystem: r.isSystem,
        isDefault: r.isDefault,
        isProtected: r.isProtected,
        status: r.status,
        isActive: r.isActive && r.status === 'ACTIVE',
        dataScope: r.dataScope,
        roleType: r.roleType,
        lockReason: r.lockReason,
        lockedAt: r.lockedAt,
        stateRestricted: r.stateRestricted,
        userCount: r._count.userRoles,
        states: r.stateRestrictions.map((s) => s.state),
        permissions: permissionsMap,
        directPermissionsCount: r.permissions.length,
        policiesCount: r.permissionPolicies.length,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    return {
      data: formattedRoles,
      meta: {
        total,
        page: dto.page || 1,
        limit: dto.limit || 50,
      },
    };
  }

  /**
   * Find single role by ID with hierarchy & effective permissions calculation
   */
  async findOne(id: string) {
    const role = await this.prisma.roleEntity.findFirst({
      where: { id, deletedAt: null },
      include: {
        parentRole: { select: { id: true, name: true, slug: true } },
        childRoles: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            level: true,
          },
        },
        permissions: { include: { permission: true } },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                mobile: true,
                role: true,
                createdAt: true,
              },
            },
          },
        },
        stateRestrictions: true,
        permissionPolicies: true,
        auditLogs: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { fullName: true, email: true } } },
        },
        governanceRequests: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            requestedBy: { select: { fullName: true } },
            approvedBy: { select: { fullName: true } },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    const { direct, inherited, effective } =
      await this.hierarchyService.getEffectivePermissionsForRole(id);

    return {
      ...role,
      directPermissions: direct,
      inheritedPermissions: inherited,
      effectivePermissions: effective,
    };
  }

  /**
   * Create a new dynamic role
   */
  async createRole(dto: CreateRoleDto, userId?: string) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Role name is required');
    }

    const name = dto.name.trim();
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existing = await this.prisma.roleEntity.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug: { equals: slug, mode: 'insensitive' } },
        ],
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Role with name "${name}" already exists`);
    }

    // Clean parentRoleId
    const parentRoleId =
      dto.parentRoleId && dto.parentRoleId.trim() !== ''
        ? dto.parentRoleId
        : null;

    if (parentRoleId) {
      const parent = await this.prisma.roleEntity.findUnique({
        where: { id: parentRoleId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent role with ID "${parentRoleId}" not found`,
        );
      }
    }

    let auditUserId: string | null = null;
    if (userId) {
      const u = await this.prisma.user.findUnique({ where: { id: userId } });
      if (u) auditUserId = userId;
    }

    return await this.prisma.$transaction(async (tx) => {
      const role = await tx.roleEntity.create({
        data: {
          name,
          slug,
          description: dto.description || '',
          icon: dto.icon || 'Shield',
          color: dto.color || '#4A7B5B',
          level: dto.level || 5,
          priority: dto.priority || 50,
          department: dto.department || 'General',
          departmentId: dto.departmentId || null,
          parentRoleId,
          status: dto.status || RoleStatus.ACTIVE,
          isActive: dto.status
            ? dto.status === RoleStatus.ACTIVE
            : dto.isActive !== undefined
              ? dto.isActive
              : true,
          isProtected: dto.isProtected || false,
          selfRegistrable: dto.selfRegistrable || false,
          approvalRequired:
            dto.approvalRequired !== undefined ? dto.approvalRequired : true,
          dataScope: dto.dataScope || DataScope.GLOBAL,
          roleType: dto.roleType || 'CUSTOM',
          stateRestricted: dto.stateRestricted || false,
          createdById: auditUserId,
        },
      });

      // 1. Process permissions
      const allPermissions = await tx.permission.findMany();
      const addedPermissionIds = new Set<string>();

      if (dto.permissionsMatrix) {
        for (const [mod, acts] of Object.entries(dto.permissionsMatrix)) {
          for (const [action, allow] of Object.entries(acts)) {
            if (allow) {
              const code = `${mod === 'rbac' ? 'roles' : mod}.${action}`;
              const match = allPermissions.find(
                (p) =>
                  p.code === code || (p.module === mod && p.action === action),
              );
              if (match && !addedPermissionIds.has(match.id)) {
                addedPermissionIds.add(match.id);
                await tx.rolePermission.create({
                  data: {
                    roleId: role.id,
                    permissionId: match.id,
                    allow: true,
                  },
                });
              }
            }
          }
        }
      } else if (dto.permissionCodes && dto.permissionCodes.length > 0) {
        const matches = allPermissions.filter((p) =>
          dto.permissionCodes?.includes(p.code),
        );
        for (const p of matches) {
          if (!addedPermissionIds.has(p.id)) {
            addedPermissionIds.add(p.id);
            await tx.rolePermission.create({
              data: { roleId: role.id, permissionId: p.id, allow: true },
            });
          }
        }
      }

      // 2. Process State Restrictions
      if (dto.states && dto.states.length > 0) {
        const addedStates = new Set<string>();
        for (const st of dto.states) {
          if (st && !addedStates.has(st)) {
            addedStates.add(st);
            await tx.stateRestriction.create({
              data: {
                roleId: role.id,
                state: st,
                district: dto.restrictions?.district || null,
              },
            });
          }
        }
      }

      // 3. Process ABAC Policies
      if (dto.policies) {
        const addedPolicies = new Set<string>();
        for (const [policyKey, enabled] of Object.entries(dto.policies)) {
          if (enabled && !addedPolicies.has(policyKey)) {
            addedPolicies.add(policyKey);
            await tx.permissionPolicy.create({
              data: {
                roleId: role.id,
                name: policyKey,
                ruleType: policyKey.toUpperCase(),
                enabled: true,
              },
            });
          }
        }
      }

      // 4. Audit log
      await tx.roleAuditLog.create({
        data: {
          roleId: role.id,
          userId: auditUserId,
          action: 'ROLE_CREATED',
          newValue: {
            name: role.name,
            department: role.department,
            dataScope: role.dataScope,
            level: role.level,
          },
          reason: 'Dynamic role created via IAM portal',
        },
      });

      this.logger.log(`Role "${role.name}" (${role.id}) successfully created.`);
      return role;
    });
  }

  /**
   * Update existing role with protected role safeguard
   */
  async updateRole(id: string, dto: UpdateRoleDto, userId?: string) {
    const role = await this.findOne(id);

    if (role.isProtected && dto.name && dto.name !== role.name) {
      throw new ForbiddenException(
        'Protected role names cannot be renamed directly.',
      );
    }

    if (
      dto.parentRoleId !== undefined &&
      dto.parentRoleId !== role.parentRoleId
    ) {
      await this.hierarchyService.validateHierarchyAssignment(
        id,
        dto.parentRoleId || null,
      );
    }

    const updated = await this.prisma.roleEntity.update({
      where: { id },
      data: {
        name: dto.name || undefined,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        level: dto.level,
        priority: dto.priority,
        department: dto.department,
        departmentId: dto.departmentId,
        parentRoleId: dto.parentRoleId,
        dataScope: dto.dataScope,
        roleType: dto.roleType,
        stateRestricted: dto.stateRestricted,
        selfRegistrable:
          dto.selfRegistrable !== undefined ? dto.selfRegistrable : undefined,
        approvalRequired:
          dto.approvalRequired !== undefined ? dto.approvalRequired : undefined,
      },
    });

    if (dto.permissionsMatrix) {
      await this.updatePermissionsMatrix(id, dto.permissionsMatrix, userId);
    }

    await this.prisma.roleAuditLog.create({
      data: {
        roleId: id,
        userId: await this.resolveAuditUserId(userId),
        action: 'ROLE_UPDATED',
        oldValue: {
          name: role.name,
          department: role.department,
          dataScope: role.dataScope,
        },
        newValue: {
          name: updated.name,
          department: updated.department,
          dataScope: updated.dataScope,
        },
        reason: 'Role updated via IAM administration',
      },
    });

    return updated;
  }

  /**
   * Update permission matrix for a role
   */
  async updatePermissionsMatrix(
    roleId: string,
    permissionsMatrix: Record<string, Record<string, boolean>>,
    userId?: string,
  ) {
    const role = await this.findOne(roleId);

    const allPermissions = await this.prisma.permission.findMany();

    for (const [mod, acts] of Object.entries(permissionsMatrix)) {
      for (const [action, allow] of Object.entries(acts)) {
        const code = `${mod === 'rbac' ? 'roles' : mod}.${action}`;
        const match = allPermissions.find(
          (p) => p.code === code || (p.module === mod && p.action === action),
        );

        if (match) {
          await this.prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId,
                permissionId: match.id,
              },
            },
            update: { allow: !!allow },
            create: {
              roleId,
              permissionId: match.id,
              allow: !!allow,
            },
          });
        }
      }
    }

    await this.prisma.roleAuditLog.create({
      data: {
        roleId,
        userId: await this.resolveAuditUserId(userId),
        action: 'PERMISSION_CHANGED',
        reason: `Permissions matrix updated for role "${role.name}"`,
      },
    });

    return { success: true };
  }

  /**
   * Re-parent role in hierarchy transactionally
   */
  async reparentRole(
    id: string,
    newParentRoleId: string | null,
    userId?: string,
  ) {
    const role = await this.findOne(id);
    await this.hierarchyService.validateHierarchyAssignment(
      id,
      newParentRoleId,
    );

    let targetParentName = 'Root';
    if (newParentRoleId) {
      const parent = await this.prisma.roleEntity.findUnique({
        where: { id: newParentRoleId },
      });
      if (parent) targetParentName = parent.name;
    }

    const updated = await this.prisma.roleEntity.update({
      where: { id },
      data: { parentRoleId: newParentRoleId },
    });

    await this.prisma.roleAuditLog.create({
      data: {
        roleId: id,
        userId: await this.resolveAuditUserId(userId),
        action: 'ROLE_REPARENTED',
        oldValue: {
          parentRoleId: role.parentRoleId,
          parentName: role.parentRole?.name || 'Root',
        },
        newValue: {
          parentRoleId: newParentRoleId,
          parentName: targetParentName,
        },
        reason: `Role "${role.name}" reparented under "${targetParentName}"`,
      },
    });

    return updated;
  }

  /**
   * Preview re-parenting impact on effective permissions
   */
  async previewReparent(id: string, newParentRoleId: string | null) {
    return this.hierarchyService.previewReparent(id, newParentRoleId);
  }

  /**
   * Disable a role (lifecycle: DISABLED)
   */
  async disableRole(id: string, userId: string, reason?: string) {
    const role = await this.findOne(id);

    if (role.isProtected) {
      await this.governanceService.ensureNoLockout(id);
    }

    const updated = await this.prisma.roleEntity.update({
      where: { id },
      data: { status: RoleStatus.DISABLED, isActive: false },
    });

    await this.prisma.roleAuditLog.create({
      data: {
        roleId: id,
        userId: await this.resolveAuditUserId(userId),
        action: 'ROLE_DISABLED',
        oldValue: { status: role.status, isActive: role.isActive },
        newValue: { status: RoleStatus.DISABLED, isActive: false },
        reason: reason || `Role "${role.name}" disabled`,
      },
    });

    return updated;
  }

  /**
   * Enable a disabled role (lifecycle: ACTIVE)
   */
  async enableRole(id: string, userId: string) {
    const role = await this.findOne(id);

    const updated = await this.prisma.roleEntity.update({
      where: { id },
      data: { status: RoleStatus.ACTIVE, isActive: true },
    });

    await this.prisma.roleAuditLog.create({
      data: {
        roleId: id,
        userId: await this.resolveAuditUserId(userId),
        action: 'ROLE_ENABLED',
        oldValue: { status: role.status, isActive: role.isActive },
        newValue: { status: RoleStatus.ACTIVE, isActive: true },
        reason: `Role "${role.name}" enabled`,
      },
    });

    return updated;
  }

  /**
   * Emergency security lock on a role (lifecycle: LOCKED)
   */
  async lockRole(id: string, userId: string, reason: string) {
    const role = await this.findOne(id);

    if (!reason || !reason.trim()) {
      throw new BadRequestException(
        'A security justification reason is required to lock a role.',
      );
    }

    if (role.isProtected) {
      await this.governanceService.ensureNoLockout(id);
    }

    const updated = await this.prisma.roleEntity.update({
      where: { id },
      data: {
        status: RoleStatus.LOCKED,
        isActive: false,
        lockReason: reason.trim(),
        lockedAt: new Date(),
      },
    });

    await this.prisma.roleAuditLog.create({
      data: {
        roleId: id,
        userId: await this.resolveAuditUserId(userId),
        action: 'ROLE_LOCKED',
        oldValue: { status: role.status },
        newValue: {
          status: RoleStatus.LOCKED,
          lockReason: reason,
          lockedAt: new Date(),
        },
        reason: `EMERGENCY SECURITY LOCK: ${reason}`,
      },
    });

    return updated;
  }

  /**
   * Unlock a security-locked role (lifecycle: ACTIVE)
   */
  async unlockRole(id: string, userId: string) {
    const role = await this.findOne(id);

    const updated = await this.prisma.roleEntity.update({
      where: { id },
      data: {
        status: RoleStatus.ACTIVE,
        isActive: true,
        lockReason: null,
        lockedAt: null,
      },
    });

    await this.prisma.roleAuditLog.create({
      data: {
        roleId: id,
        userId: await this.resolveAuditUserId(userId),
        action: 'ROLE_UNLOCKED',
        oldValue: { status: RoleStatus.LOCKED, lockReason: role.lockReason },
        newValue: { status: RoleStatus.ACTIVE },
        reason: `Role "${role.name}" unlocked by governance administrator`,
      },
    });

    return updated;
  }

  /**
   * Archive a role for historical/audit purposes (lifecycle: ARCHIVED)
   */
  async archiveRole(id: string, userId: string, reason?: string) {
    const role = await this.findOne(id);

    if (role.isProtected) {
      throw new ForbiddenException(
        'Protected system roles cannot be archived.',
      );
    }

    const updated = await this.prisma.roleEntity.update({
      where: { id },
      data: {
        status: RoleStatus.ARCHIVED,
        isActive: false,
        archivedAt: new Date(),
        deletedAt: new Date(),
      },
    });

    await this.prisma.roleAuditLog.create({
      data: {
        roleId: id,
        userId: await this.resolveAuditUserId(userId),
        action: 'ROLE_ARCHIVED',
        oldValue: { status: role.status },
        newValue: { status: RoleStatus.ARCHIVED, archivedAt: new Date() },
        reason: reason || `Role "${role.name}" archived`,
      },
    });

    return updated;
  }

  /**
   * Assign a role to a user
   */
  async assignUserRole(
    roleId: string,
    targetUserId: string,
    actorUserId?: string,
  ) {
    const role = await this.findOne(roleId);

    if (
      role.status === RoleStatus.LOCKED ||
      role.status === RoleStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        `Cannot assign role with status ${role.status}`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${targetUserId}" not found`);
    }

    const existing = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId: targetUserId, roleId } },
    });

    if (existing) {
      return { success: true, message: 'User already holds this role' };
    }

    await this.prisma.userRole.create({
      data: { userId: targetUserId, roleId },
    });

    await this.prisma.roleAuditLog.create({
      data: {
        roleId,
        userId: actorUserId,
        action: 'USER_ROLE_ASSIGNED',
        newValue: { targetUserId, userEmail: user.email, roleName: role.name },
        reason: `Role "${role.name}" assigned to user "${user.fullName}" (${user.email})`,
      },
    });

    return {
      success: true,
      message: `Role "${role.name}" assigned to ${user.fullName}`,
    };
  }

  /**
   * Remove a role from a user with lockout prevention
   */
  async removeUserRole(
    roleId: string,
    targetUserId: string,
    actorUserId?: string,
  ) {
    const role = await this.findOne(roleId);

    if (role.isProtected) {
      await this.governanceService.ensureNoLockout(roleId, targetUserId);
    }

    await this.prisma.userRole.deleteMany({
      where: { userId: targetUserId, roleId },
    });

    await this.prisma.roleAuditLog.create({
      data: {
        roleId,
        userId: actorUserId,
        action: 'USER_ROLE_REMOVED',
        oldValue: { targetUserId, roleName: role.name },
        reason: `Role "${role.name}" removed from user "${targetUserId}"`,
      },
    });

    return { success: true, message: `Role "${role.name}" removed from user` };
  }

  /**
   * Clone an existing role
   */
  async cloneRole(id: string, newName?: string, userId?: string) {
    const sourceRole = await this.findOne(id);
    const clonedName = newName || `${sourceRole.name} (Copy)`;
    const slug = clonedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newRole = await this.prisma.roleEntity.create({
      data: {
        name: clonedName,
        slug,
        description: `Cloned from ${sourceRole.name}`,
        color: sourceRole.color,
        icon: sourceRole.icon,
        level: sourceRole.level,
        priority: sourceRole.priority,
        department: sourceRole.department,
        parentRoleId: sourceRole.parentRoleId,
        isSystem: false,
        isProtected: false,
        status: RoleStatus.ACTIVE,
        isActive: true,
        dataScope: sourceRole.dataScope,
        roleType: 'CUSTOM',
        stateRestricted: sourceRole.stateRestricted,
        createdById: userId || null,
      },
    });

    for (const rp of sourceRole.permissions) {
      await this.prisma.rolePermission.create({
        data: {
          roleId: newRole.id,
          permissionId: rp.permissionId,
          allow: rp.allow,
        },
      });
    }

    await this.prisma.roleAuditLog.create({
      data: {
        roleId: newRole.id,
        userId,
        action: 'ROLE_CREATED',
        newValue: { clonedFrom: sourceRole.name, newRole: newRole.name },
        reason: `Cloned from role "${sourceRole.name}"`,
      },
    });

    return newRole;
  }

  /**
   * Delete role (soft delete / archive)
   */
  async deleteRole(id: string, userId?: string) {
    const role = await this.findOne(id);

    if (role.isProtected || role.isSystem) {
      throw new ForbiddenException('Protected system roles cannot be deleted.');
    }

    if (role.userRoles && role.userRoles.length > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}" because it is currently assigned to ${role.userRoles.length} users. Reassign or remove users first.`,
      );
    }

    await this.archiveRole(
      id,
      userId || 'SYSTEM',
      'Role deleted via IAM portal',
    );

    return {
      success: true,
      message: `Role "${role.name}" archived successfully`,
    };
  }

  /**
   * Get all permissions grouped by module
   */
  async getPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    const grouped: Record<string, any[]> = {};
    for (const p of permissions) {
      const grp = p.group || p.module;
      if (!grouped[grp]) {
        grouped[grp] = [];
      }
      grouped[grp].push(p);
    }

    return { permissions, grouped };
  }

  /**
   * Get role hierarchy tree
   */
  async getHierarchy() {
    return this.hierarchyService.getHierarchyTree();
  }

  /**
   * Get IAM Audit Logs
   */
  async getAuditLogs(roleId?: string) {
    const where: any = {};
    if (roleId) {
      where.roleId = roleId;
    }

    const logs = await this.prisma.roleAuditLog.findMany({
      where,
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        role: { select: { name: true, slug: true } },
        user: { select: { fullName: true, email: true, role: true } },
      },
    });

    return { logs };
  }

  /**
   * Execute approved governance action
   */
  async executeGovernanceApproval(requestId: string, approverUserId: string) {
    const request = await this.governanceService.findOne(requestId);

    if (request.status !== GovernanceRequestStatus.PENDING) {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    if (request.requestedById === approverUserId) {
      throw new ForbiddenException(
        'Two-Person Rule: You cannot approve your own governance request.',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // Execute the requested action
      if (request.actionType === 'ROLE_DISABLE' && request.targetRoleId) {
        await tx.roleEntity.update({
          where: { id: request.targetRoleId },
          data: { status: RoleStatus.DISABLED, isActive: false },
        });
      } else if (request.actionType === 'ROLE_LOCK' && request.targetRoleId) {
        await tx.roleEntity.update({
          where: { id: request.targetRoleId },
          data: {
            status: RoleStatus.LOCKED,
            isActive: false,
            lockReason: request.reason,
            lockedAt: new Date(),
          },
        });
      } else if (
        request.actionType === 'ROLE_REPARENT' &&
        request.targetRoleId
      ) {
        const payload = request.payload as any;
        await tx.roleEntity.update({
          where: { id: request.targetRoleId },
          data: { parentRoleId: payload?.newParentRoleId || null },
        });
      }

      const updatedRequest = await tx.governanceRequest.update({
        where: { id: requestId },
        data: {
          status: GovernanceRequestStatus.APPROVED,
          approvedById: approverUserId,
          executedAt: new Date(),
        },
      });

      await tx.roleAuditLog.create({
        data: {
          roleId: request.targetRoleId,
          userId: approverUserId,
          action: 'GOVERNANCE_REQUEST_APPROVED',
          newValue: { requestId, actionType: request.actionType },
          reason: `Governance request #${requestId} approved and executed`,
        },
      });

      return updatedRequest;
    });
  }
}
