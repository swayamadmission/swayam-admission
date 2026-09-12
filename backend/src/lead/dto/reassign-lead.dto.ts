import { IsNotEmpty, IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class ReassignLeadDto {
  @IsNotEmpty()
  @IsString()
  targetUserId: string;

  @IsNotEmpty()
  @IsEnum(['SENIOR_COUNSELOR', 'COUNSELOR'])
  targetRole: 'SENIOR_COUNSELOR' | 'COUNSELOR';

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsBoolean()
  overrideCapacity?: boolean;
}
