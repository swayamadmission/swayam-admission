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
import {
  SYSTEM_PERMISSIONS,
  ALL_35_MODULES,
  MODULE_ALIASES,
} from './seed-permissions';
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

  /**
   * Match permission code or module against module id and action, checking aliases
   */
  isPermissionMatch(
    p: { code: string; module: string; action: string },
    mod: string,
    act: string,
  ): boolean {
    const isActMatch =
      p.action === act ||
      (act === 'approve' && (p.action === 'publish' || p.action === 'approve')) ||
      (act === 'publish' && (p.action === 'approve' || p.action === 'publish'));
    if (!isActMatch) return false;

    if (p.code === `${mod}.${act}` || p.code === `${mod}.${p.action}`) return true;
    if (p.module === mod) return true;

    const aliases = MODULE_ALIASES[mod] || [mod];
    if (aliases.includes(p.module)) return true;
    if (
      aliases.some(
        (a) =>
          p.code === `${a}.${act}` ||
          p.code === `${a}.${p.action}` ||
          p.module === a,
      )
    ) {
      return true;
    }

    const pAliases = MODULE_ALIASES[p.module] || [p.module];
    if (pAliases.includes(mod)) return true;

    return false;
  }

  /**
   * Format Prisma RolePermissions array into synchronized matrix map for all 35 modules
   */
  formatPermissionsMap(
    permissions: Array<{
      allow: boolean;
      permission: { module: string; action: string; code: string };
    }>,
  ): Record<string, Record<string, boolean>> {
    const permissionsMap: Record<string, Record<string, boolean>> = {};

    const allModuleKeys = new Set<string>();
    for (const m of ALL_35_MODULES) {
      allModuleKeys.add(m.id);
      const aliases = MODULE_ALIASES[m.id] || [];
      for (const a of aliases) allModuleKeys.add(a);
    }
    // Explicit UI module IDs:
    allModuleKeys.add('guides');
    allModuleKeys.add('blogs');
    allModuleKeys.add('success-stories');
    allModuleKeys.add('testimonials');
    allModuleKeys.add('reviews');
    allModuleKeys.add('review-moderation');
    allModuleKeys.add('contacts');
    allModuleKeys.add('contact-management');

    for (const key of allModuleKeys) {
      permissionsMap[key] = {
        view: false,
        create: false,
        edit: false,
        delete: false,
        export: false,
        approve: false,
      };
    }

    for (const rp of permissions || []) {
      if (!rp.allow) continue;
      const p = rp.permission;
      const act = p.action;
      const normalizedAct = (act === 'publish' ? 'approve' : act);
      if (!['view', 'create', 'edit', 'delete', 'export', 'approve'].includes(normalizedAct)) {
        continue;
      }

      for (const key of allModuleKeys) {
        if (this.isPermissionMatch(p, key, normalizedAct)) {
          if (permissionsMap[key]) {
            permissionsMap[key][normalizedAct] = true;
          }
        }
      }
    }

    return permissionsMap;
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
   * Get dynamic form options for Create / Edit Role modals
   * Dynamic departments, active parent roles, and supported hierarchy levels
   */
  async getFormOptions() {
    // 1. Departments from DB (Department table + distinct role departments)
    const [deptsFromDb, roleDepts] = await Promise.all([
      this.prisma.department.findMany({
        where: { status: { not: 'ARCHIVED' } },
        select: { id: true, name: true, code: true, slug: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.roleEntity.findMany({
        where: { deletedAt: null, department: { not: null } },
        select: { department: true },
        distinct: ['department'],
      }),
    ]);

    const deptMap = new Map<string, { id?: string; name: string; code?: string }>();
    for (const d of deptsFromDb) {
      deptMap.set(d.name.toLowerCase().trim(), {
        id: d.id,
        name: d.name,
        code: d.code || undefined,
      });
    }
    for (const rd of roleDepts) {
      if (rd.department && !deptMap.has(rd.department.toLowerCase().trim())) {
        deptMap.set(rd.department.toLowerCase().trim(), {
          name: rd.department,
        });
      }
    }
    const departments = Array.from(deptMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    // 2. Parent Roles: only ACTIVE non-archived roles from database
    const parentRoles = await this.prisma.roleEntity.findMany({
      where: {
        status: RoleStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        level: true,
        priority: true,
        department: true,
        isProtected: true,
        parentRoleId: true,
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    // 3. Dynamic Hierarchy Levels from DB / configuration
    const levelLabels: Record<number, string> = {
      1: 'Level 1 (Executive / System Admin)',
      2: 'Level 2 (Director / State Head)',
      3: 'Level 3 (Regional / Zonal Manager)',
      4: 'Level 4 (Senior Officer / Branch Lead)',
      5: 'Level 5 (Operational / Counselor)',
      6: 'Level 6 (Support / Associate)',
      7: 'Level 7 (College Partner)',
      8: 'Level 8 (External Viewer)',
    };

    let hierarchyConfig: Array<{ level: number; label: string }> | null = null;
    try {
      const config = await this.prisma.systemConfiguration.findFirst({
        where: { key: 'ROLE_HIERARCHY_LEVELS' },
      });
      if (config && Array.isArray(config.value)) {
        hierarchyConfig = config.value as any;
      }
    } catch {}

    const dbLevels = await this.prisma.roleEntity.findMany({
      where: { deletedAt: null },
      select: { level: true },
      distinct: ['level'],
      orderBy: { level: 'asc' },
    });

    const levelSet = new Set<number>([1, 2, 3, 4, 5, 6]);
    for (const l of dbLevels) {
      if (typeof l.level === 'number') {
        levelSet.add(l.level);
      }
    }

    const levels =
      hierarchyConfig ||
      Array.from(levelSet)
        .sort((a, b) => a - b)
        .map((lvl) => ({
          level: lvl,
          label: levelLabels[lvl] || `Level ${lvl}`,
        }));

    return {
      departments,
      parentRoles,
      levels,
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
    } else if (!dto.includeArchived) {
      // By default exclude archived roles when not specifically requested
      where.status = { not: RoleStatus.ARCHIVED };
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
      const permissionsMap = this.formatPermissionsMap(r.permissions);

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
      permissions: this.formatPermissionsMap(role.permissions),
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
    if (name.length < 2) {
      throw new BadRequestException('Role name must be at least 2 characters');
    }

    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!slug) {
      slug = 'role-' + Date.now();
    }

    // Check for collision across both active and archived roles
    const existing = await this.prisma.roleEntity.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug: { equals: slug, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      if (existing.deletedAt || existing.status === RoleStatus.ARCHIVED) {
        throw new ConflictException(
          `A role with name "${name}" or slug "${slug}" exists in archived records. Please use a unique name or restore the archived role.`,
        );
      }
      throw new ConflictException(`Role with name "${name}" already exists`);
    }

    // Clean and validate parentRoleId
    const parentRoleId =
      dto.parentRoleId && dto.parentRoleId.trim() !== ''
        ? dto.parentRoleId.trim()
        : null;

    if (parentRoleId) {
      const parent = await this.prisma.roleEntity.findUnique({
        where: { id: parentRoleId },
      });
      if (!parent || parent.deletedAt) {
        throw new NotFoundException(
          `Parent role with ID "${parentRoleId}" not found`,
        );
      }
      if (parent.status === RoleStatus.ARCHIVED) {
        throw new BadRequestException(
          `Cannot select an archived role as a parent role.`,
        );
      }
      if (dto.level !== undefined && dto.level < parent.level) {
        throw new BadRequestException(
          `Child role level (${dto.level}) cannot exceed parent role authority level (${parent.level})`,
        );
      }
    }

    // Clean and validate departmentId
    let departmentId =
      dto.departmentId && dto.departmentId.trim() !== ''
        ? dto.departmentId.trim()
        : null;

    if (departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!dept) {
        departmentId = null;
      }
    } else if (dto.department) {
      const dept = await this.prisma.department.findFirst({
        where: {
          OR: [
            { name: { equals: dto.department, mode: 'insensitive' } },
            { slug: { equals: dto.department.toLowerCase().replace(/[^a-z0-9]+/g, '-'), mode: 'insensitive' } },
          ],
        },
      });
      if (dept) {
        departmentId = dept.id;
      }
    }

    // Normalize enums safely
    const dataScope =
      dto.dataScope && Object.values(DataScope).includes(dto.dataScope)
        ? dto.dataScope
        : DataScope.GLOBAL;

    const status =
      dto.status && Object.values(RoleStatus).includes(dto.status)
        ? dto.status
        : RoleStatus.ACTIVE;

    let auditUserId: string | null = null;
    if (userId) {
      const u = await this.prisma.user.findUnique({ where: { id: userId } });
      if (u) auditUserId = userId;
    }

    try {
      const createdRole = await this.prisma.$transaction(async (tx) => {
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
            departmentId,
            parentRoleId,
            status,
            isActive:
              status === RoleStatus.ACTIVE &&
              (dto.isActive !== undefined ? dto.isActive : true),
            isProtected: dto.isProtected || false,
            selfRegistrable: dto.selfRegistrable || false,
            approvalRequired:
              dto.approvalRequired !== undefined ? dto.approvalRequired : true,
            dataScope,
            roleType: dto.roleType || 'CUSTOM',
            stateRestricted:
              dto.stateRestricted ||
              dataScope === DataScope.STATE ||
              dataScope === DataScope.DISTRICT ||
              (dto.states && dto.states.length > 0) ||
              false,
            createdById: auditUserId,
          },
        });

        // 1. Process permissions matrix or codes
        const allPermissions = await tx.permission.findMany();
        const addedPermissionIds = new Set<string>();

        if (dto.permissionsMatrix) {
          for (const [mod, acts] of Object.entries(dto.permissionsMatrix)) {
            for (const [action, allow] of Object.entries(acts)) {
              if (allow) {
                const matches = allPermissions.filter((p) =>
                  this.isPermissionMatch(p, mod, action),
                );
                for (const match of matches) {
                  if (!addedPermissionIds.has(match.id)) {
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
              isProtected: role.isProtected,
            },
            reason: 'Dynamic role created via IAM portal',
          },
        });

        this.logger.log(`Role "${role.name}" (${role.id}) successfully created.`);
        return role;
      });
      return this.findOne(createdRole.id);
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          const target = (err.meta?.target as string[]) || [];
          const field = target.includes('name')
            ? 'Role name'
            : target.includes('slug')
              ? 'Role identifier/slug'
              : 'A unique field';
          throw new ConflictException(
            `${field} already exists. Please choose a different name.`,
          );
        }
        if (err.code === 'P2003') {
          throw new BadRequestException(
            'Referenced parent role, department, or user record was not found.',
          );
        }
      }
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      const errMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to create role "${name}":`, err instanceof Error ? err.stack : err);
      throw new BadRequestException(
        errMessage || 'Failed to create role due to database validation failure.',
      );
    }
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

    let departmentId = dto.departmentId;
    if (departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!dept) departmentId = undefined;
    }

    const dataScope =
      dto.dataScope && Object.values(DataScope).includes(dto.dataScope)
        ? dto.dataScope
        : undefined;

    try {
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
          departmentId,
          parentRoleId:
            dto.parentRoleId !== undefined
              ? dto.parentRoleId && dto.parentRoleId.trim() !== ''
                ? dto.parentRoleId.trim()
                : null
              : undefined,
          dataScope,
          roleType: dto.roleType,
          stateRestricted: dto.stateRestricted,
          isProtected:
            dto.isProtected !== undefined ? dto.isProtected : undefined,
          selfRegistrable:
            dto.selfRegistrable !== undefined ? dto.selfRegistrable : undefined,
          approvalRequired:
            dto.approvalRequired !== undefined ? dto.approvalRequired : undefined,
        },
      });

      if (dto.permissionsMatrix) {
        await this.updatePermissionsMatrix(id, dto.permissionsMatrix, userId);
      }

      if (dto.states !== undefined) {
        await this.prisma.stateRestriction.deleteMany({
          where: { roleId: id },
        });
        if (dto.states.length > 0) {
          const addedStates = new Set<string>();
          const stateData: Array<{ roleId: string; state: string; district: string | null }> = [];
          for (const st of dto.states) {
            if (st && !addedStates.has(st)) {
              addedStates.add(st);
              stateData.push({
                roleId: id,
                state: st,
                district: dto.restrictions?.district || null,
              });
            }
          }
          if (stateData.length > 0) {
            await this.prisma.stateRestriction.createMany({
              data: stateData,
            });
          }
        }
      }

      if (dto.policies) {
        await this.prisma.permissionPolicy.deleteMany({
          where: { roleId: id },
        });
        for (const [policyKey, enabled] of Object.entries(dto.policies)) {
          if (enabled) {
            await this.prisma.permissionPolicy.create({
              data: {
                roleId: id,
                name: policyKey,
                ruleType: policyKey.toUpperCase(),
                enabled: true,
              },
            });
          }
        }
      }

      if (dto.isProtected !== undefined && dto.isProtected !== role.isProtected) {
        await this.prisma.roleAuditLog.create({
          data: {
            roleId: id,
            userId: await this.resolveAuditUserId(userId),
            action: dto.isProtected ? 'ROLE_PROTECTED' : 'ROLE_UNPROTECTED',
            oldValue: { isProtected: role.isProtected },
            newValue: { isProtected: dto.isProtected },
            reason: `Role protection setting updated to ${dto.isProtected}`,
          },
        });
      }

      if (dto.dataScope && dto.dataScope !== role.dataScope) {
        await this.prisma.roleAuditLog.create({
          data: {
            roleId: id,
            userId: await this.resolveAuditUserId(userId),
            action: 'SCOPE_CHANGED',
            oldValue: { dataScope: role.dataScope },
            newValue: { dataScope: dto.dataScope },
            reason: `Data scope updated from ${role.dataScope} to ${dto.dataScope}`,
          },
        });
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

      return this.findOne(id);
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ConflictException(
            'A role with this name or identifier already exists. Please choose a different name.',
          );
        }
      }
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      const errMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to update role "${id}":`,
        err instanceof Error ? err.stack : err,
      );
      throw new BadRequestException(
        errMessage || 'Failed to update role due to database validation failure.',
      );
    }
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
        const matches = allPermissions.filter((p) =>
          this.isPermissionMatch(p, mod, action),
        );

        for (const match of matches) {
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
  async disableRole(id: string, userId?: string, reason?: string) {
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
  async enableRole(id: string, userId?: string) {
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
   * Restore an archived or disabled role (lifecycle: ACTIVE)
   */
  async restoreRole(id: string, userId?: string, reason?: string) {
    const role = await this.prisma.roleEntity.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    const updated = await this.prisma.roleEntity.update({
      where: { id },
      data: {
        status: RoleStatus.ACTIVE,
        isActive: true,
        archivedAt: null,
        deletedAt: null,
        lockReason: null,
        lockedAt: null,
      },
    });

    await this.prisma.roleAuditLog.create({
      data: {
        roleId: id,
        userId: await this.resolveAuditUserId(userId),
        action: 'ROLE_RESTORED',
        oldValue: { status: role.status, isActive: role.isActive },
        newValue: { status: RoleStatus.ACTIVE, isActive: true },
        reason: reason || `Role "${role.name}" restored to active status`,
      },
    });

    return updated;
  }

  /**
   * Emergency security lock on a role (lifecycle: LOCKED)
   */
  async lockRole(id: string, userId?: string, reason?: string) {
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
  async unlockRole(id: string, userId?: string) {
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
  async archiveRole(id: string, userId?: string, reason?: string) {
    const role = await this.findOne(id);

    if (role.isProtected || role.isSystem) {
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
        deletedAt: null,
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
        action: 'ROLE_ASSIGNED',
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
        action: 'ROLE_REMOVED',
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
    const sourceRole = await this.prisma.roleEntity.findUnique({
      where: { id },
      include: { permissions: true },
    });
    if (!sourceRole) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

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
   * Delete role (archive or permanent delete according to governance rules)
   */
  async deleteRole(id: string, userId?: string, permanent = false) {
    const role = await this.prisma.roleEntity.findUnique({
      where: { id },
      include: {
        userRoles: true,
        childRoles: true,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    if (role.isProtected || role.isSystem) {
      throw new ForbiddenException('Protected system roles cannot be deleted.');
    }

    if (role.userRoles && role.userRoles.length > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}" because it is currently assigned to ${role.userRoles.length} users. Reassign or remove users first.`,
      );
    }

    const auditUserId = await this.resolveAuditUserId(userId);

    // If permanent deletion requested OR role is already ARCHIVED:
    if (permanent || role.status === RoleStatus.ARCHIVED) {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Reparent any child roles so they don't break
        await tx.roleEntity.updateMany({
          where: { parentRoleId: id },
          data: { parentRoleId: role.parentRoleId || null },
        });

        // 2. Clear foreign key references on non-cascading relations
        await tx.position.updateMany({
          where: { roleId: id },
          data: { roleId: null },
        });

        await tx.staffRegistrationRequest.updateMany({
          where: { assignedRoleId: id },
          data: { assignedRoleId: null },
        });

        await tx.governanceRequest.updateMany({
          where: { targetRoleId: id },
          data: { targetRoleId: null },
        });

        // 3. Clean up relations
        await tx.roleAuditLog.deleteMany({
          where: { roleId: id },
        });

        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        await tx.stateRestriction.deleteMany({
          where: { roleId: id },
        });

        await tx.permissionPolicy.deleteMany({
          where: { roleId: id },
        });

        await tx.teamRole.deleteMany({
          where: { roleId: id },
        });

        // 4. Delete role entity permanently
        await tx.roleEntity.delete({
          where: { id },
        });

        // 5. System audit log for permanent deletion
        await tx.roleAuditLog.create({
          data: {
            userId: auditUserId,
            action: 'ROLE_DELETED_PERMANENTLY',
            oldValue: { id: role.id, name: role.name, status: role.status },
            reason: `Role "${role.name}" permanently deleted from database`,
          },
        });

        return {
          success: true,
          message: `Role "${role.name}" was permanently deleted.`,
        };
      });
    }

    // Otherwise, standard deletion moves role to ARCHIVED
    await this.archiveRole(
      id,
      userId || 'SYSTEM',
      'Role moved to archive via IAM portal',
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
      } else if (
        (request.actionType === 'ROLE_ENABLE' ||
          request.actionType === 'ROLE_RESTORE') &&
        request.targetRoleId
      ) {
        await tx.roleEntity.update({
          where: { id: request.targetRoleId },
          data: {
            status: RoleStatus.ACTIVE,
            isActive: true,
            deletedAt: null,
            archivedAt: null,
            lockReason: null,
            lockedAt: null,
          },
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
      } else if (request.actionType === 'ROLE_UNLOCK' && request.targetRoleId) {
        await tx.roleEntity.update({
          where: { id: request.targetRoleId },
          data: {
            status: RoleStatus.ACTIVE,
            isActive: true,
            lockReason: null,
            lockedAt: null,
          },
        });
      } else if (
        (request.actionType === 'ROLE_DELETE' ||
          request.actionType === 'ROLE_ARCHIVE') &&
        request.targetRoleId
      ) {
        await tx.roleEntity.update({
          where: { id: request.targetRoleId },
          data: {
            status: RoleStatus.ARCHIVED,
            isActive: false,
            deletedAt: new Date(),
            archivedAt: new Date(),
          },
        });
      } else if (
        request.actionType === 'ROLE_REPARENT' &&
        request.targetRoleId
      ) {
        const payload = (request.payload || {}) as Record<string, unknown>;
        const newParentRoleId = typeof payload.newParentRoleId === 'string' ? payload.newParentRoleId : null;
        await tx.roleEntity.update({
          where: { id: request.targetRoleId },
          data: { parentRoleId: newParentRoleId },
        });
      } else if (
        (request.actionType === 'ROLE_UPDATE' ||
          request.actionType === 'ROLE_EDIT') &&
        request.targetRoleId
      ) {
        const payload = (request.payload || {}) as Record<string, any>;
        if (Object.keys(payload).length > 0) {
          await tx.roleEntity.update({
            where: { id: request.targetRoleId },
            data: {
              name: typeof payload.name === 'string' ? payload.name : undefined,
              description: typeof payload.description === 'string' ? payload.description : undefined,
              department: typeof payload.department === 'string' ? payload.department : undefined,
              dataScope: payload.dataScope || undefined,
              level: typeof payload.level === 'number' ? payload.level : undefined,
              priority: typeof payload.priority === 'number' ? payload.priority : undefined,
              color: typeof payload.color === 'string' ? payload.color : undefined,
              icon: typeof payload.icon === 'string' ? payload.icon : undefined,
            },
          });
        }
      } else if (
        request.actionType === 'PERMISSION_CHANGE' &&
        request.targetRoleId
      ) {
        const payload = (request.payload || {}) as Record<string, any>;
        const pMatrix = payload.permissionsMatrix as Record<string, Record<string, boolean>> | undefined;
        if (pMatrix) {
          const allPermissions = await tx.permission.findMany();
          for (const [mod, acts] of Object.entries(pMatrix)) {
            for (const [action, allow] of Object.entries(acts)) {
              const matches = allPermissions.filter((p) =>
                this.isPermissionMatch(p, mod, action),
              );
              for (const match of matches) {
                await tx.rolePermission.upsert({
                  where: {
                    roleId_permissionId: {
                      roleId: request.targetRoleId,
                      permissionId: match.id,
                    },
                  },
                  update: { allow: !!allow },
                  create: {
                    roleId: request.targetRoleId,
                    permissionId: match.id,
                    allow: !!allow,
                  },
                });
              }
            }
          }
        }
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
          action: 'APPROVED',
          newValue: { requestId, actionType: request.actionType },
          reason: `Governance request #${requestId} approved and executed`,
        },
      });

      return updatedRequest;
    });
  }
}
