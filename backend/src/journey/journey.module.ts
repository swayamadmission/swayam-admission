import { Module, forwardRef } from '@nestjs/common';
import { JourneyController } from './journey.controller';
import { JourneyService } from './journey.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { LeadModule } from '../lead/lead.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    DocumentsModule,
    forwardRef(() => LeadModule),
  ],
  controllers: [JourneyController],
  providers: [JourneyService],
  exports: [JourneyService],
})
export class JourneyModule {}
