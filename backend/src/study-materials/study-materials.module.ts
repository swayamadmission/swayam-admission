import { Module } from '@nestjs/common';
import { StudyMaterialsController } from './study-materials.controller';
import { StudyMaterialsService } from './study-materials.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { LiveSyncModule } from '../events/live-sync.module';
import { StorageModule } from '../storage/storage.module';
import { PaymentsModule } from '../payments/payments.module';
import { CouponModule } from '../coupons/coupon.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    LiveSyncModule,
    StorageModule,
    PaymentsModule,
    CouponModule,
  ],
  controllers: [StudyMaterialsController],
  providers: [StudyMaterialsService],
  exports: [StudyMaterialsService],
})
export class StudyMaterialsModule {}
