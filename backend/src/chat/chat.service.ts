import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LiveSyncGateway } from '../events/live-sync.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { IUser } from '../auth/interfaces/user.interface';
import { SendMessageDto } from './dto/send-message.dto';
import { GetConversationQueryDto } from './dto/get-conversation.dto';
import { SafePublicStaffDto } from './dto/safe-counselor.dto';
import { NotificationPriority, NotificationType } from '@prisma/client';

const STUDENT_CHAT_DISCLAIMER =
  'Important: This chat is only for career and admission guidance. Please do not share passwords, OTPs, bank details, card details, Aadhaar/PAN numbers, or other highly sensitive personal information here. Official payment and application actions must be completed only through the Swayam Admission platform.';

const COUNSELOR_CHAT_DISCLAIMER =
  'This chat is only for career and admission guidance. Do not request or share passwords, OTPs, card information, banking credentials, or unnecessary sensitive personal information.';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly liveSyncGateway: LiveSyncGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper to map any user record to a restricted public staff projection.
   * NEVER leaks email, phone, mobile, address, password or internal secrets.
   */
  private toSafePublicStaff(counselor: any): SafePublicStaffDto {
    return {
      id: counselor.id,
      fullName: counselor.fullName || 'Educational Counselor',
      displayName: counselor.displayName || counselor.fullName || 'Educational Counselor',
      role: 'Senior Educational Counselor',
      designation:
        counselor.designation ||
        counselor.counselorProfile?.designation ||
        'Senior Educational Counselor',
      qualification:
        counselor.qualification ||
        counselor.counselorProfile?.qualification ||
        'Career & Admission Guidance',
      avatar: counselor.avatar || null,
    };
  }

  /**
   * Helper to sanitize plain text and eliminate script/HTML tags
   */
  private sanitizePlainText(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // remove script and contents
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // remove style and contents
      .replace(/<[^>]+>/g, '') // strip all other HTML tags
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  /**
   * 1. GET /v1/chat/assigned-counselor
   * Retrieves the currently assigned counselor for a student (application-specific or profile level).
   * Strips all private staff details.
   */
  async getAssignedCounselor(studentId: string, applicationId?: string) {
    if (!studentId) {
      throw new BadRequestException('Student ID is required');
    }

    let targetApp: any = null;
    let counselor: any = null;

    if (applicationId) {
      targetApp = await this.prisma.application.findFirst({
        where: { id: applicationId, userId: studentId },
        include: {
          college: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
          counselor: {
            select: {
              id: true,
              fullName: true,
              displayName: true,
              designation: true,
              qualification: true,
              avatar: true,
              role: true,
              status: true,
              isActive: true,
            },
          },
        },
      });

      if (targetApp?.counselor) {
        counselor = targetApp.counselor;
      }
    }

    // Fallback: If no application counselor found, check student profile assigned counselor
    if (!counselor) {
      const student = await this.prisma.user.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          assignedCounselorId: true,
          assignedCounselor: {
            select: {
              id: true,
              fullName: true,
              displayName: true,
              designation: true,
              qualification: true,
              avatar: true,
              role: true,
              status: true,
              isActive: true,
            },
          },
          applications: {
            where: { counselorId: { not: null } },
            orderBy: { applicationDate: 'desc' },
            take: 1,
            include: {
              college: { select: { id: true, name: true } },
              course: { select: { id: true, name: true } },
              counselor: {
                select: {
                  id: true,
                  fullName: true,
                  displayName: true,
                  designation: true,
                  qualification: true,
                  avatar: true,
                  role: true,
                  status: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });

      if (student?.assignedCounselor) {
        counselor = student.assignedCounselor;
      } else if (student?.applications && student.applications.length > 0) {
        counselor = student.applications[0].counselor;
        if (!targetApp) targetApp = student.applications[0];
      }
    }

    if (!counselor) {
      return {
        hasCounselor: false,
        counselor: null,
        message: 'Your counselor has not been assigned yet.',
      };
    }

    return {
      hasCounselor: true,
      counselor: this.toSafePublicStaff(counselor),
      application: targetApp
        ? {
            id: targetApp.id,
            applicationNumber: targetApp.applicationNumber || targetApp.applicationId,
            collegeName: targetApp.college?.name || 'Career & Admission Center',
            courseName: targetApp.course?.name || 'Academic Program',
          }
        : null,
    };
  }

  /**
   * 2. GET /v1/chat/conversation
   * Retrieves or lazily creates a real persistent conversation between a student and their assigned counselor.
   * Strictly enforces assignment boundary: students CANNOT chat with random counselors.
   */
  async getOrCreateConversation(user: IUser, query: GetConversationQueryDto) {
    let studentId: string;
    let counselorId: string;
    let applicationId: string | null = query.applicationId || null;

    if (user.role === 'STUDENT') {
      studentId = user.id;

      // Find canonical assignment for this student/application
      const assigned = await this.getAssignedCounselor(studentId, applicationId || undefined);
      if (!assigned.hasCounselor || !assigned.counselor) {
        throw new NotFoundException('Your counselor has not been assigned yet.');
      }

      // If student manually provided a counselorId, it MUST match the assigned counselor (anti-IDOR)
      if (query.counselorId && query.counselorId !== assigned.counselor.id) {
        throw new ForbiddenException('You can only chat with your currently assigned counselor.');
      }

      counselorId = assigned.counselor.id;
      if (assigned.application?.id && !applicationId) {
        applicationId = assigned.application.id;
      }
    } else if (user.role === 'COUNSELOR') {
      counselorId = user.id;

      if (!query.studentId && !applicationId) {
        throw new BadRequestException('Student ID or Application ID is required for counselor chat.');
      }

      if (applicationId) {
        const app = await this.prisma.application.findUnique({
          where: { id: applicationId },
          select: { id: true, userId: true, counselorId: true },
        });
        if (!app) {
          throw new NotFoundException('Application not found');
        }
        if (app.counselorId !== counselorId) {
          throw new ForbiddenException('You are not assigned to this application.');
        }
        studentId = app.userId;
      } else {
        studentId = query.studentId!;
        // Verify student assignment to this counselor
        const student = await this.prisma.user.findFirst({
          where: {
            id: studentId,
            OR: [
              { assignedCounselorId: counselorId },
              { applications: { some: { counselorId } } },
              { assignedLeads: { some: { assignedCounselorId: counselorId } } },
            ],
          },
        });
        if (!student) {
          throw new ForbiddenException('You are not authorized to access this student.');
        }
      }
    } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      // Admins may view/audit conversations
      if (!query.studentId || !query.counselorId) {
        throw new BadRequestException('Student ID and Counselor ID required for admin review.');
      }
      studentId = query.studentId;
      counselorId = query.counselorId;
    } else {
      throw new ForbiddenException('Unauthorized role for counselor chat.');
    }

    // Find or create Conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        studentId,
        counselorId,
        applicationId,
      },
      include: {
        student: {
          select: { id: true, fullName: true, avatar: true, studentId: true },
        },
        counselor: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            designation: true,
            qualification: true,
            avatar: true,
            role: true,
          },
        },
        application: {
          select: {
            id: true,
            applicationId: true,
            applicationNumber: true,
            college: { select: { id: true, name: true } },
            course: { select: { id: true, name: true } },
          },
        },
        messages: {
          orderBy: { sentAt: 'asc' },
          take: 50,
        },
      },
    });

    if (!conversation) {
      try {
        conversation = await this.prisma.conversation.create({
          data: {
            studentId,
            counselorId,
            applicationId,
            status: 'ACTIVE',
          },
          include: {
            student: {
              select: { id: true, fullName: true, avatar: true, studentId: true },
            },
            counselor: {
              select: {
                id: true,
                fullName: true,
                displayName: true,
                designation: true,
                qualification: true,
                avatar: true,
                role: true,
              },
            },
            application: {
              select: {
                id: true,
                applicationId: true,
                applicationNumber: true,
                college: { select: { id: true, name: true } },
                course: { select: { id: true, name: true } },
              },
            },
            messages: {
              orderBy: { sentAt: 'asc' },
              take: 50,
            },
          },
        });
      } catch (err: any) {
        // If concurrent request created it in parallel, fetch the existing one
        conversation = await this.prisma.conversation.findFirst({
          where: { studentId, counselorId, applicationId },
          include: {
            student: { select: { id: true, fullName: true, avatar: true, studentId: true } },
            counselor: {
              select: {
                id: true,
                fullName: true,
                displayName: true,
                designation: true,
                qualification: true,
                avatar: true,
                role: true,
              },
            },
            application: {
              select: {
                id: true,
                applicationId: true,
                applicationNumber: true,
                college: { select: { id: true, name: true } },
                course: { select: { id: true, name: true } },
              },
            },
            messages: { orderBy: { sentAt: 'asc' }, take: 50 },
          },
        });
      }
    }

    if (!conversation) {
      throw new NotFoundException('Could not initialize conversation');
    }

    // Auto mark unread messages for viewer
    await this.prisma.message.updateMany({
      where: {
        conversationId: conversation.id,
        senderUserId: { not: user.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderUserId: { not: user.id },
        readAt: null,
      },
    });

    return {
      hasConversation: true,
      conversation: {
        id: conversation.id,
        studentId: conversation.studentId,
        counselorId: conversation.counselorId,
        applicationId: conversation.applicationId,
        status: conversation.status,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        student: conversation.student,
        counselor: this.toSafePublicStaff(conversation.counselor),
        application: conversation.application,
        messages: conversation.messages,
        unreadCount,
      },
      disclaimer: user.role === 'STUDENT' ? STUDENT_CHAT_DISCLAIMER : COUNSELOR_CHAT_DISCLAIMER,
    };
  }

  /**
   * 3. GET /v1/chat/conversations
   * Lists all conversations for the authenticated user with unread counts and last messages.
   */
  async listUserConversations(user: IUser) {
    const where: any = {};
    if (user.role === 'STUDENT') {
      where.studentId = user.id;
    } else if (user.role === 'COUNSELOR') {
      where.counselorId = user.id;
    } else if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Unauthorized to list conversations');
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        student: {
          select: { id: true, fullName: true, avatar: true, studentId: true },
        },
        counselor: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            designation: true,
            qualification: true,
            avatar: true,
            role: true,
          },
        },
        application: {
          select: {
            id: true,
            applicationId: true,
            applicationNumber: true,
            college: { select: { id: true, name: true } },
            course: { select: { id: true, name: true } },
          },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    });

    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderUserId: { not: user.id },
            readAt: null,
          },
        });
        return {
          id: conv.id,
          studentId: conv.studentId,
          counselorId: conv.counselorId,
          applicationId: conv.applicationId,
          status: conv.status,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          student: conv.student,
          counselor: this.toSafePublicStaff(conv.counselor),
          application: conv.application,
          lastMessage: conv.messages[0] || null,
          unreadCount,
        };
      }),
    );

    return enriched;
  }

  /**
   * 4. GET /v1/chat/conversations/:id/messages
   * Strictly enforces conversation membership (IDOR protection).
   */
  async getConversationMessages(user: IUser, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        student: { select: { id: true, fullName: true, avatar: true, studentId: true } },
        counselor: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            designation: true,
            qualification: true,
            avatar: true,
            role: true,
          },
        },
        application: {
          select: {
            id: true,
            applicationId: true,
            applicationNumber: true,
            college: { select: { id: true, name: true } },
            course: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Enforce membership
    const isStudent = user.role === 'STUDENT' && conversation.studentId === user.id;
    const isCounselor = user.role === 'COUNSELOR' && conversation.counselorId === user.id;
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

    if (!isStudent && !isCounselor && !isAdmin) {
      throw new ForbiddenException('Access denied to this conversation.');
    }

    // Mark messages as read
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderUserId: { not: user.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'asc' }, // Oldest to newest
      take: 100,
    });

    return {
      conversation: {
        ...conversation,
        counselor: this.toSafePublicStaff(conversation.counselor),
      },
      messages,
      disclaimer: user.role === 'STUDENT' ? STUDENT_CHAT_DISCLAIMER : COUNSELOR_CHAT_DISCLAIMER,
    };
  }

  /**
   * 5. POST /v1/chat/conversations/:id/messages
   * Text-only message submission.
   * Enforces text restrictions, duplicate prevention, and delivers real-time notifications.
   */
  async sendMessage(user: IUser, conversationId: string, dto: SendMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        student: { select: { id: true, fullName: true } },
        counselor: { select: { id: true, fullName: true, status: true, isActive: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Enforce membership
    const isStudent = user.role === 'STUDENT' && conversation.studentId === user.id;
    const isCounselor = user.role === 'COUNSELOR' && conversation.counselorId === user.id;
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

    if (!isStudent && !isCounselor && !isAdmin) {
      throw new ForbiddenException('You are not authorized to send messages in this conversation.');
    }

    // Check account status if counselor
    if (isCounselor) {
      if (conversation.counselor.status !== 'ACTIVE' || conversation.counselor.isActive === false) {
        throw new ForbiddenException('Counselor account is inactive or suspended.');
      }
    }

    // Text-only validation
    const cleanText = this.sanitizePlainText(dto.text || '');
    if (!cleanText || cleanText.length === 0) {
      throw new BadRequestException('Message cannot be empty.');
    }
    if (cleanText.length > 2000) {
      throw new BadRequestException('Message exceeds maximum 2000 characters limit.');
    }

    // Duplicate message protection: check idempotency key
    if (dto.idempotencyKey) {
      const existingKeyMessage = await this.prisma.message.findFirst({
        where: {
          conversationId,
          idempotencyKey: dto.idempotencyKey,
        },
      });
      if (existingKeyMessage) {
        return existingKeyMessage;
      }
    }

    // Duplicate message protection: check same text within 2 seconds
    const recentDuplicate = await this.prisma.message.findFirst({
      where: {
        conversationId,
        senderUserId: user.id,
        text: cleanText,
        sentAt: { gte: new Date(Date.now() - 2000) },
      },
    });
    if (recentDuplicate) {
      return recentDuplicate;
    }

    const senderRole = user.role === 'STUDENT' ? 'STUDENT' : user.role === 'COUNSELOR' ? 'COUNSELOR' : 'ADMIN';

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderUserId: user.id,
        senderRole,
        messageType: 'TEXT',
        text: cleanText,
        idempotencyKey: dto.idempotencyKey || null,
        sentAt: new Date(),
      },
    });

    // Update conversation timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Determine recipient
    const recipientUserId = user.id === conversation.studentId ? conversation.counselorId : conversation.studentId;

    // Real-time WebSocket delivery via LiveSyncGateway
    try {
      this.liveSyncGateway.emitUserEvent(recipientUserId, 'chat_message', {
        conversationId,
        message,
      });
    } catch (e) {
      this.logger.warn(`Failed to emit real-time chat event to user ${recipientUserId}`, e);
    }

    // In-app Notification
    try {
      if (isCounselor) {
        await this.notificationsService.createNotification({
          userId: conversation.studentId,
          receiverId: conversation.studentId,
          title: 'New Counselor Message',
          message: 'Your counselor has sent you a new message regarding your admission guidance.',
          type: NotificationType.APPLICATION,
          priority: NotificationPriority.MEDIUM,
          category: 'CHAT',
          icon: 'MessageSquare',
          color: '#4A7B5B',
          actionUrl: '/dashboard',
        });
      } else if (isStudent) {
        await this.notificationsService.createNotification({
          userId: conversation.counselorId,
          receiverId: conversation.counselorId,
          title: 'New Student Message',
          message: `Student ${conversation.student.fullName} sent a message regarding counseling.`,
          type: NotificationType.APPLICATION,
          priority: NotificationPriority.MEDIUM,
          category: 'CHAT',
          icon: 'MessageSquare',
          color: '#4A7B5B',
          actionUrl: '/admin/applications',
        });
      }
    } catch (e) {
      this.logger.warn(`Could not dispatch chat notification`, e);
    }

    return message;
  }

  /**
   * 6. PATCH /v1/chat/conversations/:id/read
   * Marks unread messages in conversation as read.
   */
  async markAsRead(user: IUser, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isStudent = user.role === 'STUDENT' && conversation.studentId === user.id;
    const isCounselor = user.role === 'COUNSELOR' && conversation.counselorId === user.id;
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

    if (!isStudent && !isCounselor && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderUserId: { not: user.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    // Notify other participant of read receipt
    const otherUserId = user.id === conversation.studentId ? conversation.counselorId : conversation.studentId;
    this.liveSyncGateway.emitUserEvent(otherUserId, 'chat_read', { conversationId });

    return { success: true };
  }

  /**
   * 7. GET /v1/chat/unread-count
   * Global unread chat messages count for the user.
   */
  async getUnreadCount(user: IUser) {
    const count = await this.prisma.message.count({
      where: {
        conversation: {
          OR: [{ studentId: user.id }, { counselorId: user.id }],
        },
        senderUserId: { not: user.id },
        readAt: null,
      },
    });
    return { unreadCount: count };
  }
}
