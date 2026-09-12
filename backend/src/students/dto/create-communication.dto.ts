import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateStudentCommunicationDto {
  @IsString()
  @IsNotEmpty()
  channel: string; // EMAIL, SMS, WHATSAPP, PUSH, CALL, MEETING, INTERNAL_NOTE

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  type?: string; // INBOUND, OUTBOUND, SYSTEM

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  metadata?: any;

  @IsArray()
  @IsOptional()
  attachments?: string[];
}
