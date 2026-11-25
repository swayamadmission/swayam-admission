import { Test, TestingModule } from '@nestjs/testing';
import { AiRecommendationService } from './ai-recommendation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AiRecommendationService', () => {
  let service: AiRecommendationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiRecommendationService,
        {
          provide: PrismaService,
          useValue: {
            college: { findMany: jest.fn() },
            studentProfile: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<AiRecommendationService>(AiRecommendationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
