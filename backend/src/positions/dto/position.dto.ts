import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';

export enum PositionStatusEnum {
  ACTIVE = 'ACTIVE',
  VACANT = 'VACANT',
  SUSPENDED = 'SUSPENDED',
  RETIRED = 'RETIRED',
}

export enum EmailStatusEnum {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED',
  RETIRED = 'RETIRED',
}

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsString()
  @IsOptional()
  companyEmail?: string;

  @IsString()
  @IsOptional()
  stateId?: string;

  @IsString()
  @IsOptional()
  districtId?: string;

  @IsBoolean()
  @IsOptional()
  isMultiHolder?: boolean;

  @IsBoolean()
  @IsOptional()
  selfServicePasswordReset?: boolean;
}

export class UpdatePositionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsString()
  @IsOptional()
  stateId?: string;

  @IsString()
  @IsOptional()
  districtId?: string;

  @IsString()
  @IsOptional()
  positionStatus?: string;

  @IsString()
  @IsOptional()
  emailStatus?: string;

  @IsBoolean()
  @IsOptional()
  selfServicePasswordReset?: boolean;
}

export class AssignEmployeeDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  forcePasswordChange?: boolean;
}

export class TransferPositionDto {
  @IsString()
  @IsNotEmpty()
  targetPositionId: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class GenerateEmailDto {
  @IsString()
  @IsNotEmpty()
  roleSlug: string;

  @IsString()
  @IsOptional()
  stateCode?: string;

  @IsString()
  @IsOptional()
  districtName?: string;

  @IsString()
  @IsOptional()
  departmentCode?: string;
}
