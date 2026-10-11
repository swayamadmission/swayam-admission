import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  Min,
  IsIn,
} from 'class-validator';

export class CreateCouponDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsIn(['PERCENTAGE', 'FIXED'])
  discountType: 'PERCENTAGE' | 'FIXED';

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minTransactionAmount?: number;

  @IsOptional()
  @IsString()
  applicableScope?: string;

  @IsOptional()
  @IsArray()
  eligibleCollegeIds?: string[];

  @IsOptional()
  @IsArray()
  eligibleCourseIds?: string[];

  @IsOptional()
  @IsArray()
  eligibleBranchIds?: string[];

  @IsOptional()
  @IsString()
  academicSession?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsageCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsagePerUser?: number;

  @IsOptional()
  @IsBoolean()
  allowStacking?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ValidateCouponDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  transactionAmount: number;

  @IsOptional()
  @IsString()
  applicableScope?: string;

  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  academicSession?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  paymentRequestId?: string;

  @IsOptional()
  @IsString()
  paymentDestination?: string;

  @IsOptional()
  @IsString()
  routingMode?: string;

  @IsOptional()
  @IsString()
  beneficiary?: string;
}

export class RedeemCouponDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  transactionAmount: number;

  @IsNotEmpty()
  @IsString()
  transactionType: 'APPLICATION' | 'STUDY_MATERIAL' | 'PAYMENT';

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  applicableScope?: string;

  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
