import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestCorrectionDto {
  @IsNotEmpty({ message: 'Student-facing correction instructions are required' })
  @IsString()
  @MaxLength(500)
  studentMessage: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNotes?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
