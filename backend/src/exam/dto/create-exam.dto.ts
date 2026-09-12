import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class CreateExamDto {
  @IsString()
  examName: string;

  @IsString()
  slug: string;

  @IsString()
  category: string;

  @IsString()
  level: string;

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
  examMode?: string;

  @IsOptional()
  @IsDateString()
  applicationStart?: string;

  @IsOptional()
  @IsDateString()
  applicationEnd?: string;

  @IsOptional()
  @IsDateString()
  examDate?: string;

  @IsOptional()
  @IsDateString()
  resultDate?: string;

  @IsOptional()
  @IsDateString()
  counsellingDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  syllabus?: string[];

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsInt()
  totalMarks?: number;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsNumber()
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
  faqs?: any; // Assuming JSON array

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
  status?: string;
}
