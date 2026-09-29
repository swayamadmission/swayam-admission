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
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CollegesService } from './colleges.service';
import { CollegesBulkService } from './colleges-bulk.service';
import { CreateCollegeDto } from './dto/create-college.dto';
import { UpdateCollegeDto } from './dto/update-college.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('colleges')
export class CollegesController {
  constructor(
    private collegesService: CollegesService,
    private collegesBulkService: CollegesBulkService,
  ) {}

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

  // =========================================================================
  // BULK UPLOAD ENDPOINTS (MUST BE BEFORE :id)
  // =========================================================================

  @Get('bulk/template')
  downloadBulkTemplate(
    @Query('format') format: 'csv' | 'xlsx' = 'xlsx',
    @Res() res: Response,
  ) {
    const template = this.collegesBulkService.generateTemplate(format);
    res.setHeader('Content-Type', template.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
    return res.send(template.buffer);
  }

  @Post('bulk/validate')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.create')
  @UseInterceptors(FileInterceptor('file'))
  async validateBulkUpload(
    @UploadedFile() file?: Express.Multer.File,
    @Body('rows') jsonRows?: any[],
  ) {
    let rowsToValidate: any[] = [];
    if (file && file.buffer) {
      rowsToValidate = this.collegesBulkService.parseFileBuffer(file.buffer);
    } else if (jsonRows && Array.isArray(jsonRows)) {
      rowsToValidate = jsonRows;
    } else {
      throw new BadRequestException('Please provide a file or rows array to validate.');
    }

    const result = await this.collegesBulkService.validateRows(rowsToValidate);
    return { success: true, data: result };
  }

  @Post('bulk/import')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.create')
  async executeBulkImport(
    @Body() dto: { rows: any[]; updateStrategy?: 'UPDATE_EXISTING' | 'SKIP_EXISTING' },
    @CurrentUser() user: IUser,
  ) {
    const strategy = dto.updateStrategy || 'UPDATE_EXISTING';
    const result = await this.collegesBulkService.executeImport(dto.rows, strategy, user.id);
    return { success: true, data: result };
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
    @Body() dto: UpdateCollegeDto,
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

  @Patch('courses/:courseId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.edit')
  updateCourse(
    @Param('courseId') courseId: string,
    @Body() dto: CreateCourseDto,
  ) {
    return this.collegesService.updateCourse(courseId, dto);
  }

  // =========================================================================
  // GALLERY MANAGEMENT
  // =========================================================================

  @Post(':id/gallery')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.edit')
  addGalleryImage(
    @Param('id') id: string,
    @Body() dto: { imageUrl: string; caption?: string; sortOrder?: number; isCover?: boolean },
  ) {
    return this.collegesService.addGalleryImage(id, dto);
  }

  @Patch(':id/gallery/:imageId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.edit')
  updateGalleryImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() dto: { caption?: string; sortOrder?: number; isCover?: boolean },
  ) {
    return this.collegesService.updateGalleryImage(id, imageId, dto);
  }

  @Delete(':id/gallery/:imageId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.edit')
  deleteGalleryImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.collegesService.deleteGalleryImage(id, imageId);
  }

  // =========================================================================
  // STUDY MATERIALS LINKING
  // =========================================================================

  @Get(':id/study-materials')
  getCollegeStudyMaterials(@Param('id') id: string) {
    return this.collegesService.getCollegeStudyMaterials(id);
  }

  @Post(':id/study-materials/link')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.edit')
  linkStudyMaterial(
    @Param('id') id: string,
    @Body('materialId') materialId: string,
  ) {
    return this.collegesService.linkStudyMaterial(id, materialId);
  }

  @Delete(':id/study-materials/:materialId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.edit')
  unlinkStudyMaterial(
    @Param('id') id: string,
    @Param('materialId') materialId: string,
  ) {
    return this.collegesService.unlinkStudyMaterial(id, materialId);
  }

  // =========================================================================
  // PUBLISH / UNPUBLISH STATUS
  // =========================================================================

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.edit')
  setPublishStatus(
    @Param('id') id: string,
    @Body('publish') publish: boolean,
    @CurrentUser() user: IUser,
  ) {
    return this.collegesService.setPublishStatus(id, !!publish, user.id);
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

