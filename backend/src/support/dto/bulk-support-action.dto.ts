import { IsArray, IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum BulkSupportActionType {
  ASSIGN = 'ASSIGN',
  CHANGE_STATUS = 'CHANGE_STATUS',
  CHANGE_PRIORITY = 'CHANGE_PRIORITY',
  CLOSE = 'CLOSE',
}

export class BulkSupportActionDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ticketIds: string[];

  @IsEnum(BulkSupportActionType)
  action: BulkSupportActionType;

  @IsString()
  @IsOptional()
  assignedToId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
