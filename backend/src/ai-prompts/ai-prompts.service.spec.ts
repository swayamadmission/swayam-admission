import { Test, TestingModule } from '@nestjs/testing';
import { AiPromptsService } from './ai-prompts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AiPromptsService', () => {
  let service: AiPromptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiPromptsService,
        {
          provide: PrismaService,
          useValue: {
            aIPrompt: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<AiPromptsService>(AiPromptsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
