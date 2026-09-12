import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CourseCategory,
  CourseLevel,
  CourseDurationType,
  CourseMode,
  CollegeStatus,
} from '@prisma/client';

export class CreateCourseDto {
  // ── Basic ──────────────────────────────────────────────
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  collegeId: string;

  @IsOptional()
  @IsEnum(CourseCategory)
  category?: CourseCategory;

  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsEnum(CourseDurationType)
  durationType?: CourseDurationType;

  @IsOptional()
  @IsEnum(CourseMode)
  mode?: CourseMode;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsEnum(CollegeStatus)
  status?: CollegeStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibleLevels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibleStreams?: string[];

  // ── Academic ───────────────────────────────────────────
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  eligibility?: string;

  @IsOptional()
  @IsString()
  entranceExam?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  seats?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  syllabus?: string[];

  @IsOptional()
  @IsBoolean()
  allowOtherBranch?: boolean;

  // ── Fee ───────────────────────────────────────────────
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

  // ── Career ────────────────────────────────────────────
  @IsOptional()
  @IsString()
  careerScope?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  averageSalary?: number;
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsOptional()
  @IsEnum(CourseCategory)
  category?: CourseCategory;

  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsEnum(CourseDurationType)
  durationType?: CourseDurationType;

  @IsOptional()
  @IsEnum(CourseMode)
  mode?: CourseMode;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsEnum(CollegeStatus)
  status?: CollegeStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibleLevels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibleStreams?: string[];

  @IsOptional()
  @IsBoolean()
  allowOtherBranch?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  eligibility?: string;

  @IsOptional()
  @IsString()
  entranceExam?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  seats?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  syllabus?: string[];

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
  @IsString()
  careerScope?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  averageSalary?: number;
}

export class CourseQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  featured?: string;

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsString()
  stream?: string;

  @IsOptional()
  @IsString()
  entryType?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: string;
}

// ── Branch / Specialization DTOs ──────────────────────────────────────────

export class CreateBranchDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  type?: string; // BRANCH | SPECIALIZATION | MAJOR | CONCENTRATION

  @IsOptional()
  @IsString()
  eligibility?: string;

  @IsOptional()
  @IsString()
  status?: string; // ACTIVE | DISABLED | ARCHIVED

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  eligibility?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}

export class BranchQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
