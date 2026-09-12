import api from "./axios";

export interface JourneyStep {
  id: string;
  label: string;
  completed: boolean;
  date: string | null;
}

export interface JourneyProgress {
  completedSteps: number;
  totalSteps: number;
  progressPercentage: number;
  currentStage: string;
  steps: JourneyStep[];
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: string;
  type: string;
  source: string;
  actionUrl?: string;
}

export interface ChecklistItem {
  category: string;
  title: string;
  status: 'COMPLETED' | 'PENDING' | 'REJECTED' | 'NEEDS_ACTION';
  description?: string;
}

export interface JourneyTask {
  id: string;
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'COMPLETED';
  dueDate?: string;
  actionUrl?: string;
}

export interface AssignedCounselor {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  designation?: string;
  department?: string;
  experience?: string;
  avatarUrl?: string;
}

export interface ReviewData {
  id: string;
  rating: number;
  comment?: string;
  content?: string;
  title?: string;
  createdAt: string;
}

export interface StudentJourneyResponse {
  success: boolean;
  user: {
    id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
  overallJourney?: any;
  progress: JourneyProgress;
  checklist: ChecklistItem[];
  timeline: TimelineEvent[];
  upcomingTasks: JourneyTask[];
  assignedCounselor: AssignedCounselor | null;
  reviews?: {
    counselorReview: ReviewData | null;
    collegeReview: ReviewData | null;
  };
  reviewEligibility?: {
    counselorReviewEligible: boolean;
    collegeReviewEligible: boolean;
  };
  applications: any[];
  documents: any[];
  payments: any[];
  shortlists: any[];
  aiRecommendations: any[];
  notifications: any[];
}

export const journeyApi = {
  getJourney: async (): Promise<StudentJourneyResponse> => {
    const res = await api.get('/student/journey');
    return res.data;
  },

  getProgress: async (): Promise<JourneyProgress> => {
    const res = await api.get('/student/journey/progress');
    return res.data;
  },

  getTimeline: async (): Promise<TimelineEvent[]> => {
    const res = await api.get('/student/journey/timeline');
    return res.data;
  },

  getChecklist: async (): Promise<ChecklistItem[]> => {
    const res = await api.get('/student/journey/checklist');
    return res.data;
  },

  getUpcoming: async (): Promise<JourneyTask[]> => {
    const res = await api.get('/student/journey/upcoming');
    return res.data;
  },

  getActivity: async (): Promise<TimelineEvent[]> => {
    const res = await api.get('/student/journey/activity');
    return res.data;
  },

  getReviews: async (): Promise<{ counselorReview: ReviewData | null; collegeReview: ReviewData | null }> => {
    const res = await api.get('/student/journey/reviews');
    return res.data;
  },

  submitCounselorReview: async (data: { rating: number; comment?: string }): Promise<any> => {
    const res = await api.post('/student/journey/counselor-review', data);
    return res.data;
  },

  submitCollegeReview: async (data: { rating: number; comment?: string }): Promise<any> => {
    const res = await api.post('/student/journey/college-review', data);
    return res.data;
  },

  requestCounselor: async (data?: { applicationId?: string; remarks?: string }): Promise<any> => {
    const res = await api.post('/student/counselor/request', data || {});
    return res.data;
  },

  getCounselorRequestStatus: async (): Promise<{
    hasAssignedCounselor: boolean;
    isRequestPending: boolean;
    counselor: AssignedCounselor | null;
    pendingRequest?: any;
  }> => {
    const res = await api.get('/student/counselor/request-status');
    return res.data;
  },

  exportCsv: async (): Promise<Blob> => {
    const res = await api.get('/student/journey/export/csv', { responseType: 'blob' });
    return res.data;
  },

  exportPdf: async (): Promise<Blob> => {
    const res = await api.get('/student/journey/export/pdf', { responseType: 'blob' });
    return res.data;
  },
};

