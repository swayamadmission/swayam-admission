import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CouponService } from '../../coupons/coupon.service';

export interface FeeCalculationInput {
  paymentRequestId: string;
  studentId?: string;
  couponCode?: string;
}

export interface FeeCalculationResult {
  paymentRequestId: string;
  requestCode: string;
  feeHead: string;
  grossAmount: number;
  baseAmount: number;
  discountAmount: number;
  couponDiscount: number;
  scholarshipAmount: number;
  lateFeeAmount: number;
  finalPayableAmount: number;
  currency: string;
  beneficiary: string;
  beneficiaryType: 'SWAYAM' | 'COLLEGE';
  routingMode: 'PLATFORM_GATEWAY' | 'DIRECT_COLLEGE_BANK';
  couponApplicable: boolean;
  couponMessage?: string;
  appliedCoupon?: {
    code: string;
    discountAmount: number;
    discountType: string;
    discountValue: number;
  } | null;
  dueDate?: Date | null;
  expiryDate?: Date | null;
  isExpired: boolean;
  isPaid: boolean;
  status: string;
  collegeId?: string | null;
  collegeName?: string | null;
  courseId?: string | null;
  courseName?: string | null;
}

@Injectable()
export class FeeCalculationService {
  private readonly logger = new Logger(FeeCalculationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly couponService: CouponService,
  ) {}

  /**
   * Authoritative server-side calculation for a given Payment Request.
   * Enforces:
   * 1. Ownership (student cannot pay someone else's request).
   * 2. Expiry & settlement check.
   * 3. Beneficiary determination (Swayam vs College).
   * 4. HARD COUPON RULE: COUPONS ARE NOT VALID FOR DIRECT COLLEGE BANK PAYMENTS.
   * 5. Server-authoritative final payable amount calculation.
   */
  async calculateForPaymentRequest(
    input: FeeCalculationInput,
  ): Promise<FeeCalculationResult> {
    const { paymentRequestId, studentId, couponCode } = input;

    const request = await this.prisma.paymentRequest.findUnique({
      where: { id: paymentRequestId },
      include: {
        college: {
          select: { id: true, name: true, paymentMode: true, hybridFeeHeadMapping: true },
        },
        course: { select: { id: true, name: true } },
        student: { select: { id: true, fullName: true, email: true, mobile: true } },
      },
    });

    if (!request) {
      throw new NotFoundException(`Payment request ${paymentRequestId} not found.`);
    }

    // Ownership enforcement: student can only calculate/pay their own request
    if (studentId && request.studentId !== studentId) {
      throw new ForbiddenException('You are not authorized to view or pay this payment request.');
    }

    // Check expiry
    const now = new Date();
    const isExpired =
      request.isExpired ||
      request.status === 'EXPIRED' ||
      (request.expiryDate ? new Date(request.expiryDate) < now : false);

    if (isExpired && !request.isExpired) {
      // Opportunistically update database state
      await this.prisma.paymentRequest.update({
        where: { id: request.id },
        data: { isExpired: true, status: 'EXPIRED' },
      });
    }

    const isPaid =
      request.status === 'PAID' ||
      (Number(request.paidAmount) > 0 && Number(request.dueAmount) <= 0);

    // Determine Beneficiary and Routing Mode
    // PLATFORM -> PAID TO SWAYAM ADMISSION
    // DIRECT_COLLEGE -> PAID TO [COLLEGE NAME]
    const isDirectCollege = request.paymentDestination === 'DIRECT_COLLEGE';
    const beneficiaryType: 'SWAYAM' | 'COLLEGE' = isDirectCollege ? 'COLLEGE' : 'SWAYAM';
    const beneficiary = isDirectCollege
      ? request.college?.name || 'Partner College'
      : 'Swayam Admission';
    const routingMode: 'PLATFORM_GATEWAY' | 'DIRECT_COLLEGE_BANK' = isDirectCollege
      ? 'DIRECT_COLLEGE_BANK'
      : 'PLATFORM_GATEWAY';

    // MANDATORY BUSINESS RULE: Coupons are NOT applicable for direct college bank payments.
    const couponApplicable = !isDirectCollege;

    let couponDiscount = 0;
    let appliedCoupon: FeeCalculationResult['appliedCoupon'] = null;
    let couponMessage: string | undefined = undefined;

    if (couponCode && couponCode.trim()) {
      const cleanCouponCode = couponCode.trim().toUpperCase();

      if (isDirectCollege) {
        throw new BadRequestException(
          'This coupon is not applicable to this payment.',
          'COUPON_NOT_APPLICABLE_TO_PAYMENT',
        );
      }

      // Authoritative validation with CouponService
      const basePayable = Number(request.dueAmount || request.finalPayableAmount || request.requestedAmount);
      const couponValidation = await this.couponService.validateCoupon(
        {
          code: cleanCouponCode,
          transactionAmount: basePayable,
          applicableScope: request.feeHead as string,
          collegeId: request.collegeId || undefined,
          courseId: request.courseId || undefined,
          userId: studentId,
        },
        studentId,
      );

      if (!couponValidation.valid) {
        throw new BadRequestException(
          couponValidation.message || 'Coupon is not applicable to this payment.',
          'COUPON_INVALID',
        );
      }

      couponDiscount = Number(couponValidation.discountAmount || 0);
      appliedCoupon = {
        code: cleanCouponCode,
        discountAmount: couponDiscount,
        discountType: couponValidation.discountType || 'FIXED',
        discountValue: couponValidation.discountValue || couponDiscount,
      };
      couponMessage = couponValidation.message;
    }

    const grossAmount = Number(request.totalAmount || request.requestedAmount || 0);
    const existingDiscount = Number(request.discountAmount || 0);
    const scholarshipAmount = Number(request.scholarshipAmount || 0);
    const lateFeeAmount = Number(request.lateFeeAmount || request.lateFee || 0);

    const totalDiscount = existingDiscount + couponDiscount;
    const finalPayableAmount = Math.max(
      0,
      Math.round((grossAmount - totalDiscount - scholarshipAmount + lateFeeAmount) * 100) / 100,
    );

    return {
      paymentRequestId: request.id,
      requestCode: request.requestCode,
      feeHead: request.feeHead as string,
      grossAmount,
      baseAmount: grossAmount,
      discountAmount: totalDiscount,
      couponDiscount,
      scholarshipAmount,
      lateFeeAmount,
      finalPayableAmount,
      currency: 'INR',
      beneficiary,
      beneficiaryType,
      routingMode,
      couponApplicable,
      couponMessage,
      appliedCoupon,
      dueDate: request.dueDate,
      expiryDate: request.expiryDate,
      isExpired,
      isPaid,
      status: request.status,
      collegeId: request.collegeId,
      collegeName: request.college?.name || null,
      courseId: request.courseId,
      courseName: request.course?.name || null,
    };
  }
}
