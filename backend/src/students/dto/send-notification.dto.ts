import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class SendStudentNotificationDto {
  @IsString()
  @IsNotEmpty()
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  metadata?: any;
}
