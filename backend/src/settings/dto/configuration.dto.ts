import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsObject,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ConfigurationDataType {
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  DECIMAL = 'DECIMAL',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  ENUM = 'ENUM',
}

export enum ConfigurationScope {
  GLOBAL = 'GLOBAL',
  ORGANIZATION = 'ORGANIZATION',
  DEPARTMENT = 'DEPARTMENT',
  UNIT = 'UNIT',
  COLLEGE = 'COLLEGE',
  ROLE = 'ROLE',
}

export enum ConfigurationCategory {
  GENERAL = 'GENERAL',
  ADMISSIONS = 'ADMISSIONS',
  APPLICATIONS = 'APPLICATIONS',
  COUNSELING = 'COUNSELING',
  TASKS_SLA = 'TASKS_SLA',
  PAYMENTS = 'PAYMENTS',
  DOCUMENTS = 'DOCUMENTS',
  REPORTING_ENROLLMENT = 'REPORTING_ENROLLMENT',
  NOTIFICATIONS = 'NOTIFICATIONS',
  CAMPAIGNS = 'CAMPAIGNS',
  REVIEWS = 'REVIEWS',
  RANKINGS = 'RANKINGS',
  ANALYTICS = 'ANALYTICS',
  SECURITY = 'SECURITY',
  MAINTENANCE = 'MAINTENANCE',
  FEATURE_FLAGS = 'FEATURE_FLAGS',
}

export class CreateConfigurationDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ConfigurationCategory)
  category: ConfigurationCategory;

  @IsEnum(ConfigurationDataType)
  dataType: ConfigurationDataType;

  @IsNotEmpty()
  value: any;

  @IsNotEmpty()
  defaultValue: any;

  @IsOptional()
  @IsEnum(ConfigurationScope)
  scope?: ConfigurationScope = ConfigurationScope.GLOBAL;

  @IsOptional()
  @IsString()
  scopeId?: string;

  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isHighRisk?: boolean = false;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean = false;

  @IsOptional()
  @IsObject()
  validationRules?: {
    min?: number;
    max?: number;
    enumOptions?: string[];
    regex?: string;
    step?: number;
    requiresReason?: boolean;
  };

  @IsOptional()
  @IsString()
  changeReason?: string;
}

export class UpdateConfigurationDto {
  @IsNotEmpty()
  value: any;

  @IsOptional()
  @IsString()
  changeReason?: string;

  @IsOptional()
  @IsNumber()
  expectedVersion?: number;

  @IsOptional()
  @IsEnum(ConfigurationScope)
  scope?: ConfigurationScope;

  @IsOptional()
  @IsString()
  scopeId?: string;
}

export class SubmitApprovalDto {
  @IsNotEmpty()
  proposedValue: any;

  @IsString()
  @IsNotEmpty()
  changeReason: string;

  @IsOptional()
  @IsEnum(ConfigurationScope)
  scope?: ConfigurationScope;

  @IsOptional()
  @IsString()
  scopeId?: string;
}

export class ReviewApprovalDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class RollbackConfigurationDto {
  @IsNumber()
  targetVersionNumber: number;

  @IsOptional()
  @IsString()
  changeReason?: string;

  @IsOptional()
  @IsEnum(ConfigurationScope)
  scope?: ConfigurationScope;

  @IsOptional()
  @IsString()
  scopeId?: string;
}

export class QueryConfigurationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ConfigurationScope)
  scope?: ConfigurationScope;

  @IsOptional()
  @IsString()
  scopeId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class ImportConfigurationDto {
  @IsObject()
  configurations: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean = false;

  @IsOptional()
  @IsString()
  changeReason?: string;
}
