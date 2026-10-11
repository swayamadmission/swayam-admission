import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentVaultStorageService } from './document-vault-storage.service';
import { DocumentAuditService } from './document-audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationDispatcher } from '../notifications/notification-channels.service';
import { ConsentService } from '../legal/consent.service';
import { DocumentStatus, NotificationType, NotificationPriority, CommunicationChannel } from '@prisma/client';

export interface CreateDeletionRequestDto {
  applicationId?: string;
  documentIds: string[];
  reason: string;
  additionalDetails?: string;
  studentConfirmed?: boolean;
  confirmation?: boolean;
  acceptedPolicies?: any[];
}

export interface ReviewDeletionDto {
  action: 'APPROVE' | 'REJECT' | 'HOLD';
  notes?: string;
  rejectionReason?: string;
  holdReason?: string;
}

export interface CleanupResultSummary {
  totalEvaluated: number;
  eligible: number;
  deleted: number;
  skippedByHold: number;
  failed: number;
  notificationsQueued: number;
}

@Injectable()
export class DocumentRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentRetentionService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Default retention configurations (in days)
  public static readonly POST_ADMISSION_RETENTION_DAYS = 90;
  public static readonly STUDENT_DELETION_DAYS = 45;

  constructor(
    private prisma: PrismaService,
    private vaultStorage: DocumentVaultStorageService,
    private auditService: DocumentAuditService,
    private notifications: NotificationsService,
    private dispatcher: NotificationDispatcher,
    @Optional()
    private consentService?: ConsentService,
  ) {}

  onModuleInit() {
    // Run cleanup once every 24 hours (86,400,000 ms)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    this.cleanupInterval = setInterval(() => {
      this.executeScheduledDeletions().catch((err) => {
        this.logger.error(`Daily retention cleanup cron error: ${err.message}`);
      });
    }, TWENTY_FOUR_HOURS);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private formatDateDDMMYYYY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Dispatches independent multi-channel notifications and records delivery audit
   */
  async dispatchMultiChannelNotification(params: {
    studentId: string;
    requestId?: string;
    documentId?: string;
    eventType: string;
    title: string;
    message: string;
    channels?: string[];
  }): Promise<number> {
    const student = await this.prisma.user.findUnique({
      where: { id: params.studentId },
      select: { id: true, fullName: true, email: true, mobile: true },
    });
    if (!student) return 0;

    const requestedChannels = params.channels && params.channels.length > 0 && !params.channels.includes('ALL')
      ? params.channels
      : ['IN_APP', 'EMAIL', 'WHATSAPP', 'SMS'];

    let queuedCount = 0;

    // 1. IN_APP / WEBSITE (Mandatory & Authoritative)
    if (requestedChannels.includes('IN_APP') || requestedChannels.includes('WEBSITE')) {
      try {
        const notif = await this.notifications.createNotification({
          userId: student.id,
          receiverId: student.id,
          type: NotificationType.APPLICATION,
          title: params.title,
          message: params.message,
          shortMessage: params.message.slice(0, 100),
          category: 'DOCUMENT_VAULT',
          priority: NotificationPriority.HIGH,
          metadata: { requestId: params.requestId, documentId: params.documentId },
        });

        await this.prisma.notificationDelivery.create({
          data: {
            studentId: student.id,
            requestId: params.requestId,
            documentId: params.documentId,
            eventType: params.eventType,
            channel: 'IN_APP',
            recipient: student.id,
            status: 'DELIVERED',
            provider: 'SYSTEM_DATABASE',
            providerMessageId: notif.id,
          },
        });
        queuedCount++;
      } catch (err: any) {
        this.logger.error(`InApp dispatch error: ${err.message}`);
      }
    }

    // 2. EMAIL (Independent)
    if (requestedChannels.includes('EMAIL')) {
      try {
        if (student.email) {
          const emailRes = await this.dispatcher.dispatchChannel(
            CommunicationChannel.EMAIL,
            { id: student.id, name: student.fullName || 'Student', email: student.email, type: 'STUDENT' },
            { title: params.title, subject: params.title, message: params.message },
            { requestId: params.requestId },
          );

          await this.prisma.notificationDelivery.create({
            data: {
              studentId: student.id,
              requestId: params.requestId,
              documentId: params.documentId,
              eventType: params.eventType,
              channel: 'EMAIL',
              recipient: student.email,
              status: emailRes.success ? 'SENT' : 'FAILED',
              provider: 'SMTP',
              providerMessageId: emailRes.providerMessageId,
              failureReason: emailRes.errorMessage || emailRes.failureReason,
            },
          });
          queuedCount++;
        } else {
          await this.prisma.notificationDelivery.create({
            data: {
              studentId: student.id,
              requestId: params.requestId,
              documentId: params.documentId,
              eventType: params.eventType,
              channel: 'EMAIL',
              recipient: 'NO_EMAIL',
              status: 'SKIPPED',
              failureReason: 'Student account has no registered email',
            },
          });
        }
      } catch (err: any) {
        this.logger.error(`Email dispatch error: ${err.message}`);
      }
    }

    // 3. WHATSAPP (Independent)
    if (requestedChannels.includes('WHATSAPP')) {
      try {
        if (student.mobile) {
          const waRes = await this.dispatcher.dispatchChannel(
            CommunicationChannel.WHATSAPP,
            { id: student.id, name: student.fullName || 'Student', mobile: student.mobile, type: 'STUDENT' },
            { title: params.title, message: params.message },
            { requestId: params.requestId },
          );

          await this.prisma.notificationDelivery.create({
            data: {
              studentId: student.id,
              requestId: params.requestId,
              documentId: params.documentId,
              eventType: params.eventType,
              channel: 'WHATSAPP',
              recipient: student.mobile,
              status: waRes.success ? 'SENT' : 'FAILED',
              provider: 'WHATSAPP_BUSINESS',
              providerMessageId: waRes.providerMessageId,
              failureReason: waRes.errorMessage || waRes.failureReason,
            },
          });
          queuedCount++;
        } else {
          await this.prisma.notificationDelivery.create({
            data: {
              studentId: student.id,
              requestId: params.requestId,
              documentId: params.documentId,
              eventType: params.eventType,
              channel: 'WHATSAPP',
              recipient: 'NO_MOBILE',
              status: 'SKIPPED',
              failureReason: 'Student account has no registered mobile',
            },
          });
        }
      } catch (err: any) {
        this.logger.error(`WhatsApp dispatch error: ${err.message}`);
      }
    }

    // 4. SMS (Independent)
    if (requestedChannels.includes('SMS')) {
      try {
        if (student.mobile) {
          const smsRes = await this.dispatcher.dispatchChannel(
            CommunicationChannel.SMS,
            { id: student.id, name: student.fullName || 'Student', mobile: student.mobile, type: 'STUDENT' },
            { title: params.title, message: params.message },
            { requestId: params.requestId },
          );

          await this.prisma.notificationDelivery.create({
            data: {
              studentId: student.id,
              requestId: params.requestId,
              documentId: params.documentId,
              eventType: params.eventType,
              channel: 'SMS',
              recipient: student.mobile,
              status: smsRes.success ? 'SENT' : 'FAILED',
              provider: 'SMS_GATEWAY',
              providerMessageId: smsRes.providerMessageId,
              failureReason: smsRes.errorMessage || smsRes.failureReason,
            },
          });
          queuedCount++;
        } else {
          await this.prisma.notificationDelivery.create({
            data: {
              studentId: student.id,
              requestId: params.requestId,
              documentId: params.documentId,
              eventType: params.eventType,
              channel: 'SMS',
              recipient: 'NO_MOBILE',
              status: 'SKIPPED',
              failureReason: 'Student account has no registered mobile',
            },
          });
        }
      } catch (err: any) {
        this.logger.error(`SMS dispatch error: ${err.message}`);
      }
    }

    return queuedCount;
  }

  /**
   * Student submits a 45-Day Deletion Request
   */
  async submitDeletionRequest(
    userId: string,
    dto: CreateDeletionRequestDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Authoritative Action-Based Consent validation via Legal & Policies system
    let deletionPolicies = dto.acceptedPolicies;
    if (this.consentService) {
      if (!deletionPolicies || deletionPolicies.length === 0) {
        const delReqs = await this.consentService.getActionRequirements('DOCUMENT_DELETION_REQUEST');
        deletionPolicies = delReqs.policies.map((p) => ({
          policyId: p.id,
          policyType: p.policyType,
          policyVersion: p.version,
        }));
      }

      const delConsentValidation = await this.consentService.validateActionConsent(
        'DOCUMENT_DELETION_REQUEST',
        deletionPolicies,
      );
      if (!delConsentValidation.isValid) {
        throw new BadRequestException({
          code: 'DELETION_CONSENT_REQUIRED',
          message: `Document deletion request requires acknowledging mandatory terms: ${delConsentValidation.missingPolicies.join(', ')}`,
          missing: delConsentValidation.missingPolicies,
        });
      }
    }

    if (!dto.documentIds || dto.documentIds.length === 0) {
      throw new BadRequestException('At least one document must be selected for deletion.');
    }

    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException('Reason for deletion is required.');
    }

    // Authenticate and load student
    const student = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!student) {
      throw new NotFoundException('Student user not found.');
    }

    // Validate that all documents belong to this student and are not already deleted
    const documents = await this.prisma.document.findMany({
      where: {
        id: { in: dto.documentIds },
        userId,
        deletedAt: null,
      },
    });

    if (documents.length !== dto.documentIds.length) {
      await this.auditService.logAccess({
        documentId: dto.documentIds[0],
        studentId: userId,
        actorUserId: userId,
        actorRole: student.role,
        action: 'ACCESS_DENIED',
        result: 'DENIED',
        ipAddress,
        userAgent,
        reason: 'Attempted to request deletion for documents outside user ownership.',
      });
      throw new ForbiddenException(
        'One or more selected documents do not exist or do not belong to you.',
      );
    }

    // Duplicate Deletion Request Protection:
    // Check if any of the selected documents already belong to an active deletion request
    const existingActiveItems = await this.prisma.documentDeletionRequestItem.findMany({
      where: {
        documentId: { in: dto.documentIds },
        request: {
          status: { in: ['PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'SCHEDULED_FOR_DELETION', 'ON_HOLD'] },
        },
      },
      include: { request: true },
    });

    if (existingActiveItems.length > 0) {
      const activeReq = existingActiveItems[0].request;
      throw new BadRequestException(
        `A deletion request is already active for one or more selected documents. (Request ID: ${activeReq.requestId}, Status: ${activeReq.status})`,
      );
    }

    // Calculate dates server-side (Strictly 45 calendar days)
    const requestedAt = new Date();
    const scheduledDeletionAt = new Date(
      requestedAt.getTime() + DocumentRetentionService.STUDENT_DELETION_DAYS * 24 * 60 * 60 * 1000,
    );

    // Format human-friendly Request ID: DR-XXXXXX
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const requestId = `DR-${randomCode}`;

    // Create deletion request and request items in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.documentDeletionRequest.create({
        data: {
          requestId,
          studentId: userId,
          applicationId: dto.applicationId || null,
          reason: dto.reason.trim(),
          additionalDetails: dto.additionalDetails ? dto.additionalDetails.trim() : null,
          status: 'PENDING_REVIEW',
          requestedAt,
          scheduledDeletionAt,
          studentConfirmed: true,
          confirmationText: null,
          items: {
            create: documents.map((doc) => ({
              documentId: doc.id,
              documentType: doc.type,
              documentName: doc.title || doc.fileName,
              status: 'PENDING',
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Update documents status and deletion eligibility date
      for (const doc of documents) {
        await tx.document.update({
          where: { id: doc.id },
          data: {
            status: DocumentStatus.DELETION_REQUESTED,
            deletionEligibleAt: scheduledDeletionAt,
          },
        });
      }

      return request;
    });

    if (this.consentService && deletionPolicies && deletionPolicies.length > 0) {
      await this.consentService.recordConsent(
        userId,
        {
          actionContext: 'DOCUMENT_DELETION_REQUEST',
          deletionRequestId: result.id,
          applicationId: result.applicationId || undefined,
          acceptedPolicies: deletionPolicies,
        },
        { ipAddress, userAgent },
      );
    }

    // Audit logs for each document
    for (const doc of documents) {
      await this.auditService.logAccess({
        documentId: doc.id,
        studentId: userId,
        applicationId: dto.applicationId,
        actorUserId: userId,
        actorRole: student.role,
        action: 'DELETE_REQUEST',
        result: 'SUCCESS',
        ipAddress,
        userAgent,
        reason: dto.reason,
        metadata: {
          requestId: result.requestId,
          scheduledDeletionAt: scheduledDeletionAt.toISOString(),
        },
      });
    }

    // Multi-channel notification to student
    const canonicalStudentId = student.studentId || (student as any).registrationNumber || 'SWY-STU-PENDING';
    const formattedDate = this.formatDateDDMMYYYY(scheduledDeletionAt);
    await this.dispatchMultiChannelNotification({
      studentId: userId,
      requestId: result.requestId,
      eventType: 'DOCUMENT_DELETION_REQUESTED',
      title: 'Document Deletion Request Submitted',
      message: `Your request to delete the selected document(s) has been submitted successfully.\n\nRequest ID: ${requestId}\nScheduled Review/Deletion: ${formattedDate}`,
    }).catch(() => {});

    return {
      success: true,
      id: result.id,
      requestId: result.requestId,
      officialStudentId: canonicalStudentId,
      studentId: canonicalStudentId,
      student: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        mobile: student.mobile,
        studentId: canonicalStudentId,
        officialStudentId: canonicalStudentId,
      },
      data: {
        ...result,
        officialStudentId: canonicalStudentId,
      },
      scheduledDeletionAt,
      requestedAt,
      itemsCount: documents.length,
      status: result.status,
      message: `Your deletion request (${requestId}) has been submitted. Scheduled deletion date: ${formattedDate}.`,
    };
  }

  /**
   * Get student's deletion requests with canonical officialStudentId
   */
  async getMyDeletionRequests(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        studentId: true,
        registrationNumber: true,
      },
    });
    const canonicalStudentId = user?.studentId || user?.registrationNumber || 'SWY-STU-PENDING';

    const requests = await this.prisma.documentDeletionRequest.findMany({
      where: { studentId: userId },
      include: {
        items: {
          include: {
            document: {
              select: {
                id: true,
                type: true,
                title: true,
                fileName: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return requests.map((req) => ({
      ...req,
      officialStudentId: canonicalStudentId,
      student: user
        ? {
            id: user.id,
            name: user.fullName,
            fullName: user.fullName,
            email: user.email,
            mobile: user.mobile,
            studentId: canonicalStudentId,
            officialStudentId: canonicalStudentId,
            officialId: canonicalStudentId,
          }
        : null,
    }));
  }

  /**
   * Student cancels an active deletion request before permanent deletion
   */
  async cancelDeletionRequest(
    requestId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const request = await this.prisma.documentDeletionRequest.findFirst({
      where: {
        OR: [{ id: requestId }, { requestId }],
        studentId: userId,
      },
      include: { items: true },
    });

    if (!request) {
      throw new NotFoundException('Deletion request not found.');
    }

    if (request.status === 'DELETED') {
      throw new BadRequestException('Cannot cancel a request that has already been executed.');
    }

    if (request.status === 'CANCELLED') {
      return { success: true, message: 'Request is already cancelled.' };
    }

    await this.prisma.$transaction(async (tx) => {
      // Update request status
      await tx.documentDeletionRequest.update({
        where: { id: request.id },
        data: { status: 'CANCELLED' },
      });

      // Update items
      await tx.documentDeletionRequestItem.updateMany({
        where: { requestId: request.id },
        data: { status: 'CANCELLED' },
      });

      // Restore document status
      for (const item of request.items) {
        if (item.documentId) {
          await tx.document.update({
            where: { id: item.documentId },
            data: {
              status: DocumentStatus.UPLOADED,
              deletionEligibleAt: null,
            },
          });
        }
      }
    });

    for (const item of request.items) {
      if (item.documentId) {
        await this.auditService.logAccess({
          documentId: item.documentId,
          studentId: userId,
          actorUserId: userId,
          actorRole: 'STUDENT',
          action: 'DELETE_CANCELLED',
          result: 'SUCCESS',
          ipAddress,
          userAgent,
          reason: 'Cancelled by student',
          metadata: { requestId: request.requestId },
        });
      }
    }

    await this.dispatchMultiChannelNotification({
      studentId: userId,
      requestId: request.requestId,
      eventType: 'DELETION_CANCELLED',
      title: 'Deletion Request Cancelled',
      message: `Your document deletion request (${request.requestId}) has been cancelled. Your documents will remain safe in your vault.`,
    }).catch(() => {});

    return { success: true, message: 'Deletion request cancelled successfully.' };
  }

  /**
   * Admin lists all Deletion Requests
   */
  async getAdminDeletionRequests(query: {
    status?: string;
    studentId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.studentId) {
      where.studentId = query.studentId;
    }

    const [requests, total] = await Promise.all([
      this.prisma.documentDeletionRequest.findMany({
        where,
        include: {
          items: {
            include: {
              document: {
                select: {
                  id: true,
                  type: true,
                  title: true,
                  fileName: true,
                  status: true,
                  fileSize: true,
                  mimeType: true,
                },
              },
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.documentDeletionRequest.count({ where }),
    ]);

    // Enhance with student profile details
    const studentIds = [...new Set(requests.map((r) => r.studentId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        studentId: true,
        employeeId: true,
        registrationNumber: true,
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = requests.map((req) => {
      const u = userMap.get(req.studentId);
      const canonicalStudentId = u?.studentId || u?.registrationNumber || 'SWY-STU-PENDING';
      return {
        ...req,
        officialStudentId: canonicalStudentId,
        student: u
          ? {
              id: u.id,
              name: u.fullName,
              fullName: u.fullName,
              email: u.email,
              mobile: u.mobile,
              studentId: canonicalStudentId,
              officialStudentId: canonicalStudentId,
              officialId: canonicalStudentId,
            }
          : null,
      };
    });

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin reviews a Deletion Request (Approve, Reject, or Hold)
   */
  async reviewDeletionRequest(
    requestId: string,
    reviewerId: string,
    dto: ReviewDeletionDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const request = await this.prisma.documentDeletionRequest.findFirst({
      where: { OR: [{ id: requestId }, { requestId }] },
      include: { items: true },
    });

    if (!request) {
      throw new NotFoundException('Deletion request not found.');
    }

    const reviewer = await this.prisma.user.findUnique({ where: { id: reviewerId } });
    const actorRole = reviewer?.role || 'ADMIN';
    const staffId = reviewer?.employeeId || reviewerId;

    if (dto.action === 'APPROVE') {
      await this.prisma.$transaction(async (tx) => {
        await tx.documentDeletionRequest.update({
          where: { id: request.id },
          data: {
            status: 'SCHEDULED_FOR_DELETION',
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            reviewNotes: dto.notes || 'Approved by admin',
          },
        });

        await tx.documentDeletionRequestItem.updateMany({
          where: { requestId: request.id },
          data: { status: 'SCHEDULED' },
        });

        for (const item of request.items) {
          if (item.documentId) {
            await tx.document.update({
              where: { id: item.documentId },
              data: { status: DocumentStatus.DELETION_REQUESTED },
            });
          }
        }
      });

      for (const item of request.items) {
        if (item.documentId) {
          await this.auditService.logAccess({
            documentId: item.documentId,
            studentId: request.studentId,
            actorUserId: reviewerId,
            actorRole,
            staffId,
            action: 'DELETE_APPROVED',
            result: 'SUCCESS',
            ipAddress,
            userAgent,
            reason: dto.notes,
            metadata: { requestId: request.requestId },
          });
        }
      }

      const formattedSched = this.formatDateDDMMYYYY(request.scheduledDeletionAt);
      await this.dispatchMultiChannelNotification({
        studentId: request.studentId,
        requestId: request.requestId,
        eventType: 'DOCUMENT_DELETION_SCHEDULED',
        title: 'Document Deletion Scheduled',
        message: `Your request to delete the selected document(s) has been approved and is scheduled for permanent deletion.\n\nRequest ID: ${request.requestId}\nScheduled Deletion: ${formattedSched}`,
      }).catch(() => {});

      return { success: true, status: 'SCHEDULED_FOR_DELETION', message: 'Request approved.' };
    }

    if (dto.action === 'REJECT') {
      if (!dto.rejectionReason) {
        throw new BadRequestException('Rejection reason is required.');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.documentDeletionRequest.update({
          where: { id: request.id },
          data: {
            status: 'REJECTED',
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            rejectionReason: dto.rejectionReason,
            reviewNotes: dto.notes,
          },
        });

        await tx.documentDeletionRequestItem.updateMany({
          where: { requestId: request.id },
          data: { status: 'REJECTED' },
        });

        // Restore document statuses
        for (const item of request.items) {
          if (item.documentId) {
            await tx.document.update({
              where: { id: item.documentId },
              data: {
                status: DocumentStatus.UPLOADED,
                deletionEligibleAt: null,
              },
            });
          }
        }
      });

      for (const item of request.items) {
        if (item.documentId) {
          await this.auditService.logAccess({
            documentId: item.documentId,
            studentId: request.studentId,
            actorUserId: reviewerId,
            actorRole,
            staffId,
            action: 'DELETE_REJECTED',
            result: 'SUCCESS',
            ipAddress,
            userAgent,
            reason: dto.rejectionReason,
            metadata: { requestId: request.requestId },
          });
        }
      }

      await this.dispatchMultiChannelNotification({
        studentId: request.studentId,
        requestId: request.requestId,
        eventType: 'DOCUMENT_DELETION_REQUEST_REJECTED',
        title: 'Document Deletion Request Rejected',
        message: `Your deletion request (${request.requestId}) could not be approved.\n\nRequest ID: ${request.requestId}\nReason: ${dto.rejectionReason}`,
      }).catch(() => {});

      return { success: true, status: 'REJECTED', message: 'Request rejected.' };
    }

    if (dto.action === 'HOLD') {
      const reason = dto.holdReason || dto.notes || 'Legal/verification hold';

      await this.prisma.$transaction(async (tx) => {
        await tx.documentDeletionRequest.update({
          where: { id: request.id },
          data: {
            status: 'ON_HOLD',
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            reviewNotes: reason,
          },
        });

        for (const item of request.items) {
          if (item.documentId) {
            await tx.document.update({
              where: { id: item.documentId },
              data: { status: DocumentStatus.RETENTION_HOLD },
            });

            // Create retention hold
            await tx.retentionHold.create({
              data: {
                documentId: item.documentId,
                studentId: request.studentId,
                reason,
                status: 'ACTIVE',
                createdBy: reviewerId,
              },
            });
          }
        }
      });

      for (const item of request.items) {
        if (item.documentId) {
          await this.auditService.logAccess({
            documentId: item.documentId,
            studentId: request.studentId,
            actorUserId: reviewerId,
            actorRole,
            staffId,
            action: 'DELETE_HOLD',
            result: 'SUCCESS',
            ipAddress,
            userAgent,
            reason,
            metadata: { requestId: request.requestId },
          });
        }
      }

      await this.dispatchMultiChannelNotification({
        studentId: request.studentId,
        requestId: request.requestId,
        eventType: 'DOCUMENT_DELETION_ON_HOLD',
        title: 'Document Deletion On Hold',
        message: `Your deletion request (${request.requestId}) has been placed on hold pending verification.\n\nRequest ID: ${request.requestId}\nReason: ${reason}`,
      }).catch(() => {});

      return { success: true, status: 'ON_HOLD', message: 'Request placed on retention hold.' };
    }

    throw new BadRequestException('Invalid action. Must be APPROVE, REJECT, or HOLD.');
  }

  /**
   * Admin manually resends deletion confirmation notification for an executed deletion
   */
  async resendDeletionNotification(
    requestId: string,
    reviewerId: string,
    channels?: string[],
    ipAddress?: string,
    userAgent?: string,
  ) {
    const request = await this.prisma.documentDeletionRequest.findFirst({
      where: { OR: [{ id: requestId }, { requestId }] },
      include: { items: true },
    });

    if (!request) {
      throw new NotFoundException('Deletion request not found.');
    }

    // Verify deletion has actually been executed
    const hasDeletedItems = request.status === 'DELETED' || request.items.some((i) => i.status === 'DELETED');
    if (!hasDeletedItems) {
      throw new BadRequestException(
        'Cannot send deletion confirmation: the selected document(s) have not been permanently deleted from storage.',
      );
    }

    const deletionDate = request.completedAt ? this.formatDateDDMMYYYY(request.completedAt) : this.formatDateDDMMYYYY(new Date());

    const queuedCount = await this.dispatchMultiChannelNotification({
      studentId: request.studentId,
      requestId: request.requestId,
      eventType: 'DOCUMENT_DELETED',
      title: 'Documents Deleted Confirmation',
      message: `Swayam Admission: Your requested student documents have been permanently deleted from your account on ${deletionDate}. Request ID: ${request.requestId}.`,
      channels,
    });

    const reviewer = await this.prisma.user.findUnique({ where: { id: reviewerId } });

    await this.auditService.logAccess({
      studentId: request.studentId,
      actorUserId: reviewerId,
      actorRole: reviewer?.role || 'ADMIN',
      staffId: reviewer?.employeeId || reviewerId,
      action: 'NOTIFICATION_RESENT',
      result: 'SUCCESS',
      ipAddress,
      userAgent,
      reason: 'Manual deletion notification resend by administrator',
      metadata: { requestId: request.requestId, channels, queuedCount },
    });

    return {
      success: true,
      message: `Deletion notification successfully dispatched to ${queuedCount} channel(s).`,
      queuedCount,
    };
  }

  /**
   * Set 90-Day Post-Admission Automatic Retention Deadline
   * Called when an application/admission is confirmed
   */
  async setPostAdmissionRetention(applicationId: string, confirmedAt: Date = new Date()) {
    const retentionUntil = new Date(
      confirmedAt.getTime() + DocumentRetentionService.POST_ADMISSION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    const updated = await this.prisma.document.updateMany({
      where: {
        applicationId,
        deletedAt: null,
      },
      data: {
        retentionUntil,
      },
    });

    this.logger.log(
      `Set 90-day retention deadline (${retentionUntil.toISOString()}) for ${updated.count} documents on Application ${applicationId}`,
    );

    return { retentionUntil, count: updated.count };
  }

  /**
   * Check if any active retention hold exists for a document
   */
  async hasActiveRetentionHold(documentId: string, applicationId?: string | null, studentId?: string | null): Promise<boolean> {
    const holds = await this.prisma.retentionHold.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { documentId },
          ...(applicationId ? [{ applicationId }] : []),
          ...(studentId ? [{ studentId }] : []),
        ],
      },
    });
    return holds > 0;
  }

  /**
   * Automated / Scheduled Deletion Job
   * Idempotent: Can be safely run on a cron or manually triggered without data corruption.
   */
  async executeScheduledDeletions(): Promise<CleanupResultSummary> {
    const now = new Date();
    this.logger.log(`Starting automated document retention cleanup job at ${now.toISOString()}...`);

    // 1. Find all documents eligible for deletion:
    // Case A: 45-day student deletion request due (scheduledDeletionAt <= now)
    // Case B: 90-day post-admission auto-retention deadline passed (retentionUntil <= now)
    // Case C: deletionEligibleAt <= now
    const dueRequests = await this.prisma.documentDeletionRequest.findMany({
      where: {
        status: { in: ['SCHEDULED_FOR_DELETION', 'APPROVED', 'PENDING_REVIEW'] },
        scheduledDeletionAt: { lte: now },
      },
      include: {
        items: true,
      },
    });

    const dueRequestDocIds = dueRequests.flatMap((r) =>
      r.items.map((i) => i.documentId).filter(Boolean) as string[],
    );

    const orConditions: any[] = [
      {
        deletionEligibleAt: { lte: now },
        status: { in: [DocumentStatus.DELETION_REQUESTED, DocumentStatus.UNDER_VERIFICATION, DocumentStatus.UPLOADED, DocumentStatus.VERIFIED] },
      },
      {
        retentionUntil: { lte: now },
      },
    ];

    if (dueRequestDocIds.length > 0) {
      orConditions.push({ id: { in: dueRequestDocIds } });
    }

    const eligibleDocuments = await this.prisma.document.findMany({
      where: {
        deletedAt: null,
        OR: orConditions,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, mobile: true } },
      },
    });

    let processed = 0;
    let deleted = 0;
    let skippedOnHold = 0;
    let failed = 0;
    let notificationsQueued = 0;

    for (const doc of eligibleDocuments) {
      processed++;
      try {
        // 2. Check for active legal/audit/verification retention holds
        const isHoldActive = await this.hasActiveRetentionHold(doc.id, doc.applicationId, doc.userId);
        if (isHoldActive) {
          skippedOnHold++;
          this.logger.warn(`Skipping deletion for document ${doc.id}: Active Retention Hold detected.`);

          if (doc.status !== DocumentStatus.RETENTION_HOLD) {
            await this.prisma.document.update({
              where: { id: doc.id },
              data: { status: DocumentStatus.RETENTION_HOLD },
            });
          }

          await this.auditService.logAccess({
            documentId: doc.id,
            studentId: doc.userId,
            applicationId: doc.applicationId,
            actorUserId: 'SYSTEM_RETENTION_JOB',
            actorRole: 'SYSTEM',
            action: 'DELETION_SKIPPED_HOLD',
            result: 'DENIED',
            reason: 'Active legal or administrative retention hold prevented automatic deletion.',
          });
          continue;
        }

        // 3. Physically delete the object from private vault storage
        let storageDeleted = true;
        if (doc.fileUrl) {
          try {
            await this.vaultStorage.deleteDocument(doc.fileUrl);
          } catch (storageErr: any) {
            storageDeleted = false;
            this.logger.error(`Storage deletion failed for ${doc.id}: ${storageErr.message}`);
          }
        }

        if (!storageDeleted) {
          failed++;
          await this.auditService.logAccess({
            documentId: doc.id,
            studentId: doc.userId,
            applicationId: doc.applicationId,
            actorUserId: 'SYSTEM_RETENTION_JOB',
            actorRole: 'SYSTEM',
            action: 'DELETE_FAILED',
            result: 'FAILED',
            reason: 'Physical storage unlinking failed. Database record preserved.',
          });
          continue;
        }

        const reason = doc.deletionEligibleAt && doc.deletionEligibleAt <= now
          ? '45-Day Student Deletion Request Fulfilled'
          : '90-Day Post-Admission Retention Deadline Reached';

        // 4. Update document record in DB: mark deleted, clear storage URL
        await this.prisma.$transaction(async (tx) => {
          await tx.document.update({
            where: { id: doc.id },
            data: {
              status: DocumentStatus.DELETED,
              deletedAt: new Date(),
              deletedReason: reason,
              fileUrl: '', // Clear storage URL reference
            },
          });

          // Update any matching deletion request items
          await tx.documentDeletionRequestItem.updateMany({
            where: { documentId: doc.id },
            data: { status: 'DELETED' },
          });
        });

        // 5. Check if any deletion requests are now fully deleted
        const pendingRequests = await this.prisma.documentDeletionRequest.findMany({
          where: {
            items: { some: { documentId: doc.id } },
            status: { not: 'DELETED' },
          },
          include: { items: true },
        });

        let completedRequestId: string | undefined;
        for (const req of pendingRequests) {
          const allItemsDeleted = req.items.every(
            (i) => i.status === 'DELETED' || i.status === 'CANCELLED',
          );
          if (allItemsDeleted) {
            await this.prisma.documentDeletionRequest.update({
              where: { id: req.id },
              data: {
                status: 'DELETED',
                completedAt: new Date(),
              },
            });
            completedRequestId = req.requestId;
          }
        }

        // 6. Record immutable deletion audit log
        await this.auditService.logAccess({
          documentId: doc.id,
          studentId: doc.userId,
          applicationId: doc.applicationId,
          actorUserId: 'SYSTEM_RETENTION_JOB',
          actorRole: 'SYSTEM',
          action: 'DELETE_EXECUTED',
          result: 'SUCCESS',
          reason,
          metadata: {
            type: doc.type,
            title: doc.title || doc.fileName,
          },
        });

        // 7. Multi-channel post-deletion notification to student
        if (doc.userId) {
          const delDate = this.formatDateDDMMYYYY(new Date());
          const queued = await this.dispatchMultiChannelNotification({
            studentId: doc.userId,
            requestId: completedRequestId,
            documentId: doc.id,
            eventType: 'DOCUMENTS_DELETED',
            title: 'Documents Deleted',
            message: `The requested document(s) have been permanently deleted from your Swayam Admission account according to the applicable deletion/retention policy.\n\nRequest ID: ${completedRequestId || 'DR-PROCESSED'}\nDeletion Date: ${delDate}`,
          });
          notificationsQueued += queued;
        }

        deleted++;
      } catch (err: any) {
        failed++;
        this.logger.error(`Error processing deletion for document ${doc.id}: ${err.message}`, err.stack);
      }
    }

    this.logger.log(
      `Document retention cleanup completed. Total: ${processed}, Eligible: ${eligibleDocuments.length}, Deleted: ${deleted}, Holds: ${skippedOnHold}, Failed: ${failed}`,
    );

    return {
      totalEvaluated: processed,
      eligible: eligibleDocuments.length,
      deleted,
      skippedByHold: skippedOnHold,
      failed,
      notificationsQueued,
    };
  }

  /**
   * Admin lists notification delivery logs
   */
  async getNotificationDeliveryLogs(query: {
    studentId?: string;
    requestId?: string;
    channel?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.requestId) where.requestId = query.requestId;
    if (query.channel && query.channel !== 'ALL') where.channel = query.channel;
    if (query.status && query.status !== 'ALL') where.status = query.status;

    const [logs, total] = await Promise.all([
      this.prisma.notificationDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notificationDelivery.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
