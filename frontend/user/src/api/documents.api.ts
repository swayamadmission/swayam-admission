import api from "./axios";

export interface DocumentHistoryItem {
  id: string;
  documentId: string;
  version: number;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  status: string;
  changeSummary?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  userId: string;
  applicationId?: string;
  type: string;
  title?: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  status: string;
  rejectedReason?: string;
  remarks?: string;
  version?: number;
  claimedBy?: string;
  claimedAt?: string;
  verifiedAt?: string;
  uploadedAt: string;
  updatedAt: string;
  application?: {
    id: string;
    applicationId: string;
    college?: { name: string };
    course?: { name: string };
  };
}

export interface DocumentChecklistItem {
  type: string;
  name: string;
  category: string;
  isRequired: boolean;
  maxSizeMB: number;
  allowedMimes: string[];
  description: string;
  documentId?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  status: 'NOT_UPLOADED' | 'UPLOADED' | 'UNDER_VERIFICATION' | 'VERIFIED' | 'CORRECTION_REQUIRED' | 'REJECTED' | 'EXPIRED';
  rejectedReason?: string;
  version?: number;
  uploadedAt?: string;
  verifiedAt?: string;
  claimedBy?: string;
}

export interface DynamicChecklistResponse {
  success: boolean;
  data: {
    checklist: DocumentChecklistItem[];
    summary: {
      totalRequired: number;
      uploadedCount: number;
      verifiedCount: number;
      pendingReviewCount: number;
      correctionRequiredCount: number;
      missingCount: number;
      isComplete: boolean;
      isVerified: boolean;
      completionPercentage: number;
    };
  };
}

export interface DeletionRequestItem {
  id: string;
  requestId: string;
  documentId: string;
  document?: Document;
}

export interface DeletionRequest {
  id: string;
  studentId: string;
  applicationId?: string;
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

export const documentsApi = {
  getMyDocuments: () =>
    api.get<Document[]>("/documents/my"),

  getChecklist: (params?: { applicationId?: string; collegeId?: string; courseId?: string }) =>
    api.get<DynamicChecklistResponse>("/documents/checklist", { params }),

  upload: (type: string, file: File, applicationId?: string, title?: string) => {
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);
    if (applicationId) formData.append("applicationId", applicationId);
    if (title) formData.append("title", title);
    return api.post("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  replace: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/documents/${id}/replace`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  getHistory: (id: string) =>
    api.get<{ success: boolean; data: DocumentHistoryItem[] }>(`/documents/${id}/history`),

  deleteDocument: (id: string) =>
    api.delete(`/documents/${id}`),

  preview: (id: string) =>
    api.get(`/documents/${id}/preview`),

  download: (id: string) =>
    api.get(`/documents/${id}/download`),

  requestDeletion: (data: {
    documentIds: string[];
    reason: string;
    additionalDetails?: string;
    applicationId?: string;
    confirmation?: boolean;
    studentConfirmed?: boolean;
  }) =>
    api.post<{ success: boolean; data: DeletionRequest; message: string }>(
      "/documents/deletion-requests",
      {
        ...data,
        confirmation: true,
        studentConfirmed: true,
      },
    ),

  getMyDeletionRequests: () =>
    api.get<{ success: boolean; data: DeletionRequest[] }>(
      "/documents/deletion-requests/my",
    ),

  cancelDeletionRequest: (id: string) =>
    api.patch<{ success: boolean; message: string }>(
      `/documents/deletion-requests/${id}/cancel`,
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
