import { Module } from '@nestjs/common';
import { EducationFinanceService } from './education-finance.service';
import { EducationFinanceController } from './education-finance.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [EducationFinanceController],
  providers: [EducationFinanceService],
  exports: [EducationFinanceService],
})
export class EducationFinanceModule {}
