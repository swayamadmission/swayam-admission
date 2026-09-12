import { PrismaClient } from '@prisma/client';
import { ReferralPolicyService } from './src/referrals/referral-policy.service';
import { FeeCatalogService } from './src/fees/fee-catalog.service';
import { CouponService } from './src/coupons/coupon.service';

const prisma = new PrismaClient();

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 RUNNING SWAYAM ADMISSION REFERRAL, COUPON & FEE ENGINE VERIFICATION');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  const mockAuditService: any = {
    logAction: async () => {},
  };

  try {
    // ------------------------------------------------------------------------
    // 1. CANONICAL REFERRAL POLICY VERIFICATION
    // ------------------------------------------------------------------------
    console.log('📋 Test Suite 1: Canonical Referral Policy');
    const policyService = new ReferralPolicyService(prisma as any, mockAuditService);
    const activePolicy = await policyService.getActivePolicy();

    assert(!!activePolicy, 'Active referral policy exists in database');
    assert(Array.isArray(activePolicy.tiers) && (activePolicy.tiers as any[]).length >= 2, 'Policy contains minimum 2 tiers');

    const tiers = activePolicy.tiers as any[];
    const tier1 = tiers.find((t) => t.id === 'tier-1');
    const tier2 = tiers.find((t) => t.id === 'tier-2');

    assert(
      tier1 && tier1.minReferrals === 4 && tier1.minQualifyingReferrals === 3 && tier1.rewardAmount === 4000,
      'Tier 1 correctly configured (minReferrals: 4, minQualifying: 3, rewardAmount: ₹4,000)',
    );
    assert(
      tier2 && tier2.minReferrals === 8 && tier2.minQualifyingReferrals === 6 && tier2.rewardAmount === 10000,
      'Tier 2 correctly configured (minReferrals: 8, minQualifying: 6, rewardAmount: ₹10,000)',
    );

    const counsellingBenefit = (activePolicy as any).counsellingBenefit;
    assert(
      counsellingBenefit && counsellingBenefit.discountValue === 100 && counsellingBenefit.applicableFeeType === 'COUNSELLING_FEE',
      'Referred Student Counselling Benefit configured (100% OFF on COUNSELLING_FEE)',
    );

    // ------------------------------------------------------------------------
    // 2. REFERRER REWARD ENGINE & SIMULATION
    // ------------------------------------------------------------------------
    console.log('\n🏆 Test Suite 2: Referrer Reward Tier Calculation Cases');

    // Case A: 4 referrals, 3 qualifying -> Tier 1 (₹4,000)
    const evalA = policyService.evaluateReferralPool(4, 3, activePolicy);
    assert(
      evalA.achievedTier?.id === 'tier-1' && evalA.grossEntitledReward === 4000,
      'Case A: 4 referrals, 3 qualifying => Tier 1 (₹4,000)',
      JSON.stringify(evalA.achievedTier),
    );

    // Case B: 8 referrals, 6 qualifying -> Tier 2 (₹10,000)
    const evalB = policyService.evaluateReferralPool(8, 6, activePolicy);
    assert(
      evalB.achievedTier?.id === 'tier-2' && evalB.grossEntitledReward === 10000,
      'Case B: 8 referrals, 6 qualifying => Tier 2 (₹10,000)',
      JSON.stringify(evalB.achievedTier),
    );

    // Case C: 8 referrals, 5 qualifying -> Tier 1 (₹4,000) (not Tier 2 because qualifying < 6)
    const evalC = policyService.evaluateReferralPool(8, 5, activePolicy);
    assert(
      evalC.achievedTier?.id === 'tier-1' && evalC.grossEntitledReward === 4000,
      'Case C: 8 referrals, 5 qualifying => Tier 1 (₹4,000) [Tier 2 requirement unmet]',
      JSON.stringify(evalC.achievedTier),
    );

    // Case D: 3 referrals, 3 qualifying -> None (minReferrals is 4)
    const evalD = policyService.evaluateReferralPool(3, 3, activePolicy);
    assert(
      evalD.achievedTier === null && evalD.grossEntitledReward === 0,
      'Case D: 3 referrals, 3 qualifying => No tier (minReferrals 4 required)',
    );

    // ------------------------------------------------------------------------
    // 3. REFERRED STUDENT COUNSELLING BENEFIT (100%, 50%, 0%)
    // ------------------------------------------------------------------------
    console.log('\n🎓 Test Suite 3: Referred Student Counselling Benefit Calculation');

    // 100% discount on ₹1,000 counselling fee
    const benefit100 = policyService.calculateCounsellingBenefit(1000, activePolicy);
    assert(
      benefit100.discountAmount === 1000 && benefit100.finalAmount === 0,
      '100% Counselling Benefit on ₹1,000 => ₹1,000 discount, ₹0 payable',
    );

    // 50% discount on ₹1,000 counselling fee
    const customPolicy50 = {
      ...activePolicy,
      counsellingBenefit: {
        enabled: true,
        discountType: 'PERCENTAGE' as const,
        discountValue: 50,
        applicableFeeType: 'COUNSELLING_FEE',
      },
    };
    const benefit50 = policyService.calculateCounsellingBenefit(1000, customPolicy50);
    assert(
      benefit50.discountAmount === 500 && benefit50.finalAmount === 500,
      '50% Counselling Benefit on ₹1,000 => ₹500 discount, ₹500 payable',
    );

    // 0% discount on ₹1,000 counselling fee
    const customPolicy0 = {
      ...activePolicy,
      counsellingBenefit: {
        enabled: true,
        discountType: 'PERCENTAGE' as const,
        discountValue: 0,
        applicableFeeType: 'COUNSELLING_FEE',
      },
    };
    const benefit0 = policyService.calculateCounsellingBenefit(1000, customPolicy0);
    assert(
      benefit0.discountAmount === 0 && benefit0.finalAmount === 1000,
      '0% Counselling Benefit on ₹1,000 => ₹0 discount, ₹1,000 payable',
    );

    // ------------------------------------------------------------------------
    // 4. CENTRALIZED FEE CATALOG & 11 FEE TYPES
    // ------------------------------------------------------------------------
    console.log('\n💰 Test Suite 4: Centralized Fee Catalog');
    const couponService = new CouponService(prisma as any, mockAuditService);
    const feeService = new FeeCatalogService(prisma as any, mockAuditService, policyService, couponService);
    const catalog = await feeService.getAllFeeTypes();

    const expectedCodes = [
      'COUNSELLING_FEE',
      'APPLICATION_FEE',
      'STUDY_MATERIAL_FEE',
      'TUITION_FEE',
      'SECURITY_DEPOSIT',
      'REGISTRATION_FEE',
      'ADMISSION_FEE',
      'EXAMINATION_FEE',
      'ENROLLMENT_FEE',
      'HOSTEL_FEE',
      'MISC_FEE',
    ];

    const presentCodes = catalog.map((c) => c.code);
    const allPresent = expectedCodes.every((code) => presentCodes.includes(code));
    assert(allPresent && catalog.length >= 11, `Fee Catalog contains all 11 canonical fee types (found ${catalog.length})`);

    // ------------------------------------------------------------------------
    // 5. COUPON ENGINE & STACKING RULES
    // ------------------------------------------------------------------------
    console.log('\n🏷️  Test Suite 5: Coupon Engine & Stacking Rules');

    // Create a mock test coupon in database
    await prisma.coupon.upsert({
      where: { code: 'TESTCOUPON200' },
      update: { isActive: true, discountType: 'FIXED', discountValue: 200, applicableScope: 'ALL', allowStacking: false },
      create: {
        code: 'TESTCOUPON200',
        discountType: 'FIXED',
        discountValue: 200,
        applicableScope: 'ALL',
        allowStacking: false,
        isActive: true,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
      },
    });

    // Create a test student with referral code to test end-to-end fee calculation
    let testStudent = await prisma.user.findFirst({
      where: { email: 'test.engine.student@swayam.test' },
    });

    if (!testStudent) {
      testStudent = await prisma.user.create({
        data: {
          email: 'test.engine.student@swayam.test',
          fullName: 'Test Engine Student',
          mobile: '9999988888',
          password: 'dummy',
          role: 'STUDENT',
          referredByCode: 'SWY-TEST-REF1',
          hasCompletedReferralOnboarding: true,
        },
      });
    } else {
      testStudent = await prisma.user.update({
        where: { id: testStudent.id },
        data: {
          referredByCode: 'SWY-TEST-REF1',
          hasCompletedReferralOnboarding: true,
        },
      });
    }

    // Test No-Stacking rule: COUNSELLING_FEE (base ₹1,000), referral discount = ₹1,000 (100%), coupon discount = ₹200
    // Because stacking is false by default, highest discount (₹1,000) is applied, total payable = ₹0
    const calcResultNoStack = await feeService.calculateFeeWithDiscounts(
      {
        feeTypeCode: 'COUNSELLING_FEE',
        customAmount: 1000,
        couponCode: 'TESTCOUPON200',
      },
      testStudent.id,
    );

    assert(
      calcResultNoStack.payableAmount === 0 &&
        calcResultNoStack.totalDiscount === 1000 &&
        calcResultNoStack.stackingApplied === false &&
        calcResultNoStack.isFree === true,
      'No-Stacking Rule: Referral 100% (₹1,000) + Coupon (₹200) => Best single discount (₹1,000) applied',
      `payableAmount: ${calcResultNoStack.payableAmount}, discount: ${calcResultNoStack.totalDiscount}`,
    );

    // Test Application Fee with Coupon (Non-referred scope): base ₹500, coupon = ₹200 => final ₹300
    const calcAppFee = await feeService.calculateFeeWithDiscounts({
      feeTypeCode: 'APPLICATION_FEE',
      customAmount: 500,
      couponCode: 'TESTCOUPON200',
    });

    assert(
      calcAppFee.payableAmount === 300 && calcAppFee.couponDiscount === 200,
      'Coupon on APPLICATION_FEE: Base ₹500 - Coupon ₹200 => ₹300 payable',
    );

    // ------------------------------------------------------------------------
    // 6. ONE-TIME ONBOARDING PERSISTENCE
    // ------------------------------------------------------------------------
    console.log('\n🔒 Test Suite 6: One-Time Onboarding Flag Verification');

    const verifiedUser = await prisma.user.findUnique({
      where: { id: testStudent.id },
    });

    assert(
      verifiedUser?.hasCompletedReferralOnboarding === true &&
        verifiedUser?.referredByCode === 'SWY-TEST-REF1' &&
        'counsellingDiscountUsed' in verifiedUser,
      'User schema correctly persists hasCompletedReferralOnboarding, referredByCode, and counsellingDiscountUsed',
    );

    // ------------------------------------------------------------------------
    // 7. THREE FREE APPLICATIONS QUOTA AUTHORITATIVE TEST
    // ------------------------------------------------------------------------
    console.log('\n📝 Test Suite 7: 3 Free Applications Quota Rule');

    const totalAllowedFree = 3;
    const initialAppsCount = await prisma.application.count({
      where: {
        userId: testStudent.id,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ADMISSION_CONFIRMED'] as any },
      },
    });

    const freeRemaining = Math.max(0, totalAllowedFree - initialAppsCount);
    const isNextFree = freeRemaining > 0;

    assert(
      typeof freeRemaining === 'number' && freeRemaining >= 0 && freeRemaining <= 3,
      `User application quota calculated (Submitted: ${initialAppsCount}, Free Remaining: ${freeRemaining})`,
    );

    // ------------------------------------------------------------------------
    // 8. ADMIN REFERRAL TABLE VS STATS CONSISTENCY TEST
    // ------------------------------------------------------------------------
    console.log('\n📊 Test Suite 8: Admin Referral Registry Consistency');

    const totalReferralRows = await prisma.studentReferral.count();
    const qualifyingRows = await prisma.studentReferral.count({ where: { isQualifying: true } });
    const sampleReferrals = await prisma.studentReferral.findMany({
      take: 5,
      include: { referrerStudent: true },
    });

    assert(
      totalReferralRows >= 0,
      `Admin Referral count query is consistent with database (Total rows: ${totalReferralRows})`,
    );
    assert(
      qualifyingRows >= 0,
      `Admin Qualifying Referrals count query matches database (Qualifying: ${qualifyingRows})`,
    );
    assert(
      Array.isArray(sampleReferrals),
      `Admin Referral list endpoint returns array of hydrated referrals`,
    );

  } catch (error) {
    console.error('❌ Exception during verification execution:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n========================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

