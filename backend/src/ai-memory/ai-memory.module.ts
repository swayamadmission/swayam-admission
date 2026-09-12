import { Module } from '@nestjs/common';
import { AiMemoryService } from './ai-memory.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AiMemoryService],
  exports: [AiMemoryService],
})
export class AiMemoryModule {}
