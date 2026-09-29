import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IUser } from '../auth/interfaces/user.interface';
import {
  CreateRankingCycleDto,
  UpdateRankingCycleDto,
  RankingCycleStatus,
  OFFICIAL_NINE_PILLARS,
} from './dto/reviews-ranking.dto';
import { RankingMethodologyService } from './ranking-methodology.service';

@Injectable()
export class RankingCyclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly methodologyService: RankingMethodologyService,
  ) {}

  /**
   * 1. CREATE ANNUAL RANKING CYCLE
   */
  async createCycle(actor: IUser, dto: CreateRankingCycleDto) {
    const year = Number(dto.year);

    const existing = await this.prisma.rankingEdition.findUnique({
      where: { year },
    });

    if (existing) {
      throw new BadRequestException(`Ranking Cycle / Edition for year ${year} already exists.`);
    }

    const activeMethodology = await this.methodologyService.getActiveMethodology();

    const cycle = await this.prisma.rankingEdition.create({
      data: {
        year,
        title: dto.title || `Swayam Admission National Ranking Cycle ${year}`,
        algorithmVersion: activeMethodology.version || 'v1.0.0',
        status: RankingCycleStatus.DRAFT,
        weightsConfig: (activeMethodology as any).pillarsConfig
          ? Object.fromEntries(
              Object.entries((activeMethodology as any).pillarsConfig).map(([k, v]: any) => [k, v.weight]),
            )
          : OFFICIAL_NINE_PILLARS,
        dataCollectionStart: dto.dataCollectionStart ? new Date(dto.dataCollectionStart) : null,
        dataCollectionEnd: dto.dataCollectionEnd ? new Date(dto.dataCollectionEnd) : null,
        surveyStart: dto.surveyStart ? new Date(dto.surveyStart) : null,
        surveyEnd: dto.surveyEnd ? new Date(dto.surveyEnd) : null,
        reviewStart: dto.reviewStart ? new Date(dto.reviewStart) : null,
        reviewEnd: dto.reviewEnd ? new Date(dto.reviewEnd) : null,
        methodologyId: (activeMethodology as any).id || null,
        calculatedById: actor?.id && (await this.prisma.user.findUnique({ where: { id: actor.id } })) ? actor.id : null,
      },
      include: {
        methodology: true,
      },
    });

    await this.auditService.logAction({
      action: 'RANKING_CYCLE_CREATED',
      entity: 'RankingEdition',
      entityId: cycle.id,
      description: `Created Annual Ranking Cycle for year ${year} by ${actor.fullName || actor.email}`,
      userId: actor.id,
      metadata: { year, title: cycle.title },
    });

    return {
      success: true,
      message: `Annual Ranking Cycle ${year} created successfully.`,
      data: cycle,
    };
  }

  /**
   * 2. LIST ALL ANNUAL CYCLES
   */
  async getCycles() {
    return this.prisma.rankingEdition.findMany({
      orderBy: { year: 'desc' },
      include: {
        methodology: { select: { id: true, version: true, name: true } },
        calculatedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        publishedBy: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            results: true,
            surveys: true,
            dataPoints: true,
            annualReports: true,
          },
        },
      },
    });
  }

  /**
   * 3. GET SINGLE CYCLE DETAIL
   */
  async getCycleByYear(year: number) {
    const cycle = await this.prisma.rankingEdition.findUnique({
      where: { year: Number(year) },
      include: {
        methodology: true,
        calculatedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        publishedBy: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            results: true,
            surveys: true,
            dataPoints: true,
            annualReports: true,
          },
        },
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Ranking Cycle for year ${year} not found.`);
    }

    return cycle;
  }

  /**
   * 4. UPDATE CYCLE STAGE / DATES
   */
  async updateCycle(actor: IUser, year: number, dto: UpdateRankingCycleDto) {
    const existing = await this.prisma.rankingEdition.findUnique({
      where: { year: Number(year) },
    });

    if (!existing) {
      throw new NotFoundException(`Ranking Cycle for year ${year} not found.`);
    }

    // Published snapshots cannot be mutated directly
    if (existing.status === RankingCycleStatus.PUBLISHED && dto.status && dto.status !== RankingCycleStatus.ARCHIVED) {
      throw new BadRequestException('Published ranking snapshots are immutable. To correct, archive or create a new edition revision.');
    }

    const updated = await this.prisma.rankingEdition.update({
      where: { year: Number(year) },
      data: {
        title: dto.title !== undefined ? dto.title : existing.title,
        status: dto.status !== undefined ? dto.status : existing.status,
        methodologyId: dto.methodologyId !== undefined ? dto.methodologyId : existing.methodologyId,
        dataCollectionStart: dto.dataCollectionStart ? new Date(dto.dataCollectionStart) : existing.dataCollectionStart,
        dataCollectionEnd: dto.dataCollectionEnd ? new Date(dto.dataCollectionEnd) : existing.dataCollectionEnd,
        surveyStart: dto.surveyStart ? new Date(dto.surveyStart) : existing.surveyStart,
        surveyEnd: dto.surveyEnd ? new Date(dto.surveyEnd) : existing.surveyEnd,
        reviewStart: dto.reviewStart ? new Date(dto.reviewStart) : existing.reviewStart,
        reviewEnd: dto.reviewEnd ? new Date(dto.reviewEnd) : existing.reviewEnd,
        analysisStart: dto.analysisStart ? new Date(dto.analysisStart) : existing.analysisStart,
      },
      include: {
        methodology: true,
      },
    });

    await this.auditService.logAction({
      action: 'RANKING_CYCLE_UPDATED',
      entity: 'RankingEdition',
      entityId: existing.id,
      description: `Updated Ranking Cycle ${year} stage to ${updated.status}`,
      userId: actor.id,
      metadata: { year, changes: dto },
    });

    return {
      success: true,
      message: `Ranking Cycle ${year} updated successfully.`,
      data: updated,
    };
  }
}
