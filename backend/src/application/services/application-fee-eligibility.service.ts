import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CouponService } from '../../coupons/coupon.service';
import { ApplicationStatus, PaymentStatus } from '@prisma/client';

export const QUALIFYING_APPLICATION_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.DOCUMENT_PENDING,
  ApplicationStatus.DOCUMENTS_VERIFIED,
  ApplicationStatus.APPROVED,
  ApplicationStatus.ADMISSION_CONFIRMED,
];

export interface ApplicationFeeEligibilityResult {
  freeApplicationsLimit: number;
  freeApplicationsUsed: number;
  freeApplicationsRemaining: number;
  isWithinFreeQuota: boolean;
  applicationFeeApplicable: boolean;
  isAlreadyPaid: boolean;
  baseFee: number;
  grossAmount: number;
  discountAmount: number;
  finalPayableAmount: number;
  isZeroAmount: boolean;
  appliedCoupon?: {
    id?: string;
    code: string;
    discountAmount: number;
    finalAmount: number;
  } | null;
  currency: string;
  beneficiary: string;
  beneficiaryType: 'SWAYAM';
  routingMode: 'PLATFORM_GATEWAY';
  message: string;
}

@Injectable()
export class ApplicationFeeEligibilityService {
  private readonly logger = new Logger(ApplicationFeeEligibilityService.name);
  readonly FREE_APPLICATIONS_LIMIT = 3;
  readonly DEFAULT_APPLICATION_FEE = 1500;

  constructor(
    private readonly prisma: PrismaService,
    private readonly couponService: CouponService,
  ) {}

  /**
   * Authoritative calculation of user's free application allowance and fee breakdown.
   * Shared by Student UI, Admin UI, initiatePayment, submitApplication, and Admin Fee Requests.
   */
  async getEligibility(
    userId: string,
    targetApplicationId?: string,
    couponCode?: string,
  ): Promise<ApplicationFeeEligibilityResult> {
    if (!userId) {
      throw new BadRequestException('User ID is required for application fee eligibility check.');
    }

    // 1. Fetch Authoritative Application Fee from Fee Catalog
    let baseFee = this.DEFAULT_APPLICATION_FEE;
    try {
      const feeType = await this.prisma.feeType.findFirst({
        where: {
          OR: [{ code: 'APPLICATION_FEE' }, { id: 'APPLICATION_FEE' }],
          isActive: true,
        },
      });
      if (feeType && typeof feeType.defaultAmount === 'number' && feeType.defaultAmount > 0) {
        baseFee = feeType.defaultAmount;
      }
    } catch (err) {
      this.logger.warn(`Could not load APPLICATION_FEE from Fee Catalog, using fallback ${baseFee}`, err);
    }

    // 2. Count prior qualifying submitted applications for this student (excluding drafts, cancelled, rejected, and excluding target application)
    const priorQualifyingCount = await this.prisma.application.count({
      where: {
        userId,
        ...(targetApplicationId ? { id: { not: targetApplicationId } } : {}),
        status: { in: QUALIFYING_APPLICATION_STATUSES },
      },
    });

    const freeApplicationsUsed = Math.min(this.FREE_APPLICATIONS_LIMIT, priorQualifyingCount);
    const freeApplicationsRemaining = Math.max(0, this.FREE_APPLICATIONS_LIMIT - priorQualifyingCount);
    const isWithinFreeQuota = freeApplicationsRemaining > 0;

    // 3. Inspect target application if provided
    let isAlreadyPaid = false;
    let targetApp: any = null;

    if (targetApplicationId) {
      targetApp = await this.prisma.application.findUnique({
        where: { id: targetApplicationId },
        include: {
          college: true,
          course: true,
          payments: {
            where: {
              paymentType: 'APPLICATION_FEE',
              status: PaymentStatus.COMPLETED,
            },
          },
        },
      });

      if (!targetApp) {
        throw new NotFoundException(`Application ${targetApplicationId} not found.`);
      }

      if (targetApp.userId !== userId) {
        throw new ForbiddenException('You do not have access to this application.');
      }

      // The "already paid" check must ONLY be true for genuinely completed payments or verified free-quota/waiver settlements.
      // Unsubmitted drafts and applications awaiting payment must NEVER be marked as already paid.
      const isDraftOrUnsubmitted =
        targetApp.status === 'DRAFT' ||
        targetApp.status === 'NEW' ||
        targetApp.status === 'READY_TO_SUBMIT';

      if (isDraftOrUnsubmitted) {
        isAlreadyPaid = false;
      } else {
        const hasCompletedPayment = Array.isArray(targetApp.payments) && targetApp.payments.some(
          (p: any) => p.status === PaymentStatus.COMPLETED && p.paymentType === 'APPLICATION_FEE',
        );
        const isFreeSettled =
          targetApp.formData?.submittedSnapshot?.quota?.isFreeSubmission === true ||
          targetApp.remarks?.includes('Free Applications Quota');
        const isZeroCouponSettled =
          targetApp.formData?.submittedSnapshot?.quota?.isZeroAmount === true ||
          (targetApp.paymentStatus === PaymentStatus.COMPLETED && targetApp.remarks?.includes('coupon'));

        if (
          hasCompletedPayment ||
          (QUALIFYING_APPLICATION_STATUSES.includes(targetApp.status) &&
            targetApp.paymentStatus === PaymentStatus.COMPLETED &&
            (isFreeSettled || isZeroCouponSettled))
        ) {
          isAlreadyPaid = true;
        }
      }
    }

    // 4. Determine if application fee is applicable
    // If already paid: fee is not applicable
    // If within free quota: fee is covered by free quota (payable = 0)
    // If not within free quota: fee is applicable
    const applicationFeeApplicable = !isAlreadyPaid && !isWithinFreeQuota;

    let discountAmount = 0;
    let finalPayableAmount = baseFee;
    let appliedCoupon: any = null;

    if (isAlreadyPaid) {
      finalPayableAmount = 0;
      discountAmount = 0;
    } else if (isWithinFreeQuota) {
      discountAmount = baseFee;
      finalPayableAmount = 0;
    } else {
      // Exceeds free quota -> Fee is required; Check for eligible platform coupon
      if (couponCode && couponCode.trim()) {
        const normalizedCode = couponCode.trim().toUpperCase();
        const couponRes = await this.couponService.validateCoupon({
          code: normalizedCode,
          transactionAmount: baseFee,
          applicableScope: 'APPLICATION_FEE',
          collegeId: targetApp?.collegeId || undefined,
          courseId: targetApp?.courseId || undefined,
        });

        if (couponRes && couponRes.valid) {
          discountAmount = Math.min(baseFee, couponRes.discountAmount || 0);
          finalPayableAmount = Math.max(0, baseFee - discountAmount);
          appliedCoupon = {
            id: couponRes.couponId,
            code: couponRes.code || normalizedCode,
            discountAmount,
            finalAmount: finalPayableAmount,
          };
        } else {
          throw new BadRequestException(couponRes?.message || 'Invalid coupon for application fee.');
        }
      }
    }

    const isZeroAmount = finalPayableAmount === 0;

    let message = '';
    if (isAlreadyPaid) {
      message = 'Application fee has already been settled for this application.';
    } else if (isWithinFreeQuota) {
      message = `Application is free! (${freeApplicationsRemaining} of ${this.FREE_APPLICATIONS_LIMIT} free applications remaining)`;
    } else if (isZeroAmount && appliedCoupon) {
      message = `100% coupon ${appliedCoupon.code} applied. No payment gateway required.`;
    } else if (appliedCoupon) {
      message = `Coupon ${appliedCoupon.code} applied. You save ₹${discountAmount.toLocaleString('en-IN')}.`;
    } else {
      message = `Standard application fee of ₹${baseFee.toLocaleString('en-IN')} applicable.`;
    }

    return {
      freeApplicationsLimit: this.FREE_APPLICATIONS_LIMIT,
      freeApplicationsUsed,
      freeApplicationsRemaining,
      isWithinFreeQuota,
      applicationFeeApplicable,
      isAlreadyPaid,
      baseFee,
      grossAmount: baseFee,
      discountAmount,
      finalPayableAmount,
      isZeroAmount,
      appliedCoupon,
      currency: 'INR',
      beneficiary: 'Swayam Admission',
      beneficiaryType: 'SWAYAM',
      routingMode: 'PLATFORM_GATEWAY',
      message,
    };
  }
}
