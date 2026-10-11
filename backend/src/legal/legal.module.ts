import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { LegalPolicyService } from './legal-policy.service';
import { ConsentService } from './consent.service';
import { GrievanceService } from './grievance.service';
import { CookieService } from './cookie.service';
import { LegalController } from './legal.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LegalController],
  providers: [
    LegalPolicyService,
    ConsentService,
    GrievanceService,
    CookieService,
  ],
  exports: [
    LegalPolicyService,
    ConsentService,
    GrievanceService,
    CookieService,
  ],
})
export class LegalModule {}
