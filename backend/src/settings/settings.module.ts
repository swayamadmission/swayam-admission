import { Module, Global } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SystemConfigurationService } from './system-configuration.service';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
  providers: [SettingsService, SystemConfigurationService],
  exports: [SettingsService, SystemConfigurationService],
})
export class SettingsModule {}
