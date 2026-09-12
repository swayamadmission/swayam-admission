import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StaffOnboardingService } from './staff-onboarding.service';
import {
  StaffRegisterDto,
  VerifyOtpDto,
  UploadStaffKycDto,
  VerifyKycDto,
  ApproveStaffDto,
  RejectStaffDto,
  ResignStaffDto,
  AdminPasswordResetDto,
  AdminPasswordChangeDto,
  FirstLoginPasswordChangeDto,
  StaffSecurityActionDto,
} from './dto/staff-onboarding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('staff-onboarding')
export class StaffOnboardingController {
  constructor(
    private readonly staffOnboardingService: StaffOnboardingService,
  ) {}

  // ==========================================
  // PUBLIC ENDPOINTS (Registration & OTP)
  // ==========================================

  @Get('allowed-roles')
  async getAllowedRoles() {
    return this.staffOnboardingService.getAllowedRoles();
  }

  @Post('register')
  async register(@Body() dto: StaffRegisterDto) {
    return this.staffOnboardingService.register(dto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.staffOnboardingService.verifyOtp(dto);
  }

  @Post('upload-kyc')
  async uploadKyc(@Body() dto: UploadStaffKycDto) {
    return this.staffOnboardingService.uploadKyc(dto);
  }

  @Post('change-password-first-login')
  @UseGuards(JwtAuthGuard)
  async changePasswordFirstLogin(
    @Request() req: any,
    @Body() dto: FirstLoginPasswordChangeDto,
  ) {
    return this.staffOnboardingService.changePasswordFirstLogin(
      req.user?.id,
      dto,
    );
  }

  // ==========================================
  // ADMIN & IAM APPROVER ENDPOINTS
  // ==========================================

  @Get('requests')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('staff.onboard.view')
  async getRequests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('approvalStatus') approvalStatus?: string,
    @Query('kycStatus') kycStatus?: string,
    @Query('roleSlug') roleSlug?: string,
    @Query('stateId') stateId?: string,
    @Query('search') search?: string,
  ) {
    return this.staffOnboardingService.getRequests({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      approvalStatus,
      kycStatus,
      roleSlug,
      stateId,
      search,
    });
  }

  @Get('requests/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('staff.onboard.view')
  async getRequestById(@Param('id') id: string) {
    return this.staffOnboardingService.getRequestById(id);
  }

  @Post('requests/:id/kyc-verify')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('staff.kyc.verify')
  async verifyKyc(
    @Param('id') id: string,
    @Body() dto: VerifyKycDto,
    @Request() req: any,
  ) {
    return this.staffOnboardingService.verifyKyc(id, dto, req.user?.id);
  }

  @Post('requests/:id/approve')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('staff.onboard.approve')
  async approveStaff(
    @Param('id') id: string,
    @Body() dto: ApproveStaffDto,
    @Request() req: any,
  ) {
    return this.staffOnboardingService.approveStaff(id, dto, req.user?.id);
  }

  @Post('requests/:id/reject')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('staff.onboard.approve')
  async rejectStaff(
    @Param('id') id: string,
    @Body() dto: RejectStaffDto,
    @Request() req: any,
  ) {
    return this.staffOnboardingService.rejectStaff(id, dto, req.user?.id);
  }

  // ==========================================
  // STAFF LIFECYCLE & RESIGNATION
  // ==========================================

  @Post('staff/:userId/resign')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('staff.resign')
  async resignStaff(
    @Param('userId') userId: string,
    @Body() dto: ResignStaffDto,
    @Request() req: any,
  ) {
    return this.staffOnboardingService.resignStaff(userId, dto, req.user?.id);
  }

  // ==========================================
  // ADMIN CONTROLLED SECURITY & PASSWORD RECOVERY
  // ==========================================

  @Post('staff/:userId/admin-password-reset')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('staff.password.reset')
  async adminPasswordReset(
    @Param('userId') userId: string,
    @Body() dto: AdminPasswordResetDto,
    @Request() req: any,
  ) {
    return this.staffOnboardingService.adminPasswordReset(
      userId,
      dto,
      req.user?.id,
    );
  }

  @Post('staff/:userId/admin-password-change')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('staff.password.reset')
  async adminPasswordChange(
    @Param('userId') userId: string,
    @Body() dto: AdminPasswordChangeDto,
    @Request() req: any,
  ) {
    return this.staffOnboardingService.adminPasswordChange(
      userId,
      dto,
      req.user?.id,
    );
  }

  @Post('staff/:userId/revoke-sessions')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('staff.session.revoke')
  async revokeSessions(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.staffOnboardingService.revokeSessions(
      userId,
      req.user?.id,
      reason,
    );
  }

  @Post('staff/:userId/lock')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('staff.account.lock')
  async lockAccount(
    @Param('userId') userId: string,
    @Body() dto: StaffSecurityActionDto,
    @Request() req: any,
  ) {
    return this.staffOnboardingService.lockAccount(userId, dto, req.user?.id);
  }

  @Post('staff/:userId/unlock')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('staff.account.unlock')
  async unlockAccount(@Param('userId') userId: string, @Request() req: any) {
    return this.staffOnboardingService.unlockAccount(userId, req.user?.id);
  }

  @Post('staff/:userId/disable')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('staff.account.disable')
  async disableAccount(
    @Param('userId') userId: string,
    @Body() dto: StaffSecurityActionDto,
    @Request() req: any,
  ) {
    return this.staffOnboardingService.disableAccount(userId, dto, req.user?.id);
  }

  @Post('staff/:userId/enable')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('staff.account.enable')
  async enableAccount(@Param('userId') userId: string, @Request() req: any) {
    return this.staffOnboardingService.enableAccount(userId, req.user?.id);
  }
}
