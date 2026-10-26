import { Module, forwardRef } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TerminusModule,
    PrismaModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
