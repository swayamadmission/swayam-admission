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

export interface DeletionRequestItem {
  id: string;
  requestId: string;
  documentId: string;
  document?: any;
}

export interface DeletionRequest {
  id: string;
  studentId: string;
  student?: {
    id: string;
    studentId?: string;
    fullName?: string;
    email?: string;
    mobile?: string;
  };
  applicationId?: string;
  application?: {
    id: string;
    applicationId?: string;
  };
  reason: string;
  additionalDetails?: string;
  status: string;
  requestedAt: string;
  scheduledDeletionAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  completedAt?: string;
  items?: DeletionRequestItem[];
}

export interface AuditLogItem {
  id: string;
  documentId?: string;
  studentId?: string;
  applicationId?: string;
  actorUserId?: string;
  actorRole: string;
  staffId?: string;
  action: string;
  result: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  createdAt: string;
  metadata?: any;
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

  getDeletionRequests: (params?: {
    status?: string;
    studentId?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<{ success: boolean; data: DeletionRequest[]; total: number }>(
      "/documents/deletion-requests",
      { params },
    ),

  reviewDeletionRequest: (
    id: string,
    data: {
      action: "APPROVE" | "REJECT" | "HOLD";
      rejectionReason?: string;
      holdReason?: string;
    },
  ) =>
    api.patch<{ success: boolean; data: DeletionRequest; message: string }>(
      `/documents/deletion-requests/${id}/review`,
      data,
    ),

  getAuditLogs: (params?: {
    documentId?: string;
    studentId?: string;
    staffId?: string;
    action?: string;
    result?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<{ success: boolean; data: AuditLogItem[]; total: number }>(
      "/documents/audit-logs",
      { params },
    ),

  runRetentionCleanup: () =>
    api.post<{ success: boolean; result: any }>(
      "/documents/retention/run-cleanup",
    ),

  resendDeletionNotification: (id: string, channels?: string[]) =>
    api.post<{ success: boolean; message: string; results?: any }>(
      `/documents/deletion-requests/${id}/resend-notification`,
      { channels },
    ),

  getNotificationLogs: (params?: {
    requestId?: string;
    studentId?: string;
    channel?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<{ success: boolean; data: any[]; total: number }>(
      "/documents/notification-logs",
      { params },
    ),

  getDocumentUrl: (id: string, mode: "preview" | "download" = "preview") => {
    const token = localStorage.getItem("swayam_token") || "";
    const baseUrl = (api.defaults.baseURL || "http://localhost:3000/v1").replace(
      /\/$/,
      "",
    );
    return `${baseUrl}/documents/${id}/${mode}?token=${encodeURIComponent(token)}`;
  },
};
