import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FeeCatalogService } from './fee-catalog.service';
import {
  CreateFeeTypeDto,
  UpdateFeeTypeDto,
  CalculateFeeDto,
} from './dto/fee-catalog.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('fees')
export class FeeCatalogController {
  constructor(private readonly feeCatalogService: FeeCatalogService) {}

  // ─── PUBLIC / STUDENT FEE CATALOG & CALCULATION ───────────────────────────

  @Get('catalog')
  getAllFees(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('collegeId') collegeId?: string,
    @Query('courseId') courseId?: string,
  ) {
    const activeFilter = isActive !== undefined ? isActive === 'true' : true;
    return this.feeCatalogService.getAllFeeTypes({
      category,
      isActive: activeFilter,
      collegeId,
      courseId,
    });
  }

  @Get('catalog/:code')
  getFeeByCode(@Param('code') code: string) {
    return this.feeCatalogService.getFeeTypeByCodeOrId(code);
  }

  @Post('calculate')
  calculateFee(
    @Body() dto: CalculateFeeDto,
    @Query('userId') queryUserId?: string,
  ) {
    return this.feeCatalogService.calculateFeeWithDiscounts(dto, queryUserId);
  }

  @Post('student/calculate')
  @UseGuards(JwtAuthGuard)
  calculateStudentFee(
    @Body() dto: CalculateFeeDto,
    @CurrentUser() user: IUser,
  ) {
    return this.feeCatalogService.calculateFeeWithDiscounts(dto, user.id);
  }

  @Get('categories')
  getCategories() {
    return this.feeCatalogService.getCategories();
  }

  // ─── ADMIN GOVERNANCE ENDPOINTS ──────────────────────────────────────────

  @Get('admin/catalog')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  getAdminFeeCatalog(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('collegeId') collegeId?: string,
    @Query('courseId') courseId?: string,
    @Query('branchId') branchId?: string,
    @Query('academicSession') academicSession?: string,
    @Query('q') q?: string,
  ) {
    const activeFilter = isActive !== undefined ? isActive === 'true' : undefined;
    return this.feeCatalogService.getAllFeeTypes({
      category,
      isActive: activeFilter,
      collegeId,
      courseId,
      branchId,
      academicSession,
      q,
    });
  }

  @Post('admin/catalog')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  createFeeType(
    @Body() dto: CreateFeeTypeDto,
    @CurrentUser() user: IUser,
  ) {
    return this.feeCatalogService.createFeeType(dto, user.id);
  }

  @Put('admin/catalog/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  updateFeeType(
    @Param('id') id: string,
    @Body() dto: UpdateFeeTypeDto,
    @CurrentUser() user: IUser,
  ) {
    return this.feeCatalogService.updateFeeType(id, dto, user.id);
  }

  @Patch('admin/catalog/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  toggleFeeTypeStatus(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.feeCatalogService.toggleFeeTypeStatus(id, user.id);
  }
}
