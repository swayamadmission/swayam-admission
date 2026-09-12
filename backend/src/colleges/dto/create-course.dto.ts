import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  duration: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  seats: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  fees: number;
}
