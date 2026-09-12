import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScholarshipDto {
  @IsNotEmpty()
  @IsString()
  scholarshipName: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  scholarshipType?: string; // Merit, Need Based, Minority, Government, Special

  @IsOptional()
  @IsString()
  category?: string; // Central, State, Private, Corporate, NGO

  @IsOptional()
  @IsString()
  gender?: string; // ALL, MALE, FEMALE, OTHER

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  incomeLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  requiredMarks?: number;

  @IsOptional()
  @IsString()
  eligibility?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  percentage?: number;

  @IsOptional()
  @IsString()
  applicationMode?: string; // ONLINE, OFFLINE, HYBRID

  @IsOptional()
  @IsString()
  applicationStart?: string;

  @IsOptional()
  @IsString()
  applicationEnd?: string;

  @IsOptional()
  @IsBoolean()
  renewalRequired?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredDocuments?: string[];

  @IsOptional()
  @IsString()
  officialWebsite?: string;

  @IsOptional()
  faqs?: any;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsString()
  status?: string; // PUBLISHED, DRAFT, ARCHIVED
}
