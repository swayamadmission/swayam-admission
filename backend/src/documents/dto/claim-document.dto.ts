import { IsOptional, IsString } from 'class-validator';

export class ClaimDocumentDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}
