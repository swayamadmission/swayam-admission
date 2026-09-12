import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataScopeService } from '../auth/data-scope.service';
import { AuditService } from '../audit/audit.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { OfferingStatus, Prisma } from '@prisma/client';

@Injectable()
export class OfferingsService {
  private readonly logger = new Logger(OfferingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScopeService: DataScopeService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get all offerings with role-aware and scope-aware filters
   */
  async getOfferings(
    query: {
      collegeId?: string;
      courseId?: string;
      branchId?: string;
      academicSession?: string;
      status?: OfferingStatus;
      search?: string;
      page?: number;
      limit?: number;
      publicOnly?: boolean;
    },
    userId?: string,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    let where: Prisma.CollegeOfferingWhereInput = {};

    if (query.publicOnly) {
      where = {
        status: OfferingStatus.ACTIVE,
        college: {
          status: { in: ['PUBLISHED', 'ACTIVE'] },
          verified: true,
        },
      };
    } else if (userId) {
      const ctx = await this.dataScopeService.resolveDataScope(userId);
      const scopeFilter = this.dataScopeService.buildCollegeOfferingScopeFilter(ctx);
      where = { ...scopeFilter };
    }

    if (query.collegeId) {
      where.collegeId = query.collegeId;
    }
    if (query.courseId) {
      where.courseId = query.courseId;
    }
    if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.academicSession) {
      where.academicSession = query.academicSession;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { course: { name: { contains: query.search, mode: 'insensitive' } } },
        { branch: { name: { contains: query.search, mode: 'insensitive' } } },
        { college: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, offerings] = await Promise.all([
      this.prisma.collegeOffering.count({ where }),
      this.prisma.collegeOffering.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ academicSession: 'desc' }, { createdAt: 'desc' }],
        include: {
          college: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
              state: true,
              type: true,
              status: true,
              verified: true,
              logo: true,
            },
          },
          course: {
            select: {
              id: true,
              name: true,
              slug: true,
              level: true,
              category: true,
              duration: true,
              durationType: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
              slug: true,
              type: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: offerings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single offering by ID with IDOR protection
   */
  async getOfferingById(id: string, userId?: string) {
    const offering = await this.prisma.collegeOffering.findUnique({
      where: { id },
      include: {
        college: true,
        course: {
          include: {
            branches: true,
          },
        },
        branch: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        approvedBy: {
          select: { id: true, fullName: true, email: true },
        },
        changeRequests: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!offering) {
      throw new NotFoundException(`Offering with ID ${id} not found`);
    }

    if (userId) {
      const ctx = await this.dataScopeService.resolveDataScope(userId);
      this.dataScopeService.enforceCollegeScope(ctx, offering.collegeId);
    }

    return {
      success: true,
      data: offering,
    };
  }

  /**
   * Create a new college offering
   */
  async createOffering(dto: CreateOfferingDto, userId: string) {
    const ctx = await this.dataScopeService.resolveDataScope(userId);
    this.dataScopeService.enforceCollegeScope(ctx, dto.collegeId);

    // Verify college exists
    const college = await this.prisma.college.findUnique({
      where: { id: dto.collegeId },
    });
    if (!college) {
      throw new NotFoundException(`College with ID ${dto.collegeId} not found`);
    }

    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${dto.courseId} not found`);
    }

    // Verify branch if provided
    if (dto.branchId) {
      const branch = await this.prisma.courseBranch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch) {
        throw new NotFoundException(`Branch with ID ${dto.branchId} not found`);
      }
    }

    // Check for duplicate offering in same session
    const existing = await this.prisma.collegeOffering.findFirst({
      where: {
        collegeId: dto.collegeId,
        courseId: dto.courseId,
        branchId: dto.branchId || null,
        academicSession: dto.academicSession,
      },
    });

    if (existing) {
      throw new ConflictException(
        `An offering for this Course/Branch already exists in session ${dto.academicSession}`,
      );
    }

    // Calculate total fee
    const tuition = dto.tuitionFee || 0;
    const admission = dto.admissionFee || 0;
    const exam = dto.examFee || 0;
    const hostel = dto.hostelFee || 0;
    const transport = dto.transportFee || 0;
    const other = dto.otherCharges || 0;
    const calculatedTotal =
      dto.totalFee !== undefined
        ? dto.totalFee
        : tuition + admission + exam + hostel + transport + other;

    const totalSeats = dto.totalSeats || 60;
    const reservedSeats = dto.reservedSeats || 0;
    const availableSeats = totalSeats;

    const offering = await this.prisma.collegeOffering.create({
      data: {
        collegeId: dto.collegeId,
        courseId: dto.courseId,
        branchId: dto.branchId || null,
        academicSession: dto.academicSession,
        status: dto.status || OfferingStatus.DRAFT,
        totalSeats,
        reservedSeats,
        availableSeats,
        consumedSeats: 0,
        waitlistCount: 0,
        tuitionFee: tuition,
        admissionFee: admission,
        examFee: exam,
        hostelFee: hostel,
        transportFee: transport,
        otherCharges: other,
        totalFee: calculatedTotal,
        currency: dto.currency || 'INR',
        feeComponents: (dto.feeComponents as any) || [],
        eligibilityCriteria: dto.eligibilityCriteria || course.eligibility || null,
        minQualification: dto.minQualification || null,
        minPercentage: dto.minPercentage || null,
        scholarshipRules: dto.scholarshipRules || [],
        createdById: userId,
      },
      include: {
        college: true,
        course: true,
        branch: true,
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'OFFERING_CREATED',
      entity: 'CollegeOffering',
      entityId: offering.id,
      description: `Created offering for ${college.name} - ${course.name} (${dto.academicSession})`,
      metadata: { offeringId: offering.id, collegeId: dto.collegeId },
    });

    return {
      success: true,
      data: offering,
    };
  }

  /**
   * Update college offering details (seats, componentized fees, eligibility)
   */
  async updateOffering(id: string, dto: UpdateOfferingDto, userId: string) {
    const ctx = await this.dataScopeService.resolveDataScope(userId);
    const existing = await this.prisma.collegeOffering.findUnique({
      where: { id },
      include: { college: true },
    });

    if (!existing) {
      throw new NotFoundException(`Offering with ID ${id} not found`);
    }

    this.dataScopeService.enforceCollegeScope(ctx, existing.collegeId);

    // Compute updated fees if fee fields provided
    const tuition =
      dto.tuitionFee !== undefined ? dto.tuitionFee : existing.tuitionFee;
    const admission =
      dto.admissionFee !== undefined ? dto.admissionFee : existing.admissionFee;
    const exam = dto.examFee !== undefined ? dto.examFee : existing.examFee;
    const hostel =
      dto.hostelFee !== undefined ? dto.hostelFee : existing.hostelFee;
    const transport =
      dto.transportFee !== undefined ? dto.transportFee : existing.transportFee;
    const other =
      dto.otherCharges !== undefined ? dto.otherCharges : existing.otherCharges;

    const totalFee =
      dto.totalFee !== undefined
        ? dto.totalFee
        : tuition + admission + exam + hostel + transport + other;

    // Recalculate available seats if total seats updated
    let totalSeats = existing.totalSeats;
    let availableSeats = existing.availableSeats;
    if (dto.totalSeats !== undefined && dto.totalSeats !== existing.totalSeats) {
      totalSeats = dto.totalSeats;
      availableSeats = Math.max(0, totalSeats - existing.consumedSeats);
    }

    const updated = await this.prisma.collegeOffering.update({
      where: { id },
      data: {
        totalSeats,
        availableSeats,
        reservedSeats:
          dto.reservedSeats !== undefined
            ? dto.reservedSeats
            : existing.reservedSeats,
        tuitionFee: tuition,
        admissionFee: admission,
        examFee: exam,
        hostelFee: hostel,
        transportFee: transport,
        otherCharges: other,
        totalFee,
        currency: dto.currency || existing.currency,
        feeComponents:
          dto.feeComponents !== undefined
            ? (dto.feeComponents as any)
            : existing.feeComponents,
        eligibilityCriteria:
          dto.eligibilityCriteria !== undefined
            ? dto.eligibilityCriteria
            : existing.eligibilityCriteria,
        minQualification:
          dto.minQualification !== undefined
            ? dto.minQualification
            : existing.minQualification,
        minPercentage:
          dto.minPercentage !== undefined
            ? dto.minPercentage
            : existing.minPercentage,
        scholarshipRules:
          dto.scholarshipRules !== undefined
            ? dto.scholarshipRules
            : existing.scholarshipRules,
        changeReason: dto.changeReason || existing.changeReason,
        status: dto.status || existing.status,
      },
      include: {
        college: true,
        course: true,
        branch: true,
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'OFFERING_UPDATED',
      entity: 'CollegeOffering',
      entityId: id,
      description: `Updated offering ${id} for college ${existing.college.name}`,
      metadata: { before: existing, after: updated },
    });

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Submit offering for admin verification and approval
   */
  async submitOfferingForApproval(id: string, userId: string) {
    const ctx = await this.dataScopeService.resolveDataScope(userId);
    const offering = await this.prisma.collegeOffering.findUnique({
      where: { id },
      include: { college: true },
    });

    if (!offering) {
      throw new NotFoundException(`Offering with ID ${id} not found`);
    }

    this.dataScopeService.enforceCollegeScope(ctx, offering.collegeId);

    const updated = await this.prisma.collegeOffering.update({
      where: { id },
      data: {
        status: OfferingStatus.PENDING_APPROVAL,
        submissionDate: new Date(),
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'OFFERING_SUBMITTED',
      entity: 'CollegeOffering',
      entityId: id,
      description: `Offering ${id} submitted for approval by user ${userId}`,
    });

    return {
      success: true,
      data: updated,
      message: 'Offering submitted for approval successfully',
    };
  }

  /**
   * Admin approves offering -> becomes ACTIVE and discoverable
   */
  async approveOffering(id: string, adminUserId: string) {
    const ctx = await this.dataScopeService.resolveDataScope(adminUserId);
    if (!ctx.isSuperAdmin && !ctx.permissions.includes('college.offering.approve')) {
      throw new ForbiddenException(
        'Permission Denied: Only authorized administrators can approve college offerings',
      );
    }

    const offering = await this.prisma.collegeOffering.findUnique({
      where: { id },
      include: { college: true },
    });

    if (!offering) {
      throw new NotFoundException(`Offering with ID ${id} not found`);
    }

    const updated = await this.prisma.collegeOffering.update({
      where: { id },
      data: {
        status: OfferingStatus.ACTIVE,
        approvedAt: new Date(),
        approvedById: adminUserId,
      },
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'OFFERING_APPROVED',
      entity: 'CollegeOffering',
      entityId: id,
      description: `Admin approved offering ${id}. Now publicly discoverable.`,
    });

    return {
      success: true,
      data: updated,
      message: 'Offering approved and activated successfully',
    };
  }

  /**
   * Close offering intake (blocks new applications while keeping existing active)
   */
  async closeOffering(id: string, userId: string) {
    const ctx = await this.dataScopeService.resolveDataScope(userId);
    const offering = await this.prisma.collegeOffering.findUnique({
      where: { id },
      include: { college: true },
    });

    if (!offering) {
      throw new NotFoundException(`Offering with ID ${id} not found`);
    }

    this.dataScopeService.enforceCollegeScope(ctx, offering.collegeId);

    const updated = await this.prisma.collegeOffering.update({
      where: { id },
      data: {
        status: OfferingStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'OFFERING_CLOSED',
      entity: 'CollegeOffering',
      entityId: id,
      description: `Offering ${id} closed by user ${userId}`,
    });

    return {
      success: true,
      data: updated,
      message: 'Offering intake closed successfully',
    };
  }

  /**
   * Get seat matrix accounting for a college
   */
  async getSeatMatrix(collegeId: string, academicSession?: string, userId?: string) {
    if (userId) {
      const ctx = await this.dataScopeService.resolveDataScope(userId);
      this.dataScopeService.enforceCollegeScope(ctx, collegeId);
    }

    const where: Prisma.CollegeOfferingWhereInput = { collegeId };
    if (academicSession) {
      where.academicSession = academicSession;
    }

    const offerings = await this.prisma.collegeOffering.findMany({
      where,
      include: {
        course: { select: { name: true, slug: true, level: true } },
        branch: { select: { name: true, code: true } },
      },
      orderBy: [{ academicSession: 'desc' }, { course: { name: 'asc' } }],
    });

    const summary = offerings.reduce(
      (acc, off) => {
        acc.totalSeats += off.totalSeats;
        acc.availableSeats += off.availableSeats;
        acc.reservedSeats += off.reservedSeats;
        acc.consumedSeats += off.consumedSeats;
        acc.waitlistCount += off.waitlistCount;
        return acc;
      },
      {
        totalSeats: 0,
        availableSeats: 0,
        reservedSeats: 0,
        consumedSeats: 0,
        waitlistCount: 0,
      },
    );

    return {
      success: true,
      data: {
        offerings,
        summary,
      },
    };
  }

  /**
   * Transactional atomic seat reservation (decrements availableSeats, increments consumedSeats)
   * Throws 409 Conflict if availableSeats <= 0
   */
  async atomicConsumeSeat(
    offeringId: string,
    tx: Prisma.TransactionClient,
  ) {
    const offering = await tx.collegeOffering.findUnique({
      where: { id: offeringId },
    });

    if (!offering) {
      throw new NotFoundException(`Offering ${offeringId} not found`);
    }

    if (offering.status !== OfferingStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot allocate seat for offering in status ${offering.status}`,
      );
    }

    if (offering.availableSeats <= 0) {
      throw new ConflictException(
        'Seat Allocation Failed: No available seats remaining in this offering.',
      );
    }

    // Atomic update with concurrency guard
    const updated = await tx.collegeOffering.update({
      where: {
        id: offeringId,
      },
      data: {
        availableSeats: { decrement: 1 },
        consumedSeats: { increment: 1 },
        status:
          offering.availableSeats - 1 <= 0
            ? OfferingStatus.FULL
            : OfferingStatus.ACTIVE,
      },
    });

    return updated;
  }

  /**
   * Transactional atomic seat release (increments availableSeats, decrements consumedSeats)
   */
  async atomicReleaseSeat(
    offeringId: string,
    tx: Prisma.TransactionClient,
  ) {
    const offering = await tx.collegeOffering.findUnique({
      where: { id: offeringId },
    });

    if (!offering) return null;

    const newConsumed = Math.max(0, offering.consumedSeats - 1);
    const newAvailable = Math.min(
      offering.totalSeats,
      offering.availableSeats + 1,
    );

    const updated = await tx.collegeOffering.update({
      where: { id: offeringId },
      data: {
        availableSeats: newAvailable,
        consumedSeats: newConsumed,
        status:
          offering.status === OfferingStatus.FULL
            ? OfferingStatus.ACTIVE
            : offering.status,
      },
    });

    return updated;
  }
}
