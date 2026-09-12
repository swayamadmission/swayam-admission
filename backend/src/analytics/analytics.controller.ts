import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { EnterpriseAnalyticsQueryDto } from './dto/enterprise-analytics-query.dto';
import { SaveReportDto } from './dto/save-report.dto';
import { ExportReportDto } from './dto/export-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { Response } from 'express';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // 1. Enterprise Overview & Executive KPIs
  @Get('overview')
  getEnterpriseOverview(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getEnterpriseOverview(query, currentUser);
  }

  // 2. 7-Stage Admission Funnel
  @Get('funnel')
  getFunnelAnalytics(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getFunnelAnalytics(query, currentUser);
  }

  // 3. Counselor Performance & Workload
  @Get('counselors')
  getCounselorAnalytics(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getCounselorAnalytics(query, currentUser);
  }

  // 4. Senior Counselor Team Rollup
  @Get('senior-counselors')
  getSeniorCounselorTeamAnalytics(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getSeniorCounselorTeamAnalytics(query, currentUser);
  }

  // 5. College Performance
  @Get('colleges')
  getCollegeAnalytics(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getCollegeAnalytics(query, currentUser);
  }

  // 6. Course & Branch Demand
  @Get('courses')
  getCourseAnalytics(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getCourseAnalytics(query, currentUser);
  }

  // 7. Geographic Analytics (State & District)
  @Get('geography')
  getGeographicAnalytics(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getGeographicAnalytics(query, currentUser);
  }

  // 8. Financial Collections & Reconciliation
  @Get('finance')
  getFinanceAnalytics(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getFinanceAnalytics(query, currentUser);
  }

  // 9. Operational SLA & Bottlenecks Radar
  @Get('sla')
  getSlaAndBottlenecks(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getSlaAndBottlenecks(query, currentUser);
  }

  // 10. Daily & Monthly Trends
  @Get('trends')
  getTrendAnalytics(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getTrendAnalytics(query, currentUser);
  }

  // 11. Record Drilldown
  @Get('drilldown')
  getDrilldownRecords(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getDrilldownRecords(query, currentUser);
  }

  // 12. Export Report (CSV)
  @Post('export')
  async exportReport(
    @Body() body: ExportReportDto,
    @CurrentUser() currentUser: any,
    @Res() res: Response,
  ) {
    const result = await this.analyticsService.exportReport(body, currentUser);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.content);
  }

  // 13. Saved Reports CRUD
  @Get('saved-reports')
  getSavedReports(@CurrentUser() currentUser: any) {
    return this.analyticsService.getSavedReports(currentUser);
  }

  @Post('saved-reports')
  saveReport(
    @Body() body: SaveReportDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.saveReport(body, currentUser);
  }

  @Delete('saved-reports/:id')
  deleteSavedReport(
    @Param('id') id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.deleteSavedReport(id, currentUser);
  }

  // -------------------------------------------------------------
  // Legacy Endpoint Mappings for Backwards Compatibility
  // -------------------------------------------------------------
  @Get('dashboard')
  getLegacyDashboard(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getEnterpriseOverview(query, currentUser);
  }

  @Get('revenue')
  getLegacyRevenue(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getFinanceAnalytics(query, currentUser);
  }

  @Get('leads')
  getLegacyLeads(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getGeographicAnalytics(query, currentUser);
  }

  @Get('conversions')
  getLegacyConversions(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getFunnelAnalytics(query, currentUser);
  }

  @Get('students')
  getLegacyStudents(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getGeographicAnalytics(query, currentUser);
  }

  @Get('payments')
  getLegacyPayments(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getFinanceAnalytics(query, currentUser);
  }

  @Get('applications')
  getLegacyApplications(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getFunnelAnalytics(query, currentUser);
  }

  @Get('marketing')
  getLegacyMarketing(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getTrendAnalytics(query, currentUser);
  }

  @Get('reports')
  getLegacyReports(
    @Query() query: EnterpriseAnalyticsQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.analyticsService.getEnterpriseOverview(query, currentUser);
  }
}
