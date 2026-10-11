import { Module, forwardRef } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { ApplicationFeeEligibilityService } from './services/application-fee-eligibility.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DocumentsModule } from '../documents/documents.module';
import { OrganizationModule } from '../organization/organization.module';
import { CouponModule } from '../coupons/coupon.module';
import { PaymentsModule } from '../payments/payments.module';
import { LeadModule } from '../lead/lead.module';
import { LegalModule } from '../legal/legal.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditModule,
    NotificationsModule,
    DocumentsModule,
    OrganizationModule,
    LegalModule,
    forwardRef(() => CouponModule),
    forwardRef(() => PaymentsModule),
    forwardRef(() => LeadModule),
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService, ApplicationFeeEligibilityService],
  exports: [ApplicationService, ApplicationFeeEligibilityService],
})
export class ApplicationModule {}
