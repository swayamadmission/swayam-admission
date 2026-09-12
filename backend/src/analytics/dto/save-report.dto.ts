import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class SaveReportDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  reportType: string; // EXECUTIVE, FUNNEL, COUNSELOR, COLLEGE, GEOGRAPHY, FINANCE, SLA

  @IsObject()
  filters: Record<string, any>;

  @IsOptional()
  @IsString()
  scheduleFrequency?: string; // NONE, DAILY, WEEKLY, MONTHLY
}
