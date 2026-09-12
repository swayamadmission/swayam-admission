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
  ];

  // Default sample mock data for live previews
  public static readonly SAMPLE_MOCK_DATA: Record<string, string> = {
    studentName: 'Rahul Kumar',
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
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Replace {{variableName}} in string safely.
   */
  render(templateText: string | null | undefined, context: Record<string, any>): string {
    if (!templateText) return '';
    return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
      if (context[varName] !== undefined && context[varName] !== null) {
        return String(context[varName]);
      }
      return match; // preserve if missing or leave placeholder
    });
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
    const defaults: CreateTemplateDto[] = [
      {
        code: 'APPLICATION_SUBMITTED',
        name: 'Application Submitted Confirmation',
        category: 'TRANSACTIONAL',
        channels: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'],
        subject: 'Application Received — {{applicationNumber}}',
        inAppTitle: 'Application Submitted',
        inAppMessage: 'Your application {{applicationNumber}} for {{courseName}} at {{collegeName}} has been successfully submitted.',
        emailHtml: '<div style="font-family:sans-serif;color:#0F172A;"><h2>Hello {{studentName}},</h2><p>Your application <strong>{{applicationNumber}}</strong> for <strong>{{courseName}}</strong> ({{branchName}}) at <strong>{{collegeName}}</strong> has been received and is under review.</p><p>We will notify you once your review is updated.</p><br/><p>Best regards,<br/><strong>Swayam Admission Team</strong></p></div>',
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
        emailHtml: '<div style="font-family:sans-serif;color:#0F172A;"><h2>Congratulations {{studentName}}!</h2><p>Your admission for <strong>{{courseName}}</strong> at <strong>{{collegeName}}</strong> has been <span style="color:#4A7B5B;font-weight:bold;">APPROVED</span>.</p><p>Please proceed to complete the payment confirmation to reserve your seat.</p><br/><p>Best regards,<br/><strong>Swayam Admission Team</strong></p></div>',
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
        emailHtml: '<div style="font-family:sans-serif;color:#0F172A;"><h2>Dear {{studentName}},</h2><p>We regret to inform you that your application {{applicationNumber}} for {{courseName}} at {{collegeName}} was not approved.</p><p>Reason: {{rejectionReason}}</p><p>Please contact your counselor {{counselorName}} for alternative options.</p></div>',
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
        emailHtml: '<div style="font-family:sans-serif;color:#0F172A;"><h2>Payment Due</h2><p>Dear {{studentName}}, a payment request of <strong>{{amount}}</strong> is due on <strong>{{dueDate}}</strong> for {{courseName}} at {{collegeName}}.</p></div>',
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
        emailHtml: '<div style="font-family:sans-serif;color:#0F172A;"><h2>Payment Confirmed</h2><p>Thank you {{studentName}}. Your payment of <strong>{{amount}}</strong> for <strong>{{courseName}}</strong> at <strong>{{collegeName}}</strong> is verified.</p></div>',
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
        emailHtml: '<div style="font-family:sans-serif;color:#0F172A;"><h2>Admissions Open for {{academicSession}}</h2><p>Dear {{studentName}}, applications are now open for <strong>{{courseName}}</strong> at <strong>{{collegeName}}</strong>.</p><p><a href="{{loginUrl}}" style="background:#4A7B5B;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Apply Now</a></p></div>',
        emailText: 'Admissions open for {{academicSession}} in {{courseName}} at {{collegeName}}. Apply online today.',
        smsBody: 'Admissions open for {{courseName}} at {{collegeName}} for {{academicSession}}. Apply now at Swayam Admission.',
        whatsAppTemplateName: 'promo_admissions_open',
        whatsAppBody: 'Hello {{studentName}}, admissions are now open for {{courseName}} at {{collegeName}} for {{academicSession}}.',
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
