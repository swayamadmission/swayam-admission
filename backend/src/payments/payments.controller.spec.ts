import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentGovernanceService } from './services/payment-governance.service';
import { AuthorizationService } from '../auth/authorization.service';
import { DataScopeService } from '../auth/data-scope.service';
import { Reflector } from '@nestjs/core';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            getStats: jest.fn(),
          },
        },
        {
          provide: PaymentGovernanceService,
          useValue: {
            getGovernanceKpis: jest.fn(),
            getAdminDashboardKpis: jest.fn(),
          },
        },
        {
          provide: AuthorizationService,
          useValue: {
            getUserEffectiveAccess: jest.fn(),
          },
        },
        {
          provide: DataScopeService,
          useValue: {
            resolveDataScope: jest.fn(),
          },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
