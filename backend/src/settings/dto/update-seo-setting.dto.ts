import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateSEOSettingDto {
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  keywords?: string;

  @IsOptional()
  @IsString()
  canonicalDomain?: string;

  @IsOptional()
  @IsString()
  googleConsoleCode?: string;

  @IsOptional()
  @IsString()
  bingMasterCode?: string;

  @IsOptional()
  @IsString()
  yandexMasterCode?: string;

  @IsOptional()
  @IsString()
  indexNowKey?: string;

  @IsOptional()
  @IsBoolean()
  geoSeoEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  aiSummaryEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  schemaEnabled?: boolean;

  @IsOptional()
  @IsString()
  openGraphImage?: string;

  @IsOptional()
  @IsString()
  twitterCardType?: string;

  @IsOptional()
  @IsString()
  organizationSchemaJson?: string;
}
