import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LeadSource } from '@prisma/client';

export class CreateLeadDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  fullName: string;

  @IsNotEmpty({ message: 'Mobile number is required' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Please enter a valid 10-digit Indian mobile number',
  })
  mobile: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email?: string;

  // Academic Profiling & Targeting
  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1990, { message: 'Passing year must be 1990 or later' })
  @Max(2035, { message: 'Passing year cannot exceed 2035' })
  passingYear?: number;

  @IsOptional()
  @IsString()
  stream?: string;

  // Authoritative Geography
  @IsOptional()
  @IsString()
  stateId?: string;

  @IsOptional()
  @IsString()
  districtId?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;

  // Authoritative Course, Branch & College
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  preferredCourse?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  preferredBranch?: string;

  @IsOptional()
  @IsString()
  customBranchText?: string;

  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsOptional()
  @IsString()
  preferredCollege?: string;

  @IsOptional()
  @IsString()
  preferredCollegeText?: string;

  // Preferences & Messaging
  @IsOptional()
  @IsString()
  budget?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Message cannot exceed 1000 characters' })
  message?: string;

  // Explicit Consent (Defaults to false on server)
  @IsOptional()
  @IsBoolean()
  hasConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsappConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  smsConsent?: boolean;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  assignedCounselorId?: string;
}
