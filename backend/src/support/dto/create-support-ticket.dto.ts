import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  category?: string = 'General Query';

  @IsString()
  @IsOptional()
  priority?: string = 'MEDIUM';

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  collegeId?: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  applicationId?: string;

  @IsString()
  @IsOptional()
  paymentId?: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsString()
  @IsOptional()
  attachmentName?: string;
}
