import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface CreateOrderParams {
  amount: number;
  currency: string;
  receiptId: string;
  studentName?: string;
  studentEmail?: string;
  studentMobile?: string;
  metadata?: any;
}

export interface OrderResponse {
  orderId: string;
  gateway: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: any;
}

export interface VerifyPayload {
  orderId: string;
  paymentId: string;
  signature?: string;
}

export interface RefundParams {
  transactionId: string;
  amount: number;
  reason?: string;
}

export interface RefundResponse {
  refundId: string;
  status: string;
  amount: number;
  gateway: string;
}

export interface IPaymentGateway {
  name: string;
  createOrder(params: CreateOrderParams): Promise<OrderResponse>;
  verifySignature(payload: VerifyPayload): Promise<boolean>;
  refund(params: RefundParams): Promise<RefundResponse>;
}

export class ManualGateway implements IPaymentGateway {
  name = 'Manual';

  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    const orderId = `ORD_MANUAL_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      orderId,
      gateway: this.name,
      amount: params.amount,
      currency: params.currency || 'INR',
      status: 'CREATED',
    };
  }

  async verifySignature(): Promise<boolean> {
    return true;
  }

  async refund(params: RefundParams): Promise<RefundResponse> {
    return {
      refundId: `RFD_MANUAL_${Date.now()}`,
      status: 'COMPLETED',
      amount: params.amount,
      gateway: this.name,
    };
  }
}

export class RazorpayGateway implements IPaymentGateway {
  name = 'Razorpay';

  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    const orderId = `order_rzp_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      orderId,
      gateway: this.name,
      amount: params.amount,
      currency: params.currency || 'INR',
      status: 'created',
      metadata: {
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      },
    };
  }

  async verifySignature(payload: VerifyPayload): Promise<boolean> {
    if (!payload.orderId || !payload.paymentId || !payload.signature) {
      return false;
    }
    const secret =
      process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_swayam_admission_2026';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${payload.orderId}|${payload.paymentId}`)
      .digest('hex');

    try {
      const generatedBuf = Buffer.from(generatedSignature, 'utf8');
      const signatureBuf = Buffer.from(payload.signature, 'utf8');
      if (generatedBuf.length !== signatureBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(generatedBuf, signatureBuf);
    } catch {
      return false;
    }
  }

  async refund(params: RefundParams): Promise<RefundResponse> {
    return {
      refundId: `rfnd_rzp_${Date.now()}`,
      status: 'processed',
      amount: params.amount,
      gateway: this.name,
    };
  }
}

export class PhonePeGateway implements IPaymentGateway {
  name = 'PhonePe';

  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    const orderId = `PP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      orderId,
      gateway: this.name,
      amount: params.amount,
      currency: params.currency || 'INR',
      status: 'PAYMENT_PENDING',
    };
  }

  async verifySignature(): Promise<boolean> {
    return true;
  }

  async refund(params: RefundParams): Promise<RefundResponse> {
    return {
      refundId: `rfnd_pp_${Date.now()}`,
      status: 'SUCCESS',
      amount: params.amount,
      gateway: this.name,
    };
  }
}

export class CashfreeGateway implements IPaymentGateway {
  name = 'Cashfree';

  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    const orderId = `CF_${Date.now()}`;
    return {
      orderId,
      gateway: this.name,
      amount: params.amount,
      currency: params.currency || 'INR',
      status: 'ACTIVE',
    };
  }

  async verifySignature(): Promise<boolean> {
    return true;
  }

  async refund(params: RefundParams): Promise<RefundResponse> {
    return {
      refundId: `rfnd_cf_${Date.now()}`,
      status: 'SUCCESS',
      amount: params.amount,
      gateway: this.name,
    };
  }
}

export class StripeGateway implements IPaymentGateway {
  name = 'Stripe';

  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    const orderId = `pi_${Date.now()}`;
    return {
      orderId,
      gateway: this.name,
      amount: params.amount,
      currency: params.currency || 'INR',
      status: 'requires_payment_method',
    };
  }

  async verifySignature(): Promise<boolean> {
    return true;
  }

  async refund(params: RefundParams): Promise<RefundResponse> {
    return {
      refundId: `re_${Date.now()}`,
      status: 'succeeded',
      amount: params.amount,
      gateway: this.name,
    };
  }
}

export class PaytmGateway implements IPaymentGateway {
  name = 'Paytm';

  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    const orderId = `PYTM_${Date.now()}`;
    return {
      orderId,
      gateway: this.name,
      amount: params.amount,
      currency: params.currency || 'INR',
      status: 'INITIATED',
    };
  }

  async verifySignature(): Promise<boolean> {
    return true;
  }

  async refund(params: RefundParams): Promise<RefundResponse> {
    return {
      refundId: `rfnd_pytm_${Date.now()}`,
      status: 'TXN_SUCCESS',
      amount: params.amount,
      gateway: this.name,
    };
  }
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private providers: Map<string, IPaymentGateway> = new Map();

  constructor() {
    this.providers.set('manual', new ManualGateway());
    this.providers.set('razorpay', new RazorpayGateway());
    this.providers.set('phonepe', new PhonePeGateway());
    this.providers.set('cashfree', new CashfreeGateway());
    this.providers.set('stripe', new StripeGateway());
    this.providers.set('paytm', new PaytmGateway());
  }

  getGateway(gatewayName?: string): IPaymentGateway {
    const key = (gatewayName || 'manual').toLowerCase();
    const provider = this.providers.get(key);
    if (!provider) {
      this.logger.warn(
        `Gateway provider ${gatewayName} not found, defaulting to Manual`,
      );
      return this.providers.get('manual')!;
    }
    return provider;
  }

  async createOrder(
    gatewayName: string,
    params: CreateOrderParams,
  ): Promise<OrderResponse> {
    const provider = this.getGateway(gatewayName);
    return provider.createOrder(params);
  }

  async verifySignature(
    gatewayName: string,
    payload: VerifyPayload,
  ): Promise<boolean> {
    const provider = this.getGateway(gatewayName);
    return provider.verifySignature(payload);
  }

  async refund(
    gatewayName: string,
    params: RefundParams,
  ): Promise<RefundResponse> {
    const provider = this.getGateway(gatewayName);
    return provider.refund(params);
  }
}
