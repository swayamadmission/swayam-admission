import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
} from 'class-validator';

export class UpdateStudentProfileDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsString()
  @IsOptional()
  alternatePhone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  isApproved?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  religion?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  aadhaar?: string;

  @IsString()
  @IsOptional()
  pan?: string;

  @IsString()
  @IsOptional()
  passport?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsString()
  @IsOptional()
  parentName?: string;

  @IsString()
  @IsOptional()
  parentContact?: string;

  @IsString()
  @IsOptional()
  parentRelation?: string;

  // Academic Details
  @IsString()
  @IsOptional()
  tenthBoard?: string;

  @IsString()
  @IsOptional()
  tenthSchool?: string;

  @IsNumber()
  @IsOptional()
  tenthPassingYear?: number;

  @IsNumber()
  @IsOptional()
  tenthMarks?: number;

  @IsNumber()
  @IsOptional()
  tenthMaxMarks?: number;

  @IsNumber()
  @IsOptional()
  tenthObtainedMarks?: number;

  @IsString()
  @IsOptional()
  twelfthBoard?: string;

  @IsString()
  @IsOptional()
  twelfthSchool?: string;

  @IsString()
  @IsOptional()
  twelfthStream?: string;

  @IsNumber()
  @IsOptional()
  twelfthPassingYear?: number;

  @IsNumber()
  @IsOptional()
  twelfthMarks?: number;

  @IsNumber()
  @IsOptional()
  twelfthMaxMarks?: number;

  @IsNumber()
  @IsOptional()
  twelfthObtainedMarks?: number;

  @IsString()
  @IsOptional()
  diplomaCourse?: string;

  @IsString()
  @IsOptional()
  diplomaCollege?: string;

  @IsNumber()
  @IsOptional()
  diplomaPercentage?: number;

  @IsNumber()
  @IsOptional()
  diplomaPassingYear?: number;

  @IsString()
  @IsOptional()
  graduationCourse?: string;

  @IsString()
  @IsOptional()
  graduationCollege?: string;

  @IsString()
  @IsOptional()
  graduationUniversity?: string;

  @IsNumber()
  @IsOptional()
  graduationPercentage?: number;

  @IsNumber()
  @IsOptional()
  graduationCgpa?: number;

  @IsNumber()
  @IsOptional()
  graduationPassingYear?: number;

  @IsString()
  @IsOptional()
  previousCollege?: string;

  @IsString()
  @IsOptional()
  university?: string;

  @IsNumber()
  @IsOptional()
  gapYears?: number;

  @IsNumber()
  @IsOptional()
  backlogs?: number;

  @IsArray()
  @IsOptional()
  certificates?: string[];
}
