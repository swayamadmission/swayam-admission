import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsObject,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { RoleStatus, DataScope } from '@prisma/client';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  level?: number;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  parentRoleId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  selfRegistrable?: boolean;

  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;

  @IsOptional()
  @IsEnum(RoleStatus)
  status?: RoleStatus;

  @IsOptional()
  @IsBoolean()
  isProtected?: boolean;

  @IsOptional()
  @IsEnum(DataScope)
  dataScope?: DataScope;

  @IsOptional()
  @IsString()
  roleType?: string;

  @IsOptional()
  @IsString()
  lockReason?: string;

  @IsOptional()
  @IsBoolean()
  stateRestricted?: boolean;

  @IsOptional()
  @IsArray()
  permissionCodes?: string[];

  @IsOptional()
  @IsObject()
  permissionsMatrix?: Record<string, Record<string, boolean>>;

  @IsOptional()
  @IsArray()
  states?: string[];

  @IsOptional()
  @IsObject()
  restrictions?: Record<string, any>;

  @IsOptional()
  @IsObject()
  policies?: Record<string, any>;
}
