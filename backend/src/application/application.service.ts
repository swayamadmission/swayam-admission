import {
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataScopeService } from '../auth/data-scope.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationQueryDto } from './dto/application-query.dto';
import { createPaginatedResponse } from '../common/dto/paginated-response.dto';
import { ApplicationStatus, PaymentStatus, PaymentType, PaymentMethod } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  SaveApplicationDraftDto,
  SubmitApplicationDto,
  RequestCorrectionDto,
  WithdrawApplicationDto,
  SaveApplicationDeclarationsDto,
} from './dto/application-workflow.dto';
import {
  CANONICAL_DECLARATIONS,
  PersistedDeclarationItem,
  DeclarationValidationResult,
  normalizeDeclarations,
  validateCanonicalDeclarations,
} from './application-declarations.constants';
import {
  ClaimReviewDto,
  ApproveAdmissionDto,
  RejectAdmissionDto,
  ReopenDecisionDto,
  ReassignReviewerDto,
  ReviewQueueQueryDto,
} from './dto/admission-review.dto';
import { DocumentsService } from '../documents/documents.service';
import { IUser } from '../auth/interfaces/user.interface';
import { IdGeneratorService } from '../common/id-generator.service';
import { LiveSyncService } from '../events/live-sync.service';
import { GeographyService } from '../organization/geography.service';
import { CouponService } from '../coupons/coupon.service';

@Injectable()
export class ApplicationService {
  constructor(
    private prisma: PrismaService,
    private dataScopeService: DataScopeService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private documentsService: DocumentsService,
    private idGenerator: IdGeneratorService,
    private liveSync: LiveSyncService,
    private geographyService: GeographyService,
    @Inject(forwardRef(() => CouponService))
    private couponsService: CouponService,
  ) {}

  private async generateApplicationId(): Promise<string> {
    return this.idGenerator.generateApplicationId();
  }

  /**
   * Authoritative statutory declarations validator for an application.
   */
  validateDeclarations(app: any, formDataObj: any): DeclarationValidationResult {
    return validateCanonicalDeclarations(formDataObj, app?.declarationAccepted);
  }

  async createApplication(userId: string, dto: CreateApplicationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Resolve College ID (Optional - NEVER default to GKU or arbitrary college)
    let targetCollegeId: string | null = dto.collegeId || null;
    if (targetCollegeId) {
      const collegeExists = await this.prisma.college.findUnique({
        where: { id: targetCollegeId },
      });
      if (!collegeExists) targetCollegeId = null;
    }
    if (!targetCollegeId) {
      const searchName = dto.preferredCollege || dto.collegeName;
      if (searchName && searchName.trim().length > 0) {
        const foundCollege = await this.prisma.college.findFirst({
          where: {
            name: { contains: searchName.trim(), mode: 'insensitive' },
            status: { not: 'ARCHIVED' },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (foundCollege) targetCollegeId = foundCollege.id;
      }
    }

    // 2. Resolve Course ID
    let targetCourseId = dto.courseId;
    if (targetCourseId) {
      const courseExists = await this.prisma.course.findUnique({
        where: { id: targetCourseId },
      });
      if (!courseExists || courseExists.status === 'ARCHIVED') {
        targetCourseId = undefined;
      } else if (targetCollegeId && courseExists.collegeId && courseExists.collegeId !== targetCollegeId) {
        const matchInCollege = await this.prisma.course.findFirst({
          where: {
            collegeId: targetCollegeId,
            name: { equals: courseExists.name, mode: 'insensitive' },
            status: { not: 'ARCHIVED' },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (matchInCollege) {
          targetCourseId = matchInCollege.id;
        }
      }
    }
    if (!targetCourseId) {
      const searchName = dto.courseName || dto.courseId;
      if (searchName && searchName.trim().length > 0) {
        if (targetCollegeId) {
          const exactMatch = await this.prisma.course.findFirst({
            where: {
              collegeId: targetCollegeId,
              name: { equals: searchName.trim(), mode: 'insensitive' },
              status: { not: 'ARCHIVED' },
            },
            orderBy: { createdAt: 'desc' },
          });
          if (exactMatch) {
            targetCourseId = exactMatch.id;
          } else {
            const foundCourse = await this.prisma.course.findFirst({
              where: {
                collegeId: targetCollegeId,
                name: { contains: searchName.trim(), mode: 'insensitive' },
                status: { not: 'ARCHIVED' },
              },
              orderBy: { createdAt: 'desc' },
            });
            if (foundCourse) targetCourseId = foundCourse.id;
          }
        }
        if (!targetCourseId) {
          const generalMatch = await this.prisma.course.findFirst({
            where: {
              name: { contains: searchName.trim(), mode: 'insensitive' },
              status: { not: 'ARCHIVED' },
            },
            orderBy: { createdAt: 'desc' },
          });
          if (generalMatch) targetCourseId = generalMatch.id;
        }
      }
    }
    if (!targetCourseId) {
      const defaultCourse =
        (targetCollegeId
          ? await this.prisma.course.findFirst({
              where: { collegeId: targetCollegeId, status: { not: 'ARCHIVED' } },
              orderBy: { createdAt: 'desc' },
            })
          : null) ||
        (await this.prisma.course.findFirst({
          where: { status: { not: 'ARCHIVED' } },
          orderBy: { createdAt: 'desc' },
        }));
      if (defaultCourse) targetCourseId = defaultCourse.id;
    }

    if (!targetCourseId) {
      throw new BadRequestException('No valid course found for application.');
    }

    // Target college ID is explicitly OPTIONAL. If not chosen by student, it remains null.

    // 3. Resolve Counselor
    let assignedCounselorId = user.assignedCounselorId;
    if (!assignedCounselorId) {
      const activeCounselor = await this.prisma.user.findFirst({
        where: {
          role: { in: ['COUNSELOR', 'SENIOR_COUNSELOR'] },
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (activeCounselor) {
        assignedCounselorId = activeCounselor.id;
        await this.prisma.user.update({
          where: { id: userId },
          data: { assignedCounselorId: activeCounselor.id },
        });
      }
    }

    const applicationId = await this.generateApplicationId();

    // Resolve Branch if provided
    let targetBranchId: string | null = null;
    let targetBranchName: string | null = dto.branchName || null;
    if (dto.branchId) {
      const branch = await this.prisma.courseBranch.findUnique({
        where: { id: dto.branchId },
      });
      if (branch && branch.courseId === targetCourseId) {
        targetBranchId = branch.id;
        targetBranchName = branch.name;
      }
    }

    // Resolve Offering if available
    let targetOfferingId: string | null = dto.offeringId || null;
    if (!targetOfferingId && targetCollegeId && targetCourseId) {
      const offering = await this.prisma.collegeOffering.findFirst({
        where: {
          collegeId: targetCollegeId,
          courseId: targetCourseId,
          status: { not: 'ARCHIVED' },
        },
      });
      if (offering) targetOfferingId = offering.id;
    }

    // 4. Enforce 3 Free Applications Rule
    const validApplicationsCount = await this.prisma.application.count({
      where: {
        userId,
        status: {
          notIn: [ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN],
        },
      },
    });

    const isFreeAllowance = validApplicationsCount < 3;
    const initialPaymentStatus = isFreeAllowance
      ? PaymentStatus.COMPLETED
      : PaymentStatus.PENDING;
    const allowanceRemarks = isFreeAllowance
      ? `Free Application Allowance (Valid Application ${validApplicationsCount + 1} of 3)`
      : `Paid Application (Valid Application ${validApplicationsCount + 1} - Exceeds 3-application free quota)`;

    return this.prisma.$transaction(async (tx) => {
      // Build initial structured formData from apply-now DTO
      const initialFormData = {
        personalInfo: {
          fullName: dto.fullName || user.fullName || '',
          mobile: dto.mobile || user.mobile || '',
          email: dto.email || user.email || '',
          parentMobile: dto.parentMobile || '',
          parentEmail: dto.parentEmail || '',
          state: dto.state || '',
          district: dto.district || '',
          pincode: dto.pincode || '',
        },
        academicInfo: {
          educationLevel: dto.educationLevel || '',
          stream: dto.stream || '',
          passingYear: dto.passingYear || '',
          tenthBoard: '',
          tenthSchool: '',
          tenthMarks: '',
          tenthPassingYear: dto.educationLevel === '10th' ? dto.passingYear : '',
          twelfthBoard: '',
          twelfthCollege: '',
          twelfthStream: dto.educationLevel === '12th' ? dto.stream : '',
          twelfthMarks: '',
          twelfthPassingYear: dto.educationLevel === '12th' ? dto.passingYear : '',
          diplomaCollege: '',
          diplomaCourse: dto.educationLevel === 'Diploma' ? dto.stream : '',
          diplomaMarks: '',
          diplomaPercentage: '',
          diplomaPassingYear: dto.educationLevel === 'Diploma' ? dto.passingYear : '',
          graduationCollege: '',
          graduationCourse:
            dto.educationLevel === 'Undergraduate' || dto.educationLevel === 'Graduation'
              ? dto.stream
              : '',
          graduationMarks: '',
          graduationPassingYear:
            dto.educationLevel === 'Undergraduate' || dto.educationLevel === 'Graduation'
              ? dto.passingYear
              : '',
        },
        address: {
          state: dto.state || '',
          district: dto.district || '',
          pincode: dto.pincode || '',
        },
        communicationState: dto.state || '',
        communicationDistrict: dto.district || '',
        communicationPincode: dto.pincode || '',
        preferences: {
          preferredCollege: dto.preferredCollege || dto.collegeName || null,
          preferredCity: dto.preferredCity || null,
          offeringId: dto.offeringId || null,
          academicSessionId: dto.academicSessionId || null,
        },
      };

      const app = await tx.application.create({
        data: {
          applicationId,
          applicationNumber: applicationId, // Single canonical code
          userId,
          collegeId: targetCollegeId,
          courseId: targetCourseId,
          branchId: targetBranchId,
          branchName: targetBranchName,
          offeringId: targetOfferingId,
          counselorId: assignedCounselorId || null,
          status: ApplicationStatus.DRAFT,
          paymentStatus: initialPaymentStatus,
          admissionYear: dto.admissionYear || new Date().getFullYear(),
          formData: initialFormData,
          remarks: dto.remarks
            ? `${dto.remarks} | ${allowanceRemarks}`
            : allowanceRemarks,
        },
        include: {
          college: true,
          course: true,
          branch: true,
          counselor: {
            select: { id: true, fullName: true, email: true, mobile: true },
          },
          timeline: true,
        },
      });

      // Create Payment Ledger Entry
      await tx.payment.create({
        data: {
          applicationId: app.id,
          userId,
          collegeId: targetCollegeId,
          courseId: targetCourseId,
          counselorId: assignedCounselorId || null,
          paymentType: PaymentType.REGISTRATION_FEE,
          amount: isFreeAllowance ? 0 : 500,
          currency: 'INR',
          status: initialPaymentStatus,
          notes: allowanceRemarks,
          paidAt: isFreeAllowance ? new Date() : null,
          paidAmount: isFreeAllowance ? 0 : 0,
        },
      });

      // Initial Timeline Entry
      await tx.applicationTimeline.create({
        data: {
          applicationId: app.id,
          userId,
          action: 'CREATED',
          newStatus: app.status,
          remarks: allowanceRemarks,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'APPLICATION_SUBMITTED',
          entity: 'Application',
          entityId: app.id,
          newValue: JSON.stringify({
            applicationId,
            collegeId: targetCollegeId,
            courseId: targetCourseId,
          }),
        },
      });

      // Notifications
      await tx.notification.create({
        data: {
          userId,
          type: 'APPLICATION',
          title: 'Application Submitted Successfully! 🎉',
          message: `Your application (${applicationId}) for ${app.college?.name} - ${app.course?.name} has been submitted.`,
          isRead: false,
        },
      });

      if (assignedCounselorId) {
        await tx.notification.create({
          data: {
            userId: assignedCounselorId,
            receiverId: assignedCounselorId,
            type: 'APPLICATION',
            title: 'New Student Application Assigned',
            message: `Application (${applicationId}) from ${user.fullName} for ${app.college?.name} assigned to you.`,
            isRead: false,
          },
        });
      }

      return {
        success: true,
        message: 'Application submitted successfully',
        application: app,
        data: app,
      };
    });
  }

  async findAll(query: ApplicationQueryDto, currentUserId?: string) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      collegeId,
      courseId,
      counselorId,
      status,
      paymentStatus,
      admissionYear,
      search,
      startDate,
      endDate,
    } = query;

    const skip = (page - 1) * limit;

    let where: any = {};

    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      const scopeFilter =
        this.dataScopeService.buildApplicationScopeFilter(ctx);
      where = { AND: [where, scopeFilter] };
    }

    if (collegeId) where = { AND: [where, { collegeId }] };
    if (courseId) where = { AND: [where, { courseId }] };
    if (counselorId) where = { AND: [where, { counselorId }] };
    if (status) where = { AND: [where, { status }] };
    if (paymentStatus) where = { AND: [where, { paymentStatus }] };
    if (admissionYear) where = { AND: [where, { admissionYear }] };

    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where = { AND: [where, { createdAt: dateFilter }] };
    }

    if (search) {
      const searchCondition = {
        OR: [
          { applicationId: { contains: search, mode: 'insensitive' } },
          { applicationNumber: { contains: search, mode: 'insensitive' } },
          { user: { fullName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { mobile: { contains: search, mode: 'insensitive' } } },
          { user: { studentId: { contains: search, mode: 'insensitive' } } },
          { user: { registrationNumber: { contains: search, mode: 'insensitive' } } },
          { college: { name: { contains: search, mode: 'insensitive' } } },
          { course: { name: { contains: search, mode: 'insensitive' } } },
        ],
      };
      where = { AND: [where, searchCondition] };
    }

    const [total, data] = await Promise.all([
      this.prisma.application.count({ where }),
      this.prisma.application.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, email: true, mobile: true },
          },
          college: { select: { id: true, name: true } },
          course: { select: { id: true, name: true, category: true } },
          branch: { select: { id: true, name: true, code: true, slug: true } },
          counselor: { select: { id: true, fullName: true } },
          payments: {
            select: {
              id: true,
              amount: true,
              discountAmount: true,
              paidAmount: true,
              status: true,
              paymentType: true,
              paymentMethod: true,
              transactionId: true,
              receiptNumber: true,
              createdAt: true,
            },
          },
          receipts: {
            select: {
              id: true,
              receiptNumber: true,
              paidAmount: true,
              status: true,
              paymentMethod: true,
              transactionReference: true,
              issuedAt: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, currentUserId?: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        user: { include: { profile: true } },
        college: true,
        course: true,
        branch: { select: { id: true, name: true, code: true, slug: true } },
        counselor: { select: { id: true, fullName: true, email: true } },
        payments: true,
        receipts: true,
        timeline: {
          include: { user: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!app) throw new NotFoundException(`Application ${id} not found`);

    // If college relation wasn't loaded but collegeId exists, load it (NEVER infer from course)
    if (!app.college && app.collegeId) {
      const resolvedCol = await this.prisma.college.findUnique({
        where: { id: app.collegeId },
      });
      if (resolvedCol) {
        app.college = resolvedCol;
      }
    }

    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      this.dataScopeService.enforceApplicationScope(ctx, app);
    }

    return app;
  }

  async findMyApplications(userId: string) {
    let canonicalUserId = userId;
    const userDirect = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userDirect) {
      const profile = await this.prisma.studentProfile.findUnique({ where: { id: userId } });
      if (profile) {
        canonicalUserId = profile.userId;
      }
    }

    const userRecord = userDirect || (await this.prisma.user.findUnique({ where: { id: canonicalUserId } }));
    const userEmail = userRecord?.email?.trim();
    const userMobile = userRecord?.mobile?.trim();

    const orConditions: any[] = [
      { userId: canonicalUserId },
      { user: { id: canonicalUserId } },
    ];
    if (userEmail && userEmail.length > 0) {
      orConditions.push({ user: { email: userEmail } });
    }
    if (userMobile && userMobile.length > 0) {
      orConditions.push({ user: { mobile: userMobile } });
    }

    const apps = await this.prisma.application.findMany({
      where: { OR: orConditions },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            logo: true,
            city: true,
            state: true,
            banner: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            level: true,
            duration: true,
            totalFees: true,
            category: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            slug: true,
          },
        },
        counselor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
            avatar: true,
            counselorProfile: {
              select: { designation: true, department: true, experience: true },
            },
          },
        },
        documents: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            fileUrl: true,
            uploadedAt: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            discountAmount: true,
            paidAmount: true,
            status: true,
            paymentType: true,
            paymentMethod: true,
            transactionId: true,
            receiptNumber: true,
            createdAt: true,
          },
        },
        receipts: {
          select: {
            id: true,
            receiptNumber: true,
            paidAmount: true,
            status: true,
            paymentMethod: true,
            transactionReference: true,
            issuedAt: true,
          },
        },
        timeline: {
          select: {
            id: true,
            action: true,
            oldStatus: true,
            newStatus: true,
            remarks: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: apps || [],
      applications: apps || [],
      count: apps ? apps.length : 0,
    };
  }

  async update(id: string, adminId: string, dto: UpdateApplicationDto) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { user: { include: { profile: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');

    if (adminId) {
      const ctx = await this.dataScopeService.resolveDataScope(adminId);
      this.dataScopeService.enforceApplicationScope(ctx, app);
      this.dataScopeService.validateMutationScope(ctx, 'APPLICATION', dto);
    }

    const updateData: any = {};
    if (dto.collegeId) updateData.collegeId = dto.collegeId;
    if (dto.courseId) updateData.courseId = dto.courseId;
    if (dto.counselorId !== undefined) updateData.counselorId = dto.counselorId;
    if (dto.status) {
      updateData.status = dto.status;
      if (dto.status === ApplicationStatus.APPROVED && !app.approvedDate)
        updateData.approvedDate = new Date();
      if (dto.status === ApplicationStatus.REJECTED && !app.rejectedDate)
        updateData.rejectedDate = new Date();
    }
    if (dto.paymentStatus) updateData.paymentStatus = dto.paymentStatus;
    if (dto.admissionYear) updateData.admissionYear = dto.admissionYear;
    if (dto.remarks) updateData.remarks = dto.remarks;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: updateData,
        include: { college: true, course: true, counselor: true },
      });

      if (dto.status && dto.status !== app.status) {
        await tx.applicationTimeline.create({
          data: {
            applicationId: id,
            userId: adminId,
            action: 'STATUS_UPDATE',
            oldStatus: app.status,
            newStatus: dto.status,
            remarks: dto.remarks || 'Status updated via edit',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'UPDATE',
          entity: 'Application',
          entityId: id,
          oldValue: app as any,
          newValue: updated as any,
        },
      });

      return updated;
    });
  }

  async updateStatus(
    id: string,
    adminOrCounselorId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { user: { include: { profile: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');

    if (adminOrCounselorId) {
      const ctx =
        await this.dataScopeService.resolveDataScope(adminOrCounselorId);
      this.dataScopeService.enforceApplicationScope(ctx, app);
    }

    const updateData: any = { status: dto.status };
    if (dto.status === ApplicationStatus.APPROVED && !app.approvedDate)
      updateData.approvedDate = new Date();
    if (dto.status === ApplicationStatus.REJECTED && !app.rejectedDate)
      updateData.rejectedDate = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: updateData,
      });

      await tx.applicationTimeline.create({
        data: {
          applicationId: id,
          userId: adminOrCounselorId,
          action: 'STATUS_UPDATE',
          oldStatus: app.status,
          newStatus: dto.status,
          remarks: dto.remarks,
        },
      });

      return updated;
    });
  }

  async assignCounselor(id: string, counselorId: string, adminId: string) {
    const counselor = await this.prisma.user.findUnique({
      where: { id: counselorId },
    });
    if (
      !counselor ||
      (counselor.role !== 'COUNSELOR' &&
        counselor.role !== 'ADMIN' &&
        counselor.role !== 'SUPER_ADMIN')
    ) {
      throw new BadRequestException('Invalid counselor ID');
    }

    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { user: { include: { profile: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');

    if (adminId) {
      const ctx = await this.dataScopeService.resolveDataScope(adminId);
      this.dataScopeService.enforceApplicationScope(ctx, app);
      this.dataScopeService.validateMutationScope(ctx, 'APPLICATION', {
        counselorId,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: { counselorId },
      });

      await tx.applicationTimeline.create({
        data: {
          applicationId: id,
          userId: adminId,
          action: 'COUNSELOR_ASSIGNED',
          remarks: `Assigned to ${counselor.fullName}`,
        },
      });

      return updated;
    });
  }

  async assignCollege(id: string, collegeId: string, actorUserId: string) {
    const college = await this.prisma.college.findUnique({
      where: { id: collegeId },
    });
    if (!college || college.status === 'ARCHIVED') {
      throw new BadRequestException('Selected college is unavailable or archived');
    }

    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { user: { include: { profile: true } }, course: true },
    });
    if (!app) throw new NotFoundException('Application not found');

    if (actorUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(actorUserId);
      this.dataScopeService.enforceApplicationScope(ctx, app);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: { collegeId: college.id },
        include: { college: true, course: true, counselor: true },
      });

      await tx.applicationTimeline.create({
        data: {
          applicationId: id,
          userId: actorUserId,
          action: 'COLLEGE_ASSIGNED',
          oldStatus: app.status,
          newStatus: app.status,
          remarks: `College assigned to ${college.name} by counselor/admin`,
        },
      });

      return {
        success: true,
        message: `College assigned to ${college.name}`,
        data: updated,
      };
    });
  }

  async verifyDocuments(id: string, adminId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { user: { include: { profile: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');

    if (adminId) {
      const ctx = await this.dataScopeService.resolveDataScope(adminId);
      this.dataScopeService.enforceApplicationScope(ctx, app);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: {
          documentsVerified: true,
          status: ApplicationStatus.DOCUMENTS_VERIFIED,
        },
      });

      await tx.applicationTimeline.create({
        data: {
          applicationId: id,
          userId: adminId,
          action: 'DOCUMENTS_VERIFIED',
          oldStatus: app.status,
          newStatus: ApplicationStatus.DOCUMENTS_VERIFIED,
          remarks: 'Documents marked as verified',
        },
      });

      return updated;
    });
  }

  async getDashboardStats(currentUserId?: string) {
    let where: any = {};
    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      const scopeFilter =
        this.dataScopeService.buildApplicationScopeFilter(ctx);
      where = { AND: [where, scopeFilter] };
    }

    const [
      draft,
      submitted,
      underReview,
      documentsVerified,
      approved,
      rejected,
      admissionConfirmed,
    ] = await Promise.all([
      this.prisma.application.count({
        where: { AND: [where, { status: 'NEW' }] },
      }),
      this.prisma.application.count({
        where: {
          AND: [
            where,
            { status: { in: ['DOCUMENT_PENDING', 'DOCUMENTS_UPLOADED'] } },
          ],
        },
      }),
      this.prisma.application.count({
        where: {
          AND: [
            where,
            { status: { in: ['UNDER_REVIEW', 'COUNSELOR_ASSIGNED'] } },
          ],
        },
      }),
      this.prisma.application.count({
        where: { AND: [where, { status: 'DOCUMENTS_VERIFIED' }] },
      }),
      this.prisma.application.count({
        where: {
          AND: [where, { status: { in: ['APPROVED', 'COLLEGE_APPROVED'] } }],
        },
      }),
      this.prisma.application.count({
        where: { AND: [where, { status: { in: ['REJECTED', 'CANCELLED'] } }] },
      }),
      this.prisma.application.count({
        where: {
          AND: [
            where,
            {
              status: {
                in: [
                  'ADMISSION_CONFIRMED',
                  'ADMISSION_COMPLETED',
                  'STUDENT_ENROLLED',
                ],
              },
            },
          ],
        },
      }),
    ]);

    return {
      draft,
      submitted,
      underReview,
      documentsVerified,
      approved,
      rejected,
      admissionConfirmed,
      totalApplications:
        draft +
        submitted +
        underReview +
        documentsVerified +
        approved +
        rejected +
        admissionConfirmed,
    };
  }

  /**
   * Helper: Generate canonical user-facing application number (SWY-APP-2026-000001)
   */
  private async generatePublicApplicationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SWY-APP-${year}-`;

    const latest = await this.prisma.application.findFirst({
      where: { applicationId: { startsWith: prefix } },
      orderBy: { applicationId: 'desc' },
    });

    let seq = 1;
    if (latest && latest.applicationId) {
      const appNum: string = latest.applicationId;
      const parts = appNum.split('-');
      if (parts.length === 4) {
        const parsed = parseInt(parts[3], 10);
        if (!isNaN(parsed)) seq = parsed + 1;
      }
    }

    return `${prefix}${seq.toString().padStart(6, '0')}`;
  }

  /**
   * Authoritative conditional academic qualification validation
   */
  validateAcademicRequirements(
    educationLevel: string | undefined,
    academicData: any,
  ): { isValid: boolean; message?: string } {
    if (!academicData) {
      return { isValid: false, message: 'Academic details are required' };
    }

    const level = (educationLevel || academicData.educationLevel || '').trim().toLowerCase();

    // 10th Validation (Always mandatory for all levels)
    if (!academicData.tenthBoard || String(academicData.tenthBoard).trim() === '') {
      return { isValid: false, message: '10th Board is required' };
    }
    if (
      academicData.tenthMarks === undefined ||
      academicData.tenthMarks === null ||
      academicData.tenthMarks === '' ||
      isNaN(Number(academicData.tenthMarks)) ||
      Number(academicData.tenthMarks) < 0 ||
      Number(academicData.tenthMarks) > 100
    ) {
      return { isValid: false, message: 'Valid 10th percentage (0-100) is required' };
    }

    // 10th applicant: 12th & Diploma are NOT required
    if (level.includes('10') || level === 'tenth' || level === 'secondary') {
      return { isValid: true };
    }

    // Diploma applicant: Diploma required, 12th NOT required
    if (level.includes('diploma') || level === 'polytechnic') {
      const marks = academicData.diplomaMarks ?? academicData.diplomaPercentage;
      if (marks !== undefined && marks !== null && marks !== '') {
        if (isNaN(Number(marks)) || Number(marks) < 0 || Number(marks) > 100) {
          return { isValid: false, message: 'Valid Diploma percentage (0-100) is required' };
        }
      }
      return { isValid: true };
    }

    // 12th applicant: 12th details required
    if (
      level.includes('12') ||
      level === 'twelfth' ||
      level === 'higher secondary' ||
      level === 'senior secondary'
    ) {
      if (!academicData.twelfthBoard || String(academicData.twelfthBoard).trim() === '') {
        return { isValid: false, message: '12th Board is required' };
      }
      if (
        academicData.twelfthMarks === undefined ||
        academicData.twelfthMarks === null ||
        academicData.twelfthMarks === '' ||
        isNaN(Number(academicData.twelfthMarks)) ||
        Number(academicData.twelfthMarks) < 0 ||
        Number(academicData.twelfthMarks) > 100
      ) {
        return { isValid: false, message: 'Valid 12th percentage (0-100) is required' };
      }
      return { isValid: true };
    }

    // Default / Undergraduate / Postgraduate
    return { isValid: true };
  }

  /**
   * Get Application Workflow Progress & Document Requirements (Backend-Derived)
   */
  async getApplicationProgress(id: string, actorUser: IUser) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        college: true,
        course: { include: { branches: true } },
        branch: true,
        user: { include: { profile: true, studentPreference: true } },
        documents: true,
      },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    // IDOR Protection: Enforce data scope
    const ctx = await this.dataScopeService.resolveDataScope(actorUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    // Stale Draft Check: Validate Offering Availability with canonical active course auto-healing
    let course = app.course;
    if (course && course.status === 'ARCHIVED' && app.collegeId) {
      // Auto-heal: Check if an active/published course with the same name or prefix exists for this college
      let activeMatch = await this.prisma.course.findFirst({
        where: {
          collegeId: app.collegeId,
          name: { equals: course.name, mode: 'insensitive' },
          status: { not: 'ARCHIVED' },
        },
        include: { branches: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!activeMatch) {
        const baseCourseName = course.name.split(/[-–(]/)[0].trim();
        if (baseCourseName.length > 2) {
          activeMatch = await this.prisma.course.findFirst({
            where: {
              collegeId: app.collegeId,
              name: { startsWith: baseCourseName, mode: 'insensitive' },
              status: { not: 'ARCHIVED' },
            },
            include: { branches: true },
            orderBy: { createdAt: 'desc' },
          });
        }
      }

      if (!activeMatch) {
        activeMatch = await this.prisma.course.findFirst({
          where: {
            collegeId: app.collegeId,
            status: { not: 'ARCHIVED' },
          },
          include: { branches: true },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (activeMatch) {
        await this.prisma.application.update({
          where: { id },
          data: { courseId: activeMatch.id },
        });
        course = activeMatch;
      }
    }

    // Load college relation if collegeId is explicitly set on application
    if (!app.college && app.collegeId) {
      const resolvedCollege = await this.prisma.college.findUnique({
        where: { id: app.collegeId },
      });
      if (resolvedCollege) {
        app.college = resolvedCollege;
      }
    }

    const isCollegeActive = !app.college || app.college.status !== 'ARCHIVED';
    const isCourseActive = !!course && course.status !== 'ARCHIVED';
    const isBranchActive =
      !app.branchId || !app.branch || (app.branch.status !== 'DISABLED' && app.branch.status !== 'ARCHIVED');
    const isOfferingActive = !!(isCollegeActive && isCourseActive && isBranchActive);

    // Document Checklist: Query dynamic database/configuration-driven checklist
    const dynamicChecklist = await this.documentsService.getDynamicChecklist(app.userId, app.id);
    const missingDocs = dynamicChecklist.data.checklist.filter(
      (item) => item.isRequired && (item.status === 'NOT_UPLOADED' || item.status === 'REJECTED'),
    );
    const missingDocTypes = missingDocs.map((item) => item.type as string);
    const isDocsSatisfied = dynamicChecklist.data.summary.isComplete;

    // Required Form Sections Evaluation (5 STEPS)
    const formDataObj: any = app.formData || {};
    const academicInfo = formDataObj.academicInfo || {};
    const profile = (app.user as any)?.profile || {};

    const eduLevel = (
      academicInfo.educationLevel ||
      profile.highestEducation ||
      ''
    ).trim();

    const effectiveAcademicData = {
      educationLevel: eduLevel,
      tenthBoard: academicInfo.tenthBoard || profile.tenthBoard,
      tenthMarks: academicInfo.tenthMarks ?? profile.tenthMarks,
      tenthPassingYear: academicInfo.tenthPassingYear ?? profile.tenthPassingYear,
      tenthSchool: academicInfo.tenthSchool ?? profile.tenthSchool,
      twelfthBoard: academicInfo.twelfthBoard ?? profile.twelfthBoard,
      twelfthMarks: academicInfo.twelfthMarks ?? profile.twelfthMarks,
      twelfthPassingYear: academicInfo.twelfthPassingYear ?? profile.twelfthPassingYear,
      twelfthStream: academicInfo.twelfthStream ?? profile.twelfthStream,
      twelfthSchool: academicInfo.twelfthSchool ?? profile.twelfthSchool,
      diplomaCollege: academicInfo.diplomaCollege ?? profile.diplomaCollege,
      diplomaCourse: academicInfo.diplomaCourse ?? profile.diplomaCourse,
      diplomaMarks:
        academicInfo.diplomaMarks ??
        academicInfo.diplomaPercentage ??
        profile.diplomaPercentage,
      diplomaPassingYear:
        academicInfo.diplomaPassingYear ?? profile.diplomaPassingYear,
      graduationCollege:
        academicInfo.graduationCollege ?? profile.graduationCollege,
      graduationCourse:
        academicInfo.graduationCourse ?? profile.graduationCourse,
      graduationMarks:
        academicInfo.graduationMarks ??
        academicInfo.graduationPercentage ??
        profile.graduationPercentage,
    };

    const academicVal = this.validateAcademicRequirements(eduLevel, effectiveAcademicData);
    const hasAcademic = academicVal.isValid;

    const hasAddress = !!(
      (formDataObj.address?.state || formDataObj.communicationState || profile.state || (app.user as any)?.state) &&
      (formDataObj.address?.district || formDataObj.communicationDistrict || profile.district)
    );

    const hasAcademicAndAddress = hasAcademic && hasAddress;

    const hasPersonal = !!(
      (app.user.fullName || formDataObj.personalInfo?.fullName) &&
      (app.user.mobile || formDataObj.personalInfo?.mobile) &&
      (app.user.email || formDataObj.personalInfo?.email)
    );

    const hasOffering = !!app.courseId;
    const hasDocsAndFinance = isDocsSatisfied;

    const declarationValidation = this.validateDeclarations(app, formDataObj);
    const hasDeclaration = declarationValidation.isValid;

    // EXACT 5 WORKFLOW STEPS
    const sections = [
      { name: 'Personal Information', completed: hasPersonal },
      { name: 'Academic Information & Address', completed: hasAcademicAndAddress },
      { name: 'Program Summary', completed: hasOffering },
      { name: 'Documents & Finance', completed: hasDocsAndFinance },
      { name: 'Declaration & Final Review', completed: hasDeclaration },
    ];

    const completedSections = sections.filter((s) => s.completed).length;
    const progressPercentage = Math.round((completedSections / sections.length) * 100);

    const missingRequirements: string[] = [];
    if (!hasPersonal) missingRequirements.push('Personal details incomplete (Name, Mobile, or Email)');
    if (!hasAcademic) missingRequirements.push(academicVal.message || 'Academic details incomplete');
    if (!hasAddress) missingRequirements.push('Address details incomplete (State and District required)');
    if (missingDocTypes.length > 0) {
      missingRequirements.push(`Missing documents: ${missingDocTypes.join(', ')}`);
    }
    if (!hasDeclaration) {
      const declMsg = declarationValidation.missingLabels.length > 0
        ? `Required statutory declarations missing: ${declarationValidation.missingLabels.join(', ')}`
        : 'Declaration not accepted';
      missingRequirements.push(declMsg);
    }
    if (!isOfferingActive) missingRequirements.push('This program is no longer accepting applications.');

    const isReadyToSubmit =
      isOfferingActive &&
      missingRequirements.length === 0 &&
      progressPercentage === 100;

    const priorSubmittedCount = await this.prisma.application.count({
      where: {
        userId: app.userId,
        status: { in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.DOCUMENTS_VERIFIED, ApplicationStatus.APPROVED, ApplicationStatus.ADMISSION_CONFIRMED] },
        id: { not: app.id },
      },
    });
    const freeRemaining = Math.max(0, 3 - priorSubmittedCount);
    const isFreeSubmission = freeRemaining > 0;

    return {
      success: true,
      applicationId: app.id,
      applicationNumber: app.applicationNumber || app.applicationId,
      status: app.status,
      progressPercentage,
      completedSections,
      totalSections: sections.length,
      sections,
      isOfferingActive,
      isDocsSatisfied,
      missingDocTypes,
      missingRequirements,
      isReadyToSubmit,
      documentChecklist: dynamicChecklist.data,
      formData: app.formData,
      declarationAccepted: hasDeclaration,
      declarationAcceptedAt: app.declarationAcceptedAt,
      declarationStatus: {
        isValid: declarationValidation.isValid,
        missingDeclarations: declarationValidation.missingDeclarations,
        missingLabels: declarationValidation.missingLabels,
        acceptedDeclarations: declarationValidation.acceptedDeclarations,
        items: declarationValidation.items,
      },
      termsVersion: app.termsVersion || 'v2.0',
      studentDetails: {
        id: app.user.id,
        fullName: app.user.fullName,
        email: app.user.email,
        mobile: app.user.mobile,
        country: (app.user as any).country || 'India',
        studentId: (app.user as any).studentId,
        registrationNumber: (app.user as any).registrationNumber,
        profile: app.user.profile,
      },
      programDetails: {
        college: app.college,
        course: app.course,
        branch: app.branch,
        admissionYear: app.admissionYear || 2026,
      },
      quotaInfo: {
        totalAllowedFree: 3,
        priorSubmittedCount,
        freeRemaining,
        isFreeSubmission,
        applicationFeeAmount: 1500,
      },
    };
  }

  /**
   * Authoritative calculation of user's free application submissions quota (First 3 Free Rule).
   */
  async getApplicationQuota(userId: string) {
    const submittedCount = await this.prisma.application.count({
      where: {
        userId,
        status: { in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.DOCUMENTS_VERIFIED, ApplicationStatus.APPROVED, ApplicationStatus.ADMISSION_CONFIRMED] },
      },
    });

    const totalAllowedFree = 3;
    const freeRemaining = Math.max(0, totalAllowedFree - submittedCount);
    const isNextFree = freeRemaining > 0;
    const applicationFeeAmount = 1500;

    return {
      totalAllowedFree,
      submittedCount,
      freeRemaining,
      isNextFree,
      applicationFeeAmount,
      currency: 'INR',
      message: isNextFree
        ? `${freeRemaining} free application${freeRemaining > 1 ? 's' : ''} remaining`
        : 'Your 3 free applications quota has been used.',
    };
  }

  /**
   * Save Application Draft (Autosave / Save & Continue)
   */
  async saveDraft(id: string, actorUser: IUser, dto: SaveApplicationDraftDto) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { user: { include: { profile: true } } },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    // IDOR Protection
    const ctx = await this.dataScopeService.resolveDataScope(actorUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    // Lock check: Submitted applications cannot be edited directly via draft save
    if (app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW' || app.status === 'APPROVED') {
      throw new BadRequestException('Submitted applications cannot be modified. Request correction if updates are needed.');
    }

    const currentFormData: any = (app.formData as object) || {};

    // 1. Authoritative PIN Code Validation against State + District
    const targetState =
      dto.communicationState ||
      dto.address?.state ||
      dto.draftData?.address?.state ||
      currentFormData.communicationState ||
      currentFormData.address?.state ||
      app.user?.profile?.state;

    const targetDistrict =
      dto.communicationDistrict ||
      dto.address?.district ||
      dto.draftData?.address?.district ||
      currentFormData.communicationDistrict ||
      currentFormData.address?.district ||
      app.user?.profile?.district;

    const targetPincode =
      dto.communicationPincode ||
      dto.address?.pincode ||
      dto.draftData?.address?.pincode ||
      dto.draftData?.personalInfo?.pincode ||
      dto.personalInfo?.pincode;

    if (targetPincode && (targetState || targetDistrict)) {
      const pinVal = await this.geographyService.validatePincode(
        targetState || '',
        targetDistrict || '',
        targetPincode,
      );
      if (!pinVal.isValid) {
        throw new BadRequestException(pinVal.message);
      }
    }

    // 2. Academic Validation
    const academicData = dto.academicInfo || dto.draftData?.academicInfo;
    if (academicData) {
      if (
        academicData.tenthMarks !== undefined &&
        academicData.tenthMarks !== null &&
        (Number(academicData.tenthMarks) < 0 || Number(academicData.tenthMarks) > 100)
      ) {
        throw new BadRequestException('10th percentage must be between 0 and 100');
      }
      if (
        academicData.twelfthMarks !== undefined &&
        academicData.twelfthMarks !== null &&
        (Number(academicData.twelfthMarks) < 0 || Number(academicData.twelfthMarks) > 100)
      ) {
        throw new BadRequestException('12th percentage must be between 0 and 100');
      }
      if (
        academicData.tenthPassingYear &&
        (Number(academicData.tenthPassingYear) < 1970 ||
          Number(academicData.tenthPassingYear) > new Date().getFullYear() + 1)
      ) {
        throw new BadRequestException('Invalid 10th passing year');
      }
      if (
        academicData.twelfthPassingYear &&
        (Number(academicData.twelfthPassingYear) < 1970 ||
          Number(academicData.twelfthPassingYear) > new Date().getFullYear() + 1)
      ) {
        throw new BadRequestException('Invalid 12th passing year');
      }
    }

    const addressData = dto.address || dto.draftData?.address;

    // 4. Merge Structured FormData
    const updatedFormData = {
      ...currentFormData,
      ...(dto.draftData || {}),
      personalInfo: dto.personalInfo || dto.draftData?.personalInfo || currentFormData.personalInfo,
      academicInfo: dto.academicInfo || dto.draftData?.academicInfo || currentFormData.academicInfo,
      address: dto.address || dto.draftData?.address || currentFormData.address,
      financialAssistance: dto.financialAssistance || dto.draftData?.financialAssistance || currentFormData.financialAssistance,
      declaration: dto.declaration || dto.draftData?.declaration || currentFormData.declaration,
      communicationAddress:
        dto.communicationAddress ||
        addressData?.streetAddress ||
        currentFormData.communicationAddress,
      communicationCity:
        dto.communicationCity ||
        addressData?.city ||
        currentFormData.communicationCity,
      communicationDistrict:
        dto.communicationDistrict ||
        addressData?.district ||
        currentFormData.communicationDistrict,
      communicationState:
        dto.communicationState ||
        addressData?.state ||
        currentFormData.communicationState,
      communicationPincode:
        dto.communicationPincode ||
        addressData?.pincode ||
        currentFormData.communicationPincode,
      additionalInfo: dto.additionalInfo || currentFormData.additionalInfo,
      lastSavedAt: new Date().toISOString(),
      lastSavedBy: actorUser.id,
    };

    // Ensure user-facing applicationNumber matches canonical applicationId
    let publicAppNum = app.applicationNumber;
    if (!publicAppNum || publicAppNum.startsWith('SA-')) {
      publicAppNum = app.applicationId;
    }

    const rawDec = dto.declaration || dto.draftData?.declaration || currentFormData.declaration;
    const existingItems = currentFormData.declaration?.items;
    const normalizedDec = normalizeDeclarations(rawDec, actorUser.id, existingItems);

    updatedFormData.declaration = normalizedDec;

    const declValidation = this.validateDeclarations(app, updatedFormData);

    const updatedApp = await this.prisma.application.update({
      where: { id },
      data: {
        applicationNumber: publicAppNum,
        formData: updatedFormData,
        lastEditedById: actorUser.id,
        declarationAccepted: declValidation.isValid,
        declarationAcceptedAt: declValidation.isValid
          ? (app.declarationAcceptedAt || new Date())
          : (declValidation.acceptedDeclarations.length > 0 ? (app.declarationAcceptedAt || new Date()) : null),
        termsVersion: normalizedDec.termsVersion || app.termsVersion || 'v2.0',
        status: app.status === 'NEW' ? 'DRAFT' : app.status,
      },
      include: { college: true, course: true, branch: true },
    });

    // Re-evaluate backend completion percentage
    const progress = await this.getApplicationProgress(id, actorUser);

    const finalApp = await this.prisma.application.update({
      where: { id },
      data: {
        completionPercentage: progress.progressPercentage,
        status: progress.isReadyToSubmit ? 'READY_TO_SUBMIT' : (updatedApp.status === 'NEW' ? 'DRAFT' : updatedApp.status),
      },
      include: { college: true, course: true, branch: true },
    });

    await this.auditService.logAction({
      userId: actorUser.id,
      action: 'APPLICATION_SAVED',
      entity: 'Application',
      entityId: id,
      description: `Saved draft for section: ${dto.section || 'General'}`,
      metadata: { targetUserId: app.userId, progress: progress.progressPercentage },
    });

    return {
      success: true,
      message: 'Draft saved successfully',
      applicationNumber: publicAppNum,
      progressPercentage: progress.progressPercentage,
      status: finalApp.status,
      lastSavedAt: updatedFormData.lastSavedAt,
      data: finalApp,
    };
  }

  /**
   * Authoritative Payment Initiation & Order Generation for Application Fee
   */
  async initiatePayment(id: string, actorUser: IUser, dto: import('./dto/application-workflow.dto').InitiatePaymentDto) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        college: true,
        course: { include: { branches: true } },
        branch: true,
        user: { select: { id: true, fullName: true, email: true, mobile: true, assignedCounselorId: true, profile: true } },
      },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    // IDOR Protection
    const ctx = await this.dataScopeService.resolveDataScope(actorUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    if (app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW' || app.status === 'APPROVED' || app.status === 'ADMISSION_CONFIRMED') {
      throw new BadRequestException('Application has already been submitted.');
    }

    if (!app.college && app.collegeId) {
      const col = await this.prisma.college.findUnique({ where: { id: app.collegeId } });
      if (col) {
        app.college = col;
      }
    }

    // Save any passed declaration / financialAssistance draft updates
    if (dto.declaration || dto.financialAssistance) {
      const currentFormData = (app.formData as any) || {};
      const updatedFormData = {
        ...currentFormData,
        ...(dto.declaration ? { declaration: dto.declaration } : {}),
        ...(dto.financialAssistance ? { financialAssistance: dto.financialAssistance } : {}),
      };
      await this.prisma.application.update({
        where: { id },
        data: {
          formData: updatedFormData,
          ...(dto.declaration?.declarationAccepted ? { declarationAccepted: true, declarationAcceptedAt: new Date() } : {}),
        },
      });
      app.formData = updatedFormData;
    }

    // Readiness check
    const progress = await this.getApplicationProgress(id, actorUser);
    if (!progress.isOfferingActive) {
      throw new BadRequestException('This program is no longer accepting applications.');
    }

    if (!progress.isReadyToSubmit) {
      throw new BadRequestException(
        `Application is incomplete: ${progress.missingRequirements.join('; ')}`,
      );
    }

    // 3 Free Applications Quota Check
    const priorSubmissions = await this.prisma.application.count({
      where: {
        userId: app.userId,
        status: { in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.DOCUMENTS_VERIFIED, ApplicationStatus.APPROVED, ApplicationStatus.ADMISSION_CONFIRMED] },
        id: { not: app.id },
      },
    });

    const isWithinFreeQuota = priorSubmissions < 3;
    const baseFee = 1500;
    let payableAmount = isWithinFreeQuota ? 0 : baseFee;
    let discount = isWithinFreeQuota ? baseFee : 0;
    let appliedCoupon: any = null;

    if (!isWithinFreeQuota && dto.couponCode) {
      const couponRes = await this.couponsService.validateCoupon({
        code: dto.couponCode.trim().toUpperCase(),
        transactionAmount: baseFee,
        applicableScope: 'APPLICATION_FEE',
        collegeId: app.collegeId || undefined,
        courseId: app.courseId,
      });

      if (couponRes.valid) {
        discount = couponRes.discountAmount || 0;
        payableAmount = Math.max(0, couponRes.finalAmount ?? (baseFee - discount));
        appliedCoupon = {
          id: couponRes.couponId,
          code: couponRes.code || dto.couponCode.trim().toUpperCase(),
          discount,
          payable: payableAmount,
        };
      } else {
        throw new BadRequestException(couponRes.message || 'Invalid coupon code');
      }
    }

    let publicAppNum = app.applicationNumber || app.applicationId || app.id;

    // CASE A / B: Zero amount
    if (payableAmount === 0) {
      return {
        success: true,
        payableAmount: 0,
        baseFee,
        discount,
        isZeroAmount: true,
        isWithinFreeQuota,
        appliedCoupon,
        applicationNumber: publicAppNum,
        message: '₹0 payment applied.',
      };
    }

    // CASE C: > 0 Payable amount -> create/update payment order & set application status to PAYMENT_PENDING
    const timestamp = Date.now();
    const orderId = `ORD-${app.id.slice(-6)}-${timestamp}`;
    const transactionId = `TXN-${app.id.slice(-6)}-${timestamp}`;

    const existingPendingPayment = await this.prisma.payment.findFirst({
      where: {
        applicationId: app.id,
        userId: app.userId,
        paymentType: PaymentType.APPLICATION_FEE,
        status: PaymentStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    let paymentRecord;
    if (existingPendingPayment) {
      paymentRecord = await this.prisma.payment.update({
        where: { id: existingPendingPayment.id },
        data: {
          amount: baseFee,
          discountAmount: discount,
          pendingAmount: payableAmount,
          orderId,
          transactionId,
          collegeId: app.collegeId,
          courseId: app.courseId,
          counselorId: app.counselorId || null,
          remarks: appliedCoupon
            ? `Application fee ₹${payableAmount} with coupon ${appliedCoupon.code}`
            : `Application fee ₹${payableAmount}`,
        },
      });
    } else {
      paymentRecord = await this.prisma.payment.create({
        data: {
          applicationId: app.id,
          userId: app.userId,
          studentId: app.userId,
          collegeId: app.collegeId,
          courseId: app.courseId,
          counselorId: app.counselorId || null,
          paymentType: PaymentType.APPLICATION_FEE,
          amount: baseFee,
          discountAmount: discount,
          paidAmount: 0,
          pendingAmount: payableAmount,
          orderId,
          transactionId,
          status: PaymentStatus.PENDING,
          verificationStatus: 'PENDING',
          remarks: appliedCoupon
            ? `Application fee ₹${payableAmount} with coupon ${appliedCoupon.code}`
            : `Application fee ₹${payableAmount}`,
        },
      });
    }

    await this.prisma.application.update({
      where: { id },
      data: {
        status: ApplicationStatus.PAYMENT_PENDING,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    return {
      success: true,
      payableAmount,
      baseFee,
      discount,
      isZeroAmount: false,
      isWithinFreeQuota,
      orderId,
      transactionId,
      paymentId: paymentRecord.id,
      appliedCoupon,
      applicationNumber: publicAppNum,
    };
  }

  /**
   * Submit Application (Explicit Student Confirmation & Submission Transaction)
   */
  async submitApplication(id: string, actorUser: IUser, dto: SubmitApplicationDto) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        college: true,
        course: true,
        branch: true,
        user: { select: { id: true, fullName: true, email: true, mobile: true, assignedCounselorId: true, profile: true } },
      },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    // IDOR Protection
    const ctx = await this.dataScopeService.resolveDataScope(actorUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    // Idempotent Double-Submission Protection
    if (app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW' || app.status === 'APPROVED') {
      return {
        success: true,
        isExistingSubmission: true,
        message: 'Application has already been submitted',
        applicationNumber: app.applicationNumber || app.applicationId,
        submittedAt: app.submittedAt,
        data: app,
      };
    }

    if (!app.college && app.collegeId) {
      const col = await this.prisma.college.findUnique({ where: { id: app.collegeId } });
      if (col) {
        app.college = col;
      }
    }

    // Authoritative declaration verification & persistence
    const currentFormData = (app.formData as any) || {};
    const existingDec = currentFormData.declaration || {};
    const existingItems = existingDec.items;

    // Merge incoming DTO flags / declaration payload
    const incomingDec = dto.declaration || {
      privacyAccepted: dto.privacyPolicyAccepted ?? existingDec.privacyAccepted,
      termsAccepted: dto.termsAccepted ?? existingDec.termsAccepted,
      termsVersion: dto.termsVersion || existingDec.termsVersion || 'v2.0',
      privacyVersion: dto.policyVersion || existingDec.privacyVersion || 'v1.2',
      declarationAccepted: dto.declarationAccepted ?? dto.studentDeclarationAccepted ?? existingDec.declarationAccepted,
      verificationConsent: dto.verificationConsent ?? existingDec.verificationConsent,
      communicationConsent: dto.communicationConsent ?? existingDec.communicationConsent,
    };

    const normalizedDec = normalizeDeclarations(incomingDec, actorUser.id, existingItems);
    const updatedFormData = {
      ...currentFormData,
      declaration: normalizedDec,
    };

    const declValidation = this.validateDeclarations(app, updatedFormData);

    if (!declValidation.isValid) {
      throw new BadRequestException({
        code: 'APPLICATION_INCOMPLETE',
        reason: 'DECLARATION_INCOMPLETE',
        message: `Application submission requires mandatory statutory declarations: ${declValidation.missingLabels.join(', ')}`,
        missing: declValidation.missingDeclarations,
        missingDeclarations: declValidation.missingDeclarations,
      });
    }

    // Persist validated declarations
    await this.prisma.application.update({
      where: { id },
      data: {
        formData: updatedFormData,
        declarationAccepted: true,
        declarationAcceptedAt: app.declarationAcceptedAt || new Date(),
        termsVersion: dto.termsVersion || normalizedDec.termsVersion || app.termsVersion || 'v2.0',
      },
    });
    app.formData = updatedFormData;
    app.declarationAccepted = true;
    app.declarationAcceptedAt = app.declarationAcceptedAt || new Date();

    // Auto-heal archived course before submission check if active equivalent exists
    if (app.course && app.course.status === 'ARCHIVED' && app.collegeId) {
      let activeMatch = await this.prisma.course.findFirst({
        where: {
          collegeId: app.collegeId,
          name: { equals: app.course.name, mode: 'insensitive' },
          status: { not: 'ARCHIVED' },
        },
        include: { branches: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!activeMatch) {
        const baseCourseName = app.course.name.split(/[-–(]/)[0].trim();
        if (baseCourseName.length > 2) {
          activeMatch = await this.prisma.course.findFirst({
            where: {
              collegeId: app.collegeId,
              name: { startsWith: baseCourseName, mode: 'insensitive' },
              status: { not: 'ARCHIVED' },
            },
            include: { branches: true },
            orderBy: { createdAt: 'desc' },
          });
        }
      }

      if (!activeMatch) {
        activeMatch = await this.prisma.course.findFirst({
          where: {
            collegeId: app.collegeId,
            status: { not: 'ARCHIVED' },
          },
          include: { branches: true },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (activeMatch) {
        await this.prisma.application.update({
          where: { id },
          data: { courseId: activeMatch.id },
        });
        app.courseId = activeMatch.id;
        app.course = activeMatch;
      }
    }

    // Backend-derived readiness verification
    const progress = await this.getApplicationProgress(id, actorUser);

    if (!progress.isOfferingActive) {
      throw new BadRequestException('This program is no longer accepting applications.');
    }

    if (!progress.isReadyToSubmit) {
      throw new BadRequestException(
        `Application is incomplete: ${progress.missingRequirements.join('; ')}`,
      );
    }

    // 3 Free Applications Authoritative Rule Check
    const priorSubmissions = await this.prisma.application.count({
      where: {
        userId: app.userId,
        status: { in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.DOCUMENTS_VERIFIED, ApplicationStatus.APPROVED, ApplicationStatus.ADMISSION_CONFIRMED] },
        id: { not: app.id },
      },
    });

    const isWithinFreeQuota = priorSubmissions < 3;
    let appliedCoupon: any = null;
    const baseFee = 1500;
    let payableAmount = isWithinFreeQuota ? 0 : baseFee;

    if (!isWithinFreeQuota) {
      if (dto.couponCode) {
        const couponRes = await this.couponsService.validateCoupon({
          code: dto.couponCode.trim().toUpperCase(),
          transactionAmount: baseFee,
          applicableScope: 'APPLICATION_FEE',
          collegeId: app.collegeId || undefined,
          courseId: app.courseId,
        });

        if (couponRes.valid) {
          const disc = couponRes.discountAmount || 0;
          payableAmount = Math.max(0, couponRes.finalAmount ?? (baseFee - disc));
          appliedCoupon = {
            id: couponRes.couponId,
            code: couponRes.code || dto.couponCode.trim().toUpperCase(),
            discount: disc,
            payable: payableAmount,
          };
        }
      }

      const isPaidOrWaived = payableAmount === 0 || !!dto.paymentTransactionId || !!dto.paymentReference || !!dto.paymentId;

      if (!isPaidOrWaived) {
        throw new BadRequestException({
          code: 'APPLICATION_FEE_REQUIRED',
          message: 'Payment was not completed. Your application remains pending payment.',
          grossAmount: baseFee,
          payableAmount,
          feeTypeCode: 'APPLICATION_FEE',
        });
      }
    }

    let publicAppNum = app.applicationNumber;
    if (!publicAppNum || publicAppNum.startsWith('SA-')) {
      publicAppNum = app.applicationId;
    }

    const now = new Date();
    const activeFormData: any = (app.formData as object) || {};

    // 5. Build Immutable Submitted Snapshot (Requirement 3 - Data Snapshot Rule)
    const submittedSnapshot = {
      submittedAt: now.toISOString(),
      applicationId: id,
      applicationNumber: publicAppNum,
      personalInfo: activeFormData.personalInfo || {
        fullName: app.user?.fullName,
        email: app.user?.email,
        mobile: app.user?.mobile,
        category: (app.user as any)?.profile?.category,
        gender: (app.user as any)?.profile?.gender,
        dob: (app.user as any)?.profile?.dob,
        country: (app.user as any)?.country || 'India',
      },
      academicInfo: currentFormData.academicInfo || {
        tenthBoard: (app.user as any)?.profile?.tenthBoard,
        tenthMarks: (app.user as any)?.profile?.tenthMarks,
        tenthPassingYear: (app.user as any)?.profile?.tenthPassingYear,
        twelfthBoard: (app.user as any)?.profile?.twelfthBoard,
        twelfthStream: (app.user as any)?.profile?.twelfthStream,
        twelfthMarks: (app.user as any)?.profile?.twelfthMarks,
        twelfthPassingYear: (app.user as any)?.profile?.twelfthPassingYear,
        diplomaCollege: (app.user as any)?.profile?.diplomaCollege,
        diplomaCourse: (app.user as any)?.profile?.diplomaCourse,
        diplomaPercentage: (app.user as any)?.profile?.diplomaPercentage,
        graduationCollege: (app.user as any)?.profile?.graduationCollege,
        graduationCourse: (app.user as any)?.profile?.graduationCourse,
        graduationPercentage: (app.user as any)?.profile?.graduationPercentage,
      },
      address: currentFormData.address || {
        streetAddress: currentFormData.communicationAddress || (app.user as any)?.profile?.address,
        city: currentFormData.communicationCity || (app.user as any)?.profile?.city,
        district: currentFormData.communicationDistrict || (app.user as any)?.profile?.district,
        state: currentFormData.communicationState || (app.user as any)?.profile?.state,
        pincode: currentFormData.communicationPincode || (app.user as any)?.profile?.pincode,
      },
      program: {
        collegeId: app.collegeId || undefined,
        collegeName: app.college?.name || undefined,
        courseId: app.courseId || undefined,
        courseName: app.course?.name || undefined,
        branchId: app.branchId || undefined,
        branchName: app.branch?.name || undefined,
      },
      financialAssistance: currentFormData.financialAssistance || dto.financialAssistance || null,
      declarations: {
        declarationAccepted: true,
        termsVersion: dto.termsVersion || 'v2.0',
        privacyPolicyAccepted: dto.privacyPolicyAccepted ?? true,
        privacyPolicyVersion: 'v1.2',
        studentDeclarationAccepted: dto.studentDeclarationAccepted ?? true,
        verificationConsent: dto.verificationConsent ?? true,
        communicationConsent: dto.communicationConsent ?? true,
        acceptedAt: now.toISOString(),
      },
      quota: {
        isFreeSubmission: isWithinFreeQuota,
        priorSubmissions,
        appliedCoupon,
      },
    };

    const finalFormData = {
      ...currentFormData,
      submittedSnapshot,
      lastSubmittedAt: now.toISOString(),
    };

    let receiptNumber = `REC-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const submittedApp = await this.prisma.$transaction(async (tx) => {
      // If coupon was applied, atomically record redemption
      if (appliedCoupon && appliedCoupon.id) {
        await tx.couponRedemption.create({
          data: {
            couponId: appliedCoupon.id,
            userId: app.userId,
            transactionId: app.id,
            transactionType: 'APPLICATION_FEE',
            originalAmount: baseFee,
            discountAmount: appliedCoupon.discount,
            finalAmount: appliedCoupon.payable,
            status: 'REDEEMED',
          },
        });
        await tx.coupon.update({
          where: { id: appliedCoupon.id },
          data: { currentUsageCount: { increment: 1 } },
        });
      }

      // Check if existing pending payment intent was created
      let paymentRecord: any = null;
      if (dto.paymentId) {
        paymentRecord = await tx.payment.findFirst({
          where: { id: dto.paymentId, applicationId: app.id, userId: app.userId },
        });
      }
      if (!paymentRecord) {
        paymentRecord = await tx.payment.findFirst({
          where: {
            applicationId: app.id,
            userId: app.userId,
            paymentType: PaymentType.APPLICATION_FEE,
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      let payment;
      const effectiveTxnId = dto.paymentTransactionId || paymentRecord?.transactionId || `TXN_SETTLED_${now.getTime()}_${app.id.slice(-6)}`;

      if (paymentRecord) {
        payment = await tx.payment.update({
          where: { id: paymentRecord.id },
          data: {
            amount: baseFee,
            discountAmount: baseFee - payableAmount,
            paidAmount: payableAmount,
            pendingAmount: 0,
            status: PaymentStatus.COMPLETED,
            paidAt: now,
            paymentMethod:
              isWithinFreeQuota || (appliedCoupon && payableAmount === 0)
                ? PaymentMethod.CUSTOM
                : (dto.paymentMethod && Object.values(PaymentMethod).includes(dto.paymentMethod as any))
                ? (dto.paymentMethod as PaymentMethod)
                : PaymentMethod.UPI,
            transactionId: effectiveTxnId,
            receiptNumber,
            remarks: isWithinFreeQuota
              ? 'Application fee settled under 3 Free Applications Quota'
              : payableAmount === 0
              ? `Application fee settled with 100% coupon ${appliedCoupon?.code || ''}`
              : `Application fee paid ₹${payableAmount}`,
          },
        });
      } else {
        payment = await tx.payment.create({
          data: {
            applicationId: app.id,
            userId: app.userId,
            collegeId: app.collegeId,
            courseId: app.courseId,
            counselorId: app.counselorId || null,
            amount: baseFee,
            discountAmount: baseFee - payableAmount,
            paidAmount: payableAmount,
            pendingAmount: 0,
            paymentType: PaymentType.APPLICATION_FEE,
            paymentMethod:
              isWithinFreeQuota || (appliedCoupon && payableAmount === 0)
                ? PaymentMethod.CUSTOM
                : (dto.paymentMethod && Object.values(PaymentMethod).includes(dto.paymentMethod as any))
                ? (dto.paymentMethod as PaymentMethod)
                : PaymentMethod.UPI,
            status: PaymentStatus.COMPLETED,
            transactionId: effectiveTxnId,
            receiptNumber,
            paidAt: now,
            remarks: isWithinFreeQuota
              ? 'Application fee settled under 3 Free Applications Quota'
              : payableAmount === 0
              ? `Application fee settled with 100% coupon ${appliedCoupon?.code || ''}`
              : `Application fee paid ₹${payableAmount}`,
          },
        });
      }

      if (app.collegeId) {
        await tx.receipt.create({
          data: {
            receiptNumber,
            paymentId: payment.id,
            applicationId: app.id,
            studentId: app.userId,
            collegeId: app.collegeId,
            paidAmount: payableAmount,
            paymentMethod: isWithinFreeQuota ? 'FREE_QUOTA' : appliedCoupon && payableAmount === 0 ? 'COUPON' : (dto.paymentMethod || 'UPI'),
            transactionReference: effectiveTxnId,
            status: 'VALID',
            issuedAt: now,
            remarks: isWithinFreeQuota
              ? 'Zero rupee receipt issued under 3 Free Applications Quota'
              : payableAmount === 0
              ? `Zero rupee receipt issued under coupon discount (${appliedCoupon?.code || ''})`
              : `Application fee receipt for ₹${payableAmount}`,
          },
        });
      }

      const updated = await tx.application.update({
        where: { id },
        data: {
          applicationNumber: publicAppNum,
          formData: finalFormData,
          status: 'SUBMITTED',
          paymentStatus: PaymentStatus.COMPLETED,
          submittedAt: now,
          submittedByActorId: actorUser.id,
          declarationAccepted: true,
          declarationAcceptedAt: now,
          termsVersion: dto.termsVersion || 'v2.0',
          completionPercentage: 100,
        },
        include: {
          college: true,
          course: true,
          branch: true,
          counselor: { select: { id: true, fullName: true, email: true } },
        },
      });

      await tx.applicationTimeline.create({
        data: {
          applicationId: id,
          userId: actorUser.id,
          action: 'APPLICATION_SUBMITTED',
          oldStatus: app.status,
          newStatus: 'SUBMITTED',
          remarks: `Explicit submission confirmed by ${actorUser.role} (${actorUser.fullName})`,
        },
      });

      return updated;
    });

    // Real-time synchronization event
    this.liveSync.publishEvent(
      'application.submitted',
      {
        applicationId: id,
        applicationNumber: publicAppNum,
        userId: app.userId,
        status: 'SUBMITTED',
      },
      app.userId,
    );

    // Audit Logging
    await this.auditService.logAction({
      userId: actorUser.id,
      action: 'APPLICATION_SUBMITTED',
      entity: 'Application',
      entityId: id,
      description: `Submitted application ${publicAppNum} for ${app.college?.name} - ${app.course?.name}`,
      metadata: {
        targetUserId: app.userId,
        applicationNumber: publicAppNum,
        submittedAt: now.toISOString(),
      },
    });

    // Post-Commit Notifications
    await this.notificationsService.createNotification({
      userId: app.userId,
      type: 'APPLICATION',
      title: 'Application Submitted! 🎉',
      message: `Your application (${publicAppNum}) for ${app.college?.name} - ${app.course?.name} has been submitted successfully.`,
      actionUrl: `/dashboard?tab=applications`,
      metadata: { applicationId: id, applicationNumber: publicAppNum },
    });

    if (app.user.assignedCounselorId) {
      await this.notificationsService.createNotification({
        userId: app.user.assignedCounselorId,
        type: 'APPLICATION',
        title: 'Student Application Submitted',
        message: `Student ${app.user.fullName} submitted application (${publicAppNum}) for ${app.college?.name}.`,
        metadata: { applicationId: id, studentId: app.userId },
      });
    }

    return {
      success: true,
      message: 'Application submitted successfully',
      applicationNumber: publicAppNum,
      submittedAt: now,
      status: 'SUBMITTED',
      receiptNumber,
      payableAmount,
      isWithinFreeQuota,
      appliedCoupon,
      data: submittedApp,
    };
  }

  /**
   * Authoritative Application Declarations Getter
   */
  async getDeclarations(id: string, actorUser: IUser) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        declarationAccepted: true,
        declarationAcceptedAt: true,
        termsVersion: true,
        formData: true,
      },
    });
    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }
    const ctx = await this.dataScopeService.resolveDataScope(actorUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    const formDataObj = (app.formData as any) || {};
    const validation = this.validateDeclarations(app, formDataObj);
    return {
      success: true,
      applicationId: app.id,
      declarationAccepted: validation.isValid,
      declarationAcceptedAt: app.declarationAcceptedAt,
      validation,
      declarations: formDataObj.declaration || {},
    };
  }

  /**
   * Explicit Declarations Saver (Step 5 Persistence)
   */
  async saveDeclarations(id: string, actorUser: IUser, dto: SaveApplicationDeclarationsDto) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        declarationAccepted: true,
        declarationAcceptedAt: true,
        formData: true,
      },
    });
    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }
    const ctx = await this.dataScopeService.resolveDataScope(actorUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    const currentFormData = (app.formData as any) || {};
    const existingItems = currentFormData.declaration?.items;

    const rawDec = dto.declaration || {
      privacyAccepted: dto.privacyAccepted,
      privacyVersion: dto.privacyVersion || 'v1.2',
      termsAccepted: dto.termsAccepted,
      termsVersion: dto.termsVersion || 'v2.0',
      declarationAccepted: dto.declarationAccepted,
      verificationConsent: dto.verificationConsent,
      communicationConsent: dto.communicationConsent,
    };

    const normalizedDec = normalizeDeclarations(rawDec, actorUser.id, existingItems);
    const updatedFormData = {
      ...currentFormData,
      declaration: normalizedDec,
      lastSavedAt: new Date().toISOString(),
      lastSavedBy: actorUser.id,
    };

    const declValidation = this.validateDeclarations(app, updatedFormData);

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        formData: updatedFormData,
        lastEditedById: actorUser.id,
        declarationAccepted: declValidation.isValid,
        declarationAcceptedAt: declValidation.isValid ? (app.declarationAcceptedAt || new Date()) : null,
      },
    });

    await this.auditService.logAction({
      userId: actorUser.id,
      action: 'APPLICATION_DECLARATION_SAVED',
      entity: 'Application',
      entityId: id,
      description: `Saved statutory declarations. Valid: ${declValidation.isValid}`,
      metadata: { targetUserId: app.userId, missing: declValidation.missingDeclarations },
    });

    return {
      success: true,
      message: 'Declarations saved successfully',
      applicationId: app.id,
      declarationAccepted: declValidation.isValid,
      declarationAcceptedAt: updated.declarationAcceptedAt,
      validation: declValidation,
      declarations: normalizedDec,
    };
  }

  /**
   * Request Correction on Submitted Application (Authorized Reviewer Workflow)
   */
  async requestCorrection(id: string, reviewerUser: IUser, dto: RequestCorrectionDto) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    if (app.status !== 'SUBMITTED' && app.status !== 'UNDER_REVIEW') {
      throw new BadRequestException('Correction can only be requested on submitted or under-review applications.');
    }

    const updatedApp = await this.prisma.application.update({
      where: { id },
      data: {
        status: 'CORRECTION_REQUIRED',
        correctionSection: dto.affectedSection,
        correctionReason: dto.reason,
      },
    });

    await this.prisma.applicationTimeline.create({
      data: {
        applicationId: id,
        userId: reviewerUser.id,
        action: 'CORRECTION_REQUESTED',
        oldStatus: app.status,
        newStatus: 'CORRECTION_REQUIRED',
        remarks: `Correction requested for section [${dto.affectedSection}]: ${dto.reason}`,
      },
    });

    await this.auditService.logAction({
      userId: reviewerUser.id,
      action: 'APPLICATION_CORRECTION_REQUESTED',
      entity: 'Application',
      entityId: id,
      description: `Requested correction for section ${dto.affectedSection}: ${dto.reason}`,
      metadata: { targetUserId: app.userId, section: dto.affectedSection, reason: dto.reason },
    });

    await this.notificationsService.createNotification({
      userId: app.userId,
      type: 'APPLICATION',
      title: 'Action Required: Application Correction',
      message: `Correction requested on section "${dto.affectedSection}": ${dto.reason}`,
      actionUrl: `/dashboard?tab=applications`,
      metadata: { applicationId: id, section: dto.affectedSection },
    });

    return {
      success: true,
      message: 'Correction requested successfully',
      data: updatedApp,
    };
  }

  /**
   * Withdraw Application (Controlled Withdrawal)
   */
  async withdrawApplication(id: string, actorUser: IUser, dto: WithdrawApplicationDto) {
    const app = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    const ctx = await this.dataScopeService.resolveDataScope(actorUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    const updatedApp = await this.prisma.application.update({
      where: { id },
      data: {
        status: 'WITHDRAWN',
        withdrawalReason: dto.reason,
      },
    });

    await this.prisma.applicationTimeline.create({
      data: {
        applicationId: id,
        userId: actorUser.id,
        action: 'APPLICATION_WITHDRAWN',
        oldStatus: app.status,
        newStatus: 'WITHDRAWN',
        remarks: `Withdrawal reason: ${dto.reason}`,
      },
    });

    await this.auditService.logAction({
      userId: actorUser.id,
      action: 'APPLICATION_WITHDRAWN',
      entity: 'Application',
      entityId: id,
      description: `Withdrew application: ${dto.reason}`,
      metadata: { targetUserId: app.userId, reason: dto.reason },
    });

    return {
      success: true,
      message: 'Application withdrawn',
      data: updatedApp,
    };
  }

  async getReviewQueue(query: ReviewQueueQueryDto, actorUser: IUser) {
    const ctx = await this.dataScopeService.resolveDataScope(actorUser.id);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = {
        in: [
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.UNDER_REVIEW,
          ApplicationStatus.CORRECTION_REQUIRED,
          ApplicationStatus.APPROVED,
          ApplicationStatus.REJECTED,
        ],
      };
    }

    if (query.reviewerId) {
      where.reviewerId = query.reviewerId;
    }

    if (query.collegeId) {
      where.collegeId = query.collegeId;
    }

    if (query.courseId) {
      where.courseId = query.courseId;
    }

    if (query.priority) {
      where.reviewPriority = query.priority;
    }

    if (query.search) {
      where.OR = [
        { applicationId: { contains: query.search, mode: 'insensitive' } },
        { applicationNumber: { contains: query.search, mode: 'insensitive' } },
        { user: { studentId: { contains: query.search, mode: 'insensitive' } } },
        { user: { registrationNumber: { contains: query.search, mode: 'insensitive' } } },
        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { user: { mobile: { contains: query.search, mode: 'insensitive' } } },
        { college: { name: { contains: query.search, mode: 'insensitive' } } },
        { course: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (actorUser.role === 'STUDENT') {
      where.userId = actorUser.id;
    } else if (actorUser.role === 'COUNSELOR') {
      where.counselorId = actorUser.id;
    }

    const [items, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, studentId: true, registrationNumber: true, fullName: true, email: true, mobile: true, profile: true } },
          college: { select: { id: true, name: true, city: true, state: true } },
          course: { select: { id: true, name: true, level: true } },
          branch: { select: { id: true, name: true, code: true } },
          counselor: { select: { id: true, fullName: true, email: true } },
          reviewer: { select: { id: true, fullName: true, email: true } },
          approvedBy: { select: { id: true, fullName: true } },
          rejectedBy: { select: { id: true, fullName: true } },
          documents: true,
          timeline: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    const now = new Date();
    const enrichedItems = items.map((app: any) => {
      if (app.user?.profile) {
        const { pan, passport, ...cleanProfile } = app.user.profile;
        app.user.profile = cleanProfile;
      }
      const submittedAt = app.submittedAt || app.createdAt;
      const ageInHours = Math.round((now.getTime() - new Date(submittedAt).getTime()) / (1000 * 60 * 60));
      const slaThresholdHours = app.reviewPriority === 'URGENT' ? 12 : app.reviewPriority === 'HIGH' ? 24 : 48;
      const isOverdue =
        ageInHours > slaThresholdHours &&
        (app.status === ApplicationStatus.SUBMITTED || app.status === ApplicationStatus.UNDER_REVIEW);

      return {
        ...app,
        ageInHours,
        isOverdue,
        slaThresholdHours,
      };
    });

    const counts = await this.prisma.application.groupBy({
      by: ['status'],
      where: actorUser.role === 'STUDENT' ? { userId: actorUser.id } : {},
      _count: true,
    });

    const statusCounts = counts.reduce((acc: any, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {});

    return {
      success: true,
      data: enrichedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        counts: {
          total,
          submitted: statusCounts[ApplicationStatus.SUBMITTED] || 0,
          underReview: statusCounts[ApplicationStatus.UNDER_REVIEW] || 0,
          correctionRequired: statusCounts[ApplicationStatus.CORRECTION_REQUIRED] || 0,
          approved: statusCounts[ApplicationStatus.APPROVED] || 0,
          rejected: statusCounts[ApplicationStatus.REJECTED] || 0,
        },
      },
    };
  }

  async claimReview(id: string, reviewerUser: IUser, dto: ClaimReviewDto) {
    const app = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    const ctx = await this.dataScopeService.resolveDataScope(reviewerUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    if (app.reviewerId && app.reviewerId !== reviewerUser.id) {
      throw new ConflictException('Application is already assigned for review to another officer.');
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        reviewerId: reviewerUser.id,
        reviewAssignedAt: new Date(),
        reviewPriority: dto.priority || app.reviewPriority || 'NORMAL',
        status: app.status === ApplicationStatus.SUBMITTED ? ApplicationStatus.UNDER_REVIEW : app.status,
        reviewStartedAt: app.reviewStartedAt || new Date(),
      },
      include: { reviewer: true, college: true, course: true, user: true },
    });

    await this.prisma.applicationTimeline.create({
      data: {
        applicationId: id,
        userId: reviewerUser.id,
        action: 'APPLICATION_REVIEW_ASSIGNED',
        oldStatus: app.status,
        newStatus: updated.status,
        remarks: `Review claimed by ${reviewerUser.fullName || reviewerUser.email}`,
      },
    });

    await this.auditService.logAction({
      userId: reviewerUser.id,
      action: 'APPLICATION_REVIEW_ASSIGNED',
      entity: 'Application',
      entityId: id,
      description: `Claimed review for application ${app.applicationNumber || id}`,
      metadata: { reviewerId: reviewerUser.id },
    });

    return {
      success: true,
      message: 'Review claimed successfully',
      data: updated,
    };
  }

  async startReview(id: string, reviewerUser: IUser) {
    const app = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    const ctx = await this.dataScopeService.resolveDataScope(reviewerUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        status: ApplicationStatus.UNDER_REVIEW,
        reviewStartedAt: new Date(),
        reviewerId: app.reviewerId || reviewerUser.id,
      },
      include: { reviewer: true, college: true, course: true, user: true },
    });

    await this.prisma.applicationTimeline.create({
      data: {
        applicationId: id,
        userId: reviewerUser.id,
        action: 'APPLICATION_REVIEW_STARTED',
        oldStatus: app.status,
        newStatus: ApplicationStatus.UNDER_REVIEW,
        remarks: `Review started by ${reviewerUser.fullName || reviewerUser.email}`,
      },
    });

    await this.auditService.logAction({
      userId: reviewerUser.id,
      action: 'APPLICATION_REVIEW_STARTED',
      entity: 'Application',
      entityId: id,
      description: `Started review for application ${app.applicationNumber || id}`,
    });

    return {
      success: true,
      message: 'Review started',
      data: updated,
    };
  }

  async approveAdmission(id: string, approverUser: IUser, dto: ApproveAdmissionDto) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        college: true,
        course: true,
        branch: true,
        user: { include: { profile: true } },
      },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    const ctx = await this.dataScopeService.resolveDataScope(approverUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    const hasApprovePerm =
      ctx.isSuperAdmin ||
      approverUser.role === 'ADMIN' ||
      approverUser.role === 'SUPER_ADMIN' ||
      (ctx.permissions &&
        (ctx.permissions.includes('application.approve') ||
          ctx.permissions.includes('college.application.review') ||
          ctx.permissions.includes('college.application.approve')));

    if (!hasApprovePerm) {
      throw new ForbiddenException('You do not have authorization to approve admission applications.');
    }

    if (!app.college || !app.course) {
      throw new BadRequestException('Application program offering context is invalid or deleted.');
    }

    if ((app.college as any).isActive === false || (app.course as any).isActive === false) {
      throw new BadRequestException('This admission offering is no longer active and cannot be approved.');
    }

    if (app.status === ApplicationStatus.APPROVED) {
      return { success: true, message: 'Application is already approved', data: app };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Atomic Seat Reservation if linked to CollegeOffering
      let targetOfferingId = app.offeringId;
      if (!targetOfferingId && app.collegeId && app.courseId) {
        const matchingOffering = await tx.collegeOffering.findFirst({
          where: {
            collegeId: app.collegeId,
            courseId: app.courseId,
            status: 'ACTIVE',
          },
        });
        if (matchingOffering) targetOfferingId = matchingOffering.id;
      }

      if (targetOfferingId) {
        const offering = await tx.collegeOffering.findUnique({
          where: { id: targetOfferingId },
        });

        if (offering) {
          if (offering.availableSeats <= 0) {
            throw new ConflictException(
              'Admission Approval Failed: No available seats remaining in this program offering.',
            );
          }

          await tx.collegeOffering.update({
            where: { id: targetOfferingId },
            data: {
              availableSeats: { decrement: 1 },
              consumedSeats: { increment: 1 },
              status:
                offering.availableSeats - 1 <= 0 ? 'FULL' : offering.status,
            },
          });
        }
      }

      const updatedApp = await tx.application.update({
        where: { id },
        data: {
          status: ApplicationStatus.APPROVED,
          approvedDate: new Date(),
          approvedById: approverUser.id,
          decisionNotes: dto.decisionNotes,
          paymentStatus: 'PENDING',
          offeringId: targetOfferingId || app.offeringId,
        },
        include: {
          college: true,
          course: true,
          branch: true,
          user: true,
        },
      });

      await tx.applicationTimeline.create({
        data: {
          applicationId: id,
          userId: approverUser.id,
          action: 'ADMISSION_APPROVED',
          oldStatus: app.status,
          newStatus: ApplicationStatus.APPROVED,
          remarks: dto.decisionNotes || 'Admission approved by board',
        },
      });

      return updatedApp;
    });

    await this.auditService.logAction({
      userId: approverUser.id,
      action: 'ADMISSION_APPROVED',
      entity: 'Application',
      entityId: id,
      description: `Admission approved for application ${app.applicationNumber || id}`,
      metadata: { targetUserId: app.userId, decisionNotes: dto.decisionNotes },
    });

    try {
      await this.notificationsService.createNotification({
        userId: app.userId,
        title: 'Admission Approved!',
        message: `Congratulations! Your application ${app.applicationNumber || id} for ${app.college?.name} - ${app.course?.name} has been APPROVED.`,
        type: 'APPLICATION' as any,
      });
      if (app.counselorId) {
        await this.notificationsService.createNotification({
          userId: app.counselorId,
          title: 'Student Admission Approved',
          message: `Application ${app.applicationNumber || id} for ${app.user?.fullName} has been APPROVED by the board.`,
          type: 'APPLICATION' as any,
        });
      }
    } catch {
      // Non-blocking notification logging
    }

    return {
      success: true,
      message: 'Admission approved successfully',
      data: updated,
    };
  }

  async rejectAdmission(id: string, rejectorUser: IUser, dto: RejectAdmissionDto) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        college: true,
        course: true,
        user: { include: { profile: true } },
      },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    const ctx = await this.dataScopeService.resolveDataScope(rejectorUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    const hasRejectPerm =
      ctx.isSuperAdmin ||
      rejectorUser.role === 'ADMIN' ||
      rejectorUser.role === 'SUPER_ADMIN' ||
      (ctx.permissions && ctx.permissions.includes('application.reject'));

    if (!hasRejectPerm) {
      throw new ForbiddenException('You do not have authorization to reject admission applications.');
    }

    if (!dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const publicReason =
      dto.publicRejectionReason ||
      'Application does not meet the eligibility criteria or seat capacity for the selected program.';

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedApp = await tx.application.update({
        where: { id },
        data: {
          status: ApplicationStatus.REJECTED,
          rejectedDate: new Date(),
          rejectedById: rejectorUser.id,
          rejectionReason: dto.rejectionReason,
          rejectionCategory: dto.rejectionCategory || 'ELIGIBILITY',
          publicRejectionReason: publicReason,
        },
        include: {
          college: true,
          course: true,
          user: true,
        },
      });

      await tx.applicationTimeline.create({
        data: {
          applicationId: id,
          userId: rejectorUser.id,
          action: 'ADMISSION_REJECTED',
          oldStatus: app.status,
          newStatus: ApplicationStatus.REJECTED,
          remarks: `Internal Reason: ${dto.rejectionReason} | Public Reason: ${publicReason}`,
        },
      });

      return updatedApp;
    });

    await this.auditService.logAction({
      userId: rejectorUser.id,
      action: 'ADMISSION_REJECTED',
      entity: 'Application',
      entityId: id,
      description: `Admission rejected for application ${app.applicationNumber || id}`,
      metadata: { targetUserId: app.userId, reason: dto.rejectionReason, category: dto.rejectionCategory },
    });

    try {
      await this.notificationsService.createNotification({
        userId: app.userId,
        title: 'Application Decision Status Update',
        message: `Your application ${app.applicationNumber || id} for ${app.college?.name} has been reviewed. Status: REJECTED. Reason: ${publicReason}`,
        type: 'APPLICATION' as any,
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: 'Admission rejected',
      data: updated,
    };
  }

  async reopenDecision(id: string, actorUser: IUser, dto: ReopenDecisionDto) {
    const app = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    const ctx = await this.dataScopeService.resolveDataScope(actorUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    const hasReopenPerm =
      ctx.isSuperAdmin ||
      actorUser.role === 'SUPER_ADMIN' ||
      (ctx.permissions && ctx.permissions.includes('application.reopen'));

    if (!hasReopenPerm) {
      throw new ForbiddenException('You do not have permission to reopen application decisions.');
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        status: ApplicationStatus.UNDER_REVIEW,
        reopenedAt: new Date(),
        reopenedById: actorUser.id,
        reopenReason: dto.reopenReason,
      },
    });

    await this.prisma.applicationTimeline.create({
      data: {
        applicationId: id,
        userId: actorUser.id,
        action: 'DECISION_REOPENED',
        oldStatus: app.status,
        newStatus: ApplicationStatus.UNDER_REVIEW,
        remarks: `Decision reopened: ${dto.reopenReason}`,
      },
    });

    await this.auditService.logAction({
      userId: actorUser.id,
      action: 'DECISION_REOPENED',
      entity: 'Application',
      entityId: id,
      description: `Reopened decision for application ${app.applicationNumber || id}`,
      metadata: { reason: dto.reopenReason },
    });

    return {
      success: true,
      message: 'Decision reopened successfully',
      data: updated,
    };
  }

  async reassignReviewer(id: string, actorUser: IUser, dto: ReassignReviewerDto) {
    const app = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    const ctx = await this.dataScopeService.resolveDataScope(actorUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    const targetReviewer = await this.prisma.user.findUnique({
      where: { id: dto.newReviewerId },
    });

    if (!targetReviewer || targetReviewer.status === 'DISABLED' || targetReviewer.status === 'ARCHIVED') {
      throw new BadRequestException('Target reviewer is invalid or inactive');
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        reviewerId: dto.newReviewerId,
        reviewAssignedAt: new Date(),
      },
      include: { reviewer: true },
    });

    await this.prisma.applicationTimeline.create({
      data: {
        applicationId: id,
        userId: actorUser.id,
        action: 'APPLICATION_REVIEW_REASSIGNED',
        oldStatus: app.status,
        newStatus: app.status,
        remarks: `Reassigned from ${app.reviewerId || 'Unassigned'} to ${dto.newReviewerId}: ${dto.reason || 'Management re-assignment'}`,
      },
    });

    await this.auditService.logAction({
      userId: actorUser.id,
      action: 'APPLICATION_REVIEW_REASSIGNED',
      entity: 'Application',
      entityId: id,
      description: `Reassigned reviewer for application ${app.applicationNumber || id}`,
      metadata: { previousReviewerId: app.reviewerId, newReviewerId: dto.newReviewerId },
    });

    return {
      success: true,
      message: 'Reviewer reassigned successfully',
      data: updated,
    };
  }
}

