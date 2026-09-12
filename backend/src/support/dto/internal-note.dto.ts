import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class InternalNoteDto {
  @IsString()
  @IsNotEmpty()
  note: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsString()
  @IsOptional()
  attachmentName?: string;
}
