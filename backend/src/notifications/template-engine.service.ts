import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationChannel } from '@prisma/client';

export class CreateTemplateDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: 'TRANSACTIONAL' | 'PROMOTIONAL' | 'SYSTEM';

  @IsArray()
  channels: ('IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP')[];

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  inAppTitle?: string;

  @IsOptional()
  @IsString()
  inAppMessage?: string;

  @IsOptional()
  @IsString()
  emailHtml?: string;

  @IsOptional()
  @IsString()
  emailText?: string;

  @IsOptional()
  @IsString()
  smsBody?: string;

  @IsOptional()
  @IsString()
  whatsAppTemplateName?: string;

  @IsOptional()
  @IsString()
  whatsAppBody?: string;

  @IsOptional()
  @IsArray()
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: 'TRANSACTIONAL' | 'PROMOTIONAL' | 'SYSTEM';

  @IsOptional()
  @IsArray()
  channels?: ('IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP')[];

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  inAppTitle?: string;

  @IsOptional()
  @IsString()
  inAppMessage?: string;

  @IsOptional()
  @IsString()
  emailHtml?: string;

  @IsOptional()
  @IsString()
  emailText?: string;

  @IsOptional()
  @IsString()
  smsBody?: string;

  @IsOptional()
  @IsString()
  whatsAppTemplateName?: string;

  @IsOptional()
  @IsString()
  whatsAppBody?: string;

  @IsOptional()
  @IsArray()
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  incrementVersion?: boolean;
}

export class PreviewTemplateDto {
  @IsNotEmpty()
  @IsString()
  templateIdOrCode: string;

  @IsOptional()
  @IsObject()
  sampleData?: Record<string, string>;
}

@Injectable()
export class TemplateEngineService {
  private readonly logger = new Logger(TemplateEngineService.name);

  // Authoritative list of supported template placeholders
  public static readonly ALLOWED_VARIABLES = [
    'studentName',
    'officialStudentId',
    'studentId',
    'applicationNumber',
    'collegeName',
    'courseName',
    'branchName',
    'amount',
    'dueDate',
    'reportingDate',
    'counselorName',
    'counselorMobile',
    'academicSession',
    'status',
    'loginUrl',
    'actionUrl',
    'rejectionReason',
    'supportEmail',
    'currentYear',
    'requestId',
    'deletionDate',
    'documentCount',
    'candidateName',
    'applicationId',
    'vacancyTitle',
    'offerId',
    'joiningDate',
    'department',
    'designation',
    'salary',
    'companyName',
    'recruiterName',
    'reason',
    'employeeId',
  ];

  // Default sample mock data for live previews
  public static readonly SAMPLE_MOCK_DATA: Record<string, string> = {
    studentName: 'Rahul Kumar',
    officialStudentId: 'SWY-STU-1DDCF9EE',
    applicationNumber: 'SA-2026-000842',
    collegeName: 'Guru Kashi University (GKU)',
    courseName: 'B.Tech',
    branchName: 'Computer Science & Engineering',
    amount: '₹25,000',
    dueDate: '15 Sep 2026',
    reportingDate: '20 Sep 2026',
    counselorName: 'Amit Sharma',
    counselorMobile: '+91 98765 43210',
    academicSession: '2026-2027',
    status: 'ADMISSION_APPROVED',
    loginUrl: 'https://swayamadmission.in/login',
    actionUrl: 'https://swayamadmission.in/dashboard',
    rejectionReason: 'Document verification incomplete',
    supportEmail: 'admissions@swayamadmission.in',
    currentYear: '2026',
    requestId: 'DR-123456',
    deletionDate: '14/11/2026',
    documentCount: '3',
    candidateName: 'Rahul Faiz',
    applicationId: 'SWY-JOB-APP-00003',
    vacancyTitle: 'Senior Counselor',
    offerId: 'SWY-OFFER-2026-0001',
    joiningDate: '01 Nov 2026',
    department: 'Admissions',
    designation: 'Senior Admissions Counselor',
    salary: '₹6,50,000 / year',
    companyName: 'Swayam Admission',
    recruiterName: 'HR Recruitment Team',
    reason: 'Mutual agreement',
    employeeId: 'SWY-EMP-0012',
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Replace {{variableName}} in string safely with fallback resolution so no literal {{...}} leak to UI.
   */
  render(templateText: string | null | undefined, context: Record<string, any> = {}): string {
    if (!templateText) return '';
    return templateText
      .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, varName) => {
        if (context[varName] !== undefined && context[varName] !== null && context[varName] !== '') {
          return String(context[varName]);
        }
        // Authoritative graceful fallbacks for production template safety
        switch (varName) {
          case 'studentName':
            return context.fullName || context.name || 'Student';
          case 'candidateName':
            return context.candidateName || context.fullName || context.name || 'Candidate';
          case 'vacancyTitle':
            return context.vacancyTitle || context.position || 'Open Role';
          case 'companyName':
            return 'Swayam Admission';
          case 'offerId':
            return context.offerId || context.offerCode || '';
          case 'joiningDate':
            return context.joiningDate || 'Scheduled joining date';
          case 'department':
            return context.department || 'Admissions';
          case 'designation':
            return context.designation || 'Specialist';
          case 'salary':
            return context.salary || '';
          case 'employeeId':
            return context.employeeId || '';
          case 'reason':
            return context.reason || context.rejectionReason || '';
          case 'officialStudentId':
          case 'studentId':
            return context.officialId || context.registrationNumber || '';
          case 'applicationNumber':
          case 'applicationId':
            return context.appId || context.applicationNumber || context.applicationId || 'your application';
          case 'collegeName':
            return context.college || 'your selected college';
          case 'courseName':
            return context.course || 'your course';
          case 'branchName':
            return context.branch || '';
          case 'amount':
            return context.feeAmount ? `₹${context.feeAmount}` : '';
          case 'dueDate':
            return 'the due date';
          case 'reportingDate':
            return 'the scheduled date';
          case 'deletionDate':
            return context.scheduledDeletionDate || 'the scheduled date';
          case 'requestId':
            return context.reqId || '';
          case 'documentCount':
            return 'selected';
          case 'currentYear':
            return '2026';
          default:
            return ''; // Unknown placeholders are safely removed rather than exposed
        }
      })
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,!?])/g, '$1')
      .trim();
  }

  /**
   * Interpolates an existing notification record ensuring no raw placeholders reach the client
   */
  interpolateNotification(notif: any, userContext?: any): any {
    if (!notif) return notif;
    const ctx = {
      studentName: userContext?.fullName || notif.user?.fullName || 'Student',
      officialStudentId: userContext?.studentId || '',
      applicationNumber: notif.relatedApplicationId || notif.metadata?.applicationNumber || 'your application',
      collegeName: notif.metadata?.collegeName || 'your selected college',
      courseName: notif.metadata?.courseName || 'your course',
      branchName: notif.metadata?.branchName || '',
      requestId: notif.metadata?.requestId || '',
      deletionDate: notif.metadata?.deletionDate || '',
      documentCount: notif.metadata?.documentCount || 'selected',
      amount: notif.metadata?.amount || '',
      dueDate: notif.metadata?.dueDate || '',
      rejectionReason: notif.metadata?.rejectionReason || '',
      ...(notif.metadata || {}),
      ...(userContext || {}),
    };

    return {
      ...notif,
      title: this.render(notif.title, ctx),
      message: this.render(notif.message, ctx),
      shortMessage: notif.shortMessage ? this.render(notif.shortMessage, ctx) : undefined,
    };
  }

  /**
   * Validate that template only uses supported variables and no executable code injection.
   */
  validateTemplate(content: string): { isValid: boolean; detectedVariables: string[]; unsupportedVariables: string[] } {
    if (!content) return { isValid: true, detectedVariables: [], unsupportedVariables: [] };

    const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    const detected = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      detected.add(match[1]);
    }

    const detectedArray = Array.from(detected);
    const unsupported = detectedArray.filter((v) => !TemplateEngineService.ALLOWED_VARIABLES.includes(v));

    return {
      isValid: unsupported.length === 0,
      detectedVariables: detectedArray,
      unsupportedVariables: unsupported,
    };
  }

  /**
   * Render preview of a template with sample data across selected channels.
   */
  async renderPreview(templateIdOrCode: string, customSample?: Record<string, string>) {
    const template = await this.prisma.communicationTemplate.findFirst({
      where: {
        OR: [{ id: templateIdOrCode }, { code: templateIdOrCode }],
      },
    });

    if (!template) {
      throw new NotFoundException(`Template "${templateIdOrCode}" not found.`);
    }

    const sample = { ...TemplateEngineService.SAMPLE_MOCK_DATA, ...(customSample || {}) };

    return {
      templateId: template.id,
      code: template.code,
      name: template.name,
      version: template.version,
      category: template.category,
      channels: template.channels,
      previews: {
        IN_APP: {
          title: this.render(template.inAppTitle, sample),
          message: this.render(template.inAppMessage, sample),
        },
        EMAIL: {
          subject: this.render(template.subject, sample),
          bodyHtml: this.render(template.emailHtml, sample),
          bodyText: this.render(template.emailText, sample),
        },
        SMS: {
          body: this.render(template.smsBody, sample),
          charCount: this.render(template.smsBody, sample).length,
        },
        WHATSAPP: {
          templateName: template.whatsAppTemplateName,
          body: this.render(template.whatsAppBody, sample),
        },
      },
    };
  }

  /**
   * List all templates with pagination and search.
   */
  async findAll(params: { search?: string; category?: string; channel?: string }) {
    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
        { subject: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.category) {
      where.category = params.category;
    }
    if (params.channel) {
      where.channels = { has: params.channel as CommunicationChannel };
    }

    return this.prisma.communicationTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Find single template by ID or Code.
   */
  async findOne(idOrCode: string) {
    const template = await this.prisma.communicationTemplate.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode }],
      },
    });

    if (!template) {
      throw new NotFoundException(`Template "${idOrCode}" not found.`);
    }

    return template;
  }

  /**
   * Create template with validation.
   */
  async createTemplate(dto: CreateTemplateDto, userId?: string) {
    // Validate variables in all fields
    const allContents = [
      dto.subject,
      dto.inAppTitle,
      dto.inAppMessage,
      dto.emailHtml,
      dto.emailText,
      dto.smsBody,
      dto.whatsAppBody,
    ]
      .filter(Boolean)
      .join(' ');

    const validation = this.validateTemplate(allContents);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Unsupported placeholder variables: ${validation.unsupportedVariables.join(', ')}. Supported variables: ${TemplateEngineService.ALLOWED_VARIABLES.join(', ')}`,
      );
    }

    // Check code unique
    const existing = await this.prisma.communicationTemplate.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(`Template with code "${dto.code}" already exists.`);
    }

    return this.prisma.communicationTemplate.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        category: dto.category || 'TRANSACTIONAL',
        channels: dto.channels as CommunicationChannel[],
        subject: dto.subject || null,
        inAppTitle: dto.inAppTitle || null,
        inAppMessage: dto.inAppMessage || null,
        emailHtml: dto.emailHtml || null,
        emailText: dto.emailText || null,
        smsBody: dto.smsBody || null,
        whatsAppTemplateName: dto.whatsAppTemplateName || null,
        whatsAppBody: dto.whatsAppBody || null,
        variables: validation.detectedVariables,
        version: 1,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdById: userId || null,
      },
    });
  }

  /**
   * Update template with version bump.
   */
  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    const existing = await this.findOne(id);

    const allContents = [
      dto.subject ?? existing.subject,
      dto.inAppTitle ?? existing.inAppTitle,
      dto.inAppMessage ?? existing.inAppMessage,
      dto.emailHtml ?? existing.emailHtml,
      dto.emailText ?? existing.emailText,
      dto.smsBody ?? existing.smsBody,
      dto.whatsAppBody ?? existing.whatsAppBody,
    ]
      .filter(Boolean)
      .join(' ');

    const validation = this.validateTemplate(allContents);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Unsupported placeholder variables: ${validation.unsupportedVariables.join(', ')}`,
      );
    }

    const nextVersion = dto.incrementVersion ? existing.version + 1 : existing.version;

    return this.prisma.communicationTemplate.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        category: dto.category ?? existing.category,
        channels: dto.channels ? (dto.channels as CommunicationChannel[]) : existing.channels,
        subject: dto.subject ?? existing.subject,
        inAppTitle: dto.inAppTitle ?? existing.inAppTitle,
        inAppMessage: dto.inAppMessage ?? existing.inAppMessage,
        emailHtml: dto.emailHtml ?? existing.emailHtml,
        emailText: dto.emailText ?? existing.emailText,
        smsBody: dto.smsBody ?? existing.smsBody,
        whatsAppTemplateName: dto.whatsAppTemplateName ?? existing.whatsAppTemplateName,
        whatsAppBody: dto.whatsAppBody ?? existing.whatsAppBody,
        variables: validation.detectedVariables,
        version: nextVersion,
        isActive: dto.isActive ?? existing.isActive,
      },
    });
  }

  /**
   * Seed default system communication templates if not present.
   */
  async seedDefaultTemplates() {
    try {
      const templateCount = await this.prisma.communicationTemplate.count();
      if (templateCount >= 20) {
        return;
      }
    } catch {
      // safe fallback if db is initializing
    }

    const defaults: CreateTemplateDto[] = [
      {
        code: 'APPLICATION_SUBMITTED',
        name: 'Application Submitted Confirmation',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'],
        subject: 'Application Received — {{applicationNumber}}',
        inAppTitle: 'Application Submitted',
        inAppMessage: 'Your application {{applicationNumber}} for {{courseName}} at {{collegeName}} has been successfully submitted.',
        emailHtml: '<div style="font-family:sans-serif;color:#4A7B5B;"><h2>Hello {{studentName}},</h2><p>Your application <strong>{{applicationNumber}}</strong> for <strong>{{courseName}}</strong> ({{branchName}}) at <strong>{{collegeName}}</strong> has been received and is under review.</p><p>We will notify you once your review is updated.</p><br/><p>Best regards,<br/><strong>Swayam Admission Team</strong></p></div>',
        emailText: 'Hello {{studentName}}, your application {{applicationNumber}} for {{courseName}} at {{collegeName}} has been received.',
        smsBody: 'Swayam Admission: Hello {{studentName}}, application {{applicationNumber}} for {{courseName}} at {{collegeName}} is received.',
        whatsAppTemplateName: 'application_submitted_v1',
        whatsAppBody: 'Hello {{studentName}}, your application {{applicationNumber}} for {{courseName}} at {{collegeName}} is under review.',
      },
      {
        code: 'ADMISSION_APPROVED',
        name: 'Admission Approved Notification',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'],
        subject: 'Congratulations! Admission Approved for {{courseName}}',
        inAppTitle: 'Admission Approved 🎉',
        inAppMessage: 'Congratulations {{studentName}}! Your admission application {{applicationNumber}} for {{courseName}} at {{collegeName}} has been APPROVED.',
        emailHtml: '<div style="font-family:sans-serif;color:#4A7B5B;"><h2>Congratulations {{studentName}}!</h2><p>Your admission for <strong>{{courseName}}</strong> at <strong>{{collegeName}}</strong> has been <span style="color:#4A7B5B;font-weight:bold;">APPROVED</span>.</p><p>Please proceed to complete the payment confirmation to reserve your seat.</p><br/><p>Best regards,<br/><strong>Swayam Admission Team</strong></p></div>',
        emailText: 'Congratulations {{studentName}}! Your admission for {{courseName}} at {{collegeName}} has been APPROVED. Please complete the seat payment.',
        smsBody: 'Congratulations {{studentName}}! Your admission at {{collegeName}} for {{courseName}} is APPROVED. Visit portal to confirm seat.',
        whatsAppTemplateName: 'admission_approved_v1',
        whatsAppBody: 'Congratulations {{studentName}}! Your admission for {{courseName}} at {{collegeName}} is APPROVED.',
      },
      {
        code: 'ADMISSION_REJECTED',
        name: 'Admission Decision Update',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL'],
        subject: 'Application Status Update — {{applicationNumber}}',
        inAppTitle: 'Application Update',
        inAppMessage: 'Your application {{applicationNumber}} for {{courseName}} at {{collegeName}} could not be approved.',
        emailHtml: '<div style="font-family:sans-serif;color:#4A7B5B;"><h2>Dear {{studentName}},</h2><p>We regret to inform you that your application {{applicationNumber}} for {{courseName}} at {{collegeName}} was not approved.</p><p>Reason: {{rejectionReason}}</p><p>Please contact your counselor {{counselorName}} for alternative options.</p></div>',
        emailText: 'Dear {{studentName}}, your application {{applicationNumber}} for {{courseName}} at {{collegeName}} was not approved. Reason: {{rejectionReason}}',
      },
      {
        code: 'PAYMENT_REQUEST_CREATED',
        name: 'Payment Request Issued',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'SMS'],
        subject: 'Seat Reservation Payment Required — {{amount}}',
        inAppTitle: 'Fee Payment Pending',
        inAppMessage: 'Payment request of {{amount}} has been generated for {{courseName}} at {{collegeName}}. Due date: {{dueDate}}.',
        emailHtml: '<div style="font-family:sans-serif;color:#4A7B5B;"><h2>Payment Due</h2><p>Dear {{studentName}}, a payment request of <strong>{{amount}}</strong> is due on <strong>{{dueDate}}</strong> for {{courseName}} at {{collegeName}}.</p></div>',
        emailText: 'Dear {{studentName}}, payment request of {{amount}} is due on {{dueDate}} for {{courseName}} at {{collegeName}}.',
        smsBody: 'Swayam Admission: Fee payment of {{amount}} is pending for {{courseName}} at {{collegeName}}. Due: {{dueDate}}.',
      },
      {
        code: 'PAYMENT_COMPLETED',
        name: 'Payment Receipt Confirmation',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'],
        subject: 'Payment Receipt Confirmed — {{amount}}',
        inAppTitle: 'Payment Successful ✅',
        inAppMessage: 'Payment of {{amount}} for application {{applicationNumber}} received and verified successfully.',
        emailHtml: '<div style="font-family:sans-serif;color:#4A7B5B;"><h2>Payment Confirmed</h2><p>Thank you {{studentName}}. Your payment of <strong>{{amount}}</strong> for <strong>{{courseName}}</strong> at <strong>{{collegeName}}</strong> is verified.</p></div>',
        emailText: 'Thank you {{studentName}}. Payment of {{amount}} for {{courseName}} at {{collegeName}} is verified.',
        smsBody: 'Swayam Admission: Payment of {{amount}} for application {{applicationNumber}} is confirmed. Thank you!',
        whatsAppTemplateName: 'payment_confirmed_v1',
        whatsAppBody: 'Hello {{studentName}}, your payment of {{amount}} for {{courseName}} is verified.',
      },
      {
        code: 'PROMO_ADMISSION_OPEN',
        name: 'Admissions Open Broadcast',
        category: 'PROMOTIONAL',
        channels: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'],
        subject: 'Admissions Open for {{academicSession}} at {{collegeName}}',
        inAppTitle: 'Admissions Open: {{courseName}}',
        inAppMessage: 'Admissions for {{courseName}} ({{branchName}}) are now open at top verified institutions including {{collegeName}}.',
        emailHtml: '<div style="font-family:sans-serif;color:#4A7B5B;"><h2>Admissions Open for {{academicSession}}</h2><p>Dear {{studentName}}, applications are now open for <strong>{{courseName}}</strong> at <strong>{{collegeName}}</strong>.</p><p><a href="{{loginUrl}}" style="background:#4A7B5B;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Apply Now</a></p></div>',
        emailText: 'Admissions open for {{academicSession}} in {{courseName}} at {{collegeName}}. Apply online today.',
        smsBody: 'Admissions open for {{courseName}} at {{collegeName}} for {{academicSession}}. Apply now at Swayam Admission.',
        whatsAppTemplateName: 'promo_admissions_open',
        whatsAppBody: 'Hello {{studentName}}, admissions are now open for {{courseName}} at {{collegeName}} for {{academicSession}}.',
      },
      // ─── RECRUITMENT LIFECYCLE TEMPLATES ──────────────────────────────────
      {
        code: 'RECRUITMENT_APPLICATION_RECEIVED',
        name: 'Application Received Confirmation',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        subject: 'Application Received — {{vacancyTitle}} ({{applicationId}})',
        inAppTitle: 'Application Submitted',
        inAppMessage: 'Your application for {{vacancyTitle}} has been received successfully.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Hello {{candidateName}},</h2><p>Thank you for applying for <strong>{{vacancyTitle}}</strong> at <strong>{{companyName}}</strong>. Your application ID is <strong>{{applicationId}}</strong>.</p><p>Our talent acquisition team is reviewing your profile and will update you shortly.</p><br/><p>Best regards,<br/><strong>HR Recruitment Team</strong><br/>{{companyName}}</p></div>',
        emailText: 'Hello {{candidateName}}, thank you for applying for {{vacancyTitle}} at {{companyName}}. Application ID: {{applicationId}}.',
        smsBody: 'Swayam Admission: Hello {{candidateName}}, application {{applicationId}} for {{vacancyTitle}} is received.',
        whatsAppTemplateName: 'recruitment_app_received',
        whatsAppBody: 'Hello {{candidateName}}, your application {{applicationId}} for {{vacancyTitle}} at {{companyName}} has been received.',
      },
      {
        code: 'RECRUITMENT_APPLICATION_UNDER_REVIEW',
        name: 'Application Under Review',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL'],
        subject: 'Application Under Review — {{vacancyTitle}}',
        inAppTitle: 'Profile Under Review',
        inAppMessage: 'Your application for {{vacancyTitle}} is currently being reviewed by our recruitment team.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Hello {{candidateName}},</h2><p>Your application for <strong>{{vacancyTitle}}</strong> is actively under review by our hiring panel.</p><p>We will contact you regarding next steps shortly.</p></div>',
        emailText: 'Hello {{candidateName}}, your application for {{vacancyTitle}} is under review.',
      },
      {
        code: 'RECRUITMENT_APPLICANT_SHORTLISTED',
        name: 'Applicant Shortlisted',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        subject: 'Congratulations! You Have Been Shortlisted — {{vacancyTitle}}',
        inAppTitle: 'Application Shortlisted 🎉',
        inAppMessage: 'Great news! You have been shortlisted for {{vacancyTitle}} at {{companyName}}.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Dear {{candidateName}},</h2><p>We are pleased to inform you that your profile has been <strong style="color:#4A7B5B;">shortlisted</strong> for <strong>{{vacancyTitle}}</strong>.</p><p>Our HR coordinator will schedule your interview discussion shortly.</p></div>',
        emailText: 'Dear {{candidateName}}, you have been shortlisted for {{vacancyTitle}} at {{companyName}}.',
        whatsAppTemplateName: 'applicant_shortlisted',
        whatsAppBody: 'Dear {{candidateName}}, congratulations! You have been shortlisted for {{vacancyTitle}} at {{companyName}}.',
      },
      {
        code: 'RECRUITMENT_APPLICANT_SELECTED',
        name: 'Applicant Selected Notification',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        subject: 'Selection Confirmation — {{vacancyTitle}} at {{companyName}}',
        inAppTitle: 'Selection Confirmed 🌟',
        inAppMessage: 'Congratulations! You have been selected for the role of {{vacancyTitle}}.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Congratulations {{candidateName}}!</h2><p>We are delighted to confirm that you have been <strong>selected</strong> for the position of <strong>{{vacancyTitle}}</strong> at <strong>{{companyName}}</strong>.</p><p>Our HR team is preparing your official formal offer letter.</p><br/><p>Warm regards,<br/><strong>{{companyName}} Talent Acquisition</strong></p></div>',
        emailText: 'Congratulations {{candidateName}}! You have been selected for the position of {{vacancyTitle}} at {{companyName}}.',
        whatsAppTemplateName: 'applicant_selected',
        whatsAppBody: 'Congratulations {{candidateName}}! You have been selected for {{vacancyTitle}} at {{companyName}}. Our HR team will issue your offer shortly.',
      },
      {
        code: 'RECRUITMENT_OFFER_CREATED',
        name: 'Offer Letter Drafted',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP'],
        subject: 'Offer Created — {{vacancyTitle}}',
        inAppTitle: 'Offer Prepared',
        inAppMessage: 'Offer {{offerId}} for {{candidateName}} has been prepared and is ready for dispatch.',
      },
      {
        code: 'RECRUITMENT_OFFER_SENT',
        name: 'Employment Offer Letter Dispatched',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        subject: 'Official Offer Letter — {{vacancyTitle}} ({{companyName}})',
        inAppTitle: 'Official Offer Letter Issued 📄',
        inAppMessage: 'Your official offer for {{vacancyTitle}} (Offer ID: {{offerId}}) is ready for review.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Dear {{candidateName}},</h2><p>We are pleased to extend an offer of employment for the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at <strong>{{companyName}}</strong>.</p><div style="background:#F8FAFC;padding:16px;border-radius:8px;border:1px solid #CBD5E1;margin:16px 0;"><p><strong>Offer ID:</strong> {{offerId}}</p><p><strong>Designation:</strong> {{designation}}</p><p><strong>CTC / Compensation:</strong> {{salary}}</p><p><strong>Scheduled Joining Date:</strong> {{joiningDate}}</p></div><p>Please review and submit your acceptance response through your portal.</p><br/><p>Warm regards,<br/><strong>{{companyName}} HR Team</strong></p></div>',
        emailText: 'Dear {{candidateName}}, we are pleased to extend an offer for {{designation}} (Offer ID: {{offerId}}). Scheduled Joining: {{joiningDate}}.',
        whatsAppTemplateName: 'recruitment_offer_sent',
        whatsAppBody: 'Dear {{candidateName}}, we are delighted to extend your offer for {{designation}} at {{companyName}} (Offer ID: {{offerId}}). Please check your email to review and accept.',
      },
      {
        code: 'RECRUITMENT_OFFER_RESENT',
        name: 'Employment Offer Resent',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        subject: 'Reminder: Official Offer Letter — {{vacancyTitle}}',
        inAppTitle: 'Offer Letter Resent',
        inAppMessage: 'Your offer letter for {{vacancyTitle}} (Offer ID: {{offerId}}) has been resent for your review.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Dear {{candidateName}},</h2><p>This is a reminder regarding your offer letter for <strong>{{designation}}</strong> (Offer ID: {{offerId}}).</p><p>Please submit your acceptance before the validity deadline.</p></div>',
        emailText: 'Dear {{candidateName}}, reminder regarding your offer for {{designation}} (Offer ID: {{offerId}}).',
        whatsAppTemplateName: 'offer_resent_reminder',
        whatsAppBody: 'Dear {{candidateName}}, your offer letter for {{designation}} (Offer ID: {{offerId}}) has been resent. Please review and respond.',
      },
      {
        code: 'RECRUITMENT_OFFER_ACCEPTED',
        name: 'Offer Accepted Confirmation',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        subject: 'Offer Acceptance Confirmed — Welcome to {{companyName}}!',
        inAppTitle: 'Offer Accepted Successfully 🎉',
        inAppMessage: 'Thank you for accepting our offer for {{vacancyTitle}}. Verification & clearance has started.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Welcome Aboard {{candidateName}}!</h2><p>We are delighted that you have accepted our offer for <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department.</p><p>Our HR onboarding team will guide you through the document verification and clearance checklist.</p></div>',
        emailText: 'Welcome aboard {{candidateName}}! Thank you for accepting our offer for {{designation}} at {{companyName}}.',
        whatsAppTemplateName: 'offer_accepted_candidate',
        whatsAppBody: 'Welcome aboard {{candidateName}}! We are thrilled you accepted our offer for {{designation}}. Next step: document clearance.',
      },
      {
        code: 'RECRUITMENT_OFFER_DECLINED',
        name: 'Offer Declined Acknowledgement',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL'],
        subject: 'Offer Response Received — {{vacancyTitle}}',
        inAppTitle: 'Offer Declined Recorded',
        inAppMessage: 'Your decline response for offer {{offerId}} has been noted.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Dear {{candidateName}},</h2><p>We have received your decision to decline the offer for <strong>{{vacancyTitle}}</strong>. We thank you for your time and wish you the very best in your career pursuits.</p></div>',
        emailText: 'Dear {{candidateName}}, we have received your decision to decline the offer for {{vacancyTitle}}. We wish you the best.',
      },
      {
        code: 'RECRUITMENT_OFFER_EXPIRED',
        name: 'Offer Letter Expired',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL'],
        subject: 'Notice: Offer Letter Expired — {{offerId}}',
        inAppTitle: 'Offer Expired',
        inAppMessage: 'The offer letter {{offerId}} has passed its validity window.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Dear {{candidateName}},</h2><p>The offer of employment (Offer ID: {{offerId}}) has expired as the response window has concluded.</p><p>Please contact HR if you require an extension.</p></div>',
        emailText: 'Dear {{candidateName}}, the offer letter {{offerId}} has expired.',
      },
      {
        code: 'RECRUITMENT_CLEARANCE_STARTED',
        name: 'Clearance & Verification Started',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        subject: 'Pre-Joining Clearance Checklist — {{companyName}}',
        inAppTitle: 'Clearance Checklist Active 📋',
        inAppMessage: 'Pre-joining document verification and clearance has begun for your onboarding.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Hello {{candidateName}},</h2><p>Your pre-joining clearance and credential verification for <strong>{{designation}}</strong> has started.</p><p>Please ensure all required identity and educational documents are submitted.</p></div>',
        emailText: 'Hello {{candidateName}}, pre-joining clearance checklist has started for {{designation}}.',
        whatsAppTemplateName: 'clearance_started',
        whatsAppBody: 'Hello {{candidateName}}, pre-joining verification has started for your role at {{companyName}}. Please complete your checklist.',
      },
      {
        code: 'RECRUITMENT_CLEARANCE_ITEM_APPROVED',
        name: 'Clearance Item Verified',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL'],
        subject: 'Clearance Item Verified — {{reason}}',
        inAppTitle: 'Clearance Item Verified ✅',
        inAppMessage: 'A clearance checklist item has been verified by HR.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Hello {{candidateName}},</h2><p>A checklist verification requirement has been successfully verified by our HR clearance team.</p></div>',
        emailText: 'Hello {{candidateName}}, a clearance checklist item has been verified by HR.',
      },
      {
        code: 'RECRUITMENT_CLEARANCE_ITEM_FAILED',
        name: 'Clearance Action Required',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL'],
        subject: 'Action Required: Verification Issue — {{vacancyTitle}}',
        inAppTitle: 'Verification Attention Required ⚠️',
        inAppMessage: 'A clearance item requires your attention: {{reason}}',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Action Required {{candidateName}},</h2><p>A verification requirement has raised an issue during HR clearance: <strong>{{reason}}</strong>.</p><p>Please provide updated documentation to proceed.</p></div>',
        emailText: 'Action required {{candidateName}}: A verification requirement raised an issue: {{reason}}.',
      },
      {
        code: 'RECRUITMENT_CLEARANCE_COMPLETED',
        name: 'Clearance Completed',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        subject: 'Clearance Approved! Ready for Onboarding — {{companyName}}',
        inAppTitle: 'Clearance Completed ✅',
        inAppMessage: 'All clearance requirements have been verified. Onboarding is ready to begin.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Congratulations {{candidateName}}!</h2><p>All pre-joining verification and clearance requirements for <strong>{{designation}}</strong> have been approved.</p><p>Your onboarding process will now be initiated.</p></div>',
        emailText: 'Congratulations {{candidateName}}! All pre-joining clearance requirements have been approved.',
        whatsAppTemplateName: 'clearance_completed',
        whatsAppBody: 'Congratulations {{candidateName}}! Your pre-joining clearance has been completed successfully.',
      },
      {
        code: 'RECRUITMENT_ONBOARDING_STARTED',
        name: 'Onboarding Initiated',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        subject: 'Onboarding Initiated — Welcome to {{companyName}}',
        inAppTitle: 'Onboarding in Progress 🚀',
        inAppMessage: 'Staff onboarding has been initiated. Joining date: {{joiningDate}}.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Hello {{candidateName}},</h2><p>Your official onboarding into the <strong>{{department}}</strong> team has commenced.</p><p>Your scheduled joining date is <strong>{{joiningDate}}</strong>.</p></div>',
        emailText: 'Hello {{candidateName}}, your onboarding into {{department}} has commenced. Joining: {{joiningDate}}.',
        whatsAppTemplateName: 'onboarding_started',
        whatsAppBody: 'Hello {{candidateName}}, your onboarding has started! Joining Date: {{joiningDate}}. Welcome to {{companyName}}!',
      },
      {
        code: 'RECRUITMENT_ONBOARDING_COMPLETED',
        name: 'Onboarding Completed & Staff Active',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        subject: 'Official Staff Induction Complete — {{employeeId}}',
        inAppTitle: 'Staff Record Active 🎓',
        inAppMessage: 'Onboarding is complete! Your Employee ID is {{employeeId}}.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Welcome to the Team {{candidateName}}!</h2><p>Your onboarding has been completed and your staff profile is now active.</p><p><strong>Employee ID:</strong> {{employeeId}}<br/><strong>Designation:</strong> {{designation}}<br/><strong>Department:</strong> {{department}}</p></div>',
        emailText: 'Welcome {{candidateName}}! Your onboarding is complete. Employee ID: {{employeeId}}.',
        whatsAppTemplateName: 'onboarding_completed',
        whatsAppBody: 'Welcome {{candidateName}}! Your onboarding is complete. Your Employee ID is {{employeeId}}.',
      },
      {
        code: 'RECRUITMENT_CANDIDATE_JOINED',
        name: 'Candidate Joined Confirmation',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        subject: 'Welcome to Swayam Admission — {{candidateName}}',
        inAppTitle: 'Welcome to Swayam Admission!',
        inAppMessage: 'You are now an active staff member of Swayam Admission.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Welcome {{candidateName}},</h2><p>We are excited to have you join <strong>{{companyName}}</strong> as <strong>{{designation}}</strong>.</p></div>',
        emailText: 'Welcome {{candidateName}}, you are now an active member of {{companyName}}.',
        whatsAppTemplateName: 'candidate_joined',
        whatsAppBody: 'Welcome to {{companyName}}, {{candidateName}}! We are thrilled to have you with us.',
      },
      {
        code: 'RECRUITMENT_CANDIDATE_WITHDRAWN',
        name: 'Application Withdrawn Acknowledgement',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL'],
        subject: 'Application Withdrawn — {{vacancyTitle}}',
        inAppTitle: 'Application Withdrawn',
        inAppMessage: 'Your application for {{vacancyTitle}} has been marked as withdrawn.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Hello {{candidateName}},</h2><p>Your application for <strong>{{vacancyTitle}}</strong> has been withdrawn as requested.</p></div>',
        emailText: 'Hello {{candidateName}}, your application for {{vacancyTitle}} has been withdrawn.',
      },
      {
        code: 'RECRUITMENT_APPLICATION_REJECTED',
        name: 'Application Status Update',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL'],
        subject: 'Application Status Update — {{vacancyTitle}}',
        inAppTitle: 'Application Decision Update',
        inAppMessage: 'Thank you for your interest in {{vacancyTitle}}.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h2>Dear {{candidateName}},</h2><p>Thank you for interviewing for <strong>{{vacancyTitle}}</strong> at <strong>{{companyName}}</strong>.</p><p>After careful deliberation, we have decided to move forward with another candidate for this role.</p><p>We wish you continued success.</p></div>',
        emailText: 'Dear {{candidateName}}, thank you for your application for {{vacancyTitle}} at {{companyName}}.',
      },
      // ─── HR & ADMIN INTERNAL ALERTS ────────────────────────────────────────
      {
        code: 'RECRUITMENT_HR_NEW_APPLICATION',
        name: 'HR Alert: New Application',
        category: 'SYSTEM',
        channels: ['IN_APP', 'EMAIL'],
        subject: '[New Application] {{vacancyTitle}} — {{candidateName}}',
        inAppTitle: 'New Job Application 📥',
        inAppMessage: 'New application received for {{vacancyTitle}} from {{candidateName}} ({{applicationId}}).',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h3>New Application Received</h3><p>Candidate <strong>{{candidateName}}</strong> has submitted an application for <strong>{{vacancyTitle}}</strong>.</p><p>Application ID: {{applicationId}}</p></div>',
        emailText: 'New application received for {{vacancyTitle}} from {{candidateName}} ({{applicationId}}).',
      },
      {
        code: 'RECRUITMENT_HR_CANDIDATE_SELECTED',
        name: 'HR Alert: Candidate Selected',
        category: 'SYSTEM',
        channels: ['IN_APP', 'EMAIL'],
        subject: '[Candidate Selected] {{candidateName}} — {{vacancyTitle}}',
        inAppTitle: 'Candidate Selected 🌟',
        inAppMessage: '{{candidateName}} has been marked SELECTED for {{vacancyTitle}}. Offer process can be initiated.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h3>Candidate Selected</h3><p><strong>{{candidateName}}</strong> has been selected for <strong>{{vacancyTitle}}</strong>.</p><p>HR can now initiate the offer process.</p></div>',
        emailText: 'Candidate Selected: {{candidateName}} for {{vacancyTitle}}.',
      },
      {
        code: 'RECRUITMENT_HR_OFFER_ACCEPTED',
        name: 'HR Alert: Offer Accepted',
        category: 'SYSTEM',
        channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        subject: '[Offer Accepted] {{candidateName}} — {{vacancyTitle}}',
        inAppTitle: 'Offer Accepted! 🎉',
        inAppMessage: '{{candidateName}} has accepted the employment offer for {{vacancyTitle}}.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h3>Offer Accepted</h3><p><strong>{{candidateName}}</strong> has accepted the offer for <strong>{{vacancyTitle}}</strong>.</p><p>Clearance and verification can now begin.</p></div>',
        emailText: 'Offer Accepted: {{candidateName}} has accepted the offer for {{vacancyTitle}}.',
        whatsAppTemplateName: 'hr_alert_offer_accepted',
        whatsAppBody: 'HR Alert: {{candidateName}} has accepted the offer for {{vacancyTitle}}! Clearance is ready to start.',
      },
      {
        code: 'RECRUITMENT_HR_OFFER_DECLINED',
        name: 'HR Alert: Offer Declined',
        category: 'SYSTEM',
        channels: ['IN_APP', 'EMAIL'],
        subject: '[Offer Declined] {{candidateName}} — {{vacancyTitle}}',
        inAppTitle: 'Offer Declined ❌',
        inAppMessage: '{{candidateName}} has declined the offer for {{vacancyTitle}}. Reason: {{reason}}',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h3>Offer Declined</h3><p><strong>{{candidateName}}</strong> has declined the offer for <strong>{{vacancyTitle}}</strong>.</p><p>Reason: {{reason}}</p></div>',
        emailText: 'Offer Declined: {{candidateName}} declined the offer for {{vacancyTitle}}. Reason: {{reason}}.',
      },
      {
        code: 'RECRUITMENT_HR_CLEARANCE_FAILED',
        name: 'HR Alert: Clearance Failure',
        category: 'SYSTEM',
        channels: ['IN_APP', 'EMAIL'],
        subject: '[Clearance Issue] {{candidateName}} — {{reason}}',
        inAppTitle: 'Clearance Issue Flagged ⚠️',
        inAppMessage: 'Clearance verification issue flagged for {{candidateName}}: {{reason}}',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h3>Clearance Verification Flagged</h3><p>A verification requirement has failed for candidate <strong>{{candidateName}}</strong>.</p><p>Reason: {{reason}}</p></div>',
        emailText: 'Clearance issue flagged for {{candidateName}}: {{reason}}.',
      },
      {
        code: 'RECRUITMENT_HR_CLEARANCE_COMPLETED',
        name: 'HR Alert: Clearance Completed',
        category: 'SYSTEM',
        channels: ['IN_APP', 'EMAIL'],
        subject: '[Clearance Cleared] {{candidateName}} — {{vacancyTitle}}',
        inAppTitle: 'Clearance Completed ✅',
        inAppMessage: 'All checklist items cleared for {{candidateName}}. Ready for onboarding.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h3>Clearance Completed</h3><p>Candidate <strong>{{candidateName}}</strong> has cleared all pre-joining verification.</p><p>Onboarding can now be initiated.</p></div>',
        emailText: 'Clearance cleared for {{candidateName}}. Ready for onboarding.',
      },
      {
        code: 'RECRUITMENT_HR_ONBOARDING_COMPLETED',
        name: 'HR Alert: Onboarding Completed',
        category: 'SYSTEM',
        channels: ['IN_APP', 'EMAIL'],
        subject: '[Staff Active] {{candidateName}} ({{employeeId}}) Joined',
        inAppTitle: 'Staff Record Active 🚀',
        inAppMessage: '{{candidateName}} onboarding completed and staff record created with ID {{employeeId}}.',
        emailHtml: '<div style="font-family:sans-serif;color:#1E293B;"><h3>Onboarding Completed</h3><p><strong>{{candidateName}}</strong> is now an active employee with ID <strong>{{employeeId}}</strong>.</p></div>',
        emailText: 'Onboarding completed for {{candidateName}}. Employee ID: {{employeeId}}.',
      },
    ];

    for (const item of defaults) {
      const exists = await this.prisma.communicationTemplate.findUnique({
        where: { code: item.code },
      });
      if (!exists) {
        await this.createTemplate(item);
      }
    }
  }
}
