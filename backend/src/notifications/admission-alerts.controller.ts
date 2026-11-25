import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdmissionAlertsService } from './admission-alerts.service';
import { SubscribeAlertDto } from './dto/subscribe-alert.dto';

@Controller('alerts')
export class AdmissionAlertsController {
  constructor(private readonly alertsService: AdmissionAlertsService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  subscribe(@Body() dto: SubscribeAlertDto) {
    return this.alertsService.subscribe(dto);
  }

  @Get('unsubscribe')
  async unsubscribe(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.alertsService.unsubscribeByToken(token);
      return res
        .status(200)
        .type('text/html')
        .send(`<!doctype html><html><body style="font-family:sans-serif;background:#F8FAFC;padding:40px;text-align:center;color:#1F2937;"><div style="max-width:460px;margin:0 auto;background:#fff;padding:32px;border-radius:16px;border:1px solid #E5E7EB;"><h2 style="color:#4A7B5B;margin-top:0;">Unsubscribed</h2><p>${result.email} has been removed from Swayam Admission Alerts.</p></div></body></html>`);
    } catch {
      return res
        .status(404)
        .type('text/html')
        .send(`<!doctype html><html><body style="font-family:sans-serif;background:#F8FAFC;padding:40px;text-align:center;color:#1F2937;"><div style="max-width:460px;margin:0 auto;background:#fff;padding:32px;border-radius:16px;border:1px solid #E5E7EB;"><h2 style="color:#DC2626;margin-top:0;">Invalid Link</h2><p>This unsubscribe link is invalid or expired.</p></div></body></html>`);
    }
  }

  @Get('subscribers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  listSubscribers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.alertsService.listSubscribers(Number(page) || 1, Number(limit) || 50);
  }
}
