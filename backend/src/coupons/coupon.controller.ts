import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CouponService } from './coupon.service';
import {
  CreateCouponDto,
  ValidateCouponDto,
  RedeemCouponDto,
} from './dto/create-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  // ─── PUBLIC / USER VALIDATION ─────────────────────────────────────────────

  @Post('validate')
  validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.couponService.validateCoupon(dto);
  }

  @Get('available')
  getAvailableCoupons(
    @Query('scope') scope?: string,
    @Query('amount') amount?: string,
    @Query('collegeId') collegeId?: string,
    @Query('courseId') courseId?: string,
  ) {
    const numAmount = amount ? Number(amount) : undefined;
    return this.couponService.getAvailableCoupons(scope, numAmount, undefined, collegeId, courseId);
  }

  @Post('redeem')
  @UseGuards(JwtAuthGuard)
  redeemCoupon(@Body() dto: RedeemCouponDto, @CurrentUser() user: IUser) {
    return this.couponService.redeemCoupon(dto, user.id);
  }

  // ─── ADMIN GOVERNANCE ─────────────────────────────────────────────────────

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  getAllCoupons() {
    return this.couponService.getAllCoupons();
  }

  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  getCouponAnalytics() {
    return this.couponService.getCouponAnalytics();
  }

  @Get('admin/redemptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  getCouponRedemptions(@Query('couponId') couponId?: string) {
    return this.couponService.getCouponRedemptions(couponId);
  }

  @Post('admin/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  createCoupon(@Body() dto: CreateCouponDto, @CurrentUser() user: IUser) {
    return this.couponService.createCoupon(dto, user.id);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  updateCoupon(
    @Param('id') couponId: string,
    @Body() dto: Partial<CreateCouponDto>,
    @CurrentUser() user: IUser,
  ) {
    return this.couponService.updateCoupon(couponId, dto, user.id);
  }

  @Patch('admin/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  toggleStatus(@Param('id') couponId: string, @CurrentUser() user: IUser) {
    return this.couponService.toggleCouponStatus(couponId, user.id);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  deleteCoupon(@Param('id') couponId: string, @CurrentUser() user: IUser) {
    return this.couponService.deleteCoupon(couponId, user.id);
  }
}
