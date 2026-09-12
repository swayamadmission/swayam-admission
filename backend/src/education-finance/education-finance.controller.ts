import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EducationFinanceService, EducationFinanceScheme } from './education-finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Education Finance Schemes')
@Controller('education-finance')
export class EducationFinanceController {
  constructor(private readonly financeService: EducationFinanceService) {}

  @Get('schemes')
  @ApiOperation({ summary: 'Get active education finance schemes matching student state and course' })
  async getSchemes(
    @Query('state') state?: string,
    @Query('courseLevel') courseLevel?: string,
  ): Promise<EducationFinanceScheme[]> {
    return this.financeService.getSchemes({ state, courseLevel, activeOnly: true });
  }

  @Get('admin/schemes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: Get all education finance schemes including inactive' })
  async getAllSchemes(
    @Query('state') state?: string,
  ): Promise<EducationFinanceScheme[]> {
    return this.financeService.getSchemes({ state, activeOnly: false });
  }

  @Get('schemes/:id')
  @ApiOperation({ summary: 'Get education finance scheme details by ID' })
  async getSchemeById(@Param('id') id: string): Promise<EducationFinanceScheme> {
    return this.financeService.getSchemeById(id);
  }

  @Post('admin/schemes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: Create new education finance scheme' })
  async createScheme(
    @Body() dto: Partial<EducationFinanceScheme>,
    @Req() req: any,
  ): Promise<EducationFinanceScheme> {
    return this.financeService.createScheme(dto, req.user?.id);
  }

  @Patch('admin/schemes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: Update education finance scheme' })
  async updateScheme(
    @Param('id') id: string,
    @Body() dto: Partial<EducationFinanceScheme>,
    @Req() req: any,
  ): Promise<EducationFinanceScheme> {
    return this.financeService.updateScheme(id, dto, req.user?.id);
  }

  @Delete('admin/schemes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: Toggle active status of education finance scheme' })
  async toggleActive(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<EducationFinanceScheme> {
    return this.financeService.toggleActive(id, req.user?.id);
  }
}
