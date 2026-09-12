import { Test, TestingModule } from '@nestjs/testing';
import { AiMemoryService } from './ai-memory.service';

describe('AiMemoryService', () => {
  let service: AiMemoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiMemoryService],
    }).compile();

    service = module.get<AiMemoryService>(AiMemoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
