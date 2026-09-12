import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class UpdateSecuritySettingDto {
  @IsOptional()
  @IsInt()
  jwtExpiryMinutes?: number;

  @IsOptional()
  @IsInt()
  refreshTokenExpiryDays?: number;

  @IsOptional()
  @IsInt()
  passwordMinLength?: number;

  @IsOptional()
  @IsBoolean()
  requireUppercase?: boolean;

  @IsOptional()
  @IsBoolean()
  requireLowercase?: boolean;

  @IsOptional()
  @IsBoolean()
  requireNumbers?: boolean;

  @IsOptional()
  @IsBoolean()
  requireSpecialChars?: boolean;

  @IsOptional()
  @IsInt()
  maxLoginAttempts?: number;

  @IsOptional()
  @IsInt()
  accountLockMinutes?: number;

  @IsOptional()
  @IsInt()
  sessionTimeoutMinutes?: number;

  @IsOptional()
  @IsInt()
  otpLength?: number;

  @IsOptional()
  @IsInt()
  otpExpiryMinutes?: number;

  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  deviceVerification?: boolean;

  @IsOptional()
  @IsBoolean()
  emailVerificationRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  phoneVerificationRequired?: boolean;

  @IsOptional()
  @IsString()
  ipWhitelist?: string;

  @IsOptional()
  @IsInt()
  maxFileUploadSizeMb?: number;

  @IsOptional()
  @IsString()
  allowedFileTypes?: string;

  @IsOptional()
  @IsString()
  encryptionMode?: string;

  @IsOptional()
  @IsBoolean()
  auditLoggingEnabled?: boolean;
}
