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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';
import type { Request } from 'express';

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

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.view')
  getDocumentById(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.documentsService.getDocumentById(id, user?.id);
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.view')
  previewDocument(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.documentsService.previewDocument(id, user?.id);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('document.download')
  downloadDocument(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.documentsService.downloadDocument(id, user?.id);
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
