import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SystemConfigurationService } from './system-configuration.service';
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';
import { UpdateBrandingSettingDto } from './dto/update-branding-setting.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import { UpdateIntegrationSettingDto } from './dto/update-integration-setting.dto';
import { UpdateSecuritySettingDto } from './dto/update-security-setting.dto';
import { UpdateSEOSettingDto } from './dto/update-seo-setting.dto';
import { UpdateBrandContactSettingDto } from './dto/update-brand-contact-setting.dto';
import {
  CreateConfigurationDto,
  UpdateConfigurationDto,
  QueryConfigurationDto,
  RollbackConfigurationDto,
  ImportConfigurationDto,
  SubmitApprovalDto,
  ReviewApprovalDto,
  ConfigurationScope,
} from './dto/configuration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: SystemConfigurationService,
  ) {}

  /**
   * Public unauthenticated settings endpoint for public website & user panel
   */
  @Get('public')
  getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  /**
   * Brand, Contact & Social Settings (Admin/Super Admin only)
   */
  @Get('brand-contact')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getBrandContactSettings() {
    return this.settingsService.getBrandContactSettings();
  }

  @Patch('brand-contact')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateBrandContactSettings(
    @Body() dto: UpdateBrandContactSettingDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateBrandContactSettings(dto, user);
  }

  // ─── CANONICAL ENTERPRISE CONFIGURATION ENGINE ───────────────────────────────

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SENIOR_COUNSELOR', 'FINANCE_MANAGER', 'ACCOUNTS_MANAGER', 'DIRECTOR')
  queryConfigurations(@Query() query: QueryConfigurationDto) {
    return this.configService.queryConfigurations(query);
  }

  @Get('config/effective')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF', 'SENIOR_COUNSELOR', 'COUNSELOR', 'FINANCE_MANAGER', 'COLLEGE_ADMIN')
  getEffectiveConfig(
    @Query('key') key: string,
    @Query('collegeId') collegeId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('unitId') unitId?: string,
  ) {
    return this.configService.getEffectiveValue(key, {
      collegeId,
      organizationId,
      departmentId,
      unitId,
    });
  }

  @Get('config/approvals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getPendingApprovals() {
    return this.configService.getPendingApprovals();
  }

  @Post('config/approvals/:id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  reviewApproval(
    @Param('id') id: string,
    @Body() dto: ReviewApprovalDto,
    @CurrentUser() user: any,
  ) {
    return this.configService.reviewApproval(id, dto, user);
  }

  @Get('config/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  exportConfigurations() {
    return this.configService.exportNonSecretConfigurations();
  }

  @Post('config/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  importConfigurations(
    @Body() dto: ImportConfigurationDto,
    @CurrentUser() user: any,
  ) {
    return this.configService.importConfigurations(dto, user);
  }

  @Get('config/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getConfigurationByKey(
    @Param('key') key: string,
    @Query('scope') scope?: ConfigurationScope,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.configService.getConfigurationByKey(key, scope, scopeId);
  }

  @Post('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  createConfiguration(
    @Body() dto: CreateConfigurationDto,
    @CurrentUser() user: any,
  ) {
    return this.configService.createConfiguration(dto, user);
  }

  @Patch('config/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateConfiguration(
    @Param('key') key: string,
    @Body() dto: UpdateConfigurationDto,
    @CurrentUser() user: any,
  ) {
    return this.configService.updateConfiguration(key, dto, user);
  }

  @Post('config/:key/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  submitForApproval(
    @Param('key') key: string,
    @Body() dto: SubmitApprovalDto,
    @CurrentUser() user: any,
  ) {
    return this.configService.submitForApproval(key, dto, user);
  }

  @Post('config/:key/rollback')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  rollbackConfiguration(
    @Param('key') key: string,
    @Body() dto: RollbackConfigurationDto,
    @CurrentUser() user: any,
  ) {
    return this.configService.rollbackConfiguration(key, dto, user);
  }

  @Post('config/:key/reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  resetToDefault(
    @Param('key') key: string,
    @CurrentUser() user: any,
    @Query('scope') scope: ConfigurationScope = ConfigurationScope.GLOBAL,
    @Query('scopeId') scopeId: string = '',
  ) {
    return this.configService.resetToDefault(key, scope, scopeId, user);
  }

  @Get('config/:key/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getConfigurationHistory(
    @Param('key') key: string,
    @Query('scope') scope?: ConfigurationScope,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.configService.getConfigurationHistory(key, scope, scopeId);
  }

  @Get('telemetry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getTelemetryMetrics() {
    return this.configService.getSystemHealthMetrics();
  }

  // ─── ADMIN LEGACY COMPATIBILITY ENDPOINTS ────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Get('general')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getGeneralSettings() {
    return this.settingsService.getGeneralSettings();
  }

  @Patch('general')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateGeneralSettings(
    @Body() dto: UpdateSystemSettingDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateGeneralSettings(
      dto,
      user?.id,
      user?.fullName || user?.email,
    );
  }

  @Get('branding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getBrandingSettings() {
    return this.settingsService.getBrandingSettings();
  }

  @Patch('branding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateBrandingSettings(
    @Body() dto: UpdateBrandingSettingDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateBrandingSettings(
      dto,
      user?.id,
      user?.fullName || user?.email,
    );
  }

  @Get('notifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getNotificationSettings() {
    return this.settingsService.getNotificationSettings();
  }

  @Patch('notifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateNotificationSettings(
    @Body() dto: UpdateNotificationSettingDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateNotificationSettings(
      dto,
      user?.id,
      user?.fullName || user?.email,
    );
  }

  @Get('integrations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getIntegrationSettings() {
    return this.settingsService.getIntegrationSettings();
  }

  @Patch('integrations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateIntegrationSettings(
    @Body() dto: UpdateIntegrationSettingDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateIntegrationSettings(
      dto,
      user?.id,
      user?.fullName || user?.email,
    );
  }

  @Get('security')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getSecuritySettings() {
    return this.settingsService.getSecuritySettings();
  }

  @Patch('security')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateSecuritySettings(
    @Body() dto: UpdateSecuritySettingDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateSecuritySettings(
      dto,
      user?.id,
      user?.fullName || user?.email,
    );
  }

  @Get('seo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getSeoSettings() {
    return this.settingsService.getSeoSettings();
  }

  @Patch('seo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateSeoSettings(
    @Body() dto: UpdateSEOSettingDto,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateSeoSettings(
      dto,
      user?.id,
      user?.fullName || user?.email,
    );
  }

  // ─── FEATURE FLAGS ───────────────────────────────────────────────────────────

  @Get('feature-flags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getFeatureFlags() {
    return this.settingsService.getFeatureFlags();
  }

  @Patch('feature-flags/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  toggleFeatureFlag(
    @Param('key') key: string,
    @Body('enabled') enabled: boolean,
    @CurrentUser() user: any,
  ) {
    return this.settingsService.toggleFeatureFlag(
      key,
      enabled,
      user?.id,
      user?.fullName || user?.email,
    );
  }

  // ─── EMAIL TEMPLATES ─────────────────────────────────────────────────────────

  @Get('email-templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getEmailTemplates() {
    return this.settingsService.getEmailTemplates();
  }

  @Patch('email-templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateEmailTemplate(
    @Param('id') id: string,
    @Body() data: { subject?: string; bodyHtml?: string; enabled?: boolean },
    @CurrentUser() user: any,
  ) {
    return this.settingsService.updateEmailTemplate(
      id,
      data,
      user?.id,
      user?.fullName || user?.email,
    );
  }

  // ─── TESTING & DIAGNOSTICS ──────────────────────────────────────────────────

  @Post('test-email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  testEmail(@Body('recipient') recipient?: string) {
    return this.settingsService.testEmail(recipient);
  }

  @Post('test-sms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  testSms(@Body('phone') phone?: string) {
    return this.settingsService.testSms(phone);
  }

  @Post('test-whatsapp')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  testWhatsapp(@Body('phone') phone?: string) {
    return this.settingsService.testWhatsapp(phone);
  }

  @Post('test-push')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  testPush() {
    return this.settingsService.testPush();
  }

  @Post('test-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  testPayment() {
    return this.settingsService.testPayment();
  }

  @Post('test-storage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  testStorage() {
    return this.settingsService.testStorage();
  }

  @Post('test-ai')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  testAi() {
    return this.settingsService.testAi();
  }

  // ─── BACKUP & RESTORE ─────────────────────────────────────────────────────────

  @Post('backup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  createBackup(@CurrentUser() user: any) {
    return this.settingsService.createBackup(user?.id);
  }

  @Get('backups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getBackups() {
    return this.settingsService.getBackups();
  }

  @Post('restore/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  restoreBackup(@Param('id') id: string) {
    return this.settingsService.restoreBackup(id);
  }

  // ─── HISTORY & ROLLBACK ──────────────────────────────────────────────────────

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getHistory() {
    return this.settingsService.getAuditLogs();
  }

  @Post('rollback/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  rollbackSetting(@Param('id') id: string) {
    return this.settingsService.rollbackSetting(id);
  }

  // ─── IMPORT / EXPORT / RESET / CACHE ──────────────────────────────────────────

  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  exportSettings() {
    return this.settingsService.exportSettings();
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  importSettings(@Body() content: any, @CurrentUser() user: any) {
    return this.settingsService.importSettings(
      content,
      user?.id,
      user?.fullName || user?.email,
    );
  }

  @Post('reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  resetSettings(@CurrentUser() user: any) {
    return this.settingsService.resetSettings(
      user?.id,
      user?.fullName || user?.email,
    );
  }

  @Post('cache/clear')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  clearCache() {
    this.configService.clearCache();
    return this.settingsService.clearCache();
  }

  // ─── METRICS & MONITORING ──────────────────────────────────────────────────────

  @Get('system-health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getSystemHealth() {
    return this.settingsService.getSystemHealth();
  }

  @Get('environment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getEnvironment() {
    return this.settingsService.getEnvironmentInfo();
  }

  @Get('storage-usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getStorageUsage() {
    return this.settingsService.getStorageUsage();
  }

  @Get('license')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getLicense() {
    return this.settingsService.getLicenseInfo();
  }
}
