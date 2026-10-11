import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PaymentsService } from './payments.service';

@Controller('payments/webhook')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  async handleRazorpayWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-razorpay-signature') signature?: string,
    @Headers('x-razorpay-event-id') eventIdHeader?: string,
  ) {
    if (!signature) {
      this.logger.warn('Razorpay webhook received without x-razorpay-signature header.');
      throw new BadRequestException('Missing webhook signature.');
    }

    const payload = req.body;
    const rawBody =
      (req as any).rawBody ||
      (typeof payload === 'string' ? payload : JSON.stringify(payload));

    const result = await this.paymentsService.handleRazorpayWebhook(
      rawBody,
      payload,
      signature,
      eventIdHeader,
    );

    return res.status(HttpStatus.OK).json(result);
  }
}
