import { IsString, IsNotEmpty } from 'class-validator';

export class ReassignTaskDto {
  @IsString()
  @IsNotEmpty()
  newAssignedToId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
