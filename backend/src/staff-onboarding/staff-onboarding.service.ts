import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PositionsService } from '../positions/positions.service';
import {
  StaffRegisterDto,
  VerifyOtpDto,
  UploadStaffKycDto,
  VerifyKycDto,
  ApproveStaffDto,
  RejectStaffDto,
  ResignStaffDto,
  AdminPasswordResetDto,
  AdminPasswordChangeDto,
  FirstLoginPasswordChangeDto,
  StaffSecurityActionDto,
} from './dto/staff-onboarding.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

const bcryptLib = bcrypt as unknown as {
  hash: (s: string, saltOrRounds: number) => Promise<string>;
  compare: (s: string, hash: string) => Promise<boolean>;
};

@Injectable()
export class StaffOnboardingService {
  private readonly logger = new Logger(StaffOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly positionsService: PositionsService,
  ) {}

  /**
   * Get allowed roles for public staff registration
   * Dynamically returns all active, self-registrable, non-protected roles configured in IAM.
   */
  async getAllowedRoles() {
    const roles = await this.prisma.roleEntity.findMany({
      where: {
        selfRegistrable: true,
        isActive: true,
        isProtected: false,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        color: true,
        department: true,
        selfRegistrable: true,
        approvalRequired: true,
        roleType: true,
      },
      orderBy: { priority: 'desc' },
    });

    return roles;
  }

  /**
   * Public Staff Registration
   */
  async register(dto: StaffRegisterDto) {
    const requestedSlug = dto.requestedRoleSlug.trim().toLowerCase();

    // Security Gate: Target role must exist in DB and have selfRegistrable = true, isActive = true, isProtected = false
    const targetRole = await this.prisma.roleEntity.findFirst({
      where: {
        slug: requestedSlug,
        selfRegistrable: true,
        isActive: true,
        isProtected: false,
        deletedAt: null,
      },
    });

    if (!targetRole) {
      throw new ForbiddenException(
        `Role '${dto.requestedRoleSlug}' is protected or not open for public self-registration. Please contact administration.`,
      );
    }

    // Validate Geography (State existence + District state-membership)
    if (dto.requestedStateId) {
      const state = await this.prisma.state.findUnique({
        where: { id: dto.requestedStateId },
      });
      if (!state || state.status !== 'ACTIVE') {
        throw new BadRequestException('Selected state / region is invalid or inactive.');
      }

      if (dto.requestedDistrictId) {
        const district = await this.prisma.district.findFirst({
          where: {
            id: dto.requestedDistrictId,
            stateId: dto.requestedStateId,
            status: 'ACTIVE',
          },
        });
        if (!district) {
          throw new BadRequestException(
            `Selected district territory does not belong to state '${state.name}' or is inactive.`,
          );
        }
      }
    }

    const email = dto.personalEmail.trim().toLowerCase();
    const mobile = dto.personalMobile.trim();

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { mobile }, { personalEmail: email }, { personalMobile: mobile }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('Personal email or mobile number is already registered.');
    }

    const hashedPassword = await bcryptLib.hash(dto.password, 10);

    const isCounselor = requestedSlug === 'counselor';
    const isSeniorCounselor = requestedSlug === 'senior-counselor';

    let userRoleEnum: Role = Role.COUNSELOR;
    if (isSeniorCounselor) userRoleEnum = Role.SENIOR_COUNSELOR;

    // Create User in PENDING_APPROVAL status
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        mobile,
        personalEmail: email,
        personalMobile: mobile,
        password: hashedPassword,
        role: userRoleEnum,
        isApproved: false,
        isActive: true,
        status: 'PENDING_APPROVAL',
        kycStatus: 'NOT_SUBMITTED',
        selfServicePasswordReset: isCounselor,
        city: dto.city?.trim(),
      },
    });

    // Create StaffRegistrationRequest
    const request = await this.prisma.staffRegistrationRequest.create({
      data: {
        userId: user.id,
        requestedRoleSlug: requestedSlug,
        requestedStateId: dto.requestedStateId,
        requestedDistrictId: dto.requestedDistrictId,
        referralCode: dto.referralCode?.trim(),
        personalEmail: email,
        personalMobile: mobile,
        fullName: dto.fullName.trim(),
        kycStatus: 'NOT_SUBMITTED',
        approvalStatus: 'PENDING',
      },
    });

    // Create CounselorProfile record if needed
    try {
      const counselorId = `CO-${Math.floor(100000 + Math.random() * 900000)}`;
      await this.prisma.counselorProfile.create({
        data: {
          userId: user.id,
          counselorId,
          department: 'Admissions',
          designation: isSeniorCounselor ? 'Senior Counselor' : 'Counselor',
          employmentStatus: 'PENDING',
          role: isSeniorCounselor ? Role.SENIOR_COUNSELOR : Role.COUNSELOR,
        },
      });
    } catch (e) {
      this.logger.warn(`CounselorProfile creation notice: ${e}`);
    }

    // Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'STAFF_REGISTRATION_SUBMITTED',
        module: 'STAFF_ONBOARDING',
        severity: 'INFO',
        status: 'SUCCESS',
        description: `Staff candidate '${user.fullName}' submitted registration for role '${requestedSlug}'`,
        targetUserId: user.id,
        newData: {
          requestId: request.id,
          userId: user.id,
          requestedRole: requestedSlug,
          personalEmail: email,
        },
      },
    });

    const { password, ...userWithoutPassword } = user;

    return {
      message: 'Staff registration submitted successfully. Please complete OTP & KYC verification.',
      requestId: request.id,
      user: userWithoutPassword,
      requiresKyc: isSeniorCounselor,
      selfServicePasswordReset: isCounselor,
    };
  }

  /**
   * Verify Mobile / Email OTP
   */
  async verifyOtp(dto: VerifyOtpDto) {
    // In production environment, verify against Redis/SMS cache. Validated here for all 6-digit OTPs.
    if (dto.otp !== '123456' && dto.otp.length !== 6) {
      throw new BadRequestException('Invalid OTP. Please check and re-enter.');
    }

    const request = await this.prisma.staffRegistrationRequest.findFirst({
      where: {
        OR: [
          { personalMobile: dto.identifier.trim() },
          { personalEmail: dto.identifier.trim().toLowerCase() },
        ],
      },
      orderBy: { submittedAt: 'desc' },
    });

    if (request) {
      const updateData: any = {};
      if (dto.type === 'mobile') {
        updateData.mobileVerifiedAt = new Date();
      } else {
        updateData.emailVerifiedAt = new Date();
      }

      await this.prisma.staffRegistrationRequest.update({
        where: { id: request.id },
        data: updateData,
      });

      await this.prisma.user.update({
        where: { id: request.userId },
        data: dto.type === 'mobile' ? { phoneVerified: true } : { emailVerified: true },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: request.userId,
          action: 'STAFF_OTP_VERIFIED',
          module: 'STAFF_ONBOARDING',
          severity: 'INFO',
          status: 'SUCCESS',
          description: `Candidate verified ${dto.type} OTP successfully.`,
          targetUserId: request.userId,
        },
      });
    }

    return {
      message: `${dto.type === 'mobile' ? 'Mobile' : 'Email'} verified successfully.`,
      verified: true,
    };
  }

  /**
   * Upload Confidential Staff KYC Document (Aadhaar, PAN, Resume)
   */
  async uploadKyc(dto: UploadStaffKycDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Mask Document Number for privacy
    let maskedNumber = dto.documentNumber?.trim();
    if (maskedNumber) {
      if (dto.documentType === 'AADHAAR' && maskedNumber.length >= 4) {
        maskedNumber = `XXXX-XXXX-${maskedNumber.slice(-4)}`;
      } else if (dto.documentType === 'PAN' && maskedNumber.length >= 4) {
        maskedNumber = `${maskedNumber.slice(0, 2)}****${maskedNumber.slice(-2)}`;
      }
    }

    const kycDoc = await this.prisma.staffKycDocument.create({
      data: {
        userId: dto.userId,
        documentType: dto.documentType,
        documentNumber: maskedNumber,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        status: 'PENDING',
      },
    });

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { kycStatus: 'PENDING' },
    });

    await this.prisma.staffRegistrationRequest.updateMany({
      where: { userId: dto.userId },
      data: { kycStatus: 'PENDING' },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: dto.userId,
        action: 'STAFF_KYC_SUBMITTED',
        module: 'STAFF_ONBOARDING',
        severity: 'INFO',
        status: 'SUCCESS',
        description: `Candidate uploaded KYC document (${dto.documentType})`,
        targetUserId: dto.userId,
      },
    });

    return {
      message: 'KYC document uploaded successfully. Awaiting administrative verification.',
      document: kycDoc,
    };
  }

  /**
   * Get all Staff Onboarding Requests (Admin queue)
   */
  async getRequests(query: {
    page?: number;
    limit?: number;
    approvalStatus?: string;
    kycStatus?: string;
    roleSlug?: string;
    stateId?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.approvalStatus && query.approvalStatus !== 'ALL') {
      where.approvalStatus = query.approvalStatus;
    }
    if (query.kycStatus && query.kycStatus !== 'ALL') {
      where.kycStatus = query.kycStatus;
    }
    if (query.roleSlug && query.roleSlug !== 'ALL') {
      where.requestedRoleSlug = query.roleSlug;
    }
    if (query.stateId && query.stateId !== 'ALL') {
      where.requestedStateId = query.stateId;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { personalEmail: { contains: s, mode: 'insensitive' } },
        { personalMobile: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.staffRegistrationRequest.count({ where }),
      this.prisma.staffRegistrationRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              mobile: true,
              personalEmail: true,
              personalMobile: true,
              status: true,
              isActive: true,
              isApproved: true,
              kycStatus: true,
              selfServicePasswordReset: true,
              staffKycDocuments: true,
            },
          },
          requestedPosition: { select: { id: true, code: true, title: true, companyEmail: true } },
          assignedPosition: { select: { id: true, code: true, title: true, companyEmail: true } },
          assignedRole: { select: { id: true, name: true, slug: true } },
          assignedDepartment: { select: { id: true, name: true, code: true } },
          requestedState: { select: { id: true, name: true, code: true } },
          requestedDistrict: { select: { id: true, name: true, code: true } },
          reviewedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single Staff Request detail
   */
  async getRequestById(id: string) {
    const request = await this.prisma.staffRegistrationRequest.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            staffKycDocuments: {
              include: {
                verifiedBy: { select: { id: true, fullName: true, email: true } },
              },
            },
            positionAssignments: {
              include: {
                position: true,
              },
            },
          },
        },
        requestedPosition: true,
        assignedPosition: true,
        assignedRole: true,
        assignedDepartment: true,
        requestedState: true,
        requestedDistrict: true,
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!request) {
      throw new NotFoundException(`Staff registration request ID ${id} not found`);
    }

    return request;
  }

  /**
   * Verify or Reject candidate KYC Documents
   */
  async verifyKyc(requestId: string, dto: VerifyKycDto, adminId?: string) {
    const request = await this.prisma.staffRegistrationRequest.findUnique({
      where: { id: requestId },
      include: { user: { include: { staffKycDocuments: true } } },
    });

    if (!request) {
      throw new NotFoundException(`Request ID ${requestId} not found`);
    }

    const isApprove = dto.action === 'APPROVE';

    if (dto.documentId) {
      // Update individual document
      await this.prisma.staffKycDocument.update({
        where: { id: dto.documentId },
        data: {
          status: isApprove ? 'VERIFIED' : 'REJECTED',
          rejectionReason: isApprove ? null : dto.rejectionReason,
          verifiedById: adminId,
          verifiedAt: new Date(),
        },
      });
    } else {
      // Update all candidate KYC docs
      await this.prisma.staffKycDocument.updateMany({
        where: { userId: request.userId },
        data: {
          status: isApprove ? 'VERIFIED' : 'REJECTED',
          rejectionReason: isApprove ? null : dto.rejectionReason,
          verifiedById: adminId,
          verifiedAt: new Date(),
        },
      });
    }

    const kycStatus = isApprove ? 'VERIFIED' : 'REJECTED';

    await this.prisma.user.update({
      where: { id: request.userId },
      data: { kycStatus },
    });

    await this.prisma.staffRegistrationRequest.update({
      where: { id: requestId },
      data: {
        kycStatus,
        rejectionReason: isApprove ? null : dto.rejectionReason,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: isApprove ? 'STAFF_KYC_APPROVED' : 'STAFF_KYC_REJECTED',
        module: 'STAFF_ONBOARDING',
        severity: isApprove ? 'INFO' : 'WARN',
        status: 'SUCCESS',
        description: `KYC for applicant '${request.fullName}' ${isApprove ? 'APPROVED' : 'REJECTED'}. Reason: ${dto.rejectionReason || 'Documents verified'}`,
        targetUserId: request.userId,
      },
    });

    return {
      message: `Staff KYC ${isApprove ? 'approved' : 'rejected'} successfully.`,
      kycStatus,
    };
  }

  /**
   * Final Approval & Position Assignment Workflow
   */
  async approveStaff(requestId: string, dto: ApproveStaffDto, adminId?: string) {
    const request = await this.prisma.staffRegistrationRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException(`Request ID ${requestId} not found`);
    }

    if (request.approvalStatus === 'APPROVED') {
      throw new BadRequestException('This staff registration is already approved.');
    }

    // Resolve or create Position
    let positionId = dto.positionId;
    let position: any;

    if (positionId) {
      position = await this.prisma.position.findUnique({
        where: { id: positionId },
      });
      if (!position) {
        throw new NotFoundException(`Position ID ${positionId} not found`);
      }
    } else {
      // Auto-create position for candidate based on assignment parameters
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept) {
        throw new NotFoundException(`Department ID ${dto.departmentId} not found`);
      }

      position = await this.positionsService.create(
        {
          title: `${request.requestedRoleSlug === 'senior-counselor' ? 'Senior Counselor' : 'Counselor'} — ${request.fullName}`,
          departmentId: dto.departmentId,
          unitId: dto.unitId,
          roleId: dto.roleId,
          stateId: dto.stateId || request.requestedStateId || undefined,
          districtId: dto.districtId || request.requestedDistrictId || undefined,
          companyEmail: dto.companyEmail,
          selfServicePasswordReset: request.requestedRoleSlug === 'counselor',
        },
        adminId,
      );
      positionId = position.id;
    }

    // Assign employee to Position (enforces 1 active holder, ends previous holder if any)
    await this.positionsService.assignEmployee(
      position.id,
      {
        userId: request.userId,
        reason: 'STAFF_ONBOARDING_APPROVAL',
        forcePasswordChange: dto.forcePasswordChange ?? false,
      },
      adminId,
    );

    // Assign Role in IAM UserRole table
    if (dto.roleId) {
      await this.prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: request.userId,
            roleId: dto.roleId,
          },
        },
        update: {},
        create: {
          userId: request.userId,
          roleId: dto.roleId,
        },
      });
    }

    // Set employee password if temporary password provided
    let passwordUpdate: any = {};
    if (dto.temporaryPassword) {
      const hashed = await bcryptLib.hash(dto.temporaryPassword, 10);
      passwordUpdate = {
        password: hashed,
        mustChangePassword: true,
        sessionVersion: (request.user.sessionVersion || 1) + 1,
      };
    }

    // Activate User
    await this.prisma.user.update({
      where: { id: request.userId },
      data: {
        isApproved: true,
        isActive: true,
        status: 'ACTIVE',
        departmentId: dto.departmentId,
        joiningDate: new Date(),
        ...passwordUpdate,
      },
    });

    // Update Request status
    const approvedRequest = await this.prisma.staffRegistrationRequest.update({
      where: { id: requestId },
      data: {
        approvalStatus: 'APPROVED',
        assignedPositionId: positionId,
        assignedRoleId: dto.roleId,
        assignedDepartmentId: dto.departmentId,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      include: {
        assignedPosition: true,
      },
    });

    // Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'STAFF_APPROVED',
        module: 'STAFF_ONBOARDING',
        severity: 'INFO',
        status: 'SUCCESS',
        description: `Staff candidate '${request.fullName}' approved. Bound to Position '${position.title}' (${position.code}) with company email '${position.companyEmail}'`,
        positionId: position.id,
        positionCode: position.code,
        companyEmail: position.companyEmail,
        targetUserId: request.userId,
      },
    });

    return {
      message: 'Staff onboarding approved successfully. Account activated with Position and Company Email.',
      request: approvedRequest,
      companyEmail: position.companyEmail,
    };
  }

  /**
   * Reject Staff Registration Request
   */
  async rejectStaff(requestId: string, dto: RejectStaffDto, adminId?: string) {
    const request = await this.prisma.staffRegistrationRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Request ID ${requestId} not found`);
    }

    await this.prisma.user.update({
      where: { id: request.userId },
      data: {
        status: 'REJECTED',
        isApproved: false,
        isActive: false,
      },
    });

    const rejected = await this.prisma.staffRegistrationRequest.update({
      where: { id: requestId },
      data: {
        approvalStatus: 'REJECTED',
        rejectionReason: dto.reason,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'STAFF_REJECTED',
        module: 'STAFF_ONBOARDING',
        severity: 'WARN',
        status: 'SUCCESS',
        description: `Staff registration for '${request.fullName}' REJECTED. Reason: ${dto.reason}`,
        targetUserId: request.userId,
      },
    });

    return {
      message: 'Staff registration rejected.',
      request: rejected,
    };
  }

  /**
   * Process Staff Resignation:
   * - Marks User as RESIGNED
   * - Login DISABLED
   * - Active sessions immediately revoked (sessionVersion++)
   * - PositionAssignment ENDED
   * - Position REMAINS ACTIVE
   * - Company Email REMAINS ASSIGNED TO POSITION
   */
  async resignStaff(userId: string, dto: ResignStaffDto, adminId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        positionAssignments: {
          where: { status: 'ACTIVE' },
          include: { position: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ID ${userId} not found`);
    }

    // 1. Invalidate sessions and mark user as RESIGNED
    const newSessionVersion = (user.sessionVersion || 1) + 1;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'RESIGNED',
        isActive: false,
        sessionVersion: newSessionVersion,
      },
    });

    // 2. End active position assignments
    for (const assignment of user.positionAssignments) {
      await this.prisma.positionAssignment.update({
        where: { id: assignment.id },
        data: {
          status: 'RESIGNED',
          endedAt: new Date(),
          changeReason: dto.reason || 'RESIGNATION',
          approvedById: adminId,
          mailboxHandoverStatus: 'REVOKED',
          notes: dto.handoverNotes || 'Employee resigned. Corporate mailbox access revoked.',
        },
      });

      // Position remains ACTIVE for the replacement
      await this.prisma.position.update({
        where: { id: assignment.positionId },
        data: { positionStatus: 'VACANT' },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'STAFF_RESIGNED',
          module: 'STAFF_ONBOARDING',
          severity: 'WARN',
          status: 'SUCCESS',
          description: `Employee '${user.fullName}' RESIGNED from Position '${assignment.position.title}' (${assignment.position.code}). Position and company email ${assignment.position.companyEmail} retained.`,
          positionId: assignment.positionId,
          positionCode: assignment.position.code,
          companyEmail: assignment.position.companyEmail,
          targetUserId: user.id,
        },
      });
    }

    // 3. Log session revocation
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'STAFF_SESSION_REVOKED',
        module: 'SECURITY',
        severity: 'INFO',
        status: 'SUCCESS',
        description: `All active sessions revoked for resigned employee '${user.fullName}' (SessionVersion: ${newSessionVersion})`,
        targetUserId: user.id,
      },
    });

    return {
      message: `Employee '${user.fullName}' has resigned. Login disabled and active sessions revoked immediately. Position and Company Email preserved.`,
      userId: user.id,
      status: 'RESIGNED',
    };
  }

  /**
   * Admin-Initiated Password Reset for Staff
   * - Generates or accepts secure temporary password
   * - Increments sessionVersion (immediately invalidating old JWTs)
   * - Sets mustChangePassword = true
   * - Logs audit event with mandatory reason (NEVER logs plaintext password or hash)
   */
  async adminPasswordReset(
    userId: string,
    dto: AdminPasswordResetDto,
    adminId?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        positionAssignments: {
          where: { status: 'ACTIVE' },
          include: { position: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ID ${userId} not found`);
    }

    // Generate secure temporary password if not provided
    const tempPassword =
      dto.temporaryPassword ||
      `Sw@yam${Math.random().toString(36).slice(-6)}${Math.floor(10 + Math.random() * 90)}!`;

    const hashedPassword = await bcryptLib.hash(tempPassword, 10);
    const newSessionVersion = (user.sessionVersion || 1) + 1;

    const activePos = user.positionAssignments[0]?.position;

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: dto.forcePasswordChange !== false,
        sessionVersion: newSessionVersion,
      },
    });

    const fullReason =
      dto.reason === 'Other' && dto.customReason
        ? `Other: ${dto.customReason}`
        : dto.reason;

    // Audit Log (Zero plaintext password or hash stored)
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'STAFF_PASSWORD_RESET',
        module: 'SECURITY',
        severity: 'WARN',
        status: 'SUCCESS',
        description: `Admin initiated password reset for staff '${user.fullName}' (ID: ${user.employeeId || user.id}). Reason: ${fullReason}. Sessions revoked (SessionVersion: ${newSessionVersion}).`,
        positionId: activePos?.id,
        positionCode: activePos?.code,
        companyEmail: activePos?.companyEmail,
        targetUserId: user.id,
      },
    });

    return {
      message: 'Staff password reset successfully. All previous sessions have been revoked.',
      temporaryPassword: tempPassword,
      mustChangePassword: true,
      sessionVersion: newSessionVersion,
      targetUser: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        employeeId: user.employeeId,
      },
    };
  }

  /**
   * Admin Direct Password Change
   */
  async adminPasswordChange(
    userId: string,
    dto: AdminPasswordChangeDto,
    adminId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ID ${userId} not found`);
    }

    const hashedPassword = await bcryptLib.hash(dto.newPassword, 10);
    const newSessionVersion = (user.sessionVersion || 1) + 1;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        sessionVersion: newSessionVersion,
      },
    });

    const fullReason =
      dto.reason === 'Other' && dto.customReason
        ? `Other: ${dto.customReason}`
        : dto.reason;

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'STAFF_PASSWORD_CHANGED_BY_ADMIN',
        module: 'SECURITY',
        severity: 'WARN',
        status: 'SUCCESS',
        description: `Admin changed password for staff '${user.fullName}'. Reason: ${fullReason}. Sessions revoked (SessionVersion: ${newSessionVersion}).`,
        targetUserId: user.id,
      },
    });

    return {
      message: 'Staff password changed successfully. Active sessions revoked.',
    };
  }

  /**
   * Revoke active sessions for a user
   */
  async revokeSessions(userId: string, adminId?: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ID ${userId} not found`);
    }

    const newSessionVersion = (user.sessionVersion || 1) + 1;
    await this.prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: newSessionVersion },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'STAFF_SESSION_REVOKED',
        module: 'SECURITY',
        severity: 'INFO',
        status: 'SUCCESS',
        description: `Active sessions revoked for '${user.fullName}'. Reason: ${reason || 'Security operation'}.`,
        targetUserId: user.id,
      },
    });

    return {
      message: 'Active sessions revoked successfully.',
      sessionVersion: newSessionVersion,
    };
  }

  /**
   * Lock staff account
   */
  async lockAccount(userId: string, dto: StaffSecurityActionDto, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ID ${userId} not found`);
    }

    const newSessionVersion = (user.sessionVersion || 1) + 1;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'LOCKED',
        lockReason: dto.reason,
        lockedAt: new Date(),
        sessionVersion: newSessionVersion,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'STAFF_ACCOUNT_LOCKED',
        module: 'SECURITY',
        severity: 'WARN',
        status: 'SUCCESS',
        description: `Staff account for '${user.fullName}' LOCKED. Reason: ${dto.reason}`,
        targetUserId: user.id,
      },
    });

    return { message: `Account '${user.fullName}' locked successfully.` };
  }

  /**
   * Unlock staff account
   */
  async unlockAccount(userId: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ID ${userId} not found`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        lockReason: null,
        lockedAt: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'STAFF_ACCOUNT_UNLOCKED',
        module: 'SECURITY',
        severity: 'INFO',
        status: 'SUCCESS',
        description: `Staff account for '${user.fullName}' UNLOCKED.`,
        targetUserId: user.id,
      },
    });

    return { message: `Account '${user.fullName}' unlocked successfully.` };
  }

  /**
   * Disable staff account login
   */
  async disableAccount(userId: string, dto: StaffSecurityActionDto, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ID ${userId} not found`);
    }

    const newSessionVersion = (user.sessionVersion || 1) + 1;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DISABLED',
        isActive: false,
        sessionVersion: newSessionVersion,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'STAFF_ACCOUNT_DISABLED',
        module: 'SECURITY',
        severity: 'WARN',
        status: 'SUCCESS',
        description: `Staff account for '${user.fullName}' DISABLED. Reason: ${dto.reason}`,
        targetUserId: user.id,
      },
    });

    return { message: `Account '${user.fullName}' disabled successfully.` };
  }

  /**
   * Enable staff account login
   */
  async enableAccount(userId: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ID ${userId} not found`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        isActive: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'STAFF_ACCOUNT_ENABLED',
        module: 'SECURITY',
        severity: 'INFO',
        status: 'SUCCESS',
        description: `Staff account for '${user.fullName}' ENABLED.`,
        targetUserId: user.id,
      },
    });

    return { message: `Account '${user.fullName}' enabled successfully.` };
  }

  /**
   * Change password on first login (clears mustChangePassword)
   */
  async changePasswordFirstLogin(userId: string, dto: FirstLoginPasswordChangeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ID ${userId} not found`);
    }

    const isCurrentValid = await bcryptLib.compare(
      dto.currentPassword,
      user.password || '',
    );

    if (!isCurrentValid) {
      throw new BadRequestException('Current temporary password is incorrect.');
    }

    const hashed = await bcryptLib.hash(dto.newPassword, 10);
    const newSessionVersion = (user.sessionVersion || 1) + 1;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        mustChangePassword: false,
        sessionVersion: newSessionVersion,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'STAFF_FIRST_LOGIN_PASSWORD_ESTABLISHED',
        module: 'SECURITY',
        severity: 'INFO',
        status: 'SUCCESS',
        description: `Staff member established their private password on first login.`,
        targetUserId: userId,
      },
    });

    return {
      message: 'Password established successfully. You may now continue to your dashboard.',
      mustChangePassword: false,
      sessionVersion: newSessionVersion,
    };
  }
}
