import { Module } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';

@Module({
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
