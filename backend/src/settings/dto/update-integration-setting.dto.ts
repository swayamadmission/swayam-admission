import { IsString, IsOptional } from 'class-validator';

export class UpdateIntegrationSettingDto {
  @IsOptional()
  @IsString()
  googleAnalyticsId?: string;

  @IsOptional()
  @IsString()
  googleTagManagerId?: string;

  @IsOptional()
  @IsString()
  googleSearchConsole?: string;

  @IsOptional()
  @IsString()
  googleMapsApiKey?: string;

  @IsOptional()
  @IsString()
  metaPixelId?: string;

  @IsOptional()
  @IsString()
  razorpayKeyId?: string;

  @IsOptional()
  @IsString()
  razorpayKeySecret?: string;

  @IsOptional()
  @IsString()
  phonepeMerchantId?: string;

  @IsOptional()
  @IsString()
  phonepeSaltKey?: string;

  @IsOptional()
  @IsString()
  stripePublishableKey?: string;

  @IsOptional()
  @IsString()
  stripeSecretKey?: string;

  @IsOptional()
  @IsString()
  cashfreeAppId?: string;

  @IsOptional()
  @IsString()
  cashfreeSecretKey?: string;

  @IsOptional()
  @IsString()
  paytmMerchantId?: string;

  @IsOptional()
  @IsString()
  paytmMerchantKey?: string;

  @IsOptional()
  @IsString()
  cloudinaryCloudName?: string;

  @IsOptional()
  @IsString()
  cloudinaryApiKey?: string;

  @IsOptional()
  @IsString()
  cloudinaryApiSecret?: string;

  @IsOptional()
  @IsString()
  awsAccessKeyId?: string;

  @IsOptional()
  @IsString()
  awsSecretAccessKey?: string;

  @IsOptional()
  @IsString()
  awsRegion?: string;

  @IsOptional()
  @IsString()
  awsS3Bucket?: string;

  @IsOptional()
  @IsString()
  firebaseConfigJson?: string;

  @IsOptional()
  @IsString()
  openAiApiKey?: string;

  @IsOptional()
  @IsString()
  geminiApiKey?: string;

  @IsOptional()
  @IsString()
  claudeApiKey?: string;

  @IsOptional()
  @IsString()
  groqApiKey?: string;

  @IsOptional()
  @IsString()
  deepseekApiKey?: string;

  @IsOptional()
  @IsString()
  twilioAccountSid?: string;

  @IsOptional()
  @IsString()
  twilioAuthToken?: string;

  @IsOptional()
  @IsString()
  twilioFromNumber?: string;

  @IsOptional()
  @IsString()
  msg91AuthKey?: string;

  @IsOptional()
  @IsString()
  msg91SenderId?: string;

  @IsOptional()
  @IsString()
  resendApiKey?: string;

  @IsOptional()
  @IsString()
  brevoApiKey?: string;

  @IsOptional()
  @IsString()
  recaptchaSiteKey?: string;

  @IsOptional()
  @IsString()
  recaptchaSecretKey?: string;

  @IsOptional()
  @IsString()
  cloudflareZoneId?: string;

  @IsOptional()
  @IsString()
  cdnUrl?: string;

  @IsOptional()
  @IsString()
  webhookUrlsJson?: string;
}
