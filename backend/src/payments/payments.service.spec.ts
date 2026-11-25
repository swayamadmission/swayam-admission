import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentGatewayService } from './gateways/payment-gateway.service';
import { PaymentDocumentService } from './services/payment-document.service';
import { JourneyService } from '../journey/journey.service';
import { DataScopeService } from '../auth/data-scope.service';
import { FeeCalculationService } from './services/fee-calculation.service';
import { CouponService } from '../coupons/coupon.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: {
            payment: { findMany: jest.fn(), findUnique: jest.fn() },
          },
        },
        {
          provide: AuditService,
          useValue: {
            createAuditLog: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendNotification: jest.fn(),
          },
        },
        {
          provide: PaymentGatewayService,
          useValue: {
            createOrder: jest.fn(),
          },
        },
        {
          provide: PaymentDocumentService,
          useValue: {
            generateReceipt: jest.fn(),
          },
        },
        {
          provide: JourneyService,
          useValue: {
            advanceMilestone: jest.fn(),
          },
        },
        {
          provide: DataScopeService,
          useValue: {
            resolveDataScope: jest.fn(),
          },
        },
        {
          provide: FeeCalculationService,
          useValue: {
            calculateFee: jest.fn(),
          },
        },
        {
          provide: CouponService,
          useValue: {
            applyCoupon: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
