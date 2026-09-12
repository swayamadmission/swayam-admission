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
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: any) {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: any) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Patch('avatar')
  updateAvatar(@Body('avatar') avatar: string, @CurrentUser() user: any) {
    return this.profileService.updateAvatar(user.id, avatar);
  }

  @Post('delete-avatar')
  deleteAvatar(@CurrentUser() user: any) {
    return this.profileService.updateAvatar(user.id, null);
  }

  @Patch('cover')
  updateCover(
    @Body('coverImage') coverImage: string,
    @CurrentUser() user: any,
  ) {
    return this.profileService.updateCover(user.id, coverImage);
  }

  @Patch('signature')
  updateSignature(
    @Body('signature') signature: string,
    @CurrentUser() user: any,
  ) {
    return this.profileService.updateSignature(user.id, signature);
  }

  @Patch('password')
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: any) {
    return this.profileService.changePassword(user.id, dto);
  }

  @Patch('email')
  updateEmail(@Body('email') email: string, @CurrentUser() user: any) {
    return this.profileService.updateProfile(user.id, { email });
  }

  @Patch('mobile')
  updateMobile(@Body('mobile') mobile: string, @CurrentUser() user: any) {
    return this.profileService.updateProfile(user.id, { mobile });
  }

  @Patch('preferences')
  updatePreferences(
    @Body('preferences') preferences: any,
    @CurrentUser() user: any,
  ) {
    return this.profileService.updateProfile(user.id, { preferences });
  }

  @Patch('2fa')
  toggleTwoFactor(@Body('enable') enable: boolean, @CurrentUser() user: any) {
    return this.profileService.toggleTwoFactor(user.id, enable);
  }

  @Get('login-history')
  getLoginHistory(@CurrentUser() user: any) {
    return this.profileService.getLoginHistory(user.id);
  }

  @Get('devices')
  getDevices(@CurrentUser() user: any) {
    return this.profileService.getDeviceSessions(user.id);
  }

  @Delete('device/:id')
  deleteDevice(@Param('id') id: string, @CurrentUser() user: any) {
    return this.profileService.deleteDeviceSession(user.id, id);
  }

  @Post('logout-all')
  logoutAll(@CurrentUser() user: any) {
    return this.profileService.logoutAllDevices(user.id);
  }

  @Get('activity')
  getActivity(@CurrentUser() user: any) {
    return this.profileService.getActivityTimeline(user.id);
  }

  @Get('export')
  exportProfile(
    @Query('format') format: string = 'json',
    @CurrentUser() user: any,
  ) {
    return this.profileService.exportProfile(user.id, format);
  }
}
