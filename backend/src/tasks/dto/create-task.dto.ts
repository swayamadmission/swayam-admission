import { IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { TaskType } from '@prisma/client';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  assignedTo: string;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  priority?: string; // LOW, MEDIUM, HIGH, URGENT

  @IsOptional()
  @IsString()
  relatedTo?: string;

  @IsOptional()
  @IsString()
  contextType?: string; // LEAD, STUDENT, APPLICATION, PAYMENT, REPORTING, ENROLLMENT, GENERAL

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  reportingId?: string;

  @IsOptional()
  @IsString()
  enrollmentId?: string;
}
