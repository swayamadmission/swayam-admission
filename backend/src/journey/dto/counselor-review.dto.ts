import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubmitCounselorReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  counselorId?: string;
}
