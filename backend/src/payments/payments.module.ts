import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentWebhookController } from './payment-webhook.controller';
import { PaymentGatewayService } from './gateways/payment-gateway.service';
import { PaymentDocumentService } from './services/payment-document.service';
import { PaymentGovernanceService } from './services/payment-governance.service';
import { InvoiceService } from './services/invoice.service';
import { ReconciliationService } from './services/reconciliation.service';
import { FeeCalculationService } from './services/fee-calculation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';
import { CouponModule } from '../coupons/coupon.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationsModule,
    JourneyModule,
    AuthModule,
    CouponModule,
    StorageModule,
  ],
  providers: [
    PaymentsService,
    PaymentGatewayService,
    PaymentDocumentService,
    PaymentGovernanceService,
    InvoiceService,
    ReconciliationService,
    FeeCalculationService,
  ],
  controllers: [PaymentsController, PaymentWebhookController],
  exports: [
    PaymentsService,
    PaymentGatewayService,
    PaymentDocumentService,
    PaymentGovernanceService,
    InvoiceService,
    ReconciliationService,
    FeeCalculationService,
  ],
})
export class PaymentsModule {}
