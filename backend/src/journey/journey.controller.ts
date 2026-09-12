import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JourneyService } from './journey.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';
import { SubmitCounselorReviewDto } from './dto/counselor-review.dto';
import { SubmitCollegeReviewDto } from './dto/college-review.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  /**
   * Logged-in Student: Full Unified Journey
   */
  @Get('student/journey')
  async getStudentJourney(@CurrentUser() user: IUser) {
    return this.journeyService.getStudentJourney(user.id);
  }

  /**
   * Logged-in Student: Specific Application Journey
   */
  @Get('student/journey/applications/:applicationId')
  async getStudentApplicationJourney(
    @CurrentUser() user: IUser,
    @Param('applicationId') applicationId: string,
  ) {
    return this.journeyService.getApplicationJourney(applicationId, user.id);
  }

  @Get('student/journey/progress')
  async getProgress(@CurrentUser() user: IUser) {
    const journey = await this.journeyService.getStudentJourney(user.id);
    return journey.progress;
  }

  @Get('student/journey/timeline')
  async getTimeline(@CurrentUser() user: IUser) {
    const journey = await this.journeyService.getStudentJourney(user.id);
    return journey.timeline;
  }

  @Get('student/journey/checklist')
  async getChecklist(@CurrentUser() user: IUser) {
    const journey = await this.journeyService.getStudentJourney(user.id);
    return journey.checklist;
  }

  @Get('student/journey/upcoming')
  async getUpcoming(@CurrentUser() user: IUser) {
    const journey = await this.journeyService.getStudentJourney(user.id);
    return journey.upcomingTasks;
  }

  @Get('student/journey/activity')
  async getActivity(@CurrentUser() user: IUser) {
    const journey = await this.journeyService.getStudentJourney(user.id);
    return journey.timeline.filter(
      (t) =>
        t.type === 'ACCOUNT' || t.type === 'PROFILE' || t.type === 'DOCUMENT',
    );
  }

  @Get('student/journey/reviews')
  async getReviews(@CurrentUser() user: IUser) {
    return this.journeyService.getStudentReviews(user.id);
  }

  @Post('student/counselor/request')
  async requestCounselor(
    @CurrentUser() user: IUser,
    @Body() body: { applicationId?: string; remarks?: string },
  ) {
    return this.journeyService.requestCounselor(user.id, body);
  }

  @Get('student/counselor/request-status')
  async getCounselorRequestStatus(@CurrentUser() user: IUser) {
    return this.journeyService.getCounselorRequestStatus(user.id);
  }

  @Post('student/journey/counselor-review')
  async submitCounselorReview(
    @CurrentUser() user: IUser,
    @Body() dto: SubmitCounselorReviewDto,
  ) {
    return this.journeyService.submitCounselorReview(user.id, dto);
  }

  @Post('student/journey/college-review')
  async submitCollegeReview(
    @CurrentUser() user: IUser,
    @Body() dto: SubmitCollegeReviewDto,
  ) {
    return this.journeyService.submitCollegeReview(user.id, dto);
  }

  @Get('student/journey/applications')
  async getApplications(@CurrentUser() user: IUser) {
    const journey = await this.journeyService.getStudentJourney(user.id);
    return journey.applications;
  }

  @Get('student/journey/documents')
  async getDocuments(@CurrentUser() user: IUser) {
    const journey = await this.journeyService.getStudentJourney(user.id);
    return journey.documents;
  }

  @Get('student/journey/payments')
  async getPayments(@CurrentUser() user: IUser) {
    const journey = await this.journeyService.getStudentJourney(user.id);
    return journey.payments;
  }

  @Get('student/journey/scholarships')
  async getScholarships() {
    return { eligible: [], applied: [], approved: [] };
  }

  @Get('student/journey/counselor')
  async getCounselor(@CurrentUser() user: IUser) {
    const journey = await this.journeyService.getStudentJourney(user.id);
    return journey.assignedCounselor;
  }

  @Get('student/journey/ai')
  async getAiSummary(@CurrentUser() user: IUser) {
    const journey = await this.journeyService.getStudentJourney(user.id);
    return (journey as any).aiRecommendations || [];
  }

  @Get('student/journey/export/csv')
  async exportCsv(@CurrentUser() user: IUser, @Res() res: Response) {
    const csvContent = await this.journeyService.exportCsv(user.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=admission_journey_${user.id}.csv`,
    );
    return res.send(csvContent);
  }

  @Get('student/journey/export/pdf')
  async exportPdf(@CurrentUser() user: IUser, @Res() res: Response) {
    const csvContent = await this.journeyService.exportCsv(user.id);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=admission_journey_${user.id}.txt`,
    );
    return res.send(csvContent);
  }

  // ==========================================
  // STAFF & COUNSELOR JOURNEY ENDPOINTS
  // ==========================================

  /**
   * Counselor: View Assigned Student's Overall & Application Journeys
   */
  @Get('counselor/students/:studentId/journey')
  @Permissions('lead.view', 'student.view')
  async getCounselorStudentJourney(
    @CurrentUser() actor: IUser,
    @Param('studentId') studentId: string,
  ) {
    return this.journeyService.getUnifiedStudentJourneyPayload(
      studentId,
      actor.id,
    );
  }

  /**
   * Counselor: View Target Application Journey
   */
  @Get('counselor/applications/:applicationId/journey')
  @Permissions('lead.view', 'student.view')
  async getCounselorApplicationJourney(
    @CurrentUser() actor: IUser,
    @Param('applicationId') applicationId: string,
  ) {
    return this.journeyService.getApplicationJourney(applicationId, actor.id);
  }

  /**
   * Senior Counselor: View Scoped Student's Journey
   */
  @Get('senior-counselor/students/:studentId/journey')
  @Permissions('lead.view', 'student.view')
  async getSeniorCounselorStudentJourney(
    @CurrentUser() actor: IUser,
    @Param('studentId') studentId: string,
  ) {
    return this.journeyService.getUnifiedStudentJourneyPayload(
      studentId,
      actor.id,
    );
  }

  /**
   * Admin: View Student's Journey (IAM Guarded)
   */
  @Get('admin/students/:studentId/journey')
  @Permissions('lead.view', 'student.view')
  async getAdminStudentJourney(
    @CurrentUser() actor: IUser,
    @Param('studentId') studentId: string,
  ) {
    return this.journeyService.getUnifiedStudentJourneyPayload(
      studentId,
      actor.id,
    );
  }
}
