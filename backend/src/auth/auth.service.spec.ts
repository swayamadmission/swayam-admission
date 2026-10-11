import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthorizationService } from './authorization.service';
import { IdGeneratorService } from '../common/id-generator.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn(), create: jest.fn() },
            loginSession: { create: jest.fn(), findFirst: jest.fn() },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-secret'),
          },
        },
        {
          provide: AuthorizationService,
          useValue: {
            getUserEffectiveAccess: jest.fn().mockResolvedValue({
              effectivePermissions: [],
              dataScopes: ['GLOBAL'],
              isSuperAdmin: false,
              isLocked: false,
            }),
          },
        },
        {
          provide: IdGeneratorService,
          useValue: {
            generateStudentId: jest.fn().mockResolvedValue('STU-12345'),
            generateRegistrationNumber: jest.fn().mockResolvedValue('REG-2026-12345'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
