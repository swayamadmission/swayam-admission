import { Test, TestingModule } from '@nestjs/testing';
import { AdmissionWorkflowService } from './admission-workflow.service';

describe('AdmissionWorkflowService', () => {
  let service: AdmissionWorkflowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdmissionWorkflowService],
    }).compile();

    service = module.get<AdmissionWorkflowService>(AdmissionWorkflowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
