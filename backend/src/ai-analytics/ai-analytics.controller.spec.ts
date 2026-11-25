import { Test, TestingModule } from '@nestjs/testing';
import { AiAnalyticsController } from './ai-analytics.controller';
import { AiAnalyticsService } from './ai-analytics.service';

describe('AiAnalyticsController', () => {
  let controller: AiAnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiAnalyticsController],
      providers: [
        {
          provide: AiAnalyticsService,
          useValue: {
            getDashboardMetrics: jest.fn(),
            trackSession: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AiAnalyticsController>(AiAnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
