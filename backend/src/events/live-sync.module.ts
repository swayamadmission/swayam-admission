import { Global, Module } from '@nestjs/common';
import { LiveSyncGateway } from './live-sync.gateway';
import { LiveSyncService } from './live-sync.service';

@Global()
@Module({
  providers: [LiveSyncGateway, LiveSyncService],
  exports: [LiveSyncService, LiveSyncGateway],
})
export class LiveSyncModule {}
