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

    // Generate cryptographic temporary password
    const rawTempPassword = `Swy@${crypto.randomBytes(3).toString('hex')}${crypto.randomInt(10, 99)}`;
    const hashedPassword = await bcryptLib.hash(rawTempPassword, 10);
    const temporaryPasswordExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const names = dto.fullName.trim().split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || null;

    const newEmployee = await this.prisma.user.create({
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
        password: hashedPassword,
        mustChangePassword: true,
        temporaryPasswordExpiresAt,
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
        isActive: true,
        isApproved: true,
        isVerified: true,
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        sessionVersion: 1,
      },
    });

    await this.auditService.logAction({
      module: 'EMPLOYEE_MANAGEMENT',
      action: 'EMPLOYEE_CREATED',
      description: `Created new staff record for ${newEmployee.fullName} (${employeeId}) with role ${newEmployee.role}`,
      userId: actorId,
      entityId: newEmployee.id,
      entityType: 'User',
      entityName: newEmployee.fullName,
      targetUserId: newEmployee.id,
      metadata: { employeeId, email, role: newEmployee.role, department: newEmployee.department },
    });

    // Send credentials email
    if (this.emailChannel && dto.sendWelcomeEmail !== false) {
      try {
        const portalUrl = 'https://erp.swayamadmission.com';
        await this.emailChannel.send(
          {
            id: newEmployee.id,
            name: newEmployee.fullName,
            email,
            mobile,
            type: 'STAFF',
          },
          {
            title: 'Welcome to Swayam Admission — Your Employee Credentials',
            subject: 'Your Swayam Admission Employee Account & Login Information',
            message: `Dear ${newEmployee.fullName},\n\nYour employee account has been created successfully.\n\nEmployee ID: ${employeeId}\nTemporary Password: ${rawTempPassword}\nPortal URL: ${portalUrl}\n\nPlease sign in within 7 days to set your permanent password.\n\nWarm regards,\nSwayam Admission Team`,
            emailHtml: `
              <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 8px;">
                <div style="background-color: #4A7B5B; padding: 18px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
                  <h2 style="color: #FFFFFF; margin: 0;">Welcome to Swayam Admission</h2>
                  <p style="color: #F0AE1A; margin: 4px 0 0 0; font-size: 13px; font-weight: bold;">Employee Account Setup</p>
                </div>
                <p>Dear <strong>${newEmployee.fullName}</strong>,</p>
                <p>Your official employee profile has been created. Here are your credentials to access the Employee ERP Portal:</p>
                <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 18px; margin: 20px 0;">
                  <p style="margin: 4px 0;"><strong>Employee ID:</strong> ${employeeId}</p>
                  <p style="margin: 4px 0;"><strong>Official Email:</strong> ${email}</p>
                  <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="color: #4A7B5B; font-weight: bold; font-size: 15px;">${rawTempPassword}</code></p>
                  <p style="margin: 4px 0;"><strong>Department:</strong> ${newEmployee.department}</p>
                  <p style="margin: 4px 0;"><strong>Designation:</strong> ${newEmployee.designation}</p>
                </div>
                <p style="font-size: 13px; color: #64748B;">
                  <strong>Note:</strong> Your temporary password is valid for 7 days. On your first login, you will verify your email via OTP and set a permanent personal password.
                </p>
                <p style="text-align: center; margin: 28px 0;">
                  <a href="${portalUrl}" style="background-color: #4A7B5B; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Log In to Employee ERP Portal
                  </a>
                </p>
              </div>
            `,
          },
        );
      } catch (err: any) {
        this.logger.warn(`Failed sending welcome email to employee ${employeeId}: ${err.message}`);
      }
    }

    const { password: _p, twoFactorSecret: _t, ...safeCreated } = newEmployee;
    return {
      success: true,
      message: `Employee ${newEmployee.fullName} created successfully.`,
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
   * Admin-Triggered Temporary Password Reset for Employee
   */
  async resetPassword(id: string, actorId: string) {
    const employee = await this.prisma.user.findUnique({ where: { id } });
    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    const rawTempPassword = `Swy@${crypto.randomBytes(3).toString('hex')}${crypto.randomInt(10, 99)}`;
    const hashedPassword = await bcryptLib.hash(rawTempPassword, 10);
    const temporaryPasswordExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
        temporaryPasswordExpiresAt,
        sessionVersion: (employee.sessionVersion || 1) + 1,
      },
    });

    // Invalidate existing sessions
    await this.prisma.userDeviceSession.deleteMany({
      where: { userId: id },
    });

    await this.auditService.logAction({
      module: 'EMPLOYEE_MANAGEMENT',
      action: 'EMPLOYEE_PASSWORD_RESET_BY_ADMIN',
      description: `Admin reset credentials for employee ${employee.fullName} (${employee.employeeId})`,
      userId: actorId,
      entityId: id,
      entityType: 'User',
      entityName: employee.fullName,
      targetUserId: id,
    });

    const targetEmail = employee.email || employee.personalEmail;
    if (this.emailChannel && targetEmail) {
      try {
        await this.emailChannel.send(
          {
            id: employee.id,
            name: employee.fullName,
            email: targetEmail,
            mobile: employee.mobile || undefined,
            type: 'STAFF',
          },
          {
            title: 'Swayam Admission — Account Credentials Reset',
            subject: 'Your Password Has Been Reset by Administration',
            message: `Dear ${employee.fullName},\n\nYour account credentials for Employee ID ${employee.employeeId} have been reset by IT administration.\n\nTemporary Password: ${rawTempPassword}\nPortal: https://erp.swayamadmission.com\n\nPlease log in and update your password.\n\nWarm regards,\nSwayam Admission IT Security`,
            emailHtml: `
              <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 8px;">
                <h3 style="color: #4A7B5B; margin-top: 0;">Account Credentials Reset</h3>
                <p>Dear <strong>${employee.fullName}</strong>,</p>
                <p>An administrator has reset your access credentials for Employee ID <strong>${employee.employeeId}</strong>.</p>
                <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 4px 0;"><strong>Employee ID:</strong> ${employee.employeeId}</p>
                  <p style="margin: 4px 0;"><strong>New Temporary Password:</strong> <code style="color: #4A7B5B; font-weight: bold; font-size: 15px;">${rawTempPassword}</code></p>
                </div>
                <p style="font-size: 13px; color: #64748B;">Please sign in to the Employee ERP Portal within 7 days to complete mandatory password setup.</p>
              </div>
            `,
          },
        );
      } catch (err: any) {
        this.logger.warn(`Failed sending reset email: ${err.message}`);
      }
    }

    return {
      success: true,
      message: `Temporary password generated and dispatched to ${targetEmail || 'employee'}.`,
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
