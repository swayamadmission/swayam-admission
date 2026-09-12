import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsNumber,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApplicationStatus,
  PaymentStatus,
  LeadStage,
  LeadPriority,
  Role,
  SavedAudienceStatus,
} from '@prisma/client';

export class FilterCondition {
  @IsString()
  field: string;

  @IsString()
  operator: 'EQ' | 'NEQ' | 'IN' | 'NOT_IN' | 'CONTAINS' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'BETWEEN';

  @IsOptional()
  value: any;
}

export class AudienceFilterPayload {
  @IsOptional()
  @IsString()
  logic?: 'AND' | 'OR';

  @IsOptional()
  @IsArray()
  conditions?: FilterCondition[];

  @IsOptional()
  @IsArray()
  exclusions?: FilterCondition[];

  @IsOptional()
  @IsString()
  targetEntity?: 'STUDENT' | 'LEAD' | 'STAFF' | 'ALL';

  @IsOptional()
  @IsString()
  collegeRelationship?: 'ANY' | 'PREFERRED' | 'SHORTLISTED' | 'APPLIED' | 'ADMITTED' | 'ENROLLED';
}

export class SaveAudienceDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  entityType?: 'STUDENT' | 'LEAD' | 'STAFF' | 'ALL';

  @IsOptional()
  @IsObject()
  audienceDefinition: AudienceFilterPayload;

  @IsOptional()
  @IsNumber()
  lastPreviewCount?: number;
}

export class UpdateSavedAudienceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  entityType?: 'STUDENT' | 'LEAD' | 'STAFF' | 'ALL';

  @IsOptional()
  @IsObject()
  audienceDefinition?: AudienceFilterPayload;

  @IsOptional()
  @IsEnum(SavedAudienceStatus)
  status?: 'ACTIVE' | 'ARCHIVED';

  @IsOptional()
  @IsNumber()
  lastPreviewCount?: number;
}

export class PreviewAudienceDto {
  @IsOptional()
  @IsObject()
  filter?: AudienceFilterPayload;

  @IsOptional()
  @IsArray()
  channels?: string[];
}

export interface ResolvedRecipient {
  recipientId: string;
  recipientType: 'STUDENT' | 'LEAD' | 'STAFF' | 'CONTACT';
  name: string;
  email?: string;
  mobile?: string;
  state?: string;
  district?: string;
  course?: string;
  branch?: string;
  role?: string;
  hasConsent: boolean;
  smsConsent: boolean;
  whatsappConsent: boolean;
  emailConsent: boolean;
  inAppConsent: boolean;
  consentExcluded?: boolean;
  exclusionReason?: string;
  invalidContact?: boolean;
  invalidContactReason?: string;
  channelsAvailable: string[];
}

@Injectable()
export class AudienceBuilderService {
  private readonly logger = new Logger(AudienceBuilderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return dynamic metadata options for the Audience Builder UI.
   * Pulls authoritative records from the database.
   */
  async getFilterMetaOptions() {
    const [states, courses, colleges, roles, departments] = await Promise.all([
      this.prisma.state.findMany({
        orderBy: { name: 'asc' },
        include: {
          districts: {
            select: { id: true, name: true, code: true },
            orderBy: { name: 'asc' },
          },
        },
      }),
      this.prisma.course.findMany({
        orderBy: { name: 'asc' },
        include: {
          branches: {
            where: { status: 'ACTIVE' },
            select: { id: true, name: true, code: true },
            orderBy: { name: 'asc' },
          },
        },
      }),
      this.prisma.college.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          state: true,
          status: true,
        },
        orderBy: { name: 'asc' },
        take: 300,
      }),
      this.prisma.roleEntity.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, description: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.department.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          code: true,
          positions: { select: { id: true, title: true, code: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Active counselors & senior counselors
    const staffMembers = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.COUNSELOR, Role.SENIOR_COUNSELOR, Role.ADMIN, Role.SUPER_ADMIN] },
        isApproved: true,
      },
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: 'asc' },
    });

    const counselors = staffMembers.filter(
      (s) => s.role === Role.COUNSELOR || s.role === Role.ADMIN,
    );
    const seniorCounselors = staffMembers.filter(
      (s) => s.role === Role.SENIOR_COUNSELOR || s.role === Role.ADMIN,
    );

    return {
      states: states.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        districts: s.districts,
      })),
      courses: courses.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        level: c.level,
        branches: c.branches,
      })),
      colleges,
      roles: [
        ...Object.values(Role).map((r) => ({ id: r, name: r, code: r, isSystem: true })),
        ...roles.map((r) => ({ id: r.id, name: r.name, code: r.slug, isSystem: false })),
      ],
      departments,
      counselors,
      seniorCounselors,
      educationLevels: ['10th', '12th', 'Diploma', 'Undergraduate', 'Postgraduate', 'Other'],
      streams: ['Science', 'Commerce', 'Arts', 'Vocational', 'Other', 'Not Applicable'],
      passingYears: [2028, 2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020],
      applicationStatuses: Object.values(ApplicationStatus),
      paymentStatuses: Object.values(PaymentStatus),
      leadStages: Object.values(LeadStage),
      leadPriorities: Object.values(LeadPriority),
      collegeRelationships: [
        { id: 'ANY', name: 'Any College Interaction' },
        { id: 'PREFERRED', name: 'Preferred College (Lead/Profile)' },
        { id: 'SHORTLISTED', name: 'Shortlisted College' },
        { id: 'APPLIED', name: 'Applied College' },
        { id: 'ADMITTED', name: 'Admitted College (Approved)' },
        { id: 'ENROLLED', name: 'Enrolled College' },
      ],
    };
  }

  /**
   * Preview audience with count, consent exclusion breakdown, and masked PII sample.
   */
  async previewAudience(payload: AudienceFilterPayload, channels: string[] = ['IN_APP', 'EMAIL']) {
    const resolution = await this.resolveAudience(payload, {
      campaignType: 'PROMOTIONAL',
      channels,
      limit: 10,
    });

    const maskedSamples = resolution.sampleRecipients.map((r) => ({
      id: r.recipientId,
      recipientType: r.recipientType,
      name: r.name,
      maskedMobile: r.mobile ? this.maskMobile(r.mobile) : 'N/A',
      maskedEmail: r.email ? this.maskEmail(r.email) : 'N/A',
      state: r.state || 'N/A',
      district: r.district || 'N/A',
      course: r.course || 'N/A',
      branch: r.branch || 'N/A',
      role: r.role || 'STUDENT',
      channelsAvailable: r.channelsAvailable,
      consentExcluded: r.consentExcluded || false,
      exclusionReason: r.exclusionReason,
    }));

    return {
      totalAudience: resolution.totalCount,
      eligibleCount: resolution.eligibleCount,
      excludedConsentCount: resolution.excludedConsentCount,
      invalidContactCount: resolution.invalidContactCount,
      channelBreakdown: resolution.channelBreakdown,
      sampleRecipients: maskedSamples,
    };
  }

  /**
   * Authoritative Audience Resolver.
   * Translates structured conditions to Prisma queries, dedupes recipients, and applies channel consent rules.
   */
  async resolveAudience(
    payload: AudienceFilterPayload,
    options: {
      campaignType?: 'TRANSACTIONAL' | 'PROMOTIONAL';
      channels?: string[];
      limit?: number;
      fetchAll?: boolean;
    } = {},
  ): Promise<{
    totalCount: number;
    eligibleCount: number;
    excludedConsentCount: number;
    invalidContactCount: number;
    channelBreakdown: Record<string, number>;
    sampleRecipients: ResolvedRecipient[];
    allRecipients?: ResolvedRecipient[];
  }> {
    const targetEntity = payload.targetEntity || 'ALL';
    const campaignType = options.campaignType || 'PROMOTIONAL';
    const channels = options.channels || ['IN_APP', 'EMAIL'];
    const conditions = payload.conditions || [];
    const exclusions = payload.exclusions || [];

    const recipientsMap = new Map<string, ResolvedRecipient>();

    // 1. Resolve Students (Users with role STUDENT / Applications / Profiles)
    if (targetEntity === 'STUDENT' || targetEntity === 'ALL') {
      const studentRecipients = await this.queryStudents(conditions, exclusions, payload.collegeRelationship);
      for (const rec of studentRecipients) {
        const key = `USER_${rec.recipientId}`;
        if (!recipientsMap.has(key)) {
          recipientsMap.set(key, rec);
        }
      }
    }

    // 2. Resolve Leads (Anonymous / Prospective applicants who may not have a user account)
    if (targetEntity === 'LEAD' || targetEntity === 'ALL') {
      const leadRecipients = await this.queryLeads(conditions, exclusions, payload.collegeRelationship);
      for (const rec of leadRecipients) {
        const key = `LEAD_${rec.recipientId}`;
        // Dedupe if already represented via user email/mobile
        const existingByUser = Array.from(recipientsMap.values()).find(
          (r) => (r.email && rec.email && r.email.toLowerCase() === rec.email.toLowerCase()) ||
                 (r.mobile && rec.mobile && r.mobile === rec.mobile),
        );
        if (!existingByUser && !recipientsMap.has(key)) {
          recipientsMap.set(key, rec);
        }
      }
    }

    // 3. Resolve Staff Users (Counselors, Admins, Finance, etc.)
    if (targetEntity === 'STAFF') {
      const staffRecipients = await this.queryStaff(conditions, exclusions);
      for (const rec of staffRecipients) {
        const key = `STAFF_${rec.recipientId}`;
        if (!recipientsMap.has(key)) {
          recipientsMap.set(key, rec);
        }
      }
    }

    // Process preferences & consent
    const allList = Array.from(recipientsMap.values());
    let eligibleCount = 0;
    let excludedConsentCount = 0;
    let invalidContactCount = 0;

    const channelBreakdown: Record<string, number> = {
      IN_APP: 0,
      EMAIL: 0,
      SMS: 0,
      WHATSAPP: 0,
    };

    const evaluatedRecipients: ResolvedRecipient[] = allList.map((rec) => {
      let isEligible = true;
      let consentExcluded = false;
      let exclusionReason: string | undefined;
      let invalidContact = false;
      let invalidContactReason: string | undefined;

      const availableChannels: string[] = [];

      // Evaluate channel availability & consent
      if (channels.includes('IN_APP')) {
        if (rec.recipientType !== 'LEAD' && rec.inAppConsent) {
          availableChannels.push('IN_APP');
          channelBreakdown.IN_APP++;
        }
      }

      if (channels.includes('EMAIL')) {
        if (rec.email && this.isValidEmail(rec.email)) {
          if (campaignType === 'TRANSACTIONAL' || rec.emailConsent) {
            availableChannels.push('EMAIL');
            channelBreakdown.EMAIL++;
          } else {
            consentExcluded = true;
            exclusionReason = 'Opted out of promotional email';
          }
        } else {
          invalidContact = true;
          invalidContactReason = 'Missing or invalid email';
        }
      }

      if (channels.includes('SMS')) {
        if (rec.mobile && this.isValidMobile(rec.mobile)) {
          if (campaignType === 'TRANSACTIONAL' || rec.smsConsent) {
            availableChannels.push('SMS');
            channelBreakdown.SMS++;
          } else {
            consentExcluded = true;
            exclusionReason = 'Opted out of promotional SMS';
          }
        } else {
          invalidContact = true;
          invalidContactReason = 'Missing or invalid mobile';
        }
      }

      if (channels.includes('WHATSAPP')) {
        if (rec.mobile && this.isValidMobile(rec.mobile)) {
          if (campaignType === 'TRANSACTIONAL' || rec.whatsappConsent) {
            availableChannels.push('WHATSAPP');
            channelBreakdown.WHATSAPP++;
          } else {
            consentExcluded = true;
            exclusionReason = 'Opted out of promotional WhatsApp';
          }
        } else {
          invalidContact = true;
          invalidContactReason = 'Missing or invalid mobile for WhatsApp';
        }
      }

      if (availableChannels.length > 0) {
        eligibleCount++;
      } else if (consentExcluded) {
        excludedConsentCount++;
      } else if (invalidContact) {
        invalidContactCount++;
      }

      return {
        ...rec,
        channelsAvailable: availableChannels,
        consentExcluded,
        exclusionReason,
        invalidContact,
        invalidContactReason,
      };
    });

    const sampleLimit = options.limit || 10;
    const sampleRecipients = evaluatedRecipients.slice(0, sampleLimit);

    return {
      totalCount: evaluatedRecipients.length,
      eligibleCount,
      excludedConsentCount,
      invalidContactCount,
      channelBreakdown,
      sampleRecipients,
      allRecipients: options.fetchAll ? evaluatedRecipients : undefined,
    };
  }

  // ─── QUERY HELPERS ──────────────────────────────────────────────────────────

  private async queryStudents(
    conditions: FilterCondition[],
    exclusions: FilterCondition[],
    relationship: string = 'ANY',
  ): Promise<ResolvedRecipient[]> {
    const where: any = {
      role: Role.STUDENT,
    };

    // Extract conditions
    const stateCond = conditions.find((c) => c.field === 'stateId' || c.field === 'state');
    const districtCond = conditions.find((c) => c.field === 'districtId' || c.field === 'district');
    const educationLevelCond = conditions.find((c) => c.field === 'educationLevel');
    const passingYearCond = conditions.find((c) => c.field === 'passingYear');
    const streamCond = conditions.find((c) => c.field === 'stream');
    const courseCond = conditions.find((c) => c.field === 'courseId' || c.field === 'course');
    const branchCond = conditions.find((c) => c.field === 'branchId' || c.field === 'branch');
    const collegeCond = conditions.find((c) => c.field === 'collegeId' || c.field === 'college');
    const appStatusCond = conditions.find((c) => c.field === 'applicationStatus');
    const paymentStatusCond = conditions.find((c) => c.field === 'paymentStatus');
    const counselorCond = conditions.find((c) => c.field === 'counselorId');
    const appAgeCond = conditions.find((c) => c.field === 'applicationAge' || c.field === 'createdWithinDays');
    const lastLoginCond = conditions.find((c) => c.field === 'lastLogin');

    // Build relations filter
    const appWhere: any = {};
    if (courseCond) appWhere.courseId = courseCond.value;
    if (branchCond) appWhere.branchId = branchCond.value;
    if (collegeCond) appWhere.collegeId = collegeCond.value;
    if (appStatusCond) appWhere.status = appStatusCond.value;
    if (paymentStatusCond) appWhere.paymentStatus = paymentStatusCond.value;
    if (counselorCond) appWhere.counselorId = counselorCond.value;

    if (appAgeCond) {
      const days = Number(appAgeCond.value);
      if (!isNaN(days) && days > 0) {
        const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        appWhere.createdAt = { gte: threshold };
      }
    }

    if (Object.keys(appWhere).length > 0) {
      where.applications = { some: appWhere };
    }

    // Profile & academic criteria
    const profileWhere: any = {};
    if (educationLevelCond) {
      profileWhere.OR = [
        { twelfthStream: educationLevelCond.value },
        { currentStatus: educationLevelCond.value },
      ];
    }
    if (passingYearCond) {
      const yr = Number(passingYearCond.value);
      profileWhere.OR = [
        { tenthPassingYear: yr },
        { twelfthPassingYear: yr },
        { diplomaPassingYear: yr },
        { graduationPassingYear: yr },
      ];
    }
    if (streamCond) {
      profileWhere.OR = [
        { twelfthStream: { contains: String(streamCond.value), mode: 'insensitive' } },
        { diplomaStream: { contains: String(streamCond.value), mode: 'insensitive' } },
      ];
    }

    if (stateCond) {
      profileWhere.state = { contains: String(stateCond.value), mode: 'insensitive' };
    }
    if (districtCond) {
      profileWhere.district = { contains: String(districtCond.value), mode: 'insensitive' };
    }

    if (Object.keys(profileWhere).length > 0) {
      where.profile = profileWhere;
    }

    if (stateCond && !where.profile) {
      where.OR = [
        { city: { contains: String(stateCond.value), mode: 'insensitive' } },
        { address: { contains: String(stateCond.value), mode: 'insensitive' } },
      ];
    }

    if (lastLoginCond) {
      if (lastLoginCond.value === 'NEVER') {
        where.lastLogin = null;
      } else {
        const days = Number(lastLoginCond.value);
        if (!isNaN(days) && days > 0) {
          const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          where.lastLogin = { gte: threshold };
        }
      }
    }

    // Exclusions
    const excludeAppStatus = exclusions.find((e) => e.field === 'applicationStatus');
    if (excludeAppStatus) {
      where.applications = {
        ...where.applications,
        none: { status: excludeAppStatus.value },
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        city: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            state: true,
            district: true,
          },
        },
        applications: {
          select: {
            id: true,
            status: true,
            course: { select: { name: true } },
            branch: { select: { name: true } },
            college: { select: { name: true } },
          },
          take: 1,
        },
      },
      take: 2000,
    });

    // Check user communication preferences
    const userIds = users.map((u) => u.id);
    const prefs = await this.prisma.userCommunicationPreference.findMany({
      where: { userId: { in: userIds } },
    });
    const prefMap = new Map(prefs.map((p) => [p.userId, p]));

    return users.map((u) => {
      const userPref = prefMap.get(u.id);
      const app = u.applications?.[0];
      const profile = u.profile;
      const promoOptOut = userPref?.promotionalOptOut || false;

      return {
        recipientId: u.id,
        recipientType: 'STUDENT',
        name: u.fullName,
        email: u.email,
        mobile: u.mobile,
        state: profile?.state || u.city || undefined,
        district: profile?.district || undefined,
        course: app?.course?.name,
        branch: app?.branch?.name,
        role: 'STUDENT',
        hasConsent: !promoOptOut,
        emailConsent: userPref ? userPref.emailEnabled && !promoOptOut : true,
        smsConsent: userPref ? userPref.smsEnabled && !promoOptOut : true,
        whatsappConsent: userPref ? userPref.whatsappEnabled && !promoOptOut : true,
        inAppConsent: userPref ? userPref.inAppEnabled : true,
        channelsAvailable: [],
      };
    });
  }

  private async queryLeads(
    conditions: FilterCondition[],
    exclusions: FilterCondition[],
    relationship: string = 'ANY',
  ): Promise<ResolvedRecipient[]> {
    const where: any = {
      isDeleted: false,
    };

    const stateCond = conditions.find((c) => c.field === 'stateId' || c.field === 'state');
    const districtCond = conditions.find((c) => c.field === 'districtId' || c.field === 'district');
    const educationLevelCond = conditions.find((c) => c.field === 'educationLevel');
    const passingYearCond = conditions.find((c) => c.field === 'passingYear');
    const streamCond = conditions.find((c) => c.field === 'stream');
    const courseCond = conditions.find((c) => c.field === 'courseId' || c.field === 'course');
    const branchCond = conditions.find((c) => c.field === 'branchId' || c.field === 'branch');
    const collegeCond = conditions.find((c) => c.field === 'collegeId' || c.field === 'college');
    const leadStageCond = conditions.find((c) => c.field === 'leadStage' || c.field === 'status');
    const counselorCond = conditions.find((c) => c.field === 'counselorId' || c.field === 'assignedCounselorId');

    if (stateCond) {
      where.OR = [{ stateId: stateCond.value }, { state: { contains: String(stateCond.value), mode: 'insensitive' } }];
    }
    if (districtCond) {
      where.OR = [{ districtId: districtCond.value }, { district: { contains: String(districtCond.value), mode: 'insensitive' } }];
    }
    if (educationLevelCond) where.educationLevel = educationLevelCond.value;
    if (passingYearCond) where.passingYear = Number(passingYearCond.value);
    if (streamCond) where.stream = streamCond.value;
    if (courseCond) where.courseId = courseCond.value;
    if (branchCond) where.branchId = branchCond.value;
    if (collegeCond) where.collegeId = collegeCond.value;
    if (leadStageCond) where.status = leadStageCond.value;
    if (counselorCond) where.assignedCounselorId = counselorCond.value;

    const leads = await this.prisma.lead.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        state: true,
        district: true,
        hasConsent: true,
        smsConsent: true,
        whatsappConsent: true,
        courseRel: { select: { name: true } },
        branchRel: { select: { name: true } },
      },
      take: 2000,
    });

    return leads.map((l) => ({
      recipientId: l.id,
      recipientType: 'LEAD',
      name: l.fullName,
      email: l.email || undefined,
      mobile: l.mobile,
      state: l.state || undefined,
      district: l.district || undefined,
      course: l.courseRel?.name,
      branch: l.branchRel?.name,
      role: 'LEAD',
      hasConsent: l.hasConsent,
      emailConsent: l.hasConsent,
      smsConsent: l.smsConsent || l.hasConsent,
      whatsappConsent: l.whatsappConsent || l.hasConsent,
      inAppConsent: false, // Leads without user accounts don't have In-App
      channelsAvailable: [],
    }));
  }

  private async queryStaff(
    conditions: FilterCondition[],
    exclusions: FilterCondition[],
  ): Promise<ResolvedRecipient[]> {
    const roleCond = conditions.find((c) => c.field === 'role');
    const departmentCond = conditions.find((c) => c.field === 'departmentId' || c.field === 'department');

    const where: any = {
      role: { not: Role.STUDENT },
      isApproved: true,
    };

    if (roleCond) {
      if (Object.values(Role).includes(roleCond.value as Role)) {
        where.role = roleCond.value as Role;
      }
    }

    const staff = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        role: true,
        city: true,
      },
      take: 500,
    });

    return staff.map((s) => ({
      recipientId: s.id,
      recipientType: 'STAFF',
      name: s.fullName,
      email: s.email,
      mobile: s.mobile,
      role: s.role,
      hasConsent: true,
      emailConsent: true,
      smsConsent: true,
      whatsappConsent: true,
      inAppConsent: true,
      channelsAvailable: [],
    }));
  }

  // ─── SAVED AUDIENCE / SEGMENT CRUD ──────────────────────────────────────────

  /**
   * List all saved audiences / segments.
   */
  async getSavedAudiences(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: SavedAudienceStatus;
    entityType?: string;
  }) {
    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.max(1, Number(params?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.status) {
      where.status = params.status;
    } else {
      where.status = { not: SavedAudienceStatus.ARCHIVED };
    }
    if (params?.entityType && params.entityType !== 'ALL') {
      where.entityType = params.entityType;
    }
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.savedAudience.count({ where }),
      this.prisma.savedAudience.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { campaigns: true } },
        },
      }),
    ]);

    return {
      data: items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single Saved Audience by ID.
   */
  async getSavedAudienceById(id: string) {
    const item = await this.prisma.savedAudience.findUnique({
      where: { id },
      include: {
        _count: { select: { campaigns: true } },
      },
    });
    if (!item) {
      throw new NotFoundException(`Saved audience with ID "${id}" not found.`);
    }
    return item;
  }

  /**
   * Create a new persistent Saved Audience / Segment.
   */
  async createSavedAudience(dto: SaveAudienceDto, userId?: string) {
    const name = (dto.name || '').trim();
    if (!name) {
      throw new BadRequestException('Audience name is required.');
    }

    const definition = dto.audienceDefinition || {
      targetEntity: dto.entityType || 'STUDENT',
      conditions: [],
      exclusions: [],
      collegeRelationship: 'ANY',
    };

    // Calculate initial preview count
    let previewCount = Number(dto.lastPreviewCount || 0);
    try {
      const preview = await this.previewAudience(definition, ['IN_APP', 'EMAIL']);
      previewCount = preview.eligibleCount;
    } catch (e: any) {
      this.logger.warn(`Could not compute preview count during save: ${e.message}`);
    }

    return this.prisma.savedAudience.create({
      data: {
        name,
        description: dto.description ? dto.description.trim() : null,
        entityType: dto.entityType || 'STUDENT',
        status: SavedAudienceStatus.ACTIVE,
        audienceDefinitionJson: definition as any,
        lastPreviewCount: previewCount,
        createdById: userId || null,
      },
    });
  }

  /**
   * Update an existing Saved Audience.
   */
  async updateSavedAudience(id: string, dto: UpdateSavedAudienceDto, userId?: string) {
    const existing = await this.getSavedAudienceById(id);

    const updateData: any = {};
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) throw new BadRequestException('Audience name cannot be blank.');
      updateData.name = trimmed;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description ? dto.description.trim() : null;
    }
    if (dto.entityType) {
      updateData.entityType = dto.entityType;
    }
    if (dto.status) {
      updateData.status = dto.status as SavedAudienceStatus;
    }
    if (dto.audienceDefinition) {
      updateData.audienceDefinitionJson = dto.audienceDefinition as any;
      updateData.version = (existing.version || 1) + 1;

      try {
        const preview = await this.previewAudience(dto.audienceDefinition, ['IN_APP', 'EMAIL']);
        updateData.lastPreviewCount = preview.eligibleCount;
      } catch (e: any) {
        this.logger.warn(`Preview count calculation skipped on update: ${e.message}`);
      }
    }

    return this.prisma.savedAudience.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Duplicate a Saved Audience segment.
   */
  async duplicateSavedAudience(id: string, userId?: string) {
    const existing = await this.getSavedAudienceById(id);

    return this.prisma.savedAudience.create({
      data: {
        name: `${existing.name} (Copy)`,
        description: existing.description,
        entityType: existing.entityType,
        status: SavedAudienceStatus.ACTIVE,
        audienceDefinitionJson: existing.audienceDefinitionJson as any,
        lastPreviewCount: existing.lastPreviewCount,
        createdById: userId || null,
      },
    });
  }

  /**
   * Archive a Saved Audience safely without deleting historical references.
   */
  async archiveSavedAudience(id: string, userId?: string) {
    await this.getSavedAudienceById(id);

    return this.prisma.savedAudience.update({
      where: { id },
      data: {
        status: SavedAudienceStatus.ARCHIVED,
      },
    });
  }

  // ─── UTILS & PII MASKING ────────────────────────────────────────────────────

  private maskMobile(mobile: string): string {
    if (!mobile || mobile.length < 5) return '*****';
    return `${mobile.slice(0, 2)}******${mobile.slice(-2)}`;
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***@***';
    const [user, domain] = email.split('@');
    const maskedUser = user.length > 2 ? `${user[0]}***${user.slice(-1)}` : `${user[0]}***`;
    return `${maskedUser}@${domain}`;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidMobile(mobile: string): boolean {
    return /^[0-9+]{8,15}$/.test(mobile.replace(/[\s-]/g, ''));
  }
}
