import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, Min, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVacancyDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsNotEmpty()
  designation: string;

  @IsString()
  @IsNotEmpty()
  employmentType: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsNotEmpty()
  workMode: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  numberOfPositions: number;

  @IsString()
  @IsOptional()
  minimumQualification?: string;

  @IsString()
  @IsOptional()
  preferredQualification?: string;

  @IsString()
  @IsOptional()
  experience?: string;

  @IsArray()
  @IsOptional()
  requiredSkills?: string[];

  @IsArray()
  @IsOptional()
  preferredSkills?: string[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  salaryMin?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  salaryMax?: number;

  @IsString()
  @IsOptional()
  salaryCurrency?: string;

  @IsString()
  @IsNotEmpty()
  jobDescription: string;

  @IsString()
  @IsNotEmpty()
  responsibilities: string;

  @IsString()
  @IsOptional()
  educationRequirements?: string;

  @IsString()
  @IsOptional()
  experienceRequirements?: string;

  @IsDateString()
  @IsOptional()
  applicationStartDate?: string;

  @IsDateString()
  @IsOptional()
  applicationEndDate?: string;

  @IsDateString()
  @IsOptional()
  applicationDeadline?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  interviewType?: string;

  @IsString()
  @IsOptional()
  interviewMode?: string;

  @IsString()
  @IsOptional()
  recruiterId?: string;

  @IsString()
  @IsOptional()
  reportingManagerId?: string;
}
