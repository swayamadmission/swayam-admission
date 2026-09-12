import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService, EventNotificationPayload } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('stats')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  getStats() {
    return this.notificationsService.getStats();
  }

  @Get('unread')
  getUnreadCount(@CurrentUser() user: IUser) {
    return this.notificationsService.getUnreadCount(user.id, user.role);
  }

  @Get('my')
  getMyNotifications(@CurrentUser() user: IUser) {
    return this.notificationsService.getMyNotifications(user.id, user.role);
  }

  @Get('my/unread-count')
  getMyUnreadCount(@CurrentUser() user: IUser) {
    return this.notificationsService.getUnreadCount(user.id, user.role);
  }

  @Get('preferences')
  getUserPreferences(@CurrentUser() user: IUser) {
    return this.notificationsService.getUserPreferences(user.id);
  }

  @Patch('preferences')
  updateUserPreferences(
    @CurrentUser() user: IUser,
    @Body()
    dto: {
      inAppEnabled?: boolean;
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      whatsappEnabled?: boolean;
      promotionalOptOut?: boolean;
    },
  ) {
    return this.notificationsService.updateUserPreferences(user.id, dto);
  }

  @Post('events/emit')
  @Roles('ADMIN', 'SUPER_ADMIN')
  emitEvent(
    @Body() body: { eventCode: string; payload: EventNotificationPayload },
  ) {
    return this.notificationsService.emitEventNotification(body.eventCode, body.payload);
  }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  findAll(@Query() query: NotificationQueryDto) {
    return this.notificationsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Post('send')
  @Roles('ADMIN', 'SUPER_ADMIN')
  sendNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.createNotification(dto);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.createNotification(dto);
  }

  @Patch('mark-all-read')
  markAllReadAlias(@CurrentUser() user: IUser) {
    return this.notificationsService.markAllAsRead(user.id, user.role);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: IUser) {
    return this.notificationsService.markAllAsRead(user.id, user.role);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch(':id/archive')
  archiveNotification(@Param('id') id: string) {
    return this.notificationsService.archiveNotification(id);
  }

  @Post('bulk-read')
  bulkRead(@Body() dto: BulkActionDto) {
    return this.notificationsService.bulkRead(dto);
  }

  @Post('bulk-delete')
  @Roles('ADMIN', 'SUPER_ADMIN')
  bulkDelete(@Body() dto: BulkActionDto) {
    return this.notificationsService.bulkDelete(dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.notificationsService.deleteNotification(id);
  }
}
