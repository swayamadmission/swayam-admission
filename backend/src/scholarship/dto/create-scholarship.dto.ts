import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateScholarshipDto {
  @IsString()
  scholarshipName: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  scholarshipType?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsNumber()
  incomeLimit?: number;

  @IsOptional()
  @IsString()
  eligibility?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsDateString()
  applicationStart?: string;

  @IsOptional()
  @IsDateString()
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
  status?: string;
}
