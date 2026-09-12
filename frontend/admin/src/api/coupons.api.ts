import api from './axios';

export interface CouponItem {
  id: string;
  code: string;
  description?: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxDiscountAmount?: number | null;
  minTransactionAmount: number;
  applicableScope: string;
  eligibleCollegeIds?: string[] | null;
  eligibleCourseIds?: string[] | null;
  eligibleBranchIds?: string[] | null;
  academicSession?: string | null;
  validFrom: string;
  validUntil?: string | null;
  maxUsageCount?: number | null;
  currentUsageCount: number;
  maxUsagePerUser: number;
  allowStacking: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    redemptions: number;
  };
}

export interface CouponAnalytics {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountDisbursed: number;
  totalGrossVolume: number;
}

export interface CouponRedemptionItem {
  id: string;
  couponId: string;
  userId: string;
  transactionId?: string | null;
  transactionType: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: string;
  createdAt: string;
  coupon?: {
    code: string;
    discountType: string;
    discountValue: number;
  };
  user?: {
    id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
}

export interface CreateCouponPayload {
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxDiscountAmount?: number;
  minTransactionAmount?: number;
  applicableScope?: string;
  eligibleCollegeIds?: string[];
  eligibleCourseIds?: string[];
  eligibleBranchIds?: string[];
  academicSession?: string;
  validFrom?: string;
  validUntil?: string;
  maxUsageCount?: number;
  maxUsagePerUser?: number;
  allowStacking?: boolean;
  isActive?: boolean;
}

export const couponsApi = {
  async getCoupons(): Promise<CouponItem[]> {
    const res = await api.get('/coupons/admin/list');
    return res.data?.data || res.data;
  },

  async getAnalytics(): Promise<CouponAnalytics> {
    const res = await api.get('/coupons/admin/analytics');
    return res.data?.data || res.data;
  },

  async getRedemptions(couponId?: string): Promise<CouponRedemptionItem[]> {
    const res = await api.get('/coupons/admin/redemptions', {
      params: couponId ? { couponId } : undefined,
    });
    return res.data?.data || res.data;
  },

  async createCoupon(payload: CreateCouponPayload): Promise<CouponItem> {
    const res = await api.post('/coupons/admin/create', payload);
    return res.data?.data || res.data;
  },

  async updateCoupon(id: string, payload: Partial<CreateCouponPayload>): Promise<CouponItem> {
    const res = await api.put(`/coupons/admin/${id}`, payload);
    return res.data?.data || res.data;
  },

  async toggleStatus(id: string): Promise<CouponItem> {
    const res = await api.patch(`/coupons/admin/${id}/toggle`);
    return res.data?.data || res.data;
  },

  async deleteCoupon(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/coupons/admin/${id}`);
    return res.data?.data || res.data;
  },
};
