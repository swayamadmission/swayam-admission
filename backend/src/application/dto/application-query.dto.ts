import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApplicationStatus, PaymentStatus } from '@prisma/client';

export class ApplicationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  counselorId?: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  admissionYear?: number;

  @IsOptional()
  @IsString()
  search?: string; // Search by applicationId, student name, college, course

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
