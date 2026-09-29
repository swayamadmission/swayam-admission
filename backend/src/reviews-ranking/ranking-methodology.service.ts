import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IUser } from '../auth/interfaces/user.interface';
import {
  CreateMethodologyDto,
  UpdateMethodologyDto,
  OFFICIAL_NINE_PILLARS,
} from './dto/reviews-ranking.dto';

export const DEFAULT_METHODOLOGY_V1 = {
  version: 'v1.0.0',
  name: 'Swayam National 9-Pillar College Decision Intelligence Framework',
  description:
    'Official multi-dimensional, evidence-based college ranking system calibrated to determine which college is truly best for a student.',
  status: 'ACTIVE',
  pillarsConfig: {
    academicExcellence: {
      weight: 0.15,
      name: 'Academic Excellence',
      description: 'Accreditation, faculty quality, curriculum relevance, and research outcomes',
      subcriteria: [
        'NAAC Accreditation Grade & NIRF Rank',
        'Faculty-to-Student Ratio & Faculty Qualifications',
        'Academic Curriculum Relevance & Program Diversity',
        'Laboratories, Smart Classrooms, and Digital Library Resources',
      ],
    },
    placementCareer: {
      weight: 0.10,
      name: 'Placement & Career',
      description: 'Placement rate, median package, consistency, and recruiter quality',
      subcriteria: [
        'Verified Placement Rate (%)',
        'Average and Median CTC Package (LPA)',
        'Placement Consistency & Recruiter Quality Count',
        'Internship Support and Industry Collaborations',
      ],
      constraints: {
        highestPackageDominanceCap: 0.25, // Prevents single outlier highest package from skewing placement score
      },
    },
    studentDemandExperience: {
      weight: 0.20,
      name: 'Student Demand & Experience',
      description: 'Platform demand signals, application conversion, and verified student feedback',
      subcriteria: [
        'Swayam Platform Student Search & Shortlist Demand',
        'Application to Admission Conversion Rates',
        'Verified Student Experience & Teaching Satisfaction',
        'Student Recommendation Likelihood (Bayesian Smoothed)',
      ],
    },
    infrastructureCampus: {
      weight: 0.15,
      name: 'Infrastructure & Campus',
      description: 'Classrooms, computer facilities, labs, Wi-Fi, activity spaces, and sports',
      subcriteria: [
        'Campus Quality, Classrooms & Smart Classrooms',
        'Laboratories & IT Computing Facilities',
        'Campus Wi-Fi, Water, Power, and Maintenance',
        'Auditorium, Cafeteria, Sports Facilities & Gym',
      ],
    },
    locationConnectivity: {
      weight: 0.10,
      name: 'Location & Connectivity',
      description: 'Real travel proximity to railway stations, airports, metro, and arterial transit',
      subcriteria: [
        'Distance to Nearest Railway Station (km)',
        'Distance to Nearest Airport / Major City Transit Hub (km)',
        'Metro & Local Bus / Cab Public Transit Accessibility',
        'Highway and Main Arterial Road Proximity',
      ],
    },
    hostelLivingExperience: {
      weight: 0.10,
      name: 'Hostel & Living Experience',
      description: 'Hostel capacity, hygiene, mess food quality, security, and Daily Convenience Score',
      subcriteria: [
        'Boys & Girls Hostel Availability and Room Quality',
        'Mess & Food Quality, Hygiene, and Dietary Variety',
        'Hostel Wi-Fi, Laundry, Housekeeping & Power Backup',
        'Daily Convenience Score (Proximity to Pharmacy, Hospital, ATM, Grocery, Food Delivery)',
      ],
    },
    safetyHealthcare: {
      weight: 0.05,
      name: 'Safety & Healthcare',
      description: '24/7 security, CCTV, entry control, women safety, and medical emergency response',
      subcriteria: [
        'Campus & Hostel 24/7 Security Guards & CCTV Coverage',
        'Emergency Helpline, Fire Safety & Women Safety Protocols',
        'On-Campus Medical Facility, Doctor & Ambulance Availability',
        'Distance to Nearest Multi-Specialty Hospital',
      ],
    },
    affordabilityRoi: {
      weight: 0.05,
      name: 'Affordability & ROI',
      description: 'Comprehensive total education cost vs career return on investment',
      subcriteria: [
        'Total Estimated Cost of Education (Tuition + Mandatory Fees)',
        'Hostel Fees & Estimated Living Expenses',
        'Scholarship Availability and Financial Aid Opportunities',
        'Return on Investment (ROI) Ratio (Average Starting CTC vs Total Cost)',
      ],
    },
    trustTransparency: {
      weight: 0.10,
      name: 'Trust & Transparency',
      description: 'Fee transparency, admission clarity, complaint resolution, and data integrity',
      subcriteria: [
        'Institutional Fee & Refund Policy Transparency',
        'Admission Process Clarity & Document Verification Rigor',
        'Confidential Student Complaint Handling & Resolution Speed',
        'Swayam Admission Regulatory & Ethical Compliance',
      ],
    },
  },
  rulesConfig: {
    totalWeight: 1.0,
    sourcePriority: [
      'SWAYAM_VERIFIED',
      'SWAYAM_PLATFORM_DATA',
      'STUDENT_VERIFIED',
      'SWAYAM_MANUAL_SURVEY',
      'PUBLIC_VERIFIED',
      'COLLEGE_VERIFIED',
      'COLLEGE_SELF_REPORTED',
    ],
    confidenceRules: {
      minimumMetricCoverageForHigh: 0.85,
      minimumMetricCoverageForMedium: 0.60,
      verifiedSourceWeightMultiplier: 1.25,
      unverifiedSourceWeightMultiplier: 0.75,
      stalenessPenaltyDays: 365,
    },
    tieBreakOrder: [
      'confidenceScore',
      'studentDemandExperience',
      'academicExcellence',
      'placementCareer',
      'trustTransparency',
      'establishedYear',
    ],
  },
};

@Injectable()
export class RankingMethodologyService implements OnModuleInit {
  private readonly logger = new Logger(RankingMethodologyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultMethodology();
  }

  /**
   * Seed / Ensure the default official methodology version exists
   */
  async ensureDefaultMethodology() {
    try {
      const existing = await this.prisma.rankingMethodology.findUnique({
        where: { version: DEFAULT_METHODOLOGY_V1.version },
      });

      if (!existing) {
        await this.prisma.rankingMethodology.create({
          data: {
            version: DEFAULT_METHODOLOGY_V1.version,
            name: DEFAULT_METHODOLOGY_V1.name,
            description: DEFAULT_METHODOLOGY_V1.description,
            status: DEFAULT_METHODOLOGY_V1.status,
            pillarsConfig: DEFAULT_METHODOLOGY_V1.pillarsConfig,
            rulesConfig: DEFAULT_METHODOLOGY_V1.rulesConfig,
          },
        });
        this.logger.log(`✅ Default ranking methodology ${DEFAULT_METHODOLOGY_V1.version} initialized.`);
      }
    } catch (err: any) {
      this.logger.warn(`Methodology init notice: ${err?.message || err}`);
    }
  }

  /**
   * Get Active Methodology
   */
  async getActiveMethodology() {
    const active = await this.prisma.rankingMethodology.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!active) {
      return DEFAULT_METHODOLOGY_V1;
    }
    return active;
  }

  /**
   * List all methodology versions
   */
  async getAllVersions() {
    return this.prisma.rankingMethodology.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        _count: { select: { editions: true } },
      },
    });
  }

  /**
   * Get methodology by version or ID
   */
  async getByVersion(versionOrId: string) {
    const methodology = await this.prisma.rankingMethodology.findFirst({
      where: {
        OR: [{ version: versionOrId }, { id: versionOrId }],
      },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        editions: { select: { id: true, year: true, title: true, status: true } },
      },
    });

    if (!methodology) {
      throw new NotFoundException(`Methodology version '${versionOrId}' not found.`);
    }

    return methodology;
  }

  /**
   * Create New Methodology Version (Never mutate old published methodologies in place)
   */
  async createVersion(actor: IUser, dto: CreateMethodologyDto) {
    const existing = await this.prisma.rankingMethodology.findUnique({
      where: { version: dto.version },
    });

    if (existing) {
      throw new BadRequestException(
        `Methodology version '${dto.version}' already exists. Always create a new version tag (e.g. v1.1.0).`,
      );
    }

    const REQUIRED_NINE_PILLARS = [
      'academicExcellence',
      'placementCareer',
      'studentDemandExperience',
      'infrastructureCampus',
      'locationConnectivity',
      'hostelLivingExperience',
      'safetyHealthcare',
      'affordabilityRoi',
      'trustTransparency',
    ];

    // Validate exactly 9 official pillars required
    const pillars = dto.pillarsConfig || {};
    const pillarKeys = Object.keys(pillars);
    if (pillarKeys.length !== 9) {
      throw new BadRequestException(
        `Methodology must contain exactly 9 official pillars. Provided: ${pillarKeys.length} pillars.`,
      );
    }

    for (const reqPillar of REQUIRED_NINE_PILLARS) {
      if (!pillars[reqPillar] || typeof pillars[reqPillar].weight !== 'number') {
        throw new BadRequestException(
          `Missing required pillar definition or invalid weight for '${reqPillar}'.`,
        );
      }
    }

    // Validate weights total exactly 1.0 (or 100%)
    let rawWeightSum = 0;
    for (const key of Object.keys(pillars)) {
      rawWeightSum += Number(pillars[key]?.weight || 0);
    }

    // Support both 1.0 (decimal) and 100 (percentage) format
    let normalizedConfig = { ...pillars };
    if (Math.abs(rawWeightSum - 100.0) <= 0.5) {
      // Input was in percentages (0-100), convert to decimals (0.0-1.0)
      for (const key of Object.keys(normalizedConfig)) {
        normalizedConfig[key] = {
          ...normalizedConfig[key],
          weight: normalizedConfig[key].weight / 100,
        };
      }
    } else if (Math.abs(rawWeightSum - 1.0) > 0.005) {
      throw new BadRequestException(
        `Pillar weights must sum to exactly 1.0 (100%). Received sum: ${(rawWeightSum * (rawWeightSum > 2 ? 1 : 100)).toFixed(1)}%`,
      );
    }

    const created = await this.prisma.rankingMethodology.create({
      data: {
        version: dto.version,
        name: dto.name,
        description: dto.description || null,
        status: 'DRAFT',
        pillarsConfig: normalizedConfig,
        rulesConfig: dto.rulesConfig || DEFAULT_METHODOLOGY_V1.rulesConfig,
        createdById: actor.id,
      },
    });

    await this.auditService.logAction({
      action: 'RANKING_METHODOLOGY_CREATED',
      entity: 'RankingMethodology',
      entityId: created.id,
      description: `Created new Ranking Methodology version ${dto.version} by ${actor.fullName || actor.email}`,
      userId: actor.id,
      metadata: { version: dto.version, name: dto.name },
    });

    return {
      success: true,
      message: `Ranking Methodology version ${dto.version} created in DRAFT mode.`,
      data: created,
    };
  }

  /**
   * Activate a methodology version (SUPERSEDES previous active)
   */
  async activateVersion(actor: IUser, id: string) {
    const methodology = await this.prisma.rankingMethodology.findUnique({
      where: { id },
    });

    if (!methodology) {
      throw new NotFoundException(`Methodology with ID '${id}' not found.`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Mark existing active versions as SUPERSEDED
      await tx.rankingMethodology.updateMany({
        where: { status: 'ACTIVE' },
        data: { status: 'SUPERSEDED' },
      });

      // Activate target
      return tx.rankingMethodology.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });
    });

    await this.auditService.logAction({
      action: 'RANKING_METHODOLOGY_ACTIVATED',
      entity: 'RankingMethodology',
      entityId: result.id,
      description: `Activated Ranking Methodology version ${result.version}`,
      userId: actor.id,
      metadata: { version: result.version },
    });

    return {
      success: true,
      message: `Methodology ${result.version} is now the active framework for all subsequent rankings.`,
      data: result,
    };
  }
}
