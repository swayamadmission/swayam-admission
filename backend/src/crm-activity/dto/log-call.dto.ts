import { IsString, IsOptional, IsInt, IsNotEmpty } from 'class-validator';

export class LogCallDto {
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
  outcome: string; // CONNECTED, NO_ANSWER, BUSY, CALL_BACK_REQUESTED, WRONG_NUMBER, INTERESTED, NOT_INTERESTED, CONVERTED

  @IsOptional()
  @IsInt()
  durationSecs?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  direction?: string; // OUTBOUND | INBOUND

  @IsOptional()
  @IsString()
  nextFollowUpDate?: string;

  @IsOptional()
  @IsString()
  nextFollowUpTitle?: string;

  @IsOptional()
  occurredAt?: string;
}
