import { Module } from '@nestjs/common';
import { AiRecommendationService } from './ai-recommendation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiRecommendationController } from './ai-recommendation.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AiRecommendationController],
  providers: [AiRecommendationService],
  exports: [AiRecommendationService],
})
export class AiRecommendationModule {}
