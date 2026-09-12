import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GovernanceRequestStatus } from '@prisma/client';

export interface CreateGovernanceRequestDto {
  actionType: string;
  targetRoleId?: string;
  payload?: any;
  reason: string;
}

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async resolveAuditUserId(userId?: string): Promise<string | null> {
    if (!userId) return null;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      return user ? user.id : null;
    } catch {
      return null;
    }
  }

  /**
   * Verify that an action will not lock out all privileged administrators from the system
   */
  async ensureNoLockout(
    targetRoleId?: string,
    targetUserId?: string,
  ): Promise<void> {
    // Find all active Super Admin / Admin users with active roles
    const activeAdminUsers = await this.prisma.user.findMany({
      where: {
        isApproved: true,
        OR: [
          { role: 'SUPER_ADMIN' },
          { role: 'ADMIN' },
          {
            userRoles: {
              some: {
                role: {
                  isProtected: true,
                  status: 'ACTIVE',
                  isActive: true,
                  deletedAt: null,
                },
              },
            },
          },
        ],
      },
      select: { id: true, email: true },
    });

    if (targetUserId) {
      const remaining = activeAdminUsers.filter((u) => u.id !== targetUserId);
      if (remaining.length === 0) {
        throw new BadRequestException(
          'Privilege Lockout Protection: Cannot perform this action. The system requires at least one active privileged administrator.',
        );
      }
    }

    if (targetRoleId) {
      const targetRoleUsers = await this.prisma.userRole.findMany({
        where: { roleId: targetRoleId },
        select: { userId: true },
      });
      const targetUserIds = new Set(targetRoleUsers.map((ur) => ur.userId));
      const remaining = activeAdminUsers.filter(
        (u) => !targetUserIds.has(u.id),
      );

      if (remaining.length === 0 && activeAdminUsers.length > 0) {
        throw new BadRequestException(
          'Privilege Lockout Protection: Disabling/Locking this role would leave the system without any active privileged administrators.',
        );
      }
    }
  }

  /**
   * Create a new Governance 2-Person Approval Request
   */
  async createRequest(dto: CreateGovernanceRequestDto, requestedById?: string) {
    if (!dto.actionType) {
      throw new BadRequestException('actionType is required');
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException(
        'A descriptive business reason is required for governance requests',
      );
    }

    // Verify target role exists if provided
    let targetRole: any = null;
    if (dto.targetRoleId) {
      targetRole = await this.prisma.roleEntity.findUnique({
        where: { id: dto.targetRoleId },
      });
      if (!targetRole) {
        throw new NotFoundException(
          `Target role with ID "${dto.targetRoleId}" not found`,
        );
      }
    }

    const validRequestedById = await this.resolveAuditUserId(requestedById);

    const request = await this.prisma.governanceRequest.create({
      data: {
        actionType: dto.actionType,
        targetRoleId: dto.targetRoleId || null,
        payload: dto.payload || {},
        reason: dto.reason.trim(),
        status: GovernanceRequestStatus.PENDING,
        requestedById: validRequestedById,
      },
      include: {
        targetRole: {
          select: { id: true, name: true, slug: true, isProtected: true },
        },
        requestedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Create Audit Log entry
    await this.prisma.roleAuditLog.create({
      data: {
        roleId: dto.targetRoleId || null,
        userId: validRequestedById,
        action: 'GOVERNANCE_REQUEST_CREATED',
        newValue: {
          requestId: request.id,
          actionType: request.actionType,
          targetRole: targetRole?.name,
          reason: request.reason,
        },
        reason: `Governance request #${request.id} created for action ${request.actionType}`,
      },
    });

    this.logger.log(
      `Governance request created: #${request.id} (${dto.actionType}) by user ${requestedById}`,
    );
    return request;
  }

  /**
   * List governance requests with optional status filtering
   */
  async findAll(status?: GovernanceRequestStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.governanceRequest.findMany({
      where,
      include: {
        targetRole: {
          select: {
            id: true,
            name: true,
            slug: true,
            isProtected: true,
            status: true,
          },
        },
        requestedBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        approvedBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single governance request
   */
  async findOne(id: string) {
    const request = await this.prisma.governanceRequest.findUnique({
      where: { id },
      include: {
        targetRole: true,
        requestedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!request) {
      throw new NotFoundException(`Governance request #${id} not found`);
    }

    return request;
  }

  /**
   * Reject a governance request
   */
  async rejectRequest(requestId: string, rejectorId: string, reason: string) {
    const request = await this.findOne(requestId);

    if (request.status !== GovernanceRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject request with status ${request.status}`,
      );
    }

    if (!reason || !reason.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    const validRejectorId = await this.resolveAuditUserId(rejectorId);

    const updated = await this.prisma.governanceRequest.update({
      where: { id: requestId },
      data: {
        status: GovernanceRequestStatus.REJECTED,
        approvedById: validRejectorId,
        rejectionReason: reason.trim(),
      },
    });

    await this.prisma.roleAuditLog.create({
      data: {
        roleId: request.targetRoleId,
        userId: validRejectorId,
        action: 'GOVERNANCE_REQUEST_REJECTED',
        oldValue: { status: GovernanceRequestStatus.PENDING },
        newValue: {
          status: GovernanceRequestStatus.REJECTED,
          rejectionReason: reason,
        },
        reason: `Governance request #${requestId} rejected: ${reason}`,
      },
    });

    return updated;
  }
}
