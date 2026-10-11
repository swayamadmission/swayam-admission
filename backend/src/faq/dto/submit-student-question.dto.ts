import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class SubmitStudentQuestionDto {
  @IsString()
  @IsNotEmpty({ message: 'Question is required' })
  @MinLength(10, { message: 'Question must be at least 10 characters long' })
  @MaxLength(500, { message: 'Question cannot exceed 500 characters' })
  question: string;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'Additional details cannot exceed 2000 characters',
  })
  additionalDetails?: string;
}
