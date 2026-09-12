import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateRecommendationDto {
  @IsString()
  collegeId: string;

  @IsString()
  courseId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  academicSession?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateShortlistDto {
  @IsString()
  collegeId: string;

  @IsString()
  courseId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  academicSession?: string;

  @IsOptional()
  @IsString()
  recommendationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSelectionDto {
  @IsString()
  collegeId: string;

  @IsString()
  courseId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  academicSession?: string;

  @IsOptional()
  @IsBoolean()
  studentChoiceConfirmed?: boolean;
}

export class InitiateApplicationDto {
  @IsString()
  collegeId: string;

  @IsString()
  courseId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  academicSession?: string;

  @IsOptional()
  @IsBoolean()
  studentChoiceConfirmed?: boolean;
}

export class UpdateRequirementProfileDto {
  @IsOptional()
  @IsBoolean()
  hostelRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  transportRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  scholarshipRequired?: boolean;

  @IsOptional()
  @IsString()
  admissionUrgency?: string;

  @IsOptional()
  @IsString()
  otherRequirements?: string;

  @IsOptional()
  @IsString()
  counselorObservation?: string;
}

export class CreateCounselingNoteDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  visibility?: 'INTERNAL' | 'STUDENT_VISIBLE';
}
