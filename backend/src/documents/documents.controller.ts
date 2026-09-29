import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { BulkVerifyDto } from './dto/bulk-verify.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { ConfigureRequirementDto } from './dto/configure-requirement.dto';
import { RequestCorrectionDto } from './dto/request-correction.dto';
import {
  CreateDeletionRequestDto,
  ReviewDeletionDto,
  ResendNotificationDto,
} from './dto/deletion-request.dto';
import { AuditQueryDto } from './dto/audit-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';
import type { Request, Response } from 'express';

const allowedExtensions = [
  '.jpg',
  '.jpeg',
  '.png',
  '.pdf',
];

const multerOptions = {
  limits: {
    fileSize: 300 * 1024, // 300 KB strict application limit
  },
  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return callback(
        new BadRequestException(
          'Only PDF, JPG, JPEG, and PNG files are allowed',
        ),
        false,
      );
    }
    callback(null, true);
  },
};

@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  upload(
    @Req() req: Request,
    @CurrentUser() user: IUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentsService.upload(
      user.id,
      dto,
      file,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyDocuments(@CurrentUser() user: IUser) {
    return this.documentsService.getMyDocuments(user.id);
  }

  @Get('checklist')
  @UseGuards(JwtAuthGuard)
  getChecklist(
    @CurrentUser() user: IUser,
    @Query('userId') queryUserId?: string,
    @Query('applicationId') applicationId?: string,
    @Query('collegeId') collegeId?: string,
    @Query('courseId') courseId?: string,
  ) {
    const targetUserId = (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'COUNSELOR') && queryUserId
      ? queryUserId
      : user.id;
    return this.documentsService.getDynamicChecklist(targetUserId, applicationId, collegeId, courseId);
  }

  @Post(':id/replace')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  replaceDocument(
    @Req() req: Request,
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required for document replacement');
    }
    return this.documentsService.replaceDocument(
      id,
      user.id,
      file,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post(':id/claim')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.view')
  claimDocument(
    @Req() req: Request,
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.documentsService.claimDocument(
      id,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post(':id/request-correction')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.verify')
  requestCorrection(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: RequestCorrectionDto,
    @CurrentUser() user: IUser,
  ) {
    return this.documentsService.requestCorrection(
      id,
      dto,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get(':id/history')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.view')
  getDocumentHistory(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.documentsService.getDocumentHistory(id, user?.id);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.view')
  getStats(@CurrentUser() user: IUser) {
    return this.documentsService.getStats(user?.id);
  }

  @Get('requirements')
  getRequirements(
    @Query('collegeId') collegeId?: string,
    @Query('courseId') courseId?: string,
    @Query('session') session?: string,
  ) {
    return this.documentsService.getRequirements(collegeId, courseId, session);
  }

  @Post('requirements')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.upload')
  configureRequirement(@Body() dto: ConfigureRequirementDto) {
    return this.documentsService.configureRequirement(dto);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.view')
  getPendingDocuments(@CurrentUser() user: IUser) {
    return this.documentsService.getPendingDocuments(user?.id);
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.export')
  exportDocuments(
    @Query() query: DocumentQueryDto,
    @CurrentUser() user: IUser,
  ) {
    return this.documentsService.exportDocuments(query, user?.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.view')
  getPaginatedDocuments(
    @Query() query: DocumentQueryDto,
    @CurrentUser() user: IUser,
  ) {
    return this.documentsService.getPaginatedDocuments(query, user?.id);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.view')
  getUserDocuments(
    @Param('userId') userId: string,
    @CurrentUser() user: IUser,
  ) {
    return this.documentsService.getUserDocuments(userId, user?.id);
  }

  // ==========================================
  // DELETION REQUESTS & RETENTION ENDPOINTS
  // ==========================================

  @Post(['deletion-requests', 'deletion-request'])
  @UseGuards(JwtAuthGuard)
  submitDeletionRequest(
    @Req() req: Request,
    @CurrentUser() user: IUser,
    @Body() dto: CreateDeletionRequestDto,
  ) {
    return this.documentsService.submitDeletionRequest(
      user.id,
      dto,
      req.ip,
      req.headers['user-agent'] as string,
    );
  }

  @Get('deletion-requests/my')
  @UseGuards(JwtAuthGuard)
  getMyDeletionRequests(@CurrentUser() user: IUser) {
    return this.documentsService.getMyDeletionRequests(user.id);
  }

  @Post(['deletion-requests/:id/cancel', 'deletion-request/:id/cancel'])
  @UseGuards(JwtAuthGuard)
  cancelDeletionRequest(
    @Req() req: Request,
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.documentsService.cancelDeletionRequest(
      id,
      user.id,
      req.ip,
      req.headers['user-agent'] as string,
    );
  }

  @Patch(['deletion-requests/:id/cancel', 'deletion-request/:id/cancel'])
  @UseGuards(JwtAuthGuard)
  cancelDeletionRequestPatch(
    @Req() req: Request,
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.documentsService.cancelDeletionRequest(
      id,
      user.id,
      req.ip,
      req.headers['user-agent'] as string,
    );
  }

  @Get(['deletion-requests', 'admin/deletion-requests'])
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.view')
  getAdminDeletionRequests(
    @Query('status') status?: string,
    @Query('studentId') studentId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.documentsService.getAdminDeletionRequests({
      status,
      studentId,
      page,
      limit,
    });
  }

  @Post(['deletion-requests/:id/review', 'admin/deletion-requests/:id/review'])
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.verify')
  reviewDeletionRequest(
    @Req() req: Request,
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: ReviewDeletionDto,
  ) {
    return this.documentsService.reviewDeletionRequest(
      id,
      user.id,
      dto,
      req.ip,
      req.headers['user-agent'] as string,
    );
  }

  @Patch(['deletion-requests/:id/review', 'admin/deletion-requests/:id/review'])
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.verify')
  reviewDeletionRequestPatch(
    @Req() req: Request,
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: ReviewDeletionDto,
  ) {
    return this.documentsService.reviewDeletionRequest(
      id,
      user.id,
      dto,
      req.ip,
      req.headers['user-agent'] as string,
    );
  }

  @Post(['deletion-requests/:id/resend-notification', 'admin/deletion-requests/:id/resend-notification'])
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.verify')
  resendDeletionNotification(
    @Req() req: Request,
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: ResendNotificationDto,
  ) {
    return this.documentsService.resendDeletionNotification(
      id,
      user.id,
      dto?.channels,
      req.ip,
      req.headers['user-agent'] as string,
    );
  }

  @Get(['audit-logs', 'admin/audit-logs'])
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.view')
  getAuditLogs(@Query() query: AuditQueryDto) {
    return this.documentsService.getAuditLogs(query);
  }

  @Get(['notification-logs', 'admin/notification-logs'])
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.view')
  getNotificationLogs(
    @Query('requestId') requestId?: string,
    @Query('studentId') studentId?: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.documentsService.getNotificationDeliveryLogs({
      requestId,
      studentId,
      channel,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(['retention/run-cleanup', 'admin/retention/run-cleanup'])
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.delete')
  triggerRetentionCleanup() {
    return this.documentsService.triggerRetentionCleanup();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.view')
  getDocumentById(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.documentsService.getDocumentById(id, user?.id);
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  async previewDocument(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    const result = await this.documentsService.previewDocument(
      id,
      user?.id,
      req.ip,
      req.headers['user-agent'] as string,
    );

    res.set({
      'Content-Type': result.mimeType || 'application/pdf',
      'Content-Disposition': `inline; filename="${result.fileName}"`,
      'Cache-Control': 'private, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    return res.send(result.buffer);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  async downloadDocument(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    const result = await this.documentsService.downloadDocument(
      id,
      user?.id,
      req.ip,
      req.headers['user-agent'] as string,
    );

    res.set({
      'Content-Type': result.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Cache-Control': 'private, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    return res.send(result.buffer);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.verify')
  verifyDocument(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: VerifyDocumentDto,
    @CurrentUser() user: IUser,
  ) {
    return this.documentsService.verifyDocument(
      id,
      dto,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('bulk-verify')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.verify')
  bulkVerify(
    @Req() req: Request,
    @Body() dto: BulkVerifyDto,
    @CurrentUser() user: IUser,
  ) {
    return this.documentsService.bulkVerify(
      dto,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.delete')
  deleteDocument(
    @Req() req: Request,
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.documentsService.deleteDocument(
      id,
      user.id,
      user.role,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
