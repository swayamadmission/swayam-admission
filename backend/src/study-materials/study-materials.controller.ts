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
  Request,
  Res,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudyMaterialsService } from './study-materials.service';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto';
import { UpdateStudyMaterialDto } from './dto/update-study-material.dto';
import { StudyMaterialQueryDto } from './dto/study-material-query.dto';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

interface ExportMaterialItem {
  id: string;
  title: string;
  slug: string;
  materialType: string;
  category: string;
  subject?: string | null;
  semester?: string | null;
  downloadCount: number;
  viewCount: number;
  fileName?: string | null;
  fileSize?: string | null;
  featured: boolean;
  premium: boolean;
  status: string;
  createdAt: Date | string;
}

@ApiTags('Study Materials')
@Controller('study-materials')
export class StudyMaterialsController {
  constructor(private readonly studyMaterialsService: StudyMaterialsService) {}

  // ── Dashboard Stats ───────────────────────────────────────────────────────
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get digital study materials dashboard statistics' })
  getDashboardStats() {
    return this.studyMaterialsService.getDashboardStats();
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export study materials as CSV' })
  async exportCsv(
    @Query() query: StudyMaterialQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const data = (await this.studyMaterialsService.getExportData(
      query,
    )) as unknown as ExportMaterialItem[];

    const headers = [
      'ID',
      'Title',
      'Slug',
      'Material Type',
      'Category',
      'Subject',
      'Semester',
      'Downloads',
      'Views',
      'File Name',
      'File Size',
      'Featured',
      'Premium',
      'Status',
      'Created At',
    ];

    const rows = data.map((m) =>
      [
        m.id,
        `"${m.title}"`,
        m.slug,
        m.materialType,
        m.category,
        `"${m.subject ?? ''}"`,
        m.semester ?? '',
        m.downloadCount,
        m.viewCount,
        `"${m.fileName ?? ''}"`,
        m.fileSize ?? '',
        m.featured,
        m.premium,
        m.status,
        new Date(m.createdAt).toLocaleDateString('en-IN'),
      ].join(','),
    );

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="study_materials_${Date.now()}.csv"`,
    );
    res.send(csv);
  }

  // ── Recommended ───────────────────────────────────────────────────────────
  @Get('recommended')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get recommended study materials (public or personalized)' })
  getRecommended(
    @Request() req: { user?: { id: string } },
    @Query('category') category?: string,
    @Query('examId') examId?: string,
    @Query('courseId') courseId?: string,
    @Query('materialType') materialType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.studyMaterialsService.getRecommended({
      userId: req.user?.id,
      category,
      examId,
      courseId,
      materialType,
      limit: limit ? parseInt(limit) : 8,
    });
  }

  // ── Latest ────────────────────────────────────────────────────────────────
  @Get('latest')
  @ApiOperation({ summary: 'Get latest published materials (public)' })
  getLatest(@Query('limit') limit?: string) {
    return this.studyMaterialsService.getLatest(limit ? parseInt(limit) : 8);
  }

  // ── Featured ──────────────────────────────────────────────────────────────
  @Get('featured')
  @ApiOperation({ summary: 'Get featured materials (public)' })
  getFeatured(@Query('limit') limit?: string) {
    return this.studyMaterialsService.getFeatured(limit ? parseInt(limit) : 8);
  }

  // ── Popular ───────────────────────────────────────────────────────────────
  @Get('popular')
  @ApiOperation({ summary: 'Get most downloaded materials (public)' })
  getPopular(@Query('limit') limit?: string) {
    return this.studyMaterialsService.getPopular(limit ? parseInt(limit) : 8);
  }

  // ── By College ────────────────────────────────────────────────────────────
  @Get('by-college/:collegeId')
  @ApiOperation({ summary: 'Get study materials linked to a college (public)' })
  findByCollege(
    @Param('collegeId') collegeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.studyMaterialsService.findByCollege(
      collegeId,
      limit ? parseInt(limit) : 10,
    );
  }

  // ── By Course ─────────────────────────────────────────────────────────────
  @Get('by-course/:courseId')
  @ApiOperation({ summary: 'Get study materials linked to a course (public)' })
  findByCourse(
    @Param('courseId') courseId: string,
    @Query('limit') limit?: string,
  ) {
    return this.studyMaterialsService.findByCourse(
      courseId,
      limit ? parseInt(limit) : 10,
    );
  }

  // ── By Exam ───────────────────────────────────────────────────────────────
  @Get('by-exam/:examId')
  @ApiOperation({ summary: 'Get study materials linked to an exam (public)' })
  findByExam(@Param('examId') examId: string, @Query('limit') limit?: string) {
    return this.studyMaterialsService.findByExam(
      examId,
      limit ? parseInt(limit) : 12,
    );
  }

  // ── Bookmarks (Auth) ──────────────────────────────────────────────────────
  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get bookmarked materials for authenticated student',
  })
  getBookmarks(@Request() req: { user: { id: string } }) {
    return this.studyMaterialsService.getBookmarks(req.user.id);
  }

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bookmark a study material' })
  bookmark(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.studyMaterialsService.bookmark(id, req.user.id);
  }

  @Delete(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove bookmark from a study material' })
  unbookmark(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.studyMaterialsService.unbookmark(id, req.user.id);
  }

  // ── History (Auth) ────────────────────────────────────────────────────────
  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get recently viewed materials for authenticated student',
  })
  getHistory(@Request() req: { user: { id: string } }) {
    return this.studyMaterialsService.getHistory(req.user.id);
  }

  // ── My Purchases ──────────────────────────────────────────────────────────
  @Get('my-purchases')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current student purchased premium study materials' })
  getMyPurchases(@Request() req: { user: { id: string } }) {
    return this.studyMaterialsService.getMyPurchases(req.user.id);
  }

  // ── List ──────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'List study materials with filtering and pagination',
  })
  findAll(@Query() query: StudyMaterialQueryDto) {
    return this.studyMaterialsService.findAll(query);
  }

  // ── Detail ────────────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get study material details by ID or slug' })
  findById(@Param('id') id: string) {
    return this.studyMaterialsService.findById(id);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new digital study material record' })
  create(
    @Body() dto: CreateStudyMaterialDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.studyMaterialsService.create(dto, req.user.id);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a study material record' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStudyMaterialDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.studyMaterialsService.update(id, dto, req.user.id);
  }

  // ── Restore ───────────────────────────────────────────────────────────────
  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an archived study material to PUBLISHED' })
  restore(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.studyMaterialsService.restore(id, req.user.id);
  }

  // ── Duplicate ─────────────────────────────────────────────────────────────
  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Duplicate a study material as a DRAFT copy' })
  duplicate(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.studyMaterialsService.duplicate(id, req.user.id);
  }

  // ── Soft Delete ───────────────────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete (archive) a study material record' })
  softDelete(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.studyMaterialsService.softDelete(id, req.user.id);
  }

  // ── Upload Material File ──────────────────────────────────────────────────
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload actual study material document/file' })
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.studyMaterialsService.uploadFile(file);
  }

  // ── Upload Preview Resource ───────────────────────────────────────────────
  @Post('upload-preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload preview resource for premium study material' })
  uploadPreviewFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.studyMaterialsService.uploadPreviewFile(file);
  }

  // ── Upload Thumbnail Image ────────────────────────────────────────────────
  @Post('upload-thumbnail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload thumbnail image for study material' })
  uploadThumbnail(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    return this.studyMaterialsService.uploadThumbnail(file);
  }

  // ── Access & Entitlement Check ───────────────────────────────────────────
  @Get(':id/access')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Check entitlement and access rules for a study material' })
  checkAccess(
    @Param('id') id: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.studyMaterialsService.checkAccess(id, req.user?.id);
  }

  // ── Secure Preview Stream ────────────────────────────────────────────────
  @Get(':id/preview')
  @ApiOperation({ summary: 'Stream study material preview document or public file' })
  async getPreview(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { filePath, fileName, mimeType } =
      await this.studyMaterialsService.getPreviewFile(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(filePath);
  }

  // ── Secure Authenticated Download Stream ─────────────────────────────────
  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Secure authenticated download for study material' })
  async downloadFile(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Res() res: Response,
  ) {
    const { filePath, fileName, mimeType } =
      await this.studyMaterialsService.getDownloadFile(id, req.user.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(filePath);
  }

  // ── Create Purchase Order ────────────────────────────────────────────────
  @Post(':id/purchase-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create purchase order for premium study material with optional coupon',
  })
  createPurchaseOrder(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() body: { couponCode?: string; acceptedPolicies?: any[] },
  ) {
    return this.studyMaterialsService.createPurchaseOrder(
      id,
      req.user.id,
      body?.couponCode,
      body?.acceptedPolicies,
      (req as any)?.ip,
    );
  }

  // ── Verify Payment & Activate Entitlement ────────────────────────────────
  @Post(':id/verify-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Razorpay payment and unlock premium study material' })
  verifyPayment(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body()
    body: {
      orderId: string;
      paymentId: string;
      signature: string;
      internalPaymentId?: string;
    },
  ) {
    return this.studyMaterialsService.verifyPurchasePayment(
      id,
      req.user.id,
      body,
    );
  }

  // ── Increment Download Counter (Tracking fallback) ───────────────────────
  @Post(':id/download')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Track download count for a study material' })
  incrementDownload(
    @Param('id') id: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.studyMaterialsService.incrementDownload(id, req.user?.id);
  }

  // ── Increment View Counter ───────────────────────────────────────────────
  @Post(':id/view')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Track view count for a study material' })
  incrementView(
    @Param('id') id: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.studyMaterialsService.incrementView(id, req.user?.id);
  }
}
