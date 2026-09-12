import { IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class UpdateCounselorDto {
  @IsOptional()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  mobile?: string;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}
