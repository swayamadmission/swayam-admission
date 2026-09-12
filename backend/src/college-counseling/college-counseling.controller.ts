import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CollegeCounselingService } from './college-counseling.service';
import {
  CreateRecommendationDto,
  CreateShortlistDto,
  CreateSelectionDto,
  InitiateApplicationDto,
  UpdateRequirementProfileDto,
  CreateCounselingNoteDto,
} from './dto/counseling.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller()
@UseGuards(JwtAuthGuard)
export class CollegeCounselingController {
  constructor(private readonly counselingService: CollegeCounselingService) {}

  // ==========================================
  // STUDENT SELF ENDPOINTS
  // ==========================================

  @Get('students/me/requirement-profile')
  getStudentMyRequirementProfile(@CurrentUser() user: IUser) {
    return this.counselingService.getRequirementProfile(user, user.id);
  }

  @Patch('students/me/requirement-profile')
  updateStudentMyRequirementProfile(
    @CurrentUser() user: IUser,
    @Body() dto: UpdateRequirementProfileDto,
  ) {
    return this.counselingService.updateRequirementProfile(user, user.id, dto);
  }

  @Get('students/me/college-recommendations')
  getStudentMyRecommendations(@CurrentUser() user: IUser) {
    return this.counselingService.getStudentRecommendations(user, user.id);
  }

  @Patch('students/me/college-recommendations/:id/decline')
  declineRecommendation(
    @CurrentUser() user: IUser,
    @Param('id') recommendationId: string,
  ) {
    return this.counselingService.declineRecommendation(user, recommendationId);
  }

  @Get('students/me/college-shortlist')
  getStudentMyShortlist(@CurrentUser() user: IUser) {
    return this.counselingService.getShortlist(user, user.id);
  }

  @Post('students/me/college-shortlist')
  addToShortlist(
    @CurrentUser() user: IUser,
    @Body() dto: CreateShortlistDto,
  ) {
    return this.counselingService.addToShortlist(user, dto);
  }

  @Delete('students/me/college-shortlist/:id')
  removeFromShortlist(
    @CurrentUser() user: IUser,
    @Param('id') shortlistId: string,
  ) {
    return this.counselingService.removeFromShortlist(user, shortlistId);
  }

  @Get('students/me/college-selection')
  getStudentMySelection(@CurrentUser() user: IUser) {
    return this.counselingService.getSelection(user, user.id);
  }

  @Post('students/me/college-selection')
  createStudentMySelection(
    @CurrentUser() user: IUser,
    @Body() dto: CreateSelectionDto,
  ) {
    return this.counselingService.createSelection(user, user.id, dto);
  }

  @Post('students/me/applications/initiate')
  initiateMyApplication(
    @CurrentUser() user: IUser,
    @Body() dto: InitiateApplicationDto,
  ) {
    return this.counselingService.initiateApplication(user, user.id, dto);
  }

  @Post('applications/initiate')
  initiateApplicationAlias(
    @CurrentUser() user: IUser,
    @Body() dto: InitiateApplicationDto,
  ) {
    return this.counselingService.initiateApplication(user, user.id, dto);
  }

  // ==========================================
  // COUNSELOR / STAFF / ADMIN SCOPED ENDPOINTS
  // ==========================================

  @Get('counselor/students/:studentId/requirement-profile')
  @UseGuards(PermissionGuard)
  @Permissions('student.view')
  getRequirementProfile(
    @CurrentUser() user: IUser,
    @Param('studentId') studentId: string,
  ) {
    return this.counselingService.getRequirementProfile(user, studentId);
  }

  @Patch('counselor/students/:studentId/requirement-profile')
  @UseGuards(PermissionGuard)
  @Permissions('student.edit')
  updateRequirementProfile(
    @CurrentUser() user: IUser,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateRequirementProfileDto,
  ) {
    return this.counselingService.updateRequirementProfile(user, studentId, dto);
  }

  @Get('counselor/students/:studentId/college-recommendations')
  @UseGuards(PermissionGuard)
  @Permissions('student.view')
  getStudentRecommendations(
    @CurrentUser() user: IUser,
    @Param('studentId') studentId: string,
  ) {
    return this.counselingService.getStudentRecommendations(user, studentId);
  }

  @Post('counselor/students/:studentId/college-recommendations')
  @UseGuards(PermissionGuard)
  @Permissions('student.edit')
  createRecommendation(
    @CurrentUser() user: IUser,
    @Param('studentId') studentId: string,
    @Body() dto: CreateRecommendationDto,
  ) {
    return this.counselingService.createRecommendation(user, studentId, dto);
  }

  @Get('counselor/students/:studentId/shortlist')
  @UseGuards(PermissionGuard)
  @Permissions('student.view')
  getStudentShortlist(
    @CurrentUser() user: IUser,
    @Param('studentId') studentId: string,
  ) {
    return this.counselingService.getShortlist(user, studentId);
  }

  @Post('counselor/students/:studentId/counseling-notes')
  @UseGuards(PermissionGuard)
  @Permissions('student.edit')
  createCounselingNote(
    @CurrentUser() user: IUser,
    @Param('studentId') studentId: string,
    @Body() dto: CreateCounselingNoteDto,
  ) {
    return this.counselingService.createCounselingNote(user, studentId, dto);
  }

  @Post('counselor/students/:studentId/college-selection')
  @UseGuards(PermissionGuard)
  @Permissions('student.edit')
  createSelectionForStudent(
    @CurrentUser() user: IUser,
    @Param('studentId') studentId: string,
    @Body() dto: CreateSelectionDto,
  ) {
    return this.counselingService.createSelection(user, studentId, dto);
  }

  @Post('counselor/students/:studentId/applications/initiate')
  @UseGuards(PermissionGuard)
  @Permissions('application.create')
  initiateApplicationForStudent(
    @CurrentUser() user: IUser,
    @Param('studentId') studentId: string,
    @Body() dto: InitiateApplicationDto,
  ) {
    return this.counselingService.initiateApplication(user, studentId, dto);
  }
}
