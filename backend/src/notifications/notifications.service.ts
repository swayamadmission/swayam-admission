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
  CommunicationDeliveryStatus,
} from '@prisma/client';

import { LiveSyncService } from '../events/live-sync.service';

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

export interface RecruitmentEventPayload {
  candidateUserId?: string;
  candidateName: string;
  candidateEmail?: string;
  candidateMobile?: string;
  applicationId: string;
  vacancyId?: string;
  vacancyTitle: string;
  offerId?: string;
  joiningDate?: string;
  department?: string;
  designation?: string;
  salary?: string;
  companyName?: string;
  recruiterId?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  reason?: string;
  employeeId?: string;
  actorUserId?: string;
  actionUrl?: string;
  notifyHr?: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: NotificationDispatcher,
    private readonly templateEngine: TemplateEngineService,
    private readonly liveSync: LiveSyncService,
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
   * Get User Specific Notifications (Newest first, template resolved)
   */
  async getMyNotifications(userId: string, role?: Role) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        studentId: true,
        registrationNumber: true,
      },
    });

    const notifications = await this.prisma.notification.findMany({
      where: {
        isDeleted: false,
        OR: [
          { userId },
          { receiverId: userId },
          ...(role ? [{ receiverRole: role }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, fullName: true, email: true, studentId: true } },
      },
    });

    const data = (notifications || []).map((n) =>
      this.templateEngine.interpolateNotification(n, user),
    );

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
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true, studentId: true },
          },
        },
      }),
    ]);

    const interpolatedData = (data || []).map((n) =>
      this.templateEngine.interpolateNotification(n, n.user),
    );

    return {
      data: interpolatedData,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get unread counter & recent notifications for logged in user or role
   */
  async getUnreadCount(userId?: string, role?: Role) {
    if (!userId && !role) {
      return { count: 0, recent: [] };
    }

    const user = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, fullName: true, email: true, studentId: true, registrationNumber: true },
        })
      : null;

    const countWhere: any = {
      isRead: false,
      isDeleted: false,
      OR: [{ userId }, { receiverId: userId }, ...(role ? [{ receiverRole: role }] : [])],
    };

    const count = await this.prisma.notification.count({ where: countWhere });

    const recentWhere: any = {
      isDeleted: false,
      OR: [{ userId }, { receiverId: userId }, ...(role ? [{ receiverRole: role }] : [])],
    };

    const recent = await this.prisma.notification.findMany({
      where: recentWhere,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true, studentId: true } },
      },
    });

    const interpolatedRecent = (recent || []).map((n) =>
      this.templateEngine.interpolateNotification(n, user || n.user),
    );

    return { count, recent: interpolatedRecent };
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
    const created = await this.prisma.notification.create({
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
        color: dto.color || '#4A7B5B',
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

    const targetUser = created.receiverId || created.userId || undefined;
    this.liveSync.publishEvent('notification.created', created, targetUser);

    return created;
  }

  /**
   * Mark Single Notification as Read
   */
  async markAsRead(id: string) {
    await this.findOne(id);
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    const targetUser = updated.receiverId || updated.userId || undefined;
    this.liveSync.publishEvent('notification.read', { id, isRead: true }, targetUser);

    return updated;
  }

  /**
   * Mark All Notifications as Read for User/Role
   */
  async markAllAsRead(userId?: string, role?: Role) {
    if (!userId && !role) {
      return { message: 'No user or role provided' };
    }

    const where: any = {
      isRead: false,
      OR: [{ userId }, { receiverId: userId }, ...(role ? [{ receiverRole: role }] : [])],
    };

    await this.prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });

    this.liveSync.publishEvent('notification.readAll', { userId, role }, userId || undefined);

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

  /**
   * Central Recruitment Event Notification Handler:
   * Delivers In-App, Email, and WhatsApp notifications for the complete recruitment lifecycle.
   * Persists delivery traces in CommunicationDelivery and never fails silently.
   */
  async emitRecruitmentEvent(eventCode: string, payload: RecruitmentEventPayload) {
    try {
      this.logger.log(
        `[RECRUITMENT EVENT] ${eventCode} for Application: ${payload.applicationId} | Candidate: ${payload.candidateName}`,
      );

      const template = await this.prisma.communicationTemplate.findUnique({
        where: { code: eventCode },
      });

      const context = {
        candidateName: payload.candidateName || 'Candidate',
        applicationId: payload.applicationId || 'N/A',
        vacancyTitle: payload.vacancyTitle || 'Position',
        offerId: payload.offerId || '',
        joiningDate: payload.joiningDate || 'Scheduled joining date',
        department: payload.department || 'Admissions',
        designation: payload.designation || 'Specialist',
        salary: payload.salary || '',
        companyName: payload.companyName || 'Swayam Admission',
        recruiterName: payload.recruiterName || 'HR Recruitment Team',
        reason: payload.reason || '',
        employeeId: payload.employeeId || '',
        actionUrl: payload.actionUrl || '/admin/hr',
        currentYear: '2026',
        ...(payload.metadata || {}),
      };

      const title = template?.inAppTitle
        ? this.templateEngine.render(template.inAppTitle, context)
        : `Recruitment Update: ${eventCode.replace(/_/g, ' ')}`;

      const message = template?.inAppMessage
        ? this.templateEngine.render(template.inAppMessage, context)
        : `Your application status has updated to ${eventCode}.`;

      // 1. Candidate In-App Notification (if user account exists)
      if (payload.candidateUserId) {
        await this.createNotification({
          userId: payload.candidateUserId,
          receiverId: payload.candidateUserId,
          title,
          message,
          type: NotificationType.APPLICATION,
          priority: NotificationPriority.HIGH,
          category: 'RECRUITMENT',
          actionUrl: payload.actionUrl || '/careers',
          relatedApplicationId: payload.applicationId,
          metadata: {
            eventCode,
            offerId: payload.offerId,
            employeeId: payload.employeeId,
            vacancyId: payload.vacancyId,
          },
        });
      }

      // 2. Candidate External Multi-Channel Dispatch (Email, WhatsApp)
      if (template) {
        const channels = template.channels;
        const candidateRecipient = {
          id: payload.candidateUserId || payload.applicationId,
          name: payload.candidateName,
          email: payload.candidateEmail,
          mobile: payload.candidateMobile,
          type: 'CANDIDATE',
        };

        const messagePayload = {
          title,
          subject: this.templateEngine.render(template.subject, context),
          message,
          smsBody: this.templateEngine.render(template.smsBody, context),
          whatsAppTemplateName: template.whatsAppTemplateName || undefined,
          whatsAppBody: this.templateEngine.render(template.whatsAppBody, context),
          emailHtml: this.templateEngine.render(template.emailHtml, context),
          actionUrl: payload.actionUrl,
        };

        for (const ch of channels) {
          if (ch !== CommunicationChannel.IN_APP) {
            try {
              const sendResult = await this.dispatcher.dispatchChannel(
                ch,
                candidateRecipient,
                messagePayload,
                { eventCode, applicationId: payload.applicationId, offerId: payload.offerId },
              );

              // Persist delivery audit trace in database
              await this.prisma.communicationDelivery.create({
                data: {
                  channel: ch,
                  recipientType: 'CANDIDATE',
                  recipientId: payload.candidateUserId || null,
                  recipientName: payload.candidateName,
                  recipientEmail: payload.candidateEmail || null,
                  recipientMobile: payload.candidateMobile || null,
                  status: sendResult.status,
                  providerMessageId: sendResult.providerMessageId || null,
                  errorMessage: sendResult.errorMessage || null,
                  failureReason: sendResult.failureReason || null,
                  isRetryable: sendResult.isRetryable !== undefined ? sendResult.isRetryable : true,
                  sentAt: sendResult.success ? new Date() : null,
                  deliveredAt:
                    sendResult.status === CommunicationDeliveryStatus.DELIVERED ? new Date() : null,
                  failedAt: !sendResult.success ? new Date() : null,
                },
              });
            } catch (dispatchErr: any) {
              this.logger.warn(
                `Dispatch failed on ${ch} for ${payload.applicationId}: ${dispatchErr.message}`,
              );
            }
          }
        }
      }

      // 3. HR / Admin Internal Notifications
      const isHrEvent = eventCode.startsWith('RECRUITMENT_HR_') || payload.notifyHr;
      if (isHrEvent) {
        const hrAlertTitle = `HR Alert: ${eventCode.replace('RECRUITMENT_HR_', '').replace(/_/g, ' ')}`;
        const hrAlertMessage = `${payload.candidateName} (${payload.vacancyTitle}) — ${payload.reason || eventCode}`;

        // Alert assigned recruiter
        if (payload.recruiterId) {
          await this.createNotification({
            userId: payload.recruiterId,
            receiverId: payload.recruiterId,
            title: hrAlertTitle,
            message: hrAlertMessage,
            type: NotificationType.APPLICATION,
            priority: NotificationPriority.HIGH,
            category: 'RECRUITMENT',
            actionUrl: `/admin/hr?applicationId=${payload.applicationId}`,
            relatedApplicationId: payload.applicationId,
          });
        }

        // Alert Admin & Super Admin Roles
        await this.createNotification({
          receiverRole: Role.ADMIN,
          title: hrAlertTitle,
          message: hrAlertMessage,
          type: NotificationType.SYSTEM,
          priority: NotificationPriority.MEDIUM,
          category: 'RECRUITMENT',
          actionUrl: `/admin/hr?applicationId=${payload.applicationId}`,
          relatedApplicationId: payload.applicationId,
        });
      }

      return { success: true, eventCode };
    } catch (err: any) {
      this.logger.error(
        `Failed to emit recruitment event notification ${eventCode}: ${err.message}`,
      );
      return { success: false, error: err.message };
    }
  }
}
