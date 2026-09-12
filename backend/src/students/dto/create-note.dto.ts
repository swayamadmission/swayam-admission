import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateStudentNoteDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  noteType?: string; // GENERAL, PRIVATE, COUNSELOR, MANAGER, ADMIN

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsArray()
  @IsOptional()
  attachments?: string[];
}
