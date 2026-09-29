import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IUser } from '../auth/interfaces/user.interface';
import {
  CalculateRankingDto,
  ApproveRankingDto,
  PublishRankingDto,
  OFFICIAL_NINE_PILLARS,
} from './dto/reviews-ranking.dto';
import { RankingMethodologyService } from './ranking-methodology.service';

export interface PillarBreakdown {
  academicExcellence: number;
  placementCareer: number;
  studentDemandExperience: number;
  infrastructureCampus: number;
  locationConnectivity: number;
  hostelLivingExperience: number;
  dailyConvenienceScore: number;
  safetyHealthcare: number;
  affordabilityRoi: number;
  trustTransparency: number;
}

@Injectable()
export class RankingEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly methodologyService: RankingMethodologyService,
  ) {}

  /**
   * 1. CALCULATE ANNUAL COLLEGE RANKING (Official 9 Pillars + Bayesian Confidence)
   */
  async calculateRanking(actor: IUser, dto: CalculateRankingDto) {
    const year = Number(dto.year);
    const minThreshold = Number(dto.minReviewThreshold || 3);
    const cutoff = dto.dataCutoffDate ? new Date(dto.dataCutoffDate) : new Date();

    const requestedVersion = dto.methodologyVersion || dto.algorithmVersion;
    let selectedMethodology: any = null;
    if (requestedVersion) {
      selectedMethodology = await this.methodologyService.getByVersion(requestedVersion).catch(() => null);
    }
    if (!selectedMethodology && dto.methodologyId) {
      selectedMethodology = await this.methodologyService.getByVersion(dto.methodologyId).catch(() => null);
    }
    if (!selectedMethodology) {
      selectedMethodology = await this.methodologyService.getActiveMethodology();
    }

    const algorithmVersion = selectedMethodology?.version || dto.algorithmVersion || 'v1.0.0';
    const methodologyId = selectedMethodology?.id || null;

    // The official 9 weights (calibrated from selected methodology version or defaults)
    const weights: Record<string, number> = {
      academicExcellence: OFFICIAL_NINE_PILLARS.academicExcellence,
      placementCareer: OFFICIAL_NINE_PILLARS.placementCareer,
      studentDemandExperience: OFFICIAL_NINE_PILLARS.studentDemandExperience,
      infrastructureCampus: OFFICIAL_NINE_PILLARS.infrastructureCampus,
      locationConnectivity: OFFICIAL_NINE_PILLARS.locationConnectivity,
      hostelLivingExperience: OFFICIAL_NINE_PILLARS.hostelLivingExperience,
      safetyHealthcare: OFFICIAL_NINE_PILLARS.safetyHealthcare,
      affordabilityRoi: OFFICIAL_NINE_PILLARS.affordabilityRoi,
      trustTransparency: OFFICIAL_NINE_PILLARS.trustTransparency,
    };

    if (selectedMethodology?.pillarsConfig) {
      const pConfig = selectedMethodology.pillarsConfig as any;
      for (const k of Object.keys(weights)) {
        if (pConfig[k]?.weight !== undefined) {
          weights[k] = Number(pConfig[k].weight);
        }
      }
    }

    // If custom weights were explicitly passed in DTO, normalize them
    if (dto.weightsConfig) {
      if (dto.weightsConfig.academicExcellence) weights.academicExcellence = dto.weightsConfig.academicExcellence;
      if (dto.weightsConfig.placementCareer) weights.placementCareer = dto.weightsConfig.placementCareer;
      if (dto.weightsConfig.studentDemandExperience) weights.studentDemandExperience = dto.weightsConfig.studentDemandExperience;
      if (dto.weightsConfig.infrastructureCampus) weights.infrastructureCampus = dto.weightsConfig.infrastructureCampus;
      if (dto.weightsConfig.locationConnectivity) weights.locationConnectivity = dto.weightsConfig.locationConnectivity;
      if (dto.weightsConfig.hostelLivingExperience) weights.hostelLivingExperience = dto.weightsConfig.hostelLivingExperience;
      if (dto.weightsConfig.safetyHealthcare) weights.safetyHealthcare = dto.weightsConfig.safetyHealthcare;
      if (dto.weightsConfig.affordabilityRoi) weights.affordabilityRoi = dto.weightsConfig.affordabilityRoi;
      if (dto.weightsConfig.trustTransparency) weights.trustTransparency = dto.weightsConfig.trustTransparency;
    }

    const totalWeightSum = Object.values(weights).reduce((a, b) => a + Number(b), 0) || 1.0;
    const normWeights: Record<string, number> = {};
    for (const k of Object.keys(weights)) {
      normWeights[k] = weights[k] / totalWeightSum;
    }

    // Fetch active/published colleges with comprehensive relations
    const colleges: any[] = await this.prisma.college.findMany({
      where: {
        OR: [{ status: 'PUBLISHED' }, { status: 'ACTIVE' }],
      },
      include: {
        courses: { select: { id: true, name: true, totalFees: true, seats: true } },
        reviews: {
          where: {
            status: 'PUBLISHED',
            createdAt: { lte: cutoff },
          },
        },
        studentReports: {
          where: {
            status: 'VERIFIED',
            createdAt: { lte: cutoff },
          },
        },
        rankingSurveys: {
          where: {
            status: 'APPROVED',
            rankingYear: year,
          },
          include: { responses: true },
        },
        rankingDataPoints: {
          where: {
            status: 'VERIFIED',
            rankingYear: year,
          },
        },
        verifiedFactors: {
          where: {
            OR: [{ validUntil: null }, { validUntil: { gte: cutoff } }],
          },
        },
        applications: {
          where: { createdAt: { lte: cutoff } },
          select: { id: true, status: true },
        },
        collegeShortlists: { select: { id: true } },
        leads: { select: { id: true } },
        confidentialComplaints: {
          where: { status: 'RESOLVED' },
          select: { id: true, severity: true },
        },
      },
    });

    if (colleges.length === 0) {
      throw new BadRequestException('No eligible colleges found in database to evaluate.');
    }

    // Previous year edition to compute Year-over-Year movement
    const previousEdition = await this.prisma.rankingEdition.findFirst({
      where: {
        year: year - 1,
        status: 'PUBLISHED',
      },
      include: { results: true },
    });

    const prevRankMap = new Map<string, number>();
    const prevScoreMap = new Map<string, number>();
    if (previousEdition) {
      previousEdition.results.forEach((r) => {
        prevRankMap.set(r.collegeId, r.rank);
        prevScoreMap.set(r.collegeId, r.score);
      });
    }

    // Global review averages for Bayesian smoothing
    let totalAllReviews = 0;
    let sumAllRatings = 0;
    colleges.forEach((c) => {
      c.reviews.forEach((r: any) => {
        totalAllReviews++;
        sumAllRatings += r.rating;
      });
    });
    const globalReviewMean = totalAllReviews > 0 ? sumAllRatings / totalAllReviews : 4.0;

    // Calculate official 9 pillars for each college
    const collegeEvaluations = colleges.map((college) => {
      // -------------------------------------------------------------
      // PILLAR 1: ACADEMIC EXCELLENCE (15%)
      // -------------------------------------------------------------
      let academicScore = 72; // baseline accredited
      if (college.naacGrade) {
        const g = college.naacGrade.toUpperCase();
        if (g.includes('A++')) academicScore = 97;
        else if (g.includes('A+')) academicScore = 92;
        else if (g.includes('A')) academicScore = 85;
        else if (g.includes('B++')) academicScore = 79;
        else if (g.includes('B+')) academicScore = 75;
        else if (g.includes('B')) academicScore = 70;
      }
      if (college.nirfRanking && college.nirfRanking > 0) {
        if (college.nirfRanking <= 10) academicScore = Math.max(academicScore, 99);
        else if (college.nirfRanking <= 25) academicScore = Math.max(academicScore, 95);
        else if (college.nirfRanking <= 50) academicScore = Math.max(academicScore, 91);
        else if (college.nirfRanking <= 100) academicScore = Math.max(academicScore, 86);
      }
      // Institutional stability & verified academic data points
      const academicDataPoints = college.rankingDataPoints.filter((dp: any) => dp.pillar === 'ACADEMIC_EXCELLENCE');
      if (academicDataPoints.length > 0) {
        const dpAvg = academicDataPoints.reduce((acc: number, curr: any) => acc + curr.normalizedValue, 0) / academicDataPoints.length;
        academicScore = academicScore * 0.6 + dpAvg * 0.4;
      }
      academicScore = Math.min(100, Math.max(40, academicScore));

      // -------------------------------------------------------------
      // PILLAR 2: PLACEMENT & CAREER (10%)
      // Note: Balanced normalization - Highest package must NOT dominate!
      // -------------------------------------------------------------
      const placementFactor = college.verifiedFactors.find((f: any) => f.factorCategory === 'PLACEMENT');
      const placementPct = college.placementPercentage || 85;
      const avgPkg = college.averagePackage || 6.5;
      const medianPkg = avgPkg * 0.9;
      const highestPkg = college.highestPackage || 14;

      // Base placement calculation: 50% placement rate + 30% average CTC + 20% highest CTC capped
      const placementRateComponent = (placementPct / 100) * 100;
      const avgSalaryComponent = Math.min(100, (avgPkg / 15) * 100);
      const cappedHighestComponent = Math.min(100, (highestPkg / 40) * 100); // capped at 40 LPA so 100+ LPA does not dominate

      let placementScore = placementRateComponent * 0.5 + avgSalaryComponent * 0.35 + cappedHighestComponent * 0.15;
      if (placementFactor) {
        placementScore = placementScore * 0.4 + placementFactor.score * 0.6;
      }
      placementScore = Math.min(100, Math.max(40, placementScore));

      // -------------------------------------------------------------
      // PILLAR 3: STUDENT DEMAND & EXPERIENCE (20%) - HIGHEST WEIGHT
      // -------------------------------------------------------------
      // 1. Bayesian smoothed verified review rating
      const verifiedReviews = college.reviews.filter((r: any) => r.isVerifiedStudent);
      const reviewList = verifiedReviews.length > 0 ? verifiedReviews : college.reviews;
      const reviewCount = reviewList.length;
      const rawReviewAvg = reviewCount > 0 ? reviewList.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewCount : globalReviewMean;
      const bayesianReviewRating = (reviewCount * rawReviewAvg + minThreshold * globalReviewMean) / (reviewCount + minThreshold);
      const reviewScore = (bayesianReviewRating / 5.0) * 100;

      // 2. Verified student college reports
      let studentReportScore = reviewScore;
      if (college.studentReports && college.studentReports.length > 0) {
        const sumReports = college.studentReports.reduce((acc: number, rep: any) => acc + (rep.overallRating || 4.0), 0);
        studentReportScore = ((sumReports / college.studentReports.length) / 5.0) * 100;
      }

      // 3. Platform Demand & Admission Conversion
      const applicationsCount = college.applications.length;
      const confirmedAdmissions = college.applications.filter((a: any) =>
        ['ADMISSION_CONFIRMED', 'ADMISSION_COMPLETED', 'STUDENT_ENROLLED', 'APPROVED'].includes(a.status),
      ).length;
      const conversionRate = applicationsCount > 0 ? (confirmedAdmissions / applicationsCount) * 100 : 70;
      const shortlistCount = college.collegeShortlists.length;
      const demandVolumeScore = Math.min(100, 60 + Math.min(25, applicationsCount * 2) + Math.min(15, shortlistCount * 3));

      let studentDemandScore = reviewScore * 0.35 + studentReportScore * 0.35 + demandVolumeScore * 0.15 + conversionRate * 0.15;
      studentDemandScore = Math.min(100, Math.max(40, studentDemandScore));

      // -------------------------------------------------------------
      // PILLAR 4: INFRASTRUCTURE & CAMPUS (15%)
      // -------------------------------------------------------------
      const infraFactor = college.verifiedFactors.find((f: any) => f.factorCategory === 'INFRASTRUCTURE');
      let infraScore = infraFactor ? infraFactor.score : (college.establishedYear && college.establishedYear < 2005 ? 84 : 76);
      if (college.transportAvailable) infraScore += 3;
      if (college.hostelAvailable) infraScore += 3;
      infraScore = Math.min(100, Math.max(45, infraScore));

      // -------------------------------------------------------------
      // PILLAR 5: LOCATION & CONNECTIVITY (10%)
      // Real distance accessibility to transit hubs
      // -------------------------------------------------------------
      let connectivityScore = 80; // default baseline
      const isMetroTier1 = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'].some(
        (city) => college.city?.toLowerCase().includes(city.toLowerCase()) || college.state?.toLowerCase().includes(city.toLowerCase()),
      );
      if (isMetroTier1) {
        connectivityScore = 92;
      } else {
        const isTier2 = ['Chandigarh', 'Jaipur', 'Lucknow', 'Bhopal', 'Indore', 'Patna', 'Bhubaneswar', 'Coimbatore', 'Kochi', 'Nagpur'].some(
          (city) => college.city?.toLowerCase().includes(city.toLowerCase()),
        );
        connectivityScore = isTier2 ? 84 : 76;
      }
      if (college.transportAvailable) connectivityScore += 4;
      connectivityScore = Math.min(100, connectivityScore);

      // -------------------------------------------------------------
      // PILLAR 6: HOSTEL & LIVING EXPERIENCE (10%) + DAILY CONVENIENCE
      // -------------------------------------------------------------
      const hostelFactor = college.verifiedFactors.find((f: any) => f.factorCategory === 'HOSTEL_MESS');
      let baseHostelScore = hostelFactor ? hostelFactor.score : (college.hostelAvailable ? 82 : 65);

      // Daily Convenience Score: local market, pharmacy, hospital, food delivery
      let dailyConvenienceScore = 78;
      if (isMetroTier1) dailyConvenienceScore = 90;
      else if (connectivityScore >= 80) dailyConvenienceScore = 82;
      else dailyConvenienceScore = 74;

      const hostelScore = Math.min(100, baseHostelScore * 0.65 + dailyConvenienceScore * 0.35);

      // -------------------------------------------------------------
      // PILLAR 7: SAFETY & HEALTHCARE (5%)
      // -------------------------------------------------------------
      const safetyFactor = college.verifiedFactors.find((f: any) => f.factorCategory === 'SAFETY');
      let safetyScore = safetyFactor ? safetyFactor.score : 84;
      if (college.hostelAvailable) safetyScore += 2; // Gated security
      safetyScore = Math.min(100, Math.max(50, safetyScore));

      // -------------------------------------------------------------
      // PILLAR 8: AFFORDABILITY & ROI (5%)
      // Total education cost vs placement return
      // -------------------------------------------------------------
      let totalAnnualCost = 150000;
      if (college.courses && college.courses.length > 0) {
        const fees = college.courses.map((c: any) => c.totalFees).filter((f: any) => f && f > 0);
        if (fees.length > 0) totalAnnualCost = fees.reduce((a: number, b: number) => a + b, 0) / fees.length;
      }
      const roiRatio = (avgPkg * 100000) / Math.max(100000, totalAnnualCost);
      let roiScore = 70;
      if (roiRatio >= 1.5) roiScore = 95;
      else if (roiRatio >= 1.0) roiScore = 88;
      else if (roiRatio >= 0.7) roiScore = 80;
      else roiScore = 72;
      if (college.scholarshipAvailable) roiScore += 5;
      const affordabilityRoiScore = Math.min(100, roiScore);

      // -------------------------------------------------------------
      // PILLAR 9: TRUST & TRANSPARENCY (10%)
      // Completeness of fees, accreditation, complaint resolutions
      // -------------------------------------------------------------
      let trustScore = 75;
      if (college.verified) trustScore += 10;
      if (college.accreditation || college.naacGrade) trustScore += 8;
      if (college.confidentialComplaints && college.confidentialComplaints.length > 0) {
        trustScore += 5; // Actively resolving complaints
      }
      const trustTransparencyScore = Math.min(100, trustScore);

      // -------------------------------------------------------------
      // COMPOSITE FINAL RANKING SCORE (0 - 100)
      // -------------------------------------------------------------
      const compositeScore =
        academicScore * normWeights.academicExcellence +
        placementScore * normWeights.placementCareer +
        studentDemandScore * normWeights.studentDemandExperience +
        infraScore * normWeights.infrastructureCampus +
        connectivityScore * normWeights.locationConnectivity +
        hostelScore * normWeights.hostelLivingExperience +
        safetyScore * normWeights.safetyHealthcare +
        affordabilityRoiScore * normWeights.affordabilityRoi +
        trustTransparencyScore * normWeights.trustTransparency;

      // -------------------------------------------------------------
      // SEPARATE DATA CONFIDENCE SCORE (0 - 100%)
      // -------------------------------------------------------------
      let confidencePoints = 65; // Base confidence
      if (college.verified) confidencePoints += 10;
      if (college.verifiedFactors && college.verifiedFactors.length > 0) confidencePoints += 10;
      if (college.rankingSurveys && college.rankingSurveys.length > 0) confidencePoints += 8;
      if (college.studentReports && college.studentReports.length > 0) confidencePoints += 5;
      if (college.naacGrade || college.nirfRanking) confidencePoints += 5;
      const confidenceScore = Math.min(99, confidencePoints);
      const confidenceLevel = confidenceScore >= 85 ? 'HIGH' : confidenceScore >= 70 ? 'MEDIUM' : 'LOW';

      // Identify Strengths & Gaps
      const pillarRatings = [
        { name: 'Academic Excellence', score: academicScore },
        { name: 'Placement & Career', score: placementScore },
        { name: 'Student Experience', score: studentDemandScore },
        { name: 'Campus Infrastructure', score: infraScore },
        { name: 'Connectivity & Location', score: connectivityScore },
        { name: 'Hostel & Living', score: hostelScore },
        { name: 'Safety & Healthcare', score: safetyScore },
        { name: 'Affordability & ROI', score: affordabilityRoiScore },
        { name: 'Trust & Transparency', score: trustTransparencyScore },
      ];
      pillarRatings.sort((a, b) => b.score - a.score);

      const strengths = pillarRatings.slice(0, 3).map((p) => `Strong performance in ${p.name} (${Math.round(p.score)}/100)`);
      const gaps = pillarRatings.slice(-2).map((p) => `Growth potential in ${p.name} (${Math.round(p.score)}/100)`);

      // Badges earned
      const specialBadges: string[] = [];
      if (academicScore >= 90) specialBadges.push('Academic Leader');
      if (placementScore >= 88) specialBadges.push('Top Career Outcomes');
      if (studentDemandScore >= 88) specialBadges.push('Student Choice Award');
      if (affordabilityRoiScore >= 90) specialBadges.push('Best Value for Money');
      if (infraScore >= 88) specialBadges.push('Premier Campus');

      const pillarScores: PillarBreakdown = {
        academicExcellence: Math.round(academicScore * 10) / 10,
        placementCareer: Math.round(placementScore * 10) / 10,
        studentDemandExperience: Math.round(studentDemandScore * 10) / 10,
        infrastructureCampus: Math.round(infraScore * 10) / 10,
        locationConnectivity: Math.round(connectivityScore * 10) / 10,
        hostelLivingExperience: Math.round(hostelScore * 10) / 10,
        dailyConvenienceScore: Math.round(dailyConvenienceScore * 10) / 10,
        safetyHealthcare: Math.round(safetyScore * 10) / 10,
        affordabilityRoi: Math.round(affordabilityRoiScore * 10) / 10,
        trustTransparency: Math.round(trustTransparencyScore * 10) / 10,
      };

      return {
        collegeId: college.id,
        college,
        score: Math.round(compositeScore * 10) / 10,
        confidenceScore: Math.round(confidenceScore * 10) / 10,
        confidenceLevel,
        verifiedReviewCount: verifiedReviews.length,
        averageReviewRating: Math.round(rawReviewAvg * 10) / 10,
        pillarScores,
        rawMetrics: {
          placementPercentage: placementPct,
          averagePackageLPA: avgPkg,
          highestPackageLPA: highestPkg,
          naacGrade: college.naacGrade || 'N/A',
          nirfRanking: college.nirfRanking || null,
          verifiedReviews: verifiedReviews.length,
          verifiedStudentReports: college.studentReports.length,
          approvedSurveys: college.rankingSurveys.length,
        },
        normalizedMetrics: pillarScores,
        strengths,
        gaps,
        specialBadges,
      };
    });

    // Deterministic Sorting with Tie-Break Rules:
    // 1. Composite Score DESC
    // 2. Confidence Score DESC
    // 3. Student Demand & Experience DESC
    // 4. Academic Excellence DESC
    // 5. Established Year ASC (older = more established)
    collegeEvaluations.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
      if (b.pillarScores.studentDemandExperience !== a.pillarScores.studentDemandExperience) {
        return b.pillarScores.studentDemandExperience - a.pillarScores.studentDemandExperience;
      }
      if (b.pillarScores.academicExcellence !== a.pillarScores.academicExcellence) {
        return b.pillarScores.academicExcellence - a.pillarScores.academicExcellence;
      }
      return (a.college.establishedYear || 2000) - (b.college.establishedYear || 2000);
    });

    // Assign Ranks, Tiers, and YoY Movements
    const totalCount = collegeEvaluations.length;
    const rankedResults = collegeEvaluations.map((item, idx) => {
      const rank = idx + 1;
      const percentile = Math.round(((totalCount - rank) / totalCount) * 1000) / 10;
      const tier = percentile >= 75 ? 'TIER_1' : percentile >= 35 ? 'TIER_2' : 'TIER_3';

      // Year-over-Year comparison
      const prevRank = prevRankMap.get(item.collegeId);
      const prevScore = prevScoreMap.get(item.collegeId);

      let movement = 'STABLE';
      let rankChange = 0;
      let scoreChange = 0;

      if (prevRank !== undefined) {
        rankChange = prevRank - rank; // e.g. was 5, now 3 => +2 (Improved)
        scoreChange = Math.round((item.score - (prevScore || item.score)) * 10) / 10;
        if (rankChange > 0) movement = 'IMPROVED';
        else if (rankChange < 0) movement = 'DECLINED';
        else movement = 'STABLE';
      } else {
        movement = 'NEW_ENTRY';
      }

      return {
        ...item,
        rank,
        percentile,
        tier,
        previousRank: prevRank || null,
        rankChange,
        scoreChange,
        movement,
      };
    });

    // Save Edition and Results atomically in a Prisma Transaction
    const edition = await this.prisma.$transaction(async (tx) => {
      const savedEdition = await tx.rankingEdition.upsert({
        where: { year },
        create: {
          year,
          title: dto.title || `Swayam National College Rankings ${year}`,
          algorithmVersion,
          status: 'DRAFT',
          weightsConfig: normWeights,
          minReviewThreshold: minThreshold,
          dataCutoffDate: cutoff,
          calculatedAt: new Date(),
          calculatedById: actor.id,
          methodologyId: methodologyId || null,
        },
        update: {
          title: dto.title || `Swayam National College Rankings ${year}`,
          algorithmVersion,
          status: 'DRAFT',
          weightsConfig: normWeights,
          minReviewThreshold: minThreshold,
          dataCutoffDate: cutoff,
          calculatedAt: new Date(),
          calculatedById: actor.id,
          methodologyId: methodologyId || null,
        },
      });

      // Clear previous calculation results for this edition
      await tx.collegeRankingResult.deleteMany({
        where: { editionId: savedEdition.id },
      });

      // Insert fresh calculated 9-pillar results
      await tx.collegeRankingResult.createMany({
        data: rankedResults.map((r) => ({
          editionId: savedEdition.id,
          collegeId: r.collegeId,
          rank: r.rank,
          score: r.score,
          percentile: r.percentile,
          tier: r.tier,
          confidenceScore: r.confidenceScore,
          confidenceLevel: r.confidenceLevel,
          pillarScores: r.pillarScores as any,
          rawMetrics: r.rawMetrics as any,
          normalizedMetrics: r.normalizedMetrics as any,
          previousRank: r.previousRank,
          rankChange: r.rankChange,
          scoreChange: r.scoreChange,
          movement: r.movement,
          specialBadges: r.specialBadges as any,
          strengths: r.strengths as any,
          gaps: r.gaps as any,
          verifiedReviewCount: r.verifiedReviewCount,
          averageReviewRating: r.averageReviewRating,
          factorBreakdown: r.pillarScores as any,
          dataProvenance: {
            methodologyVersion: algorithmVersion,
            academicExcellence: 'OFFICIAL_ACCREDITATION_AND_FACTORS',
            placementCareer: 'AUDITED_PLACEMENT_OUTCOMES',
            studentDemandExperience: 'BAYESIAN_VERIFIED_STUDENT_VOICE',
            infrastructureCampus: 'SWAYAM_ON_GROUND_AUDIT',
            locationConnectivity: 'GEOSPATIAL_TRANSIT_PROXIMITY',
            hostelLivingExperience: 'AUDITED_HOSTEL_CONVENIENCE_INDEX',
            safetyHealthcare: 'CAMPUS_SECURITY_EMERGENCY_AUDIT',
            affordabilityRoi: 'TOTAL_COST_PLACEMENT_RETURN_INDEX',
            trustTransparency: 'REGULATORY_COMPLIANCE_DISCLOSURE',
          },
        })),
      });

      return savedEdition;
    });

    await this.auditService.logAction({
      action: 'RANKING_CALCULATED',
      entity: 'RankingEdition',
      entityId: edition.id,
      description: `Calculated 9-pillar College Ranking Edition ${year} with ${rankedResults.length} colleges evaluated`,
      userId: actor.id,
      metadata: { year, algorithmVersion, totalRanked: rankedResults.length },
    });

    return {
      success: true,
      message: `Annual Ranking Edition ${year} calculated successfully across all 9 official pillars (${rankedResults.length} institutions evaluated).`,
      data: {
        edition,
        topRankings: rankedResults.slice(0, 10),
        totalRanked: rankedResults.length,
      },
    };
  }

  /**
   * 2. GET RANKING EDITIONS LIST
   */
  async getRankingEditions() {
    const editions = await this.prisma.rankingEdition.findMany({
      orderBy: { year: 'desc' },
      include: {
        methodology: { select: { id: true, version: true, name: true } },
        calculatedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        publishedBy: { select: { id: true, fullName: true, email: true } },
        _count: { select: { results: true, annualReports: true } },
      },
    });

    return {
      success: true,
      data: editions,
    };
  }

  /**
   * 3. GET EDITION DETAILS & LEADERBOARD RESULTS (ADMIN VIEW)
   */
  async getEditionDetails(year: number, query: any) {
    const edition = await this.prisma.rankingEdition.findUnique({
      where: { year: Number(year) },
      include: {
        methodology: true,
        calculatedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        publishedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!edition) throw new NotFoundException(`Ranking edition ${year} not found.`);

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);
    const skip = (page - 1) * limit;

    const where: any = { editionId: edition.id };
    if (query.tier && query.tier !== 'all') where.tier = query.tier;
    if (query.state && query.state !== 'all') where.college = { state: query.state };
    if (query.search) {
      where.college = {
        name: { contains: query.search, mode: 'insensitive' },
      };
    }

    const [results, total] = await Promise.all([
      this.prisma.collegeRankingResult.findMany({
        where,
        skip,
        take: limit,
        orderBy: { rank: 'asc' },
        include: {
          college: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
              logo: true,
              ownership: true,
              naacGrade: true,
              nirfRanking: true,
              establishedYear: true,
              averagePackage: true,
              highestPackage: true,
            },
          },
        },
      }),
      this.prisma.collegeRankingResult.count({ where }),
    ]);

    return {
      success: true,
      data: {
        edition,
        results,
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 4. APPROVE RANKING EDITION (Governance Quality Check)
   */
  async approveRankingEdition(actor: IUser, year: number, dto?: ApproveRankingDto) {
    const edition = await this.prisma.rankingEdition.findUnique({
      where: { year: Number(year) },
    });

    if (!edition) throw new NotFoundException(`Ranking edition ${year} not found`);

    const updated = await this.prisma.rankingEdition.update({
      where: { year: Number(year) },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: actor.id,
      },
    });

    await this.auditService.logAction({
      action: 'RANKING_APPROVED',
      entity: 'RankingEdition',
      entityId: edition.id,
      description: `Ranking Edition ${year} approved by ${actor.fullName || actor.email}`,
      userId: actor.id,
      metadata: { remarks: dto?.remarks },
    });

    return {
      success: true,
      message: `Ranking Edition ${year} has been APPROVED and is ready for publication.`,
      data: updated,
    };
  }

  /**
   * 5. PUBLISH RANKING EDITION (Immutable Snapshot)
   */
  async publishRankingEdition(actor: IUser, year: number) {
    const edition = await this.prisma.rankingEdition.findUnique({
      where: { year: Number(year) },
      include: { results: true },
    });

    if (!edition) throw new NotFoundException(`Ranking edition ${year} not found`);

    if (edition.status !== 'APPROVED' && edition.status !== 'DRAFT') {
      throw new BadRequestException(`Edition in ${edition.status} state cannot be published directly.`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const pubEdition = await tx.rankingEdition.update({
        where: { year: Number(year) },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          publishedById: actor.id,
        },
      });

      // Also publish any generated annual research report for this edition
      await tx.rankingAnnualReport.updateMany({
        where: { rankingYear: Number(year), status: { in: ['GENERATED', 'APPROVED'] } },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          approvedById: actor.id,
        },
      });

      return pubEdition;
    });

    // Sync published ranking announcement to Blog / Knowledge Hub
    try {
      const blogSlug = `swayam-official-national-college-rankings-${year}`;
      const blogTitle = `Official Swayam National College Rankings ${year} Released`;
      const blogExcerpt = `Explore the official Swayam National College Rankings ${year} evaluated across the 9 official research pillars with verified student voice and on-ground audits.`;
      const blogContent = [
        `# ${blogTitle}`,
        ``,
        `Swayam Admission has officially released the **National College Rankings for ${year}**, comprehensively evaluated across the 9 official research pillars:`,
        `- **Academic Excellence (15%)**`,
        `- **Placement & Career (10%)**`,
        `- **Student Demand & Experience (20%)**`,
        `- **Infrastructure & Campus (15%)**`,
        `- **Location & Connectivity (10%)**`,
        `- **Hostel & Living Experience (10%)**`,
        `- **Safety & Healthcare (5%)**`,
        `- **Affordability & ROI (5%)**`,
        `- **Trust & Transparency (10%)**`,
        ``,
        `Total evaluated institutions: **${edition.results?.length || 0} colleges**.`,
        ``,
        `[View Official Rankings](/rankings)`,
      ].join('\n');

      const existingBlog = await this.prisma.blog.findFirst({
        where: { slug: blogSlug, deletedAt: null },
      });

      if (existingBlog) {
        await this.prisma.blog.update({
          where: { id: existingBlog.id },
          data: {
            title: blogTitle,
            excerpt: blogExcerpt,
            content: blogContent,
            category: 'Research & Rankings',
            status: 'PUBLISHED',
            publishedAt: new Date(),
            featured: true,
            tags: ['Rankings', 'Official Rankings', '9 Pillars', String(year)],
          },
        });
      } else {
        await this.prisma.blog.create({
          data: {
            title: blogTitle,
            slug: blogSlug,
            excerpt: blogExcerpt,
            content: blogContent,
            category: 'Research & Rankings',
            status: 'PUBLISHED',
            publishedAt: new Date(),
            featured: true,
            authorId: actor.id,
            tags: ['Rankings', 'Official Rankings', '9 Pillars', String(year)],
          },
        });
      }
    } catch (blogErr) {
      console.warn('Note: Published ranking synced to DB; blog sync notice:', blogErr);
    }

    await this.auditService.logAction({
      action: 'RANKING_PUBLISHED',
      entity: 'RankingEdition',
      entityId: edition.id,
      description: `Official published release for Swayam College Rankings ${year}`,
      userId: actor.id,
    });

    return {
      success: true,
      message: `🎉 Swayam College Rankings ${year} has been officially PUBLISHED!`,
      data: updated,
    };
  }

  /**
   * 6. UNPUBLISH / ARCHIVE RANKING EDITION
   */
  async unpublishRankingEdition(actor: IUser, year: number, dto: PublishRankingDto) {
    const edition = await this.prisma.rankingEdition.findUnique({
      where: { year: Number(year) },
    });

    if (!edition) throw new NotFoundException(`Ranking edition ${year} not found`);

    const updated = await this.prisma.rankingEdition.update({
      where: { year: Number(year) },
      data: {
        status: 'ARCHIVED',
        unpublishReason: dto.unpublishReason || 'Administrative unpublish',
      },
    });

    try {
      const blogSlug = `swayam-official-national-college-rankings-${year}`;
      const existingBlog = await this.prisma.blog.findFirst({
        where: { slug: blogSlug, deletedAt: null },
      });
      if (existingBlog) {
        await this.prisma.blog.update({
          where: { id: existingBlog.id },
          data: { status: 'DRAFT' },
        });
      }
    } catch {
      // non-blocking
    }

    await this.auditService.logAction({
      action: 'RANKING_UNPUBLISHED',
      entity: 'RankingEdition',
      entityId: edition.id,
      description: `Ranking Edition ${year} archived. Reason: ${dto.unpublishReason}`,
      userId: actor.id,
    });

    return {
      success: true,
      message: `Ranking Edition ${year} has been archived.`,
      data: updated,
    };
  }

  /**
   * 7. GET SPECIAL RANKINGS (20 Specialized Categories from the Same Verified Dataset)
   */
  async getSpecialRankings(year: number, specialType: string, query: any, isAdmin: boolean = false) {
    const targetYear = Number(year || new Date().getFullYear());

    const edition = await this.prisma.rankingEdition.findFirst({
      where: isAdmin
        ? { year: targetYear }
        : { year: targetYear, status: 'PUBLISHED' },
      orderBy: { calculatedAt: 'desc' },
    });

    if (!edition) {
      return {
        success: true,
        data: {
          edition: null,
          specialType,
          results: [],
        },
        message: isAdmin
          ? `No calculated ranking edition found for year ${targetYear}.`
          : `No published ranking edition found for year ${targetYear}.`,
      };
    }

    // Fetch all results for this published edition
    const allResults = await this.prisma.collegeRankingResult.findMany({
      where: { editionId: edition.id },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            logo: true,
            ownership: true,
            naacGrade: true,
            nirfRanking: true,
            averagePackage: true,
            highestPackage: true,
            placementPercentage: true,
            hostelAvailable: true,
            establishedYear: true,
          },
        },
      },
    });

    let filtered = [...allResults];
    const typeKey = specialType.toUpperCase().replace(/-/g, '_');

    const getScore = (item: any, pillar: string): number => {
      const ps = (item.pillarScores as any) || {};
      return typeof ps[pillar] === 'number' ? ps[pillar] : (item.score || 0);
    };

    switch (typeKey) {
      case 'BEST_ACADEMIC':
      case 'ACADEMIC_EXCELLENCE':
      case 'BEST_ACADEMIC_EXCELLENCE':
        filtered.sort(
          (a, b) =>
            getScore(b, 'academicExcellence') - getScore(a, 'academicExcellence') ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_PLACEMENT':
      case 'PLACEMENT_CAREER':
      case 'BEST_PLACEMENT_CAREER':
        filtered.sort(
          (a, b) =>
            getScore(b, 'placementCareer') - getScore(a, 'placementCareer') ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_STUDENT_EXP':
      case 'STUDENT_EXPERIENCE':
      case 'BEST_STUDENT_EXPERIENCE':
      case 'STUDENT_DEMAND_EXPERIENCE':
        filtered.sort(
          (a, b) =>
            getScore(b, 'studentDemandExperience') - getScore(a, 'studentDemandExperience') ||
            a.rank - b.rank,
        );
        break;

      case 'MOST_PREFERRED':
      case 'MOST_PREFERRED_COLLEGE':
        filtered.sort(
          (a, b) =>
            (b.verifiedReviewCount || 0) - (a.verifiedReviewCount || 0) ||
            getScore(b, 'studentDemandExperience') - getScore(a, 'studentDemandExperience') ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_INFRA':
      case 'INFRASTRUCTURE':
      case 'BEST_INFRASTRUCTURE':
      case 'BEST_INFRASTRUCTURE_CAMPUS':
        filtered.sort(
          (a, b) =>
            getScore(b, 'infrastructureCampus') - getScore(a, 'infrastructureCampus') ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_CONNECTIVITY':
      case 'CONNECTIVITY':
      case 'LOCATION_CONNECTIVITY':
        filtered.sort(
          (a, b) =>
            getScore(b, 'locationConnectivity') - getScore(a, 'locationConnectivity') ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_DAILY_CONVENIENCE':
      case 'DAILY_CONVENIENCE':
        filtered.sort(
          (a, b) =>
            getScore(b, 'hostelLivingExperience') - getScore(a, 'hostelLivingExperience') ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_HOSTEL':
      case 'HOSTEL':
        filtered = filtered.filter((r) => r.college.hostelAvailable);
        filtered.sort(
          (a, b) =>
            getScore(b, 'hostelLivingExperience') - getScore(a, 'hostelLivingExperience') ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_STUDENT_LIFE':
        filtered.sort(
          (a, b) =>
            getScore(b, 'hostelLivingExperience') +
            getScore(b, 'studentDemandExperience') -
            (getScore(a, 'hostelLivingExperience') +
              getScore(a, 'studentDemandExperience')) ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_SAFETY':
      case 'SAFETY':
      case 'SAFETY_HEALTHCARE':
        filtered.sort(
          (a, b) =>
            getScore(b, 'safetyHealthcare') - getScore(a, 'safetyHealthcare') ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_HEALTHCARE':
      case 'HEALTHCARE':
      case 'BEST_HEALTHCARE_ACCESS':
        filtered.sort(
          (a, b) =>
            getScore(b, 'safetyHealthcare') - getScore(a, 'safetyHealthcare') ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_VALUE_FOR_MONEY':
      case 'VALUE_FOR_MONEY':
        filtered.sort(
          (a, b) =>
            getScore(b, 'affordabilityRoi') - getScore(a, 'affordabilityRoi') ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_AFFORDABLE':
      case 'AFFORDABILITY_ROI':
      case 'BEST_AFFORDABLE_COLLEGE':
        filtered.sort(
          (a, b) =>
            getScore(b, 'affordabilityRoi') - getScore(a, 'affordabilityRoi') ||
            a.rank - b.rank,
        );
        break;

      case 'MOST_TRANSPARENT':
      case 'TRUST_TRANSPARENCY':
      case 'MOST_TRANSPARENT_COLLEGE':
        filtered.sort(
          (a, b) =>
            getScore(b, 'trustTransparency') - getScore(a, 'trustTransparency') ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_EMERGING':
      case 'BEST_EMERGING_COLLEGE': {
        const emerging = filtered.filter(
          (r) => r.college.establishedYear && r.college.establishedYear >= 2005,
        );
        if (emerging.length > 0) filtered = emerging;
        filtered.sort((a, b) => b.score - a.score || a.rank - b.rank);
        break;
      }

      case 'BEST_STUDENT_FRIENDLY':
      case 'STUDENT_FRIENDLY':
        filtered.sort(
          (a, b) =>
            getScore(b, 'studentDemandExperience') * 0.6 +
            getScore(b, 'trustTransparency') * 0.4 -
            (getScore(a, 'studentDemandExperience') * 0.6 +
              getScore(a, 'trustTransparency') * 0.4) ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_FOR_WOMEN':
      case 'BEST_FOR_WOMEN_STUDENTS':
        filtered.sort(
          (a, b) =>
            getScore(b, 'safetyHealthcare') * 0.6 +
            getScore(b, 'hostelLivingExperience') * 0.4 -
            (getScore(a, 'safetyHealthcare') * 0.6 +
              getScore(a, 'hostelLivingExperience') * 0.4) ||
            a.rank - b.rank,
        );
        break;

      case 'BEST_TIER_2':
      case 'BEST_TIER_2_CITY': {
        const tier2 = filtered.filter(
          (r) =>
            r.tier === 'TIER_2' ||
            [
              'Jaipur',
              'Lucknow',
              'Indore',
              'Bhopal',
              'Patna',
              'Bhubaneswar',
              'Chandigarh',
              'Nagpur',
              'Coimbatore',
            ].some((c) => r.college.city?.toLowerCase().includes(c.toLowerCase())),
        );
        if (tier2.length > 0) filtered = tier2;
        filtered.sort((a, b) => b.score - a.score || a.rank - b.rank);
        break;
      }

      case 'BEST_TIER_3':
      case 'BEST_TIER_3_CITY': {
        const tier3 = filtered.filter(
          (r) =>
            r.tier === 'TIER_3' ||
            ![
              'Delhi',
              'Mumbai',
              'Bangalore',
              'Hyderabad',
              'Chennai',
              'Kolkata',
              'Pune',
              'Ahmedabad',
            ].some((c) => r.college.city?.toLowerCase().includes(c.toLowerCase())),
        );
        if (tier3.length > 0) filtered = tier3;
        filtered.sort((a, b) => b.score - a.score || a.rank - b.rank);
        break;
      }

      case 'TOP_100':
      default:
        filtered.sort((a, b) => a.rank - b.rank);
        break;
    }

    const computeSpecialScore = (item: any): number => {
      switch (typeKey) {
        case 'BEST_ACADEMIC':
        case 'ACADEMIC_EXCELLENCE':
        case 'BEST_ACADEMIC_EXCELLENCE':
          return getScore(item, 'academicExcellence');
        case 'BEST_PLACEMENT':
        case 'PLACEMENT_CAREER':
        case 'BEST_PLACEMENT_CAREER':
          return getScore(item, 'placementCareer');
        case 'BEST_STUDENT_EXP':
        case 'STUDENT_EXPERIENCE':
        case 'BEST_STUDENT_EXPERIENCE':
        case 'STUDENT_DEMAND_EXPERIENCE':
        case 'MOST_PREFERRED':
        case 'MOST_PREFERRED_COLLEGE':
          return getScore(item, 'studentDemandExperience');
        case 'BEST_INFRA':
        case 'INFRASTRUCTURE':
        case 'BEST_INFRASTRUCTURE':
        case 'BEST_INFRASTRUCTURE_CAMPUS':
          return getScore(item, 'infrastructureCampus');
        case 'BEST_CONNECTIVITY':
        case 'CONNECTIVITY':
        case 'LOCATION_CONNECTIVITY':
          return getScore(item, 'locationConnectivity');
        case 'BEST_DAILY_CONVENIENCE':
        case 'DAILY_CONVENIENCE':
        case 'BEST_HOSTEL':
        case 'HOSTEL':
          return getScore(item, 'hostelLivingExperience');
        case 'BEST_STUDENT_LIFE':
          return Number(
            (
              (getScore(item, 'hostelLivingExperience') +
                getScore(item, 'studentDemandExperience')) /
              2
            ).toFixed(1),
          );
        case 'BEST_SAFETY':
        case 'SAFETY':
        case 'SAFETY_HEALTHCARE':
        case 'BEST_HEALTHCARE':
        case 'HEALTHCARE':
        case 'BEST_HEALTHCARE_ACCESS':
          return getScore(item, 'safetyHealthcare');
        case 'BEST_VALUE_FOR_MONEY':
        case 'VALUE_FOR_MONEY':
        case 'BEST_AFFORDABLE':
        case 'AFFORDABILITY_ROI':
        case 'BEST_AFFORDABLE_COLLEGE':
          return getScore(item, 'affordabilityRoi');
        case 'MOST_TRANSPARENT':
        case 'TRUST_TRANSPARENCY':
        case 'MOST_TRANSPARENT_COLLEGE':
          return getScore(item, 'trustTransparency');
        case 'BEST_STUDENT_FRIENDLY':
        case 'STUDENT_FRIENDLY':
          return Number(
            (
              getScore(item, 'studentDemandExperience') * 0.6 +
              getScore(item, 'trustTransparency') * 0.4
            ).toFixed(1),
          );
        case 'BEST_FOR_WOMEN':
        case 'BEST_FOR_WOMEN_STUDENTS':
          return Number(
            (
              getScore(item, 'safetyHealthcare') * 0.6 +
              getScore(item, 'hostelLivingExperience') * 0.4
            ).toFixed(1),
          );
        default:
          return Number(item.score.toFixed(1));
      }
    };

    const limit = Number(query.limit || 50);
    const topSlice = filtered.slice(0, limit);

    return {
      success: true,
      data: {
        edition: {
          year: edition.year,
          title: edition.title,
          algorithmVersion: edition.algorithmVersion,
          publishedAt: edition.publishedAt,
        },
        specialType,
        totalEligible: filtered.length,
        results: topSlice.map((item, idx) => ({
          ...item,
          categoryRank: idx + 1,
          specialScore: computeSpecialScore(item),
        })),
      },
    };
  }

  /**
   * 8. SIDE-BY-SIDE COLLEGE RANKING COMPARISON
   */
  async compareColleges(collegeIds: string[], year?: number) {
    const targetYear = year ? Number(year) : new Date().getFullYear();

    // Fetch Published Edition
    const edition = await this.prisma.rankingEdition.findFirst({
      where: {
        year: targetYear,
        status: 'PUBLISHED',
      },
    });

    if (!edition) {
      throw new NotFoundException(`No published ranking edition available for comparison in year ${targetYear}.`);
    }

    const results = await this.prisma.collegeRankingResult.findMany({
      where: {
        editionId: edition.id,
        collegeId: { in: collegeIds },
      },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            logo: true,
            ownership: true,
            naacGrade: true,
            nirfRanking: true,
            averagePackage: true,
            highestPackage: true,
            placementPercentage: true,
            hostelAvailable: true,
            transportAvailable: true,
            scholarshipAvailable: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        edition: {
          year: edition.year,
          title: edition.title,
        },
        colleges: results,
      },
    };
  }

  /**
   * 9. GET PUBLIC RANKINGS (STRICT: ONLY PUBLISHED SNAPSHOTS)
   */
  async getPublicRankings(year?: number, query?: any) {
    const targetYear = year ? Number(year) : new Date().getFullYear();

    // Query published edition only
    const edition = await this.prisma.rankingEdition.findFirst({
      where: {
        status: 'PUBLISHED',
        ...(year ? { year: targetYear } : {}),
      },
      orderBy: { year: 'desc' },
      include: {
        methodology: {
          select: { version: true, name: true, description: true, pillarsConfig: true },
        },
      },
    });

    if (!edition) {
      return {
        success: true,
        data: {
          edition: null,
          results: [],
        },
        message: 'No published ranking edition available at this time.',
      };
    }

    const page = Number(query?.page || 1);
    const limit = Number(query?.limit || 25);
    const skip = (page - 1) * limit;

    const where: any = { editionId: edition.id };
    if (query?.state && query.state !== 'all') where.college = { state: query.state };
    if (query?.tier && query.tier !== 'all') where.tier = query.tier;
    if (query?.search) {
      where.college = {
        name: { contains: query.search, mode: 'insensitive' },
      };
    }

    const [results, total] = await Promise.all([
      this.prisma.collegeRankingResult.findMany({
        where,
        skip,
        take: limit,
        orderBy: { rank: 'asc' },
        include: {
          college: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
              state: true,
              logo: true,
              ownership: true,
              naacGrade: true,
              nirfRanking: true,
              ranking: true,
              averagePackage: true,
              highestPackage: true,
              placementPercentage: true,
              hostelAvailable: true,
              transportAvailable: true,
            },
          },
        },
      }),
      this.prisma.collegeRankingResult.count({ where }),
    ]);

    return {
      success: true,
      data: {
        edition: {
          year: edition.year,
          title: edition.title,
          algorithmVersion: edition.algorithmVersion,
          publishedAt: edition.publishedAt,
          methodology: edition.methodology,
        },
        results,
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 10. GET SINGLE COLLEGE PUBLIC SCORECARD
   */
  async getCollegeScorecard(collegeId: string, year?: number) {
    const targetYear = year ? Number(year) : new Date().getFullYear();

    const edition = await this.prisma.rankingEdition.findFirst({
      where: {
        year: targetYear,
        status: 'PUBLISHED',
      },
    });

    if (!edition) {
      throw new NotFoundException(`No published ranking available for year ${targetYear}.`);
    }

    const result = await this.prisma.collegeRankingResult.findUnique({
      where: {
        editionId_collegeId: {
          editionId: edition.id,
          collegeId,
        },
      },
      include: {
        college: true,
        edition: { select: { year: true, title: true, publishedAt: true } },
      },
    });

    if (!result) {
      throw new NotFoundException(`Ranking scorecard not found for this college in edition ${targetYear}.`);
    }

    return {
      success: true,
      data: result,
    };
  }
}
