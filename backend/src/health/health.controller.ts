import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private prismaHealthIndicator: PrismaHealthIndicator,
    private prismaService: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'System Health Check' })
  async getStatus() {
    let dbStatus = 'down';
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    return {
      status: 'ok',
      apiVersion: 'v1',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        auth: 'up',
        geography: 'up',
        leads: 'up',
      },
    };
  }

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

  @Get('liveness')
  @ApiOperation({ summary: 'Check if the application is running' })
  @HealthCheck()
  checkLiveness() {
    return { status: 'up' };
  }

  @Get('readiness')
  @ApiOperation({
    summary: 'Check if the application is ready to accept traffic',
  })
  @HealthCheck()
  checkReadiness() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () =>
        this.prismaHealthIndicator.pingCheck('database', this.prismaService, {
          timeout: 10000,
        }),
    ]);
  }
}
