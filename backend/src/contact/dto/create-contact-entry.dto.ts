import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';

export class CreateContactEntryDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  department: string; // ADMISSIONS, GENERAL, APPLICATION_SUPPORT, PARTNERSHIPS, TECHNICAL_SUPPORT, OTHER

  @IsString()
  @IsNotEmpty()
  contactType: string; // PHONE, EMAIL, WHATSAPP, ADDRESS, URL

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsString()
  @IsOptional()
  businessHours?: string;
}
