import { IsNotEmpty, IsNumber, IsString, Min, Max } from 'class-validator';

export class SaveRecommendationDto {
  @IsNotEmpty()
  @IsString()
  collegeId: string;

  @IsNotEmpty()
  @IsString()
  courseId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsNotEmpty()
  @IsString()
  reasoning: string;
}
