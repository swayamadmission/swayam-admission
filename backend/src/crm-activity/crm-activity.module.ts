import { Module } from '@nestjs/common';
import { CrmActivityService } from './crm-activity.service';
import { CrmActivityController } from './crm-activity.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule, TasksModule],
  providers: [CrmActivityService],
  controllers: [CrmActivityController],
  exports: [CrmActivityService],
})
export class CrmActivityModule {}
