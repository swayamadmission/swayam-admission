import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsObject,
  IsInt,
} from 'class-validator';

export enum ReviewStatus {
  PENDING_MODERATION = 'PENDING_MODERATION',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
  HIDDEN = 'HIDDEN',
}

export enum ModerationAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  HIDE = 'HIDE',
  FLAG = 'FLAG',
}

export class SubmitCollegeReviewDto {
  @IsNotEmpty()
  @IsString()
  collegeId: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class SubmitCounselorReviewDto {
  @IsOptional()
  @IsString()
  counselorId?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class SubmitSupportReviewDto {
  @IsOptional()
  @IsString()
  ticketId?: string;

  @IsOptional()
  @IsString()
  supportAgentId?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class ModerateReviewDto {
  @IsNotEmpty()
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class FileComplaintDto {
  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsNotEmpty()
  @IsString()
  category: string; // DISCRIMINATION, HARASSMENT, SAFETY, FRAUD, OTHER

  @IsOptional()
  @IsString()
  severity?: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  evidenceUrl?: string;
}

export class CalculateRankingDto {
  @IsNotEmpty()
  @IsInt()
  year: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  algorithmVersion?: string;

  @IsOptional()
  @IsObject()
  weightsConfig?: {
    studentReviews?: number;
    academicQuality?: number;
    infrastructure?: number;
    hostelMess?: number;
    placementOutcomes?: number;
    swayamVerification?: number;
  };

  @IsOptional()
  @IsInt()
  @Min(1)
  minReviewThreshold?: number;

  @IsOptional()
  @IsString()
  dataCutoffDate?: string;
}

export class ApproveRankingDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class PublishRankingDto {
  @IsOptional()
  @IsString()
  unpublishReason?: string;
}
