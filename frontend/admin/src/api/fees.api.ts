import api from './axios';

export interface FeeTypeItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  defaultAmount: number;
  currency: string;
  isRefundable: boolean;
  isMandatory: boolean;
  isCouponEligible: boolean;
  isPaymentEnabled: boolean;
  applicableScope: string;
  collegeId?: string;
  courseId?: string;
  branchId?: string;
  academicSession?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeeTypePayload {
  code: string;
  name: string;
  description?: string;
  category?: string;
  defaultAmount: number;
  currency?: string;
  isRefundable?: boolean;
  isMandatory?: boolean;
  isCouponEligible?: boolean;
  isPaymentEnabled?: boolean;
  applicableScope?: string;
  collegeId?: string;
  courseId?: string;
  branchId?: string;
  academicSession?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CalculateFeePayload {
  feeTypeCode: string;
  customAmount?: number;
  couponCode?: string;
  collegeId?: string;
  courseId?: string;
  branchId?: string;
  academicSession?: string;
}

export interface CalculateFeeResult {
  feeTypeCode: string;
  feeTypeName: string;
  category: string;
  isRefundable: boolean;
  isMandatory: boolean;
  grossAmount: number;
  referralDiscount: number;
  couponDiscount: number;
  totalDiscount: number;
  payableAmount: number;
  isFree: boolean;
  appliedBenefitType: 'NONE' | 'REFERRAL_BENEFIT' | 'COUPON' | 'STACKED';
  stackingApplied: boolean;
  isReferredStudent: boolean;
  referralBenefit?: any;
  coupon?: any;
}

export const feesApi = {
  getCategories: async (): Promise<string[]> => {
    const res = await api.get('/fees/categories');
    return res.data;
  },

  getAdminCatalog: async (params?: {
    category?: string;
    isActive?: boolean;
    collegeId?: string;
    courseId?: string;
    branchId?: string;
    academicSession?: string;
    q?: string;
  }): Promise<FeeTypeItem[]> => {
    const res = await api.get('/fees/admin/catalog', { params });
    return res.data;
  },

  createFeeType: async (payload: CreateFeeTypePayload): Promise<FeeTypeItem> => {
    const res = await api.post('/fees/admin/catalog', payload);
    return res.data;
  },

  updateFeeType: async (id: string, payload: Partial<CreateFeeTypePayload>): Promise<FeeTypeItem> => {
    const res = await api.put(`/fees/admin/catalog/${id}`, payload);
    return res.data;
  },

  toggleFeeTypeStatus: async (id: string): Promise<FeeTypeItem> => {
    const res = await api.patch(`/fees/admin/catalog/${id}/toggle`);
    return res.data;
  },

  calculateFee: async (payload: CalculateFeePayload): Promise<CalculateFeeResult> => {
    const res = await api.post('/fees/calculate', payload);
    return res.data;
  },
};
