import { PrismaClient } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { ReferralService } from '../src/referrals/referral.service';
import { ReferralPolicyService } from '../src/referrals/referral-policy.service';
import { CouponService } from '../src/coupons/coupon.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SystemConfigurationService } from '../src/settings/system-configuration.service';
import { AuditService } from '../src/audit/audit.service';
import { NotificationsService } from '../src/notifications/notifications.service';

const prisma = new PrismaClient();

async function main() {
  console.log('\n===============================================================');
  console.log('  SWAYAM ADMISSION — FINAL REFERRAL RULE & POLICY VERIFICATION');
  console.log('===============================================================');

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      PrismaService,
      ReferralService,
      ReferralPolicyService,
      CouponService,
      SystemConfigurationService,
      {
        provide: AuditService,
        useValue: {
          logAction: async () => {},
        },
      },
      {
        provide: NotificationsService,
        useValue: {
          createNotification: async () => {},
        },
      },
    ],
  }).compile();

  const referralService = moduleRef.get<ReferralService>(ReferralService);
  const policyService = moduleRef.get<ReferralPolicyService>(ReferralPolicyService);
  const couponService = moduleRef.get<CouponService>(CouponService);

  console.log('✅ Services compiled successfully.\n');

  // 1. Verify Active Policy Seeds
  const activePolicy = await policyService.getActivePolicy();
  console.log(`[1/12] Active Referral Policy: Version=${activePolicy.version}, Name="${activePolicy.name}"`);
  if (!activePolicy || activePolicy.version !== 'v1.0') {
    throw new Error('Active policy did not resolve to v1.0.');
  }

  // 2. Master Tier Tests via Policy Engine
  console.log('\n[2/12] Evaluating Master Mathematical Tier Tests:');
  
  // 4/3 -> Tier 1 (4000)
  const eval4_3 = policyService.evaluateReferralPool(4, 3, activePolicy);
  console.log(`  • 4 total, 3 qualifying => Achieved: ${eval4_3.achievedTier?.name || 'None'}, Reward: ₹${eval4_3.grossEntitledReward}`);
  if (eval4_3.achievedTier?.name !== 'Tier 1' || eval4_3.grossEntitledReward !== 4000) throw new Error('4/3 evaluation failed');

  // 4/2 -> No Tier (0)
  const eval4_2 = policyService.evaluateReferralPool(4, 2, activePolicy);
  console.log(`  • 4 total, 2 qualifying => Achieved: ${eval4_2.achievedTier?.name || 'None'}, Reward: ₹${eval4_2.grossEntitledReward}`);
  if (eval4_2.achievedTier !== null || eval4_2.grossEntitledReward !== 0) throw new Error('4/2 evaluation failed');

  // 8/5 -> Tier 1 (4000)
  const eval8_5 = policyService.evaluateReferralPool(8, 5, activePolicy);
  console.log(`  • 8 total, 5 qualifying => Achieved: ${eval8_5.achievedTier?.name || 'None'}, Reward: ₹${eval8_5.grossEntitledReward}`);
  if (eval8_5.achievedTier?.name !== 'Tier 1' || eval8_5.grossEntitledReward !== 4000) throw new Error('8/5 evaluation failed');

  // 8/6 -> Tier 2 (10000)
  const eval8_6 = policyService.evaluateReferralPool(8, 6, activePolicy);
  console.log(`  • 8 total, 6 qualifying => Achieved: ${eval8_6.achievedTier?.name || 'None'}, Reward: ₹${eval8_6.grossEntitledReward}`);
  if (eval8_6.achievedTier?.name !== 'Tier 2' || eval8_6.grossEntitledReward !== 10000) throw new Error('8/6 evaluation failed');

  // 9/6 -> Tier 2 (10000)
  const eval9_6 = policyService.evaluateReferralPool(9, 6, activePolicy);
  console.log(`  • 9 total, 6 qualifying => Achieved: ${eval9_6.achievedTier?.name || 'None'}, Reward: ₹${eval9_6.grossEntitledReward}`);
  if (eval9_6.achievedTier?.name !== 'Tier 2' || eval9_6.grossEntitledReward !== 10000) throw new Error('9/6 evaluation failed');

  // 9/5 -> Tier 1 (4000)
  const eval9_5 = policyService.evaluateReferralPool(9, 5, activePolicy);
  console.log(`  • 9 total, 5 qualifying => Achieved: ${eval9_5.achievedTier?.name || 'None'}, Reward: ₹${eval9_5.grossEntitledReward}`);
  if (eval9_5.achievedTier?.name !== 'Tier 1' || eval9_5.grossEntitledReward !== 4000) throw new Error('9/5 evaluation failed');

  // 3. Database Context for Referrer Y with No Own Admission
  const testReferrerEmail = `test.referrer.${Date.now()}@swayamtest.com`;
  const referrerUser = await prisma.user.create({
    data: {
      email: testReferrerEmail,
      fullName: 'Referrer Student Y (No Admission)',
      mobile: `989${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: 'HashedTestPassword123!',
      role: 'STUDENT',
    },
  });

  const referrerProfile = await referralService.getOrCreateReferralCode(referrerUser.id);
  console.log(`\n[3/12] Referrer Profile Created: Code=${referrerProfile.code} for ${referrerUser.email}`);

  // 4. Create 8 referred students (A through H)
  const referredIds: string[] = [];
  for (let i = 0; i < 8; i++) {
    const char = String.fromCharCode(65 + i); // A, B, C, D, E, F, G, H
    const ref = await referralService.attributeLead({
      referralCode: referrerProfile.code,
      fullName: `Referred Candidate ${char}`,
      mobile: `988${i}${Math.floor(100000 + Math.random() * 900000)}`,
      email: `candidate.${char.toLowerCase()}.${Date.now()}@swayamtest.com`,
    });
    if (ref.referralId) referredIds.push(ref.referralId);
  }
  console.log(`[4/12] Attributed 8 referrals (A..H) to ${referrerUser.fullName}. Total count=${referredIds.length}`);

  // 5. Qualify 5 students in non-sequential positions: B, D, E, G, H (Indices 1, 3, 4, 6, 7)
  const qualifyingIndices = [1, 3, 4, 6, 7];
  for (const idx of qualifyingIndices) {
    await referralService.updateReferralQualification(referredIds[idx], {
      isOneYearCompleted: true,
      isOneYearFeePaid: true,
    });
  }

  // 6. Evaluate Tier for 8 Total, 5 Qualifying => Expect Tier 1 (₹4,000)
  const evalResult1 = await referralService.evaluateReferrerRewardTier(referrerUser.id);
  const ledgerTier1 = await prisma.referralRewardLedger.findFirst({
    where: { referrerStudentId: referrerUser.id, tierId: 'tier-1' },
  });

  console.log(`\n[5/12] Live Evaluation (8 Referrals, 5 Qualified non-sequential):`);
  console.log(`      Achieved Tier: ${evalResult1?.achievedTier?.name}, Gross Entitled: ₹${evalResult1?.grossEntitledReward}`);
  console.log(`      Ledger Entry Created: ID=${ledgerTier1?.id}, Status=${ledgerTier1?.status}, Amount=₹${ledgerTier1?.amount}`);

  if (evalResult1?.achievedTier?.name !== 'Tier 1' || evalResult1?.grossEntitledReward !== 4000) {
    throw new Error('Failed to achieve Tier 1 on 8 total and 5 qualified.');
  }
  if (!ledgerTier1 || ledgerTier1.amount !== 4000) {
    throw new Error('Missing or incorrect ledger entry for Tier 1.');
  }

  // 7. Finance Payout for Tier 1
  await referralService.approveReward(ledgerTier1.id, 'admin-id', 'Approved Tier 1 reward');
  await referralService.processPayout(
    ledgerTier1.id,
    { payoutMethod: 'UPI', payoutReference: 'UPI-TEST-TIER1-REF' },
    'finance-id',
  );
  console.log(`[6/12] Tier 1 Reward of ₹4,000 Approved & Paid Out (Ref: UPI-TEST-TIER1-REF).`);

  // 8. Qualify 6th Student: Candidate A (Index 0) -> Now 6 Qualifying out of 8 Total => Tier 2 Reached
  await referralService.updateReferralQualification(referredIds[0], {
    isOneYearCompleted: true,
    isOneYearFeePaid: true,
  });

  // 9. Evaluate Differential Upgrade
  const evalResult2 = await referralService.evaluateReferrerRewardTier(referrerUser.id);
  const ledgerTier2 = await prisma.referralRewardLedger.findFirst({
    where: { referrerStudentId: referrerUser.id, tierId: 'tier-2' },
  });

  console.log(`\n[7/12] Live Differential Upgrade Evaluation (8 Total, 6 Qualified):`);
  console.log(`      Achieved Tier: ${evalResult2?.achievedTier?.name}`);
  console.log(`      Gross Entitlement: ₹${evalResult2?.grossEntitledReward}`);
  console.log(`      Already Paid: ₹${evalResult2?.alreadyPaidAmount}`);
  console.log(`      Tier 2 Differential Ledger: ID=${ledgerTier2?.id}, Gross=₹${ledgerTier2?.grossAmount}, Deducted=₹${ledgerTier2?.deductedPreviousAmount}, Net=₹${ledgerTier2?.netPayableAmount}`);

  if (evalResult2?.achievedTier?.name !== 'Tier 2') throw new Error('Failed to achieve Tier 2.');
  if (!ledgerTier2 || ledgerTier2.netPayableAmount !== 6000 || ledgerTier2.grossAmount !== 10000) {
    throw new Error('Differential payout should be ₹6,000 (10,000 - 4,000).');
  }

  // 10. Policy Simulator Test (Non-Mutating)
  const simResult = await policyService.simulatePolicy({
    totalReferrals: 8,
    qualifyingReferrals: 5,
  });
  console.log(`\n[8/12] Policy Simulation Test: Inputs 8/5 => Achieved: ${simResult.result.achievedTier?.name}, Output: ₹${simResult.result.grossEntitledReward}`);
  if (simResult.result.achievedTier?.name !== 'Tier 1' || simResult.result.grossEntitledReward !== 4000) {
    throw new Error('Simulation result mismatch.');
  }

  // 11. Dynamic Policy Creation (Rule v2.0)
  const v2Policy = await policyService.createPolicy(
    {
      version: `v2.${Date.now()}`,
      name: 'Dynamic Future Policy',
      tiers: [
        { id: 'tier-1', name: 'Tier 1', minReferrals: 5, minQualifyingReferrals: 4, rewardAmount: 5000, rewardType: 'CASH' },
      ],
      isActive: false,
    },
    'admin-id',
  );
  console.log(`[9/12] Dynamic Versioned Policy Created: Version=${v2Policy.version}`);

  // 12. Coupon Engine Test: 20% discount on ₹5,000 with ₹1,000 max cap
  const couponCode = `TEST20_${Date.now()}`;
  const coupon = await couponService.createCoupon(
    {
      code: couponCode,
      discountType: 'PERCENTAGE',
      discountValue: 20,
      maxDiscountAmount: 1000,
      minTransactionAmount: 1000,
      applicableScope: 'APPLICATION',
    },
    'admin-id',
  );

  const couponVal = await couponService.validateCoupon({
    code: couponCode,
    transactionAmount: 5000,
    applicableScope: 'APPLICATION',
  });
  console.log(`\n[10/12] Coupon Validation: Code=${coupon.code}, Original=₹${couponVal.originalAmount}, Discount=₹${couponVal.discountAmount}, Net=₹${couponVal.finalAmount}`);
  if (couponVal.discountAmount !== 1000 || couponVal.finalAmount !== 4000) {
    throw new Error('Coupon discount calculation failed.');
  }

  // Redeem Coupon
  const redemption = await couponService.redeemCoupon(
    {
      code: couponCode,
      transactionAmount: 5000,
      transactionType: 'APPLICATION',
      transactionId: 'test-app-id',
    },
    referrerUser.id,
  );
  console.log(`[11/12] Coupon Redemption Idempotent: RedemptionId=${redemption.redemptionId}, Net Paid=₹${redemption.finalAmount}`);

  // Clean up test data
  console.log('\n[12/12] Cleaning up test records...');
  await prisma.couponRedemption.deleteMany({ where: { couponId: coupon.id } });
  await prisma.coupon.delete({ where: { id: coupon.id } });
  await prisma.referralPolicy.delete({ where: { id: v2Policy.id } });
  await prisma.referralRewardLedger.deleteMany({ where: { referrerStudentId: referrerUser.id } });
  await prisma.studentReferral.deleteMany({ where: { referrerStudentId: referrerUser.id } });
  await prisma.studentReferralCode.deleteMany({ where: { userId: referrerUser.id } });
  await prisma.user.delete({ where: { id: referrerUser.id } });

  console.log('\n===============================================================');
  console.log('  ALL 12 FINAL REFERRAL, TIER & POLICY TESTS PASSED (100%)');
  console.log('===============================================================\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Verification Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
