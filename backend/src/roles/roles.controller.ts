import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { GovernanceService } from './governance.service';
import { CreateGovernanceRequestDto } from './dto/create-governance-request.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleQueryDto } from './dto/role-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly governanceService: GovernanceService,
  ) {}

  @Get('stats')
  @Permissions('roles.view')
  getStats() {
    return this.rolesService.getStats();
  }

  @Get('hierarchy')
  @Permissions('roles.view')
  getHierarchy() {
    return this.rolesService.getHierarchy();
  }

  @Get('hierarchy/preview-reparent')
  @Permissions('roles.hierarchy')
  previewReparent(
    @Query('roleId') roleId: string,
    @Query('newParentRoleId') newParentRoleId?: string,
  ) {
    return this.rolesService.previewReparent(roleId, newParentRoleId || null);
  }

  @Get('audit')
  @Permissions('logs.view', 'roles.view')
  getAuditLogs(@Query('roleId') roleId?: string) {
    return this.rolesService.getAuditLogs(roleId);
  }

  @Get('permissions/all')
  @Permissions('roles.view')
  getPermissions() {
    return this.rolesService.getPermissions();
  }

  @Get('form-options')
  @Permissions('roles.view')
  getFormOptions() {
    return this.rolesService.getFormOptions();
  }

  // ─── Governance 2-Person Approval Endpoints ───────────────────

  @Get('governance/requests')
  @Permissions('governance.view')
  getGovernanceRequests(@Query('status') status?: any) {
    return this.governanceService.findAll(status);
  }

  @Post('governance/requests')
  @Permissions('governance.create')
  createGovernanceRequest(
    @Body() dto: CreateGovernanceRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.governanceService.createRequest(dto, user?.id);
  }

  @Post('governance/requests/:id/approve')
  @Permissions('governance.approve')
  approveGovernanceRequest(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rolesService.executeGovernanceApproval(id, user?.id);
  }

  @Post('governance/requests/:id/reject')
  @Permissions('governance.reject')
  rejectGovernanceRequest(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.governanceService.rejectRequest(id, user?.id, reason);
  }

  // ─── Core Roles Endpoints ────────────────────────────────────

  @Get()
  @Permissions('roles.view')
  findAll(@Query() query: RoleQueryDto) {
    return this.rolesService.findAll(query);
  }

  @Get(':id')
  @Permissions('roles.view')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @Permissions('roles.create')
  create(@Body() createDto: CreateRoleDto, @CurrentUser() user: any) {
    return this.rolesService.createRole(createDto, user?.id);
  }

  @Post('clone')
  @Permissions('roles.create')
  clone(
    @Body('id') id: string,
    @Body('name') name?: string,
    @CurrentUser() user?: any,
  ) {
    return this.rolesService.cloneRole(id, name, user?.id);
  }

  @Patch(':id')
  @Permissions('roles.edit')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRoleDto,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.updateRole(id, updateDto, user?.id);
  }

  @Patch(':id/permissions')
  @Permissions('roles.manage')
  updatePermissions(
    @Param('id') id: string,
    @Body('matrix') matrix: Record<string, Record<string, boolean>>,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.updatePermissionsMatrix(id, matrix, user?.id);
  }

  @Post(':id/reparent')
  @Permissions('roles.hierarchy')
  reparent(
    @Param('id') id: string,
    @Body('parentRoleId') parentRoleId: string | null,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.reparentRole(id, parentRoleId, user?.id);
  }

  @Post(':id/disable')
  @Permissions('roles.disable')
  disable(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.disableRole(id, user?.id, reason);
  }

  @Post(':id/enable')
  @Permissions('roles.enable')
  enable(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rolesService.enableRole(id, user?.id);
  }

  @Post(':id/restore')
  @Permissions('roles.enable')
  restore(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rolesService.restoreRole(id, user?.id);
  }

  @Post(':id/lock')
  @Permissions('roles.lock')
  lock(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.lockRole(id, user?.id, reason);
  }

  @Post(':id/unlock')
  @Permissions('roles.unlock')
  unlock(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rolesService.unlockRole(id, user?.id);
  }

  @Post(':id/archive')
  @Permissions('roles.archive')
  archive(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.archiveRole(id, user?.id, reason);
  }

  @Post(':id/users')
  @Permissions('roles.assign')
  assignUser(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @CurrentUser() actor: any,
  ) {
    return this.rolesService.assignUserRole(id, userId, actor?.id);
  }

  @Delete(':id/users/:userId')
  @Permissions('roles.assign')
  removeUser(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() actor: any,
  ) {
    return this.rolesService.removeUserRole(id, targetUserId, actor?.id);
  }

  @Delete(':id')
  @Permissions('roles.delete')
  remove(
    @Param('id') id: string,
    @Query('permanent') permanent: string,
    @CurrentUser() user: any,
  ) {
    const isPermanent = permanent === 'true' || permanent === '1';
    return this.rolesService.deleteRole(id, user?.id, isPermanent);
  }
}
