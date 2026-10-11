import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HrService } from './hr.service';
import { CreateApplicationDto, RespondOfferDto } from './dto/application.dto';
import { StorageService } from '../storage/storage.service';

@Controller('careers')
export class CareersController {
  constructor(
    private readonly hrService: HrService,
    private readonly storageService: StorageService,
  ) {}

  @Get('settings')
  getPublicSettings() {
    return this.hrService.getPublicRecruitmentSettings();
  }

  @Get('vacancies')
  async listPublicVacancies(
    @Query('search') search?: string,
    @Query('department') department?: string,
    @Query('location') location?: string,
    @Query('employmentType') employmentType?: string,
    @Query('workMode') workMode?: string,
  ) {
    const today = new Date();
    const filter: any = {
      status: 'PUBLISHED',
      applicationStartDate: { lte: today },
      OR: [
        { applicationEndDate: null },
        { applicationEndDate: { gte: today } },
      ],
    };

    if (search) filter.search = search;
    if (department && department !== 'ALL') filter.department = department;
    if (location && location !== 'ALL') filter.location = location;
    if (employmentType && employmentType !== 'ALL') filter.employmentType = employmentType;
    if (workMode && workMode !== 'ALL') filter.workMode = workMode;

    const vacancies = await this.hrService.listVacancies(filter);

    // Sanitize internal fields from public view
    return vacancies.map((v) => {
      const publicVacancy: any = { ...v };
      delete publicVacancy.createdBy;
      delete publicVacancy.updatedById;
      delete publicVacancy.recruiterId;
      delete publicVacancy.reportingManagerId;
      delete publicVacancy.priority;
      return publicVacancy;
    });
  }

  @Get('vacancies/:code')
  async getPublicVacancy(@Param('code') code: string) {
    const vacancy = await this.hrService.getVacancy(code);

    if (!vacancy || vacancy.status !== 'PUBLISHED') {
      throw new NotFoundException('Job vacancy not found or no longer active');
    }

    const publicVacancy: any = { ...vacancy };
    delete publicVacancy.createdBy;
    delete publicVacancy.updatedById;
    delete publicVacancy.recruiterId;
    delete publicVacancy.reportingManagerId;
    delete publicVacancy.priority;
    return publicVacancy;
  }

  @Post('vacancies/:id/apply')
  @UseInterceptors(FileInterceptor('resume'))
  async applyForJob(
    @Param('id') vacancyId: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
    @Request() req?: any,
  ) {
    // If body fields come from multipart/form-data, parse JSON fields if needed
    let skills = body.skills;
    if (typeof skills === 'string') {
      try {
        skills = JSON.parse(skills);
      } catch {
        skills = skills.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const payload: CreateApplicationDto = {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      mobile: body.mobile,
      address: body.address,
      state: body.state,
      city: body.city,
      qualification: body.qualification,
      experience: body.experience,
      previousOrganization: body.previousOrganization,
      currentDesignation: body.currentDesignation,
      skills: Array.isArray(skills) ? skills : [],
      expectedSalary: body.expectedSalary,
      noticePeriod: body.noticePeriod,
      linkedInUrl: body.linkedInUrl,
      portfolioUrl: body.portfolioUrl,
      coverLetter: body.coverLetter,
      additionalInfo: body.additionalInfo,
      resumeUrl: body.resumeUrl,
      resumeFileName: body.resumeFileName,
      resumeFileSize: body.resumeFileSize ? Number(body.resumeFileSize) : undefined,
      resumeMimeType: body.resumeMimeType,
    };

    if (!payload.firstName || !payload.email || !payload.mobile) {
      throw new BadRequestException('Applicant name, email, and mobile number are required');
    }

    const userId = req?.user?.id || undefined;
    return this.hrService.applyForJob(vacancyId, payload, userId, file);
  }

  @Post('upload-resume')
  @UseInterceptors(FileInterceptor('resume'))
  async uploadResume(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Resume file is required');
    }

    const settings = await this.hrService.getRecruitmentSettings();
    const allowedExts = settings.allowedResumeFormats || ['pdf', 'doc', 'docx'];
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';

    if (!allowedExts.includes(ext)) {
      throw new BadRequestException(
        `Invalid resume format. Allowed formats: ${allowedExts.join(', ')}`,
      );
    }

    const maxBytes = (settings.maxResumeSizeMB || 10) * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `Resume file exceeds maximum allowed size of ${settings.maxResumeSizeMB || 10}MB`,
      );
    }

    const fileUrl = await this.storageService.uploadFile(file, 'resumes');

    return {
      success: true,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  @Get('offers/:identifier')
  getOfferDetails(@Param('identifier') identifier: string) {
    return this.hrService.getOfferByApplicationId(identifier);
  }

  @Post('offers/:identifier/respond')
  respondToOffer(
    @Param('identifier') identifier: string,
    @Body() dto: RespondOfferDto,
    @Request() req: any,
  ) {
    const actorUserId = req?.user?.id || 'CANDIDATE';
    return this.hrService.respondToOffer(identifier, dto, actorUserId);
  }
}
