import { Module } from '@nestjs/common';
import { CollegeCounselingController } from './college-counseling.controller';
import { CollegeCounselingService } from './college-counseling.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JourneyModule } from '../journey/journey.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditModule,
    NotificationsModule,
    JourneyModule,
  ],
  controllers: [CollegeCounselingController],
  providers: [CollegeCounselingService],
  exports: [CollegeCounselingService],
})
export class CollegeCounselingModule {}
