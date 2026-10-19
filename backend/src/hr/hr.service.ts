import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { EmailChannel } from '../notifications/notification-channels.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role, CommunicationChannel, CommunicationDeliveryStatus } from '@prisma/client';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  AssignRecruiterDto,
  AddNoteDto,
  ScheduleInterviewDto,
  UpdateInterviewDto,
  UpdateRecruitmentSettingsDto,
  CreateOfferDto,
  RespondOfferDto,
  UpdateClearanceItemDto,
  CompleteClearanceDto,
  StartOnboardingDto,
  CompleteOnboardingDto,
} from './dto/application.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const bcryptLib = bcrypt as unknown as {
  hash: (s: string, saltOrRounds: number) => Promise<string>;
  compare: (s: string, hash: string) => Promise<boolean>;
};

const VALID_STATUSES = [
  'APPLIED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEWED',
  'SELECTED',
  'OFFERED',
  'OFFER_SENT',
  'OFFER_ACCEPTED',
  'OFFER_DECLINED',
  'CLEARANCE',
  'ONBOARDING',
  'JOINED',
  'ACTIVE',
  'VERIFICATION_FAILED',
  'ON_HOLD',
  'REJECTED',
  'WITHDRAWN',
  'CANCELLED',
  'HIRED',
  'ARCHIVED',
];

@Injectable()
export class HrService {
  private readonly logger = new Logger(HrService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    @Optional() private readonly emailChannel?: EmailChannel,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  private getEmailChannel(): EmailChannel {
    if (this.emailChannel) return this.emailChannel;
    return new EmailChannel(this.prisma);
  }

  // ---------------------------------------------------------
  // 1. RECRUITMENT SETTINGS MANAGEMENT
  // ---------------------------------------------------------

  async getRecruitmentSettings() {
    return await this.prisma.recruitmentSetting.upsert({
      where: { id: 'default_recruitment_setting' },
      update: {},
      create: {
        id: 'default_recruitment_setting',
        recruitmentEmail: 'careers@swayamadmission.com',
        recruitmentDisplayName: 'Swayam Admission Careers Team',
        replyToEmail: 'careers@swayamadmission.com',
      },
    });
  }

  async getPublicRecruitmentSettings() {
    const settings = await this.getRecruitmentSettings();
    return {
      recruitmentEmail: settings.recruitmentEmail,
      recruitmentDisplayName: settings.recruitmentDisplayName,
      heroTitle: settings.heroTitle,
      heroSubtitle: settings.heroSubtitle,
      allowedResumeFormats: settings.allowedResumeFormats,
      maxResumeSizeMB: settings.maxResumeSizeMB,
      applicationIdPrefix: settings.applicationIdPrefix,
    };
  }

  async updateRecruitmentSettings(data: UpdateRecruitmentSettingsDto, userId: string) {
    // Validate email formatting
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.recruitmentEmail && !emailRegex.test(data.recruitmentEmail)) {
      throw new BadRequestException('Invalid recruitment email address');
    }
    if (data.replyToEmail && !emailRegex.test(data.replyToEmail)) {
      throw new BadRequestException('Invalid reply-to email address');
    }
    if (data.ccEmails && data.ccEmails.some((e) => !emailRegex.test(e))) {
      throw new BadRequestException('One or more CC email addresses are invalid');
    }
    if (data.bccEmails && data.bccEmails.some((e) => !emailRegex.test(e))) {
      throw new BadRequestException('One or more BCC email addresses are invalid');
    }

    const cleanPayload: any = {
      updatedById: userId,
    };

    if (data.recruitmentEmail !== undefined) cleanPayload.recruitmentEmail = data.recruitmentEmail.trim();
    if (data.recruitmentDisplayName !== undefined) cleanPayload.recruitmentDisplayName = data.recruitmentDisplayName.trim();
    if (data.replyToEmail !== undefined) cleanPayload.replyToEmail = data.replyToEmail ? data.replyToEmail.trim() : null;
    if (data.ccEmails !== undefined) cleanPayload.ccEmails = data.ccEmails;
    if (data.bccEmails !== undefined) cleanPayload.bccEmails = data.bccEmails;
    if (data.candidateAckEnabled !== undefined) cleanPayload.candidateAckEnabled = Boolean(data.candidateAckEnabled);
    if (data.adminNotificationEnabled !== undefined) cleanPayload.adminNotificationEnabled = Boolean(data.adminNotificationEnabled);
    if (data.resumeAttachmentEnabled !== undefined) cleanPayload.resumeAttachmentEnabled = Boolean(data.resumeAttachmentEnabled);
    if (data.maxResumeSizeMB !== undefined) cleanPayload.maxResumeSizeMB = Number(data.maxResumeSizeMB);
    if (data.allowedResumeFormats !== undefined) cleanPayload.allowedResumeFormats = data.allowedResumeFormats;
    if (data.applicationIdPrefix !== undefined) cleanPayload.applicationIdPrefix = data.applicationIdPrefix.trim();
    if (data.heroTitle !== undefined) cleanPayload.heroTitle = data.heroTitle;
    if (data.heroSubtitle !== undefined) cleanPayload.heroSubtitle = data.heroSubtitle;
    if (data.autoSendRejectionEmail !== undefined) cleanPayload.autoSendRejectionEmail = Boolean(data.autoSendRejectionEmail);
    if (data.autoSendShortlistEmail !== undefined) cleanPayload.autoSendShortlistEmail = Boolean(data.autoSendShortlistEmail);

    const updated = await this.prisma.recruitmentSetting.upsert({
      where: { id: 'default_recruitment_setting' },
      update: cleanPayload,
      create: {
        id: 'default_recruitment_setting',
        ...cleanPayload,
      },
    });

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'RECRUITMENT_SETTINGS_CHANGED',
        description: 'Updated HR & recruitment configuration settings',
        entity: 'RecruitmentSetting',
        entityId: updated.id,
        userId,
        newValue: {
          recruitmentEmail: updated.recruitmentEmail,
          candidateAckEnabled: updated.candidateAckEnabled,
          adminNotificationEnabled: updated.adminNotificationEnabled,
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit logging failed for recruitment settings update: ${auditErr.message}`);
    }

    return updated;
  }

  // ---------------------------------------------------------
  // 2. RECRUITMENT: Job Vacancy Management
  // ---------------------------------------------------------

  private async generateVacancyCode(): Promise<string> {
    const lastVacancy = await this.prisma.jobVacancy.findFirst({
      orderBy: { createdAt: 'desc' },
      where: { vacancyCode: { startsWith: 'SWY-VAC-' } },
    });

    let nextNumber = 1;
    if (lastVacancy && lastVacancy.vacancyCode) {
      const match = lastVacancy.vacancyCode.match(/SWY-VAC-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `SWY-VAC-${String(nextNumber).padStart(5, '0')}`;
  }

  async createVacancy(data: CreateVacancyDto, userId: string) {
    let retries = 3;
    while (retries > 0) {
      try {
        const vacancyCode = await this.generateVacancyCode();

        const vacancy = await this.prisma.jobVacancy.create({
          data: {
            ...data,
            vacancyCode,
            createdBy: userId,
            updatedById: userId,
          },
        });

        try {
          await this.auditService.logAction({
            module: 'HR_RECRUITMENT',
            action: 'VACANCY_CREATED',
            description: `Created new job vacancy: ${vacancy.title} (${vacancy.vacancyCode})`,
            entity: 'JobVacancy',
            entityId: vacancy.id,
            entityName: vacancy.title,
            userId,
          });
        } catch (auditErr: any) {
          this.logger.warn(`Audit logging failed: ${auditErr.message}`);
        }

        return vacancy;
      } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('vacancyCode')) {
          retries--;
          if (retries === 0) {
            this.logger.error('Failed to generate unique vacancy code after retries', error);
            throw new InternalServerErrorException('Failed to generate a unique vacancy code. Please try again.');
          }
          continue;
        }
        this.logger.error('Failed to create vacancy', error);
        throw new InternalServerErrorException('Failed to create vacancy');
      }
    }
  }

  async listVacancies(filters?: any) {
    const andConditions: any[] = [];

    if (filters?.status) {
      andConditions.push({ status: filters.status });
    }
    if (filters?.department && filters.department !== 'ALL') {
      andConditions.push({ department: { contains: filters.department, mode: 'insensitive' } });
    }
    if (filters?.location && filters.location !== 'ALL') {
      andConditions.push({ location: { contains: filters.location, mode: 'insensitive' } });
    }
    if (filters?.employmentType && filters.employmentType !== 'ALL') {
      andConditions.push({ employmentType: filters.employmentType });
    }
    if (filters?.workMode && filters.workMode !== 'ALL') {
      andConditions.push({ workMode: filters.workMode });
    }
    if (filters?.search && typeof filters.search === 'string' && filters.search.trim()) {
      const q = filters.search.trim();
      andConditions.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { department: { contains: q, mode: 'insensitive' } },
          { vacancyCode: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
          { designation: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (filters?.onlyActivePublication) {
      const today = new Date();
      andConditions.push({
        OR: [
          { applicationStartDate: null },
          { applicationStartDate: { lte: today } },
        ],
      });
      andConditions.push({
        OR: [
          { applicationEndDate: null },
          { applicationEndDate: { gte: today } },
        ],
      });
      andConditions.push({
        OR: [
          { applicationDeadline: null },
          { applicationDeadline: { gte: today } },
        ],
      });
    } else {
      if (filters?.applicationStartDate) {
        andConditions.push({ applicationStartDate: filters.applicationStartDate });
      }
      if (filters?.OR) {
        andConditions.push({ OR: filters.OR });
      }
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    return this.prisma.jobVacancy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  async getVacancy(id: string) {
    const vacancy = await this.prisma.jobVacancy.findFirst({
      where: {
        OR: [{ id }, { vacancyCode: id }],
      },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!vacancy) {
      throw new NotFoundException('Vacancy not found');
    }

    return vacancy;
  }

  async updateVacancy(id: string, data: Partial<CreateVacancyDto>, userId: string) {
    const vacancy = await this.prisma.jobVacancy.findUnique({ where: { id } });

    if (!vacancy) {
      throw new NotFoundException('Vacancy not found');
    }

    const updated = await this.prisma.jobVacancy.update({
      where: { id },
      data: {
        ...data,
        updatedById: userId,
      },
    });

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'VACANCY_EDITED',
        description: `Updated job vacancy details: ${updated.title} (${updated.vacancyCode})`,
        entity: 'JobVacancy',
        entityId: updated.id,
        entityName: updated.title,
        userId,
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit logging failed: ${auditErr.message}`);
    }

    return updated;
  }

  async changeVacancyStatus(id: string, status: string, userId: string) {
    const vacancy = await this.prisma.jobVacancy.findUnique({ where: { id } });
    if (!vacancy) {
      throw new NotFoundException('Vacancy not found');
    }

    const validStatuses = ['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}. Must be one of ${validStatuses.join(', ')}`);
    }

    const updateData: any = {
      status,
      updatedById: userId,
    };

    if (status === 'PUBLISHED') {
      updateData.publishedAt = new Date();
    } else if (status === 'CLOSED') {
      updateData.closedAt = new Date();
    } else if (status === 'ARCHIVED') {
      updateData.archivedAt = new Date();
    }

    const updated = await this.prisma.jobVacancy.update({
      where: { id },
      data: updateData,
    });

    const actionMap: Record<string, string> = {
      PUBLISHED: 'VACANCY_PUBLISHED',
      PAUSED: 'VACANCY_UNPUBLISHED',
      CLOSED: 'VACANCY_CLOSED',
      ARCHIVED: 'VACANCY_ARCHIVED',
    };

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: actionMap[status] || 'VACANCY_STATUS_CHANGED',
        description: `Changed vacancy status of ${updated.title} (${updated.vacancyCode}) to ${status}`,
        entity: 'JobVacancy',
        entityId: updated.id,
        entityName: updated.title,
        userId,
        oldValue: vacancy.status,
        newValue: status,
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit logging failed: ${auditErr.message}`);
    }

    return updated;
  }

  async duplicateVacancy(id: string, userId: string) {
    const source = await this.prisma.jobVacancy.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException('Source vacancy not found');
    }

    const vacancyCode = await this.generateVacancyCode();

    const duplicated = await this.prisma.jobVacancy.create({
      data: {
        vacancyCode,
        title: `${source.title} (Copy)`,
        department: source.department,
        designation: source.designation,
        employmentType: source.employmentType,
        location: source.location,
        workMode: source.workMode,
        numberOfPositions: source.numberOfPositions,
        minimumQualification: source.minimumQualification,
        preferredQualification: source.preferredQualification,
        experience: source.experience,
        requiredSkills: source.requiredSkills,
        preferredSkills: source.preferredSkills,
        salaryRange: source.salaryRange,
        salaryMin: source.salaryMin,
        salaryMax: source.salaryMax,
        salaryCurrency: source.salaryCurrency,
        jobDescription: source.jobDescription,
        responsibilities: source.responsibilities,
        educationRequirements: source.educationRequirements,
        experienceRequirements: source.experienceRequirements,
        requiredDocuments: source.requiredDocuments,
        status: 'DRAFT',
        priority: source.priority,
        interviewType: source.interviewType,
        interviewMode: source.interviewMode,
        recruiterId: source.recruiterId,
        reportingManagerId: source.reportingManagerId,
        createdBy: userId,
        updatedById: userId,
      },
    });

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'VACANCY_CREATED',
        description: `Duplicated vacancy ${source.title} into new vacancy ${duplicated.title} (${duplicated.vacancyCode})`,
        entity: 'JobVacancy',
        entityId: duplicated.id,
        entityName: duplicated.title,
        userId,
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit logging failed: ${auditErr.message}`);
    }

    return duplicated;
  }

  // ---------------------------------------------------------
  // 3. RECRUITMENT: Job Applications
  // ---------------------------------------------------------

  private async generateApplicationCode(): Promise<string> {
    const settings = await this.getRecruitmentSettings();
    const prefix = settings.applicationIdPrefix || 'SWY-JOB-APP-';

    const lastApp = await this.prisma.jobApplication.findFirst({
      orderBy: { createdAt: 'desc' },
      where: { applicationId: { startsWith: prefix } },
    });

    let nextNumber = 1;
    if (lastApp && lastApp.applicationId) {
      const match = lastApp.applicationId.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  async applyForJob(
    vacancyId: string,
    data: CreateApplicationDto,
    userId?: string,
    resumeFile?: Express.Multer.File,
  ) {
    const vacancy = await this.prisma.jobVacancy.findFirst({
      where: {
        OR: [{ id: vacancyId }, { vacancyCode: vacancyId }],
      },
    });

    if (!vacancy) {
      throw new NotFoundException('Job vacancy not found');
    }

    if (vacancy.status !== 'PUBLISHED') {
      throw new BadRequestException('This vacancy is not open for applications');
    }

    const today = new Date();
    if (vacancy.applicationStartDate && today < vacancy.applicationStartDate) {
      throw new BadRequestException('Applications for this vacancy have not started yet');
    }
    if (vacancy.applicationEndDate && today > vacancy.applicationEndDate) {
      throw new BadRequestException('Applications for this vacancy have closed');
    }
    if (vacancy.applicationDeadline && today > vacancy.applicationDeadline) {
      throw new BadRequestException('Application deadline for this vacancy has passed');
    }

    // Duplicate application protection based on email + vacancyId
    const existing = await this.prisma.jobApplication.findFirst({
      where: {
        vacancyId: vacancy.id,
        email: { equals: data.email.trim(), mode: 'insensitive' },
        isArchived: false,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `An application for "${vacancy.title}" has already been submitted with this email (${data.email}). Reference: ${existing.applicationId}`,
      );
    }

    const settings = await this.getRecruitmentSettings();

    // Handle uploaded file if present
    let resumeUrl = data.resumeUrl || null;
    let resumeFileName = data.resumeFileName || null;
    let resumeFileSize = data.resumeFileSize || null;
    let resumeMimeType = data.resumeMimeType || null;

    if (resumeFile) {
      const allowedExts = settings.allowedResumeFormats || ['pdf', 'doc', 'docx'];
      const ext = resumeFile.originalname.split('.').pop()?.toLowerCase() || '';

      if (!allowedExts.includes(ext)) {
        throw new BadRequestException(
          `Invalid resume file type. Allowed formats: ${allowedExts.join(', ')}`,
        );
      }

      const maxBytes = (settings.maxResumeSizeMB || 10) * 1024 * 1024;
      if (resumeFile.size > maxBytes) {
        throw new BadRequestException(
          `Resume file exceeds maximum allowed size of ${settings.maxResumeSizeMB || 10}MB`,
        );
      }

      resumeUrl = await this.storageService.uploadFile(resumeFile, 'resumes');
      resumeFileName = resumeFile.originalname;
      resumeFileSize = resumeFile.size;
      resumeMimeType = resumeFile.mimetype;
    }

    const initialHistory = [
      {
        status: 'APPLIED',
        timestamp: new Date().toISOString(),
        actor: 'Applicant',
        note: 'Application submitted successfully',
      },
    ];

    let retries = 3;
    while (retries > 0) {
      try {
        const applicationId = await this.generateApplicationCode();

        const createdApp = await this.prisma.jobApplication.create({
          data: {
            applicationId,
            vacancyId: vacancy.id,
            userId: userId || null,
            firstName: data.firstName.trim(),
            lastName: data.lastName ? data.lastName.trim() : null,
            email: data.email.trim().toLowerCase(),
            mobile: data.mobile.trim(),
            address: data.address || null,
            state: data.state || null,
            city: data.city || null,
            qualification: data.qualification || null,
            experience: data.experience || null,
            previousOrganization: data.previousOrganization || null,
            currentDesignation: data.currentDesignation || null,
            skills: data.skills || [],
            expectedSalary: data.expectedSalary || null,
            noticePeriod: data.noticePeriod || null,
            linkedInUrl: data.linkedInUrl || null,
            portfolioUrl: data.portfolioUrl || null,
            coverLetter: data.coverLetter || null,
            additionalInfo: data.additionalInfo || null,
            resumeUrl,
            resumeFileName,
            resumeFileSize,
            resumeMimeType,
            status: 'APPLIED',
            statusHistory: initialHistory,
            timelineNotes: [],
          },
        });

        // Also create CandidateDocument for standard file registry
        if (resumeUrl && resumeFileName) {
          try {
            await this.prisma.candidateDocument.create({
              data: {
                applicationId: createdApp.id,
                title: 'Resume / CV',
                fileUrl: resumeUrl,
                fileName: resumeFileName,
                isRequired: true,
                status: 'PENDING',
              },
            });
          } catch (docErr: any) {
            this.logger.warn(`Failed to create candidate document record: ${docErr.message}`);
          }
        }

        // Audit log
        try {
          await this.auditService.logAction({
            module: 'HR_RECRUITMENT',
            action: 'APPLICATION_CREATED',
            description: `Received job application ${createdApp.applicationId} for vacancy ${vacancy.title}`,
            entity: 'JobApplication',
            entityId: createdApp.id,
            entityName: `${createdApp.firstName} ${createdApp.lastName || ''}`.trim(),
            userId: userId || undefined,
            email: createdApp.email,
          });
        } catch (auditErr: any) {
          this.logger.warn(`Audit logging failed: ${auditErr.message}`);
        }

        // Asynchronously dispatch notifications (safely catching errors so application is never lost)
        this.dispatchApplicationNotifications(createdApp, vacancy, settings).catch((notifErr) => {
          this.logger.warn(`Notification dispatch encountered error: ${notifErr.message}`);
        });

        return {
          success: true,
          message: 'Application submitted successfully.',
          applicationId: createdApp.applicationId,
          position: vacancy.title,
          department: vacancy.department,
          submittedAt: createdApp.createdAt,
          status: createdApp.status,
          applicantName: `${createdApp.firstName} ${createdApp.lastName || ''}`.trim(),
        };
      } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('applicationId')) {
          retries--;
          if (retries === 0) {
            this.logger.error('Failed to generate unique application ID after retries', error);
            throw new InternalServerErrorException(
              'Failed to generate unique application ID. Please try again.',
            );
          }
          continue;
        }
        this.logger.error('Failed to submit application', error);
        throw new InternalServerErrorException('Failed to submit application. Please try again.');
      }
    }
  }

  private async dispatchApplicationNotifications(
    app: any,
    vacancy: any,
    settings: any,
  ) {
    if (!this.emailChannel) return;

    const candidateFullName = `${app.firstName} ${app.lastName || ''}`.trim();

    // 1. Candidate Acknowledgement Email
    if (settings.candidateAckEnabled && app.email) {
      try {
        await this.emailChannel.send(
          {
            id: app.id,
            name: candidateFullName,
            email: app.email,
            mobile: app.mobile,
            type: 'CANDIDATE',
          },
          {
            title: `Application Received: ${vacancy.title}`,
            subject: `Application Confirmation — ${vacancy.title} (${app.applicationId})`,
            message: `Dear ${candidateFullName},\n\nThank you for applying for the ${vacancy.title} position at Swayam Admission. Your application has been received with reference ID ${app.applicationId}. Our recruitment team will review your profile and update you on the next steps.\n\nWarm regards,\n${settings.recruitmentDisplayName || 'Swayam Admission Careers Team'}`,
            emailHtml: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px;">
                <h2 style="color: #4A7B5B; margin-top: 0;">Application Received</h2>
                <p>Dear <strong>${candidateFullName}</strong>,</p>
                <p>Thank you for your interest in joining <strong>Swayam Admission</strong>. We have received your application for the <strong>${vacancy.title}</strong> role.</p>
                <div style="background-color: #F8FAFC; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #CBD5E1;">
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Application Reference:</strong> ${app.applicationId}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Position:</strong> ${vacancy.title}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Department:</strong> ${vacancy.department}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Submission Date:</strong> ${new Date(app.createdAt).toLocaleDateString()}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> Under Review</p>
                </div>
                <p>Our recruitment team is reviewing your profile. If your qualifications match our current requirements, we will reach out to you with next steps.</p>
                <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #64748B;">For inquiries regarding your application, contact <a href="mailto:${settings.recruitmentEmail}">${settings.recruitmentEmail}</a>.</p>
              </div>
            `,
          },
        );
      } catch (err: any) {
        this.logger.warn(`Candidate acknowledgement email failed for ${app.applicationId}: ${err.message}`);
      }
    }

    // 2. Admin / Recruitment Team Notification Email
    if (settings.adminNotificationEnabled && settings.recruitmentEmail) {
      try {
        await this.emailChannel.send(
          {
            id: 'admin_recruitment_notification',
            name: settings.recruitmentDisplayName || 'Recruitment Team',
            email: settings.recruitmentEmail,
            type: 'RECRUITER',
          },
          {
            title: `New Job Application: ${vacancy.title}`,
            subject: `[New Application] ${vacancy.title} — ${candidateFullName} (${app.applicationId})`,
            message: `New application received for ${vacancy.title}.\nApplicant: ${candidateFullName}\nEmail: ${app.email}\nPhone: ${app.mobile}\nApplication ID: ${app.applicationId}`,
            emailHtml: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px;">
                <h2 style="color: #1E293B; margin-top: 0;">New Candidate Application</h2>
                <p>A new application has been submitted on the Swayam Admission Careers portal.</p>
                <div style="background-color: #F8FAFC; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #CBD5E1;">
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Application ID:</strong> ${app.applicationId}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Position:</strong> ${vacancy.title} (${vacancy.vacancyCode})</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Candidate Name:</strong> ${candidateFullName}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> ${app.email}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Mobile:</strong> ${app.mobile}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Experience:</strong> ${app.experience || 'Not specified'}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Qualification:</strong> ${app.qualification || 'Not specified'}</p>
                  ${app.resumeUrl ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Resume:</strong> <a href="${app.resumeUrl}" target="_blank">Download Resume</a></p>` : ''}
                </div>
                <p style="font-size: 12px; color: #64748B;">Log in to the Swayam Admission Admin Portal &rarr; HR & Recruitment to view and take action.</p>
              </div>
            `,
          },
        );
      } catch (err: any) {
        this.logger.warn(`Admin notification email failed for ${app.applicationId}: ${err.message}`);
      }
    }
  }

  async getApplications(filters?: any) {
    const where: any = {};

    if (filters?.isArchived !== undefined) {
      where.isArchived = filters.isArchived === 'true' || filters.isArchived === true;
    } else if (filters?.status !== 'ARCHIVED') {
      where.isArchived = false;
    }

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.vacancyId) {
      where.vacancyId = filters.vacancyId;
    }
    if (filters?.recruiterId) {
      where.recruiterId = filters.recruiterId;
    }
    if (filters?.search) {
      where.OR = [
        { applicationId: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { mobile: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const apps = await this.prisma.jobApplication.findMany({
      where,
      include: {
        vacancy: {
          select: {
            id: true,
            title: true,
            vacancyCode: true,
            department: true,
            designation: true,
            recruiterId: true,
            workMode: true,
            location: true,
          },
        },
        documents: {
          select: {
            id: true,
            title: true,
            fileName: true,
            fileUrl: true,
            status: true,
          },
        },
        interviews: {
          select: {
            id: true,
            interviewType: true,
            interviewDate: true,
            time: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Populate recruiter names
    const recruiterIds = [
      ...new Set(
        apps
          .map((a: any) => a.recruiterId || a.vacancy?.recruiterId)
          .filter(Boolean),
      ),
    ];

    let recruiters: any[] = [];
    if (recruiterIds.length > 0) {
      recruiters = await this.prisma.user.findMany({
        where: { id: { in: recruiterIds as string[] } },
        select: { id: true, fullName: true, email: true },
      });
    }

    return apps.map((app: any) => {
      const activeRecruiterId = app.recruiterId || app.vacancy?.recruiterId;
      const recruiter = recruiters.find((r) => r.id === activeRecruiterId);
      return {
        ...app,
        recruiter: recruiter || null,
      };
    });
  }

  async getApplicationById(id: string) {
    const app = await this.prisma.jobApplication.findFirst({
      where: {
        OR: [{ id }, { applicationId: id }],
      },
      include: {
        vacancy: true,
        documents: true,
        interviews: {
          include: {
            interviewer: {
              select: { id: true, fullName: true, email: true },
            },
            evaluations: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        offer: {
          include: {
            clearance: true,
          },
        },
        user: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
      },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    let recruiter: any = null;
    let assignedBy: any = null;
    const activeRecruiterId = app.recruiterId || (app as any).vacancy?.recruiterId;

    if (activeRecruiterId) {
      recruiter = await this.prisma.user.findUnique({
        where: { id: activeRecruiterId },
        select: { id: true, fullName: true, email: true },
      });
    }

    if (app.assignedById) {
      assignedBy = await this.prisma.user.findUnique({
        where: { id: app.assignedById },
        select: { id: true, fullName: true, email: true },
      });
    }

    return {
      ...app,
      recruiter,
      assignedBy,
    };
  }

  async updateApplicationStatus(
    id: string,
    dto: UpdateApplicationStatusDto,
    userId: string,
  ) {
    const app = await this.prisma.jobApplication.findFirst({
      where: { OR: [{ id }, { applicationId: id }] },
      include: { vacancy: true },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const { status, note, reason } = dto;
    if (!VALID_STATUSES.includes(status)) {
      throw new BadRequestException(
        `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true },
    });

    const actorName = user?.fullName || 'HR Manager';

    const currentHistory = Array.isArray(app.statusHistory) ? (app.statusHistory as any[]) : [];
    const newHistoryEntry = {
      status,
      timestamp: new Date().toISOString(),
      actorId: userId,
      actorName,
      note: note || `Status changed from ${app.status} to ${status}`,
      reason: reason || null,
    };

    const updatePayload: any = {
      status,
      statusHistory: [...currentHistory, newHistoryEntry],
    };

    if (status === 'REJECTED' && reason) {
      updatePayload.rejectionReason = reason;
    }
    if (status === 'ON_HOLD' && reason) {
      updatePayload.holdReason = reason;
    }
    if (status === 'ARCHIVED') {
      updatePayload.isArchived = true;
      updatePayload.archivedAt = new Date();
    } else if (app.isArchived && status !== 'ARCHIVED') {
      updatePayload.isArchived = false;
      updatePayload.archivedAt = null;
    }

    const updated = await this.prisma.jobApplication.update({
      where: { id: app.id },
      data: updatePayload,
      include: {
        vacancy: true,
      },
    });

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'APPLICATION_STATUS_CHANGED',
        description: `Changed application status for ${app.applicationId} (${app.firstName}) to ${status}`,
        entity: 'JobApplication',
        entityId: app.id,
        entityName: `${app.firstName} ${app.lastName || ''}`.trim(),
        userId,
        oldValue: app.status,
        newValue: status,
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit logging failed: ${auditErr.message}`);
    }

    return updated;
  }

  async assignRecruiter(id: string, dto: AssignRecruiterDto, userId: string) {
    const app = await this.prisma.jobApplication.findFirst({
      where: { OR: [{ id }, { applicationId: id }] },
      include: { vacancy: true },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const recruiter = await this.prisma.user.findUnique({
      where: { id: dto.recruiterId },
      select: { id: true, fullName: true, email: true },
    });

    if (!recruiter) {
      throw new NotFoundException('Assigned recruiter user not found');
    }

    const adminUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    const currentNotes = Array.isArray(app.timelineNotes) ? (app.timelineNotes as any[]) : [];
    const assignmentNote = {
      id: `note_${Date.now()}`,
      type: 'ASSIGNMENT',
      note: `Assigned recruiter: ${recruiter.fullName}. ${dto.notes || ''}`.trim(),
      authorId: userId,
      authorName: adminUser?.fullName || 'Admin',
      createdAt: new Date().toISOString(),
    };

    const updated = await this.prisma.jobApplication.update({
      where: { id: app.id },
      data: {
        recruiterId: dto.recruiterId,
        assignedById: userId,
        assignedAt: new Date(),
        timelineNotes: [...currentNotes, assignmentNote],
      },
      include: {
        vacancy: true,
      },
    });

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'RECRUITER_ASSIGNED',
        description: `Assigned recruiter ${recruiter.fullName} to application ${app.applicationId}`,
        entity: 'JobApplication',
        entityId: app.id,
        entityName: `${app.firstName} ${app.lastName || ''}`.trim(),
        userId,
        newValue: { recruiterId: recruiter.id, recruiterName: recruiter.fullName },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit logging failed: ${auditErr.message}`);
    }

    return {
      ...updated,
      recruiter,
    };
  }

  async addInternalNote(id: string, dto: AddNoteDto, userId: string) {
    const app = await this.prisma.jobApplication.findFirst({
      where: { OR: [{ id }, { applicationId: id }] },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true },
    });

    const newNote = {
      id: `note_${Date.now()}`,
      type: dto.type || 'NOTE',
      note: dto.note,
      authorId: userId,
      authorName: user?.fullName || 'Staff Member',
      createdAt: new Date().toISOString(),
    };

    const currentNotes = Array.isArray(app.timelineNotes) ? (app.timelineNotes as any[]) : [];

    const updated = await this.prisma.jobApplication.update({
      where: { id: app.id },
      data: {
        timelineNotes: [...currentNotes, newNote],
      },
    });

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'APPLICATION_NOTE_ADDED',
        description: `Added internal note to application ${app.applicationId}`,
        entity: 'JobApplication',
        entityId: app.id,
        entityName: `${app.firstName} ${app.lastName || ''}`.trim(),
        userId,
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit logging failed: ${auditErr.message}`);
    }

    return updated;
  }

  async scheduleInterview(
    applicationId: string,
    dto: ScheduleInterviewDto,
    userId: string,
  ) {
    const app = await this.prisma.jobApplication.findFirst({
      where: { OR: [{ id: applicationId }, { applicationId }] },
      include: { vacancy: true },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const interview = await this.prisma.interview.create({
      data: {
        applicationId: app.id,
        interviewType: dto.interviewType || 'ONLINE',
        interviewDate: new Date(dto.interviewDate),
        time: dto.time || null,
        interviewerId: dto.interviewerId || null,
        meetingLink: dto.meetingLink || null,
        location: dto.location || null,
        instructions: dto.instructions || null,
        status: 'SCHEDULED',
      },
      include: {
        interviewer: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // Update application status to INTERVIEW_SCHEDULED
    await this.updateApplicationStatus(
      app.id,
      {
        status: 'INTERVIEW_SCHEDULED',
        note: `Interview scheduled on ${new Date(dto.interviewDate).toLocaleDateString()} at ${dto.time || 'TBD'}`,
      },
      userId,
    );

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'INTERVIEW_SCHEDULED',
        description: `Scheduled interview for candidate ${app.firstName} (${app.applicationId})`,
        entity: 'Interview',
        entityId: interview.id,
        userId,
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit logging failed: ${auditErr.message}`);
    }

    return interview;
  }

  async updateInterview(
    interviewId: string,
    dto: UpdateInterviewDto,
    userId: string,
  ) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: { application: true },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    const updateData: any = {};
    if (dto.interviewType) updateData.interviewType = dto.interviewType;
    if (dto.interviewDate) updateData.interviewDate = new Date(dto.interviewDate);
    if (dto.time !== undefined) updateData.time = dto.time;
    if (dto.interviewerId !== undefined) updateData.interviewerId = dto.interviewerId;
    if (dto.meetingLink !== undefined) updateData.meetingLink = dto.meetingLink;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.instructions !== undefined) updateData.instructions = dto.instructions;
    if (dto.status) updateData.status = dto.status;

    const updated = await this.prisma.interview.update({
      where: { id: interviewId },
      data: updateData,
      include: {
        interviewer: { select: { id: true, fullName: true, email: true } },
      },
    });

    // If result provided (SELECTED, REJECTED, HOLD) and completed
    if (dto.status === 'COMPLETED' || dto.result) {
      let targetStatus = interview.application.status;
      if (dto.result === 'SELECTED') targetStatus = 'SELECTED';
      else if (dto.result === 'REJECTED') targetStatus = 'REJECTED';
      else if (dto.result === 'HOLD') targetStatus = 'ON_HOLD';
      else targetStatus = 'INTERVIEWED';

      await this.updateApplicationStatus(
        interview.applicationId,
        {
          status: targetStatus,
          note: `Interview concluded: ${dto.result || 'Completed'}. Feedback: ${dto.feedback || 'None provided'}`,
        },
        userId,
      );
    }

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'INTERVIEW_UPDATED',
        description: `Updated interview ${interview.id} for application ${interview.application.applicationId}`,
        entity: 'Interview',
        entityId: interview.id,
        userId,
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit logging failed: ${auditErr.message}`);
    }

    return updated;
  }

  async archiveApplication(id: string, userId: string) {
    return this.updateApplicationStatus(
      id,
      { status: 'ARCHIVED', note: 'Application archived by HR' },
      userId,
    );
  }

  async restoreApplication(id: string, userId: string) {
    const app = await this.prisma.jobApplication.findFirst({
      where: { OR: [{ id }, { applicationId: id }] },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    return this.updateApplicationStatus(
      app.id,
      { status: 'APPLIED', note: 'Application restored from archive' },
      userId,
    );
  }

  async getRecruitmentStaff() {
    return this.prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR'] as any },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  // ---------------------------------------------------------
  // 4. CLEARANCE & ONBOARDING
  // ---------------------------------------------------------

  async getClearances() {
    const rawClearances = await this.prisma.employeeClearance.findMany({
      include: {
        offer: {
          include: {
            application: {
              include: {
                vacancy: true,
                onboarding: true,
                user: { select: { id: true, fullName: true, email: true, employeeId: true } },
              },
            },
          },
        },
        checklistItems: {
          include: {
            reviewedBy: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        user: { select: { id: true, fullName: true, email: true, employeeId: true } },
        hrClearedBy: { select: { id: true, fullName: true } },
        finalClearedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const recruiterIds = [
      ...new Set(
        rawClearances
          .map((c: any) => c.offer?.application?.recruiterId || c.offer?.application?.vacancy?.recruiterId)
          .filter(Boolean),
      ),
    ];
    let recruitersMap = new Map<string, any>();
    if (recruiterIds.length > 0) {
      const recruiters = await this.prisma.user.findMany({
        where: { id: { in: recruiterIds as string[] } },
        select: { id: true, fullName: true, email: true },
      });
      recruitersMap = new Map(recruiters.map((r) => [r.id, r]));
    }

    return rawClearances.map((c) => {
      const app = c.offer?.application;
      const activeRecruiterId = (app?.recruiterId || app?.vacancy?.recruiterId) as string | undefined;
      const recruiter = activeRecruiterId ? recruitersMap.get(activeRecruiterId) : null;
      const totalRequired = c.checklistItems.filter((i) => i.isRequired).length;
      const verifiedRequired = c.checklistItems.filter((i) => i.isRequired && i.status === 'VERIFIED').length;
      const isComplete = c.status === 'COMPLETED' || c.status === 'FINAL_CLEARED' || !!c.finalClearedAt;

      return {
        ...c,
        applicationId: app?.id || c.offer?.applicationId || null,
        applicationNumber: app?.applicationId || 'Not assigned',
        candidateName: app ? `${app.firstName} ${app.lastName || ''}`.trim() : 'Candidate',
        candidateEmail: app?.email || 'Not assigned',
        candidateMobile: app?.mobile || 'Not assigned',
        jobRole: c.offer?.designation || app?.vacancy?.designation || app?.vacancy?.title || 'Not assigned',
        vacancyId: app?.vacancy?.vacancyCode || 'Not assigned',
        department: c.offer?.department || app?.vacancy?.department || 'Not assigned',
        recruiterName: recruiter?.fullName || 'Not assigned',
        appliedDate: app?.createdAt || null,
        joiningDate: c.offer?.joiningDate || app?.onboarding?.joiningDate || null,
        totalRequiredItems: totalRequired,
        verifiedRequiredItems: verifiedRequired,
        hrClearanceStatus: c.hrClearedAt ? 'APPROVED' : c.status === 'FAILED' ? 'FAILED' : 'PENDING',
        finalClearanceStatus: isComplete ? 'APPROVED' : c.status === 'FAILED' ? 'FAILED' : 'PENDING',
        onboardingStatus:
          app?.onboarding?.status ||
          (app?.status === 'JOINED'
            ? 'COMPLETED'
            : app?.status === 'ONBOARDING'
            ? 'IN_PROGRESS'
            : 'NOT_STARTED'),
        onboardingEmployeeId: app?.onboarding?.employeeId || null,
        application: app
          ? {
              ...app,
              vacancy: app.vacancy,
              onboarding: app.onboarding,
              recruiter: recruiter || null,
            }
          : null,
      };
    });
  }

  async updateClearanceStatus(
    clearanceId: string,
    status: string,
    approverId: string,
    notes?: string,
  ) {
    const clearance = await this.prisma.employeeClearance.findUnique({
      where: { id: clearanceId },
      include: {
        checklistItems: true,
        offer: {
          include: {
            application: {
              include: { vacancy: true },
            },
          },
        },
      },
    });

    if (!clearance) {
      throw new NotFoundException('Clearance record not found');
    }

    const validApproverId = await this.getValidUserIdOrNull(approverId);
    const updateData: any = { status, notes };

    if (status === 'HR_CLEARED' || status === 'APPROVED') {
      updateData.status = 'HR_CLEARED';
      updateData.hrClearedAt = new Date();
      updateData.hrClearedById = validApproverId;
    } else if (status === 'FINAL_CLEARED' || status === 'COMPLETED') {
      // Validate all required checklist items
      const incompleteRequired = clearance.checklistItems.filter(
        (i) => i.isRequired && i.itemKey !== 'FINAL_HR' && i.status !== 'VERIFIED' && i.status !== 'NOT_REQUIRED',
      );

      if (incompleteRequired.length > 0) {
        throw new BadRequestException(
          `Cannot complete clearance. Incomplete verification items: ${incompleteRequired.map((i) => i.title).join(', ')}`,
        );
      }

      // Mark FINAL_HR verified
      const finalHrItem = clearance.checklistItems.find((i) => i.itemKey === 'FINAL_HR');
      if (finalHrItem) {
        await this.prisma.clearanceChecklistItem.update({
          where: { id: finalHrItem.id },
          data: {
            status: 'VERIFIED',
            reviewedById: validApproverId,
            reviewedAt: new Date(),
          },
        });
      }

      updateData.status = 'COMPLETED';
      updateData.finalClearedAt = new Date();
      updateData.finalClearedById = validApproverId;
      if (!clearance.hrClearedAt) {
        updateData.hrClearedAt = new Date();
        updateData.hrClearedById = validApproverId;
      }
    } else if (status === 'FAILED') {
      updateData.status = 'FAILED';
      updateData.failureReason = notes || 'Clearance verification failed';
    }

    const updated = await this.prisma.employeeClearance.update({
      where: { id: clearanceId },
      data: updateData,
      include: {
        checklistItems: true,
      },
    });

    const app = clearance.offer?.application;
    const candidateFullName = app ? `${app.firstName} ${app.lastName || ''}`.trim() : 'Candidate';

    // If clearance completed, advance application to ONBOARDING
    if (app && (updateData.status === 'COMPLETED' || updateData.status === 'FINAL_CLEARED')) {
      await this.updateApplicationStatus(
        app.id,
        {
          status: 'ONBOARDING',
          note: 'Clearance verification completed and approved. Ready for staff onboarding.',
        },
        approverId,
      );

      if (this.notificationsService) {
        await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_CLEARANCE_COMPLETED', {
          candidateUserId: app.userId || undefined,
          candidateName: candidateFullName,
          candidateEmail: app.email,
          candidateMobile: app.mobile,
          applicationId: app.applicationId,
          vacancyId: app.vacancyId,
          vacancyTitle: app.vacancy?.title || 'Open Role',
          designation: clearance.offer?.designation || undefined,
          department: clearance.offer?.department || undefined,
          actionUrl: `/admin/hr?applicationId=${app.id}`,
        });

        await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_HR_CLEARANCE_COMPLETED', {
          candidateName: candidateFullName,
          applicationId: app.applicationId,
          vacancyTitle: app.vacancy?.title || 'Open Role',
          recruiterId: app.recruiterId || undefined,
          notifyHr: true,
        });
      }
    }

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: updateData.status === 'COMPLETED' ? 'CLEARANCE_COMPLETED' : 'CLEARANCE_STATUS_CHANGED',
        description: `Updated employee onboarding clearance status to ${updateData.status} for ${candidateFullName}`,
        entity: 'EmployeeClearance',
        entityId: clearanceId,
        userId: approverId,
        newValue: updateData.status,
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit logging failed: ${auditErr.message}`);
    }

    return updated;
  }

  // ---------------------------------------------------------
  // 5. OFFER MANAGEMENT
  // ---------------------------------------------------------

  async getOfferByApplicationId(applicationId: string) {
    const offer = await this.prisma.offer.findFirst({
      where: {
        OR: [
          { applicationId },
          { id: applicationId },
          { offerCode: applicationId },
        ],
      },
      include: {
        application: {
          include: {
            vacancy: true,
            user: { select: { id: true, fullName: true, email: true, mobile: true } },
          },
        },
        clearance: {
          include: {
            checklistItems: {
              include: {
                reviewedBy: { select: { id: true, fullName: true } },
              },
            },
          },
        },
      },
    });

    return offer || null;
  }

  async createOffer(dto: CreateOfferDto, userId: string) {
    const app = await this.prisma.jobApplication.findFirst({
      where: {
        OR: [{ id: dto.applicationId }, { applicationId: dto.applicationId }],
      },
      include: {
        vacancy: true,
        offer: true,
      },
    });

    if (!app) {
      throw new NotFoundException('Candidate application not found');
    }

    const allowedInitialStatuses = ['SELECTED', 'OFFERED', 'OFFER_SENT'];
    if (!allowedInitialStatuses.includes(app.status)) {
      throw new BadRequestException(
        `Cannot create offer. Applicant must be marked SELECTED (Current status: ${app.status}).`,
      );
    }

    if (
      app.offer &&
      ['DRAFT', 'OFFER_SENT', 'SENT', 'ACCEPTED', 'OFFER_ACCEPTED'].includes(app.offer.status)
    ) {
      throw new BadRequestException(
        `An active offer (${app.offer.offerCode || app.offer.id}) already exists for this application. Please cancel or update the active offer.`,
      );
    }

    const offerCount = await this.prisma.offer.count();
    const currentYear = new Date().getFullYear();
    const offerCode = `SWY-OFFER-${currentYear}-${String(offerCount + 1).padStart(4, '0')}`;

    const parsedSalary = parseFloat(String(dto.salary).replace(/[^0-9.]/g, '')) || 0;

    const offerPayload: any = {
      offerCode,
      designation: dto.designation || app.vacancy?.designation || app.vacancy?.title,
      department: dto.department || app.vacancy?.department || 'Admissions',
      employmentType: dto.employmentType || app.vacancy?.employmentType || 'FULL_TIME',
      workMode: dto.workMode || app.vacancy?.workMode || 'ONSITE',
      workLocation: dto.workLocation || app.vacancy?.location || 'Head Office',
      reportingManager: dto.reportingManager || null,
      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
      salary: parsedSalary,
      salaryFrequency: dto.salaryFrequency || 'ANNUAL',
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      notes: dto.notes || null,
      terms: dto.terms || null,
      offerLetterUrl: dto.offerLetterUrl || null,
      status: dto.sendImmediately ? 'OFFER_SENT' : 'DRAFT',
      sentAt: dto.sendImmediately ? new Date() : null,
      createdById: userId,
    };

    let offer: any;
    if (app.offer) {
      offer = await this.prisma.offer.update({
        where: { id: app.offer.id },
        data: offerPayload,
        include: { application: { include: { vacancy: true } } },
      });
    } else {
      offer = await this.prisma.offer.create({
        data: {
          applicationId: app.id,
          ...offerPayload,
        },
        include: { application: { include: { vacancy: true } } },
      });
    }

    const candidateFullName = `${app.firstName} ${app.lastName || ''}`.trim();

    if (dto.sendImmediately) {
      await this.updateApplicationStatus(
        app.id,
        {
          status: 'OFFER_SENT',
          note: `Official employment offer ${offerCode} issued & sent to candidate.`,
        },
        userId,
      );

      try {
        await this.auditService.logAction({
          module: 'HR_RECRUITMENT',
          action: 'OFFER_SENT',
          description: `Dispatched employment offer ${offerCode} to ${candidateFullName}`,
          entity: 'Offer',
          entityId: offer.id,
          userId,
        });
      } catch (err: any) {
        this.logger.warn(`Audit failed: ${err.message}`);
      }

      if (this.notificationsService) {
        await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_OFFER_SENT', {
          candidateUserId: app.userId || undefined,
          candidateName: candidateFullName,
          candidateEmail: app.email,
          candidateMobile: app.mobile,
          applicationId: app.applicationId,
          vacancyId: app.vacancyId,
          vacancyTitle: app.vacancy?.title || 'Open Role',
          offerId: offerCode,
          designation: offer.designation || undefined,
          department: offer.department || undefined,
          salary: `₹${offer.salary?.toLocaleString('en-IN')}`,
          joiningDate: offer.joiningDate?.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          actionUrl: `/careers/offers/${offer.id}`,
        });
      }
    } else {
      try {
        await this.auditService.logAction({
          module: 'HR_RECRUITMENT',
          action: 'OFFER_CREATED',
          description: `Drafted employment offer ${offerCode} for ${candidateFullName}`,
          entity: 'Offer',
          entityId: offer.id,
          userId,
        });
      } catch (err: any) {
        this.logger.warn(`Audit failed: ${err.message}`);
      }

      if (this.notificationsService) {
        await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_OFFER_CREATED', {
          candidateUserId: app.userId || undefined,
          candidateName: candidateFullName,
          candidateEmail: app.email,
          applicationId: app.applicationId,
          vacancyId: app.vacancyId,
          vacancyTitle: app.vacancy?.title || 'Open Role',
          offerId: offerCode,
        });
      }
    }

    return offer;
  }

  async sendOffer(offerId: string, userId: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { OR: [{ id: offerId }, { offerCode: offerId }] },
      include: { application: { include: { vacancy: true } } },
    });

    if (!offer) {
      throw new NotFoundException('Offer record not found');
    }

    const app = offer.application;
    const candidateFullName = `${app.firstName} ${app.lastName || ''}`.trim();

    const updatedOffer = await this.prisma.offer.update({
      where: { id: offer.id },
      data: {
        status: 'OFFER_SENT',
        sentAt: new Date(),
      },
      include: { application: { include: { vacancy: true } } },
    });

    await this.updateApplicationStatus(
      app.id,
      {
        status: 'OFFER_SENT',
        note: `Employment offer ${offer.offerCode || offer.id} dispatched to candidate.`,
      },
      userId,
    );

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'OFFER_SENT',
        description: `Dispatched offer ${offer.offerCode} to ${candidateFullName}`,
        entity: 'Offer',
        entityId: offer.id,
        userId,
      });
    } catch (err: any) {
      this.logger.warn(`Audit failed: ${err.message}`);
    }

    if (this.notificationsService) {
      await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_OFFER_SENT', {
        candidateUserId: app.userId || undefined,
        candidateName: candidateFullName,
        candidateEmail: app.email,
        candidateMobile: app.mobile,
        applicationId: app.applicationId,
        vacancyId: app.vacancyId,
        vacancyTitle: app.vacancy?.title || 'Open Role',
        offerId: offer.offerCode || offer.id,
        designation: offer.designation || undefined,
        department: offer.department || undefined,
        salary: `₹${offer.salary?.toLocaleString('en-IN')}`,
        joiningDate: offer.joiningDate?.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        actionUrl: `/careers/offers/${offer.id}`,
      });
    }

    return updatedOffer;
  }

  async resendOffer(offerId: string, userId: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { OR: [{ id: offerId }, { offerCode: offerId }] },
      include: { application: { include: { vacancy: true } } },
    });

    if (!offer) {
      throw new NotFoundException('Offer record not found');
    }

    const app = offer.application;
    const candidateFullName = `${app.firstName} ${app.lastName || ''}`.trim();

    const updatedOffer = await this.prisma.offer.update({
      where: { id: offer.id },
      data: {
        sentAt: new Date(),
      },
      include: { application: { include: { vacancy: true } } },
    });

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'OFFER_RESENT',
        description: `Resent offer reminder ${offer.offerCode} to ${candidateFullName}`,
        entity: 'Offer',
        entityId: offer.id,
        userId,
      });
    } catch (err: any) {
      this.logger.warn(`Audit failed: ${err.message}`);
    }

    if (this.notificationsService) {
      await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_OFFER_RESENT', {
        candidateUserId: app.userId || undefined,
        candidateName: candidateFullName,
        candidateEmail: app.email,
        candidateMobile: app.mobile,
        applicationId: app.applicationId,
        vacancyId: app.vacancyId,
        vacancyTitle: app.vacancy?.title || 'Open Role',
        offerId: offer.offerCode || offer.id,
        designation: offer.designation || undefined,
        department: offer.department || undefined,
        salary: `₹${offer.salary?.toLocaleString('en-IN')}`,
        joiningDate: offer.joiningDate?.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        actionUrl: `/careers/offers/${offer.id}`,
      });
    }

    return updatedOffer;
  }

  async cancelOffer(offerId: string, reason: string, userId: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { OR: [{ id: offerId }, { offerCode: offerId }] },
      include: { application: { include: { vacancy: true } } },
    });

    if (!offer) {
      throw new NotFoundException('Offer record not found');
    }

    const app = offer.application;
    const candidateFullName = `${app.firstName} ${app.lastName || ''}`.trim();

    const updatedOffer = await this.prisma.offer.update({
      where: { id: offer.id },
      data: {
        status: 'CANCELLED',
        notes: offer.notes ? `${offer.notes}\n[CANCELLED]: ${reason}` : `[CANCELLED]: ${reason}`,
      },
    });

    await this.updateApplicationStatus(
      app.id,
      {
        status: 'CANCELLED',
        note: `Offer ${offer.offerCode} cancelled by HR. Reason: ${reason || 'Administrative decision'}`,
      },
      userId,
    );

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'OFFER_CANCELLED',
        description: `Cancelled offer ${offer.offerCode} for ${candidateFullName}. Reason: ${reason}`,
        entity: 'Offer',
        entityId: offer.id,
        userId,
      });
    } catch (err: any) {
      this.logger.warn(`Audit failed: ${err.message}`);
    }

    return updatedOffer;
  }

  async respondToOffer(identifier: string, dto: RespondOfferDto, actorUserId?: string) {
    const offer = await this.prisma.offer.findFirst({
      where: {
        OR: [
          { id: identifier },
          { offerCode: identifier },
          { applicationId: identifier },
        ],
      },
      include: { application: { include: { vacancy: true } } },
    });

    if (!offer) {
      throw new NotFoundException('Offer record not found');
    }

    const app = offer.application;
    const candidateFullName = `${app.firstName} ${app.lastName || ''}`.trim();

    // Check expiration
    if (offer.validUntil && new Date() > offer.validUntil) {
      await this.prisma.offer.update({
        where: { id: offer.id },
        data: { status: 'EXPIRED' },
      });

      if (this.notificationsService) {
        await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_OFFER_EXPIRED', {
          candidateUserId: app.userId || undefined,
          candidateName: candidateFullName,
          candidateEmail: app.email,
          applicationId: app.applicationId,
          vacancyTitle: app.vacancy?.title || 'Open Role',
          offerId: offer.offerCode || offer.id,
        });
      }

      throw new BadRequestException('This offer has expired. Please contact HR for assistance.');
    }

    if (dto.action === 'ACCEPT') {
      const updatedOffer = await this.prisma.offer.update({
        where: { id: offer.id },
        data: {
          status: 'OFFER_ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      await this.updateApplicationStatus(
        app.id,
        {
          status: 'OFFER_ACCEPTED',
          note: `Offer accepted by candidate${dto.channel ? ` via ${dto.channel}` : ''}.`,
        },
        actorUserId || 'CANDIDATE',
      );

      try {
        await this.auditService.logAction({
          module: 'HR_RECRUITMENT',
          action: 'OFFER_ACCEPTED',
          description: `Offer ${offer.offerCode} accepted by candidate ${candidateFullName}`,
          entity: 'Offer',
          entityId: offer.id,
          userId: actorUserId || 'CANDIDATE',
        });
      } catch (err: any) {
        this.logger.warn(`Audit failed: ${err.message}`);
      }

      if (this.notificationsService) {
        await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_OFFER_ACCEPTED', {
          candidateUserId: app.userId || undefined,
          candidateName: candidateFullName,
          candidateEmail: app.email,
          candidateMobile: app.mobile,
          applicationId: app.applicationId,
          vacancyId: app.vacancyId,
          vacancyTitle: app.vacancy?.title || 'Open Role',
          offerId: offer.offerCode || offer.id,
          designation: offer.designation || undefined,
          department: offer.department || undefined,
        });

        await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_HR_OFFER_ACCEPTED', {
          candidateName: candidateFullName,
          candidateEmail: app.email,
          applicationId: app.applicationId,
          vacancyTitle: app.vacancy?.title || 'Open Role',
          recruiterId: app.recruiterId || undefined,
          notifyHr: true,
          actionUrl: `/admin/hr?applicationId=${app.id}`,
        });
      }

      // Automatically initialize clearance checklist
      const clearance = await this.startClearance(app.id, actorUserId || 'SYSTEM');

      return {
        success: true,
        action: 'ACCEPTED',
        offer: updatedOffer,
        clearance,
      };
    } else if (dto.action === 'DECLINE') {
      if (!dto.reason || !dto.reason.trim()) {
        throw new BadRequestException('A reason is mandatory when declining an employment offer.');
      }

      const updatedOffer = await this.prisma.offer.update({
        where: { id: offer.id },
        data: {
          status: 'OFFER_DECLINED',
          declinedAt: new Date(),
          declinedReason: dto.reason.trim(),
        },
      });

      await this.updateApplicationStatus(
        app.id,
        {
          status: 'OFFER_DECLINED',
          reason: dto.reason.trim(),
          note: `Offer declined by candidate: ${dto.reason.trim()}`,
        },
        actorUserId || 'CANDIDATE',
      );

      try {
        await this.auditService.logAction({
          module: 'HR_RECRUITMENT',
          action: 'OFFER_DECLINED',
          description: `Offer ${offer.offerCode} declined by candidate ${candidateFullName}. Reason: ${dto.reason}`,
          entity: 'Offer',
          entityId: offer.id,
          userId: actorUserId || 'CANDIDATE',
        });
      } catch (err: any) {
        this.logger.warn(`Audit failed: ${err.message}`);
      }

      if (this.notificationsService) {
        await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_OFFER_DECLINED', {
          candidateUserId: app.userId || undefined,
          candidateName: candidateFullName,
          candidateEmail: app.email,
          applicationId: app.applicationId,
          vacancyTitle: app.vacancy?.title || 'Open Role',
          offerId: offer.offerCode || offer.id,
          reason: dto.reason.trim(),
        });

        await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_HR_OFFER_DECLINED', {
          candidateName: candidateFullName,
          candidateEmail: app.email,
          applicationId: app.applicationId,
          vacancyTitle: app.vacancy?.title || 'Open Role',
          recruiterId: app.recruiterId || undefined,
          reason: dto.reason.trim(),
          notifyHr: true,
          actionUrl: `/admin/hr?applicationId=${app.id}`,
        });
      }

      return {
        success: true,
        action: 'DECLINED',
        offer: updatedOffer,
      };
    } else {
      throw new BadRequestException('Invalid offer response action. Must be ACCEPT or DECLINE.');
    }
  }

  // ---------------------------------------------------------
  // 6. CLEARANCE CHECKLIST VERIFICATION
  // ---------------------------------------------------------

  async getClearanceByApplicationId(applicationId: string) {
    const offer = await this.prisma.offer.findFirst({
      where: {
        OR: [
          { applicationId },
          { application: { applicationId } },
        ],
      },
      include: {
        application: {
          include: {
            vacancy: true,
            user: { select: { id: true, fullName: true, email: true, employeeId: true } },
            onboarding: true,
          },
        },
        clearance: {
          include: {
            checklistItems: {
              include: {
                reviewedBy: { select: { id: true, fullName: true, email: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
            hrClearedBy: { select: { id: true, fullName: true } },
            finalClearedBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!offer?.clearance) {
      return null;
    }

    const app = offer.application;
    let recruiter: any = null;
    const activeRecruiterId = app?.recruiterId || app?.vacancy?.recruiterId;
    if (activeRecruiterId) {
      recruiter = await this.prisma.user.findUnique({
        where: { id: activeRecruiterId },
        select: { id: true, fullName: true, email: true },
      });
    }

    const totalRequired = offer.clearance.checklistItems.filter((i) => i.isRequired).length;
    const verifiedRequired = offer.clearance.checklistItems.filter((i) => i.isRequired && i.status === 'VERIFIED').length;
    const isComplete = offer.clearance.status === 'COMPLETED' || offer.clearance.status === 'FINAL_CLEARED' || !!offer.clearance.finalClearedAt;

    return {
      ...offer.clearance,
      applicationId: app?.id || offer.applicationId,
      applicationNumber: app?.applicationId || 'Not assigned',
      candidateName: app ? `${app.firstName} ${app.lastName || ''}`.trim() : 'Candidate',
      candidateEmail: app?.email || 'Not assigned',
      candidateMobile: app?.mobile || 'Not assigned',
      jobRole: offer.designation || app?.vacancy?.designation || app?.vacancy?.title || 'Not assigned',
      vacancyId: app?.vacancy?.vacancyCode || 'Not assigned',
      department: offer.department || app?.vacancy?.department || 'Not assigned',
      recruiterName: recruiter?.fullName || 'Not assigned',
      appliedDate: app?.createdAt || null,
      joiningDate: offer.joiningDate || app?.onboarding?.joiningDate || null,
      totalRequiredItems: totalRequired,
      verifiedRequiredItems: verifiedRequired,
      hrClearanceStatus: offer.clearance.hrClearedAt ? 'APPROVED' : offer.clearance.status === 'FAILED' ? 'FAILED' : 'PENDING',
      finalClearanceStatus: isComplete ? 'APPROVED' : offer.clearance.status === 'FAILED' ? 'FAILED' : 'PENDING',
      onboardingStatus:
        app?.onboarding?.status ||
        (app?.status === 'JOINED'
          ? 'COMPLETED'
          : app?.status === 'ONBOARDING'
          ? 'IN_PROGRESS'
          : 'NOT_STARTED'),
      onboardingEmployeeId: app?.onboarding?.employeeId || null,
      application: app
        ? {
            ...app,
            vacancy: app.vacancy,
            onboarding: app.onboarding,
            recruiter: recruiter || null,
          }
        : null,
      offer,
    };
  }

  private async getValidUserIdOrNull(userId?: string | null): Promise<string | null> {
    if (!userId || userId === 'SYSTEM' || userId === 'CANDIDATE') return null;
    try {
      const exists = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      return exists ? exists.id : null;
    } catch {
      return null;
    }
  }

  async startClearance(applicationId: string, userId: string) {
    const app = await this.prisma.jobApplication.findFirst({
      where: { OR: [{ id: applicationId }, { applicationId }] },
      include: {
        vacancy: true,
        offer: {
          include: {
            clearance: {
              include: {
                checklistItems: true,
              },
            },
          },
        },
      },
    });

    if (!app) {
      throw new NotFoundException('Candidate application not found');
    }

    if (!app.offer) {
      throw new BadRequestException('Cannot start clearance without an existing offer.');
    }

    if (app.offer.clearance) {
      return app.offer.clearance;
    }

    const reviewerId = await this.getValidUserIdOrNull(userId);

    const defaultItems = [
      { itemKey: 'IDENTITY_KYC', title: 'Identity & KYC Verification (Aadhaar / PAN)', isRequired: true, status: 'PENDING' },
      { itemKey: 'ADDRESS', title: 'Permanent & Current Address Verification', isRequired: true, status: 'PENDING' },
      { itemKey: 'EDUCATION', title: 'Educational Credentials & Degree Verification', isRequired: true, status: 'PENDING' },
      { itemKey: 'RESUME', title: 'Resume & Work Experience Background Check', isRequired: true, status: 'PENDING' },
      { itemKey: 'EMPLOYMENT_BG', title: 'Previous Employer Verification / Relieving Letter', isRequired: false, status: 'PENDING' },
      { itemKey: 'UPLOADED_DOCS', title: 'Uploaded Candidate Documents Review', isRequired: true, status: 'PENDING' },
      { itemKey: 'OFFER_VERIFICATION', title: 'Signed Offer Acceptance Verification', isRequired: true, status: 'VERIFIED', reviewedById: reviewerId, reviewedAt: new Date() },
      { itemKey: 'FINAL_HR', title: 'Final HR Clearance Approval', isRequired: true, status: 'PENDING' },
    ];

    const clearance = await this.prisma.employeeClearance.create({
      data: {
        offerId: app.offer.id,
        userId: app.userId || null,
        status: 'IN_PROGRESS',
        checklistItems: {
          create: defaultItems,
        },
      },
      include: {
        checklistItems: {
          include: {
            reviewedBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    await this.updateApplicationStatus(
      app.id,
      {
        status: 'CLEARANCE',
        note: 'Candidate clearance checklist initialized.',
      },
      userId,
    );

    const candidateFullName = `${app.firstName} ${app.lastName || ''}`.trim();

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'CLEARANCE_STARTED',
        description: `Started candidate onboarding clearance for ${candidateFullName}`,
        entity: 'EmployeeClearance',
        entityId: clearance.id,
        userId,
      });
    } catch (err: any) {
      this.logger.warn(`Audit failed: ${err.message}`);
    }

    if (this.notificationsService) {
      await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_CLEARANCE_STARTED', {
        candidateUserId: app.userId || undefined,
        candidateName: candidateFullName,
        candidateEmail: app.email,
        candidateMobile: app.mobile,
        applicationId: app.applicationId,
        vacancyId: app.vacancyId,
        vacancyTitle: app.vacancy?.title || 'Open Role',
        designation: app.offer.designation || undefined,
        department: app.offer.department || undefined,
        actionUrl: `/admin/hr?applicationId=${app.id}`,
      });
    }

    return clearance;
  }

  async updateClearanceItem(itemId: string, dto: UpdateClearanceItemDto, userId: string) {
    const item = await this.prisma.clearanceChecklistItem.findUnique({
      where: { id: itemId },
      include: {
        clearance: {
          include: {
            offer: {
              include: {
                application: {
                  include: { vacancy: true },
                },
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Clearance checklist item not found');
    }

    if (dto.status === 'FAILED' && (!dto.failureReason || !dto.failureReason.trim())) {
      throw new BadRequestException('A reason is mandatory when marking a clearance item as FAILED.');
    }

    const reviewerUserId = await this.getValidUserIdOrNull(userId);
    const updatedItem = await this.prisma.clearanceChecklistItem.update({
      where: { id: itemId },
      data: {
        status: dto.status,
        remarks: dto.remarks !== undefined ? dto.remarks : item.remarks,
        failureReason: dto.failureReason !== undefined ? dto.failureReason : item.failureReason,
        documentUrl: dto.documentUrl !== undefined ? dto.documentUrl : item.documentUrl,
        reviewedById: reviewerUserId,
        reviewedAt: new Date(),
      },
      include: {
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    const app = item.clearance?.offer?.application;
    const candidateFullName = app ? `${app.firstName} ${app.lastName || ''}`.trim() : 'Candidate';

    if (dto.status === 'FAILED') {
      await this.prisma.employeeClearance.update({
        where: { id: item.clearanceId },
        data: {
          status: 'FAILED',
          failureReason: dto.failureReason,
        },
      });

      if (app) {
        await this.updateApplicationStatus(
          app.id,
          {
            status: 'VERIFICATION_FAILED',
            reason: dto.failureReason,
            note: `Verification failed on ${item.title}: ${dto.failureReason}`,
          },
          userId,
        );
      }

      if (this.notificationsService && app) {
        await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_CLEARANCE_ITEM_FAILED', {
          candidateUserId: app.userId || undefined,
          candidateName: candidateFullName,
          candidateEmail: app.email,
          applicationId: app.applicationId,
          vacancyTitle: app.vacancy?.title || 'Open Role',
          reason: `${item.title}: ${dto.failureReason}`,
        });

        await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_HR_CLEARANCE_FAILED', {
          candidateName: candidateFullName,
          applicationId: app.applicationId,
          vacancyTitle: app.vacancy?.title || 'Open Role',
          reason: `${item.title}: ${dto.failureReason}`,
          notifyHr: true,
        });
      }
    } else if (dto.status === 'VERIFIED') {
      if (this.notificationsService && app) {
        await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_CLEARANCE_ITEM_APPROVED', {
          candidateUserId: app.userId || undefined,
          candidateName: candidateFullName,
          candidateEmail: app.email,
          applicationId: app.applicationId,
          vacancyTitle: app.vacancy?.title || 'Open Role',
          reason: item.title,
        });
      }
    }

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'CLEARANCE_ITEM_UPDATED',
        description: `Updated clearance item ${item.title} to ${dto.status} for ${candidateFullName}`,
        entity: 'ClearanceChecklistItem',
        entityId: item.id,
        userId,
        newValue: { status: dto.status, reason: dto.failureReason },
      });
    } catch (err: any) {
      this.logger.warn(`Audit failed: ${err.message}`);
    }

    return updatedItem;
  }

  async completeClearance(clearanceId: string, dto: CompleteClearanceDto, userId: string) {
    const clearance = await this.prisma.employeeClearance.findUnique({
      where: { id: clearanceId },
      include: {
        checklistItems: true,
        offer: {
          include: {
            application: {
              include: { vacancy: true },
            },
          },
        },
      },
    });

    if (!clearance) {
      throw new NotFoundException('Clearance record not found');
    }

    const app = clearance.offer?.application;
    const reviewerUserId = await this.getValidUserIdOrNull(userId);

    // If clearance is already COMPLETED or FINAL_CLEARED, ensure application is in ONBOARDING
    if (clearance.status === 'COMPLETED' || clearance.status === 'FINAL_CLEARED') {
      if (app && app.status === 'CLEARANCE') {
        await this.updateApplicationStatus(
          app.id,
          {
            status: 'ONBOARDING',
            note: 'Clearance was previously verified. Synchronized candidate status to ONBOARDING.',
          },
          userId,
        );
      }
      return clearance;
    }

    // If dto.approveAllItems is requested, approve all pending required items
    if (dto.approveAllItems) {
      await this.prisma.clearanceChecklistItem.updateMany({
        where: {
          clearanceId,
          isRequired: true,
          status: { not: 'VERIFIED' },
        },
        data: {
          status: 'VERIFIED',
          reviewedById: reviewerUserId,
          reviewedAt: new Date(),
        },
      });
      clearance.checklistItems = await this.prisma.clearanceChecklistItem.findMany({
        where: { clearanceId },
      });
    }

    const incompleteRequired = clearance.checklistItems.filter(
      (i) => i.isRequired && i.itemKey !== 'FINAL_HR' && i.status !== 'VERIFIED' && i.status !== 'NOT_REQUIRED',
    );

    if (incompleteRequired.length > 0) {
      throw new BadRequestException(
        `Cannot complete clearance. Incomplete verification items: ${incompleteRequired.map((i) => i.title).join(', ')}`,
      );
    }

    const finalHrItem = clearance.checklistItems.find((i) => i.itemKey === 'FINAL_HR');
    if (finalHrItem) {
      await this.prisma.clearanceChecklistItem.update({
        where: { id: finalHrItem.id },
        data: {
          status: 'VERIFIED',
          reviewedById: reviewerUserId,
          reviewedAt: new Date(),
        },
      });
    }

    const updatedClearance = await this.prisma.employeeClearance.update({
      where: { id: clearanceId },
      data: {
        status: 'COMPLETED',
        hrClearedAt: clearance.hrClearedAt || new Date(),
        hrClearedById: clearance.hrClearedById || reviewerUserId,
        finalClearedAt: new Date(),
        finalClearedById: reviewerUserId,
        notes: dto.notes || 'All clearance checklist requirements verified and approved.',
      },
      include: {
        checklistItems: true,
      },
    });

    const candidateFullName = app ? `${app.firstName} ${app.lastName || ''}`.trim() : 'Candidate';

    if (app) {
      await this.updateApplicationStatus(
        app.id,
        {
          status: 'ONBOARDING',
          note: 'Clearance verification successfully completed. Ready for staff onboarding.',
        },
        userId,
      );
    }

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'CLEARANCE_COMPLETED',
        description: `Completed and approved clearance for ${candidateFullName}`,
        entity: 'EmployeeClearance',
        entityId: clearance.id,
        userId,
      });
    } catch (err: any) {
      this.logger.warn(`Audit failed: ${err.message}`);
    }

    if (this.notificationsService && app) {
      await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_CLEARANCE_COMPLETED', {
        candidateUserId: app.userId || undefined,
        candidateName: candidateFullName,
        candidateEmail: app.email,
        candidateMobile: app.mobile,
        applicationId: app.applicationId,
        vacancyId: app.vacancyId,
        vacancyTitle: app.vacancy?.title || 'Open Role',
        designation: clearance.offer?.designation || undefined,
        department: clearance.offer?.department || undefined,
        actionUrl: `/admin/hr?applicationId=${app.id}`,
      });

      await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_HR_CLEARANCE_COMPLETED', {
        candidateName: candidateFullName,
        applicationId: app.applicationId,
        vacancyTitle: app.vacancy?.title || 'Open Role',
        recruiterId: app.recruiterId || undefined,
        notifyHr: true,
      });
    }

    return updatedClearance;
  }

  // ---------------------------------------------------------
  // 7. ONBOARDING & EMPLOYEE RECORD LINKING
  // ---------------------------------------------------------

  async getOnboardingByApplicationId(applicationId: string) {
    const onboarding = await this.prisma.recruitmentOnboarding.findFirst({
      where: {
        OR: [
          { applicationId },
          { application: { applicationId } },
        ],
      },
      include: {
        application: {
          include: {
            vacancy: true,
            offer: true,
          },
        },
        user: true,
        completedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    return onboarding || null;
  }

  async startOnboarding(applicationId: string, dto: StartOnboardingDto, userId: string) {
    const app = await this.prisma.jobApplication.findFirst({
      where: { OR: [{ id: applicationId }, { applicationId }] },
      include: {
        vacancy: true,
        offer: {
          include: { clearance: true },
        },
        onboarding: true,
      },
    });

    if (!app) {
      throw new NotFoundException('Candidate application not found');
    }

    const clearanceStatus = app.offer?.clearance?.status;
    const isCleared =
      clearanceStatus &&
      ['COMPLETED', 'FINAL_CLEARED', 'HR_CLEARED', 'VERIFIED'].includes(clearanceStatus);

    if (!app.offer?.clearance || !isCleared) {
      throw new BadRequestException('Candidate clearance must be fully COMPLETED or approved before initiating onboarding.');
    }

    const offer = app.offer;
    const employeeCount = await this.prisma.recruitmentOnboarding.count();
    const currentYear = new Date().getFullYear();
    let generatedEmployeeId = dto.employeeId?.trim();
    if (!generatedEmployeeId) {
      generatedEmployeeId = `SWY-EMP-${currentYear}-${String(employeeCount + 101).padStart(4, '0')}`;
    }

    let validJoiningDate: Date = offer.joiningDate || new Date();
    if (dto.joiningDate && !isNaN(new Date(dto.joiningDate).getTime())) {
      validJoiningDate = new Date(dto.joiningDate);
    }

    const onboardingPayload: any = {
      employeeId: generatedEmployeeId,
      department: dto.department || offer.department || app.vacancy?.department || 'Admissions',
      designation: dto.designation || offer.designation || app.vacancy?.designation || 'Specialist',
      reportingManager: dto.reportingManager || offer.reportingManager || null,
      workLocation: dto.workLocation || offer.workLocation || app.vacancy?.location || 'Head Office',
      workMode: dto.workMode || offer.workMode || app.vacancy?.workMode || 'ONSITE',
      employmentType: dto.employmentType || offer.employmentType || app.vacancy?.employmentType || 'FULL_TIME',
      officialEmail: (dto.officialEmail || app.email).trim().toLowerCase(),
      officialMobile: (dto.officialMobile || app.mobile).trim(),
      joiningDate: validJoiningDate,
      status: 'IN_PROGRESS',
      notes: dto.notes || null,
    };

    let onboarding: any;
    if (app.onboarding) {
      onboarding = await this.prisma.recruitmentOnboarding.update({
        where: { id: app.onboarding.id },
        data: onboardingPayload,
        include: { application: true },
      });
    } else {
      const existingWithId = await this.prisma.recruitmentOnboarding.findFirst({
        where: { employeeId: generatedEmployeeId },
      });
      if (existingWithId) {
        generatedEmployeeId = `SWY-EMP-${currentYear}-${String(employeeCount + 1000 + Math.floor(Math.random() * 900)).padStart(4, '0')}`;
        onboardingPayload.employeeId = generatedEmployeeId;
      }

      onboarding = await this.prisma.recruitmentOnboarding.create({
        data: {
          applicationId: app.id,
          ...onboardingPayload,
        },
        include: { application: true },
      });
    }

    await this.updateApplicationStatus(
      app.id,
      {
        status: 'ONBOARDING',
        note: `Staff onboarding initiated. Staff ID: ${generatedEmployeeId}.`,
      },
      userId,
    );

    const candidateFullName = `${app.firstName} ${app.lastName || ''}`.trim();

    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'ONBOARDING_STARTED',
        description: `Initiated onboarding for ${candidateFullName} (${generatedEmployeeId})`,
        entity: 'RecruitmentOnboarding',
        entityId: onboarding.id,
        userId,
      });
    } catch (err: any) {
      this.logger.warn(`Audit failed: ${err.message}`);
    }

    if (this.notificationsService) {
      await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_ONBOARDING_STARTED', {
        candidateUserId: app.userId || undefined,
        candidateName: candidateFullName,
        candidateEmail: onboarding.officialEmail || app.email,
        candidateMobile: onboarding.officialMobile || app.mobile,
        applicationId: app.applicationId,
        vacancyId: app.vacancyId,
        vacancyTitle: app.vacancy?.title || 'Open Role',
        employeeId: generatedEmployeeId,
        department: onboarding.department,
        designation: onboarding.designation,
        joiningDate: onboarding.joiningDate?.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      });
    }

    return onboarding;
  }

  async completeOnboarding(applicationId: string, dto: CompleteOnboardingDto, userId: string) {
    const app = await this.prisma.jobApplication.findFirst({
      where: { OR: [{ id: applicationId }, { applicationId }] },
      include: {
        vacancy: true,
        offer: {
          include: {
            clearance: {
              include: { checklistItems: true },
            },
          },
        },
        onboarding: true,
        user: true,
      },
    });

    if (!app) {
      throw new NotFoundException('Candidate recruitment application not found');
    }

    // 1. CLEARANCE & MANDATORY REQUIREMENTS VALIDATION
    const clearance = app.offer?.clearance;
    if (clearance) {
      if (clearance.status === 'FAILED') {
        throw new BadRequestException(
          `Cannot complete onboarding. Candidate clearance verification failed: ${clearance.failureReason || 'Clearance rejected'}.`,
        );
      }
      const pendingRequired = (clearance.checklistItems || []).filter(
        (item) => item.isRequired && item.status !== 'VERIFIED' && item.status !== 'NOT_REQUIRED',
      );
      if (pendingRequired.length > 0) {
        throw new BadRequestException(
          `Cannot complete onboarding. ${pendingRequired.length} required clearance item(s) are pending verification: ${pendingRequired.map((i) => i.title).join(', ')}. Please verify all required clearance items first.`,
        );
      }
    }

    // 2. CANDIDATE IDENTITY & ONBOARDING DETAILS RESOLUTION
    const candidateFullName = `${app.firstName} ${app.lastName || ''}`.trim();
    const officialEmail = (dto.officialEmail || app.onboarding?.officialEmail || app.email).trim().toLowerCase();
    const officialMobile = (dto.officialMobile || app.onboarding?.officialMobile || app.mobile).trim();

    let employeeId = (dto.employeeId || app.onboarding?.employeeId || '').trim();
    if (!employeeId) {
      const count = await this.prisma.user.count({ where: { employeeId: { not: null } } });
      employeeId = `SA-EMP-${String(count + 101).padStart(4, '0')}`;
    }

    if (!/^[A-Za-z0-9_-]{4,30}$/.test(employeeId)) {
      throw new BadRequestException(
        'Employee ID must be between 4 and 30 characters containing only letters, numbers, hyphens, and underscores.',
      );
    }

    // Validate system role
    let targetRole: Role = Role.COUNSELOR;
    if (dto.role) {
      const roleStr = dto.role.trim().toUpperCase() as Role;
      if (Object.values(Role).includes(roleStr)) {
        targetRole = roleStr;
      } else {
        throw new BadRequestException(`Invalid system role: "${dto.role}". Please select a valid role.`);
      }
    } else if (app.onboarding?.department?.toLowerCase().includes('account') || app.onboarding?.department?.toLowerCase().includes('finance')) {
      targetRole = Role.ACCOUNTS_MANAGER;
    } else if (app.onboarding?.department?.toLowerCase().includes('market')) {
      targetRole = Role.MARKETING_TEAM;
    } else if (app.onboarding?.department?.toLowerCase().includes('content')) {
      targetRole = Role.CONTENT_MANAGER;
    } else if (app.onboarding?.designation?.toLowerCase().includes('senior')) {
      targetRole = Role.SENIOR_COUNSELOR;
    } else {
      targetRole = Role.COUNSELOR;
    }

    // Check if Employee ID is already assigned to a DIFFERENT user
    const existingUserWithEmpId = await this.prisma.user.findFirst({
      where: { employeeId },
    });
    if (
      existingUserWithEmpId &&
      existingUserWithEmpId.id !== app.userId &&
      existingUserWithEmpId.email?.toLowerCase() !== officialEmail
    ) {
      throw new ConflictException(
        `Employee ID "${employeeId}" is already assigned to another staff member (${existingUserWithEmpId.fullName || existingUserWithEmpId.email}). Please provide a unique Employee ID.`,
      );
    }

    // 3. FIND LINKED USER IDENTITY
    let existingUser = app.user;
    if (!existingUser && app.userId) {
      existingUser = await this.prisma.user.findUnique({ where: { id: app.userId } });
    }
    if (!existingUser) {
      existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: officialEmail },
            { employeeId },
            { mobile: officialMobile },
          ],
        },
      });
    }

    // 4. IDEMPOTENCY CHECK
    if (
      app.status === 'JOINED' &&
      app.onboarding?.status === 'COMPLETED' &&
      existingUser &&
      existingUser.id === app.userId
    ) {
      // Check if employeeId or role needs update
      const empIdChanged = employeeId && employeeId !== existingUser.employeeId;
      const roleChanged = targetRole && targetRole !== existingUser.role;

      if (empIdChanged || roleChanged) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            employeeId: employeeId || existingUser.employeeId,
            role: targetRole || existingUser.role,
          },
        });
        if (empIdChanged) {
          await this.prisma.recruitmentOnboarding.updateMany({
            where: { applicationId: app.id },
            data: { employeeId },
          });
        }
      }

      const effectiveEmpId = employeeId || existingUser.employeeId || 'STAFF';

      if (existingUser.status === 'PENDING_ACTIVATION') {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await this.prisma.accountActivationToken.updateMany({
          where: { userId: existingUser.id, isUsed: false },
          data: { isUsed: true, usedAt: new Date() },
        });

        await this.prisma.accountActivationToken.create({
          data: {
            userId: existingUser.id,
            tokenHash,
            expiresAt,
            isUsed: false,
          },
        });

        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { activationTokenHash: tokenHash, activationExpiresAt: expiresAt },
        });

        const channel = this.getEmailChannel();
        const isProtected = ['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'REGISTRAR', 'HR_MANAGER'].includes(existingUser.role);
        const portalUrl = isProtected
          ? (process.env.ADMIN_PORTAL_URL || 'https://admin.swayamadmission.com')
          : (process.env.ERP_PORTAL_URL || 'https://erp.swayamadmission.com');
        const activationBaseUrl = process.env.ADMIN_PORTAL_URL || 'https://admin.swayamadmission.com';
        const activationUrl = `${activationBaseUrl}/activate?token=${rawToken}`;

        // Non-blocking asynchronous email dispatch
        setImmediate(() => {
          void (async () => {
            try {
              await channel?.sendEmployeeActivationEmail({
                officialEmail,
                employeeName: candidateFullName,
                employeeId: effectiveEmpId,
                designation: app.onboarding?.designation || 'Staff',
                departmentName: app.onboarding?.department || 'General',
                activationUrl,
                expiresInHours: 24,
                portalUrl,
              });
            } catch (err: any) {
              this.logger.warn(`Failed sending activation email in idempotent step: ${err.message}`);
            }
          })();
        });
      }

      return {
        success: true,
        alreadyCompleted: true,
        onboarding: app.onboarding,
        user: existingUser,
        status: 'JOINED',
        emailStatus: existingUser.status === 'PENDING_ACTIVATION' ? 'QUEUED' : 'ALREADY_ACTIVE',
        message: existingUser.status === 'PENDING_ACTIVATION'
          ? `Candidate is already onboarded (Staff ID: ${effectiveEmpId}). A fresh activation email has been queued in the background.`
          : `Candidate is already onboarded and active as ${effectiveEmpId}.`,
      };
    }

    // 5. DEPARTMENT, DESIGNATION & ONBOARDING ATTRIBUTES
    const department = app.onboarding?.department || app.offer?.department || app.vacancy?.department || 'Admissions';
    const designation = app.onboarding?.designation || app.offer?.designation || app.vacancy?.designation || app.vacancy?.title || 'Specialist';
    const joiningDate = app.onboarding?.joiningDate || app.offer?.joiningDate || new Date();
    const workLocation = app.onboarding?.workLocation || app.offer?.workLocation || app.vacancy?.location || 'Head Office';
    const workMode = app.onboarding?.workMode || app.offer?.workMode || app.vacancy?.workMode || 'ONSITE';
    const employmentType = app.onboarding?.employmentType || app.offer?.employmentType || (app.vacancy as any)?.employmentType || 'FULL_TIME';

    // 6. CRYPTOGRAPHIC 32-BYTE ACTIVATION TOKEN (SHA-256 HASH)
    const rawActivationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenHash = crypto.createHash('sha256').update(rawActivationToken).digest('hex');
    const activationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const validAdminId = await this.getValidUserIdOrNull(userId);
    const actor = validAdminId
      ? await this.prisma.user.findUnique({ where: { id: validAdminId }, select: { fullName: true } })
      : null;
    const actorName = actor?.fullName || 'HR Administrator';

    // 7. ATOMIC DATABASE TRANSACTION
    const { finalUser, updatedOnboarding } = await this.prisma.$transaction(async (tx) => {
      let userRecord: any;
      const shouldProvisionActivation =
        !existingUser?.activatedAt || existingUser?.status === 'PENDING_ACTIVATION' || !existingUser?.password;

      if (existingUser) {
        userRecord = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            fullName: candidateFullName || existingUser.fullName,
            email: officialEmail,
            mobile: officialMobile || existingUser.mobile,
            employeeId,
            department,
            designation,
            joiningDate,
            role: targetRole, // Always save the assigned role selected by the administrator
            isApproved: true,
            kycStatus: 'APPROVED',
            ...(shouldProvisionActivation
              ? {
                  status: 'PENDING_ACTIVATION',
                  isActive: false,
                  emailVerified: false,
                  password: null, // ZERO temporary passwords!
                  mustChangePassword: false,
                  temporaryPasswordExpiresAt: null,
                  activationTokenHash,
                  activationExpiresAt,
                }
              : {}),
          },
        });

        if (shouldProvisionActivation) {
          await tx.accountActivationToken.updateMany({
            where: { userId: existingUser.id, isUsed: false },
            data: { isUsed: true, usedAt: new Date() },
          });
          await tx.accountActivationToken.create({
            data: {
              userId: existingUser.id,
              tokenHash: activationTokenHash,
              expiresAt: activationExpiresAt,
              isUsed: false,
            },
          });
        }
      } else {
        userRecord = await tx.user.create({
          data: {
            fullName: candidateFullName,
            firstName: app.firstName,
            lastName: app.lastName || null,
            email: officialEmail,
            mobile: officialMobile,
            employeeId,
            department,
            designation,
            joiningDate,
            role: targetRole,
            password: null, // ZERO temporary passwords!
            mustChangePassword: false,
            temporaryPasswordExpiresAt: null,
            activationTokenHash,
            activationExpiresAt,
            isActive: false,
            isApproved: true,
            isVerified: false,
            emailVerified: false,
            status: 'PENDING_ACTIVATION',
            kycStatus: 'APPROVED',
            sessionVersion: 1,
          },
        });

        await tx.accountActivationToken.create({
          data: {
            userId: userRecord.id,
            tokenHash: activationTokenHash,
            expiresAt: activationExpiresAt,
            isUsed: false,
          },
        });
      }

      // Link application to user & set status to JOINED
      const currentHistory = Array.isArray(app.statusHistory) ? (app.statusHistory as any[]) : [];
      const historyEntry = {
        status: 'JOINED',
        timestamp: new Date().toISOString(),
        actorId: validAdminId || userId,
        actorName,
        note: dto.notes || `Onboarding completed. Linked to Staff ID: ${employeeId} (${targetRole})`,
      };

      await tx.jobApplication.update({
        where: { id: app.id },
        data: {
          userId: userRecord.id,
          status: 'JOINED',
          statusHistory: [...currentHistory, historyEntry],
        },
      });

      // Upsert recruitment onboarding record
      const completedNotes = dto.notes
        ? `${app.onboarding?.notes || ''}\n${dto.notes}`.trim()
        : (app.onboarding?.notes || 'Staff credentials issued and onboarding verified.');

      const onb = await tx.recruitmentOnboarding.upsert({
        where: { applicationId: app.id },
        create: {
          applicationId: app.id,
          userId: userRecord.id,
          employeeId,
          department,
          designation,
          joiningDate,
          workLocation,
          workMode,
          employmentType,
          officialEmail,
          officialMobile,
          status: 'COMPLETED',
          notes: completedNotes,
          completedAt: new Date(),
          completedById: validAdminId,
        },
        update: {
          userId: userRecord.id,
          employeeId,
          department,
          designation,
          joiningDate,
          officialEmail,
          officialMobile,
          status: 'COMPLETED',
          notes: completedNotes,
          completedAt: new Date(),
          completedById: validAdminId,
        },
        include: {
          user: { select: { id: true, fullName: true, email: true, employeeId: true } },
        },
      });

      // Update clearance to COMPLETED if offer exists
      if (app.offer?.id) {
        await tx.employeeClearance.updateMany({
          where: { offerId: app.offer.id },
          data: {
            userId: userRecord.id,
            status: 'COMPLETED',
            finalClearedAt: new Date(),
            finalClearedById: validAdminId,
          },
        });
      }

      return { finalUser: userRecord, updatedOnboarding: onb };
    });

    // 8. AUDIT LOGGING
    try {
      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'ONBOARDING_COMPLETED',
        description: `Completed onboarding for ${candidateFullName}. Employee ID: ${employeeId}, Role: ${targetRole}`,
        entity: 'RecruitmentOnboarding',
        entityId: updatedOnboarding.id,
        userId,
      });

      await this.auditService.logAction({
        module: 'HR_RECRUITMENT',
        action: 'STAFF_RECORD_LINKED',
        description: `Linked recruitment application ${app.applicationId} to Staff record ${finalUser.id} (${employeeId})`,
        entity: 'User',
        entityId: finalUser.id,
        userId,
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit failed: ${auditErr?.message}`);
    }

    // 9. OUTBOX DELIVERY RECORD & ASYNCHRONOUS NON-BLOCKING DISPATCH
    let deliveryRecordId: string | null = null;
    try {
      const delivery = await this.prisma.communicationDelivery.create({
        data: {
          channel: CommunicationChannel.EMAIL,
          recipientType: 'EMPLOYEE',
          recipientId: finalUser.id,
          recipientName: candidateFullName,
          recipientEmail: officialEmail,
          status: CommunicationDeliveryStatus.QUEUED,
        },
      });
      deliveryRecordId = delivery.id;
    } catch (deliveryErr: any) {
      this.logger.warn(`Failed to create initial delivery record: ${deliveryErr?.message}`);
    }

    const isProtectedRole = ['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'REGISTRAR', 'HR_MANAGER'].includes(finalUser.role);
    const portalUrl = isProtectedRole
      ? (process.env.ADMIN_PORTAL_URL || 'https://admin.swayamadmission.com')
      : (process.env.ERP_PORTAL_URL || 'https://erp.swayamadmission.com');
    const activationBaseUrl = process.env.ADMIN_PORTAL_URL || 'https://admin.swayamadmission.com';
    const activationUrl = `${activationBaseUrl}/activate?token=${rawActivationToken}`;

    // Fire asynchronous background delivery without blocking the HTTP response
    setImmediate(() => {
      void (async () => {
        try {
        const channel = this.getEmailChannel();
        if (channel && finalUser.status === 'PENDING_ACTIVATION') {
          if (deliveryRecordId) {
            await this.prisma.communicationDelivery.update({
              where: { id: deliveryRecordId },
              data: { status: CommunicationDeliveryStatus.SENDING },
            }).catch(() => null);
          }

          const mailResult = await channel.sendEmployeeActivationEmail({
            officialEmail,
            employeeName: candidateFullName,
            employeeId,
            designation,
            departmentName: department,
            activationUrl,
            expiresInHours: 24,
            portalUrl,
          });

          if (deliveryRecordId) {
            if (mailResult.success) {
              await this.prisma.communicationDelivery.update({
                where: { id: deliveryRecordId },
                data: {
                  status: CommunicationDeliveryStatus.SENT,
                  sentAt: new Date(),
                  providerMessageId: mailResult.providerMessageId || null,
                },
              }).catch(() => null);
            } else {
              await this.prisma.communicationDelivery.update({
                where: { id: deliveryRecordId },
                data: {
                  status: CommunicationDeliveryStatus.FAILED,
                  failedAt: new Date(),
                  errorMessage: mailResult.errorMessage || null,
                  failureReason: mailResult.failureReason || null,
                },
              }).catch(() => null);
            }
          }
        }
      } catch (mailErr: any) {
        this.logger.error(`Background activation email delivery error: ${mailErr?.message}`, mailErr?.stack);
        if (deliveryRecordId) {
          await this.prisma.communicationDelivery.update({
            where: { id: deliveryRecordId },
            data: {
              status: CommunicationDeliveryStatus.FAILED,
              failedAt: new Date(),
              errorMessage: mailErr?.message || 'SMTP transport failure',
            },
          }).catch(() => null);
        }
      }

      // 10. BACKGROUND RECRUITMENT NOTIFICATIONS
      if (this.notificationsService) {
        try {
          await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_ONBOARDING_COMPLETED', {
            candidateUserId: finalUser.id,
            candidateName: candidateFullName,
            candidateEmail: officialEmail,
            candidateMobile: officialMobile,
            applicationId: app.applicationId,
            vacancyId: app.vacancyId,
            vacancyTitle: app.vacancy?.title || 'Open Role',
            employeeId,
            designation,
            department,
          });

          await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_CANDIDATE_JOINED', {
            candidateUserId: finalUser.id,
            candidateName: candidateFullName,
            candidateEmail: officialEmail,
            candidateMobile: officialMobile,
            applicationId: app.applicationId,
            vacancyTitle: app.vacancy?.title || 'Open Role',
            employeeId,
            designation,
            department,
          });

          await this.notificationsService.emitRecruitmentEvent('RECRUITMENT_HR_ONBOARDING_COMPLETED', {
            candidateName: candidateFullName,
            applicationId: app.applicationId,
            vacancyTitle: app.vacancy?.title || 'Open Role',
            employeeId,
            recruiterId: app.recruiterId || undefined,
            notifyHr: true,
          });
        } catch (notifErr: any) {
          this.logger.warn(`Background notifications failed: ${notifErr?.message}`);
        }
      }
    })();
  });

    return {
      success: true,
      onboarding: updatedOnboarding,
      user: finalUser,
      status: 'JOINED',
      emailStatus: 'QUEUED',
      message: `Onboarding completed successfully! Employee ID ${employeeId} has been linked. The activation invitation has been queued for ${officialEmail}.`,
    };
  }

  /**
   * Resend Account Activation Link for an Onboarded Candidate Application
   */
  async resendActivationEmail(applicationId: string, actorId: string) {
    const app = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { user: true, onboarding: true },
    });

    if (!app) {
      throw new NotFoundException('Application not found.');
    }

    const user = app.user;
    if (!user) {
      throw new BadRequestException('No staff user account is linked to this application yet.');
    }

    if (user.status !== 'PENDING_ACTIVATION') {
      throw new BadRequestException(
        `Cannot resend activation link. Current account status is "${user.status}". Only accounts pending activation are eligible.`,
      );
    }

    const officialEmail = (app.onboarding?.officialEmail || user.email || '').trim().toLowerCase();
    if (!officialEmail) {
      throw new BadRequestException('No registered official email address found for this staff member.');
    }

    // Rate-limiting check: at least 60 seconds between resends
    const recentToken = await this.prisma.accountActivationToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (recentToken && Date.now() - new Date(recentToken.createdAt).getTime() < 60 * 1000) {
      throw new BadRequestException('An activation link was recently sent. Please wait at least 1 minute before resending.');
    }

    // Invalidate previous unused tokens
    await this.prisma.accountActivationToken.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true, usedAt: new Date() },
    });

    // Generate cryptographic 32-byte single-use token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.accountActivationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        isUsed: false,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { activationTokenHash: tokenHash, activationExpiresAt: expiresAt },
    });

    const isProtectedRole = ['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'REGISTRAR', 'HR_MANAGER'].includes(user.role);
    const portalUrl = isProtectedRole
      ? (process.env.ADMIN_PORTAL_URL || 'https://admin.swayamadmission.com')
      : (process.env.ERP_PORTAL_URL || 'https://erp.swayamadmission.com');
    const activationBaseUrl = process.env.ADMIN_PORTAL_URL || 'https://admin.swayamadmission.com';
    const activationUrl = `${activationBaseUrl}/activate?token=${rawToken}`;
    const candidateFullName = `${app.firstName} ${app.lastName || ''}`.trim() || user.fullName;
    const employeeId = user.employeeId || app.onboarding?.employeeId || 'STAFF';

    // Queue delivery tracking record
    let deliveryRecordId: string | null = null;
    try {
      const delivery = await this.prisma.communicationDelivery.create({
        data: {
          channel: CommunicationChannel.EMAIL,
          recipientType: 'EMPLOYEE',
          recipientId: user.id,
          recipientName: candidateFullName,
          recipientEmail: officialEmail,
          status: CommunicationDeliveryStatus.QUEUED,
        },
      });
      deliveryRecordId = delivery.id;
    } catch {
      // ignore
    }

    // Fire non-blocking asynchronous email dispatch
    setImmediate(() => {
      void (async () => {
        try {
          const channel = this.getEmailChannel();
          if (channel) {
            if (deliveryRecordId) {
              await this.prisma.communicationDelivery.update({
                where: { id: deliveryRecordId },
                data: { status: CommunicationDeliveryStatus.SENDING },
              }).catch(() => null);
            }

            const mailResult = await channel.sendEmployeeActivationEmail({
              officialEmail,
              employeeName: candidateFullName,
              employeeId,
              designation: app.onboarding?.designation || user.designation || 'Staff',
              departmentName: app.onboarding?.department || user.department || 'General',
              activationUrl,
              expiresInHours: 24,
              portalUrl,
            });

            if (deliveryRecordId) {
              await this.prisma.communicationDelivery.update({
                where: { id: deliveryRecordId },
                data: {
                  status: mailResult.success ? CommunicationDeliveryStatus.SENT : CommunicationDeliveryStatus.FAILED,
                  sentAt: mailResult.success ? new Date() : null,
                  failedAt: !mailResult.success ? new Date() : null,
                  providerMessageId: mailResult.providerMessageId || null,
                  errorMessage: mailResult.errorMessage || null,
                },
              }).catch(() => null);
            }
          }
        } catch (err: any) {
          this.logger.error(`Resend activation email failed: ${err.message}`);
        }
      })();
    });

    await this.auditService.logAction({
      module: 'HR_RECRUITMENT',
      action: 'ACTIVATION_EMAIL_RESENT',
      description: `Resent account activation email to ${officialEmail} for Staff ID: ${employeeId}`,
      entity: 'User',
      entityId: user.id,
      userId: actorId,
    }).catch(() => null);

    return {
      success: true,
      message: `A fresh activation invitation has been queued in the background for ${officialEmail}.`,
    };
  }
}

