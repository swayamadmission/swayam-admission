import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

const isRedisEnabled =
  process.env.REDIS_ENABLED === 'true' || process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ...(isRedisEnabled
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
              connection: {
                host: configService.get('REDIS_HOST', 'localhost'),
                port: configService.get('REDIS_PORT', 6379),
              },
            }),
          }),
          BullModule.registerQueue({ name: 'email' }),
          BullModule.registerQueue({ name: 'whatsapp' }),
          BullModule.registerQueue({ name: 'ai-analytics' }),
        ]
      : []),
  ],
  exports: isRedisEnabled ? [BullModule] : [],
})
export class JobsModule {
  private readonly logger = new Logger(JobsModule.name);

  constructor() {
    if (!isRedisEnabled) {
      this.logger.warn(
        'Redis is disabled in development. Set REDIS_ENABLED=true to enable background jobs.',
      );
    }
  }
}
