import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleHierarchyService } from '../roles/role-hierarchy.service';
import { Prisma } from '@prisma/client';

export interface DataScopeContext {
  userId: string;
  userEmail?: string;
  userRole?: string;
  roles: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    isProtected: boolean;
    dataScope: string;
    department?: string;
  }>;
  roleSlugs: string[];
  permissions: string[];
  dataScopes: string[];
  isSuperAdmin: boolean;
  isLocked: boolean;
  departmentIds: string[];
  departments: string[];
  teamIds: string[];
  teamMemberUserIds: string[];
  regionIds: string[];
  regions: string[];
  stateIds: string[];
  states: string[];
  districtIds: string[];
  districts: string[];
  collegeId?: string | null;
  isCollegeStaff: boolean;
}

@Injectable()
export class DataScopeService {
  private readonly logger = new Logger(DataScopeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: RoleHierarchyService,
  ) {}

  /**
   * Resolve complete DataScopeContext for a user
   */
  async resolveDataScope(userId: string): Promise<DataScopeContext> {
    if (!userId) {
      throw new UnauthorizedException(
        'User ID is required for data scope resolution',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  where: { allow: true },
                  include: { permission: true },
                },
              },
            },
          },
        },
        profile: true,
        counselorProfile: true,
        departmentEntity: true,
        managedDepartments: true,
        managedTeams: {
          include: {
            members: { select: { userId: true } },
          },
        },
        teamMemberships: {
          include: {
            team: {
              include: {
                members: { select: { userId: true } },
              },
            },
          },
        },
        primaryGeographicAssignments: {
          where: { status: 'ACTIVE' },
          include: { state: true, district: true },
        },
        backupGeographicAssignments: {
          where: { status: 'ACTIVE' },
          include: { state: true, district: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User record not found');
    }

    const assignedRoles = (user.userRoles || []).map((ur) => ur.role);

    // 1. Super Admin Check
    const isSuperAdminLegacy = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
    const isSuperAdminRoleEntity = assignedRoles.some(
      (r) =>
        (r.slug === 'super-admin' || r.slug === 'admin' || r.name?.toLowerCase() === 'super admin' || r.name?.toLowerCase() === 'admin') &&
        r.status === 'ACTIVE' &&
        r.isActive,
    );
    const isSuperAdmin = isSuperAdminLegacy || isSuperAdminRoleEntity;

    // 2. Locked Role Check (Security Lockout)
    const lockedRole = assignedRoles.find((r) => r.status === 'LOCKED');
    if (lockedRole) {
      return {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        roles: assignedRoles.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          status: r.status,
          isProtected: r.isProtected,
          dataScope: r.dataScope,
          department: r.department || undefined,
        })),
        roleSlugs: assignedRoles.map((r) => r.slug),
        permissions: [],
        dataScopes: [],
        isSuperAdmin: false,
        isLocked: true,
        departmentIds: [],
        departments: [],
        teamIds: [],
        teamMemberUserIds: [user.id],
        regionIds: [],
        regions: [],
        stateIds: [],
        states: [],
        districtIds: [],
        districts: [],
        collegeId: user.collegeId || null,
        isCollegeStaff:
          !!user.collegeId ||
          assignedRoles.some(
            (r) =>
              r.dataScope === 'COLLEGE' ||
              r.slug.startsWith('college-') ||
              r.roleType === 'COLLEGE_PARTNER',
          ),
      };
    }

    // 3. Filter to ACTIVE roles only
    const activeRoles = assignedRoles.filter(
      (r) => r.status === 'ACTIVE' && r.isActive && !r.deletedAt,
    );

    const effectivePermSet = new Set<string>();
    const dataScopesSet = new Set<string>();

    for (const r of activeRoles) {
      if (r.dataScope) {
        dataScopesSet.add(r.dataScope);
      }

      // Direct permissions
      for (const rp of r.permissions) {
        effectivePermSet.add(rp.permission.code);
      }

      // Inherited hierarchy permissions
      try {
        const { inherited } =
          await this.hierarchyService.getEffectivePermissionsForRole(r.id);
        for (const code of inherited) {
          effectivePermSet.add(code);
        }
      } catch (err: any) {
        this.logger.warn(
          `Hierarchy resolution failed for role ${r.id}: ${err.message}`,
        );
      }
    }

    // Fallback: If user has legacy enum role (e.g. STUDENT, ADMIN, COUNSELOR)
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || isSuperAdmin) {
      dataScopesSet.add('GLOBAL');
      const allPerms = await this.prisma.permission.findMany({
        select: { code: true },
      });
      for (const p of allPerms) {
        effectivePermSet.add(p.code);
      }
    } else if (activeRoles.length === 0 && user.role) {
      const slug = user.role.toLowerCase().replace(/_/g, '-');
      const matchingRole = await this.prisma.roleEntity.findFirst({
        where: { slug, status: 'ACTIVE', isActive: true, deletedAt: null },
        include: {
          permissions: {
            where: { allow: true },
            include: { permission: true },
          },
        },
      });

      if (matchingRole) {
        dataScopesSet.add(matchingRole.dataScope);
        for (const rp of matchingRole.permissions) {
          effectivePermSet.add(rp.permission.code);
        }
      } else if (
        user.role === 'COUNSELOR' ||
        user.role === 'SENIOR_COUNSELOR'
      ) {
        dataScopesSet.add('ASSIGNED');
      } else if (user.role === 'STUDENT') {
        dataScopesSet.add('SELF');
      }
    }

    if (isSuperAdmin || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      dataScopesSet.add('GLOBAL');
    }

    // Default scope if none found
    if (dataScopesSet.size === 0) {
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        dataScopesSet.add('GLOBAL');
      } else if (user.role === 'STUDENT') {
        dataScopesSet.add('SELF');
      } else if (user.role === 'COUNSELOR' || user.role === 'SENIOR_COUNSELOR') {
        dataScopesSet.add('ASSIGNED');
      } else {
        dataScopesSet.add('GLOBAL');
      }
    }

    // 4. Resolve Organizational Scope Attributes
    // Departments
    const departmentsSet = new Set<string>();
    const departmentIdsSet = new Set<string>();
    if (user.department) departmentsSet.add(user.department.trim());
    if (user.departmentEntity) {
      departmentsSet.add(user.departmentEntity.name.trim());
      departmentIdsSet.add(user.departmentEntity.id);
    }
    for (const md of user.managedDepartments || []) {
      departmentsSet.add(md.name.trim());
      departmentIdsSet.add(md.id);
    }
    if (user.counselorProfile?.department)
      departmentsSet.add(user.counselorProfile.department.trim());
    for (const r of activeRoles) {
      if (r.department) departmentsSet.add(r.department.trim());
      if (r.departmentId) departmentIdsSet.add(r.departmentId);
    }

    // Teams & Team Members
    const teamIdsSet = new Set<string>();
    const teamMemberUserIdsSet = new Set<string>([user.id]);

    for (const mt of user.managedTeams || []) {
      teamIdsSet.add(mt.id);
      for (const mem of mt.members || []) {
        teamMemberUserIdsSet.add(mem.userId);
      }
    }
    for (const tm of user.teamMemberships || []) {
      teamIdsSet.add(tm.teamId);
      if (tm.team?.departmentId) departmentIdsSet.add(tm.team.departmentId);
      for (const mem of tm.team?.members || []) {
        teamMemberUserIdsSet.add(mem.userId);
      }
    }

    // Regions
    const regionsSet = new Set<string>();
    if (user.counselorProfile?.assignedRegion) {
      regionsSet.add(user.counselorProfile.assignedRegion.trim());
    }

    // States & Geographic Responsibilities
    const statesSet = new Set<string>();
    const stateIdsSet = new Set<string>();
    const districtsSet = new Set<string>();
    const districtIdsSet = new Set<string>();

    if (user.state) statesSet.add(user.state.trim());
    if (user.profile?.state) statesSet.add(user.profile.state.trim());
    if (user.counselorProfile?.state)
      statesSet.add(user.counselorProfile.state.trim());
    if (Array.isArray(user.counselorProfile?.assignedStates)) {
      for (const st of user.counselorProfile.assignedStates) {
        if (st) statesSet.add(st.trim());
      }
    }

    // Primary & Backup Geographic Assignments
    const allAssignments = [
      ...(user.primaryGeographicAssignments || []),
      ...(user.backupGeographicAssignments || []),
    ];

    for (const ga of allAssignments) {
      if (ga.state) {
        statesSet.add(ga.state.name.trim());
        stateIdsSet.add(ga.state.id);
      }
      if (ga.district) {
        districtsSet.add(ga.district.name.trim());
        districtIdsSet.add(ga.district.id);
      }
    }

    // Districts / Cities
    if (user.city) districtsSet.add(user.city.trim());
    if (user.profile?.district) districtsSet.add(user.profile.district.trim());
    if (user.profile?.city) districtsSet.add(user.profile.city.trim());
    if (user.counselorProfile?.district)
      districtsSet.add(user.counselorProfile.district.trim());

    return {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      roles: assignedRoles.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        status: r.status,
        isProtected: r.isProtected,
        dataScope: r.dataScope,
        department: r.department || undefined,
      })),
      roleSlugs: assignedRoles.map((r) => r.slug),
      permissions: Array.from(effectivePermSet),
      dataScopes: Array.from(dataScopesSet),
      isSuperAdmin,
      isLocked: false,
      departmentIds: Array.from(departmentIdsSet),
      departments: Array.from(departmentsSet),
      teamIds: Array.from(teamIdsSet),
      teamMemberUserIds: Array.from(teamMemberUserIdsSet),
      regionIds: [],
      regions: Array.from(regionsSet),
      stateIds: Array.from(stateIdsSet),
      states: Array.from(statesSet),
      districtIds: Array.from(districtIdsSet),
      districts: Array.from(districtsSet),
      collegeId: user.collegeId || null,
      isCollegeStaff:
        !!user.collegeId ||
        assignedRoles.some(
          (r) =>
            r.dataScope === 'COLLEGE' ||
            r.slug.startsWith('college-') ||
            r.roleType === 'COLLEGE_PARTNER',
        ),
    };
  }

  // =========================================================================
  // SCOPE QUERY BUILDERS (Prisma WHERE clauses)
  // =========================================================================

  /**
   * Builds Prisma UserWhereInput filter for Student queries
   */
  buildStudentScopeFilter(ctx: DataScopeContext): Prisma.UserWhereInput {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) {
      return {};
    }

    const conditions: Prisma.UserWhereInput[] = [];

    for (const scope of ctx.dataScopes) {
      switch (scope) {
        case 'GLOBAL':
          return {};

        case 'DEPARTMENT':
          if (ctx.departments.length > 0) {
            conditions.push({
              OR: [
                { department: { in: ctx.departments, mode: 'insensitive' } },
                {
                  assignedCounselor: {
                    counselorProfile: {
                      department: { in: ctx.departments, mode: 'insensitive' },
                    },
                  },
                },
              ],
            });
          }
          break;

        case 'TEAM':
          if (ctx.teamMemberUserIds.length > 0) {
            conditions.push({
              OR: [
                { assignedCounselorId: { in: ctx.teamMemberUserIds } },
                {
                  applications: {
                    some: { counselorId: { in: ctx.teamMemberUserIds } },
                  },
                },
                {
                  assignedLeads: {
                    some: {
                      assignedCounselorId: { in: ctx.teamMemberUserIds },
                    },
                  },
                },
              ],
            });
          }
          break;

        case 'REGION':
          if (ctx.regions.length > 0) {
            conditions.push({
              assignedCounselor: {
                counselorProfile: {
                  assignedRegion: { in: ctx.regions, mode: 'insensitive' },
                },
              },
            });
          }
          break;

        case 'STATE':
          if (ctx.states.length > 0) {
            conditions.push({
              OR: [
                { state: { in: ctx.states, mode: 'insensitive' } },
                { profile: { state: { in: ctx.states, mode: 'insensitive' } } },
              ],
            });
          }
          break;

        case 'DISTRICT':
          if (ctx.districts.length > 0) {
            conditions.push({
              OR: [
                { city: { in: ctx.districts, mode: 'insensitive' } },
                {
                  profile: {
                    district: { in: ctx.districts, mode: 'insensitive' },
                  },
                },
                {
                  profile: { city: { in: ctx.districts, mode: 'insensitive' } },
                },
              ],
            });
          }
          break;

        case 'ASSIGNED':
          conditions.push({
            OR: [
              { assignedCounselorId: ctx.userId },
              { applications: { some: { counselorId: ctx.userId } } },
              { counselorAssignments: { some: { counselorId: ctx.userId } } },
              { assignedLeads: { some: { assignedCounselorId: ctx.userId } } },
            ],
          });
          break;

        case 'SELF':
          conditions.push({ id: ctx.userId });
          break;
      }
    }

    if (conditions.length === 0) {
      return { id: ctx.userId };
    }

    return conditions.length === 1 ? conditions[0] : { OR: conditions };
  }

  /**
   * Builds Prisma LeadWhereInput filter for Lead CRM queries
   */
  buildLeadScopeFilter(ctx: DataScopeContext): Prisma.LeadWhereInput {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) {
      return {};
    }

    const conditions: Prisma.LeadWhereInput[] = [];

    for (const scope of ctx.dataScopes) {
      switch (scope) {
        case 'GLOBAL':
          return {};

        case 'DEPARTMENT':
          if (ctx.departments.length > 0) {
            conditions.push({
              assignedCounselor: {
                counselorProfile: {
                  department: { in: ctx.departments, mode: 'insensitive' },
                },
              },
            });
          }
          break;

        case 'TEAM':
          if (ctx.teamMemberUserIds.length > 0) {
            conditions.push({
              assignedCounselorId: { in: ctx.teamMemberUserIds },
            });
          }
          break;

        case 'REGION':
          if (ctx.regions.length > 0) {
            conditions.push({
              assignedCounselor: {
                counselorProfile: {
                  assignedRegion: { in: ctx.regions, mode: 'insensitive' },
                },
              },
            });
          }
          break;

        case 'STATE':
          if (ctx.states.length > 0) {
            conditions.push({
              state: { in: ctx.states, mode: 'insensitive' },
            });
          }
          break;

        case 'DISTRICT':
          if (ctx.districts.length > 0) {
            conditions.push({
              city: { in: ctx.districts, mode: 'insensitive' },
            });
          }
          break;

        case 'ASSIGNED':
          conditions.push({
            OR: [
              { assignedCounselorId: ctx.userId },
              { assignedSeniorCounselorId: ctx.userId },
            ],
          });
          break;

        case 'SELF':
          conditions.push({
            OR: [
              ...(ctx.userEmail ? [{ email: ctx.userEmail }] : []),
              { assignedCounselorId: ctx.userId },
              { assignedSeniorCounselorId: ctx.userId },
            ],
          });
          break;
      }
    }

    if (conditions.length === 0) {
      return {
        OR: [
          { assignedCounselorId: ctx.userId },
          { assignedSeniorCounselorId: ctx.userId },
        ],
      };
    }

    return conditions.length === 1 ? conditions[0] : { OR: conditions };
  }

  /**
   * Builds Prisma UserWhereInput filter for Counselor queries
   */
  buildCounselorScopeFilter(ctx: DataScopeContext): Prisma.UserWhereInput {
    if (
      ctx.isSuperAdmin ||
      ctx.dataScopes.includes('GLOBAL') ||
      ctx.userRole === 'ADMIN' ||
      ctx.userRole === 'SUPER_ADMIN' ||
      ctx.userRole === 'SENIOR_COUNSELOR'
    ) {
      if (ctx.states && ctx.states.length > 0) {
        return {
          OR: [
            { state: { in: ctx.states, mode: 'insensitive' } },
            { counselorProfile: { state: { in: ctx.states, mode: 'insensitive' } } },
            { counselorProfile: { assignedStates: { hasSome: ctx.states } } },
            { counselorProfile: { assignedStates: { isEmpty: true } } },
          ],
        };
      }
      return {};
    }

    const conditions: Prisma.UserWhereInput[] = [];

    for (const scope of ctx.dataScopes) {
      switch (scope) {
        case 'GLOBAL':
          return {};

        case 'DEPARTMENT':
          if (ctx.departments.length > 0) {
            conditions.push({
              OR: [
                { department: { in: ctx.departments, mode: 'insensitive' } },
                {
                  counselorProfile: {
                    department: { in: ctx.departments, mode: 'insensitive' },
                  },
                },
              ],
            });
          }
          break;

        case 'TEAM':
          if (ctx.teamMemberUserIds.length > 0) {
            conditions.push({
              id: { in: ctx.teamMemberUserIds },
            });
          }
          break;

        case 'REGION':
          if (ctx.regions.length > 0) {
            conditions.push({
              counselorProfile: {
                assignedRegion: { in: ctx.regions, mode: 'insensitive' },
              },
            });
          }
          break;

        case 'STATE':
          if (ctx.states.length > 0) {
            conditions.push({
              OR: [
                { state: { in: ctx.states, mode: 'insensitive' } },
                {
                  counselorProfile: {
                    state: { in: ctx.states, mode: 'insensitive' },
                  },
                },
                {
                  counselorProfile: { assignedStates: { hasSome: ctx.states } },
                },
                {
                  counselorProfile: { assignedStates: { isEmpty: true } },
                },
              ],
            });
          }
          break;

        case 'DISTRICT':
          if (ctx.districts.length > 0) {
            conditions.push({
              OR: [
                { city: { in: ctx.districts, mode: 'insensitive' } },
                {
                  counselorProfile: {
                    district: { in: ctx.districts, mode: 'insensitive' },
                  },
                },
              ],
            });
          }
          break;

        case 'ASSIGNED':
          conditions.push({
            OR: [
              { id: ctx.userId },
              { counselorProfile: { reportingManagerId: ctx.userId } },
              { counselorProfile: { reportingManagerId: null } },
            ],
          });
          break;

        case 'SELF':
          conditions.push({ id: ctx.userId });
          break;
      }
    }

    if (conditions.length === 0) {
      if (ctx.userRole === 'COUNSELOR') {
        return { id: ctx.userId };
      }
      return {};
    }

    return conditions.length === 1 ? conditions[0] : { OR: conditions };
  }

  /**
   * Builds Prisma ApplicationWhereInput filter for Application queries
   */
  buildApplicationScopeFilter(
    ctx: DataScopeContext,
  ): Prisma.ApplicationWhereInput {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) {
      return {};
    }

    const conditions: Prisma.ApplicationWhereInput[] = [];

    for (const scope of ctx.dataScopes) {
      switch (scope) {
        case 'GLOBAL':
          return {};

        case 'DEPARTMENT':
          if (ctx.departments.length > 0) {
            conditions.push({
              counselor: {
                counselorProfile: {
                  department: { in: ctx.departments, mode: 'insensitive' },
                },
              },
            });
          }
          break;

        case 'TEAM':
          if (ctx.teamMemberUserIds.length > 0) {
            conditions.push({
              counselorId: { in: ctx.teamMemberUserIds },
            });
          }
          break;

        case 'REGION':
          if (ctx.regions.length > 0) {
            conditions.push({
              counselor: {
                counselorProfile: {
                  assignedRegion: { in: ctx.regions, mode: 'insensitive' },
                },
              },
            });
          }
          break;

        case 'STATE':
          if (ctx.states.length > 0) {
            conditions.push({
              user: {
                OR: [
                  { state: { in: ctx.states, mode: 'insensitive' } },
                  {
                    profile: { state: { in: ctx.states, mode: 'insensitive' } },
                  },
                ],
              },
            });
          }
          break;

        case 'DISTRICT':
          if (ctx.districts.length > 0) {
            conditions.push({
              user: {
                OR: [
                  { city: { in: ctx.districts, mode: 'insensitive' } },
                  {
                    profile: {
                      district: { in: ctx.districts, mode: 'insensitive' },
                    },
                  },
                ],
              },
            });
          }
          break;

        case 'ASSIGNED':
          conditions.push({
            OR: [
              { counselorId: ctx.userId },
              { user: { assignedCounselorId: ctx.userId } },
            ],
          });
          break;

        case 'SELF':
          conditions.push({ userId: ctx.userId });
          break;
      }
    }

    if (conditions.length === 0) {
      return { userId: ctx.userId };
    }

    return conditions.length === 1 ? conditions[0] : { OR: conditions };
  }

  /**
   * Builds Prisma DocumentWhereInput filter for Document queries
   */
  buildDocumentScopeFilter(ctx: DataScopeContext): Prisma.DocumentWhereInput {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) {
      return {};
    }

    const conditions: Prisma.DocumentWhereInput[] = [];

    for (const scope of ctx.dataScopes) {
      switch (scope) {
        case 'GLOBAL':
          return {};

        case 'DEPARTMENT':
          if (ctx.departments.length > 0) {
            conditions.push({
              counselor: {
                counselorProfile: {
                  department: { in: ctx.departments, mode: 'insensitive' },
                },
              },
            });
          }
          break;

        case 'TEAM':
          if (ctx.teamMemberUserIds.length > 0) {
            conditions.push({
              counselorId: { in: ctx.teamMemberUserIds },
            });
          }
          break;

        case 'REGION':
          if (ctx.regions.length > 0) {
            conditions.push({
              counselor: {
                counselorProfile: {
                  assignedRegion: { in: ctx.regions, mode: 'insensitive' },
                },
              },
            });
          }
          break;

        case 'STATE':
          if (ctx.states.length > 0) {
            conditions.push({
              user: {
                OR: [
                  { state: { in: ctx.states, mode: 'insensitive' } },
                  {
                    profile: { state: { in: ctx.states, mode: 'insensitive' } },
                  },
                ],
              },
            });
          }
          break;

        case 'DISTRICT':
          if (ctx.districts.length > 0) {
            conditions.push({
              user: {
                OR: [
                  { city: { in: ctx.districts, mode: 'insensitive' } },
                  {
                    profile: {
                      district: { in: ctx.districts, mode: 'insensitive' },
                    },
                  },
                ],
              },
            });
          }
          break;

        case 'ASSIGNED':
          conditions.push({
            OR: [
              { counselorId: ctx.userId },
              { verifiedBy: ctx.userId },
              { user: { assignedCounselorId: ctx.userId } },
            ],
          });
          break;

        case 'SELF':
          conditions.push({ userId: ctx.userId });
          break;
      }
    }

    if (conditions.length === 0) {
      return { userId: ctx.userId };
    }

    return conditions.length === 1 ? conditions[0] : { OR: conditions };
  }

  /**
   * Builds Prisma PaymentWhereInput filter for Payment queries
   */
  buildPaymentScopeFilter(ctx: DataScopeContext): Prisma.PaymentWhereInput {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) {
      return {};
    }

    const conditions: Prisma.PaymentWhereInput[] = [];

    for (const scope of ctx.dataScopes) {
      switch (scope) {
        case 'GLOBAL':
          return {};

        case 'DEPARTMENT':
          if (ctx.departments.length > 0) {
            conditions.push({
              counselor: {
                counselorProfile: {
                  department: { in: ctx.departments, mode: 'insensitive' },
                },
              },
            });
          }
          break;

        case 'TEAM':
          if (ctx.teamMemberUserIds.length > 0) {
            conditions.push({
              counselorId: { in: ctx.teamMemberUserIds },
            });
          }
          break;

        case 'REGION':
          if (ctx.regions.length > 0) {
            conditions.push({
              counselor: {
                counselorProfile: {
                  assignedRegion: { in: ctx.regions, mode: 'insensitive' },
                },
              },
            });
          }
          break;

        case 'STATE':
          if (ctx.states.length > 0) {
            conditions.push({
              user: {
                OR: [
                  { state: { in: ctx.states, mode: 'insensitive' } },
                  {
                    profile: { state: { in: ctx.states, mode: 'insensitive' } },
                  },
                ],
              },
            });
          }
          break;

        case 'DISTRICT':
          if (ctx.districts.length > 0) {
            conditions.push({
              user: {
                OR: [
                  { city: { in: ctx.districts, mode: 'insensitive' } },
                  {
                    profile: {
                      district: { in: ctx.districts, mode: 'insensitive' },
                    },
                  },
                ],
              },
            });
          }
          break;

        case 'ASSIGNED':
          conditions.push({
            OR: [
              { counselorId: ctx.userId },
              { verifiedBy: ctx.userId },
              { user: { assignedCounselorId: ctx.userId } },
            ],
          });
          break;

        case 'SELF':
          conditions.push({ userId: ctx.userId });
          break;
      }
    }

    if (conditions.length === 0) {
      return { userId: ctx.userId };
    }

    return conditions.length === 1 ? conditions[0] : { OR: conditions };
  }

  /**
   * Builds Prisma CollegeWhereInput filter for College administrative queries
   */
  buildCollegeScopeFilter(ctx: DataScopeContext): Prisma.CollegeWhereInput {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) {
      return {};
    }
    if (ctx.collegeId) {
      return { id: ctx.collegeId };
    }

    const conditions: Prisma.CollegeWhereInput[] = [];

    for (const scope of ctx.dataScopes) {
      switch (scope) {
        case 'GLOBAL':
          return {};

        case 'STATE':
          if (ctx.states.length > 0) {
            conditions.push({ state: { in: ctx.states, mode: 'insensitive' } });
          }
          break;

        case 'DISTRICT':
          if (ctx.districts.length > 0) {
            conditions.push({
              city: { in: ctx.districts, mode: 'insensitive' },
            });
          }
          break;
      }
    }

    return conditions.length > 0
      ? conditions.length === 1
        ? conditions[0]
        : { OR: conditions }
      : {};
  }

  // =========================================================================
  // RECORD-LEVEL SCOPE ENFORCEMENT & IDOR AUDITING
  // =========================================================================

  /**
   * Enforces that student record is accessible within user scope
   */
  enforceStudentScope(ctx: DataScopeContext, student: any): void {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) return;

    const studentUserId = student.id || student.userId;
    if (studentUserId === ctx.userId) return;

    if (ctx.dataScopes.includes('ASSIGNED')) {
      if (
        student.assignedCounselorId === ctx.userId ||
        student.counselorId === ctx.userId ||
        (Array.isArray(student.applications) &&
          student.applications.some(
            (a: any) => a.counselorId === ctx.userId,
          )) ||
        (Array.isArray(student.counselorAssignments) &&
          student.counselorAssignments.some(
            (ca: any) => ca.counselorId === ctx.userId,
          )) ||
        (Array.isArray(student.assignedLeads) &&
          student.assignedLeads.some(
            (l: any) => l.assignedCounselorId === ctx.userId,
          ))
      ) {
        return;
      }
    }

    if (ctx.dataScopes.includes('TEAM')) {
      if (
        (student.assignedCounselorId &&
          ctx.teamMemberUserIds.includes(student.assignedCounselorId)) ||
        (Array.isArray(student.applications) &&
          student.applications.some((a: any) =>
            ctx.teamMemberUserIds.includes(a.counselorId),
          ))
      ) {
        return;
      }
    }

    if (ctx.dataScopes.includes('STATE')) {
      const studentState = (
        student.state ||
        student.profile?.state ||
        ''
      ).toLowerCase();
      if (ctx.states.some((st) => st.toLowerCase() === studentState)) {
        return;
      }
    }

    if (ctx.dataScopes.includes('DISTRICT')) {
      const studentDist = (
        student.profile?.district ||
        student.profile?.city ||
        student.city ||
        ''
      ).toLowerCase();
      if (ctx.districts.some((d) => d.toLowerCase() === studentDist)) {
        return;
      }
    }

    if (ctx.dataScopes.includes('DEPARTMENT')) {
      const counselorDept =
        student.assignedCounselor?.counselorProfile?.department ||
        student.department;
      if (
        counselorDept &&
        ctx.departments.some(
          (d) => d.toLowerCase() === counselorDept.toLowerCase(),
        )
      ) {
        return;
      }
    }

    throw new ForbiddenException(
      `Access Denied: Record "${studentUserId}" is outside your authorized scope [${ctx.dataScopes.join(', ')}].`,
    );
  }

  /**
   * Enforces that lead record is accessible within user scope
   */
  enforceLeadScope(ctx: DataScopeContext, lead: any): void {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) return;

    if (ctx.dataScopes.includes('ASSIGNED')) {
      if (lead.assignedCounselorId === ctx.userId) return;
    }

    if (ctx.dataScopes.includes('TEAM')) {
      if (
        lead.assignedCounselorId &&
        ctx.teamMemberUserIds.includes(lead.assignedCounselorId)
      ) {
        return;
      }
    }

    if (ctx.dataScopes.includes('STATE') && lead.state) {
      if (
        ctx.states.some((s) => s.toLowerCase() === lead.state.toLowerCase())
      ) {
        return;
      }
    }

    if (ctx.dataScopes.includes('DISTRICT') && lead.city) {
      if (
        ctx.districts.some((d) => d.toLowerCase() === lead.city.toLowerCase())
      ) {
        return;
      }
    }

    if (ctx.dataScopes.includes('SELF')) {
      if (
        lead.assignedCounselorId === ctx.userId ||
        (ctx.userEmail && lead.email === ctx.userEmail)
      ) {
        return;
      }
    }

    throw new ForbiddenException(
      `Access Denied: Lead "${lead.id}" is outside your authorized scope [${ctx.dataScopes.join(', ')}].`,
    );
  }

  /**
   * Enforces that counselor record is accessible within user scope
   */
  enforceCounselorScope(ctx: DataScopeContext, counselorUser: any): void {
    if (
      ctx.isSuperAdmin ||
      ctx.roleSlugs.includes('ADMIN') ||
      ctx.roleSlugs.includes('SUPER_ADMIN') ||
      ctx.roleSlugs.includes('SENIOR_COUNSELOR') ||
      ctx.userRole === 'ADMIN' ||
      ctx.userRole === 'SUPER_ADMIN' ||
      ctx.userRole === 'SENIOR_COUNSELOR' ||
      ctx.dataScopes.includes('GLOBAL')
    ) {
      return;
    }

    const cId = counselorUser.id || counselorUser.userId;
    if (cId === ctx.userId) return;

    if (ctx.dataScopes.includes('ASSIGNED')) {
      if (counselorUser.counselorProfile?.reportingManagerId === ctx.userId)
        return;
    }

    if (ctx.dataScopes.includes('TEAM')) {
      if (ctx.teamMemberUserIds.includes(cId)) return;
    }

    if (ctx.dataScopes.includes('DEPARTMENT')) {
      const dept =
        counselorUser.counselorProfile?.department || counselorUser.department;
      if (
        dept &&
        ctx.departments.some((d) => d.toLowerCase() === dept.toLowerCase())
      ) {
        return;
      }
    }

    if (ctx.dataScopes.includes('REGION')) {
      const reg = counselorUser.counselorProfile?.assignedRegion;
      if (
        reg &&
        ctx.regions.some((r) => r.toLowerCase() === reg.toLowerCase())
      ) {
        return;
      }
    }

    if (ctx.dataScopes.includes('STATE')) {
      const st = counselorUser.counselorProfile?.state || counselorUser.state;
      if (st && ctx.states.some((s) => s.toLowerCase() === st.toLowerCase())) {
        return;
      }
    }

    throw new ForbiddenException(
      `Access Denied: Counselor "${cId}" is outside your authorized scope [${ctx.dataScopes.join(', ')}].`,
    );
  }

  /**
   * Enforces that application record is accessible within user scope
   */
  enforceApplicationScope(ctx: DataScopeContext, app: any): void {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) return;

    if (app.userId === ctx.userId) return;

    if (ctx.dataScopes.includes('ASSIGNED')) {
      if (
        app.counselorId === ctx.userId ||
        app.user?.assignedCounselorId === ctx.userId
      )
        return;
    }

    if (ctx.dataScopes.includes('TEAM')) {
      if (app.counselorId && ctx.teamMemberUserIds.includes(app.counselorId))
        return;
    }

    if (ctx.dataScopes.includes('STATE')) {
      const appState = (
        app.user?.state ||
        app.user?.profile?.state ||
        ''
      ).toLowerCase();
      if (ctx.states.some((s) => s.toLowerCase() === appState)) return;
    }

    if (ctx.dataScopes.includes('DEPARTMENT')) {
      const dept =
        app.counselor?.counselorProfile?.department ||
        app.counselor?.department;
      if (
        dept &&
        ctx.departments.some((d) => d.toLowerCase() === dept.toLowerCase())
      )
        return;
    }

    throw new ForbiddenException(
      `Access Denied: Application "${app.id}" is outside your authorized scope [${ctx.dataScopes.join(', ')}].`,
    );
  }

  /**
   * Enforces that document record is accessible within user scope
   */
  enforceDocumentScope(ctx: DataScopeContext, doc: any): void {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) return;

    if (doc.userId === ctx.userId) return;

    if (ctx.dataScopes.includes('ASSIGNED')) {
      if (
        doc.counselorId === ctx.userId ||
        doc.verifiedBy === ctx.userId ||
        doc.user?.assignedCounselorId === ctx.userId
      ) {
        return;
      }
    }

    if (ctx.dataScopes.includes('TEAM')) {
      if (doc.counselorId && ctx.teamMemberUserIds.includes(doc.counselorId))
        return;
    }

    if (ctx.isCollegeStaff && ctx.collegeId) {
      if (
        doc.collegeId === ctx.collegeId ||
        doc.application?.collegeId === ctx.collegeId
      ) {
        return;
      }
      throw new ForbiddenException(
        `Access Denied: Document "${doc.id}" does not belong to your college.`,
      );
    }

    if (ctx.dataScopes.includes('STATE')) {
      const docState = (
        doc.user?.state ||
        doc.user?.profile?.state ||
        ''
      ).toLowerCase();
      if (ctx.states.some((s) => s.toLowerCase() === docState)) return;
    }

    throw new ForbiddenException(
      `Access Denied: Document "${doc.id}" is private and outside your authorized scope.`,
    );
  }

  /**
   * Enforces that payment record is accessible within user scope
   */
  enforcePaymentScope(ctx: DataScopeContext, payment: any): void {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) return;

    if (payment.userId === ctx.userId) return;

    if (ctx.dataScopes.includes('ASSIGNED')) {
      if (
        payment.counselorId === ctx.userId ||
        payment.verifiedBy === ctx.userId ||
        payment.student?.assignedCounselorId === ctx.userId
      ) {
        return;
      }
    }

    if (ctx.dataScopes.includes('TEAM')) {
      if (
        payment.counselorId &&
        ctx.teamMemberUserIds.includes(payment.counselorId)
      )
        return;
    }

    if (ctx.dataScopes.includes('DEPARTMENT')) {
      const dept =
        payment.counselor?.counselorProfile?.department ||
        payment.counselor?.department;
      if (
        dept &&
        ctx.departments.some((d) => d.toLowerCase() === dept.toLowerCase())
      )
        return;
    }

    throw new ForbiddenException(
      `Access Denied: Payment transaction "${payment.id}" is restricted to authorized financial scope.`,
    );
  }

  /**
   * Validates mutation boundaries on POST / PATCH requests to prevent scope escalation
   */
  validateMutationScope(
    ctx: DataScopeContext,
    resource: 'LEAD' | 'STUDENT' | 'COUNSELOR' | 'APPLICATION' | 'DOCUMENT',
    payload: any,
  ): void {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) return;

    // Check Region mutation
    if (payload.assignedRegion || payload.region) {
      const targetRegion = String(
        payload.assignedRegion || payload.region,
      ).toLowerCase();
      if (!ctx.regions.some((r) => r.toLowerCase() === targetRegion)) {
        throw new ForbiddenException(
          `Mutation Denied: Cannot assign record to region "${payload.assignedRegion || payload.region}" outside your authorized regions [${ctx.regions.join(', ')}].`,
        );
      }
    }

    // Check Department mutation
    if (payload.department || payload.departmentId) {
      const targetDept = String(
        payload.department || payload.departmentId,
      ).toLowerCase();
      if (!ctx.departments.some((d) => d.toLowerCase() === targetDept)) {
        throw new ForbiddenException(
          `Mutation Denied: Cannot assign record to department "${payload.department || payload.departmentId}" outside your authorized departments [${ctx.departments.join(', ')}].`,
        );
      }
    }

    // Check State mutation
    if (
      payload.state &&
      (ctx.dataScopes.includes('STATE') || ctx.dataScopes.includes('REGION'))
    ) {
      const reqState = String(payload.state).toLowerCase();
      if (
        ctx.states.length > 0 &&
        !ctx.states.some((s) => s.toLowerCase() === reqState)
      ) {
        throw new ForbiddenException(
          `Mutation Denied: Cannot assign record to state "${payload.state}" outside your authorized states [${ctx.states.join(', ')}].`,
        );
      }
    }

    // Check Counselor assignment mutation
    if (payload.assignedCounselorId && ctx.dataScopes.includes('ASSIGNED')) {
      if (
        payload.assignedCounselorId !== ctx.userId &&
        !ctx.teamMemberUserIds.includes(payload.assignedCounselorId)
      ) {
        throw new ForbiddenException(
          `Mutation Denied: Cannot assign record to counselor "${payload.assignedCounselorId}" outside your team scope.`,
        );
      }
    }
  }

  /**
   * Build Prisma where filter for CollegeOffering queries
   */
  buildCollegeOfferingScopeFilter(
    ctx: DataScopeContext,
  ): Prisma.CollegeOfferingWhereInput {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) {
      return {};
    }
    if (ctx.collegeId) {
      return { collegeId: ctx.collegeId };
    }
    if (ctx.states.length > 0) {
      return { college: { state: { in: ctx.states, mode: 'insensitive' } } };
    }
    return {};
  }

  /**
   * Build Prisma where filter for Application queries with College scope
   */
  buildCollegeApplicationScopeFilter(
    ctx: DataScopeContext,
  ): Prisma.ApplicationWhereInput {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) {
      return {};
    }
    if (ctx.collegeId) {
      return { collegeId: ctx.collegeId };
    }
    return this.buildApplicationScopeFilter(ctx);
  }

  /**
   * Enforce that target college is within user's authorization scope
   */
  enforceCollegeScope(ctx: DataScopeContext, targetCollegeId: string): void {
    if (ctx.isSuperAdmin || ctx.dataScopes.includes('GLOBAL')) return;
    if (ctx.collegeId) {
      if (ctx.collegeId !== targetCollegeId) {
        throw new ForbiddenException(
          'Access Denied: You do not have permission to access or modify data for this College.',
        );
      }
      return;
    }
  }
}

