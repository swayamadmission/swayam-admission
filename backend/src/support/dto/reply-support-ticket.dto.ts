import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class ReplySupportTicketDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean = false;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsString()
  @IsOptional()
  attachmentName?: string;
}
