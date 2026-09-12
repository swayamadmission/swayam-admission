import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export enum DepartmentStatusEnum {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9-_]+$/i, {
    message: 'Slug must be alphanumeric with dashes or underscores',
  })
  slug?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  parentDepartmentId?: string;

  @IsString()
  @IsOptional()
  managerId?: string;

  @IsEnum(DepartmentStatusEnum)
  @IsOptional()
  status?: DepartmentStatusEnum;
}

export class UpdateDepartmentDto {
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

  @IsString()
  @IsOptional()
  parentDepartmentId?: string | null;

  @IsString()
  @IsOptional()
  managerId?: string | null;

  @IsEnum(DepartmentStatusEnum)
  @IsOptional()
  status?: DepartmentStatusEnum;
}

export class DepartmentQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(DepartmentStatusEnum)
  @IsOptional()
  status?: DepartmentStatusEnum;

  @IsString()
  @IsOptional()
  parentDepartmentId?: string;
}
