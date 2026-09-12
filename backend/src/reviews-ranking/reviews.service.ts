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
  SubmitCollegeReviewDto,
  SubmitCounselorReviewDto,
  SubmitSupportReviewDto,
  ModerateReviewDto,
  FileComplaintDto,
  ReviewStatus,
  ModerationAction,
} from './dto/reviews-ranking.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 1. SUBMIT COUNSELOR REVIEW (1-5 Stars + Optional Message)
   */
  async submitCounselorReview(student: IUser, dto: SubmitCounselorReviewDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: student.id },
      include: {
        assignedCounselor: true,
        applications: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) throw new NotFoundException('Student user not found');

    const targetCounselorId = dto.counselorId || user.assignedCounselorId;
    if (!targetCounselorId) {
      throw new BadRequestException('No assigned counselor found to submit a review for.');
    }

    const existing = await this.prisma.counselorReview.findFirst({
      where: {
        studentId: student.id,
        counselorId: targetCounselorId,
      },
    });

    if (existing) {
      throw new ConflictException('You have already submitted a review for this counselor.');
    }

    const rating = Math.min(5, Math.max(1, Math.round(dto.rating)));

    const review = await this.prisma.counselorReview.create({
      data: {
        studentId: student.id,
        counselorId: targetCounselorId,
        applicationId: dto.applicationId || user.applications[0]?.id || null,
        rating,
        title: dto.title || null,
        comment: dto.comment?.trim() || null,
        status: ReviewStatus.PUBLISHED,
      },
    });

    await this.auditService.logAction({
      action: 'COUNSELOR_REVIEW_SUBMITTED',
      entity: 'CounselorReview',
      entityId: review.id,
      description: `Student ${student.fullName || student.email} rated counselor ${rating}/5`,
      userId: student.id,
      metadata: { counselorId: targetCounselorId, rating },
    });

    try {
      await this.notificationsService.createNotification({
        userId: targetCounselorId,
        title: 'New Student Review Received ⭐',
        message: `A student submitted a ${rating}-star feedback for your counseling guidance.`,
        type: 'COUNSELOR' as any,
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: 'Counselor review submitted successfully. Thank you for your feedback!',
      data: review,
    };
  }

  /**
   * 2. SUBMIT COLLEGE REVIEW (Verified Student Experience)
   */
  async submitCollegeReview(student: IUser, dto: SubmitCollegeReviewDto) {
    const admittedApp = await this.prisma.application.findFirst({
      where: {
        userId: student.id,
        collegeId: dto.collegeId,
        status: {
          in: ['ADMISSION_CONFIRMED', 'ADMISSION_COMPLETED', 'STUDENT_ENROLLED'],
        },
      },
      include: { enrollment: true, college: true, course: true, branch: true },
    });

    const isVerifiedStudent = !!admittedApp;

    const existing = await this.prisma.collegeReview.findFirst({
      where: {
        userId: student.id,
        collegeId: dto.collegeId,
      },
    });

    if (existing) {
      throw new ConflictException('You have already submitted a review for this college.');
    }

    const rating = Math.min(5, Math.max(1, Math.round(dto.rating)));

    const review = await this.prisma.collegeReview.create({
      data: {
        userId: student.id,
        collegeId: dto.collegeId,
        applicationId: admittedApp?.id || dto.applicationId || null,
        enrollmentId: admittedApp?.enrollment?.id || null,
        courseId: admittedApp?.courseId || null,
        branchId: admittedApp?.branchId || null,
        academicSessionId: admittedApp?.academicSessionId || null,
        rating,
        title: dto.title || null,
        content: dto.content?.trim() || null,
        isVerifiedStudent,
        status: ReviewStatus.PENDING_MODERATION,
      },
    });

    await this.auditService.logAction({
      action: 'COLLEGE_REVIEW_SUBMITTED',
      entity: 'CollegeReview',
      entityId: review.id,
      description: `Student submitted review for College ${dto.collegeId} (Verified Student: ${isVerifiedStudent})`,
      userId: student.id,
      metadata: { collegeId: dto.collegeId, rating, isVerifiedStudent },
    });

    return {
      success: true,
      message: isVerifiedStudent
        ? 'Verified Student Review submitted for moderation! It will be published shortly.'
        : 'Review submitted for moderation.',
      data: review,
    };
  }

  /**
   * 3. SUBMIT SUPPORT REVIEW (1-5 Stars)
   */
  async submitSupportReview(student: IUser, dto: SubmitSupportReviewDto) {
    const rating = Math.min(5, Math.max(1, Math.round(dto.rating)));

    const review = await this.prisma.supportReview.create({
      data: {
        studentId: student.id,
        ticketId: dto.ticketId || null,
        supportAgentId: dto.supportAgentId || null,
        rating,
        comment: dto.comment?.trim() || null,
        status: ReviewStatus.PUBLISHED,
      },
    });

    await this.auditService.logAction({
      action: 'SUPPORT_REVIEW_SUBMITTED',
      entity: 'SupportReview',
      entityId: review.id,
      description: `Student rated support experience ${rating}/5`,
      userId: student.id,
      metadata: { ticketId: dto.ticketId, rating },
    });

    return {
      success: true,
      message: 'Support review submitted successfully. Thank you!',
      data: review,
    };
  }

  /**
   * 4. FILE CONFIDENTIAL COMPLAINT (Restricted Investigation Queue)
   */
  async fileComplaint(student: IUser, dto: FileComplaintDto) {
    const complaint = await this.prisma.confidentialComplaint.create({
      data: {
        studentId: student.id,
        collegeId: dto.collegeId || null,
        category: dto.category,
        severity: dto.severity || 'HIGH',
        description: dto.description.trim(),
        evidenceUrl: dto.evidenceUrl || null,
        status: 'RECEIVED',
      },
    });

    await this.auditService.logAction({
      action: 'CONFIDENTIAL_COMPLAINT_FILED',
      entity: 'ConfidentialComplaint',
      entityId: complaint.id,
      description: `Confidential report filed in category ${dto.category}`,
      userId: student.id,
      metadata: { category: dto.category, collegeId: dto.collegeId },
    });

    return {
      success: true,
      message:
        'Your report has been received by the compliance and student safety desk confidentially. It will not be published publicly.',
      data: complaint,
    };
  }

  /**
   * 5. GET REVIEW MODERATION QUEUES (IAM-Protected)
   */
  async getModerationQueue(actor: IUser, query: any) {
    const type = query.type || 'college'; // college, counselor, complaints
    const status = query.status || 'PENDING_MODERATION';
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;

    if (type === 'complaints') {
      const where: any = {};
      if (query.status && query.status !== 'all') {
        where.status = query.status;
      }
      const [items, total] = await Promise.all([
        this.prisma.confidentialComplaint.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            student: { select: { id: true, fullName: true, email: true, mobile: true } },
            college: { select: { id: true, name: true, city: true, state: true } },
            assignedTo: { select: { id: true, fullName: true, email: true } },
          },
        }),
        this.prisma.confidentialComplaint.count({ where }),
      ]);
      return { success: true, data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    if (type === 'counselor') {
      const where: any = {};
      if (status !== 'all') where.status = status;
      const [items, total] = await Promise.all([
        this.prisma.counselorReview.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            student: { select: { id: true, fullName: true, email: true } },
            counselor: { select: { id: true, fullName: true, email: true } },
            moderatedBy: { select: { id: true, fullName: true, email: true } },
          },
        }),
        this.prisma.counselorReview.count({ where }),
      ]);
      return { success: true, data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    // Default: College Reviews
    const where: any = {};
    if (status !== 'all') where.status = status;
    if (query.collegeId) where.collegeId = query.collegeId;

    const [items, total, counts] = await Promise.all([
      this.prisma.collegeReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          college: { select: { id: true, name: true, city: true, state: true } },
          application: { select: { id: true, applicationNumber: true, status: true } },
          enrollment: { select: { id: true, enrollmentNumber: true } },
          moderatedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.collegeReview.count({ where }),
      this.prisma.collegeReview.groupBy({
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
          pending: statusCounts[ReviewStatus.PENDING_MODERATION] || 0,
          published: statusCounts[ReviewStatus.PUBLISHED] || 0,
          flagged: statusCounts[ReviewStatus.FLAGGED] || 0,
          rejected: statusCounts[ReviewStatus.REJECTED] || 0,
        },
      },
    };
  }

  /**
   * 6. MODERATE COLLEGE REVIEW
   */
  async moderateCollegeReview(actor: IUser, reviewId: string, dto: ModerateReviewDto) {
    const review = await this.prisma.collegeReview.findUnique({
      where: { id: reviewId },
      include: { college: true },
    });

    if (!review) throw new NotFoundException(`Review ${reviewId} not found`);

    let newStatus = ReviewStatus.PUBLISHED;
    let isApproved = true;

    if (dto.action === ModerationAction.REJECT) {
      newStatus = ReviewStatus.REJECTED;
      isApproved = false;
    } else if (dto.action === ModerationAction.HIDE) {
      newStatus = ReviewStatus.HIDDEN;
      isApproved = false;
    } else if (dto.action === ModerationAction.FLAG) {
      newStatus = ReviewStatus.FLAGGED;
      isApproved = false;
    }

    const updated = await this.prisma.collegeReview.update({
      where: { id: reviewId },
      data: {
        status: newStatus,
        isApproved,
        moderatedById: actor.id,
        moderatedAt: new Date(),
        moderationReason: dto.reason || null,
      },
    });

    await this.auditService.logAction({
      action: 'COLLEGE_REVIEW_MODERATED',
      entity: 'CollegeReview',
      entityId: reviewId,
      description: `College Review moderation: ${dto.action} by ${actor.fullName || actor.email}`,
      userId: actor.id,
      metadata: { action: dto.action, reason: dto.reason, collegeId: review.collegeId },
    });

    return {
      success: true,
      message: `Review has been marked as ${newStatus}`,
      data: updated,
    };
  }

  /**
   * 7. MODERATE COUNSELOR REVIEW (Conflict of Interest Guard)
   */
  async moderateCounselorReview(actor: IUser, reviewId: string, dto: ModerateReviewDto) {
    const review = await this.prisma.counselorReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundException(`Counselor review ${reviewId} not found`);

    // Strict conflict of interest check: Counselors cannot moderate their own reviews!
    if (actor.id === review.counselorId) {
      throw new ForbiddenException('Conflict of Interest: Counselors cannot moderate reviews about themselves.');
    }

    let newStatus = ReviewStatus.PUBLISHED;
    if (dto.action === ModerationAction.REJECT) newStatus = ReviewStatus.REJECTED;
    if (dto.action === ModerationAction.HIDE) newStatus = ReviewStatus.HIDDEN;
    if (dto.action === ModerationAction.FLAG) newStatus = ReviewStatus.FLAGGED;

    const updated = await this.prisma.counselorReview.update({
      where: { id: reviewId },
      data: {
        status: newStatus,
        moderatedById: actor.id,
        moderatedAt: new Date(),
        moderationReason: dto.reason || null,
      },
    });

    await this.auditService.logAction({
      action: 'COUNSELOR_REVIEW_MODERATED',
      entity: 'CounselorReview',
      entityId: reviewId,
      description: `Counselor review moderated to ${newStatus} by ${actor.fullName || actor.email}`,
      userId: actor.id,
    });

    return {
      success: true,
      message: `Counselor review updated to ${newStatus}`,
      data: updated,
    };
  }

  /**
   * 8. GET PUBLIC COLLEGE REVIEWS (PII Sanitized)
   */
  async getCollegeReviewsPublic(collegeId: string, query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const skip = (page - 1) * limit;

    const [reviews, total, aggregate] = await Promise.all([
      this.prisma.collegeReview.findMany({
        where: {
          collegeId,
          status: ReviewStatus.PUBLISHED,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true } },
          application: {
            select: {
              course: { select: { name: true } },
              branch: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.collegeReview.count({
        where: { collegeId, status: ReviewStatus.PUBLISHED },
      }),
      this.prisma.collegeReview.aggregate({
        where: { collegeId, status: ReviewStatus.PUBLISHED },
        _avg: { rating: true },
        _count: { isVerifiedStudent: true },
      }),
    ]);

    // Sanitize PII for public display
    const sanitizedReviews = reviews.map((r) => {
      const courseName = r.application?.course?.name || '';
      const branchName = r.application?.branch?.name ? ` - ${r.application.branch.name}` : '';
      const contextLabel = courseName ? `${courseName}${branchName}` : 'Student';

      return {
        id: r.id,
        rating: r.rating,
        title: r.title,
        content: r.content,
        isVerifiedStudent: r.isVerifiedStudent,
        authorDisplay: r.isVerifiedStudent
          ? `Verified Student (${contextLabel})`
          : (r.user?.fullName?.split(' ')[0] || 'Student'),
        createdAt: r.createdAt,
      };
    });

    return {
      success: true,
      data: {
        reviews: sanitizedReviews,
        summary: {
          averageRating: Math.round((aggregate._avg.rating || 0) * 10) / 10,
          totalReviews: total,
          verifiedReviewsCount: aggregate._count.isVerifiedStudent,
        },
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
