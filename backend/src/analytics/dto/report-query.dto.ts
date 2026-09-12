import { IsOptional, IsString } from 'class-validator';

export class ReportQueryDto {
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
    | 'custom' = 'year';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  counselorId?: string;
}
