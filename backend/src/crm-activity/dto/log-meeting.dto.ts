import { IsString, IsOptional, IsInt, IsNotEmpty } from 'class-validator';

export class LogMeetingDto {
  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  mode?: string; // CALL, VIDEO, IN_PERSON, OTHER

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  durationMins?: number;

  @IsOptional()
  @IsString()
  nextFollowUpDate?: string;

  @IsOptional()
  occurredAt?: string;
}
