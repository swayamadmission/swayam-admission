import { PartialType } from '@nestjs/swagger';
import { CreateOfferingDto } from './create-offering.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateOfferingDto extends PartialType(CreateOfferingDto) {
  @IsOptional()
  @IsString()
  changeReason?: string;
}
