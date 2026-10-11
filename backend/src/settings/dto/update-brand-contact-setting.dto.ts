import { IsString, IsOptional } from 'class-validator';

export class UpdateBrandContactSettingDto {
  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  mainTagline?: string;

  @IsOptional()
  @IsString()
  brandPromise?: string;

  @IsOptional()
  @IsString()
  primaryAudience?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsString()
  generalEmail?: string;

  @IsOptional()
  @IsString()
  admissionEmail?: string;

  @IsOptional()
  @IsString()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  contactNumber1?: string;

  @IsOptional()
  @IsString()
  contactNumber2?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  facebookUrl?: string;

  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  xUrl?: string;

  @IsOptional()
  @IsString()
  githubUrl?: string;

  @IsOptional()
  @IsString()
  redditUrl?: string;

  @IsOptional()
  @IsString()
  telegramUrl?: string;

  @IsOptional()
  @IsString()
  discordUrl?: string;

  @IsOptional()
  @IsString()
  socialHandle?: string;
}
