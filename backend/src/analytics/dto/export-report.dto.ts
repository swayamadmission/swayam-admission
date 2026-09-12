import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class ExportReportDto {
  @IsString()
  @IsNotEmpty()
  reportType: string; // LEADS, APPLICATIONS, ADMISSIONS, PAYMENTS, ENROLLMENTS, COUNSELOR_PERFORMANCE, COLLEGE_PERFORMANCE

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsString()
  format?: 'CSV' | 'JSON' = 'CSV';
}
