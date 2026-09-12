import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { DocumentType } from '@prisma/client';

export class ConfigureRequirementDto {
  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  admissionSession?: string = '2026-2027';

  @IsNotEmpty()
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = true;

  @IsOptional()
  @IsString()
  description?: string;
}
