import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
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
