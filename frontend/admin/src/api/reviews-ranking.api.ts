import api from './axios';

export interface ModerationQueueItem {
  id: string;
  rating: number;
  title?: string;
  content?: string;
  comment?: string;
  isVerifiedStudent?: boolean;
  status: string;
  moderationReason?: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
  student?: {
    id: string;
    fullName: string;
    email: string;
    mobile?: string;
  };
  counselor?: {
    id: string;
    fullName: string;
    email: string;
  };
  college?: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
  application?: {
    id: string;
    applicationNumber: string;
    status: string;
  };
  enrollment?: {
    id: string;
    enrollmentNumber: string;
  };
  moderatedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
  category?: string;
  severity?: string;
  description?: string;
  evidenceUrl?: string;
}

export interface RankingEditionItem {
  id: string;
  year: number;
  title: string;
  algorithmVersion: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  weightsConfig: any;
  minReviewThreshold: number;
  dataCutoffDate?: string;
  calculatedAt?: string;
  approvedAt?: string;
  publishedAt?: string;
  calculatedBy?: { id: string; fullName: string; email: string };
  approvedBy?: { id: string; fullName: string; email: string };
  publishedBy?: { id: string; fullName: string; email: string };
  _count?: { results: number };
}

export interface CollegeRankingResultItem {
  id: string;
  rank: number;
  score: number;
  percentile?: number;
  tier?: string;
  verifiedReviewCount: number;
  averageReviewRating?: number;
  factorBreakdown?: {
    studentReviewsScore?: number;
    academicScore?: number;
    infraScore?: number;
    hostelScore?: number;
    placementScore?: number;
    swayamVerificationScore?: number;
  };
  dataProvenance?: Record<string, string>;
  college: {
    id: string;
    name: string;
    city: string;
    state: string;
    logo?: string;
    ownership?: string;
    naacGrade?: string;
    nirfRanking?: number;
  };
}

export const reviewsRankingApi = {
  getModerationQueue: async (params: {
    type?: 'college' | 'counselor' | 'complaints';
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get('/reviews/moderation/queue', { params });
    return res.data;
  },

  moderateCollegeReview: async (
    id: string,
    payload: { action: 'APPROVE' | 'REJECT' | 'HIDE' | 'FLAG'; reason?: string },
  ) => {
    const res = await api.post(`/reviews/${id}/moderate-college`, payload);
    return res.data;
  },

  moderateCounselorReview: async (
    id: string,
    payload: { action: 'APPROVE' | 'REJECT' | 'HIDE' | 'FLAG'; reason?: string },
  ) => {
    const res = await api.post(`/reviews/${id}/moderate-counselor`, payload);
    return res.data;
  },

  getRankingEditions: async () => {
    const res = await api.get('/rankings/editions');
    return res.data;
  },

  getEditionDetails: async (year: number, params?: { tier?: string; state?: string; search?: string; page?: number; limit?: number }) => {
    const res = await api.get(`/rankings/edition/${year}`, { params });
    return res.data;
  },

  calculateRanking: async (payload: {
    year: number;
    title?: string;
    algorithmVersion?: string;
    weightsConfig?: any;
    minReviewThreshold?: number;
    dataCutoffDate?: string;
  }) => {
    const res = await api.post('/rankings/calculate', payload);
    return res.data;
  },

  approveRankingEdition: async (year: number, payload?: { remarks?: string }) => {
    const res = await api.post(`/rankings/edition/${year}/approve`, payload || {});
    return res.data;
  },

  publishRankingEdition: async (year: number) => {
    const res = await api.post(`/rankings/edition/${year}/publish`, {});
    return res.data;
  },

  unpublishRankingEdition: async (year: number, payload?: { unpublishReason?: string }) => {
    const res = await api.post(`/rankings/edition/${year}/unpublish`, payload || {});
    return res.data;
  },
};
