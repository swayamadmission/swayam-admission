import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export enum UnitStatusEnum {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum UnitTypeEnum {
  UNIT = 'UNIT',
  TEAM = 'TEAM',
  DIVISION = 'DIVISION',
}

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(UnitTypeEnum)
  @IsOptional()
  unitType?: UnitTypeEnum;

  @IsString()
  @IsOptional()
  managerId?: string;

  @IsString()
  @IsOptional()
  parentTeamId?: string;

  @IsEnum(UnitStatusEnum)
  @IsOptional()
  status?: UnitStatusEnum;
}

export class UpdateUnitDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(UnitTypeEnum)
  @IsOptional()
  unitType?: UnitTypeEnum;

  @IsString()
  @IsOptional()
  managerId?: string | null;

  @IsString()
  @IsOptional()
  parentTeamId?: string | null;

  @IsEnum(UnitStatusEnum)
  @IsOptional()
  status?: UnitStatusEnum;
}

export class AssignMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  memberRole?: string; // MEMBER, LEAD, OPERATOR, VERIFIER

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveUntil?: string;
}

export class AssignManagerDto {
  @IsString()
  @IsNotEmpty()
  managerId: string;
}

export class UnitQueryDto {
  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  parentTeamId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(UnitStatusEnum)
  @IsOptional()
  status?: UnitStatusEnum;

  @IsEnum(UnitTypeEnum)
  @IsOptional()
  unitType?: UnitTypeEnum;
}
