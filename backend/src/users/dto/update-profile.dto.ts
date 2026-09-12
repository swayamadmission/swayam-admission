import {
  IsDateString,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsDateString()
  @IsOptional()
  dob?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsString()
  @IsOptional()
  tenthBoard?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  tenthMarks?: number;

  @IsNumber()
  @IsOptional()
  tenthPassingYear?: number;

  @IsString()
  @IsOptional()
  twelfthBoard?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  twelfthMarks?: number;

  @IsNumber()
  @IsOptional()
  twelfthPassingYear?: number;

  @IsString()
  @IsOptional()
  graduationCourse?: string;

  @IsString()
  @IsOptional()
  graduationCollege?: string;

  @IsNumber()
  @IsOptional()
  graduationPercentage?: number;

  @IsOptional()
  preferences?: Record<string, any>;
}
