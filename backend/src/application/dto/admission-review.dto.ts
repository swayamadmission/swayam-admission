import { IsString, IsOptional, IsNotEmpty, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum RejectionCategory {
  ELIGIBILITY = 'ELIGIBILITY',
  DOCUMENTATION = 'DOCUMENTATION',
  ACADEMIC_CRITERIA = 'ACADEMIC_CRITERIA',
  SEAT_UNAVAILABLE = 'SEAT_UNAVAILABLE',
  OTHER = 'OTHER',
}

export enum ReviewPriority {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class ClaimReviewDto {
  @IsOptional()
  @IsEnum(ReviewPriority)
  priority?: ReviewPriority;
}

export class ApproveAdmissionDto {
  @IsOptional()
  @IsString()
  decisionNotes?: string;

  @IsOptional()
  @IsString()
  academicSessionId?: string;
}

export class RejectAdmissionDto {
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @IsString()
  rejectionReason: string;

  @IsOptional()
  @IsEnum(RejectionCategory)
  rejectionCategory?: RejectionCategory;

  @IsOptional()
  @IsString()
  publicRejectionReason?: string;
}

export class ReopenDecisionDto {
  @IsNotEmpty({ message: 'Reopen reason is required' })
  @IsString()
  reopenReason: string;
}

export class ReassignReviewerDto {
  @IsNotEmpty({ message: 'New reviewer ID is required' })
  @IsString()
  newReviewerId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReviewQueueQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ReviewPriority)
  priority?: ReviewPriority;
}
