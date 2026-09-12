import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';
import { NotificationType, NotificationPriority, Role } from '@prisma/client';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  shortMessage?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  receiverId?: string;

  @IsOptional()
  @IsEnum(Role)
  receiverRole?: Role;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType = NotificationType.SYSTEM;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority = NotificationPriority.MEDIUM;

  @IsOptional()
  @IsString()
  category?: string = 'SYSTEM';

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  relatedLeadId?: string;

  @IsOptional()
  @IsString()
  relatedStudentId?: string;

  @IsOptional()
  @IsString()
  relatedApplicationId?: string;

  @IsOptional()
  @IsString()
  relatedCollegeId?: string;

  @IsOptional()
  @IsString()
  relatedCourseId?: string;

  @IsOptional()
  @IsString()
  relatedDocumentId?: string;

  @IsOptional()
  @IsString()
  relatedPaymentId?: string;

  @IsOptional()
  @IsString()
  relatedCampaignId?: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  actionType?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}
