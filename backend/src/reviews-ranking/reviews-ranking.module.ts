import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { RankingEngineService } from './ranking-engine.service';
import { RankingCyclesService } from './ranking-cycles.service';
import { RankingMethodologyService } from './ranking-methodology.service';
import { RankingStudentReportService } from './ranking-student-report.service';
import { RankingSurveyService } from './ranking-survey.service';
import { RankingVerificationService } from './ranking-verification.service';
import { RankingReportService } from './ranking-report.service';
import { ReviewsController } from './reviews.controller';
import { RankingsController } from './rankings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationsModule,
    AuthModule,
  ],
  providers: [
    ReviewsService,
    RankingEngineService,
    RankingCyclesService,
    RankingMethodologyService,
    RankingStudentReportService,
    RankingSurveyService,
    RankingVerificationService,
    RankingReportService,
  ],
  controllers: [ReviewsController, RankingsController],
  exports: [
    ReviewsService,
    RankingEngineService,
    RankingCyclesService,
    RankingMethodologyService,
    RankingStudentReportService,
    RankingSurveyService,
    RankingVerificationService,
    RankingReportService,
  ],
})
export class ReviewsRankingModule {}
