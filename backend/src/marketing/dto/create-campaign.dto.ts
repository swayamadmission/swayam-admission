import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CampaignType, CampaignStatus } from '@prisma/client';

export class CreateCampaignDto {
  @IsNotEmpty()
  @IsString()
  campaignName: string;

  @IsNotEmpty()
  @IsString()
  campaignCode: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsEnum(CampaignType)
  campaignType?: CampaignType = CampaignType.ADMISSION_CAMPAIGN;

  @IsOptional()
  @IsString()
  source?: string = 'WEBSITE';

  @IsOptional()
  @IsString()
  medium?: string = 'CPC';

  @IsOptional()
  @IsString()
  channel?: string = 'ONLINE';

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus = CampaignStatus.ACTIVE;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  dailyBudget?: number = 0;

  @IsOptional()
  @IsNumber()
  totalBudget?: number = 0;

  @IsOptional()
  @IsNumber()
  expectedLeads?: number = 0;

  @IsOptional()
  @IsNumber()
  expectedAdmissions?: number = 0;

  @IsOptional()
  @IsNumber()
  expectedRevenue?: number = 0;
}
