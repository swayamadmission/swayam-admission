import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApplicationStatus, PaymentStatus } from '@prisma/client';

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsInt()
  @Min(2000)
  admissionYear?: number;

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
  @IsString()
  remarks?: string;
}
