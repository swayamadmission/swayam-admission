import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignStudentDto {
  @IsNotEmpty()
  @IsString()
  counselorId: string;

  @IsNotEmpty()
  @IsString()
  studentId: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class AssignLeadDto {
  @IsNotEmpty()
  @IsString()
  counselorId: string;

  @IsNotEmpty()
  @IsString()
  leadId: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class AssignApplicationDto {
  @IsNotEmpty()
  @IsString()
  counselorId: string;

  @IsNotEmpty()
  @IsString()
  applicationId: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UnassignCounselorDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class ReassignCounselorDto {
  @IsNotEmpty()
  @IsString()
  oldCounselorId: string;

  @IsNotEmpty()
  @IsString()
  newCounselorId: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
