import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PositionsService } from './positions.service';
import {
  CreatePositionDto,
  UpdatePositionDto,
  AssignEmployeeDto,
  TransferPositionDto,
  GenerateEmailDto,
} from './dto/position.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('positions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  @RequirePermissions('position.view')
  async getPositions(
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('unitId') unitId?: string,
    @Query('roleId') roleId?: string,
    @Query('stateId') stateId?: string,
    @Query('districtId') districtId?: string,
    @Query('positionStatus') positionStatus?: string,
    @Query('emailStatus') emailStatus?: string,
    @Query('vacantOnly') vacantOnly?: string,
  ) {
    return this.positionsService.findAll({
      search,
      departmentId,
      unitId,
      roleId,
      stateId,
      districtId,
      positionStatus,
      emailStatus,
      vacantOnly: vacantOnly === 'true',
    });
  }

  @Get(':id')
  @RequirePermissions('position.view')
  async getPositionById(@Param('id') id: string) {
    return this.positionsService.findOne(id);
  }

  @Post()
  @RequirePermissions('position.create')
  async createPosition(@Body() dto: CreatePositionDto, @Request() req: any) {
    return this.positionsService.create(dto, req.user?.id);
  }

  @Put(':id')
  @RequirePermissions('position.edit')
  async updatePosition(
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
    @Request() req: any,
  ) {
    return this.positionsService.update(id, dto, req.user?.id);
  }

  @Post(':id/assign')
  @RequirePermissions('position.assign')
  async assignEmployee(
    @Param('id') id: string,
    @Body() dto: AssignEmployeeDto,
    @Request() req: any,
  ) {
    return this.positionsService.assignEmployee(id, dto, req.user?.id);
  }

  @Post(':id/transfer')
  @RequirePermissions('position.assign')
  async transferEmployee(
    @Param('id') id: string,
    @Body() dto: TransferPositionDto,
    @Request() req: any,
  ) {
    return this.positionsService.transferEmployee(id, dto, req.user?.id);
  }

  @Post(':id/retire')
  @RequirePermissions('position.retire')
  async retirePosition(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.positionsService.retirePosition(id, reason, req.user?.id);
  }

  @Post('preview-email')
  @RequirePermissions('position.create')
  async previewEmail(@Body() dto: GenerateEmailDto) {
    return this.positionsService.generateEmailPreview(dto);
  }
}
