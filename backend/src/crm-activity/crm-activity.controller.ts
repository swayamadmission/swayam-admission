import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CrmActivityService } from './crm-activity.service';
import { CreateCrmActivityDto } from './dto/create-crm-activity.dto';
import { LogCallDto } from './dto/log-call.dto';
import { LogMeetingDto } from './dto/log-meeting.dto';
import { CrmActivityQueryDto } from './dto/crm-activity-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('crm-activity')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CrmActivityController {
  constructor(private readonly activityService: CrmActivityService) {}

  @Post()
  logActivity(@Body() dto: CreateCrmActivityDto, @CurrentUser() user: IUser) {
    return this.activityService.logActivity(dto, user);
  }

  @Post('call')
  logCall(@Body() dto: LogCallDto, @CurrentUser() user: IUser) {
    return this.activityService.logCall(dto, user);
  }

  @Post('meeting')
  logMeeting(@Body() dto: LogMeetingDto, @CurrentUser() user: IUser) {
    return this.activityService.logMeeting(dto, user);
  }

  @Get('timeline/:contextType/:contextId')
  getTimeline(
    @Param('contextType') contextType: 'LEAD' | 'STUDENT' | 'APPLICATION',
    @Param('contextId') contextId: string,
    @Query() query: CrmActivityQueryDto,
    @CurrentUser() user: IUser,
  ) {
    return this.activityService.getTimeline(contextType, contextId, query, user);
  }

  @Patch(':id/void')
  voidActivity(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: IUser,
  ) {
    return this.activityService.voidActivity(id, user, reason || 'Voided by user');
  }
}
