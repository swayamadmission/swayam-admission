import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SystemConfigurationService } from '../settings/system-configuration.service';
import { DataScopeService } from '../auth/data-scope.service';

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: {
            auditLog: { create: jest.fn(), findMany: jest.fn() },
          },
        },
        {
          provide: SystemConfigurationService,
          useValue: {
            getSecurityConfig: jest.fn(),
          },
        },
        {
          provide: DataScopeService,
          useValue: {
            resolveDataScope: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
