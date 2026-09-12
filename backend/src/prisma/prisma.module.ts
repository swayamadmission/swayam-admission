import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IdGeneratorService } from '../common/id-generator.service';

@Global()
@Module({
  providers: [PrismaService, IdGeneratorService],
  exports: [PrismaService, IdGeneratorService],
})
export class PrismaModule {}
