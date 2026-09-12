import { IsString, IsOptional } from 'class-validator';

export class CompleteTaskDto {
  @IsOptional()
  @IsString()
  outcome?: string; // CONNECTED, COMPLETED, CALLBACK, NOT_INTERESTED, WRONG_NUMBER, CONVERTED, NO_ANSWER, OTHER

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  nextFollowUpDate?: string;
}
