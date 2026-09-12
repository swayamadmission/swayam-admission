import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataScopeService } from '../auth/data-scope.service';
import { AuditService } from '../audit/audit.service';
import { TasksService } from '../tasks/tasks.service';
import { CreateCrmActivityDto } from './dto/create-crm-activity.dto';
import { LogCallDto } from './dto/log-call.dto';
import { LogMeetingDto } from './dto/log-meeting.dto';
import { CrmActivityQueryDto } from './dto/crm-activity-query.dto';
import { IUser } from '../auth/interfaces/user.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class CrmActivityService {
  private readonly logger = new Logger(CrmActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScopeService: DataScopeService,
    private readonly auditService: AuditService,
    private readonly tasksService: TasksService,
  ) {}

  /**
   * 1. Log General Activity / Interaction
   */
  async logActivity(dto: CreateCrmActivityDto, actorUser: IUser) {
    const dataScope = await this.dataScopeService.resolveDataScope(actorUser.id);

    // Validate entity scope
    if (dto.studentId) {
      const student = await this.prisma.user.findUnique({
        where: { id: dto.studentId },
        include: { profile: true, counselorProfile: true },
      });
      if (!student) throw new NotFoundException(`Student ${dto.studentId} not found`);
      this.dataScopeService.enforceStudentScope(dataScope, student);
    }

    if (dto.leadId) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: dto.leadId },
      });
      if (!lead) throw new NotFoundException(`Lead ${dto.leadId} not found`);
      this.dataScopeService.enforceLeadScope(dataScope, lead);
    }

    if (dto.applicationId) {
      const app = await this.prisma.application.findUnique({
        where: { id: dto.applicationId },
      });
      if (!app) throw new NotFoundException(`Application ${dto.applicationId} not found`);
    }

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    const activity = await this.prisma.crmActivity.create({
      data: {
        leadId: dto.leadId || null,
        studentId: dto.studentId || null,
        applicationId: dto.applicationId || null,
        paymentId: dto.paymentId || null,
        actorId: actorUser.id,
        actorRole: actorUser.role || 'COUNSELOR',
        actorName: actorUser.fullName || actorUser.email,
        channel: dto.channel.toUpperCase(),
        direction: (dto.direction || 'OUTBOUND').toUpperCase(),
        category: (dto.category || 'STAFF_ACTIVITY').toUpperCase(),
        title: dto.title.trim(),
        content: dto.content || null,
        callOutcome: dto.callOutcome || null,
        callDurationSecs: dto.callDurationSecs || null,
        meetingMode: dto.meetingMode || null,
        meetingOutcome: dto.meetingOutcome || null,
        visibility: (dto.visibility || 'INTERNAL').toUpperCase(),
        metadata: dto.metadata || {},
        occurredAt,
      },
      include: {
        actor: { select: { id: true, fullName: true, email: true } },
        lead: { select: { id: true, fullName: true, mobile: true } },
        student: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Audit Log
    await this.auditService.logAction({
      action: 'CREATE',
      entity: 'CrmActivity',
      entityId: activity.id,
      userId: actorUser.id,
      userName: actorUser.fullName || actorUser.email,
      newValue: {
        channel: activity.channel,
        title: activity.title,
        leadId: activity.leadId,
        studentId: activity.studentId,
      },
    });

    return activity;
  }

  /**
   * 2. Log Phone Call
   */
  async logCall(dto: LogCallDto, actorUser: IUser) {
    const outcomeTitleMap: Record<string, string> = {
      CONNECTED: 'Call Connected',
      INTERESTED: 'Call Connected - Student Interested',
      NOT_INTERESTED: 'Call Connected - Not Interested',
      CALL_BACK_REQUESTED: 'Callback Requested',
      NO_ANSWER: 'Call Attempted - No Answer',
      BUSY: 'Call Attempted - Line Busy',
      WRONG_NUMBER: 'Call Attempted - Wrong Number',
      CONVERTED: 'Call Completed - Converted',
    };

    const title = outcomeTitleMap[dto.outcome.toUpperCase()] || `Call Logged (${dto.outcome})`;

    const activity = await this.logActivity(
      {
        leadId: dto.leadId,
        studentId: dto.studentId,
        applicationId: dto.applicationId,
        channel: 'CALL',
        direction: dto.direction || 'OUTBOUND',
        category: 'STAFF_ACTIVITY',
        title,
        content: dto.notes || `Call outcome: ${dto.outcome}`,
        callOutcome: dto.outcome.toUpperCase(),
        callDurationSecs: dto.durationSecs || undefined,
        visibility: 'INTERNAL',
        occurredAt: dto.occurredAt,
        metadata: {
          outcome: dto.outcome,
          durationSecs: dto.durationSecs,
        },
      },
      actorUser,
    );

    // Optional controlled status update for leads
    if (dto.leadId) {
      if (dto.outcome.toUpperCase() === 'INTERESTED') {
        await this.prisma.lead.update({
          where: { id: dto.leadId },
          data: { status: 'INTERESTED' },
        });
      } else if (dto.outcome.toUpperCase() === 'NOT_INTERESTED') {
        await this.prisma.lead.update({
          where: { id: dto.leadId },
          data: { status: 'NOT_INTERESTED' },
        });
      } else if (dto.outcome.toUpperCase() === 'CONNECTED') {
        await this.prisma.lead.update({
          where: { id: dto.leadId },
          data: { status: 'CONTACTED' },
        });
      }
    }

    // Schedule next follow-up task if provided
    if (dto.nextFollowUpDate) {
      await this.tasksService.createTask(
        {
          title: dto.nextFollowUpTitle || `Follow-up Call: ${title}`,
          description: dto.notes ? `Follow-up after: ${dto.notes}` : `Follow-up call after ${dto.outcome}`,
          assignedTo: actorUser.id,
          dueDate: dto.nextFollowUpDate,
          priority: dto.outcome === 'INTERESTED' ? 'HIGH' : 'MEDIUM',
          contextType: dto.leadId ? 'LEAD' : dto.studentId ? 'STUDENT' : 'GENERAL',
          leadId: dto.leadId,
          studentId: dto.studentId,
          applicationId: dto.applicationId,
        },
        actorUser,
      );
    }

    return activity;
  }

  /**
   * 3. Log Meeting / Counseling Session
   */
  async logMeeting(dto: LogMeetingDto, actorUser: IUser) {
    const activity = await this.logActivity(
      {
        leadId: dto.leadId,
        studentId: dto.studentId,
        applicationId: dto.applicationId,
        channel: 'MEETING',
        direction: 'OUTBOUND',
        category: 'STAFF_ACTIVITY',
        title: `Counseling Session: ${dto.title}`,
        content: dto.notes || dto.purpose || 'Counseling meeting conducted',
        meetingMode: dto.mode || 'CALL',
        meetingOutcome: dto.outcome || 'COMPLETED',
        visibility: 'INTERNAL',
        occurredAt: dto.occurredAt,
        metadata: {
          mode: dto.mode,
          purpose: dto.purpose,
          outcome: dto.outcome,
          durationMins: dto.durationMins,
        },
      },
      actorUser,
    );

    // Also persist in CounselorMeeting if counselor profile exists
    try {
      const counselorProf = await this.prisma.counselorProfile.findUnique({
        where: { userId: actorUser.id },
      });
      if (counselorProf) {
        await this.prisma.counselorMeeting.create({
          data: {
            counselorId: counselorProf.id,
            title: dto.title,
            description: dto.purpose || null,
            meetingType: dto.mode || 'CALL',
            studentId: dto.studentId || null,
            leadId: dto.leadId || null,
            scheduledAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
            durationMins: dto.durationMins || 30,
            status: 'COMPLETED',
            notes: dto.notes || null,
          },
        });
      }
    } catch (e: any) {
      this.logger.warn(`Failed to create counselorMeeting record: ${e.message}`);
    }

    // Schedule next follow-up task if provided
    if (dto.nextFollowUpDate) {
      await this.tasksService.createTask(
        {
          title: `Post-Counseling Follow-up: ${dto.title}`,
          description: `Follow-up after counseling session (${dto.mode || 'CALL'})`,
          assignedTo: actorUser.id,
          dueDate: dto.nextFollowUpDate,
          priority: 'HIGH',
          contextType: dto.leadId ? 'LEAD' : dto.studentId ? 'STUDENT' : 'GENERAL',
          leadId: dto.leadId,
          studentId: dto.studentId,
          applicationId: dto.applicationId,
        },
        actorUser,
      );
    }

    return activity;
  }

  /**
   * 4. Single Authoritative Central Activity Timeline Query
   */
  async getTimeline(
    contextType: 'LEAD' | 'STUDENT' | 'APPLICATION',
    contextId: string,
    query: CrmActivityQueryDto,
    currentUser: IUser,
  ) {
    const isStudentUser = currentUser.role === 'STUDENT';

    // 1. DataScope & Privacy Check
    if (!isStudentUser) {
      const dataScope = await this.dataScopeService.resolveDataScope(currentUser.id);
      if (contextType === 'STUDENT') {
        const student = await this.prisma.user.findUnique({
          where: { id: contextId },
          include: { profile: true, counselorProfile: true },
        });
        if (student) this.dataScopeService.enforceStudentScope(dataScope, student);
      } else if (contextType === 'LEAD') {
        const lead = await this.prisma.lead.findUnique({ where: { id: contextId } });
        if (lead) this.dataScopeService.enforceLeadScope(dataScope, lead);
      }
    } else {
      // Student can only access their own timeline
      if (contextType === 'STUDENT' && contextId !== currentUser.id) {
        throw new ForbiddenException('Cannot access other student timelines');
      }
    }

    // Build CrmActivity filter
    const crmWhere: Prisma.CrmActivityWhereInput = {
      isVoided: false,
    };

    if (contextType === 'LEAD') {
      crmWhere.leadId = contextId;
    } else if (contextType === 'STUDENT') {
      crmWhere.studentId = contextId;
    } else if (contextType === 'APPLICATION') {
      crmWhere.applicationId = contextId;
    }

    // Student privacy: ONLY STUDENT_VISIBLE
    if (isStudentUser) {
      crmWhere.visibility = 'STUDENT_VISIBLE';
    } else if (query.visibility && query.visibility !== 'ALL') {
      crmWhere.visibility = query.visibility.toUpperCase();
    }

    if (query.channel && query.channel !== 'ALL') {
      crmWhere.channel = query.channel.toUpperCase();
    }

    if (query.category && query.category !== 'ALL') {
      crmWhere.category = query.category.toUpperCase();
    }

    if (query.search) {
      crmWhere.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
        { actorName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Fetch primary CRM activities
    const crmActivities = await this.prisma.crmActivity.findMany({
      where: crmWhere,
      include: {
        actor: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });

    // Also fetch legacy or subsystem events to aggregate into unified stream
    const federatedEvents: any[] = [];

    // Map primary CRM activities
    crmActivities.forEach((act) => {
      federatedEvents.push({
        id: act.id,
        source: 'CRM_ACTIVITY',
        channel: act.channel,
        category: act.category, // STAFF_ACTIVITY vs SYSTEM_EVENT
        direction: act.direction,
        title: act.title,
        content: act.content,
        callOutcome: act.callOutcome,
        callDurationSecs: act.callDurationSecs,
        meetingMode: act.meetingMode,
        meetingOutcome: act.meetingOutcome,
        visibility: act.visibility,
        actorName: act.actorName || act.actor?.fullName || 'Staff Member',
        actorRole: act.actorRole,
        metadata: act.metadata,
        timestamp: act.occurredAt,
      });
    });

    // If STUDENT context, also federate StudentNotes and Communications
    if (contextType === 'STUDENT') {
      const studentNotesWhere: Prisma.StudentNoteWhereInput = {
        studentId: contextId,
      };
      if (isStudentUser) {
        studentNotesWhere.visibility = 'STUDENT_VISIBLE';
      }

      const notes = await this.prisma.studentNote.findMany({
        where: studentNotesWhere,
        include: { author: { select: { fullName: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      notes.forEach((n) => {
        federatedEvents.push({
          id: `note-${n.id}`,
          source: 'STUDENT_NOTE',
          channel: 'NOTE',
          category: 'STAFF_ACTIVITY',
          direction: 'INTERNAL',
          title: n.title ? `Note: ${n.title}` : `Counselor Note (${n.noteType})`,
          content: n.content,
          visibility: n.visibility,
          actorName: n.author?.fullName || 'Counselor',
          actorRole: n.author?.role || 'COUNSELOR',
          metadata: { noteType: n.noteType, isPinned: n.isPinned },
          timestamp: n.createdAt,
        });
      });
    }

    // If LEAD context, also federate LeadNotes and LeadActivities
    if (contextType === 'LEAD') {
      const [leadNotes, leadActs] = await Promise.all([
        this.prisma.leadNote.findMany({
          where: { leadId: contextId },
          include: { user: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
        this.prisma.leadActivity.findMany({
          where: { leadId: contextId },
          include: { user: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
      ]);

      leadNotes.forEach((ln) => {
        federatedEvents.push({
          id: `leadnote-${ln.id}`,
          source: 'LEAD_NOTE',
          channel: 'NOTE',
          category: 'STAFF_ACTIVITY',
          direction: 'INTERNAL',
          title: 'Lead Counselor Note',
          content: ln.content,
          visibility: 'INTERNAL',
          actorName: ln.user?.fullName || 'Staff Member',
          actorRole: ln.user?.role || 'COUNSELOR',
          metadata: {},
          timestamp: ln.createdAt,
        });
      });

      leadActs.forEach((la) => {
        federatedEvents.push({
          id: `leadact-${la.id}`,
          source: 'LEAD_ACTIVITY',
          channel: 'SYSTEM_EVENT',
          category: 'SYSTEM_EVENT',
          direction: 'SYSTEM',
          title: la.action,
          content: la.details,
          visibility: 'INTERNAL',
          actorName: la.user?.fullName || 'System',
          actorRole: 'SYSTEM',
          metadata: {},
          timestamp: la.createdAt,
        });
      });
    }

    // Sort complete federated timeline in reverse chronological order
    federatedEvents.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const paginatedEvents = federatedEvents.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedEvents,
      meta: {
        total: federatedEvents.length,
        page,
        limit,
        totalPages: Math.ceil(federatedEvents.length / limit),
      },
    };
  }

  /**
   * 5. Void Activity
   */
  async voidActivity(activityId: string, actorUser: IUser, reason: string) {
    const activity = await this.prisma.crmActivity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');

    const updated = await this.prisma.crmActivity.update({
      where: { id: activityId },
      data: {
        isVoided: true,
        voidedReason: reason.trim(),
        voidedAt: new Date(),
        voidedById: actorUser.id,
      },
    });

    // Audit Log
    await this.auditService.logAction({
      action: 'DELETE',
      entity: 'CrmActivity',
      entityId: activityId,
      userId: actorUser.id,
      userName: actorUser.fullName || actorUser.email,
      newValue: { isVoided: true, voidedReason: reason },
    });

    return updated;
  }
}
