import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateOtpConfigDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  phoneNumberId?: string;

  @IsString()
  @IsOptional()
  apiHost?: string;

  @IsInt()
  @IsOptional()
  apiPort?: number;

  @IsString()
  @IsOptional()
  apiUser?: string;

  @IsString()
  @IsOptional()
  apiPassword?: string;

  @IsBoolean()
  @IsOptional()
  apiSecure?: boolean;

  @IsString()
  @IsOptional()
  fromName?: string;

  @IsString()
  @IsOptional()
  fromEmail?: string;

  @IsString()
  @IsOptional()
  templateName?: string;

  @IsString()
  @IsOptional()
  templateLanguage?: string;

  @IsInt()
  @Min(30)
  @IsOptional()
  expirySeconds?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxAttempts?: number;

  @IsInt()
  @Min(10)
  @IsOptional()
  resendCooldownSec?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  rateLimitCount?: number;

  @IsInt()
  @Min(60)
  @IsOptional()
  rateLimitWindowSec?: number;
}
