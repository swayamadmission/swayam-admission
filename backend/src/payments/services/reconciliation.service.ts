import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DataScopeService } from '../../auth/data-scope.service';
import { AuditService } from '../../audit/audit.service';

export interface SettlementRecord {
  transactionReference: string;
  amount: number;
  currency?: string;
  settlementDate?: Date;
  settlementBatch?: string;
  collegeId: string;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScopeService: DataScopeService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Process a batch of external settlement records and match with internal payments
   */
  async processSettlementBatch(records: SettlementRecord[], adminUserId: string) {
    const results: any[] = [];

    for (const rec of records) {
      const year = new Date().getFullYear();
      const randomId = Math.floor(100000 + Math.random() * 900000);
      const reconciliationId = `REC-${year}-${randomId}`;

      // Search matching internal payment by transactionId, transactionReference, utrNumber, or gatewayOrderId
      const internalPayment = await this.prisma.payment.findFirst({
        where: {
          OR: [
            { transactionId: rec.transactionReference },
            { transactionReference: rec.transactionReference },
            { utrNumber: rec.transactionReference },
            { gatewayOrderId: rec.transactionReference },
            { gatewayTransactionId: rec.transactionReference },
          ],
        },
        include: {
          invoice: true,
        },
      });

      let status = 'MATCHED';
      let mismatchReason: string | null = null;
      let amountDifference = 0;

      if (!internalPayment) {
        status = 'UNMATCHED';
        mismatchReason = 'No internal payment found matching external settlement reference.';
      } else {
        const internalAmount = internalPayment.amount || internalPayment.paidAmount || 0;
        amountDifference = internalAmount - rec.amount;

        if (Math.abs(amountDifference) > 0.01) {
          status = 'AMOUNT_MISMATCH';
          mismatchReason = `Internal payment is ₹${internalAmount} but settlement reported ₹${rec.amount}. Difference: ₹${amountDifference}`;
        }
      }

      const recRecord = await this.prisma.paymentReconciliation.create({
        data: {
          reconciliationId,
          paymentId: internalPayment?.id || null,
          invoiceId: internalPayment?.invoiceId || null,
          collegeId: rec.collegeId,
          internalAmount: internalPayment?.amount || 0,
          settlementAmount: rec.amount,
          amountDifference,
          status,
          settlementReference: rec.transactionReference,
          settlementBatch: rec.settlementBatch || `BATCH-${Date.now().toString().slice(-6)}`,
          settlementDate: rec.settlementDate || new Date(),
          mismatchReason,
        },
      });

      results.push(recRecord);
    }

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'RECONCILIATION_BATCH_PROCESSED',
      entity: 'PaymentReconciliation',
      description: `Processed ${records.length} settlement records for reconciliation.`,
      metadata: { count: records.length },
    });

    return {
      success: true,
      data: results,
      message: `Successfully processed ${results.length} reconciliation records.`,
    };
  }

  /**
   * Get reconciliation queue with filters
   */
  async getQueue(
    params: {
      collegeId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    userId: string,
  ) {
    const ctx = await this.dataScopeService.resolveDataScope(userId);
    const where: any = {};

    if (ctx.isCollegeStaff && ctx.collegeId) {
      where.collegeId = ctx.collegeId;
    } else if (params.collegeId) {
      where.collegeId = params.collegeId;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      where.OR = [
        { reconciliationId: { contains: params.search, mode: 'insensitive' } },
        { settlementReference: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.paymentReconciliation.count({ where }),
      this.prisma.paymentReconciliation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          payment: {
            include: {
              user: true,
              application: true,
            },
          },
          invoice: true,
          college: true,
          resolvedBy: true,
        },
      }),
    ]);

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Resolve a reconciliation discrepancy
   */
  async resolveDiscrepancy(
    id: string,
    remarks: string,
    action: 'RESOLVE_MATCH' | 'FORCE_RECONCILE' | 'FLAG_FRAUD',
    userId: string,
  ) {
    const ctx = await this.dataScopeService.resolveDataScope(userId);
    if (!ctx.isSuperAdmin && !ctx.permissions.includes('payment.verify')) {
      throw new ForbiddenException('Permission Denied: Only Finance administrators can resolve reconciliation discrepancies');
    }

    const rec = await this.prisma.paymentReconciliation.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!rec) {
      throw new NotFoundException(`Reconciliation record ${id} not found`);
    }

    const updated = await this.prisma.paymentReconciliation.update({
      where: { id },
      data: {
        status: action === 'FLAG_FRAUD' ? 'PENDING_REVIEW' : 'RESOLVED',
        resolvedRemarks: remarks,
        resolvedById: userId,
        resolvedAt: new Date(),
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'RECONCILIATION_RESOLVED',
      entity: 'PaymentReconciliation',
      entityId: id,
      description: `Resolved reconciliation ${rec.reconciliationId}: ${action} - ${remarks}`,
      metadata: { reconciliationId: rec.reconciliationId, action },
    });

    return {
      success: true,
      data: updated,
      message: 'Reconciliation record resolved successfully.',
    };
  }
}
