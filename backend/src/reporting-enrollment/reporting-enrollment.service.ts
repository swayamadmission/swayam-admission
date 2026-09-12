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
import { JourneyService } from '../journey/journey.service';
import { DataScopeService } from '../auth/data-scope.service';
import { IUser } from '../auth/interfaces/user.interface';
import {
  SubmitReportingDto,
  RequestReportingCorrectionDto,
  VerifyReportingDto,
  ConfirmEnrollmentDto,
  ReportingStatus,
} from './dto/reporting-enrollment.dto';

@Injectable()
export class ReportingEnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly journeyService: JourneyService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  /**
   * 1. GET REPORTING RECORD FOR APPLICATION
   */
  async getReportingByApplicationId(applicationId: string, actor: IUser) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        college: { select: { id: true, name: true, city: true, state: true } },
        course: { select: { id: true, name: true, level: true } },
        branch: { select: { id: true, name: true, type: true } },
        user: { select: { id: true, fullName: true, email: true, mobile: true } },
        counselor: { select: { id: true, fullName: true, email: true } },
        reporting: {
          include: {
            reviewer: { select: { id: true, fullName: true, email: true } },
            verifiedBy: { select: { id: true, fullName: true, email: true } },
            enrollment: true,
          },
        },
        enrollment: true,
      },
    });

    if (!app) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    if (actor.role === 'STUDENT' && app.userId !== actor.id) {
      throw new ForbiddenException('You are not authorized to view this reporting record.');
    }

    return {
      success: true,
      data: {
        application: {
          id: app.id,
          applicationNumber: app.applicationNumber,
          status: app.status,
          paymentStatus: app.paymentStatus,
          student: app.user,
          college: app.college,
          course: app.course,
          branch: app.branch,
          counselor: app.counselor,
        },
        reporting: app.reporting,
        enrollment: app.enrollment,
        isReportingEligible:
          app.status === 'ADMISSION_CONFIRMED' ||
          app.status === 'ADMISSION_COMPLETED' ||
          app.status === 'STUDENT_ENROLLED',
      },
    };
  }

  /**
   * 2. STUDENT SUBMITS CAMPUS REPORTING DETAILS & PROOF
   */
  async submitReporting(
    student: IUser,
    applicationId: string,
    dto: SubmitReportingDto,
  ) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { college: true, course: true, branch: true, user: true, counselor: true },
    });

    if (!app) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    if (student.role === 'STUDENT' && app.userId !== student.id) {
      throw new ForbiddenException('You are not authorized to submit reporting for this application.');
    }

    if (
      app.status !== 'ADMISSION_CONFIRMED' &&
      app.status !== 'ADMISSION_COMPLETED' &&
      app.status !== 'STUDENT_ENROLLED'
    ) {
      throw new BadRequestException(
        'Campus reporting can only be submitted after Admission has been Confirmed.',
      );
    }

    const reporting = await this.prisma.$transaction(async (tx) => {
      let existingReporting = await tx.collegeReporting.findUnique({
        where: { applicationId },
      });

      if (!existingReporting) {
        const count = await tx.collegeReporting.count();
        const reportingCode = `REP-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

        const targetCollegeId =
          app.collegeId ||
          (app.courseId
            ? (await tx.course.findUnique({ where: { id: app.courseId }, select: { collegeId: true } }))?.collegeId
            : null);

        if (!targetCollegeId) {
          throw new BadRequestException('Application must have an assigned college before reporting.');
        }

        existingReporting = await tx.collegeReporting.create({
          data: {
            reportingCode,
            applicationId,
            studentId: app.userId,
            collegeId: targetCollegeId,
            courseId: app.courseId,
            branchId: app.branchId,
            academicSessionId: app.academicSessionId,
            status: ReportingStatus.REPORTING_SUBMITTED,
            reportingDate: dto.reportingDate ? new Date(dto.reportingDate) : new Date(),
            collegeCampus: dto.collegeCampus || 'Main Campus',
            collegeReferenceNumber: dto.collegeReferenceNumber || null,
            proofDocumentUrl: dto.proofDocumentUrl || null,
            proofDocumentName: dto.proofDocumentName || 'Reporting_Acknowledgement.pdf',
            studentRemarks: dto.studentRemarks || null,
            submittedAt: new Date(),
          },
        });
      } else {
        existingReporting = await tx.collegeReporting.update({
          where: { applicationId },
          data: {
            status: ReportingStatus.REPORTING_SUBMITTED,
            reportingDate: dto.reportingDate ? new Date(dto.reportingDate) : existingReporting.reportingDate,
            collegeCampus: dto.collegeCampus || existingReporting.collegeCampus,
            collegeReferenceNumber: dto.collegeReferenceNumber || existingReporting.collegeReferenceNumber,
            proofDocumentUrl: dto.proofDocumentUrl || existingReporting.proofDocumentUrl,
            proofDocumentName: dto.proofDocumentName || existingReporting.proofDocumentName,
            studentRemarks: dto.studentRemarks || existingReporting.studentRemarks,
            submittedAt: new Date(),
            correctionReason: null,
            publicCorrectionReason: null,
          },
        });
      }

      await tx.applicationTimeline.create({
        data: {
          applicationId,
          userId: student.id,
          action: 'REPORTING_SUBMITTED',
          oldStatus: app.status,
          newStatus: app.status,
          remarks: `Campus reporting submitted by ${student.fullName || student.email}. Ref: ${dto.collegeReferenceNumber || 'N/A'}`,
        },
      });

      return existingReporting;
    });

    await this.auditService.logAction({
      action: 'REPORTING_SUBMITTED',
      entity: 'CollegeReporting',
      entityId: reporting.id,
      description: `Campus reporting submitted for Application ${app.applicationNumber || applicationId} (${app.college?.name})`,
      userId: student.id,
      metadata: {
        applicationId,
        reportingCode: reporting.reportingCode,
        collegeReferenceNumber: dto.collegeReferenceNumber,
      },
    });

    try {
      if (app.counselorId) {
        await this.notificationsService.createNotification({
          userId: app.counselorId,
          title: 'Student Submitted Campus Reporting',
          message: `${app.user?.fullName} submitted campus reporting for ${app.college?.name}. Awaiting verification.`,
          type: 'APPLICATION' as any,
        });
      }
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: 'Campus reporting details and proof submitted successfully',
      data: reporting,
    };
  }

  /**
   * 3. GET REPORTING & ENROLLMENT QUEUES (Multi-tab filterable)
   */
  async getReportingQueue(actor: IUser, query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const tab = query.tab || 'all';

    const where: any = {};

    if (tab === 'submitted') {
      where.status = ReportingStatus.REPORTING_SUBMITTED;
    } else if (tab === 'verification_pending') {
      where.status = { in: [ReportingStatus.REPORTING_SUBMITTED, ReportingStatus.VERIFICATION_PENDING] };
    } else if (tab === 'correction_required') {
      where.status = ReportingStatus.CORRECTION_REQUIRED;
    } else if (tab === 'completed') {
      where.status = ReportingStatus.REPORTING_COMPLETED;
    } else if (tab === 'rejected') {
      where.status = ReportingStatus.REPORTING_REJECTED;
    }

    if (query.collegeId) {
      where.collegeId = query.collegeId;
    }

    if (query.search) {
      where.OR = [
        { reportingCode: { contains: query.search, mode: 'insensitive' } },
        { collegeReferenceNumber: { contains: query.search, mode: 'insensitive' } },
        { student: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { student: { mobile: { contains: query.search, mode: 'insensitive' } } },
        { college: { name: { contains: query.search, mode: 'insensitive' } } },
        { application: { applicationNumber: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total, counts] = await Promise.all([
      this.prisma.collegeReporting.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          student: { select: { id: true, fullName: true, email: true, mobile: true } },
          college: { select: { id: true, name: true, city: true, state: true } },
          course: { select: { id: true, name: true, level: true } },
          branch: { select: { id: true, name: true } },
          reviewer: { select: { id: true, fullName: true, email: true } },
          verifiedBy: { select: { id: true, fullName: true, email: true } },
          enrollment: true,
          application: {
            select: {
              id: true,
              applicationNumber: true,
              status: true,
              paymentStatus: true,
              counselor: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      }),
      this.prisma.collegeReporting.count({ where }),
      this.prisma.collegeReporting.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const statusCounts = counts.reduce((acc: any, c) => {
      acc[c.status] = c._count;
      return acc;
    }, {});

    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        counts: {
          total: Object.values(statusCounts).reduce((a: number, b: any) => a + Number(b), 0),
          submitted: statusCounts[ReportingStatus.REPORTING_SUBMITTED] || 0,
          verificationPending:
            (statusCounts[ReportingStatus.REPORTING_SUBMITTED] || 0) +
            (statusCounts[ReportingStatus.VERIFICATION_PENDING] || 0),
          correctionRequired: statusCounts[ReportingStatus.CORRECTION_REQUIRED] || 0,
          completed: statusCounts[ReportingStatus.REPORTING_COMPLETED] || 0,
          rejected: statusCounts[ReportingStatus.REPORTING_REJECTED] || 0,
        },
      },
    };
  }

  /**
   * 4. CLAIM REPORTING REVIEW (Concurrency Protection)
   */
  async claimReporting(actor: IUser, reportingId: string) {
    const reporting = await this.prisma.collegeReporting.findUnique({
      where: { id: reportingId },
    });

    if (!reporting) {
      throw new NotFoundException(`Reporting record ${reportingId} not found`);
    }

    if (reporting.reviewerId && reporting.reviewerId !== actor.id) {
      const existingReviewer = await this.prisma.user.findUnique({
        where: { id: reporting.reviewerId },
        select: { fullName: true, email: true },
      });
      throw new ConflictException(
        `This reporting record has already been claimed by ${existingReviewer?.fullName || existingReviewer?.email || 'another reviewer'}.`,
      );
    }

    const updated = await this.prisma.collegeReporting.update({
      where: { id: reportingId },
      data: {
        reviewerId: actor.id,
        reviewAssignedAt: new Date(),
        status: ReportingStatus.VERIFICATION_PENDING,
      },
      include: {
        student: true,
        college: true,
        course: true,
        application: true,
      },
    });

    await this.auditService.logAction({
      action: 'REPORTING_CLAIMED',
      entity: 'CollegeReporting',
      entityId: reportingId,
      description: `Reporting review claimed by ${actor.fullName || actor.email} for ${reporting.reportingCode}`,
      userId: actor.id,
    });

    return {
      success: true,
      message: 'Reporting review claimed successfully',
      data: updated,
    };
  }

  /**
   * 5. REQUEST REPORTING CORRECTION
   */
  async requestReportingCorrection(
    actor: IUser,
    reportingId: string,
    dto: RequestReportingCorrectionDto,
  ) {
    const reporting = await this.prisma.collegeReporting.findUnique({
      where: { id: reportingId },
      include: { student: true, application: true, college: true },
    });

    if (!reporting) {
      throw new NotFoundException(`Reporting record ${reportingId} not found`);
    }

    const updated = await this.prisma.collegeReporting.update({
      where: { id: reportingId },
      data: {
        status: ReportingStatus.CORRECTION_REQUIRED,
        correctionReason: dto.correctionReason,
        publicCorrectionReason: dto.publicCorrectionReason || dto.correctionReason,
      },
    });

    await this.auditService.logAction({
      action: 'REPORTING_CORRECTION_REQUESTED',
      entity: 'CollegeReporting',
      entityId: reportingId,
      description: `Reporting correction requested for ${reporting.reportingCode}. Reason: ${dto.correctionReason}`,
      userId: actor.id,
      metadata: { reason: dto.correctionReason },
    });

    try {
      await this.notificationsService.createNotification({
        userId: reporting.studentId,
        title: 'Reporting Details Need Correction',
        message: `Your campus reporting proof for ${reporting.college?.name} requires resubmission: ${dto.publicCorrectionReason || dto.correctionReason}`,
        type: 'APPLICATION' as any,
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: 'Correction request sent to student',
      data: updated,
    };
  }

  /**
   * 6. VERIFY REPORTING (Transitions to REPORTING_COMPLETED & Application ADMISSION_COMPLETED)
   */
  async verifyReporting(
    actor: IUser,
    reportingId: string,
    dto: VerifyReportingDto,
  ) {
    const reporting = await this.prisma.collegeReporting.findUnique({
      where: { id: reportingId },
      include: { student: true, college: true, application: true },
    });

    if (!reporting) {
      throw new NotFoundException(`Reporting record ${reportingId} not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedRep = await tx.collegeReporting.update({
        where: { id: reportingId },
        data: {
          status: ReportingStatus.REPORTING_COMPLETED,
          verifiedAt: new Date(),
          verifiedById: actor.id,
          verificationSource: dto.verificationSource || 'MANUAL_VERIFIED',
          verificationRemarks: dto.verificationRemarks || null,
        },
      });

      await tx.application.update({
        where: { id: reporting.applicationId },
        data: {
          status: 'ADMISSION_COMPLETED',
        },
      });

      await tx.applicationTimeline.create({
        data: {
          applicationId: reporting.applicationId,
          userId: actor.id,
          action: 'REPORTING_COMPLETED',
          oldStatus: reporting.application.status,
          newStatus: 'ADMISSION_COMPLETED',
          remarks: `Campus reporting verified by ${actor.fullName || actor.email}. Source: ${dto.verificationSource || 'MANUAL_VERIFIED'}`,
        },
      });

      return updatedRep;
    });

    await this.auditService.logAction({
      action: 'REPORTING_VERIFIED',
      entity: 'CollegeReporting',
      entityId: reportingId,
      description: `Campus reporting verified for ${reporting.reportingCode} (${reporting.college?.name})`,
      userId: actor.id,
      metadata: { source: dto.verificationSource, remarks: dto.verificationRemarks },
    });

    try {
      await this.notificationsService.createNotification({
        userId: reporting.studentId,
        title: 'Campus Reporting Verified! 🎉',
        message: `Your campus reporting for ${reporting.college?.name} has been verified successfully. Enrollment confirmation pending.`,
        type: 'APPLICATION' as any,
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: 'Campus reporting verified and application status updated to ADMISSION_COMPLETED',
      data: updated,
    };
  }

  /**
   * 7. CONFIRM ENROLLMENT (Authoritative Final Enrolled Record & Journey Completion)
   */
  async confirmEnrollment(
    actor: IUser,
    applicationId: string,
    dto?: ConfirmEnrollmentDto,
  ) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        college: true,
        course: true,
        branch: true,
        user: true,
        counselor: true,
        reporting: true,
        enrollment: true,
      },
    });

    if (!app) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    if (app.enrollment && app.enrollment.status === 'CONFIRMED') {
      return {
        success: true,
        message: 'Application is already enrolled',
        data: app.enrollment,
      };
    }

    // Check single active enrollment rule across all student applications
    const existingActiveEnrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        studentId: app.userId,
        status: 'CONFIRMED',
        NOT: { applicationId },
      },
      include: { college: true, course: true },
    });

    if (existingActiveEnrollment) {
      throw new ConflictException(
        `Student ${app.user?.fullName} already has an active confirmed enrollment in ${existingActiveEnrollment.college?.name} (${existingActiveEnrollment.enrollmentNumber}).`,
      );
    }

    const count = await this.prisma.studentEnrollment.count();
    const enrollmentNumber = `ENR-${new Date().getFullYear()}-${String(count + 1).padStart(8, '0')}`;

    const enrollment = await this.prisma.$transaction(async (tx) => {
      const targetCollegeId =
        app.collegeId ||
        (app.courseId
          ? (await tx.course.findUnique({ where: { id: app.courseId }, select: { collegeId: true } }))?.collegeId
          : null);

      if (!targetCollegeId) {
        throw new BadRequestException('Application must have an assigned college before enrollment confirmation.');
      }

      const createdEnrollment = await tx.studentEnrollment.create({
        data: {
          enrollmentNumber,
          applicationId,
          reportingId: app.reporting?.id || null,
          studentId: app.userId,
          collegeId: targetCollegeId,
          courseId: app.courseId,
          branchId: app.branchId,
          academicSessionId: app.academicSessionId,
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          confirmedById: actor.id,
          remarks: dto?.remarks || null,
        },
      });

      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: 'STUDENT_ENROLLED',
        },
      });

      await tx.applicationTimeline.create({
        data: {
          applicationId,
          userId: actor.id,
          action: 'STUDENT_ENROLLED',
          oldStatus: app.status,
          newStatus: 'STUDENT_ENROLLED',
          remarks: `Student officially enrolled with Enrollment No: ${enrollmentNumber}`,
        },
      });

      return createdEnrollment;
    });

    await this.auditService.logAction({
      action: 'ENROLLMENT_CONFIRMED',
      entity: 'StudentEnrollment',
      entityId: enrollment.id,
      description: `Official enrollment confirmed for Student ${app.user?.fullName} at ${app.college?.name}. Enrollment No: ${enrollmentNumber}`,
      userId: actor.id,
      metadata: { enrollmentNumber, collegeId: app.collegeId, courseId: app.courseId },
    });

    try {
      await this.notificationsService.createNotification({
        userId: app.userId,
        title: '🎓 Official Enrollment Confirmed!',
        message: `Heartiest Congratulations! You are now officially enrolled at ${app.college?.name} (${app.course?.name}). Your Official Enrollment Number is ${enrollmentNumber}.`,
        type: 'APPLICATION' as any,
      });

      if (app.counselorId) {
        await this.notificationsService.createNotification({
          userId: app.counselorId,
          title: 'Student Successfully Enrolled! 🎓',
          message: `Your student ${app.user?.fullName} has completed the full admission journey and is enrolled at ${app.college?.name} (${enrollmentNumber}).`,
          type: 'APPLICATION' as any,
        });
      }
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: 'Student officially enrolled and admission journey completed successfully',
      data: enrollment,
    };
  }

  /**
   * 8. GET STUDENT ENROLLMENTS
   */
  async getStudentEnrollments(studentId: string, actor: IUser) {
    if (actor.role === 'STUDENT' && studentId !== actor.id) {
      throw new ForbiddenException('Access denied to student enrollments.');
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: { studentId },
      include: {
        college: { select: { id: true, name: true, city: true, state: true, logo: true } },
        course: { select: { id: true, name: true, level: true } },
        branch: { select: { id: true, name: true } },
        application: { select: { id: true, applicationNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: enrollments,
    };
  }
}
