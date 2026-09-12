import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateCounselorDto {
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  mobile!: string;

  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}
