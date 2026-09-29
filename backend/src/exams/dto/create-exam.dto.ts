import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExamDto {
  @IsNotEmpty()
  @IsString()
  examName: string;

  @IsNotEmpty()
  @IsString()
  category: string; // e.g. ENGINEERING, MEDICAL, MANAGEMENT, LAW, ARTS, SCIENCE, COMMERCE, PHARMACY, OTHER

  @IsNotEmpty()
  @IsString()
  level: string; // NATIONAL, STATE, PRIVATE, UG, PG

  @IsOptional()
  @IsString()
  stateId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  conductedBy?: string;

  @IsOptional()
  @IsString()
  eligibility?: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsString()
  ageLimit?: string;

  @IsOptional()
  @IsString()
  examMode?: string; // ONLINE, OFFLINE, HYBRID

  @IsOptional()
  @IsString()
  applicationStart?: string;

  @IsOptional()
  @IsString()
  applicationEnd?: string;

  @IsOptional()
  @IsString()
  examDate?: string;

  @IsOptional()
  @IsString()
  resultDate?: string;

  @IsOptional()
  @IsString()
  counsellingDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  syllabus?: string[];

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalMarks?: number;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  applicationFee?: number;

  @IsOptional()
  @IsString()
  officialWebsite?: string;

  @IsOptional()
  @IsString()
  preparationTips?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  importantBooks?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  previousYearPapers?: string[];

  @IsOptional()
  faqs?: any;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsString()
  status?: string; // PUBLISHED, DRAFT, ARCHIVED

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courseIds?: string[];
}
