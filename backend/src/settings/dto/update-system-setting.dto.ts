import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateSystemSettingDto {
  @IsOptional()
  @IsString()
  platformName?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  supportPhone?: string;

  @IsOptional()
  @IsString()
  whatsappPhone?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  panNumber?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  timeFormat?: string;

  @IsOptional()
  @IsString()
  academicSession?: string;

  @IsOptional()
  @IsString()
  admissionSession?: string;

  @IsOptional()
  @IsString()
  defaultLeadStatus?: string;

  @IsOptional()
  @IsString()
  defaultStudentStatus?: string;

  @IsOptional()
  @IsString()
  defaultApplicationStatus?: string;

  @IsOptional()
  @IsString()
  defaultTheme?: string;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsString()
  maintenanceMessage?: string;

  @IsOptional()
  @IsString()
  brandPromise?: string;

  @IsOptional()
  @IsString()
  primaryAudience?: string;

  @IsOptional()
  @IsString()
  generalEmail?: string;

  @IsOptional()
  @IsString()
  admissionEmail?: string;

  @IsOptional()
  @IsString()
  contactNumber2?: string;

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
