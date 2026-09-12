import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReferralPolicyService } from '../referrals/referral-policy.service';
import { CouponService } from '../coupons/coupon.service';
import {
  CreateFeeTypeDto,
  UpdateFeeTypeDto,
  CalculateFeeDto,
} from './dto/fee-catalog.dto';

export const STANDARD_FEE_CATEGORIES = [
  'ADMISSION',
  'APPLICATION',
  'COUNSELLING',
  'ACADEMIC',
  'STUDY_MATERIAL',
  'TUITION',
  'EXAMINATION',
  'ENROLLMENT',
  'REGISTRATION',
  'HOSTEL',
  'DEPOSIT',
  'SECURITY_DEPOSIT',
  'SERVICE',
  'SCHOLARSHIP',
  'TRANSPORT',
  'LAB',
  'LIBRARY',
  'CERTIFICATION',
  'PLACEMENT',
  'SPORTS',
  'ACTIVITY',
  'ALUMNI',
  'OTHER',
];

export const CANONICAL_FEE_CATALOG = [
  {
    code: 'COUNSELLING_FEE',
    name: 'Admission Counselling Fee',
    description: 'One-time expert admission counselling & seat guidance fee.',
    category: 'ADMISSION',
    defaultAmount: 1000,
    currency: 'INR',
    isRefundable: false,
    isMandatory: true,
    displayOrder: 1,
  },
  {
    code: 'APPLICATION_FEE',
    name: 'College Application Fee',
    description: 'Processing fee for university application submission.',
    category: 'ADMISSION',
    defaultAmount: 1500,
    currency: 'INR',
    isRefundable: false,
    isMandatory: true,
    displayOrder: 2,
  },
  {
    code: 'STUDY_MATERIAL_FEE',
    name: 'Academic Study Material Kit',
    description: 'Comprehensive curriculum study material and digital access kit.',
    category: 'ACADEMIC',
    defaultAmount: 2000,
    currency: 'INR',
    isRefundable: false,
    isMandatory: false,
    displayOrder: 3,
  },
  {
    code: 'REGISTRATION_FEE',
    name: 'University Registration Fee',
    description: 'Official university registration & enrollment processing fee.',
    category: 'ADMISSION',
    defaultAmount: 2500,
    currency: 'INR',
    isRefundable: false,
    isMandatory: true,
    displayOrder: 4,
  },
  {
    code: 'ADMISSION_FEE',
    name: 'Seat Confirmation & Admission Fee',
    description: 'Direct institutional admission confirmation fee.',
    category: 'ADMISSION',
    defaultAmount: 10000,
    currency: 'INR',
    isRefundable: false,
    isMandatory: true,
    displayOrder: 5,
  },
  {
    code: 'TUITION_FEE',
    name: 'Academic Tuition Fee (Year 1)',
    description: 'First-year course tuition fee for academic instruction.',
    category: 'ACADEMIC',
    defaultAmount: 50000,
    currency: 'INR',
    isRefundable: true,
    isMandatory: true,
    displayOrder: 6,
  },
  {
    code: 'SECURITY_DEPOSIT',
    name: 'Refundable Caution Security Deposit',
    description: 'Institutional refundable caution deposit upon graduation.',
    category: 'DEPOSIT',
    defaultAmount: 5000,
    currency: 'INR',
    isRefundable: true,
    isMandatory: true,
    displayOrder: 7,
  },
  {
    code: 'EXAMINATION_FEE',
    name: 'Semester Examination Fee',
    description: 'Semester examination and assessment evaluation fee.',
    category: 'ACADEMIC',
    defaultAmount: 3000,
    currency: 'INR',
    isRefundable: false,
    isMandatory: true,
    displayOrder: 8,
  },
  {
    code: 'ENROLLMENT_FEE',
    name: 'Student Enrollment ID Fee',
    description: 'Student ID and administrative portal license fee.',
    category: 'ADMISSION',
    defaultAmount: 1200,
    currency: 'INR',
    isRefundable: false,
    isMandatory: true,
    displayOrder: 9,
  },
  {
    code: 'HOSTEL_FEE',
    name: 'Hostel & Residential Fee',
    description: 'Campus accommodation and residential lodging fee.',
    category: 'HOSTEL',
    defaultAmount: 35000,
    currency: 'INR',
    isRefundable: true,
    isMandatory: false,
    displayOrder: 10,
  },
  {
    code: 'MISC_FEE',
    name: 'Miscellaneous Activity & Lab Fee',
    description: 'Campus laboratory, sports, and extracurricular activity charges.',
    category: 'OTHER',
    defaultAmount: 1000,
    currency: 'INR',
    isRefundable: false,
    isMandatory: false,
    displayOrder: 11,
  },
];

@Injectable()
export class FeeCatalogService {
  private readonly logger = new Logger(FeeCatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    private readonly referralPolicyService: ReferralPolicyService,
    @Inject(forwardRef(() => CouponService))
    private readonly couponService: CouponService,
  ) {}

  /**
   * Auto-seeds canonical 11 fee types if table is empty.
   */
  async seedCanonicalFeeTypes() {
    const count = await this.prisma.feeType.count();
    if (count === 0) {
      this.logger.log('Seeding canonical 11 fee types in Fee Catalog...');
      for (const item of CANONICAL_FEE_CATALOG) {
        await this.prisma.feeType.create({
          data: {
            code: item.code,
            name: item.name,
            description: item.description,
            category: item.category,
            defaultAmount: item.defaultAmount,
            currency: item.currency,
            isRefundable: item.isRefundable,
            isMandatory: item.isMandatory,
            displayOrder: item.displayOrder,
            isActive: true,
          },
        });
      }
    }
  }

  /**
   * Returns all supported fee categories dynamically (merging standard categories + any custom DB categories).
   */
  async getCategories(): Promise<string[]> {
    const existing = await this.prisma.feeType.findMany({
      select: { category: true },
      distinct: ['category'],
    });

    const dbCategories = existing.map((e) => e.category.toUpperCase().trim());
    const combined = Array.from(new Set([...STANDARD_FEE_CATEGORIES, ...dbCategories]));
    return combined.sort();
  }

  /**
   * Retrieves all fee types with optional filters.
   */
  async getAllFeeTypes(params?: {
    category?: string;
    isActive?: boolean;
    collegeId?: string;
    courseId?: string;
    branchId?: string;
    academicSession?: string;
    q?: string;
  }) {
    await this.seedCanonicalFeeTypes();

    const where: any = {};
    if (params?.category && params.category !== 'ALL') where.category = params.category;
    if (params?.isActive !== undefined) where.isActive = params.isActive;
    if (params?.collegeId) where.collegeId = params.collegeId;
    if (params?.courseId) where.courseId = params.courseId;
    if (params?.branchId) where.branchId = params.branchId;
    if (params?.academicSession) where.academicSession = params.academicSession;
    if (params?.q && params.q.trim()) {
      const q = params.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.feeType.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Get single fee type by code or id.
   */
  async getFeeTypeByCodeOrId(identifier: string) {
    await this.seedCanonicalFeeTypes();

    const feeType = await this.prisma.feeType.findFirst({
      where: {
        OR: [{ id: identifier }, { code: identifier.toUpperCase() }],
      },
    });

    if (!feeType) {
      throw new NotFoundException(`Fee type "${identifier}" not found in catalog.`);
    }

    return feeType;
  }

  /**
   * Create new fee type (Admin).
   */
  async createFeeType(dto: CreateFeeTypeDto, actorUserId?: string) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.feeType.findUnique({
      where: { code },
    });

    if (existing) {
      throw new BadRequestException(`Fee type code "${code}" already exists.`);
    }

    const created = await this.prisma.feeType.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        category: dto.category ? dto.category.trim().toUpperCase() : 'ACADEMIC',
        defaultAmount: Number(dto.defaultAmount),
        currency: dto.currency || 'INR',
        isRefundable: dto.isRefundable ?? false,
        isMandatory: dto.isMandatory ?? true,
        isCouponEligible: dto.isCouponEligible ?? true,
        isPaymentEnabled: dto.isPaymentEnabled ?? true,
        applicableScope: dto.applicableScope || 'ALL',
        collegeId: dto.collegeId || null,
        courseId: dto.courseId || null,
        branchId: dto.branchId || null,
        academicSession: dto.academicSession || '2026-2027',
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditService.logAction({
      action: 'FEE_TYPE_CREATED',
      module: 'FINANCE',
      entity: 'FeeType',
      entityId: created.id,
      userId: actorUserId,
      description: `Created new fee type ${created.code} (₹${created.defaultAmount}).`,
    });

    return created;
  }

  /**
   * Update fee type (Admin).
   */
  async updateFeeType(id: string, dto: UpdateFeeTypeDto, actorUserId?: string) {
    const existing = await this.prisma.feeType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Fee type not found.');

    const updated = await this.prisma.feeType.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.category ? { category: dto.category.trim().toUpperCase() } : {}),
        ...(dto.defaultAmount !== undefined ? { defaultAmount: Number(dto.defaultAmount) } : {}),
        ...(dto.currency ? { currency: dto.currency } : {}),
        ...(dto.isRefundable !== undefined ? { isRefundable: dto.isRefundable } : {}),
        ...(dto.isMandatory !== undefined ? { isMandatory: dto.isMandatory } : {}),
        ...(dto.isCouponEligible !== undefined ? { isCouponEligible: dto.isCouponEligible } : {}),
        ...(dto.isPaymentEnabled !== undefined ? { isPaymentEnabled: dto.isPaymentEnabled } : {}),
        ...(dto.applicableScope ? { applicableScope: dto.applicableScope } : {}),
        ...(dto.collegeId !== undefined ? { collegeId: dto.collegeId || null } : {}),
        ...(dto.courseId !== undefined ? { courseId: dto.courseId || null } : {}),
        ...(dto.branchId !== undefined ? { branchId: dto.branchId || null } : {}),
        ...(dto.academicSession ? { academicSession: dto.academicSession } : {}),
        ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.auditService.logAction({
      action: 'FEE_TYPE_UPDATED',
      module: 'FINANCE',
      entity: 'FeeType',
      entityId: id,
      userId: actorUserId,
      description: `Updated fee type ${existing.code}.`,
    });

    return updated;
  }

  /**
   * Toggle fee type active status (Admin).
   */
  async toggleFeeTypeStatus(id: string, actorUserId?: string) {
    const existing = await this.prisma.feeType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Fee type not found.');

    const updated = await this.prisma.feeType.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    await this.auditService.logAction({
      action: 'FEE_TYPE_STATUS_TOGGLED',
      module: 'FINANCE',
      entity: 'FeeType',
      entityId: id,
      userId: actorUserId,
      description: `Toggled fee type ${existing.code} status to ${updated.isActive ? 'ACTIVE' : 'INACTIVE'}.`,
    });

    return updated;
  }

  /**
   * Centralized Calculation: Calculates net payable amount for any fee type,
   * factoring in:
   * 1. Catalog base amount (or custom passed amount)
   * 2. Referred Student Counselling Benefit (if fee is COUNSELLING_FEE and student is referred)
   * 3. Coupon Discount (if valid coupon provided and scope matches)
   * 4. Explicit Stacking Rules (Default: NO stacking; highest single discount is applied unless stacking allowed)
   */
  async calculateFeeWithDiscounts(dto: CalculateFeeDto, userId?: string) {
    const feeType = await this.getFeeTypeByCodeOrId(dto.feeTypeCode);
    const grossAmount = dto.customAmount !== undefined ? Number(dto.customAmount) : feeType.defaultAmount;

    let referralDiscount = 0;
    let referralBenefitDetails: any = null;
    let isReferredStudent = false;

    // 1. Evaluate Referred Student Benefit (if COUNSELLING_FEE and user is referred)
    if (feeType.code === 'COUNSELLING_FEE' && userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, referredByCode: true, counsellingDiscountUsed: true },
      });

      if (user?.referredByCode || (await this.prisma.studentReferral.findFirst({ where: { referredStudentId: userId } }))) {
        isReferredStudent = true;
        const activePolicy = await this.referralPolicyService.getActivePolicy();
        const benefit = this.referralPolicyService.calculateCounsellingBenefit(grossAmount, activePolicy, {
          collegeId: dto.collegeId,
          courseId: dto.courseId,
          academicSession: dto.academicSession,
        });

        if (benefit.applicable) {
          referralDiscount = benefit.discountAmount;
          referralBenefitDetails = benefit;
        }
      }
    }

    // 2. Evaluate Coupon (if provided)
    let couponDiscount = 0;
    let couponDetails: any = null;

    if (dto.couponCode && dto.couponCode.trim()) {
      const couponRes = await this.couponService.validateCoupon({
        code: dto.couponCode.trim().toUpperCase(),
        transactionAmount: grossAmount,
        applicableScope: feeType.code,
        collegeId: dto.collegeId,
        courseId: dto.courseId,
        branchId: dto.branchId,
        academicSession: dto.academicSession,
        userId,
      });

      if (couponRes.valid && couponRes.discountAmount) {
        couponDiscount = couponRes.discountAmount;
        couponDetails = couponRes;
      }
    }

    // 3. Stacking Rules & Total Discount Resolution
    let totalDiscount = 0;
    let stackingApplied = false;
    let appliedBenefitType: 'NONE' | 'REFERRAL_BENEFIT' | 'COUPON' | 'STACKED' = 'NONE';

    const allowStacking =
      (referralBenefitDetails?.allowStackingWithCoupon && couponDetails?.allowStacking) ?? false;

    if (referralDiscount > 0 && couponDiscount > 0) {
      if (allowStacking) {
        totalDiscount = Math.min(grossAmount, referralDiscount + couponDiscount);
        stackingApplied = true;
        appliedBenefitType = 'STACKED';
      } else {
        // No stacking: apply highest discount
        if (referralDiscount >= couponDiscount) {
          totalDiscount = referralDiscount;
          appliedBenefitType = 'REFERRAL_BENEFIT';
        } else {
          totalDiscount = couponDiscount;
          appliedBenefitType = 'COUPON';
        }
      }
    } else if (referralDiscount > 0) {
      totalDiscount = referralDiscount;
      appliedBenefitType = 'REFERRAL_BENEFIT';
    } else if (couponDiscount > 0) {
      totalDiscount = couponDiscount;
      appliedBenefitType = 'COUPON';
    }

    totalDiscount = Math.round(totalDiscount * 100) / 100;
    const payableAmount = Math.max(0, Math.round((grossAmount - totalDiscount) * 100) / 100);

    return {
      feeTypeCode: feeType.code,
      feeTypeName: feeType.name,
      category: feeType.category,
      isRefundable: feeType.isRefundable,
      isMandatory: feeType.isMandatory,
      grossAmount,
      referralDiscount,
      couponDiscount,
      totalDiscount,
      payableAmount,
      isFree: payableAmount === 0,
      appliedBenefitType,
      stackingApplied,
      isReferredStudent,
      referralBenefit: referralBenefitDetails,
      coupon: couponDetails,
    };
  }
}
