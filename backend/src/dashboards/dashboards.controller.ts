import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('dashboards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get('admin/metrics')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getAdminMetrics() {
    return this.dashboardsService.getAdminMetrics();
  }

  @Get('counselor/performance')
  @Roles('COUNSELOR')
  getCounselorMetrics(@CurrentUser() user: IUser) {
    return this.dashboardsService.getCounselorMetrics(user.id);
  }

  @Get('student/summary')
  @Roles('STUDENT')
  getStudentSummary(@CurrentUser() user: IUser) {
    return this.dashboardsService.getStudentSummary(user.id);
  }
}
