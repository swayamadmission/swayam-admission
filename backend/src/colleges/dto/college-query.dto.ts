import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CollegeType, CollegeOwnership, CollegeStatus } from '@prisma/client';

export class CollegeQueryDto extends PaginationQueryDto {
  // Search
  @IsOptional()
  @IsString()
  q?: string; // Full-text search query

  // Filters
  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(CollegeType)
  type?: CollegeType;

  @IsOptional()
  @IsEnum(CollegeOwnership)
  ownership?: CollegeOwnership;

  @IsOptional()
  @IsEnum(CollegeStatus)
  status?: CollegeStatus;

  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  @IsString()
  course?: string; // Filter by course name substring

  @IsOptional()
  @IsString()
  category?: string; // Filter by course category

  @IsOptional()
  @IsString()
  degree?: string; // Filter by course level

  // Boolean filters
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hostelAvailable?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  scholarshipAvailable?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  verified?: boolean;

  // Range filters
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minFees?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxFees?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPlacement?: number;

  // Sorting convenience
  @IsOptional()
  @IsString()
  sort?: string; // "name", "ranking", "nirfRanking", "placementPercentage", "createdAt"
}
