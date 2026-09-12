import { IsNotEmpty, IsString } from 'class-validator';

export class AssignCounselorDto {
  @IsNotEmpty()
  @IsString()
  counselorId: string;
}
