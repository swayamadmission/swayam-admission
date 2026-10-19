import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailChannel } from '../notifications/notification-channels.service';
import { Role } from '@prisma/client';
import { CreateEmployeeDto, UpdateEmployeeDto, UpdateEmployeeStatusDto } from './dto/employee.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const bcryptLib = bcrypt as unknown as {
  hash: (s: string, saltOrRounds: number) => Promise<string>;
  compare: (s: string, hash: string) => Promise<boolean>;
};

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Optional() private readonly emailChannel?: EmailChannel,
  ) {}

  /**
   * List Employees with Search, Filtering, and Overview Metrics
   */
  async listEmployees(query: {
    search?: string;
    department?: string;
    designation?: string;
    role?: string;
    status?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      // Exclude pure student users
      role: { not: Role.STUDENT },
    };

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.department && query.department !== 'ALL') {
      where.department = query.department;
    }

    if (query.designation && query.designation !== 'ALL') {
      where.designation = query.designation;
    }

    if (query.role && query.role !== 'ALL') {
      where.role = query.role as Role;
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { personalEmail: { contains: q, mode: 'insensitive' } },
        { mobile: { contains: q } },
        { employeeId: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
        { designation: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items, totalActive, totalSuspended, newJoinersThisMonth] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          fullName: true,
          firstName: true,
          lastName: true,
          email: true,
          personalEmail: true,
          mobile: true,
          employeeId: true,
          department: true,
          designation: true,
          role: true,
          status: true,
          isActive: true,
          isApproved: true,
          isVerified: true,
          emailVerified: true,
          activationExpiresAt: true,
          activatedAt: true,
          joiningDate: true,
          avatar: true,
          lastLogin: true,
          createdAt: true,
          mustChangePassword: true,
        },
      }),
      this.prisma.user.count({
        where: { role: { not: Role.STUDENT }, status: 'ACTIVE', isActive: true },
      }),
      this.prisma.user.count({
        where: { role: { not: Role.STUDENT }, status: 'SUSPENDED' },
      }),
      this.prisma.user.count({
        where: {
          role: { not: Role.STUDENT },
          joiningDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    // Distinct departments and designations for filter dropdowns
    const [departments, designations] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: { not: Role.STUDENT }, department: { not: null } },
        distinct: ['department'],
        select: { department: true },
      }),
      this.prisma.user.findMany({
        where: { role: { not: Role.STUDENT }, designation: { not: null } },
        distinct: ['designation'],
        select: { designation: true },
      }),
    ]);

    return {
      success: true,
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      metrics: {
        totalEmployees: total,
        activeEmployees: totalActive,
        suspendedEmployees: totalSuspended,
        newJoinersThisMonth,
      },
      filters: {
        departments: departments.map((d) => d.department).filter(Boolean),
        designations: designations.map((d) => d.designation).filter(Boolean),
      },
    };
  }

  /**
   * Get 360 Degree Comprehensive Employee Profile
   */
  async getEmployee360(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        userRoles: { include: { role: true } },
        UserDeviceSession: {
          orderBy: { lastActiveAt: 'desc' },
          take: 10,
        },
        UserLoginHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        recruitmentOnboardings: {
          include: {
            application: {
              include: {
                vacancy: true,
                offer: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        jobApplications: {
          include: {
            vacancy: true,
            offer: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            assignedLeads: true,
            applications: true,
            counseledApplications: true,
            documents: true,
            supportTickets: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Employee not found.');
    }

    const { password, twoFactorSecret, ...safeUser } = user;

    // Fetch related recruitment information if available
    const recruitmentInfo = user.recruitmentOnboardings?.[0] || null;
    const applicationInfo = user.jobApplications?.[0] || recruitmentInfo?.application || null;

    // Fetch employee activity timeline
    const activityTimeline = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { userId: id },
          { entityId: id },
          { targetUserId: id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        action: true,
        description: true,
        module: true,
        createdAt: true,
        ipAddress: true,
        userName: true,
        severity: true,
        status: true,
      },
    });

    return {
      success: true,
      user: safeUser,
      recruitment: recruitmentInfo ? {
        onboardingId: recruitmentInfo.id,
        applicationId: applicationInfo?.applicationId,
        vacancyTitle: applicationInfo?.vacancy?.title,
        vacancyCode: applicationInfo?.vacancy?.vacancyCode,
        hiredDepartment: recruitmentInfo.department,
        hiredDesignation: recruitmentInfo.designation,
        joiningDate: recruitmentInfo.joiningDate,
        workMode: recruitmentInfo.workMode,
        workLocation: recruitmentInfo.workLocation,
        employmentType: recruitmentInfo.employmentType,
        status: recruitmentInfo.status,
      } : null,
      stats: {
        assignedLeads: user._count.assignedLeads,
        applicationsProcessed: user._count.counseledApplications + user._count.applications,
        documentsVerified: user._count.documents,
        supportTicketsCount: user._count.supportTickets,
      },
      activityTimeline,
      deviceSessions: user.UserDeviceSession || [],
      loginHistories: user.UserLoginHistory || [],
    };
  }

  /**
   * Create New Employee Record Manually with Temporary Credentials
   */
  async createEmployee(dto: CreateEmployeeDto, actorId: string) {
    const email = dto.email.trim().toLowerCase();
    const mobile = dto.mobile.trim();

    // Check existing email
    const existingEmail = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { personalEmail: email }] },
    });
    if (existingEmail) {
      throw new ConflictException(`An account with email ${email} already exists.`);
    }

    // Check existing mobile
    const existingMobile = await this.prisma.user.findFirst({
      where: { mobile },
    });
    if (existingMobile) {
      throw new ConflictException(`An account with mobile number ${mobile} already exists.`);
    }

    // Determine or generate Employee ID
    let employeeId = dto.employeeId?.trim();
    if (employeeId) {
      const existingId = await this.prisma.user.findFirst({
        where: { employeeId },
      });
      if (existingId) {
        throw new ConflictException(`Employee ID ${employeeId} is already assigned.`);
      }
    } else {
      const currentYear = new Date().getFullYear();
      const count = await this.prisma.user.count({ where: { employeeId: { not: null } } });
      employeeId = `SWY-EMP-${currentYear}-${String(count + 101).padStart(4, '0')}`;
    }

    const names = dto.fullName.trim().split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || null;

    // Cryptographically secure single-use account activation token (32 bytes hex)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const activationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    // Atomic transaction for employee user record and activation token creation
    const newEmployee = await this.prisma.$transaction(async (tx) => {
      const employee = await tx.user.create({
        data: {
          fullName: dto.fullName.trim(),
          firstName,
          lastName,
          displayName: dto.fullName.trim(),
          email,
          mobile,
          employeeId,
          department: dto.department || 'General Administration',
          designation: dto.designation || 'Staff Member',
          role: dto.role || Role.COUNSELOR,
          password: null, // No temporary password. Password is created during activation.
          mustChangePassword: false,
          temporaryPasswordExpiresAt: null,
          activationTokenHash: tokenHash,
          activationExpiresAt,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : new Date(),
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          qualification: dto.qualification,
          experience: dto.experience,
          bio: dto.bio,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          pincode: dto.pincode,
          isActive: false, // Inactive until user completes activation
          isApproved: true,
          isVerified: false,
          emailVerified: false,
          status: 'PENDING_ACTIVATION',
          kycStatus: 'APPROVED',
          sessionVersion: 1,
        },
      });

      await tx.accountActivationToken.create({
        data: {
          userId: employee.id,
          tokenHash,
          expiresAt: activationExpiresAt,
          isUsed: false,
        },
      });

      return employee;
    });

    await this.auditService.logAction({
      module: 'EMPLOYEE_MANAGEMENT',
      action: 'EMPLOYEE_CREATED',
      description: `Created new staff record for ${newEmployee.fullName} (${employeeId}) with role ${newEmployee.role}. Pending activation.`,
      userId: actorId,
      entityId: newEmployee.id,
      entityType: 'User',
      entityName: newEmployee.fullName,
      targetUserId: newEmployee.id,
      metadata: { employeeId, email, role: newEmployee.role, department: newEmployee.department },
    });

    // Send single-use activation email via centralized SMTP service
    let emailDelivered = false;
    let deliveryError: string | undefined;

    if (this.emailChannel && dto.sendWelcomeEmail !== false) {
      try {
        const isProtectedRole = ([Role.ADMIN, Role.SUPER_ADMIN, Role.DIRECTOR, Role.AUDITOR] as Role[]).includes(newEmployee.role);
        const portalUrl = isProtectedRole
          ? (process.env.ADMIN_PORTAL_URL || 'https://admin.swayamadmission.com')
          : (process.env.ERP_PORTAL_URL || 'https://erp.swayamadmission.com');
        const portalName = isProtectedRole ? 'Staff & Administration Portal' : 'Employee ERP Portal';

        const activationBaseUrl = process.env.ADMIN_PORTAL_URL || 'https://admin.swayamadmission.com';
        const activationUrl = `${activationBaseUrl}/activate?token=${rawToken}`;

        const mailResult = await this.emailChannel.sendEmployeeActivationEmail({
          employeeName: newEmployee.fullName,
          employeeId,
          officialEmail: email,
          activationUrl,
          expiryHours: 24,
          portalUrl,
          portalName,
          roleName: newEmployee.role,
          departmentName: newEmployee.department || undefined,
        });

        emailDelivered = mailResult.success;
        if (!mailResult.success) {
          deliveryError = mailResult.errorMessage || mailResult.failureReason;
        }
      } catch (err: any) {
        deliveryError = err.message;
        this.logger.warn(`Failed sending activation email to employee ${employeeId}: ${err.message}`);
      }
    }

    const {
      password: _p,
      twoFactorSecret: _t,
      activationTokenHash,
      ...safeCreated
    } = newEmployee;

    return {
      success: true,
      message: emailDelivered
        ? `Employee ${newEmployee.fullName} created successfully. Activation email sent to ${email}.`
        : `Employee ${newEmployee.fullName} created. (Email warning: ${deliveryError || 'Pending SMTP delivery'}). The employee is in PENDING_ACTIVATION and invitation can be resent anytime.`,
      emailDelivered,
      employee: safeCreated,
    };
  }

  /**
   * Update Employee Profile & Administrative Settings
   */
  async updateEmployee(id: string, dto: UpdateEmployeeDto, actorId: string) {
    const employee = await this.prisma.user.findUnique({ where: { id } });
    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    const updateData: any = {};

    if (dto.fullName) {
      updateData.fullName = dto.fullName.trim();
      const parts = dto.fullName.trim().split(' ');
      updateData.firstName = parts[0];
      updateData.lastName = parts.slice(1).join(' ') || null;
      updateData.displayName = dto.fullName.trim();
    }

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      if (email !== employee.email?.toLowerCase()) {
        const conflict = await this.prisma.user.findFirst({
          where: { email, id: { not: id } },
        });
        if (conflict) throw new ConflictException(`Email ${email} is already in use.`);
        updateData.email = email;
      }
    }

    if (dto.personalEmail) updateData.personalEmail = dto.personalEmail.trim().toLowerCase();

    if (dto.mobile) {
      const mobile = dto.mobile.trim();
      if (mobile !== employee.mobile) {
        const conflict = await this.prisma.user.findFirst({
          where: { mobile, id: { not: id } },
        });
        if (conflict) throw new ConflictException(`Mobile ${mobile} is already in use.`);
        updateData.mobile = mobile;
      }
    }

    if (dto.alternatePhone) updateData.alternatePhone = dto.alternatePhone.trim();

    if (dto.employeeId) {
      const employeeId = dto.employeeId.trim();
      if (employeeId !== employee.employeeId) {
        const conflict = await this.prisma.user.findFirst({
          where: { employeeId, id: { not: id } },
        });
        if (conflict) throw new ConflictException(`Employee ID ${employeeId} is already in use.`);
        updateData.employeeId = employeeId;
      }
    }

    if (dto.department) updateData.department = dto.department.trim();
    if (dto.designation) updateData.designation = dto.designation.trim();
    if (dto.role) updateData.role = dto.role;
    if (dto.status) updateData.status = dto.status;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.twoFactorEnabled !== undefined) updateData.twoFactorEnabled = dto.twoFactorEnabled;

    if (dto.joiningDate) updateData.joiningDate = new Date(dto.joiningDate);
    if (dto.gender) updateData.gender = dto.gender;
    if (dto.dateOfBirth) updateData.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.bloodGroup) updateData.bloodGroup = dto.bloodGroup;
    if (dto.qualification) updateData.qualification = dto.qualification;
    if (dto.experience) updateData.experience = dto.experience;
    if (dto.bio) updateData.bio = dto.bio;
    if (dto.address) updateData.address = dto.address;
    if (dto.city) updateData.city = dto.city;
    if (dto.state) updateData.state = dto.state;
    if (dto.pincode) updateData.pincode = dto.pincode;
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;
    if (dto.signature !== undefined) updateData.signature = dto.signature;
    if (dto.preferences) updateData.preferences = dto.preferences;
    if (dto.socialLinks) updateData.socialLinks = dto.socialLinks;

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.logAction({
      module: 'EMPLOYEE_MANAGEMENT',
      action: 'EMPLOYEE_UPDATED',
      description: `Updated employee profile for ${updated.fullName} (${updated.employeeId})`,
      userId: actorId,
      entityId: id,
      entityType: 'User',
      entityName: updated.fullName,
      targetUserId: id,
      metadata: { fieldsUpdated: Object.keys(updateData) },
    });

    const { password, twoFactorSecret, ...safeUser } = updated;
    return {
      success: true,
      message: 'Employee updated successfully.',
      employee: safeUser,
    };
  }

  /**
   * Update Employee Status (Active, Suspended, Resigned, Disabled)
   */
  async updateStatus(id: string, dto: UpdateEmployeeStatusDto, actorId: string) {
    const employee = await this.prisma.user.findUnique({ where: { id } });
    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    const isActive = dto.status === 'ACTIVE';
    const newSessionVersion = (employee.sessionVersion || 1) + 1;

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: dto.status,
        isActive,
        // If suspended or resigned, increment session version and invalidate sessions
        sessionVersion: newSessionVersion,
      },
    });

    // If deactivated or suspended, immediately purge active device sessions
    if (!isActive) {
      await this.prisma.userDeviceSession.deleteMany({
        where: { userId: id },
      });
    }

    await this.auditService.logAction({
      module: 'EMPLOYEE_MANAGEMENT',
      action: 'EMPLOYEE_STATUS_CHANGED',
      description: `Changed employee status for ${employee.fullName} (${employee.employeeId}) to ${dto.status}. Reason: ${dto.reason || 'None specified'}`,
      userId: actorId,
      entityId: id,
      entityType: 'User',
      entityName: employee.fullName,
      targetUserId: id,
      metadata: { oldStatus: employee.status, newStatus: dto.status, reason: dto.reason },
    });

    return {
      success: true,
      message: `Employee status updated to ${dto.status}.`,
      status: updated.status,
      isActive: updated.isActive,
    };
  }

  /**
   * Admin-Triggered Secure Password Reset Link Dispatch
   * NO temporary password is generated or sent. The employee receives a secure password-setting link.
   */
  async resetPassword(id: string, actorId: string, ipAddress?: string) {
    const employee = await this.prisma.user.findFirst({
      where: { OR: [{ id }, { employeeId: id }] },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    const targetEmail = employee.personalEmail || employee.email;
    if (!targetEmail) {
      throw new BadRequestException('Employee does not have a registered personal or official email address.');
    }

    // Invalidate existing sessions
    await this.prisma.userDeviceSession.deleteMany({
      where: { userId: employee.id },
    });

    const newSessionVersion = (employee.sessionVersion || 1) + 1;
    await this.prisma.user.update({
      where: { id: employee.id },
      data: { sessionVersion: newSessionVersion },
    });

    // Invalidate previous activation tokens
    await this.prisma.accountActivationToken.updateMany({
      where: { userId: employee.id, isUsed: false },
      data: { isUsed: true },
    });

    // Generate single-use activation / password reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.accountActivationToken.create({
      data: {
        userId: employee.id,
        tokenHash,
        expiresAt,
        isUsed: false,
      },
    });

    await this.prisma.user.update({
      where: { id: employee.id },
      data: {
        activationTokenHash: tokenHash,
        activationExpiresAt: expiresAt,
        temporaryPasswordExpiresAt: null,
      },
    });

    const isProtectedRole = ([Role.ADMIN, Role.SUPER_ADMIN, Role.DIRECTOR, Role.AUDITOR] as Role[]).includes(employee.role);
    const portalUrl = isProtectedRole
      ? (process.env.ADMIN_PORTAL_URL || 'https://admin.swayamadmission.com')
      : (process.env.ERP_PORTAL_URL || 'https://erp.swayamadmission.com');
    const portalName = isProtectedRole ? 'Staff & Administration Portal' : 'Employee ERP Portal';

    const activationBaseUrl = process.env.ADMIN_PORTAL_URL || 'https://admin.swayamadmission.com';
    const resetUrl = `${activationBaseUrl}/activate?token=${rawToken}&type=reset`;

    let emailDelivered = false;
    let deliveryError: string | undefined;

    if (this.emailChannel) {
      try {
        const mailRes = await this.emailChannel.sendEmployeePasswordResetEmail({
          employeeName: employee.fullName,
          employeeId: employee.employeeId || 'STAFF',
          officialEmail: targetEmail,
          resetUrl,
          expiryHours: 24,
          portalUrl,
          portalName,
          roleName: employee.role,
          departmentName: employee.department || undefined,
        });
        emailDelivered = mailRes.success;
        if (!mailRes.success) deliveryError = mailRes.errorMessage || mailRes.failureReason;
      } catch (err: any) {
        deliveryError = err.message;
        this.logger.warn(`Failed sending password reset link to employee ${employee.employeeId}: ${err.message}`);
      }
    }

    await this.auditService.logAction({
      module: 'EMPLOYEE_MANAGEMENT',
      action: 'EMPLOYEE_PASSWORD_RESET_LINK_ISSUED',
      description: `Admin dispatched secure password reset/activation link for employee ${employee.fullName} (${employee.employeeId}) to ${targetEmail}`,
      userId: actorId,
      entityId: employee.id,
      entityType: 'User',
      entityName: employee.fullName,
      targetUserId: employee.id,
      ipAddress,
      metadata: { targetEmail, emailDelivered, deliveryError },
    });

    return {
      success: true,
      message: emailDelivered
        ? `Secure password setup link successfully sent to ${targetEmail}.`
        : `Password setup link generated. (Email warning: ${deliveryError || 'SMTP failure'}).`,
      emailDelivered,
    };
  }

  /**
   * Resend Account Activation Link for Pending Employees
   */
  async resendActivation(id: string, actorId: string, ipAddress?: string) {
    const employee = await this.prisma.user.findFirst({
      where: { OR: [{ id }, { employeeId: id }] },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    if (employee.status !== 'PENDING_ACTIVATION' && employee.status !== 'PENDING') {
      throw new BadRequestException(
        `Account cannot be resent activation link. Current account status is ${employee.status}. Only pending activation accounts are eligible.`,
      );
    }

    const officialEmail = employee.email || employee.personalEmail;
    if (!officialEmail) {
      throw new BadRequestException('Employee does not have a registered official email address.');
    }

    // Rate limiting: at least 60 seconds between resends
    const lastToken = await this.prisma.accountActivationToken.findFirst({
      where: { userId: employee.id },
      orderBy: { createdAt: 'desc' },
    });

    if (lastToken && Date.now() - new Date(lastToken.createdAt).getTime() < 60 * 1000) {
      throw new BadRequestException('Please wait at least 1 minute before resending another activation link.');
    }

    // Invalidate previous unused tokens
    await this.prisma.accountActivationToken.updateMany({
      where: { userId: employee.id, isUsed: false },
      data: { isUsed: true },
    });

    // Generate cryptographically secure random token (32 bytes hex)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.accountActivationToken.create({
      data: {
        userId: employee.id,
        tokenHash,
        expiresAt,
        isUsed: false,
      },
    });

    await this.prisma.user.update({
      where: { id: employee.id },
      data: {
        activationTokenHash: tokenHash,
        activationExpiresAt: expiresAt,
        status: 'PENDING_ACTIVATION',
      },
    });

    const isProtectedRole = ([Role.ADMIN, Role.SUPER_ADMIN, Role.DIRECTOR, Role.AUDITOR] as Role[]).includes(employee.role);
    const portalUrl = isProtectedRole
      ? (process.env.ADMIN_PORTAL_URL || 'https://admin.swayamadmission.com')
      : (process.env.ERP_PORTAL_URL || 'https://erp.swayamadmission.com');
    const portalName = isProtectedRole ? 'Staff & Administration Portal' : 'Employee ERP Portal';

    const activationBaseUrl = process.env.ADMIN_PORTAL_URL || 'https://admin.swayamadmission.com';
    const activationUrl = `${activationBaseUrl}/activate?token=${rawToken}`;

    let emailDelivered = false;
    let deliveryError: string | undefined;

    if (this.emailChannel) {
      try {
        const mailResult = await this.emailChannel.sendEmployeeActivationEmail({
          employeeName: employee.fullName,
          employeeId: employee.employeeId || 'STAFF',
          officialEmail,
          activationUrl,
          expiryHours: 24,
          portalUrl,
          portalName,
          roleName: employee.role,
          departmentName: employee.department || undefined,
        });

        emailDelivered = mailResult.success;
        if (!mailResult.success) {
          deliveryError = mailResult.errorMessage || mailResult.failureReason;
        }
      } catch (err: any) {
        deliveryError = err.message;
        this.logger.warn(`Failed sending activation email to employee ${employee.employeeId}: ${err.message}`);
      }
    }

    await this.auditService.logAction({
      module: 'EMPLOYEE_MANAGEMENT',
      action: 'ACTIVATION_LINK_RESENT',
      description: `Resent account activation invitation to ${employee.fullName} (${officialEmail}). Delivery ${emailDelivered ? 'succeeded' : 'failed'}.`,
      userId: actorId,
      entityId: employee.id,
      entityType: 'User',
      entityName: employee.fullName,
      targetUserId: employee.id,
      ipAddress,
      metadata: { emailDelivered, deliveryError },
    });

    if (!emailDelivered) {
      return {
        success: false,
        warning: true,
        message: `Activation link generated, but email delivery to ${officialEmail} failed: ${deliveryError || 'SMTP failure'}. The employee remains in PENDING_ACTIVATION.`,
        deliveryStatus: 'FAILED',
      };
    }

    return {
      success: true,
      message: `Activation invitation email successfully sent to ${officialEmail}.`,
      deliveryStatus: 'SENT',
    };
  }

  /**
   * Revoke All Active Sessions for Employee
   */
  async revokeSessions(id: string, actorId: string) {
    const employee = await this.prisma.user.findUnique({ where: { id } });
    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        sessionVersion: (employee.sessionVersion || 1) + 1,
      },
    });

    await this.prisma.userDeviceSession.deleteMany({
      where: { userId: id },
    });

    await this.auditService.logAction({
      module: 'EMPLOYEE_MANAGEMENT',
      action: 'EMPLOYEE_SESSIONS_REVOKED',
      description: `Revoked all active sessions and rotated session tokens for ${employee.fullName} (${employee.employeeId})`,
      userId: actorId,
      entityId: id,
      entityType: 'User',
      entityName: employee.fullName,
      targetUserId: id,
    });

    return {
      success: true,
      message: `All active sessions revoked for ${employee.fullName}.`,
    };
  }

  /**
   * Get Employee Activity Timeline
   */
  async getActivityTimeline(id: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { userId: id },
          { entityId: id },
          { targetUserId: id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      data: logs,
    };
  }
}
