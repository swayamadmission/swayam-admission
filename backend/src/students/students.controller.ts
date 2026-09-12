import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { AssignCounselorDto } from './dto/assign-counselor.dto';
import { SendStudentNotificationDto } from './dto/send-notification.dto';
import { CreateStudentNoteDto } from './dto/create-note.dto';
import { CreateStudentCommunicationDto } from './dto/create-communication.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('students')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  /**
   * GET /students (List with pagination, search & filters)
   */
  @Get()
  @Permissions('student.view')
  getAllStudents(
    @CurrentUser() user: IUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('isApproved') isApproved?: string,
    @Query('status') status?: string,
    @Query('state') state?: string,
    @Query('district') district?: string,
    @Query('counselorId') counselorId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.studentsService.getAllStudents(
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        q,
        isApproved,
        status,
        state,
        district,
        counselorId,
        sortBy,
        sortOrder,
      },
      user,
    );
  }

  /**
   * 1. GET /students/:id
   */
  @Get(':id')
  @Permissions('student.view')
  getStudentById(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.studentsService.getStudentById(id, user);
  }

  /**
   * 2. PATCH /students/:id
   */
  @Patch(':id')
  @Permissions('student.edit')
  updateStudent(
    @Param('id') id: string,
    @Body() dto: UpdateStudentProfileDto,
    @CurrentUser() user: IUser,
  ) {
    return this.studentsService.updateStudent(id, dto, user?.id);
  }

  /**
   * 3. GET /students/:id/overview
   */
  @Get(':id/overview')
  @Permissions('student.view')
  getOverview(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.studentsService.getOverview(id, user);
  }

  /**
   * 4. GET /students/:id/applications
   */
  @Get(':id/applications')
  @Permissions('student.view')
  getApplications(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.studentsService.getApplications(id, user);
  }

  /**
   * 5. GET /students/:id/documents
   */
  @Get(':id/documents')
  @Permissions('student.view')
  getDocuments(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.studentsService.getDocuments(id, user);
  }

  /**
   * 6. GET /students/:id/payments
   */
  @Get(':id/payments')
  @Permissions('student.view')
  getPayments(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.studentsService.getPayments(id, user);
  }

  /**
   * 7. GET /students/:id/timeline
   */
  @Get(':id/timeline')
  @Permissions('student.view')
  getTimeline(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.studentsService.getTimeline(id, user);
  }

  /**
   * 8. GET /students/:id/activity
   */
  @Get(':id/activity')
  @Permissions('student.view')
  getActivity(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.studentsService.getActivity(id, user);
  }

  /**
   * 9. GET /students/:id/counselor
   */
  @Get(':id/counselor')
  @Permissions('student.view')
  getCounselor(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.studentsService.getCounselor(id, user);
  }

  /**
   * 10. GET /students/:id/notes
   */
  @Get(':id/notes')
  @Permissions('student.view')
  getNotes(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.studentsService.getNotes(id, user);
  }

  /**
   * POST /students/:id/notes
   */
  @Post(':id/notes')
  @Permissions('student.edit')
  createNote(
    @Param('id') id: string,
    @Body() dto: CreateStudentNoteDto,
    @CurrentUser() user: IUser,
  ) {
    return this.studentsService.createNote(id, dto, user.id);
  }

  /**
   * 11. GET /students/:id/support
   */
  @Get(':id/support')
  @Permissions('student.view')
  getSupport(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.studentsService.getSupport(id, user);
  }

  /**
   * 12. GET /students/:id/analytics
   */
  @Get(':id/analytics')
  @Permissions('student.view')
  getAnalytics(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.studentsService.getAnalytics(id, user);
  }

  /**
   * 13. GET /students/:id/communication
   */
  @Get(':id/communication')
  @Permissions('student.view')
  getCommunication(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.studentsService.getCommunication(id, user);
  }

  /**
   * POST /students/:id/communication
   */
  @Post(':id/communication')
  @Permissions('student.edit')
  createCommunication(
    @Param('id') id: string,
    @Body() dto: CreateStudentCommunicationDto,
    @CurrentUser() user: IUser,
  ) {
    return this.studentsService.createCommunication(id, dto, user?.id);
  }

  /**
   * 14. POST /students/:id/assign-counselor
   */
  @Post(':id/assign-counselor')
  @Permissions('student.assign')
  assignCounselor(
    @Param('id') id: string,
    @Body() dto: AssignCounselorDto,
    @CurrentUser() user: IUser,
  ) {
    return this.studentsService.assignCounselor(id, dto, user?.id);
  }

  /**
   * 15. POST /students/:id/send-notification
   */
  @Post(':id/send-notification')
  @Permissions('notification.send')
  sendNotification(
    @Param('id') id: string,
    @Body() dto: SendStudentNotificationDto,
    @CurrentUser() user: IUser,
  ) {
    return this.studentsService.sendNotification(id, dto, user?.id);
  }

  /**
   * 16. POST /students/:id/export
   */
  @Post(':id/export')
  @Permissions('student.export')
  exportProfile(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.studentsService.exportProfile(id, user?.id);
  }
}
