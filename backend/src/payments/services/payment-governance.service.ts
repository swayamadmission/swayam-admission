import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { JourneyService } from '../../journey/journey.service';
import { DataScopeService } from '../../auth/data-scope.service';
import { IUser } from '../../auth/interfaces/user.interface';
import {
  CounselorCreatePaymentRequestDto,
  FinanceApprovePaymentRequestDto,
  FinanceRejectPaymentRequestDto,
  SeniorCounselorCollegeConfirmDto,
  StudentSubmitManualProofDto,
  FinanceVerifyPaymentFinalDto,
  PaymentDestinationType,
  PaymentMethodType,
} from '../dto/enterprise-payment.dto';

@Injectable()
export class PaymentGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly journeyService: JourneyService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  // ==========================================
  // 1. PAYMENT REQUEST SYSTEM
  // ==========================================
  async createPaymentRequest(createdById: string, dto: any) {
    const {
      studentId,
      applicationId,
      collegeId,
      courseId,
      feeHead,
      totalAmount: rawTotalAmount,
      requestedAmount: legacyAmount,
      discountType = 'NO_DISCOUNT',
      discountValue: rawDiscountValue = 0,
      scholarshipAmount: rawScholarship = 0,
      lateFeeAmount: rawLateFee = 0,
      dueDate,
      expiryDate,
      collegeBankId,
      accountCategory,
      assignedReviewerId,
      assignedRole,
      paymentDestination,
      installmentNumber,
      totalInstallments,
      remarks,
    } = dto;

    const totalAmount = Number(rawTotalAmount || legacyAmount || 0);
    if (!studentId) {
      throw new BadRequestException('Student selection is mandatory.');
    }
    if (!collegeId) {
      throw new BadRequestException('College selection is mandatory.');
    }
    if (!feeHead) {
      throw new BadRequestException('Fee head selection is mandatory.');
    }
    if (!dueDate) {
      throw new BadRequestException('Due date is mandatory.');
    }
    if (totalAmount <= 0) {
      throw new BadRequestException(
        'Total fee amount must be greater than zero.',
      );
    }

    // Server-side validation of student existence and identity
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        role: true,
      },
    });
    if (!student) {
      throw new BadRequestException(`Selected student ID ${studentId} does not exist.`);
    }

    // Server-side validation of college existence, active bank accounts, and routing policies
    const college = await this.prisma.college.findUnique({
      where: { id: collegeId },
      include: {
        bankAccounts: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!college) {
      throw new BadRequestException(`Selected college ID ${collegeId} does not exist.`);
    }

    // Authoritative resolution of payment destination based on College routing engine policy
    let resolvedPaymentDestination = 'PLATFORM';

    if (college.paymentMode === 'DIRECT_COLLEGE') {
      resolvedPaymentDestination = 'DIRECT_COLLEGE';
    } else if (college.paymentMode === 'PLATFORM') {
      resolvedPaymentDestination = 'PLATFORM';
    } else {
      // HYBRID routing mode (or default)
      let mapping: Record<string, string> = {};
      if (college.hybridFeeHeadMapping) {
        if (typeof college.hybridFeeHeadMapping === 'string') {
          try {
            mapping = JSON.parse(college.hybridFeeHeadMapping);
          } catch (e) {
            mapping = {};
          }
        } else if (typeof college.hybridFeeHeadMapping === 'object') {
          mapping = college.hybridFeeHeadMapping as Record<string, string>;
        }
      }

      if (mapping[feeHead]) {
        resolvedPaymentDestination =
          mapping[feeHead] === 'DIRECT_COLLEGE'
            ? 'DIRECT_COLLEGE'
            : 'PLATFORM';
      } else {
        const collegeFeeHeads = [
          'SEMESTER_FEE',
          'ADMISSION_FEE',
          'HOSTEL_FEE',
          'SECURITY_DEPOSIT',
          'TUITION_FEE',
        ];
        if (collegeFeeHeads.includes(feeHead)) {
          resolvedPaymentDestination = 'DIRECT_COLLEGE';
        } else {
          resolvedPaymentDestination = 'PLATFORM';
        }
      }
    }

    // For DIRECT_COLLEGE destination, enforce and link an active verified college bank account
    let resolvedBankId: string | null = null;
    if (resolvedPaymentDestination === 'DIRECT_COLLEGE') {
      if (collegeBankId) {
        const account = college.bankAccounts.find((b) => b.id === collegeBankId);
        if (!account) {
          throw new BadRequestException(
            'Selected college bank account is not valid or active for this college.',
          );
        }
        resolvedBankId = account.id;
      } else {
        if (college.bankAccounts.length === 0) {
          throw new BadRequestException(
            `College "${college.name}" does not have an active verified bank account for direct college payments. Please configure a college bank account first.`,
          );
        }
        resolvedBankId = college.bankAccounts[0].id;
      }
    } else {
      resolvedBankId = null;
    }

    const discountValue = Number(rawDiscountValue || 0);
    let discountAmount = 0;
    if (discountType === 'PERCENTAGE') {
      if (discountValue > 100) {
        throw new BadRequestException(
          'Percentage discount cannot exceed 100%.',
        );
      }
      discountAmount = (totalAmount * discountValue) / 100;
    } else if (discountType === 'FIXED') {
      discountAmount = discountValue;
    }

    if (discountAmount > totalAmount) {
      throw new BadRequestException(
        'Discount amount cannot exceed total fee amount.',
      );
    }

    const scholarshipAmount = Number(rawScholarship || 0);
    if (scholarshipAmount > totalAmount) {
      throw new BadRequestException(
        'Scholarship amount cannot exceed total fee amount.',
      );
    }

    const lateFeeAmount = Number(rawLateFee || 0);

    const finalPayableAmount = Math.max(
      0,
      totalAmount - discountAmount - scholarshipAmount + lateFeeAmount,
    );
    if (finalPayableAmount < 0) {
      throw new BadRequestException('Final payable amount cannot be negative.');
    }

    const count = await this.prisma.paymentRequest.count();
    const requestCode = `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const request = await this.prisma.paymentRequest.create({
      data: {
        requestCode,
        studentId,
        applicationId: applicationId || null,
        collegeId: collegeId || null,
        courseId: courseId || null,
        feeHead: feeHead || 'SEMESTER_FEE',
        totalAmount,
        discountType,
        discountValue,
        discountAmount,
        scholarshipAmount,
        lateFeeAmount,
        finalPayableAmount,
        requestedAmount: finalPayableAmount,
        dueAmount: finalPayableAmount,
        paidAmount: 0,
        dueDate: dueDate ? new Date(dueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        lateFee: lateFeeAmount,
        collegeBankId: resolvedBankId,
        accountCategory: accountCategory || 'ADMISSION',
        assignedReviewerId: assignedReviewerId || null,
        assignedRole: assignedRole || 'COUNSELOR',
        paymentDestination: resolvedPaymentDestination,
        installmentNumber: installmentNumber ? Number(installmentNumber) : 1,
        totalInstallments: totalInstallments ? Number(totalInstallments) : 1,
        remarks: remarks || null,
        createdById,
        status: 'PENDING',
      },
      include: {
        college: true,
        course: true,
        collegeBank: true,
        application: true,
        student: true,
      },
    });

    // Create Initial Financial Ledger Record
    try {
      await this.prisma.financialLedger.create({
        data: {
          entryType: 'DEBIT',
          accountType: 'STUDENT_RECEIVABLE',
          amount: finalPayableAmount,
          description: `Fee Payment Request ${requestCode} issued for ${feeHead}`,
          referenceNo: requestCode,
          createdById,
        },
      });
    } catch (ledgerErr) {
      console.warn('Ledger creation warning:', ledgerErr);
    }

    // Notifications Flow
    // 1. Notify Student
    try {
      const beneficiaryName =
        resolvedPaymentDestination === 'DIRECT_COLLEGE'
          ? college.name
          : 'Swayam Admission';
      await this.notificationsService.createNotification({
        userId: studentId,
        title: 'New Fee Payment Request Issued',
        message: `Payment Request ${requestCode} for ${feeHead} of ₹${finalPayableAmount.toLocaleString('en-IN')} has been issued. Payable to: ${beneficiaryName}. Due Date: ${dueDate ? new Date(dueDate).toLocaleDateString('en-IN') : 'N/A'}`,
        type: 'PAYMENT' as any,
        category: 'PAYMENT',
        actionUrl: '/dashboard',
      });
    } catch (notifErr) {
      console.warn('Student notification creation warning:', notifErr);
    }

    // 2. Notify Assigned Reviewer / Counselor if present
    if (assignedReviewerId) {
      try {
        await this.notificationsService.createNotification({
          userId: assignedReviewerId,
          title: 'Assigned Fee Payment Request Review',
          message: `You have been assigned as reviewer for Payment Request ${requestCode} (Student: ${request.student?.fullName || studentId}).`,
          type: 'PAYMENT' as any,
          category: 'PAYMENT',
          actionUrl: '/admin/payments',
        });
      } catch (reviewerNotifErr) {
        console.warn(
          'Reviewer notification creation warning:',
          reviewerNotifErr,
        );
      }
    }

    await this.auditService.logAction({
      action: 'PAYMENT_REQUEST_CREATED',
      module: 'PAYMENTS',
      description: `Payment request ${requestCode} issued for student ${studentId}. Gross: ₹${totalAmount}, Final: ₹${finalPayableAmount}`,
      userId: createdById,
      entityType: 'PaymentRequest',
      entityId: request.id,
    });

    return {
      success: true,
      message: 'Payment request generated and issued successfully',
      data: request,
    };
  }

  async getStudentPaymentContext(studentId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        role: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    const applications = await this.prisma.application.findMany({
      where: {
        userId: studentId,
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            paymentMode: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            totalFees: true,
          },
        },
        counselor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let colleges: any[] = [];
    if (applications.length > 0) {
      const collegeMap = new Map();
      applications.forEach((app: any) => {
        if (app.college && app.college.status !== 'ARCHIVED') {
          collegeMap.set(app.college.id, app.college);
        }
      });
      colleges = Array.from(collegeMap.values());
    }

    if (colleges.length === 0) {
      colleges = await this.prisma.college.findMany({
        where: { status: { not: 'ARCHIVED' } },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          paymentMode: true,
        },
        orderBy: { name: 'asc' },
      });
    }

    const feeHeads = await this.prisma.feeHead
      .findMany({
        where: { isActive: true },
      })
      .catch(() => []);

    const primaryApp = applications[0] || null;

    return {
      success: true,
      data: {
        student,
        applications,
        colleges,
        primaryApplicationId: primaryApp?.id || null,
        primaryCollegeId: primaryApp?.collegeId || colleges[0]?.id || null,
        primaryCourseId: primaryApp?.courseId || null,
        primaryCounselorId: primaryApp?.counselorId || null,
        feeHeads,
      },
    };
  }

  async getStudentPaymentRequests(studentId: string) {
    const studentApps = await this.prisma.application.findMany({
      where: { userId: studentId },
      select: { id: true },
    });
    const appIds = studentApps.map((a) => a.id);

    const requests = await this.prisma.paymentRequest.findMany({
      where: {
        OR: [{ studentId }, { applicationId: { in: appIds } }],
      },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            logo: true,
            paymentMode: true,
            bankAccounts: {
              where: { isActive: true },
              orderBy: { isDefault: 'desc' },
            },
          },
        },
        course: { select: { id: true, name: true } },
        collegeBank: true,
        application: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          include: {
            verifications: true,
            timelineEvents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = requests.map((req) => {
      const isDirectCollege = req.paymentDestination === 'DIRECT_COLLEGE';
      const beneficiary = isDirectCollege
        ? req.college?.name || 'College'
        : 'Swayam Admission';
      const beneficiaryType = isDirectCollege ? 'COLLEGE' : 'SWAYAM';
      const couponApplicable = !isDirectCollege;
      const paymentMethodLabel = isDirectCollege
        ? 'Direct College Bank'
        : 'Online Payment (Razorpay)';

      return {
        ...req,
        beneficiary,
        beneficiaryType,
        couponApplicable,
        paymentMethodLabel,
        isDirectCollege,
      };
    });

    return { success: true, data: enriched };
  }

  async getPaymentRequestById(id: string, user: IUser) {
    const request = await this.prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            logo: true,
            paymentMode: true,
            bankAccounts: {
              where: { isActive: true },
              orderBy: { isDefault: 'desc' },
            },
          },
        },
        course: { select: { id: true, name: true } },
        collegeBank: true,
        application: true,
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: {
            verifications: true,
            timelineEvents: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Payment request ${id} not found.`);
    }

    // Strict student isolation: Student A cannot access Student B's payment request
    if (user.role === 'STUDENT' && request.studentId !== user.id) {
      throw new ForbiddenException(
        'You are not authorized to access this payment request.',
      );
    }

    const isDirectCollege = request.paymentDestination === 'DIRECT_COLLEGE';
    const beneficiary = isDirectCollege
      ? request.college?.name || 'Partner College'
      : 'Swayam Admission';
    const beneficiaryType = isDirectCollege ? 'COLLEGE' : 'SWAYAM';
    const couponApplicable = !isDirectCollege;
    const paymentMethodLabel = isDirectCollege
      ? 'Direct College Bank'
      : 'Online Payment (Razorpay)';

    return {
      success: true,
      data: {
        ...request,
        beneficiary,
        beneficiaryType,
        couponApplicable,
        paymentMethodLabel,
        isDirectCollege,
      },
    };
  }

  // ==========================================
  // 2. COLLEGE PAYMENT CONFIG & RULES
  // ==========================================
  async getCollegePaymentConfig(collegeId: string) {
    const college = await this.prisma.college.findUnique({
      where: { id: collegeId },
      include: {
        bankAccounts: {
          where: { isActive: true },
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    if (!college) {
      throw new NotFoundException(`College with ID ${collegeId} not found.`);
    }

    const approvalFlow = college.approvalFlowConfig || [
      'COUNSELOR',
      'ACCOUNTS_MANAGER',
      'DIRECTOR',
    ];
    const verificationRules = college.verificationRules || {
      utrRequired: false,
      screenshotRequired: true,
      amountEditable: false,
      manualVerify: true,
      autoVerify: false,
      receiptAutoGenerate: true,
      invoiceAutoGenerate: true,
    };
    const platformGateways = college.platformGateways || {
      razorpay: true,
      phonepe: true,
      cashfree: false,
      stripe: false,
      paytm: false,
    };
    const hybridFeeHeadMapping = college.hybridFeeHeadMapping || {
      REGISTRATION_FEE: 'PLATFORM',
      COUNSELING_FEE: 'PLATFORM',
      ADMISSION_FEE: 'DIRECT_COLLEGE',
      SEMESTER_FEE: 'DIRECT_COLLEGE',
      HOSTEL_FEE: 'DIRECT_COLLEGE',
      TRANSPORT_FEE: 'PLATFORM',
      EXAMINATION_FEE: 'PLATFORM',
      SECURITY_DEPOSIT: 'DIRECT_COLLEGE',
    };
    const paymentRules = college.paymentRules || {
      minAmount: 100,
      maxAmount: 1000000,
      allowPartial: true,
      allowInstallments: true,
      lateFeePerDay: 100,
      gracePeriodDays: 5,
      autoExpireDays: 30,
    };

    return {
      success: true,
      data: {
        collegeId: college.id,
        collegeName: college.name,
        paymentMode: college.paymentMode || 'HYBRID',
        receiptPrefix: college.receiptPrefix || 'SA-REC',
        invoicePrefix: college.invoicePrefix || 'SA-INV',
        approvalFlow,
        verificationRules,
        platformGateways,
        hybridFeeHeadMapping,
        paymentRules,
        bankAccounts: college.bankAccounts,
      },
    };
  }

  async updateCollegePaymentConfig(
    collegeId: string,
    adminUserId: string,
    dto: any,
  ) {
    const {
      paymentMode,
      approvalFlowConfig,
      verificationRules,
      receiptPrefix,
      invoicePrefix,
      platformGateways,
      hybridFeeHeadMapping,
      paymentRules,
    } = dto;

    const college = await this.prisma.college.update({
      where: { id: collegeId },
      data: {
        ...(paymentMode && { paymentMode }),
        ...(approvalFlowConfig && { approvalFlowConfig }),
        ...(verificationRules && { verificationRules }),
        ...(receiptPrefix && { receiptPrefix }),
        ...(invoicePrefix && { invoicePrefix }),
        ...(platformGateways && { platformGateways }),
        ...(hybridFeeHeadMapping && { hybridFeeHeadMapping }),
        ...(paymentRules && { paymentRules }),
      },
    });

    await this.auditService.logAction({
      action: 'COLLEGE_PAYMENT_CONFIG_UPDATED',
      module: 'PAYMENTS',
      description: `Payment governance config updated for college ${college.name}`,
      userId: adminUserId,
      entityType: 'College',
      entityId: college.id,
    });

    return {
      success: true,
      message: 'College payment governance updated successfully',
      data: college,
    };
  }

  async recordTermsAcceptance(
    userId: string,
    dto: {
      paymentRequestId?: string;
      paymentId?: string;
      acceptedTerms: boolean;
    },
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!dto.acceptedTerms) {
      throw new BadRequestException(
        'You must accept the Terms & Conditions to proceed.',
      );
    }

    const acceptance = await this.prisma.paymentTermsAcceptance.create({
      data: {
        userId,
        paymentRequestId: dto.paymentRequestId || null,
        paymentId: dto.paymentId || null,
        acceptedTerms: true,
        acceptedAt: new Date(),
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'Browser',
        device: 'Web Client',
      },
    });

    if (dto.paymentRequestId) {
      await this.prisma.paymentRequest.update({
        where: { id: dto.paymentRequestId },
        data: {
          acceptedTerms: true,
          acceptedAt: new Date(),
          acceptedIp: ipAddress || '127.0.0.1',
          acceptedUserAgent: userAgent || 'Browser',
        },
      });
    }

    await this.auditService.logAction({
      action: 'PAYMENT_TERMS_ACCEPTED',
      module: 'PAYMENTS',
      description: `User ${userId} accepted payment terms & conditions for request ${dto.paymentRequestId || dto.paymentId || 'General'}`,
      userId,
      entityType: 'PaymentTermsAcceptance',
      entityId: acceptance.id,
    });

    return {
      success: true,
      message: 'Terms & Conditions accepted successfully',
      data: acceptance,
    };
  }

  // ==========================================
  // 3. TIMELINE & FINANCIAL LEDGER
  // ==========================================
  async recordTimelineEvent(
    paymentId: string,
    userId: string | null,
    userRole: string | null,
    event: string,
    title: string,
    description?: string,
    ipAddress?: string,
    metadata?: any,
  ) {
    return this.prisma.paymentTimelineEvent.create({
      data: {
        paymentId,
        userId: userId || null,
        userRole: userRole || 'SYSTEM',
        event,
        title,
        description: description || null,
        ipAddress: ipAddress || null,
        metadata: metadata || {},
      },
    });
  }

  async createLedgerEntry(
    paymentId: string | null,
    entryType: 'DEBIT' | 'CREDIT',
    accountType: string,
    amount: number,
    description: string,
    referenceNo?: string,
    createdById?: string,
  ) {
    return this.prisma.financialLedger.create({
      data: {
        paymentId: paymentId || null,
        entryType,
        accountType,
        amount: Number(amount),
        description,
        referenceNo: referenceNo || null,
        createdById: createdById || null,
      },
    });
  }

  async getPaymentTimeline(paymentId: string) {
    const events = await this.prisma.paymentTimelineEvent.findMany({
      where: { paymentId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            role: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, data: events };
  }

  // ==========================================
  // 4. MULTI-LEVEL VERIFICATION QUEUE & ACTIONS
  // ==========================================
  async getVerificationQueue(userRole: string, userId: string, query: any) {
    const { status, collegeId, search } = query || {};

    const whereClause: any = {};

    if (status) {
      whereClause.verificationStatus = status;
    } else {
      whereClause.verificationStatus = {
        in: [
          'PENDING',
          'PROOF_UPLOADED',
          'UNDER_VERIFICATION',
          'UTR_REQUESTED',
          'REUPLOAD_REQUESTED',
        ],
      };
    }

    if (collegeId) {
      whereClause.collegeId = collegeId;
    }

    if (search) {
      whereClause.OR = [
        { transactionId: { contains: search, mode: 'insensitive' } },
        { utrNumber: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Role-based scoping if COUNSELOR or SENIOR_COUNSELOR
    if (userRole === 'COUNSELOR') {
      whereClause.OR = [
        { counselorId: userId },
        { application: { counselorId: userId } },
      ];
    }

    const payments = await this.prisma.payment.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
        college: {
          select: {
            id: true,
            name: true,
            logo: true,
            receiptPrefix: true,
            invoicePrefix: true,
          },
        },
        course: { select: { id: true, name: true } },
        application: {
          select: { id: true, applicationId: true, status: true },
        },
        request: true,
        counselor: { select: { id: true, fullName: true } },
        verifier: { select: { id: true, fullName: true, role: true } },
        verifications: {
          include: {
            reviewer: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        timelineEvents: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return { success: true, count: payments.length, data: payments };
  }

  async verifyPaymentStep(
    reviewerId: string,
    reviewerRole: string,
    dto: any,
    ipAddress?: string,
  ) {
    const { paymentId, action, remarks, requestedUTR } = dto;

    if (!paymentId || !action) {
      throw new BadRequestException('paymentId and action are required.');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        college: true,
        user: true,
        application: true,
        request: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record ${paymentId} not found.`);
    }

    const approvalChain: string[] = (payment.approvalFlow as string[]) ||
      (payment.college?.approvalFlowConfig as string[]) || [
        'COUNSELOR',
        'ACCOUNTS_MANAGER',
        'DIRECTOR',
      ];

    let newStatus = payment.verificationStatus;
    let newStage = payment.approvalStage || 'COUNSELOR_REVIEW';
    let newLevel = payment.currentApprovalLevel || 1;
    let isFullyApproved = false;

    if (action === 'REQUEST_UTR') {
      newStatus = 'UTR_REQUESTED';
      await this.prisma.paymentVerification.create({
        data: {
          paymentId,
          reviewerId,
          reviewerRole,
          action: 'REQUEST_UTR',
          stage: newStage,
          remarks:
            remarks ||
            'Please provide UTR / Bank Reference Number for transaction verification.',
          requestedUTR: true,
        },
      });

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          verificationStatus: 'UTR_REQUESTED',
          verificationRemarks: remarks || 'UTR Requested',
          requestedUtrAt: new Date(),
        },
      });

      await this.recordTimelineEvent(
        paymentId,
        reviewerId,
        reviewerRole,
        'UTR_REQUESTED',
        'UTR / Reference Number Requested',
        remarks ||
          'Reviewer requested 12-digit UTR/Reference number from student.',
        ipAddress,
      );

      await this.notificationsService.createNotification({
        userId: payment.userId,
        title: 'UTR / Bank Reference Number Required',
        message: `Accounts team requested UTR reference for your payment of ₹${payment.paidAmount || payment.amount}. Please enter it in your dashboard.`,
        type: 'PAYMENT' as any,
        category: 'PAYMENT',
        relatedPaymentId: paymentId,
        actionUrl: '/dashboard',
      });

      return {
        success: true,
        message: 'UTR request sent to student successfully.',
      };
    }

    if (action === 'REQUEST_REUPLOAD') {
      newStatus = 'REUPLOAD_REQUESTED';
      await this.prisma.paymentVerification.create({
        data: {
          paymentId,
          reviewerId,
          reviewerRole,
          action: 'REQUEST_REUPLOAD',
          stage: newStage,
          remarks:
            remarks ||
            'Payment proof unclear or invalid. Please re-upload proof screenshot.',
        },
      });

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          verificationStatus: 'REUPLOAD_REQUESTED',
          rejectedReason: remarks || 'Re-upload requested',
          reuploadRequestedAt: new Date(),
        },
      });

      await this.recordTimelineEvent(
        paymentId,
        reviewerId,
        reviewerRole,
        'REUPLOAD_REQUESTED',
        'Payment Proof Re-upload Requested',
        remarks || 'Reviewer requested updated payment receipt document.',
        ipAddress,
      );

      await this.notificationsService.createNotification({
        userId: payment.userId,
        title: 'Updated Payment Proof Requested',
        message: `Please re-upload payment screenshot: ${remarks || 'Unclear document'}`,
        type: 'PAYMENT' as any,
        category: 'PAYMENT',
        relatedPaymentId: paymentId,
        actionUrl: '/dashboard',
      });

      return { success: true, message: 'Re-upload request sent to student.' };
    }

    if (action === 'REJECT') {
      if (!remarks) {
        throw new BadRequestException('Rejection reason is mandatory.');
      }
      await this.prisma.paymentVerification.create({
        data: {
          paymentId,
          reviewerId,
          reviewerRole,
          action: 'REJECT',
          stage: newStage,
          remarks,
        },
      });

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          verificationStatus: 'REJECTED',
          status: 'FAILED',
          rejectedReason: remarks,
          verifiedBy: reviewerId,
          verifiedRole: reviewerRole,
          verifiedAt: new Date(),
        },
      });

      await this.recordTimelineEvent(
        paymentId,
        reviewerId,
        reviewerRole,
        'REJECTED',
        'Payment Proof Rejected',
        `Reason: ${remarks}`,
        ipAddress,
      );

      await this.notificationsService.createNotification({
        userId: payment.userId,
        title: 'Payment Verification Rejected',
        message: `Your payment verification was rejected. Reason: ${remarks}`,
        type: 'PAYMENT' as any,
        category: 'PAYMENT',
        relatedPaymentId: paymentId,
        actionUrl: '/dashboard',
      });

      return { success: true, message: 'Payment rejected.' };
    }

    if (
      action === 'APPROVE' ||
      action === 'RECOMMEND_APPROVAL' ||
      action === 'OVERRIDE'
    ) {
      const isSuperAdminOrDirector =
        reviewerRole === 'SUPER_ADMIN' ||
        reviewerRole === 'DIRECTOR' ||
        reviewerRole === 'ADMIN';

      if (isSuperAdminOrDirector || newLevel >= approvalChain.length) {
        isFullyApproved = true;
      } else {
        newLevel += 1;
        newStage = `${approvalChain[newLevel - 1]}_REVIEW`;
      }

      await this.prisma.paymentVerification.create({
        data: {
          paymentId,
          reviewerId,
          reviewerRole,
          action: isFullyApproved ? 'APPROVE' : 'RECOMMEND_APPROVAL',
          stage: newStage,
          remarks: remarks || 'Step approval granted',
        },
      });

      if (isFullyApproved) {
        const count = await this.prisma.payment.count({
          where: { status: 'COMPLETED' },
        });
        const receiptPrefix = payment.college?.receiptPrefix || 'SA-REC';
        const invoicePrefix = payment.college?.invoicePrefix || 'SA-INV';
        const receiptNumber = `${receiptPrefix}-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
        const invoiceNumber = `${invoicePrefix}-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

        await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            verificationStatus: 'VERIFIED',
            status: 'COMPLETED',
            approvalStage: 'APPROVED',
            receiptNumber,
            invoiceNumber,
            verifiedBy: reviewerId,
            verifiedRole: reviewerRole,
            verifiedAt: new Date(),
            internalRemarks: remarks || 'Fully verified and approved',
          },
        });

        // Update Payment Request if linked
        if (payment.requestId) {
          const req = await this.prisma.paymentRequest.findUnique({
            where: { id: payment.requestId },
          });
          if (req) {
            const newPaid =
              req.paidAmount + (payment.paidAmount || payment.amount);
            const newDue = Math.max(0, req.requestedAmount - newPaid);
            await this.prisma.paymentRequest.update({
              where: { id: payment.requestId },
              data: {
                paidAmount: newPaid,
                dueAmount: newDue,
                status: newDue <= 0 ? 'PAID' : 'PARTIALLY_PAID',
              },
            });
          }
        }

        // Ledger Entry
        await this.createLedgerEntry(
          paymentId,
          'CREDIT',
          'BANK',
          payment.paidAmount || payment.amount,
          `Verified fee payment from ${payment.user.fullName}`,
          payment.utrNumber || payment.receiptNumber || paymentId,
          reviewerId,
        );

        // Timeline Event
        await this.recordTimelineEvent(
          paymentId,
          reviewerId,
          reviewerRole,
          'VERIFIED',
          'Payment Verified & Cleared',
          `Full approval granted by ${reviewerRole}. Receipt ${receiptNumber} generated.`,
          ipAddress,
        );

        // Sync Application & Journey
        if (payment.applicationId) {
          await this.prisma.application.update({
            where: { id: payment.applicationId },
            data: {
              paymentStatus: PaymentStatus.COMPLETED,
              status: 'ADMISSION_CONFIRMED',
            },
          });
        }

        await this.notificationsService.createNotification({
          userId: payment.userId,
          title: 'Payment Verified & Receipt Ready',
          message: `Your payment of ₹${(payment.paidAmount || payment.amount).toLocaleString()} has been verified! Receipt ${receiptNumber} is now available for download.`,
          type: 'PAYMENT' as any,
          category: 'PAYMENT',
          relatedPaymentId: paymentId,
          actionUrl: '/dashboard',
        });

        return {
          success: true,
          message: 'Payment fully approved, verified, and receipt generated.',
          receiptNumber,
          invoiceNumber,
        };
      } else {
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            currentApprovalLevel: newLevel,
            approvalStage: newStage,
            verificationStatus: 'UNDER_VERIFICATION',
            internalRemarks:
              remarks ||
              `Approved by ${reviewerRole}, forwarded to ${newStage}`,
          },
        });

        await this.recordTimelineEvent(
          paymentId,
          reviewerId,
          reviewerRole,
          'RECOMMEND_APPROVAL',
          `Approved by ${reviewerRole}`,
          `Approved at level ${newLevel - 1}. Forwarded to ${newStage}.`,
          ipAddress,
        );

        return {
          success: true,
          message: `Payment step approved by ${reviewerRole}. Moved to ${newStage}.`,
        };
      }
    }

    throw new BadRequestException('Invalid verification action.');
  }

  async submitRequestedUtr(
    paymentId: string,
    studentId: string,
    utrNumber: string,
    ipAddress?: string,
  ) {
    if (!utrNumber) {
      throw new BadRequestException('UTR / Reference Number is required.');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.userId !== studentId) {
      throw new ForbiddenException(
        'You are not authorized to update this payment.',
      );
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        utrNumber,
        verificationStatus: 'UNDER_VERIFICATION',
        verificationRemarks:
          'UTR submitted by student. Awaiting reviewer audit.',
      },
    });

    await this.prisma.paymentVerification.create({
      data: {
        paymentId,
        reviewerId: studentId,
        reviewerRole: 'STUDENT',
        action: 'SUBMIT_UTR',
        stage: payment.approvalStage || 'COUNSELOR_REVIEW',
        remarks: `Student submitted UTR: ${utrNumber}`,
      },
    });

    await this.recordTimelineEvent(
      paymentId,
      studentId,
      'STUDENT',
      'UTR_SUBMITTED',
      'UTR / Reference Number Submitted',
      `Student provided UTR reference number: ${utrNumber}`,
      ipAddress,
    );

    return {
      success: true,
      message: 'UTR reference submitted successfully. Verification resumed.',
      data: updated,
    };
  }

  // ==========================================
  // 5. GOVERNANCE LIVE KPIS
  // ==========================================
  async getGovernanceKpis() {
    const totalRevenueRes = await this.prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { paidAmount: true, amount: true },
    });

    const platformRevenueRes = await this.prisma.payment.aggregate({
      where: { status: 'COMPLETED', paymentDestination: 'PLATFORM' },
      _sum: { paidAmount: true, amount: true },
    });

    const collegeRevenueRes = await this.prisma.payment.aggregate({
      where: { status: 'COMPLETED', paymentDestination: 'DIRECT_COLLEGE' },
      _sum: { paidAmount: true, amount: true },
    });

    const pendingVerificationCount = await this.prisma.payment.count({
      where: {
        verificationStatus: {
          in: [
            'PENDING',
            'PROOF_UPLOADED',
            'UNDER_VERIFICATION',
            'UTR_REQUESTED',
          ],
        },
      },
    });

    const pendingApprovalCount = await this.prisma.payment.count({
      where: { status: 'PENDING', verificationStatus: 'UNDER_VERIFICATION' },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCollectionsRes = await this.prisma.payment.aggregate({
      where: { status: 'COMPLETED', verifiedAt: { gte: todayStart } },
      _sum: { paidAmount: true, amount: true },
    });

    const successfulTransactionsCount = await this.prisma.payment.count({
      where: { status: 'COMPLETED' },
    });

    return {
      success: true,
      data: {
        totalRevenue:
          totalRevenueRes._sum.paidAmount || totalRevenueRes._sum.amount || 0,
        platformRevenue:
          platformRevenueRes._sum.paidAmount ||
          platformRevenueRes._sum.amount ||
          0,
        collegeRevenue:
          collegeRevenueRes._sum.paidAmount ||
          collegeRevenueRes._sum.amount ||
          0,
        pendingVerification: pendingVerificationCount,
        pendingApproval: pendingApprovalCount,
        todayCollections:
          todayCollectionsRes._sum.paidAmount ||
          todayCollectionsRes._sum.amount ||
          0,
        successfulTransactions: successfulTransactionsCount,
      },
    };
  }

  // ==========================================
  // 6. FEE HEAD MANAGEMENT
  // ==========================================
  async createFeeHead(createdById: string, dto: any) {
    const {
      name,
      code,
      description,
      defaultAmount,
      isMandatory,
      applicableCollegeId,
      applicableCourseId,
      applicableBatch,
      scholarshipEligible,
      lateFeeAmount,
      dueDate,
      installmentsAllowed,
    } = dto;

    if (!name || !code) {
      throw new BadRequestException('Fee head name and code are required.');
    }

    const feeHead = await this.prisma.feeHead.create({
      data: {
        name,
        code: code.toUpperCase().replace(/\s+/g, '_'),
        description: description || null,
        defaultAmount: Number(defaultAmount || 0),
        isMandatory: isMandatory !== undefined ? Boolean(isMandatory) : true,
        applicableCollegeId: applicableCollegeId || null,
        applicableCourseId: applicableCourseId || null,
        applicableBatch: applicableBatch || null,
        scholarshipEligible: Boolean(scholarshipEligible),
        lateFeeAmount: Number(lateFeeAmount || 0),
        dueDate: dueDate ? new Date(dueDate) : null,
        installmentsAllowed:
          installmentsAllowed !== undefined
            ? Boolean(installmentsAllowed)
            : true,
      },
    });

    await this.auditService.logAction({
      action: 'FEE_HEAD_CREATED',
      module: 'PAYMENTS',
      description: `Fee head ${name} (${code}) created`,
      userId: createdById,
      entityType: 'FeeHead',
      entityId: feeHead.id,
    });

    return {
      success: true,
      message: 'Fee head created successfully',
      data: feeHead,
    };
  }

  async getFeeHeads(query?: any) {
    const { collegeId, courseId, activeOnly } = query || {};
    const where: any = {};

    if (activeOnly !== 'false') {
      where.isActive = true;
    }

    if (collegeId) {
      where.OR = [
        { applicableCollegeId: collegeId },
        { applicableCollegeId: null },
      ];
    }

    if (courseId) {
      where.OR = [
        { applicableCourseId: courseId },
        { applicableCourseId: null },
      ];
    }

    const heads = await this.prisma.feeHead.findMany({
      where,
      include: {
        applicableCollege: { select: { id: true, name: true } },
        applicableCourse: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, count: heads.length, data: heads };
  }

  async updateFeeHead(id: string, adminId: string, dto: any) {
    const feeHead = await this.prisma.feeHead.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.code && { code: dto.code.toUpperCase().replace(/\s+/g, '_') }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.defaultAmount !== undefined && {
          defaultAmount: Number(dto.defaultAmount),
        }),
        ...(dto.isMandatory !== undefined && {
          isMandatory: Boolean(dto.isMandatory),
        }),
        ...(dto.applicableCollegeId !== undefined && {
          applicableCollegeId: dto.applicableCollegeId,
        }),
        ...(dto.applicableCourseId !== undefined && {
          applicableCourseId: dto.applicableCourseId,
        }),
        ...(dto.applicableBatch !== undefined && {
          applicableBatch: dto.applicableBatch,
        }),
        ...(dto.scholarshipEligible !== undefined && {
          scholarshipEligible: Boolean(dto.scholarshipEligible),
        }),
        ...(dto.lateFeeAmount !== undefined && {
          lateFeeAmount: Number(dto.lateFeeAmount),
        }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.installmentsAllowed !== undefined && {
          installmentsAllowed: Boolean(dto.installmentsAllowed),
        }),
        ...(dto.isActive !== undefined && { isActive: Boolean(dto.isActive) }),
      },
    });

    await this.auditService.logAction({
      action: 'FEE_HEAD_UPDATED',
      module: 'PAYMENTS',
      description: `Fee head ${feeHead.name} updated`,
      userId: adminId,
      entityType: 'FeeHead',
      entityId: id,
    });

    return {
      success: true,
      message: 'Fee head updated successfully',
      data: feeHead,
    };
  }

  async deleteFeeHead(id: string, adminId: string) {
    const feeHead = await this.prisma.feeHead.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.logAction({
      action: 'FEE_HEAD_DEACTIVATED',
      module: 'PAYMENTS',
      description: `Fee head ${feeHead.name} deactivated`,
      userId: adminId,
      entityType: 'FeeHead',
      entityId: id,
    });

    return { success: true, message: 'Fee head deactivated successfully' };
  }

  // ==========================================
  // 7. FRAUD ALERTS & SLA BREACHES
  // ==========================================
  async getSlaBreaches() {
    const now = new Date();
    const breaches = await this.prisma.payment.findMany({
      where: {
        slaDeadline: { lt: now },
        verificationStatus: {
          in: [
            'PENDING',
            'PROOF_UPLOADED',
            'UNDER_VERIFICATION',
            'UTR_REQUESTED',
          ],
        },
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
        college: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        request: true,
      },
      orderBy: { slaDeadline: 'asc' },
    });

    return { success: true, count: breaches.length, data: breaches };
  }

  async getFraudAlerts() {
    const alerts = await this.prisma.payment.findMany({
      where: {
        OR: [
          { isFlaggedFraud: true },
          { verificationStatus: 'REVIEW_REQUIRED' },
          { verificationStatus: 'FRAUD_FLAGGED' },
        ],
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
        college: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        request: true,
        verifications: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return { success: true, count: alerts.length, data: alerts };
  }

  async assignVerificationReviewer(
    paymentId: string,
    adminId: string,
    dto: { reviewerId?: string; reviewerRole?: string; remarks?: string },
  ) {
    const { reviewerId, reviewerRole, remarks } = dto;

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });
    if (!payment)
      throw new NotFoundException(`Payment ${paymentId} not found.`);

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        ...(reviewerId && { verifiedBy: reviewerId }),
        ...(reviewerRole && { verifiedRole: reviewerRole }),
        internalRemarks:
          remarks || `Reviewer assigned: ${reviewerRole || reviewerId}`,
      },
    });

    await this.recordTimelineEvent(
      paymentId,
      adminId,
      'ADMIN',
      'REVIEWER_ASSIGNED',
      'Reviewer Assigned',
      `Assigned to ${reviewerRole || 'Reviewer'} (${reviewerId || 'Role based'})`,
    );

    await this.auditService.logAction({
      action: 'REVIEWER_ASSIGNED',
      module: 'PAYMENTS',
      description: `Reviewer ${reviewerRole || reviewerId} assigned to payment ${paymentId}`,
      userId: adminId,
      entityType: 'Payment',
      entityId: paymentId,
    });

    // Notify the assigned reviewer
    if (reviewerId) {
      await this.notificationsService.createNotification({
        userId: reviewerId,
        title: 'Payment Verification Assigned to You',
        message: `You have been assigned to verify payment of ₹${(payment.paidAmount || payment.amount).toLocaleString()} for student ${payment.user?.fullName || 'Student'}. ${remarks || ''}`,
        type: 'PAYMENT' as any,
        category: 'PAYMENT',
        relatedPaymentId: paymentId,
        actionUrl: '/payments',
      });
    }

    return {
      success: true,
      message: 'Payment verification reviewer assigned successfully',
      data: updated,
    };
  }

  // ==========================================
  // 8. ADMIN PAYMENT REQUEST MANAGEMENT
  // ==========================================
  async getPaymentRequestsAdmin(query: any) {
    const {
      skip = 0,
      limit = 50,
      status,
      collegeId,
      studentId,
      feeHead,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query || {};

    const where: any = {};

    if (status) where.status = status;
    if (collegeId) where.collegeId = collegeId;
    if (studentId) where.studentId = studentId;
    if (feeHead) where.feeHead = feeHead;

    if (search) {
      where.OR = [
        { requestCode: { contains: search, mode: 'insensitive' } },
        { student: { fullName: { contains: search, mode: 'insensitive' } } },
        { student: { email: { contains: search, mode: 'insensitive' } } },
        { college: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.paymentRequest.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          student: {
            select: { id: true, fullName: true, email: true, mobile: true },
          },
          college: { select: { id: true, name: true, logo: true } },
          course: { select: { id: true, name: true } },
          collegeBank: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              status: true,
              paidAmount: true,
              verificationStatus: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.paymentRequest.count({ where }),
    ]);

    return {
      success: true,
      data,
      total,
      page: Math.floor(Number(skip) / Number(limit)) + 1,
      limit: Number(limit),
    };
  }

  async updatePaymentRequest(id: string, adminId: string, dto: any) {
    const request = await this.prisma.paymentRequest.findUnique({
      where: { id },
    });
    if (!request)
      throw new NotFoundException(`Payment request ${id} not found.`);

    const updateData: any = {};
    if (dto.dueAmount !== undefined)
      updateData.dueAmount = Number(dto.dueAmount);
    if (dto.requestedAmount !== undefined)
      updateData.requestedAmount = Number(dto.requestedAmount);
    if (dto.dueDate !== undefined)
      updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.expiryDate !== undefined)
      updateData.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    if (dto.lateFee !== undefined) updateData.lateFee = Number(dto.lateFee);
    if (dto.assignedReviewerId !== undefined)
      updateData.assignedReviewerId = dto.assignedReviewerId;
    if (dto.assignedRole !== undefined)
      updateData.assignedRole = dto.assignedRole;
    if (dto.paymentDestination !== undefined)
      updateData.paymentDestination = dto.paymentDestination;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.remarks !== undefined) updateData.remarks = dto.remarks;
    if (dto.feeHead !== undefined) updateData.feeHead = dto.feeHead;
    if (dto.collegeBankId !== undefined)
      updateData.collegeBankId = dto.collegeBankId;

    const updated = await this.prisma.paymentRequest.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { id: true, fullName: true } },
        college: true,
        course: true,
      },
    });

    await this.auditService.logAction({
      action: 'PAYMENT_REQUEST_UPDATED',
      module: 'PAYMENTS',
      description: `Payment request ${request.requestCode} updated`,
      userId: adminId,
      entityType: 'PaymentRequest',
      entityId: id,
    });

    // Notify student of request changes
    await this.notificationsService.createNotification({
      userId: request.studentId,
      title: 'Payment Request Updated',
      message: `Your payment request ${request.requestCode} has been updated. Please check your dashboard.`,
      type: 'PAYMENT' as any,
      category: 'PAYMENT',
      actionUrl: '/dashboard',
    });

    return {
      success: true,
      message: 'Payment request updated successfully',
      data: updated,
    };
  }

  async batchCreatePaymentRequests(adminId: string, requests: any[]) {
    const results: {
      success: boolean;
      requestCode?: string;
      error?: string;
    }[] = [];

    for (const dto of requests) {
      try {
        const result = await this.createPaymentRequest(adminId, dto);
        results.push({ success: true, requestCode: result.data?.requestCode });
      } catch (err: any) {
        results.push({
          success: false,
          error: err.message || 'Failed to create request',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: true,
      message: `Batch complete: ${successCount} created, ${failCount} failed`,
      total: requests.length,
      successCount,
      failCount,
      results,
    };
  }

  // ==========================================
  // 9. UNIFIED ADMIN DASHBOARD KPIs
  // ==========================================
  async getAdminDashboardKpis() {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedStatuses = ['COMPLETED', 'SUCCESS'];
    const pendingStatuses = [
      'PENDING',
      'INITIATED',
      'PROCESSING',
      'VERIFICATION_PENDING',
    ];

    const [
      totalRevenueAgg,
      todayRevenueAgg,
      monthlyRevenueAgg,
      pendingCount,
      successCount,
      failedCount,
      refundedCount,
      outstandingAgg,
      avgPaymentAgg,
      platformRevenueAgg,
      collegeRevenueAgg,
      pendingVerificationCount,
      approvedCount,
      rejectedCount,
      fraudAlertCount,
      slaBreachCount,
      totalRequestsCount,
      pendingRequestsCount,
      overdueRequestsCount,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { deletedAt: null, status: { in: completedStatuses as any } },
        _sum: { paidAmount: true, amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          deletedAt: null,
          status: { in: completedStatuses as any },
          paidAt: { gte: startOfToday },
        },
        _sum: { paidAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          deletedAt: null,
          status: { in: completedStatuses as any },
          paidAt: { gte: startOfMonth },
        },
        _sum: { paidAmount: true },
      }),
      this.prisma.payment.count({
        where: { deletedAt: null, status: { in: pendingStatuses as any } },
      }),
      this.prisma.payment.count({
        where: { deletedAt: null, status: { in: completedStatuses as any } },
      }),
      this.prisma.payment.count({
        where: {
          deletedAt: null,
          status: { in: ['FAILED', 'CANCELLED'] as any },
        },
      }),
      this.prisma.payment.count({
        where: { deletedAt: null, status: 'REFUNDED' as any },
      }),
      this.prisma.payment.aggregate({
        where: { deletedAt: null, status: { in: pendingStatuses as any } },
        _sum: { pendingAmount: true, amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { deletedAt: null, status: { in: completedStatuses as any } },
        _avg: { paidAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          deletedAt: null,
          status: { in: completedStatuses as any },
          paymentDestination: 'PLATFORM',
        },
        _sum: { paidAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          deletedAt: null,
          status: { in: completedStatuses as any },
          paymentDestination: 'DIRECT_COLLEGE',
        },
        _sum: { paidAmount: true },
      }),
      this.prisma.payment.count({
        where: {
          deletedAt: null,
          verificationStatus: {
            in: [
              'PENDING',
              'PROOF_UPLOADED',
              'UNDER_VERIFICATION',
              'UTR_REQUESTED',
            ],
          },
        },
      }),
      this.prisma.payment.count({
        where: { deletedAt: null, verificationStatus: 'VERIFIED' },
      }),
      this.prisma.payment.count({
        where: { deletedAt: null, verificationStatus: 'REJECTED' },
      }),
      this.prisma.payment.count({
        where: { deletedAt: null, isFlaggedFraud: true },
      }),
      this.prisma.payment.count({
        where: {
          deletedAt: null,
          slaDeadline: { lt: now },
          verificationStatus: {
            in: [
              'PENDING',
              'PROOF_UPLOADED',
              'UNDER_VERIFICATION',
              'UTR_REQUESTED',
            ],
          },
        },
      }),
      this.prisma.paymentRequest.count(),
      this.prisma.paymentRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.paymentRequest.count({
        where: { status: 'PENDING', dueDate: { lt: now } },
      }),
    ]);

    const totalRevenue =
      totalRevenueAgg._sum.paidAmount || totalRevenueAgg._sum.amount || 0;
    const outstandingFees =
      outstandingAgg._sum.pendingAmount || outstandingAgg._sum.amount || 0;
    const totalCalculated = totalRevenue + outstandingFees;
    const collectionRate =
      totalCalculated > 0
        ? Math.round((totalRevenue / totalCalculated) * 100)
        : 100;
    const totalVerified = approvedCount + rejectedCount;
    const approvalRate =
      totalVerified > 0
        ? Math.round((approvedCount / totalVerified) * 100)
        : 100;
    const rejectionRate =
      totalVerified > 0 ? Math.round((rejectedCount / totalVerified) * 100) : 0;

    return {
      success: true,
      data: {
        totalRevenue,
        todayRevenue: todayRevenueAgg._sum.paidAmount || 0,
        monthlyRevenue: monthlyRevenueAgg._sum.paidAmount || 0,
        pendingPayments: pendingCount,
        successfulPayments: successCount,
        failedPayments: failedCount,
        refundedPayments: refundedCount,
        outstandingFees,
        collectionRate,
        averagePaymentValue: Math.round(avgPaymentAgg._avg.paidAmount || 0),
        platformRevenue: platformRevenueAgg._sum.paidAmount || 0,
        directCollegeRevenue: collegeRevenueAgg._sum.paidAmount || 0,
        pendingVerification: pendingVerificationCount,
        approvedPayments: approvedCount,
        rejectedPayments: rejectedCount,
        fraudAlerts: fraudAlertCount,
        slaBreaches: slaBreachCount,
        approvalRate,
        rejectionRate,
        totalRequests: totalRequestsCount,
        pendingRequests: pendingRequestsCount,
        overdueRequests: overdueRequestsCount,
      },
    };
  }

  // ==========================================
  // ENTERPRISE PAYMENT & FINANCE WORKFLOW METHODS
  // ==========================================

  /**
   * 1. COUNSELOR PAYMENT REQUEST (Application-Scoped)
   */
  async counselorCreateRequest(
    counselorUser: IUser,
    dto: CounselorCreatePaymentRequestDto,
  ) {
    const app = await this.prisma.application.findUnique({
      where: { id: dto.applicationId },
      include: {
        college: true,
        course: true,
        branch: true,
        user: true,
      },
    });

    if (!app) {
      throw new NotFoundException(`Application ${dto.applicationId} not found`);
    }

    if (app.status !== 'APPROVED') {
      throw new BadRequestException(
        'Payment request can only be issued for Admission Approved applications.',
      );
    }

    const existingActive = await this.prisma.paymentRequest.findFirst({
      where: {
        applicationId: dto.applicationId,
        feeHead: dto.feeHead as any,
        status: { in: ['PENDING', 'FINANCE_REVIEW', 'PAYMENT_PENDING', 'VERIFICATION_PENDING'] },
      },
    });

    if (existingActive) {
      throw new ConflictException(
        `An active payment request (${existingActive.requestCode}) already exists for this application and fee head.`,
      );
    }

    const count = await this.prisma.paymentRequest.count();
    const requestCode = `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const totalAmount = Number(dto.totalAmount || 0);
    if (totalAmount <= 0) {
      throw new BadRequestException('Total fee amount must be greater than zero.');
    }

    const discountValue = Number(dto.discountValue || 0);
    let discountAmount = 0;
    if (dto.discountType === 'PERCENTAGE') {
      discountAmount = (totalAmount * Math.min(100, discountValue)) / 100;
    } else if (dto.discountType === 'FIXED') {
      discountAmount = Math.min(totalAmount, discountValue);
    }

    const scholarshipAmount = Math.min(totalAmount, Number(dto.scholarshipAmount || 0));
    const finalPayableAmount = Math.max(0, totalAmount - discountAmount - scholarshipAmount);

    const request = await this.prisma.paymentRequest.create({
      data: {
        requestCode,
        applicationId: dto.applicationId,
        studentId: dto.studentId || app.userId,
        collegeId: dto.collegeId || app.collegeId,
        courseId: dto.courseId || app.courseId,
        feeHead: (dto.feeHead as any) || 'REGISTRATION_FEE',
        totalAmount,
        discountType: dto.discountType || 'NO_DISCOUNT',
        discountValue,
        discountAmount,
        scholarshipAmount,
        finalPayableAmount,
        requestedAmount: finalPayableAmount,
        dueAmount: finalPayableAmount,
        paidAmount: 0,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        paymentDestination: 'PENDING_FINANCE_SELECTION',
        remarks: dto.notes || null,
        createdById: counselorUser.id,
        status: 'FINANCE_REVIEW',
      },
      include: {
        college: true,
        course: true,
        application: true,
        student: true,
      },
    });

    await this.auditService.logAction({
      action: 'PAYMENT_REQUEST_CREATED',
      entity: 'PaymentRequest',
      entityId: request.id,
      description: `Payment request ${requestCode} issued by Counselor ${counselorUser.fullName || counselorUser.id} for Application ${app.applicationNumber || app.id}`,
      userId: counselorUser.id,
      metadata: { applicationId: app.id, amount: finalPayableAmount, feeHead: dto.feeHead },
    });

    try {
      await this.notificationsService.createNotification({
        userId: app.userId,
        title: 'Fee Payment Request Issued',
        message: `Your counselor has requested fee payment for ${app.college?.name} (${dto.feeHead}) of ₹${finalPayableAmount.toLocaleString('en-IN')}. Pending Finance Review.`,
        type: 'APPLICATION' as any,
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: 'Payment request submitted to Finance for destination review',
      data: request,
    };
  }

  /**
   * 2. FINANCE QUEUE (Segmented by status and data scope)
   */
  async getFinanceQueue(user: IUser, query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const tab = query.tab || 'all';

    const where: any = {};

    if (tab === 'pending_review') {
      where.status = { in: ['FINANCE_REVIEW', 'PENDING'] };
    } else if (tab === 'payment_pending') {
      where.status = 'PAYMENT_PENDING';
    } else if (tab === 'verification_pending') {
      where.status = 'VERIFICATION_PENDING';
    } else if (tab === 'college_confirmation_pending') {
      where.status = 'COLLEGE_CONFIRMATION_PENDING';
    } else if (tab === 'completed') {
      where.status = 'COMPLETED';
    } else if (tab === 'rejected') {
      where.status = 'REJECTED';
    }

    if (query.destination) {
      where.paymentDestination = query.destination;
    }

    if (query.collegeId) {
      where.collegeId = query.collegeId;
    }

    if (query.search) {
      where.OR = [
        { requestCode: { contains: query.search, mode: 'insensitive' } },
        { student: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { student: { mobile: { contains: query.search, mode: 'insensitive' } } },
        { college: { name: { contains: query.search, mode: 'insensitive' } } },
        { application: { applicationNumber: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total, counts] = await Promise.all([
      this.prisma.paymentRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, fullName: true, email: true, mobile: true } },
          college: { select: { id: true, name: true, city: true, state: true } },
          course: { select: { id: true, name: true, level: true } },
          application: {
            select: {
              id: true,
              applicationNumber: true,
              status: true,
              paymentStatus: true,
              counselor: { select: { id: true, fullName: true, email: true } },
            },
          },
          collegeBank: true,
          allocations: {
            include: {
              collegeBank: true,
              confirmationToken: true,
              verifiedBy: { select: { id: true, fullName: true } },
            },
          },
          confirmationTokens: {
            include: {
              seniorCounselor: { select: { id: true, fullName: true, email: true } },
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              verifier: { select: { id: true, fullName: true } },
            },
          },
          approvedBy: { select: { id: true, fullName: true } },
          rejectedBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.paymentRequest.count({ where }),
      this.prisma.paymentRequest.groupBy({
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
          pendingReview: (statusCounts['FINANCE_REVIEW'] || 0) + (statusCounts['PENDING'] || 0),
          paymentPending: statusCounts['PAYMENT_PENDING'] || 0,
          verificationPending: statusCounts['VERIFICATION_PENDING'] || 0,
          collegeConfirmationPending: statusCounts['COLLEGE_CONFIRMATION_PENDING'] || 0,
          completed: statusCounts['COMPLETED'] || 0,
          rejected: statusCounts['REJECTED'] || 0,
        },
      },
    };
  }

  /**
   * 3. FINANCE APPROVE REQUEST & CONFIGURE DESTINATION
   */
  async financeApproveRequest(
    financeUser: IUser,
    requestId: string,
    dto: FinanceApprovePaymentRequestDto,
  ) {
    const request = await this.prisma.paymentRequest.findUnique({
      where: { id: requestId },
      include: { application: true, college: true, student: true },
    });

    if (!request) {
      throw new NotFoundException(`Payment request ${requestId} not found`);
    }

    if (request.status === 'PAYMENT_PENDING' || request.status === 'COMPLETED') {
      return { success: true, message: 'Payment request is already approved', data: request };
    }

    if (dto.paymentDestination === PaymentDestinationType.DIRECT_COLLEGE) {
      if (dto.collegeBankId) {
        const bank = await this.prisma.collegeBankAccount.findFirst({
          where: { id: dto.collegeBankId, collegeId: request.collegeId || undefined, isActive: true },
        });
        if (!bank) {
          throw new BadRequestException('Selected college bank/UPI destination is invalid or inactive.');
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.paymentDestination === PaymentDestinationType.HYBRID && dto.allocations?.length) {
        await tx.paymentAllocation.deleteMany({
          where: { paymentRequestId: requestId },
        });

        for (const alloc of dto.allocations) {
          await tx.paymentAllocation.create({
            data: {
              paymentRequestId: requestId,
              destinationType: alloc.destinationType,
              destinationEntity: alloc.destinationEntity || (alloc.destinationType === 'PLATFORM' ? 'Swayam Admission Platform' : request.college?.name),
              amount: Number(alloc.amount || 0),
              paymentMethod: alloc.paymentMethod || 'GATEWAY',
              collegeBankId: alloc.collegeBankId || null,
              status: 'PENDING',
              remarks: alloc.remarks || null,
            },
          });
        }
      }

      return tx.paymentRequest.update({
        where: { id: requestId },
        data: {
          status: 'PAYMENT_PENDING',
          paymentDestination: dto.paymentDestination,
          approvedPaymentMethod: dto.approvedPaymentMethod || 'GATEWAY',
          collegeBankId: dto.collegeBankId || request.collegeBankId,
          approvedAt: new Date(),
          approvedById: financeUser.id,
          financeReviewNotes: dto.financeReviewNotes || null,
        },
        include: {
          allocations: true,
          college: true,
          course: true,
          collegeBank: true,
          student: true,
        },
      });
    });

    await this.auditService.logAction({
      action: 'PAYMENT_REQUEST_APPROVED',
      entity: 'PaymentRequest',
      entityId: requestId,
      description: `Payment request ${request.requestCode} approved by Finance. Destination: ${dto.paymentDestination}`,
      userId: financeUser.id,
      metadata: { destination: dto.paymentDestination, method: dto.approvedPaymentMethod },
    });

    try {
      await this.notificationsService.createNotification({
        userId: request.studentId,
        title: 'Payment Instructions Ready',
        message: `Your payment request ${request.requestCode} has been approved by Finance (${dto.paymentDestination}). You can now make the payment.`,
        type: 'APPLICATION' as any,
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: 'Payment request approved and instructions issued to student',
      data: updated,
    };
  }

  /**
   * 4. FINANCE REJECT REQUEST
   */
  async financeRejectRequest(
    financeUser: IUser,
    requestId: string,
    dto: FinanceRejectPaymentRequestDto,
  ) {
    const request = await this.prisma.paymentRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Payment request ${requestId} not found`);
    }

    const updated = await this.prisma.paymentRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedById: financeUser.id,
        rejectionReason: dto.reason,
      },
    });

    await this.auditService.logAction({
      action: 'PAYMENT_REQUEST_REJECTED',
      entity: 'PaymentRequest',
      entityId: requestId,
      description: `Payment request ${request.requestCode} rejected by Finance. Reason: ${dto.reason}`,
      userId: financeUser.id,
      metadata: { reason: dto.reason },
    });

    return {
      success: true,
      message: 'Payment request rejected',
      data: updated,
    };
  }

  /**
   * 5. STUDENT SUBMIT MANUAL PROOF (Direct College or College Allocation)
   */
  async studentSubmitManualProof(
    studentUser: IUser,
    dto: StudentSubmitManualProofDto,
  ) {
    const request = await this.prisma.paymentRequest.findUnique({
      where: { id: dto.paymentRequestId },
      include: { application: true, college: true },
    });

    if (!request) {
      throw new NotFoundException(`Payment request ${dto.paymentRequestId} not found`);
    }

    if (request.studentId !== studentUser.id && studentUser.role === 'STUDENT') {
      throw new ForbiddenException('You are not authorized to submit proof for this payment request.');
    }

    const duplicateUtr = await this.prisma.payment.findFirst({
      where: {
        utrNumber: dto.utrNumber.trim(),
        status: 'COMPLETED',
        NOT: { requestId: dto.paymentRequestId },
      },
    });

    if (duplicateUtr) {
      throw new ConflictException('This UTR number has already been verified against another completed payment.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextStatus =
        request.paymentDestination === 'DIRECT_COLLEGE'
          ? 'COLLEGE_CONFIRMATION_PENDING'
          : 'VERIFICATION_PENDING';

      const updatedReq = await tx.paymentRequest.update({
        where: { id: dto.paymentRequestId },
        data: {
          status: nextStatus,
        },
      });

      let payment = await tx.payment.findFirst({
        where: { requestId: dto.paymentRequestId },
      });

      if (payment) {
        payment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            utrNumber: dto.utrNumber.trim(),
            paymentProofUrl: dto.proofUrl || dto.proofDocument || null,
            proofDocument: dto.proofUrl || dto.proofDocument || null,
            paidAmount: Number(dto.paidAmount || request.finalPayableAmount),
            paymentMethod: (dto.paymentMethod as any) || 'UPI',
            verificationStatus: 'PENDING',
            proofUploadedAt: new Date(),
            remarks: dto.remarks || null,
          },
        });
      } else {
        payment = await tx.payment.create({
          data: {
            userId: request.studentId,
            applicationId: request.applicationId,
            collegeId: request.collegeId,
            courseId: request.courseId,
            requestId: request.id,
            amount: request.finalPayableAmount,
            paidAmount: Number(dto.paidAmount || request.finalPayableAmount),
            utrNumber: dto.utrNumber.trim(),
            paymentProofUrl: dto.proofUrl || dto.proofDocument || null,
            proofDocument: dto.proofUrl || dto.proofDocument || null,
            paymentMethod: (dto.paymentMethod as any) || 'UPI',
            paymentDestination: request.paymentDestination,
            status: 'PENDING',
            verificationStatus: 'PENDING',
            proofUploadedAt: new Date(),
            remarks: dto.remarks || null,
          },
        });
      }

      if (dto.paymentAllocationId) {
        await tx.paymentAllocation.update({
          where: { id: dto.paymentAllocationId },
          data: {
            utrNumber: dto.utrNumber.trim(),
            proofUrl: dto.proofUrl || dto.proofDocument || null,
            status: 'VERIFICATION_PENDING',
            remarks: dto.remarks || null,
          },
        });
      }

      await tx.paymentTimelineEvent.create({
        data: {
          paymentId: payment.id,
          userId: studentUser.id,
          userRole: studentUser.role,
          event: 'PAYMENT_PROOF_SUBMITTED',
          title: 'Payment Proof Uploaded',
          description: `UTR: ${dto.utrNumber}, Amount: ₹${dto.paidAmount}`,
        },
      });

      return { request: updatedReq, payment };
    });

    await this.auditService.logAction({
      action: 'PAYMENT_PROOF_UPLOADED',
      entity: 'PaymentRequest',
      entityId: dto.paymentRequestId,
      description: `Payment proof submitted by Student ${studentUser.fullName || studentUser.id} with UTR ${dto.utrNumber}`,
      userId: studentUser.id,
      metadata: { utr: dto.utrNumber, amount: dto.paidAmount },
    });

    return {
      success: true,
      message: 'Payment proof submitted successfully for verification',
      data: updated,
    };
  }

  /**
   * 6. SENIOR COUNSELOR COLLEGE CONFIRMATION (Generates Immutable Token)
   */
  async seniorCounselorCollegeConfirm(
    seniorCounselorUser: IUser,
    dto: SeniorCounselorCollegeConfirmDto,
  ) {
    const request = await this.prisma.paymentRequest.findUnique({
      where: { id: dto.paymentRequestId },
      include: { application: true, college: true, student: true },
    });

    if (!request) {
      throw new NotFoundException(`Payment request ${dto.paymentRequestId} not found`);
    }

    const tokenCount = await this.prisma.collegeConfirmationToken.count();
    const tokenNumber = `CCT-${new Date().getFullYear()}-${String(tokenCount + 1).padStart(8, '0')}`;

    const token = await this.prisma.$transaction(async (tx) => {
      const createdToken = await tx.collegeConfirmationToken.create({
        data: {
          tokenNumber,
          paymentRequestId: dto.paymentRequestId,
          paymentId: dto.paymentId || null,
          paymentAllocationId: dto.paymentAllocationId || null,
          applicationId: request.applicationId,
          studentId: request.studentId,
          collegeId: request.collegeId || '',
          seniorCounselorId: seniorCounselorUser.id,
          seniorCounselorPosition: (seniorCounselorUser as any).position?.title || 'Senior Counselor',
          seniorCounselorEmail: seniorCounselorUser.email,
          confirmationMethod: dto.confirmationMethod || 'COLLEGE_PORTAL_VERIFIED',
          collegeContactPerson: dto.collegeContactPerson || null,
          collegeContactPhone: dto.collegeContactPhone || null,
          collegeReferenceNumber: dto.collegeReferenceNumber || null,
          remarks: dto.remarks || null,
          confirmedAt: new Date(),
        },
      });

      await tx.paymentRequest.update({
        where: { id: dto.paymentRequestId },
        data: {
          status: 'VERIFICATION_PENDING',
        },
      });

      if (dto.paymentAllocationId) {
        await tx.paymentAllocation.update({
          where: { id: dto.paymentAllocationId },
          data: {
            confirmationTokenId: createdToken.id,
            status: 'VERIFICATION_PENDING',
          },
        });
      }

      if (dto.paymentId) {
        await tx.payment.update({
          where: { id: dto.paymentId },
          data: {
            confirmationTokenId: createdToken.id,
          },
        });
      }

      return createdToken;
    });

    await this.auditService.logAction({
      action: 'COLLEGE_PAYMENT_CONFIRMED',
      entity: 'CollegeConfirmationToken',
      entityId: token.id,
      description: `College receipt confirmed by Senior Counselor ${seniorCounselorUser.fullName || seniorCounselorUser.id}. Token: ${tokenNumber}`,
      userId: seniorCounselorUser.id,
      metadata: { tokenNumber, method: dto.confirmationMethod, college: request.college?.name },
    });

    return {
      success: true,
      message: 'College payment confirmed and Confirmation Token generated successfully',
      data: token,
    };
  }

  /**
   * 7. FINANCE VERIFY PAYMENT FINAL (Receipt + Ledger + Application Payment Completion)
   */
  async financeVerifyPaymentFinal(
    financeUser: IUser,
    requestId: string,
    dto: FinanceVerifyPaymentFinalDto,
  ) {
    const request = await this.prisma.paymentRequest.findUnique({
      where: { id: requestId },
      include: {
        application: true,
        college: true,
        course: true,
        student: true,
        allocations: true,
        confirmationTokens: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!request) {
      throw new NotFoundException(`Payment request ${requestId} not found`);
    }

    if (dto.action === 'REQUEST_REUPLOAD') {
      const updated = await this.prisma.paymentRequest.update({
        where: { id: requestId },
        data: {
          status: 'PAYMENT_PENDING',
          financeReviewNotes: dto.remarks || 'Proof re-upload requested by Finance.',
        },
      });

      await this.auditService.logAction({
        action: 'PAYMENT_PROOF_REQUESTED',
        entity: 'PaymentRequest',
        entityId: requestId,
        description: `Finance requested proof re-upload for ${request.requestCode}. Notes: ${dto.remarks}`,
        userId: financeUser.id,
      });

      try {
        await this.notificationsService.createNotification({
          userId: request.studentId,
          title: 'Payment Proof Needs Re-upload',
          message: `Finance has requested a re-upload of your payment proof for ${request.requestCode}. Reason: ${dto.remarks || 'Insufficient/unclear document'}`,
          type: 'APPLICATION' as any,
        });
      } catch {
        // Non-blocking
      }

      return {
        success: true,
        message: 'Re-upload request sent to student',
        data: updated,
      };
    }

    if (dto.action === 'REJECT') {
      const updated = await this.prisma.paymentRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectedById: financeUser.id,
          rejectionReason: dto.rejectionReason || dto.remarks || 'Payment verification rejected by Finance.',
        },
      });

      await this.auditService.logAction({
        action: 'PAYMENT_REJECTED',
        entity: 'PaymentRequest',
        entityId: requestId,
        description: `Finance rejected payment for ${request.requestCode}`,
        userId: financeUser.id,
        metadata: { reason: dto.rejectionReason },
      });

      return {
        success: true,
        message: 'Payment verification rejected',
        data: updated,
      };
    }

    // VERIFY ACTION
    const receiptCount = await this.prisma.payment.count({ where: { status: 'COMPLETED' } });
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(receiptCount + 1).padStart(7, '0')}`;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedReq = await tx.paymentRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          paidAmount: request.finalPayableAmount,
          dueAmount: 0,
        },
      });

      let payment = request.payments[0];
      if (payment) {
        payment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            verificationStatus: 'VERIFIED',
            paidAmount: request.finalPayableAmount,
            receiptNumber,
            paidAt: new Date(),
            verifiedAt: new Date(),
            verifiedBy: financeUser.id,
            verifiedRole: 'FINANCE',
          },
        });
      } else {
        payment = await tx.payment.create({
          data: {
            userId: request.studentId,
            applicationId: request.applicationId,
            collegeId: request.collegeId,
            courseId: request.courseId,
            requestId: request.id,
            amount: request.finalPayableAmount,
            paidAmount: request.finalPayableAmount,
            receiptNumber,
            status: PaymentStatus.COMPLETED,
            verificationStatus: 'VERIFIED',
            paidAt: new Date(),
            verifiedAt: new Date(),
            verifiedBy: financeUser.id,
            verifiedRole: 'FINANCE',
            paymentDestination: request.paymentDestination,
          },
        });
      }

      await tx.financialLedger.create({
        data: {
          paymentId: payment.id,
          entryType: 'CREDIT',
          accountType: 'STUDENT_RECEIVABLE',
          amount: request.finalPayableAmount,
          description: `Payment Verified & Settled for ${request.requestCode} - Receipt: ${receiptNumber}`,
          referenceNo: receiptNumber,
          createdById: financeUser.id,
        },
      });

      if (request.applicationId) {
        await tx.application.update({
          where: { id: request.applicationId },
          data: {
            paymentStatus: PaymentStatus.COMPLETED,
          },
        });
      }

      if (dto.paymentAllocationId) {
        await tx.paymentAllocation.update({
          where: { id: dto.paymentAllocationId },
          data: {
            status: 'VERIFIED',
            verifiedAt: new Date(),
            verifiedById: financeUser.id,
          },
        });
      }

      return { request: updatedReq, payment, receiptNumber };
    });

    await this.auditService.logAction({
      action: 'PAYMENT_VERIFIED',
      entity: 'Payment',
      entityId: updated.payment.id,
      description: `Payment verified by Finance ${financeUser.fullName || financeUser.id} for ${request.requestCode}. Receipt: ${receiptNumber}`,
      userId: financeUser.id,
      metadata: { receiptNumber, amount: request.finalPayableAmount },
    });

    try {
      await this.notificationsService.createNotification({
        userId: request.studentId,
        title: 'Payment Verified & Receipt Generated',
        message: `Congratulations! Your payment for ${request.college?.name} has been verified by Finance. Official Receipt ${receiptNumber} has been generated.`,
        type: 'APPLICATION' as any,
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: 'Payment verified, receipt generated, and ledger posted successfully',
      data: updated,
    };
  }

  /**
   * 8. AUTHORIZED ADMISSION CONFIRMATION (Handoff after financial requirements are satisfied)
   */
  async confirmAdmissionFinal(actorUser: IUser, applicationId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        college: true,
        course: true,
        user: true,
        payments: { where: { status: 'COMPLETED' } },
      },
    });

    if (!app) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    if (app.paymentStatus !== 'COMPLETED' && (!app.payments || app.payments.length === 0)) {
      throw new BadRequestException('Admission cannot be confirmed before fee payment is verified and completed.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedApp = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: 'ADMISSION_CONFIRMED',
        },
      });

      await tx.applicationTimeline.create({
        data: {
          applicationId,
          userId: actorUser.id,
          action: 'ADMISSION_CONFIRMED',
          oldStatus: app.status,
          newStatus: 'ADMISSION_CONFIRMED',
          remarks: `Admission confirmed by ${actorUser.fullName || actorUser.email}`,
        },
      });

      return updatedApp;
    });

    await this.auditService.logAction({
      action: 'ADMISSION_CONFIRMED',
      entity: 'Application',
      entityId: applicationId,
      description: `Admission confirmed for Application ${app.applicationNumber || applicationId} (${app.user?.fullName})`,
      userId: actorUser.id,
      metadata: { targetUserId: app.userId, collegeId: app.collegeId },
    });

    try {
      await this.notificationsService.createNotification({
        userId: app.userId,
        title: '🎉 Admission Confirmed!',
        message: `Heartiest Congratulations! Your admission to ${app.college?.name} - ${app.course?.name} is officially CONFIRMED.`,
        type: 'APPLICATION' as any,
      });
      if (app.counselorId) {
        await this.notificationsService.createNotification({
          userId: app.counselorId,
          title: 'Student Admission Confirmed',
          message: `Admission for your student ${app.user?.fullName} (${app.college?.name}) is officially CONFIRMED.`,
          type: 'APPLICATION' as any,
        });
      }
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: 'Admission confirmed successfully',
      data: updated,
    };
  }
}

