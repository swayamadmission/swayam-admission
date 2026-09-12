import { Controller, Get, UseGuards } from '@nestjs/common';
import { AiAnalyticsService } from './ai-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('ai-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiAnalyticsController {
  constructor(private readonly aiAnalyticsService: AiAnalyticsService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getDashboardMetrics() {
    return this.aiAnalyticsService.getDashboardMetrics();
  }
}
