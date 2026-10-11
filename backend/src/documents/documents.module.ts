import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentVaultStorageService } from './document-vault-storage.service';
import { DocumentWatermarkService } from './document-watermark.service';
import { DocumentAuditService } from './document-audit.service';
import { DocumentRetentionService } from './document-retention.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';

import { LegalModule } from '../legal/legal.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    AuditModule,
    NotificationsModule,
    AuthModule,
    SettingsModule,
    LegalModule,
  ],
  providers: [
    DocumentsService,
    DocumentVaultStorageService,
    DocumentWatermarkService,
    DocumentAuditService,
    DocumentRetentionService,
  ],
  controllers: [DocumentsController],
  exports: [
    DocumentsService,
    DocumentVaultStorageService,
    DocumentWatermarkService,
    DocumentAuditService,
    DocumentRetentionService,
  ],
})
export class DocumentsModule {}
