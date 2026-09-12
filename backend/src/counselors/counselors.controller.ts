import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CounselorsService } from './counselors.service';
import { CreateCounselorDto } from './dto/create-counselor.dto';
import { UpdateCounselorDto } from './dto/update-counselor.dto';
import {
  AssignStudentDto,
  AssignLeadDto,
  AssignApplicationDto,
  UnassignCounselorDto,
  ReassignCounselorDto,
} from './dto/assign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('counselors')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CounselorsController {
  constructor(private readonly counselorsService: CounselorsService) {}

  @Get('stats')
  @Permissions('counselor.view')
  getCounselorStats(@CurrentUser() user: IUser) {
    return this.counselorsService.getCounselorStats(undefined, user);
  }

  @Get('performance')
  @Permissions('counselor.view')
  getPerformance(
    @CurrentUser() user: IUser,
    @Query('counselorId') counselorId?: string,
  ) {
    return this.counselorsService.getPerformance(counselorId, user);
  }

  @Get('revenue')
  @Permissions('counselor.view')
  getRevenue(
    @CurrentUser() user: IUser,
    @Query('counselorId') counselorId?: string,
  ) {
    return this.counselorsService.getRevenue(counselorId, user);
  }

  @Get('commission')
  @Permissions('counselor.view')
  getCommission(
    @CurrentUser() user: IUser,
    @Query('counselorId') counselorId?: string,
  ) {
    return this.counselorsService.getCommission(counselorId, user);
  }

  @Get('activity')
  @Permissions('counselor.view')
  getActivity(
    @CurrentUser() user: IUser,
    @Query('counselorId') counselorId?: string,
  ) {
    return this.counselorsService.getActivity(counselorId, user);
  }

  @Get('students')
  @Permissions('counselor.view')
  getStudents(
    @CurrentUser() user: IUser,
    @Query('counselorId') counselorId?: string,
  ) {
    return this.counselorsService.getStudents(counselorId, user);
  }

  @Get('leads')
  @Permissions('counselor.view')
  getLeads(
    @CurrentUser() user: IUser,
    @Query('counselorId') counselorId?: string,
  ) {
    return this.counselorsService.getLeads(counselorId, user);
  }

  @Get('applications')
  @Permissions('counselor.view')
  getApplications(
    @CurrentUser() user: IUser,
    @Query('counselorId') counselorId?: string,
  ) {
    return this.counselorsService.getApplications(counselorId, user);
  }

  @Get('dashboard')
  @Permissions('counselor.view')
  getDashboard(@CurrentUser() user: IUser) {
    return this.counselorsService.getCounselorDashboard(user);
  }

  @Get()
  @Permissions('counselor.view')
  getAllCounselors(
    @CurrentUser() user: IUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('isApproved') isApproved?: string,
    @Query('department') department?: string,
    @Query('state') state?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.counselorsService.getAllCounselors(
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        q,
        isApproved,
        department,
        state,
        sortBy,
        sortOrder,
      },
      user,
    );
  }

  @Get(':id')
  @Permissions('counselor.view')
  getCounselorById(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.counselorsService.getCounselorById(id, user);
  }

  @Post()
  @Permissions('counselor.create')
  createCounselor(
    @CurrentUser() admin: IUser,
    @Body() dto: CreateCounselorDto,
  ) {
    return this.counselorsService.createCounselor(admin.id, dto);
  }

  @Patch(':id')
  @Permissions('counselor.edit')
  updateCounselor(
    @CurrentUser() admin: IUser,
    @Param('id') id: string,
    @Body() dto: UpdateCounselorDto,
  ) {
    return this.counselorsService.updateCounselor(admin.id, id, dto);
  }

  @Delete(':id')
  @Permissions('counselor.delete')
  deleteCounselor(@CurrentUser() admin: IUser, @Param('id') id: string) {
    return this.counselorsService.deleteCounselor(admin.id, id);
  }

  @Post('assign/student')
  @Permissions('counselor.assign')
  assignStudent(@CurrentUser() admin: IUser, @Body() dto: AssignStudentDto) {
    return this.counselorsService.assignStudent(admin.id, dto);
  }

  @Post('assign/lead')
  @Permissions('counselor.assign')
  assignLead(@CurrentUser() admin: IUser, @Body() dto: AssignLeadDto) {
    return this.counselorsService.assignLead(admin.id, dto);
  }

  @Post('assign/application')
  @Permissions('counselor.assign')
  assignApplication(
    @CurrentUser() admin: IUser,
    @Body() dto: AssignApplicationDto,
  ) {
    return this.counselorsService.assignApplication(admin.id, dto);
  }

  @Post('unassign')
  @Permissions('counselor.assign')
  unassignCounselor(
    @CurrentUser() admin: IUser,
    @Body() dto: UnassignCounselorDto,
  ) {
    return this.counselorsService.unassignCounselor(admin.id, dto);
  }

  @Post('reassign')
  @Permissions('counselor.assign')
  reassignCounselor(
    @CurrentUser() admin: IUser,
    @Body() dto: ReassignCounselorDto,
  ) {
    return this.counselorsService.reassignCounselor(admin.id, dto);
  }
}
