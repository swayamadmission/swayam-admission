import { Module } from '@nestjs/common';
import { HomepageController } from './homepage.controller';
import { HomepageService } from './homepage.service';

@Module({
  controllers: [HomepageController],
  providers: [HomepageService],
})
export class HomepageModule {}
