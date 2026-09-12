import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemConfigurationService } from '../settings/system-configuration.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralPolicyService } from './referral-policy.service';
import { ReferralQueryDto } from './dto/referral-query.dto';
import {
  AttributeLeadDto,
  OverrideAttributionDto,
  FraudReviewDto,
  ApproveRewardDto,
  RejectRewardDto,
  PayoutRewardDto,
} from './dto/create-referral.dto';
import * as crypto from 'crypto';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: SystemConfigurationService,
    private readonly policyService: ReferralPolicyService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationService: NotificationsService,
  ) {}

  // ─── 1. STUDENT REFERRAL CODE GENERATION & RETRIEVAL ──────────────────────

  /**
   * Get or generate a unique, non-guessable referral code for a student.
   * Note: Referrer Y's own admission is NOT required to refer and earn rewards.
   */
  async getOrCreateReferralCode(studentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      include: { referralCodeProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Student user not found.');
    }

    if (user.referralCodeProfile) {
      const stats = await this.calculateStudentReferralStats(studentUserId);
      return {
        code: user.referralCodeProfile.code,
        shareUrl: `https://swayamadmission.com/apply?ref=${user.referralCodeProfile.code}`,
        stats,
      };
    }

    // Generate unique, stable referral code
    const cleanName = (user.fullName || 'STUDENT')
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 5)
      .toUpperCase();
    const entropy = crypto.randomBytes(3).toString('hex').toUpperCase();
    const generatedCode = `SWY-${cleanName || 'STU'}-${entropy}`;

    const codeProfile = await this.prisma.studentReferralCode.create({
      data: {
        userId: studentUserId,
        code: generatedCode,
        isActive: true,
      },
    });

    const stats = await this.calculateStudentReferralStats(studentUserId);
    return {
      code: codeProfile.code,
      shareUrl: `https://swayamadmission.com/apply?ref=${codeProfile.code}`,
      stats,
    };
  }

  /**
   * Validate a referral code publicly (e.g. on Apply Now page or Registration).
   */
  async validateReferralCode(code: string) {
    const isProgramEnabled = await this.configService.getBoolean('referral.enabled', true);
    if (!isProgramEnabled) {
      return { valid: false, message: 'Referral program is currently paused.' };
    }

    const codeProfile = await this.prisma.studentReferralCode.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        user: { select: { id: true, fullName: true, role: true, email: true, mobile: true } },
      },
    });

    if (!codeProfile || !codeProfile.isActive) {
      return { valid: false, message: 'INVALID_REFERRAL_CODE: Referral code does not exist or is inactive.' };
    }

    const activePolicy = await this.policyService.getActivePolicy();
    const benefit = this.policyService.calculateCounsellingBenefit(1000, activePolicy);

    return {
      valid: true,
      code: codeProfile.code,
      referrerName: codeProfile.user.fullName || 'Verified Student',
      counsellingBenefit: benefit,
      message: 'REFERRAL_VALID',
    };
  }

  /**
   * Apply a referral code during initial registration or first-login onboarding modal.
   * Atomically attaches attribution, locks it permanently, and activates counselling benefit.
   */
  async applyReferralOnboarding(userId: string, rawCode: string, ipAddress?: string) {
    if (!rawCode || !rawCode.trim()) {
      throw new BadRequestException('Referral code is required.');
    }
    const cleanCode = rawCode.trim().toUpperCase();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    if (user.hasCompletedReferralOnboarding) {
      throw new BadRequestException(
        'USER_ALREADY_COMPLETED_ONBOARDING: Referral onboarding window has already completed for this account.',
      );
    }

    // Check if user is already referred
    const existingAttribution = await this.prisma.studentReferral.findFirst({
      where: { referredStudentId: userId },
    });
    if (existingAttribution || user.referredByCode) {
      throw new BadRequestException('USER_ALREADY_REFERRED: This account already has a locked referral attribution.');
    }

    const codeProfile = await this.prisma.studentReferralCode.findUnique({
      where: { code: cleanCode },
      include: { user: true },
    });

    if (!codeProfile || !codeProfile.isActive) {
      throw new BadRequestException('INVALID_REFERRAL_CODE: Referral code is invalid or inactive.');
    }

    const referrer = codeProfile.user;

    // Self referral prevention
    if (referrer.id === userId) {
      throw new BadRequestException('SELF_REFERRAL_NOT_ALLOWED: You cannot use your own referral code.');
    }

    const userMobileClean = (user.mobile || '').replace(/\D/g, '').slice(-10);
    const referrerMobileClean = (referrer.mobile || '').replace(/\D/g, '').slice(-10);

    if (
      (user.email && referrer.email && user.email.toLowerCase() === referrer.email.toLowerCase()) ||
      (userMobileClean && referrerMobileClean && userMobileClean === referrerMobileClean)
    ) {
      throw new BadRequestException('SELF_REFERRAL_NOT_ALLOWED: Identity match detected. Self-referral is forbidden.');
    }

    // Atomic transaction
    const activePolicy = await this.policyService.getActivePolicy();

    await this.prisma.$transaction(async (tx) => {
      await tx.studentReferral.create({
        data: {
          referralCode: cleanCode,
          referrerStudentId: referrer.id,
          referredStudentId: userId,
          referredName: user.fullName || 'Student',
          referredMobile: user.mobile || '',
          referredEmail: user.email,
          attributionSource: 'ONBOARDING',
          status: 'REGISTERED',
          fraudStatus: 'CLEAN',
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          hasCompletedReferralOnboarding: true,
          referredByCode: cleanCode,
        },
      });

      await tx.studentReferralCode.update({
        where: { id: codeProfile.id },
        data: {
          totalLeads: { increment: 1 },
        },
      });
    });

    const benefit = this.policyService.calculateCounsellingBenefit(1000, activePolicy);

    await this.auditService.logAction({
      action: 'REFERRAL_APPLIED_ONBOARDING',
      module: 'REFERRAL',
      entity: 'User',
      entityId: userId,
      userId,
      ipAddress,
      description: `Student ${user.email} successfully linked referral code ${cleanCode} from referrer ${referrer.id}.`,
    });

    return {
      success: true,
      message: 'REFERRAL_APPLIED',
      referralCode: cleanCode,
      referrerName: referrer.fullName || 'Verified Student',
      counsellingBenefit: benefit,
    };
  }

  /**
   * Skip referral onboarding. Marks onboarding as permanently completed for this user.
   */
  async skipReferralOnboarding(userId: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    if (!user.hasCompletedReferralOnboarding) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { hasCompletedReferralOnboarding: true },
      });

      await this.auditService.logAction({
        action: 'REFERRAL_ONBOARDING_SKIPPED',
        module: 'REFERRAL',
        entity: 'User',
        entityId: userId,
        userId,
        ipAddress,
        description: `Student ${user.email} skipped referral onboarding.`,
      });
    }

    return {
      success: true,
      message: 'Referral onboarding completed.',
    };
  }

  /**
   * Get the logged-in student's counselling referral benefit (if they were referred).
   */
  async getMyReferralBenefit(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        referredByCode: true,
        hasCompletedReferralOnboarding: true,
        counsellingDiscountUsed: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let referralCode = user.referredByCode;
    let referrerName = 'Swayam Peer';

    if (!referralCode) {
      const referralRec = await this.prisma.studentReferral.findFirst({
        where: { referredStudentId: userId },
        include: { referrerStudent: { select: { fullName: true } } },
      });
      if (referralRec) {
        referralCode = referralRec.referralCode;
        referrerName = referralRec.referrerStudent?.fullName || 'Swayam Peer';
      }
    } else {
      const codeProfile = await this.prisma.studentReferralCode.findUnique({
        where: { code: referralCode },
        include: { user: { select: { fullName: true } } },
      });
      if (codeProfile?.user?.fullName) {
        referrerName = codeProfile.user.fullName;
      }
    }

    if (!referralCode) {
      return {
        isReferred: false,
        hasCompletedOnboarding: user.hasCompletedReferralOnboarding,
        message: 'No referral code attached to this student account.',
      };
    }

    const activePolicy = await this.policyService.getActivePolicy();
    const benefit = this.policyService.calculateCounsellingBenefit(1000, activePolicy);

    return {
      isReferred: true,
      hasCompletedOnboarding: user.hasCompletedReferralOnboarding,
      referralCode,
      referrerName,
      counsellingDiscountUsed: user.counsellingDiscountUsed,
      grossFee: 1000,
      discountAmount: benefit.discountAmount,
      finalAmount: benefit.finalAmount,
      discountPercentage: benefit.discountValue,
      benefit,
      message: benefit.message,
    };
  }

  // ─── 2. LEAD REFERRAL ATTRIBUTION & ANTI-FRAUD ────────────────────────────

  /**
   * Attribute a newly created lead or applicant to a referring student.
   */
  async attributeLead(dto: AttributeLeadDto) {
    const isProgramEnabled = await this.configService.getBoolean('referral.enabled', true);
    if (!isProgramEnabled) {
      return { attributed: false, reason: 'Referral program disabled.' };
    }

    const codeProfile = await this.prisma.studentReferralCode.findUnique({
      where: { code: dto.referralCode.trim().toUpperCase() },
      include: { user: true },
    });

    if (!codeProfile || !codeProfile.isActive) {
      return { attributed: false, reason: 'Invalid referral code.' };
    }

    const referrer = codeProfile.user;

    // 1. Anti-Fraud: Self-Referral Prevention
    const cleanMobile = dto.mobile.replace(/\D/g, '').slice(-10);
    const referrerMobile = (referrer.mobile || '').replace(/\D/g, '').slice(-10);

    if (
      (referrer.email && dto.email && referrer.email.toLowerCase() === dto.email.toLowerCase()) ||
      (referrerMobile && cleanMobile && referrerMobile === cleanMobile)
    ) {
      this.logger.warn(`Self-referral attempt blocked: Referrer ${referrer.id} used own contact ${dto.mobile}/${dto.email}`);
      return { attributed: false, reason: 'Self-referral is not permitted.' };
    }

    // 2. Duplicate Check: Deterministic first valid referral wins
    const existingReferral = await this.prisma.studentReferral.findFirst({
      where: {
        OR: [
          { referredMobile: cleanMobile },
          ...(dto.email ? [{ referredEmail: dto.email.toLowerCase() }] : []),
          ...(dto.leadId ? [{ referredLeadId: dto.leadId }] : []),
        ],
      },
    });

    if (existingReferral) {
      return {
        attributed: false,
        reason: 'Applicant is already attributed to an earlier referral.',
        referralId: existingReferral.id,
      };
    }

    // 3. Active Referral Cap
    const maxReferrals = await this.configService.getNumber('referral.maxActiveReferralsPerStudent', 100);
    const activeCount = await this.prisma.studentReferral.count({
      where: { referrerStudentId: referrer.id },
    });

    if (activeCount >= maxReferrals) {
      return { attributed: false, reason: 'Referrer has reached the maximum allowed referral limit.' };
    }

    // 4. Create authoritative referral record
    const referral = await this.prisma.studentReferral.create({
      data: {
        referralCode: codeProfile.code,
        referrerStudentId: referrer.id,
        referredLeadId: dto.leadId || null,
        referredName: dto.fullName.trim(),
        referredMobile: cleanMobile,
        referredEmail: dto.email ? dto.email.toLowerCase().trim() : null,
        attributionSource: dto.attributionSource || 'LINK',
        campaignId: dto.campaignId || null,
        status: 'LEAD_CREATED',
        fraudStatus: 'CLEAN',
        isOneYearCompleted: false,
        isOneYearFeePaid: false,
        isQualifying: false,
        qualificationStatus: 'NOT_QUALIFIED',
        rewardEligibility: 'PENDING',
        rewardStatus: 'UNCLAIMED',
      },
    });

    await this.prisma.studentReferralCode.update({
      where: { id: codeProfile.id },
      data: { totalLeads: { increment: 1 } },
    });

    // Notify Referrer
    try {
      await this.notificationService.createNotification({
        title: 'New Student Referral Recorded 🎉',
        message: `Your referral for ${this.maskName(dto.fullName)} has been registered as an active applicant.`,
        priority: 'MEDIUM' as any,
        category: 'CRM',
        receiverId: referrer.id,
        actionUrl: '/dashboard/referrals',
      });
    } catch (err: any) {
      // Notification safe fallback
    }

    return {
      attributed: true,
      referralId: referral.id,
      referralCode: codeProfile.code,
    };
  }

  // ─── 3. LIFECYCLE SYNCHRONIZATION & QUALIFICATION ──────────────────────────

  /**
   * Syncs referral attribution status across CRM & Admissions.
   */
  async syncLifecycleEvent(
    event: 'REGISTERED' | 'APPLICATION_SUBMITTED' | 'ADMISSION_APPROVED' | 'PAYMENT_COMPLETED' | 'ENROLLED',
    context: {
      leadId?: string;
      studentUserId?: string;
      applicationId?: string;
      enrollmentId?: string;
      mobile?: string;
      email?: string;
    },
  ) {
    const cleanMobile = context.mobile ? context.mobile.replace(/\D/g, '').slice(-10) : undefined;

    const referral = await this.prisma.studentReferral.findFirst({
      where: {
        OR: [
          ...(context.leadId ? [{ referredLeadId: context.leadId }] : []),
          ...(context.studentUserId ? [{ referredStudentId: context.studentUserId }] : []),
          ...(cleanMobile ? [{ referredMobile: cleanMobile }] : []),
          ...(context.email ? [{ referredEmail: context.email.toLowerCase() }] : []),
        ],
      },
    });

    if (!referral) return null;

    const updateData: any = { status: event };

    if (context.studentUserId && !referral.referredStudentId) {
      updateData.referredStudentId = context.studentUserId;
    }
    if (context.applicationId && !referral.qualifyingApplicationId) {
      updateData.qualifyingApplicationId = context.applicationId;
    }
    if (context.enrollmentId) {
      updateData.qualifyingEnrollmentId = context.enrollmentId;
    }

    const updated = await this.prisma.studentReferral.update({
      where: { id: referral.id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Authoritative Qualification Condition Update:
   * Sets whether a referred student completed 1-year college and paid required 1-year fee.
   * Deterministically triggers aggregate referrer tier evaluation upon state change.
   */
  async updateReferralQualification(
    referralId: string,
    dto: {
      isOneYearCompleted?: boolean;
      isOneYearFeePaid?: boolean;
      evidence?: any;
    },
    actorUserId?: string,
  ) {
    const referral = await this.prisma.studentReferral.findUnique({
      where: { id: referralId },
    });
    if (!referral) throw new NotFoundException('Referral not found.');

    const isOneYearCompleted = dto.isOneYearCompleted ?? referral.isOneYearCompleted;
    const isOneYearFeePaid = dto.isOneYearFeePaid ?? referral.isOneYearFeePaid;
    const isQualifying = isOneYearCompleted && isOneYearFeePaid && referral.fraudStatus === 'CLEAN';

    const qualificationStatus = isQualifying
      ? 'QUALIFIED'
      : (isOneYearCompleted || isOneYearFeePaid)
      ? 'QUALIFYING'
      : 'NOT_QUALIFIED';

    const updated = await this.prisma.studentReferral.update({
      where: { id: referralId },
      data: {
        isOneYearCompleted,
        isOneYearFeePaid,
        isQualifying,
        qualificationStatus,
        qualificationEvidence: dto.evidence || referral.qualificationEvidence || {},
      },
    });

    await this.auditService.logAction({
      action: 'REFERRAL_QUALIFICATION_UPDATED',
      module: 'GOVERNANCE',
      entity: 'StudentReferral',
      entityId: referralId,
      userId: actorUserId,
      description: `Referral qualification: YearCompleted=${isOneYearCompleted}, FeePaid=${isOneYearFeePaid} -> Status=${qualificationStatus}`,
    });

    // Re-evaluate referrer reward tier
    await this.evaluateReferrerRewardTier(referral.referrerStudentId, actorUserId);

    return updated;
  }

  // ─── 4. TIER EVALUATION & REWARD LEDGER (AGGREGATE 4/3 & 8/6 RULES) ────────

  /**
   * Evaluates aggregate pool for Referrer Y:
   * 1. Total valid referrals >= 4 AND Qualifying referrals >= 3 => Tier 1 (₹4,000)
   * 2. Total valid referrals >= 8 AND Qualifying referrals >= 6 => Tier 2 (₹10,000)
   * 3. Selects Highest Achieved Tier.
   * 4. Applies Differential Upgrade (e.g. ₹4,000 paid for Tier 1 -> Tier 2 entitlement ₹10,000 -> net payable ₹6,000).
   * 5. Protects historical paid rewards from duplicate disbursements or silent overwrites.
   */
  async evaluateReferrerRewardTier(referrerStudentId: string, actorUserId?: string) {
    const isProgramEnabled = await this.configService.getBoolean('referral.enabled', true);
    if (!isProgramEnabled) {
      return null;
    }

    const activePolicy = await this.policyService.getActivePolicy();

    // Fetch all referrals by this student (excluding fraud rejected/invalid)
    const allReferrals = await this.prisma.studentReferral.findMany({
      where: {
        referrerStudentId,
        fraudStatus: { not: 'REJECTED' },
        status: { notIn: ['INVALID', 'CANCELLED'] },
      },
    });

    const totalValidReferrals = allReferrals.length;
    const qualifyingReferrals = allReferrals.filter((r) => r.isQualifying).length;

    const evaluation = this.policyService.evaluateReferralPool(
      totalValidReferrals,
      qualifyingReferrals,
      activePolicy,
    );

    if (!evaluation.achievedTier) {
      // No tier achieved yet
      return {
        achievedTier: null,
        totalValidReferrals,
        qualifyingReferrals,
        grossEntitledReward: 0,
        netPayable: 0,
        nextTier: evaluation.nextTier,
      };
    }

    const achievedTier = evaluation.achievedTier;
    const grossAmount = achievedTier.rewardAmount;

    // Check existing ledger entries for this referrer under current policy / lifecycle
    const existingRewards = await this.prisma.referralRewardLedger.findMany({
      where: {
        referrerStudentId,
        status: { notIn: ['REJECTED', 'REVERSED'] },
      },
    });

    const alreadyPaidAmount = existingRewards
      .filter((r) => r.status === 'PAID')
      .reduce((sum, r) => sum + r.amount, 0);

    const existingPendingAmount = existingRewards
      .filter((r) => ['PENDING_APPROVAL', 'APPROVED', 'PROCESSING'].includes(r.status))
      .reduce((sum, r) => sum + r.amount, 0);

    // Differential Settlement Calculation
    const totalCommitted = alreadyPaidAmount + existingPendingAmount;
    const netPayable = Math.max(0, grossAmount - totalCommitted);

    if (netPayable <= 0) {
      // Tier already fully provisioned or paid
      return {
        achievedTier,
        totalValidReferrals,
        qualifyingReferrals,
        grossEntitledReward: grossAmount,
        netPayable: 0,
        alreadyPaidAmount,
        existingPendingAmount,
        nextTier: evaluation.nextTier,
      };
    }

    const requiresApproval = await this.configService.getBoolean('referral.rewardApprovalRequired', true);
    const initialStatus = requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED';

    const ledgerEntry = await this.prisma.referralRewardLedger.create({
      data: {
        referrerStudentId,
        tierId: achievedTier.id,
        tierName: achievedTier.name,
        totalReferralsCount: totalValidReferrals,
        qualifyingReferralsCount: qualifyingReferrals,
        grossAmount,
        deductedPreviousAmount: totalCommitted,
        netPayableAmount: netPayable,
        amount: netPayable,
        currency: 'INR',
        rewardType: achievedTier.rewardType || 'CASH',
        status: initialStatus,
        ruleVersion: activePolicy.version,
      },
    });

    // Update Referrer Code profile stats
    await this.prisma.studentReferralCode.updateMany({
      where: { userId: referrerStudentId },
      data: {
        totalRewardsEarned: { increment: netPayable },
      },
    });

    await this.auditService.logAction({
      action: 'REWARD_TIER_ACHIEVED',
      module: 'FINANCE',
      entity: 'ReferralRewardLedger',
      entityId: ledgerEntry.id,
      userId: actorUserId || referrerStudentId,
      description: `Referrer achieved ${achievedTier.name} (${totalValidReferrals} total, ${qualifyingReferrals} qualifying). Gross: ₹${grossAmount}, Previous: ₹${totalCommitted}, Net Payable: ₹${netPayable}`,
    });

    // Notify Student
    try {
      await this.notificationService.createNotification({
        title: `Referral Milestone Reached: ${achievedTier.name} 🎁`,
        message: `Congratulations! You unlocked ${achievedTier.name} with ${qualifyingReferrals} qualifying student admissions. Your reward of ₹${netPayable} is now in processing.`,
        priority: 'HIGH' as any,
        category: 'PAYMENT',
        receiverId: referrerStudentId,
        actionUrl: '/dashboard/referrals',
      });
    } catch (e: any) {
      // Safe fallback
    }

    return {
      ledgerEntry,
      achievedTier,
      totalValidReferrals,
      qualifyingReferrals,
      grossEntitledReward: grossAmount,
      netPayable,
      nextTier: evaluation.nextTier,
    };
  }

  // ─── 5. FINANCE APPROVAL & PAYOUT GOVERNANCE ──────────────────────────────

  /**
   * Approve reward by Finance or Super Admin.
   */
  async approveReward(rewardId: string, actorUserId?: string, reason?: string) {
    const reward = await this.prisma.referralRewardLedger.findUnique({
      where: { id: rewardId },
    });

    if (!reward) throw new NotFoundException('Reward record not found.');
    if (reward.status === 'PAID') throw new BadRequestException('Reward is already paid.');

    const updated = await this.prisma.referralRewardLedger.update({
      where: { id: rewardId },
      data: {
        status: 'APPROVED',
        approvedById: actorUserId || null,
        approvedAt: new Date(),
      },
    });

    await this.auditService.logAction({
      action: 'REWARD_APPROVED',
      module: 'FINANCE',
      entity: 'ReferralRewardLedger',
      entityId: rewardId,
      userId: actorUserId,
      description: `Referral reward of ₹${reward.amount} approved. ${reason ? `Reason: ${reason}` : ''}`,
    });

    return updated;
  }

  /**
   * Reject reward with mandatory reason.
   */
  async rejectReward(rewardId: string, actorUserId: string, reason: string) {
    if (!reason || reason.trim() === '') {
      throw new BadRequestException('Rejection reason is mandatory.');
    }

    const reward = await this.prisma.referralRewardLedger.findUnique({
      where: { id: rewardId },
    });
    if (!reward) throw new NotFoundException('Reward record not found.');

    const updated = await this.prisma.referralRewardLedger.update({
      where: { id: rewardId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
      },
    });

    await this.auditService.logAction({
      action: 'REWARD_REJECTED',
      module: 'FINANCE',
      entity: 'ReferralRewardLedger',
      entityId: rewardId,
      userId: actorUserId,
      description: `Referral reward of ₹${reward.amount} rejected. Reason: ${reason}`,
    });

    return updated;
  }

  /**
   * Process and mark reward payout with payment reference.
   */
  async processPayout(rewardId: string, dto: PayoutRewardDto, actorUserId?: string) {
    const reward = await this.prisma.referralRewardLedger.findUnique({
      where: { id: rewardId },
    });

    if (!reward) throw new NotFoundException('Reward record not found.');
    if (reward.status === 'PAID') throw new BadRequestException('Reward is already marked as PAID.');

    const updated = await this.prisma.referralRewardLedger.update({
      where: { id: rewardId },
      data: {
        status: 'PAID',
        payoutMethod: dto.payoutMethod,
        payoutReference: dto.payoutReference.trim(),
        paidAt: new Date(),
      },
    });

    // Update code profile total paid
    await this.prisma.studentReferralCode.updateMany({
      where: { userId: reward.referrerStudentId },
      data: {
        totalRewardsPaid: { increment: reward.amount },
      },
    });

    await this.auditService.logAction({
      action: 'REWARD_PAYOUT_COMPLETED',
      module: 'FINANCE',
      entity: 'ReferralRewardLedger',
      entityId: rewardId,
      userId: actorUserId,
      description: `Referral reward payout of ₹${reward.amount} completed via ${dto.payoutMethod}. Ref: ${dto.payoutReference}`,
    });

    try {
      await this.notificationService.createNotification({
        title: 'Referral Reward Paid 💳',
        message: `Your reward of ₹${reward.amount} has been paid via ${dto.payoutMethod} (Ref: ${dto.payoutReference}).`,
        priority: 'HIGH' as any,
        category: 'PAYMENT',
        receiverId: reward.referrerStudentId,
        actionUrl: '/dashboard/referrals',
      });
    } catch (e: any) {
      // safe fallback
    }

    return updated;
  }

  // ─── 6. FRAUD & ATTRIBUTION OVERRIDES ──────────────────────────────────────

  /**
   * Get single referral details with populated relations.
   */
  async getReferralDetail(referralId: string) {
    const referral = await this.prisma.studentReferral.findUnique({
      where: { id: referralId },
      include: {
        referrerStudent: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
        referredLead: {
          select: { id: true, preferredCourse: true, preferredCollege: true, status: true },
        },
        rewards: true,
      },
    });
    if (!referral) throw new NotFoundException('Referral record not found.');
    return referral;
  }

  /**
   * Review suspected fraud or circular referrals.
   */
  async reviewFraud(referralId: string, dto: FraudReviewDto, actorUserId?: string) {
    const referral = await this.prisma.studentReferral.findUnique({
      where: { id: referralId },
    });
    if (!referral) throw new NotFoundException('Referral not found.');

    const updated = await this.prisma.studentReferral.update({
      where: { id: referralId },
      data: {
        fraudStatus: dto.decision,
        fraudReason: dto.reason ? dto.reason.trim() : null,
        isQualifying: dto.decision === 'APPROVED' ? referral.isOneYearCompleted && referral.isOneYearFeePaid : false,
      },
    });

    await this.auditService.logAction({
      action: 'FRAUD_FLAG_REVIEWED',
      module: 'SECURITY',
      entity: 'StudentReferral',
      entityId: referralId,
      userId: actorUserId,
      description: `Referral fraud status changed to ${dto.decision}. Reason: ${dto.reason}`,
    });

    // Re-evaluate referrer tier after fraud status decision
    await this.evaluateReferrerRewardTier(referral.referrerStudentId, actorUserId);

    return updated;
  }

  /**
   * Correct or override referral attribution.
   */
  async overrideAttribution(referralId: string, dto: OverrideAttributionDto, actorUserId?: string) {
    const referral = await this.prisma.studentReferral.findUnique({
      where: { id: referralId },
    });

    if (!referral) throw new NotFoundException('Referral record not found.');

    const newCodeProfile = await this.prisma.studentReferralCode.findFirst({
      where: {
        OR: [{ code: dto.newReferrerCodeOrId.trim().toUpperCase() }, { userId: dto.newReferrerCodeOrId }],
      },
    });

    if (!newCodeProfile) {
      throw new NotFoundException(`New referrer profile for "${dto.newReferrerCodeOrId}" not found.`);
    }

    const previousReferrerId = referral.referrerStudentId;

    const updated = await this.prisma.studentReferral.update({
      where: { id: referralId },
      data: {
        referrerStudentId: newCodeProfile.userId,
        referralCode: newCodeProfile.code,
        overrideReason: dto.reason.trim(),
        overriddenById: actorUserId || null,
      },
    });

    await this.auditService.logAction({
      action: 'REFERRAL_OVERRIDDEN',
      module: 'GOVERNANCE',
      entity: 'StudentReferral',
      entityId: referralId,
      userId: actorUserId,
      description: `Referral attribution changed from ${previousReferrerId} to ${newCodeProfile.userId}. Reason: ${dto.reason}`,
    });

    // Re-evaluate both old and new referrers
    await this.evaluateReferrerRewardTier(previousReferrerId, actorUserId);
    await this.evaluateReferrerRewardTier(newCodeProfile.userId, actorUserId);

    return updated;
  }

  // ─── 7. STUDENT DASHBOARD API ─────────────────────────────────────────────

  /**
   * Get student's referral statistics, aggregate tier, next tier progress, and masked list.
   */
  async getMyReferrals(studentUserId: string) {
    const profile = await this.getOrCreateReferralCode(studentUserId);
    const activePolicy = await this.policyService.getActivePolicy();

    const referrals = await this.prisma.studentReferral.findMany({
      where: { referrerStudentId: studentUserId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        referredLead: {
          select: {
            preferredCourse: true,
            preferredCollege: true,
            status: true,
          },
        },
      },
    });

    const rewards = await this.prisma.referralRewardLedger.findMany({
      where: { referrerStudentId: studentUserId },
      orderBy: { createdAt: 'desc' },
    });

    const totalValid = referrals.filter((r) => r.fraudStatus !== 'REJECTED' && !['INVALID', 'CANCELLED'].includes(r.status)).length;
    const qualifyingCount = referrals.filter((r) => r.isQualifying).length;

    const evaluation = this.policyService.evaluateReferralPool(totalValid, qualifyingCount, activePolicy);

    const totalEarned = rewards.reduce((sum, r) => sum + r.grossAmount, 0);
    const totalPaid = rewards.filter((r) => r.status === 'PAID').reduce((sum, r) => sum + r.amount, 0);
    const pendingApproval = rewards.filter((r) => r.status === 'PENDING_APPROVAL').reduce((sum, r) => sum + r.amount, 0);

    const maskedList = referrals.map((r) => ({
      id: r.id,
      referredName: this.maskName(r.referredName),
      referredMobile: this.maskMobile(r.referredMobile),
      status: r.status,
      isOneYearCompleted: r.isOneYearCompleted,
      isOneYearFeePaid: r.isOneYearFeePaid,
      isQualifying: r.isQualifying,
      qualificationStatus: r.qualificationStatus,
      fraudStatus: r.fraudStatus,
      preferredCourse: r.referredLead?.preferredCourse || 'Under Review',
      preferredCollege: r.referredLead?.preferredCollege || 'Swayam Partner Institution',
      createdAt: r.createdAt,
    }));

    return {
      success: true,
      referralCode: profile.code,
      shareUrl: profile.shareUrl,
      ruleVersion: activePolicy.version,
      stats: {
        totalInvites: referrals.length,
        totalValidReferrals: totalValid,
        qualifyingReferrals: qualifyingCount,
        currentTier: evaluation.achievedTier ? evaluation.achievedTier.name : 'None',
        currentTierReward: evaluation.grossEntitledReward,
        totalRewardsEarned: totalEarned,
        totalRewardsPaid: totalPaid,
        pendingApprovalRewards: pendingApproval,
        nextTier: evaluation.nextTier,
      },
      rewards,
      referrals: maskedList,
    };
  }

  private async calculateStudentReferralStats(studentUserId: string) {
    const referrals = await this.prisma.studentReferral.findMany({
      where: { referrerStudentId: studentUserId },
    });

    const rewards = await this.prisma.referralRewardLedger.findMany({
      where: { referrerStudentId: studentUserId },
    });

    const activePolicy = await this.policyService.getActivePolicy();
    const totalValid = referrals.filter((r) => r.fraudStatus !== 'REJECTED' && !['INVALID', 'CANCELLED'].includes(r.status)).length;
    const qualifying = referrals.filter((r) => r.isQualifying).length;

    const evaluation = this.policyService.evaluateReferralPool(totalValid, qualifying, activePolicy);

    const totalPaid = rewards
      .filter((r) => r.status === 'PAID')
      .reduce((sum, r) => sum + r.amount, 0);

    return {
      totalInvites: referrals.length,
      totalValidReferrals: totalValid,
      qualifyingReferrals: qualifying,
      currentTier: evaluation.achievedTier ? evaluation.achievedTier.name : 'None',
      totalRewardsEarned: evaluation.grossEntitledReward,
      totalRewardsPaid: totalPaid,
      nextTier: evaluation.nextTier,
    };
  }

  // ─── 8. ADMIN GOVERNANCE & FUNNEL ANALYTICS ────────────────────────────────

  async getAdminReferrals(query: ReferralQueryDto) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { referralCode: { contains: query.search, mode: 'insensitive' } },
        { referredName: { contains: query.search, mode: 'insensitive' } },
        { referredMobile: { contains: query.search, mode: 'insensitive' } },
        { referredEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) where.status = query.status;
    if (query.fraudStatus) where.fraudStatus = query.fraudStatus;
    if (query.rewardStatus) where.rewardStatus = query.rewardStatus;
    if (query.referrerStudentId) where.referrerStudentId = query.referrerStudentId;

    if (query.startDate && query.endDate) {
      where.createdAt = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.studentReferral.count({ where }),
      this.prisma.studentReferral.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          referrerStudent: {
            select: { id: true, fullName: true, email: true, mobile: true },
          },
          referredLead: {
            select: { id: true, preferredCourse: true, preferredCollege: true, status: true },
          },
          rewards: true,
        },
      }),
    ]);

    return {
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAdminStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalReferrals,
      newToday,
      qualifyingCount,
      tier1Count,
      tier2Count,
      pendingApprovalRewards,
      approvedRewards,
      paidRewards,
      flaggedCount,
    ] = await Promise.all([
      this.prisma.studentReferral.count(),
      this.prisma.studentReferral.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.studentReferral.count({ where: { isQualifying: true } }),
      this.prisma.referralRewardLedger.count({ where: { tierId: 'tier-1' } }),
      this.prisma.referralRewardLedger.count({ where: { tierId: 'tier-2' } }),
      this.prisma.referralRewardLedger.count({ where: { status: 'PENDING_APPROVAL' } }),
      this.prisma.referralRewardLedger.count({ where: { status: 'APPROVED' } }),
      this.prisma.referralRewardLedger.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.studentReferral.count({ where: { fraudStatus: 'FLAGGED_FOR_REVIEW' } }),
    ]);

    return {
      totalReferrals,
      newToday,
      qualifyingCount,
      tier1Count,
      tier2Count,
      pendingApprovalRewards,
      approvedRewards,
      totalPaidAmount: paidRewards._sum.amount || 0,
      flaggedCount,
    };
  }

  async getAdminFunnel() {
    const [
      leadsCreated,
      registered,
      applicationsSubmitted,
      enrolled,
      qualifyingCompleted,
      rewardsPaid,
    ] = await Promise.all([
      this.prisma.studentReferral.count(),
      this.prisma.studentReferral.count({ where: { referredStudentId: { not: null } } }),
      this.prisma.studentReferral.count({
        where: { status: { in: ['APPLICATION_SUBMITTED', 'ADMISSION_APPROVED', 'PAYMENT_COMPLETED', 'ENROLLED'] } },
      }),
      this.prisma.studentReferral.count({ where: { status: 'ENROLLED' } }),
      this.prisma.studentReferral.count({ where: { isQualifying: true } }),
      this.prisma.referralRewardLedger.count({ where: { status: 'PAID' } }),
    ]);

    return {
      funnel: [
        { stage: 'Leads Created', count: leadsCreated, color: '#4A7B5B' },
        { stage: 'Student Registered', count: registered, color: '#0EA5E9' },
        { stage: 'Applications Submitted', count: applicationsSubmitted, color: '#6366F1' },
        { stage: 'Enrolled in College', count: enrolled, color: '#F59E0B' },
        { stage: 'Year 1 & Fees Satisfied (Qualifying)', count: qualifyingCompleted, color: '#10B981' },
        { stage: 'Rewards Paid Out', count: rewardsPaid, color: '#EC4899' },
      ],
    };
  }

  private maskName(name: string): string {
    if (!name) return 'Student';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return `${parts[0].charAt(0)}${'*'.repeat(Math.max(2, parts[0].length - 1))}`;
    }
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}***`;
  }

  private maskMobile(mobile: string): string {
    if (!mobile) return '******0000';
    const clean = mobile.replace(/\D/g, '').slice(-10);
    return `${clean.slice(0, 2)}******${clean.slice(-2)}`;
  }
}
