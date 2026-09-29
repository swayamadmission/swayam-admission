import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface LogAccessParams {
  documentId?: string | null;
  studentId?: string | null;
  applicationId?: string | null;
  actorUserId: string;
  actorRole: string;
  staffId?: string | null;
  action:
    | 'UPLOAD'
    | 'VIEW'
    | 'PREVIEW'
    | 'DOWNLOAD'
    | 'REPLACE'
    | 'VERIFY'
    | 'REJECT'
    | 'DELETE_REQUEST'
    | 'DELETE_APPROVED'
    | 'DELETE_REJECTED'
    | 'DELETE_HOLD'
    | 'DELETE_SCHEDULED'
    | 'DELETE_EXECUTED'
    | 'DELETE_CANCELLED'
    | 'DELETION_SKIPPED_HOLD'
    | 'ARCHIVE'
    | 'RESTORE'
    | 'ACCESS_DENIED'
    | 'SHARE'
    | 'ACCESS_REVOKED'
    | 'NOTIFICATION_RESENT'
    | 'DELETE_FAILED'
    | 'RETENTION_CLEANUP_RUN';
  result: 'SUCCESS' | 'DENIED' | 'FAILED';
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface AuditQueryFilters {
  documentId?: string;
  studentId?: string;
  applicationId?: string;
  actorUserId?: string;
  actorRole?: string;
  staffId?: string;
  action?: string;
  result?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class DocumentAuditService {
  private readonly logger = new Logger(DocumentAuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Mask sensitive identifiers like Aadhaar or PAN before storing in audit metadata/reason
   */
  maskSensitiveData(text?: string | null): string | undefined {
    if (!text) return undefined;
    // Mask Aadhaar: 12-digit number (e.g. 1234 5678 9012 or 123456789012) -> XXXX XXXX 9012
    let sanitized = text.replace(
      /\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})\b/g,
      'XXXX XXXX $3',
    );
    // Mask PAN: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F) -> XXXXX1234X
    sanitized = sanitized.replace(
      /\b([A-Z]{5})(\d{4})([A-Z]{1})\b/gi,
      'XXXXX$2X',
    );
    return sanitized;
  }

  /**
   * Mask Aadhaar to standard XXXX XXXX 1234 format
   */
  maskAadhaar(aadhaar?: string | null): string {
    if (!aadhaar) return '';
    const clean = aadhaar.replace(/[\s-]/g, '');
    if (clean.length < 4) return 'XXXX';
    const last4 = clean.slice(-4);
    return `XXXX XXXX ${last4}`;
  }

  /**
   * Mask PAN to standard XXXXX1234X format
   */
  maskPan(pan?: string | null): string {
    if (!pan) return '';
    const clean = pan.trim();
    if (clean.length < 5) return 'XXXXX';
    const last5 = clean.slice(-5);
    return `XXXXX${last5}`;
  }

  /**
   * Log an immutable Document Access Audit entry
   */
  async logAccess(params: LogAccessParams): Promise<void> {
    try {
      // Clean metadata to ensure no sensitive files/tokens/credentials are persisted
      const cleanMetadata: Record<string, any> = {};
      if (params.metadata) {
        for (const [key, value] of Object.entries(params.metadata)) {
          if (
            ['token', 'jwt', 'password', 'fileUrl', 'storageKey', 'secret', 'key'].includes(
              key.toLowerCase(),
            )
          ) {
            continue;
          }
          if (typeof value === 'string') {
            cleanMetadata[key] = this.maskSensitiveData(value);
          } else {
            cleanMetadata[key] = value;
          }
        }
      }

      await this.prisma.documentAccessAudit.create({
        data: {
          documentId: params.documentId || null,
          studentId: params.studentId || null,
          applicationId: params.applicationId || null,
          actorUserId: params.actorUserId,
          actorRole: params.actorRole,
          staffId: params.staffId || null,
          action: params.action,
          result: params.result,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent ? params.userAgent.substring(0, 255) : null,
          reason: this.maskSensitiveData(params.reason),
          metadata: cleanMetadata,
        },
      });

      if (params.result === 'DENIED') {
        this.logger.warn(
          `[SECURITY AUDIT] ACCESS_DENIED for user=${params.actorUserId} role=${params.actorRole} doc=${params.documentId} reason=${params.reason}`,
        );
      }
    } catch (err: any) {
      // Never let audit logging failure crash the whole flow, but log critical error
      this.logger.error(`Failed to record DocumentAccessAudit: ${err.message}`, err.stack);
    }
  }

  /**
   * Query Document Access Audit Logs for Admin
   */
  async getAuditLogs(filters: AuditQueryFilters) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.documentId) where.documentId = filters.documentId;
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.applicationId) where.applicationId = filters.applicationId;
    if (filters.actorUserId) where.actorUserId = filters.actorUserId;
    if (filters.actorRole) where.actorRole = filters.actorRole;
    if (filters.staffId) where.staffId = { contains: filters.staffId, mode: 'insensitive' };
    if (filters.action) where.action = filters.action;
    if (filters.result) where.result = filters.result;

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.documentAccessAudit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.documentAccessAudit.count({ where }),
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
