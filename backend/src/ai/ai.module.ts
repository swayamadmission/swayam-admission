import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AIProviderService } from './provider.service';
import { RAGEngineService } from './rag-engine.service';
import { PromptManagerService } from './prompt-manager.service';
import { CRMSyncService } from './crm-sync.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [
    AiService,
    AIProviderService,
    RAGEngineService,
    PromptManagerService,
    CRMSyncService,
  ],
  exports: [
    AiService,
    AIProviderService,
    RAGEngineService,
    PromptManagerService,
    CRMSyncService,
  ],
})
export class AiModule {}
