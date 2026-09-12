import { Test, TestingModule } from '@nestjs/testing';
import { AiRecommendationService } from './ai-recommendation.service';

describe('AiRecommendationService', () => {
  let service: AiRecommendationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiRecommendationService],
    }).compile();

    service = module.get<AiRecommendationService>(AiRecommendationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
