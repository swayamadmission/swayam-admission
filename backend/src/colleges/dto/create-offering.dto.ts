import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OfferingStatus } from '@prisma/client';

export class FeeComponentDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  isOptional?: boolean;
}

export class CreateOfferingDto {
  @IsString()
  collegeId: string;

  @IsString()
  courseId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  academicSession: string; // e.g. "2026-27"

  @IsOptional()
  @IsEnum(OfferingStatus)
  status?: OfferingStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  totalSeats?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reservedSeats?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tuitionFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  admissionFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  examFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hostelFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transportFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCharges?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalFee?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeComponentDto)
  feeComponents?: FeeComponentDto[];

  @IsOptional()
  @IsString()
  eligibilityCriteria?: string;

  @IsOptional()
  @IsString()
  minQualification?: string;

  @IsOptional()
  @IsNumber()
  minPercentage?: number;

  @IsOptional()
  scholarshipRules?: any;
}
