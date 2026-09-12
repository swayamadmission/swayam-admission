import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateGovernanceRequestDto {
  @IsString()
  actionType: string;

  @IsOptional()
  @IsString()
  targetRoleId?: string;

  @IsOptional()
  @IsObject()
  payload?: any;

  @IsString()
  reason: string;
}
