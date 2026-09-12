import api from './axios';

export interface AdminReferralItem {
  id: string;
  referralCode: string;
  referrerStudentId: string;
  referredLeadId?: string;
  referredStudentId?: string;
  referredName: string;
  referredMobile: string;
  referredEmail?: string;
  attributionSource: string;
  status: string;
  isOneYearCompleted?: boolean;
  isOneYearFeePaid?: boolean;
  isQualifying?: boolean;
  qualificationStatus?: string;
  fraudStatus: string;
  fraudReason?: string;
  rewardEligibility: string;
  rewardAmount: number;
  rewardStatus: string;
  createdAt: string;
  referrerStudent?: {
    id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
  referredLead?: {
    id: string;
    preferredCourse?: string;
    preferredCollege?: string;
    status: string;
  };
  rewards?: Array<{
    id: string;
    tierId?: string;
    tierName?: string;
    grossAmount?: number;
    deductedPreviousAmount?: number;
    netPayableAmount?: number;
    amount: number;
    currency: string;
    rewardType: string;
    status: string;
    ruleVersion: string;
    paidAt?: string;
    payoutReference?: string;
    payoutMethod?: string;
  }>;
}

export interface AdminReferralStats {
  totalReferrals: number;
  newToday: number;
  qualifyingCount: number;
  tier1Count: number;
  tier2Count: number;
  pendingApprovalRewards: number;
  approvedRewards: number;
  totalPaidAmount: number;
  flaggedCount: number;
}

export interface AdminReferralFunnelItem {
  stage: string;
  count: number;
  color?: string;
}

export interface AdminReferralListResponse {
  success: boolean;
  data: AdminReferralItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReferralTierConfig {
  id: string;
  name: string;
  minReferrals: number;
  minQualifyingReferrals: number;
  rewardAmount: number;
  rewardType: string;
}

export interface ReferralPolicy {
  id: string;
  version: string;
  name: string;
  description?: string;
  tiers: ReferralTierConfig[];
  qualificationConditions?: {
    requiresOneYearCompleted: boolean;
    requiresOneYearFeePaid: boolean;
    eligibleCollegeIds?: string[];
    eligibleCourseIds?: string[];
    eligibleBranchIds?: string[];
  };
  counsellingBenefit?: {
    enabled: boolean;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    maxDiscountAmount?: number;
    applicableFeeType: string;
    eligibleCollegeIds?: string[];
    eligibleCourseIds?: string[];
    academicSession?: string;
    allowStackingWithCoupon?: boolean;
  };
  settlementMode: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PolicySimulationResult {
  success: boolean;
  simulation: boolean;
  inputs: {
    totalReferrals: number;
    qualifyingReferrals: number;
    policyVersion: string;
    policyName: string;
  };
  totalReferrals?: number;
  qualifyingReferrals?: number;
  tier?: string;
  tierName?: string;
  rewardAmount?: number;
  eligible?: boolean;
  reason?: string;
  nextTier?: string | null;
  nextTierName?: string | null;
  nextTierRequirements?: {
    totalReferrals: number;
    qualifyingReferrals: number;
    referralsNeeded: number;
    qualifyingNeeded: number;
  } | null;
  result: {
    ruleVersion: string;
    policyId: string;
    totalValidReferrals: number;
    qualifyingReferrals: number;
    achievedTier: ReferralTierConfig | null;
    grossEntitledReward: number;
    nextTier: {
      tier: ReferralTierConfig;
      referralsNeeded: number;
      qualifyingNeeded: number;
      progressPercent: number;
    } | null;
  };
}

export const referralsApi = {
  async getStats(): Promise<AdminReferralStats> {
    const res = await api.get('/referrals/admin/stats');
    return res.data?.data || res.data;
  },

  async getFunnel(): Promise<{ funnel: AdminReferralFunnelItem[] }> {
    const res = await api.get('/referrals/admin/funnel');
    return res.data?.data || res.data;
  },

  async getReferrals(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    fraudStatus?: string;
    rewardStatus?: string;
  }): Promise<AdminReferralListResponse> {
    const res = await api.get('/referrals/admin/list', { params });
    return res.data;
  },

  async getPolicies(): Promise<ReferralPolicy[]> {
    const res = await api.get('/referrals/admin/policies');
    return res.data?.data || res.data;
  },

  async getActivePolicy(): Promise<ReferralPolicy> {
    const res = await api.get('/referrals/admin/policies/active');
    return res.data?.data || res.data;
  },

  async createPolicy(policyData: Partial<ReferralPolicy>): Promise<ReferralPolicy> {
    const res = await api.post('/referrals/admin/policies', policyData);
    return res.data?.data || res.data;
  },

  async updatePolicy(policyId: string, policyData: Partial<ReferralPolicy>): Promise<ReferralPolicy> {
    const res = await api.patch(`/referrals/admin/policies/${policyId}`, policyData);
    return res.data?.data || res.data;
  },

  async activatePolicy(policyId: string): Promise<ReferralPolicy> {
    const res = await api.post(`/referrals/admin/policies/${policyId}/activate`, {});
    return res.data?.data || res.data;
  },

  async simulatePolicy(params: {
    totalReferrals: number;
    qualifyingReferrals: number;
    policyVersion?: string;
  }): Promise<PolicySimulationResult> {
    const res = await api.post('/referrals/admin/policies/simulate', params);
    return res.data?.data || res.data;
  },

  async updateQualification(
    referralId: string,
    data: { isOneYearCompleted?: boolean; isOneYearFeePaid?: boolean; evidence?: any },
  ) {
    const res = await api.post(`/referrals/admin/referrals/${referralId}/qualification`, data);
    return res.data?.data || res.data;
  },

  async overrideAttribution(id: string, newReferrerCodeOrId: string, reason: string) {
    const res = await api.post(`/referrals/admin/${id}/override`, { newReferrerCodeOrId, reason });
    return res.data?.data || res.data;
  },

  async reviewFraud(id: string, decision: 'APPROVED' | 'REJECTED' | 'FLAGGED_FOR_REVIEW', reason: string) {
    const res = await api.post(`/referrals/admin/${id}/fraud-review`, { decision, reason });
    return res.data?.data || res.data;
  },

  async approveReward(rewardId: string, reason?: string) {
    const res = await api.post(`/referrals/admin/rewards/${rewardId}/approve`, { reason });
    return res.data?.data || res.data;
  },

  async rejectReward(rewardId: string, reason: string) {
    const res = await api.post(`/referrals/admin/rewards/${rewardId}/reject`, { reason });
    return res.data?.data || res.data;
  },

  async payoutReward(rewardId: string, payoutMethod: 'BANK_TRANSFER' | 'UPI' | 'WALLET' | 'FEE_CREDIT', payoutReference: string) {
    const res = await api.post(`/referrals/admin/rewards/${rewardId}/payout`, { payoutMethod, payoutReference });
    return res.data?.data || res.data;
  },
};
