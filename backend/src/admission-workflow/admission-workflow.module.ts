import { Module } from '@nestjs/common';
import { AdmissionWorkflowService } from './admission-workflow.service';
import { AdmissionWorkflowController } from './admission-workflow.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [AdmissionWorkflowService],
  controllers: [AdmissionWorkflowController],
  exports: [AdmissionWorkflowService],
})
export class AdmissionWorkflowModule {}
