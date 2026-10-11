import { IsString, IsNotEmpty, IsOptional, IsEmail, IsArray, IsEnum, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  qualification?: string;

  @IsString()
  @IsOptional()
  experience?: string;

  @IsString()
  @IsOptional()
  previousOrganization?: string;

  @IsString()
  @IsOptional()
  currentDesignation?: string;

  @IsArray()
  @IsOptional()
  skills?: string[];

  @IsString()
  @IsOptional()
  expectedSalary?: string;

  @IsString()
  @IsOptional()
  noticePeriod?: string;

  @IsString()
  @IsOptional()
  linkedInUrl?: string;

  @IsString()
  @IsOptional()
  portfolioUrl?: string;

  @IsString()
  @IsOptional()
  coverLetter?: string;

  @IsString()
  @IsOptional()
  additionalInfo?: string;

  @IsString()
  @IsOptional()
  resumeUrl?: string;

  @IsString()
  @IsOptional()
  resumeFileName?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  resumeFileSize?: number;

  @IsString()
  @IsOptional()
  resumeMimeType?: string;
}

export class UpdateApplicationStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class AssignRecruiterDto {
  @IsString()
  @IsNotEmpty()
  recruiterId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AddNoteDto {
  @IsString()
  @IsNotEmpty()
  note: string;

  @IsString()
  @IsOptional()
  type?: string; // NOTE, FOLLOW_UP, CALL, EMAIL
}

export class ScheduleInterviewDto {
  @IsString()
  @IsOptional()
  interviewType?: string; // ONLINE, OFFLINE

  @IsString()
  @IsNotEmpty()
  interviewDate: string; // ISO date

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  interviewerId?: string;

  @IsString()
  @IsOptional()
  meetingLink?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  instructions?: string;
}

export class UpdateInterviewDto {
  @IsString()
  @IsOptional()
  interviewType?: string;

  @IsString()
  @IsOptional()
  interviewDate?: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  interviewerId?: string;

  @IsString()
  @IsOptional()
  meetingLink?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  status?: string; // SCHEDULED, COMPLETED, CANCELLED, NO_SHOW

  @IsString()
  @IsOptional()
  result?: string; // SELECTED, REJECTED, HOLD

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class UpdateRecruitmentSettingsDto {
  @IsEmail()
  @IsOptional()
  recruitmentEmail?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value, obj }) => value || obj?.hrDisplayName)
  recruitmentDisplayName?: string;

  @IsOptional()
  hrDisplayName?: string;

  @IsEmail()
  @IsOptional()
  replyToEmail?: string;

  @IsArray()
  @IsOptional()
  @Transform(({ value, obj }) => {
    const raw = value || obj?.ccEmail;
    if (typeof raw === 'string') {
      return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    return raw;
  })
  ccEmails?: string[];

  @IsOptional()
  ccEmail?: string;

  @IsArray()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    return value;
  })
  bccEmails?: string[];

  @IsOptional()
  @Transform(({ value, obj }) =>
    value !== undefined ? value : obj?.candidateAcknowledgementEnabled,
  )
  candidateAckEnabled?: boolean;

  @IsOptional()
  candidateAcknowledgementEnabled?: boolean;

  @IsOptional()
  adminNotificationEnabled?: boolean;

  @IsOptional()
  resumeAttachmentEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  @Transform(({ value, obj }) => {
    const raw = value !== undefined ? value : obj?.maxResumeSizeMb;
    return raw !== undefined ? Number(raw) : undefined;
  })
  maxResumeSizeMB?: number;

  @IsOptional()
  maxResumeSizeMb?: number;

  @IsArray()
  @IsOptional()
  @Transform(({ value, obj }) => {
    const raw = value || obj?.allowedFileFormats;
    if (typeof raw === 'string') {
      return raw.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    }
    return raw;
  })
  allowedResumeFormats?: string[];

  @IsOptional()
  allowedFileFormats?: string | string[];

  @IsString()
  @IsOptional()
  applicationIdPrefix?: string;

  @IsString()
  @IsOptional()
  heroTitle?: string;

  @IsString()
  @IsOptional()
  heroSubtitle?: string;

  @IsOptional()
  autoSendRejectionEmail?: boolean;

  @IsOptional()
  autoSendShortlistEmail?: boolean;
}

export class CreateOfferDto {
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @IsString()
  @IsNotEmpty()
  designation: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsOptional()
  employmentType?: string; // FULL_TIME, PART_TIME, CONTRACT, INTERN

  @IsString()
  @IsOptional()
  workMode?: string; // ON_SITE, REMOTE, HYBRID

  @IsString()
  @IsOptional()
  workLocation?: string;

  @IsString()
  @IsOptional()
  reportingManager?: string;

  @IsString()
  @IsNotEmpty()
  joiningDate: string;

  @IsString()
  @IsNotEmpty()
  salary: string;

  @IsString()
  @IsOptional()
  salaryFrequency?: string; // PER_YEAR, PER_MONTH

  @IsString()
  @IsOptional()
  validUntil?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  terms?: string;

  @IsString()
  @IsOptional()
  offerLetterUrl?: string;

  @IsOptional()
  sendImmediately?: boolean;
}

export class RespondOfferDto {
  @IsString()
  @IsNotEmpty()
  action: 'ACCEPT' | 'DECLINE';

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  channel?: string;
}

export class UpdateClearanceItemDto {
  @IsString()
  @IsNotEmpty()
  status: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'FAILED' | 'NOT_REQUIRED';

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  failureReason?: string;

  @IsString()
  @IsOptional()
  documentUrl?: string;
}

export class CompleteClearanceDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  approveAllItems?: boolean;
}

export class StartOnboardingDto {
  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  joiningDate?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsString()
  @IsOptional()
  reportingManager?: string;

  @IsString()
  @IsOptional()
  workLocation?: string;

  @IsString()
  @IsOptional()
  workMode?: string;

  @IsString()
  @IsOptional()
  employmentType?: string;

  @IsEmail()
  @IsOptional()
  officialEmail?: string;

  @IsString()
  @IsOptional()
  officialMobile?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CompleteOnboardingDto {
  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsEmail()
  @IsOptional()
  officialEmail?: string;

  @IsString()
  @IsOptional()
  officialMobile?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

