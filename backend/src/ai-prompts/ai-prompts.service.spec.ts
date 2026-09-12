import { Test, TestingModule } from '@nestjs/testing';
import { AiPromptsService } from './ai-prompts.service';

describe('AiPromptsService', () => {
  let service: AiPromptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiPromptsService],
    }).compile();

    service = module.get<AiPromptsService>(AiPromptsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
