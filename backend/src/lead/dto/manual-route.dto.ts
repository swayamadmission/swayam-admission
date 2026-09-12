import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ManualRouteDto {
  @IsNotEmpty()
  @IsString()
  seniorCounselorId: string;

  @IsNotEmpty()
  @IsString()
  reason: string;
}
