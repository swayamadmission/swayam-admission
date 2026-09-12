import { IsArray, IsNotEmpty, IsString, IsOptional, IsBoolean, ArrayMaxSize, ArrayMinSize } from 'class-validator';

export class BulkReassignLeadsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  leadIds: string[];

  @IsNotEmpty()
  @IsString()
  targetCounselorId: string;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsBoolean()
  overrideCapacity?: boolean;
}
