import { Module } from '@nestjs/common';
import { AiPromptsService } from './ai-prompts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AiPromptsService],
  exports: [AiPromptsService],
})
export class AiPromptsModule {}
