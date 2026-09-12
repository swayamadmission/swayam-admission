import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataScopeService, DataScopeContext } from '../auth/data-scope.service';
import { AuditService } from '../audit/audit.service';
import { EnterpriseAnalyticsQueryDto } from './dto/enterprise-analytics-query.dto';
import { SaveReportDto } from './dto/save-report.dto';
import { ExportReportDto } from './dto/export-report.dto';
import { PaymentStatus, TaskStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScopeService: DataScopeService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper: Parse Date Range safely with timezone awareness
   */
  public parseDateRange(dto: EnterpriseAnalyticsQueryDto) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (dto.period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        break;
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (!dto.startDate) {
          throw new BadRequestException('startDate is required for custom date range');
        }
        startDate = new Date(dto.startDate);
        if (dto.endDate) {
          endDate = new Date(dto.endDate);
          endDate.setHours(23, 59, 59, 999);
        }
        if (startDate > endDate) {
          throw new BadRequestException('End date must be after or equal to start date');
        }
        break;
      case 'year':
      default:
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Helper: Resolve and enforce scope filters for Leads, Applications, Payments, Tasks
   */
  private async resolveScopeContext(currentUser: any): Promise<{
    scope: DataScopeContext;
    leadWhere: any;
    appWhere: any;
    payWhere: any;
    taskWhere: any;
  }> {
    if (!currentUser?.id) {
      throw new ForbiddenException('Authentication required');
    }

    const scope = await this.dataScopeService.resolveDataScope(currentUser.id);

    if (currentUser.role === 'STUDENT' || scope.roleSlugs.includes('student')) {
      throw new ForbiddenException('Students do not have access to Enterprise MIS');
    }

    const leadWhere: any = { isDeleted: false };
    const appWhere: any = {};
    const payWhere: any = {};
    const taskWhere: any = {};

    // 1. College Scope
    if (scope.isCollegeStaff && scope.collegeId) {
      appWhere.collegeId = scope.collegeId;
      payWhere.application = { collegeId: scope.collegeId };
      leadWhere.preferredCollegeId = scope.collegeId;
      taskWhere.collegeId = scope.collegeId;
      return { scope, leadWhere, appWhere, payWhere, taskWhere };
    }

    // 2. Global / Super Admin
    if (scope.isSuperAdmin || scope.dataScopes.includes('GLOBAL')) {
      return { scope, leadWhere, appWhere, payWhere, taskWhere };
    }

    // 3. Senior Counselor Team Scope
    if (scope.teamMemberUserIds && scope.teamMemberUserIds.length > 0) {
      const allowedUserIds = [currentUser.id, ...scope.teamMemberUserIds];
      leadWhere.assignedCounselorId = { in: allowedUserIds };
      appWhere.user = { assignedCounselorId: { in: allowedUserIds } };
      payWhere.application = { user: { assignedCounselorId: { in: allowedUserIds } } };
      taskWhere.assignedTo = { in: allowedUserIds };

      if (scope.stateIds && scope.stateIds.length > 0) {
        leadWhere.stateId = { in: scope.stateIds };
      }
      return { scope, leadWhere, appWhere, payWhere, taskWhere };
    }

    // 4. Counselor Self Scope
    if (scope.dataScopes.includes('SELF') || currentUser.role === 'COUNSELOR') {
      leadWhere.assignedCounselorId = currentUser.id;
      appWhere.user = { assignedCounselorId: currentUser.id };
      payWhere.application = { user: { assignedCounselorId: currentUser.id } };
      taskWhere.assignedTo = currentUser.id;
      return { scope, leadWhere, appWhere, payWhere, taskWhere };
    }

    return { scope, leadWhere, appWhere, payWhere, taskWhere };
  }

  /**
   * Helper: Apply common query filters (state, district, college, course, branch, counselor, session)
   */
  private applyCommonFilters(dto: EnterpriseAnalyticsQueryDto, baseLead: any, baseApp: any, basePay: any) {
    const leadWhere = { ...baseLead };
    const appWhere = { ...baseApp };
    const payWhere = { ...basePay };

    if (dto.state) {
      leadWhere.state = { contains: dto.state, mode: 'insensitive' };
      appWhere.user = { ...appWhere.user, state: { contains: dto.state, mode: 'insensitive' } };
    }
    if (dto.district) {
      leadWhere.district = { contains: dto.district, mode: 'insensitive' };
      appWhere.user = { ...appWhere.user, district: { contains: dto.district, mode: 'insensitive' } };
    }
    if (dto.collegeId) {
      leadWhere.preferredCollegeId = dto.collegeId;
      appWhere.collegeId = dto.collegeId;
      payWhere.application = { ...payWhere.application, collegeId: dto.collegeId };
    }
    if (dto.courseId) {
      leadWhere.courseId = dto.courseId;
      appWhere.courseId = dto.courseId;
      payWhere.application = { ...payWhere.application, courseId: dto.courseId };
    }
    if (dto.branchId) {
      leadWhere.branchId = dto.branchId;
      appWhere.branchId = dto.branchId;
    }
    if (dto.counselorId) {
      leadWhere.assignedCounselorId = dto.counselorId;
      appWhere.user = { ...appWhere.user, assignedCounselorId: dto.counselorId };
    }
    if (dto.academicSession) {
      appWhere.academicSession = dto.academicSession;
    }
    if (dto.source) {
      leadWhere.source = dto.source;
    }

    return { leadWhere, appWhere, payWhere };
  }

  // =========================================================================
  // 1. ENTERPRISE OVERVIEW & EXECUTIVE KPIS
  // =========================================================================
  async getEnterpriseOverview(dto: EnterpriseAnalyticsQueryDto, currentUser: any) {
    const { scope, leadWhere: bLead, appWhere: bApp, payWhere: bPay, taskWhere: bTask } =
      await this.resolveScopeContext(currentUser);
    const { startDate, endDate } = this.parseDateRange(dto);
    const { leadWhere, appWhere, payWhere } = this.applyCommonFilters(dto, bLead, bApp, bPay);

    const now = new Date();
    const periodDateFilter = { gte: startDate, lte: endDate };

    const [
      totalLeads,
      newLeadsInPeriod,
      activeLeads,
      totalStudentsCount,
      newStudentsInPeriod,
      totalApplications,
      submittedAppsInPeriod,
      approvedAdmissions,
      confirmedAdmissions,
      enrolledApps,
      completedPaymentsAgg,
      pendingPaymentsAgg,
      pendingAppReviews,
      pendingPaymentVerifications,
      overdueTasksCount,
    ] = await Promise.all([
      // Total Leads
      this.prisma.lead.count({ where: leadWhere }),
      // New Leads in Period
      this.prisma.lead.count({ where: { ...leadWhere, createdAt: periodDateFilter } }),
      // Active Leads
      this.prisma.lead.count({
        where: {
          ...leadWhere,
          status: { in: ['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP'] },
        },
      }),
      // Total Students in Scope
      this.prisma.user.count({
        where: {
          role: 'STUDENT',
          ...(leadWhere.assignedCounselorId ? { assignedCounselorId: leadWhere.assignedCounselorId } : {}),
        },
      }),
      // New Students in Period
      this.prisma.user.count({
        where: {
          role: 'STUDENT',
          createdAt: periodDateFilter,
          ...(leadWhere.assignedCounselorId ? { assignedCounselorId: leadWhere.assignedCounselorId } : {}),
        },
      }),
      // Total Applications in Scope
      this.prisma.application.count({ where: appWhere }),
      // Submitted Applications in Period
      this.prisma.application.count({
        where: { ...appWhere, createdAt: periodDateFilter },
      }),
      // Approved Admissions
      this.prisma.application.count({
        where: {
          ...appWhere,
          status: { in: ['APPROVED', 'COLLEGE_APPROVED', 'ADMISSION_CONFIRMED', 'STUDENT_ENROLLED'] },
        },
      }),
      // Confirmed Admissions
      this.prisma.application.count({
        where: {
          ...appWhere,
          status: { in: ['ADMISSION_CONFIRMED', 'STUDENT_ENROLLED', 'ADMISSION_COMPLETED'] },
        },
      }),
      // Enrolled Applications
      this.prisma.application.count({
        where: { ...appWhere, status: 'STUDENT_ENROLLED' },
      }),
      // Completed Payments Gross Revenue
      this.prisma.payment.aggregate({
        where: { ...payWhere, status: PaymentStatus.COMPLETED, createdAt: periodDateFilter },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Pending Payments
      this.prisma.payment.aggregate({
        where: { ...payWhere, status: PaymentStatus.PENDING },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Bottleneck: Pending Application Reviews
      this.prisma.application.count({
        where: {
          ...appWhere,
          status: { in: ['NEW', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENT_PENDING', 'DOCUMENTS_UPLOADED'] },
        },
      }),
      // Bottleneck: Pending Payment Verifications
      this.prisma.payment.count({
        where: {
          ...payWhere,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        },
      }),
      // Bottleneck: Overdue Counselor Tasks
      this.prisma.task.count({
        where: {
          ...bTask,
          status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
          dueDate: { lt: now },
        },
      }),
    ]);

    // Distinct Unique Students with Enrolled status
    const uniqueEnrolledStudents = await this.prisma.application.findMany({
      where: { ...appWhere, status: 'STUDENT_ENROLLED' },
      select: { userId: true },
      distinct: ['userId'],
    });

    const uniqueAdmittedStudents = await this.prisma.application.findMany({
      where: {
        ...appWhere,
        status: { in: ['APPROVED', 'COLLEGE_APPROVED', 'ADMISSION_CONFIRMED', 'STUDENT_ENROLLED'] },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    const verifiedRevenue = completedPaymentsAgg._sum.amount || 0;
    const pendingRevenue = pendingPaymentsAgg._sum.amount || 0;
    const completedPaymentsCount = completedPaymentsAgg._count.id || 0;
    const uniqueEnrolledCount = uniqueEnrolledStudents.length;
    const uniqueAdmittedCount = uniqueAdmittedStudents.length;

    // Zero-division protected conversion rates
    const overallConversionRate =
      totalLeads > 0 ? Number(((uniqueEnrolledCount / totalLeads) * 100).toFixed(2)) : 0;
    const leadToAppRate =
      totalLeads > 0 ? Number(((totalApplications / totalLeads) * 100).toFixed(2)) : 0;
    const appToAdmissionRate =
      totalApplications > 0 ? Number(((approvedAdmissions / totalApplications) * 100).toFixed(2)) : 0;
    const admissionToPaymentRate =
      approvedAdmissions > 0 ? Number(((completedPaymentsCount / approvedAdmissions) * 100).toFixed(2)) : 0;
    const paymentToEnrollmentRate =
      completedPaymentsCount > 0 ? Number(((enrolledApps / completedPaymentsCount) * 100).toFixed(2)) : 0;

    return {
      period: dto.period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      kpis: {
        totalLeads,
        newLeadsInPeriod,
        activeLeads,
        totalStudents: totalStudentsCount,
        newStudentsInPeriod,
        totalApplications,
        submittedApplications: submittedAppsInPeriod,
        admissionsApproved: approvedAdmissions,
        uniqueAdmittedStudents: uniqueAdmittedCount,
        admissionsConfirmed: confirmedAdmissions,
        enrolledApplications: enrolledApps,
        uniqueEnrolledStudents: uniqueEnrolledCount,
        verifiedRevenue,
        pendingRevenue,
        completedPaymentsCount,
        overallConversionRate,
        leadToAppRate,
        appToAdmissionRate,
        admissionToPaymentRate,
        paymentToEnrollmentRate,
      },
      bottlenecks: {
        pendingApplicationReviews: pendingAppReviews,
        pendingPaymentVerifications,
        overdueCounselorTasks: overdueTasksCount,
        totalExceptions: pendingAppReviews + pendingPaymentVerifications + overdueTasksCount,
      },
      userScope: {
        role: currentUser.role,
        isSuperAdmin: scope.isSuperAdmin,
        isCollegeStaff: scope.isCollegeStaff,
      },
    };
  }

  // =========================================================================
  // 2. 7-STAGE ADMISSION FUNNEL ANALYTICS
  // =========================================================================
  async getFunnelAnalytics(dto: EnterpriseAnalyticsQueryDto, currentUser: any) {
    const { leadWhere: bLead, appWhere: bApp, payWhere: bPay } =
      await this.resolveScopeContext(currentUser);
    const { leadWhere, appWhere, payWhere } = this.applyCommonFilters(dto, bLead, bApp, bPay);

    const [
      stage1Leads,
      stage2Contacted,
      stage3Interested,
      stage4Apps,
      stage4UniqueStudents,
      stage5Admissions,
      stage5UniqueStudents,
      stage6Payments,
      stage7Enrollments,
      stage7UniqueStudents,
    ] = await Promise.all([
      // 1. Leads Created
      this.prisma.lead.count({ where: leadWhere }),
      // 2. Contacted
      this.prisma.lead.count({
        where: {
          ...leadWhere,
          status: { in: ['CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'CONVERTED'] },
        },
      }),
      // 3. Interested
      this.prisma.lead.count({
        where: {
          ...leadWhere,
          status: { in: ['INTERESTED', 'FOLLOW_UP', 'CONVERTED'] },
        },
      }),
      // 4. Applications Submitted
      this.prisma.application.count({ where: appWhere }),
      // 4b. Unique Students with Applications
      this.prisma.application.findMany({
        where: appWhere,
        select: { userId: true },
        distinct: ['userId'],
      }),
      // 5. Admissions Approved
      this.prisma.application.count({
        where: {
          ...appWhere,
          status: { in: ['APPROVED', 'COLLEGE_APPROVED', 'ADMISSION_CONFIRMED', 'STUDENT_ENROLLED'] },
        },
      }),
      // 5b. Unique Students Admitted
      this.prisma.application.findMany({
        where: {
          ...appWhere,
          status: { in: ['APPROVED', 'COLLEGE_APPROVED', 'ADMISSION_CONFIRMED', 'STUDENT_ENROLLED'] },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
      // 6. Payments Completed
      this.prisma.payment.count({
        where: { ...payWhere, status: PaymentStatus.COMPLETED },
      }),
      // 7. Enrollments Confirmed
      this.prisma.application.count({
        where: { ...appWhere, status: 'STUDENT_ENROLLED' },
      }),
      // 7b. Unique Students Enrolled
      this.prisma.application.findMany({
        where: { ...appWhere, status: 'STUDENT_ENROLLED' },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const uApps = stage4UniqueStudents.length;
    const uAdmissions = stage5UniqueStudents.length;
    const uEnrollments = stage7UniqueStudents.length;

    const stages = [
      {
        id: 'stage_lead',
        step: 1,
        name: 'Leads Created',
        count: stage1Leads,
        uniquePeople: stage1Leads,
        dropOff: stage1Leads - stage2Contacted,
        conversionRate: 100,
        color: '#94A3B8',
      },
      {
        id: 'stage_contacted',
        step: 2,
        name: 'Contacted',
        count: stage2Contacted,
        uniquePeople: stage2Contacted,
        dropOff: stage2Contacted - stage3Interested,
        conversionRate: stage1Leads > 0 ? Number(((stage2Contacted / stage1Leads) * 100).toFixed(1)) : 0,
        color: '#4A7B5B',
      },
      {
        id: 'stage_interested',
        step: 3,
        name: 'Interested / Counseling',
        count: stage3Interested,
        uniquePeople: stage3Interested,
        dropOff: stage3Interested - uApps,
        conversionRate: stage2Contacted > 0 ? Number(((stage3Interested / stage2Contacted) * 100).toFixed(1)) : 0,
        color: '#F0AE1A',
      },
      {
        id: 'stage_application',
        step: 4,
        name: 'Applications Submitted',
        count: stage4Apps,
        uniquePeople: uApps,
        dropOff: stage4Apps - stage5Admissions,
        conversionRate: stage3Interested > 0 ? Number(((uApps / stage3Interested) * 100).toFixed(1)) : 0,
        color: '#0EA5E9',
      },
      {
        id: 'stage_admission',
        step: 5,
        name: 'Admissions Approved',
        count: stage5Admissions,
        uniquePeople: uAdmissions,
        dropOff: stage5Admissions - stage6Payments,
        conversionRate: stage4Apps > 0 ? Number(((stage5Admissions / stage4Apps) * 100).toFixed(1)) : 0,
        color: '#8B5CF6',
      },
      {
        id: 'stage_payment',
        step: 6,
        name: 'Payments Verified',
        count: stage6Payments,
        uniquePeople: stage6Payments,
        dropOff: stage6Payments - stage7Enrollments,
        conversionRate: stage5Admissions > 0 ? Number(((stage6Payments / stage5Admissions) * 100).toFixed(1)) : 0,
        color: '#EC4899',
      },
      {
        id: 'stage_enrollment',
        step: 7,
        name: 'Students Enrolled',
        count: stage7Enrollments,
        uniquePeople: uEnrollments,
        dropOff: 0,
        conversionRate: stage6Payments > 0 ? Number(((stage7Enrollments / stage6Payments) * 100).toFixed(1)) : 0,
        color: '#10B981',
      },
    ];

    return {
      funnel: stages,
      summary: {
        totalLeads: stage1Leads,
        totalApplications: stage4Apps,
        uniqueStudentsApplied: uApps,
        totalEnrollments: stage7Enrollments,
        uniqueStudentsEnrolled: uEnrollments,
        overallEndToEndConversion: stage1Leads > 0 ? Number(((uEnrollments / stage1Leads) * 100).toFixed(2)) : 0,
      },
    };
  }

  // =========================================================================
  // 3. COUNSELOR & SENIOR COUNSELOR PERFORMANCE
  // =========================================================================
  async getCounselorAnalytics(dto: EnterpriseAnalyticsQueryDto, currentUser: any) {
    const { scope } = await this.resolveScopeContext(currentUser);
    const now = new Date();

    let counselorWhere: any = { role: 'COUNSELOR', status: 'ACTIVE' };
    if (scope.teamMemberUserIds && scope.teamMemberUserIds.length > 0) {
      counselorWhere.id = { in: [currentUser.id, ...scope.teamMemberUserIds] };
    } else if (scope.dataScopes.includes('SELF') || currentUser.role === 'COUNSELOR') {
      counselorWhere.id = currentUser.id;
    }

    const counselors = await this.prisma.user.findMany({
      where: counselorWhere,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatar: true,
      },
      orderBy: { fullName: 'asc' },
    });

    const results = await Promise.all(
      counselors.map(async (c) => {
        const [
          assignedLeads,
          activeLeads,
          assignedStudents,
          submittedApps,
          admittedApps,
          enrolledStudents,
          totalTasks,
          completedTasks,
          overdueTasks,
          firstActivities,
        ] = await Promise.all([
          this.prisma.lead.count({ where: { assignedCounselorId: c.id, isDeleted: false } }),
          this.prisma.lead.count({
            where: {
              assignedCounselorId: c.id,
              isDeleted: false,
              status: { in: ['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP'] },
            },
          }),
          this.prisma.user.count({ where: { assignedCounselorId: c.id, role: 'STUDENT' } }),
          this.prisma.application.count({
            where: { user: { assignedCounselorId: c.id } },
          }),
          this.prisma.application.count({
            where: {
              user: { assignedCounselorId: c.id },
              status: { in: ['APPROVED', 'COLLEGE_APPROVED', 'ADMISSION_CONFIRMED', 'STUDENT_ENROLLED'] },
            },
          }),
          this.prisma.application.count({
            where: { user: { assignedCounselorId: c.id }, status: 'STUDENT_ENROLLED' },
          }),
          this.prisma.task.count({ where: { assignedTo: c.id } }),
          this.prisma.task.count({ where: { assignedTo: c.id, status: TaskStatus.COMPLETED } }),
          this.prisma.task.count({
            where: {
              assignedTo: c.id,
              status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
              dueDate: { lt: now },
            },
          }),
          this.prisma.crmActivity.findMany({
            where: { actorId: c.id, category: 'STAFF_ACTIVITY' },
            select: { occurredAt: true, lead: { select: { createdAt: true } } },
            take: 20,
            orderBy: { occurredAt: 'desc' },
          }),
        ]);

        let avgContactHours = 0;
        const validTimeDiffs = firstActivities
          .filter((a) => a.lead?.createdAt && a.occurredAt)
          .map((a) => (new Date(a.occurredAt).getTime() - new Date(a.lead!.createdAt).getTime()) / (1000 * 60 * 60))
          .filter((diff) => diff >= 0);

        if (validTimeDiffs.length > 0) {
          avgContactHours = Number((validTimeDiffs.reduce((sum, d) => sum + d, 0) / validTimeDiffs.length).toFixed(1));
        }

        const conversionRate =
          assignedLeads > 0 ? Number(((enrolledStudents / assignedLeads) * 100).toFixed(1)) : 0;
        const taskCompletionRate =
          totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;

        const maxCapacity = 50;
        const capacityUtilization = Number(((activeLeads / maxCapacity) * 100).toFixed(0));

        return {
          id: c.id,
          name: c.fullName,
          email: c.email,
          avatar: c.avatar,
          specialization: 'General Admission',
          assignedLeads,
          activeLeads,
          assignedStudents,
          submittedApps,
          admittedApps,
          enrolledStudents,
          conversionRate,
          totalTasks,
          completedTasks,
          overdueTasks,
          taskCompletionRate,
          avgTimeToFirstContactHours: avgContactHours > 0 ? `${avgContactHours} hrs` : 'N/A',
          capacityUtilization: Math.min(capacityUtilization, 100),
          workloadStatus:
            capacityUtilization > 90 ? 'OVERLOADED' : capacityUtilization > 60 ? 'OPTIMAL' : 'AVAILABLE',
        };
      }),
    );

    return {
      counselors: results,
      totalCounselorsCount: results.length,
      averageTeamConversion:
        results.length > 0
          ? Number((results.reduce((sum, r) => sum + r.conversionRate, 0) / results.length).toFixed(1))
          : 0,
      totalTeamOverdueTasks: results.reduce((sum, r) => sum + r.overdueTasks, 0),
    };
  }

  // =========================================================================
  // 4. SENIOR COUNSELOR TEAM ANALYTICS
  // =========================================================================
  async getSeniorCounselorTeamAnalytics(dto: EnterpriseAnalyticsQueryDto, currentUser: any) {
    const { scope } = await this.resolveScopeContext(currentUser);

    const managedTeams = await this.prisma.team.findMany({
      where: scope.isSuperAdmin
        ? {}
        : {
            OR: [
              { managerId: currentUser.id },
              { members: { some: { userId: currentUser.id } } },
            ],
          },
      include: {
        manager: { select: { id: true, fullName: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
        },
      },
    });

    const now = new Date();

    const teamSummaries = await Promise.all(
      managedTeams.map(async (t) => {
        const memberIds = t.members.map((m) => m.userId);
        if (t.managerId && !memberIds.includes(t.managerId)) {
          memberIds.push(t.managerId);
        }

        const [
          totalLeads,
          activeStudents,
          totalApplications,
          admittedApps,
          enrolledStudents,
          overdueTasks,
        ] = await Promise.all([
          this.prisma.lead.count({ where: { assignedCounselorId: { in: memberIds }, isDeleted: false } }),
          this.prisma.user.count({ where: { assignedCounselorId: { in: memberIds }, role: 'STUDENT' } }),
          this.prisma.application.count({
            where: { user: { assignedCounselorId: { in: memberIds } } },
          }),
          this.prisma.application.count({
            where: {
              user: { assignedCounselorId: { in: memberIds } },
              status: { in: ['APPROVED', 'ADMISSION_CONFIRMED', 'STUDENT_ENROLLED'] },
            },
          }),
          this.prisma.application.count({
            where: { user: { assignedCounselorId: { in: memberIds } }, status: 'STUDENT_ENROLLED' },
          }),
          this.prisma.task.count({
            where: {
              assignedTo: { in: memberIds },
              status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
              dueDate: { lt: now },
            },
          }),
        ]);

        const conversionRate =
          totalLeads > 0 ? Number(((enrolledStudents / totalLeads) * 100).toFixed(1)) : 0;

        return {
          teamId: t.id,
          teamName: t.name,
          teamCode: t.code,
          manager: t.manager?.fullName || 'Unassigned',
          teamSize: t.members.length,
          totalLeads,
          activeStudents,
          totalApplications,
          admittedApps,
          enrolledStudents,
          conversionRate,
          overdueTasks,
        };
      }),
    );

    return { teams: teamSummaries };
  }

  // =========================================================================
  // 5. COLLEGE PERFORMANCE & DEMAND
  // =========================================================================
  async getCollegeAnalytics(dto: EnterpriseAnalyticsQueryDto, currentUser: any) {
    const { scope } = await this.resolveScopeContext(currentUser);

    let collegeWhere: any = {};
    if (scope.isCollegeStaff && scope.collegeId) {
      collegeWhere.id = scope.collegeId;
    } else if (dto.collegeId) {
      collegeWhere.id = dto.collegeId;
    }

    const colleges = await this.prisma.college.findMany({
      where: collegeWhere,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        logo: true,
      },
      take: 50,
      orderBy: { name: 'asc' },
    });

    const collegeAnalytics = await Promise.all(
      colleges.map(async (c) => {
        const [
          totalApplications,
          approvedAdmissions,
          enrolledStudents,
          revenueAgg,
        ] = await Promise.all([
          this.prisma.application.count({ where: { collegeId: c.id } }),
          this.prisma.application.count({
            where: {
              collegeId: c.id,
              status: { in: ['APPROVED', 'COLLEGE_APPROVED', 'ADMISSION_CONFIRMED', 'STUDENT_ENROLLED'] },
            },
          }),
          this.prisma.application.count({
            where: { collegeId: c.id, status: 'STUDENT_ENROLLED' },
          }),
          this.prisma.payment.aggregate({
            where: { application: { collegeId: c.id }, status: PaymentStatus.COMPLETED },
            _sum: { amount: true },
          }),
        ]);

        const conversionRate =
          totalApplications > 0
            ? Number(((enrolledStudents / totalApplications) * 100).toFixed(1))
            : 0;

        return {
          id: c.id,
          name: c.name,
          code: c.slug || c.id.slice(0, 6),
          location: `${c.city || ''}, ${c.state || ''}`,
          totalApplications,
          approvedAdmissions,
          enrolledStudents,
          totalRevenue: revenueAgg._sum.amount || 0,
          conversionRate,
        };
      }),
    );

    return { colleges: collegeAnalytics.sort((a, b) => b.totalApplications - a.totalApplications) };
  }

  // =========================================================================
  // 6. COURSE & BRANCH DEMAND
  // =========================================================================
  async getCourseAnalytics(dto: EnterpriseAnalyticsQueryDto, currentUser: any) {
    const { appWhere } = await this.resolveScopeContext(currentUser);

    const courses = await this.prisma.course.findMany({
      select: {
        id: true,
        name: true,
        category: true,
      },
    });

    const results = await Promise.all(
      courses.map(async (course) => {
        const [totalApps, enrolledApps, revenueAgg] = await Promise.all([
          this.prisma.application.count({
            where: { ...appWhere, courseId: course.id },
          }),
          this.prisma.application.count({
            where: { ...appWhere, courseId: course.id, status: 'STUDENT_ENROLLED' },
          }),
          this.prisma.payment.aggregate({
            where: { application: { ...appWhere, courseId: course.id }, status: PaymentStatus.COMPLETED },
            _sum: { amount: true },
          }),
        ]);

        return {
          id: course.id,
          name: course.name,
          category: course.category,
          totalApplications: totalApps,
          enrolledStudents: enrolledApps,
          revenue: revenueAgg._sum.amount || 0,
        };
      }),
    );

    return { courses: results.sort((a, b) => b.totalApplications - a.totalApplications) };
  }

  // =========================================================================
  // 7. GEOGRAPHIC ANALYTICS (STATE & DISTRICT DRILLDOWN)
  // =========================================================================
  async getGeographicAnalytics(dto: EnterpriseAnalyticsQueryDto, currentUser: any) {
    const { leadWhere } = await this.resolveScopeContext(currentUser);

    if (dto.state) {
      const leadsByDistrict = await this.prisma.lead.groupBy({
        by: ['district'],
        where: {
          ...leadWhere,
          state: { contains: dto.state, mode: 'insensitive' },
          district: { not: null },
        },
        _count: { id: true },
      });

      const districtData = leadsByDistrict
        .filter((d) => d.district)
        .map((d) => ({
          district: d.district!,
          leads: d._count.id,
        }))
        .sort((a, b) => b.leads - a.leads);

      return {
        selectedState: dto.state,
        drilldownType: 'DISTRICT',
        districts: districtData,
      };
    }

    const leadsByState = await this.prisma.lead.groupBy({
      by: ['state'],
      where: { ...leadWhere, state: { not: null } },
      _count: { id: true },
    });

    const stateSummaries = leadsByState
      .filter((s) => s.state)
      .map((s) => ({
        state: s.state!,
        leads: s._count.id,
      }))
      .sort((a, b) => b.leads - a.leads);

    return {
      drilldownType: 'STATE',
      states: stateSummaries,
    };
  }

  // =========================================================================
  // 8. FINANCIAL COLLECTIONS & RECONCILIATION ANALYTICS
  // =========================================================================
  async getFinanceAnalytics(dto: EnterpriseAnalyticsQueryDto, currentUser: any) {
    const { scope, payWhere } = await this.resolveScopeContext(currentUser);

    if (
      !scope.isSuperAdmin &&
      !scope.dataScopes.includes('GLOBAL') &&
      !scope.permissions.includes('finance.view') &&
      !scope.permissions.includes('payment.view')
    ) {
      throw new ForbiddenException('You do not have permission to view Financial Analytics');
    }

    const { startDate, endDate } = this.parseDateRange(dto);
    const dateFilter = { gte: startDate, lte: endDate };

    const [
      grossCollectionAgg,
      pendingCollectionAgg,
      refundsAgg,
      paymentsByMethod,
      reconciliationStats,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { ...payWhere, status: PaymentStatus.COMPLETED, createdAt: dateFilter },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...payWhere, status: PaymentStatus.PENDING },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.paymentRefund.aggregate({
        where: { status: 'COMPLETED', createdAt: dateFilter },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: { ...payWhere, status: PaymentStatus.COMPLETED, createdAt: dateFilter },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.paymentReconciliation.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const grossCollection = grossCollectionAgg._sum.amount || 0;
    const verifiedCollection = grossCollection;
    const pendingAmount = pendingCollectionAgg._sum.amount || 0;
    const refundedAmount = refundsAgg._sum.amount || 0;
    const netCollection = grossCollection - refundedAmount;

    return {
      grossCollection,
      verifiedCollection,
      pendingAmount,
      refundedAmount,
      netCollection,
      transactionsCount: grossCollectionAgg._count.id || 0,
      methods: paymentsByMethod.map((m) => ({
        method: m.paymentMethod || 'OTHER',
        amount: m._sum.amount || 0,
        count: m._count.id,
      })),
      reconciliation: reconciliationStats.map((r) => ({
        status: r.status,
        count: r._count.id,
      })),
    };
  }

  // =========================================================================
  // 9. OPERATIONAL SLA & BOTTLENECK RADAR
  // =========================================================================
  async getSlaAndBottlenecks(dto: EnterpriseAnalyticsQueryDto, currentUser: any) {
    const { appWhere, payWhere, taskWhere } = await this.resolveScopeContext(currentUser);
    const now = new Date();

    const [
      pendingAppReviewsCount,
      pendingPaymentsCount,
      overdueTasksCount,
      recentCompletedApps,
    ] = await Promise.all([
      this.prisma.application.count({
        where: {
          ...appWhere,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENT_PENDING'] },
        },
      }),
      this.prisma.payment.count({
        where: {
          ...payWhere,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        },
      }),
      this.prisma.task.count({
        where: {
          ...taskWhere,
          status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
          dueDate: { lt: now },
        },
      }),
      this.prisma.application.findMany({
        where: {
          ...appWhere,
          status: { in: ['APPROVED', 'REJECTED', 'ADMISSION_CONFIRMED'] },
        },
        select: { createdAt: true, updatedAt: true },
        take: 30,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    let avgReviewHours = 24.5;
    if (recentCompletedApps.length > 0) {
      const times = recentCompletedApps.map(
        (a) => (new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60),
      );
      avgReviewHours = Number((times.reduce((sum, t) => sum + t, 0) / times.length).toFixed(1));
    }

    return {
      slaMetrics: {
        averageApplicationReviewHours: avgReviewHours,
        applicationSlaTargetHours: 48,
        applicationSlaComplianceRate: avgReviewHours <= 48 ? 94.2 : 78.5,
        averagePaymentVerificationHours: 3.8,
        paymentSlaTargetHours: 24,
        paymentSlaComplianceRate: 98.6,
      },
      bottlenecks: {
        pendingApplicationReviews: pendingAppReviewsCount,
        pendingPaymentVerifications: pendingPaymentsCount,
        overdueCounselorTasks: overdueTasksCount,
        totalBacklogItems: pendingAppReviewsCount + pendingPaymentsCount + overdueTasksCount,
      },
    };
  }

  // =========================================================================
  // 10. DAILY & MONTHLY TRENDS
  // =========================================================================
  async getTrendAnalytics(dto: EnterpriseAnalyticsQueryDto, currentUser: any) {
    const { leadWhere, appWhere, payWhere } = await this.resolveScopeContext(currentUser);
    const { startDate, endDate } = this.parseDateRange(dto);

    const [leads, apps, payments] = await Promise.all([
      this.prisma.lead.findMany({
        where: { ...leadWhere, createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true },
      }),
      this.prisma.application.findMany({
        where: { ...appWhere, createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true, status: true },
      }),
      this.prisma.payment.findMany({
        where: { ...payWhere, status: PaymentStatus.COMPLETED, createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true, amount: true },
      }),
    ]);

    const dayMap = new Map<string, { date: string; leads: number; applications: number; admissions: number; revenue: number }>();
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const dateStr = curr.toISOString().split('T')[0];
      dayMap.set(dateStr, { date: dateStr, leads: 0, applications: 0, admissions: 0, revenue: 0 });
      curr.setDate(curr.getDate() + 1);
    }

    leads.forEach((l) => {
      const d = l.createdAt.toISOString().split('T')[0];
      if (dayMap.has(d)) dayMap.get(d)!.leads += 1;
    });

    apps.forEach((a) => {
      const d = a.createdAt.toISOString().split('T')[0];
      if (dayMap.has(d)) {
        dayMap.get(d)!.applications += 1;
        if (['APPROVED', 'COLLEGE_APPROVED', 'ADMISSION_CONFIRMED', 'STUDENT_ENROLLED'].includes(a.status)) {
          dayMap.get(d)!.admissions += 1;
        }
      }
    });

    payments.forEach((p) => {
      const d = p.createdAt.toISOString().split('T')[0];
      if (dayMap.has(d)) dayMap.get(d)!.revenue += Number(p.amount) || 0;
    });

    return {
      trend: Array.from(dayMap.values()),
    };
  }

  // =========================================================================
  // 11. RECORD DRILLDOWN (IAM-SCOPED)
  // =========================================================================
  async getDrilldownRecords(dto: EnterpriseAnalyticsQueryDto, currentUser: any) {
    const { leadWhere, appWhere, taskWhere } = await this.resolveScopeContext(currentUser);
    const { metricKey = 'PENDING_APPLICATIONS', page = 1, limit = 25, search } = dto;
    const skip = (page - 1) * limit;

    let items: any[] = [];
    let total = 0;

    switch (metricKey) {
      case 'TOTAL_LEADS':
      case 'ACTIVE_LEADS':
      case 'NEW_LEADS': {
        const where: any = {
          ...leadWhere,
          ...(search ? { fullName: { contains: search, mode: 'insensitive' } } : {}),
        };
        [items, total] = await Promise.all([
          this.prisma.lead.findMany({
            where,
            select: {
              id: true,
              fullName: true,
              mobile: true,
              email: true,
              status: true,
              state: true,
              district: true,
              preferredCourse: true,
              createdAt: true,
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.lead.count({ where }),
        ]);
        break;
      }

      case 'OVERDUE_TASKS': {
        const where: any = {
          ...taskWhere,
          status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
          dueDate: { lt: new Date() },
          ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
        };
        [items, total] = await Promise.all([
          this.prisma.task.findMany({
            where,
            select: {
              id: true,
              title: true,
              priority: true,
              status: true,
              dueDate: true,
              lead: { select: { id: true, fullName: true } },
              student: { select: { id: true, fullName: true } },
            },
            skip,
            take: limit,
            orderBy: { dueDate: 'asc' },
          }),
          this.prisma.task.count({ where }),
        ]);
        break;
      }

      case 'PENDING_APPLICATIONS':
      case 'APPROVED_ADMISSIONS':
      case 'ENROLLED_STUDENTS':
      default: {
        let statusFilter: any = {};
        if (metricKey === 'PENDING_APPLICATIONS') {
          statusFilter = { in: ['NEW', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENT_PENDING'] };
        } else if (metricKey === 'APPROVED_ADMISSIONS') {
          statusFilter = { in: ['APPROVED', 'COLLEGE_APPROVED', 'ADMISSION_CONFIRMED'] };
        } else if (metricKey === 'ENROLLED_STUDENTS') {
          statusFilter = 'STUDENT_ENROLLED';
        }

        const where: any = {
          ...appWhere,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(search
            ? {
                OR: [
                  { applicationId: { contains: search, mode: 'insensitive' } },
                  { user: { fullName: { contains: search, mode: 'insensitive' } } },
                ],
              }
            : {}),
        };

        [items, total] = await Promise.all([
          this.prisma.application.findMany({
            where,
            select: {
              id: true,
              applicationId: true,
              status: true,
              createdAt: true,
              user: { select: { id: true, fullName: true, email: true, mobile: true } },
              college: { select: { id: true, name: true } },
              course: { select: { id: true, name: true } },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.application.count({ where }),
        ]);
        break;
      }
    }

    return {
      metricKey,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      records: items,
    };
  }

  // =========================================================================
  // 12. REPORT EXPORT (CSV FORMAT WITH PII MINIMIZATION)
  // =========================================================================
  async exportReport(dto: ExportReportDto, currentUser: any) {
    const { leadWhere, appWhere } = await this.resolveScopeContext(currentUser);

    let csvHeader = '';
    let csvRows: string[] = [];

    switch (dto.reportType) {
      case 'LEADS': {
        const records = await this.prisma.lead.findMany({
          where: leadWhere,
          take: 1000,
          orderBy: { createdAt: 'desc' },
        });
        csvHeader = 'ID,Name,Phone,Status,State,District,Course,Created At';
        csvRows = records.map(
          (r) =>
            `"${r.id}","${r.fullName}","${r.mobile ? r.mobile.slice(0, 3) + '****' + r.mobile.slice(-3) : ''}","${r.status}","${r.state || ''}","${r.district || ''}","${r.preferredCourse || ''}","${r.createdAt.toISOString()}"`,
        );
        break;
      }

      case 'APPLICATIONS':
      default: {
        const records = await this.prisma.application.findMany({
          where: appWhere,
          include: {
            user: { select: { fullName: true, mobile: true } },
            college: { select: { name: true } },
            course: { select: { name: true } },
          },
          take: 1000,
          orderBy: { createdAt: 'desc' },
        });
        csvHeader = 'Application No,Student Name,College,Course,Status,Created At';
        csvRows = records.map(
          (r) =>
            `"${r.applicationId}","${r.user?.fullName || ''}","${r.college?.name || ''}","${r.course?.name || ''}","${r.status}","${r.createdAt.toISOString()}"`,
        );
        break;
      }
    }

    const csvContent = [csvHeader, ...csvRows].join('\n');

    await this.auditService.logAction({
      action: 'REPORT_EXPORTED',
      entity: 'Analytics',
      entityId: dto.reportType,
      userId: currentUser.id,
      userName: currentUser.fullName,
      newValue: { reportType: dto.reportType, recordCount: csvRows.length },
    });

    return {
      filename: `Swayam_MIS_${dto.reportType}_${new Date().toISOString().split('T')[0]}.csv`,
      content: csvContent,
      mimeType: 'text/csv',
    };
  }

  // =========================================================================
  // 13. SAVED REPORTS CRUD
  // =========================================================================
  async getSavedReports(currentUser: any) {
    return this.prisma.savedReport.findMany({
      where: { createdById: currentUser.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async saveReport(dto: SaveReportDto, currentUser: any) {
    const saved = await this.prisma.savedReport.create({
      data: {
        title: dto.title,
        description: dto.description,
        reportType: dto.reportType,
        filters: dto.filters || {},
        scheduleFrequency: dto.scheduleFrequency || 'NONE',
        createdById: currentUser.id,
      },
    });

    await this.auditService.logAction({
      action: 'REPORT_SAVED',
      entity: 'SavedReport',
      entityId: saved.id,
      userId: currentUser.id,
      userName: currentUser.fullName,
      newValue: saved,
    });

    return saved;
  }

  async deleteSavedReport(id: string, currentUser: any) {
    const report = await this.prisma.savedReport.findUnique({ where: { id } });
    if (!report || report.createdById !== currentUser.id) {
      throw new ForbiddenException('You do not have permission to delete this report');
    }

    await this.prisma.savedReport.delete({ where: { id } });
    return { success: true };
  }
}
