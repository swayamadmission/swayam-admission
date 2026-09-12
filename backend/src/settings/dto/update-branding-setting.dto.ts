import { IsString, IsOptional } from 'class-validator';

export class UpdateBrandingSettingDto {
  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  darkLogo?: string;

  @IsOptional()
  @IsString()
  lightLogo?: string;

  @IsOptional()
  @IsString()
  favicon?: string;

  @IsOptional()
  @IsString()
  appIcon?: string;

  @IsOptional()
  @IsString()
  invoiceLogo?: string;

  @IsOptional()
  @IsString()
  receiptLogo?: string;

  @IsOptional()
  @IsString()
  emailLogo?: string;

  @IsOptional()
  @IsString()
  emailHeader?: string;

  @IsOptional()
  @IsString()
  emailFooter?: string;

  @IsOptional()
  @IsString()
  watermark?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsString()
  successColor?: string;

  @IsOptional()
  @IsString()
  warningColor?: string;

  @IsOptional()
  @IsString()
  dangerColor?: string;

  @IsOptional()
  @IsString()
  typography?: string;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsString()
  borderRadius?: string;

  @IsOptional()
  @IsString()
  buttonStyle?: string;

  @IsOptional()
  @IsString()
  cardStyle?: string;

  @IsOptional()
  @IsString()
  navbarStyle?: string;

  @IsOptional()
  @IsString()
  footerStyle?: string;
}
