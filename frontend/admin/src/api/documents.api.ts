import api from "./axios";

export interface DocumentQueryParams {
  search?: string;
  type?: string;
  status?: string;
  collegeId?: string;
  courseId?: string;
  counselorId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface VerifyDocumentPayload {
  status: "VERIFIED" | "REJECTED" | "UNDER_VERIFICATION";
  rejectedReason?: string;
  remarks?: string;
}

export interface BulkVerifyPayload {
  documentIds: string[];
  status: "VERIFIED" | "REJECTED";
  rejectedReason?: string;
  remarks?: string;
}

export interface RequestCorrectionPayload {
  studentMessage: string;
  internalNotes?: string;
}

export const documentsApi = {
  getPaginated: (params?: DocumentQueryParams) =>
    api.get("/documents", { params }),

  getStats: () =>
    api.get("/documents/stats"),

  getPending: () =>
    api.get("/documents/pending"),

  getUserDocuments: (userId: string) =>
    api.get(`/documents/user/${userId}`),

  getChecklist: (params: { userId: string; applicationId?: string; collegeId?: string; courseId?: string }) =>
    api.get("/documents/checklist", { params }),

  getById: (id: string) =>
    api.get(`/documents/${id}`),

  getHistory: (id: string) =>
    api.get(`/documents/${id}/history`),

  claim: (id: string) =>
    api.post(`/documents/${id}/claim`),

  requestCorrection: (id: string, data: RequestCorrectionPayload) =>
    api.post(`/documents/${id}/request-correction`, data),

  preview: (id: string) =>
    api.get(`/documents/${id}/preview`),

  download: (id: string) =>
    api.get(`/documents/${id}/download`),

  verifyDocument: (id: string, data: VerifyDocumentPayload) =>
    api.patch(`/documents/${id}/verify`, data),

  bulkVerify: (data: BulkVerifyPayload) =>
    api.post("/documents/bulk-verify", data),

  deleteDocument: (id: string) =>
    api.delete(`/documents/${id}`),

  exportDocuments: (params?: DocumentQueryParams) =>
    api.get("/documents/export", { params }),

  getRequirements: (params?: { collegeId?: string; courseId?: string; session?: string }) =>
    api.get("/documents/requirements", { params }),
};
