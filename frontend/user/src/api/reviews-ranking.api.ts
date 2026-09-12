import api from './axios';

export interface SubmitCollegeReviewPayload {
  collegeId: string;
  applicationId?: string;
  rating: number;
  title?: string;
  content?: string;
}

export interface SubmitCounselorReviewPayload {
  counselorId?: string;
  applicationId?: string;
  rating: number;
  title?: string;
  comment?: string;
}

export interface SubmitSupportReviewPayload {
  ticketId?: string;
  supportAgentId?: string;
  rating: number;
  comment?: string;
}

export interface FileComplaintPayload {
  collegeId?: string;
  category: string;
  severity?: string;
  description: string;
  evidenceUrl?: string;
}

export const reviewsRankingApi = {
  submitCounselorReview: async (payload: SubmitCounselorReviewPayload) => {
    const res = await api.post('/reviews/counselor', payload);
    return res.data;
  },

  submitCollegeReview: async (payload: SubmitCollegeReviewPayload) => {
    const res = await api.post('/reviews/college', payload);
    return res.data;
  },

  submitSupportReview: async (payload: SubmitSupportReviewPayload) => {
    const res = await api.post('/reviews/support', payload);
    return res.data;
  },

  fileComplaint: async (payload: FileComplaintPayload) => {
    const res = await api.post('/reviews/complaints', payload);
    return res.data;
  },

  getPublicRankings: async (params?: { year?: number; state?: string; tier?: string; search?: string; page?: number; limit?: number }) => {
    const res = await api.get('/rankings/public', { params });
    return res.data;
  },

  getCollegeReviewsPublic: async (collegeId: string, params?: { page?: number; limit?: number }) => {
    const res = await api.get(`/reviews/public/colleges/${collegeId}`, { params });
    return res.data;
  },
};
