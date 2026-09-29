import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IUser } from '../auth/interfaces/user.interface';
import {
  CreateSurveyDto,
  SubmitSurveyResponsesDto,
  ReviewSurveyDto,
} from './dto/reviews-ranking.dto';

@Injectable()
export class RankingSurveyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 1. CREATE AND ASSIGN SURVEY
   */
  async createSurvey(actor: IUser, dto: CreateSurveyDto) {
    const year = Number(dto.rankingYear);

    // Verify College exists
    const college = await this.prisma.college.findUnique({
      where: { id: dto.collegeId },
    });
    if (!college) {
      throw new NotFoundException(`College '${dto.collegeId}' not found.`);
    }

    const survey = await this.prisma.rankingSurvey.create({
      data: {
        rankingYear: year,
        editionId: dto.editionId || null,
        collegeId: dto.collegeId,
        templateName: dto.templateName || 'SWAYAM_STANDARD_9_PILLAR_V1',
        surveyorId: dto.surveyorId || actor.id,
        status: 'ASSIGNED',
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
      },
      include: {
        college: { select: { id: true, name: true, city: true, state: true } },
        surveyor: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.auditService.logAction({
      action: 'RANKING_SURVEY_ASSIGNED',
      entity: 'RankingSurvey',
      entityId: survey.id,
      description: `Assigned manual research survey for ${college.name} (${year}) to surveyor ${survey.surveyor?.fullName || survey.surveyorId}`,
      userId: actor.id,
      metadata: { collegeId: dto.collegeId, year, surveyorId: survey.surveyorId },
    });

    if (dto.surveyorId && dto.surveyorId !== actor.id) {
      try {
        await this.notificationsService.createNotification({
          userId: dto.surveyorId,
          title: 'Field Research Survey Assigned 📋',
          message: `You have been assigned to conduct an on-ground college ranking survey for ${college.name}.`,
          type: 'COUNSELOR' as any,
        });
      } catch {
        // non-blocking
      }
    }

    return {
      success: true,
      message: `Research survey for ${college.name} assigned successfully.`,
      data: survey,
    };
  }

  /**
   * 2. LIST SURVEYS (WITH FILTERS)
   */
  async getSurveys(query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.year) where.rankingYear = Number(query.year);
    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.collegeId) where.collegeId = query.collegeId;
    if (query.surveyorId) where.surveyorId = query.surveyorId;

    const [surveys, total] = await Promise.all([
      this.prisma.rankingSurvey.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          college: { select: { id: true, name: true, city: true, state: true, logo: true } },
          surveyor: { select: { id: true, fullName: true, email: true } },
          reviewedBy: { select: { id: true, fullName: true, email: true } },
          _count: { select: { responses: true } },
        },
      }),
      this.prisma.rankingSurvey.count({ where }),
    ]);

    return {
      success: true,
      data: surveys,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 3. GET SURVEY DETAILS WITH RESPONSES
   */
  async getSurveyDetail(id: string) {
    const survey = await this.prisma.rankingSurvey.findUnique({
      where: { id },
      include: {
        college: true,
        surveyor: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
        responses: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!survey) {
      throw new NotFoundException(`Survey '${id}' not found.`);
    }

    return {
      success: true,
      data: survey,
    };
  }

  /**
   * 4. SUBMIT SURVEY RESPONSES & OBSERVATIONS
   */
  async submitSurveyResponses(actor: IUser, id: string, dto: SubmitSurveyResponsesDto) {
    const survey = await this.prisma.rankingSurvey.findUnique({
      where: { id },
    });

    if (!survey) {
      throw new NotFoundException(`Survey '${id}' not found.`);
    }

    if (survey.status === 'APPROVED') {
      throw new BadRequestException('Approved surveys cannot be overwritten.');
    }

    if (!dto.responses || dto.responses.length === 0) {
      throw new BadRequestException('At least one survey response must be submitted.');
    }

    // Compute aggregate average score from responses
    const totalScore = dto.responses.reduce((sum, r) => sum + Number(r.score), 0);
    const overallScore = Math.round((totalScore / dto.responses.length) * 10) / 10;

    const result = await this.prisma.$transaction(async (tx) => {
      // Clear previous responses for this survey
      await tx.rankingSurveyResponse.deleteMany({
        where: { surveyId: id },
      });

      // Insert new responses
      await tx.rankingSurveyResponse.createMany({
        data: dto.responses.map((r) => ({
          surveyId: id,
          pillar: r.pillar,
          criterion: r.criterion,
          metric: r.metric,
          score: r.score,
          observation: r.observation || null,
          evidenceUrls: r.evidenceUrls || [],
          verified: false,
        })),
      });

      // Update survey status
      return tx.rankingSurvey.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          overallScore,
          conductedAt: survey.conductedAt || new Date(),
          submittedAt: new Date(),
        },
      });
    });

    await this.auditService.logAction({
      action: 'RANKING_SURVEY_SUBMITTED',
      entity: 'RankingSurvey',
      entityId: id,
      description: `Submitted ${dto.responses.length} responses for Survey ${id} with overall score ${overallScore}`,
      userId: actor.id,
      metadata: { responseCount: dto.responses.length, overallScore },
    });

    return {
      success: true,
      message: 'Survey responses saved and submitted for quality review.',
      data: result,
    };
  }

  /**
   * 5. REVIEW SURVEY (APPROVE OR REJECT)
   * Approving survey automatically promotes verified factors into ranking data points
   */
  async reviewSurvey(actor: IUser, id: string, dto: ReviewSurveyDto) {
    const survey = await this.prisma.rankingSurvey.findUnique({
      where: { id },
      include: { responses: true, college: true },
    });

    if (!survey) {
      throw new NotFoundException(`Survey '${id}' not found.`);
    }

    const newStatus = dto.action === 'APPROVE' ? 'APPROVED' : dto.action === 'REJECT' ? 'REJECTED' : 'UNDER_REVIEW';

    const updated = await this.prisma.$transaction(async (tx) => {
      const s = await tx.rankingSurvey.update({
        where: { id },
        data: {
          status: newStatus,
          reviewedById: actor.id,
          reviewedAt: new Date(),
          reviewNotes: dto.reviewNotes || null,
        },
      });

      // If approved, mark all responses as verified and upsert into RankingDataPoint
      if (dto.action === 'APPROVE') {
        await tx.rankingSurveyResponse.updateMany({
          where: { surveyId: id },
          data: { verified: true },
        });

        // Insert into RankingDataPoint for each pillar response
        for (const resp of survey.responses) {
          await tx.rankingDataPoint.create({
            data: {
              collegeId: survey.collegeId,
              rankingYear: survey.rankingYear,
              pillar: resp.pillar,
              metricKey: `SURVEY_${resp.metric.toUpperCase().replace(/\s+/g, '_')}`,
              metricName: `${resp.criterion}: ${resp.metric}`,
              rawValue: `${resp.score}/100`,
              normalizedValue: resp.score,
              sourceType: 'SWAYAM_MANUAL_SURVEY',
              status: 'VERIFIED',
              confidenceWeight: 1.25, // High confidence for manual verified audits
              verifiedAt: new Date(),
              verifiedById: actor.id,
              verifierNotes: `Approved from Survey ID ${id}`,
            },
          });
        }
      }

      return s;
    });

    await this.auditService.logAction({
      action: 'RANKING_SURVEY_REVIEWED',
      entity: 'RankingSurvey',
      entityId: id,
      description: `Survey ${id} reviewed by ${actor.fullName || actor.email}: ${newStatus}`,
      userId: actor.id,
      metadata: { action: dto.action, notes: dto.reviewNotes },
    });

    return {
      success: true,
      message: `Survey ${newStatus === 'APPROVED' ? 'approved and incorporated into verified ranking dataset' : 'updated'}.`,
      data: updated,
    };
  }
}
