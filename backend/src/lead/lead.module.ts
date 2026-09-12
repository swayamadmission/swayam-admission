import { Module } from '@nestjs/common';
import { LeadService } from './lead.service';
import { LeadRoutingService } from './lead-routing.service';
import { LeadController } from './lead.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditModule,
    NotificationsModule,
    SettingsModule,
  ],
  controllers: [LeadController],
  providers: [LeadService, LeadRoutingService],
  exports: [LeadService, LeadRoutingService],
})
export class LeadModule {}
