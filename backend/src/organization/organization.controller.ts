import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { DepartmentsService } from './departments.service';
import { UnitsService } from './units.service';
import { GeographyService } from './geography.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentQueryDto,
  DepartmentStatusEnum,
} from './dto/department.dto';
import {
  CreateUnitDto,
  UpdateUnitDto,
  AssignMemberDto,
  AssignManagerDto,
  UnitQueryDto,
  UnitStatusEnum,
} from './dto/unit.dto';
import {
  CreateStateDto,
  CreateDistrictDto,
  CreateGeographicAssignmentDto,
  UpdateGeographicAssignmentDto,
  GeographicQueryDto,
} from './dto/geography.dto';

@Controller('organization')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OrganizationController {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly unitsService: UnitsService,
    private readonly geographyService: GeographyService,
  ) {}

  // ==========================================
  // DEPARTMENTS
  // ==========================================

  @Get('departments')
  @RequirePermissions('department.view')
  async getDepartments(@Query() query: DepartmentQueryDto) {
    return this.departmentsService.findAll(query);
  }

  @Get('departments/:id')
  @RequirePermissions('department.view')
  async getDepartmentById(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post('departments')
  @RequirePermissions('department.create')
  async createDepartment(
    @Body() dto: CreateDepartmentDto,
    @Request() req: any,
  ) {
    return this.departmentsService.create(dto, req.user?.id);
  }

  @Put('departments/:id')
  @RequirePermissions('department.edit')
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @Request() req: any,
  ) {
    return this.departmentsService.update(id, dto, req.user?.id);
  }

  @Patch('departments/:id/status')
  @RequirePermissions('department.disable')
  async updateDepartmentStatus(
    @Param('id') id: string,
    @Body('status') status: DepartmentStatusEnum,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.departmentsService.updateStatus(
      id,
      status,
      req.user?.id,
      reason,
    );
  }

  @Delete('departments/:id')
  @RequirePermissions('department.archive')
  async deleteDepartment(@Param('id') id: string, @Request() req: any) {
    return this.departmentsService.softDelete(id, req.user?.id);
  }

  // ==========================================
  // ORGANIZATIONAL UNITS & TEAMS
  // ==========================================

  @Get('units')
  @RequirePermissions('unit.view')
  async getUnits(@Query() query: UnitQueryDto) {
    return this.unitsService.findAll(query);
  }

  @Get('units/:id')
  @RequirePermissions('unit.view')
  async getUnitById(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Post('units')
  @RequirePermissions('unit.create')
  async createUnit(@Body() dto: CreateUnitDto, @Request() req: any) {
    return this.unitsService.create(dto, req.user?.id);
  }

  @Put('units/:id')
  @RequirePermissions('unit.edit')
  async updateUnit(
    @Param('id') id: string,
    @Body() dto: UpdateUnitDto,
    @Request() req: any,
  ) {
    return this.unitsService.update(id, dto, req.user?.id);
  }

  @Patch('units/:id/status')
  @RequirePermissions('unit.disable')
  async updateUnitStatus(
    @Param('id') id: string,
    @Body('status') status: UnitStatusEnum,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.unitsService.updateStatus(id, status, req.user?.id, reason);
  }

  @Post('units/:id/manager')
  @RequirePermissions('unit.manage_manager')
  async assignUnitManager(
    @Param('id') id: string,
    @Body() dto: AssignManagerDto,
    @Request() req: any,
  ) {
    return this.unitsService.assignManager(id, dto, req.user?.id);
  }

  @Post('units/:id/members')
  @RequirePermissions('unit.manage_members')
  async assignUnitMember(
    @Param('id') id: string,
    @Body() dto: AssignMemberDto,
    @Request() req: any,
  ) {
    return this.unitsService.assignMember(id, dto, req.user?.id);
  }

  @Delete('units/:id/members/:userId')
  @RequirePermissions('unit.manage_members')
  async removeUnitMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.unitsService.removeMember(id, userId, req.user?.id);
  }

  @Delete('units/:id')
  @RequirePermissions('unit.archive')
  async deleteUnit(@Param('id') id: string, @Request() req: any) {
    return this.unitsService.softDelete(id, req.user?.id);
  }

  // ==========================================
  // GEOGRAPHY & RESPONSIBILITY FOUNDATION
  // ==========================================

  @Get('geography/states')
  @RequirePermissions('geographic.view')
  async getStates() {
    return this.geographyService.getStates();
  }

  @Post('geography/states')
  @RequirePermissions('geographic.manage')
  async createState(@Body() dto: CreateStateDto, @Request() req: any) {
    return this.geographyService.createState(dto, req.user?.id);
  }

  @Get('geography/districts')
  @RequirePermissions('geographic.view')
  async getDistricts(@Query('stateId') stateId: string) {
    return this.geographyService.getDistricts(stateId);
  }

  @Post('geography/districts')
  @RequirePermissions('geographic.manage')
  async createDistrict(@Body() dto: CreateDistrictDto, @Request() req: any) {
    return this.geographyService.createDistrict(dto, req.user?.id);
  }

  @Get('geography/assignments')
  @RequirePermissions('geographic.view')
  async getAssignments(@Query() query: GeographicQueryDto) {
    return this.geographyService.getAssignments(query);
  }

  @Get('geography/assignments/history')
  @RequirePermissions('geographic.view')
  async getAssignmentHistory(
    @Query('stateId') stateId: string,
    @Query('districtId') districtId?: string,
  ) {
    return this.geographyService.getAssignmentHistory(stateId, districtId);
  }

  @Post('geography/assignments')
  @RequirePermissions('geographic.manage')
  async createAssignment(
    @Body() dto: CreateGeographicAssignmentDto,
    @Request() req: any,
  ) {
    return this.geographyService.createAssignment(dto, req.user?.id);
  }

  @Put('geography/assignments/:id')
  @RequirePermissions('geographic.manage')
  async updateAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateGeographicAssignmentDto,
    @Request() req: any,
  ) {
    return this.geographyService.updateAssignment(id, dto, req.user?.id);
  }

  @Post('geography/seed')
  @RequirePermissions('geographic.manage')
  async seedGeography(@Request() req: any) {
    return this.geographyService.seedDefaultGeography(req.user?.id);
  }
}
