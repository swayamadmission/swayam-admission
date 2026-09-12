import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class AssignCounselorDto {
  @IsNotEmpty()
  @IsString()
  counselorId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  overrideCapacity?: boolean;
}
