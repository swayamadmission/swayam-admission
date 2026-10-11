import { Module, forwardRef } from '@nestjs/common';
import { HrController } from './hr.controller';
import { CareersController } from './careers.controller';
import { HrService } from './hr.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => AuditModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [HrController, CareersController],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}
