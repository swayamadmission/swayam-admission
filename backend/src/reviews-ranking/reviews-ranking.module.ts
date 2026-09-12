import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { RankingEngineService } from './ranking-engine.service';
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
  providers: [ReviewsService, RankingEngineService],
  controllers: [ReviewsController, RankingsController],
  exports: [ReviewsService, RankingEngineService],
})
export class ReviewsRankingModule {}
