import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsIn } from 'class-validator';

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsString()
  refresh_token?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ForgotPasswordSendOtpDto {
  @IsNotEmpty()
  @IsIn(['MOBILE', 'EMAIL'], { message: 'Method must be either MOBILE or EMAIL' })
  method: 'MOBILE' | 'EMAIL';

  @IsNotEmpty({ message: 'Mobile number or email address is required' })
  identifier: string;
}

export class ForgotPasswordVerifyOtpDto {
  @IsNotEmpty()
  @IsIn(['MOBILE', 'EMAIL'], { message: 'Method must be either MOBILE or EMAIL' })
  method: 'MOBILE' | 'EMAIL';

  @IsNotEmpty()
  identifier: string;

  @IsNotEmpty({ message: '6-digit OTP is required' })
  otp: string;
}

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;

  @IsOptional()
  confirmPassword?: string;
}

export class ResetPasswordWithTokenDto {
  @IsNotEmpty({ message: 'Reset token is required' })
  resetToken: string;

  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;

  @IsNotEmpty({ message: 'Confirm password is required' })
  @MinLength(6, { message: 'Confirm password must be at least 6 characters' })
  confirmPassword: string;
}

export class SendRegistrationMobileOtpDto {
  @IsNotEmpty({ message: 'Mobile number is required' })
  mobile: string;
}

export class VerifyRegistrationMobileOtpDto {
  @IsNotEmpty({ message: 'Mobile number is required' })
  mobile: string;

  @IsNotEmpty({ message: '6-digit OTP is required' })
  otp: string;
}

export class SendRegistrationEmailOtpDto {
  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail()
  email: string;
}

export class VerifyRegistrationEmailOtpDto {
  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: '6-digit OTP is required' })
  otp: string;
}


export class SendMobileOtpDto {
  @IsNotEmpty()
  mobile: string;
}

export class VerifyMobileOtpDto {
  @IsNotEmpty()
  mobile: string;

  @IsNotEmpty()
  otp: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class GoogleAuthDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  googleId?: string;

  @IsOptional()
  @IsString()
  idToken?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class SendEmailVerificationDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class VerifyEmailDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNotEmpty({ message: '6-digit verification code is required' })
  code: string;
}

export class SendMobileVerificationDto {
  @IsNotEmpty({ message: 'Mobile number is required' })
  mobile: string;
}

export class VerifyUserMobileDto {
  @IsNotEmpty({ message: 'Mobile number is required' })
  mobile: string;

  @IsNotEmpty({ message: '6-digit verification code is required' })
  otp: string;
}

export class FirstLoginSendOtpDto {
  @IsNotEmpty({ message: 'Employee ID or registered email is required' })
  @IsString()
  identifier: string;
}

export class FirstLoginChangePasswordDto {
  @IsNotEmpty({ message: 'Employee ID or registered email is required' })
  @IsString()
  identifier: string;

  @IsNotEmpty({ message: 'Current temporary password is required' })
  @IsString()
  currentPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @IsString()
  newPassword: string;

  @IsNotEmpty({ message: 'Confirm password is required' })
  @IsString()
  confirmPassword: string;

  @IsNotEmpty({ message: 'Email verification OTP is required' })
  @IsString()
  otp: string;
}
