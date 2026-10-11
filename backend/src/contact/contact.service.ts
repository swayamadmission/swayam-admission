import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactEntryDto } from './dto/create-contact-entry.dto';
import { UpdateContactEntryDto } from './dto/update-contact-entry.dto';
import { CreateDepartmentContactDto } from './dto/create-department-contact.dto';
import { UpdateDepartmentContactDto } from './dto/update-department-contact.dto';
import { CreateContactEnquiryDto } from './dto/create-contact-enquiry.dto';
import { UpdateEnquiryStatusDto } from './dto/update-enquiry-status.dto';
import { UpdateContactSettingsDto } from './dto/update-contact-settings.dto';

interface RateLimitRecord {
  count: number;
  firstRequestTime: number;
}

@Injectable()
export class ContactService implements OnModuleInit {
  private readonly logger = new Logger(ContactService.name);

  // In-memory rate-limiter maps
  private readonly ipRateMap = new Map<string, RateLimitRecord>();
  private readonly emailRateMap = new Map<string, RateLimitRecord>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultDepartmentContacts();
    await this.seedDefaultContactPageSettings();
  }

  /**
   * Seed official Swayam Admission department contacts if table is empty
   */
  private async seedDefaultDepartmentContacts() {
    try {
      const count = await this.prisma.departmentContact.count();
      if (count === 0) {
        this.logger.log('Seeding official Swayam Admission department contacts...');

        const defaultDepartments = [
          {
            name: 'Admissions & Counselling',
            badge: 'Primary Helpline',
            description:
              'Dedicated counselor desk for NEET, JEE, CUET, Management, and state counseling. Get college recommendations, eligibility checks, and seat availability.',
            phone: '6284308664',
            whatsapp: '6284308664',
            email: 'getadmission@swayamadmission.com',
            officeHours: 'Mon – Sat: 9:30 AM – 6:30 PM',
            workingDays: 'Monday to Saturday',
            address: 'New Delhi, India',
            ctaText: 'Call Now',
            ctaAction: 'CALL',
            ctaUrl: 'tel:6284308664',
            sortOrder: 1,
            isActive: true,
          },
          {
            name: 'General Enquiries',
            badge: 'Email & Desk',
            description:
              'Parent queries, official institutional verifications, portal feedback, and general information regarding educational offerings and scholarships.',
            phone: '6284308664',
            whatsapp: '6284308664',
            email: 'swayamadmissions@gmail.com',
            officeHours: '24/7 (Replies within 2 to 4 business hours)',
            workingDays: 'Monday to Saturday',
            address: 'New Delhi, India',
            ctaText: 'Email Us',
            ctaAction: 'EMAIL',
            ctaUrl: 'mailto:swayamadmissions@gmail.com',
            sortOrder: 2,
            isActive: true,
          },
          {
            name: 'Student Application Support',
            badge: 'Form & Status Desk',
            description:
              'Direct assistance for ongoing applications, document verification, application fee confirmation, and status tracking.',
            phone: '6399102731',
            whatsapp: '6399102731',
            email: 'swayamadmissions@gmail.com',
            officeHours: 'Mon – Sat: 9:30 AM – 6:30 PM',
            workingDays: 'Monday to Saturday',
            address: 'New Delhi, India',
            ctaText: 'Call Support',
            ctaAction: 'CALL',
            ctaUrl: 'tel:6399102731',
            sortOrder: 3,
            isActive: true,
          },
          {
            name: 'College Partnerships & Institutional Relations',
            badge: 'Partnership Desk',
            description:
              'University collaborations, college listing verifications, institutional onboarding, and official educational alliances across India.',
            phone: '6284308664',
            whatsapp: '6284308664',
            email: 'swayamadmissions@gmail.com',
            officeHours: 'Mon – Fri: 10:00 AM – 6:00 PM',
            workingDays: 'Monday to Friday',
            address: 'New Delhi, India',
            ctaText: 'Partner With Us',
            ctaAction: 'EMAIL',
            ctaUrl: 'mailto:swayamadmissions@gmail.com',
            sortOrder: 4,
            isActive: true,
          },
          {
            name: 'Technical & Portal Support',
            badge: 'Platform & IT',
            description:
              'Assistance with login problems, OTP verification, document upload glitches, or password recovery on the Swayam Admission portal.',
            phone: '6399102731',
            whatsapp: '6399102731',
            email: 'swayamadmissions@gmail.com',
            officeHours: 'Mon – Sat: 10:00 AM – 7:00 PM',
            workingDays: 'Monday to Saturday',
            address: 'New Delhi, India',
            ctaText: 'Report Issue',
            ctaAction: 'EMAIL',
            ctaUrl: 'mailto:swayamadmissions@gmail.com',
            sortOrder: 5,
            isActive: true,
          },
          {
            name: 'Swayam Admission Central Office',
            badge: 'Headquarters',
            description:
              'Central administrative headquarters overseeing counseling centers and partner networks nationwide.',
            phone: '6284308664',
            whatsapp: '6284308664',
            email: 'swayamadmissions@gmail.com',
            officeHours: 'Mon – Sat: 9:30 AM – 6:30 PM',
            workingDays: 'Monday to Saturday',
            address: 'New Delhi, India',
            ctaText: 'Get Directions',
            ctaAction: 'URL',
            ctaUrl: 'https://maps.google.com/?q=New+Delhi+India',
            sortOrder: 6,
            isActive: true,
          },
        ];

        for (const dept of defaultDepartments) {
          await this.prisma.departmentContact.create({ data: dept });
        }
        this.logger.log('Official Swayam Admission department contacts seeded successfully.');
      }
    } catch (error) {
      this.logger.error('Failed to seed department contacts:', error);
    }
  }

  /**
   * Seed default contact page settings if not present
   */
  private async seedDefaultContactPageSettings() {
    try {
      const setting = await this.prisma.contactPageSetting.findUnique({
        where: { id: 'default_contact_page_setting' },
      });

      if (!setting) {
        await this.prisma.contactPageSetting.create({
          data: {
            id: 'default_contact_page_setting',
            pageHeading: 'Contact Swayam Admission',
            pageSubheading:
              'India Ka Mission Swayam Admission — Your Trusted Education Partner. Get help with college admissions, courses, applications and counselling.',
            helpdeskBadge: 'Official Swayam Admission Helpdesk',
            officeHours: 'Monday – Saturday: 9:30 AM – 6:30 PM',
            workingDays: 'Monday to Saturday',
            holidayNotice: 'Closed on Sundays & National Holidays',
            expectedResponseTime: 'Within 2 to 4 business hours',
            address: 'New Delhi, India',
            googleMapsUrl: '',
            instagramUrl: 'https://www.instagram.com/swayamadmission',
            facebookUrl: 'https://www.facebook.com/swayamadmission',
            youtubeUrl: 'https://www.youtube.com/@swayamadmission',
            linkedinUrl: 'https://www.linkedin.com/company/swayamadmission',
            xUrl: 'https://x.com/swayamadmission',
            githubUrl: 'https://github.com/swayamadmission',
            redditUrl: 'https://www.reddit.com/user/swayamadmission/',
            telegramUrl: 'https://t.me/swayamadmission',
            discordUrl: '',
          },
        });
        this.logger.log('Default ContactPageSetting initialized successfully.');
      }
    } catch (error) {
      this.logger.error('Failed to seed contact page settings:', error);
    }
  }

  // ─── PUBLIC ENDPOINTS ──────────────────────────────────────────────────────

  /**
   * Public Contact Us page aggregated data: real department contacts, branding, page settings, verified socials
   */
  async getPublicContactData() {
    // 1. Fetch active department contacts sorted by sortOrder
    const departments = await this.prisma.departmentContact.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // 2. Fetch page-level settings & branding
    const pageSetting = await this.prisma.contactPageSetting.findUnique({
      where: { id: 'default_contact_page_setting' },
    });
    const system = await this.prisma.systemSetting.findFirst();
    const branding = await this.prisma.brandingSetting.findFirst();

    // 3. Filter verified social links (only those configured with actual URLs)
    const verifiedSocials: Record<string, string> = {};
    const socialRaw = {
      instagram: pageSetting?.instagramUrl || system?.instagramUrl,
      facebook: pageSetting?.facebookUrl || system?.facebookUrl,
      youtube: pageSetting?.youtubeUrl || system?.youtubeUrl,
      linkedin: pageSetting?.linkedinUrl || system?.linkedinUrl,
      x: pageSetting?.xUrl || system?.xUrl,
      github: pageSetting?.githubUrl || system?.githubUrl,
      reddit: pageSetting?.redditUrl || system?.redditUrl,
      telegram: pageSetting?.telegramUrl || system?.telegramUrl,
      discord: pageSetting?.discordUrl || system?.discordUrl,
    };

    for (const [platform, url] of Object.entries(socialRaw)) {
      if (url && typeof url === 'string' && url.trim().length > 0 && !url.includes('example.com')) {
        verifiedSocials[platform] = url.trim();
      }
    }

    // Standard enquiry categories
    const categories = [
      'Admission Counselling',
      'College and Course Information',
      'Application Support',
      'Payment and Fee Enquiry',
      'College Partnership',
      'Technical Support',
      'Other',
    ];

    // Also fetch published directory entries for backward compatibility
    const directory = await this.prisma.contactDirectoryEntry.findMany({
      where: { isActive: true, isPublished: true },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      brand: {
        brandName: system?.platformName || 'Swayam Admission',
        tagline: system?.tagline || 'India Ka Mission Swayam Admission',
        brandPromise: system?.brandPromise || 'Your Trusted Education Partner',
        primaryColor: branding?.primaryColor || '#4A7B5B',
        accentColor: branding?.accentColor || '#F0AE1A',
        socialHandle: system?.socialHandle || '@swayamadmission',
        logo: branding?.logo || null,
      },
      pageSettings: {
        pageHeading: pageSetting?.pageHeading || 'Contact Swayam Admission',
        pageSubheading:
          pageSetting?.pageSubheading ||
          'India Ka Mission Swayam Admission — Your Trusted Education Partner. Get help with college admissions, courses, applications and counselling.',
        helpdeskBadge: pageSetting?.helpdeskBadge || 'Official Swayam Admission Helpdesk',
        officeHours: pageSetting?.officeHours || system?.officeHours || 'Monday – Saturday: 9:30 AM – 6:30 PM',
        workingDays: pageSetting?.workingDays || system?.workingDays || 'Monday to Saturday',
        holidayNotice: pageSetting?.holidayNotice || system?.holidayNotice || 'Closed on Sundays & National Holidays',
        expectedResponseTime: pageSetting?.expectedResponseTime || system?.expectedResponseTime || 'Within 2 to 4 business hours',
        address: pageSetting?.address || system?.address || 'New Delhi, India',
        googleMapsUrl: pageSetting?.googleMapsUrl || system?.googleMapsUrl || '',
      },
      departments,
      contacts: directory,
      businessHours: {
        officeHours: pageSetting?.officeHours || system?.officeHours || 'Monday – Saturday: 9:30 AM – 6:30 PM',
        workingDays: pageSetting?.workingDays || system?.workingDays || 'Monday to Saturday',
        holidayNotice: pageSetting?.holidayNotice || system?.holidayNotice || 'Closed on Sundays & National Holidays',
        expectedResponseTime: pageSetting?.expectedResponseTime || system?.expectedResponseTime || 'Within 2 to 4 business hours',
        address: pageSetting?.address || system?.address || 'New Delhi, India',
        googleMapsUrl: pageSetting?.googleMapsUrl || system?.googleMapsUrl || '',
      },
      socials: verifiedSocials,
      categories,
    };
  }

  /**
   * Submit public contact form enquiry with spam protection, validation, and unique reference ID.
   * Only fullName, mobile, subject, and category are mandatory. Email and message are optional.
   */
  async submitPublicEnquiry(dto: CreateContactEnquiryDto, ipAddress: string) {
    const cleanIp = ipAddress ? ipAddress.replace('::ffff:', '') : '127.0.0.1';
    const now = Date.now();
    const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

    // 1. Rate limiting by IP: max 8 requests per 10 min
    const ipRecord = this.ipRateMap.get(cleanIp);
    if (ipRecord) {
      if (now - ipRecord.firstRequestTime < WINDOW_MS) {
        if (ipRecord.count >= 8) {
          throw new HttpException(
            'Too many requests submitted from your network. Please wait a few minutes before trying again.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        ipRecord.count++;
      } else {
        this.ipRateMap.set(cleanIp, { count: 1, firstRequestTime: now });
      }
    } else {
      this.ipRateMap.set(cleanIp, { count: 1, firstRequestTime: now });
    }

    // 2. Validate Indian mobile number
    const cleanMobile = (dto.mobile || '').replace(/\D/g, '');
    if (cleanMobile.length !== 10 || !['6', '7', '8', '9'].includes(cleanMobile[0])) {
      throw new BadRequestException('Please provide a valid 10-digit Indian mobile number');
    }

    // 3. Process optional email
    const rawEmail = dto.email ? dto.email.trim().toLowerCase() : null;
    const cleanEmail = rawEmail && rawEmail.length > 0 ? rawEmail : null;

    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        throw new BadRequestException('Please provide a valid email address');
      }

      // Rate limiting by Email: max 5 requests per 10 min
      const emailRecord = this.emailRateMap.get(cleanEmail);
      if (emailRecord) {
        if (now - emailRecord.firstRequestTime < WINDOW_MS) {
          if (emailRecord.count >= 5) {
            throw new HttpException(
              'Too many enquiries submitted for this email address. Please check your inbox or wait 10 minutes.',
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }
          emailRecord.count++;
        } else {
          this.emailRateMap.set(cleanEmail, { count: 1, firstRequestTime: now });
        }
      } else {
        this.emailRateMap.set(cleanEmail, { count: 1, firstRequestTime: now });
      }
    }

    // 4. Duplicate submission check: identical mobile and subject in last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentDuplicate = await this.prisma.contactEnquiry.findFirst({
      where: {
        mobile: cleanMobile,
        subject: dto.subject.trim(),
        createdAt: { gte: twoMinutesAgo },
      },
    });

    if (recentDuplicate) {
      throw new BadRequestException(
        'An identical enquiry was recently submitted. Please allow our counselors a moment to review it.',
      );
    }

    // 5. Generate unique reference number: ENQ-YYYYMMDD-XXXX
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let referenceNo = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      referenceNo = `ENQ-${todayStr}-${rand}`;
      const existing = await this.prisma.contactEnquiry.findUnique({
        where: { referenceNo },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      referenceNo = `ENQ-${todayStr}-${Date.now().toString().slice(-4)}`;
    }

    // Auto-map category to initial assigned department
    let assignedDept = dto.department?.trim() || null;
    if (!assignedDept) {
      const catLower = (dto.category || '').toLowerCase();
      if (catLower.includes('admission') || catLower.includes('counselling')) {
        assignedDept = 'Admissions & Counselling';
      } else if (catLower.includes('application')) {
        assignedDept = 'Student Application Support';
      } else if (catLower.includes('partnership')) {
        assignedDept = 'College Partnerships & Institutional Relations';
      } else if (catLower.includes('tech') || catLower.includes('portal')) {
        assignedDept = 'Technical & Portal Support';
      } else {
        assignedDept = 'General Enquiries';
      }
    }

    // 6. Secure database storage
    const enquiry = await this.prisma.contactEnquiry.create({
      data: {
        referenceNo,
        fullName: dto.fullName.trim(),
        email: cleanEmail,
        mobile: cleanMobile,
        category: dto.category.trim(),
        subject: dto.subject.trim(),
        message: dto.message?.trim() || null,
        ipAddress: cleanIp,
        status: 'NEW',
        assignedDepartment: assignedDept,
      },
    });

    // 7. Create notification for admin/counselors
    try {
      await this.prisma.notification.create({
        data: {
          title: `New Contact Enquiry: ${enquiry.referenceNo}`,
          message: `${dto.fullName.trim()} submitted an enquiry: "${dto.subject.trim()}" (${dto.category.trim()}). Phone: ${cleanMobile}`,
          category: 'CONTACT_ENQUIRY',
          actionType: 'VIEW_ENQUIRY',
          actionUrl: `/admin/contact?enquiryId=${enquiry.id}`,
          priority: 'HIGH',
          metadata: {
            enquiryId: enquiry.id,
            referenceNo: enquiry.referenceNo,
            mobile: cleanMobile,
            category: dto.category.trim(),
          },
        },
      });
    } catch (notifErr) {
      this.logger.warn(`Could not create notification for enquiry ${enquiry.referenceNo}: ${notifErr}`);
    }

    // 8. Log audit trail
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'SUBMIT_CONTACT_ENQUIRY',
          entityId: enquiry.id,
          entityType: 'ContactEnquiry',
          description: `Public contact enquiry submitted: ${enquiry.referenceNo} by ${dto.fullName.trim()}`,
          ipAddress: cleanIp,
          email: cleanEmail || undefined,
        },
      });
    } catch (auditErr) {
      this.logger.warn(`Could not log audit trail for enquiry ${enquiry.referenceNo}: ${auditErr}`);
    }

    return {
      success: true,
      referenceNo: enquiry.referenceNo,
      message:
        'Thank you for contacting Swayam Admission! Your enquiry has been received successfully. Our team will review your query and get back to you shortly.',
    };
  }

  // ─── ADMIN DEPARTMENT CONTACTS CRUD ────────────────────────────────────────

  async getAdminDepartmentContacts(query?: { search?: string; isActive?: string }) {
    const where: any = {};

    if (query?.isActive !== undefined && query.isActive !== 'ALL') {
      where.isActive = query.isActive === 'true';
    }

    if (query?.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { whatsapp: { contains: s, mode: 'insensitive' } },
        { badge: { contains: s, mode: 'insensitive' } },
      ];
    }

    return this.prisma.departmentContact.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createDepartmentContact(dto: CreateDepartmentContactDto, user?: any) {
    const maxSort = await this.prisma.departmentContact.aggregate({
      _max: { sortOrder: true },
    });
    const nextSort = (maxSort._max.sortOrder || 0) + 1;

    const created = await this.prisma.departmentContact.create({
      data: {
        name: dto.name.trim(),
        badge: dto.badge?.trim() || null,
        description: dto.description?.trim() || null,
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        whatsapp: dto.whatsapp?.trim() || null,
        officeHours: dto.officeHours?.trim() || null,
        workingDays: dto.workingDays?.trim() || null,
        address: dto.address?.trim() || null,
        ctaText: dto.ctaText?.trim() || null,
        ctaAction: dto.ctaAction?.trim() || null,
        ctaUrl: dto.ctaUrl?.trim() || null,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : nextSort,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user?.id || null,
          email: user?.email || null,
          action: 'CREATE_DEPARTMENT_CONTACT',
          entityId: created.id,
          entityType: 'DepartmentContact',
          description: `Created department contact "${created.name}"`,
        },
      });
    } catch (e) {
      // audit ignore
    }

    return created;
  }

  async updateDepartmentContact(id: string, dto: UpdateDepartmentContactDto, user?: any) {
    const existing = await this.prisma.departmentContact.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Department contact ${id} not found`);
    }

    const updated = await this.prisma.departmentContact.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.badge !== undefined && { badge: dto.badge?.trim() || null }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.email !== undefined && { email: dto.email?.trim() || null }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
        ...(dto.whatsapp !== undefined && { whatsapp: dto.whatsapp?.trim() || null }),
        ...(dto.officeHours !== undefined && { officeHours: dto.officeHours?.trim() || null }),
        ...(dto.workingDays !== undefined && { workingDays: dto.workingDays?.trim() || null }),
        ...(dto.address !== undefined && { address: dto.address?.trim() || null }),
        ...(dto.ctaText !== undefined && { ctaText: dto.ctaText?.trim() || null }),
        ...(dto.ctaAction !== undefined && { ctaAction: dto.ctaAction?.trim() || null }),
        ...(dto.ctaUrl !== undefined && { ctaUrl: dto.ctaUrl?.trim() || null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user?.id || null,
          email: user?.email || null,
          action: 'UPDATE_DEPARTMENT_CONTACT',
          entityId: id,
          entityType: 'DepartmentContact',
          description: `Updated department contact "${updated.name}"`,
        },
      });
    } catch (e) {
      // audit ignore
    }

    return updated;
  }

  async deleteDepartmentContact(id: string, user?: any) {
    const existing = await this.prisma.departmentContact.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Department contact ${id} not found`);
    }

    await this.prisma.departmentContact.delete({ where: { id } });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user?.id || null,
          email: user?.email || null,
          action: 'DELETE_DEPARTMENT_CONTACT',
          entityId: id,
          entityType: 'DepartmentContact',
          description: `Deleted department contact "${existing.name}"`,
        },
      });
    } catch (e) {
      // audit ignore
    }

    return { success: true, message: 'Department contact deleted successfully' };
  }

  async reorderDepartmentContacts(ids: string[], user?: any) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('A valid list of IDs is required for reordering');
    }

    const updates = ids.map((id, index) =>
      this.prisma.departmentContact.update({
        where: { id },
        data: { sortOrder: index + 1 },
      }),
    );

    await this.prisma.$transaction(updates);

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user?.id || null,
          email: user?.email || null,
          action: 'REORDER_DEPARTMENT_CONTACTS',
          entityType: 'DepartmentContact',
          description: `Reordered ${ids.length} department contacts`,
        },
      });
    } catch (e) {
      // audit ignore
    }

    return { success: true, message: 'Department contacts reordered successfully' };
  }

  // ─── ADMIN DIRECTORY CRUD (BACKWARD COMPATIBILITY) ──────────────────────────

  async getAllDirectoryEntries(query?: {
    department?: string;
    contactType?: string;
    search?: string;
  }) {
    const where: any = {};

    if (query?.department) {
      where.department = query.department;
    }
    if (query?.contactType) {
      where.contactType = query.contactType;
    }
    if (query?.search) {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { value: { contains: s, mode: 'insensitive' } },
        { label: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    return this.prisma.contactDirectoryEntry.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createDirectoryEntry(dto: CreateContactEntryDto) {
    return this.prisma.contactDirectoryEntry.create({
      data: {
        title: dto.title.trim(),
        department: dto.department.trim(),
        contactType: dto.contactType.trim(),
        value: dto.value.trim(),
        label: dto.label?.trim() || null,
        description: dto.description?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        isVerified: dto.isVerified ?? false,
        isPublished: dto.isPublished ?? true,
        businessHours: dto.businessHours?.trim() || null,
      },
    });
  }

  async updateDirectoryEntry(id: string, dto: UpdateContactEntryDto) {
    const existing = await this.prisma.contactDirectoryEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Contact directory entry ${id} not found`);
    }

    return this.prisma.contactDirectoryEntry.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.department !== undefined && { department: dto.department.trim() }),
        ...(dto.contactType !== undefined && { contactType: dto.contactType.trim() }),
        ...(dto.value !== undefined && { value: dto.value.trim() }),
        ...(dto.label !== undefined && { label: dto.label?.trim() || null }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.isVerified !== undefined && { isVerified: dto.isVerified }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        ...(dto.businessHours !== undefined && {
          businessHours: dto.businessHours?.trim() || null,
        }),
      },
    });
  }

  async deleteDirectoryEntry(id: string) {
    const existing = await this.prisma.contactDirectoryEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Contact directory entry ${id} not found`);
    }
    await this.prisma.contactDirectoryEntry.delete({ where: { id } });
    return { success: true, message: 'Contact directory entry deleted successfully' };
  }

  async reorderDirectoryEntries(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('A valid list of IDs is required for reordering');
    }

    const updates = ids.map((id, index) =>
      this.prisma.contactDirectoryEntry.update({
        where: { id },
        data: { sortOrder: index + 1 },
      }),
    );

    await this.prisma.$transaction(updates);
    return { success: true, message: 'Contact directory reordered successfully' };
  }

  // ─── ADMIN ENQUIRIES INBOX ─────────────────────────────────────────────────

  async getEnquiries(query: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.category && query.category !== 'ALL') {
      where.category = query.category;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { referenceNo: { contains: s, mode: 'insensitive' } },
        { fullName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { mobile: { contains: s, mode: 'insensitive' } },
        { subject: { contains: s, mode: 'insensitive' } },
        { message: { contains: s, mode: 'insensitive' } },
        { assignedDepartment: { contains: s, mode: 'insensitive' } },
        { assignedStaffName: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.contactEnquiry.count({ where }),
      this.prisma.contactEnquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Aggregate counts by status
    const statusCounts = await this.prisma.contactEnquiry.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const summary: Record<string, number> = {
      TOTAL: total,
      NEW: 0,
      IN_REVIEW: 0,
      IN_PROGRESS: 0,
      ASSIGNED: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    statusCounts.forEach((sc) => {
      summary[sc.status] = sc._count._all;
    });

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  async getEnquiryById(id: string) {
    const enquiry = await this.prisma.contactEnquiry.findUnique({
      where: { id },
    });
    if (!enquiry) {
      throw new NotFoundException(`Enquiry ${id} not found`);
    }
    return enquiry;
  }

  async updateEnquiryStatus(id: string, dto: UpdateEnquiryStatusDto, user?: any) {
    const existing = await this.prisma.contactEnquiry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Enquiry ${id} not found`);
    }

    const updateData: any = {
      status: dto.status,
      adminNotes: dto.adminNotes !== undefined ? dto.adminNotes : existing.adminNotes,
      assignedDepartment:
        dto.assignedDepartment !== undefined ? dto.assignedDepartment : existing.assignedDepartment,
      assignedStaffId:
        dto.assignedStaffId !== undefined ? dto.assignedStaffId : existing.assignedStaffId,
      assignedStaffName:
        dto.assignedStaffName !== undefined ? dto.assignedStaffName : existing.assignedStaffName,
    };

    if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = user?.fullName || user?.email || 'Admin';
    } else if (dto.status === 'NEW' || dto.status === 'IN_REVIEW' || dto.status === 'ASSIGNED') {
      // Reopening enquiry
      updateData.resolvedAt = null;
      updateData.resolvedBy = null;
    }

    const updated = await this.prisma.contactEnquiry.update({
      where: { id },
      data: updateData,
    });

    // Notify assigned staff if newly assigned
    if (dto.assignedStaffId && dto.assignedStaffId !== existing.assignedStaffId) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: dto.assignedStaffId,
            title: `Enquiry Assigned: ${existing.referenceNo}`,
            message: `You have been assigned enquiry "${existing.subject}" from ${existing.fullName}.`,
            category: 'CONTACT_ENQUIRY',
            actionType: 'VIEW_ENQUIRY',
            actionUrl: `/admin/contact?enquiryId=${existing.id}`,
            priority: 'HIGH',
            metadata: { enquiryId: existing.id, referenceNo: existing.referenceNo },
          },
        });
      } catch (err) {
        this.logger.warn(`Could not notify staff ${dto.assignedStaffId}: ${err}`);
      }
    }

    // Maintain Audit Trail
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user?.id || null,
          email: user?.email || null,
          action: 'UPDATE_ENQUIRY_STATUS',
          entityId: id,
          entityType: 'ContactEnquiry',
          description: `Updated enquiry ${existing.referenceNo} status to ${dto.status}${
            dto.assignedStaffName ? `, assigned to ${dto.assignedStaffName}` : ''
          }`,
          changes: {
            previousStatus: existing.status,
            newStatus: dto.status,
            assignedDepartment: dto.assignedDepartment,
            assignedStaffId: dto.assignedStaffId,
            assignedStaffName: dto.assignedStaffName,
            adminNotes: dto.adminNotes,
          },
        },
      });
    } catch (e) {
      // audit ignore
    }

    return updated;
  }

  async deleteEnquiry(id: string, user?: any) {
    const existing = await this.prisma.contactEnquiry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Enquiry ${id} not found`);
    }

    await this.prisma.contactEnquiry.delete({ where: { id } });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user?.id || null,
          email: user?.email || null,
          action: 'DELETE_ENQUIRY',
          entityId: id,
          entityType: 'ContactEnquiry',
          description: `Deleted enquiry record ${existing.referenceNo}`,
        },
      });
    } catch (e) {
      // audit ignore
    }

    return { success: true, message: 'Enquiry deleted successfully' };
  }

  /**
   * Get list of staff & counselors available for assignment
   */
  async getAssignableStaff() {
    const users = await this.prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN', 'SENIOR_COUNSELOR', 'COUNSELOR', 'DIRECTOR'],
        },
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        mobile: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      phone: u.mobile,
    }));
  }

  // ─── ADMIN CONTACT SETTINGS & BUSINESS HOURS ───────────────────────────────

  async getContactSettings() {
    let setting = await this.prisma.contactPageSetting.findUnique({
      where: { id: 'default_contact_page_setting' },
    });

    const system = await this.prisma.systemSetting.findFirst();

    if (!setting) {
      setting = {
        id: 'default_contact_page_setting',
        pageHeading: 'Contact Swayam Admission',
        pageSubheading:
          'India Ka Mission Swayam Admission — Your Trusted Education Partner. Get help with college admissions, courses, applications and counselling.',
        helpdeskBadge: 'Official Swayam Admission Helpdesk',
        officeHours: system?.officeHours || 'Monday – Saturday: 9:30 AM – 6:30 PM',
        workingDays: system?.workingDays || 'Monday to Saturday',
        holidayNotice: system?.holidayNotice || 'Closed on Sundays & National Holidays',
        expectedResponseTime: system?.expectedResponseTime || 'Within 2 to 4 business hours',
        address: system?.address || 'New Delhi, India',
        googleMapsUrl: system?.googleMapsUrl || '',
        instagramUrl: system?.instagramUrl || 'https://www.instagram.com/swayamadmission',
        facebookUrl: system?.facebookUrl || 'https://www.facebook.com/swayamadmission',
        youtubeUrl: system?.youtubeUrl || 'https://www.youtube.com/@swayamadmission',
        linkedinUrl: system?.linkedinUrl || 'https://www.linkedin.com/company/swayamadmission',
        xUrl: system?.xUrl || 'https://x.com/swayamadmission',
        githubUrl: system?.githubUrl || 'https://github.com/swayamadmission',
        redditUrl: system?.redditUrl || 'https://www.reddit.com/user/swayamadmission/',
        telegramUrl: system?.telegramUrl || 'https://t.me/swayamadmission',
        discordUrl: system?.discordUrl || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return setting;
  }

  async updateContactSettings(dto: UpdateContactSettingsDto, user?: any) {
    const updateData: any = {};
    if (dto.pageHeading !== undefined) updateData.pageHeading = dto.pageHeading.trim();
    if (dto.pageSubheading !== undefined) updateData.pageSubheading = dto.pageSubheading.trim();
    if (dto.helpdeskBadge !== undefined) updateData.helpdeskBadge = dto.helpdeskBadge.trim();
    if (dto.officeHours !== undefined) updateData.officeHours = dto.officeHours.trim();
    if (dto.workingDays !== undefined) updateData.workingDays = dto.workingDays.trim();
    if (dto.holidayNotice !== undefined) updateData.holidayNotice = dto.holidayNotice.trim();
    if (dto.expectedResponseTime !== undefined)
      updateData.expectedResponseTime = dto.expectedResponseTime.trim();
    if (dto.address !== undefined) updateData.address = dto.address.trim();
    if (dto.googleMapsUrl !== undefined) updateData.googleMapsUrl = dto.googleMapsUrl.trim();

    if (dto.instagramUrl !== undefined) updateData.instagramUrl = dto.instagramUrl.trim();
    if (dto.facebookUrl !== undefined) updateData.facebookUrl = dto.facebookUrl.trim();
    if (dto.youtubeUrl !== undefined) updateData.youtubeUrl = dto.youtubeUrl.trim();
    if (dto.linkedinUrl !== undefined) updateData.linkedinUrl = dto.linkedinUrl.trim();
    if (dto.xUrl !== undefined) updateData.xUrl = dto.xUrl.trim();
    if (dto.githubUrl !== undefined) updateData.githubUrl = dto.githubUrl.trim();
    if (dto.redditUrl !== undefined) updateData.redditUrl = dto.redditUrl.trim();
    if (dto.telegramUrl !== undefined) updateData.telegramUrl = dto.telegramUrl.trim();
    if (dto.discordUrl !== undefined) updateData.discordUrl = dto.discordUrl.trim();

    const updated = await this.prisma.contactPageSetting.upsert({
      where: { id: 'default_contact_page_setting' },
      update: updateData,
      create: {
        id: 'default_contact_page_setting',
        ...updateData,
      },
    });

    // Also synchronize relevant fields in SystemSetting
    try {
      const system = await this.prisma.systemSetting.findFirst();
      if (system) {
        const sysUpdates: any = {};
        if (dto.officeHours !== undefined) sysUpdates.officeHours = dto.officeHours.trim();
        if (dto.workingDays !== undefined) sysUpdates.workingDays = dto.workingDays.trim();
        if (dto.holidayNotice !== undefined) sysUpdates.holidayNotice = dto.holidayNotice.trim();
        if (dto.expectedResponseTime !== undefined)
          sysUpdates.expectedResponseTime = dto.expectedResponseTime.trim();
        if (dto.address !== undefined) sysUpdates.address = dto.address.trim();
        if (dto.googleMapsUrl !== undefined) sysUpdates.googleMapsUrl = dto.googleMapsUrl.trim();
        if (dto.instagramUrl !== undefined) sysUpdates.instagramUrl = dto.instagramUrl.trim();
        if (dto.facebookUrl !== undefined) sysUpdates.facebookUrl = dto.facebookUrl.trim();
        if (dto.youtubeUrl !== undefined) sysUpdates.youtubeUrl = dto.youtubeUrl.trim();
        if (dto.linkedinUrl !== undefined) sysUpdates.linkedinUrl = dto.linkedinUrl.trim();
        if (dto.xUrl !== undefined) sysUpdates.xUrl = dto.xUrl.trim();
        if (dto.githubUrl !== undefined) sysUpdates.githubUrl = dto.githubUrl.trim();
        if (dto.redditUrl !== undefined) sysUpdates.redditUrl = dto.redditUrl.trim();
        if (dto.telegramUrl !== undefined) sysUpdates.telegramUrl = dto.telegramUrl.trim();
        if (dto.discordUrl !== undefined) sysUpdates.discordUrl = dto.discordUrl.trim();

        if (Object.keys(sysUpdates).length > 0) {
          await this.prisma.systemSetting.update({
            where: { id: system.id },
            data: sysUpdates,
          });
        }
      }
    } catch (e) {
      // ignore
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user?.id || null,
          email: user?.email || null,
          action: 'UPDATE_CONTACT_PAGE_SETTINGS',
          entityType: 'ContactPageSetting',
          description: 'Updated contact page and business hours settings',
        },
      });
    } catch (e) {
      // audit ignore
    }

    return {
      success: true,
      message: 'Contact and business hours settings updated successfully',
      settings: updated,
    };
  }
}
