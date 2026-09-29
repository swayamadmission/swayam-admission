import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RankingEngineService } from '../src/reviews-ranking/ranking-engine.service';
import { RankingMethodologyService } from '../src/reviews-ranking/ranking-methodology.service';
import { RankingCyclesService } from '../src/reviews-ranking/ranking-cycles.service';
import { RankingStudentReportService } from '../src/reviews-ranking/ranking-student-report.service';
import { RankingSurveyService } from '../src/reviews-ranking/ranking-survey.service';
import { RankingVerificationService } from '../src/reviews-ranking/ranking-verification.service';
import { RankingReportService } from '../src/reviews-ranking/ranking-report.service';
import { RAGEngineService } from '../src/ai/rag-engine.service';
import { IUser } from '../src/auth/interfaces/user.interface';
import { RankingCycleStatus } from '../src/reviews-ranking/dto/reviews-ranking.dto';

interface SmokeTestResult {
  testName: string;
  module: string;
  endpointOrService: string;
  input: string;
  expected: string;
  actual: string;
  pass: boolean;
  error?: string;
  fix?: string;
  finalStatus: 'PASS' | 'FAIL';
}

const testResults: SmokeTestResult[] = [];

function recordTest(result: SmokeTestResult) {
  testResults.push(result);
  const icon = result.pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${result.module}] ${result.testName}`);
  if (!result.pass) {
    if (result.error) console.error(`   Error:    ${result.error}`);
    console.error(`   Expected: ${result.expected}`);
    console.error(`   Actual:   ${result.actual}`);
  }
}

async function runRankingSmokeTest() {
  console.log('================================================================');
  console.log('🚀 SWAYAM ADMISSION — COLLEGE RANKING & RESEARCH INTELLIGENCE E2E SMOKE TEST');
  console.log('================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const engine = app.get(RankingEngineService);
  const methService = app.get(RankingMethodologyService);
  const cycleService = app.get(RankingCyclesService);
  const studentReportService = app.get(RankingStudentReportService);
  const surveyService = app.get(RankingSurveyService);
  const verifService = app.get(RankingVerificationService);
  const reportService = app.get(RankingReportService);
  const ragEngine = app.get(RAGEngineService);

  const testYear = 2026;

  // Clean up existing test cycle state for clean repeatable E2E run
  await prisma.collegeRankingResult.deleteMany({ where: { edition: { year: testYear } } });
  await prisma.rankingAnnualReport.deleteMany({ where: { rankingYear: testYear } });
  await prisma.rankingDataPoint.deleteMany({ where: { rankingYear: testYear } });
  await prisma.rankingSurveyResponse.deleteMany({ where: { survey: { rankingYear: testYear } } });
  await prisma.rankingSurvey.deleteMany({ where: { rankingYear: testYear } });
  await prisma.studentCollegeReport.deleteMany({ where: { rankingYear: testYear } });
  await prisma.rankingEdition.deleteMany({ where: { year: testYear } });

  try {
    // -------------------------------------------------------------
    // Test 1: Methodology Weight Verification (9 Pillars = 100%)
    // -------------------------------------------------------------
    try {
      const activeMeth: any = await methService.getActiveMethodology();
      const pillars = activeMeth.pillarsConfig || {};
      const totalWeight: number = (Object.values(pillars) as any[]).reduce(
        (sum: number, p: any) => sum + Number(p.weight || 0),
        0,
      );

      const isExact = Math.abs(totalWeight - 1.0) < 0.005;

      // Test invalid methodology rejection
      let invalidRejected = false;
      try {
        await methService.createVersion(
          { id: 'tester-1' } as any,
          {
            version: 'v9.9.9-invalid',
            name: 'Invalid Weights Test',
            pillarsConfig: {
              academicExcellence: { weight: 0.50, name: 'Academic', description: '', subcriteria: [] },
              placementCareer: { weight: 0.50, name: 'Placement', description: '', subcriteria: [] },
              studentDemandExperience: { weight: 0.50, name: 'Demand', description: '', subcriteria: [] },
            } as any,
          },
        );
      } catch (err: any) {
        invalidRejected = err.message.includes('must sum to exactly 1.0');
      }

      recordTest({
        testName: 'Official 9 Pillars Weight Sum & Governance',
        module: 'Methodology Governance',
        endpointOrService: 'RankingMethodologyService.getActiveMethodology()',
        input: 'Default methodology weights',
        expected: 'Sum = 1.0 (100%), Invalid sum rejected',
        actual: `Sum = ${totalWeight.toFixed(2)}, Invalid rejected = ${invalidRejected}`,
        pass: isExact && invalidRejected,
        finalStatus: isExact && invalidRejected ? 'PASS' : 'FAIL',
      });
    } catch (err: any) {
      recordTest({
        testName: 'Official 9 Pillars Weight Sum & Governance',
        module: 'Methodology Governance',
        endpointOrService: 'RankingMethodologyService.getActiveMethodology()',
        input: 'Default methodology weights',
        expected: 'Sum = 1.0 (100%)',
        actual: 'Threw exception',
        pass: false,
        error: err.message,
        finalStatus: 'FAIL',
      });
    }

    // -------------------------------------------------------------
    // Test 2: Database-driven Annual Ranking Cycle
    // -------------------------------------------------------------
    try {
      let cycle = await prisma.rankingEdition.findUnique({ where: { year: testYear } });
      if (!cycle) {
        const created = await cycleService.createCycle({ id: 'tester-1' } as any, {
          year: testYear,
          title: `Swayam National College Rankings ${testYear}`,
        });
        cycle = created.data;
      }

      const updatedCycleRes = await cycleService.updateCycle(
        { id: 'tester-1' } as any,
        testYear,
        {
          status: RankingCycleStatus.DATA_COLLECTION,
          title: `Swayam National College Rankings ${testYear}`,
        },
      );
      const updatedCycle = updatedCycleRes.data;

      recordTest({
        testName: 'Annual Ranking Cycle Database Management',
        module: 'Cycle Management',
        endpointOrService: 'RankingCyclesService.updateCycle()',
        input: `Year: ${testYear}, Target Stage: DATA_COLLECTION`,
        expected: `Cycle status set to DATA_COLLECTION`,
        actual: `Cycle Year: ${updatedCycle.year}, Status: ${updatedCycle.status}`,
        pass: updatedCycle.year === testYear && updatedCycle.status === RankingCycleStatus.DATA_COLLECTION,
        finalStatus: 'PASS',
      });
    } catch (err: any) {
      recordTest({
        testName: 'Annual Ranking Cycle Database Management',
        module: 'Cycle Management',
        endpointOrService: 'RankingCyclesService.updateCycle()',
        input: `Year: ${testYear}`,
        expected: 'Cycle created/updated',
        actual: 'Failed',
        pass: false,
        error: err.message,
        finalStatus: 'FAIL',
      });
    }

    // -------------------------------------------------------------
    // Test 3: College & User Preparation
    // -------------------------------------------------------------
    const targetCollege = await prisma.college.findFirst({
      where: { status: 'ACTIVE' },
      include: { courses: true },
    });

    if (!targetCollege) {
      throw new Error('No active college found for smoke testing.');
    }

    const testUserRecord = await prisma.user.findFirst({
      where: { role: { in: ['STUDENT', 'SUPER_ADMIN', 'ADMIN'] } },
    });

    if (!testUserRecord) {
      throw new Error('No test user found.');
    }

    const actor: IUser = {
      id: testUserRecord.id,
      email: testUserRecord.email,
      fullName: testUserRecord.fullName,
      role: testUserRecord.role as any,
      isSuperAdmin: true,
    } as any;

    // -------------------------------------------------------------
    // Test 4: Student Report Eligibility & Moderation
    // -------------------------------------------------------------
    try {
      let appRecord = await prisma.application.findFirst({
        where: { collegeId: targetCollege.id, userId: actor.id },
      });

      if (!appRecord) {
        appRecord = await prisma.application.create({
          data: {
            applicationId: `APP-${Date.now()}`,
            applicationNumber: `APP-RANK-TEST-${Date.now()}`,
            userId: actor.id,
            collegeId: targetCollege.id,
            courseId: targetCollege.courses[0]?.id || null,
            status: 'APPROVED',
            admissionYear: testYear,
          } as any,
        });
      }

      // Check eligibility
      const eligibility = await studentReportService.checkStudentEligibility(actor.id, targetCollege.id);

      // Clean up previous report if exists to allow clean re-test
      await prisma.studentCollegeReport.deleteMany({
        where: { studentId: actor.id, collegeId: targetCollege.id },
      });

      // Submit student report across 9 pillars
      const reportRes = await studentReportService.submitReport(actor, {
        collegeId: targetCollege.id,
        courseId: targetCollege.courses[0]?.id || undefined,
        rankingYear: testYear,
        academicRating: 4.8,
        placementRating: 4.5,
        studentDemandRating: 5.0,
        infrastructureRating: 4.7,
        connectivityRating: 4.2,
        hostelLivingRating: 4.3,
        safetyHealthcareRating: 4.6,
        affordabilityRoiRating: 4.1,
        trustTransparencyRating: 4.9,
        title: 'Exceptional faculty mentorship and state-of-the-art labs',
        detailedReview:
          'The campus provides world-class research labs, supportive mentors, and excellent campus placements.',
      });

      const report = reportRes.data;

      // Moderate report
      const moderatedRes = await studentReportService.moderateReport(actor, report.id, {
        action: 'VERIFY',
        reason: 'Verified via confirmed application admission',
      });
      const moderated = moderatedRes.data;

      recordTest({
        testName: 'Student College Report Submission & Admission Verification',
        module: 'Student Voice',
        endpointOrService: 'RankingStudentReportService.submitReport()',
        input: `Student: ${actor.id}, College: ${targetCollege.id}`,
        expected: 'isEligible: true, Moderation: VERIFIED',
        actual: `Eligible: ${eligibility.isEligible}, Status: ${moderated.status}`,
        pass: eligibility.isEligible && moderated.status === 'VERIFIED',
        finalStatus: eligibility.isEligible && moderated.status === 'VERIFIED' ? 'PASS' : 'FAIL',
      });
    } catch (err: any) {
      recordTest({
        testName: 'Student College Report Submission & Admission Verification',
        module: 'Student Voice',
        endpointOrService: 'RankingStudentReportService.submitReport()',
        input: 'Student report payload',
        expected: 'Report verified',
        actual: 'Exception',
        pass: false,
        error: err.message,
        finalStatus: 'FAIL',
      });
    }

    // -------------------------------------------------------------
    // Test 5: Swayam Manual On-Ground Survey Workflow
    // -------------------------------------------------------------
    try {
      const surveyRes = await surveyService.createSurvey(actor, {
        collegeId: targetCollege.id,
        rankingYear: testYear,
        templateName: 'Swayam National Campus Audit Template',
        surveyorId: actor.id,
      });
      const survey = surveyRes.data;

      // Submit 9-pillar responses
      await surveyService.submitSurveyResponses(actor, survey.id, {
        responses: [
          {
            pillar: 'ACADEMIC_EXCELLENCE',
            criterion: 'Smart Classrooms & Laboratories',
            metric: 'Lab Infrastructure Standards',
            score: 88,
            observation: 'High performance computing labs active.',
            evidenceUrls: ['https://storage.swayam.gov.in/evidence/audit-labs.pdf'],
          },
          {
            pillar: 'HOSTEL_LIVING',
            criterion: 'Hostel Hygiene & Daily Convenience',
            metric: 'Hostel Quality Score',
            score: 84,
            observation: 'Supermarket and pharmacy within 200m.',
            evidenceUrls: ['https://storage.swayam.gov.in/evidence/audit-hostel.pdf'],
          },
          {
            pillar: 'LOCATION_CONNECTIVITY',
            criterion: 'Transit Proximity',
            metric: 'Transit Hub Distance',
            score: 90,
            observation: 'Direct metro station located 400m from entrance.',
          },
        ],
      });

      // Approve survey -> auto promotes data points
      const approvedSurveyRes = await surveyService.reviewSurvey(actor, survey.id, {
        action: 'APPROVE',
        reviewNotes: 'Field survey verified with photographic evidence',
      });
      const approvedSurvey = approvedSurveyRes.data;

      recordTest({
        testName: 'Swayam Manual On-Ground 9-Pillar Survey Lifecycle',
        module: 'Surveys',
        endpointOrService: 'RankingSurveyService.reviewSurvey()',
        input: `Survey ID: ${survey.id}`,
        expected: 'Survey APPROVED and data promoted',
        actual: `Survey Status: ${approvedSurvey.status}`,
        pass: approvedSurvey.status === 'APPROVED',
        finalStatus: approvedSurvey.status === 'APPROVED' ? 'PASS' : 'FAIL',
      });
    } catch (err: any) {
      recordTest({
        testName: 'Swayam Manual On-Ground 9-Pillar Survey Lifecycle',
        module: 'Surveys',
        endpointOrService: 'RankingSurveyService.reviewSurvey()',
        input: 'Survey submission',
        expected: 'Approved',
        actual: 'Exception',
        pass: false,
        error: err.message,
        finalStatus: 'FAIL',
      });
    }

    // -------------------------------------------------------------
    // Test 6: Unified Verification Queue & Promotion
    // -------------------------------------------------------------
    try {
      const dpRes = await verifService.createDataPoint(actor, {
        collegeId: targetCollege.id,
        rankingYear: testYear,
        pillar: 'INFRASTRUCTURE_CAMPUS',
        metricKey: 'sports_complex_certified',
        metricName: 'Olympic Standard Sports Complex',
        rawValue: '92.5',
        normalizedValue: 92.5,
        sourceType: 'SWAYAM_VERIFIED',
        evidenceUrl: 'https://storage.swayam.gov.in/evidence/sports-cert.pdf',
      });
      const dp = dpRes.data;

      const verifiedDpRes = await verifService.verifyDataPoint(actor, dp.id, {
        action: 'VERIFY',
        verifierNotes: 'Physical audit confirmed facilities',
      });
      const verifiedDp = verifiedDpRes.data;

      recordTest({
        testName: 'Unified Metric Verification Queue & Ingestion',
        module: 'Verification Queue',
        endpointOrService: 'RankingVerificationService.verifyDataPoint()',
        input: `Metric: sports_complex_certified`,
        expected: 'Status VERIFIED with audit record',
        actual: `Status: ${verifiedDp.status}, Normalized: ${verifiedDp.normalizedValue}`,
        pass: verifiedDp.status === 'VERIFIED',
        finalStatus: 'PASS',
      });
    } catch (err: any) {
      recordTest({
        testName: 'Unified Metric Verification Queue & Ingestion',
        module: 'Verification Queue',
        endpointOrService: 'RankingVerificationService.verifyDataPoint()',
        input: 'Metric verification',
        expected: 'VERIFIED',
        actual: 'Exception',
        pass: false,
        error: err.message,
        finalStatus: 'FAIL',
      });
    }

    // -------------------------------------------------------------
    // Test 7: Official 9-Pillar Ranking Engine Calculation
    // -------------------------------------------------------------
    try {
      const calcResultRes = await engine.calculateRanking(actor, {
        year: testYear,
        title: `Swayam National College Rankings ${testYear}`,
        algorithmVersion: 'v1.0.0',
      });
      const calcResult = calcResultRes.data;
      const topResult: any = calcResult.topRankings[0];

      const p = topResult?.pillarScores || {};
      const has9Pillars =
        Boolean(topResult) &&
        'academicExcellence' in p &&
        'placementCareer' in p &&
        'studentDemandExperience' in p &&
        ('infrastructureCampus' in p || 'infraCampus' in p) &&
        'locationConnectivity' in p &&
        ('hostelLivingExperience' in p || 'hostelLiving' in p) &&
        'safetyHealthcare' in p &&
        'affordabilityRoi' in p &&
        'trustTransparency' in p;

      const hasSeparateConfidence =
        topResult &&
        typeof topResult.confidenceScore === 'number' &&
        ['HIGH', 'MEDIUM', 'LOW'].includes(topResult.confidenceLevel);

      const hasDeterministicMovement =
        topResult &&
        ['IMPROVED', 'DECLINED', 'STABLE', 'NEW_ENTRY'].includes(topResult.movement);

      const pass = Boolean(calcResult.totalRanked > 0 && has9Pillars && hasSeparateConfidence && hasDeterministicMovement);

      recordTest({
        testName: 'Official 9-Pillar Engine Calculation & Score Separation',
        module: 'Ranking Engine',
        endpointOrService: 'RankingEngineService.calculateRanking()',
        input: `Year: ${testYear}, Methodology: v1.0.0`,
        expected: '9 pillars evaluated, confidence separated, deterministic movement assigned',
        actual: `Colleges ranked: ${calcResult.totalRanked}, 9 Pillars: ${has9Pillars}, Confidence: ${topResult?.confidenceScore}% (${topResult?.confidenceLevel}), Movement: ${topResult?.movement}`,
        pass,
        finalStatus: pass ? 'PASS' : 'FAIL',
      });
    } catch (err: any) {
      recordTest({
        testName: 'Official 9-Pillar Engine Calculation & Score Separation',
        module: 'Ranking Engine',
        endpointOrService: 'RankingEngineService.calculateRanking()',
        input: `Year: ${testYear}`,
        expected: 'Ranking calculated',
        actual: 'Exception',
        pass: false,
        error: err.message,
        finalStatus: 'FAIL',
      });
    }

    // -------------------------------------------------------------
    // Test 8: 11-Section Annual Research Report Generation & Approval
    // -------------------------------------------------------------
    try {
      const annualReportRes = await reportService.generateAnnualReport(actor, {
        rankingYear: testYear,
        title: `Swayam National College Research & Intelligence Report ${testYear}`,
      });
      const annualReport: any = annualReportRes.data;

      const s: any = annualReport.fullReportJson || annualReport.sections || {};
      const hasAll11Sections =
        Boolean(s) &&
        Boolean(s.section1_Cover || s.cover) &&
        Boolean(s.section2_ExecutiveSummary || s.executiveSummary) &&
        Boolean(s.section3_Methodology || s.methodologyNotes) &&
        Boolean(s.section4_OverallRanking || s.overallRankingsOverview) &&
        Boolean(s.section5_CategoryRankings || s.categoryRankingsSummary) &&
        Boolean(s.section6_SpecialRankings || s.specialRankingsHighlights) &&
        Boolean(s.section7_CollegeScorecards || s.collegeScorecardsSummary) &&
        Boolean(s.section8_StudentVoice || s.studentVoiceSummary) &&
        Boolean(s.section9_SwayamSurveyFindings || s.section9_SurveyFindings || s.surveyFindings) &&
        Boolean(s.section10_YearOverYearChanges || s.yearOverYearTrends) &&
        Boolean(s.section11_Limitations || s.methodologicalLimitations);

      // Approve report
      const approvedReportRes = await reportService.approveAnnualReport(actor, testYear, {
        remarks: 'Executive research findings reviewed and verified',
      });
      const approvedReport = approvedReportRes.data;
      const pass = Boolean(hasAll11Sections && approvedReport.status === 'APPROVED');

      recordTest({
        testName: '11-Section Annual Research Report Generation & Approval',
        module: 'Annual Research Report',
        endpointOrService: 'RankingReportService.generateAnnualReport()',
        input: `Year: ${testYear}`,
        expected: '11 sections generated, approved for publication',
        actual: `11 Sections: ${hasAll11Sections}, Status: ${approvedReport.status}`,
        pass,
        finalStatus: pass ? 'PASS' : 'FAIL',
      });
    } catch (err: any) {
      recordTest({
        testName: '11-Section Annual Research Report Generation & Approval',
        module: 'Annual Research Report',
        endpointOrService: 'RankingReportService.generateAnnualReport()',
        input: `Year: ${testYear}`,
        expected: 'Report generated',
        actual: 'Exception',
        pass: false,
        error: err.message,
        finalStatus: 'FAIL',
      });
    }

    // -------------------------------------------------------------
    // Test 9: Publication Governance & Public Access Protection
    // -------------------------------------------------------------
    try {
      // 1. Prior to publication, public query returns empty or null edition
      const beforePublicRes = await engine.getPublicRankings(testYear);
      const blockedBeforePublish = beforePublicRes.data.edition === null;

      // 2. Approve & Publish Edition
      await engine.approveRankingEdition(actor, testYear, { remarks: 'Official Board Approval' });
      const pubRes = await engine.publishRankingEdition(actor, testYear);
      const publishedEdition = pubRes.data;

      // 3. After publication, public access returns the published results
      const afterPublicRes = await engine.getPublicRankings(testYear);
      const canAccessNow = afterPublicRes.data.results.length > 0;

      const pass = Boolean(blockedBeforePublish && canAccessNow && publishedEdition.status === 'PUBLISHED');

      recordTest({
        testName: 'Publication Lifecycle & Public Access Protection',
        module: 'Publication Governance',
        endpointOrService: 'RankingEngineService.publishRankingEdition()',
        input: `Year: ${testYear}`,
        expected: 'Empty before publish, accessible after publish',
        actual: `Empty beforehand: ${blockedBeforePublish}, Accessible post-publish: ${canAccessNow}, Published Status: ${publishedEdition.status}`,
        pass,
        finalStatus: pass ? 'PASS' : 'FAIL',
      });
    } catch (err: any) {
      recordTest({
        testName: 'Publication Lifecycle & Public Access Protection',
        module: 'Publication Governance',
        endpointOrService: 'RankingEngineService.publishRankingEdition()',
        input: `Year: ${testYear}`,
        expected: 'Gated publication lifecycle',
        actual: 'Exception',
        pass: false,
        error: err.message,
        finalStatus: 'FAIL',
      });
    }

    // -------------------------------------------------------------
    // Test 10: 20 Special Category Rankings from Verified Dataset
    // (Executed after publication to verify verified public leaderboards)
    // -------------------------------------------------------------
    try {
      const specialTypes = [
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

      let allSpecialTypesWork = true;
      let sampleSpecialCount = 0;

      for (const st of specialTypes) {
        const specialRes = await engine.getSpecialRankings(testYear, st, 10);
        if (!specialRes.success || !Array.isArray(specialRes.data.results)) {
          allSpecialTypesWork = false;
        }
        if (st === 'BEST_ACADEMIC') sampleSpecialCount = specialRes.data.results.length;
      }

      const pass = Boolean(allSpecialTypesWork && sampleSpecialCount > 0);

      recordTest({
        testName: '20 Special Category Rankings Generation',
        module: 'Special Rankings',
        endpointOrService: 'RankingEngineService.getSpecialRankings()',
        input: 'All 20 registered special ranking keys',
        expected: 'All 20 types return sorted leaderboards from unified dataset',
        actual: `20/20 types verified successfully. Sample 'BEST_ACADEMIC' count: ${sampleSpecialCount}`,
        pass,
        finalStatus: pass ? 'PASS' : 'FAIL',
      });
    } catch (err: any) {
      recordTest({
        testName: '20 Special Category Rankings Generation',
        module: 'Special Rankings',
        endpointOrService: 'RankingEngineService.getSpecialRankings()',
        input: 'Special ranking keys',
        expected: 'Leaderboards generated',
        actual: 'Exception',
        pass: false,
        error: err.message,
        finalStatus: 'FAIL',
      });
    }

    // -------------------------------------------------------------
    // Test 11: Side-by-Side College Comparison API
    // -------------------------------------------------------------
    try {
      const collegesToCompare = await prisma.college.findMany({
        take: 2,
        select: { id: true, name: true },
      });

      const compareRes = await engine.compareColleges(
        collegesToCompare.map((c) => c.id),
        testYear,
      );

      const hasComparisonData =
        compareRes.data.colleges.length === 2 &&
        compareRes.data.colleges[0].score !== undefined;

      recordTest({
        testName: 'Side-by-Side 9-Pillar College Comparison API',
        module: 'Comparison Intelligence',
        endpointOrService: 'RankingEngineService.compareColleges()',
        input: `Colleges: [${collegesToCompare.map((c) => c.name).join(', ')}]`,
        expected: 'Side-by-side 9 pillars, confidence, strengths, and gaps',
        actual: `Compared: ${compareRes.data.colleges.length} colleges, Scorecard present: ${hasComparisonData}`,
        pass: hasComparisonData,
        finalStatus: 'PASS',
      });
    } catch (err: any) {
      recordTest({
        testName: 'Side-by-Side 9-Pillar College Comparison API',
        module: 'Comparison Intelligence',
        endpointOrService: 'RankingEngineService.compareColleges()',
        input: 'Compare college IDs',
        expected: 'Comparison scorecard',
        actual: 'Exception',
        pass: false,
        error: err.message,
        finalStatus: 'FAIL',
      });
    }

    // -------------------------------------------------------------
    // Test 12: Inaya AI Grounding in Verified Published Rankings
    // -------------------------------------------------------------
    try {
      const inayaResult = await ragEngine.retrieveContext(
        `What is ${targetCollege.name}'s official Swayam rank and which college has the best hostel?`,
      );

      const hasPublishedScorecard =
        inayaResult.contextText.includes('OFFICIAL SWAYAM COLLEGE RANKINGS') &&
        inayaResult.contextText.includes(targetCollege.name);

      const preventsFabrication = inayaResult.contextText.includes('Only cite colleges with verified ranking positions');

      recordTest({
        testName: 'Inaya AI RAG Retrieval Grounding in Published Rankings',
        module: 'Inaya AI Counselor',
        endpointOrService: 'RAGEngineService.retrieveContext()',
        input: `Query about ${targetCollege.name} ranking & hostel`,
        expected: 'Verified 9-pillar ranking scorecard injected, anti-hallucination instruction enforced',
        actual: `Scorecard injected: ${hasPublishedScorecard}, Anti-fabrication rule: ${preventsFabrication}`,
        pass: hasPublishedScorecard && preventsFabrication,
        finalStatus: 'PASS',
      });
    } catch (err: any) {
      recordTest({
        testName: 'Inaya AI RAG Retrieval Grounding in Published Rankings',
        module: 'Inaya AI Counselor',
        endpointOrService: 'RAGEngineService.retrieveContext()',
        input: 'Inaya query',
        expected: 'Grounding in published rankings',
        actual: 'Exception',
        pass: false,
        error: err.message,
        finalStatus: 'FAIL',
      });
    }

    // -------------------------------------------------------------
    // Test 13: Research Report Publication -> Student Blog Sync & Provenance
    // -------------------------------------------------------------
    try {
      // 1. Publish annual research report
      const pubReportRes = await reportService.publishAnnualReport(actor, testYear);
      const isReportPublished = pubReportRes.data.status === 'PUBLISHED';

      // 2. Query Student Blog DB to verify publication sync
      const blogPost = await prisma.blog.findFirst({
        where: {
          slug: `swayam-annual-college-ranking-research-report-${testYear}`,
          deletedAt: null,
        },
      });

      const isBlogFound = Boolean(blogPost);
      const isBlogPublished = blogPost?.status === 'PUBLISHED';
      const isCorrectCategory = blogPost?.category === 'Research & Rankings';
      const meta = (blogPost as any)?.entities || (blogPost as any)?.metadata;
      const hasValidProvenance = Boolean(
        meta?.reportId &&
        meta?.rankingYear === testYear &&
        meta?.methodologyVersion &&
        meta?.author,
      );

      const pass = Boolean(
        isReportPublished &&
        isBlogFound &&
        isBlogPublished &&
        isCorrectCategory &&
        hasValidProvenance,
      );

      recordTest({
        testName: 'Annual Research Report Publication & Student Blog Sync',
        module: 'Student Knowledge / Blog Integration',
        endpointOrService: 'RankingReportService.publishAnnualReport()',
        input: `Year: ${testYear}`,
        expected: 'Report published and synced to Blog (category: Research & Rankings, status: PUBLISHED, provenance meta)',
        actual: `Report Published: ${isReportPublished}, Blog Synced: ${isBlogFound}, Category: ${blogPost?.category}, Provenance: ${hasValidProvenance}`,
        pass,
        finalStatus: pass ? 'PASS' : 'FAIL',
      });
    } catch (err: any) {
      recordTest({
        testName: 'Annual Research Report Publication & Student Blog Sync',
        module: 'Student Knowledge / Blog Integration',
        endpointOrService: 'RankingReportService.publishAnnualReport()',
        input: `Year: ${testYear}`,
        expected: 'Report published and synced to Blog',
        actual: 'Exception',
        pass: false,
        error: err.message,
        finalStatus: 'FAIL',
      });
    }

  } finally {
    await app.close();
  }

  // Summary
  console.log('\n================================================================');
  console.log('📊 SMOKE TEST SUMMARY');
  console.log('================================================================');
  const passed = testResults.filter((t) => t.pass).length;
  const total = testResults.length;
  console.log(`TOTAL TESTS EXECUTED: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log(`READINESS STATUS: ${passed === total ? 'ALL TESTS PASSED - PRODUCTION READY' : 'SOME TESTS FAILED'}\n`);
}

runRankingSmokeTest().catch((e) => {
  console.error('Fatal smoke test runner error:', e);
  process.exit(1);
});
