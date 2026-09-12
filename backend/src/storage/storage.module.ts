import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageService } from './providers/local-storage.service';

@Module({
  providers: [StorageService, LocalStorageService],
  exports: [StorageService],
})
export class StorageModule {}
