import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import { AuthorizationService } from './authorization.service';

import * as bcrypt from 'bcrypt';

const bcryptLib = bcrypt as unknown as {
  hash: (s: string, saltOrRounds: number) => Promise<string>;
  compare: (s: string, hash: string) => Promise<boolean>;
};

import { JwtService } from '@nestjs/jwt';
import { IdGeneratorService } from '../common/id-generator.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private authorizationService: AuthorizationService,
    private idGenerator: IdGeneratorService,
  ) {}

  async signup(dto: SignupDto) {
    const email = dto.email.trim().toLowerCase();
    const mobile = dto.mobile.trim();

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { mobile }, { personalEmail: email }, { personalMobile: mobile }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('Email or mobile already exists');
    }

    const hashedPassword = await bcryptLib.hash(dto.password, 10);

    let referralAttribution: any = null;
    let cleanReferralCode: string | null = null;

    if (dto.referralCode && dto.referralCode.trim()) {
      cleanReferralCode = dto.referralCode.trim().toUpperCase();
      const codeProfile = await this.prisma.studentReferralCode.findUnique({
        where: { code: cleanReferralCode },
        include: { user: true },
      });

      if (codeProfile && codeProfile.isActive) {
        const refUser = codeProfile.user;
        const userMob = mobile.replace(/\D/g, '').slice(-10);
        const refMob = (refUser.mobile || '').replace(/\D/g, '').slice(-10);
        if (refUser.email?.toLowerCase() !== email && refMob !== userMob) {
          referralAttribution = codeProfile;
        }
      }
    }

    const studentId = await this.idGenerator.generateStudentId();
    const registrationNumber = await this.idGenerator.generateRegistrationNumber();

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          fullName: dto.fullName.trim(),
          email,
          mobile,
          personalEmail: email,
          personalMobile: mobile,
          password: hashedPassword,
          role: Role.STUDENT,
          isApproved: true,
          isActive: true,
          status: 'ACTIVE',
          studentId,
          registrationNumber,
          hasCompletedReferralOnboarding: !!referralAttribution,
          referredByCode: referralAttribution ? cleanReferralCode : null,
          profile: {
            create: {
              nationality: 'Indian',
            },
          },
        },
      });

      if (referralAttribution) {
        await tx.studentReferral.create({
          data: {
            referralCode: cleanReferralCode!,
            referrerStudentId: referralAttribution.userId,
            referredStudentId: newUser.id,
            referredName: newUser.fullName,
            referredMobile: newUser.mobile,
            referredEmail: newUser.email,
            attributionSource: 'REGISTRATION',
            status: 'REGISTERED',
            fraudStatus: 'CLEAN',
          },
        });

        await tx.studentReferralCode.update({
          where: { id: referralAttribution.id },
          data: { totalLeads: { increment: 1 } },
        });
      }

      return newUser;
    });

    const { password, ...userWithoutPassword } = user;

    return {
      message: 'Signup successful',
      user: userWithoutPassword,
    };
  }

  /**
   * Google OAuth / One-Click Authentication Handler
   */
  async googleAuth(dto: { email: string; fullName: string; referralCode?: string }) {
    const email = dto.email.trim().toLowerCase();
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { personalEmail: email }],
      },
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      let referralAttribution: any = null;
      let cleanReferralCode: string | null = null;

      if (dto.referralCode && dto.referralCode.trim()) {
        cleanReferralCode = dto.referralCode.trim().toUpperCase();
        const codeProfile = await this.prisma.studentReferralCode.findUnique({
          where: { code: cleanReferralCode },
          include: { user: true },
        });
        if (codeProfile && codeProfile.isActive && codeProfile.user.email?.toLowerCase() !== email) {
          referralAttribution = codeProfile;
        }
      }

      const randomPass = await bcryptLib.hash(Math.random().toString(36), 10);
      const studentId = await this.idGenerator.generateStudentId();
      const registrationNumber = await this.idGenerator.generateRegistrationNumber();

      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            fullName: dto.fullName.trim() || 'Google Student',
            email,
            personalEmail: email,
            mobile: `G-${Date.now().toString().slice(-8)}`,
            password: randomPass,
            role: Role.STUDENT,
            isApproved: true,
            isActive: true,
            status: 'ACTIVE',
            studentId,
            registrationNumber,
            emailVerified: true,
            hasCompletedReferralOnboarding: !!referralAttribution,
            referredByCode: referralAttribution ? cleanReferralCode : null,
            profile: {
              create: {
                nationality: 'Indian',
              },
            },
          },
        });

        if (referralAttribution) {
          await tx.studentReferral.create({
            data: {
              referralCode: cleanReferralCode!,
              referrerStudentId: referralAttribution.userId,
              referredStudentId: created.id,
              referredName: created.fullName,
              referredMobile: created.mobile,
              referredEmail: created.email,
              attributionSource: 'GOOGLE_SIGNUP',
              status: 'REGISTERED',
              fraudStatus: 'CLEAN',
            },
          });

          await tx.studentReferralCode.update({
            where: { id: referralAttribution.id },
            data: { totalLeads: { increment: 1 } },
          });
        }

        return created;
      });
    } else if (user.role === Role.STUDENT) {
      // Auto-activate & ensure IDs for existing student signing in with Google
      const updates: any = {};
      if (!user.isApproved || user.status === 'PENDING_APPROVAL' || !user.isActive) {
        updates.isApproved = true;
        updates.status = 'ACTIVE';
        updates.isActive = true;
      }
      if (!user.studentId) {
        updates.studentId = await this.idGenerator.generateStudentId();
      }
      if (!user.registrationNumber) {
        updates.registrationNumber = await this.idGenerator.generateRegistrationNumber(new Date(user.createdAt).getFullYear());
      }
      if (Object.keys(updates).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
      }
    }

    const token = await this.jwtService.signAsync({
      id: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion || 1,
    });

    const { password, ...userWithoutPassword } = user;

    return {
      message: isNewUser ? 'Account created with Google' : 'Login successful',
      access_token: token,
      isNewUser,
      user: userWithoutPassword,
    };
  }

  /**
   * Centralized Unified Enterprise Login
   * Resolves: Company Email -> Position -> Active Holder -> Password -> Dynamic IAM -> Scope -> JWT Session
   */
  async login(dto: LoginDto) {
    const identifier = dto.email.trim();
    const identifierLower = identifier.toLowerCase();

    // -------------------------------------------------------------
    // Path 1: Company Email / Position Account Login
    // -------------------------------------------------------------
    const position = await this.prisma.position.findUnique({
      where: { companyEmail: identifierLower },
      include: {
        department: { select: { id: true, name: true, code: true } },
        unit: { select: { id: true, name: true, code: true } },
        roleEntity: { select: { id: true, name: true, slug: true, color: true } },
        state: { select: { id: true, name: true, code: true } },
        district: { select: { id: true, name: true, code: true } },
        assignments: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: { user: true },
        },
      },
    });

    if (position) {
      if (position.emailStatus !== 'ACTIVE' || position.positionStatus === 'RETIRED') {
        throw new UnauthorizedException(
          `This position account is currently ${position.positionStatus.toLowerCase()}. Access denied.`,
        );
      }

      if (!position.assignments || position.assignments.length === 0) {
        throw new UnauthorizedException(
          'This organizational position currently has no active assigned staff member. Please contact your IAM Administrator.',
        );
      }

      const activeAssignment = position.assignments[0];
      const user = activeAssignment.user;

      // Status checks
      if (user.status === 'LOCKED') {
        throw new UnauthorizedException(
          `Account is temporarily locked: ${user.lockReason || 'Security review in progress'}. Contact administrator.`,
        );
      }
      if (user.status === 'RESIGNED') {
        throw new UnauthorizedException(
          'Employee account has resigned. Corporate post access revoked.',
        );
      }
      if (user.status === 'DISABLED' || !user.isActive) {
        throw new UnauthorizedException('Staff account has been disabled.');
      }
      if (user.status === 'PENDING_APPROVAL' || !user.isApproved) {
        throw new UnauthorizedException(
          'Staff onboarding is pending administrative KYC approval.',
        );
      }

      // Password comparison (Against active employee's password)
      const isPasswordValid = await bcryptLib.compare(
        dto.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const sessionVersion = user.sessionVersion || 1;
      const mustChangePassword = user.mustChangePassword || false;

      const token = await this.jwtService.signAsync({
        id: user.id,
        email: user.email,
        companyEmail: position.companyEmail,
        positionId: position.id,
        positionCode: position.code,
        role: user.role,
        sessionVersion,
        mustChangePassword,
      });

      // IAM Access resolution
      let iamAccess = {
        roles: [] as any[],
        effectivePermissions: [] as string[],
        dataScopes: [] as string[],
        isSuperAdmin: user.role === Role.SUPER_ADMIN,
      };

      try {
        const access = await this.authorizationService.getUserEffectiveAccess(user.id);
        iamAccess = {
          roles: access.roles,
          effectivePermissions: access.effectivePermissions,
          dataScopes: access.dataScopes,
          isSuperAdmin: access.isSuperAdmin || user.role === Role.SUPER_ADMIN,
        };
      } catch {
        iamAccess.isSuperAdmin = user.role === Role.SUPER_ADMIN;
      }

      const { password, ...userWithoutPassword } = user;

      return {
        message: 'Login successful',
        access_token: token,
        mustChangePassword,
        position: {
          id: position.id,
          code: position.code,
          title: position.title,
          companyEmail: position.companyEmail,
          department: position.department,
          unit: position.unit,
          role: position.roleEntity,
          state: position.state,
          district: position.district,
          assignmentId: activeAssignment.id,
          joinedAt: activeAssignment.joinedAt,
        },
        user: {
          ...userWithoutPassword,
          roles: iamAccess.roles,
          effectivePermissions: iamAccess.effectivePermissions,
          dataScopes: iamAccess.dataScopes,
          isSuperAdmin: iamAccess.isSuperAdmin,
        },
      };
    }

    // -------------------------------------------------------------
    // Path 2: Personal Login (Personal Email, Username, or Mobile)
    // -------------------------------------------------------------
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifierLower },
          { mobile: identifier },
          { personalEmail: identifierLower },
          { personalMobile: identifier },
          { username: identifier },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let activeUser = user;

    // Student account auto-approval & identity guarantee
    if (activeUser.role === Role.STUDENT) {
      const studentUpdates: any = {};
      if (!activeUser.isApproved || activeUser.status === 'PENDING_APPROVAL' || !activeUser.isActive) {
        studentUpdates.isApproved = true;
        studentUpdates.status = 'ACTIVE';
        studentUpdates.isActive = true;
      }
      if (!activeUser.studentId) {
        studentUpdates.studentId = await this.idGenerator.generateStudentId();
      }
      if (!activeUser.registrationNumber) {
        studentUpdates.registrationNumber = await this.idGenerator.generateRegistrationNumber(
          new Date(activeUser.createdAt).getFullYear(),
        );
      }
      if (Object.keys(studentUpdates).length > 0) {
        activeUser = await this.prisma.user.update({
          where: { id: activeUser.id },
          data: studentUpdates,
        });
      }
    }

    // Status checks
    if (activeUser.status === 'LOCKED') {
      throw new UnauthorizedException(
        `Account is temporarily locked: ${activeUser.lockReason || 'Security review in progress'}. Contact administrator.`,
      );
    }
    if (activeUser.status === 'RESIGNED') {
      throw new UnauthorizedException(
        'Staff member has resigned. Account login is inactive.',
      );
    }
    if (activeUser.status === 'DISABLED' || !activeUser.isActive) {
      throw new UnauthorizedException('User account is disabled.');
    }
    if ((activeUser.status === 'PENDING_APPROVAL' || !activeUser.isApproved) && activeUser.role !== Role.STUDENT) {
      throw new UnauthorizedException(
        'Staff onboarding is pending administrative KYC approval.',
      );
    }

    const isPasswordValid = await bcryptLib.compare(
      dto.password,
      activeUser.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionVersion = activeUser.sessionVersion || 1;
    const mustChangePassword = activeUser.mustChangePassword || false;

    // Check if user holds an active position
    const activeAssignment = await this.prisma.positionAssignment.findFirst({
      where: { userId: activeUser.id, status: 'ACTIVE' },
      include: {
        position: {
          include: {
            department: { select: { id: true, name: true, code: true } },
            unit: { select: { id: true, name: true, code: true } },
            roleEntity: { select: { id: true, name: true, slug: true, color: true } },
            state: { select: { id: true, name: true, code: true } },
            district: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    const tokenPayload: any = {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionVersion,
      mustChangePassword,
    };

    if (activeAssignment?.position) {
      tokenPayload.companyEmail = activeAssignment.position.companyEmail;
      tokenPayload.positionId = activeAssignment.position.id;
      tokenPayload.positionCode = activeAssignment.position.code;
    }

    const token = await this.jwtService.signAsync(tokenPayload);

    // Resolve Dynamic IAM roles & effective permissions
    let iamAccess = {
      roles: [] as any[],
      effectivePermissions: [] as string[],
      dataScopes: [] as string[],
      isSuperAdmin: user.role === Role.SUPER_ADMIN,
    };

    try {
      const access = await this.authorizationService.getUserEffectiveAccess(user.id);
      iamAccess = {
        roles: access.roles,
        effectivePermissions: access.effectivePermissions,
        dataScopes: access.dataScopes,
        isSuperAdmin: access.isSuperAdmin || user.role === Role.SUPER_ADMIN,
      };
    } catch {
      iamAccess.isSuperAdmin = user.role === Role.SUPER_ADMIN;
    }

    const { password, ...userWithoutPassword } = user;

    return {
      message: 'Login successful',
      access_token: token,
      mustChangePassword,
      position: activeAssignment?.position
        ? {
            id: activeAssignment.position.id,
            code: activeAssignment.position.code,
            title: activeAssignment.position.title,
            companyEmail: activeAssignment.position.companyEmail,
            department: activeAssignment.position.department,
            unit: activeAssignment.position.unit,
            role: activeAssignment.position.roleEntity,
            state: activeAssignment.position.state,
            district: activeAssignment.position.district,
            assignmentId: activeAssignment.id,
            joinedAt: activeAssignment.joinedAt,
          }
        : null,
      user: {
        ...userWithoutPassword,
        roles: iamAccess.roles,
        effectivePermissions: iamAccess.effectivePermissions,
        dataScopes: iamAccess.dataScopes,
        isSuperAdmin: iamAccess.isSuperAdmin,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check session version
      if (payload.sessionVersion && payload.sessionVersion !== (user.sessionVersion || 1)) {
        throw new UnauthorizedException('Session expired due to password reset or administrative revocation.');
      }

      if (user.status === 'LOCKED' || user.status === 'RESIGNED' || user.status === 'DISABLED' || !user.isActive) {
        throw new UnauthorizedException('Account is not active.');
      }

      const token = await this.jwtService.signAsync({
        id: user.id,
        email: user.email,
        role: user.role,
        sessionVersion: user.sessionVersion || 1,
        mustChangePassword: user.mustChangePassword || false,
      });

      let iamAccess = {
        roles: [] as any[],
        effectivePermissions: [] as string[],
        dataScopes: [] as string[],
        isSuperAdmin: user.role === Role.SUPER_ADMIN,
      };

      try {
        const access = await this.authorizationService.getUserEffectiveAccess(user.id);
        iamAccess = {
          roles: access.roles,
          effectivePermissions: access.effectivePermissions,
          dataScopes: access.dataScopes,
          isSuperAdmin: access.isSuperAdmin || user.role === Role.SUPER_ADMIN,
        };
      } catch {
        iamAccess.isSuperAdmin = user.role === Role.SUPER_ADMIN;
      }

      const { password, ...userWithoutPassword } = user;

      return {
        message: 'Token refreshed successfully',
        access_token: token,
        user: {
          ...userWithoutPassword,
          roles: iamAccess.roles,
          effectivePermissions: iamAccess.effectivePermissions,
          dataScopes: iamAccess.dataScopes,
          isSuperAdmin: iamAccess.isSuperAdmin,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout() {
    return {
      message: 'Logout successful',
    };
  }

  /**
   * Password Recovery Policy:
   * - Counselors: Self-service allowed
   * - Enterprise Company-Position accounts: Disallowed, must contact Admin
   */
  async forgotPassword(email: string) {
    const identifier = email.trim().toLowerCase();

    // Check if company position email
    const position = await this.prisma.position.findUnique({
      where: { companyEmail: identifier },
    });

    if (position && !position.selfServicePasswordReset) {
      throw new ForbiddenException(
        'Self-service password reset is disabled for enterprise company-position accounts by security policy. Please contact your IAM Administrator / HR for authorized password recovery.',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { personalEmail: identifier }],
      },
    });

    if (!user) {
      return {
        message:
          'If an account exists with this email, a password reset link has been sent.',
      };
    }

    if (!user.selfServicePasswordReset) {
      throw new ForbiddenException(
        'Self-service password reset is disabled for this account by organizational security policy. Please contact your IAM Administrator.',
      );
    }

    const token = await this.jwtService.signAsync(
      { id: user.id, email: user.email, sessionVersion: user.sessionVersion || 1, action: 'RESET_PASSWORD' },
      { expiresIn: '1h' },
    );

    return {
      message: 'Password reset link generated',
      reset_token: token,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });
      if (!user) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      if (!user.selfServicePasswordReset) {
        throw new ForbiddenException(
          'Self-service password reset is disabled for this account.',
        );
      }

      const hashedPassword = await bcryptLib.hash(newPassword, 10);
      const newSessionVersion = (user.sessionVersion || 1) + 1;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
          sessionVersion: newSessionVersion,
        },
      });

      return {
        message: 'Password reset successfully',
      };
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      throw new BadRequestException('Invalid or expired reset token');
    }
  }
}
