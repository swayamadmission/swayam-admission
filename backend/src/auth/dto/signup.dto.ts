import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsNotEmpty({ message: 'Full name is required' })
  fullName!: string;

  @IsNotEmpty({ message: 'Mobile number is required' })
  mobile!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address format' })
  email?: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;

  @IsNotEmpty({ message: 'Confirm password is required' })
  @MinLength(6, { message: 'Confirm password must be at least 6 characters' })
  confirmPassword!: string;

  @IsNotEmpty({ message: 'State is required' })
  @IsString()
  state!: string;

  @IsNotEmpty({ message: 'District is required' })
  @IsString()
  district!: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  verificationToken?: string;

  @IsOptional()
  @IsString()
  emailVerificationToken?: string;

  @IsOptional()
  termsAccepted?: boolean;

  @IsOptional()
  privacyAccepted?: boolean;

  @IsOptional()
  acceptedPolicies?: Array<{
    policyId?: string;
    policyType: string;
    policyVersion: string;
  }>;
}
