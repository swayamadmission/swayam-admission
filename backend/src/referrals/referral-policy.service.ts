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

export interface ReferralTierConfig {
  id: string;
  name: string;
  minReferrals: number;
  minQualifyingReferrals: number;
  rewardAmount: number;
  rewardType: string;
}

export interface QualificationConditionsConfig {
  requiresOneYearCompleted: boolean;
  requiresOneYearFeePaid: boolean;
  eligibleCollegeIds?: string[];
  eligibleCourseIds?: string[];
  eligibleBranchIds?: string[];
}

export interface ReferralCounsellingBenefitConfig {
  enabled: boolean;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number; // e.g. 100 for 100% OFF (FREE Counselling)
  maxDiscountAmount?: number;
  applicableFeeType: string; // 'COUNSELLING_FEE'
  eligibleCollegeIds?: string[];
  eligibleCourseIds?: string[];
  academicSession?: string;
  startDate?: string;
  endDate?: string;
  allowStackingWithCoupon?: boolean;
}

export const CANONICAL_TIERS_V1: ReferralTierConfig[] = [
  {
    id: 'tier-1',
    name: 'Tier 1',
    minReferrals: 4,
    minQualifyingReferrals: 3,
    rewardAmount: 4000,
    rewardType: 'CASH',
  },
  {
    id: 'tier-2b',
    name: 'Tier 2b',
    minReferrals: 8,
    minQualifyingReferrals: 5,
    rewardAmount: 4000,
    rewardType: 'CASH',
  },
  {
    id: 'tier-2',
    name: 'Tier 2',
    minReferrals: 8,
    minQualifyingReferrals: 6,
    rewardAmount: 10000,
    rewardType: 'CASH',
  },
];

export const CANONICAL_CONDITIONS_V1: QualificationConditionsConfig = {
  requiresOneYearCompleted: true,
  requiresOneYearFeePaid: true,
};

export const CANONICAL_COUNSELLING_BENEFIT_V1: ReferralCounsellingBenefitConfig = {
  enabled: true,
  discountType: 'PERCENTAGE',
  discountValue: 100, // 100% OFF (FREE Counselling)
  applicableFeeType: 'COUNSELLING_FEE',
  academicSession: '2026-2027',
  allowStackingWithCoupon: false,
};

@Injectable()
export class ReferralPolicyService {
  private readonly logger = new Logger(ReferralPolicyService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves the current active policy based on effective date.
   * Auto-seeds canonical v1.0 policy if no policy exists in DB.
   */
  async getActivePolicy(asOfDate: Date = new Date()) {
    let policy = await this.prisma.referralPolicy.findFirst({
      where: {
        isActive: true,
        effectiveFrom: { lte: asOfDate },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: asOfDate } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!policy) {
      // Look for any existing v1.0
      policy = await this.prisma.referralPolicy.findUnique({
        where: { version: 'v1.0' },
      });

      if (!policy) {
        this.logger.log('Seeding initial canonical Referral Policy v1.0 (Tier 1: 4/3=₹4k, Tier 2: 8/6=₹10k, Counselling: 100% OFF)...');
        policy = await this.prisma.referralPolicy.create({
          data: {
            version: 'v1.0',
            name: 'Swayam Admission Referral & Counselling Policy',
            description:
              'Tier 1: Min 4 valid referrals + 3 qualifying = ₹4,000. Tier 2: Min 8 valid referrals + 6 qualifying = ₹10,000. Referred Student: 100% Counselling Discount.',
            tiers: CANONICAL_TIERS_V1 as any,
            qualificationConditions: CANONICAL_CONDITIONS_V1 as any,
            counsellingBenefit: CANONICAL_COUNSELLING_BENEFIT_V1 as any,
            settlementMode: 'DIFFERENTIAL_UPGRADE',
            effectiveFrom: new Date('2026-01-01T00:00:00Z'),
            isActive: true,
          },
        });
      }
    }

    if (policy) {
      const currentTiers = policy.tiers as any[];
      const t1 = currentTiers?.find((t) => t.id === 'tier-1');
      const t2b = currentTiers?.find((t) => t.id === 'tier-2b');
      const t2 = currentTiers?.find((t) => t.id === 'tier-2');

      const needsTierSync =
        !t1 ||
        t1.minReferrals !== 4 ||
        t1.minQualifyingReferrals !== 3 ||
        !t2b ||
        t2b.minReferrals !== 8 ||
        t2b.minQualifyingReferrals !== 5 ||
        !t2 ||
        t2.minReferrals !== 8 ||
        t2.minQualifyingReferrals !== 6;
      const needsBenefitSync = !(policy as any).counsellingBenefit;

      if (needsTierSync || needsBenefitSync) {
        policy = await this.prisma.referralPolicy.update({
          where: { id: policy.id },
          data: {
            tiers: CANONICAL_TIERS_V1 as any,
            qualificationConditions: CANONICAL_CONDITIONS_V1 as any,
            counsellingBenefit: CANONICAL_COUNSELLING_BENEFIT_V1 as any,
          },
        });
      }
    }

    return policy;
  }

  /**
   * Retrieves all historical and draft policies for admin audit & governance.
   */
  async getAllPolicies() {
    return this.prisma.referralPolicy.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves a specific policy by ID or Version.
   */
  async getPolicyByVersionOrId(identifier: string) {
    const policy = await this.prisma.referralPolicy.findFirst({
      where: {
        OR: [{ id: identifier }, { version: identifier }],
      },
    });
    if (!policy) {
      throw new NotFoundException(`Referral policy "${identifier}" not found.`);
    }
    return policy;
  }

  /**
   * Create a new versioned policy (Draft or Active).
   */
  async createPolicy(
    dto: {
      version: string;
      name: string;
      description?: string;
      tiers: ReferralTierConfig[];
      qualificationConditions?: QualificationConditionsConfig;
      counsellingBenefit?: ReferralCounsellingBenefitConfig;
      settlementMode?: string;
      effectiveFrom?: Date;
      effectiveUntil?: Date;
      isActive?: boolean;
    },
    actorUserId?: string,
  ) {
    const existing = await this.prisma.referralPolicy.findUnique({
      where: { version: dto.version.trim() },
    });
    if (existing) {
      throw new BadRequestException(`Policy version "${dto.version}" already exists.`);
    }

    if (!dto.tiers || dto.tiers.length === 0) {
      throw new BadRequestException('At least one referral tier configuration is required.');
    }

    for (const t of dto.tiers) {
      if (t.minReferrals <= 0 || t.minQualifyingReferrals <= 0 || t.rewardAmount <= 0) {
        throw new BadRequestException(`Invalid tier "${t.name}": Thresholds and reward amounts must be positive numbers.`);
      }
      if (t.minQualifyingReferrals > t.minReferrals) {
        throw new BadRequestException(
          `Invalid tier "${t.name}": Minimum qualifying referrals (${t.minQualifyingReferrals}) cannot exceed minimum total referrals (${t.minReferrals}).`,
        );
      }
    }

    if (dto.isActive) {
      await this.prisma.referralPolicy.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const created = await this.prisma.referralPolicy.create({
      data: {
        version: dto.version.trim(),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        tiers: dto.tiers as any,
        qualificationConditions: (dto.qualificationConditions || CANONICAL_CONDITIONS_V1) as any,
        counsellingBenefit: (dto.counsellingBenefit || CANONICAL_COUNSELLING_BENEFIT_V1) as any,
        settlementMode: dto.settlementMode || 'DIFFERENTIAL_UPGRADE',
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdById: actorUserId,
      },
    });

    await this.auditService.logAction({
      action: 'POLICY_CREATED',
      module: 'GOVERNANCE',
      entity: 'ReferralPolicy',
      entityId: created.id,
      userId: actorUserId,
      description: `New referral policy version ${created.version} deployed.`,
    });

    return created;
  }

  /**
   * Activate a specific policy version. Deactivates any currently active policy.
   */
  async activatePolicy(policyId: string, actorUserId?: string) {
    const policy = await this.prisma.referralPolicy.findUnique({
      where: { id: policyId },
    });
    if (!policy) throw new NotFoundException('Policy not found.');

    await this.prisma.referralPolicy.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const activated = await this.prisma.referralPolicy.update({
      where: { id: policyId },
      data: { isActive: true, effectiveUntil: null },
    });

    await this.auditService.logAction({
      action: 'POLICY_ACTIVATED',
      module: 'GOVERNANCE',
      entity: 'ReferralPolicy',
      entityId: policyId,
      userId: actorUserId,
      description: `Referral policy version ${policy.version} is now ACTIVE.`,
    });

    return activated;
  }

  /**
   * Pure evaluation function: Checks referral counts against a policy.
   */
  evaluateReferralPool(
    totalValidReferrals: number,
    qualifyingReferrals: number,
    policy: any,
  ) {
    const tiers: ReferralTierConfig[] = (policy.tiers && Array.isArray(policy.tiers))
      ? (policy.tiers as ReferralTierConfig[])
      : CANONICAL_TIERS_V1;

    const sortedTiers = [...tiers].sort((a, b) => a.rewardAmount - b.rewardAmount);

    let achievedTier: ReferralTierConfig | null = null;
    let nextTierCandidate: ReferralTierConfig | null = null;

    for (let i = sortedTiers.length - 1; i >= 0; i--) {
      const tier = sortedTiers[i];
      if (
        totalValidReferrals >= tier.minReferrals &&
        qualifyingReferrals >= tier.minQualifyingReferrals
      ) {
        achievedTier = tier;
        break;
      }
    }

    if (!achievedTier) {
      nextTierCandidate = sortedTiers[0] || null;
    } else {
      const currentIndex = sortedTiers.findIndex((t) => t.id === achievedTier!.id);
      if (currentIndex >= 0 && currentIndex < sortedTiers.length - 1) {
        nextTierCandidate = sortedTiers[currentIndex + 1];
      }
    }

    let nextTierInfo: {
      tier: ReferralTierConfig;
      referralsNeeded: number;
      qualifyingNeeded: number;
      progressPercent: number;
    } | null = null;

    if (nextTierCandidate) {
      const target = nextTierCandidate;
      const refNeeded = Math.max(0, target.minReferrals - totalValidReferrals);
      const qualNeeded = Math.max(0, target.minQualifyingReferrals - qualifyingReferrals);
      const refProgress = Math.min(1, totalValidReferrals / target.minReferrals);
      const qualProgress = Math.min(1, qualifyingReferrals / target.minQualifyingReferrals);
      const progressPercent = Math.round(((refProgress + qualProgress) / 2) * 100);

      nextTierInfo = {
        tier: target,
        referralsNeeded: refNeeded,
        qualifyingNeeded: qualNeeded,
        progressPercent,
      };
    }

    return {
      ruleVersion: policy.version || 'v1.0',
      policyId: policy.id || 'canonical',
      totalValidReferrals,
      qualifyingReferrals,
      achievedTier,
      grossEntitledReward: achievedTier ? achievedTier.rewardAmount : 0,
      nextTier: nextTierInfo,
    };
  }

  /**
   * Calculates the referred student's counselling benefit based on active policy.
   */
  calculateCounsellingBenefit(
    grossAmount: number = 1000,
    policy?: any,
    context?: { collegeId?: string; courseId?: string; academicSession?: string },
  ) {
    const config: ReferralCounsellingBenefitConfig = policy?.counsellingBenefit || CANONICAL_COUNSELLING_BENEFIT_V1;

    if (!config || !config.enabled) {
      return {
        applicable: false,
        discountAmount: 0,
        finalAmount: grossAmount,
        discountType: config?.discountType || 'PERCENTAGE',
        discountValue: 0,
        message: 'Referral counselling benefit is not enabled.',
      };
    }

    if (config.academicSession && context?.academicSession && config.academicSession !== context.academicSession) {
      return {
        applicable: false,
        discountAmount: 0,
        finalAmount: grossAmount,
        discountType: config.discountType,
        discountValue: config.discountValue,
        message: `Benefit not valid for academic session ${context.academicSession}.`,
      };
    }

    let discount = 0;
    if (config.discountType === 'PERCENTAGE') {
      discount = (grossAmount * config.discountValue) / 100;
      if (config.maxDiscountAmount && discount > config.maxDiscountAmount) {
        discount = config.maxDiscountAmount;
      }
    } else {
      discount = config.discountValue;
    }

    discount = Math.min(grossAmount, Math.max(0, Math.round(discount * 100) / 100));
    const finalAmount = Math.max(0, Math.round((grossAmount - discount) * 100) / 100);

    return {
      applicable: true,
      discountAmount: discount,
      finalAmount,
      discountType: config.discountType,
      discountValue: config.discountValue,
      maxDiscountAmount: config.maxDiscountAmount,
      allowStackingWithCoupon: !!config.allowStackingWithCoupon,
      message: discount === grossAmount ? '100% OFF — FREE Counselling via Student Referral!' : `₹${discount} Referral Discount Applied`,
    };
  }

  /**
   * Interactive Policy Simulator: Test counts without modifying production database.
   */
  async simulatePolicy(dto: {
    totalReferrals: number;
    qualifyingReferrals: number;
    policyVersion?: string;
  }) {
    const policy = dto.policyVersion
      ? await this.getPolicyByVersionOrId(dto.policyVersion)
      : await this.getActivePolicy();

    const evaluation = this.evaluateReferralPool(
      Number(dto.totalReferrals || 0),
      Number(dto.qualifyingReferrals || 0),
      policy,
    );

    const counsellingSim = this.calculateCounsellingBenefit(1000, policy);

    return {
      success: true,
      simulation: true,
      inputs: {
        totalReferrals: Number(dto.totalReferrals || 0),
        qualifyingReferrals: Number(dto.qualifyingReferrals || 0),
        policyVersion: policy.version,
        policyName: policy.name,
      },
      totalReferrals: Number(dto.totalReferrals || 0),
      qualifyingReferrals: Number(dto.qualifyingReferrals || 0),
      tier: evaluation.achievedTier ? evaluation.achievedTier.name.toUpperCase().replace(/\s+/g, '_') : 'NONE',
      tierName: evaluation.achievedTier ? evaluation.achievedTier.name : 'No Tier Eligible',
      rewardAmount: evaluation.grossEntitledReward,
      eligible: evaluation.achievedTier !== null,
      reason: evaluation.achievedTier
        ? `Eligible for ${evaluation.achievedTier.name} (₹${evaluation.achievedTier.rewardAmount.toLocaleString()}) with ${dto.totalReferrals} total referrals and ${dto.qualifyingReferrals} qualifying students.`
        : `Not eligible for any tier. Tier 1 requires min 4 referrals and 3 qualifying students.`,
      nextTier: evaluation.nextTier
        ? evaluation.nextTier.tier.name.toUpperCase().replace(/\s+/g, '_')
        : null,
      nextTierName: evaluation.nextTier ? evaluation.nextTier.tier.name : null,
      nextTierRequirements: evaluation.nextTier
        ? {
            totalReferrals: evaluation.nextTier.tier.minReferrals,
            qualifyingReferrals: evaluation.nextTier.tier.minQualifyingReferrals,
            referralsNeeded: evaluation.nextTier.referralsNeeded,
            qualifyingNeeded: evaluation.nextTier.qualifyingNeeded,
          }
        : null,
      counsellingBenefit: {
        ...counsellingSim,
        policyConfig: policy.counsellingBenefit || CANONICAL_COUNSELLING_BENEFIT_V1,
      },
      policyVersion: policy.version,
      result: evaluation,
    };
  }

  /**
   * Updates an existing draft or editable policy.
   */
  async updatePolicy(
    policyId: string,
    dto: Partial<{
      name: string;
      description?: string;
      tiers: ReferralTierConfig[];
      qualificationConditions?: QualificationConditionsConfig;
      counsellingBenefit?: ReferralCounsellingBenefitConfig;
      settlementMode?: string;
      effectiveFrom?: Date;
      effectiveUntil?: Date;
      isActive?: boolean;
    }>,
    actorUserId?: string,
  ) {
    const policy = await this.prisma.referralPolicy.findUnique({
      where: { id: policyId },
    });
    if (!policy) throw new NotFoundException('Policy not found.');

    if (dto.tiers) {
      for (const t of dto.tiers) {
        if (t.minReferrals <= 0 || t.minQualifyingReferrals <= 0 || t.rewardAmount <= 0) {
          throw new BadRequestException(`Invalid tier "${t.name}": Thresholds and reward amounts must be positive numbers.`);
        }
        if (t.minQualifyingReferrals > t.minReferrals) {
          throw new BadRequestException(
            `Invalid tier "${t.name}": Minimum qualifying referrals (${t.minQualifyingReferrals}) cannot exceed minimum total referrals (${t.minReferrals}).`,
          );
        }
      }
    }

    const updated = await this.prisma.referralPolicy.update({
      where: { id: policyId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.tiers ? { tiers: dto.tiers as any } : {}),
        ...(dto.qualificationConditions ? { qualificationConditions: dto.qualificationConditions as any } : {}),
        ...(dto.counsellingBenefit ? { counsellingBenefit: dto.counsellingBenefit as any } : {}),
        ...(dto.settlementMode ? { settlementMode: dto.settlementMode } : {}),
        ...(dto.effectiveFrom ? { effectiveFrom: new Date(dto.effectiveFrom) } : {}),
        ...(dto.effectiveUntil !== undefined
          ? { effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null }
          : {}),
      },
    });

    await this.auditService.logAction({
      action: 'POLICY_UPDATED',
      module: 'GOVERNANCE',
      entity: 'ReferralPolicy',
      entityId: policyId,
      userId: actorUserId,
      description: `Referral policy ${policy.version} updated.`,
    });

    return updated;
  }
}
