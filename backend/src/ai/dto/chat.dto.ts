import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  studentProfile?: any;
}
