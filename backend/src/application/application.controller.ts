import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationQueryDto } from './dto/application-query.dto';
import { AssignCounselorDto } from './dto/assign-counselor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  create(@CurrentUser() user: IUser, @Body() dto: CreateApplicationDto) {
    return this.applicationService.createApplication(user.id, dto);
  }

  @Get('dashboard/stats')
  @UseGuards(PermissionGuard)
  @Permissions('application.view')
  getStats(@CurrentUser() user: IUser) {
    return this.applicationService.getDashboardStats(user?.id);
  }

  @Get('quota')
  getQuota(@CurrentUser() user: IUser) {
    return this.applicationService.getApplicationQuota(user.id);
  }

  @Get('me/quota')
  getMyQuota(@CurrentUser() user: IUser) {
    return this.applicationService.getApplicationQuota(user.id);
  }

  @Get('me')
  findMyApplications(@CurrentUser() user: IUser) {
    return this.applicationService.findMyApplications(user.id);
  }

  @Get('student/applications')
  findStudentApplications(@CurrentUser() user: IUser) {
    return this.applicationService.findMyApplications(user.id);
  }

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('application.view')
  findAll(@Query() query: ApplicationQueryDto, @CurrentUser() user: IUser) {
    return this.applicationService.findAll(query, user?.id);
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permissions('application.view')
  findOne(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.applicationService.findOne(id, user?.id);
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @Permissions('application.edit')
  update(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationService.update(id, user.id, dto);
  }

  @Patch(':id/status')
  @UseGuards(PermissionGuard)
  @Permissions('application.edit')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationService.updateStatus(id, user.id, dto);
  }

  @Patch(':id/assign')
  @UseGuards(PermissionGuard)
  @Permissions('application.assign')
  assignCounselor(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: AssignCounselorDto,
  ) {
    return this.applicationService.assignCounselor(
      id,
      dto.counselorId,
      user.id,
    );
  }

  @Patch(':id/assign-college')
  @UseGuards(PermissionGuard)
  @Permissions('application.assign')
  assignCollege(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body('collegeId') collegeId: string,
  ) {
    return this.applicationService.assignCollege(id, collegeId, user.id);
  }

  @Patch(':id/verify-documents')
  @UseGuards(PermissionGuard)
  @Permissions('document.verify')
  verifyDocuments(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.applicationService.verifyDocuments(id, user.id);
  }

  @Get(':id/progress')
  getProgress(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.applicationService.getApplicationProgress(id, user);
  }

  @Patch(':id/draft')
  saveDraft(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: import('./dto/application-workflow.dto').SaveApplicationDraftDto,
  ) {
    return this.applicationService.saveDraft(id, user, dto);
  }

  @Get(':id/declarations')
  getDeclarations(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.applicationService.getDeclarations(id, user);
  }

  @Patch(':id/declarations')
  saveDeclarations(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: import('./dto/application-workflow.dto').SaveApplicationDeclarationsDto,
  ) {
    return this.applicationService.saveDeclarations(id, user, dto);
  }

  @Post(':id/initiate-payment')
  initiatePayment(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: import('./dto/application-workflow.dto').InitiatePaymentDto,
  ) {
    return this.applicationService.initiatePayment(id, user, dto);
  }

  @Post(':id/submit')
  submitApplication(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: import('./dto/application-workflow.dto').SubmitApplicationDto,
  ) {
    return this.applicationService.submitApplication(id, user, dto);
  }

  @Post(':id/request-correction')
  @UseGuards(PermissionGuard)
  @Permissions('application.edit')
  requestCorrection(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: import('./dto/application-workflow.dto').RequestCorrectionDto,
  ) {
    return this.applicationService.requestCorrection(id, user, dto);
  }

  @Post(':id/withdraw')
  withdrawApplication(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: import('./dto/application-workflow.dto').WithdrawApplicationDto,
  ) {
    return this.applicationService.withdrawApplication(id, user, dto);
  }

  @Get('review-queue')
  @UseGuards(PermissionGuard)
  @Permissions('application.view')
  getReviewQueue(
    @Query() query: import('./dto/admission-review.dto').ReviewQueueQueryDto,
    @CurrentUser() user: IUser,
  ) {
    return this.applicationService.getReviewQueue(query, user);
  }

  @Post(':id/claim-review')
  @UseGuards(PermissionGuard)
  @Permissions('application.review')
  claimReview(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: import('./dto/admission-review.dto').ClaimReviewDto,
  ) {
    return this.applicationService.claimReview(id, user, dto);
  }

  @Post(':id/start-review')
  @UseGuards(PermissionGuard)
  @Permissions('application.review')
  startReview(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.applicationService.startReview(id, user);
  }

  @Post(':id/approve')
  @UseGuards(PermissionGuard)
  @Permissions('application.approve')
  approveAdmission(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: import('./dto/admission-review.dto').ApproveAdmissionDto,
  ) {
    return this.applicationService.approveAdmission(id, user, dto);
  }

  @Post(':id/reject')
  @UseGuards(PermissionGuard)
  @Permissions('application.reject')
  rejectAdmission(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: import('./dto/admission-review.dto').RejectAdmissionDto,
  ) {
    return this.applicationService.rejectAdmission(id, user, dto);
  }

  @Post(':id/reopen')
  @UseGuards(PermissionGuard)
  @Permissions('application.reopen')
  reopenDecision(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: import('./dto/admission-review.dto').ReopenDecisionDto,
  ) {
    return this.applicationService.reopenDecision(id, user, dto);
  }

  @Post(':id/reassign-reviewer')
  @UseGuards(PermissionGuard)
  @Permissions('application.edit')
  reassignReviewer(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: import('./dto/admission-review.dto').ReassignReviewerDto,
  ) {
    return this.applicationService.reassignReviewer(id, user, dto);
  }
}
