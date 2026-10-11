import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDeletionRequestDto {
  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  documentIds!: string[];

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsString()
  additionalDetails?: string;


  @IsOptional()
  @IsArray()
  acceptedPolicies?: Array<{
    policyId?: string;
    policyType: string;
    policyVersion: string;
  }>;
}

export class ReviewDeletionDto {
  @IsString()
  @IsNotEmpty()
  action!: 'APPROVE' | 'REJECT' | 'HOLD';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  holdReason?: string;
}

export class ResendNotificationDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];
}
