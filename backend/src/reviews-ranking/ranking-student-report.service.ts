import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IUser } from '../auth/interfaces/user.interface';
import {
  SubmitStudentReportDto,
  ModerateStudentReportDto,
} from './dto/reviews-ranking.dto';

@Injectable()
export class RankingStudentReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 1. CHECK STUDENT ELIGIBILITY FOR A COLLEGE
   * Validates: Student -> Application -> College -> Course -> Confirmed Admission
   */
  async checkStudentEligibility(studentId: string, collegeId: string) {
    const admittedApp = await this.prisma.application.findFirst({
      where: {
        userId: studentId,
        collegeId,
        status: {
          in: ['ADMISSION_CONFIRMED', 'ADMISSION_COMPLETED', 'STUDENT_ENROLLED', 'APPROVED'],
        },
      },
      include: {
        college: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        enrollment: true,
      },
    });

    const hasExistingReport = await this.prisma.studentCollegeReport.findFirst({
      where: {
        studentId,
        collegeId,
      },
    });

    return {
      isEligible: !!admittedApp,
      hasExistingReport: !!hasExistingReport,
      application: admittedApp
        ? {
            id: admittedApp.id,
            status: admittedApp.status,
            courseName: admittedApp.course?.name,
            enrollmentNumber: admittedApp.enrollment?.enrollmentNumber,
          }
        : null,
      reason: !admittedApp
        ? 'Official ranking feedback requires a confirmed admission or verified enrollment relationship with this institution.'
        : hasExistingReport
        ? 'You have already submitted a ranking report for this institution for this academic cycle.'
        : null,
    };
  }

  /**
   * 2. SUBMIT STRUCTURED STUDENT COLLEGE REPORT
   */
  async submitReport(
    student: IUser,
    dto: SubmitStudentReportDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const currentYear = dto.rankingYear || new Date().getFullYear();

    // Verify Eligibility
    const eligibility = await this.checkStudentEligibility(student.id, dto.collegeId);
    if (!eligibility.isEligible) {
      throw new ForbiddenException(
        'Eligibility Check Failed: Only students with genuine, verified admission records at this institution can submit official ranking reports.',
      );
    }

    if (eligibility.hasExistingReport) {
      throw new ConflictException(
        'You have already submitted an official ranking report for this college for this ranking cycle.',
      );
    }

    const app = eligibility.application;

    // Calculate composite student overall rating from 9 pillars
    const ratings = [
      dto.academicRating,
      dto.placementRating,
      dto.studentDemandRating,
      dto.infrastructureRating,
      dto.connectivityRating,
      dto.hostelLivingRating,
      dto.dailyConvenienceRating,
      dto.safetyHealthcareRating,
      dto.affordabilityRoiRating,
      dto.trustTransparencyRating,
    ].filter((r) => r !== undefined && r !== null) as number[];

    const overallRating =
      ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 4.0;

    const report = await this.prisma.studentCollegeReport.create({
      data: {
        studentId: student.id,
        collegeId: dto.collegeId,
        courseId: dto.courseId || null,
        applicationId: app?.id || null,
        rankingYear: currentYear,
        title: dto.title || 'Student Academic & Campus Experience Report',
        detailedReview: dto.detailedReview?.trim() || null,
        evidenceUrls: dto.evidenceUrls || [],
        isVerifiedStudent: true,
        status: 'PENDING',
        academicRating: dto.academicRating || null,
        placementRating: dto.placementRating || null,
        studentDemandRating: dto.studentDemandRating || null,
        infrastructureRating: dto.infrastructureRating || null,
        connectivityRating: dto.connectivityRating || null,
        hostelLivingRating: dto.hostelLivingRating || null,
        dailyConvenienceRating: dto.dailyConvenienceRating || null,
        safetyHealthcareRating: dto.safetyHealthcareRating || null,
        affordabilityRoiRating: dto.affordabilityRoiRating || null,
        trustTransparencyRating: dto.trustTransparencyRating || null,
        overallRating,
        ipAddress: meta?.ipAddress || null,
        userAgent: meta?.userAgent || null,
      },
    });

    await this.auditService.logAction({
      action: 'STUDENT_RANKING_REPORT_SUBMITTED',
      entity: 'StudentCollegeReport',
      entityId: report.id,
      description: `Student ${student.fullName || student.email} submitted verified 9-pillar report for College ${dto.collegeId}`,
      userId: student.id,
      metadata: { collegeId: dto.collegeId, year: currentYear, overallRating },
    });

    return {
      success: true,
      message:
        'Thank you! Your structured student ranking report has been submitted for moderation. Once verified, it will contribute to official ranking intelligence.',
      data: report,
    };
  }

  /**
   * 3. GET MY SUBMITTED REPORTS (STUDENT PERSPECTIVE)
   */
  async getMyReports(studentId: string) {
    return this.prisma.studentCollegeReport.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            logo: true,
          },
        },
      },
    });
  }

  /**
   * 4. ADMIN: GET STUDENT REPORTS LIST (WITH FILTERS & MODERATION QUEUE)
   */
  async getAdminReports(query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }
    if (query.collegeId) {
      where.collegeId = query.collegeId;
    }
    if (query.year) {
      where.rankingYear = Number(query.year);
    }
    if (query.search) {
      where.OR = [
        { college: { name: { contains: query.search, mode: 'insensitive' } } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { detailedReview: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [reports, total] = await Promise.all([
      this.prisma.studentCollegeReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, fullName: true, email: true, mobile: true } },
          college: { select: { id: true, name: true, city: true, state: true } },
          course: { select: { id: true, name: true } },
          application: { select: { id: true, status: true, applicationNumber: true } },
          moderatedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.studentCollegeReport.count({ where }),
    ]);

    return {
      success: true,
      data: reports,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 5. ADMIN: MODERATE STUDENT REPORT (VERIFY, REJECT, FLAG, ARCHIVE)
   */
  async moderateReport(actor: IUser, id: string, dto: ModerateStudentReportDto) {
    const report = await this.prisma.studentCollegeReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Student report '${id}' not found.`);
    }

    const newStatus =
      dto.action === 'VERIFY'
        ? 'VERIFIED'
        : dto.action === 'REJECT'
        ? 'REJECTED'
        : dto.action === 'FLAG'
        ? 'FLAGGED'
        : dto.action === 'PUBLISH'
        ? 'PUBLISHED'
        : 'ARCHIVED';

    const updated = await this.prisma.studentCollegeReport.update({
      where: { id },
      data: {
        status: newStatus,
        moderatedById: actor.id,
        moderatedAt: new Date(),
        moderationReason: dto.reason || null,
      },
      include: {
        college: { select: { id: true, name: true } },
      },
    });

    await this.auditService.logAction({
      action: 'STUDENT_RANKING_REPORT_MODERATED',
      entity: 'StudentCollegeReport',
      entityId: id,
      description: `Moderated report ${id} to ${newStatus} by ${actor.fullName || actor.email}`,
      userId: actor.id,
      metadata: { action: dto.action, reason: dto.reason, newStatus },
    });

    // Notify student if verified or rejected
    try {
      if (newStatus === 'VERIFIED') {
        await this.notificationsService.createNotification({
          userId: report.studentId,
          title: 'Student Ranking Report Verified! ⭐',
          message: `Your experience report for ${updated.college.name} has been verified and added to the official ranking dataset.`,
          type: 'STUDENT' as any,
        });
      }
    } catch {
      // non-blocking
    }

    return {
      success: true,
      message: `Report status updated to ${newStatus}.`,
      data: updated,
    };
  }
}
