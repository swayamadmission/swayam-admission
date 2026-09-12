import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { NotificationDispatcher } from './notification-channels.service';
import { TemplateEngineService } from './template-engine.service';
import {
  NotificationPriority,
  NotificationType,
  Role,
  CommunicationChannel,
} from '@prisma/client';

export interface EventNotificationPayload {
  studentUserId?: string;
  studentName?: string;
  studentEmail?: string;
  studentMobile?: string;
  counselorUserId?: string;
  adminRole?: Role;
  applicationId?: string;
  applicationNumber?: string;
  collegeName?: string;
  courseName?: string;
  branchName?: string;
  amount?: string | number;
  dueDate?: string;
  reportingDate?: string;
  rejectionReason?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: NotificationDispatcher,
    private readonly templateEngine: TemplateEngineService,
  ) {}

  /**
   * Enterprise Dashboard Overview Stats
   */
  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [total, unread, read, critical, todayCount, archived] =
      await Promise.all([
        this.prisma.notification.count({ where: { isDeleted: false } }),
        this.prisma.notification.count({
          where: { isRead: false, isDeleted: false },
        }),
        this.prisma.notification.count({
          where: { isRead: true, isDeleted: false },
        }),
        this.prisma.notification.count({
          where: { priority: NotificationPriority.CRITICAL, isDeleted: false },
        }),
        this.prisma.notification.count({
          where: { createdAt: { gte: todayStart }, isDeleted: false },
        }),
        this.prisma.notification.count({
          where: { isArchived: true, isDeleted: false },
        }),
      ]);

    return {
      total,
      unread,
      read,
      critical,
      todayNotifications: todayCount,
      archived,
    };
  }

  /**
   * Get User Specific Notifications
   */
  async getMyNotifications(userId: string, role?: Role) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        isDeleted: false,
        OR: [
          { userId },
          { receiverId: userId },
          ...(role ? [{ receiverRole: role }] : []),
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    const data = notifications || [];
    return {
      success: true,
      data,
      count: data.length,
    };
  }

  /**
   * Paginated Notification Search & Filter
   */
  async findAll(query: NotificationQueryDto) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { message: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.type) where.type = query.type;
    if (query.priority) where.priority = query.priority;
    if (query.category) where.category = query.category;
    if (query.receiverRole) where.receiverRole = query.receiverRole;
    if (query.isRead !== undefined && query.isRead !== '') {
      where.isRead = query.isRead === 'true';
    }

    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get unread counter & recent notifications for logged in user or role
   */
  async getUnreadCount(userId?: string, role?: Role) {
    const where: any = { isRead: false, isDeleted: false };
    if (userId || role) {
      where.OR = [{ userId }, { receiverId: userId }, { receiverRole: role }];
    }

    const count = await this.prisma.notification.count({ where });

    const recent = await this.prisma.notification.findMany({
      where,
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return { count, recent };
  }

  /**
   * Retrieve Single Notification
   */
  async findOne(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!notification || notification.isDeleted) {
      throw new NotFoundException(`Notification with ID "${id}" not found.`);
    }

    return notification;
  }

  /**
   * Insert New Notification
   */
  async createNotification(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        title: dto.title,
        message: dto.message,
        shortMessage: dto.shortMessage || dto.message.slice(0, 100),
        userId: dto.userId || dto.receiverId || null,
        receiverId: dto.receiverId || dto.userId || null,
        receiverRole: dto.receiverRole || null,
        type: dto.type || NotificationType.SYSTEM,
        priority: dto.priority || NotificationPriority.MEDIUM,
        category: dto.category || 'SYSTEM',
        icon: dto.icon || 'Bell',
        color: dto.color || '#3B82F6',
        relatedLeadId: dto.relatedLeadId || null,
        relatedStudentId: dto.relatedStudentId || null,
        relatedApplicationId: dto.relatedApplicationId || null,
        relatedCollegeId: dto.relatedCollegeId || null,
        relatedCourseId: dto.relatedCourseId || null,
        relatedDocumentId: dto.relatedDocumentId || null,
        relatedPaymentId: dto.relatedPaymentId || null,
        relatedCampaignId: dto.relatedCampaignId || null,
        actionUrl: dto.actionUrl || null,
        actionType: dto.actionType || null,
        metadata: dto.metadata || null,
      },
    });
  }

  /**
   * Mark Single Notification as Read
   */
  async markAsRead(id: string) {
    await this.findOne(id);
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark All Notifications as Read for User/Role
   */
  async markAllAsRead(userId?: string, role?: Role) {
    const where: any = { isRead: false };
    if (userId || role) {
      where.OR = [{ userId }, { receiverId: userId }, { receiverRole: role }];
    }

    await this.prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });

    return { message: 'All notifications marked as read.' };
  }

  /**
   * Bulk Read & Bulk Delete
   */
  async bulkRead(dto: BulkActionDto) {
    await this.prisma.notification.updateMany({
      where: { id: { in: dto.ids } },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: `${dto.ids.length} notifications marked as read.` };
  }

  async bulkDelete(dto: BulkActionDto) {
    await this.prisma.notification.updateMany({
      where: { id: { in: dto.ids } },
      data: { isDeleted: true },
    });
    return { message: `${dto.ids.length} notifications deleted.` };
  }

  /**
   * Archive & Soft Delete
   */
  async archiveNotification(id: string) {
    await this.findOne(id);
    return this.prisma.notification.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  /**
   * Alias helper method for other services
   */
  async sendNotification(data: {
    userId?: string;
    receiverId?: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    category?: string;
    relatedApplicationId?: string;
    relatedDocumentId?: string;
    relatedPaymentId?: string;
    relatedLeadId?: string;
  }) {
    return this.createNotification({
      userId: data.userId || data.receiverId,
      receiverId: data.receiverId || data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || NotificationPriority.MEDIUM,
      category: data.category || 'SYSTEM',
      relatedApplicationId: data.relatedApplicationId,
      relatedDocumentId: data.relatedDocumentId,
      relatedPaymentId: data.relatedPaymentId,
      relatedLeadId: data.relatedLeadId,
    });
  }

  async deleteNotification(id: string) {
    await this.findOne(id);
    return this.prisma.notification.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // ─── USER PREFERENCES ───────────────────────────────────────────────────────

  async getUserPreferences(userId: string) {
    let pref = await this.prisma.userCommunicationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await this.prisma.userCommunicationPreference.create({
        data: { userId },
      });
    }

    return pref;
  }

  async updateUserPreferences(
    userId: string,
    dto: {
      inAppEnabled?: boolean;
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      whatsappEnabled?: boolean;
      promotionalOptOut?: boolean;
    },
  ) {
    return this.prisma.userCommunicationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
      },
      update: dto,
    });
  }

  // ─── CENTRAL EVENT NOTIFICATION ENGINE ──────────────────────────────────────

  /**
   * Centralized Event Emitter: Dispatches event-driven notifications across channels
   * to student, assigned counselor, and operations teams using authoritative templates.
   */
  async emitEventNotification(eventCode: string, payload: EventNotificationPayload) {
    try {
      this.logger.log(`[EVENT TRIGGER] ${eventCode} for Student: ${payload.studentUserId || 'N/A'}`);

      // Lookup matching template if available
      let template = await this.prisma.communicationTemplate.findUnique({
        where: { code: eventCode },
      });

      const context = {
        studentName: payload.studentName || 'Student',
        applicationNumber: payload.applicationNumber || 'N/A',
        collegeName: payload.collegeName || 'Selected College',
        courseName: payload.courseName || 'Course',
        branchName: payload.branchName || 'Specialization',
        amount: payload.amount ? `₹${payload.amount}` : 'N/A',
        dueDate: payload.dueDate || 'Immediate',
        reportingDate: payload.reportingDate || 'As scheduled',
        rejectionReason: payload.rejectionReason || 'Criteria not fulfilled',
        actionUrl: payload.actionUrl || '/dashboard',
        currentYear: '2026',
      };

      const title = template?.inAppTitle
        ? this.templateEngine.render(template.inAppTitle, context)
        : `Update: ${eventCode.replace(/_/g, ' ')}`;

      const message = template?.inAppMessage
        ? this.templateEngine.render(template.inAppMessage, context)
        : `Your application status has changed to ${eventCode}.`;

      // 1. In-App Notification for Student
      if (payload.studentUserId) {
        await this.createNotification({
          userId: payload.studentUserId,
          receiverId: payload.studentUserId,
          title,
          message,
          type: NotificationType.APPLICATION,
          priority: NotificationPriority.HIGH,
          category: 'APPLICATION',
          actionUrl: payload.actionUrl,
          relatedApplicationId: payload.applicationId,
          metadata: payload.metadata,
        });

        // External Channels (Email, SMS, WhatsApp)
        if (template) {
          const channels = template.channels;
          const recipientInfo = {
            id: payload.studentUserId,
            name: payload.studentName || 'Student',
            email: payload.studentEmail,
            mobile: payload.studentMobile,
            type: 'STUDENT',
          };

          const messagePayload = {
            title,
            subject: this.templateEngine.render(template.subject, context),
            message,
            smsBody: this.templateEngine.render(template.smsBody, context),
            whatsAppTemplateName: template.whatsAppTemplateName || undefined,
            whatsAppBody: this.templateEngine.render(template.whatsAppBody, context),
            emailHtml: this.templateEngine.render(template.emailHtml, context),
          };

          for (const ch of channels) {
            if (ch !== CommunicationChannel.IN_APP) {
              await this.dispatcher.dispatchChannel(ch, recipientInfo, messagePayload);
            }
          }
        }
      }

      // 2. In-App Notification for Assigned Counselor
      if (payload.counselorUserId) {
        await this.createNotification({
          userId: payload.counselorUserId,
          receiverId: payload.counselorUserId,
          title: `Student Update: ${eventCode.replace(/_/g, ' ')}`,
          message: `Student ${payload.studentName || 'Applicant'} (${payload.applicationNumber || ''}) — ${eventCode.replace(/_/g, ' ')}.`,
          type: NotificationType.COUNSELOR,
          priority: NotificationPriority.MEDIUM,
          category: 'COUNSELOR',
          actionUrl: `/counseling?applicationId=${payload.applicationId}`,
          relatedApplicationId: payload.applicationId,
        });
      }

      // 3. In-App Notification for Role (e.g. Finance, Admin)
      if (payload.adminRole) {
        await this.createNotification({
          receiverRole: payload.adminRole,
          title: `System Alert: ${eventCode.replace(/_/g, ' ')}`,
          message: `Application ${payload.applicationNumber || ''} triggered ${eventCode}.`,
          type: NotificationType.SYSTEM,
          priority: NotificationPriority.MEDIUM,
          category: 'SYSTEM',
          relatedApplicationId: payload.applicationId,
        });
      }

      return { success: true, eventCode };
    } catch (err: any) {
      this.logger.error(`Failed to emit event notification ${eventCode}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
