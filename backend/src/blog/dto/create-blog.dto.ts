import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateBlogDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  featuredImage?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];

  @IsString()
  category: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsString()
  status?: string; // DRAFT, PUBLISHED, SCHEDULED, ARCHIVED

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  // Traditional SEO
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seoKeywords?: string[];

  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @IsOptional()
  @IsString()
  metaRobots?: string;

  @IsOptional()
  @IsObject()
  openGraph?: any;

  @IsOptional()
  @IsObject()
  twitterCard?: any;

  @IsOptional()
  @IsBoolean()
  isIndexed?: boolean;

  // AI SEO & GEO Content
  @IsOptional()
  @IsString()
  aiSummary?: string;

  @IsOptional()
  @IsString()
  tldr?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyTakeaways?: string[];

  @IsOptional()
  @IsArray()
  faqs?: any[];

  @IsOptional()
  @IsObject()
  entities?: any;

  // AI Content Scores
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  readabilityScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  seoScore?: number;

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

  // Knowledge Graph Entity Relations
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
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  governmentScheme?: string;

  @IsOptional()
  @IsString()
  career?: string;

  @IsOptional()
  @IsInt()
  readingTime?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedBlogs?: string[];

  // Career & Admission Guide ERP fields
  @IsOptional()
  @IsString()
  guideType?: string; // CAREER or ADMISSION

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsString()
  stream?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  careerPath?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  eligibility?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entranceExams?: string[];

  @IsOptional()
  @IsString()
  salaryRange?: string;

  @IsOptional()
  @IsString()
  averageSalary?: string;

  @IsOptional()
  @IsString()
  growthRate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  higherStudyOptions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobRoles?: string[];

  @IsOptional()
  @IsString()
  govPrivatePaths?: string;

  @IsOptional()
  @IsString()
  admissionProcess?: string;

  @IsOptional()
  @IsString()
  applicationProcess?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredDocuments?: string[];

  @IsOptional()
  admissionStages?: any;

  @IsOptional()
  @IsString()
  feesInfo?: string;

  @IsOptional()
  @IsString()
  counsellingInfo?: string;

  @IsOptional()
  @IsString()
  scholarshipInfo?: string;

  @IsOptional()
  @IsString()
  stateSchemesInfo?: string;

  @IsOptional()
  importantTimelines?: any;

  @IsOptional()
  @IsString()
  prepGuidance?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedCourseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedCollegeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedExamIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedScholarshipIds?: string[];

  @IsOptional()
  @IsString()
  stateId?: string;

  @IsOptional()
  @IsString()
  districtId?: string;
}
