import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DataScopeService } from '../auth/data-scope.service';

@Injectable()
export class LeadRoutingService {
  private readonly logger = new Logger(LeadRoutingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  /**
   * Validate if a staff member is operationally active and eligible for lead queue assignment
   */
  private async validateStaffEligibility(userId: string): Promise<{
    user: any;
    activePositionId: string | null;
    activePositionCode: string | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        positionAssignments: {
          where: { status: 'ACTIVE', endedAt: null },
          include: { position: true },
        },
      },
    });

    if (!user) {
      return { user: null, activePositionId: null, activePositionCode: null };
    }

    if (!user.isActive || user.status !== 'ACTIVE') {
      this.logger.log(`Staff member ${user.fullName} (${userId}) is inactive/disabled`);
      return { user: null, activePositionId: null, activePositionCode: null };
    }

    // Check if security-locked
    const isLocked = user.userRoles.some((ur) => ur.role.status === 'LOCKED');
    if (isLocked) {
      this.logger.warn(`Staff member ${user.fullName} (${userId}) has a locked role`);
      return { user: null, activePositionId: null, activePositionCode: null };
    }

    // Resolve active position assignment if present
    const activeAssignment = user.positionAssignments[0];
    const activePositionId = activeAssignment?.positionId || null;
    const activePositionCode = activeAssignment?.position?.code || null;

    if (activeAssignment?.position && activeAssignment.position.positionStatus !== 'ACTIVE') {
      this.logger.warn(
        `Staff member ${user.fullName} position ${activeAssignment.position.code} is status ${activeAssignment.position.positionStatus}`,
      );
    }

    return {
      user,
      activePositionId,
      activePositionCode,
    };
  }

  /**
   * Route a Lead based on Geographic Responsibility (District -> State Fallback -> Primary -> Backup -> Fallback Exception)
   */
  async routeLead(leadId: string): Promise<{
    success: boolean;
    leadId: string;
    assignedSeniorCounselorId: string | null;
    assignedPositionId: string | null;
    isRoutingException: boolean;
    reason: string;
  }> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        stateRel: true,
        districtRel: true,
      },
    });

    if (!lead || lead.isDeleted) {
      throw new NotFoundException(`Lead with ID "${leadId}" not found`);
    }

    const stateId = lead.stateId;
    const districtId = lead.districtId;

    if (!stateId) {
      const reason = 'Lead geography lacks State ID';
      await this.flagRoutingException(lead.id, reason);
      return {
        success: false,
        leadId,
        assignedSeniorCounselorId: null,
        assignedPositionId: null,
        isRoutingException: true,
        reason,
      };
    }

    const now = new Date();

    // 1. Check District-level Responsibility Assignment
    let assignment: any = null;
    let ruleUsed = 'DISTRICT_LEVEL';

    if (districtId) {
      assignment = await this.prisma.geographicAssignment.findFirst({
        where: {
          stateId,
          districtId,
          status: 'ACTIVE',
          effectiveFrom: { lte: now },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
        },
        include: {
          responsibleUser: true,
          backupUser: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // 2. Fallback to State-wide Responsibility Assignment if no district assignment found
    if (!assignment) {
      ruleUsed = 'STATE_WIDE_FALLBACK';
      assignment = await this.prisma.geographicAssignment.findFirst({
        where: {
          stateId,
          districtId: null,
          status: 'ACTIVE',
          effectiveFrom: { lte: now },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
        },
        include: {
          responsibleUser: true,
          backupUser: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!assignment) {
      const reason = `No active Geographic Responsibility mapping configured for State "${lead.state || stateId}" / District "${lead.district || districtId || 'State-wide'}"`;
      await this.flagRoutingException(lead.id, reason);
      return {
        success: false,
        leadId,
        assignedSeniorCounselorId: null,
        assignedPositionId: null,
        isRoutingException: true,
        reason,
      };
    }

    // 3. Evaluate Primary Senior Counselor
    let selectedUserId: string | null = null;
    let selectedPositionId: string | null = null;
    let selectedPositionCode: string | null = null;
    let assignmentTypeReason = '';

    if (assignment.responsibleUserId) {
      const primaryRes = await this.validateStaffEligibility(assignment.responsibleUserId);
      if (primaryRes.user) {
        selectedUserId = primaryRes.user.id;
        selectedPositionId = primaryRes.activePositionId;
        selectedPositionCode = primaryRes.activePositionCode;
        assignmentTypeReason =
          ruleUsed === 'DISTRICT_LEVEL'
            ? 'District-level primary geographic responsibility'
            : 'State-wide primary geographic responsibility';
      }
    }

    // 4. Evaluate Backup Senior Counselor if Primary is inactive or unavailable
    if (!selectedUserId && assignment.backupUserId) {
      const backupRes = await this.validateStaffEligibility(assignment.backupUserId);
      if (backupRes.user) {
        selectedUserId = backupRes.user.id;
        selectedPositionId = backupRes.activePositionId;
        selectedPositionCode = backupRes.activePositionCode;
        assignmentTypeReason = 'Backup Senior Counselor fallback (Primary unavailable)';
      }
    }

    // 5. If neither Primary nor Backup is active -> Flag Routing Exception
    if (!selectedUserId) {
      const reason = `Configured Senior Counselors for ${lead.state || 'State'} / ${lead.district || 'District'} are currently inactive or vacant`;
      await this.flagRoutingException(lead.id, reason);
      return {
        success: false,
        leadId,
        assignedSeniorCounselorId: null,
        assignedPositionId: null,
        isRoutingException: true,
        reason,
      };
    }

    // 6. Execute Routing Assignment Transaction
    return this.prisma.$transaction(async (tx) => {
      // End previous active Senior Counselor LeadAssignments
      await tx.leadAssignment.updateMany({
        where: {
          leadId: lead.id,
          status: 'ACTIVE',
          assignmentType: { in: ['GEOGRAPHIC_AUTO', 'SENIOR_COUNSELOR_MANUAL'] },
        },
        data: {
          status: 'INACTIVE',
          endedAt: new Date(),
        },
      });

      // Create new LeadAssignment history record
      await tx.leadAssignment.create({
        data: {
          leadId: lead.id,
          assignedToUserId: selectedUserId!,
          assignedPositionId: selectedPositionId,
          assignmentType: 'GEOGRAPHIC_AUTO',
          stateId,
          districtId,
          reason: assignmentTypeReason,
          status: 'ACTIVE',
          assignedAt: new Date(),
        },
      });

      // Update Lead with resolved Senior Counselor & clear routing exception
      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          assignedSeniorCounselorId: selectedUserId,
          assignedPositionId: selectedPositionId,
          isRoutingException: false,
          routingExceptionReason: null,
          updatedAt: new Date(),
        },
        include: {
          assignedSeniorCounselor: { select: { fullName: true, email: true } },
        },
      });

      // Log Lead Activity
      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          action: 'ROUTED',
          details: `Routed to Senior Counselor "${updatedLead.assignedSeniorCounselor?.fullName || selectedUserId}"${selectedPositionCode ? ` (Position: ${selectedPositionCode})` : ''} via ${assignmentTypeReason}`,
        },
      });

      // Audit Log
      await this.auditService.logAction({
        module: 'CRM_LEAD',
        action: 'LEAD_ROUTED',
        entity: 'LEAD',
        entityId: lead.id,
        entityName: lead.fullName,
        state: lead.state || undefined,
        city: lead.district || undefined,
        newValue: {
          assignedSeniorCounselorId: selectedUserId,
          assignedSeniorCounselorName: updatedLead.assignedSeniorCounselor?.fullName,
          positionId: selectedPositionId,
          positionCode: selectedPositionCode,
          ruleUsed,
          reason: assignmentTypeReason,
        },
        description: `Lead "${lead.fullName}" successfully routed to Senior Counselor "${updatedLead.assignedSeniorCounselor?.fullName}"`,
      });

      // Notify Assigned Senior Counselor
      try {
        await tx.notification.create({
          data: {
            userId: selectedUserId!,
            receiverId: selectedUserId!,
            title: 'New Student Inquiry Routed',
            message: `New inquiry from ${lead.fullName} (${lead.state || ''}${lead.district ? ' • ' + lead.district : ''}) for ${lead.preferredCourse || 'Course'} has been routed to your queue.`,
            type: 'SYSTEM',
            priority: 'HIGH',
            category: 'LEAD',
          },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch in-app notification for lead ${lead.id}: ${err.message}`);
      }

      return {
        success: true,
        leadId: lead.id,
        assignedSeniorCounselorId: selectedUserId,
        assignedPositionId: selectedPositionId,
        isRoutingException: false,
        reason: assignmentTypeReason,
      };
    });
  }

  /**
   * Flag Lead as a Routing Exception when no mapping or active counselor exists
   */
  private async flagRoutingException(leadId: string, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: {
          isRoutingException: true,
          routingExceptionReason: reason,
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId,
          action: 'ROUTING_EXCEPTION',
          details: `Routing Exception: ${reason}`,
        },
      });

      await this.auditService.logAction({
        module: 'CRM_LEAD',
        action: 'ROUTING_EXCEPTION_CREATED',
        entity: 'LEAD',
        entityId: leadId,
        description: `Routing exception created for lead ${leadId}: ${reason}`,
      });

      // Notify Admins / Regional Fallback managers
      const adminUsers = await tx.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
        select: { id: true },
        take: 5,
      });

      for (const admin of adminUsers) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            receiverId: admin.id,
            title: 'CRM Lead Routing Exception',
            message: `A new inquiry requires manual routing intervention: ${reason}`,
            type: 'SYSTEM',
            priority: 'HIGH',
            category: 'LEAD',
          },
        });
      }
    });
  }

  /**
   * Re-route lead if geography changes
   */
  async rerouteLeadOnGeographyChange(leadId: string): Promise<any> {
    this.logger.log(`Re-evaluating geographic routing for lead ${leadId} due to address change`);
    return this.routeLead(leadId);
  }

  /**
   * Get all Routing Exceptions for Admin / Management review
   */
  async getRoutingExceptions(query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
      isRoutingException: true,
    };

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { mobile: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { state: { contains: query.search, mode: 'insensitive' } },
        { district: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        include: {
          courseRel: { select: { name: true } },
          branchRel: { select: { name: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Authoritative check: Is a user an eligible Senior Counselor?
   * Allowed:
   * - user.role === 'SENIOR_COUNSELOR'
   * - Custom IAM role slug 'senior-counselor' or name 'Senior Counselor'
   * - Active position assignment with title 'Senior Counselor' or position role 'senior-counselor'
   * - Counselor Profile designation 'Senior Counselor' or User designation 'Senior Counselor'
   * STRICTLY DISALLOWED:
   * - Plain Admin (Officer One, Officer Two, etc.)
   * - Super Admin (without explicit senior counselor position)
   * - Counselor, Student, Officer, Finance, Staff, etc.
   */
  isEligibleSeniorCounselor(user: any): boolean {
    if (!user) return false;
    if (!user.isActive) return false;
    if (user.status && ['DISABLED', 'LOCKED', 'DEACTIVATED', 'RESIGNED'].includes(user.status)) {
      return false;
    }

    // 1. Direct Prisma Role
    if (user.role === 'SENIOR_COUNSELOR') {
      return true;
    }

    // 2. Custom IAM Assigned Roles
    if (
      user.userRoles &&
      Array.isArray(user.userRoles) &&
      user.userRoles.some(
        (ur: any) =>
          ur.role?.slug === 'senior-counselor' ||
          ur.role?.name?.toLowerCase() === 'senior counselor',
      )
    ) {
      return true;
    }

    // 3. Active Position Assignment
    if (
      user.positionAssignments &&
      Array.isArray(user.positionAssignments) &&
      user.positionAssignments.some(
        (pa: any) =>
          pa.status === 'ACTIVE' &&
          !pa.endedAt &&
          (pa.position?.title?.toLowerCase().includes('senior counselor') ||
            pa.position?.code?.toUpperCase().includes('SENIOR') ||
            pa.position?.role?.slug === 'senior-counselor'),
      )
    ) {
      return true;
    }

    // 4. User scalar designation
    if (
      user.designation &&
      typeof user.designation === 'string' &&
      user.designation.toLowerCase().includes('senior counselor')
    ) {
      return true;
    }

    // 5. Counselor Profile designation
    if (
      user.counselorProfile?.designation &&
      typeof user.counselorProfile.designation === 'string' &&
      user.counselorProfile.designation.toLowerCase().includes('senior counselor')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Retrieves eligible Senior Counselors for manual route override.
   * Enforces IAM eligibility, actor DataScope, and lead geographic routing prioritization.
   */
  async getEligibleSeniorCounselors(leadId: string | null, actorUserId: string) {
    const actorScope = await this.dataScopeService.resolveDataScope(actorUserId);

    let lead: any = null;
    if (leadId) {
      lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          stateRel: true,
          districtRel: true,
        },
      });
      if (!lead || lead.isDeleted) {
        throw new NotFoundException(`Lead with ID "${leadId}" not found`);
      }
    }

    // Query candidate users from database who have senior counselor indicators
    const candidateUsers: any[] = await this.prisma.user.findMany({
      where: {
        isActive: true,
        status: { notIn: ['LOCKED', 'DEACTIVATED', 'DISABLED', 'RESIGNED'] },
        OR: [
          { role: 'SENIOR_COUNSELOR' },
          {
            userRoles: {
              some: {
                role: {
                  OR: [
                    { slug: 'senior-counselor' },
                    { name: { contains: 'Senior Counselor', mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
          {
            positionAssignments: {
              some: {
                status: 'ACTIVE',
                endedAt: null,
                position: {
                  OR: [
                    { title: { contains: 'Senior Counselor', mode: 'insensitive' } },
                    { code: { contains: 'SENIOR', mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
          {
            designation: { contains: 'Senior Counselor', mode: 'insensitive' },
          },
          {
            counselorProfile: {
              designation: { contains: 'Senior Counselor', mode: 'insensitive' },
            },
          },
        ],
      },
      include: {
        userRoles: { include: { role: true } },
        positionAssignments: {
          where: { status: 'ACTIVE', endedAt: null },
          include: { position: true },
        },
        counselorProfile: true,
      },
      orderBy: { fullName: 'asc' },
    });

    // 1. Strictly filter using authoritative isEligibleSeniorCounselor
    const verifiedSeniorCounselors = candidateUsers.filter((u: any) =>
      this.isEligibleSeniorCounselor(u),
    );

    // 2. Apply actor DataScope (if actor is restricted to specific states)
    const scopedCounselors = verifiedSeniorCounselors.filter((c: any) => {
      if (actorScope.isSuperAdmin || actorScope.dataScopes.includes('GLOBAL')) {
        return true;
      }
      if (actorScope.states && actorScope.states.length > 0) {
        const counselorState =
          c.state ||
          c.positionAssignments?.[0]?.position?.stateId ||
          c.counselorProfile?.assignedStates?.[0];
        if (counselorState && !actorScope.states.includes(counselorState)) {
          return false;
        }
      }
      return true;
    });

    // 3. Resolve lead geographic matching
    let geoAssignments: any[] = [];
    if (lead?.stateId) {
      geoAssignments = await this.prisma.geographicAssignment.findMany({
        where: {
          stateId: lead.stateId,
          status: 'ACTIVE',
        },
      });
    }

    const leadState = (lead?.state || '').trim().toLowerCase();

    // 4. Map candidates with workload and priority
    const candidatesWithDetails = await Promise.all(
      scopedCounselors.map(async (c: any) => {
        const activeLeadsCount = await this.prisma.lead.count({
          where: {
            assignedSeniorCounselorId: c.id,
            status: { in: ['NEW', 'CONTACTED', 'FOLLOW_UP', 'INTERESTED'] },
            isDeleted: false,
          },
        });

        let priority = 3;
        let matchType: 'GEOGRAPHIC_ASSIGNED' | 'STATE_MATCH' | 'GENERAL_POOL' = 'GENERAL_POOL';
        let badge = 'All-India Coverage';

        if (lead) {
          const districtMatch = geoAssignments.find(
            (ga) =>
              lead.districtId &&
              ga.districtId === lead.districtId &&
              (ga.responsibleUserId === c.id || ga.backupUserId === c.id),
          );
          const stateMatch = geoAssignments.find(
            (ga) =>
              ga.districtId === null &&
              (ga.responsibleUserId === c.id || ga.backupUserId === c.id),
          );

          if (districtMatch) {
            priority = 1;
            matchType = 'GEOGRAPHIC_ASSIGNED';
            badge =
              districtMatch.responsibleUserId === c.id
                ? 'Primary District Territory'
                : 'Backup District Territory';
          } else if (stateMatch) {
            priority = 1;
            matchType = 'GEOGRAPHIC_ASSIGNED';
            badge =
              stateMatch.responsibleUserId === c.id
                ? 'Primary State Territory'
                : 'Backup State Territory';
          } else {
            const pos = c.positionAssignments?.[0]?.position;
            const cState = (c.state || '').trim().toLowerCase();
            const assignedStates = (c.counselorProfile?.assignedStates || []).map(
              (s: string) => s.toLowerCase(),
            );
            if (
              (leadState && cState === leadState) ||
              (pos?.stateId && lead.stateId && pos.stateId === lead.stateId) ||
              (leadState && assignedStates.includes(leadState))
            ) {
              priority = 2;
              matchType = 'STATE_MATCH';
              badge = 'State Territory Match';
            }
          }
        }

        const position = c.positionAssignments?.[0]?.position;
        const designation =
          position?.title ||
          c.designation ||
          c.counselorProfile?.designation ||
          'Senior Educational Counselor';

        return {
          id: c.id,
          fullName: c.fullName,
          email: c.email,
          mobile: c.mobile,
          designation,
          positionCode: position?.code || null,
          activeLeadsCount,
          isGeographicMatch: priority <= 2,
          matchType,
          priority,
          badge,
        };
      }),
    );

    candidatesWithDetails.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.activeLeadsCount !== b.activeLeadsCount)
        return a.activeLeadsCount - b.activeLeadsCount;
      return a.fullName.localeCompare(b.fullName);
    });

    return candidatesWithDetails;
  }

  /**
   * Manual Routing Override by Admin or State Manager
   */
  async manualOverrideRouting(
    leadId: string,
    seniorCounselorId: string,
    reason: string,
    actorUserId: string,
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Override reason is required');
    }

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.isDeleted) {
      throw new NotFoundException(`Lead with ID "${leadId}" not found`);
    }

    const targetUser = (await this.prisma.user.findUnique({
      where: { id: seniorCounselorId },
      include: {
        userRoles: { include: { role: true } },
        positionAssignments: {
          where: { status: 'ACTIVE', endedAt: null },
          include: { position: true },
        },
        counselorProfile: true,
      },
    })) as any;

    if (!targetUser || !targetUser.isActive) {
      throw new BadRequestException('Target Senior Counselor is invalid or inactive');
    }

    // Authoritative check: User MUST be an eligible Senior Counselor
    if (!this.isEligibleSeniorCounselor(targetUser)) {
      throw new BadRequestException(
        `User "${targetUser.fullName}" (${targetUser.email}) is not an eligible Senior Counselor. Manual Route Override requires an authorized Senior Counselor.`,
      );
    }

    // Validate actor authorization and DataScope
    const actorScope = await this.dataScopeService.resolveDataScope(actorUserId);
    const hasAssignPermission =
      actorScope.isSuperAdmin ||
      actorScope.roleSlugs.includes('admin') ||
      actorScope.roleSlugs.includes('super-admin') ||
      actorScope.permissions.includes('lead.assign');

    if (!hasAssignPermission) {
      throw new ForbiddenException('You are not authorized to override lead routing');
    }

    const positionId = targetUser.positionAssignments?.[0]?.positionId || null;
    const positionCode = targetUser.positionAssignments?.[0]?.position?.code || null;

    return this.prisma.$transaction(async (tx) => {
      // Inactivate existing senior assignments
      await tx.leadAssignment.updateMany({
        where: {
          leadId,
          status: 'ACTIVE',
          assignmentType: { in: ['GEOGRAPHIC_AUTO', 'SENIOR_COUNSELOR_MANUAL', 'REASSIGNMENT'] },
        },
        data: { status: 'INACTIVE', endedAt: new Date() },
      });

      // Create new manual assignment record
      await tx.leadAssignment.create({
        data: {
          leadId,
          assignedToUserId: seniorCounselorId,
          assignedPositionId: positionId,
          assignedById: actorUserId,
          assignmentType: 'SENIOR_COUNSELOR_MANUAL',
          stateId: lead.stateId,
          districtId: lead.districtId,
          reason: `Manual Override: ${reason.trim()}`,
          status: 'ACTIVE',
          assignedAt: new Date(),
        },
      });

      // Update lead
      const updated = await tx.lead.update({
        where: { id: leadId },
        data: {
          assignedSeniorCounselorId: seniorCounselorId,
          assignedPositionId: positionId,
          isRoutingException: false,
          routingExceptionReason: null,
          updatedAt: new Date(),
        },
        include: {
          assignedSeniorCounselor: {
            select: { id: true, fullName: true, email: true, mobile: true },
          },
          assignedPosition: {
            select: { id: true, code: true, title: true },
          },
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId,
          userId: actorUserId,
          action: 'MANUAL_ROUTED',
          details: `Manually routed to Senior Counselor ${targetUser.fullName}${positionCode ? ` (${positionCode})` : ''}. Reason: ${reason.trim()}`,
        },
      });

      await this.auditService.logAction({
        module: 'CRM_LEAD',
        action: 'LEAD_MANUALLY_ROUTED',
        entity: 'LEAD',
        entityId: leadId,
        userId: actorUserId,
        newValue: {
          assignedSeniorCounselorId: seniorCounselorId,
          assignedSeniorCounselorName: targetUser.fullName,
          reason: reason.trim(),
        },
        description: `Lead "${lead.fullName}" manually assigned to Senior Counselor ${targetUser.fullName}`,
      });

      await tx.notification.create({
        data: {
          userId: seniorCounselorId,
          receiverId: seniorCounselorId,
          title: 'Manual Lead Assignment',
          message: `Lead ${lead.fullName} (${lead.state || ''} ${lead.district ? '- ' + lead.district : ''}) has been manually assigned to your queue by management. Reason: ${reason.trim()}`,
          type: 'SYSTEM',
          priority: 'HIGH',
          category: 'LEAD',
        },
      });

      return updated;
    });
  }
}
