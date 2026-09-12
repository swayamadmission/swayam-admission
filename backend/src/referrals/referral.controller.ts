import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralPolicyService } from './referral-policy.service';
import { ReferralQueryDto } from './dto/referral-query.dto';
import {
  AttributeLeadDto,
  OverrideAttributionDto,
  FraudReviewDto,
  ApproveRewardDto,
  RejectRewardDto,
  PayoutRewardDto,
} from './dto/create-referral.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('referrals')
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly policyService: ReferralPolicyService,
  ) {}

  // ─── PUBLIC ENDPOINTS (APPLY NOW FLOW) ────────────────────────────────────

  @Get('validate/:code')
  validateCode(@Param('code') code: string) {
    return this.referralService.validateReferralCode(code);
  }

  @Post('attribute')
  attributeLead(@Body() dto: AttributeLeadDto) {
    return this.referralService.attributeLead(dto);
  }

  // ─── STUDENT DASHBOARD ENDPOINTS ──────────────────────────────────────────

  @Get('my-code')
  @UseGuards(JwtAuthGuard)
  getMyReferralCode(@CurrentUser() user: IUser) {
    return this.referralService.getOrCreateReferralCode(user.id);
  }

  @Get('students/me/referral')
  @UseGuards(JwtAuthGuard)
  getStudentMeReferral(@CurrentUser() user: IUser) {
    return this.referralService.getOrCreateReferralCode(user.id);
  }

  @Get('my-referrals')
  @UseGuards(JwtAuthGuard)
  getMyReferrals(@CurrentUser() user: IUser) {
    return this.referralService.getMyReferrals(user.id);
  }

  @Get('students/me/referrals')
  @UseGuards(JwtAuthGuard)
  getStudentMeReferrals(@CurrentUser() user: IUser) {
    return this.referralService.getMyReferrals(user.id);
  }

  @Post('onboarding/apply')
  @UseGuards(JwtAuthGuard)
  applyOnboardingReferral(@Body() dto: { code: string }, @CurrentUser() user: IUser) {
    return this.referralService.applyReferralOnboarding(user.id, dto?.code);
  }

  @Post('onboarding/skip')
  @UseGuards(JwtAuthGuard)
  skipOnboardingReferral(@CurrentUser() user: IUser) {
    return this.referralService.skipReferralOnboarding(user.id);
  }

  @Get('my-benefit')
  @UseGuards(JwtAuthGuard)
  getMyReferralBenefit(@CurrentUser() user: IUser) {
    return this.referralService.getMyReferralBenefit(user.id);
  }

  // ─── ADMIN & FINANCE GOVERNANCE ENDPOINTS ─────────────────────────────────

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE', 'COUNSELOR_LEAD')
  getAdminStats() {
    return this.referralService.getAdminStats();
  }

  @Get('admin/funnel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  getAdminFunnel() {
    return this.referralService.getAdminFunnel();
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE', 'COUNSELOR_LEAD')
  getAdminReferrals(@Query() query: ReferralQueryDto) {
    return this.referralService.getAdminReferrals(query);
  }

  // ─── ADMIN POLICY MANAGEMENT & SIMULATION ────────────────────────────────

  @Get('admin/policies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  getAllPolicies() {
    return this.policyService.getAllPolicies();
  }

  @Get('admin/policies/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  getActivePolicy() {
    return this.policyService.getActivePolicy();
  }

  @Post('admin/policies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  createPolicy(@Body() dto: any, @CurrentUser() user: IUser) {
    return this.policyService.createPolicy(dto, user.id);
  }

  @Patch('admin/policies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  updatePolicy(@Param('id') policyId: string, @Body() dto: any, @CurrentUser() user: IUser) {
    return this.policyService.updatePolicy(policyId, dto, user.id);
  }

  @Post('admin/policies/:id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  activatePolicy(@Param('id') policyId: string, @CurrentUser() user: IUser) {
    return this.policyService.activatePolicy(policyId, user.id);
  }

  @Post('admin/policies/simulate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  simulatePolicy(@Body() dto: { totalReferrals: number; qualifyingReferrals: number; policyVersion?: string }) {
    return this.policyService.simulatePolicy(dto);
  }

  // ─── ADMIN REFERRAL QUALIFICATION & RE-CALCULATION ───────────────────────

  @Post('admin/referrals/:id/qualification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  updateQualification(
    @Param('id') referralId: string,
    @Body() dto: { isOneYearCompleted?: boolean; isOneYearFeePaid?: boolean; evidence?: any },
    @CurrentUser() user: IUser,
  ) {
    return this.referralService.updateReferralQualification(referralId, dto, user.id);
  }

  @Post('admin/:id/override')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  overrideAttribution(
    @Param('id') referralId: string,
    @Body() dto: OverrideAttributionDto,
    @CurrentUser() user: IUser,
  ) {
    return this.referralService.overrideAttribution(referralId, dto, user.id);
  }

  @Post('admin/:id/fraud-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'SECURITY_OFFICER')
  reviewFraud(
    @Param('id') referralId: string,
    @Body() dto: FraudReviewDto,
    @CurrentUser() user: IUser,
  ) {
    return this.referralService.reviewFraud(referralId, dto, user.id);
  }

  @Post('admin/rewards/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  approveReward(
    @Param('id') rewardId: string,
    @Body() dto: ApproveRewardDto,
    @CurrentUser() user: IUser,
  ) {
    return this.referralService.approveReward(rewardId, user.id, dto.reason);
  }

  @Post('admin/rewards/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  rejectReward(
    @Param('id') rewardId: string,
    @Body() dto: RejectRewardDto,
    @CurrentUser() user: IUser,
  ) {
    return this.referralService.rejectReward(rewardId, user.id, dto.reason);
  }

  @Post('admin/rewards/:id/payout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  processPayout(
    @Param('id') rewardId: string,
    @Body() dto: PayoutRewardDto,
    @CurrentUser() user: IUser,
  ) {
    return this.referralService.processPayout(rewardId, dto, user.id);
  }
}
