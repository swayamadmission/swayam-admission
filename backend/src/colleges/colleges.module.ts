import { Module } from '@nestjs/common';
import { CollegesController } from './colleges.controller';
import { CollegesService } from './colleges.service';
import { CollegesBulkService } from './colleges-bulk.service';
import { OfferingsController } from './offerings.controller';
import { OfferingsService } from './offerings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [CollegesController, OfferingsController],
  providers: [CollegesService, CollegesBulkService, OfferingsService],
  exports: [CollegesService, CollegesBulkService, OfferingsService],
})
export class CollegesModule {}

