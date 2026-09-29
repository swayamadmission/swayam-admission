import { PrismaClient } from '@prisma/client';
import { RankingEngineService } from './src/reviews-ranking/ranking-engine.service';
import { RankingMethodologyService } from './src/reviews-ranking/ranking-methodology.service';
import { RankingCyclesService } from './src/reviews-ranking/ranking-cycles.service';
import { RankingReportService } from './src/reviews-ranking/ranking-report.service';
import { AuditService } from './src/audit/audit.service';

const prisma = new PrismaClient();

async function runSmokeTest() {
  console.log('🚀 Starting College Rankings & Research Smoke Test...\n');
  let passCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, msg: string) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  try {
    // Services setup
    const auditService = new AuditService(prisma as any);
    const methodologyService = new RankingMethodologyService(prisma as any, auditService);
    await methodologyService.ensureDefaultMethodology();

    const rankingEngineService = new RankingEngineService(prisma as any, auditService, methodologyService);
    const cyclesService = new RankingCyclesService(prisma as any, auditService, methodologyService);
    const reportService = new RankingReportService(prisma as any, auditService, methodologyService);

    // Mock Admin User
    const adminUser = (await prisma.user.findFirst({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] as any } },
    })) || {
      id: 'admin-smoke-test',
      fullName: 'System Admin',
      email: 'admin@swayam.test',
      role: 'SUPER_ADMIN',
    };

    // ----------------------------------------------------
    // TEST 1: Default 9-Pillar Methodology Weights
    // ----------------------------------------------------
    console.log('📌 Test 1: Official 9-Pillar Methodology Weights');
    const activeMeth = await methodologyService.getActiveMethodology();
    assert(!!activeMeth, 'Active methodology exists');
    const pConfig = (activeMeth.pillarsConfig as any) || {};

    assert(Math.abs(pConfig.academicExcellence?.weight - 0.15) < 0.001, 'Academic Excellence = 15%');
    assert(Math.abs(pConfig.placementCareer?.weight - 0.10) < 0.001, 'Placement & Career = 10%');
    assert(Math.abs(pConfig.studentDemandExperience?.weight - 0.20) < 0.001, 'Student Demand & Experience = 20%');
    assert(Math.abs(pConfig.infrastructureCampus?.weight - 0.15) < 0.001, 'Infrastructure & Campus = 15%');
    assert(Math.abs(pConfig.locationConnectivity?.weight - 0.10) < 0.001, 'Location & Connectivity = 10%');
    assert(Math.abs(pConfig.hostelLivingExperience?.weight - 0.10) < 0.001, 'Hostel & Living Experience = 10%');
    assert(Math.abs(pConfig.safetyHealthcare?.weight - 0.05) < 0.001, 'Safety & Healthcare = 5%');
    assert(Math.abs(pConfig.affordabilityRoi?.weight - 0.05) < 0.001, 'Affordability & ROI = 5%');
    assert(Math.abs(pConfig.trustTransparency?.weight - 0.10) < 0.001, 'Trust & Transparency = 10%');

    const sumWeights =
      pConfig.academicExcellence.weight +
      pConfig.placementCareer.weight +
      pConfig.studentDemandExperience.weight +
      pConfig.infrastructureCampus.weight +
      pConfig.locationConnectivity.weight +
      pConfig.hostelLivingExperience.weight +
      pConfig.safetyHealthcare.weight +
      pConfig.affordabilityRoi.weight +
      pConfig.trustTransparency.weight;
    assert(Math.abs(sumWeights - 1.0) < 0.001, 'Total weights sum to exactly 100%');

    // ----------------------------------------------------
    // TEST 2: Methodology Version System Validation
    // ----------------------------------------------------
    console.log('\n📌 Test 2: Methodology Version Validation & Persistence');
    // Test rejection with invalid pillar count
    try {
      await methodologyService.createVersion(adminUser as any, {
        version: 'v_invalid_count',
        name: 'Invalid Pillars Count',
        pillarsConfig: { academicExcellence: { weight: 1.0, name: 'Academic' } } as any,
      });
      assert(false, 'Should reject methodology with fewer than 9 pillars');
    } catch (err: any) {
      assert(err.message.includes('exactly 9 official pillars'), 'Rejects non-9 pillar methodology');
    }

    // Test rejection with invalid weight total
    try {
      await methodologyService.createVersion(adminUser as any, {
        version: `v_invalid_sum_${Date.now()}`,
        name: 'Invalid Weight Sum',
        pillarsConfig: {
          academicExcellence: { weight: 0.2, name: 'Academic' },
          placementCareer: { weight: 0.1, name: 'Placement' },
          studentDemandExperience: { weight: 0.2, name: 'Demand' },
          infrastructureCampus: { weight: 0.15, name: 'Infra' },
          locationConnectivity: { weight: 0.1, name: 'Location' },
          hostelLivingExperience: { weight: 0.1, name: 'Hostel' },
          safetyHealthcare: { weight: 0.05, name: 'Safety' },
          affordabilityRoi: { weight: 0.05, name: 'Affordability' },
          trustTransparency: { weight: 0.01, name: 'Trust' }, // Sum is 0.96 != 1.0
        },
      });
      assert(false, 'Should reject methodology with weights not totaling 100%');
    } catch (err: any) {
      console.log('Caught expected error for invalid weight sum:', err?.message || err);
      assert(
        (err?.message && err.message.includes('Pillar weights must sum to exactly 1.0')) ||
          (err?.response?.message && err.response.message.includes('Pillar weights must sum to exactly 1.0')),
        'Rejects invalid weight sum',
      );
    }

    // Test successful creation of a valid new version
    const testVersionTag = `v1.1.${Date.now().toString().slice(-4)}`;
    const createdVersion = await methodologyService.createVersion(adminUser as any, {
      version: testVersionTag,
      name: `Swayam Intelligence Calibrated Methodology ${testVersionTag}`,
      description: 'Refined 9-pillar weights version',
      pillarsConfig: {
        academicExcellence: { weight: 0.15, name: 'Academic Excellence' },
        placementCareer: { weight: 0.10, name: 'Placement & Career' },
        studentDemandExperience: { weight: 0.20, name: 'Student Demand & Experience' },
        infrastructureCampus: { weight: 0.15, name: 'Infrastructure & Campus' },
        locationConnectivity: { weight: 0.10, name: 'Location & Connectivity' },
        hostelLivingExperience: { weight: 0.10, name: 'Hostel & Living Experience' },
        safetyHealthcare: { weight: 0.05, name: 'Safety & Healthcare' },
        affordabilityRoi: { weight: 0.05, name: 'Affordability & ROI' },
        trustTransparency: { weight: 0.10, name: 'Trust & Transparency' },
      },
    });
    assert(createdVersion.success, 'New methodology version created successfully');
    assert(createdVersion.data.version === testVersionTag, 'Persisted correct version tag');

    // ----------------------------------------------------
    // TEST 3: Annual Ranking Cycle Management
    // ----------------------------------------------------
    console.log('\n📌 Test 3: Annual Ranking Cycle Registration');
    const testYear = 2026;
    const cycle = await prisma.rankingEdition.findUnique({ where: { year: testYear } });
    if (!cycle) {
      const cycleRes = await cyclesService.createCycle(adminUser as any, {
        year: testYear,
        title: `Swayam National College Rankings ${testYear}`,
        dataCollectionStart: '2026-01-01',
        dataCollectionEnd: '2026-06-30',
        surveyStart: '2026-03-01',
        surveyEnd: '2026-05-31',
      });
      assert(cycleRes.success, 'Registered ranking cycle successfully');
    } else {
      assert(true, 'Ranking cycle already registered for test year');
    }

    // ----------------------------------------------------
    // TEST 4: Run 9-Pillar Ranking Engine Calculation
    // ----------------------------------------------------
    console.log('\n📌 Test 4: Run 9-Pillar Ranking Engine Calculation');
    const calcResult = await rankingEngineService.calculateRanking(adminUser as any, {
      year: testYear,
      methodologyVersion: testVersionTag,
      title: `Swayam National College Rankings ${testYear}`,
    });
    assert(calcResult.success, 'Ranking calculation executed successfully');
    assert(calcResult.data.totalRanked > 0, `Calculated rankings for ${calcResult.data.totalRanked} colleges`);
    assert(calcResult.data.edition.algorithmVersion === testVersionTag, 'Attached selected methodology version to edition');

    // Verify pillar scores exist and composite score is valid
    const topCollege = calcResult.data.topRankings[0];
    assert(topCollege.rank === 1, 'Top college has rank #1');
    assert(topCollege.score > 0, `Top college has positive composite score: ${topCollege.score}`);
    assert(!!topCollege.pillarScores, 'Pillar scores object attached');
    assert(typeof topCollege.pillarScores.academicExcellence === 'number', 'academicExcellence score calculated');
    assert(typeof topCollege.pillarScores.studentDemandExperience === 'number', 'studentDemandExperience score calculated');

    // ----------------------------------------------------
    // TEST 5: All 20 Special Category Rankings
    // ----------------------------------------------------
    console.log('\n📌 Test 5: 20 Special Rankings Generation');
    const SPECIAL_CATEGORIES = [
      'TOP_100',
      'BEST_ACADEMIC',
      'BEST_PLACEMENT',
      'BEST_STUDENT_EXP',
      'MOST_PREFERRED',
      'BEST_INFRA',
      'BEST_CONNECTIVITY',
      'BEST_DAILY_CONVENIENCE',
      'BEST_HOSTEL',
      'BEST_STUDENT_LIFE',
      'BEST_SAFETY',
      'BEST_HEALTHCARE',
      'BEST_VALUE_FOR_MONEY',
      'BEST_AFFORDABLE',
      'MOST_TRANSPARENT',
      'BEST_EMERGING',
      'BEST_STUDENT_FRIENDLY',
      'BEST_FOR_WOMEN',
      'BEST_TIER_2',
      'BEST_TIER_3',
    ];

    for (const cat of SPECIAL_CATEGORIES) {
      const specialRes = await rankingEngineService.getSpecialRankings(testYear, cat, { limit: 10 }, true);
      assert(specialRes.success, `Special ranking '${cat}' returns success`);
      assert(Array.isArray(specialRes.data.results), `Special ranking '${cat}' results is array`);
      if (specialRes.data.results.length > 0) {
        const first = specialRes.data.results[0];
        assert(typeof first.categoryRank === 'number', `'${cat}' first item has categoryRank`);
        assert(typeof first.specialScore === 'number', `'${cat}' first item has specialScore: ${first.specialScore}`);
      }
    }

    // ----------------------------------------------------
    // TEST 6: Publish Ranking Snapshot & Blog Sync
    // ----------------------------------------------------
    console.log('\n📌 Test 6: Publication & Blog Synchronization');
    const pubResult = await rankingEngineService.publishRankingEdition(adminUser as any, testYear);
    assert(pubResult.success, 'Ranking edition published successfully');
    assert(pubResult.data.status === 'PUBLISHED', 'Edition status is PUBLISHED');

    // Check synced blog article
    const syncedBlog = await prisma.blog.findFirst({
      where: {
        slug: `swayam-official-national-college-rankings-${testYear}`,
        status: 'PUBLISHED',
      },
    });
    assert(!!syncedBlog, 'Published ranking announcement synchronized to Blog/Knowledge Hub');
    assert(syncedBlog?.category === 'Research & Rankings', 'Blog category is Research & Rankings');

    // ----------------------------------------------------
    // TEST 7: Public Endpoints Return Clean Normalized Arrays
    // ----------------------------------------------------
    console.log('\n📌 Test 7: Public Endpoints & Data Normalization');
    const publicRankings = await rankingEngineService.getPublicRankings(testYear);
    assert(publicRankings.success, 'getPublicRankings returns success');
    assert(Array.isArray(publicRankings.data.results), 'Public rankings results is an Array');
    assert(publicRankings.data.results.length > 0, `Returned ${publicRankings.data.results.length} published institutions`);

    const publicSpecial = await rankingEngineService.getSpecialRankings(testYear, 'BEST_ACADEMIC', { limit: 10 }, false);
    assert(publicSpecial.success, 'getPublicSpecialRankings returns success');
    assert(Array.isArray(publicSpecial.data.results), 'Public special rankings results is an Array');

    // ----------------------------------------------------
    // TEST 8: Generate Annual Research Report
    // ----------------------------------------------------
    console.log('\n📌 Test 8: Generate Annual Research Report');
    const annualReportRes = await reportService.generateAnnualReport(adminUser as any, {
      rankingYear: testYear,
      title: `Swayam Admission National College Ranking & Research Report ${testYear}`,
    });
    assert(annualReportRes.success, 'Annual Research Report generated successfully');
    assert(!!(annualReportRes.data as any).fullReportJson, 'Report contains all structured research sections');

    const publishedReportRes = await reportService.publishAnnualReport(adminUser as any, testYear);
    assert(publishedReportRes.success, 'Annual Research Report published successfully');

    // ----------------------------------------------------
    // Summary
    // ----------------------------------------------------
    console.log(`\n🎉 SMOKE TEST COMPLETED: ${passCount} / ${totalCount} ASSERTIONS PASSED! 100% SUCCESS!\n`);
  } catch (error) {
    console.error('Smoke test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSmokeTest();
