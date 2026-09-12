import api from './axios';

export interface StudentNextTier {
  tier: {
    id: string;
    name: string;
    minReferrals: number;
    minQualifyingReferrals: number;
    rewardAmount: number;
    rewardType: string;
  };
  referralsNeeded: number;
  qualifyingNeeded: number;
  progressPercent: number;
}

export interface StudentReferralStats {
  totalInvites: number;
  totalValidReferrals: number;
  qualifyingReferrals: number;
  currentTier: string;
  currentTierReward: number;
  totalRewardsEarned: number;
  totalRewardsPaid: number;
  pendingApprovalRewards: number;
  nextTier: StudentNextTier | null;
}

export interface StudentReferralItem {
  id: string;
  referredName: string;
  referredMobile: string;
  status: string;
  isOneYearCompleted?: boolean;
  isOneYearFeePaid?: boolean;
  isQualifying?: boolean;
  qualificationStatus?: string;
  fraudStatus: string;
  preferredCourse: string;
  preferredCollege: string;
  createdAt: string;
}

export interface StudentReferralHubResponse {
  success: boolean;
  referralCode: string;
  shareUrl: string;
  ruleVersion: string;
  stats: StudentReferralStats;
  rewards: Array<{
    id: string;
    tierName?: string;
    grossAmount: number;
    amount: number;
    status: string;
    createdAt: string;
    paidAt?: string;
  }>;
  referrals: StudentReferralItem[];
}

export interface StudentReferralBenefitResponse {
  isReferred: boolean;
  hasCompletedOnboarding?: boolean;
  referralCode?: string;
  referrerName?: string;
  counsellingDiscountUsed?: boolean;
  grossFee?: number;
  discountAmount?: number;
  finalAmount?: number;
  discountPercentage?: number;
  benefit?: any;
  message?: string;
}

export const referralApi = {
  async getMyReferralHub(): Promise<StudentReferralHubResponse> {
    const res = await api.get('/referrals/my-referrals');
    return res.data?.data || res.data;
  },

  async getMyReferralCode(): Promise<{ code: string; shareUrl: string; stats: StudentReferralStats }> {
    const res = await api.get('/referrals/my-code');
    return res.data?.data || res.data;
  },

  async validateCode(code: string): Promise<{ valid: boolean; code?: string; referrerName?: string; counsellingBenefit?: any; message?: string }> {
    const res = await api.get(`/referrals/validate/${encodeURIComponent(code)}`);
    return res.data?.data || res.data;
  },

  async applyOnboarding(code: string): Promise<{ success: boolean; message: string; referralCode?: string; referrerName?: string; counsellingBenefit?: any }> {
    const res = await api.post('/referrals/onboarding/apply', { code });
    return res.data;
  },

  async skipOnboarding(): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/referrals/onboarding/skip');
    return res.data;
  },

  async getMyBenefit(): Promise<StudentReferralBenefitResponse> {
    const res = await api.get('/referrals/my-benefit');
    return res.data;
  },
};

