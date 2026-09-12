import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentDestinationType {
  PLATFORM = 'PLATFORM',
  DIRECT_COLLEGE = 'DIRECT_COLLEGE',
  HYBRID = 'HYBRID',
}

export enum PaymentMethodType {
  GATEWAY = 'GATEWAY',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  QR = 'QR',
}

export class CreatePaymentAllocationDto {
  @IsNotEmpty()
  @IsEnum(PaymentDestinationType)
  destinationType: PaymentDestinationType;

  @IsOptional()
  @IsString()
  destinationEntity?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsEnum(PaymentMethodType)
  paymentMethod?: PaymentMethodType;

  @IsOptional()
  @IsString()
  collegeBankId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CounselorCreatePaymentRequestDto {
  @IsNotEmpty()
  @IsString()
  applicationId: string;

  @IsNotEmpty()
  @IsString()
  studentId: string;

  @IsNotEmpty()
  @IsString()
  collegeId: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsNotEmpty()
  @IsString()
  feeHead: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  totalAmount: number;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  scholarshipAmount?: number;
}

export class FinanceApprovePaymentRequestDto {
  @IsNotEmpty()
  @IsEnum(PaymentDestinationType)
  paymentDestination: PaymentDestinationType;

  @IsOptional()
  @IsEnum(PaymentMethodType)
  approvedPaymentMethod?: PaymentMethodType;

  @IsOptional()
  @IsString()
  collegeBankId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentAllocationDto)
  allocations?: CreatePaymentAllocationDto[];

  @IsOptional()
  @IsString()
  financeReviewNotes?: string;
}

export class FinanceRejectPaymentRequestDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class SeniorCounselorCollegeConfirmDto {
  @IsNotEmpty()
  @IsString()
  paymentRequestId: string;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  paymentAllocationId?: string;

  @IsNotEmpty()
  @IsString()
  confirmationMethod: string;

  @IsOptional()
  @IsString()
  collegeContactPerson?: string;

  @IsOptional()
  @IsString()
  collegeContactPhone?: string;

  @IsOptional()
  @IsString()
  collegeReferenceNumber?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class StudentSubmitManualProofDto {
  @IsNotEmpty()
  @IsString()
  paymentRequestId: string;

  @IsOptional()
  @IsString()
  paymentAllocationId?: string;

  @IsNotEmpty()
  @IsString()
  utrNumber: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  paidAmount: number;

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @IsOptional()
  @IsString()
  proofDocument?: string;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class FinanceVerifyPaymentFinalDto {
  @IsNotEmpty()
  @IsString()
  action: 'VERIFY' | 'REJECT' | 'REQUEST_REUPLOAD' | 'REQUEST_UTR';

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  paymentAllocationId?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
