import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class StaffRegisterDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  personalEmail: string;

  @IsString()
  @IsNotEmpty()
  personalMobile: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  requestedRoleSlug: string;

  @IsString()
  @IsOptional()
  requestedStateId?: string;

  @IsString()
  @IsOptional()
  requestedDistrictId?: string;

  @IsString()
  @IsOptional()
  referralCode?: string;

  @IsString()
  @IsOptional()
  city?: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsIn(['mobile', 'email'])
  type: 'mobile' | 'email';

  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class UploadStaffKycDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  documentType: string; // AADHAAR | PAN | RESUME | EXPERIENCE_CERTIFICATE | OTHER_KYC

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  mimeType?: string;
}

export class VerifyKycDto {
  @IsString()
  @IsIn(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @IsString()
  @IsOptional()
  documentId?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class ApproveStaffDto {
  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsString()
  @IsOptional()
  positionId?: string;

  @IsString()
  @IsOptional()
  stateId?: string;

  @IsString()
  @IsOptional()
  districtId?: string;

  @IsString()
  @IsOptional()
  companyEmail?: string;

  @IsString()
  @IsOptional()
  temporaryPassword?: string;

  @IsBoolean()
  @IsOptional()
  forcePasswordChange?: boolean;
}

export class RejectStaffDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ResignStaffDto {
  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  handoverNotes?: string;
}

export class AdminPasswordResetDto {
  @IsString()
  @IsNotEmpty()
  reason: string; // Resignation | Transfer | Replacement | Security Incident | Forgotten Password | Account Recovery | Other

  @IsString()
  @IsOptional()
  customReason?: string;

  @IsString()
  @IsOptional()
  temporaryPassword?: string;

  @IsBoolean()
  @IsOptional()
  forcePasswordChange?: boolean;
}

export class AdminPasswordChangeDto {
  @IsString()
  @MinLength(6)
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  customReason?: string;
}

export class FirstLoginPasswordChangeDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class StaffSecurityActionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
