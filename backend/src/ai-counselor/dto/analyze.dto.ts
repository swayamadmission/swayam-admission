import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Stream } from '@prisma/client';

export class AnalyzeDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsEnum(Stream)
  stream?: Stream;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tenthMarks?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  twelfthMarks?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredStates?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCities?: string[];

  @IsOptional()
  @IsString()
  collegeType?: string; // GOVERNMENT, PRIVATE, ANY

  @IsOptional()
  @IsString()
  careerGoal?: string;
}
