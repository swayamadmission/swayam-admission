import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataScopeService } from '../auth/data-scope.service';
import { SubmitCounselorReviewDto } from './dto/counselor-review.dto';
import { SubmitCollegeReviewDto } from './dto/college-review.dto';
import {
  ADMISSION_WORKFLOW_SEQUENCE,
  STUDENT_LEVEL_SEQUENCE,
  APPLICATION_LEVEL_SEQUENCE,
  CHECKPOINT_PRIORITY,
} from './journey-workflow.config';

export {
  CHECKPOINT_PRIORITY,
  ADMISSION_WORKFLOW_SEQUENCE,
  STUDENT_LEVEL_SEQUENCE,
  APPLICATION_LEVEL_SEQUENCE,
};

function formatDateOrPending(dateObj?: Date | string | null): string {
  if (!dateObj || dateObj === 'Not available') return 'Pending';
  try {
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return 'Pending';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Pending';
  }
}

import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class JourneyService {
  constructor(
    private prisma: PrismaService,
    private dataScopeService: DataScopeService,
    private documentsService: DocumentsService,
  ) {}

  /**
   * Verify Actor Access to Target Student ID (IDOR & IAM Data Scope Protection)
   */
  async verifyActorStudentAccess(actorUserId: string, targetStudentId: string) {
    if (actorUserId === targetStudentId) return; // Student viewing own account
    const ctx = await this.dataScopeService.resolveDataScope(actorUserId);
    const filter = this.dataScopeService.buildStudentScopeFilter(ctx);

    const allowed = await this.prisma.user.findFirst({
      where: {
        AND: [{ id: targetStudentId }, filter],
      },
    });

    if (!allowed) {
      throw new ForbiddenException(
        'Access denied: Student is outside your authorized scope',
      );
    }
  }

  /**
   * Verify Actor Access to Target Application ID (IDOR & IAM Data Scope Protection)
   */
  async verifyActorApplicationAccess(
    actorUserId: string,
    targetApplicationId: string,
  ) {
    const app = await this.prisma.application.findUnique({
      where: { id: targetApplicationId },
      select: { id: true, userId: true },
    });
    if (!app) throw new NotFoundException('Application not found');

    if (actorUserId === app.userId) return app; // Student viewing own application

    const ctx = await this.dataScopeService.resolveDataScope(actorUserId);
    const filter = this.dataScopeService.buildApplicationScopeFilter(ctx);

    const allowed = await this.prisma.application.findFirst({
      where: {
        AND: [{ id: targetApplicationId }, filter],
      },
    });

    if (!allowed) {
      throw new ForbiddenException(
        'Access denied: Application is outside your authorized scope',
      );
    }
    return app;
  }

  /**
   * 1. Get Overall Student-Level Journey (Global Student Milestones)
   */
  async getStudentOverallJourney(studentUserId: string, actorUserId?: string) {
    if (actorUserId) {
      await this.verifyActorStudentAccess(actorUserId, studentUserId);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      include: {
        studentPreference: true,
        assignedCounselor: {
          include: {
            counselorProfile: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Student user not found');

    const [documents, shortlists, aiRecs, formalShortlists, dynamicChecklist] = await Promise.all([
      this.prisma.document
        .findMany({
          where: { userId: studentUserId },
          orderBy: { uploadedAt: 'desc' },
        })
        .catch((): any[] => []),
      this.prisma.savedItem
        .findMany({
          where: { userId: studentUserId },
        })
        .catch(() => []),
      this.prisma.aIRecommendation
        .findMany({
          where: { userId: studentUserId },
          include: {
            college: { select: { id: true, name: true } },
          },
        })
        .catch(() => []),
      this.prisma.collegeShortlist
        .findMany({
          where: { studentId: studentUserId, status: 'SHORTLISTED' },
          include: {
            college: { select: { id: true, name: true } },
            course: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
          },
        })
        .catch(() => []),
      this.documentsService.getDynamicChecklist(studentUserId).catch(() => null),
    ]);

    const hasProfile = !!user.studentPreference;
    const hasCounselor = !!user.assignedCounselorId;
    const hasDocs = dynamicChecklist?.data?.summary?.isComplete ?? (documents.length > 0);
    const hasAnyDocs = (dynamicChecklist?.data?.summary?.uploadedCount ?? documents.length) > 0;
    const hasVerifiedDocs = dynamicChecklist?.data?.summary?.isVerified ?? (documents.length > 0 && documents.every((d) => d.status === 'VERIFIED'));
    const verifiedDoc = documents.find((d) => d.status === 'VERIFIED');
    const hasShortlist = shortlists.length > 0 || aiRecs.length > 0 || formalShortlists.length > 0;

    const steps = STUDENT_LEVEL_SEQUENCE.map((cfg) => {
      let completed = false;
      let status = 'PENDING';
      let date = 'Pending';
      let description = cfg.descriptionPending;

      switch (cfg.id) {
        case 'ACCOUNT_CREATED':
          completed = true;
          status = 'COMPLETED';
          date = formatDateOrPending(user.createdAt);
          description = cfg.descriptionCompleted;
          break;

        case 'PROFILE_COMPLETED':
          completed = hasProfile;
          status = hasProfile ? 'COMPLETED' : 'PENDING';
          date = hasProfile
            ? formatDateOrPending(user.studentPreference?.updatedAt)
            : 'Pending';
          description = hasProfile
            ? cfg.descriptionCompleted
            : cfg.descriptionPending;
          break;

        case 'COUNSELOR_ASSIGNED':
          completed = hasCounselor;
          status = hasCounselor ? 'COMPLETED' : 'PENDING';
          date = hasCounselor ? formatDateOrPending(user.updatedAt) : 'Pending';
          description = hasCounselor
            ? `Assigned to ${user.assignedCounselor?.fullName || 'Senior Counselor'}.`
            : cfg.descriptionPending;
          break;

        case 'DOCUMENT_UPLOADED':
          completed = hasDocs;
          status = hasDocs ? 'COMPLETED' : hasAnyDocs ? 'IN_PROGRESS' : 'PENDING';
          date = hasAnyDocs
            ? formatDateOrPending(documents[0]?.uploadedAt)
            : 'Pending';
          description = hasDocs
            ? 'All required documents uploaded.'
            : hasAnyDocs
              ? `${dynamicChecklist?.data?.summary?.uploadedCount || documents.length} of ${dynamicChecklist?.data?.summary?.totalRequired || 'required'} uploaded.`
              : cfg.descriptionPending;
          break;

        case 'DOCUMENT_VERIFIED':
          completed = hasVerifiedDocs;
          status = hasVerifiedDocs
            ? 'COMPLETED'
            : hasAnyDocs
              ? 'IN_PROGRESS'
              : 'PENDING';
          date = hasVerifiedDocs
            ? formatDateOrPending(
                verifiedDoc?.updatedAt || verifiedDoc?.uploadedAt,
              )
            : 'Pending';
          description = hasVerifiedDocs
            ? 'All required documents verified by admission compliance.'
            : hasAnyDocs
              ? 'Verification under review.'
              : cfg.descriptionPending;
          break;

        case 'COLLEGE_SHORTLISTED':
          completed = hasShortlist;
          status = hasShortlist ? 'COMPLETED' : 'PENDING';
          date = hasShortlist
            ? formatDateOrPending(
                shortlists[0]?.createdAt || aiRecs[0]?.createdAt,
              )
            : 'Pending';
          description = hasShortlist
            ? `${shortlists.length + aiRecs.length} college(s) shortlisted.`
            : cfg.descriptionPending;
          break;

        default:
          break;
      }

      return {
        id: cfg.id,
        priority: cfg.priority,
        title: cfg.title,
        label: cfg.label,
        level: cfg.level,
        status,
        completed,
        date,
        description,
      };
    });

    const completedCount = steps.filter((s) => s.completed).length;
    const progress = Math.round((completedCount / steps.length) * 100);

    const shortlistedColleges = shortlists.map((s) => ({
      id: s.id,
      collegeId: s.collegeId,
      collegeName: s.college?.name || 'College',
      courseName: s.course?.name || 'General',
      branchCode: s.branch?.code || s.branch?.name || '',
      shortlistedAt: formatDateOrPending(s.createdAt),
    }));

    return {
      studentUserId,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        createdAt: formatDateOrPending(user.createdAt),
        assignedCounselor: user.assignedCounselor
          ? {
              id: user.assignedCounselor.id,
              fullName: user.assignedCounselor.fullName,
              email: user.assignedCounselor.email,
            }
          : null,
      },
      checkpoints: steps,
      progress,
      shortlistedColleges,
      documentsCount: documents.length,
      verifiedDocumentsCount: documents.filter((d) => d.status === 'VERIFIED').length,
    };
  }

  /**
   * 2. Get Independent Application-Level Journey for a Specific Application
   */
  async getApplicationJourney(applicationId: string, actorUserId?: string) {
    if (actorUserId) {
      await this.verifyActorApplicationAccess(actorUserId, applicationId);
    }

    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        college: { select: { id: true, name: true, city: true, state: true, logo: true } },
        course: { select: { id: true, name: true, totalFees: true } },
        branch: { select: { id: true, name: true, code: true, slug: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!app) throw new NotFoundException('Application not found');

    const collegeReview = app.collegeId
      ? await this.prisma.collegeReview
          .findFirst({
            where: { userId: app.userId, collegeId: app.collegeId },
          })
          .catch(() => null)
      : null;

    // Fetch optional counselor review for this application or user
    const counselorReview = await (this.prisma as any).counselorReview
      ? (this.prisma as any).counselorReview.findFirst({
          where: {
            studentId: app.userId,
            OR: [{ applicationId: app.id }, { applicationId: null }],
          },
          orderBy: { createdAt: 'desc' },
        }).catch(() => null)
      : null;

    // Evaluate Application-Specific Checkpoints
    const isSubmitted =
      app.status === 'SUBMITTED' ||
      app.status === 'UNDER_REVIEW' ||
      app.status === 'APPROVED' ||
      app.status === 'COLLEGE_APPROVED' ||
      app.status === 'ADMISSION_CONFIRMED' ||
      app.status === 'ADMISSION_COMPLETED' ||
      app.status === 'STUDENT_ENROLLED';
    const isUnderReview =
      app.status === 'UNDER_REVIEW' ||
      app.status === 'DOCUMENTS_VERIFIED' ||
      app.status === 'APPROVED' ||
      app.status === 'COLLEGE_APPROVED' ||
      app.status === 'ADMISSION_CONFIRMED' ||
      app.status === 'ADMISSION_COMPLETED' ||
      app.status === 'STUDENT_ENROLLED';

    const isAdmissionApproved =
      app.status === 'APPROVED' ||
      app.status === 'COLLEGE_APPROVED' ||
      app.status === 'ADMISSION_CONFIRMED' ||
      app.status === 'ADMISSION_COMPLETED' ||
      app.status === 'STUDENT_ENROLLED';

    const successfulPayment = app.payments.find(
      (p) => p.status === 'COMPLETED' || p.status === 'SUCCESS',
    );
    const isFeePaid =
      app.paymentStatus === 'SUCCESS' ||
      app.paymentStatus === 'COMPLETED' ||
      !!successfulPayment;

    const isAdmissionConfirmed =
      app.status === 'ADMISSION_CONFIRMED' ||
      app.status === 'ADMISSION_COMPLETED' ||
      app.status === 'STUDENT_ENROLLED' ||
      (app as any).isSeatLocked === true;

    const hasCounselorReview = !!counselorReview;

    const isReportingCompleted =
      app.status === 'ADMISSION_COMPLETED' ||
      app.status === 'STUDENT_ENROLLED' ||
      (app as any).reportingStatus === 'COMPLETED' ||
      (app as any).isReportingCompleted === true;

    const hasCollegeReview = !!collegeReview;

    // Optional reviews DO NOT block completion
    const isJourneyCompleted =
      isAdmissionConfirmed && isFeePaid && isReportingCompleted;

    const steps = APPLICATION_LEVEL_SEQUENCE.map((cfg) => {
      let completed = false;
      let status = 'PENDING';
      let date = 'Pending';
      let description = cfg.descriptionPending;

      switch (cfg.id) {
        case 'APPLICATION_SUBMITTED':
          completed = isSubmitted;
          status = isSubmitted ? 'COMPLETED' : 'PENDING';
          date = isSubmitted ? formatDateOrPending(app.createdAt) : 'Pending';
          description = isSubmitted
            ? `Application submitted for ${app.college?.name || 'College'}.`
            : cfg.descriptionPending;
          break;

        case 'APPLICATION_REVIEW':
          completed = isUnderReview;
          status = isUnderReview
            ? 'COMPLETED'
            : isSubmitted
              ? 'IN_PROGRESS'
              : 'PENDING';
          date = isUnderReview ? formatDateOrPending(app.updatedAt) : 'Pending';
          description = isUnderReview
            ? cfg.descriptionCompleted
            : cfg.descriptionPending;
          break;

        case 'ADMISSION_APPROVED':
          completed = isAdmissionApproved;
          status = isAdmissionApproved ? 'COMPLETED' : 'PENDING';
          date = isAdmissionApproved
            ? formatDateOrPending((app as any).approvedDate || app.updatedAt)
            : 'Pending';
          description = isAdmissionApproved
            ? cfg.descriptionCompleted
            : cfg.descriptionPending;
          break;

        case 'FEE_PAID':
          completed = isFeePaid;
          status = isFeePaid ? 'COMPLETED' : 'PENDING';
          date = isFeePaid
            ? formatDateOrPending(successfulPayment?.createdAt || app.updatedAt)
            : 'Pending';
          description = isFeePaid
            ? `Application fee ₹${successfulPayment?.amount?.toLocaleString() || app.course?.totalFees?.toLocaleString() || '0'} verified.`
            : cfg.descriptionPending;
          break;

        case 'ADMISSION_CONFIRMED':
          completed = isAdmissionConfirmed;
          status = isAdmissionConfirmed ? 'COMPLETED' : 'PENDING';
          date = isAdmissionConfirmed
            ? formatDateOrPending(app.updatedAt)
            : 'Pending';
          description = isAdmissionConfirmed
            ? cfg.descriptionCompleted
            : cfg.descriptionPending;
          break;

        case 'COUNSELOR_REVIEW':
          completed = hasCounselorReview;
          status = hasCounselorReview ? 'COMPLETED' : 'PENDING';
          date = hasCounselorReview
            ? formatDateOrPending(counselorReview?.createdAt)
            : 'Pending (Optional)';
          description = hasCounselorReview
            ? cfg.descriptionCompleted
            : cfg.descriptionPending;
          break;

        case 'REPORTING_COMPLETED':
          completed = isReportingCompleted;
          status = isReportingCompleted ? 'COMPLETED' : 'PENDING';
          date = isReportingCompleted
            ? formatDateOrPending(app.updatedAt)
            : 'Pending';
          description = isReportingCompleted
            ? cfg.descriptionCompleted
            : cfg.descriptionPending;
          break;

        case 'COLLEGE_REVIEW':
          completed = hasCollegeReview;
          status = hasCollegeReview ? 'COMPLETED' : 'PENDING';
          date = hasCollegeReview
            ? formatDateOrPending(collegeReview?.createdAt)
            : 'Pending (Optional)';
          description = hasCollegeReview
            ? cfg.descriptionCompleted
            : cfg.descriptionPending;
          break;

        case 'JOURNEY_COMPLETED':
          completed = isJourneyCompleted;
          status = isJourneyCompleted ? 'COMPLETED' : 'PENDING';
          date = isJourneyCompleted
            ? formatDateOrPending(app.updatedAt)
            : 'Pending';
          description = isJourneyCompleted
            ? cfg.descriptionCompleted
            : cfg.descriptionPending;
          break;

        default:
          break;
      }

      return {
        id: cfg.id,
        priority: cfg.priority,
        title: cfg.title,
        label: cfg.label,
        level: cfg.level,
        isOptional: !!cfg.isOptional,
        status,
        completed,
        date,
        description,
      };
    });

    const requiredSteps = steps.filter((s) => !s.isOptional);
    const completedRequiredCount = requiredSteps.filter((s) => s.completed).length;
    const progress = Math.round(
      (completedRequiredCount / requiredSteps.length) * 100,
    );

    // Application-scoped timeline events
    const timeline = [
      {
        id: `evt-sub-${app.id}`,
        applicationId: app.id,
        title: 'Application Submitted',
        description: `Applied for ${app.course?.name || 'Course'} (${app.branch?.code || ''}) at ${app.college?.name || 'College'}.`,
        timestamp: formatDateOrPending(app.createdAt),
        status: 'COMPLETED',
        type: 'APPLICATION',
        source: 'STUDENT',
      },
    ];

    if (isAdmissionApproved) {
      timeline.push({
        id: `evt-appr-${app.id}`,
        applicationId: app.id,
        title: 'Admission Approved',
        description: `Admission request approved by ${app.college?.name}.`,
        timestamp: formatDateOrPending((app as any).approvedDate || app.updatedAt),
        status: 'COMPLETED',
        type: 'ADMISSION',
        source: 'COLLEGE',
      });
    }

    if (isFeePaid) {
      timeline.push({
        id: `evt-fee-${app.id}`,
        applicationId: app.id,
        title: 'Fee Payment Completed',
        description: `Seat booking payment of ₹${successfulPayment?.amount?.toLocaleString() || '0'} confirmed.`,
        timestamp: formatDateOrPending(successfulPayment?.createdAt || app.updatedAt),
        status: 'COMPLETED',
        type: 'PAYMENT',
        source: 'SYSTEM',
      });
    }

    if (isAdmissionConfirmed) {
      timeline.push({
        id: `evt-conf-${app.id}`,
        applicationId: app.id,
        title: 'Admission Confirmed',
        description: `Seat confirmed and enrollment locked.`,
        timestamp: formatDateOrPending(app.updatedAt),
        status: 'COMPLETED',
        type: 'ADMISSION',
        source: 'SYSTEM',
      });
    }

    if (isReportingCompleted) {
      timeline.push({
        id: `evt-rep-${app.id}`,
        applicationId: app.id,
        title: 'Campus Reporting Completed',
        description: `Physical/online document reporting completed at campus.`,
        timestamp: formatDateOrPending(app.updatedAt),
        status: 'COMPLETED',
        type: 'REPORTING',
        source: 'COLLEGE',
      });
    }

    return {
      applicationId: app.id,
      studentUserId: app.userId,
      applicationNumber: (app as any).applicationNumber || app.id.substring(0, 8),
      college: {
        id: app.college?.id,
        name: app.college?.name || 'N/A',
        city: app.college?.city || '',
        state: app.college?.state || '',
        logo: app.college?.logo || null,
      },
      course: {
        id: app.course?.id,
        name: app.course?.name || 'N/A',
        totalFees: app.course?.totalFees || 0,
      },
      branch: {
        id: app.branch?.id,
        name: app.branch?.name || 'N/A',
        code: app.branch?.code || 'N/A',
      },
      status: app.status,
      paymentStatus: app.paymentStatus,
      checkpoints: steps,
      progress,
      isCompleted: isJourneyCompleted,
      createdAt: formatDateOrPending(app.createdAt),
      updatedAt: formatDateOrPending(app.updatedAt),
      timeline,
    };
  }

  /**
   * 3. Get All Application Journeys for a Student
   */
  async getStudentApplicationJourneys(
    studentUserId: string,
    actorUserId?: string,
  ) {
    if (actorUserId) {
      await this.verifyActorStudentAccess(actorUserId, studentUserId);
    }

    const applications = await this.prisma.application.findMany({
      where: { userId: studentUserId },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      applications.map((app) => this.getApplicationJourney(app.id, actorUserId)),
    );
  }

  /**
   * 4. Unified Journey Payload (Overall Journey + Applications List & Journeys)
   */
  async getUnifiedStudentJourneyPayload(
    studentUserId: string,
    actorUserId?: string,
  ) {
    const [overallJourney, applications] = await Promise.all([
      this.getStudentOverallJourney(studentUserId, actorUserId),
      this.getStudentApplicationJourneys(studentUserId, actorUserId),
    ]);

    return {
      overallJourney,
      applicationsCount: applications.length,
      applications,
    };
  }

  /**
   * Backward Compatibility: Logged-in Student Full Journey Payload
   */
  async getStudentJourney(userId: string) {
    const unified = await this.getUnifiedStudentJourneyPayload(userId, userId);
    
    // Also build backward-compatible single timeline for legacy client screens
    const [documents, payments] = await Promise.all([
      this.prisma.document.findMany({ where: { userId }, orderBy: { uploadedAt: 'desc' } }).catch(() => []),
      this.prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }).catch(() => []),
    ]);

    const legacyTimeline = [
      {
        id: 't-account',
        title: 'Account Created',
        description: 'Account registered and welcome onboarding completed.',
        timestamp: unified.overallJourney.user.createdAt,
        status: 'COMPLETED',
        type: 'ACCOUNT',
        source: 'STUDENT',
      },
      ...documents.map((d) => ({
        id: `t-doc-${d.id}`,
        title: `Document: ${d.type.replace(/_/g, ' ')}`,
        description: `File ${d.name || ''} status: ${d.status}.`,
        timestamp: formatDateOrPending(d.uploadedAt),
        status: d.status === 'VERIFIED' ? 'COMPLETED' : 'PENDING',
        type: 'DOCUMENT',
        source: 'STUDENT',
      })),
      ...unified.applications.flatMap((a) => a.timeline),
    ];

    // Combine overall checkpoints + active application checkpoints for single-list views
    const primaryAppJourney = unified.applications[0]?.checkpoints || [];
    const combinedCheckpoints = [
      ...unified.overallJourney.checkpoints,
      ...primaryAppJourney,
    ];

    const currentCheckpoint = combinedCheckpoints.find((c: any) => c.status === 'IN_PROGRESS') || combinedCheckpoints[0];
    const completedCount = combinedCheckpoints.filter((c: any) => c.completed || c.status === 'COMPLETED').length;
    const progressObj = {
      progressPercentage: typeof unified.overallJourney.progress === 'number' ? unified.overallJourney.progress : 0,
      currentStage: currentCheckpoint?.label || 'Profile Setup',
      completedSteps: completedCount,
      totalSteps: combinedCheckpoints.length,
      steps: combinedCheckpoints,
    };

    return {
      overallJourney: unified.overallJourney,
      applications: unified.applications,
      user: unified.overallJourney.user,
      progress: progressObj,
      checklist: combinedCheckpoints,
      timeline: legacyTimeline,
      upcomingTasks: combinedCheckpoints.filter((c) => c.status !== 'COMPLETED'),
      documents,
      payments,
      assignedCounselor: unified.overallJourney.user.assignedCounselor,
      shortlists: unified.overallJourney.shortlistedColleges,
    };
  }

  /**
   * Submit Counselor Review (1-5 Star + Optional Written Review)
   */
  async submitCounselorReview(userId: string, dto: SubmitCounselorReviewDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignedCounselor: true,
        applications: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) throw new NotFoundException('Student user not found.');

    const targetCounselorId =
      dto.counselorId || user.assignedCounselorId;

    if (!targetCounselorId) {
      throw new BadRequestException(
        'No assigned counselor found to submit review for.',
      );
    }

    const existing = await (this.prisma as any).counselorReview?.findFirst({
      where: {
        studentId: userId,
        counselorId: targetCounselorId,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'You have already submitted a review for this counselor.',
      );
    }

    const review = await (this.prisma as any).counselorReview.create({
      data: {
        studentId: userId,
        counselorId: targetCounselorId,
        applicationId: user.applications[0]?.id || null,
        rating: Math.min(5, Math.max(1, Math.round(dto.rating))),
        comment: dto.comment?.trim() || null,
      },
    });

    return {
      success: true,
      message: 'Thank you! Your counselor review has been submitted.',
      review,
    };
  }

  /**
   * Submit College Review (1-5 Star + Optional Written Review)
   */
  async submitCollegeReview(userId: string, dto: SubmitCollegeReviewDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        applications: {
          where: {
            status: { in: ['ADMISSION_COMPLETED', 'STUDENT_ENROLLED'] },
          },
          include: { college: true },
        },
      },
    });

    if (!user) throw new NotFoundException('Student user not found.');

    const admittedApp = user.applications[0];
    if (!admittedApp) {
      throw new ForbiddenException(
        'College review becomes available after campus reporting is completed.',
      );
    }

    const targetCollegeId = admittedApp.collegeId;

    if (dto.collegeId && dto.collegeId !== targetCollegeId) {
      throw new ForbiddenException(
        'You can only review the college where your admission reporting is completed.',
      );
    }

    const existing = await (this.prisma as any).collegeReview?.findFirst({
      where: {
        userId,
        collegeId: targetCollegeId,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'You have already submitted a review for this college.',
      );
    }

    const review = await (this.prisma as any).collegeReview.create({
      data: {
        userId,
        collegeId: targetCollegeId,
        applicationId: admittedApp.id,
        rating: Math.min(5, Math.max(1, Math.round(dto.rating))),
        title: dto.title?.trim() || null,
        content: dto.comment?.trim() || dto.content?.trim() || null,
        isApproved: true,
      },
    });

    return {
      success: true,
      message: 'Thank you! Your college review has been submitted.',
      review,
    };
  }

  /**
   * Get Student Reviews
   */
  async getStudentReviews(userId: string) {
    const [counselorReview, collegeReview] = await Promise.all([
      ((this.prisma as any).counselorReview
        ? (this.prisma as any).counselorReview.findFirst({
            where: { studentId: userId },
            include: { counselor: { select: { id: true, fullName: true } } },
          })
        : Promise.resolve(null)
      ).catch(() => null),
      this.prisma.collegeReview
        .findFirst({
          where: { userId },
          include: { college: { select: { id: true, name: true } } },
        })
        .catch(() => null),
    ]);

    return {
      counselorReview: counselorReview || null,
      collegeReview: collegeReview || null,
    };
  }

  /**
   * Export Journey as CSV Format
   */
  async exportCsv(userId: string): Promise<string> {
    const journey = await this.getStudentJourney(userId);
    const headers = [
      'Event ID',
      'Title',
      'Description',
      'Timestamp',
      'Status',
      'Type',
      'Source',
    ];
    const rows = journey.timeline.map((t) => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.timestamp,
      t.status,
      t.type,
      t.source,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Submit Real Counselor Request from Student Portal
   */
  async requestCounselor(userId: string, context?: { applicationId?: string; remarks?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        studentPreference: true,
        assignedCounselor: { select: { id: true, fullName: true, email: true, mobile: true } },
        applications: { take: 1, orderBy: { applicationDate: 'desc' }, include: { course: true, college: true } },
      },
    });

    if (!user) throw new NotFoundException('Student user not found.');

    if (user.assignedCounselor) {
      throw new BadRequestException(`You already have an assigned counselor: ${user.assignedCounselor.fullName}`);
    }

    // Check if an open counselor assignment request already exists
    const existingTicket = await this.prisma.supportTicket.findFirst({
      where: { userId, category: 'COUNSELOR_REQUEST', status: 'OPEN' },
    });

    if (existingTicket) {
      throw new BadRequestException('A counselor assignment request is already pending review.');
    }

    const targetApp = context?.applicationId
      ? await this.prisma.application.findUnique({
          where: { id: context.applicationId },
          include: { course: true, college: true },
        })
      : user.applications[0];

    const courseName =
      targetApp?.course?.name ||
      user.studentPreference?.preferredCourses?.[0] ||
      'General';
    const collegeName =
      targetApp?.college?.name ||
      user.studentPreference?.preferredColleges?.[0] ||
      'Undecided';
    const stateDistrict =
      [user.state || user.profile?.state, user.profile?.district]
        .filter(Boolean)
        .join(', ') || 'India';
    const ticketId = `CRQ-${Date.now().toString().slice(-6)}`;

    // Create Support Ticket for operational queue tracking
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketId,
        userId,
        applicationId: targetApp?.id || null,
        subject: `Counselor Assignment Request - ${user.fullName}`,
        description: `Student ID: ${user.studentId || user.id}\nApplicant: ${user.fullName} (${user.mobile}, ${user.email})\nLocation: ${stateDistrict}\nAcademic Interest: ${courseName}\nTarget College: ${collegeName}\nRemarks: ${context?.remarks || 'Requested dedicated admission counselor via student portal.'}\nRequested At: ${new Date().toISOString()}`,
        category: 'COUNSELOR_REQUEST',
        priority: 'HIGH',
        status: 'OPEN',
      },
    });

    // Create or update Lead in the operational pipeline
    try {
      const existingLead = await this.prisma.lead.findFirst({
        where: { mobile: user.mobile, isDeleted: false },
      });

      if (existingLead) {
        await this.prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            status: 'NEW',
            priority: 'HOT',
            preferredCourse: courseName,
            preferredCollege: collegeName,
            remarks: `Counselor assignment requested on ${new Date().toLocaleDateString()}`,
          },
        });
      } else {
        await this.prisma.lead.create({
          data: {
            fullName: user.fullName,
            mobile: user.mobile,
            email: user.email,
            state: user.state || user.profile?.state || null,
            city: user.profile?.district || null,
            preferredCourse: courseName,
            preferredCollege: collegeName,
            source: 'WEBSITE',
            status: 'NEW',
            priority: 'HOT',
            remarks: 'Counselor assignment requested via student portal',
          },
        });
      }
    } catch (leadErr) {
      console.warn('Non-blocking lead creation notice:', leadErr);
    }

    return {
      success: true,
      message: 'Counselor request submitted successfully. An advisor will be assigned shortly.',
      ticketId: ticket.ticketId,
      status: 'PENDING_ASSIGNMENT',
      requestedAt: ticket.createdAt,
    };
  }

  /**
   * Get Current Counselor Request Status for Student
   */
  async getCounselorRequestStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignedCounselor: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
      },
    });

    if (!user) throw new NotFoundException('Student user not found.');

    if (user.assignedCounselor) {
      return {
        hasAssignedCounselor: true,
        isRequestPending: false,
        counselor: user.assignedCounselor,
      };
    }

    const pendingTicket = await this.prisma.supportTicket.findFirst({
      where: { userId, category: 'COUNSELOR_REQUEST', status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    });

    return {
      hasAssignedCounselor: false,
      isRequestPending: !!pendingTicket,
      counselor: null,
      pendingRequest: pendingTicket
        ? {
            ticketId: pendingTicket.ticketId,
            createdAt: pendingTicket.createdAt,
            status: 'PENDING_ASSIGNMENT',
          }
        : null,
    };
  }
}
