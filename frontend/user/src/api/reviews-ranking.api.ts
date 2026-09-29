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

export interface SubmitStudentCollegeReportPayload {
  collegeId: string;
  courseId?: string;
  applicationId?: string;
  academicRating: number;
  placementCareerRating: number;
  studentDemandExperienceRating: number;
  infrastructureRating: number;
  connectivityRating: number;
  hostelLivingRating: number;
  safetyHealthcareRating: number;
  affordabilityRoiRating: number;
  trustTransparencyRating: number;
  overallSatisfactionRating: number;
  headline?: string;
  detailedExperience?: string;
  strengthsObserved?: string[];
  gapsObserved?: string[];
  evidenceUrls?: string[];
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

  getPublicRankings: async (params?: {
    year?: number;
    state?: string;
    tier?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get('/rankings/public', { params });
    return res.data;
  },

  getPublicSpecialRankings: async (year: number, type: string, limit: number = 50) => {
    const res = await api.get(`/rankings/public/${year}/special/${type}`, { params: { limit } });
    return res.data;
  },

  getPublicMethodology: async (version?: string) => {
    const res = await api.get('/rankings/public/methodology', { params: { version } });
    return res.data;
  },

  getPublicAnnualReport: async (year: number) => {
    const res = await api.get(`/rankings/public/${year}/annual-report`);
    return res.data;
  },

  compareColleges: async (collegeIds: string[], year?: number) => {
    const res = await api.post('/rankings/compare', { collegeIds, year });
    return res.data;
  },

  submitStudentCollegeReport: async (payload: SubmitStudentCollegeReportPayload) => {
    const res = await api.post('/rankings/student-reports', payload);
    return res.data;
  },

  getMyStudentReports: async () => {
    const res = await api.get('/rankings/student-reports/my');
    return res.data;
  },

  getCollegeReviewsPublic: async (collegeId: string, params?: { page?: number; limit?: number }) => {
    const res = await api.get(`/reviews/public/colleges/${collegeId}`, { params });
    return res.data;
  },
};
