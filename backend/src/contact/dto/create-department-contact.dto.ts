import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';

export class CreateDepartmentContactDto {
  @IsString()
  @IsNotEmpty({ message: 'Department name is required' })
  name: string;

  @IsString()
  @IsOptional()
  badge?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  whatsapp?: string;

  @IsString()
  @IsOptional()
  officeHours?: string;

  @IsString()
  @IsOptional()
  workingDays?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  ctaText?: string;

  @IsString()
  @IsOptional()
  ctaAction?: string; // CALL, WHATSAPP, EMAIL, URL

  @IsString()
  @IsOptional()
  ctaUrl?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
