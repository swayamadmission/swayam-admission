import { PartialType } from '@nestjs/mapped-types';
import { CreateCampaignDto } from './create-campaign.dto';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {
  @IsOptional()
  @IsNumber()
  spentAmount?: number;

  @IsOptional()
  @IsNumber()
  actualLeads?: number;

  @IsOptional()
  @IsNumber()
  actualAdmissions?: number;

  @IsOptional()
  @IsNumber()
  actualRevenue?: number;

  @IsOptional()
  @IsNumber()
  impressions?: number;

  @IsOptional()
  @IsNumber()
  clicks?: number;
}
