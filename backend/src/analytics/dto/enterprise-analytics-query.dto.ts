import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class EnterpriseAnalyticsQueryDto {
  @IsOptional()
  @IsString()
  period?:
    | 'today'
    | 'yesterday'
    | '7days'
    | '30days'
    | 'thisMonth'
    | 'lastMonth'
    | 'quarter'
    | 'year'
    | 'custom' = '30days';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  academicSession?: string; // 2025-26, 2026-27, 2027-28

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  stateId?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  districtId?: string;

  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  counselorId?: string;

  @IsOptional()
  @IsString()
  seniorCounselorId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  metricKey?: string; // For record drilldown (e.g. 'PENDING_APPLICATIONS', 'OVERDUE_TASKS', 'CONFIRMED_ADMISSIONS', etc.)

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;
}
