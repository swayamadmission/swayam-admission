import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TaskQueryDto {
  @IsOptional()
  @IsString()
  status?: string; // PENDING, IN_PROGRESS, COMPLETED, CANCELLED, OVERDUE, ALL

  @IsOptional()
  @IsString()
  priority?: string; // LOW, MEDIUM, HIGH, URGENT

  @IsOptional()
  @IsString()
  contextType?: string; // LEAD, STUDENT, APPLICATION, PAYMENT, REPORTING, ENROLLMENT, GENERAL

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  counselorId?: string;

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
  dateFilter?: string; // TODAY, TOMORROW, THIS_WEEK, OVERDUE, UPCOMING, CUSTOM

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
