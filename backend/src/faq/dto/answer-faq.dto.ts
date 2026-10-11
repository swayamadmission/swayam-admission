import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsBoolean,
} from 'class-validator';

export class AnswerFaqDto {
  @IsString()
  @IsNotEmpty()
  answer: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  submitForReview?: boolean;

  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
