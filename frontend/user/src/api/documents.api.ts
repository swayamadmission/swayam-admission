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
};
