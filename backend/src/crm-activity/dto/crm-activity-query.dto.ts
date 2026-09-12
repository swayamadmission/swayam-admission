import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CrmActivityQueryDto {
  @IsOptional()
  @IsString()
  channel?: string; // CALL, WHATSAPP, EMAIL, MEETING, NOTE, SYSTEM_EVENT, ALL

  @IsOptional()
  @IsString()
  category?: string; // STAFF_ACTIVITY | SYSTEM_EVENT | ALL

  @IsOptional()
  @IsString()
  visibility?: string; // INTERNAL | STUDENT_VISIBLE | ALL

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
