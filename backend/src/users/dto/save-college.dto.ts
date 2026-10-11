import { IsString, IsOptional } from 'class-validator';

export class SaveCollegeDto {
  @IsOptional()
  @IsString()
  collegeId?: string;

  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
