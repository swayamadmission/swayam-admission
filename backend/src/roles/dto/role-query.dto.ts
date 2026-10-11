import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoleStatus } from '@prisma/client';

export class RoleQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(RoleStatus)
  status?: RoleStatus;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeArchived?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isProtected?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 50;
}
