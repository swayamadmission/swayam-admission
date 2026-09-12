import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataScopeService } from '../auth/data-scope.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { SystemConfigurationService } from '../settings/system-configuration.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { RescheduleTaskDto } from './dto/reschedule-task.dto';
import { ReassignTaskDto } from './dto/reassign-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { TaskStatus, TaskType, NotificationPriority, NotificationType, Prisma } from '@prisma/client';
import { IUser } from '../auth/interfaces/user.interface';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScopeService: DataScopeService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly configService: SystemConfigurationService,
  ) {}

  /**
   * Helper to determine runtime task status (including live OVERDUE detection)
   */
  private enrichTaskWithRuntimeStatus(task: any) {
    const now = new Date();
    const isDuePassed = new Date(task.dueDate) < now;
    let computedStatus = task.status;

    if (
      (task.status === 'PENDING' || task.status === 'IN_PROGRESS') &&
      isDuePassed
    ) {
      computedStatus = 'OVERDUE';
    }

    const overdueMinutes =
      isDuePassed && (task.status === 'PENDING' || task.status === 'IN_PROGRESS')
        ? Math.max(0, Math.floor((now.getTime() - new Date(task.dueDate).getTime()) / 60000))
        : 0;

    return {
      ...task,
      status: computedStatus,
      rawStatus: task.status,
      isOverdue: isDuePassed && (task.status === 'PENDING' || task.status === 'IN_PROGRESS'),
      overdueMinutes,
    };
  }

  /**
   * 1. Create Follow-up / Task
   */
  async createTask(dto: CreateTaskDto, actorUser: IUser) {
    const dataScope = await this.dataScopeService.resolveDataScope(actorUser.id);

    // Validate entity existence and scope
    if (dto.studentId) {
      const student = await this.prisma.user.findUnique({
        where: { id: dto.studentId },
        include: { profile: true, counselorProfile: true },
      });
      if (!student) {
        throw new NotFoundException(`Student with ID ${dto.studentId} not found`);
      }
      this.dataScopeService.enforceStudentScope(dataScope, student);
    }

    if (dto.leadId) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: dto.leadId },
      });
      if (!lead) {
        throw new NotFoundException(`Lead with ID ${dto.leadId} not found`);
      }
      this.dataScopeService.enforceLeadScope(dataScope, lead);
    }

    if (dto.applicationId) {
      const app = await this.prisma.application.findUnique({
        where: { id: dto.applicationId },
      });
      if (!app) {
        throw new NotFoundException(`Application with ID ${dto.applicationId} not found`);
      }
      if (dto.studentId && app.userId !== dto.studentId) {
        throw new BadRequestException('Application does not belong to specified student');
      }
    }

    // Verify assigned counselor
    const assignedUser = await this.prisma.user.findUnique({
      where: { id: dto.assignedTo },
      include: { counselorProfile: true },
    });
    if (!assignedUser || assignedUser.status !== 'ACTIVE') {
      throw new BadRequestException('Assigned counselor must be an active user');
    }

    // Duplicate Task Protection (Idempotency window: 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const existingDuplicate = await this.prisma.task.findFirst({
      where: {
        title: dto.title.trim(),
        assignedTo: dto.assignedTo,
        leadId: dto.leadId || null,
        studentId: dto.studentId || null,
        createdAt: { gte: twoMinutesAgo },
      },
    });

    if (existingDuplicate) {
      return this.enrichTaskWithRuntimeStatus(existingDuplicate);
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        description: dto.description || null,
        assignedTo: dto.assignedTo,
        counselorProfileId: assignedUser.counselorProfile?.id || null,
        type: dto.type || TaskType.OTHER,
        status: TaskStatus.PENDING,
        dueDate: new Date(dto.dueDate),
        priority: (dto.priority || 'MEDIUM').toUpperCase(),
        relatedTo: dto.relatedTo || null,
        contextType: dto.contextType || (dto.leadId ? 'LEAD' : dto.studentId ? 'STUDENT' : 'GENERAL'),
        leadId: dto.leadId || null,
        studentId: dto.studentId || null,
        applicationId: dto.applicationId || null,
        paymentId: dto.paymentId || null,
        reportingId: dto.reportingId || null,
        enrollmentId: dto.enrollmentId || null,
        createdById: actorUser.id,
      },
      include: {
        User: { select: { id: true, fullName: true, email: true } },
        lead: { select: { id: true, fullName: true, mobile: true, preferredCourse: true } },
        student: { select: { id: true, fullName: true, email: true, mobile: true } },
        application: {
          select: {
            id: true,
            applicationNumber: true,
            course: { select: { name: true } },
            college: { select: { name: true } },
          },
        },
      },
    });

    // Record Central Activity
    if (dto.leadId || dto.studentId) {
      await this.prisma.crmActivity.create({
        data: {
          leadId: dto.leadId || null,
          studentId: dto.studentId || null,
          applicationId: dto.applicationId || null,
          actorId: actorUser.id,
          actorRole: actorUser.role || 'COUNSELOR',
          actorName: actorUser.fullName || actorUser.email,
          channel: 'FOLLOW_UP',
          direction: 'INTERNAL',
          category: 'STAFF_ACTIVITY',
          title: `Follow-up Scheduled: ${dto.title}`,
          content: dto.description || `Task assigned to ${assignedUser.fullName || assignedUser.email} due on ${new Date(dto.dueDate).toLocaleString()}`,
          visibility: 'INTERNAL',
          metadata: {
            taskId: task.id,
            dueDate: dto.dueDate,
            priority: dto.priority || 'MEDIUM',
            assignedTo: assignedUser.fullName,
          },
          occurredAt: new Date(),
        },
      });
    }

    // Audit Log
    await this.auditService.logAction({
      action: 'CREATE',
      entity: 'Task',
      entityId: task.id,
      userId: actorUser.id,
      userName: actorUser.fullName || actorUser.email,
      newValue: { title: task.title, assignedTo: task.assignedTo, dueDate: task.dueDate },
    });

    // Dispatch Notification to assigned counselor
    try {
      await this.notificationsService.sendNotification({
        userId: task.assignedTo,
        title: 'New Task Assigned',
        message: `Task: "${task.title}" has been assigned to you. Due: ${new Date(task.dueDate).toLocaleString()}`,
        type: NotificationType.CRM,
        priority: task.priority === 'URGENT' || task.priority === 'HIGH' ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
        relatedLeadId: task.leadId || undefined,
        relatedApplicationId: task.applicationId || undefined,
      });
    } catch (e: any) {
      this.logger.warn(`Failed to dispatch notification for task ${task.id}: ${e.message}`);
    }

    return this.enrichTaskWithRuntimeStatus(task);
  }

  /**
   * 2. Counselor's Personal Tasks ("My Tasks")
   */
  async getMyTasks(userId: string, query: TaskQueryDto) {
    const now = new Date();
    const where: Prisma.TaskWhereInput = {
      assignedTo: userId,
    };

    if (query.priority) {
      where.priority = query.priority.toUpperCase();
    }

    if (query.contextType) {
      where.contextType = query.contextType.toUpperCase();
    }

    if (query.leadId) where.leadId = query.leadId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.applicationId) where.applicationId = query.applicationId;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { lead: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { student: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    // Date Filters
    if (query.dateFilter === 'TODAY') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      where.dueDate = { gte: startOfDay, lte: endOfDay };
    } else if (query.dateFilter === 'TOMORROW') {
      const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
      where.dueDate = { gte: startOfTomorrow, lte: endOfTomorrow };
    } else if (query.dateFilter === 'THIS_WEEK') {
      const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);
      where.dueDate = { gte: now, lte: endOfWeek };
    } else if (query.dateFilter === 'OVERDUE') {
      where.dueDate = { lt: now };
      where.status = { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] };
    } else if (query.startDate && query.endDate) {
      where.dueDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    // Status filter
    if (query.status && query.status !== 'ALL') {
      if (query.status === 'OVERDUE') {
        where.dueDate = { lt: now };
        where.status = { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] };
      } else if (query.status === 'COMPLETED') {
        where.status = TaskStatus.COMPLETED;
      } else if (query.status === 'CANCELLED') {
        where.status = TaskStatus.CANCELLED;
      } else if (query.status === 'PENDING' || query.status === 'OPEN') {
        where.status = TaskStatus.PENDING;
      } else if (query.status === 'IN_PROGRESS') {
        where.status = TaskStatus.IN_PROGRESS;
      }
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [rawTasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          User: { select: { id: true, fullName: true, email: true } },
          lead: {
            select: {
              id: true,
              fullName: true,
              mobile: true,
              preferredCourse: true,
              preferredCollege: true,
              state: true,
              district: true,
            },
          },
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              mobile: true,
            },
          },
          application: {
            select: {
              id: true,
              applicationNumber: true,
              status: true,
              course: { select: { name: true } },
              college: { select: { name: true } },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    const tasks = rawTasks.map((t) => this.enrichTaskWithRuntimeStatus(t));

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 3. Senior Counselor Team Tasks
   */
  async getTeamTasks(seniorCounselorId: string, query: TaskQueryDto) {
    const dataScope = await this.dataScopeService.resolveDataScope(seniorCounselorId);
    const now = new Date();

    const allowedUserIds = Array.from(
      new Set([seniorCounselorId, ...dataScope.teamMemberUserIds]),
    );

    const where: Prisma.TaskWhereInput = {
      assignedTo: { in: allowedUserIds },
    };

    if (query.counselorId && allowedUserIds.includes(query.counselorId)) {
      where.assignedTo = query.counselorId;
    }

    if (query.priority) where.priority = query.priority.toUpperCase();
    if (query.contextType) where.contextType = query.contextType.toUpperCase();
    if (query.leadId) where.leadId = query.leadId;
    if (query.studentId) where.studentId = query.studentId;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { User: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { lead: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { student: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.status === 'OVERDUE') {
      where.dueDate = { lt: now };
      where.status = { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] };
    } else if (query.status === 'ESCALATED') {
      where.isEscalated = true;
    } else if (query.status && query.status !== 'ALL') {
      where.status = query.status as TaskStatus;
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [rawTasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          User: { select: { id: true, fullName: true, email: true } },
          creator: { select: { id: true, fullName: true } },
          escalatedTo: { select: { id: true, fullName: true } },
          lead: {
            select: {
              id: true,
              fullName: true,
              mobile: true,
              preferredCourse: true,
              preferredCollege: true,
              state: true,
              district: true,
            },
          },
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              mobile: true,
            },
          },
          application: {
            select: {
              id: true,
              applicationNumber: true,
              status: true,
              course: { select: { name: true } },
              college: { select: { name: true } },
            },
          },
        },
        orderBy: [{ isEscalated: 'desc' }, { dueDate: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    const tasks = rawTasks.map((t) => this.enrichTaskWithRuntimeStatus(t));

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 4. Admin CRM Tasks
   */
  async getAdminTasks(adminUserId: string, query: TaskQueryDto) {
    const dataScope = await this.dataScopeService.resolveDataScope(adminUserId);
    const now = new Date();
    const where: Prisma.TaskWhereInput = {};

    if (query.counselorId) where.assignedTo = query.counselorId;
    if (query.priority) where.priority = query.priority.toUpperCase();
    if (query.contextType) where.contextType = query.contextType.toUpperCase();
    if (query.leadId) where.leadId = query.leadId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.applicationId) where.applicationId = query.applicationId;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { User: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { lead: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { student: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.status === 'OVERDUE') {
      where.dueDate = { lt: now };
      where.status = { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] };
    } else if (query.status === 'ESCALATED') {
      where.isEscalated = true;
    } else if (query.status && query.status !== 'ALL') {
      where.status = query.status as TaskStatus;
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [rawTasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          User: { select: { id: true, fullName: true, email: true } },
          creator: { select: { id: true, fullName: true } },
          completer: { select: { id: true, fullName: true } },
          escalatedTo: { select: { id: true, fullName: true } },
          lead: {
            select: {
              id: true,
              fullName: true,
              mobile: true,
              preferredCourse: true,
              preferredCollege: true,
              state: true,
              district: true,
            },
          },
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              mobile: true,
            },
          },
          application: {
            select: {
              id: true,
              applicationNumber: true,
              status: true,
              course: { select: { name: true } },
              college: { select: { name: true } },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    const tasks = rawTasks.map((t) => this.enrichTaskWithRuntimeStatus(t));

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 5. Authoritative Task Counters
   */
  async getTaskStats(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const isGlobal = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const isSenior = user.role === 'SENIOR_COUNSELOR';

    let baseFilter: Prisma.TaskWhereInput = {};

    if (!isGlobal) {
      if (isSenior) {
        const dataScope = await this.dataScopeService.resolveDataScope(userId);
        const allowedIds = Array.from(new Set([userId, ...dataScope.teamMemberUserIds]));
        baseFilter.assignedTo = { in: allowedIds };
      } else {
        baseFilter.assignedTo = userId;
      }
    }

    const [totalTasks, dueToday, overdue, upcoming, completed, escalated] = await Promise.all([
      this.prisma.task.count({ where: baseFilter }),
      this.prisma.task.count({
        where: {
          ...baseFilter,
          dueDate: { gte: startOfDay, lte: endOfDay },
          status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        },
      }),
      this.prisma.task.count({
        where: {
          ...baseFilter,
          dueDate: { lt: now },
          status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        },
      }),
      this.prisma.task.count({
        where: {
          ...baseFilter,
          dueDate: { gt: endOfDay },
          status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        },
      }),
      this.prisma.task.count({
        where: {
          ...baseFilter,
          status: TaskStatus.COMPLETED,
        },
      }),
      this.prisma.task.count({
        where: {
          ...baseFilter,
          isEscalated: true,
          status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        },
      }),
    ]);

    const activeTotal = dueToday + overdue + upcoming;
    const completionRate =
      totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    return {
      totalTasks,
      activeTotal,
      dueToday,
      overdue,
      upcoming,
      completed,
      escalated,
      completionRate,
    };
  }

  /**
   * 6. Senior Counselor Team Workload & Performance
   */
  async getSeniorCounselorTeamWorkload(seniorCounselorId: string) {
    const dataScope = await this.dataScopeService.resolveDataScope(seniorCounselorId);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const teamUserIds = Array.from(new Set(dataScope.teamMemberUserIds));
    if (teamUserIds.length === 0) {
      teamUserIds.push(seniorCounselorId);
    }

    const counselors = await this.prisma.user.findMany({
      where: { id: { in: teamUserIds } },
      include: {
        counselorProfile: true,
      },
    });

    const counselorWorkloads = await Promise.all(
      counselors.map(async (c) => {
        const [openTasks, dueToday, overdue, completedThisWeek, totalAllTime, completedAllTime] =
          await Promise.all([
            this.prisma.task.count({
              where: {
                assignedTo: c.id,
                status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
              },
            }),
            this.prisma.task.count({
              where: {
                assignedTo: c.id,
                dueDate: { gte: startOfDay, lte: endOfDay },
                status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
              },
            }),
            this.prisma.task.count({
              where: {
                assignedTo: c.id,
                dueDate: { lt: now },
                status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
              },
            }),
            this.prisma.task.count({
              where: {
                assignedTo: c.id,
                status: TaskStatus.COMPLETED,
                completedAt: { gte: oneWeekAgo },
              },
            }),
            this.prisma.task.count({
              where: { assignedTo: c.id },
            }),
            this.prisma.task.count({
              where: { assignedTo: c.id, status: TaskStatus.COMPLETED },
            }),
          ]);

        const completionRatePct =
          totalAllTime > 0 ? Math.round((completedAllTime / totalAllTime) * 100) : 0;

        return {
          counselorId: c.id,
          fullName: c.fullName,
          email: c.email,
          employeeId: c.counselorProfile?.employeeId || 'EMP-' + c.id.slice(0, 6),
          department: c.department || c.counselorProfile?.department || 'Admissions',
          openTasks,
          dueToday,
          overdue,
          completedThisWeek,
          totalAssignedTasks: totalAllTime,
          completionRatePct,
          capacityStatus:
            openTasks > 25 ? 'FULL' : openTasks > 15 ? 'HIGH_LOAD' : 'NORMAL',
        };
      }),
    );

    return counselorWorkloads;
  }

  /**
   * 7. Complete Task with Outcome & Notes
   */
  async completeTask(taskId: string, actorUser: IUser, dto: CompleteTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        lead: true,
        student: true,
      },
    });

    if (!task) throw new NotFoundException('Task not found');

    if (task.status === TaskStatus.COMPLETED) {
      return this.enrichTaskWithRuntimeStatus(task);
    }

    // Authorization check
    if (
      task.assignedTo !== actorUser.id &&
      actorUser.role !== 'ADMIN' &&
      actorUser.role !== 'SUPER_ADMIN' &&
      actorUser.role !== 'SENIOR_COUNSELOR'
    ) {
      throw new ForbiddenException('You are not authorized to complete this task');
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
        completedById: actorUser.id,
        completionOutcome: dto.outcome || 'COMPLETED',
        completionNotes: dto.notes || null,
      },
      include: {
        User: { select: { id: true, fullName: true, email: true } },
        lead: { select: { id: true, fullName: true } },
        student: { select: { id: true, fullName: true } },
      },
    });

    // Record Central Timeline Activity
    if (task.leadId || task.studentId) {
      await this.prisma.crmActivity.create({
        data: {
          leadId: task.leadId || null,
          studentId: task.studentId || null,
          applicationId: task.applicationId || null,
          actorId: actorUser.id,
          actorRole: actorUser.role || 'COUNSELOR',
          actorName: actorUser.fullName || actorUser.email,
          channel: 'FOLLOW_UP',
          direction: 'INTERNAL',
          category: 'STAFF_ACTIVITY',
          title: `Follow-up Completed: ${task.title}`,
          content: dto.notes || `Task marked completed with outcome: ${dto.outcome || 'COMPLETED'}`,
          callOutcome: dto.outcome || null,
          visibility: 'INTERNAL',
          metadata: {
            taskId: task.id,
            completedAt: new Date(),
            outcome: dto.outcome || 'COMPLETED',
          },
          occurredAt: new Date(),
        },
      });
    }

    // Audit Log
    await this.auditService.logAction({
      action: 'UPDATE',
      entity: 'Task',
      entityId: task.id,
      userId: actorUser.id,
      userName: actorUser.fullName || actorUser.email,
      newValue: { status: 'COMPLETED', outcome: dto.outcome, completedAt: new Date() },
    });

    // Create Next Follow-up Task if requested
    if (dto.nextFollowUpDate) {
      await this.createTask(
        {
          title: `Follow-up: ${task.title}`,
          description: `Next action follow-up after ${dto.outcome || 'previous session'}`,
          assignedTo: task.assignedTo,
          dueDate: dto.nextFollowUpDate,
          priority: task.priority,
          contextType: task.contextType,
          leadId: task.leadId || undefined,
          studentId: task.studentId || undefined,
          applicationId: task.applicationId || undefined,
        },
        actorUser,
      );
    }

    return this.enrichTaskWithRuntimeStatus(updatedTask);
  }

  /**
   * 8. Reschedule Task
   */
  async rescheduleTask(taskId: string, actorUser: IUser, dto: RescheduleTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) {
      throw new BadRequestException('Cannot reschedule a completed or cancelled task');
    }

    const oldDueDate = task.dueDate;
    const newDueDate = new Date(dto.newDueDate);

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        dueDate: newDueDate,
        rescheduledFrom: oldDueDate,
        rescheduledReason: dto.reason.trim(),
        rescheduledById: actorUser.id,
        isEscalated: false, // Reset escalation on explicit authorized reschedule
      },
      include: {
        User: { select: { id: true, fullName: true, email: true } },
        lead: { select: { id: true, fullName: true } },
        student: { select: { id: true, fullName: true } },
      },
    });

    // Record Central Activity
    if (task.leadId || task.studentId) {
      await this.prisma.crmActivity.create({
        data: {
          leadId: task.leadId || null,
          studentId: task.studentId || null,
          applicationId: task.applicationId || null,
          actorId: actorUser.id,
          actorRole: actorUser.role || 'COUNSELOR',
          actorName: actorUser.fullName || actorUser.email,
          channel: 'FOLLOW_UP',
          direction: 'INTERNAL',
          category: 'STAFF_ACTIVITY',
          title: `Task Rescheduled: ${task.title}`,
          content: `Rescheduled from ${new Date(oldDueDate).toLocaleDateString()} to ${newDueDate.toLocaleDateString()}. Reason: ${dto.reason}`,
          visibility: 'INTERNAL',
          metadata: {
            taskId: task.id,
            oldDueDate,
            newDueDate,
            reason: dto.reason,
          },
          occurredAt: new Date(),
        },
      });
    }

    // Audit Log
    await this.auditService.logAction({
      action: 'UPDATE',
      entity: 'Task',
      entityId: task.id,
      userId: actorUser.id,
      userName: actorUser.fullName || actorUser.email,
      newValue: { oldDueDate, newDueDate, reason: dto.reason },
    });

    return this.enrichTaskWithRuntimeStatus(updatedTask);
  }

  /**
   * 9. Reassign Task (Senior Counselor / Admin)
   */
  async reassignTask(taskId: string, actorUser: IUser, dto: ReassignTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const newAssignee = await this.prisma.user.findUnique({
      where: { id: dto.newAssignedToId },
      include: { counselorProfile: true },
    });
    if (!newAssignee || newAssignee.status !== 'ACTIVE') {
      throw new BadRequestException('Target counselor not found or inactive');
    }

    const previousAssigneeId = task.assignedTo;

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        assignedTo: dto.newAssignedToId,
        counselorProfileId: newAssignee.counselorProfile?.id || null,
      },
      include: {
        User: { select: { id: true, fullName: true, email: true } },
        lead: { select: { id: true, fullName: true } },
        student: { select: { id: true, fullName: true } },
      },
    });

    // Record Central Activity
    if (task.leadId || task.studentId) {
      await this.prisma.crmActivity.create({
        data: {
          leadId: task.leadId || null,
          studentId: task.studentId || null,
          applicationId: task.applicationId || null,
          actorId: actorUser.id,
          actorRole: actorUser.role || 'MANAGEMENT',
          actorName: actorUser.fullName || actorUser.email,
          channel: 'FOLLOW_UP',
          direction: 'INTERNAL',
          category: 'STAFF_ACTIVITY',
          title: `Task Reassigned: ${task.title}`,
          content: `Task reassigned to ${newAssignee.fullName || newAssignee.email}. Reason: ${dto.reason}`,
          visibility: 'INTERNAL',
          metadata: {
            taskId: task.id,
            previousAssigneeId,
            newAssigneeId: dto.newAssignedToId,
            reason: dto.reason,
          },
          occurredAt: new Date(),
        },
      });
    }

    // Audit Log
    await this.auditService.logAction({
      action: 'UPDATE',
      entity: 'Task',
      entityId: task.id,
      userId: actorUser.id,
      userName: actorUser.fullName || actorUser.email,
      newValue: {
        previousAssigneeId,
        newAssignedTo: dto.newAssignedToId,
        reason: dto.reason,
      },
    });

    // Notification to new counselor
    try {
      await this.notificationsService.sendNotification({
        userId: dto.newAssignedToId,
        title: 'Task Reassigned to You',
        message: `Task: "${task.title}" has been reassigned to you by ${actorUser.fullName}. Reason: ${dto.reason}`,
        type: NotificationType.CRM,
        priority: NotificationPriority.HIGH,
      });
    } catch (e: any) {
      this.logger.warn(`Failed to dispatch reassignment notification: ${e.message}`);
    }

    return this.enrichTaskWithRuntimeStatus(updatedTask);
  }

  /**
   * 10. Cancel Task
   */
  async cancelTask(taskId: string, actorUser: IUser, reason: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.CANCELLED,
        completionNotes: `Cancelled: ${reason}`,
      },
    });

    // Audit Log
    await this.auditService.logAction({
      action: 'DELETE',
      entity: 'Task',
      entityId: task.id,
      userId: actorUser.id,
      userName: actorUser.fullName || actorUser.email,
      newValue: { status: 'CANCELLED', reason },
    });

    return this.enrichTaskWithRuntimeStatus(updatedTask);
  }

  /**
   * 11. Automated Overdue Escalation Engine
   */
  async runEscalationCheck() {
    // Dynamic escalation threshold from System Configuration (defaults to 24h)
    const thresholdHours = await this.configService.getNumber('crm.task.escalationHours', 24);
    const overdueCutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    const overdueTasks = await this.prisma.task.findMany({
      where: {
        status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        dueDate: { lt: overdueCutoff },
        isEscalated: false,
      },
      include: {
        User: {
          include: {
            teamMemberships: {
              include: { team: { include: { manager: true } } },
            },
          },
        },
        lead: {
          include: { assignedSeniorCounselor: true },
        },
      },
    });

    let escalatedCount = 0;

    for (const task of overdueTasks) {
      // Find Senior Counselor target
      let seniorCounselorId = task.lead?.assignedSeniorCounselorId;

      if (!seniorCounselorId && task.User?.teamMemberships?.length) {
        seniorCounselorId = task.User.teamMemberships[0].team?.managerId || undefined;
      }

      // If still not found, fallback to active senior counselor in system
      if (!seniorCounselorId) {
        const fallbackSenior = await this.prisma.user.findFirst({
          where: { role: 'SENIOR_COUNSELOR', status: 'ACTIVE' },
        });
        seniorCounselorId = fallbackSenior?.id;
      }

      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          isEscalated: true,
          escalatedAt: new Date(),
          escalatedToId: seniorCounselorId || null,
          escalationReason: `Task overdue by more than ${thresholdHours} hours`,
        },
      });

      escalatedCount++;

      // Audit Log
      await this.auditService.logAction({
        action: 'UPDATE',
        entity: 'Task',
        entityId: task.id,
        userId: 'SYSTEM',
        userName: 'CRM Escalation Daemon',
        newValue: {
          isEscalated: true,
          escalatedTo: seniorCounselorId,
          reason: `Overdue > ${thresholdHours} hours`,
        },
      });

      // Notify Senior Counselor
      if (seniorCounselorId) {
        try {
          await this.notificationsService.sendNotification({
            userId: seniorCounselorId,
            title: 'Overdue Follow-up Escalation',
            message: `Task: "${task.title}" assigned to ${task.User?.fullName} is overdue. Escalated for management attention.`,
            type: NotificationType.CRM,
            priority: NotificationPriority.HIGH,
          });
        } catch (err: any) {
          this.logger.warn(`Failed escalation notification for task ${task.id}: ${err.message}`);
        }
      }
    }

    return { escalatedCount, processedAt: new Date() };
  }
}
