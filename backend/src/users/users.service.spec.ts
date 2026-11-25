import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../auth/authorization.service';
import { IdGeneratorService } from '../common/id-generator.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
          },
        },
        {
          provide: AuthorizationService,
          useValue: {
            getUserEffectiveAccess: jest.fn(),
          },
        },
        {
          provide: IdGeneratorService,
          useValue: {
            generateStudentId: jest.fn(),
            generateRegistrationNumber: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
