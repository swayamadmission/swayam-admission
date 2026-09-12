import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ReferralModule } from '../referrals/referral.module';
import { CouponModule } from '../coupons/coupon.module';
import { FeeCatalogService } from './fee-catalog.service';
import { FeeCatalogController } from './fee-catalog.controller';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuditModule),
    forwardRef(() => ReferralModule),
    forwardRef(() => CouponModule),
  ],
  providers: [FeeCatalogService],
  controllers: [FeeCatalogController],
  exports: [FeeCatalogService],
})
export class FeesModule {}
