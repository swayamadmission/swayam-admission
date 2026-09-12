import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class UpdateAISettingsDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  topP?: number;

  @IsOptional()
  @IsNumber()
  frequencyPenalty?: number;

  @IsOptional()
  @IsNumber()
  presencePenalty?: number;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsNumber()
  confidenceThreshold?: number;

  @IsOptional()
  @IsBoolean()
  escalationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoLeadCreation?: boolean;

  @IsOptional()
  @IsBoolean()
  autoLeadScoring?: boolean;

  @IsOptional()
  @IsBoolean()
  ragEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  topKChunks?: number;

  @IsOptional()
  @IsNumber()
  rateLimitPerMin?: number;

  @IsOptional()
  @IsNumber()
  dailyCostCap?: number;
}
