import {
  Injectable,
  Inject,
  Optional,
  forwardRef,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataScopeService } from '../auth/data-scope.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationQueryDto } from './dto/application-query.dto';
import { createPaginatedResponse } from '../common/dto/paginated-response.dto';
import {
  ApplicationStatus,
  PaymentStatus,
  PaymentType,
  PaymentMethod,
  NotificationType,
  NotificationPriority,
} from '@prisma/client';

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
import { ApplicationFeeEligibilityService } from './services/application-fee-eligibility.service';
import { PaymentGatewayService } from '../payments/gateways/payment-gateway.service';
import { LeadRoutingService } from '../lead/lead-routing.service';
import { ConsentService } from '../legal/consent.service';

@Injectable()
export class ApplicationService implements OnModuleInit {
  private applicationFeeEligibilityService!: ApplicationFeeEligibilityService;
  private paymentGatewayService!: PaymentGatewayService;

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
    @Inject(forwardRef(() => LeadRoutingService))
    private leadRoutingService: LeadRoutingService,
    @Optional()
    @Inject(forwardRef(() => ApplicationFeeEligibilityService))
    applicationFeeEligibilityService?: ApplicationFeeEligibilityService,
    @Optional()
    @Inject(forwardRef(() => PaymentGatewayService))
    paymentGatewayService?: PaymentGatewayService,
    @Optional()
    @Inject(forwardRef(() => ConsentService))
    private consentService?: ConsentService,
  ) {
    this.applicationFeeEligibilityService =
      applicationFeeEligibilityService ||
      new ApplicationFeeEligibilityService(this.prisma, this.couponsService);
    this.paymentGatewayService =
      paymentGatewayService || new PaymentGatewayService();
  }

  async onModuleInit() {
    try {
      // Auto-heal any legacy draft applications that were mistakenly marked with COMPLETED paymentStatus
      await this.prisma.application.updateMany({
        where: {
          status: { in: ['DRAFT', 'NEW', 'READY_TO_SUBMIT'] },
          paymentStatus: PaymentStatus.COMPLETED,
        },
        data: {
          paymentStatus: PaymentStatus.PENDING,
        },
      });
    } catch {
      // ignore in environments where tables may be initializing
    }
  }

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

    // 3. Resolve Counselor: Preserve existing counselor if user already has one; DO NOT assign random counselor
    const assignedCounselorId = user.assignedCounselorId || null;

    // Resolve Submitted Geographic Data strictly from the Application Form (Separate from Profile)
    const submittedState = (
      dto.state ||
      (dto as any).formData?.personalInfo?.state ||
      (dto as any).formData?.address?.state ||
      user.profile?.state ||
      user.state ||
      ''
    ).trim();

    const submittedDistrict = (
      dto.district ||
      (dto as any).formData?.personalInfo?.district ||
      (dto as any).formData?.address?.district ||
      user.profile?.district ||
      user.profile?.city ||
      ''
    ).trim();

    let resolvedStateId: string | null = dto.stateId || null;
    let resolvedStateName: string | null = submittedState || null;

    if (resolvedStateId) {
      const stateObj = await this.prisma.state.findUnique({
        where: { id: resolvedStateId },
      });
      if (stateObj) {
        resolvedStateName = stateObj.name;
      } else {
        resolvedStateId = null;
      }
    }

    if (!resolvedStateId && submittedState) {
      const stateObj = await this.prisma.state.findFirst({
        where: { name: { equals: submittedState, mode: 'insensitive' } },
      });
      if (stateObj) {
        resolvedStateId = stateObj.id;
        resolvedStateName = stateObj.name;
      }
    }

    let resolvedDistrictId: string | null = dto.districtId || null;
    let resolvedDistrictName: string | null = submittedDistrict || null;

    if (resolvedDistrictId) {
      const districtObj = await this.prisma.district.findUnique({
        where: { id: resolvedDistrictId },
      });
      if (districtObj) {
        resolvedDistrictName = districtObj.name;
        if (!resolvedStateId) {
          resolvedStateId = districtObj.stateId;
        }
      } else {
        resolvedDistrictId = null;
      }
    }

    if (resolvedStateId && !resolvedDistrictId && submittedDistrict) {
      const districtObj = await this.prisma.district.findFirst({
        where: {
          stateId: resolvedStateId,
          name: { equals: submittedDistrict, mode: 'insensitive' },
        },
      });
      if (districtObj) {
        resolvedDistrictId = districtObj.id;
        resolvedDistrictName = districtObj.name;
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

    // 4. Draft applications start in DRAFT status with PENDING payment status.
    // Free quota eligibility is authoritatively evaluated upon submission.
    const initialPaymentStatus = PaymentStatus.PENDING;
    const initialRemarks = 'Application draft created';

    const result = await this.prisma.$transaction(async (tx) => {
      // Build initial structured formData from apply-now DTO
      const initialFormData = {
        personalInfo: {
          fullName: dto.fullName || user.fullName || '',
          mobile: dto.mobile || user.mobile || '',
          email: dto.email || user.email || '',
          parentMobile: dto.parentMobile || '',
          parentEmail: dto.parentEmail || '',
          state: resolvedStateName || dto.state || '',
          stateId: resolvedStateId || dto.stateId || '',
          district: resolvedDistrictName || dto.district || '',
          districtId: resolvedDistrictId || dto.districtId || '',
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
          state: resolvedStateName || dto.state || '',
          stateId: resolvedStateId || dto.stateId || '',
          district: resolvedDistrictName || dto.district || '',
          districtId: resolvedDistrictId || dto.districtId || '',
          pincode: dto.pincode || '',
        },
        communicationState: resolvedStateName || dto.state || '',
        communicationDistrict: resolvedDistrictName || dto.district || '',
        communicationStateId: resolvedStateId || dto.stateId || '',
        communicationDistrictId: resolvedDistrictId || dto.districtId || '',
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
            ? `${dto.remarks} | ${initialRemarks}`
            : initialRemarks,
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

      // Create Initial Payment Intent Ledger Entry (Pending)
      await tx.payment.create({
        data: {
          applicationId: app.id,
          userId,
          collegeId: targetCollegeId,
          courseId: targetCourseId,
          counselorId: assignedCounselorId || null,
          paymentType: PaymentType.APPLICATION_FEE,
          amount: 1500,
          currency: 'INR',
          status: PaymentStatus.PENDING,
          notes: initialRemarks,
          paidAt: null,
          paidAmount: 0,
        },
      });

      // Initial Timeline Entry
      await tx.applicationTimeline.create({
        data: {
          applicationId: app.id,
          userId,
          action: 'CREATED',
          newStatus: app.status,
          remarks: initialRemarks,
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

    // 5. Post-Submission: Create Application Lead in CRM pipeline and execute Geographic Routing
    try {
      const cleanMobile = (dto.mobile || user.mobile || '').trim().replace(/\D/g, '').slice(-10);
      const cleanEmail = (dto.email || user.email || '').trim().toLowerCase() || null;

      const applicationLead = await this.prisma.lead.create({
        data: {
          fullName: dto.fullName || user.fullName || 'Applicant',
          mobile: cleanMobile || user.mobile || 'N/A',
          email: cleanEmail,
          state: resolvedStateName,
          stateId: resolvedStateId,
          district: resolvedDistrictName,
          districtId: resolvedDistrictId,
          city: resolvedDistrictName,
          collegeId: targetCollegeId,
          courseId: targetCourseId,
          branchId: targetBranchId,
          educationLevel: dto.educationLevel,
          stream: dto.stream,
          passingYear:
            typeof dto.passingYear === 'number'
              ? dto.passingYear
              : parseInt(String(dto.passingYear), 10) || null,
          source: 'WEBSITE',
          status: 'NEW',
          priority: 'HOT',
          preferredCourse: result.application.course?.name || dto.courseName,
          preferredCollege: result.application.college?.name || dto.collegeName,
          assignedCounselorId: assignedCounselorId || null,
          remarks: `Application ${applicationId} submitted for ${result.application.college?.name || 'College'} - ${result.application.course?.name || 'Course'}. Location: ${resolvedStateName || 'N/A'}, ${resolvedDistrictName || 'N/A'}.`,
        },
      });

      // Authoritative Geographic Routing strictly based on Application Form's State + District
      await this.leadRoutingService.routeLead(applicationLead.id);
    } catch (routingErr: unknown) {
      const errStr = routingErr instanceof Error ? routingErr.message : String(routingErr);
      await this.prisma.auditLog
        .create({
          data: {
            userId,
            action: 'APPLICATION_ROUTING_FAILED',
            entity: 'Application',
            entityId: result.application.id,
            newValue: JSON.stringify({ error: errStr }),
          },
        })
        .catch(() => {});
    }

    return result;
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
        counselor: { select: { id: true, fullName: true, designation: true, avatar: true } },
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
            avatar: true,
            designation: true,
            qualification: true,
            counselorProfile: {
              select: { designation: true, department: true, qualification: true, experience: true },
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
    const eligibility = await this.applicationFeeEligibilityService.getEligibility(userId);
    return {
      totalAllowedFree: eligibility.freeApplicationsLimit,
      submittedCount: eligibility.freeApplicationsUsed,
      freeRemaining: eligibility.freeApplicationsRemaining,
      isNextFree: eligibility.isWithinFreeQuota,
      applicationFeeAmount: eligibility.baseFee,
      currency: eligibility.currency,
      message: eligibility.message,
      freeApplicationsLimit: eligibility.freeApplicationsLimit,
      freeApplicationsUsed: eligibility.freeApplicationsUsed,
      freeApplicationsRemaining: eligibility.freeApplicationsRemaining,
      applicationFeeApplicable: eligibility.applicationFeeApplicable,
    };
  }

  /**
   * Application-specific fee summary with authoritative fee, free quota, and coupon discount.
   */
  async getApplicationFeeSummary(id: string, actorUser: IUser, couponCode?: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
    });
    if (!app) {
      throw new NotFoundException(`Application ${id} not found.`);
    }
    const ctx = await this.dataScopeService.resolveDataScope(actorUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    return this.applicationFeeEligibilityService.getEligibility(app.userId, app.id, couponCode);
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
   * Authoritative Payment Initiation & Order Generation for Application Fee (Razorpay official integration)
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

    // IDOR Protection: authenticated student = application owner
    const ctx = await this.dataScopeService.resolveDataScope(actorUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    if (app.status === 'CANCELLED' || app.status === 'WITHDRAWN' || app.status === 'REJECTED') {
      throw new BadRequestException(`Application is ${app.status.toLowerCase()} and cannot accept payment.`);
    }

    // Only throw if genuinely completed payment exists or settled under free quota
    const existingPaid = await this.prisma.payment.findFirst({
      where: {
        applicationId: app.id,
        paymentType: PaymentType.APPLICATION_FEE,
        status: PaymentStatus.COMPLETED,
      },
    });

    const isFreeSettled =
      (app.formData as any)?.submittedSnapshot?.quota?.isFreeSubmission === true ||
      app.remarks?.includes('Free Applications Quota');

    if (
      existingPaid ||
      (app.status !== 'DRAFT' &&
        app.status !== 'NEW' &&
        app.status !== 'READY_TO_SUBMIT' &&
        app.paymentStatus === PaymentStatus.COMPLETED &&
        isFreeSettled)
    ) {
      throw new BadRequestException('Application fee has already been paid for this application.');
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

    // Readiness check (only if application is in DRAFT state; submitted applications have already passed validation)
    if (app.status === 'DRAFT') {
      const progress = await this.getApplicationProgress(id, actorUser);
      if (!progress.isOfferingActive) {
        throw new BadRequestException('This program is no longer accepting applications.');
      }

      if (!progress.isReadyToSubmit) {
        throw new BadRequestException(
          `Application is incomplete: ${progress.missingRequirements.join('; ')}`,
        );
      }
    }

    // Authoritative Quota & Fee Calculation via ApplicationFeeEligibilityService
    const eligibility = await this.applicationFeeEligibilityService.getEligibility(
      app.userId,
      app.id,
      dto.couponCode,
    );

    const publicAppNum = app.applicationNumber || app.applicationId || app.id;

    // Authoritative Action-Based Payment Legal Consent (Requirement 11 & 12)
    let paymentPolicies = dto.acceptedPolicies;
    if (this.consentService) {
      if ((!paymentPolicies || paymentPolicies.length === 0) && (dto.paymentTermsAccepted || dto.termsAccepted)) {
        const payReqs = await this.consentService.getActionRequirements('PAYMENT');
        paymentPolicies = payReqs.policies.map((p) => ({
          policyId: p.id,
          policyType: p.policyType,
          policyVersion: p.version,
        }));
      }

      const payConsentValidation = await this.consentService.validateActionConsent(
        'PAYMENT',
        paymentPolicies,
      );
      if (!payConsentValidation.isValid) {
        throw new BadRequestException({
          code: 'PAYMENT_CONSENT_REQUIRED',
          message: `Payment confirmation requires accepting mandatory payment policies: ${payConsentValidation.missingPolicies.join(', ')}`,
          missing: payConsentValidation.missingPolicies,
        });
      }
    }

    // CASE A / B: Zero amount (Free Quota or 100% Coupon) -> Atomically settle in database without opening gateway
    if (eligibility.isZeroAmount) {
      const now = new Date();
      const receiptNumber = `REC-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const effectiveTxnId = eligibility.isWithinFreeQuota
        ? `TXN_FREE_${now.getTime()}_${app.id.slice(-6)}`
        : `TXN_COUPON_${now.getTime()}_${app.id.slice(-6)}`;

      const zeroSettlementResult = await this.prisma.$transaction(async (tx) => {
        // Record coupon redemption if coupon applied
        if (eligibility.appliedCoupon && eligibility.appliedCoupon.id) {
          await tx.couponRedemption.create({
            data: {
              couponId: eligibility.appliedCoupon.id,
              userId: app.userId,
              transactionId: app.id,
              transactionType: 'APPLICATION_FEE',
              originalAmount: eligibility.baseFee,
              discountAmount: eligibility.discountAmount,
              finalAmount: 0,
              status: 'REDEEMED',
            },
          });
          await tx.coupon.update({
            where: { id: eligibility.appliedCoupon.id },
            data: { currentUsageCount: { increment: 1 } },
          });
        }

        // Find or create payment record
        const existingPayment = await tx.payment.findFirst({
          where: {
            applicationId: app.id,
            userId: app.userId,
            paymentType: PaymentType.APPLICATION_FEE,
          },
          orderBy: { createdAt: 'desc' },
        });

        let paymentRecord;
        if (existingPayment) {
          paymentRecord = await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              amount: eligibility.baseFee,
              discountAmount: eligibility.discountAmount,
              paidAmount: 0,
              pendingAmount: 0,
              status: PaymentStatus.COMPLETED,
              paidAt: now,
              paymentMethod: eligibility.isWithinFreeQuota ? PaymentMethod.CUSTOM : PaymentMethod.CUSTOM,
              transactionId: effectiveTxnId,
              receiptNumber,
              remarks: eligibility.isWithinFreeQuota
                ? 'Application fee settled under Free Applications Quota'
                : `Application fee settled with 100% coupon ${eligibility.appliedCoupon?.code || ''}`,
            },
          });
        } else {
          paymentRecord = await tx.payment.create({
            data: {
              applicationId: app.id,
              userId: app.userId,
              collegeId: app.collegeId,
              courseId: app.courseId,
              counselorId: app.counselorId || null,
              amount: eligibility.baseFee,
              discountAmount: eligibility.discountAmount,
              paidAmount: 0,
              pendingAmount: 0,
              paymentType: PaymentType.APPLICATION_FEE,
              paymentMethod: PaymentMethod.CUSTOM,
              status: PaymentStatus.COMPLETED,
              transactionId: effectiveTxnId,
              receiptNumber,
              paidAt: now,
              remarks: eligibility.isWithinFreeQuota
                ? 'Application fee settled under Free Applications Quota'
                : `Application fee settled with 100% coupon ${eligibility.appliedCoupon?.code || ''}`,
            },
          });
        }

        // Canonical Receipt Record
        if (app.collegeId) {
          const existingReceipt = await tx.receipt.findFirst({
            where: {
              OR: [
                { paymentId: paymentRecord.id },
                { applicationId: app.id, status: 'VALID' },
              ],
            },
          });
          if (!existingReceipt) {
            await tx.receipt.create({
              data: {
                receiptNumber,
                paymentId: paymentRecord.id,
                applicationId: app.id,
                studentId: app.userId,
                collegeId: app.collegeId,
                paidAmount: 0,
                paymentMethod: eligibility.isWithinFreeQuota ? 'FREE_QUOTA' : 'COUPON',
                transactionReference: effectiveTxnId,
                status: 'VALID',
                issuedAt: now,
                remarks: eligibility.isWithinFreeQuota
                  ? 'Zero rupee receipt issued under Free Applications Quota'
                  : `Zero rupee receipt issued under 100% coupon discount (${eligibility.appliedCoupon?.code || ''})`,
              },
            });
          }
        }

        // Update Application paymentStatus
        const updatedApp = await tx.application.update({
          where: { id: app.id },
          data: {
            paymentStatus: PaymentStatus.COMPLETED,
          },
        });

        await tx.applicationTimeline.create({
          data: {
            applicationId: app.id,
            userId: actorUser.id,
            action: 'APPLICATION_PAYMENT_COMPLETED',
            remarks: eligibility.isWithinFreeQuota
              ? `Application fee settled under Free Applications Quota (₹0)`
              : `Application fee waived with 100% coupon ${eligibility.appliedCoupon?.code || ''} (Receipt: ${receiptNumber}, ₹0)`,
          },
        });

        return { paymentRecord, updatedApp, receiptNumber, transactionId: effectiveTxnId };
      });

      if (this.consentService && paymentPolicies && paymentPolicies.length > 0) {
        await this.consentService.recordConsent(
          app.userId,
          {
            actionContext: 'PAYMENT',
            applicationId: app.id,
            paymentId: zeroSettlementResult.paymentRecord.id,
            acceptedPolicies: paymentPolicies,
          },
          { ipAddress: (actorUser as any)?.ipAddress },
        );
      }

      return {
        success: true,
        payableAmount: 0,
        baseFee: eligibility.baseFee,
        discount: eligibility.discountAmount,
        discountAmount: eligibility.discountAmount,
        isZeroAmount: true,
        isWithinFreeQuota: eligibility.isWithinFreeQuota,
        appliedCoupon: eligibility.appliedCoupon,
        applicationNumber: publicAppNum,
        currency: 'INR',
        beneficiary: 'Swayam Admission',
        beneficiaryType: 'SWAYAM',
        message: eligibility.message,
        receiptNumber: zeroSettlementResult.receiptNumber,
        paymentId: zeroSettlementResult.paymentRecord.id,
        paymentStatus: PaymentStatus.COMPLETED,
        transactionId: zeroSettlementResult.transactionId,
      };
    }

    // CASE C: > 0 Payable amount -> create official Razorpay order & set application status to PAYMENT_PENDING
    const authoritativePayableAmount = eligibility.finalPayableAmount;

    if (authoritativePayableAmount > 0) {
      if (dto.paymentTermsAccepted !== true || dto.paymentPrivacyAccepted !== true) {
        throw new BadRequestException(
          'Please accept the Payment Terms & Conditions and Privacy Policy before proceeding to payment.',
        );
      }
    }

    // Duplicate completed payment check
    const completedPayment = await this.prisma.payment.findFirst({
      where: {
        applicationId: app.id,
        userId: app.userId,
        paymentType: PaymentType.APPLICATION_FEE,
        status: PaymentStatus.COMPLETED,
      },
    });
    if (completedPayment) {
      throw new ConflictException('Payment for this application is already completed.');
    }

    const gatewayOrder = await this.paymentGatewayService.createOrder('razorpay', {
      amount: authoritativePayableAmount,
      currency: 'INR',
      receiptId: `RCP_APP_${app.id.slice(-8)}`,
      metadata: {
        applicationId: app.id,
        applicationNumber: publicAppNum,
        userId: app.userId,
        paymentType: 'APPLICATION_FEE',
        beneficiary: 'Swayam Admission',
      },
    });

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
          amount: eligibility.baseFee,
          discountAmount: eligibility.discountAmount,
          pendingAmount: authoritativePayableAmount,
          orderId: gatewayOrder.orderId,
          gatewayOrderId: gatewayOrder.orderId,
          paymentDestination: 'PLATFORM',
          paymentMode: 'GATEWAY',
          gateway: 'Razorpay',
          collegeId: app.collegeId,
          courseId: app.courseId,
          counselorId: app.counselorId || null,
          metadata: {
            couponCode: eligibility.appliedCoupon?.code || null,
            couponDiscount: eligibility.discountAmount,
            beneficiary: 'Swayam Admission',
            beneficiaryType: 'SWAYAM',
          },
          remarks: eligibility.appliedCoupon
            ? `Application fee ₹${authoritativePayableAmount} with coupon ${eligibility.appliedCoupon.code}`
            : `Application fee ₹${authoritativePayableAmount}`,
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
          paymentDestination: 'PLATFORM',
          paymentMode: 'GATEWAY',
          gateway: 'Razorpay',
          amount: eligibility.baseFee,
          discountAmount: eligibility.discountAmount,
          paidAmount: 0,
          pendingAmount: authoritativePayableAmount,
          orderId: gatewayOrder.orderId,
          gatewayOrderId: gatewayOrder.orderId,
          status: PaymentStatus.PENDING,
          verificationStatus: 'PENDING',
          metadata: {
            couponCode: eligibility.appliedCoupon?.code || null,
            couponDiscount: eligibility.discountAmount,
            beneficiary: 'Swayam Admission',
            beneficiaryType: 'SWAYAM',
          },
          remarks: eligibility.appliedCoupon
            ? `Application fee ₹${authoritativePayableAmount} with coupon ${eligibility.appliedCoupon.code}`
            : `Application fee ₹${authoritativePayableAmount}`,
        },
      });
    }

    // Preserve SUBMITTED (or higher) status; only set status to PAYMENT_PENDING if application was still a draft
    const targetStatus =
      app.status === ApplicationStatus.DRAFT ||
      app.status === ApplicationStatus.NEW ||
      app.status === ApplicationStatus.READY_TO_SUBMIT
        ? ApplicationStatus.PAYMENT_PENDING
        : app.status;

    await this.prisma.application.update({
      where: { id },
      data: {
        status: targetStatus,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    if (this.consentService && paymentPolicies && paymentPolicies.length > 0) {
      await this.consentService.recordConsent(
        app.userId,
        {
          actionContext: 'PAYMENT',
          applicationId: app.id,
          paymentId: paymentRecord.id,
          acceptedPolicies: paymentPolicies,
        },
        { ipAddress: (actorUser as any)?.ipAddress },
      );
    }

    await this.auditService.logAction({
      userId: actorUser.id,
      action: 'APPLICATION_PAYMENT_INITIATED',
      entity: 'Application',
      entityId: app.id,
      newValue: {
        orderId: gatewayOrder.orderId,
        payableAmount: authoritativePayableAmount,
        baseFee: eligibility.baseFee,
        discount: eligibility.discountAmount,
      },
    });

    const keyId =
      (gatewayOrder.metadata?.keyId as string) ||
      process.env.RAZORPAY_KEY_ID ||
      'rzp_test_placeholder';

    return {
      success: true,
      payableAmount: authoritativePayableAmount,
      baseFee: eligibility.baseFee,
      discount: eligibility.discountAmount,
      discountAmount: eligibility.discountAmount,
      isZeroAmount: false,
      isWithinFreeQuota: false,
      orderId: gatewayOrder.orderId,
      transactionId: gatewayOrder.orderId,
      paymentId: paymentRecord.id,
      keyId,
      currency: 'INR',
      beneficiary: 'Swayam Admission',
      beneficiaryType: 'SWAYAM',
      appliedCoupon: eligibility.appliedCoupon,
      applicationNumber: publicAppNum,
    };
  }

  /**
   * Authoritative Server-side Cryptographic Signature Verification & Application Payment Settlement
   */
  async verifyPayment(
    id: string,
    actorUser: IUser,
    dto: import('./dto/application-workflow.dto').VerifyApplicationPaymentDto,
  ) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true, mobile: true } },
        college: true,
        course: true,
      },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    // IDOR Protection: Student A cannot verify or access Student B's application payment
    const ctx = await this.dataScopeService.resolveDataScope(actorUser.id);
    this.dataScopeService.enforceApplicationScope(ctx, app);

    if (!dto.razorpayPaymentId || !dto.razorpaySignature) {
      throw new BadRequestException('Payment ID and Signature are required for verification.');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        applicationId: app.id,
        userId: app.userId,
        paymentType: PaymentType.APPLICATION_FEE,
        ...(dto.paymentId ? { id: dto.paymentId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new NotFoundException('Payment intent record not found for this application.');
    }

    // Idempotency check: if already completed, return existing receipt
    if (payment.status === PaymentStatus.COMPLETED) {
      return {
        success: true,
        status: 'COMPLETED',
        paymentId: payment.id,
        receiptNumber: payment.receiptNumber,
        transactionId: payment.transactionId || payment.gatewayTransactionId,
        amount: payment.paidAmount || payment.amount,
        alreadyCompleted: true,
        applicationId: app.id,
        applicationNumber: app.applicationNumber || app.applicationId,
      };
    }

    const orderIdToVerify = dto.razorpayOrderId || payment.gatewayOrderId || payment.orderId || '';

    // Authoritative Server-side Cryptographic Signature Verification
    const isSigValid = await this.paymentGatewayService.verifySignature('razorpay', {
      orderId: orderIdToVerify,
      paymentId: dto.razorpayPaymentId,
      signature: dto.razorpaySignature,
    });

    if (!isSigValid) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          remarks: 'Razorpay cryptographic signature verification failed.',
        },
      });

      await this.auditService.logAction({
        userId: actorUser.id,
        action: 'APPLICATION_PAYMENT_FAILED',
        entity: 'Payment',
        entityId: payment.id,
        newValue: { razorpayPaymentId: dto.razorpayPaymentId, reason: 'SIGNATURE_MISMATCH' },
      });

      throw new BadRequestException('Payment signature verification failed. Tampering detected.');
    }

    const now = new Date();
    const receiptNumber =
      payment.receiptNumber ||
      `REC-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const finalAmountPaid = payment.pendingAmount > 0 ? payment.pendingAmount : payment.amount;

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      // 1. Update Payment status to COMPLETED
      const p = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          paidAmount: finalAmountPaid,
          pendingAmount: 0,
          paidAt: now,
          transactionId: dto.razorpayPaymentId,
          gatewayTransactionId: dto.razorpayPaymentId,
          gatewaySignature: dto.razorpaySignature,
          verificationStatus: 'VERIFIED',
          verifiedAt: now,
          receiptNumber,
          remarks: 'Payment verified and captured via official Razorpay checkout.',
        },
      });

      // 2. Update Application paymentStatus
      await tx.application.update({
        where: { id: app.id },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
        },
      });

      // 2b. Canonical Receipt Record
      if (app.collegeId) {
        const existingReceipt = await tx.receipt.findFirst({
          where: {
            OR: [
              { paymentId: payment.id },
              { applicationId: app.id, status: 'VALID' },
            ],
          },
        });
        if (!existingReceipt) {
          await tx.receipt.create({
            data: {
              receiptNumber,
              paymentId: payment.id,
              applicationId: app.id,
              studentId: app.userId,
              collegeId: app.collegeId,
              paidAmount: finalAmountPaid,
              paymentMethod: 'RAZORPAY',
              transactionReference: dto.razorpayPaymentId,
              status: 'VALID',
              issuedAt: now,
              remarks: `Application fee receipt for ₹${finalAmountPaid}`,
            },
          });
        }
      }

      // 2c. Timeline entry for payment completion
      await tx.applicationTimeline.create({
        data: {
          applicationId: app.id,
          userId: actorUser.id,
          action: 'APPLICATION_PAYMENT_COMPLETED',
          remarks: `Application fee payment verified (Receipt: ${receiptNumber}, ₹${finalAmountPaid})`,
        },
      });

      // 3. Atomically consume coupon if recorded in payment metadata
      const couponCode = (payment.metadata as any)?.couponCode;
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode },
        });
        if (coupon) {
          await tx.couponRedemption.create({
            data: {
              couponId: coupon.id,
              userId: app.userId,
              transactionId: app.id,
              transactionType: 'APPLICATION_FEE',
              originalAmount: payment.amount,
              discountAmount: payment.discountAmount,
              finalAmount: finalAmountPaid,
              status: 'REDEEMED',
            },
          });
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { currentUsageCount: { increment: 1 } },
          });
        }
      }

      // 4. Financial Ledger Entry (Platform Revenue)
      try {
        await tx.financialLedger.create({
          data: {
            entryType: 'CREDIT',
            accountType: 'PLATFORM_REVENUE',
            amount: finalAmountPaid,
            description: `Application Fee captured via Razorpay for ${app.applicationNumber || app.applicationId}`,
            referenceNo: dto.razorpayPaymentId,
            paymentId: payment.id,
            createdById: actorUser.id,
          },
        });
      } catch (_err) {
        // Ledger table optional or logging
      }

      return p;
    });

    // 5. In-app Persistent Notification
    try {
      await this.notificationsService.createNotification({
        userId: app.userId,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.HIGH,
        title: 'Application Fee Paid',
        message: `Your application fee for application ${app.applicationNumber || app.applicationId} has been successfully received.`,
        relatedPaymentId: updatedPayment.id,
      });
    } catch (_e) {
      // Non-blocking notification
    }

    await this.auditService.logAction({
      userId: actorUser.id,
      action: 'APPLICATION_PAYMENT_VERIFIED',
      entity: 'Payment',
      entityId: updatedPayment.id,
      newValue: {
        applicationId: app.id,
        applicationNumber: app.applicationNumber || app.applicationId,
        transactionId: dto.razorpayPaymentId,
        amount: finalAmountPaid,
        receiptNumber,
      },
    });

    return {
      success: true,
      status: 'COMPLETED',
      paymentId: updatedPayment.id,
      receiptNumber,
      transactionId: dto.razorpayPaymentId,
      amount: finalAmountPaid,
      applicationId: app.id,
      applicationNumber: app.applicationNumber || app.applicationId,
      collegeName: app.college?.name,
      courseName: app.course?.name,
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
      const eligibility = await this.applicationFeeEligibilityService.getEligibility(
        app.userId,
        app.id,
      );
      const isFeeSettled =
        app.paymentStatus === PaymentStatus.COMPLETED ||
        eligibility.isAlreadyPaid ||
        eligibility.isZeroAmount;

      return {
        success: true,
        isExistingSubmission: true,
        message: isFeeSettled
          ? 'Application has already been submitted.'
          : 'Application has already been submitted. Please proceed to pay the application fee.',
        applicationNumber: app.applicationNumber || app.applicationId,
        submittedAt: app.submittedAt,
        status: app.status,
        paymentStatus: app.paymentStatus,
        paymentRequired: !isFeeSettled,
        payableAmount: isFeeSettled ? 0 : eligibility.finalPayableAmount,
        baseFee: eligibility.baseFee,
        isWithinFreeQuota: eligibility.isWithinFreeQuota,
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

    const incomingDec = dto.declaration || {
      privacyAccepted: dto.privacyPolicyAccepted ?? existingDec.privacyAccepted,
      termsAccepted: dto.termsAccepted ?? existingDec.termsAccepted,
      termsVersion: dto.termsVersion || existingDec.termsVersion || 'v2.0',
      privacyVersion: dto.policyVersion || existingDec.privacyVersion || 'v1.2',
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

    // Authoritative Action-Based Consent validation (Requirement 8 & 19)
    let appSubmissionPolicies = dto.acceptedPolicies;
    if (this.consentService) {
      if ((!appSubmissionPolicies || appSubmissionPolicies.length === 0) && declValidation.isValid) {
        const appReqs = await this.consentService.getActionRequirements('APPLICATION_SUBMISSION');
        appSubmissionPolicies = appReqs.policies.map((p) => ({
          policyId: p.id,
          policyType: p.policyType,
          policyVersion: p.version,
        }));
      }

      const appConsentValidation = await this.consentService.validateActionConsent(
        'APPLICATION_SUBMISSION',
        appSubmissionPolicies,
      );
      if (!appConsentValidation.isValid) {
        throw new BadRequestException({
          code: 'LEGAL_CONSENT_REQUIRED',
          message: `Application submission requires accepting mandatory legal policies: ${appConsentValidation.missingPolicies.join(', ')}`,
          missing: appConsentValidation.missingPolicies,
        });
      }
    }

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

    // Authoritative Eligibility & Fee Verification via ApplicationFeeEligibilityService
    const eligibility = await this.applicationFeeEligibilityService.getEligibility(
      app.userId,
      app.id,
      dto.couponCode,
    );

    const isWithinFreeQuota = eligibility.isWithinFreeQuota;
    const baseFee = eligibility.baseFee;
    const payableAmount = eligibility.finalPayableAmount;
    const appliedCoupon = eligibility.appliedCoupon;
    const isFeeSettled = eligibility.isZeroAmount || eligibility.isAlreadyPaid;
    const paymentRequired = !isFeeSettled;
    const targetPaymentStatus = isFeeSettled ? PaymentStatus.COMPLETED : PaymentStatus.PENDING;

    let publicAppNum = app.applicationNumber;
    if (!publicAppNum || publicAppNum.startsWith('SA-')) {
      publicAppNum = app.applicationId;
    }

    const now = new Date();
    const activeFormData: any = (app.formData as object) || {};

    // 5. Build Immutable Submitted Snapshot
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
        acceptedAt: now.toISOString(),
      },
      quota: {
        isFreeSubmission: isWithinFreeQuota,
        priorSubmissions: eligibility.freeApplicationsUsed,
        appliedCoupon,
        paymentRequired,
      },
    };

    const finalFormData = {
      ...updatedFormData,
      submittedSnapshot,
      lastSubmittedAt: now.toISOString(),
    };

    let receiptNumber = `REC-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const submittedApp = await this.prisma.$transaction(async (tx) => {
      // If coupon was applied and 100% discount, atomically record redemption
      if (appliedCoupon && appliedCoupon.id && isFeeSettled && payableAmount === 0) {
        await tx.couponRedemption.create({
          data: {
            couponId: appliedCoupon.id,
            userId: app.userId,
            transactionId: app.id,
            transactionType: 'APPLICATION_FEE',
            originalAmount: baseFee,
            discountAmount: appliedCoupon.discountAmount,
            finalAmount: appliedCoupon.finalAmount,
            status: 'REDEEMED',
          },
        });
        await tx.coupon.update({
          where: { id: appliedCoupon.id },
          data: { currentUsageCount: { increment: 1 } },
        });
      }

      // Check if existing payment record exists
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

      if (paymentRecord?.receiptNumber) {
        receiptNumber = paymentRecord.receiptNumber;
      }

      const effectiveTxnId =
        dto.paymentTransactionId ||
        paymentRecord?.transactionId ||
        (isWithinFreeQuota
          ? `TXN_FREE_${now.getTime()}_${app.id.slice(-6)}`
          : `TXN_SETTLED_${now.getTime()}_${app.id.slice(-6)}`);

      let payment: any = null;

      if (isFeeSettled) {
        // Fee waived or completed
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

        // Canonical receipt for zero-fee or settled submission
        const existingReceipt = await tx.receipt.findFirst({
          where: {
            OR: [
              { paymentId: payment.id },
              { applicationId: app.id, status: 'VALID' },
            ],
          },
        });

        if (!existingReceipt && app.collegeId) {
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
      } else {
        // Payment is required: update or create PENDING payment record
        if (paymentRecord) {
          payment = await tx.payment.update({
            where: { id: paymentRecord.id },
            data: {
              amount: baseFee,
              discountAmount: baseFee - payableAmount,
              paidAmount: 0,
              pendingAmount: payableAmount,
              status: PaymentStatus.PENDING,
              remarks: `Pending application fee payment of ₹${payableAmount}`,
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
              paidAmount: 0,
              pendingAmount: payableAmount,
              paymentType: PaymentType.APPLICATION_FEE,
              paymentMethod: PaymentMethod.UPI,
              status: PaymentStatus.PENDING,
              remarks: `Pending application fee payment of ₹${payableAmount}`,
            },
          });
        }
      }

      const updated = await tx.application.update({
        where: { id },
        data: {
          applicationNumber: publicAppNum,
          formData: finalFormData,
          status: 'SUBMITTED',
          paymentStatus: targetPaymentStatus,
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
          counselor: { select: { id: true, fullName: true, designation: true, avatar: true } },
        },
      });

      await tx.applicationTimeline.create({
        data: {
          applicationId: id,
          userId: actorUser.id,
          action: 'APPLICATION_SUBMITTED',
          oldStatus: app.status,
          newStatus: 'SUBMITTED',
          remarks: isFeeSettled
            ? `Application submitted successfully (${isWithinFreeQuota ? '3 Free Applications Quota' : 'Fee Settled'})`
            : `Application submitted successfully. Application fee payment of ₹${payableAmount} required.`,
        },
      });

      return updated;
    });

    if (this.consentService && appSubmissionPolicies && appSubmissionPolicies.length > 0) {
      await this.consentService.recordConsent(
        app.userId,
        {
          actionContext: 'APPLICATION_SUBMISSION',
          applicationId: app.id,
          acceptedPolicies: appSubmissionPolicies,
        },
        { ipAddress: (actorUser as any)?.ipAddress },
      );
    }

    // Real-time synchronization event
    this.liveSync.publishEvent(
      'application.submitted',
      {
        applicationId: id,
        applicationNumber: publicAppNum,
        userId: app.userId,
        status: 'SUBMITTED',
        paymentStatus: targetPaymentStatus,
        paymentRequired,
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
        paymentRequired,
        payableAmount,
      },
    });

    const userMessage = isFeeSettled
      ? isWithinFreeQuota
        ? 'Application submitted successfully. No application fee is required for this submission.'
        : 'Application submitted successfully.'
      : 'Application submitted successfully. Please proceed to pay the application fee.';

    // Post-Commit Notifications
    await this.notificationsService.createNotification({
      userId: app.userId,
      type: 'APPLICATION',
      title: 'Application Submitted! 🎉',
      message: isFeeSettled
        ? `Your application (${publicAppNum}) for ${app.college?.name} - ${app.course?.name} has been submitted successfully.`
        : `Your application (${publicAppNum}) for ${app.college?.name} - ${app.course?.name} has been submitted successfully. Please complete the application fee payment.`,
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
      message: userMessage,
      applicationNumber: publicAppNum,
      submittedAt: now,
      status: 'SUBMITTED',
      paymentStatus: targetPaymentStatus,
      paymentRequired,
      receiptNumber: isFeeSettled ? receiptNumber : null,
      payableAmount: isFeeSettled ? 0 : payableAmount,
      baseFee,
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

