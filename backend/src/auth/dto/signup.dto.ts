import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  mobile!: string;

  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}

