import { Module } from '@nestjs/common';
import { StaffOnboardingService } from './staff-onboarding.service';
import { StaffOnboardingController } from './staff-onboarding.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PositionsModule } from '../positions/positions.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, PositionsModule, AuthModule],
  controllers: [StaffOnboardingController],
  providers: [StaffOnboardingService],
  exports: [StaffOnboardingService],
})
export class StaffOnboardingModule {}
