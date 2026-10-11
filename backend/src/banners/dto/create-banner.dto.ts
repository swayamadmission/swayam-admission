import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBannerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['IMAGE', 'VIDEO'])
  mediaType?: 'IMAGE' | 'VIDEO';

  @IsOptional()
  @IsString()
  buttonText?: string;

  @IsOptional()
  @IsString()
  buttonUrl?: string;

  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean;

  @IsString()
  slot: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  startDate?: string | Date;

  @IsOptional()
  endDate?: string | Date;

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE', 'DRAFT'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
