import { IsString, IsOptional, IsEnum, IsBoolean, IsInt } from 'class-validator';

export class CreateCrmActivityDto {
  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsString()
  channel: string; // CALL, WHATSAPP, SMS, EMAIL, MEETING, COUNSELING, NOTE, FOLLOW_UP, SYSTEM_EVENT

  @IsOptional()
  @IsString()
  direction?: string; // OUTBOUND, INBOUND, INTERNAL, SYSTEM

  @IsOptional()
  @IsString()
  category?: string; // STAFF_ACTIVITY | SYSTEM_EVENT

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  callOutcome?: string; // CONNECTED, NO_ANSWER, BUSY, CALL_BACK_REQUESTED, WRONG_NUMBER, INTERESTED, NOT_INTERESTED, CONVERTED

  @IsOptional()
  @IsInt()
  callDurationSecs?: number;

  @IsOptional()
  @IsString()
  meetingMode?: string; // CALL, VIDEO, IN_PERSON, OTHER

  @IsOptional()
  @IsString()
  meetingOutcome?: string;

  @IsOptional()
  @IsString()
  visibility?: string; // INTERNAL | STUDENT_VISIBLE

  @IsOptional()
  metadata?: any;

  @IsOptional()
  occurredAt?: string;
}
