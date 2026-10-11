import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { LegalPolicyService } from './legal-policy.service';
import { ConsentService } from './consent.service';
import { GrievanceService } from './grievance.service';
import { CookieService } from './cookie.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreatePolicyDto,
  UpdatePolicyDto,
  CreateNewVersionDto,
  UpdateConsentConfigDto,
  RecordConsentDto,
  SubmitGrievanceDto,
  UpdateGrievanceDto,
  CookieItemDto,
} from './dto/legal-policy.dto';

@Controller()
export class LegalController {
  constructor(
    private readonly legalPolicyService: LegalPolicyService,
    private readonly consentService: ConsentService,
    private readonly grievanceService: GrievanceService,
    private readonly cookieService: CookieService,
  ) {}

  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  @Get('legal-policies')
  async getPublishedPolicies() {
    const data = await this.legalPolicyService.getPublishedPolicies();
    return { success: true, data };
  }

  @Get('legal-policies/cookies')
  async getActiveCookies() {
    const data = await this.cookieService.getActiveCookies();
    return { success: true, data };
  }

  @Get('legal-policies/action-requirements/:actionType')
  async getActionRequirements(@Param('actionType') actionType: string) {
    const data = await this.consentService.getActionRequirements(actionType.toUpperCase());
    return { success: true, data };
  }

  @Get('legal-policies/:slug/versions')
  async getPolicyVersions(@Param('slug') slug: string) {
    const data = await this.legalPolicyService.getPolicyVersionHistory(slug);
    return { success: true, data };
  }

  @Get('legal-policies/:slug')
  async getPublishedPolicyBySlug(@Param('slug') slug: string) {
    const data = await this.legalPolicyService.getPublishedPolicyBySlug(slug);
    return { success: true, data };
  }

  @Post('legal-policies/grievances')
  async submitGrievance(
    @Body() dto: SubmitGrievanceDto,
    @Req() req: any,
  ) {
    const data = await this.grievanceService.submitGrievance(dto, req.user);
    return { success: true, data };
  }

  @Post('policy-consents')
  @UseGuards(JwtAuthGuard)
  async recordConsent(
    @Body() dto: RecordConsentDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
    @Req() req: any,
  ) {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const data = await this.consentService.recordConsent(user.id, dto, {
      ipAddress: ip,
      userAgent,
    });
    return { success: true, data };
  }

  // ==========================================
  // ADMIN LEGAL & POLICIES ENDPOINTS
  // ==========================================

  @Get('admin/legal-policies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getAllPolicies(
    @Query('status') status?: string,
    @Query('policyType') policyType?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.legalPolicyService.getAllPolicies(status, policyType, search);
    return { success: true, data };
  }

  @Post('admin/legal-policies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createPolicy(
    @Body() dto: CreatePolicyDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.legalPolicyService.createPolicy(dto, user);
    return { success: true, data };
  }

  @Get('admin/legal-policies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getPolicyById(@Param('id') id: string) {
    const data = await this.legalPolicyService.getPolicyById(id);
    return { success: true, data };
  }

  @Patch('admin/legal-policies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updatePolicy(
    @Param('id') id: string,
    @Body() dto: UpdatePolicyDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.legalPolicyService.updatePolicy(id, dto, user);
    return { success: true, data };
  }

  @Post('admin/legal-policies/:id/new-version')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createNewVersion(
    @Param('id') id: string,
    @Body() dto: CreateNewVersionDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.legalPolicyService.createNewVersion(id, dto, user);
    return { success: true, data };
  }

  @Post('admin/legal-policies/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async publishPolicy(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.legalPolicyService.publishPolicy(id, user);
    return { success: true, data };
  }

  @Post('admin/legal-policies/:id/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async unpublishPolicy(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.legalPolicyService.unpublishPolicy(id, user);
    return { success: true, data };
  }

  @Post('admin/legal-policies/:id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async archivePolicy(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.legalPolicyService.archivePolicy(id, user);
    return { success: true, data };
  }

  @Get('admin/legal-policies/:id/versions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getVersionsByPolicyId(@Param('id') id: string) {
    const data = await this.legalPolicyService.getVersionsByPolicyId(id);
    return { success: true, data };
  }

  // ==========================================
  // ADMIN CONSENT CONFIGURATION
  // ==========================================

  @Get('admin/legal-consent-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getAllConsentConfigurations() {
    const data = await this.consentService.getAllConsentConfigurations();
    return { success: true, data };
  }

  @Put('admin/legal-consent-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateConsentConfiguration(
    @Body() dto: UpdateConsentConfigDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.consentService.updateConsentConfiguration(dto, user);
    return { success: true, data };
  }

  @Get('admin/policy-consents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getConsentRecords(
    @Query('actionContext') actionContext?: string,
    @Query('userId') userId?: string,
    @Query('policyType') policyType?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    const result = await this.consentService.getConsentRecords({
      actionContext,
      userId,
      policyType,
      search,
      skip,
      take,
    });
    return {
      success: true,
      data: {
        records: result.items,
        total: result.total,
        page: Math.floor((result.skip || 0) / (result.take || 25)) + 1,
        limit: result.take,
      },
    };
  }

  // ==========================================
  // ADMIN GRIEVANCES
  // ==========================================

  @Get('admin/grievances')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getAllGrievances(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    const result = await this.grievanceService.getAllGrievances({
      status,
      category,
      search,
      skip,
      take,
    });
    return { success: true, data: result.items, total: result.total };
  }

  @Get('admin/grievances/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getGrievanceById(@Param('id') id: string) {
    const data = await this.grievanceService.getGrievanceById(id);
    return { success: true, data };
  }

  @Patch('admin/grievances/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateGrievance(
    @Param('id') id: string,
    @Body() dto: UpdateGrievanceDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.grievanceService.updateGrievance(id, dto, user);
    return { success: true, data };
  }

  // ==========================================
  // ADMIN COOKIES
  // ==========================================

  @Get('admin/cookies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getAllCookies() {
    const data = await this.cookieService.getAllCookies();
    return { success: true, data };
  }

  @Post('admin/cookies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createCookie(@Body() dto: CookieItemDto) {
    const data = await this.cookieService.createCookie(dto);
    return { success: true, data };
  }

  @Patch('admin/cookies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateCookie(
    @Param('id') id: string,
    @Body() dto: Partial<CookieItemDto>,
  ) {
    const data = await this.cookieService.updateCookie(id, dto);
    return { success: true, data };
  }

  @Delete('admin/cookies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteCookie(@Param('id') id: string) {
    await this.cookieService.deleteCookie(id);
    return { success: true };
  }
}
