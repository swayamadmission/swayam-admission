import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsEnum,
} from 'class-validator';

export enum GeographicStatusEnum {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateStateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  heroImage?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsOptional()
  popularCourses?: string[];
}

export class CreateDistrictDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  stateId: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateGeographicAssignmentDto {
  @IsString()
  @IsNotEmpty()
  stateId: string;

  @IsString()
  @IsOptional()
  districtId?: string | null; // Optional: null means state-wide responsibility

  @IsString()
  @IsNotEmpty()
  responsibleUserId: string; // Primary responsible senior counselor / manager

  @IsString()
  @IsOptional()
  backupUserId?: string | null; // Backup responsible person

  @IsString()
  @IsOptional()
  assignedRole?: string;

  @IsEnum(GeographicStatusEnum)
  @IsOptional()
  status?: GeographicStatusEnum;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveUntil?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateGeographicAssignmentDto {
  @IsString()
  @IsOptional()
  responsibleUserId?: string;

  @IsString()
  @IsOptional()
  backupUserId?: string | null;

  @IsString()
  @IsOptional()
  assignedRole?: string;

  @IsEnum(GeographicStatusEnum)
  @IsOptional()
  status?: GeographicStatusEnum;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveUntil?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class GeographicQueryDto {
  @IsString()
  @IsOptional()
  stateId?: string;

  @IsString()
  @IsOptional()
  districtId?: string;

  @IsString()
  @IsOptional()
  responsibleUserId?: string;

  @IsEnum(GeographicStatusEnum)
  @IsOptional()
  status?: GeographicStatusEnum;

  @IsString()
  @IsOptional()
  search?: string;
}
