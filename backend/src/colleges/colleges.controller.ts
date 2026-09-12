import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { CollegesService } from './colleges.service';
import { CreateCollegeDto } from './dto/create-college.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('colleges')
export class CollegesController {
  constructor(private collegesService: CollegesService) {}

  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.view')
  getDashboardStats() {
    return this.collegesService.getDashboardStats();
  }

  @Get()
  getAllColleges(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('budgetMin') budgetMin?: string,
    @Query('budgetMax') budgetMax?: string,
    @Query('placementMin') placementMin?: string,
    @Query('ownership') ownership?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('hostel') hostel?: string,
    @Query('approval') approval?: string,
    @Query('naacGrade') naacGrade?: string,
    @Query('featured') featured?: string,
    @Query('status') status?: string,
  ) {
    return this.collegesService.getAllColleges({
      q,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      budgetMin: budgetMin ? parseFloat(budgetMin) : undefined,
      budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
      placementMin: placementMin ? parseFloat(placementMin) : undefined,
      ownership,
      state,
      city,
      hostel: hostel === 'true' ? true : hostel === 'false' ? false : undefined,
      approval,
      naacGrade,
      featured:
        featured === 'true' ? true : featured === 'false' ? false : undefined,
      status,
    });
  }

  @Get('compare')
  compareColleges(@Query('ids') ids: string) {
    if (!ids) {
      return [];
    }
    const idArray = ids.split(',');
    return this.collegesService.compareColleges(idArray);
  }

  @Get(':id')
  getCollegeById(@Param('id') id: string) {
    return this.collegesService.getCollegeById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.create')
  createCollege(@Body() dto: CreateCollegeDto, @CurrentUser() user: IUser) {
    return this.collegesService.createCollege(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.edit')
  updateCollege(
    @Param('id') id: string,
    @Body() dto: CreateCollegeDto,
    @CurrentUser() user: IUser,
  ) {
    return this.collegesService.updateCollege(id, dto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.delete')
  deactivateCollege(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.collegesService.deactivateCollege(id, user.id);
  }

  @Post(':collegeId/courses')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.edit')
  addCourse(
    @Param('collegeId') collegeId: string,
    @Body() dto: CreateCourseDto,
  ) {
    return this.collegesService.addCourse(collegeId, dto);
  }

  @Delete('courses/:courseId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.edit')
  deactivateCourse(@Param('courseId') courseId: string) {
    return this.collegesService.deactivateCourse(courseId);
  }

  // =========================================================================
  // COLLEGE VERIFICATION & STATUS
  // =========================================================================

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.verify')
  verifyCollege(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.collegesService.verifyCollege(id, user.id);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.verify')
  activateCollege(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.collegesService.activateCollege(id, user.id);
  }

  @Post(':id/suspend')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.verify')
  suspendCollege(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: IUser,
  ) {
    return this.collegesService.suspendCollege(id, user.id, reason);
  }

  // =========================================================================
  // COLLEGE PORTAL METRICS
  // =========================================================================

  @Get(':id/portal-metrics')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.view', 'college.application.view')
  getCollegePortalMetrics(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.collegesService.getCollegePortalMetrics(id, user.id);
  }

  // =========================================================================
  // COLLEGE STAFF
  // =========================================================================

  @Get(':id/staff')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.staff.view', 'college.view')
  getCollegeStaff(@Param('id') id: string) {
    return this.collegesService.getCollegeStaff(id);
  }

  @Post(':id/staff')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.staff.manage')
  inviteCollegeStaff(
    @Param('id') id: string,
    @Body()
    dto: {
      fullName: string;
      email: string;
      mobile: string;
      roleSlug?: string;
      designation?: string;
      password?: string;
    },
    @CurrentUser() user: IUser,
  ) {
    return this.collegesService.inviteCollegeStaff(id, dto, user.id);
  }

  @Patch(':id/staff/:staffUserId/status')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.staff.manage')
  updateCollegeStaffStatus(
    @Param('id') id: string,
    @Param('staffUserId') staffUserId: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser() user: IUser,
  ) {
    return this.collegesService.updateCollegeStaffStatus(
      id,
      staffUserId,
      isActive,
      user.id,
    );
  }

  // =========================================================================
  // COLLEGE COMPLIANCE DOCUMENTS
  // =========================================================================

  @Get(':id/documents')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.documents.view', 'college.view')
  getCollegeDocuments(@Param('id') id: string) {
    return this.collegesService.getCollegeDocuments(id);
  }

  @Post(':id/documents')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.documents.upload')
  createCollegeDocument(
    @Param('id') id: string,
    @Body()
    dto: {
      type: string;
      title: string;
      fileName: string;
      fileUrl: string;
      mimeType: string;
      fileSize?: number;
      validFrom?: Date;
      validUntil?: Date;
    },
    @CurrentUser() user: IUser,
  ) {
    return this.collegesService.createCollegeDocument(id, dto, user.id);
  }

  @Delete(':id/documents/:docId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.documents.upload')
  deleteCollegeDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.collegesService.deleteCollegeDocument(id, docId);
  }

  // =========================================================================
  // CHANGE REQUESTS GOVERNANCE
  // =========================================================================

  @Get('change-requests')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.view')
  getChangeRequests(@Query('collegeId') collegeId?: string) {
    return this.collegesService.getChangeRequests(collegeId);
  }

  @Post(':id/change-requests')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.edit')
  submitChangeRequest(
    @Param('id') id: string,
    @Body()
    dto: {
      offeringId?: string;
      requestType: string;
      title: string;
      description?: string;
      currentData?: any;
      proposedData: any;
    },
    @CurrentUser() user: IUser,
  ) {
    return this.collegesService.submitChangeRequest(id, dto, user.id);
  }

  @Post('change-requests/:requestId/review')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.verify')
  reviewChangeRequest(
    @Param('requestId') requestId: string,
    @Body() dto: { status: 'APPROVED' | 'REJECTED'; remarks?: string },
    @CurrentUser() user: IUser,
  ) {
    return this.collegesService.reviewChangeRequest(requestId, dto, user.id);
  }
}

