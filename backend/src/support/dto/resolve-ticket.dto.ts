import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ResolveTicketDto {
  @IsString()
  @IsNotEmpty()
  resolutionSummary: string;

  @IsString()
  @IsOptional()
  resolutionCode?: string = 'GENERAL_RESOLUTION';
}
