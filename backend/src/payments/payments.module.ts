import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentGatewayService } from './gateways/payment-gateway.service';
import { PaymentDocumentService } from './services/payment-document.service';
import { PaymentGovernanceService } from './services/payment-governance.service';
import { InvoiceService } from './services/invoice.service';
import { ReconciliationService } from './services/reconciliation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationsModule,
    JourneyModule,
    AuthModule,
  ],
  providers: [
    PaymentsService,
    PaymentGatewayService,
    PaymentDocumentService,
    PaymentGovernanceService,
    InvoiceService,
    ReconciliationService,
  ],
  controllers: [PaymentsController],
  exports: [
    PaymentsService,
    PaymentGatewayService,
    PaymentDocumentService,
    PaymentGovernanceService,
    InvoiceService,
    ReconciliationService,
  ],
})
export class PaymentsModule {}
