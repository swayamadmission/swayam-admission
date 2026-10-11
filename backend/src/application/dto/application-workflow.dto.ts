import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class SaveApplicationDraftDto {
  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  communicationAddress?: string;

  @IsOptional()
  @IsString()
  communicationCity?: string;

  @IsOptional()
  @IsString()
  communicationDistrict?: string;

  @IsOptional()
  @IsString()
  communicationState?: string;

  @IsOptional()
  @IsString()
  communicationPincode?: string;

  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @IsOptional()
  @IsObject()
  draftData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  personalInfo?: Record<string, any>;

  @IsOptional()
  @IsObject()
  academicInfo?: Record<string, any>;

  @IsOptional()
  @IsObject()
  address?: Record<string, any>;

  @IsOptional()
  @IsObject()
  financialAssistance?: Record<string, any>;

  @IsOptional()
  @IsObject()
  declaration?: Record<string, any>;
}

export class InitiatePaymentDto {
  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsObject()
  declaration?: Record<string, any>;

  @IsOptional()
  @IsObject()
  financialAssistance?: Record<string, any>;

  @IsOptional()
  @IsString()
  termsVersion?: string;

  @IsOptional()
  @IsBoolean()
  privacyPolicyAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;


  @IsOptional()
  @IsBoolean()
  paymentTermsAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentPrivacyAccepted?: boolean;

  @IsOptional()
  acceptedPolicies?: Array<{
    policyId?: string;
    policyType: string;
    policyVersion: string;
  }>;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class SubmitApplicationDto {
  @IsBoolean()
  declarationAccepted: boolean;

  @IsOptional()
  @IsString()
  termsVersion?: string;

  @IsOptional()
  @IsBoolean()
  privacyPolicyAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;


  @IsOptional()
  @IsString()
  policyVersion?: string;

  @IsOptional()
  @IsObject()
  financialAssistance?: Record<string, any>;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  paymentTransactionId?: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsObject()
  declaration?: Record<string, any>;

  @IsOptional()
  acceptedPolicies?: Array<{
    policyId?: string;
    policyType: string;
    policyVersion: string;
  }>;
}

export class VerifyApplicationPaymentDto {
  @IsString()
  razorpayPaymentId: string;

  @IsString()
  razorpaySignature: string;

  @IsOptional()
  @IsString()
  razorpayOrderId?: string;

  @IsOptional()
  @IsString()
  paymentId?: string;
}

export class RequestCorrectionDto {
  @IsString()
  affectedSection: string;

  @IsString()
  reason: string;
}

export class WithdrawApplicationDto {
  @IsString()
  reason: string;
}

export class SaveApplicationDeclarationsDto {
  @IsOptional()
  @IsObject()
  declaration?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  privacyAccepted?: boolean;

  @IsOptional()
  @IsString()
  privacyVersion?: string;

  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;

  @IsOptional()
  @IsString()
  termsVersion?: string;

}
