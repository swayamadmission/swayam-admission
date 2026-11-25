import { Test, TestingModule } from '@nestjs/testing';
import { AdmissionWorkflowController } from './admission-workflow.controller';
import { AdmissionWorkflowService } from './admission-workflow.service';

describe('AdmissionWorkflowController', () => {
  let controller: AdmissionWorkflowController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdmissionWorkflowController],
      providers: [
        {
          provide: AdmissionWorkflowService,
          useValue: {
            updateStage: jest.fn(),
            getTimeline: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AdmissionWorkflowController>(
      AdmissionWorkflowController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
