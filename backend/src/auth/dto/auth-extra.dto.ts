import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  token: string;

  @MinLength(6)
  newPassword: string;
}
