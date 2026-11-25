import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { DataScopeService } from '../auth/data-scope.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { SystemConfigurationService } from '../settings/system-configuration.service';

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: {
            task: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
          },
        },
        {
          provide: DataScopeService,
          useValue: {
            resolveDataScope: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendNotification: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            createAuditLog: jest.fn(),
          },
        },
        {
          provide: SystemConfigurationService,
          useValue: {
            getSecurityConfig: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
