import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { Prisma } from '@prisma/client';
import { SystemConfigurationService } from '../settings/system-configuration.service';
import { DataScopeService } from '../auth/data-scope.service';

export interface LogActionPayload {
  module?: string;
  action: string;
  description?: string;
  entity?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  userId?: string;
  roleId?: string;
  userName?: string;
  email?: string;
  avatar?: string;
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  operatingSystem?: string;
  deviceType?: string;
  requestMethod?: string;
  endpoint?: string;
  sessionId?: string;
  requestId?: string;
  executionTime?: number;
  severity?: string;
  status?: string;
  oldValue?: any;
  newValue?: any;
  oldData?: any;
  newData?: any;
  changes?: any;
  country?: string;
  state?: string;
  city?: string;
  metadata?: any;
  targetUserId?: string;
  positionId?: string;
  positionCode?: string;
  companyEmail?: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshtoken',
  'accesstoken',
  'smtppassword',
  'secret',
  'otp',
  'pin',
  'cvv',
  'cardnumber',
  'jwt',
]);

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SystemConfigurationService))
    private readonly configService?: SystemConfigurationService,
    @Inject(forwardRef(() => DataScopeService))
    private readonly dataScopeService?: DataScopeService,
  ) {}

  /**
   * Sanitize an object to mask sensitive credential fields
   */
  private sanitizeData(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeData(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret')) {
        sanitized[key] = '********';
      } else if (lowerKey === 'aadhaar' || lowerKey === 'aadhaarnumber') {
        sanitized[key] = typeof val === 'string' && val.length >= 4 ? `XXXX-XXXX-${val.slice(-4)}` : 'XXXX-XXXX-XXXX';
      } else if (lowerKey === 'pan' || lowerKey === 'pannumber') {
        sanitized[key] = typeof val === 'string' && val.length >= 4 ? `${val.slice(0, 2)}****${val.slice(-2)}` : 'ABCDE****F';
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = this.sanitizeData(val);
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }

  /**
   * Log an audit event with automatic sanitized JSON diff computation
   */
  async logAction(payload: LogActionPayload) {
    const rawOld = payload.oldData || payload.oldValue;
    const rawNew = payload.newData || payload.newValue;

    const oldObj = this.sanitizeData(rawOld);
    const newObj = this.sanitizeData(rawNew);

    let diff = payload.changes ? this.sanitizeData(payload.changes) : null;
    if (!diff && oldObj && newObj) {
      diff = this.calculateDiff(oldObj, newObj);
    }

    try {
      return await this.prisma.auditLog.create({
        data: {
          module: payload.module || 'SYSTEM',
          action: payload.action,
          description:
            payload.description || `${payload.action} operation executed`,
          entity: payload.entity || payload.entityType || null,
          entityType: payload.entityType || payload.entity || null,
          entityId: payload.entityId || null,
          entityName: payload.entityName || null,
          userId: payload.userId || null,
          roleId: payload.roleId || null,
          positionId: payload.positionId || null,
          positionCode: payload.positionCode || null,
          companyEmail: payload.companyEmail || null,
          targetUserId: payload.targetUserId || null,
          userName: payload.userName || 'System / Guest',
          email: payload.email || null,
          avatar: payload.avatar || null,
          ipAddress: payload.ipAddress || '127.0.0.1',
          userAgent: payload.userAgent || null,
          browser: payload.browser || 'Browser',
          operatingSystem: payload.operatingSystem || 'OS',
          deviceType: payload.deviceType || 'Desktop',
          requestMethod: payload.requestMethod || 'GET',
          endpoint: payload.endpoint || '/api',
          sessionId: payload.sessionId || null,
          requestId: payload.requestId || `REQ-${Date.now()}`,
          executionTime: payload.executionTime || 12,
          severity: payload.severity || 'INFO',
          status: payload.status || 'SUCCESS',
          oldValue: oldObj
            ? (oldObj as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          newValue: newObj
            ? (newObj as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          oldData: oldObj ? (oldObj as Prisma.InputJsonValue) : Prisma.JsonNull,
          newData: newObj ? (newObj as Prisma.InputJsonValue) : Prisma.JsonNull,
          changes: diff ? (diff as Prisma.InputJsonValue) : Prisma.JsonNull,
          country: payload.country || 'India',
          state: payload.state || null,
          city: payload.city || null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Audit log creation failed: ${err.message}`);
    }
  }

  /**
   * Calculate JSON difference (added, removed, modified fields)
   */
  private calculateDiff(oldObj: any, newObj: any) {
    if (
      typeof oldObj !== 'object' ||
      typeof newObj !== 'object' ||
      !oldObj ||
      !newObj
    ) {
      return null;
    }

    const added: Record<string, any> = {};
    const removed: Record<string, any> = {};
    const updated: Record<string, { from: any; to: any }> = {};

    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    allKeys.forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret')) return;

      if (!(key in oldObj)) {
        added[key] = newObj[key];
      } else if (!(key in newObj)) {
        removed[key] = oldObj[key];
      } else if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        updated[key] = { from: oldObj[key], to: newObj[key] };
      }
    });

    return { added, removed, updated };
  }

  /**
   * Search and filter audit logs with pagination & role scoping
   */
  async findAll(query: AuditQueryDto, userRole?: string, userId?: string) {
    const where: Prisma.AuditLogWhereInput = {};

    // Role-based restrictions
    if (userRole === 'COUNSELOR' && userId) {
      where.userId = userId;
    } else if (userRole === 'STUDENT' && userId) {
      where.userId = userId;
    } else if (query.userId) {
      where.userId = query.userId;
    }

    if (query.search) {
      where.OR = [
        { userName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { action: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { module: { contains: query.search, mode: 'insensitive' } },
        { entityType: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
        { ipAddress: { contains: query.search, mode: 'insensitive' } },
        { requestId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.module) where.module = query.module;
    if (query.action) where.action = query.action;
    if (query.severity) where.severity = query.severity;
    if (query.status) where.status = query.status;
    if (query.securityOnly) where.severity = { in: ['SECURITY', 'CRITICAL'] };
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.positionId) where.positionId = query.positionId;
    if (query.targetUserId) where.targetUserId = query.targetUserId;
    if (query.requestId) where.requestId = query.requestId;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
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

  /**
   * Complete Chronological Audit History for a specific entity
   */
  async getEntityTimeline(entityType: string, entityId: string, limit: number = 100) {
    return this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType, entityId },
          { entity: entityType, entityId },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get Live Audit Statistics & Dashboard Metrics
   */
  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalActivities,
      todayActivities,
      successfulActions,
      failedActions,
      securityEvents,
      criticalEvents,
      activeUsersGroup,
      avgExecutionRes,
      moduleGroups,
    ] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.auditLog.count({ where: { status: 'SUCCESS' } }),
      this.prisma.auditLog.count({ where: { status: 'FAILED' } }),
      this.prisma.auditLog.count({ where: { severity: 'SECURITY' } }),
      this.prisma.auditLog.count({ where: { severity: 'CRITICAL' } }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        _count: { userId: true },
        where: { userId: { not: null } },
      }),
      this.prisma.auditLog.aggregate({
        _avg: { executionTime: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['module'],
        _count: { module: true },
        orderBy: { _count: { module: 'desc' } },
        take: 1,
      }),
    ]);

    const avgResponseTimeMs = Math.round(
      avgExecutionRes._avg.executionTime || 14,
    );
    const topActiveModule =
      moduleGroups.length > 0 ? moduleGroups[0].module : 'CRM';

    return {
      totalActivities,
      todayActivities,
      successfulActions,
      failedActions,
      securityEvents,
      criticalEvents,
      activeUsers: activeUsersGroup.length || 1,
      avgResponseTimeMs,
      topActiveModule,
      requestsToday: todayActivities,
    };
  }

  /**
   * Get single log by ID
   */
  async findOne(id: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Audit Log entry "${id}" not found`);
    }
    return log;
  }

  /**
   * Export audit logs in JSON or CSV with Meta-Audit
   */
  async exportLogs(query: AuditQueryDto, actorUserId?: string, format: 'json' | 'csv' = 'json') {
    const exportLimit = this.configService
      ? await this.configService.getNumber('audit.exportLimit', 2000)
      : 2000;

    const { data } = await this.findAll({ ...query, limit: exportLimit });

    // Meta-Audit: Log that an export occurred
    if (actorUserId) {
      await this.logAction({
        module: 'AUDIT',
        action: 'AUDIT_EXPORT_CREATED',
        description: `Exported ${data.length} audit logs in ${format.toUpperCase()} format`,
        userId: actorUserId,
        severity: 'SECURITY',
        metadata: { format, recordCount: data.length, filters: query },
      }).catch(() => {});
    }

    if (format === 'json') {
      return data;
    }

    // Convert to CSV
    const headers = [
      'Timestamp',
      'User',
      'Email',
      'Role',
      'Module',
      'Action',
      'Entity Type',
      'Entity ID',
      'Severity',
      'Status',
      'IP Address',
      'Endpoint',
      'Execution Time (ms)',
    ];
    const rows = data.map((l) => [
      `"${l.createdAt.toISOString()}"`,
      `"${l.userName || ''}"`,
      `"${l.email || ''}"`,
      `"${l.roleId || ''}"`,
      `"${l.module}"`,
      `"${l.action}"`,
      `"${l.entityType || l.entity || ''}"`,
      `"${l.entityId || ''}"`,
      `"${l.severity}"`,
      `"${l.status}"`,
      `"${l.ipAddress || ''}"`,
      `"${l.endpoint || ''}"`,
      l.executionTime || 0,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Personal activity for student or counselor dashboard
   */
  async getMyActivity(userId: string) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      take: 30,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Append-only protection: Arbitrary deletion is strictly forbidden
   */
  async clearLogs() {
    throw new ForbiddenException(
      'Audit logs are append-only immutable records and cannot be cleared.',
    );
  }
}

