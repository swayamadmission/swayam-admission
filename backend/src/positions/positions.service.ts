import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailProvisioningService } from './email-provisioning.service';
import {
  CreatePositionDto,
  UpdatePositionDto,
  AssignEmployeeDto,
  TransferPositionDto,
  GenerateEmailDto,
} from './dto/position.dto';

@Injectable()
export class PositionsService {
  private readonly logger = new Logger(PositionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProvisioningService: EmailProvisioningService,
  ) {}

  /**
   * List all positions with filters and current active holder
   */
  async findAll(query: {
    search?: string;
    departmentId?: string;
    unitId?: string;
    roleId?: string;
    stateId?: string;
    districtId?: string;
    positionStatus?: string;
    emailStatus?: string;
    vacantOnly?: boolean;
  }) {
    const where: any = {};

    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.unitId) where.unitId = query.unitId;
    if (query.roleId) where.roleId = query.roleId;
    if (query.stateId) where.stateId = query.stateId;
    if (query.districtId) where.districtId = query.districtId;
    if (query.positionStatus && query.positionStatus !== 'ALL') {
      where.positionStatus = query.positionStatus;
    }
    if (query.emailStatus && query.emailStatus !== 'ALL') {
      where.emailStatus = query.emailStatus;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { companyEmail: { contains: s, mode: 'insensitive' } },
      ];
    }

    const positions = await this.prisma.position.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        unit: { select: { id: true, name: true, code: true } },
        roleEntity: { select: { id: true, name: true, slug: true, color: true } },
        state: { select: { id: true, name: true, code: true } },
        district: { select: { id: true, name: true, code: true } },
        assignments: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                employeeId: true,
                email: true,
                mobile: true,
                avatar: true,
                status: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = positions.map((pos) => {
      const activeAssignment = pos.assignments[0] || null;
      return {
        id: pos.id,
        code: pos.code,
        title: pos.title,
        description: pos.description,
        companyEmail: pos.companyEmail,
        emailStatus: pos.emailStatus,
        positionStatus: pos.positionStatus,
        isMultiHolder: pos.isMultiHolder,
        selfServicePasswordReset: pos.selfServicePasswordReset,
        department: pos.department,
        unit: pos.unit,
        role: pos.roleEntity,
        state: pos.state,
        district: pos.district,
        createdAt: pos.createdAt,
        totalHistoricalHolders: pos._count.assignments,
        isVacant: !activeAssignment,
        currentHolder: activeAssignment
          ? {
              assignmentId: activeAssignment.id,
              joinedAt: activeAssignment.joinedAt,
              mailboxHandoverStatus: activeAssignment.mailboxHandoverStatus,
              user: activeAssignment.user,
            }
          : null,
      };
    });

    if (query.vacantOnly) {
      return formatted.filter((p) => p.isVacant);
    }

    return formatted;
  }

  /**
   * Get position details with full historical employment assignment trail
   */
  async findOne(id: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        department: true,
        unit: true,
        roleEntity: true,
        state: true,
        district: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        assignments: {
          orderBy: { joinedAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                employeeId: true,
                email: true,
                personalEmail: true,
                mobile: true,
                personalMobile: true,
                avatar: true,
                status: true,
                isActive: true,
                kycStatus: true,
                joiningDate: true,
              },
            },
            assignedBy: {
              select: { id: true, fullName: true, email: true },
            },
            approvedBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }

    const currentAssignment =
      position.assignments.find((a) => a.status === 'ACTIVE') || null;
    const historicalHolders = position.assignments.filter(
      (a) => a.status !== 'ACTIVE',
    );

    return {
      ...position,
      currentHolder: currentAssignment,
      historicalHolders,
    };
  }

  /**
   * Create a new organizational Position
   */
  async create(dto: CreatePositionDto, adminId?: string) {
    // 1. Generate position code if not specified
    let code = dto.code ? dto.code.trim().toUpperCase() : '';
    if (!code) {
      const count = await this.prisma.position.count();
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
        select: { code: true },
      });
      const deptPrefix = dept?.code ? dept.code.toUpperCase() : 'POS';
      code = `${deptPrefix}-${String(count + 1).padStart(4, '0')}`;
    }

    const existingCode = await this.prisma.position.findUnique({
      where: { code },
    });
    if (existingCode) {
      throw new ConflictException(`Position code '${code}' already exists`);
    }

    // 2. Generate or validate company email
    let companyEmail = dto.companyEmail ? dto.companyEmail.trim().toLowerCase() : '';
    if (!companyEmail) {
      let roleSlug = 'staff';
      if (dto.roleId) {
        const role = await this.prisma.roleEntity.findUnique({
          where: { id: dto.roleId },
          select: { slug: true },
        });
        if (role) roleSlug = role.slug;
      }

      let stateCode: string | undefined;
      let stateName: string | undefined;
      if (dto.stateId) {
        const state = await this.prisma.state.findUnique({
          where: { id: dto.stateId },
          select: { code: true, name: true },
        });
        if (state) {
          stateCode = state.code;
          stateName = state.name;
        }
      }

      let districtName: string | undefined;
      if (dto.districtId) {
        const district = await this.prisma.district.findUnique({
          where: { id: dto.districtId },
          select: { name: true },
        });
        if (district) districtName = district.name;
      }

      companyEmail = this.emailProvisioningService.generateEmailAddress({
        roleSlug,
        stateCode,
        stateName,
        districtName,
      });
    }

    const existingEmail = await this.prisma.position.findUnique({
      where: { companyEmail },
    });
    if (existingEmail) {
      throw new ConflictException(
        `Company email '${companyEmail}' is already bound to position '${existingEmail.code}'`,
      );
    }

    // 3. Create Position
    const position = await this.prisma.position.create({
      data: {
        code,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        departmentId: dto.departmentId,
        unitId: dto.unitId,
        roleId: dto.roleId,
        companyEmail,
        emailStatus: 'ACTIVE',
        positionStatus: 'VACANT',
        stateId: dto.stateId,
        districtId: dto.districtId,
        isMultiHolder: dto.isMultiHolder ?? false,
        selfServicePasswordReset: dto.selfServicePasswordReset ?? false,
        createdById: adminId,
      },
      include: {
        department: true,
        roleEntity: true,
      },
    });

    // 4. Provision Email Identity
    await this.emailProvisioningService.provisionPositionEmail(
      companyEmail,
      dto.title,
    );

    // 5. Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'POSITION_CREATED',
        module: 'ORGANIZATION',
        severity: 'INFO',
        status: 'SUCCESS',
        description: `Position '${position.title}' (${position.code}) created with email ${position.companyEmail}`,
        positionId: position.id,
        positionCode: position.code,
        companyEmail: position.companyEmail,
        newData: {
          id: position.id,
          code: position.code,
          title: position.title,
          companyEmail: position.companyEmail,
        },
      },
    });

    return position;
  }

  /**
   * Update Position details
   */
  async update(id: string, dto: UpdatePositionDto, adminId?: string) {
    const existing = await this.prisma.position.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }

    const updated = await this.prisma.position.update({
      where: { id },
      data: {
        title: dto.title?.trim() || existing.title,
        description: dto.description !== undefined ? dto.description : existing.description,
        departmentId: dto.departmentId || existing.departmentId,
        unitId: dto.unitId !== undefined ? dto.unitId : existing.unitId,
        roleId: dto.roleId !== undefined ? dto.roleId : existing.roleId,
        stateId: dto.stateId !== undefined ? dto.stateId : existing.stateId,
        districtId: dto.districtId !== undefined ? dto.districtId : existing.districtId,
        positionStatus: dto.positionStatus || existing.positionStatus,
        emailStatus: dto.emailStatus || existing.emailStatus,
        selfServicePasswordReset:
          dto.selfServicePasswordReset !== undefined
            ? dto.selfServicePasswordReset
            : existing.selfServicePasswordReset,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'POSITION_UPDATED',
        module: 'ORGANIZATION',
        severity: 'INFO',
        status: 'SUCCESS',
        description: `Position '${updated.title}' (${updated.code}) updated`,
        positionId: updated.id,
        positionCode: updated.code,
        companyEmail: updated.companyEmail,
        oldData: existing as any,
        newData: updated as any,
      },
    });

    return updated;
  }

  /**
   * Assign an employee to a position (enforcing one current holder by default)
   */
  async assignEmployee(
    positionId: string,
    dto: AssignEmployeeDto,
    adminId?: string,
  ) {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      include: {
        assignments: { where: { status: 'ACTIVE' } },
      },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${positionId} not found`);
    }

    if (position.positionStatus === 'RETIRED') {
      throw new BadRequestException(
        `Cannot assign employee to a RETIRED position.`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Default rule: One position -> One current active holder
    if (!position.isMultiHolder && position.assignments.length > 0) {
      const currentActive = position.assignments[0];
      if (currentActive.userId === dto.userId) {
        throw new BadRequestException(
          `User is already the active holder of this position.`,
        );
      }

      // Close previous holder's assignment cleanly with audit trail
      await this.prisma.positionAssignment.update({
        where: { id: currentActive.id },
        data: {
          status: 'ENDED',
          endedAt: new Date(),
          changeReason: dto.reason || 'REPLACEMENT',
          approvedById: adminId,
          mailboxHandoverStatus: 'REVOKED',
          notes: `Replaced by ${user.fullName} (${user.id})`,
        },
      });

      // Handle mailbox handover protocol
      await this.emailProvisioningService.handleMailboxHandover({
        companyEmail: position.companyEmail,
        previousUserId: currentActive.userId,
        newUserId: dto.userId,
      });
    }

    // Create the new active assignment
    const assignment = await this.prisma.positionAssignment.create({
      data: {
        positionId,
        userId: dto.userId,
        status: 'ACTIVE',
        joinedAt: new Date(),
        changeReason: dto.reason || 'INITIAL_ASSIGNMENT',
        assignedById: adminId,
        approvedById: adminId,
        mailboxHandoverStatus: 'GRANTED',
        notes: dto.notes,
      },
      include: {
        user: true,
        position: true,
      },
    });

    // Update position status to ACTIVE
    await this.prisma.position.update({
      where: { id: positionId },
      data: { positionStatus: 'ACTIVE' },
    });

    // If forcePasswordChange requested, update user flag
    if (dto.forcePasswordChange) {
      await this.prisma.user.update({
        where: { id: dto.userId },
        data: { mustChangePassword: true },
      });
    }

    // Record Audit
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'STAFF_POSITION_ASSIGNED',
        module: 'ORGANIZATION',
        severity: 'INFO',
        status: 'SUCCESS',
        description: `Assigned employee '${user.fullName}' (ID: ${user.employeeId || user.id}) to Position '${position.title}' (${position.code}) with email ${position.companyEmail}`,
        positionId: position.id,
        positionCode: position.code,
        companyEmail: position.companyEmail,
        targetUserId: user.id,
        newData: {
          assignmentId: assignment.id,
          userId: user.id,
          userName: user.fullName,
          positionId: position.id,
          positionEmail: position.companyEmail,
        },
      },
    });

    return assignment;
  }

  /**
   * Transfer employee from one position to another
   */
  async transferEmployee(
    currentPositionId: string,
    dto: TransferPositionDto,
    adminId?: string,
  ) {
    const currentPos = await this.prisma.position.findUnique({
      where: { id: currentPositionId },
      include: {
        assignments: { where: { status: 'ACTIVE' } },
      },
    });

    if (!currentPos || currentPos.assignments.length === 0) {
      throw new NotFoundException(
        `No active assignment found for position ID ${currentPositionId}`,
      );
    }

    const currentAssignment = currentPos.assignments[0];
    const targetPosition = await this.prisma.position.findUnique({
      where: { id: dto.targetPositionId },
    });

    if (!targetPosition) {
      throw new NotFoundException(
        `Target position ID ${dto.targetPositionId} not found`,
      );
    }

    // 1. End old assignment with TRANSFERRED status
    await this.prisma.positionAssignment.update({
      where: { id: currentAssignment.id },
      data: {
        status: 'TRANSFERRED',
        endedAt: new Date(),
        changeReason: dto.reason || 'TRANSFER',
        approvedById: adminId,
        notes: `Transferred to position ${targetPosition.code} (${targetPosition.title})`,
      },
    });

    // 2. Assign to target position
    const newAssignment = await this.assignEmployee(
      dto.targetPositionId,
      {
        userId: currentAssignment.userId,
        reason: dto.reason || 'TRANSFER',
        notes: dto.notes,
      },
      adminId,
    );

    // 3. Log Audit
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'STAFF_TRANSFERRED',
        module: 'ORGANIZATION',
        severity: 'INFO',
        status: 'SUCCESS',
        description: `Transferred user ID ${currentAssignment.userId} from ${currentPos.code} (${currentPos.companyEmail}) to ${targetPosition.code} (${targetPosition.companyEmail})`,
        positionId: targetPosition.id,
        positionCode: targetPosition.code,
        companyEmail: targetPosition.companyEmail,
        targetUserId: currentAssignment.userId,
      },
    });

    return newAssignment;
  }

  /**
   * Retire a position permanently
   */
  async retirePosition(id: string, reason?: string, adminId?: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        assignments: { where: { status: 'ACTIVE' } },
      },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }

    // End any active assignments
    for (const a of position.assignments) {
      await this.prisma.positionAssignment.update({
        where: { id: a.id },
        data: {
          status: 'ENDED',
          endedAt: new Date(),
          changeReason: 'POSITION_RETIRED',
          approvedById: adminId,
          notes: reason || 'Position retired by administration',
        },
      });
    }

    const retired = await this.prisma.position.update({
      where: { id },
      data: {
        positionStatus: 'RETIRED',
        emailStatus: 'RETIRED',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'POSITION_RETIRED',
        module: 'ORGANIZATION',
        severity: 'WARN',
        status: 'SUCCESS',
        description: `Position '${position.title}' (${position.code}) permanently RETIRED. Reason: ${reason || 'Administrative decision'}`,
        positionId: position.id,
        positionCode: position.code,
        companyEmail: position.companyEmail,
      },
    });

    return retired;
  }

  /**
   * Generate email preview for position
   */
  generateEmailPreview(dto: GenerateEmailDto) {
    const email = this.emailProvisioningService.generateEmailAddress({
      roleSlug: dto.roleSlug,
      stateCode: dto.stateCode,
      districtName: dto.districtName,
      departmentCode: dto.departmentCode,
    });
    return { generatedEmail: email };
  }
}
