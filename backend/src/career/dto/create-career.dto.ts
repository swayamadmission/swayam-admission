import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateCareerDto {
  @IsString()
  careerName: string;

  @IsString()
  slug: string;

  @IsString()
  stream: string;

  @IsOptional()
  @IsString()
  requiredQualification?: string;

  @IsOptional()
  @IsNumber()
  averageSalary?: number;

  @IsOptional()
  @IsString()
  growthRate?: string;

  @IsOptional()
  @IsString()
  futureScope?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  roadmap?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedCareers?: string[];
}
