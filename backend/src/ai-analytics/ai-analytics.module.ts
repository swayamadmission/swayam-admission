import { Module } from '@nestjs/common';
import { AiAnalyticsService } from './ai-analytics.service';
import { AiAnalyticsController } from './ai-analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AiAnalyticsService],
  controllers: [AiAnalyticsController],
  exports: [AiAnalyticsService],
})
export class AiAnalyticsModule {}
