import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { HrService } from './hr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import {
  UpdateApplicationStatusDto,
  AssignRecruiterDto,
  AddNoteDto,
  ScheduleInterviewDto,
  UpdateInterviewDto,
  UpdateRecruitmentSettingsDto,
  CreateOfferDto,
  RespondOfferDto,
  UpdateClearanceItemDto,
  CompleteClearanceDto,
  StartOnboardingDto,
  CompleteOnboardingDto,
} from './dto/application.dto';

@UseGuards(JwtAuthGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // ==========================================
  // 1. RECRUITMENT SETTINGS
  // ==========================================

  @Get('settings')
  getSettings() {
    return this.hrService.getRecruitmentSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateRecruitmentSettingsDto, @Request() req: any) {
    return this.hrService.updateRecruitmentSettings(dto, req.user.id);
  }

  // ==========================================
  // 2. JOB VACANCIES
  // ==========================================

  @Post('vacancies')
  createVacancy(@Body() dto: CreateVacancyDto, @Request() req: any) {
    return this.hrService.createVacancy(dto, req.user.id);
  }

  @Get('vacancies')
  listVacancies(@Query() query: any) {
    return this.hrService.listVacancies(query);
  }

  @Get('vacancies/:id')
  getVacancy(@Param('id') id: string) {
    return this.hrService.getVacancy(id);
  }

  @Patch('vacancies/:id')
  updateVacancy(
    @Param('id') id: string,
    @Body() dto: Partial<CreateVacancyDto>,
    @Request() req: any,
  ) {
    return this.hrService.updateVacancy(id, dto, req.user.id);
  }

  @Post('vacancies/:id/publish')
  publishVacancy(@Param('id') id: string, @Request() req: any) {
    return this.hrService.changeVacancyStatus(id, 'PUBLISHED', req.user.id);
  }

  @Post('vacancies/:id/pause')
  pauseVacancy(@Param('id') id: string, @Request() req: any) {
    return this.hrService.changeVacancyStatus(id, 'PAUSED', req.user.id);
  }

  @Post('vacancies/:id/resume')
  resumeVacancy(@Param('id') id: string, @Request() req: any) {
    return this.hrService.changeVacancyStatus(id, 'PUBLISHED', req.user.id);
  }

  @Post('vacancies/:id/close')
  closeVacancy(@Param('id') id: string, @Request() req: any) {
    return this.hrService.changeVacancyStatus(id, 'CLOSED', req.user.id);
  }

  @Post('vacancies/:id/archive')
  archiveVacancy(@Param('id') id: string, @Request() req: any) {
    return this.hrService.changeVacancyStatus(id, 'ARCHIVED', req.user.id);
  }

  @Post('vacancies/:id/duplicate')
  duplicateVacancy(@Param('id') id: string, @Request() req: any) {
    return this.hrService.duplicateVacancy(id, req.user.id);
  }

  // ==========================================
  // 3. JOB APPLICATIONS & RECRUITMENT ACTIONS
  // ==========================================

  @Get('applications')
  getApplications(@Query() query: any) {
    return this.hrService.getApplications(query);
  }

  @Get('applications/:id')
  getApplication(@Param('id') id: string) {
    return this.hrService.getApplicationById(id);
  }

  @Patch('applications/:id/status')
  updateApplicationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
    @Request() req: any,
  ) {
    return this.hrService.updateApplicationStatus(id, dto, req.user.id);
  }

  @Post('applications/:id/assign')
  assignRecruiter(
    @Param('id') id: string,
    @Body() dto: AssignRecruiterDto,
    @Request() req: any,
  ) {
    return this.hrService.assignRecruiter(id, dto, req.user.id);
  }

  @Post('applications/:id/notes')
  addInternalNote(
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
    @Request() req: any,
  ) {
    return this.hrService.addInternalNote(id, dto, req.user.id);
  }

  @Post('applications/:id/interviews')
  scheduleInterview(
    @Param('id') applicationId: string,
    @Body() dto: ScheduleInterviewDto,
    @Request() req: any,
  ) {
    return this.hrService.scheduleInterview(applicationId, dto, req.user.id);
  }

  @Patch('interviews/:interviewId')
  updateInterview(
    @Param('interviewId') interviewId: string,
    @Body() dto: UpdateInterviewDto,
    @Request() req: any,
  ) {
    return this.hrService.updateInterview(interviewId, dto, req.user.id);
  }

  @Post('applications/:id/archive')
  archiveApplication(@Param('id') id: string, @Request() req: any) {
    return this.hrService.archiveApplication(id, req.user.id);
  }

  @Post('applications/:id/restore')
  restoreApplication(@Param('id') id: string, @Request() req: any) {
    return this.hrService.restoreApplication(id, req.user.id);
  }

  @Get('recruiters')
  getRecruitmentStaff() {
    return this.hrService.getRecruitmentStaff();
  }

  // ==========================================
  // 4. POST-SELECTION: OFFERS
  // ==========================================

  @Post('offers')
  createOffer(@Body() dto: CreateOfferDto, @Request() req: any) {
    return this.hrService.createOffer(dto, req.user.id);
  }

  @Get('applications/:id/offer')
  getOfferByApplicationId(@Param('id') id: string) {
    return this.hrService.getOfferByApplicationId(id);
  }

  @Post('offers/:id/send')
  sendOffer(@Param('id') id: string, @Request() req: any) {
    return this.hrService.sendOffer(id, req.user.id);
  }

  @Post('offers/:id/resend')
  resendOffer(@Param('id') id: string, @Request() req: any) {
    return this.hrService.resendOffer(id, req.user.id);
  }

  @Post('offers/:id/cancel')
  cancelOffer(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    return this.hrService.cancelOffer(id, reason || 'Cancelled by HR', req.user.id);
  }

  @Post('offers/:id/respond')
  respondOffer(@Param('id') id: string, @Body() dto: RespondOfferDto, @Request() req: any) {
    return this.hrService.respondToOffer(id, dto, req.user.id);
  }

  // ==========================================
  // 5. POST-SELECTION: CLEARANCE & VERIFICATION
  // ==========================================

  @Get('clearance')
  getClearances() {
    return this.hrService.getClearances();
  }

  @Put('clearance/:id')
  updateClearanceStatus(
    @Param('id') clearanceId: string,
    @Body('status') status: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    return this.hrService.updateClearanceStatus(clearanceId, status, req.user.id, notes);
  }

  @Post('applications/:id/clearance/start')
  startClearance(@Param('id') id: string, @Request() req: any) {
    return this.hrService.startClearance(id, req.user.id);
  }

  @Get('applications/:id/clearance')
  getClearanceByApplicationId(@Param('id') id: string) {
    return this.hrService.getClearanceByApplicationId(id);
  }

  @Patch('clearance/items/:itemId')
  updateClearanceItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateClearanceItemDto,
    @Request() req: any,
  ) {
    return this.hrService.updateClearanceItem(itemId, dto, req.user.id);
  }

  @Post('clearance/:id/complete')
  completeClearance(
    @Param('id') id: string,
    @Body() dto: CompleteClearanceDto,
    @Request() req: any,
  ) {
    return this.hrService.completeClearance(id, dto, req.user.id);
  }

  // ==========================================
  // 6. POST-SELECTION: ONBOARDING & STAFF LINKING
  // ==========================================

  @Post('applications/:id/onboarding/start')
  startOnboarding(
    @Param('id') id: string,
    @Body() dto: StartOnboardingDto,
    @Request() req: any,
  ) {
    return this.hrService.startOnboarding(id, dto, req.user.id);
  }

  @Get('applications/:id/onboarding')
  getOnboardingByApplicationId(@Param('id') id: string) {
    return this.hrService.getOnboardingByApplicationId(id);
  }

  @Post('applications/:id/onboarding/complete')
  completeOnboarding(
    @Param('id') id: string,
    @Body() dto: CompleteOnboardingDto,
    @Request() req: any,
  ) {
    return this.hrService.completeOnboarding(id, dto, req.user.id);
  }
}
