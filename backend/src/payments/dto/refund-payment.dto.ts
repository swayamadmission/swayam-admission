import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RefundPaymentDto {
  @IsString()
  paymentId: string;

  @IsNumber()
  refundAmount: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  refundReference?: string;
}
