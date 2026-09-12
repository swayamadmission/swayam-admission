import { Test, TestingModule } from '@nestjs/testing';
import { AdmissionWorkflowController } from './admission-workflow.controller';

describe('AdmissionWorkflowController', () => {
  let controller: AdmissionWorkflowController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdmissionWorkflowController],
    }).compile();

    controller = module.get<AdmissionWorkflowController>(
      AdmissionWorkflowController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
