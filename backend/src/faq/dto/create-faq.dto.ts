import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class CreateFaqDto {
  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  customSlug?: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  updatedBy?: string;

  // Entity Relations
  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  examId?: string;

  @IsOptional()
  @IsString()
  scholarshipId?: string;

  @IsOptional()
  @IsString()
  studyMaterialId?: string;

  @IsOptional()
  @IsString()
  blogId?: string;

  // AI & GEO
  @IsOptional()
  @IsString()
  aiSummary?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  entities?: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  searchTerms?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  semanticKeywords?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  geoScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  aiReadinessScore?: number;

  // SEO
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @IsOptional()
  @IsString()
  metaRobots?: string;
}
