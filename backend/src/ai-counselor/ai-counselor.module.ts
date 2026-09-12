import { Module } from '@nestjs/common';
import { AiCounselorService } from './ai-counselor.service';
import { AiCounselorController } from './ai-counselor.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiMemoryModule } from '../ai-memory/ai-memory.module';
import { AiRecommendationModule } from '../ai-recommendation/ai-recommendation.module';
import { AiPromptsModule } from '../ai-prompts/ai-prompts.module';
import { AiAnalyticsModule } from '../ai-analytics/ai-analytics.module';
import { AiChatModule } from '../ai-chat/ai-chat.module';

@Module({
  imports: [
    PrismaModule,
    AiMemoryModule,
    AiRecommendationModule,
    AiPromptsModule,
    AiAnalyticsModule,
    AiChatModule,
  ],
  providers: [AiCounselorService],
  controllers: [AiCounselorController],
})
export class AiCounselorModule {}
