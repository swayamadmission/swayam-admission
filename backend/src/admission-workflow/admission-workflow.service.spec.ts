import { Test, TestingModule } from '@nestjs/testing';
import { AdmissionWorkflowService } from './admission-workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('AdmissionWorkflowService', () => {
  let service: AdmissionWorkflowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionWorkflowService,
        {
          provide: PrismaService,
          useValue: {
            application: { findUnique: jest.fn(), update: jest.fn() },
          },
        },
        {
          provide: AuditService,
          useValue: {
            createAuditLog: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdmissionWorkflowService>(AdmissionWorkflowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
