import { Controller, Get, Put, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { OtpAdminService } from './otp-admin.service';
import { UpdateOtpConfigDto } from './dto/otp-config.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Request } from 'express';

@Controller('admin/otp-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'SYSTEM_MANAGER') // Enforcing RBAC for admin capabilities
export class OtpAdminController {
  constructor(private readonly otpAdminService: OtpAdminService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.otpAdminService.getDashboardStats();
  }

  @Get('delivery-stats')
  getDeliveryStats() {
    return this.otpAdminService.getDeliveryStats();
  }

  @Get('config/:channel')
  getConfig(@Param('channel') channel: 'WHATSAPP' | 'EMAIL' | 'SMS' | (string & {})) {
    return this.otpAdminService.getConfig(channel);
  }

  @Put('config/:channel')
  updateConfig(
    @Req() req: any,
    @Param('channel') channel: 'WHATSAPP' | 'EMAIL' | 'SMS' | (string & {}),
    @Body() dto: UpdateOtpConfigDto,
  ) {
    const adminUserId = req.user?.id || req.user?.userId;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    return this.otpAdminService.updateConfig(adminUserId, channel, dto, ipAddress);
  }

  @Post('test/whatsapp')
  testWhatsApp(@Req() req: any, @Body('mobile') mobile: string) {
    const adminUserId = req.user?.id || req.user?.userId;
    return this.otpAdminService.testWhatsAppConfig(adminUserId, mobile);
  }

  @Post('test/email')
  testEmail(@Req() req: any, @Body('email') email: string) {
    const adminUserId = req.user?.id || req.user?.userId;
    return this.otpAdminService.testEmailConfig(adminUserId, email);
  }

  @Post('test/sms')
  testSms(@Req() req: any, @Body('mobile') mobile: string) {
    const adminUserId = req.user?.id || req.user?.userId;
    return this.otpAdminService.testSmsConfig(adminUserId, mobile);
  }
}
