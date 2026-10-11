import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SaveCollegeDto } from './dto/save-college.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: IUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me/profile')
  updateProfile(@CurrentUser() user: IUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/shortlist')
  getShortlist(@CurrentUser() user: IUser) {
    return this.usersService.getShortlist(user.id);
  }

  @Get('me/shortlist/ids')
  getShortlistIds(@CurrentUser() user: IUser) {
    return this.usersService.getShortlistIds(user.id);
  }

  @Post('me/shortlist')
  addToShortlist(@CurrentUser() user: IUser, @Body() body: SaveCollegeDto) {
    const targetId = body.collegeId || body.itemId || '';
    return this.usersService.addToShortlist(user.id, targetId);
  }

  @Delete('me/shortlist/:id')
  removeFromShortlist(@CurrentUser() user: IUser, @Param('id') id: string) {
    return this.usersService.removeFromShortlist(user.id, id);
  }

  @Post('me/shortlist/toggle')
  toggleShortlist(@CurrentUser() user: IUser, @Body() body: SaveCollegeDto) {
    const targetId = body.collegeId || body.itemId || '';
    return this.usersService.toggleShortlist(user.id, targetId);
  }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  getAllStudents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('q') q?: string,
    @Query('isApproved') isApproved?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.usersService.getAllUsers({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      role,
      q,
      isApproved,
      sortBy,
      sortOrder,
    });
  }

  @Patch(':id/toggle-approval')
  @Roles('ADMIN', 'SUPER_ADMIN')
  toggleApproval(@Param('id') id: string) {
    return this.usersService.toggleApproval(id);
  }
}
