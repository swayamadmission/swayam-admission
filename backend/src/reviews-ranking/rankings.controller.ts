import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RankingEngineService } from './ranking-engine.service';
import { RankingCyclesService } from './ranking-cycles.service';
import { RankingMethodologyService } from './ranking-methodology.service';
import { RankingStudentReportService } from './ranking-student-report.service';
import { RankingSurveyService } from './ranking-survey.service';
import { RankingVerificationService } from './ranking-verification.service';
import { RankingReportService } from './ranking-report.service';
import {
  CalculateRankingDto,
  ApproveRankingDto,
  PublishRankingDto,
  CreateRankingCycleDto,
  UpdateRankingCycleDto,
  CreateMethodologyDto,
  SubmitStudentReportDto,
  ModerateStudentReportDto,
  CreateSurveyDto,
  SubmitSurveyResponsesDto,
  ReviewSurveyDto,
  CreateDataPointDto,
  VerifyDataPointDto,
  GenerateAnnualReportDto,
  ApproveAnnualReportDto,
} from './dto/reviews-ranking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('rankings')
export class RankingsController {
  constructor(
    private readonly rankingEngineService: RankingEngineService,
    private readonly rankingCyclesService: RankingCyclesService,
    private readonly methodologyService: RankingMethodologyService,
    private readonly studentReportService: RankingStudentReportService,
    private readonly surveyService: RankingSurveyService,
    private readonly verificationService: RankingVerificationService,
    private readonly reportService: RankingReportService,
  ) {}

  // =========================================================================
  // PUBLIC ENDPOINTS (Strictly returns published ranking snapshots)
  // =========================================================================

  @Get('public')
  getPublicRankings(@Query('year') year?: string, @Query() query?: any) {
    return this.rankingEngineService.getPublicRankings(
      year ? Number(year) : undefined,
      query,
    );
  }

  @Get('public/:year/special/:type')
  getPublicSpecialRankings(
    @Param('year') year: string,
    @Param('type') type: string,
    @Query() query: any,
  ) {
    return this.rankingEngineService.getSpecialRankings(Number(year), type, query);
  }

  @Get('public/:year/college/:collegeId')
  getPublicCollegeScorecard(
    @Param('year') year: string,
    @Param('collegeId') collegeId: string,
  ) {
    return this.rankingEngineService.getCollegeScorecard(collegeId, Number(year));
  }

  @Get('public/:year/annual-report')
  getPublicAnnualReport(@Param('year') year: string) {
    return this.reportService.getPublicAnnualReport(Number(year));
  }

  @Get('compare')
  compareColleges(
    @Query('collegeIds') collegeIds: string,
    @Query('year') year?: string,
  ) {
    const ids = collegeIds ? collegeIds.split(',') : [];
    return this.rankingEngineService.compareColleges(
      ids,
      year ? Number(year) : undefined,
    );
  }

  // =========================================================================
  // ANNUAL RANKING CYCLES
  // =========================================================================

  @Post('cycles')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.create')
  createCycle(
    @CurrentUser() user: IUser,
    @Body() dto: CreateRankingCycleDto,
  ) {
    return this.rankingCyclesService.createCycle(user, dto);
  }

  @Get('cycles')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.view')
  getCycles() {
    return this.rankingCyclesService.getCycles();
  }

  @Get('cycles/:year')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.view')
  getCycleByYear(@Param('year') year: string) {
    return this.rankingCyclesService.getCycleByYear(Number(year));
  }

  @Put('cycles/:year')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.edit')
  updateCycle(
    @CurrentUser() user: IUser,
    @Param('year') year: string,
    @Body() dto: UpdateRankingCycleDto,
  ) {
    return this.rankingCyclesService.updateCycle(user, Number(year), dto);
  }

  // =========================================================================
  // METHODOLOGY GOVERNANCE
  // =========================================================================

  @Get('methodology/active')
  getActiveMethodology() {
    return this.methodologyService.getActiveMethodology();
  }

  @Get('methodology/versions')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.methodology.view')
  getMethodologyVersions() {
    return this.methodologyService.getAllVersions();
  }

  @Get('methodology/version/:version')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.methodology.view')
  getMethodologyByVersion(@Param('version') version: string) {
    return this.methodologyService.getByVersion(version);
  }

  @Post('methodology/versions')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.methodology.manage')
  createMethodologyVersion(
    @CurrentUser() user: IUser,
    @Body() dto: CreateMethodologyDto,
  ) {
    return this.methodologyService.createVersion(user, dto);
  }

  @Post('methodology/:id/activate')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.methodology.manage')
  activateMethodologyVersion(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
  ) {
    return this.methodologyService.activateVersion(user, id);
  }

  // =========================================================================
  // RANKING CALCULATION, APPROVAL & PUBLICATION
  // =========================================================================

  @Post('calculate')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.generate')
  calculateRanking(
    @CurrentUser() user: IUser,
    @Body() dto: CalculateRankingDto,
  ) {
    return this.rankingEngineService.calculateRanking(user, dto);
  }

  @Get('editions')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.view')
  getRankingEditions() {
    return this.rankingEngineService.getRankingEditions();
  }

  @Get('edition/:year')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.view')
  getEditionDetails(@Param('year') year: string, @Query() query: any) {
    return this.rankingEngineService.getEditionDetails(Number(year), query);
  }

  @Get('edition/:year/special/:type')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.view')
  getSpecialRankingsAdmin(
    @Param('year') year: string,
    @Param('type') type: string,
    @Query() query: any,
  ) {
    return this.rankingEngineService.getSpecialRankings(Number(year), type, query, true);
  }

  @Post('edition/:year/approve')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.publish')
  approveRankingEdition(
    @Param('year') year: string,
    @CurrentUser() user: IUser,
    @Body() dto: ApproveRankingDto,
  ) {
    return this.rankingEngineService.approveRankingEdition(user, Number(year), dto);
  }

  @Post('edition/:year/publish')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.publish')
  publishRankingEdition(
    @Param('year') year: string,
    @CurrentUser() user: IUser,
  ) {
    return this.rankingEngineService.publishRankingEdition(user, Number(year));
  }

  @Post('edition/:year/unpublish')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.archive')
  unpublishRankingEdition(
    @Param('year') year: string,
    @CurrentUser() user: IUser,
    @Body() dto: PublishRankingDto,
  ) {
    return this.rankingEngineService.unpublishRankingEdition(user, Number(year), dto);
  }

  // =========================================================================
  // STUDENT COLLEGE REPORTS
  // =========================================================================

  @Get('student-reports/eligibility/:collegeId')
  @UseGuards(JwtAuthGuard)
  checkStudentEligibility(
    @CurrentUser() user: IUser,
    @Param('collegeId') collegeId: string,
  ) {
    return this.studentReportService.checkStudentEligibility(user.id, collegeId);
  }

  @Post('student-reports')
  @UseGuards(JwtAuthGuard)
  submitStudentReport(
    @CurrentUser() user: IUser,
    @Body() dto: SubmitStudentReportDto,
    @Req() req: any,
  ) {
    return this.studentReportService.submitReport(user, dto, {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Get('student-reports/my')
  @UseGuards(JwtAuthGuard)
  getMyReports(@CurrentUser() user: IUser) {
    return this.studentReportService.getMyReports(user.id);
  }

  @Get('student-reports/admin')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.review.view')
  getAdminReports(@Query() query: any) {
    return this.studentReportService.getAdminReports(query);
  }

  @Post('student-reports/:id/moderate')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.review.manage')
  moderateStudentReport(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() dto: ModerateStudentReportDto,
  ) {
    return this.studentReportService.moderateReport(user, id, dto);
  }

  // =========================================================================
  // SWAYAM MANUAL RESEARCH SURVEYS
  // =========================================================================

  @Post('surveys')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.survey.manage')
  createSurvey(
    @CurrentUser() user: IUser,
    @Body() dto: CreateSurveyDto,
  ) {
    return this.surveyService.createSurvey(user, dto);
  }

  @Get('surveys')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.survey.view')
  getSurveys(@Query() query: any) {
    return this.surveyService.getSurveys(query);
  }

  @Get('surveys/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.survey.view')
  getSurveyDetail(@Param('id') id: string) {
    return this.surveyService.getSurveyDetail(id);
  }

  @Post('surveys/:id/responses')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.survey.manage')
  submitSurveyResponses(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() dto: SubmitSurveyResponsesDto,
  ) {
    return this.surveyService.submitSurveyResponses(user, id, dto);
  }

  @Post('surveys/:id/review')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.survey.manage')
  reviewSurvey(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() dto: ReviewSurveyDto,
  ) {
    return this.surveyService.reviewSurvey(user, id, dto);
  }

  // =========================================================================
  // VERIFICATION QUEUE & DATA PROVENANCE
  // =========================================================================

  @Post('verification/datapoints')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.verify')
  createDataPoint(
    @CurrentUser() user: IUser,
    @Body() dto: CreateDataPointDto,
  ) {
    return this.verificationService.createDataPoint(user, dto);
  }

  @Get('verification/queue')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.verify')
  getVerificationQueue(@Query() query: any) {
    return this.verificationService.getVerificationQueue(query);
  }

  @Get('verification/stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.verify')
  getVerificationStats(@Query('year') year?: string) {
    return this.verificationService.getVerificationStats(year ? Number(year) : undefined);
  }

  @Post('verification/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.verify')
  verifyDataPoint(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() dto: VerifyDataPointDto,
  ) {
    return this.verificationService.verifyDataPoint(user, id, dto);
  }

  // =========================================================================
  // ANNUAL RESEARCH REPORTS
  // =========================================================================

  @Post('annual-reports/generate')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.report.generate')
  generateAnnualReport(
    @CurrentUser() user: IUser,
    @Body() dto: GenerateAnnualReportDto,
  ) {
    return this.reportService.generateAnnualReport(user, dto);
  }

  @Get('annual-reports/:year')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.report.view')
  getAnnualReport(@Param('year') year: string) {
    return this.reportService.getReportByYear(Number(year));
  }

  @Post('annual-reports/:year/approve')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.report.approve')
  approveAnnualReport(
    @CurrentUser() user: IUser,
    @Param('year') year: string,
    @Body() dto: ApproveAnnualReportDto,
  ) {
    return this.reportService.approveAnnualReport(user, Number(year), dto);
  }

  @Post('annual-reports/:year/publish')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('rankings.report.approve')
  publishAnnualReport(
    @CurrentUser() user: IUser,
    @Param('year') year: string,
  ) {
    return this.reportService.publishAnnualReport(user, Number(year));
  }
}
