import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class GenerateRecommendationDto {
  @IsString()
  stream: string;

  @IsOptional()
  @IsNumber()
  budgetMax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredStates?: string[];

  @IsOptional()
  @IsString()
  category?: string; // Student Category, e.g., General, OBC, SC, ST
}
