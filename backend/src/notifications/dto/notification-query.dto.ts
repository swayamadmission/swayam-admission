import { IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationType, NotificationPriority, Role } from '@prisma/client';

export class NotificationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(Role)
  receiverRole?: Role;

  @IsOptional()
  @IsString()
  isRead?: string; // 'true' | 'false'

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
