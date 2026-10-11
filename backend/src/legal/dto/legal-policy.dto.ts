import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
} from 'class-validator';

export class CreatePolicyDto {
  @IsNotEmpty()
  @IsString()
  policyType!: string;

  @IsNotEmpty()
  @IsString()
  slug!: string;

  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsString()
  changeSummary?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdatePolicyDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsString()
  changeSummary?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateNewVersionDto {
  @IsNotEmpty()
  @IsString()
  version!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsNotEmpty()
  @IsString()
  content!: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsString()
  changeSummary?: string;
}

export class UpdateConsentConfigDto {
  @IsNotEmpty()
  @IsString()
  actionType!: string;

  @IsArray()
  policyTypes!: string[];

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class RecordConsentDto {
  @IsNotEmpty()
  @IsString()
  actionContext!: string;

  @IsArray()
  acceptedPolicies!: Array<{
    policyId?: string;
    policyType: string;
    policyVersion: string;
  }>;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  purchaseId?: string;

  @IsOptional()
  @IsString()
  deletionRequestId?: string;

  @IsOptional()
  @IsString()
  referralId?: string;
}

export class SubmitGrievanceDto {
  @IsNotEmpty()
  @IsString()
  category!: string;

  @IsNotEmpty()
  @IsString()
  subject!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;
}

export class UpdateGrievanceDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  response?: string;

  @IsOptional()
  @IsString()
  resolution?: string;
}

export class CookieItemDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  category!: string;

  @IsNotEmpty()
  @IsString()
  purpose!: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
