import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IUser } from '../auth/interfaces/user.interface';
import {
  CreateDataPointDto,
  VerifyDataPointDto,
} from './dto/reviews-ranking.dto';

@Injectable()
export class RankingVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 1. CREATE / INGEST RANKING DATA POINT
   */
  async createDataPoint(actor: IUser, dto: CreateDataPointDto) {
    const college = await this.prisma.college.findUnique({
      where: { id: dto.collegeId },
    });
    if (!college) {
      throw new NotFoundException(`College '${dto.collegeId}' not found.`);
    }

    const dataPoint = await this.prisma.rankingDataPoint.create({
      data: {
        collegeId: dto.collegeId,
        rankingYear: Number(dto.rankingYear),
        pillar: dto.pillar,
        metricKey: dto.metricKey,
        metricName: dto.metricName,
        rawValue: dto.rawValue,
        normalizedValue: Number(dto.normalizedValue),
        sourceType: dto.sourceType,
        evidenceUrl: dto.evidenceUrl || null,
        status: 'PENDING',
        confidenceWeight: dto.confidenceWeight !== undefined ? Number(dto.confidenceWeight) : 1.0,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
      include: {
        college: { select: { id: true, name: true, city: true, state: true } },
      },
    });

    await this.auditService.logAction({
      action: 'RANKING_DATA_POINT_CREATED',
      entity: 'RankingDataPoint',
      entityId: dataPoint.id,
      description: `Ingested data point '${dto.metricName}' for ${college.name}`,
      userId: actor.id,
      metadata: { collegeId: dto.collegeId, pillar: dto.pillar, sourceType: dto.sourceType },
    });

    return {
      success: true,
      message: 'Ranking data point created and queued for verification.',
      data: dataPoint,
    };
  }

  /**
   * 2. GET UNIFIED VERIFICATION QUEUE
   */
  async getVerificationQueue(query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 25);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.pillar && query.pillar !== 'all') where.pillar = query.pillar;
    if (query.sourceType && query.sourceType !== 'all') where.sourceType = query.sourceType;
    if (query.collegeId) where.collegeId = query.collegeId;
    if (query.year) where.rankingYear = Number(query.year);

    const [items, total] = await Promise.all([
      this.prisma.rankingDataPoint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          college: { select: { id: true, name: true, city: true, state: true, logo: true } },
          verifiedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.rankingDataPoint.count({ where }),
    ]);

    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 3. VERIFY / REJECT / FLAG DATA POINT
   */
  async verifyDataPoint(actor: IUser, id: string, dto: VerifyDataPointDto) {
    const item = await this.prisma.rankingDataPoint.findUnique({
      where: { id },
      include: { college: { select: { id: true, name: true } } },
    });

    if (!item) {
      throw new NotFoundException(`Data point '${id}' not found.`);
    }

    const newStatus = dto.action === 'VERIFY' ? 'VERIFIED' : dto.action === 'REJECT' ? 'REJECTED' : 'FLAGGED';

    const updated = await this.prisma.rankingDataPoint.update({
      where: { id },
      data: {
        status: newStatus,
        verifiedAt: new Date(),
        verifiedById: actor.id,
        verifierNotes: dto.verifierNotes || null,
      },
    });

    await this.auditService.logAction({
      action: 'RANKING_DATA_POINT_VERIFIED',
      entity: 'RankingDataPoint',
      entityId: id,
      description: `Data point '${item.metricName}' for ${item.college.name} marked as ${newStatus} by ${actor.fullName || actor.email}`,
      userId: actor.id,
      metadata: { action: dto.action, verifierNotes: dto.verifierNotes },
    });

    return {
      success: true,
      message: `Data point marked as ${newStatus}.`,
      data: updated,
    };
  }

  /**
   * 4. GET VERIFICATION STATS (FOR DASHBOARD)
   */
  async getVerificationStats(year?: number) {
    const targetYear = year ? Number(year) : new Date().getFullYear();

    const [total, verified, pending, rejected, flagged] = await Promise.all([
      this.prisma.rankingDataPoint.count({ where: { rankingYear: targetYear } }),
      this.prisma.rankingDataPoint.count({ where: { rankingYear: targetYear, status: 'VERIFIED' } }),
      this.prisma.rankingDataPoint.count({ where: { rankingYear: targetYear, status: 'PENDING' } }),
      this.prisma.rankingDataPoint.count({ where: { rankingYear: targetYear, status: 'REJECTED' } }),
      this.prisma.rankingDataPoint.count({ where: { rankingYear: targetYear, status: 'FLAGGED' } }),
    ]);

    const completenessPercentage = total > 0 ? Math.round((verified / total) * 1000) / 10 : 100.0;

    return {
      success: true,
      data: {
        targetYear,
        total,
        verified,
        pending,
        rejected,
        flagged,
        completenessPercentage,
      },
    };
  }
}
