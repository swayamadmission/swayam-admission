import { IsNotEmpty, IsString } from 'class-validator';

export class AssignLeadDto {
  @IsNotEmpty()
  @IsString()
  counselorId: string;
}
