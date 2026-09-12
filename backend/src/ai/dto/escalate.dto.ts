import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EscalateDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  counselorId?: string;
}
