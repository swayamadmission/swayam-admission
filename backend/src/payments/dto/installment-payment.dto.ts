import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class InstallmentPaymentDto {
  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  installmentNumber: number;

  @IsNumber()
  totalInstallments: number;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  remarks?: string;
}
