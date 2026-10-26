import {
  Controller,
  Get,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { DurableOutboxService } from '../notifications/durable-outbox.service';
import { EmailChannel } from '../notifications/notification-channels.service';

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly prismaService: PrismaService,
    @Optional() private readonly outboxService?: DurableOutboxService,
    @Optional() private readonly emailChannel?: EmailChannel,
  ) {}

  /**
   * Consolidated System Health Check.
   * Returns HTTP 200 when ready, or HTTP 503 if critical dependencies (database) are down.
   */
  @Get()
  @ApiOperation({ summary: 'Consolidated System Health Check' })
  async getStatus() {
    let dbStatus = 'DISCONNECTED';
    let dbLatencyMs = -1;
    const start = Date.now();

    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
      dbStatus = 'CONNECTED';
    } catch {
      dbStatus = 'DISCONNECTED';
    }

    const isDatabaseReady = dbStatus === 'CONNECTED';
    const responsePayload = {
      status: isDatabaseReady ? 'UP' : 'DOWN',
      apiVersion: 'v1',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database: dbStatus,
        databaseLatencyMs: dbLatencyMs,
        auth: 'OPERATIONAL',
        geography: 'OPERATIONAL',
        leads: 'OPERATIONAL',
      },
    };

    if (!isDatabaseReady) {
      throw new ServiceUnavailableException(responsePayload);
    }

    return responsePayload;
  }

  /**
   * Liveness Check:
   * Fast probe to verify the application process is running and alive.
   * Does NOT fail if external third-party services or databases are recovering.
   */
  @Get('liveness')
  @ApiOperation({ summary: 'Check if the application process is running' })
  checkLiveness() {
    return {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness Check:
   * Determines whether the service can accept and handle real traffic.
   * Fails closed (HTTP 503) if Neon PostgreSQL database connection is unavailable.
   */
  @Get('readiness')
  @ApiOperation({ summary: 'Check if application is ready to accept traffic' })
  async checkReadiness() {
    const start = Date.now();
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      const dbLatencyMs = Date.now() - start;
      return {
        status: 'UP',
        database: 'CONNECTED',
        databaseLatencyMs: dbLatencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      throw new ServiceUnavailableException({
        status: 'DOWN',
        database: 'DISCONNECTED',
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Provider Health Check:
   * Reports Email, WhatsApp, and SMS provider status independently.
   * Distinguishes configured transport credentials from verified inbox delivery.
   * Never leaks passwords, secrets, or raw connection strings.
   */
  @Get('providers')
  @ApiOperation({ summary: 'Communication Gateways & Transport Health' })
  async getProviderHealth() {
    let emailHealth: any = { status: 'UNCONFIGURED', provider: 'NONE' };
    if (this.emailChannel) {
      emailHealth = await this.emailChannel.getHealth();
    } else {
      const host = process.env.SMTP_HOST;
      const user = process.env.SMTP_USER;
      if (host && user) {
        emailHealth = {
          status: 'CONFIGURED',
          provider: process.env.EMAIL_PROVIDER || 'SMTP',
          host,
          port: Number(process.env.SMTP_PORT || 587),
          user:
            user.length > 5
              ? `${user.substring(0, 3)}***@${user.split('@')[1] || 'domain'}`
              : '***',
          quotaBlocked: false,
        };
      }
    }

    const whatsAppConfigured = Boolean(
      process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN,
    );
    const smsConfigured = Boolean(process.env.FAST2SMS_API_KEY);

    return {
      timestamp: new Date().toISOString(),
      email: {
        status: emailHealth.status,
        provider: emailHealth.provider,
        host: emailHealth.host,
        port: emailHealth.port,
        quotaBlocked: emailHealth.quotaBlocked,
        quotaBlockedUntil: emailHealth.quotaBlockedUntil,
        message:
          emailHealth.message ||
          (emailHealth.quotaBlocked
            ? 'Provider sending quota limit active'
            : 'Transport configured (handshake ready; live outbound delivery requires external provider activation)'),
      },
      whatsApp: {
        status: whatsAppConfigured ? 'CONFIGURED' : 'UNCONFIGURED',
        provider: 'META_CLOUD_API',
        apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
        hasWebhookSecret: Boolean(
          process.env.WHATSAPP_WEBHOOK_SECRET || process.env.META_APP_SECRET,
        ),
      },
      sms: {
        status: smsConfigured ? 'CONFIGURED' : 'UNCONFIGURED',
        provider: 'FAST2SMS',
        route: process.env.FAST2SMS_ROUTE || 'q',
      },
    };
  }

  /**
   * Background Worker Health Check:
   * Reports Durable Outbox worker execution state, queue depth, and stall detection.
   */
  @Get('worker')
  @ApiOperation({ summary: 'Durable Outbox Background Worker Health' })
  async getWorkerHealth() {
    if (!this.outboxService) {
      return {
        status: 'UNAVAILABLE',
        message: 'DurableOutboxService not initialized',
        isWorkerRunning: false,
      };
    }

    const metrics = await this.outboxService.getOutboxMetrics();
    const isStalled =
      metrics.queueDepth > 0 &&
      metrics.oldestQueuedAgeSeconds > 3600 &&
      !metrics.isQuotaCooldownActive;

    return {
      status: isStalled ? 'DEGRADED' : 'HEALTHY',
      isWorkerRunning: true,
      queueDepth: metrics.queueDepth,
      oldestQueuedAgeSeconds: metrics.oldestQueuedAgeSeconds,
      stuckSendingCount: metrics.stuckSendingCount,
      isQuotaCooldownActive: metrics.isQuotaCooldownActive,
      quotaCooldownUntil: metrics.quotaCooldownUntil,
      quotaCooldownRemainingSeconds: metrics.quotaCooldownRemainingSeconds,
      queueStalled: isStalled,
      countsLast24h: metrics.countsLast24h,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Diagnostic Auth Health Check (Retained for backward compatibility)
   */
  @Get('auth')
  @ApiOperation({ summary: 'Auth System Diagnostic Health Check' })
  async getAuthHealth() {
    let dbStatus = 'down';
    let userCount = 0;
    try {
      userCount = await this.prismaService.user.count();
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    return {
      status: 'ok',
      authService: 'operational',
      authRoute: '/v1/auth/login',
      database: dbStatus,
      userDirectoryReady: userCount > 0,
      timestamp: new Date().toISOString(),
    };
  }
}
