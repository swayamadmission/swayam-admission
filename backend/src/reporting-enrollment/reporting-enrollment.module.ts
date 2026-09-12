import { Module } from '@nestjs/common';
import { ReportingEnrollmentService } from './reporting-enrollment.service';
import { ReportingEnrollmentController } from './reporting-enrollment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationsModule,
    JourneyModule,
    AuthModule,
  ],
  providers: [ReportingEnrollmentService],
  controllers: [ReportingEnrollmentController],
  exports: [ReportingEnrollmentService],
})
export class ReportingEnrollmentModule {}
