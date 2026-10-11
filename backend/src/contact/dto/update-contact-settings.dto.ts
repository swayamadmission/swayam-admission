import { IsString, IsOptional } from 'class-validator';

export class UpdateContactSettingsDto {
  @IsString()
  @IsOptional()
  pageHeading?: string;

  @IsString()
  @IsOptional()
  pageSubheading?: string;

  @IsString()
  @IsOptional()
  helpdeskBadge?: string;

  @IsString()
  @IsOptional()
  officeHours?: string;

  @IsString()
  @IsOptional()
  workingDays?: string;

  @IsString()
  @IsOptional()
  holidayNotice?: string;

  @IsString()
  @IsOptional()
  expectedResponseTime?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  googleMapsUrl?: string;

  // Social media links
  @IsString()
  @IsOptional()
  instagramUrl?: string;

  @IsString()
  @IsOptional()
  facebookUrl?: string;

  @IsString()
  @IsOptional()
  youtubeUrl?: string;

  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @IsString()
  @IsOptional()
  xUrl?: string;

  @IsString()
  @IsOptional()
  githubUrl?: string;

  @IsString()
  @IsOptional()
  redditUrl?: string;

  @IsString()
  @IsOptional()
  telegramUrl?: string;

  @IsString()
  @IsOptional()
  discordUrl?: string;
}
