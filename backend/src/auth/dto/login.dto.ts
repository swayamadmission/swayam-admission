import { IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email address or 10-digit mobile number',
    example: 'admin@swayamadmission.in',
  })
  @IsNotEmpty({ message: 'Email or mobile number is required' })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'admin123',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiPropertyOptional({
    description: 'The domain the user is logging in from (PUBLIC, ADMIN, ERP)',
    example: 'PUBLIC',
  })
  @IsOptional()
  @IsEnum(['PUBLIC', 'ADMIN', 'ERP'])
  domain?: 'PUBLIC' | 'ADMIN' | 'ERP';
}
