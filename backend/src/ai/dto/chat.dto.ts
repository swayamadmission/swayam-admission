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
  @IsString()
  category?: string;

  @IsOptional()
  studentProfile?: any;

  @IsOptional()
  context?: any;
}
