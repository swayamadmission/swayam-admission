import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { DocumentStatus } from '@prisma/client';

export class BulkVerifyDto {
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  documentIds: string[];

  @IsEnum(DocumentStatus)
  status: DocumentStatus;

  @IsOptional()
  @IsString()
  rejectedReason?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
