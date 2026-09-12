import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { LeadService } from './lead.service';
import { LeadRoutingService } from './lead-routing.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { AssignCounselorDto } from './dto/assign-counselor.dto';
import { BulkReassignLeadsDto } from './dto/bulk-reassign-leads.dto';
import { LeadNoteDto } from './dto/lead-note.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { ManualRouteDto } from './dto/manual-route.dto';
import { ReassignLeadDto } from './dto/reassign-lead.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('leads')
export class LeadController {
  constructor(
    private readonly leadService: LeadService,
    private readonly leadRoutingService: LeadRoutingService,
  ) {}

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leadService.createLead(dto);
  }

  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.view')
  getStats(@CurrentUser() user: IUser) {
    return this.leadService.getDashboardStats(user.id);
  }

  @Get('senior-counselor/my-queue')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.view')
  getSeniorCounselorQueue(@Query() query: LeadQueryDto, @CurrentUser() user: IUser) {
    return this.leadService.getSeniorCounselorQueue(query, user.id);
  }

  @Get('senior-counselor/stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.view')
  getSeniorCounselorStats(@CurrentUser() user: IUser) {
    return this.leadService.getSeniorCounselorStats(user.id);
  }

  @Get('senior-counselor/team-summary')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.view')
  getSeniorCounselorTeamSummary(@CurrentUser() user: IUser) {
    return this.leadService.getSeniorCounselorTeamSummary(user.id);
  }

  @Get('senior-counselor/unavailability-queue')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.view')
  getCounselorUnavailabilityQueue(@Query() query: LeadQueryDto, @CurrentUser() user: IUser) {
    return this.leadService.getCounselorUnavailabilityQueue(query, user.id);
  }

  @Get('counselor/my-students')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.view')
  getCounselorQueue(@Query() query: LeadQueryDto, @CurrentUser() user: IUser) {
    return this.leadService.getCounselorStudentsQueue(query, user.id);
  }

  @Get('counselor/stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.view')
  getCounselorStats(@CurrentUser() user: IUser) {
    return this.leadService.getCounselorStats(user.id);
  }

  @Get('routing-exceptions')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.assign')
  getRoutingExceptions(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.leadRoutingService.getRoutingExceptions(query);
  }

  @Get(':id/eligible-counselors')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.assign')
  getEligibleCounselors(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.leadService.getAssignableCounselors(id, user.id);
  }

  @Get(':id/eligible-senior-counselors')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.assign')
  getEligibleSeniorCounselors(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.leadRoutingService.getEligibleSeniorCounselors(id, user.id);
  }

  @Get('eligible-senior-counselors')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.assign')
  getAllEligibleSeniorCounselors(@CurrentUser() user: IUser) {
    return this.leadRoutingService.getEligibleSeniorCounselors(null, user.id);
  }

  @Get(':id/assignable-counselors')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.assign')
  getAssignableCounselors(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.leadService.getAssignableCounselors(id, user.id);
  }

  @Post(':id/assign-counselor')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.assign')
  assignCounselorToLead(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: AssignCounselorDto,
  ) {
    return this.leadService.assignCounselorToLead(id, dto, user.id);
  }

  @Post(':id/reassign-counselor')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.assign')
  reassignCounselorForLead(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: ReassignLeadDto,
  ) {
    return this.leadService.reassignLead(id, dto, user.id);
  }

  @Post('bulk-reassign')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.assign')
  bulkReassignLeads(
    @CurrentUser() user: IUser,
    @Body() dto: BulkReassignLeadsDto,
  ) {
    return this.leadService.bulkReassignLeads(dto, user.id);
  }

  @Post(':id/manual-route')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.assign')
  manualRoute(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: ManualRouteDto,
  ) {
    return this.leadRoutingService.manualOverrideRouting(
      id,
      dto.seniorCounselorId,
      dto.reason,
      user.id,
    );
  }

  @Post(':id/reassign')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.assign')
  reassignLead(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: ReassignLeadDto,
  ) {
    return this.leadService.reassignLead(id, dto, user.id);
  }

  @Get(':id/assignment-history')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.view')
  getAssignmentHistory(@Param('id') id: string) {
    return this.leadService.getLeadAssignmentHistory(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.view')
  findAll(@Query() query: LeadQueryDto, @CurrentUser() user: IUser) {
    return this.leadService.findAll(query, user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.view')
  findOne(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.leadService.findOne(id, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.edit')
  updateLead(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadService.updateLead(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.delete')
  deleteLead(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.leadService.deleteLead(id, user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.edit')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leadService.updateStatus(id, user.id, dto);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.assign')
  assignCounselor(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: AssignLeadDto,
  ) {
    return this.leadService.assignCounselorToLead(id, { counselorId: dto.counselorId }, user.id);
  }

  @Post(':id/notes')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('lead.edit')
  addNote(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: LeadNoteDto,
  ) {
    return this.leadService.addNote(id, user.id, dto.content);
  }
}
