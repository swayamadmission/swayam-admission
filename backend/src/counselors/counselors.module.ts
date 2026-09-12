import { Module } from '@nestjs/common';
import { CounselorsService } from './counselors.service';
import { CounselorsController } from './counselors.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CounselorsController],
  providers: [CounselorsService],
  exports: [CounselorsService],
})
export class CounselorsModule {}
