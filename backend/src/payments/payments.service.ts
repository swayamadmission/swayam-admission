import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentGatewayService } from './gateways/payment-gateway.service';
import { PaymentDocumentService } from './services/payment-document.service';
import { JourneyService } from '../journey/journey.service';
import { DataScopeService } from '../auth/data-scope.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { InstallmentPaymentDto } from './dto/installment-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import {
  PaymentStatus,
  ApplicationStatus,
  NotificationType,
  NotificationPriority,
} from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly gatewayService: PaymentGatewayService,
    private readonly documentService: PaymentDocumentService,
    private readonly journeyService: JourneyService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  async getStats(currentUserId?: string) {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedStatuses: PaymentStatus[] = [
      PaymentStatus.COMPLETED,
      PaymentStatus.SUCCESS,
    ];
    const pendingStatuses: PaymentStatus[] = [
      PaymentStatus.PENDING,
      PaymentStatus.INITIATED,
      PaymentStatus.PROCESSING,
      PaymentStatus.VERIFICATION_PENDING,
    ];
    const failedStatuses: PaymentStatus[] = [
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
    ];

    let baseWhere: any = { deletedAt: null };
    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      const scopeFilter = this.dataScopeService.buildPaymentScopeFilter(ctx);
      baseWhere = { AND: [baseWhere, scopeFilter] };
    }

    // PostgreSQL aggregate queries — no in-memory loops
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
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { AND: [baseWhere, { status: { in: completedStatuses } }] },
        _sum: { paidAmount: true, amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          AND: [
            baseWhere,
            {
              status: { in: completedStatuses },
              paidAt: { gte: startOfToday },
            },
          ],
        },
        _sum: { paidAmount: true, amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          AND: [
            baseWhere,
            {
              status: { in: completedStatuses },
              paidAt: { gte: startOfMonth },
            },
          ],
        },
        _sum: { paidAmount: true, amount: true },
      }),
      this.prisma.payment.count({
        where: { AND: [baseWhere, { status: { in: pendingStatuses } }] },
      }),
      this.prisma.payment.count({
        where: { AND: [baseWhere, { status: { in: completedStatuses } }] },
      }),
      this.prisma.payment.count({
        where: { AND: [baseWhere, { status: { in: failedStatuses } }] },
      }),
      this.prisma.payment.count({
        where: { AND: [baseWhere, { status: PaymentStatus.REFUNDED }] },
      }),
      this.prisma.payment.aggregate({
        where: { AND: [baseWhere, { status: { in: pendingStatuses } }] },
        _sum: { pendingAmount: true, amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { AND: [baseWhere, { status: { in: completedStatuses } }] },
        _avg: { paidAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          AND: [
            baseWhere,
            {
              status: { in: completedStatuses },
              paymentDestination: 'PLATFORM',
            },
          ],
        },
        _sum: { paidAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          AND: [
            baseWhere,
            {
              status: { in: completedStatuses },
              paymentDestination: 'DIRECT_COLLEGE',
            },
          ],
        },
        _sum: { paidAmount: true },
      }),
      this.prisma.payment.count({
        where: {
          AND: [
            baseWhere,
            {
              verificationStatus: {
                in: [
                  'PENDING',
                  'PROOF_UPLOADED',
                  'UNDER_VERIFICATION',
                  'UTR_REQUESTED',
                ],
              },
            },
          ],
        },
      }),
      this.prisma.payment.count({
        where: { AND: [baseWhere, { verificationStatus: 'VERIFIED' }] },
      }),
      this.prisma.payment.count({
        where: { AND: [baseWhere, { verificationStatus: 'REJECTED' }] },
      }),
      this.prisma.payment.count({
        where: { AND: [baseWhere, { isFlaggedFraud: true }] },
      }),
      this.prisma.payment.count({
        where: {
          AND: [
            baseWhere,
            {
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
          ],
        },
      }),
    ]);

    const totalRevenue =
      totalRevenueAgg._sum.paidAmount || totalRevenueAgg._sum.amount || 0;
    const todayRevenue =
      todayRevenueAgg._sum.paidAmount || todayRevenueAgg._sum.amount || 0;
    const monthlyRevenue =
      monthlyRevenueAgg._sum.paidAmount || monthlyRevenueAgg._sum.amount || 0;
    const outstandingFees =
      outstandingAgg._sum.pendingAmount || outstandingAgg._sum.amount || 0;
    const averagePaymentValue = Math.round(avgPaymentAgg._avg.paidAmount || 0);
    const totalCalculated = totalRevenue + outstandingFees;
    const collectionRate =
      totalCalculated > 0
        ? Math.round((totalRevenue / totalCalculated) * 100)
        : 100;

    // Revenue breakdowns via groupBy — efficient SQL GROUP BY
    const collegeGrouped = await this.prisma.payment.groupBy({
      by: ['collegeId'],
      where: { deletedAt: null, status: { in: completedStatuses } },
      _sum: { paidAmount: true },
      orderBy: { _sum: { paidAmount: 'desc' } },
      take: 20,
    });
    const collegeIds = collegeGrouped
      .map((g) => g.collegeId)
      .filter(Boolean) as string[];
    const collegeNames =
      collegeIds.length > 0
        ? await this.prisma.college.findMany({
            where: { id: { in: collegeIds } },
            select: { id: true, name: true },
          })
        : [];
    const collegeNameMap = new Map(collegeNames.map((c) => [c.id, c.name]));
    const revenueByCollege = collegeGrouped.map((g) => ({
      name: collegeNameMap.get(g.collegeId || '') || 'Other College',
      value: g._sum.paidAmount || 0,
    }));

    const courseGrouped = await this.prisma.payment.groupBy({
      by: ['courseId'],
      where: { deletedAt: null, status: { in: completedStatuses } },
      _sum: { paidAmount: true },
      orderBy: { _sum: { paidAmount: 'desc' } },
      take: 20,
    });
    const courseIds = courseGrouped
      .map((g) => g.courseId)
      .filter(Boolean) as string[];
    const courseNames =
      courseIds.length > 0
        ? await this.prisma.course.findMany({
            where: { id: { in: courseIds } },
            select: { id: true, name: true },
          })
        : [];
    const courseNameMap = new Map(courseNames.map((c) => [c.id, c.name]));
    const revenueByCourse = courseGrouped.map((g) => ({
      name: courseNameMap.get(g.courseId || '') || 'General Program',
      value: g._sum.paidAmount || 0,
    }));

    const counselorGrouped = await this.prisma.payment.groupBy({
      by: ['counselorId'],
      where: { deletedAt: null, status: { in: completedStatuses } },
      _sum: { paidAmount: true },
      orderBy: { _sum: { paidAmount: 'desc' } },
      take: 20,
    });
    const counselorIds = counselorGrouped
      .map((g) => g.counselorId)
      .filter(Boolean) as string[];
    const counselorNames =
      counselorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: counselorIds } },
            select: { id: true, fullName: true },
          })
        : [];
    const counselorNameMap = new Map(
      counselorNames.map((c) => [c.id, c.fullName]),
    );
    const revenueByCounselor = counselorGrouped.map((g) => ({
      name: counselorNameMap.get(g.counselorId || '') || 'Direct Student',
      value: g._sum.paidAmount || 0,
    }));

    const methodGrouped = await this.prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: { deletedAt: null, status: { in: completedStatuses } },
      _sum: { paidAmount: true },
    });
    const revenueByPaymentMethod = methodGrouped.map((g) => ({
      name: g.paymentMethod || 'ONLINE',
      value: g._sum.paidAmount || 0,
    }));

    // 6-month revenue trend using per-month aggregates
    const revenueTrend: { month: string; revenue: number; pending: number }[] =
      [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
        23,
        59,
        59,
      );
      const monthLabel = d.toLocaleString('default', { month: 'short' });

      const [mRevAgg, mPenAgg] = await Promise.all([
        this.prisma.payment.aggregate({
          where: {
            deletedAt: null,
            status: { in: completedStatuses },
            paidAt: { gte: d, lte: monthEnd },
          },
          _sum: { paidAmount: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            deletedAt: null,
            status: { in: pendingStatuses },
            createdAt: { gte: d, lte: monthEnd },
          },
          _sum: { pendingAmount: true, amount: true },
        }),
      ]);
      revenueTrend.push({
        month: monthLabel,
        revenue: mRevAgg._sum.paidAmount || 0,
        pending: mPenAgg._sum.pendingAmount || mPenAgg._sum.amount || 0,
      });
    }

    // Top paying students
    const studentGrouped = await this.prisma.payment.groupBy({
      by: ['userId'],
      where: { deletedAt: null, status: { in: completedStatuses } },
      _sum: { paidAmount: true },
      orderBy: { _sum: { paidAmount: 'desc' } },
      take: 5,
    });
    const studentIds = studentGrouped
      .map((g) => g.userId)
      .filter(Boolean) as string[];
    const studentNames =
      studentIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, fullName: true },
          })
        : [];
    const studentNameMap = new Map(studentNames.map((s) => [s.id, s.fullName]));
    const topPayingStudents = studentGrouped.map((g) => ({
      name: studentNameMap.get(g.userId) || 'Student',
      amount: g._sum.paidAmount || 0,
    }));

    return {
      totalRevenue,
      todayRevenue,
      monthlyRevenue,
      pendingPayments: pendingCount,
      successfulPayments: successCount,
      failedPayments: failedCount,
      refundedPayments: refundedCount,
      outstandingFees,
      collectionRate,
      averagePaymentValue,
      platformRevenue: platformRevenueAgg._sum.paidAmount || 0,
      directCollegeRevenue: collegeRevenueAgg._sum.paidAmount || 0,
      pendingVerification: pendingVerificationCount,
      approvedPayments: approvedCount,
      rejectedPayments: rejectedCount,
      fraudAlerts: fraudAlertCount,
      slaBreaches: slaBreachCount,
      revenueTrend,
      revenueByCollege,
      revenueByCourse,
      revenueByCounselor,
      revenueByPaymentMethod,
      topPayingStudents,
    };
  }

  async findAll(query: PaymentQueryDto, currentUserId?: string) {
    const {
      skip = 0,
      limit = 50,
      search,
      status,
      paymentMethod,
      paymentType,
      collegeId,
      courseId,
      counselorId,
      studentId,
      applicationId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    let where: any = { deletedAt: null };

    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      const scopeFilter = this.dataScopeService.buildPaymentScopeFilter(ctx);
      where = { AND: [where, scopeFilter] };
    }

    if (status) where = { AND: [where, { status }] };
    if (paymentMethod) where = { AND: [where, { paymentMethod }] };
    if (paymentType) where = { AND: [where, { paymentType }] };
    if (collegeId) where = { AND: [where, { collegeId }] };
    if (courseId) where = { AND: [where, { courseId }] };
    if (counselorId) where = { AND: [where, { counselorId }] };
    if (studentId) where = { AND: [where, { userId: studentId }] };
    if (applicationId) where = { AND: [where, { applicationId }] };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { transactionId: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { mobile: { contains: search, mode: 'insensitive' } } },
        {
          application: {
            applicationId: { contains: search, mode: 'insensitive' },
          },
        },
        { college: { name: { contains: search, mode: 'insensitive' } } },
        { course: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              mobile: true,
              role: true,
            },
          },
          counselor: { select: { id: true, fullName: true, email: true } },
          verifier: { select: { id: true, fullName: true } },
          application: {
            select: {
              id: true,
              applicationId: true,
              status: true,
              college: { select: { name: true, logo: true } },
              course: { select: { name: true } },
            },
          },
          college: { select: { id: true, name: true, city: true } },
          course: { select: { id: true, name: true, level: true } },
          scholarship: {
            select: { id: true, scholarshipName: true, amount: true },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, total, page: Math.floor(skip / limit) + 1, limit };
  }

  async findOne(id: string, currentUserId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
            role: true,
          },
        },
        counselor: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
        verifier: { select: { id: true, fullName: true, email: true } },
        application: {
          include: {
            college: true,
            course: true,
            timeline: { orderBy: { createdAt: 'desc' } },
          },
        },
        college: true,
        course: true,
        scholarship: true,
        lead: true,
        ledgerEntries: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      this.dataScopeService.enforcePaymentScope(ctx, payment);
    }

    // Fetch related audit logs
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { entity: 'Payment', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return { ...payment, auditLogs };
  }

  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    let application: any = null;
    if (dto.applicationId) {
      application = await this.prisma.application.findUnique({
        where: { id: dto.applicationId },
        include: { college: true, course: true },
      });
    }

    const studentId = dto.studentId || dto.userId || userId;
    const grossAmount = dto.amount || 0;
    const discount = dto.discountAmount || 0;
    const scholarship = dto.scholarshipAmount || 0;
    const gst = dto.gstAmount || Math.round(grossAmount * 0.18);
    const totalPayable = Math.max(
      0,
      grossAmount - discount - scholarship + gst,
    );
    const paidAmount = totalPayable;
    const pendingAmount = 0;
    const counselorCommission = dto.counselorId
      ? Math.round(paidAmount * 0.05)
      : 0;

    const rNum = Math.floor(100000 + Math.random() * 900000);
    const transactionId = dto.transactionId || `TXN_${Date.now()}_${rNum}`;
    const invoiceNumber = `INV-2026-${rNum}`;
    const receiptNumber = `RCP-2026-${rNum}`;

    const gatewayOrder = await this.gatewayService.createOrder(
      dto.gateway || 'Manual',
      {
        amount: totalPayable,
        currency: dto.currency || 'INR',
        receiptId: receiptNumber,
      },
    );

    const payment = await this.prisma.payment.create({
      data: {
        userId: studentId,
        studentId,
        applicationId: dto.applicationId,
        collegeId: dto.collegeId || application?.collegeId,
        courseId: dto.courseId || application?.courseId,
        counselorId: dto.counselorId || application?.counselorId,
        scholarshipId: dto.scholarshipId,
        leadId: dto.leadId,
        paymentType: dto.paymentType,
        paymentMethod: dto.paymentMethod || 'UPI',
        gateway: dto.gateway || 'Manual',
        transactionId,
        orderId: gatewayOrder.orderId,
        invoiceNumber,
        receiptNumber,
        amount: grossAmount,
        discountAmount: discount,
        scholarshipAmount: scholarship,
        gstAmount: gst,
        paidAmount,
        pendingAmount,
        counselorCommission,
        currency: dto.currency || 'INR',
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        verifiedAt: new Date(),
        verifiedBy: userId,
        remarks: dto.remarks,
        notes: dto.notes,
        metadata: dto.metadata || {},
      },
      include: {
        user: true,
        college: true,
        course: true,
      },
    });

    // Financial Ledger Entries
    await this.prisma.financialLedger.createMany({
      data: [
        {
          paymentId: payment.id,
          entryType: 'DEBIT',
          accountType: 'BANK',
          amount: paidAmount,
          description: `Payment received for ${payment.paymentType} - Txn ${transactionId}`,
          referenceNo: transactionId,
          createdById: userId,
        },
        {
          paymentId: payment.id,
          entryType: 'CREDIT',
          accountType: 'COLLEGE_PAYABLE',
          amount: grossAmount - counselorCommission,
          description: `College fee credit for ${payment.college?.name || 'Institute'}`,
          referenceNo: transactionId,
          createdById: userId,
        },
      ],
    });

    // Auto-generate invoice & receipt documents
    const receiptHtml = this.documentService.generateReceiptHtml({
      payment,
      student: payment.user,
      application,
      college: payment.college,
      course: payment.course,
    });
    const invoiceHtml = this.documentService.generateInvoiceHtml({
      payment,
      student: payment.user,
      application,
      college: payment.college,
      course: payment.course,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        receiptUrl: `/api/payments/${payment.id}/receipt`,
        invoiceUrl: `/api/payments/${payment.id}/invoice`,
      },
    });

    // Audit Log
    await this.audit.logAction({
      userId,
      action: 'CREATE_PAYMENT',
      entity: 'Payment',
      entityId: payment.id,
      newValue: payment,
      ipAddress,
      userAgent,
    });

    // Notifications
    await this.notifications.createNotification({
      userId: studentId,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.HIGH,
      title: 'Payment Successful',
      message: `Your payment of ₹${paidAmount.toLocaleString('en-IN')} for ${payment.paymentType} was completed successfully. Receipt #${receiptNumber}`,
      relatedPaymentId: payment.id,
      actionUrl: `/dashboard?tab=payments`,
    });

    if (dto.counselorId) {
      await this.notifications.createNotification({
        userId: dto.counselorId,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.MEDIUM,
        title: 'Student Payment Recorded',
        message: `Payment of ₹${paidAmount.toLocaleString('en-IN')} received for your assigned student. Commission: ₹${counselorCommission.toLocaleString('en-IN')}`,
        relatedPaymentId: payment.id,
      });
    }

    // Application Status update on Admission Fee / Registration Fee completion
    if (
      application &&
      application.status === ApplicationStatus.PAYMENT_PENDING
    ) {
      await this.prisma.application.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.PAYMENT_COMPLETED,
          paymentStatus: PaymentStatus.COMPLETED,
        },
      });

      await this.prisma.applicationTimeline.create({
        data: {
          applicationId: application.id,
          userId,
          action: 'PAYMENT_COMPLETED',
          oldStatus: ApplicationStatus.PAYMENT_PENDING,
          newStatus: ApplicationStatus.PAYMENT_COMPLETED,
          remarks: `Payment of ₹${paidAmount} verified and recorded.`,
        },
      });
    }

    return payment;
  }

  async updatePaymentStatus(
    id: string,
    dto: UpdatePaymentStatusDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { application: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    const newStatus = dto.status || payment.status;
    const isSuccess =
      newStatus === PaymentStatus.SUCCESS ||
      newStatus === PaymentStatus.COMPLETED;

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: newStatus,
        transactionId: dto.transactionId || payment.transactionId,
        gatewayTransactionId:
          dto.gatewayTransactionId || payment.gatewayTransactionId,
        receiptUrl: dto.receiptUrl || payment.receiptUrl,
        invoiceUrl: dto.invoiceUrl || payment.invoiceUrl,
        paidAmount:
          dto.paidAmount !== undefined
            ? dto.paidAmount
            : isSuccess
              ? payment.amount
              : payment.paidAmount,
        pendingAmount: isSuccess ? 0 : payment.pendingAmount,
        paidAt: isSuccess ? new Date() : payment.paidAt,
        verifiedAt: isSuccess ? new Date() : payment.verifiedAt,
        verifiedBy: isSuccess ? userId : payment.verifiedBy,
        remarks: dto.remarks || payment.remarks,
        notes: dto.notes || payment.notes,
      },
    });

    await this.audit.logAction({
      userId,
      action: 'UPDATE_PAYMENT_STATUS',
      entity: 'Payment',
      entityId: id,
      oldValue: { status: payment.status },
      newValue: { status: newStatus },
      ipAddress,
      userAgent,
    });

    if (isSuccess && payment.applicationId) {
      await this.prisma.application.update({
        where: { id: payment.applicationId },
        data: {
          status: ApplicationStatus.PAYMENT_COMPLETED,
          paymentStatus: PaymentStatus.COMPLETED,
        },
      });
    }

    return updatedPayment;
  }

  async verifyPayment(
    dto: VerifyPaymentDto,
    verifiedBy: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: { application: true, user: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    const verifiedStatus = dto.status || PaymentStatus.COMPLETED;

    const updated = await this.prisma.payment.update({
      where: { id: dto.paymentId },
      data: {
        status: verifiedStatus,
        verifiedAt: new Date(),
        verifiedBy,
        paidAmount: payment.amount,
        pendingAmount: 0,
        transactionId: dto.transactionId || payment.transactionId,
        gatewayTransactionId:
          dto.gatewayTransactionId || payment.gatewayTransactionId,
        remarks: dto.remarks || 'Verified and approved by finance admin.',
      },
    });

    await this.audit.logAction({
      userId: verifiedBy,
      action: 'VERIFY_PAYMENT',
      entity: 'Payment',
      entityId: dto.paymentId,
      newValue: updated,
      ipAddress,
      userAgent,
    });

    if (payment.applicationId) {
      await this.prisma.application.update({
        where: { id: payment.applicationId },
        data: {
          status: ApplicationStatus.ADMISSION_CONFIRMED,
          paymentStatus: PaymentStatus.COMPLETED,
          documentsVerified: true,
        },
      });

      await this.prisma.applicationTimeline.create({
        data: {
          applicationId: payment.applicationId,
          userId: verifiedBy,
          action: 'ADMISSION_CONFIRMED',
          oldStatus: payment.application?.status,
          newStatus: ApplicationStatus.ADMISSION_CONFIRMED,
          remarks:
            'Payment verified by Finance Team. Document verification unlocked.',
        },
      });
    }

    await this.notifications.createNotification({
      userId: payment.userId,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.HIGH,
      title: 'Payment Verified & Confirmed',
      message: `Your payment of ₹${payment.amount} has been verified. Your admission process is unlocked!`,
      relatedPaymentId: payment.id,
    });

    return updated;
  }

  async refundPayment(
    dto: RefundPaymentDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    if (dto.refundAmount > (payment.paidAmount || payment.amount)) {
      throw new BadRequestException('Refund amount cannot exceed paid amount.');
    }

    const gatewayRefund = await this.gatewayService.refund(
      payment.gateway || 'Manual',
      {
        transactionId: payment.transactionId || payment.id,
        amount: dto.refundAmount,
        reason: dto.reason,
      },
    );

    const isFullRefund =
      dto.refundAmount >= (payment.paidAmount || payment.amount);
    const newStatus = isFullRefund
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_PAID;

    const updated = await this.prisma.payment.update({
      where: { id: dto.paymentId },
      data: {
        status: newStatus,
        refundAmount: (payment.refundAmount || 0) + dto.refundAmount,
        remarks: `Refund processed: ${dto.reason}. Ref ID: ${gatewayRefund.refundId}`,
      },
    });

    await this.prisma.financialLedger.create({
      data: {
        paymentId: payment.id,
        entryType: 'DEBIT',
        accountType: 'SCHOLARSHIP_EXPENSE',
        amount: dto.refundAmount,
        description: `Refund for payment #${payment.receiptNumber || payment.id}: ${dto.reason}`,
        referenceNo: gatewayRefund.refundId,
        createdById: userId,
      },
    });

    await this.audit.logAction({
      userId,
      action: 'REFUND_PAYMENT',
      entity: 'Payment',
      entityId: payment.id,
      newValue: { refundAmount: dto.refundAmount, reason: dto.reason },
      ipAddress,
      userAgent,
    });

    await this.notifications.createNotification({
      userId: payment.userId,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.HIGH,
      title: 'Payment Refund Processed',
      message: `A refund of ₹${dto.refundAmount.toLocaleString('en-IN')} has been initiated. Reason: ${dto.reason}`,
      relatedPaymentId: payment.id,
    });

    return updated;
  }

  async installmentPayment(
    dto: InstallmentPaymentDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const parentPayment = dto.paymentId
      ? await this.prisma.payment.findUnique({ where: { id: dto.paymentId } })
      : null;

    const installmentRecord = await this.prisma.payment.create({
      data: {
        userId: parentPayment?.userId || userId,
        applicationId: dto.applicationId || parentPayment?.applicationId,
        collegeId: parentPayment?.collegeId,
        courseId: parentPayment?.courseId,
        paymentType: parentPayment?.paymentType || 'ADMISSION_FEE',
        paymentMethod: dto.paymentMethod || 'UPI',
        amount: dto.amount,
        paidAmount: dto.amount,
        pendingAmount: 0,
        installmentNumber: dto.installmentNumber,
        totalInstallments: dto.totalInstallments,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        transactionId: `INST_${Date.now()}_${dto.installmentNumber}`,
        receiptNumber: `RCP-INST-${Date.now()}`,
        remarks:
          dto.remarks ||
          `Installment ${dto.installmentNumber} of ${dto.totalInstallments} paid.`,
      },
    });

    if (parentPayment) {
      const updatedPaid = (parentPayment.paidAmount || 0) + dto.amount;
      const updatedPending = Math.max(0, parentPayment.amount - updatedPaid);
      await this.prisma.payment.update({
        where: { id: parentPayment.id },
        data: {
          paidAmount: updatedPaid,
          pendingAmount: updatedPending,
          status:
            updatedPending === 0
              ? PaymentStatus.COMPLETED
              : PaymentStatus.PARTIALLY_PAID,
        },
      });
    }

    await this.audit.logAction({
      userId,
      action: 'INSTALLMENT_PAYMENT',
      entity: 'Payment',
      entityId: installmentRecord.id,
      newValue: installmentRecord,
      ipAddress,
      userAgent,
    });

    return installmentRecord;
  }

  async generateInvoice(id: string, currentUserId?: string) {
    const payment = await this.findOne(id, currentUserId);
    const invoiceHtml = this.documentService.generateInvoiceHtml({
      payment,
      student: payment.user,
      application: payment.application,
      college: payment.college,
      course: payment.course,
    });
    return { id, invoiceNumber: payment.invoiceNumber, html: invoiceHtml };
  }

  async generateReceipt(id: string, currentUserId?: string) {
    const payment = await this.findOne(id, currentUserId);
    const receiptHtml = this.documentService.generateReceiptHtml({
      payment,
      student: payment.user,
      application: payment.application,
      college: payment.college,
      course: payment.course,
    });
    return { id, receiptNumber: payment.receiptNumber, html: receiptHtml };
  }

  async getStudentPayments(studentId: string, currentUserId?: string) {
    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      const student = await this.prisma.user.findUnique({
        where: { id: studentId },
        include: { profile: true },
      });
      if (student) this.dataScopeService.enforceStudentScope(ctx, student);
    }

    return this.prisma.payment.findMany({
      where: { userId: studentId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        application: { include: { college: true, course: true } },
        college: true,
        course: true,
      },
    });
  }

  async getApplicationPayments(applicationId: string) {
    return this.prisma.payment.findMany({
      where: { applicationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, mobile: true } },
        verifier: { select: { fullName: true } },
      },
    });
  }

  async getCounselorPayments(counselorId: string, currentUserId?: string) {
    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      const counselor = await this.prisma.user.findUnique({
        where: { id: counselorId },
        include: { counselorProfile: true },
      });
      if (counselor)
        this.dataScopeService.enforceCounselorScope(ctx, counselor);
    }

    const payments = await this.prisma.payment.findMany({
      where: { counselorId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, mobile: true } },
        application: { include: { college: true, course: true } },
      },
    });

    let totalCommissionEarned = 0;
    let pendingCommission = 0;

    for (const p of payments) {
      if (
        p.status === PaymentStatus.COMPLETED ||
        p.status === PaymentStatus.SUCCESS
      ) {
        totalCommissionEarned += p.counselorCommission || 0;
      } else {
        pendingCommission += p.counselorCommission || 0;
      }
    }

    return { payments, totalCommissionEarned, pendingCommission };
  }

  async getPending(currentUserId?: string) {
    return this.findAll(
      { status: PaymentStatus.PENDING, limit: 100 },
      currentUserId,
    );
  }

  async getCompleted(currentUserId?: string) {
    return this.findAll(
      { status: PaymentStatus.COMPLETED, limit: 100 },
      currentUserId,
    );
  }

  async getFailed(currentUserId?: string) {
    return this.findAll(
      { status: PaymentStatus.FAILED, limit: 100 },
      currentUserId,
    );
  }

  async getRefunded(currentUserId?: string) {
    return this.findAll(
      { status: PaymentStatus.REFUNDED, limit: 100 },
      currentUserId,
    );
  }

  async exportPayments(query: PaymentQueryDto, currentUserId?: string) {
    const { data } = await this.findAll(
      { ...query, limit: 10000 },
      currentUserId,
    );
    const headers = [
      'Transaction ID',
      'Receipt No',
      'Invoice No',
      'Student',
      'Email',
      'Mobile',
      'College',
      'Course',
      'Type',
      'Method',
      'Gross Amount',
      'Paid Amount',
      'Pending Amount',
      'GST',
      'Status',
      'Paid Date',
    ];
    const rows = data.map((p) => [
      p.transactionId || p.id,
      p.receiptNumber || '',
      p.invoiceNumber || '',
      p.user?.fullName || '',
      p.user?.email || '',
      p.user?.mobile || '',
      p.college?.name || '',
      p.course?.name || '',
      p.paymentType,
      p.paymentMethod,
      p.amount,
      p.paidAmount,
      p.pendingAmount,
      p.gstAmount,
      p.status,
      p.paidAt ? new Date(p.paidAt).toISOString() : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');
    return csvContent;
  }

  async softDelete(
    id: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { deletedAt: new Date(), status: PaymentStatus.CANCELLED },
    });

    await this.audit.logAction({
      userId,
      action: 'DELETE_PAYMENT',
      entity: 'Payment',
      entityId: id,
      oldValue: payment,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  async getStudentPaymentSummary(userId: string) {
    const userPayments = await this.prisma.payment.findMany({
      where: { OR: [{ userId }, { studentId: userId }], deletedAt: null },
      include: {
        college: {
          select: { id: true, name: true, logo: true, city: true, state: true },
        },
        course: {
          select: {
            id: true,
            name: true,
            level: true,
            duration: true,
            totalFees: true,
          },
        },
        counselor: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
        collegeBank: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const userApps = await this.prisma.application.findMany({
      where: { OR: [{ userId }, { user: { id: userId } }] },
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
        course: { select: { id: true, name: true, totalFees: true } },
      },
    });

    let totalFees = 0;
    let totalPaid = 0;
    let scholarshipAmount = 0;
    let discountAmount = 0;
    let refundAmount = 0;
    let completedCount = 0;
    let pendingCount = 0;

    userApps.forEach((app) => {
      if (app.course?.totalFees) totalFees += app.course.totalFees;
    });

    userPayments.forEach((p) => {
      const isCompleted =
        p.status === PaymentStatus.COMPLETED ||
        p.status === PaymentStatus.SUCCESS;
      if (isCompleted) {
        completedCount++;
        totalPaid += p.paidAmount || p.amount || 0;
      } else {
        pendingCount++;
      }
      scholarshipAmount += p.scholarshipAmount || 0;
      discountAmount += p.discountAmount || 0;
      refundAmount += p.refundAmount || 0;
    });

    if (totalFees === 0 && userPayments.length > 0) {
      userPayments.forEach((p) => (totalFees += p.amount));
    }

    const outstandingDue = Math.max(
      0,
      totalFees - totalPaid - scholarshipAmount - discountAmount,
    );

    // Dynamic fee breakdown from FeeHead definitions + PaymentRequest records
    const paymentRequests = await this.prisma.paymentRequest.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: 'asc' },
    });

    const feeHeads = await this.prisma.feeHead.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build breakdown from actual payment requests (admin-created)
    const breakdown: {
      feeType: string;
      label: string;
      amount: number;
      paid: number;
      due: number;
      status: string;
      requestId?: string;
      dueDate?: Date | null;
      lateFee?: number;
    }[] = [];

    for (const req of paymentRequests) {
      const feeHeadDef = feeHeads.find(
        (fh) => fh.code === (req.feeHead as string),
      );
      const reqPaid = userPayments
        .filter(
          (p) =>
            p.requestId === req.id &&
            (p.status === 'COMPLETED' || p.status === 'SUCCESS'),
        )
        .reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);
      const reqDue = Math.max(0, req.requestedAmount - reqPaid);
      const reqStatus =
        req.status === 'PAID'
          ? 'PAID'
          : req.status === 'EXPIRED'
            ? 'EXPIRED'
            : reqDue <= 0
              ? 'PAID'
              : reqPaid > 0
                ? 'PARTIALLY_PAID'
                : 'PENDING';

      breakdown.push({
        feeType: req.feeHead as string,
        label: feeHeadDef?.name || (req.feeHead as string).replace(/_/g, ' '),
        amount: req.requestedAmount,
        paid: reqPaid,
        due: reqDue,
        status: reqStatus,
        requestId: req.id,
        dueDate: req.dueDate,
        lateFee: req.lateFee,
      });
    }

    // If no payment requests exist, derive breakdown from payment records by type
    if (breakdown.length === 0 && userPayments.length > 0) {
      const typeMap = new Map<string, { paid: number; amount: number }>();
      for (const p of userPayments) {
        const key = p.paymentType as string;
        const prev = typeMap.get(key) || { paid: 0, amount: 0 };
        const isCompleted =
          p.status === PaymentStatus.COMPLETED ||
          p.status === PaymentStatus.SUCCESS;
        typeMap.set(key, {
          paid: prev.paid + (isCompleted ? p.paidAmount || p.amount || 0 : 0),
          amount: prev.amount + (p.amount || 0),
        });
      }
      for (const [feeType, data] of typeMap.entries()) {
        const feeHeadDef = feeHeads.find((fh) => fh.code === feeType);
        const due = Math.max(0, data.amount - data.paid);
        breakdown.push({
          feeType,
          label: feeHeadDef?.name || feeType.replace(/_/g, ' '),
          amount: data.amount,
          paid: data.paid,
          due,
          status:
            due <= 0 ? 'PAID' : data.paid > 0 ? 'PARTIALLY_PAID' : 'PENDING',
        });
      }
    }

    const installments = userPayments
      .filter((p) => p.totalInstallments && p.totalInstallments > 1)
      .map((p) => ({
        id: p.id,
        installmentNumber: p.installmentNumber,
        totalInstallments: p.totalInstallments,
        amount: p.amount,
        dueDate: p.dueDate || p.createdAt,
        status: p.status,
        receiptNumber: p.receiptNumber,
      }));

    const bankAccounts = userApps
      .flatMap((app) => app.college?.bankAccounts || [])
      .filter((b, idx, self) => self.findIndex((t) => t.id === b.id) === idx);

    return {
      success: true,
      summary: {
        totalFees,
        totalPaid,
        outstandingDue,
        scholarshipAmount,
        discountAmount,
        refundAmount,
        completedCount,
        pendingCount,
      },
      breakdown,
      installments,
      payments: userPayments,
      bankAccounts,
    };
  }

  async getCollegeBankAccounts(collegeId: string) {
    const bankAccounts = await this.prisma.collegeBankAccount.findMany({
      where: { collegeId, isActive: true },
      orderBy: { isDefault: 'desc' },
    });
    const college = await this.prisma.college.findUnique({
      where: { id: collegeId },
      select: { id: true, name: true, logo: true, paymentMode: true },
    });
    return {
      success: true,
      college,
      bankAccounts,
    };
  }

  async configureCollegeBankAccount(
    adminId: string,
    collegeId: string,
    dto: any,
  ) {
    if (dto.isDefault) {
      await this.prisma.collegeBankAccount.updateMany({
        where: { collegeId },
        data: { isDefault: false },
      });
    }

    let account;
    if (dto.id) {
      account = await this.prisma.collegeBankAccount.update({
        where: { id: dto.id },
        data: {
          bankName: dto.bankName,
          accountHolder: dto.accountHolder,
          accountNumber: dto.accountNumber,
          ifscCode: dto.ifscCode,
          branchName: dto.branchName,
          upiId: dto.upiId,
          qrCodeUrl: dto.qrCodeUrl,
          instructions: dto.instructions,
          minAmount: dto.minAmount,
          maxAmount: dto.maxAmount,
          acceptedMethods: dto.acceptedMethods || [
            'NEFT',
            'RTGS',
            'IMPS',
            'UPI',
          ],
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          isDefault: dto.isDefault !== undefined ? dto.isDefault : false,
          updatedBy: adminId,
        },
      });
    } else {
      account = await this.prisma.collegeBankAccount.create({
        data: {
          collegeId,
          bankName: dto.bankName,
          accountHolder: dto.accountHolder,
          accountNumber: dto.accountNumber,
          ifscCode: dto.ifscCode,
          branchName: dto.branchName,
          upiId: dto.upiId,
          qrCodeUrl: dto.qrCodeUrl,
          instructions: dto.instructions,
          minAmount: dto.minAmount,
          maxAmount: dto.maxAmount,
          acceptedMethods: dto.acceptedMethods || [
            'NEFT',
            'RTGS',
            'IMPS',
            'UPI',
          ],
          isActive: true,
          isDefault: dto.isDefault || false,
          createdBy: adminId,
        },
      });
    }

    if (dto.collegePaymentMode) {
      await this.prisma.college.update({
        where: { id: collegeId },
        data: { paymentMode: dto.collegePaymentMode },
      });
    }

    await this.audit.logAction({
      userId: adminId,
      action: 'CONFIGURE_COLLEGE_BANK',
      entity: 'CollegeBankAccount',
      entityId: account.id,
      newValue: account,
    });

    return { success: true, account };
  }

  async createPaymentOrder(userId: string, dto: any) {
    const timestamp = Date.now().toString().slice(-6);
    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const orderId = `ORD-${Date.now()}`;
    const receiptNumber = `RCP-${new Date().getFullYear()}-${timestamp}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${timestamp}`;

    let collegeBankId = dto.collegeBankId;
    if (!collegeBankId && dto.collegeId) {
      const defaultBank = await this.prisma.collegeBankAccount.findFirst({
        where: { collegeId: dto.collegeId, isActive: true },
        orderBy: { isDefault: 'desc' },
      });
      if (defaultBank) collegeBankId = defaultBank.id;
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        studentId: userId,
        applicationId: dto.applicationId,
        collegeId: dto.collegeId,
        courseId: dto.courseId,
        counselorId: dto.counselorId,
        collegeBankId,
        transactionId,
        orderId,
        receiptNumber,
        invoiceNumber,
        amount: dto.amount,
        paidAmount:
          dto.paymentMode === 'DIRECT_COLLEGE' ? dto.paidAmount || 0 : 0,
        pendingAmount: dto.amount,
        paymentType: dto.paymentType || 'REGISTRATION_FEE',
        paymentMethod: dto.paymentMethod || 'UPI',
        paymentMode: dto.paymentMode || 'GATEWAY',
        gateway:
          dto.gateway ||
          (dto.paymentMode === 'DIRECT_COLLEGE'
            ? 'Direct Bank Transfer'
            : 'Razorpay'),
        status: PaymentStatus.PENDING,
        verificationStatus: 'PENDING',
        remarks: dto.remarks || 'Payment order generated',
      },
      include: {
        college: true,
        course: true,
        collegeBank: true,
      },
    });

    await this.audit.logAction({
      userId,
      action: 'PAYMENT_CREATED',
      entity: 'Payment',
      entityId: payment.id,
      newValue: payment,
    });

    return {
      success: true,
      message: 'Payment order generated successfully',
      payment,
    };
  }

  async uploadPaymentProof(
    userId: string,
    paymentId: string,
    dto: {
      proofDocument: string;
      utrNumber: string;
      transactionReference?: string;
      paidAmount?: number;
      remarks?: string;
      requestId?: string;
    },
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { request: true },
    });
    if (!payment) throw new NotFoundException('Payment record not found');

    // Requirement 1 & 11: Mandatory Payment Request Verification & Expiry Check
    const activeRequestId = dto.requestId || payment.requestId;
    let linkedRequest = payment.request;

    if (
      activeRequestId &&
      (!linkedRequest || linkedRequest.id !== activeRequestId)
    ) {
      linkedRequest = await this.prisma.paymentRequest.findUnique({
        where: { id: activeRequestId },
      });
    }

    if (!linkedRequest) {
      throw new BadRequestException(
        'A valid, active Payment Request is mandatory before uploading payment proof.',
      );
    }

    if (
      linkedRequest.status === 'PAID' ||
      linkedRequest.status === 'EXPIRED' ||
      linkedRequest.isExpired
    ) {
      throw new BadRequestException(
        'The associated Payment Request is expired or fully settled.',
      );
    }

    if (
      linkedRequest.expiryDate &&
      new Date(linkedRequest.expiryDate) < new Date()
    ) {
      await this.prisma.paymentRequest.update({
        where: { id: linkedRequest.id },
        data: { isExpired: true, status: 'EXPIRED' },
      });
      throw new BadRequestException(
        'The associated Payment Request has expired. Please contact counselor to re-issue.',
      );
    }

    // Requirement 3: Locked Amount from Payment Request
    const lockedPaidAmount =
      linkedRequest.dueAmount ||
      linkedRequest.requestedAmount ||
      payment.amount;

    // Requirement 7 & 8: Duplicate Payment & Fraud Detection Engine
    const screenshotHash = dto.proofDocument
      ? crypto.createHash('sha256').update(dto.proofDocument).digest('hex')
      : null;

    let isFlaggedFraud = false;
    let fraudReason: string | null = null;

    if (dto.utrNumber) {
      const duplicateUtr = await this.prisma.payment.findFirst({
        where: {
          id: { not: paymentId },
          utrNumber: dto.utrNumber,
          status: { in: ['COMPLETED', 'VERIFICATION_PENDING', 'PENDING'] },
        },
      });
      if (duplicateUtr) {
        isFlaggedFraud = true;
        fraudReason = `Duplicate UTR reference detected (matches payment ${duplicateUtr.id})`;
      }
    }

    if (screenshotHash && !isFlaggedFraud) {
      const duplicateHash = await this.prisma.payment.findFirst({
        where: {
          id: { not: paymentId },
          screenshotHash,
        },
      });
      if (duplicateHash) {
        isFlaggedFraud = true;
        fraudReason = `Duplicate screenshot hash detected (matches payment ${duplicateHash.id})`;
      }
    }

    // Requirement 6: Verification SLA Deadline (2 hours for Pending Verification)
    const slaDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const verificationStatus = isFlaggedFraud
      ? 'REVIEW_REQUIRED'
      : 'PROOF_UPLOADED';

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        requestId: linkedRequest.id,
        proofDocument: dto.proofDocument,
        utrNumber: dto.utrNumber,
        screenshotHash,
        transactionReference: dto.transactionReference || dto.utrNumber,
        paidAmount: lockedPaidAmount,
        verificationStatus,
        isFlaggedFraud,
        fraudReason,
        slaDeadline,
        status: PaymentStatus.VERIFICATION_PENDING,
        remarks:
          dto.remarks ||
          (isFlaggedFraud
            ? `Flagged: ${fraudReason}`
            : 'Payment proof uploaded by student'),
      },
      include: { college: true, course: true, request: true },
    });

    await this.audit.logAction({
      userId,
      action: 'PAYMENT_PROOF_UPLOADED',
      entity: 'Payment',
      entityId: paymentId,
      newValue: {
        proofDocument: dto.proofDocument,
        utrNumber: dto.utrNumber,
        isFlaggedFraud,
        fraudReason,
      },
    });

    await this.notifications.createNotification({
      userId,
      type: NotificationType.APPLICATION,
      priority: NotificationPriority.HIGH,
      title: isFlaggedFraud
        ? 'Payment Under Additional Audit ⚠️'
        : 'Payment Proof Uploaded! 📄',
      message: isFlaggedFraud
        ? `Your payment proof has been submitted and is under compliance audit.`
        : `Your payment proof (UTR: ${dto.utrNumber}) has been submitted and is under verification by our team.`,
    });

    if (payment.counselorId) {
      await this.notifications.createNotification({
        userId: payment.counselorId,
        type: NotificationType.APPLICATION,
        priority: NotificationPriority.HIGH,
        title: isFlaggedFraud
          ? '⚠️ Suspicious Payment Proof Flagged'
          : 'Student Uploaded Payment Proof',
        message: isFlaggedFraud
          ? `Suspicious payment proof for ${payment.applicationId || paymentId} flagged: ${fraudReason}`
          : `Payment proof uploaded for application ${payment.applicationId || paymentId} (UTR: ${dto.utrNumber}).`,
      });
    }

    return {
      success: true,
      message: isFlaggedFraud
        ? 'Payment proof submitted, flagged for security audit.'
        : 'Payment proof uploaded successfully. Verification in progress.',
      payment: updated,
    };
  }

  async verifyDirectPaymentProof(
    adminId: string,
    paymentId: string,
    action: 'APPROVE' | 'REJECT',
    remarks?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true, college: true, course: true },
    });
    if (!payment) throw new NotFoundException('Payment record not found');

    if (action === 'APPROVE') {
      const updated = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          verificationStatus: 'VERIFIED',
          paidAmount: payment.amount,
          pendingAmount: 0,
          paidAt: new Date(),
          verifiedAt: new Date(),
          verifiedBy: adminId,
          verificationRemarks: remarks || 'Payment proof verified and approved',
        },
      });

      // Create Financial Ledger Entry
      await this.prisma.financialLedger.create({
        data: {
          paymentId,
          entryType: 'CREDIT',
          accountType: 'COLLEGE_PAYABLE',
          amount: payment.amount,
          description: `Direct Bank Payment Verified (UTR: ${payment.utrNumber || 'N/A'})`,
          referenceNo: payment.utrNumber || payment.transactionId,
          createdById: adminId,
        },
      });

      // Audit Log
      await this.audit.logAction({
        userId: adminId,
        action: 'PAYMENT_VERIFIED',
        entity: 'Payment',
        entityId: paymentId,
        newValue: updated,
      });

      // Student Notification
      await this.notifications.createNotification({
        userId: payment.userId,
        type: NotificationType.APPLICATION,
        priority: NotificationPriority.HIGH,
        title: 'Payment Verified & Confirmed! 🎉',
        message: `Your payment of ₹${payment.amount.toLocaleString()} for ${payment.college?.name || 'Admission'} has been verified and confirmed.`,
      });

      // Update linked Application if any
      if (payment.applicationId) {
        await this.prisma.application.update({
          where: { id: payment.applicationId },
          data: {
            status: ApplicationStatus.PAYMENT_COMPLETED,
            paymentStatus: 'COMPLETED',
          },
        });
      }

      // Re-calculate Student Journey
      try {
        await this.journeyService.getStudentJourney(payment.userId);
      } catch (err) {
        console.error(
          'Error re-calculating journey after payment approval:',
          err,
        );
      }

      return {
        success: true,
        message: 'Payment verified and approved successfully',
        payment: updated,
      };
    } else {
      const updated = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
          verificationStatus: 'REJECTED',
          verificationRemarks: remarks || 'Payment proof rejected by admin',
        },
      });

      await this.audit.logAction({
        userId: adminId,
        action: 'PAYMENT_REJECTED',
        entity: 'Payment',
        entityId: paymentId,
        newValue: updated,
      });

      await this.notifications.createNotification({
        userId: payment.userId,
        type: NotificationType.APPLICATION,
        priority: NotificationPriority.HIGH,
        title: 'Payment Verification Required',
        message: `Your payment proof submission was not approved. Reason: ${remarks || 'Invalid transaction details'}. Please re-upload.`,
      });

      return {
        success: true,
        message: 'Payment proof rejected',
        payment: updated,
      };
    }
  }
}
