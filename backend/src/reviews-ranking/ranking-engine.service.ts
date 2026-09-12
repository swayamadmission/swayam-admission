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
} from './dto/reviews-ranking.dto';

@Injectable()
export class RankingEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 1. CALCULATE ANNUAL COLLEGE RANKING (Weighted Algorithm + Bayesian Confidence Model)
   */
  async calculateRanking(actor: IUser, dto: CalculateRankingDto) {
    const year = Number(dto.year);
    const algorithmVersion = dto.algorithmVersion || 'v1.0';
    const minThreshold = Number(dto.minReviewThreshold || 3);
    const cutoff = dto.dataCutoffDate ? new Date(dto.dataCutoffDate) : new Date();

    const weights = dto.weightsConfig || {
      studentReviews: 0.30,
      academicQuality: 0.20,
      infrastructure: 0.15,
      hostelMess: 0.10,
      placementOutcomes: 0.15,
      swayamVerification: 0.10,
    };

    // Normalize weights to sum to 1.0
    const totalWeight = Object.values(weights).reduce((a, b) => a + Number(b), 0) || 1.0;
    const normWeights = {
      studentReviews: (weights.studentReviews || 0.30) / totalWeight,
      academicQuality: (weights.academicQuality || 0.20) / totalWeight,
      infrastructure: (weights.infrastructure || 0.15) / totalWeight,
      hostelMess: (weights.hostelMess || 0.10) / totalWeight,
      placementOutcomes: (weights.placementOutcomes || 0.15) / totalWeight,
      swayamVerification: (weights.swayamVerification || 0.10) / totalWeight,
    };

    // Fetch all published colleges with reviews and verified factors
    const colleges: any[] = await this.prisma.college.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        reviews: {
          where: {
            status: 'PUBLISHED',
            createdAt: { lte: cutoff },
          },
        },
        verifiedFactors: {
          where: {
            OR: [
              { validUntil: null },
              { validUntil: { gte: cutoff } },
            ],
          },
        },
      },
    });

    if (colleges.length === 0) {
      throw new BadRequestException('No active colleges found to calculate ranking for.');
    }

    // Global review average across all colleges for Bayesian smoothing
    let totalAllReviews = 0;
    let sumAllRatings = 0;
    colleges.forEach((c) => {
      c.reviews.forEach((r) => {
        totalAllReviews++;
        sumAllRatings += r.rating;
      });
    });
    const globalMean = totalAllReviews > 0 ? sumAllRatings / totalAllReviews : 3.5;

    // Calculate factor scores for each college
    const collegeScores = colleges.map((college) => {
      const verifiedReviews = college.reviews.filter((r) => r.isVerifiedStudent);
      const totalReviewsCount = verifiedReviews.length > 0 ? verifiedReviews.length : college.reviews.length;
      const reviewSum = (verifiedReviews.length > 0 ? verifiedReviews : college.reviews).reduce(
        (acc, r) => acc + r.rating,
        0,
      );
      const rawAvg = totalReviewsCount > 0 ? reviewSum / totalReviewsCount : globalMean;

      // Bayesian smoothing: (v*R + m*C) / (v + m) normalized to 0-100
      const bayesianRating = (totalReviewsCount * rawAvg + minThreshold * globalMean) / (totalReviewsCount + minThreshold);
      const studentReviewsScore = (bayesianRating / 5.0) * 100;

      // Academic Quality: NAAC grade / NIRF Ranking / Factors
      let academicScore = 70; // baseline
      if (college.naacGrade) {
        if (college.naacGrade.includes('A++')) academicScore = 96;
        else if (college.naacGrade.includes('A+')) academicScore = 90;
        else if (college.naacGrade.includes('A')) academicScore = 82;
        else if (college.naacGrade.includes('B')) academicScore = 72;
      }
      if (college.nirfRanking && college.nirfRanking > 0) {
        if (college.nirfRanking <= 20) academicScore = Math.max(academicScore, 98);
        else if (college.nirfRanking <= 50) academicScore = Math.max(academicScore, 92);
        else if (college.nirfRanking <= 100) academicScore = Math.max(academicScore, 86);
      }

      // Infrastructure score from verified factors or default
      const infraFactor = college.verifiedFactors.find((f) => f.factorCategory === 'INFRASTRUCTURE');
      const infraScore = infraFactor ? infraFactor.score : (college.establishedYear && college.establishedYear < 2000 ? 82 : 75);

      // Hostel & Mess score
      const hostelFactor = college.verifiedFactors.find((f) => f.factorCategory === 'HOSTEL_MESS');
      const hostelScore = hostelFactor ? hostelFactor.score : 75;

      // Placement score from college placement fields or verified factor
      const placementFactor = college.verifiedFactors.find((f) => f.factorCategory === 'PLACEMENT');
      let placementScore = 75;
      if (placementFactor) {
        placementScore = placementFactor.score;
      } else if (college.averagePackage || college.highestPackage) {
        const avgPkg = college.averagePackage || 6;
        const highestPkg = college.highestPackage || 12;
        placementScore = Math.min(98, 65 + avgPkg * 2 + (highestPkg > 20 ? 10 : 5));
      }

      // Swayam Manual Verification Factor
      const swayamFactor = college.verifiedFactors.find((f) => f.factorCategory === 'SAFETY' || f.sourceType === 'SWAYAM_VERIFIED');
      const swayamVerificationScore = swayamFactor ? swayamFactor.score : 80;

      // Overall Composite Score (0 - 100)
      const finalScore =
        studentReviewsScore * normWeights.studentReviews +
        academicScore * normWeights.academicQuality +
        infraScore * normWeights.infrastructure +
        hostelScore * normWeights.hostelMess +
        placementScore * normWeights.placementOutcomes +
        swayamVerificationScore * normWeights.swayamVerification;

      return {
        collegeId: college.id,
        college,
        score: Math.round(finalScore * 10) / 10,
        verifiedReviewCount: verifiedReviews.length,
        averageReviewRating: Math.round(rawAvg * 10) / 10,
        factorBreakdown: {
          studentReviewsScore: Math.round(studentReviewsScore * 10) / 10,
          academicScore: Math.round(academicScore * 10) / 10,
          infraScore: Math.round(infraScore * 10) / 10,
          hostelScore: Math.round(hostelScore * 10) / 10,
          placementScore: Math.round(placementScore * 10) / 10,
          swayamVerificationScore: Math.round(swayamVerificationScore * 10) / 10,
        },
        dataProvenance: {
          studentReviews: 'STUDENT_REVIEW',
          academicQuality: college.naacGrade ? 'OFFICIAL_ACCREDITATION' : 'SYSTEM_DERIVED',
          infrastructure: infraFactor ? infraFactor.sourceType : 'COLLEGE_PROVIDED',
          hostelMess: hostelFactor ? hostelFactor.sourceType : 'COLLEGE_PROVIDED',
          placementOutcomes: placementFactor ? placementFactor.sourceType : 'COLLEGE_PROVIDED',
          swayamVerification: swayamFactor ? 'SWAYAM_VERIFIED' : 'SYSTEM_DERIVED',
        },
      };
    });

    // Sort by score DESC with deterministic tie-breaking by verifiedReviewCount then establishedYear
    collegeScores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.verifiedReviewCount !== a.verifiedReviewCount) return b.verifiedReviewCount - a.verifiedReviewCount;
      return (a.college.establishedYear || 2000) - (b.college.establishedYear || 2000);
    });

    // Assign Ranks and Tiers
    const totalCount = collegeScores.length;
    const rankedResults = collegeScores.map((item, idx) => {
      const rank = idx + 1;
      const percentile = Math.round(((totalCount - rank) / totalCount) * 1000) / 10;
      const tier = percentile >= 80 ? 'TIER_1' : percentile >= 40 ? 'TIER_2' : 'TIER_3';

      return {
        ...item,
        rank,
        percentile,
        tier,
      };
    });

    // Save Edition and Results in Transaction
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
        },
      });

      // Clear old draft results for this edition
      await tx.collegeRankingResult.deleteMany({
        where: { editionId: savedEdition.id },
      });

      // Insert new calculated results
      await tx.collegeRankingResult.createMany({
        data: rankedResults.map((r) => ({
          editionId: savedEdition.id,
          collegeId: r.collegeId,
          rank: r.rank,
          score: r.score,
          percentile: r.percentile,
          tier: r.tier,
          verifiedReviewCount: r.verifiedReviewCount,
          averageReviewRating: r.averageReviewRating,
          factorBreakdown: r.factorBreakdown,
          dataProvenance: r.dataProvenance,
        })),
      });

      return savedEdition;
    });

    await this.auditService.logAction({
      action: 'RANKING_CALCULATED',
      entity: 'RankingEdition',
      entityId: edition.id,
      description: `Calculated College Ranking Edition ${year} with ${rankedResults.length} colleges`,
      userId: actor.id,
      metadata: { year, algorithmVersion, resultCount: rankedResults.length },
    });

    return {
      success: true,
      message: `Annual Ranking Edition ${year} calculated successfully in DRAFT mode (${rankedResults.length} colleges ranked).`,
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
        calculatedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        publishedBy: { select: { id: true, fullName: true, email: true } },
        _count: { select: { results: true } },
      },
    });

    return {
      success: true,
      data: editions,
    };
  }

  /**
   * 3. GET EDITION DETAILS & LEADERBOARD RESULTS
   */
  async getEditionDetails(year: number, query: any) {
    const edition = await this.prisma.rankingEdition.findUnique({
      where: { year: Number(year) },
      include: {
        calculatedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        publishedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!edition) throw new NotFoundException(`Ranking edition ${year} not found`);

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);
    const skip = (page - 1) * limit;

    const where: any = { editionId: edition.id };
    if (query.tier) where.tier = query.tier;
    if (query.state) where.college = { state: query.state };
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

    const updated = await this.prisma.rankingEdition.update({
      where: { year: Number(year) },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedById: actor.id,
      },
    });

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
   * 7. GET PUBLIC RANKINGS (Informational directory with filters)
   */
  async getPublicRankings(year?: number, query?: any) {
    const targetYear = year ? Number(year) : new Date().getFullYear();

    let edition = await this.prisma.rankingEdition.findFirst({
      where: {
        status: 'PUBLISHED',
        ...(year ? { year: targetYear } : {}),
      },
      orderBy: { year: 'desc' },
    });

    if (!edition) {
      edition = await this.prisma.rankingEdition.findFirst({
        where: { status: 'PUBLISHED' },
        orderBy: { year: 'desc' },
      });
    }

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
    const limit = Number(query?.limit || 20);
    const skip = (page - 1) * limit;

    const where: any = { editionId: edition.id };
    if (query?.state) where.college = { state: query.state };
    if (query?.tier) where.tier = query.tier;
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
}
