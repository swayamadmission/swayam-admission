import { Test, TestingModule } from '@nestjs/testing';
import { AiAnalyticsController } from './ai-analytics.controller';

describe('AiAnalyticsController', () => {
  let controller: AiAnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiAnalyticsController],
    }).compile();

    controller = module.get<AiAnalyticsController>(AiAnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
