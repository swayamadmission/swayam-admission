import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CourseLevel, CollegeStatus, CourseCategory } from '@prisma/client';

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  duration: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  seats?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fees?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalFees?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  semesterFees?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  applicationFee?: number;

  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @IsOptional()
  @IsEnum(CourseCategory)
  category?: CourseCategory;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  eligibility?: string;

  @IsOptional()
  @IsString()
  scholarshipInfo?: string;

  @IsOptional()
  @IsEnum(CollegeStatus)
  status?: CollegeStatus;
}
