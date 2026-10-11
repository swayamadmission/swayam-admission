import { IsOptional, IsString } from 'class-validator';

export class GetConversationQueryDto {
  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  counselorId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;
}
