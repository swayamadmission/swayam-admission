import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  Min,
  IsEmail,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CollegeOwnership, CollegeType, CollegeStatus } from '@prisma/client';

export class CreateCollegeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  fullDescription?: string;

  // Media
  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  banner?: string;

  // Identity
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1800)
  @Max(2100)
  establishedYear?: number;

  @IsOptional()
  @IsEnum(CollegeOwnership)
  ownership?: CollegeOwnership;

  @IsOptional()
  @IsEnum(CollegeType)
  type?: CollegeType;

  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  @IsString()
  accreditation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approvals?: string[];

  // Rankings
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ranking?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nirfRanking?: number;

  @IsOptional()
  @IsString()
  naacGrade?: string;

  // Location
  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  stateId?: string;

  @IsOptional()
  @IsString()
  districtId?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  // Contact
  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  // Placements
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  placementPercentage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  highestPackage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  averagePackage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  medianPackage?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  placementCompanies?: string[];

  @IsOptional()
  @IsString()
  placementInfo?: string;

  @IsOptional()
  @IsString()
  placementYear?: string;

  // Facilities & Hostel
  @IsOptional()
  @IsBoolean()
  hostelAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  boysHostelAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  girlsHostelAvailable?: boolean;

  @IsOptional()
  @IsString()
  hostelFee?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hostelFacilities?: string[];

  @IsOptional()
  @IsString()
  messInfo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  otherFacilities?: string[];

  @IsOptional()
  @IsBoolean()
  transportAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  scholarshipAvailable?: boolean;

  // Overview additions
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  // Admin
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  applicationFee?: number;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsEnum(CollegeStatus)
  status?: CollegeStatus;

  // SEO
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

  // Gallery (create inline)
  @IsOptional()
  @IsArray()
  gallery?: {
    imageUrl: string;
    caption?: string;
    sortOrder?: number;
    isCover?: boolean;
  }[];

  // FAQs (create inline)
  @IsOptional()
  @IsArray()
  faqs?: { question: string; answer: string; sortOrder?: number }[];

  // Courses (create inline/nested)
  @IsOptional()
  @IsArray()
  courses?: any[];
}
