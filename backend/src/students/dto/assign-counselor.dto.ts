import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignCounselorDto {
  @IsString()
  @IsNotEmpty()
  counselorId: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
