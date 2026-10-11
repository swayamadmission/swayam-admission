import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @MaxLength(2000, { message: 'Message text exceeds maximum allowed length of 2000 characters' })
  text: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
