import { Test, TestingModule } from '@nestjs/testing';
import { AiAnalyticsService } from './ai-analytics.service';

describe('AiAnalyticsService', () => {
  let service: AiAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiAnalyticsService],
    }).compile();

    service = module.get<AiAnalyticsService>(AiAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
