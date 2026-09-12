import api from './axios';

export interface CouponValidationResponse {
  valid: boolean;
  couponId?: string;
  code?: string;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  originalAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
  message?: string;
}

export interface ValidateCouponParams {
  code: string;
  transactionAmount: number;
  applicableScope?: string;
  collegeId?: string;
  courseId?: string;
  branchId?: string;
}

export interface AvailableCoupon {
  id: string;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minTransactionAmount: number;
  applicableScope: string;
}

export const couponsApi = {
  async validateCoupon(params: ValidateCouponParams): Promise<CouponValidationResponse> {
    const res = await api.post('/coupons/validate', params);
    return res.data?.data || res.data;
  },

  async getAvailableCoupons(params?: {
    scope?: string;
    amount?: number;
    collegeId?: string;
    courseId?: string;
  }): Promise<AvailableCoupon[]> {
    const res = await api.get('/coupons/available', { params });
    return res.data?.data || [];
  },
};
