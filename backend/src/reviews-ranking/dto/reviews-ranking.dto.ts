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
  IsBoolean,
  IsArray,
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

export enum RankingCycleStatus {
  DRAFT = 'DRAFT',
  DATA_COLLECTION = 'DATA_COLLECTION',
  SURVEY_ACTIVE = 'SURVEY_ACTIVE',
  ANALYSIS = 'ANALYSIS',
  REPORT_GENERATED = 'REPORT_GENERATED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum RankingPillar {
  ACADEMIC_EXCELLENCE = 'ACADEMIC_EXCELLENCE',
  PLACEMENT_CAREER = 'PLACEMENT_CAREER',
  STUDENT_DEMAND_EXPERIENCE = 'STUDENT_DEMAND_EXPERIENCE',
  INFRASTRUCTURE_CAMPUS = 'INFRASTRUCTURE_CAMPUS',
  LOCATION_CONNECTIVITY = 'LOCATION_CONNECTIVITY',
  HOSTEL_LIVING_EXPERIENCE = 'HOSTEL_LIVING_EXPERIENCE',
  SAFETY_HEALTHCARE = 'SAFETY_HEALTHCARE',
  AFFORDABILITY_ROI = 'AFFORDABILITY_ROI',
  TRUST_TRANSPARENCY = 'TRUST_TRANSPARENCY',
}

export const OFFICIAL_NINE_PILLARS = {
  academicExcellence: 0.15,
  placementCareer: 0.10,
  studentDemandExperience: 0.20,
  infrastructureCampus: 0.15,
  locationConnectivity: 0.10,
  hostelLivingExperience: 0.10,
  safetyHealthcare: 0.05,
  affordabilityRoi: 0.05,
  trustTransparency: 0.10,
};

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
  category: string;

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
  @IsString()
  methodologyId?: string;

  @IsOptional()
  @IsString()
  methodologyVersion?: string;

  @IsOptional()
  @IsObject()
  weightsConfig?: {
    academicExcellence?: number;
    placementCareer?: number;
    studentDemandExperience?: number;
    infrastructureCampus?: number;
    locationConnectivity?: number;
    hostelLivingExperience?: number;
    safetyHealthcare?: number;
    affordabilityRoi?: number;
    trustTransparency?: number;
    // Backward compatibility aliases
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

// ----------------------------------------------------
// Annual Cycle DTOs
// ----------------------------------------------------

export class CreateRankingCycleDto {
  @IsNotEmpty()
  @IsInt()
  year: number;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  methodologyId?: string;

  @IsOptional()
  @IsString()
  dataCollectionStart?: string;

  @IsOptional()
  @IsString()
  dataCollectionEnd?: string;

  @IsOptional()
  @IsString()
  surveyStart?: string;

  @IsOptional()
  @IsString()
  surveyEnd?: string;

  @IsOptional()
  @IsString()
  reviewStart?: string;

  @IsOptional()
  @IsString()
  reviewEnd?: string;

  @IsOptional()
  @IsString()
  analysisStart?: string;
}

export class UpdateRankingCycleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(RankingCycleStatus)
  status?: RankingCycleStatus;

  @IsOptional()
  @IsString()
  methodologyId?: string;

  @IsOptional()
  @IsString()
  dataCollectionStart?: string;

  @IsOptional()
  @IsString()
  dataCollectionEnd?: string;

  @IsOptional()
  @IsString()
  surveyStart?: string;

  @IsOptional()
  @IsString()
  surveyEnd?: string;

  @IsOptional()
  @IsString()
  reviewStart?: string;

  @IsOptional()
  @IsString()
  reviewEnd?: string;

  @IsOptional()
  @IsString()
  analysisStart?: string;
}

// ----------------------------------------------------
// Methodology DTOs
// ----------------------------------------------------

export class CreateMethodologyDto {
  @IsNotEmpty()
  @IsString()
  version: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsObject()
  pillarsConfig: Record<string, any>;

  @IsOptional()
  @IsObject()
  rulesConfig?: Record<string, any>;
}

export class UpdateMethodologyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsObject()
  pillarsConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  rulesConfig?: Record<string, any>;
}

// ----------------------------------------------------
// Student College Report DTOs
// ----------------------------------------------------

export class SubmitStudentReportDto {
  @IsNotEmpty()
  @IsString()
  collegeId: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsInt()
  rankingYear?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  detailedReview?: string;

  @IsOptional()
  @IsArray()
  evidenceUrls?: string[];

  // 9 Pillar Ratings (1 - 5 stars)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  academicRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  placementRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  studentDemandRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  infrastructureRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  connectivityRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  hostelLivingRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  dailyConvenienceRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  safetyHealthcareRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  affordabilityRoiRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  trustTransparencyRating?: number;
}

export class ModerateStudentReportDto {
  @IsNotEmpty()
  @IsString()
  action: 'VERIFY' | 'REJECT' | 'FLAG' | 'PUBLISH' | 'ARCHIVE';

  @IsOptional()
  @IsString()
  reason?: string;
}

// ----------------------------------------------------
// Manual Survey DTOs
// ----------------------------------------------------

export class CreateSurveyDto {
  @IsNotEmpty()
  @IsInt()
  rankingYear: number;

  @IsNotEmpty()
  @IsString()
  collegeId: string;

  @IsOptional()
  @IsString()
  editionId?: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsString()
  surveyorId?: string;

  @IsOptional()
  @IsString()
  scheduledDate?: string;
}

export class SurveyResponseItemDto {
  @IsNotEmpty()
  @IsString()
  pillar: string;

  @IsNotEmpty()
  @IsString()
  criterion: string;

  @IsNotEmpty()
  @IsString()
  metric: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsOptional()
  @IsString()
  observation?: string;

  @IsOptional()
  @IsArray()
  evidenceUrls?: string[];
}

export class SubmitSurveyResponsesDto {
  @IsNotEmpty()
  @IsArray()
  responses: SurveyResponseItemDto[];
}

export class ReviewSurveyDto {
  @IsNotEmpty()
  @IsString()
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

// ----------------------------------------------------
// Verification Queue DTOs
// ----------------------------------------------------

export class CreateDataPointDto {
  @IsNotEmpty()
  @IsString()
  collegeId: string;

  @IsNotEmpty()
  @IsInt()
  rankingYear: number;

  @IsNotEmpty()
  @IsString()
  pillar: string;

  @IsNotEmpty()
  @IsString()
  metricKey: string;

  @IsNotEmpty()
  @IsString()
  metricName: string;

  @IsNotEmpty()
  @IsString()
  rawValue: string;

  @IsNotEmpty()
  @IsNumber()
  normalizedValue: number;

  @IsNotEmpty()
  @IsString()
  sourceType: string;

  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @IsOptional()
  @IsNumber()
  confidenceWeight?: number;

  @IsOptional()
  @IsString()
  validUntil?: string;
}

export class VerifyDataPointDto {
  @IsNotEmpty()
  @IsString()
  action: 'VERIFY' | 'REJECT' | 'FLAG';

  @IsOptional()
  @IsString()
  verifierNotes?: string;
}

// ----------------------------------------------------
// Annual Research Report DTOs
// ----------------------------------------------------

export class GenerateAnnualReportDto {
  @IsNotEmpty()
  @IsInt()
  rankingYear: number;

  @IsOptional()
  @IsString()
  title?: string;
}

export class ApproveAnnualReportDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}
