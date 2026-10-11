import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateCouponDto,
  ValidateCouponDto,
  RedeemCouponDto,
} from './dto/create-coupon.dto';

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  /**
   * Validate a coupon code for a given transaction context without redeeming it.
   */
  async validateCoupon(dto: ValidateCouponDto, userId?: string) {
    // HARD BUSINESS RULE: Coupons are NOT valid for direct college bank payments
    if (
      dto.routingMode === 'DIRECT_COLLEGE_BANK' ||
      dto.paymentDestination === 'DIRECT_COLLEGE'
    ) {
      return {
        valid: false,
        code: 'COUPON_NOT_APPLICABLE_TO_PAYMENT',
        message: 'This coupon is not applicable to this payment.',
      };
    }

    if (dto.paymentRequestId) {
      const paymentReq = await this.prisma.paymentRequest.findUnique({
        where: { id: dto.paymentRequestId },
        select: { paymentDestination: true },
      });
      if (paymentReq?.paymentDestination === 'DIRECT_COLLEGE') {
        return {
          valid: false,
          code: 'COUPON_NOT_APPLICABLE_TO_PAYMENT',
          message: 'This coupon is not applicable to this payment.',
        };
      }
    }

    const cleanCode = dto.code.trim().toUpperCase();
    const now = new Date();

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon) {
      return { valid: false, message: 'Invalid coupon code.' };
    }

    if (!coupon.isActive) {
      return { valid: false, message: 'This coupon is inactive.' };
    }

    if (coupon.validFrom && coupon.validFrom > now) {
      return { valid: false, message: 'This coupon is not yet active.' };
    }

    if (coupon.validUntil && coupon.validUntil < now) {
      return { valid: false, message: 'This coupon has expired.' };
    }

    if (coupon.maxUsageCount && coupon.currentUsageCount >= coupon.maxUsageCount) {
      return { valid: false, message: 'Coupon usage limit has been reached.' };
    }

    if (dto.transactionAmount < coupon.minTransactionAmount) {
      return {
        valid: false,
        message: `Minimum transaction amount of ₹${coupon.minTransactionAmount} required to apply this coupon.`,
      };
    }

    // Scope check with canonical fee code normalization
    const normalizeScope = (s?: string) =>
      s ? s.trim().toUpperCase().replace(/[\s-]/g, '_') : '';
    const couponScope = normalizeScope(coupon.applicableScope);
    const targetScope = normalizeScope(dto.applicableScope);

    if (couponScope && couponScope !== 'ALL') {
      if (!targetScope || couponScope !== targetScope) {
        return {
          valid: false,
          message: `This coupon is only valid for ${coupon.applicableScope.toLowerCase().replace(/_/g, ' ')} transactions.`,
        };
      }
    }

    // College eligibility
    const eligibleColleges = coupon.eligibleCollegeIds as string[] | null;
    if (eligibleColleges && eligibleColleges.length > 0 && dto.collegeId) {
      if (!eligibleColleges.includes(dto.collegeId)) {
        return { valid: false, message: 'This coupon is not applicable to the selected college.' };
      }
    }

    // Course eligibility
    const eligibleCourses = coupon.eligibleCourseIds as string[] | null;
    if (eligibleCourses && eligibleCourses.length > 0 && dto.courseId) {
      if (!eligibleCourses.includes(dto.courseId)) {
        return { valid: false, message: 'This coupon is not applicable to the selected course.' };
      }
    }

    // Per-user usage limit check
    if (userId) {
      const userRedemptions = await this.prisma.couponRedemption.count({
        where: {
          couponId: coupon.id,
          userId,
          status: 'REDEEMED',
        },
      });

      if (userRedemptions >= coupon.maxUsagePerUser) {
        return {
          valid: false,
          message: `You have already redeemed this coupon the maximum allowed times (${coupon.maxUsagePerUser}).`,
        };
      }
    }

    // Calculate Discount
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (dto.transactionAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = Math.min(dto.transactionAmount, coupon.discountValue);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalAmount = Math.max(0, Math.round((dto.transactionAmount - discountAmount) * 100) / 100);

    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      originalAmount: dto.transactionAmount,
      discountAmount,
      finalAmount,
      message: `Coupon "${coupon.code}" applied! Saved ₹${discountAmount}.`,
    };
  }

  /**
   * Authoritative Redemption with race condition & idempotency safeguards.
   */
  async redeemCoupon(dto: RedeemCouponDto, userId: string) {
    const validation = await this.validateCoupon(
      {
        code: dto.code,
        transactionAmount: dto.transactionAmount,
        applicableScope: dto.applicableScope,
        collegeId: dto.collegeId,
        courseId: dto.courseId,
        branchId: dto.branchId,
      },
      userId,
    );

    if (!validation.valid || !validation.couponId) {
      throw new BadRequestException(validation.message || 'Coupon validation failed.');
    }

    const redemption = await this.prisma.$transaction(async (tx) => {
      // Re-verify under transaction lock
      const coupon = await tx.coupon.findUnique({
        where: { id: validation.couponId },
      });

      if (!coupon || !coupon.isActive) {
        throw new BadRequestException('Coupon is no longer active.');
      }

      if (coupon.maxUsageCount && coupon.currentUsageCount >= coupon.maxUsageCount) {
        throw new BadRequestException('Coupon usage limit reached during checkout.');
      }

      const userUsage = await tx.couponRedemption.count({
        where: { couponId: coupon.id, userId, status: 'REDEEMED' },
      });

      if (userUsage >= coupon.maxUsagePerUser) {
        throw new BadRequestException('User usage limit exceeded.');
      }

      const createdRedemption = await tx.couponRedemption.create({
        data: {
          couponId: coupon.id,
          userId,
          transactionId: dto.transactionId || null,
          transactionType: dto.transactionType,
          originalAmount: validation.originalAmount!,
          discountAmount: validation.discountAmount!,
          finalAmount: validation.finalAmount!,
          status: 'REDEEMED',
        },
      });

      await tx.coupon.update({
        where: { id: coupon.id },
        data: {
          currentUsageCount: { increment: 1 },
        },
      });

      return createdRedemption;
    });

    await this.auditService.logAction({
      action: 'COUPON_REDEEMED',
      module: 'PAYMENT',
      entity: 'CouponRedemption',
      entityId: redemption.id,
      userId,
      description: `Coupon ${dto.code} redeemed. Original: ₹${validation.originalAmount}, Discount: ₹${validation.discountAmount}, Net: ₹${validation.finalAmount}`,
    });

    return {
      success: true,
      redemptionId: redemption.id,
      code: dto.code.toUpperCase(),
      originalAmount: validation.originalAmount,
      discountAmount: validation.discountAmount,
      finalAmount: validation.finalAmount,
    };
  }

  // ─── ADMIN MANAGEMENT APIS ────────────────────────────────────────────────

  async createCoupon(dto: CreateCouponDto, actorUserId?: string) {
    const cleanCode = dto.code.trim().toUpperCase();

    const existing = await this.prisma.coupon.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      throw new ConflictException(`Coupon code "${cleanCode}" already exists.`);
    }

    const created = await this.prisma.coupon.create({
      data: {
        code: cleanCode,
        description: dto.description?.trim() || null,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscountAmount: dto.maxDiscountAmount || null,
        minTransactionAmount: dto.minTransactionAmount || 0,
        applicableScope: dto.applicableScope || 'ALL',
        eligibleCollegeIds: dto.eligibleCollegeIds || [],
        eligibleCourseIds: dto.eligibleCourseIds || [],
        eligibleBranchIds: dto.eligibleBranchIds || [],
        academicSession: dto.academicSession || null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        maxUsageCount: dto.maxUsageCount || null,
        maxUsagePerUser: dto.maxUsagePerUser || 1,
        allowStacking: dto.allowStacking || false,
        isActive: dto.isActive !== false,
        createdById: actorUserId || null,
      },
    });

    await this.auditService.logAction({
      action: 'COUPON_CREATED',
      module: 'GOVERNANCE',
      entity: 'Coupon',
      entityId: created.id,
      userId: actorUserId,
      description: `Coupon ${created.code} (${created.discountType} ${created.discountValue}) created.`,
    });

    return created;
  }

  async getAllCoupons() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { redemptions: true } },
      },
    });
  }

  async toggleCouponStatus(couponId: string, actorUserId?: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });
    if (!coupon) throw new NotFoundException('Coupon not found.');

    const updated = await this.prisma.coupon.update({
      where: { id: couponId },
      data: { isActive: !coupon.isActive },
    });

    await this.auditService.logAction({
      action: 'COUPON_STATUS_TOGGLED',
      module: 'GOVERNANCE',
      entity: 'Coupon',
      entityId: couponId,
      userId: actorUserId,
      description: `Coupon ${coupon.code} is now ${updated.isActive ? 'ACTIVE' : 'INACTIVE'}.`,
    });

    return updated;
  }

  async updateCoupon(
    couponId: string,
    dto: Partial<CreateCouponDto>,
    actorUserId?: string,
  ) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });
    if (!coupon) throw new NotFoundException('Coupon not found.');

    if (dto.code && dto.code.trim().toUpperCase() !== coupon.code) {
      const cleanCode = dto.code.trim().toUpperCase();
      const existing = await this.prisma.coupon.findUnique({
        where: { code: cleanCode },
      });
      if (existing) {
        throw new ConflictException(`Coupon code "${cleanCode}" already exists.`);
      }
    }

    const updated = await this.prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.discountType ? { discountType: dto.discountType } : {}),
        ...(dto.discountValue !== undefined ? { discountValue: dto.discountValue } : {}),
        ...(dto.maxDiscountAmount !== undefined ? { maxDiscountAmount: dto.maxDiscountAmount || null } : {}),
        ...(dto.minTransactionAmount !== undefined ? { minTransactionAmount: dto.minTransactionAmount || 0 } : {}),
        ...(dto.applicableScope ? { applicableScope: dto.applicableScope } : {}),
        ...(dto.eligibleCollegeIds ? { eligibleCollegeIds: dto.eligibleCollegeIds } : {}),
        ...(dto.eligibleCourseIds ? { eligibleCourseIds: dto.eligibleCourseIds } : {}),
        ...(dto.eligibleBranchIds ? { eligibleBranchIds: dto.eligibleBranchIds } : {}),
        ...(dto.academicSession !== undefined ? { academicSession: dto.academicSession || null } : {}),
        ...(dto.validFrom ? { validFrom: new Date(dto.validFrom) } : {}),
        ...(dto.validUntil !== undefined ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null } : {}),
        ...(dto.maxUsageCount !== undefined ? { maxUsageCount: dto.maxUsageCount || null } : {}),
        ...(dto.maxUsagePerUser !== undefined ? { maxUsagePerUser: dto.maxUsagePerUser || 1 } : {}),
        ...(dto.allowStacking !== undefined ? { allowStacking: dto.allowStacking } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.auditService.logAction({
      action: 'COUPON_UPDATED',
      module: 'GOVERNANCE',
      entity: 'Coupon',
      entityId: couponId,
      userId: actorUserId,
      description: `Coupon ${updated.code} updated.`,
    });

    return updated;
  }

  async deleteCoupon(couponId: string, actorUserId?: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
      include: { _count: { select: { redemptions: true } } },
    });
    if (!coupon) throw new NotFoundException('Coupon not found.');

    if (coupon._count.redemptions > 0) {
      // If redeemed, soft-deactivate rather than deleting historical redemptions
      const updated = await this.prisma.coupon.update({
        where: { id: couponId },
        data: { isActive: false },
      });

      await this.auditService.logAction({
        action: 'COUPON_DEACTIVATED',
        module: 'GOVERNANCE',
        entity: 'Coupon',
        entityId: couponId,
        userId: actorUserId,
        description: `Coupon ${coupon.code} has existing redemptions, marked INACTIVE instead of deleting.`,
      });

      return { success: true, message: 'Coupon has historical redemptions and has been deactivated.', archived: true };
    }

    await this.prisma.coupon.delete({ where: { id: couponId } });

    await this.auditService.logAction({
      action: 'COUPON_DELETED',
      module: 'GOVERNANCE',
      entity: 'Coupon',
      entityId: couponId,
      userId: actorUserId,
      description: `Coupon ${coupon.code} deleted.`,
    });

    return { success: true, message: 'Coupon deleted successfully.' };
  }

  async getCouponRedemptions(couponId?: string) {
    return this.prisma.couponRedemption.findMany({
      where: couponId ? { couponId } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        coupon: { select: { code: true, discountType: true, discountValue: true } },
        user: { select: { id: true, fullName: true, email: true, mobile: true } },
      },
    });
  }

  async getCouponAnalytics() {
    const [totalCoupons, activeCoupons, totalRedemptions, discountSum] = await Promise.all([
      this.prisma.coupon.count(),
      this.prisma.coupon.count({ where: { isActive: true } }),
      this.prisma.couponRedemption.count(),
      this.prisma.couponRedemption.aggregate({
        _sum: { discountAmount: true, originalAmount: true },
      }),
    ]);

    return {
      totalCoupons,
      activeCoupons,
      totalRedemptions,
      totalDiscountDisbursed: discountSum._sum.discountAmount || 0,
      totalGrossVolume: discountSum._sum.originalAmount || 0,
    };
  }

  /**
   * Return all active, non-expired, visible coupons applicable for a given transaction scope.
   */
  async getAvailableCoupons(
    scope?: string,
    transactionAmount?: number,
    userId?: string,
    collegeId?: string,
    courseId?: string,
  ) {
    const now = new Date();
    const normalizeScope = (s?: string) =>
      s ? s.trim().toUpperCase().replace(/[\s-]/g, '_') : '';
    const normScope = normalizeScope(scope);

    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
      },
      orderBy: { discountValue: 'desc' },
    });

    const eligible: any[] = [];
    for (const c of coupons) {
      if (c.validFrom && new Date(c.validFrom) > now) {
        continue;
      }
      if (c.validUntil && new Date(c.validUntil) < now) {
        continue;
      }
      // Visibility check
      const metadata = ((c as any).metadata || {}) as Record<string, any>;
      if (metadata.hiddenFromStudents === true || metadata.visibleToStudents === false) {
        continue;
      }

      // Usage limit
      if (c.maxUsageCount && c.currentUsageCount >= c.maxUsageCount) {
        continue;
      }

      // Scope match
      const cScope = normalizeScope(c.applicableScope);
      if (normScope && cScope !== 'ALL' && cScope !== normScope) {
        continue;
      }

      // Amount check if provided
      if (transactionAmount !== undefined && transactionAmount < c.minTransactionAmount) {
        continue;
      }

      // User limit check
      if (userId) {
        const userRedemptions = await this.prisma.couponRedemption.count({
          where: { couponId: c.id, userId, status: 'REDEEMED' },
        });
        if (userRedemptions >= c.maxUsagePerUser) {
          continue;
        }
      }

      // College / Course eligibility
      const eligibleColleges = c.eligibleCollegeIds as string[] | null;
      if (eligibleColleges && eligibleColleges.length > 0 && collegeId) {
        if (!eligibleColleges.includes(collegeId)) continue;
      }
      const eligibleCourses = c.eligibleCourseIds as string[] | null;
      if (eligibleCourses && eligibleCourses.length > 0 && courseId) {
        if (!eligibleCourses.includes(courseId)) continue;
      }

      eligible.push({
        id: c.id,
        code: c.code,
        description:
          c.description ||
          (c.discountType === 'PERCENTAGE'
            ? `${c.discountValue}% OFF on ${c.applicableScope.replace(/_/g, ' ')}`
            : `Flat ₹${c.discountValue} OFF on ${c.applicableScope.replace(/_/g, ' ')}`),
        discountType: c.discountType,
        discountValue: c.discountValue,
        maxDiscountAmount: c.maxDiscountAmount,
        minTransactionAmount: c.minTransactionAmount,
        applicableScope: c.applicableScope,
      });
    }

    return { success: true, data: eligible };
  }
}
