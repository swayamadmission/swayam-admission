import {
  IsString,
  IsNotEmpty,
  IsEmail,
  Matches,
  MinLength,
  MaxLength,
  IsBoolean,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class CreateContactEnquiryDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Please enter a valid 10-digit Indian mobile number',
  })
  mobile: string;

  @IsString()
  @IsNotEmpty({ message: 'Subject is required' })
  @MinLength(3, { message: 'Subject must be at least 3 characters long' })
  @MaxLength(150, { message: 'Subject cannot exceed 150 characters' })
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'Please select an enquiry category' })
  category: string;

  // Optional fields:
  @IsOptional()
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email.trim() !== '')
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000, { message: 'Message cannot exceed 3000 characters' })
  message?: string;

  @IsOptional()
  @IsBoolean()
  consent?: boolean;

  @IsOptional()
  @IsString()
  department?: string;
}
