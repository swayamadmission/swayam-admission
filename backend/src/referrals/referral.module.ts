import { Module, forwardRef } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralPolicyService } from './referral-policy.service';
import { ReferralController } from './referral.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    PrismaModule,
    RolesModule,
    forwardRef(() => SettingsModule),
    forwardRef(() => AuditModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [ReferralController],
  providers: [ReferralService, ReferralPolicyService],
  exports: [ReferralService, ReferralPolicyService],
})
export class ReferralModule {}
