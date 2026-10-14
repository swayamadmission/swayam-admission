import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto, UpdateEmployeeStatusDto } from './dto/employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'HR_MANAGER', 'REGISTRAR')
  listEmployees(@Query() query: any) {
    return this.employeesService.listEmployees(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'HR_MANAGER', 'REGISTRAR')
  getEmployee360(@Param('id') id: string) {
    return this.employeesService.getEmployee360(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN', 'HR_MANAGER')
  createEmployee(@Body() dto: CreateEmployeeDto, @Req() req: any) {
    return this.employeesService.createEmployee(dto, req.user?.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'HR_MANAGER')
  updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: any,
  ) {
    return this.employeesService.updateEmployee(id, dto, req.user?.id);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'HR_MANAGER')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeStatusDto,
    @Req() req: any,
  ) {
    return this.employeesService.updateStatus(id, dto, req.user?.id);
  }

  @Post(':id/reset-password')
  @Roles('ADMIN', 'SUPER_ADMIN')
  resetPassword(@Param('id') id: string, @Req() req: any) {
    return this.employeesService.resetPassword(id, req.user?.id);
  }

  @Post(':id/revoke-sessions')
  @Roles('ADMIN', 'SUPER_ADMIN')
  revokeSessions(@Param('id') id: string, @Req() req: any) {
    return this.employeesService.revokeSessions(id, req.user?.id);
  }

  @Get(':id/activity')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'HR_MANAGER')
  getActivityTimeline(@Param('id') id: string) {
    return this.employeesService.getActivityTimeline(id);
  }
}
