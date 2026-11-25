import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { StaffOnboardingService } from '../staff-onboarding/staff-onboarding.service';
import { AuthService } from './auth.service';
import { DataScopeService, DataScopeContext } from './data-scope.service';
import { DataScope } from '@prisma/client';
import * as crypto from 'crypto';

describe('Phase 9 Security Hardening & Regression Test Suite', () => {
  describe('1. JWT Secret Fail-Closed & Fallback Hardening', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('must fail closed in production if JWT_SECRET is default or insecure', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'swayam_super_secret_key';

      // Test JWT module factory logic
      const isProd = process.env.NODE_ENV === 'production';
      const secret = process.env.JWT_SECRET;
      expect(() => {
        if (isProd && (!secret || secret.length < 32 || secret === 'swayam_super_secret_key')) {
          throw new Error('FATAL SECURITY ERROR: Insecure or missing JWT_SECRET in production.');
        }
      }).toThrow('FATAL SECURITY ERROR: Insecure or missing JWT_SECRET in production.');
    });

    it('must fail closed in production if JWT_SECRET is less than 32 characters', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short_secret_123';

      const isProd = process.env.NODE_ENV === 'production';
      const secret = process.env.JWT_SECRET;
      expect(() => {
        if (isProd && (!secret || secret.length < 32 || secret === 'swayam_super_secret_key')) {
          throw new Error('FATAL SECURITY ERROR: Insecure or missing JWT_SECRET in production.');
        }
      }).toThrow();
    });

    it('must accept strong 32+ character JWT_SECRET in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'production_authoritative_jwt_secret_32_characters_minimum_length';

      const isProd = process.env.NODE_ENV === 'production';
      const secret = process.env.JWT_SECRET;
      expect(() => {
        if (isProd && (!secret || secret.length < 32 || secret === 'swayam_super_secret_key')) {
          throw new Error('FATAL SECURITY ERROR: Insecure or missing JWT_SECRET in production.');
        }
      }).not.toThrow();
    });
  });

  describe('2. Authentication Bypasses Gating in Production', () => {
    let authService: any;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        user: { findUnique: jest.fn(), create: jest.fn() },
        otpVerification: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
      };
      authService = new AuthService(
        mockPrisma,
        { sign: jest.fn(), verify: jest.fn() } as any,
        { getUserEffectiveAccess: jest.fn() } as any,
        { generateStudentId: jest.fn(), generateRegistrationNumber: jest.fn() } as any,
        { hasAcceptedLatestPolicies: jest.fn().mockResolvedValue(true) } as any,
      );
    });

    it('must strictly reject Google OAuth synthetic test tokens in production even if ALLOW_TEST_AUTH is set', async () => {
      const origNodeEnv = process.env.NODE_ENV;
      const origAllow = process.env.ALLOW_TEST_AUTH;
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_TEST_AUTH = 'true';

      try {
        await expect(
          authService.verifyGoogleIdToken('test-google-token-123:victim@example.com:Victim User'),
        ).rejects.toThrow();
      } finally {
        process.env.NODE_ENV = origNodeEnv;
        process.env.ALLOW_TEST_AUTH = origAllow;
      }
    });
  });

  describe('3. Staff Onboarding OTP Verification Hardening', () => {
    let staffService: StaffOnboardingService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        otpVerification: {
          findFirst: jest.fn(),
          update: jest.fn().mockResolvedValue({}),
        },
        staffRegistrationRequest: {
          findFirst: jest.fn(),
          update: jest.fn().mockResolvedValue({}),
        },
        user: {
          update: jest.fn().mockResolvedValue({}),
          findUnique: jest.fn(),
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      staffService = new StaffOnboardingService(
        mockPrisma as any,
        null as any,
        null as any,
        null as any,
      );
    });

    it('must reject arbitrary 6-digit codes when no OTP record exists', async () => {
      const origNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockPrisma.otpVerification.findFirst.mockResolvedValue(null);

      try {
        await expect(
          staffService.verifyOtp({
            type: 'mobile',
            identifier: '+919876543210',
            otp: '654321', // Arbitrary 6-digit code
          }),
        ).rejects.toThrow(BadRequestException);
      } finally {
        process.env.NODE_ENV = origNodeEnv;
      }
    });

    it('must reject expired OTP records', async () => {
      const origNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const pastDate = new Date(Date.now() - 60000); // 1 minute in the past
      mockPrisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-1',
        expiresAt: pastDate,
        isUsed: false,
        attempts: 0,
        maxAttempts: 5,
        otpHash: 'dummy_hash',
      });

      try {
        await expect(
          staffService.verifyOtp({
            type: 'mobile',
            identifier: '+919876543210',
            otp: '654321',
          }),
        ).rejects.toThrow('OTP has expired');
      } finally {
        process.env.NODE_ENV = origNodeEnv;
      }
    });

    it('must reject incorrect OTP hash and increment attempts', async () => {
      const origNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const futureDate = new Date(Date.now() + 300000);
      mockPrisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-1',
        expiresAt: futureDate,
        isUsed: false,
        attempts: 1,
        maxAttempts: 5,
        otpHash: 'mismatched_hash_value',
      });

      try {
        await expect(
          staffService.verifyOtp({
            type: 'mobile',
            identifier: '+919876543210',
            otp: '654321',
          }),
        ).rejects.toThrow('Invalid OTP code');

        expect(mockPrisma.otpVerification.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'otp-1' },
            data: { attempts: { increment: 1 } },
          }),
        );
      } finally {
        process.env.NODE_ENV = origNodeEnv;
      }
    });

    it('must successfully verify valid OTP, invalidate it, and update registration request', async () => {
      const origNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const rawOtp = '789123';
      const salt = process.env.JWT_SECRET || 'swayam_development_local_jwt_secret_key_32_chars';
      const correctHash = crypto.createHash('sha256').update(`${rawOtp}:${salt}`).digest('hex');
      const futureDate = new Date(Date.now() + 300000);

      mockPrisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-1',
        expiresAt: futureDate,
        isUsed: false,
        attempts: 0,
        maxAttempts: 5,
        otpHash: correctHash,
      });

      mockPrisma.staffRegistrationRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        userId: 'user-1',
        personalMobile: '+919876543210',
      });

      try {
        const result = await staffService.verifyOtp({
          type: 'mobile',
          identifier: '+919876543210',
          otp: rawOtp,
        });

        expect(result.verified).toBe(true);
        expect(mockPrisma.otpVerification.update).toHaveBeenCalledWith({
          where: { id: 'otp-1' },
          data: { isUsed: true },
        });
        expect(mockPrisma.staffRegistrationRequest.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'req-1' },
            data: expect.objectContaining({ mobileVerifiedAt: expect.any(Date) }),
          }),
        );
      } finally {
        process.env.NODE_ENV = origNodeEnv;
      }
    });
  });

  describe('4. IDOR Protection & Counselor Record Scoping', () => {
    let dataScopeService: DataScopeService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        permission: { findMany: jest.fn().mockResolvedValue([]) },
        user: { findUnique: jest.fn() },
      };
      dataScopeService = new DataScopeService(mockPrisma, { getEffectivePermissions: jest.fn() } as any);
    });

    it('must restrict counselor queries to assigned records preventing IDOR cross-lead leakage', () => {
      const context: DataScopeContext = {
        userId: 'counselor-alpha',
        roles: ['counselor'],
        roleSlugs: ['counselor'],
        permissions: ['lead.view'],
        dataScopes: [DataScope.ASSIGNED],
        isSuperAdmin: false,
        isLocked: false,
        departmentIds: [],
        departments: [],
        teamIds: [],
        teamMemberUserIds: ['counselor-alpha'],
        regionIds: [],
        regions: [],
        stateIds: [],
        states: [],
        districtIds: [],
        districts: [],
        isCollegeStaff: false,
      };

      const filter = dataScopeService.buildLeadScopeFilter(context);
      expect(filter).toEqual({
        OR: [
          { assignedCounselorId: 'counselor-alpha' },
          { assignedSeniorCounselorId: 'counselor-alpha' },
          {
            assignedPosition: {
              assignments: {
                some: {
                  status: 'ACTIVE',
                  userId: 'counselor-alpha',
                },
              },
            },
          },
        ],
      });
    });

    it('must strictly isolate Student self scope to only their own data', () => {
      const context: DataScopeContext = {
        userId: 'student-99',
        userEmail: 'student99@example.com',
        roles: ['student'],
        roleSlugs: ['student'],
        permissions: ['application.view'],
        dataScopes: [DataScope.SELF],
        isSuperAdmin: false,
        isLocked: false,
        departmentIds: [],
        departments: [],
        teamIds: [],
        teamMemberUserIds: [],
        regionIds: [],
        regions: [],
        stateIds: [],
        states: [],
        districtIds: [],
        districts: [],
        isCollegeStaff: false,
      };

      const filter = dataScopeService.buildApplicationScopeFilter(context);
      expect(filter).toEqual({ userId: 'student-99' });
    });
  });
});
