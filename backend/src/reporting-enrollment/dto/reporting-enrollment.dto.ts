import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsEnum,
} from 'class-validator';

export enum ReportingStatus {
  REPORTING_ELIGIBLE = 'REPORTING_ELIGIBLE',
  REPORTING_SUBMITTED = 'REPORTING_SUBMITTED',
  VERIFICATION_PENDING = 'VERIFICATION_PENDING',
  CORRECTION_REQUIRED = 'CORRECTION_REQUIRED',
  REPORTING_COMPLETED = 'REPORTING_COMPLETED',
  REPORTING_REJECTED = 'REPORTING_REJECTED',
}

export enum VerificationSource {
  COLLEGE_PORTAL = 'COLLEGE_PORTAL',
  COLLEGE_ERP = 'COLLEGE_ERP',
  OFFICIAL_EMAIL = 'OFFICIAL_EMAIL',
  MANUAL_VERIFIED = 'MANUAL_VERIFIED',
}

export class SubmitReportingDto {
  @IsOptional()
  @IsDateString()
  reportingDate?: string;

  @IsOptional()
  @IsString()
  collegeCampus?: string;

  @IsOptional()
  @IsString()
  collegeReferenceNumber?: string;

  @IsOptional()
  @IsString()
  proofDocumentUrl?: string;

  @IsOptional()
  @IsString()
  proofDocumentName?: string;

  @IsOptional()
  @IsString()
  studentRemarks?: string;
}

export class RequestReportingCorrectionDto {
  @IsNotEmpty()
  @IsString()
  correctionReason: string;

  @IsOptional()
  @IsString()
  publicCorrectionReason?: string;
}

export class VerifyReportingDto {
  @IsOptional()
  @IsEnum(VerificationSource)
  verificationSource?: VerificationSource;

  @IsOptional()
  @IsString()
  verificationRemarks?: string;
}

export class ConfirmEnrollmentDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}
