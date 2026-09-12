import { IsNotEmpty, IsString } from 'class-validator';

export class LeadNoteDto {
  @IsNotEmpty()
  @IsString()
  content: string;
}
