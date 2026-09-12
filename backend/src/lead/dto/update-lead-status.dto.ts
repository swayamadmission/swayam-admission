import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LeadStage } from '@prisma/client';

export class UpdateLeadStatusDto {
  @IsNotEmpty()
  @IsEnum(LeadStage)
  status: LeadStage;

  @IsOptional()
  @IsString()
  remarks?: string;
}
