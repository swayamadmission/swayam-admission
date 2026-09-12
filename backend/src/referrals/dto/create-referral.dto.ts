import { IsNotEmpty, IsOptional, IsString, IsEmail, IsNumber } from 'class-validator';

export class AttributeLeadDto {
  @IsNotEmpty()
  @IsString()
  referralCode: string;

  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsString()
  mobile: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  attributionSource?: string = 'LINK';

  @IsOptional()
  @IsString()
  campaignId?: string;
}

export class OverrideAttributionDto {
  @IsNotEmpty()
  @IsString()
  newReferrerCodeOrId: string;

  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class FraudReviewDto {
  @IsNotEmpty()
  @IsString()
  decision: 'APPROVED' | 'REJECTED' | 'FLAGGED_FOR_REVIEW';

  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class ApproveRewardDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RejectRewardDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class PayoutRewardDto {
  @IsNotEmpty()
  @IsString()
  payoutMethod: 'BANK_TRANSFER' | 'UPI' | 'WALLET' | 'FEE_CREDIT';

  @IsNotEmpty()
  @IsString()
  payoutReference: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
