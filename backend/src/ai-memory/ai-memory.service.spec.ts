import { Test, TestingModule } from '@nestjs/testing';
import { AiMemoryService } from './ai-memory.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AiMemoryService', () => {
  let service: AiMemoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiMemoryService,
        {
          provide: PrismaService,
          useValue: {
            aIConversation: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
            aIMessage: { create: jest.fn(), findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<AiMemoryService>(AiMemoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
