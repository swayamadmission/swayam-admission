import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class CreateTestimonialDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  course?: string;

  @IsString()
  @IsOptional()
  college?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @IsString()
  @IsOptional()
  status?: string;
}
