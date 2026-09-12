import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DataScopeService } from '../../auth/data-scope.service';
import { AuditService } from '../../audit/audit.service';

export interface CreateInvoiceDto {
  applicationId: string;
  feePlan?: 'ONE_TIME' | 'SEMESTER' | 'ANNUAL' | 'INSTALLMENT';
  customLineItems?: { name: string; amount: number; description?: string }[];
  discountAmount?: number;
  scholarshipAmount?: number;
  dueDate?: Date;
  notes?: string;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScopeService: DataScopeService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate an authoritative Invoice for an application based on its CollegeOffering
   */
  async generateInvoice(dto: CreateInvoiceDto, creatorUserId?: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: dto.applicationId },
      include: {
        college: true,
        course: true,
        branch: true,
        offering: true,
        user: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${dto.applicationId} not found`);
    }

    // Check if an active/unpaid invoice already exists for this application and feePlan
    const existingActive = await this.prisma.invoice.findFirst({
      where: {
        applicationId: dto.applicationId,
        status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
      },
    });

    if (existingActive) {
      return {
        success: true,
        data: existingActive,
        message: 'Existing active invoice retrieved for application.',
      };
    }

    // Determine line items from CollegeOffering if available
    let lineItems: { name: string; amount: number }[] = [];
    let subtotalAmount = 0;

    if (dto.customLineItems && dto.customLineItems.length > 0) {
      lineItems = dto.customLineItems.map((item) => ({
        name: item.name,
        amount: Math.max(0, Number(item.amount)),
      }));
      subtotalAmount = lineItems.reduce((acc, item) => acc + item.amount, 0);
    } else if (application.offering) {
      const offering = application.offering;
      lineItems = [
        { name: 'Tuition Fee', amount: offering.tuitionFee },
        { name: 'Admission Fee', amount: offering.admissionFee },
        { name: 'Exam Fee', amount: offering.examFee },
      ];
      if (offering.hostelFee > 0) lineItems.push({ name: 'Hostel Fee', amount: offering.hostelFee });
      if (offering.transportFee > 0) lineItems.push({ name: 'Transport Fee', amount: offering.transportFee });
      if (offering.otherCharges > 0) lineItems.push({ name: 'Other Charges', amount: offering.otherCharges });

      subtotalAmount = offering.totalFee > 0 ? offering.totalFee : lineItems.reduce((acc, i) => acc + i.amount, 0);
    } else {
      // Fallback default admission charges
      lineItems = [
        { name: 'Tuition Fee', amount: 50000 },
        { name: 'Admission & Processing Fee', amount: 5000 },
      ];
      subtotalAmount = 55000;
    }

    const discountAmount = Math.max(0, Number(dto.discountAmount) || 0);
    const scholarshipAmount = Math.max(0, Number(dto.scholarshipAmount) || 0);
    const totalDeductions = discountAmount + scholarshipAmount;
    const finalPayableAmount = Math.max(0, subtotalAmount - totalDeductions);

    // Generate centralized unique invoice number
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const invoiceNumber = `INV-${year}-${randomSuffix}`;

    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 14); // 14 days default

    let invoiceCollegeId = application.collegeId || application.offering?.collegeId;
    if (!invoiceCollegeId && application.courseId) {
      const crs = await this.prisma.course.findUnique({
        where: { id: application.courseId },
        select: { collegeId: true },
      });
      if (crs?.collegeId) invoiceCollegeId = crs.collegeId;
    }
    if (!invoiceCollegeId) {
      const anyCollege = await this.prisma.college.findFirst({ select: { id: true } });
      invoiceCollegeId = anyCollege?.id || '';
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        applicationId: application.id,
        studentId: application.userId,
        collegeId: invoiceCollegeId,
        courseId: application.courseId,
        offeringId: application.offeringId,
        academicSession: application.offering?.academicSession || '2026-27',
        feePlan: dto.feePlan || 'ANNUAL',
        lineItems,
        subtotalAmount,
        discountAmount,
        scholarshipAmount,
        finalPayableAmount,
        paidAmount: 0,
        remainingBalance: finalPayableAmount,
        currency: application.offering?.currency || 'INR',
        status: finalPayableAmount === 0 ? 'PAID' : 'UNPAID',
        dueDate: dto.dueDate || defaultDueDate,
        notes: dto.notes || `Institutional invoice for ${application.course?.name || 'Program'} admission.`,
        createdById: creatorUserId,
      },
      include: {
        application: true,
        student: true,
        college: true,
        course: true,
      },
    });

    if (creatorUserId) {
      await this.auditService.logAction({
        userId: creatorUserId,
        action: 'INVOICE_CREATED',
        entity: 'Invoice',
        entityId: invoice.id,
        description: `Created invoice ${invoice.invoiceNumber} for amount ₹${finalPayableAmount}`,
        metadata: { invoiceNumber: invoice.invoiceNumber, applicationId: application.id },
      });
    }

    return {
      success: true,
      data: invoice,
      message: 'Authoritative invoice generated successfully.',
    };
  }

  /**
   * Find Invoices with multi-tenant data scope enforcement
   */
  async findAll(
    params: {
      collegeId?: string;
      studentId?: string;
      applicationId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    userId: string,
  ) {
    const ctx = await this.dataScopeService.resolveDataScope(userId);
    const isStudent = ctx.userRole === 'STUDENT' || ctx.roleSlugs?.includes('student');
    const where: any = {};

    if (isStudent) {
      where.studentId = userId;
    } else if (ctx.isCollegeStaff && ctx.collegeId) {
      where.collegeId = ctx.collegeId;
    } else if (params.collegeId) {
      where.collegeId = params.collegeId;
    }

    if (params.studentId && !isStudent) {
      where.studentId = params.studentId;
    }
    if (params.applicationId) {
      where.applicationId = params.applicationId;
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.search) {
      where.OR = [
        { invoiceNumber: { contains: params.search, mode: 'insensitive' } },
        { student: { fullName: { contains: params.search, mode: 'insensitive' } } },
        { student: { email: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          application: true,
          student: true,
          college: true,
          course: true,
          receipts: true,
        },
      }),
    ]);

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single invoice with IDOR protection
   */
  async findOne(id: string, userId: string) {
    const ctx = await this.dataScopeService.resolveDataScope(userId);
    const isStudent = ctx.userRole === 'STUDENT' || ctx.roleSlugs?.includes('student');
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        application: true,
        student: true,
        college: true,
        course: true,
        payments: true,
        receipts: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    // IDOR protection
    if (isStudent && invoice.studentId !== userId) {
      throw new ForbiddenException('Access Denied: You cannot view invoices for another applicant');
    }
    if (ctx.isCollegeStaff && invoice.collegeId !== ctx.collegeId) {
      throw new ForbiddenException('Access Denied: You cannot view invoices for another institution');
    }

    return {
      success: true,
      data: invoice,
    };
  }

  /**
   * Cancel an unpaid invoice
   */
  async cancelInvoice(id: string, userId: string, reason: string) {
    const ctx = await this.dataScopeService.resolveDataScope(userId);
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Cannot cancel an invoice that is already fully paid');
    }

    if (ctx.isCollegeStaff && invoice.collegeId !== ctx.collegeId) {
      throw new ForbiddenException('Access Denied');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: `${invoice.notes || ''} [Cancelled by ${userId}: ${reason}]`,
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'INVOICE_CANCELLED',
      entity: 'Invoice',
      entityId: id,
      description: `Cancelled invoice ${invoice.invoiceNumber}: ${reason}`,
    });

    return {
      success: true,
      data: updated,
      message: 'Invoice cancelled successfully',
    };
  }
}
