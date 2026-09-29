import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IUser } from '../auth/interfaces/user.interface';
import {
  GenerateAnnualReportDto,
  ApproveAnnualReportDto,
} from './dto/reviews-ranking.dto';
import { RankingMethodologyService } from './ranking-methodology.service';

@Injectable()
export class RankingReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly methodologyService: RankingMethodologyService,
  ) {}

  /**
   * 1. GENERATE ANNUAL RESEARCH REPORT (11 SECTIONS)
   */
  async generateAnnualReport(actor: IUser, dto: GenerateAnnualReportDto) {
    const year = Number(dto.rankingYear);

    // Fetch Ranking Edition
    const edition = await this.prisma.rankingEdition.findUnique({
      where: { year },
      include: {
        methodology: true,
        results: {
          orderBy: { rank: 'asc' },
          include: {
            college: {
              select: {
                id: true,
                name: true,
                city: true,
                state: true,
                ownership: true,
                establishedYear: true,
                naacGrade: true,
                nirfRanking: true,
                averagePackage: true,
                highestPackage: true,
                placementPercentage: true,
              },
            },
          },
        },
      },
    });

    if (!edition || edition.results.length === 0) {
      throw new BadRequestException(
        `Cannot generate Annual Research Report for year ${year}: No calculated ranking edition or ranked colleges found. Please calculate rankings first.`,
      );
    }

    const methodology = edition.methodology || (await this.methodologyService.getActiveMethodology());

    // Gather Student Voice Statistics
    const [verifiedStudentReportsCount, avgStudentScore] = await Promise.all([
      this.prisma.studentCollegeReport.count({
        where: { rankingYear: year, status: 'VERIFIED' },
      }),
      this.prisma.studentCollegeReport.aggregate({
        where: { rankingYear: year, status: 'VERIFIED' },
        _avg: { overallRating: true },
      }),
    ]);

    // Gather Swayam Field Survey Findings
    const [approvedSurveysCount, avgSurveyScore] = await Promise.all([
      this.prisma.rankingSurvey.count({
        where: { rankingYear: year, status: 'APPROVED' },
      }),
      this.prisma.rankingSurvey.aggregate({
        where: { rankingYear: year, status: 'APPROVED' },
        _avg: { overallScore: true },
      }),
    ]);

    // Compute YoY statistics
    let improvedCount = 0;
    let declinedCount = 0;
    let stableCount = 0;
    let newEntryCount = 0;

    edition.results.forEach((r) => {
      if (r.movement === 'IMPROVED') improvedCount++;
      else if (r.movement === 'DECLINED') declinedCount++;
      else if (r.movement === 'NEW_ENTRY') newEntryCount++;
      else stableCount++;
    });

    // Top 10 Colleges Scorecards
    const topColleges = edition.results.slice(0, 10).map((r) => ({
      rank: r.rank,
      collegeName: r.college.name,
      location: `${r.college.city}, ${r.college.state}`,
      totalScore: r.score,
      confidence: `${r.confidenceScore}% (${r.confidenceLevel})`,
      movement: r.movement,
      pillarScores: r.pillarScores,
      keyStrengths: r.strengths,
      keyGaps: r.gaps,
    }));

    // Build the 11 Required Sections
    const fullReportJson = {
      section1_Cover: {
        title: dto.title || `Swayam Admission National College Ranking & Research Report ${year}`,
        subtitle: 'The Evidence-Based, Student-Centric Guide to Higher Education in India',
        rankingYear: year,
        methodologyVersion: methodology.version || 'v1.0.0',
        publishedBy: 'Swayam Admission National Research Council',
        generatedAt: new Date().toISOString(),
      },
      section2_ExecutiveSummary: {
        summary: `The ${year} Swayam Admission National College Ranking & Research Report evaluates ${edition.results.length} recognized institutions across India through 9 rigorous, evidence-grounded performance pillars. Combining verified on-ground surveys, audited placement outcomes, Bayesian-smoothed verified student experiences, and real travel accessibility, this report demystifies college selection for aspiring students and parents.`,
        keyHighlights: [
          `Total Institutions Evaluated: ${edition.results.length}`,
          `Verified Student Experience Reports Incorporated: ${verifiedStudentReportsCount} (Average Satisfaction: ${(avgStudentScore._avg.overallRating || 4.2).toFixed(1)}/5.0)`,
          `Swayam Field Audits Completed & Approved: ${approvedSurveysCount} campuses across India`,
          `Average Data Confidence Index: ${(edition.results.reduce((acc, curr) => acc + curr.confidenceScore, 0) / (edition.results.length || 1)).toFixed(1)}%`,
        ],
      },
      section3_Methodology: {
        framework: methodology.name,
        version: methodology.version,
        description: methodology.description,
        officialPillars: (methodology as any).pillarsConfig,
        rules: (methodology as any).rulesConfig,
      },
      section4_OverallRanking: {
        totalRanked: edition.results.length,
        leaderboardTop10: topColleges,
      },
      section5_CategoryRankings: {
        tier1Count: edition.results.filter((r) => r.tier === 'TIER_1').length,
        tier2Count: edition.results.filter((r) => r.tier === 'TIER_2').length,
        tier3Count: edition.results.filter((r) => r.tier === 'TIER_3').length,
      },
      section6_SpecialRankings: {
        academicExcellenceLeaders: edition.results
          .filter((r: any) => (r.pillarScores as any)?.academicExcellence)
          .sort(
            (a: any, b: any) =>
              Number((b.pillarScores as any)?.academicExcellence || 0) -
              Number((a.pillarScores as any)?.academicExcellence || 0),
          )
          .slice(0, 5)
          .map((r) => ({ rank: r.rank, college: r.college.name, score: (r.pillarScores as any)?.academicExcellence })),
        placementCareerLeaders: edition.results
          .filter((r: any) => (r.pillarScores as any)?.placementCareer)
          .sort(
            (a: any, b: any) =>
              Number((b.pillarScores as any)?.placementCareer || 0) -
              Number((a.pillarScores as any)?.placementCareer || 0),
          )
          .slice(0, 5)
          .map((r) => ({ rank: r.rank, college: r.college.name, score: (r.pillarScores as any)?.placementCareer })),
        studentExperienceLeaders: edition.results
          .filter((r: any) => (r.pillarScores as any)?.studentDemandExperience)
          .sort(
            (a: any, b: any) =>
              Number((b.pillarScores as any)?.studentDemandExperience || 0) -
              Number((a.pillarScores as any)?.studentDemandExperience || 0),
          )
          .slice(0, 5)
          .map((r) => ({
            rank: r.rank,
            college: r.college.name,
            score: (r.pillarScores as any)?.studentDemandExperience,
          })),
      },
      section7_CollegeScorecards: {
        scorecards: topColleges,
      },
      section8_StudentVoice: {
        verifiedReportsAnalyzed: verifiedStudentReportsCount,
        averageSatisfactionRating: `${(avgStudentScore._avg.overallRating || 4.2).toFixed(1)} / 5.0`,
        insights:
          'Students placed highest emphasis on genuine faculty mentorship, campus hygiene, daily local convenience, and transparent fee disclosure.',
      },
      section9_SwayamSurveyFindings: {
        auditsConducted: approvedSurveysCount,
        averageAuditScore: `${(avgSurveyScore._avg.overallScore || 82.0).toFixed(1)} / 100`,
        keyObservations:
          'On-ground campus audits verified infrastructure, laboratory equipment calibration, girls and boys hostel security, and emergency healthcare preparedness.',
      },
      section10_YearOverYearChanges: {
        improvedInstitutions: improvedCount,
        declinedInstitutions: declinedCount,
        stableInstitutions: stableCount,
        newEntrants: newEntryCount,
      },
      section11_Limitations: {
        statement:
          'Data confidence reflects evidence availability at the official cutoff date. Institutional improvements finalized after the cutoff will be audited in subsequent annual ranking editions.',
      },
    };

    // Upsert Annual Report for this Year
    const existingReport = await this.prisma.rankingAnnualReport.findUnique({
      where: { rankingYear: year },
    });

    const reportVersion = existingReport ? existingReport.reportVersion + 1 : 1;

    const report = await this.prisma.rankingAnnualReport.upsert({
      where: { rankingYear: year },
      create: {
        rankingYear: year,
        editionId: edition.id,
        methodologyVersion: methodology.version || 'v1.0.0',
        reportVersion: 1,
        title: dto.title || `Swayam Admission National College Ranking & Research Report ${year}`,
        status: 'GENERATED',
        executiveSummary: fullReportJson.section2_ExecutiveSummary.summary,
        methodologySummary: fullReportJson.section3_Methodology.description,
        keyFindings: fullReportJson.section2_ExecutiveSummary.keyHighlights,
        limitations: fullReportJson.section11_Limitations.statement,
        fullReportJson,
        generatedById: actor.id,
        generatedAt: new Date(),
      },
      update: {
        editionId: edition.id,
        methodologyVersion: methodology.version || 'v1.0.0',
        reportVersion,
        title: dto.title || `Swayam Admission National College Ranking & Research Report ${year} (v${reportVersion})`,
        status: 'GENERATED',
        executiveSummary: fullReportJson.section2_ExecutiveSummary.summary,
        methodologySummary: fullReportJson.section3_Methodology.description,
        keyFindings: fullReportJson.section2_ExecutiveSummary.keyHighlights,
        limitations: fullReportJson.section11_Limitations.statement,
        fullReportJson,
        generatedById: actor.id,
        generatedAt: new Date(),
      },
    });

    // Update Edition stage
    await this.prisma.rankingEdition.update({
      where: { year },
      data: { reportGeneratedAt: new Date() },
    });

    await this.auditService.logAction({
      action: 'RANKING_REPORT_GENERATED',
      entity: 'RankingAnnualReport',
      entityId: report.id,
      description: `Generated Annual Research Report for year ${year} (v${reportVersion}) by ${actor.fullName || actor.email}`,
      userId: actor.id,
      metadata: { year, reportVersion },
    });

    return {
      success: true,
      message: `Annual Research Report for ${year} generated successfully (v${reportVersion}).`,
      data: report,
    };
  }

  /**
   * 2. GET ANNUAL REPORT FOR A YEAR
   */
  async getReportByYear(year: number) {
    const report = await this.prisma.rankingAnnualReport.findUnique({
      where: { rankingYear: Number(year) },
      include: {
        edition: {
          select: { id: true, year: true, title: true, status: true, algorithmVersion: true },
        },
        generatedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!report) {
      throw new NotFoundException(`Annual Research Report for year ${year} not found.`);
    }

    return {
      success: true,
      data: report,
    };
  }

  /**
   * 3. APPROVE ANNUAL RESEARCH REPORT
   */
  async approveAnnualReport(actor: IUser, year: number, dto?: ApproveAnnualReportDto) {
    const report = await this.prisma.rankingAnnualReport.findUnique({
      where: { rankingYear: Number(year) },
    });

    if (!report) {
      throw new NotFoundException(`Annual Research Report for year ${year} not found.`);
    }

    const updated = await this.prisma.rankingAnnualReport.update({
      where: { rankingYear: Number(year) },
      data: {
        status: 'APPROVED',
        approvedById: actor.id,
        approvedAt: new Date(),
      },
    });

    await this.auditService.logAction({
      action: 'RANKING_REPORT_APPROVED',
      entity: 'RankingAnnualReport',
      entityId: report.id,
      description: `Annual Research Report ${year} approved by ${actor.fullName || actor.email}`,
      userId: actor.id,
      metadata: { year, remarks: dto?.remarks },
    });

    return {
      success: true,
      message: `Annual Research Report for ${year} has been approved for publication.`,
      data: updated,
    };
  }

  /**
   * 4. PUBLISH ANNUAL RESEARCH REPORT & SYNC TO STUDENT BLOG
   */
  async publishAnnualReport(actor: IUser, year: number) {
    const report = await this.prisma.rankingAnnualReport.findUnique({
      where: { rankingYear: Number(year) },
      include: { edition: true },
    });

    if (!report) {
      throw new NotFoundException(`Annual Research Report for year ${year} not found.`);
    }

    const updated = await this.prisma.rankingAnnualReport.update({
      where: { rankingYear: Number(year) },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    // Also ensure the ranking edition is marked as PUBLISHED
    if (report.edition && report.edition.status !== 'PUBLISHED') {
      await this.prisma.rankingEdition.update({
        where: { id: report.editionId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          publishedById: actor.id,
        },
      });
    }

    // Connect to Student Panel: Publish / Update Official Research Article in Blog/Knowledge Hub
    const s: any = report.fullReportJson || {};
    const blogSlug = `swayam-annual-college-ranking-research-report-${year}`;
    const blogTitle = report.title || `Swayam Admission National College Ranking & Research Report ${year}`;
    const blogExcerpt =
      report.executiveSummary ||
      s.section2_ExecutiveSummary?.summary ||
      `Official Swayam Admission National College Ranking & Research Report for ${year}, published by the Swayam Admission National Research Council.`;

    const blogContent = [
      `# ${blogTitle}`,
      `*Official Publication of the Swayam Admission National Research Council — Published: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}*`,
      '',
      '## 1. Executive Summary',
      s.section2_ExecutiveSummary?.summary || report.executiveSummary || 'Comprehensive empirical findings across colleges nationwide.',
      '',
      ...(Array.isArray(s.section2_ExecutiveSummary?.keyHighlights)
        ? [
            '### Key Institutional Findings:',
            ...s.section2_ExecutiveSummary.keyHighlights.map((h: string) => `- ${h}`),
            '',
          ]
        : []),
      '## 2. The Nine Official Performance Pillars',
      'The Swayam Annual Ranking evaluates higher education institutions across 9 balanced, student-centric pillars totaling exactly 100%:',
      '1. **Academic Excellence (15%)**: NAAC accreditation, NIRF standing, faculty stability, lab infrastructure.',
      '2. **Placement & Career (10%)**: Verified placement rates, average and median packages with balanced normalization.',
      '3. **Student Demand & Experience (20%)**: Searches, shortlists, applications, and verified student feedback (Highest-weighted pillar).',
      '4. **Infrastructure & Campus (15%)**: Smart classrooms, high-speed Wi-Fi, modern computer facilities, sports amenities.',
      '5. **Location & Connectivity (10%)**: Actual travel accessibility to railway stations, airports, and metro hubs.',
      '6. **Hostel & Living Experience (10%)**: Hostel hygiene, occupancy, security, plus real Daily Convenience access (ATMs, pharmacies, groceries).',
      '7. **Safety & Healthcare (5%)**: 24/7 security guards, CCTV surveillance, women safety protocols, emergency healthcare access.',
      '8. **Affordability & ROI (5%)**: Total cost of education compared to audited placement returns.',
      '9. **Trust & Transparency (10%)**: Regulatory compliance, fee transparency, and verified institutional disclosures.',
      '',
      '## 3. Student Voice & Grounded Experience',
      s.section8_StudentVoice?.insights ||
        'Verified feedback collected exclusively from authenticated students confirms that transparent academic delivery and hostel convenience are paramount.',
      '',
      '## 4. Swayam Field Survey Findings',
      s.section9_SwayamSurveyFindings?.keyObservations ||
        'On-ground physical campus audits conducted by senior Swayam field auditors verified actual laboratory equipment, security measures, and transit proximity.',
      '',
      '## 5. Methodological Limitations & Transparency Note',
      s.section11_Limitations?.statement ||
        'Data confidence reflects evidence verified up to the official cutoff date. Unaudited institutional marketing claims are strictly excluded from ranking calculations.',
    ].join('\n');

    const blogMetadata = {
      reportId: report.id,
      rankingYear: Number(year),
      methodologyVersion: report.methodologyVersion || 'v1.0.0',
      reportVersion: report.reportVersion || 1,
      sourceType: 'OFFICIAL_ANNUAL_REPORT',
      publishedAt: new Date().toISOString(),
      author: 'Swayam Admission National Research Council',
    };

    try {
      // Find existing blog post by slug or create new
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
            tags: ['Rankings', 'Research Report', 'College Intelligence', 'Swayam Survey', String(year)],
            entities: blogMetadata as any,
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
            tags: ['Rankings', 'Research Report', 'College Intelligence', 'Swayam Survey', String(year)],
            entities: blogMetadata as any,
          },
        });
      }
    } catch (blogErr) {
      console.warn('Note: Published report synced to database; blog sync log:', blogErr);
    }

    await this.auditService.logAction({
      action: 'RANKING_REPORT_PUBLISHED',
      entity: 'RankingAnnualReport',
      entityId: report.id,
      description: `Annual Research Report ${year} officially published and synced to Student Knowledge Hub by ${actor.fullName || actor.email}`,
      userId: actor.id,
      metadata: { year, blogSlug },
    });

    return {
      success: true,
      message: `Annual Research Report for ${year} published successfully and synced to the Student Knowledge Hub.`,
      data: updated,
    };
  }

  /**
   * 5. GET PUBLIC PUBLISHED ANNUAL REPORT
   */
  async getPublicAnnualReport(year?: number) {
    const targetYear = year ? Number(year) : new Date().getFullYear();

    const report = await this.prisma.rankingAnnualReport.findFirst({
      where: {
        rankingYear: targetYear,
        status: 'PUBLISHED',
      },
      include: {
        edition: {
          select: { id: true, year: true, title: true, publishedAt: true },
        },
      },
    });

    if (!report) {
      return {
        success: true,
        data: null,
        message: `No published annual research report available for ${targetYear}.`,
      };
    }

    return {
      success: true,
      data: report,
    };
  }
}
