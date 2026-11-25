import { Test, TestingModule } from '@nestjs/testing';
import { AiAnalyticsService } from './ai-analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AiAnalyticsService', () => {
  let service: AiAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            aIAnalytics: { create: jest.fn(), findMany: jest.fn() },
            aIConversation: { count: jest.fn() },
            aIMessage: { count: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<AiAnalyticsService>(AiAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
