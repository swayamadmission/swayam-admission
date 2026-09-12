import { IsDateString, IsString, IsNotEmpty } from 'class-validator';

export class RescheduleTaskDto {
  @IsDateString()
  newDueDate: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
