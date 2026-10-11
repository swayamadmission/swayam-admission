import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadDocumentDto {
  @IsNotEmpty()
  @IsEnum(DocumentType)
  type: DocumentType;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  consentAccepted?: boolean | string;

  @IsOptional()
  acceptedPolicies?: any;
}
