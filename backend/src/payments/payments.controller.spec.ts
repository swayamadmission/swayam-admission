import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentGovernanceService } from './services/payment-governance.service';
import { InvoiceService } from './services/invoice.service';
import { ReconciliationService } from './services/reconciliation.service';
import { FeeCalculationService } from './services/fee-calculation.service';
import { StorageService } from '../storage/storage.service';
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
          provide: InvoiceService,
          useValue: {
            generateInvoice: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            cancelInvoice: jest.fn(),
          },
        },
        {
          provide: ReconciliationService,
          useValue: {
            processSettlementBatch: jest.fn(),
            getQueue: jest.fn(),
            resolveDiscrepancy: jest.fn(),
          },
        },
        {
          provide: FeeCalculationService,
          useValue: {
            calculateForPaymentRequest: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
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
