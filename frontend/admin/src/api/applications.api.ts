import api from "./axios";

export interface Application {
  id: string;
  studentId: string;
  courseId: string;
  collegeId: string;
  status: string;
  paymentStatus: string;
  paymentId?: string;
  documentsVerified: boolean;
  counselorId?: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
  };
  course?: {
    id: string;
    name: string;
  };
  college?: {
    id: string;
    name: string;
  };
  counselor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface ApplicationQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  counselorId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const applicationsApi = {
  findAll: (params?: ApplicationQueryParams) => 
    api.get<{ data: Application[], total: number }>("/applications", { params }),

  findById: (id: string) => 
    api.get<Application>(`/applications/${id}`),

  getStats: () =>
    api.get<any>("/applications/dashboard/stats"),

  update: (id: string, data: Partial<Application>) =>
    api.patch(`/applications/${id}`, data),

  updateStatus: (id: string, status: string, remarks?: string) =>
    api.patch(`/applications/${id}/status`, { status, remarks }),

  assignCounselor: (id: string, counselorId: string) =>
    api.patch(`/applications/${id}/assign`, { counselorId }),

  verifyDocuments: (id: string) =>
    api.patch(`/applications/${id}/verify-documents`),

  getProgress: (id: string) =>
    api.get<any>(`/applications/${id}/progress`),

  saveDraft: (id: string, data: { section?: string; communicationAddress?: string; draftData?: Record<string, any> }) =>
    api.patch(`/applications/${id}/draft`, data),

  submitApplication: (id: string, declarationAccepted: boolean, termsVersion?: string) =>
    api.post(`/applications/${id}/submit`, { declarationAccepted, termsVersion }),

  requestCorrection: (id: string, affectedSection: string, reason: string) =>
    api.post(`/applications/${id}/request-correction`, { affectedSection, reason }),

  withdrawApplication: (id: string, reason: string) =>
    api.post(`/applications/${id}/withdraw`, { reason }),

  getReviewQueue: (params?: Record<string, any>) =>
    api.get('/applications/review-queue', { params }),

  claimReview: (id: string, priority?: string) =>
    api.post(`/applications/${id}/claim-review`, { priority }),

  startReview: (id: string) =>
    api.post(`/applications/${id}/start-review`),

  approveAdmission: (id: string, decisionNotes?: string) =>
    api.post(`/applications/${id}/approve`, { decisionNotes }),

  rejectAdmission: (id: string, rejectionReason: string, rejectionCategory?: string, publicRejectionReason?: string) =>
    api.post(`/applications/${id}/reject`, { rejectionReason, rejectionCategory, publicRejectionReason }),

  reopenDecision: (id: string, reopenReason: string) =>
    api.post(`/applications/${id}/reopen`, { reopenReason }),

  reassignReviewer: (id: string, newReviewerId: string, reason?: string) =>
    api.post(`/applications/${id}/reassign-reviewer`, { newReviewerId, reason }),
};
