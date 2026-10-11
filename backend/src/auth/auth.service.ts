import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import {
  SendMobileOtpDto,
  VerifyMobileOtpDto,
  GoogleAuthDto,
  SendEmailVerificationDto,
  VerifyEmailDto,
  ForgotPasswordSendOtpDto,
  ForgotPasswordVerifyOtpDto,
  ResetPasswordWithTokenDto,
  SendRegistrationMobileOtpDto,
  VerifyRegistrationMobileOtpDto,
  SendRegistrationEmailOtpDto,
  VerifyRegistrationEmailOtpDto,
  SendMobileVerificationDto,
  VerifyUserMobileDto,
} from './dto/auth-extra.dto';
import { Role } from '@prisma/client';
import { AuthorizationService } from './authorization.service';

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const bcryptLib = bcrypt as unknown as {
  hash: (s: string, saltOrRounds: number) => Promise<string>;
  compare: (s: string, hash: string) => Promise<boolean>;
};

import { JwtService } from '@nestjs/jwt';
import { IdGeneratorService } from '../common/id-generator.service';
import { ConsentService } from '../legal/consent.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private authorizationService: AuthorizationService,
    private idGenerator: IdGeneratorService,
    private consentService: ConsentService,
  ) {}

  /**
   * India +91 mobile number normalizer.
   * Strips non-digits, extracts last 10 digits, validates Indian mobile series (6, 7, 8, 9).
   * Returns canonical E.164 format: +91XXXXXXXXXX.
   */
  normalizeMobile(rawMobile: string): string {
    if (!rawMobile) {
      throw new BadRequestException('Mobile number is required.');
    }
    const cleaned = rawMobile.replace(/[^\d+]/g, '');
    let digits = cleaned.replace(/\D/g, '');

    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) {
      throw new BadRequestException(
        'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).',
      );
    }

    return `+91${digits}`;
  }

  /**
   * Safely normalizes and validates email format.
   * Rejects disposable/temporary email domains.
   */
  normalizeEmail(rawEmail: string): string {
    if (!rawEmail || !rawEmail.trim()) {
      throw new BadRequestException('Email address is required.');
    }
    const email = rawEmail.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Please enter a valid email address.');
    }

    const domain = email.split('@')[1];
    const DISPOSABLE_DOMAINS = new Set([
      'mailinator.com',
      'tempmail.com',
      '10minutemail.com',
      'guerrillamail.com',
      'yopmail.com',
      'sharklasers.com',
      'dispostable.com',
      'trashmail.com',
      'getairmail.com',
      'mytemp.email',
      'temp-mail.org',
      'fakeinbox.com',
      'throwawaymail.com',
    ]);

    if (DISPOSABLE_DOMAINS.has(domain)) {
      throw new BadRequestException(
        'Disposable or temporary email domains are not permitted. Please use your personal or official email.',
      );
    }

    return email;
  }

  /**
   * SHA-256 HMAC/Salted Hash for fast, secure constant-time OTP verification.
   * Never stores plain-text OTPs in database.
   */
  private hashOtp(otp: string): string {
    const salt = process.env.JWT_SECRET || 'swayam-secret-otp-salt';
    return crypto.createHash('sha256').update(`${otp}:${salt}`).digest('hex');
  }

  private verifyOtpHash(otp: string, hash: string): boolean {
    const computed = this.hashOtp(otp);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  }

  /**
   * Enforces rigorous account status security checks.
   * Supports ACTIVE, PENDING_VERIFICATION, SUSPENDED, LOCKED, DEACTIVATED, RESIGNED.
   */
  enforceAccountState(user: {
    status?: string | null;
    isActive?: boolean | null;
    lockReason?: string | null;
  }) {
    if (user.status === 'LOCKED') {
      throw new UnauthorizedException(
        `Account is temporarily locked: ${user.lockReason || 'Security review in progress'}. Please contact administrator.`,
      );
    }
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException(
        'Account has been suspended. Please contact support.',
      );
    }
    if (
      user.status === 'DEACTIVATED' ||
      user.status === 'DISABLED' ||
      user.isActive === false
    ) {
      throw new UnauthorizedException(
        'Account has been deactivated. Please contact support.',
      );
    }
    if (user.status === 'RESIGNED') {
      throw new UnauthorizedException(
        'Staff member has resigned. Account login is inactive.',
      );
    }
  }

  /**
   * Issues short-lived access token (15m) and securely rotates refresh token (7d).
   */
  private async issueTokens(user: {
    id: string;
    email?: string | null;
    role: string;
    sessionVersion?: number | null;
    mustChangePassword?: boolean | null;
  }) {
    const sessionVersion = user.sessionVersion || 1;
    const access_token = await this.jwtService.signAsync(
      {
        id: user.id,
        email: user.email || '',
        role: user.role,
        sessionVersion,
        mustChangePassword: user.mustChangePassword || false,
      },
      { expiresIn: '15m' },
    );

    const rawRefreshRandom = crypto.randomBytes(40).toString('hex');
    const refresh_token = await this.jwtService.signAsync(
      {
        id: user.id,
        tokenKey: rawRefreshRandom,
        sessionVersion,
      },
      { expiresIn: '7d' },
    );

    const tokenHash = crypto
      .createHash('sha256')
      .update(refresh_token)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return { access_token, refresh_token };
  }

  /**
   * Logs authentication events to persistent AuditLog without exposing sensitive data.
   */
  private async logAuthEvent(params: {
    userId?: string;
    action: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          description: params.description,
          module: 'AUTH',
          severity: 'INFO',
          status: 'SUCCESS',
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch {
      // Non-blocking audit failure
    }
  }

  /**
   * 1. Send Mobile OTP (Indian numbers +91)
   * Enforces 5-minute expiry, 30s resend cooldown, max 5 attempts/15min rate limiting.
   */
  async sendMobileOtp(dto: SendMobileOtpDto, ipAddress?: string) {
    const normalizedMobile = this.normalizeMobile(dto.mobile);

    // Rate limiting: max 5 OTP requests per mobile in 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentOtps = await this.prisma.otpVerification.findMany({
      where: {
        identifier: normalizedMobile,
        type: 'MOBILE_LOGIN',
        createdAt: { gte: fifteenMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtps.length >= 5) {
      throw new BadRequestException(
        'Too many OTP requests. Please wait 15 minutes before requesting again.',
      );
    }

    // Cooldown check: 30 seconds
    if (recentOtps.length > 0) {
      const latest = recentOtps[0];
      if (latest.resendAfter && latest.resendAfter > new Date()) {
        const remainingSeconds = Math.ceil(
          (latest.resendAfter.getTime() - Date.now()) / 1000,
        );
        throw new BadRequestException(
          `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
        );
      }
    }

    // Invalidate previous active OTPs for this mobile
    await this.prisma.otpVerification.updateMany({
      where: {
        identifier: normalizedMobile,
        type: 'MOBILE_LOGIN',
        isUsed: false,
      },
      data: { isUsed: true },
    });

    // Generate secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = this.hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const resendAfter = new Date(Date.now() + 30 * 1000); // 30s cooldown

    await this.prisma.otpVerification.create({
      data: {
        type: 'MOBILE_LOGIN',
        identifier: normalizedMobile,
        otpHash,
        expiresAt,
        resendAfter,
        attempts: 0,
        maxAttempts: 5,
        ipAddress,
      },
    });

    await this.logAuthEvent({
      action: 'AUTH_OTP_REQUESTED',
      description: `OTP requested for mobile ${normalizedMobile.slice(0, 6)}****${normalizedMobile.slice(-2)}`,
      ipAddress,
    });

    return {
      success: true,
      mobile: normalizedMobile,
      message: `OTP sent successfully to ${normalizedMobile.slice(0, 3)} ******${normalizedMobile.slice(-4)}. Valid for 5 minutes.`,
      resendCooldownSeconds: 30,
      expiresInSeconds: 300,
    };
  }

  /**
   * 2. Verify Mobile OTP and Login / Register Student
   * Immediate invalidation on success, attempt throttling, referral attribution, AuthIdentity linking.
   */
  async verifyMobileOtp(dto: VerifyMobileOtpDto, ipAddress?: string) {
    const normalizedMobile = this.normalizeMobile(dto.mobile);
    const cleanOtp = (dto.otp || '').trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      throw new BadRequestException('Please enter a valid 6-digit OTP.');
    }

    const activeOtp = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: normalizedMobile,
        type: 'MOBILE_LOGIN',
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeOtp) {
      throw new BadRequestException(
        'No active OTP found. Please request a new OTP.',
      );
    }

    if (activeOtp.expiresAt < new Date()) {
      await this.prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      await this.prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new OTP.',
      );
    }

    // Increment attempts count
    const newAttempts = activeOtp.attempts + 1;
    await this.prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: { attempts: newAttempts },
    });

    const isMatch = this.verifyOtpHash(cleanOtp, activeOtp.otpHash);
    if (!isMatch) {
      const remaining = activeOtp.maxAttempts - newAttempts;
      if (remaining <= 0) {
        await this.prisma.otpVerification.update({
          where: { id: activeOtp.id },
          data: { isUsed: true },
        });
        throw new BadRequestException(
          'Incorrect OTP. Maximum attempts reached. Please request a new OTP.',
        );
      }
      throw new BadRequestException(
        `Incorrect OTP. Please check and re-enter. (${remaining} attempts remaining)`,
      );
    }

    // Invalidate OTP immediately upon successful verification
    await this.prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: { isUsed: true },
    });

    // Check AuthIdentity first
    const authIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'MOBILE_OTP',
          providerAccountId: normalizedMobile,
        },
      },
      include: { user: true },
    });

    let user: any = authIdentity?.user;

    if (!user) {
      // Check existing user by mobile variations
      const rawDigits = normalizedMobile.replace(/\D/g, '').slice(-10);
      user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { mobile: normalizedMobile },
            { mobile: rawDigits },
            { personalMobile: normalizedMobile },
            { personalMobile: rawDigits },
          ],
        },
      });
    }

    let isNewUser = false;

    if (!user) {
      // Create new student account
      isNewUser = true;
      const studentId = await this.idGenerator.generateStudentId();
      const registrationNumber = await this.idGenerator.generateRegistrationNumber();

      // Referral code processing
      let referralAttribution: any = null;
      let cleanReferralCode: string | null = null;
      if (dto.referralCode && dto.referralCode.trim()) {
        cleanReferralCode = dto.referralCode.trim().toUpperCase();
        const codeProfile = await this.prisma.studentReferralCode.findUnique({
          where: { code: cleanReferralCode },
          include: { user: true },
        });
        if (codeProfile && codeProfile.isActive) {
          referralAttribution = codeProfile;
        }
      }

      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            fullName: dto.fullName?.trim() || 'Student',
            mobile: normalizedMobile,
            personalMobile: normalizedMobile,
            role: Role.STUDENT,
            isApproved: true,
            isActive: true,
            status: 'ACTIVE',
            phoneVerified: true,
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

        await tx.authIdentity.create({
          data: {
            userId: created.id,
            provider: 'MOBILE_OTP',
            providerAccountId: normalizedMobile,
          },
        });

        if (referralAttribution) {
          await tx.studentReferral.create({
            data: {
              referralCode: cleanReferralCode!,
              referrerStudentId: referralAttribution.userId,
              referredStudentId: created.id,
              referredName: created.fullName,
              referredMobile: created.mobile || normalizedMobile,
              referredEmail: created.email || null,
              attributionSource: 'MOBILE_OTP_REGISTRATION',
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
    } else {
      // Link identity if missing
      if (!authIdentity) {
        await this.prisma.authIdentity.upsert({
          where: {
            provider_providerAccountId: {
              provider: 'MOBILE_OTP',
              providerAccountId: normalizedMobile,
            },
          },
          update: { userId: user.id },
          create: {
            userId: user.id,
            provider: 'MOBILE_OTP',
            providerAccountId: normalizedMobile,
          },
        });
      }

      this.enforceAccountState(user);

      // Auto-assign student IDs & ensure phoneVerified
      const studentUpdates: any = {};
      if (user.role === Role.STUDENT) {
        if (!user.studentId) studentUpdates.studentId = await this.idGenerator.generateStudentId();
        if (!user.registrationNumber) studentUpdates.registrationNumber = await this.idGenerator.generateRegistrationNumber();
        if (!user.phoneVerified) studentUpdates.phoneVerified = true;
        if (!user.isApproved || user.status === 'PENDING_APPROVAL') {
          studentUpdates.isApproved = true;
          studentUpdates.status = 'ACTIVE';
        }
        if (Object.keys(studentUpdates).length > 0) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: studentUpdates,
          });
        }
      }
    }

    const tokens = await this.issueTokens(user);

    await this.logAuthEvent({
      userId: user.id,
      action: isNewUser ? 'AUTH_STUDENT_REGISTERED' : 'AUTH_LOGIN_SUCCESS',
      description: `Student authenticated via Mobile OTP (${normalizedMobile})`,
      ipAddress,
    });

    const { password, ...userWithoutPassword } = user;

    return {
      message: isNewUser ? 'Account registered successfully' : 'Login successful',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      isNewUser,
      user: userWithoutPassword,
    };
  }

  /**
   * 3. Google OAuth & Student Registration
   * Links Google identity through AuthIdentity, prevents duplicate records, supports referral code.
   */
  async googleAuth(dto: GoogleAuthDto, ipAddress?: string) {
    const email = this.normalizeEmail(dto.email);
    const googleId = dto.googleId || email;

    // 1. Check AuthIdentity
    const authIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'GOOGLE',
          providerAccountId: googleId,
        },
      },
      include: { user: true },
    });

    let user: any = authIdentity?.user;

    // 2. Fallback check by email
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email }, { personalEmail: email }],
        },
      });
    }

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
        if (codeProfile && codeProfile.isActive) {
          referralAttribution = codeProfile;
        }
      }

      const randomPass = await bcryptLib.hash(crypto.randomBytes(24).toString('hex'), 10);
      const studentId = await this.idGenerator.generateStudentId();
      const registrationNumber = await this.idGenerator.generateRegistrationNumber();

      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            fullName: dto.fullName?.trim() || 'Student',
            email,
            personalEmail: email,
            password: randomPass,
            role: Role.STUDENT,
            isApproved: true,
            isActive: true,
            status: 'ACTIVE',
            emailVerified: true,
            emailVerifiedAt: new Date(),
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

        await tx.authIdentity.create({
          data: {
            userId: created.id,
            provider: 'GOOGLE',
            providerAccountId: googleId,
            email,
          },
        });

        if (referralAttribution) {
          await tx.studentReferral.create({
            data: {
              referralCode: cleanReferralCode!,
              referrerStudentId: referralAttribution.userId,
              referredStudentId: created.id,
              referredName: created.fullName,
              referredMobile: created.mobile || '',
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
    } else {
      // Link Google AuthIdentity if missing
      if (!authIdentity) {
        await this.prisma.authIdentity.upsert({
          where: {
            provider_providerAccountId: {
              provider: 'GOOGLE',
              providerAccountId: googleId,
            },
          },
          update: { userId: user.id },
          create: {
            userId: user.id,
            provider: 'GOOGLE',
            providerAccountId: googleId,
            email,
          },
        });
      }

      this.enforceAccountState(user);

      // Auto-activate & ensure student identifiers
      const studentUpdates: any = {};
      if (user.role === Role.STUDENT) {
        if (!user.studentId) studentUpdates.studentId = await this.idGenerator.generateStudentId();
        if (!user.registrationNumber) studentUpdates.registrationNumber = await this.idGenerator.generateRegistrationNumber();
        if (!user.emailVerified) {
          studentUpdates.emailVerified = true;
          studentUpdates.emailVerifiedAt = new Date();
        }
        if (!user.isApproved || user.status === 'PENDING_APPROVAL') {
          studentUpdates.isApproved = true;
          studentUpdates.status = 'ACTIVE';
        }
        if (Object.keys(studentUpdates).length > 0) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: studentUpdates,
          });
        }
      }
    }

    const tokens = await this.issueTokens(user);

    await this.logAuthEvent({
      userId: user.id,
      action: 'AUTH_GOOGLE_LOGIN',
      description: `User authenticated via Google (${email})`,
      ipAddress,
    });

    const { password, ...userWithoutPassword } = user;

    return {
      message: isNewUser ? 'Account created with Google' : 'Login successful',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      isNewUser,
      user: userWithoutPassword,
    };
  }

  async loginWithGoogle(dto: GoogleAuthDto, ipAddress?: string) {
    return this.googleAuth(dto, ipAddress);
  }

  /**
   * 4a. Send Registration Mobile OTP
   * Validates +91 mobile, ensures not already registered, enforces 30s resend cooldown.
   */
  async sendRegistrationMobileOtp(dto: SendRegistrationMobileOtpDto, ipAddress?: string) {
    const normalizedMobile = this.normalizeMobile(dto.mobile);

    // Ensure mobile is not already registered
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { mobile: normalizedMobile },
          { personalMobile: normalizedMobile },
          { mobile: normalizedMobile.slice(-10) },
          { personalMobile: normalizedMobile.slice(-10) },
        ],
      },
    });
    if (existing) {
      throw new ConflictException('This mobile number is already registered. Please log in.');
    }

    // Cooldown check (30s)
    const latestOtp = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: normalizedMobile,
        type: 'REGISTRATION_MOBILE',
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestOtp && latestOtp.resendAfter && latestOtp.resendAfter > new Date()) {
      const remainingSeconds = Math.ceil(
        (latestOtp.resendAfter.getTime() - Date.now()) / 1000,
      );
      throw new BadRequestException(
        `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
      );
    }

    // Invalidate previous pending OTPs
    await this.prisma.otpVerification.updateMany({
      where: {
        identifier: normalizedMobile,
        type: 'REGISTRATION_MOBILE',
        isUsed: false,
      },
      data: { isUsed: true },
    });

    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = this.hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const resendAfter = new Date(Date.now() + 30 * 1000); // 30s cooldown

    await this.prisma.otpVerification.create({
      data: {
        identifier: normalizedMobile,
        type: 'REGISTRATION_MOBILE',
        otpHash,
        expiresAt,
        resendAfter,
        attempts: 0,
        maxAttempts: 5,
        ipAddress,
      },
    });

    await this.logAuthEvent({
      action: 'AUTH_OTP_REQUESTED',
      description: `Registration OTP requested for ${normalizedMobile.slice(0, 6)}****${normalizedMobile.slice(-2)}`,
      ipAddress,
    });

    return {
      success: true,
      mobile: normalizedMobile,
      message: `OTP sent successfully to ${normalizedMobile.slice(0, 3)} ******${normalizedMobile.slice(-4)}. Valid for 5 minutes.`,
      resendCooldownSeconds: 30,
      expiresInSeconds: 300,
    };
  }

  /**
   * 4b. Verify Registration Mobile OTP
   * Verifies OTP, marks used, and issues a 15-minute single-use registration verification token.
   */
  async verifyRegistrationMobileOtp(dto: VerifyRegistrationMobileOtpDto, ipAddress?: string) {
    const normalizedMobile = this.normalizeMobile(dto.mobile);
    const cleanOtp = (dto.otp || '').trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      throw new BadRequestException('Please enter a valid 6-digit OTP.');
    }

    const activeOtp = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: normalizedMobile,
        type: 'REGISTRATION_MOBILE',
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeOtp) {
      throw new BadRequestException('No active OTP found. Please request an OTP.');
    }

    if (activeOtp.expiresAt < new Date()) {
      await this.prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      await this.prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    // Increment attempts
    const newAttempts = activeOtp.attempts + 1;
    await this.prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: { attempts: newAttempts },
    });

    const isMatch = this.verifyOtpHash(cleanOtp, activeOtp.otpHash);
    if (!isMatch) {
      const remaining = activeOtp.maxAttempts - newAttempts;
      if (remaining <= 0) {
        await this.prisma.otpVerification.update({
          where: { id: activeOtp.id },
          data: { isUsed: true },
        });
        throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP.');
      }
      throw new BadRequestException(`Incorrect OTP. Please check and re-enter. (${remaining} attempts remaining)`);
    }

    // Mark OTP used
    await this.prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: { isUsed: true },
    });

    // Generate single-use verification token valid for 15 minutes
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashOtp(rawVerificationToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Invalidate previous verification tokens for this mobile
    await this.prisma.otpVerification.updateMany({
      where: {
        identifier: normalizedMobile,
        type: 'REGISTRATION_VERIFIED_TOKEN',
        isUsed: false,
      },
      data: { isUsed: true },
    });

    await this.prisma.otpVerification.create({
      data: {
        identifier: normalizedMobile,
        type: 'REGISTRATION_VERIFIED_TOKEN',
        otpHash: tokenHash,
        expiresAt,
        ipAddress,
      },
    });

    return {
      success: true,
      mobile: normalizedMobile,
      verificationToken: rawVerificationToken,
      message: 'Mobile number verified successfully.',
    };
  }

  /**
   * 4b-email. Send Registration Email OTP
   */
  async sendRegistrationEmailOtp(dto: SendRegistrationEmailOtpDto, ipAddress?: string) {
    const email = dto.email.toLowerCase().trim();

    // Ensure email is not already registered
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { personalEmail: email },
        ],
      },
    });
    if (existing) {
      throw new ConflictException('This email is already registered. Please log in.');
    }

    // Cooldown check (30s)
    const latestOtp = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: email,
        type: 'REGISTRATION_EMAIL',
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestOtp && latestOtp.resendAfter && latestOtp.resendAfter > new Date()) {
      const remainingSeconds = Math.ceil(
        (latestOtp.resendAfter.getTime() - Date.now()) / 1000,
      );
      throw new BadRequestException(
        `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
      );
    }

    // Invalidate previous pending OTPs
    await this.prisma.otpVerification.updateMany({
      where: {
        identifier: email,
        type: 'REGISTRATION_EMAIL',
        isUsed: false,
      },
      data: { isUsed: true },
    });

    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = this.hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const resendAfter = new Date(Date.now() + 30 * 1000); // 30s cooldown

    await this.prisma.otpVerification.create({
      data: {
        identifier: email,
        type: 'REGISTRATION_EMAIL',
        otpHash,
        expiresAt,
        resendAfter,
        attempts: 0,
        maxAttempts: 5,
        ipAddress,
      },
    });

    await this.logAuthEvent({
      action: 'AUTH_OTP_REQUESTED',
      description: `Email Registration OTP requested for ${email}`,
      ipAddress,
    });

    return {
      success: true,
      email,
      message: `OTP sent successfully to ${email}. Valid for 5 minutes.`,
      resendCooldownSeconds: 30,
      expiresInSeconds: 300,
    };
  }

  /**
   * 4b-email. Verify Registration Email OTP
   */
  async verifyRegistrationEmailOtp(dto: VerifyRegistrationEmailOtpDto, ipAddress?: string) {
    const email = dto.email.toLowerCase().trim();
    const cleanOtp = (dto.otp || '').trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      throw new BadRequestException('Please enter a valid 6-digit OTP.');
    }

    const activeOtp = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: email,
        type: 'REGISTRATION_EMAIL',
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeOtp) {
      throw new BadRequestException('No active OTP found. Please request an OTP.');
    }

    if (activeOtp.expiresAt < new Date()) {
      await this.prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      await this.prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    const newAttempts = activeOtp.attempts + 1;
    await this.prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: { attempts: newAttempts },
    });

    const isMatch = this.verifyOtpHash(cleanOtp, activeOtp.otpHash);
    if (!isMatch) {
      const remaining = activeOtp.maxAttempts - newAttempts;
      if (remaining <= 0) {
        await this.prisma.otpVerification.update({
          where: { id: activeOtp.id },
          data: { isUsed: true },
        });
        throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP.');
      }
      throw new BadRequestException(`Incorrect OTP. Please check and re-enter. (${remaining} attempts remaining)`);
    }

    await this.prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: { isUsed: true },
    });

    // Generate single-use verification token valid for 15 minutes
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashOtp(rawVerificationToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.otpVerification.updateMany({
      where: {
        identifier: email,
        type: 'REGISTRATION_EMAIL_VERIFIED_TOKEN',
        isUsed: false,
      },
      data: { isUsed: true },
    });

    await this.prisma.otpVerification.create({
      data: {
        identifier: email,
        type: 'REGISTRATION_EMAIL_VERIFIED_TOKEN',
        otpHash: tokenHash,
        expiresAt,
        ipAddress,
      },
    });

    return {
      success: true,
      email,
      verificationToken: rawVerificationToken,
      message: 'Email verified successfully.',
    };
  }

  /**
   * 4c. Create Account / Traditional Signup
   * Enforces matching passwords, required state, required district, and verified mobile OTP token.
   */
  async signup(dto: SignupDto, ipAddress?: string) {
    if (!dto.fullName || !dto.fullName.trim()) {
      throw new BadRequestException('Full name is required.');
    }

    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters.');
    }

    if (dto.confirmPassword && dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and Confirm Password do not match.');
    }

    if (!dto.state || !dto.state.trim()) {
      throw new BadRequestException('State is required.');
    }

    if (!dto.district || !dto.district.trim()) {
      throw new BadRequestException('District is required.');
    }

    const mobile = this.normalizeMobile(dto.mobile);
    const email = dto.email ? this.normalizeEmail(dto.email) : null;

    // MANDATORY BACKEND MOBILE VERIFICATION CHECK (Requirement 2)
    if (!dto.verificationToken || !dto.verificationToken.trim()) {
      throw new BadRequestException('Mobile number verification is required before creating an account. Please verify your mobile number with OTP.');
    }

    const tokenHash = this.hashOtp(dto.verificationToken.trim());
    const validVerifiedRecord = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: mobile,
        type: 'REGISTRATION_VERIFIED_TOKEN',
        otpHash: tokenHash,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validVerifiedRecord) {
      throw new BadRequestException('Mobile verification is invalid or expired. Please verify your mobile number again.');
    }

    // Invalidate token immediately
    await this.prisma.otpVerification.update({
      where: { id: validVerifiedRecord.id },
      data: { isUsed: true },
    });

    // OPTIONAL EMAIL VERIFICATION CHECK
    if (email) {
      if (!dto.emailVerificationToken || !dto.emailVerificationToken.trim()) {
        throw new BadRequestException('Email address verification is required if an email is provided. Please verify your email with OTP.');
      }

      const emailTokenHash = this.hashOtp(dto.emailVerificationToken.trim());
      const validEmailVerifiedRecord = await this.prisma.otpVerification.findFirst({
        where: {
          identifier: email,
          type: 'REGISTRATION_EMAIL_VERIFIED_TOKEN',
          otpHash: emailTokenHash,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (!validEmailVerifiedRecord) {
        throw new BadRequestException('Email verification is invalid or expired. Please verify your email again.');
      }

      await this.prisma.otpVerification.update({
        where: { id: validEmailVerifiedRecord.id },
        data: { isUsed: true },
      });
    }

    // Check existing user
    const orConditions: any[] = [{ mobile }, { personalMobile: mobile }];
    if (email) {
      orConditions.push({ email }, { personalEmail: email });
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: orConditions },
    });

    // Mandatory Registration Legal Consent (Requirement 7)
    let policiesToAccept = dto.acceptedPolicies;
    if ((!policiesToAccept || policiesToAccept.length === 0) && dto.termsAccepted && dto.privacyAccepted) {
      const regReqs = await this.consentService.getActionRequirements('REGISTRATION');
      policiesToAccept = regReqs.policies.map((p) => ({
        policyId: p.id,
        policyType: p.policyType,
        policyVersion: p.version,
      }));
    }

    const consentValidation = await this.consentService.validateActionConsent(
      'REGISTRATION',
      policiesToAccept,
    );
    if (!consentValidation.isValid) {
      throw new BadRequestException(
        `Please accept all mandatory legal policies to complete registration: ${consentValidation.missingPolicies.join(', ')}`,
      );
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
        referralAttribution = codeProfile;
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
          phoneVerified: true,
          emailVerified: !!email,
          state: dto.state.trim(),
          city: dto.district.trim(),
          studentId,
          registrationNumber,
          hasCompletedReferralOnboarding: !!referralAttribution,
          referredByCode: referralAttribution ? cleanReferralCode : null,
          profile: {
            create: {
              nationality: 'Indian',
              state: dto.state.trim(),
              district: dto.district.trim(),
              city: dto.district.trim(),
            },
          },
        },
      });

      await tx.authIdentity.create({
        data: {
          userId: newUser.id,
          provider: 'PASSWORD',
          providerAccountId: mobile,
          email,
        },
      });

      if (referralAttribution) {
        await tx.studentReferral.create({
          data: {
            referralCode: cleanReferralCode!,
            referrerStudentId: referralAttribution.userId,
            referredStudentId: newUser.id,
            referredName: newUser.fullName,
            referredMobile: newUser.mobile || mobile,
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

    // Persist exact accepted policy versions against new user ID (Requirement 7 & 18)
    if (policiesToAccept && policiesToAccept.length > 0) {
      await this.consentService.recordConsent(
        user.id,
        {
          actionContext: 'REGISTRATION',
          acceptedPolicies: policiesToAccept,
        },
        { ipAddress },
      );
    }

    const tokens = await this.issueTokens(user);

    await this.logAuthEvent({
      userId: user.id,
      action: 'AUTH_STUDENT_REGISTERED',
      description: `Student registered successfully: ${user.fullName} (${user.mobile})`,
      ipAddress,
    });

    const { password, ...userWithoutPassword } = user;

    return {
      message: 'Account created successfully',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      user: {
        ...userWithoutPassword,
        mobileVerified: user.phoneVerified,
      },
    };
  }

  /**
   * 5. Centralized Enterprise & Student Password Login
   */
  async login(dto: LoginDto, ipAddress?: string) {
    const identifier = dto.email.trim();
    const identifierLower = identifier.toLowerCase();

    // Path 1: Corporate Position Email Login
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

      this.enforceAccountState(user);

      if (!user.password) {
        throw new UnauthorizedException('Password not set. Please use OTP or Google login.');
      }

      // 3-Domain Architecture Validation for Positions
      if (dto.domain === 'PUBLIC') {
        throw new ForbiddenException('Corporate Credentials cannot be used on the Public Domain.');
      }

      const isPasswordValid = await bcryptLib.compare(dto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const tokens = await this.issueTokens(user);

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
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        mustChangePassword: user.mustChangePassword || false,
        position: position,
        user: {
          ...userWithoutPassword,
          roles: iamAccess.roles,
          effectivePermissions: iamAccess.effectivePermissions,
          dataScopes: iamAccess.dataScopes,
          isSuperAdmin: iamAccess.isSuperAdmin,
        },
      };
    }

    // Path 2: Direct User Login (Email, Mobile, or Personal Email)
    const rawDigits = identifier.replace(/\D/g, '').slice(-10);
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifierLower },
          { personalEmail: identifierLower },
          { mobile: identifier },
          { personalMobile: identifier },
          ...(rawDigits.length === 10
            ? [
                { mobile: rawDigits },
                { personalMobile: rawDigits },
                { mobile: `+91${rawDigits}` },
                { personalMobile: `+91${rawDigits}` },
              ]
            : []),
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let activeUser = user;

    if (activeUser.role === Role.STUDENT) {
      const studentUpdates: any = {};
      if (!activeUser.isApproved || activeUser.status === 'PENDING_APPROVAL' || !activeUser.isActive) {
        studentUpdates.isApproved = true;
        studentUpdates.status = 'ACTIVE';
        studentUpdates.isActive = true;
      }
      if (!activeUser.studentId) studentUpdates.studentId = await this.idGenerator.generateStudentId();
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

    this.enforceAccountState(activeUser);

    if (!activeUser.password) {
      throw new UnauthorizedException('Password not set for this account. Please log in using Mobile OTP or Google.');
    }

    // 3-Domain Architecture Validation
    if (dto.domain === 'ADMIN' || dto.domain === 'ERP') {
      if (activeUser.role === 'STUDENT') {
        throw new ForbiddenException(`Public users cannot access the ${dto.domain} domain.`);
      }
    }

    const isPasswordValid = await bcryptLib.compare(dto.password, activeUser.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(activeUser);

    let iamAccess = {
      roles: [] as any[],
      effectivePermissions: [] as string[],
      dataScopes: [] as string[],
      isSuperAdmin: activeUser.role === Role.SUPER_ADMIN,
    };

    try {
      const access = await this.authorizationService.getUserEffectiveAccess(activeUser.id);
      iamAccess = {
        roles: access.roles,
        effectivePermissions: access.effectivePermissions,
        dataScopes: access.dataScopes,
        isSuperAdmin: access.isSuperAdmin || activeUser.role === Role.SUPER_ADMIN,
      };
    } catch {
      iamAccess.isSuperAdmin = activeUser.role === Role.SUPER_ADMIN;
    }

    await this.logAuthEvent({
      userId: activeUser.id,
      action: 'AUTH_LOGIN_SUCCESS',
      description: `User logged in with password (${activeUser.email || activeUser.mobile})`,
      ipAddress,
    });

    const { password, ...userWithoutPassword } = activeUser;

    return {
      message: 'Login successful',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      mustChangePassword: activeUser.mustChangePassword || false,
      user: {
        ...userWithoutPassword,
        roles: iamAccess.roles,
        effectivePermissions: iamAccess.effectivePermissions,
        dataScopes: iamAccess.dataScopes,
        isSuperAdmin: iamAccess.isSuperAdmin,
      },
    };
  }

  /**
   * 6. Send Mailbox Verification Code (Email Verification)
   */
  async sendEmailVerification(userId?: string, rawEmail?: string, ipAddress?: string) {
    let targetEmail: string;
    let targetUser: any = null;

    if (userId) {
      targetUser = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) throw new NotFoundException('User not found');
      targetEmail = rawEmail ? this.normalizeEmail(rawEmail) : targetUser.email;
    } else if (rawEmail) {
      targetEmail = this.normalizeEmail(rawEmail);
      targetUser = await this.prisma.user.findFirst({
        where: { OR: [{ email: targetEmail }, { personalEmail: targetEmail }] },
      });
    } else {
      throw new BadRequestException('Email address is required.');
    }

    if (!targetEmail) {
      throw new BadRequestException('Valid email address is required.');
    }

    // Cooldown check (30s)
    const latestOtp = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: targetEmail,
        type: 'EMAIL_VERIFICATION',
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestOtp && latestOtp.resendAfter && latestOtp.resendAfter > new Date()) {
      const remainingSeconds = Math.ceil(
        (latestOtp.resendAfter.getTime() - Date.now()) / 1000,
      );
      throw new BadRequestException(
        `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
      );
    }

    // Invalidate previous pending verification OTPs for this email
    await this.prisma.otpVerification.updateMany({
      where: {
        identifier: targetEmail,
        type: 'EMAIL_VERIFICATION',
        isUsed: false,
      },
      data: { isUsed: true },
    });

    const rawCode = crypto.randomInt(100000, 999999).toString();
    const otpHash = this.hashOtp(rawCode);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    const resendAfter = new Date(Date.now() + 30 * 1000); // 30s cooldown

    await this.prisma.otpVerification.create({
      data: {
        type: 'EMAIL_VERIFICATION',
        identifier: targetEmail,
        otpHash,
        expiresAt,
        resendAfter,
        attempts: 0,
        maxAttempts: 5,
        userId: targetUser?.id,
        ipAddress,
      },
    });

    await this.logAuthEvent({
      userId: targetUser?.id,
      action: 'AUTH_EMAIL_VERIFICATION_SENT',
      description: `Email verification code sent to ${targetEmail}`,
      ipAddress,
    });

    return {
      success: true,
      message: `Verification code sent to ${targetEmail}. Valid for 15 minutes.`,
      resendCooldownSeconds: 30,
      expiresInSeconds: 900,
    };
  }

  /**
   * 7. Verify Mailbox Email Code
   */
  async verifyEmail(userId?: string, rawEmail?: string, rawCode?: string, ipAddress?: string) {
    if (!rawCode || rawCode.trim().length !== 6) {
      throw new BadRequestException('Please enter a valid 6-digit verification code.');
    }
    const cleanCode = rawCode.trim();

    let targetEmail: string;
    if (rawEmail) {
      targetEmail = this.normalizeEmail(rawEmail);
    } else if (userId) {
      const u = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!u || !u.email) throw new BadRequestException('No email registered on account.');
      targetEmail = u.email;
    } else {
      throw new BadRequestException('Email address is required.');
    }

    const activeOtp = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: targetEmail,
        type: 'EMAIL_VERIFICATION',
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeOtp) {
      throw new BadRequestException('No active verification code found. Please request a new code.');
    }

    if (activeOtp.expiresAt < new Date()) {
      await this.prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      await this.prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    const newAttempts = activeOtp.attempts + 1;
    await this.prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: { attempts: newAttempts },
    });

    const isMatch = this.verifyOtpHash(cleanCode, activeOtp.otpHash);
    if (!isMatch) {
      const remaining = activeOtp.maxAttempts - newAttempts;
      throw new BadRequestException(
        `Incorrect verification code. (${remaining} attempts remaining)`,
      );
    }

    // Invalidate OTP
    await this.prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: { isUsed: true },
    });

    // Update user
    const userToUpdate = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : await this.prisma.user.findFirst({
          where: { OR: [{ email: targetEmail }, { personalEmail: targetEmail }] },
        });

    if (userToUpdate) {
      await this.prisma.user.update({
        where: { id: userToUpdate.id },
        data: {
          email: targetEmail,
          personalEmail: targetEmail,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      await this.logAuthEvent({
        userId: userToUpdate.id,
        action: 'AUTH_EMAIL_VERIFIED',
        description: `Email verified successfully: ${targetEmail}`,
        ipAddress,
      });
    }

    return {
      success: true,
      message: 'Email verified successfully.',
    };
  }

  /**
   * 8. Refresh Token Rotation & Reuse Detection
   */
  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (!tokenRecord) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // REUSE DETECTION: If an already revoked token is used, trigger compromise protocol
      if (tokenRecord.isRevoked) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: payload.id },
          data: { isRevoked: true },
        });
        await this.prisma.user.update({
          where: { id: payload.id },
          data: { sessionVersion: { increment: 1 } },
        });
        throw new UnauthorizedException(
          'Security alert: Refresh token reuse detected. All sessions revoked. Please log in again.',
        );
      }

      if (tokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token has expired. Please log in again.');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      this.enforceAccountState(user);

      if (payload.sessionVersion && payload.sessionVersion !== (user.sessionVersion || 1)) {
        throw new UnauthorizedException(
          'Session expired due to password reset or administrative revocation.',
        );
      }

      // Token Rotation: Invalidate old token and issue new pair
      const newTokens = await this.issueTokens(user);
      const newHash = crypto
        .createHash('sha256')
        .update(newTokens.refresh_token)
        .digest('hex');

      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          isRevoked: true,
          replacedByTokenHash: newHash,
        },
      });

      const { password, ...userWithoutPassword } = user;

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

      return {
        message: 'Token refreshed successfully',
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        user: {
          ...userWithoutPassword,
          roles: iamAccess.roles,
          effectivePermissions: iamAccess.effectivePermissions,
          dataScopes: iamAccess.dataScopes,
          isSuperAdmin: iamAccess.isSuperAdmin,
        },
      };
    } catch (e: any) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * 9. Logout & Session Invalidation
   */
  async logout(userId?: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });
    }

    if (userId) {
      await this.logAuthEvent({
        userId,
        action: 'AUTH_LOGOUT',
        description: `User logged out`,
      });
    }

    return {
      message: 'Logout successful',
    };
  }

  /**
   * 10. Forgot Password (Account Enumeration Protection)
   * Generic response: Always says "If an account exists for this email, a password reset link has been sent."
   */
  async forgotPassword(rawEmail: string, ipAddress?: string) {
    if (!rawEmail || !rawEmail.trim()) {
      throw new BadRequestException('Please enter your email address.');
    }
    const email = rawEmail.trim().toLowerCase();

    const genericResponse = {
      message: 'If an account exists for this email, a password reset link has been sent.',
    };

    // Check if corporate position email
    const position = await this.prisma.position.findUnique({
      where: { companyEmail: email },
    });
    if (position && !position.selfServicePasswordReset) {
      return genericResponse;
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { personalEmail: email }],
      },
    });

    if (!user || user.selfServicePasswordReset === false) {
      return genericResponse;
    }

    // Invalidate previous unused reset tokens
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress,
      },
    });

    await this.logAuthEvent({
      userId: user.id,
      action: 'AUTH_PASSWORD_RESET_REQUESTED',
      description: `Password reset link generated for ${email}`,
      ipAddress,
    });

    return genericResponse;
  }

  /**
   * 11. Reset Password with Single-Use Hashed Token
   * Updates password, invalidates reset token, revokes active sessions via sessionVersion increment.
   */
  async resetPassword(token: string, newPassword: string, ipAddress?: string) {
    if (!token || !token.trim()) {
      throw new BadRequestException('Invalid or expired reset token.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters.');
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(token.trim())
      .digest('hex');

    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetRecord ||
      resetRecord.isUsed ||
      resetRecord.expiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const user = resetRecord.user;
    const hashedPassword = await bcryptLib.hash(newPassword, 10);
    const newSessionVersion = (user.sessionVersion || 1) + 1;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
          sessionVersion: newSessionVersion,
        },
      });

      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { isUsed: true },
      });

      await tx.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    await this.logAuthEvent({
      userId: user.id,
      action: 'AUTH_PASSWORD_RESET_COMPLETED',
      description: `Password reset completed successfully for user ${user.id}`,
      ipAddress,
    });

    return {
      message: 'Password reset successfully. You can now log in with your new password.',
    };
  }

  /**
   * 12. Forgot Password - Send OTP via Mobile or Email
   * Generic response prevents account enumeration. Enforces 30s resend cooldown and 5m expiry.
   */
  async forgotPasswordSendOtp(dto: ForgotPasswordSendOtpDto, ipAddress?: string) {
    const method = dto.method;
    const isMobile = method === 'MOBILE';
    const identifier = isMobile
      ? this.normalizeMobile(dto.identifier)
      : this.normalizeEmail(dto.identifier);

    const genericResponse = {
      success: true,
      method,
      message: isMobile
        ? 'If an account is associated with this mobile number, an OTP has been sent.'
        : 'If an account is associated with this email address, an OTP has been sent.',
      resendCooldownSeconds: 30,
      expiresInSeconds: 300,
    };

    // Cooldown check (30s)
    const latestOtp = await this.prisma.otpVerification.findFirst({
      where: {
        identifier,
        type: `FORGOT_PASSWORD_${method}`,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestOtp && latestOtp.resendAfter && latestOtp.resendAfter > new Date()) {
      const remainingSeconds = Math.ceil(
        (latestOtp.resendAfter.getTime() - Date.now()) / 1000,
      );
      throw new BadRequestException(
        `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
      );
    }

    // Check if user exists (anti-enumeration: don't reveal to frontend, only send OTP if exists)
    const user = await this.prisma.user.findFirst({
      where: isMobile
        ? {
            OR: [
              { mobile: identifier },
              { personalMobile: identifier },
              { mobile: identifier.slice(-10) },
              { personalMobile: identifier.slice(-10) },
            ],
          }
        : {
            OR: [{ email: identifier }, { personalEmail: identifier }],
          },
    });

    if (!user) {
      return genericResponse;
    }

    // Invalidate previous pending OTPs
    await this.prisma.otpVerification.updateMany({
      where: {
        identifier,
        type: `FORGOT_PASSWORD_${method}`,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = this.hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    const resendAfter = new Date(Date.now() + 30 * 1000); // 30s cooldown

    await this.prisma.otpVerification.create({
      data: {
        type: `FORGOT_PASSWORD_${method}`,
        identifier,
        otpHash,
        expiresAt,
        resendAfter,
        attempts: 0,
        maxAttempts: 5,
        userId: user.id,
        ipAddress,
      },
    });

    await this.logAuthEvent({
      userId: user.id,
      action: 'AUTH_FORGOT_PASSWORD_OTP_SENT',
      description: `Forgot password OTP sent via ${method} for ${identifier}`,
      ipAddress,
    });

    return genericResponse;
  }

  /**
   * 13. Forgot Password - Verify OTP and Issue Reset Token
   */
  async forgotPasswordVerifyOtp(dto: ForgotPasswordVerifyOtpDto, ipAddress?: string) {
    const method = dto.method;
    const isMobile = method === 'MOBILE';
    const identifier = isMobile
      ? this.normalizeMobile(dto.identifier)
      : this.normalizeEmail(dto.identifier);
    const cleanOtp = (dto.otp || '').trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      throw new BadRequestException('Please enter a valid 6-digit OTP.');
    }

    const activeOtp = await this.prisma.otpVerification.findFirst({
      where: {
        identifier,
        type: `FORGOT_PASSWORD_${method}`,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeOtp) {
      throw new BadRequestException('No active OTP found. Please request an OTP.');
    }

    if (activeOtp.expiresAt < new Date()) {
      await this.prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      await this.prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    const newAttempts = activeOtp.attempts + 1;
    await this.prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: { attempts: newAttempts },
    });

    const isMatch = this.verifyOtpHash(cleanOtp, activeOtp.otpHash);
    if (!isMatch) {
      const remaining = activeOtp.maxAttempts - newAttempts;
      if (remaining <= 0) {
        await this.prisma.otpVerification.update({
          where: { id: activeOtp.id },
          data: { isUsed: true },
        });
        throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP.');
      }
      throw new BadRequestException(`Incorrect OTP. Please check and re-enter. (${remaining} attempts remaining)`);
    }

    // Mark OTP used
    await this.prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: { isUsed: true },
    });

    // Lookup user
    const user = activeOtp.userId
      ? await this.prisma.user.findUnique({ where: { id: activeOtp.userId } })
      : await this.prisma.user.findFirst({
          where: isMobile
            ? {
                OR: [
                  { mobile: identifier },
                  { personalMobile: identifier },
                  { mobile: identifier.slice(-10) },
                  { personalMobile: identifier.slice(-10) },
                ],
              }
            : {
                OR: [{ email: identifier }, { personalEmail: identifier }],
              },
        });

    if (!user) {
      throw new BadRequestException('User account not found.');
    }

    // Invalidate previous unused reset tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    // Issue single-use reset token valid for 15 minutes
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress,
      },
    });

    await this.logAuthEvent({
      userId: user.id,
      action: 'AUTH_FORGOT_PASSWORD_OTP_VERIFIED',
      description: `Forgot password OTP verified via ${method} for user ${user.id}`,
      ipAddress,
    });

    return {
      success: true,
      resetToken: rawResetToken,
      message: 'OTP verified successfully. Please enter your new password.',
    };
  }

  /**
   * 14. Reset Password with Single-Use Token (from OTP flow)
   * Enforces matching passwords and revokes old sessions.
   */
  async resetPasswordWithToken(dto: ResetPasswordWithTokenDto, ipAddress?: string) {
    if (!dto.resetToken || !dto.resetToken.trim()) {
      throw new BadRequestException('Reset token is required.');
    }
    if (!dto.newPassword || dto.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters.');
    }
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New Password and Confirm Password do not match.');
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.resetToken.trim())
      .digest('hex');

    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.isUsed || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token. Please request a new OTP.');
    }

    const user = resetRecord.user;
    const hashedPassword = await bcryptLib.hash(dto.newPassword, 10);
    const newSessionVersion = (user.sessionVersion || 1) + 1;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
          sessionVersion: newSessionVersion,
        },
      });

      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { isUsed: true },
      });

      await tx.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    await this.logAuthEvent({
      userId: user.id,
      action: 'AUTH_PASSWORD_RESET_COMPLETED',
      description: `Password reset completed successfully for user ${user.id}`,
      ipAddress,
    });

    return {
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    };
  }

  /**
   * 15. Send User Mobile Verification Code (for logged-in student)
   */
  async sendUserMobileVerification(userId?: string, rawMobile?: string, ipAddress?: string) {
    let targetMobile: string;
    let targetUser: any = null;

    if (userId) {
      targetUser = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) throw new NotFoundException('User not found');
      targetMobile = rawMobile ? this.normalizeMobile(rawMobile) : targetUser.mobile;
    } else if (rawMobile) {
      targetMobile = this.normalizeMobile(rawMobile);
    } else {
      throw new BadRequestException('Mobile number is required.');
    }

    if (!targetMobile) {
      throw new BadRequestException('Please provide a valid mobile number.');
    }

    // Check if mobile already owned by another user
    const existingOther = await this.prisma.user.findFirst({
      where: {
        id: targetUser ? { not: targetUser.id } : undefined,
        OR: [
          { mobile: targetMobile },
          { personalMobile: targetMobile },
          { mobile: targetMobile.slice(-10) },
          { personalMobile: targetMobile.slice(-10) },
        ],
      },
    });

    if (existingOther) {
      throw new ConflictException('This mobile number is already linked to another account.');
    }

    // Cooldown check (30s)
    const latestOtp = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: targetMobile,
        type: 'USER_MOBILE_VERIFICATION',
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestOtp && latestOtp.resendAfter && latestOtp.resendAfter > new Date()) {
      const remainingSeconds = Math.ceil(
        (latestOtp.resendAfter.getTime() - Date.now()) / 1000,
      );
      throw new BadRequestException(
        `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
      );
    }

    // Invalidate previous pending verification OTPs for this mobile
    await this.prisma.otpVerification.updateMany({
      where: {
        identifier: targetMobile,
        type: 'USER_MOBILE_VERIFICATION',
        isUsed: false,
      },
      data: { isUsed: true },
    });

    const rawCode = crypto.randomInt(100000, 999999).toString();
    const otpHash = this.hashOtp(rawCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    const resendAfter = new Date(Date.now() + 30 * 1000); // 30s cooldown

    await this.prisma.otpVerification.create({
      data: {
        type: 'USER_MOBILE_VERIFICATION',
        identifier: targetMobile,
        otpHash,
        expiresAt,
        resendAfter,
        attempts: 0,
        maxAttempts: 5,
        userId: targetUser?.id,
        ipAddress,
      },
    });

    await this.logAuthEvent({
      userId: targetUser?.id,
      action: 'AUTH_MOBILE_VERIFICATION_SENT',
      description: `Mobile verification OTP sent to ${targetMobile}`,
      ipAddress,
    });

    return {
      success: true,
      message: `OTP sent to ${targetMobile.slice(0, 3)} ******${targetMobile.slice(-4)}. Valid for 5 minutes.`,
      resendCooldownSeconds: 30,
      expiresInSeconds: 300,
    };
  }

  /**
   * 16. Verify User Mobile Code (for logged-in student)
   */
  async verifyUserMobile(userId?: string, rawMobile?: string, rawOtp?: string, ipAddress?: string) {
    if (!rawOtp || rawOtp.trim().length !== 6) {
      throw new BadRequestException('Please enter a valid 6-digit verification code.');
    }
    const cleanOtp = rawOtp.trim();

    let targetMobile: string;
    let targetUser: any = null;

    if (userId) {
      targetUser = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) throw new NotFoundException('User not found');
      targetMobile = rawMobile ? this.normalizeMobile(rawMobile) : targetUser.mobile;
    } else if (rawMobile) {
      targetMobile = this.normalizeMobile(rawMobile);
    } else {
      throw new BadRequestException('Mobile number is required.');
    }

    const activeOtp = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: targetMobile,
        type: 'USER_MOBILE_VERIFICATION',
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeOtp) {
      throw new BadRequestException('No active verification code found. Please request a new OTP.');
    }

    if (activeOtp.expiresAt < new Date()) {
      await this.prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      await this.prisma.otpVerification.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    const newAttempts = activeOtp.attempts + 1;
    await this.prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: { attempts: newAttempts },
    });

    const isMatch = this.verifyOtpHash(cleanOtp, activeOtp.otpHash);
    if (!isMatch) {
      const remaining = activeOtp.maxAttempts - newAttempts;
      if (remaining <= 0) {
        await this.prisma.otpVerification.update({
          where: { id: activeOtp.id },
          data: { isUsed: true },
        });
        throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP.');
      }
      throw new BadRequestException(`Incorrect OTP. Please check and re-enter. (${remaining} attempts remaining)`);
    }

    // Invalidate OTP
    await this.prisma.otpVerification.update({
      where: { id: activeOtp.id },
      data: { isUsed: true },
    });

    // Update user
    const resolvedUserId = userId || targetUser?.id || activeOtp.userId;
    if (resolvedUserId) {
      await this.prisma.user.update({
        where: { id: resolvedUserId },
        data: {
          mobile: targetMobile,
          personalMobile: targetMobile,
          phoneVerified: true,
        },
      });

      await this.logAuthEvent({
        userId: resolvedUserId,
        action: 'AUTH_MOBILE_VERIFIED',
        description: `Mobile verified successfully: ${targetMobile}`,
        ipAddress,
      });
    }

    return {
      success: true,
      mobileVerified: true,
      message: 'Mobile number verified successfully.',
    };
  }
}
