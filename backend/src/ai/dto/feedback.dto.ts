import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class FeedbackDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  messageId?: string;

  @IsNotEmpty()
  @IsNumber()
  rating: number;

  @IsOptional()
  @IsString()
  feedbackText?: string;

  @IsOptional()
  @IsBoolean()
  isCorrected?: boolean;

  @IsOptional()
  @IsString()
  correctedText?: string;
}
