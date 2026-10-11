import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataScopeService } from '../auth/data-scope.service';
import { LeadRoutingService } from './lead-routing.service';
import { AuditService } from '../audit/audit.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { ReassignLeadDto } from './dto/reassign-lead.dto';
import { AssignCounselorDto } from './dto/assign-counselor.dto';
import { BulkReassignLeadsDto } from './dto/bulk-reassign-leads.dto';
import { createPaginatedResponse } from '../common/dto/paginated-response.dto';
import { SystemConfigurationService } from '../settings/system-configuration.service';

const ACTIVE_COUNSELING_STAGES: any[] = [
  'NEW',
  'CONTACTED',
  'FOLLOW_UP',
  'INTERESTED',
];

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    private prisma: PrismaService,
    private dataScopeService: DataScopeService,
    private leadRoutingService: LeadRoutingService,
    private auditService: AuditService,
    private readonly configService: SystemConfigurationService,
  ) {}

  async createLead(dto: CreateLeadDto) {
    // 1. Authoritative Geography Verification & Resolution
    let resolvedStateId = dto.stateId || null;
    let resolvedDistrictId = dto.districtId || null;
    let resolvedStateName = dto.state?.trim() || null;
    let resolvedDistrictName = dto.district?.trim() || null;

    if (resolvedStateId) {
      const stateObj = await this.prisma.state.findUnique({
        where: { id: resolvedStateId },
      });
      if (!stateObj) {
        throw new BadRequestException(`State with ID "${resolvedStateId}" does not exist`);
      }
      resolvedStateName = stateObj.name;
    } else if (resolvedStateName) {
      const stateObj = await this.prisma.state.findFirst({
        where: { name: { equals: resolvedStateName, mode: 'insensitive' } },
      });
      if (stateObj) {
        resolvedStateId = stateObj.id;
        resolvedStateName = stateObj.name;
      }
    }

    if (resolvedDistrictId) {
      const districtObj = await this.prisma.district.findUnique({
        where: { id: resolvedDistrictId },
      });
      if (!districtObj) {
        throw new BadRequestException(`District with ID "${resolvedDistrictId}" does not exist`);
      }
      if (resolvedStateId && districtObj.stateId !== resolvedStateId) {
        throw new BadRequestException(
          'Selected district does not belong to the selected state',
        );
      }
      resolvedDistrictName = districtObj.name;
      if (!resolvedStateId) {
        resolvedStateId = districtObj.stateId;
      }
    } else if (resolvedDistrictName && resolvedStateId) {
      const districtObj = await this.prisma.district.findFirst({
        where: {
          stateId: resolvedStateId,
          name: { equals: resolvedDistrictName, mode: 'insensitive' },
        },
      });
      if (districtObj) {
        resolvedDistrictId = districtObj.id;
        resolvedDistrictName = districtObj.name;
      }
    }

    // 2. Authoritative Course Verification & Resolution
    let resolvedCourseId = dto.courseId || null;
    let resolvedCourseName = dto.preferredCourse?.trim() || null;
    if (resolvedCourseId) {
      const courseObj = await this.prisma.course.findUnique({
        where: { id: resolvedCourseId },
      });
      if (courseObj) {
        resolvedCourseName = courseObj.name;
      }
    }

    // 2b. Authoritative Branch Verification & Validation
    let resolvedBranchId = dto.branchId || null;
    let resolvedBranchName = dto.preferredBranch?.trim() || null;
    let resolvedCustomBranchText = dto.customBranchText?.trim() || null;

    if (resolvedBranchId) {
      if (!resolvedCourseId) {
        throw new BadRequestException(
          'Cannot select a branch without selecting a valid course',
        );
      }
      const branchObj = await this.prisma.courseBranch.findUnique({
        where: { id: resolvedBranchId },
      });
      if (!branchObj) {
        throw new BadRequestException(
          `Branch with ID "${resolvedBranchId}" does not exist`,
        );
      }
      if (branchObj.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Branch "${branchObj.name}" is not currently available for admission`,
        );
      }
      if (branchObj.courseId !== resolvedCourseId) {
        throw new BadRequestException(
          'Selected branch does not belong to the selected course',
        );
      }
      resolvedBranchName = branchObj.name;
      resolvedCustomBranchText = null;
    } else if (resolvedCustomBranchText) {
      resolvedBranchId = null;
    }

    // 3. Authoritative College Verification & Resolution
    let resolvedCollegeId = dto.collegeId || null;
    let resolvedCollegeName = dto.preferredCollege?.trim() || null;
    if (resolvedCollegeId) {
      const collegeObj = await this.prisma.college.findUnique({
        where: { id: resolvedCollegeId },
      });
      if (collegeObj) {
        resolvedCollegeName = collegeObj.name;
      }
    }

    // 4. Consent Safeguards
    const hasConsent = dto.hasConsent === true;
    const whatsappConsent = dto.whatsappConsent === true;
    const smsConsent = dto.smsConsent === true;
    const consentTimestamp = hasConsent ? new Date() : null;

    // 5. Clean Mobile & Normalized Identifiers
    const cleanMobile = dto.mobile.trim().replace(/\D/g, '').slice(-10);
    const cleanEmail = dto.email?.trim().toLowerCase() || null;

    let targetLeadId: string | null = null;
    let isNewLead = false;

    const resultLead = await this.prisma.$transaction(async (tx) => {
      const existingLead = await tx.lead.findFirst({
        where: {
          OR: [
            { mobile: cleanMobile },
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ],
          isDeleted: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      const branchLabel = resolvedBranchName || resolvedCustomBranchText;
      const inquirySummary = `Inquiry: Course "${resolvedCourseName || 'N/A'}"${branchLabel ? ` (Branch: ${branchLabel})` : ''}, College "${resolvedCollegeName || dto.preferredCollegeText || 'N/A'}", State "${resolvedStateName || 'N/A'}", District "${resolvedDistrictName || 'N/A'}", Level "${dto.educationLevel || 'N/A'}", Year ${dto.passingYear || 'N/A'}, Stream "${dto.stream || 'N/A'}", Budget "${dto.budget || 'N/A'}"${dto.message ? `, Note: "${dto.message}"` : ''}`;

      if (existingLead) {
        targetLeadId = existingLead.id;

        const updatedLead = await tx.lead.update({
          where: { id: existingLead.id },
          data: {
            fullName: dto.fullName.trim() || existingLead.fullName,
            email: cleanEmail || existingLead.email,
            educationLevel: dto.educationLevel || existingLead.educationLevel,
            passingYear: dto.passingYear || existingLead.passingYear,
            stream: dto.stream || existingLead.stream,
            stateId: resolvedStateId || existingLead.stateId,
            districtId: resolvedDistrictId || existingLead.districtId,
            state: resolvedStateName || existingLead.state,
            district: resolvedDistrictName || existingLead.district,
            city: dto.city?.trim() || existingLead.city,
            courseId: resolvedCourseId || existingLead.courseId,
            preferredCourse: resolvedCourseName || existingLead.preferredCourse,
            branchId: resolvedBranchId || existingLead.branchId,
            customBranchText: resolvedCustomBranchText ?? existingLead.customBranchText,
            collegeId: resolvedCollegeId || existingLead.collegeId,
            preferredCollege: resolvedCollegeName || existingLead.preferredCollege,
            preferredCollegeText: dto.preferredCollegeText?.trim() || existingLead.preferredCollegeText,
            budget: dto.budget || existingLead.budget,
            message: dto.message || existingLead.message,
            hasConsent: hasConsent || existingLead.hasConsent,
            whatsappConsent: whatsappConsent || existingLead.whatsappConsent,
            smsConsent: smsConsent || existingLead.smsConsent,
            consentTimestamp: consentTimestamp || existingLead.consentTimestamp,
            campaign: dto.campaign || existingLead.campaign,
            updatedAt: new Date(),
          },
        });

        await tx.leadActivity.create({
          data: {
            leadId: existingLead.id,
            action: 'INQUIRY_SUBMITTED',
            details: `Re-inquired via public form. ${inquirySummary}`,
          },
        });

        return updatedLead;
      }

      isNewLead = true;
      const newLead = await tx.lead.create({
        data: {
          fullName: dto.fullName.trim(),
          mobile: cleanMobile,
          email: cleanEmail,
          educationLevel: dto.educationLevel,
          passingYear: dto.passingYear,
          stream: dto.stream,
          stateId: resolvedStateId,
          districtId: resolvedDistrictId,
          state: resolvedStateName,
          district: resolvedDistrictName,
          city: dto.city?.trim() || null,
          courseId: resolvedCourseId,
          preferredCourse: resolvedCourseName,
          branchId: resolvedBranchId,
          customBranchText: resolvedCustomBranchText,
          collegeId: resolvedCollegeId,
          preferredCollege: resolvedCollegeName,
          preferredCollegeText: dto.preferredCollegeText?.trim() || null,
          budget: dto.budget || null,
          message: dto.message?.trim() || null,
          hasConsent,
          whatsappConsent,
          smsConsent,
          consentTimestamp,
          source: (dto.source as any) || (dto.referralCode ? 'REFERRAL' : 'WEBSITE'),
          campaign: dto.campaign || null,
          status: 'NEW',
        },
      });

      targetLeadId = newLead.id;

      await tx.leadActivity.create({
        data: {
          leadId: newLead.id,
          action: 'CREATED',
          details: `Lead created from ${dto.source || (dto.referralCode ? 'REFERRAL' : 'WEBSITE')}. ${inquirySummary}`,
        },
      });

      // ── Attribution Persistence: Link to Referral if code provided ─────────
      if (dto.referralCode) {
        try {
          const codeProfile = await tx.studentReferralCode.findUnique({
            where: { code: dto.referralCode.trim().toUpperCase() },
          });
          if (codeProfile && codeProfile.isActive) {
            // Check self-referral prevention
            const referrer = await tx.user.findUnique({ where: { id: codeProfile.userId } });
            const referrerMobile = (referrer?.mobile || '').replace(/\D/g, '').slice(-10);
            const isSelf = (referrer?.email && cleanEmail && referrer.email.toLowerCase() === cleanEmail) ||
              (referrerMobile && cleanMobile && referrerMobile === cleanMobile);

            if (!isSelf) {
              const existingAttribution = await tx.studentReferral.findFirst({
                where: {
                  OR: [
                    { referredMobile: cleanMobile },
                    ...(cleanEmail ? [{ referredEmail: cleanEmail }] : []),
                  ],
                },
              });

              if (!existingAttribution) {
                await tx.studentReferral.create({
                  data: {
                    referralCode: codeProfile.code,
                    referrerStudentId: codeProfile.userId,
                    referredLeadId: newLead.id,
                    referredName: dto.fullName.trim(),
                    referredMobile: cleanMobile,
                    referredEmail: cleanEmail,
                    attributionSource: 'APPLY_NOW',
                    status: 'LEAD_CREATED',
                    fraudStatus: 'CLEAN',
                    rewardEligibility: 'PENDING',
                    rewardStatus: 'UNCLAIMED',
                  },
                });

                await tx.studentReferralCode.update({
                  where: { id: codeProfile.id },
                  data: { totalLeads: { increment: 1 } },
                });
              }
            }
          }
        } catch (refErr) {
          // Safeguard: Lead creation must not fail if referral attribution has minor issue
        }
      }

      return newLead;
    });

    // 8. Execute Geographic Routing Engine Post-Submission (Failure-Safe)
    if (targetLeadId) {
      try {
        if (isNewLead || !resultLead.assignedSeniorCounselorId) {
          await this.leadRoutingService.routeLead(targetLeadId);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Geographic routing failed for lead ${targetLeadId}: ${errorMsg}`);
      }
    }

    return this.findOne(resultLead.id);
  }

  async findAll(query: LeadQueryDto, currentUserId?: string) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      status,
      counselorId,
      source,
      state,
      city,
    } = query;

    const skip = (page - 1) * limit;
    let where: any = { isDeleted: false };

    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      const scopeFilter = this.dataScopeService.buildLeadScopeFilter(ctx);
      where = { AND: [where, scopeFilter] };
    }

    if (counselorId) {
      where = { AND: [where, { assignedCounselorId: counselorId }] };
    }

    if (status) where = { AND: [where, { status }] };
    if (source) where = { AND: [where, { source }] };
    if (state) where = { AND: [where, { state }] };
    if (city) where = { AND: [where, { city }] };

    if (search) {
      const searchCondition = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
        ],
      };
      where = { AND: [where, searchCondition] };
    }

    const [total, data] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        include: {
          assignedCounselor: { select: { id: true, fullName: true, email: true } },
          assignedSeniorCounselor: { select: { id: true, fullName: true, email: true } },
          assignedPosition: { select: { id: true, code: true, title: true } },
          courseRel: { select: { id: true, name: true, slug: true } },
          branchRel: { select: { id: true, name: true, code: true, slug: true } },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, currentUserId?: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedCounselor: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
        assignedSeniorCounselor: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
        assignedPosition: {
          select: { id: true, code: true, title: true, companyEmail: true },
        },
        courseRel: { select: { id: true, name: true, slug: true } },
        branchRel: { select: { id: true, name: true, code: true, slug: true } },
        collegeRel: { select: { id: true, name: true, city: true, state: true } },
        stateRel: { select: { id: true, name: true, code: true } },
        districtRel: { select: { id: true, name: true, code: true } },
        activities: {
          include: { user: { select: { id: true, fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          include: { user: { select: { id: true, fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        leadAssignments: {
          include: {
            assignedToUser: { select: { id: true, fullName: true, email: true } },
            assignedBy: { select: { id: true, fullName: true } },
            assignedPosition: { select: { code: true, title: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead || lead.isDeleted) {
      throw new NotFoundException(`Lead ${id} not found`);
    }

    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      this.dataScopeService.enforceLeadScope(ctx, lead);
    }

    return lead;
  }

  async updateLead(id: string, userId: string, dto: UpdateLeadDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead || lead.isDeleted) throw new NotFoundException('Lead not found');

    if (userId) {
      const ctx = await this.dataScopeService.resolveDataScope(userId);
      this.dataScopeService.enforceLeadScope(ctx, lead);
      this.dataScopeService.validateMutationScope(ctx, 'LEAD', dto);
    }

    const geographyChanged =
      (dto.stateId && dto.stateId !== lead.stateId) ||
      (dto.districtId && dto.districtId !== lead.districtId);

    await this.prisma.$transaction(async (tx) => {
      if (
        dto.assignedCounselorId !== undefined &&
        dto.assignedCounselorId !== lead.assignedCounselorId
      ) {
        if (lead.assignedCounselorId) {
          await tx.counselorAssignment.updateMany({
            where: { leadId: id, isActive: true },
            data: { isActive: false },
          });
        }
        if (dto.assignedCounselorId) {
          await tx.counselorAssignment.create({
            data: {
              leadId: id,
              counselorId: dto.assignedCounselorId,
              assignedBy: userId,
              isActive: true,
            },
          });
        }
      }

      await tx.lead.update({
        where: { id },
        data: dto,
      });

      await tx.leadActivity.create({
        data: {
          leadId: id,
          userId,
          action: 'UPDATED',
          details: 'Lead details updated',
        },
      });
    });

    if (geographyChanged) {
      try {
        await this.leadRoutingService.rerouteLeadOnGeographyChange(id);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Geography re-routing failed for lead ${id}: ${errorMsg}`);
      }
    }

    return this.findOne(id);
  }

  async deleteLead(id: string, userId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead || lead.isDeleted) throw new NotFoundException('Lead not found');

    if (userId) {
      const ctx = await this.dataScopeService.resolveDataScope(userId);
      this.dataScopeService.enforceLeadScope(ctx, lead);
    }

    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.lead.update({
        where: { id },
        data: { isDeleted: true },
      });

      await tx.leadActivity.create({
        data: {
          leadId: id,
          userId,
          action: 'DELETED',
          details: 'Lead soft-deleted',
        },
      });

      return deleted;
    });
  }

  async updateStatus(id: string, userId: string, dto: UpdateLeadStatusDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    if (userId) {
      const ctx = await this.dataScopeService.resolveDataScope(userId);
      this.dataScopeService.enforceLeadScope(ctx, lead);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: { status: dto.status },
      });

      await tx.leadActivity.create({
        data: {
          leadId: id,
          userId,
          action: 'STATUS_CHANGED',
          details: `Status changed from ${lead.status} to ${dto.status}. ${dto.remarks || ''}`,
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------------------------------
  // COUNSELOR CAPACITY & ASSIGNMENT CORE ENGINE
  // --------------------------------------------------------------------------

  /**
   * Calculate Active Counseling Cases Count for a given Counselor
   */
  async getActiveCounselingCasesCount(counselorId: string, tx?: any): Promise<number> {
    const client = tx || this.prisma;
    return client.lead.count({
      where: {
        assignedCounselorId: counselorId,
        isDeleted: false,
        status: { in: ACTIVE_COUNSELING_STAGES },
      },
    });
  }

  /**
   * Resolve Authorized Assignable Counselors with Active Workload Capacity
   */
  async getAssignableCounselors(leadId: string, seniorCounselorId: string) {
    const ctx = await this.dataScopeService.resolveDataScope(seniorCounselorId);
    const counselorFilter = this.dataScopeService.buildCounselorScopeFilter(ctx);

    const counselors = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { role: { in: ['COUNSELOR', 'SENIOR_COUNSELOR', 'ADMIN', 'SUPER_ADMIN'] } },
              { counselorProfile: { isNot: null } },
            ],
          },
          { isActive: true },
          { isApproved: true },
          { status: { notIn: ['LOCKED', 'DEACTIVATED', 'DISABLED', 'RESIGNED'] } },
          counselorFilter,
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        department: true,
        city: true,
        state: true,
        role: true,
        counselorProfile: {
          select: {
            counselorId: true,
            maxCapacity: true,
            capacityOverrideAllowed: true,
            employmentStatus: true,
            assignedStates: true,
            assignedRegion: true,
            assignedCategories: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const configService = this.configService;
    const defaultMaxCap = configService
      ? await configService.getNumber('crm.counselor.defaultMaxCapacity', 20)
      : 20;

    const lead = leadId
      ? await this.prisma.lead.findUnique({
          where: { id: leadId },
          select: { id: true, state: true, district: true, city: true },
        })
      : null;

    const result = await Promise.all(
      counselors.map(async (c) => {
        const activeCasesCount = await this.getActiveCounselingCasesCount(c.id);
        const maxCapacity = c.counselorProfile?.maxCapacity ?? defaultMaxCap;
        const empStatus = c.counselorProfile?.employmentStatus || 'ACTIVE';

        const status =
          empStatus !== 'ACTIVE'
            ? 'UNAVAILABLE'
            : activeCasesCount >= maxCapacity
            ? 'FULL'
            : 'ACTIVE';

        const assignedStates = c.counselorProfile?.assignedStates || [];
        const isExactStateMatch =
          lead?.state &&
          assignedStates.some(
            (st) => st.toLowerCase() === lead.state?.toLowerCase(),
          );
        const isNationalScope = assignedStates.length === 0;
        const geographicPriority = isExactStateMatch ? 1 : isNationalScope ? 2 : 3;

        return {
          id: c.id,
          counselorId: c.counselorProfile?.counselorId || c.id,
          fullName: c.fullName,
          email: c.email,
          mobile: c.mobile,
          role: c.role,
          department: c.department || 'Admissions',
          city: c.city,
          state: c.state,
          assignedStates,
          assignedRegion: c.counselorProfile?.assignedRegion || 'General',
          activeLeadsCount: activeCasesCount,
          activeCasesCount,
          maxCapacity,
          status,
          capacityOverrideAllowed: c.counselorProfile?.capacityOverrideAllowed ?? false,
          isExactStateMatch: !!isExactStateMatch,
          geographicPriority,
        };
      }),
    );

    return result.sort((a, b) => {
      if (a.geographicPriority !== b.geographicPriority) {
        return a.geographicPriority - b.geographicPriority;
      }
      return a.activeCasesCount - b.activeCasesCount;
    });
  }

  /**
   * Validate Counselor Assignment (Authorization, Active Position, Capacity Rules)
   */
  async validateCounselorAssignment(
    leadId: string,
    counselorId: string,
    actorUserId: string,
    overrideCapacity: boolean = false,
    tx?: any,
  ) {
    const client = tx || this.prisma;
    const lead = await client.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.isDeleted) throw new NotFoundException(`Lead ${leadId} not found`);

    if (actorUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(actorUserId);
      this.dataScopeService.enforceLeadScope(ctx, lead);
    }

    const counselor = await client.user.findUnique({
      where: { id: counselorId },
      include: { counselorProfile: true },
    });

    if (!counselor || !counselor.isActive || counselor.status !== 'ACTIVE') {
      throw new BadRequestException(`Counselor ${counselorId} is invalid or inactive`);
    }

    if (
      counselor.counselorProfile?.employmentStatus &&
      ['RESIGNED', 'DISABLED', 'SUSPENDED', 'LOCKED', 'INACTIVE'].includes(
        counselor.counselorProfile.employmentStatus,
      )
    ) {
      throw new BadRequestException(
        `Counselor ${counselor.fullName} is unavailable (${counselor.counselorProfile.employmentStatus})`,
      );
    }

    const currentLoad = await this.getActiveCounselingCasesCount(counselorId, client);
    const cfg = this.configService;
    const defaultMaxCap = cfg
      ? await cfg.getNumber('crm.counselor.defaultMaxCapacity', 20)
      : 20;
    const maxCapacity = counselor.counselorProfile?.maxCapacity ?? defaultMaxCap;

    if (currentLoad >= maxCapacity && !overrideCapacity) {
      throw new BadRequestException(
        `Counselor ${counselor.fullName} is at full capacity (${currentLoad}/${maxCapacity} active cases). Capacity override required.`,
      );
    }

    return { lead, counselor, currentLoad, maxCapacity };
  }

  /**
   * Core Counselor Assignment Transaction Writer
   */
  async createCounselorAssignment(
    leadId: string,
    counselorId: string,
    actorUserId: string,
    reason: string,
    tx: any,
  ) {
    const lead = await tx.lead.findUnique({ where: { id: leadId } });

    await tx.counselorAssignment.updateMany({
      where: { leadId, isActive: true },
      data: { isActive: false },
    });

    await tx.leadAssignment.updateMany({
      where: { leadId, status: 'ACTIVE', assignmentType: { in: ['COUNSELOR_MANUAL', 'REASSIGNMENT'] } },
      data: { status: 'INACTIVE', endedAt: new Date() },
    });

    const counselorAssignment = await tx.counselorAssignment.create({
      data: {
        leadId,
        counselorId,
        assignedBy: actorUserId,
        isActive: true,
      },
    });

    const leadAssignment = await tx.leadAssignment.create({
      data: {
        leadId,
        assignedToUserId: counselorId,
        assignedById: actorUserId,
        assignmentType: 'COUNSELOR_MANUAL',
        stateId: lead.stateId,
        districtId: lead.districtId,
        reason: reason || 'Counselor operational assignment',
        status: 'ACTIVE',
      },
    });

    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        assignedCounselorId: counselorId,
        status: lead.status === 'NEW' ? 'CONTACTED' : lead.status,
        updatedAt: new Date(),
      },
    });

    await tx.leadActivity.create({
      data: {
        leadId,
        userId: actorUserId,
        action: 'COUNSELOR_ASSIGNED',
        details: `Assigned to Counselor (Reason: ${reason || 'Manual Assignment'})`,
      },
    });

    const user = await tx.user.findFirst({
      where: {
        OR: [{ mobile: lead.mobile }, ...(lead.email ? [{ email: lead.email }] : [])],
      },
    });

    if (user) {
      await tx.user.update({
        where: { id: user.id },
        data: { assignedCounselorId: counselorId },
      });

      await tx.application.updateMany({
        where: { userId: user.id },
        data: { counselorId },
      });

      // Auto-resolve any pending counselor request support tickets for this student
      await tx.supportTicket.updateMany({
        where: {
          userId: user.id,
          category: 'COUNSELOR_REQUEST',
          status: 'OPEN',
        },
        data: {
          status: 'RESOLVED',
          updatedAt: new Date(),
        },
      });
    }

    return { updatedLead, counselorAssignment, leadAssignment, user };
  }

  /**
   * Single Counselor Assignment Endpoint Implementation
   */
  async assignCounselorToLead(id: string, dto: AssignCounselorDto, actorUserId: string) {
    const { lead, counselor } = await this.prisma.$transaction(async (tx) => {
      const validated = await this.validateCounselorAssignment(
        id,
        dto.counselorId,
        actorUserId,
        dto.overrideCapacity,
        tx,
      );
      await this.createCounselorAssignment(
        id,
        dto.counselorId,
        actorUserId,
        dto.reason || 'Assigned to operational counselor queue',
        tx,
      );
      return validated;
    });

    // Post-commit side effects: Audit & Notifications
    try {
      await this.auditService.logAction({
        module: 'CRM_LEAD',
        action: dto.overrideCapacity ? 'COUNSELOR_CAPACITY_OVERRIDE' : 'COUNSELOR_ASSIGNED',
        entity: 'LEAD',
        entityId: id,
        userId: actorUserId,
        newValue: { counselorId: dto.counselorId, counselorName: counselor.fullName, reason: dto.reason },
        description: `Counselor ${counselor.fullName} assigned to Lead ${lead.fullName}${dto.overrideCapacity ? ' (Capacity Override)' : ''}`,
      });

      await this.prisma.notification.create({
        data: {
          userId: dto.counselorId,
          receiverId: dto.counselorId,
          title: 'New Student Lead Assigned',
          message: `Lead "${lead.fullName}" (${lead.mobile}) has been assigned to your counseling queue.`,
          type: 'SYSTEM',
          priority: 'HIGH',
          category: 'LEAD',
        },
      });

      // Notify student applicant about their assigned counselor
      const studentUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ mobile: lead.mobile }, ...(lead.email ? [{ email: lead.email }] : [])],
        },
      });

      if (studentUser) {
        await this.prisma.notification.create({
          data: {
            userId: studentUser.id,
            receiverId: studentUser.id,
            title: 'Counselor Assigned! 🎉',
            message: `${counselor.fullName} has been assigned as your personal educational counselor to guide your admissions journey.`,
            type: 'APPLICATION',
            priority: 'HIGH',
            category: 'ADMISSION',
          },
        }).catch(() => {});
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Post-commit side effect failed for lead ${id}: ${errorMsg}`);
    }

    return this.findOne(id);
  }

  /**
   * Reassign Lead between Senior Counselors or Counselors
   */
  async reassignLead(id: string, dto: ReassignLeadDto, actorUserId: string) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Reassignment reason is required');
    }

    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead || lead.isDeleted) throw new NotFoundException('Lead not found');

    const targetUser = (await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
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
      throw new BadRequestException('Target user is invalid or inactive');
    }

    const previousCounselorId = lead.assignedCounselorId;

    if (dto.targetRole === 'SENIOR_COUNSELOR') {
      const isSenior =
        targetUser.role === 'SENIOR_COUNSELOR' ||
        (targetUser.designation &&
          targetUser.designation.toLowerCase().includes('senior counselor')) ||
        targetUser.userRoles?.some(
          (ur: any) =>
            ur.role?.slug === 'senior-counselor' ||
            ur.role?.name?.toLowerCase() === 'senior counselor',
        ) ||
        targetUser.positionAssignments?.some(
          (pa: any) =>
            pa.position?.title?.toLowerCase().includes('senior counselor') ||
            pa.position?.code?.toUpperCase().includes('SENIOR') ||
            pa.position?.role?.slug === 'senior-counselor',
        ) ||
        (targetUser.counselorProfile?.designation &&
          targetUser.counselorProfile.designation
            .toLowerCase()
            .includes('senior counselor'));

      if (!isSenior) {
        throw new BadRequestException(
          `User "${targetUser.fullName}" (${targetUser.email}) is not an eligible Senior Counselor. Only authorized Senior Counselors can be assigned to the Senior Counselor queue.`,
        );
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.leadAssignment.updateMany({
          where: { leadId: id, status: 'ACTIVE', assignmentType: { in: ['GEOGRAPHIC_AUTO', 'SENIOR_COUNSELOR_MANUAL'] } },
          data: { status: 'INACTIVE', endedAt: new Date() },
        });

        await tx.leadAssignment.create({
          data: {
            leadId: id,
            assignedToUserId: dto.targetUserId,
            assignedById: actorUserId,
            assignmentType: 'REASSIGNMENT',
            stateId: lead.stateId,
            districtId: lead.districtId,
            reason: dto.reason,
            status: 'ACTIVE',
          },
        });

        await tx.lead.update({
          where: { id },
          data: { assignedSeniorCounselorId: dto.targetUserId },
        });
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        await this.validateCounselorAssignment(id, dto.targetUserId, actorUserId, dto.overrideCapacity, tx);
        await this.createCounselorAssignment(id, dto.targetUserId, actorUserId, dto.reason, tx);
      });
    }

    // Post-commit Audit & Notification
    try {
      await this.auditService.logAction({
        module: 'CRM_LEAD',
        action: 'COUNSELOR_REASSIGNED',
        entity: 'LEAD',
        entityId: id,
        userId: actorUserId,
        newValue: { targetUserId: dto.targetUserId, targetRole: dto.targetRole, reason: dto.reason },
        description: `Lead ${lead.fullName} reassigned to ${targetUser.fullName} (${dto.targetRole})`,
      });

      await this.prisma.notification.create({
        data: {
          userId: dto.targetUserId,
          receiverId: dto.targetUserId,
          title: 'Student Lead Reassigned to You',
          message: `Lead "${lead.fullName}" was reassigned to you. Reason: ${dto.reason}`,
          type: 'SYSTEM',
          priority: 'HIGH',
          category: 'LEAD',
        },
      });

      if (previousCounselorId && previousCounselorId !== dto.targetUserId) {
        await this.prisma.notification.create({
          data: {
            userId: previousCounselorId,
            receiverId: previousCounselorId,
            title: 'Lead Reassigned Away',
            message: `Lead "${lead.fullName}" was reassigned to another counselor.`,
            type: 'SYSTEM',
            priority: 'MEDIUM',
            category: 'LEAD',
          },
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Post-commit audit/notification failed for lead ${id}: ${errorMsg}`);
    }

    return this.findOne(id);
  }

  /**
   * Bulk Reassignment Endpoint Implementation (PARTIAL_SUCCESS mode)
   */
  async bulkReassignLeads(dto: BulkReassignLeadsDto, actorUserId: string) {
    if (!dto.leadIds || !dto.leadIds.length) {
      throw new BadRequestException('leadIds array cannot be empty');
    }
    if (dto.leadIds.length > 50) {
      throw new BadRequestException('Maximum bulk batch size is 50 leads');
    }
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Reassignment reason is required for bulk operation');
    }

    let successCount = 0;
    let failureCount = 0;
    const failures: { leadId: string; reason: string }[] = [];

    for (const leadId of dto.leadIds) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await this.validateCounselorAssignment(leadId, dto.targetCounselorId, actorUserId, dto.overrideCapacity, tx);
          await this.createCounselorAssignment(leadId, dto.targetCounselorId, actorUserId, dto.reason, tx);
        });
        successCount++;
      } catch (err: unknown) {
        failureCount++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        failures.push({ leadId, reason: errorMsg });
      }
    }

    // Post-commit Audit log
    try {
      await this.auditService.logAction({
        module: 'CRM_LEAD',
        action: 'COUNSELOR_ASSIGNMENT_BULK',
        entity: 'LEAD',
        userId: actorUserId,
        newValue: { targetCounselorId: dto.targetCounselorId, successCount, failureCount, failures },
        description: `Bulk reassigned ${successCount} leads to counselor ${dto.targetCounselorId} (${failureCount} failed)`,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Bulk audit logging failed: ${errorMsg}`);
    }

    return { successCount, failureCount, failures };
  }

  /**
   * Senior Counselor: Get MY QUEUE with live counters
   */
  async getSeniorCounselorQueue(query: LeadQueryDto, seniorCounselorId: string) {
    const ctx = await this.dataScopeService.resolveDataScope(seniorCounselorId);
    
    const conditions: any[] = [
      { isDeleted: false },
      {
        OR: [
          { assignedSeniorCounselorId: seniorCounselorId },
          this.dataScopeService.buildLeadScopeFilter(ctx),
        ],
      },
    ];

    if (query.status) {
      conditions.push({ status: query.status });
    }

    if (query.search) {
      conditions.push({
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { mobile: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { preferredCourse: { contains: query.search, mode: 'insensitive' } },
          { state: { contains: query.search, mode: 'insensitive' } },
          { district: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    const baseWhere: any = { AND: conditions };

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 10));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.lead.count({ where: baseWhere }),
      this.prisma.lead.findMany({
        where: baseWhere,
        include: {
          assignedCounselor: { select: { id: true, fullName: true, email: true } },
          assignedPosition: { select: { code: true, title: true } },
          courseRel: { select: { name: true } },
          branchRel: { select: { name: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  /**
   * Senior Counselor: Get Dashboard KPI Cards Stats
   */
  async getSeniorCounselorStats(seniorCounselorId: string) {
    const ctx = await this.dataScopeService.resolveDataScope(seniorCounselorId);
    const scopeFilter = this.dataScopeService.buildLeadScopeFilter(ctx);
    
    const baseWhere: any = {
      isDeleted: false,
      OR: [
        { assignedSeniorCounselorId: seniorCounselorId },
        scopeFilter,
      ],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLeads,
      newLeads,
      unassignedCounselorCount,
      counselingPending,
      followUpsDue,
      routingExceptions,
    ] = await Promise.all([
      this.prisma.lead.count({ where: baseWhere }),
      this.prisma.lead.count({ where: { AND: [baseWhere, { status: 'NEW' }] } }),
      this.prisma.lead.count({
        where: { AND: [baseWhere, { assignedCounselorId: null }] },
      }),
      this.prisma.lead.count({
        where: {
          AND: [
            baseWhere,
            { status: { in: ['CONTACTED', 'FOLLOW_UP', 'INTERESTED'] } },
          ],
        },
      }),
      this.prisma.lead.count({
        where: {
          AND: [baseWhere, { followUpDate: { lte: today } }],
        },
      }),
      this.prisma.lead.count({ where: { isRoutingException: true, isDeleted: false } }),
    ]);

    return {
      totalLeads,
      newLeads,
      unassignedCounselorCount,
      counselingPending,
      followUpsDue,
      routingExceptions,
    };
  }

  /**
   * Senior Counselor Team Operational Overview
   */
  async getSeniorCounselorTeamSummary(seniorCounselorId: string) {
    const ctx = await this.dataScopeService.resolveDataScope(seniorCounselorId);
    const counselorFilter = this.dataScopeService.buildCounselorScopeFilter(ctx);

    const counselors = await this.prisma.user.findMany({
      where: {
        AND: [
          { role: 'COUNSELOR' },
          counselorFilter,
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        department: true,
        city: true,
        isActive: true,
        status: true,
        counselorProfile: {
          select: {
            employeeId: true,
            designation: true,
            employmentStatus: true,
            maxCapacity: true,
          },
        },
        positionAssignments: {
          where: { status: 'ACTIVE' },
          select: {
            position: { select: { code: true, title: true } },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    return Promise.all(
      counselors.map(async (c) => {
        const activeCasesCount = await this.getActiveCounselingCasesCount(c.id);
        const maxCapacity = c.counselorProfile?.maxCapacity ?? 20;
        const employmentStatus = c.counselorProfile?.employmentStatus || (c.isActive ? 'ACTIVE' : 'INACTIVE');
        
        const status =
          employmentStatus !== 'ACTIVE'
            ? 'UNAVAILABLE'
            : activeCasesCount >= maxCapacity
            ? 'FULL'
            : 'ACTIVE';

        const pendingFollowUps = await this.prisma.lead.count({
          where: {
            assignedCounselorId: c.id,
            isDeleted: false,
            followUpDate: { lte: new Date() },
          },
        });

        return {
          id: c.id,
          fullName: c.fullName,
          email: c.email,
          employeeId: c.counselorProfile?.employeeId || 'N/A',
          positionCode: c.positionAssignments[0]?.position?.code || 'N/A',
          positionTitle: c.positionAssignments[0]?.position?.title || c.counselorProfile?.designation || 'Counselor',
          activeCasesCount,
          maxCapacity,
          status,
          employmentStatus,
          pendingFollowUps,
        };
      }),
    );
  }

  /**
   * Senior Counselor: Get Counselor Unavailability Exception Queue
   */
  async getCounselorUnavailabilityQueue(query: LeadQueryDto, seniorCounselorId: string) {
    const ctx = await this.dataScopeService.resolveDataScope(seniorCounselorId);
    const scopeFilter = this.dataScopeService.buildLeadScopeFilter(ctx);

    const conditions: any[] = [
      { isDeleted: false },
      {
        OR: [{ assignedSeniorCounselorId: seniorCounselorId }, scopeFilter],
      },
      {
        assignedCounselor: {
          OR: [
            { isActive: false },
            { status: { not: 'ACTIVE' } },
            {
              counselorProfile: {
                employmentStatus: { in: ['RESIGNED', 'DISABLED', 'SUSPENDED', 'LOCKED', 'INACTIVE'] },
              },
            },
          ],
        },
      },
    ];

    if (query.status) conditions.push({ status: query.status });
    if (query.search) {
      conditions.push({
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { mobile: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    const baseWhere: any = { AND: conditions };

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 10));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.lead.count({ where: baseWhere }),
      this.prisma.lead.findMany({
        where: baseWhere,
        include: {
          assignedCounselor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              counselorProfile: { select: { employmentStatus: true } },
            },
          },
          courseRel: { select: { name: true } },
          branchRel: { select: { name: true } },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  /**
   * Counselor: Get MY STUDENTS Queue
   */
  async getCounselorStudentsQueue(query: LeadQueryDto, counselorId: string) {
    const conditions: any[] = [
      { isDeleted: false },
      { assignedCounselorId: counselorId },
    ];

    if (query.status) conditions.push({ status: query.status });
    if (query.search) {
      conditions.push({
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { mobile: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    const baseWhere: any = { AND: conditions };

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 10));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.lead.count({ where: baseWhere }),
      this.prisma.lead.findMany({
        where: baseWhere,
        include: {
          courseRel: { select: { name: true } },
          branchRel: { select: { name: true } },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  /**
   * Counselor: Get Dashboard Stats
   */
  async getCounselorStats(counselorId: string) {
    const baseWhere = { isDeleted: false, assignedCounselorId: counselorId };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [myStudents, newLeads, pendingFollowUps, convertedLeads] = await Promise.all([
      this.prisma.lead.count({ where: baseWhere }),
      this.prisma.lead.count({ where: { ...baseWhere, status: 'NEW' } }),
      this.prisma.lead.count({ where: { ...baseWhere, followUpDate: { lte: today } } }),
      this.prisma.lead.count({ where: { ...baseWhere, status: 'CONVERTED' } }),
    ]);

    return {
      myStudents,
      newLeads,
      pendingFollowUps,
      convertedLeads,
    };
  }

  /**
   * Lead Assignment Audit Trail History
   */
  async getLeadAssignmentHistory(leadId: string) {
    return this.prisma.leadAssignment.findMany({
      where: { leadId },
      include: {
        assignedToUser: { select: { id: true, fullName: true, email: true } },
        assignedBy: { select: { id: true, fullName: true } },
        assignedPosition: { select: { code: true, title: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async addNote(id: string, userId: string, content: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    if (userId) {
      const ctx = await this.dataScopeService.resolveDataScope(userId);
      this.dataScopeService.enforceLeadScope(ctx, lead);
    }

    return this.prisma.$transaction(async (tx) => {
      const note = await tx.leadNote.create({
        data: {
          leadId: id,
          userId,
          content,
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: id,
          userId,
          action: 'NOTE_ADDED',
          details: 'A new note was added',
        },
      });

      return note;
    });
  }

  async getDashboardStats(currentUserId?: string) {
    let where: any = { isDeleted: false };
    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      const scopeFilter = this.dataScopeService.buildLeadScopeFilter(ctx);
      where = { AND: [where, scopeFilter] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalLeads, todaysLeads, newLeads, convertedLeads] =
      await Promise.all([
        this.prisma.lead.count({ where }),
        this.prisma.lead.count({
          where: { AND: [where, { createdAt: { gte: today } }] },
        }),
        this.prisma.lead.count({ where: { AND: [where, { status: 'NEW' }] } }),
        this.prisma.lead.count({
          where: { AND: [where, { status: 'CONVERTED' }] },
        }),
      ]);

    return {
      totalLeads,
      todaysLeads,
      newLeads,
      convertedLeads,
    };
  }
}
