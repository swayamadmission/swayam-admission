import { Module } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { PositionsController } from './positions.controller';
import { EmailProvisioningService } from './email-provisioning.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PositionsController],
  providers: [PositionsService, EmailProvisioningService],
  exports: [PositionsService, EmailProvisioningService],
})
export class PositionsModule {}
