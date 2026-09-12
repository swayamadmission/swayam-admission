import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  alternateMobile?: string;

  @IsOptional()
  @IsString()
  tenthBoard?: string;

  @IsOptional()
  @IsNumber()
  tenthPassingYear?: number;

  @IsOptional()
  @IsNumber()
  tenthMarks?: number;

  @IsOptional()
  @IsString()
  twelfthBoard?: string;

  @IsOptional()
  @IsNumber()
  twelfthPassingYear?: number;

  @IsOptional()
  @IsNumber()
  twelfthMarks?: number;

  @IsOptional()
  @IsString()
  twelfthStream?: string;

  @IsOptional()
  @IsString()
  graduationCourse?: string;

  @IsOptional()
  @IsString()
  graduationCollege?: string;

  @IsOptional()
  @IsNumber()
  graduationPercentage?: number;

  @IsOptional()
  @IsNumber()
  graduationPassingYear?: number;

  @IsOptional()
  @IsString()
  currentCourse?: string;

  @IsOptional()
  @IsString()
  currentCollege?: string;

  @IsOptional()
  @IsString()
  stream?: string;

  @IsOptional()
  @IsNumber()
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  budgetMax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredStates?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCities?: string[];

  @IsOptional()
  @IsString()
  collegeType?: string;

  @IsOptional()
  @IsString()
  careerGoal?: string;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @IsOptional()
  @IsString()
  counselorId?: string;
}
