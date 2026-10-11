import api from "./axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudyMaterial {
  id: string;
  title: string;
  slug: string;
  description?: string;
  materialType: string;
  category: string;
  stream?: string;
  courseId?: string;
  course?: { id: string; name: string };
  collegeId?: string;
  college?: { id: string; name: string; city: string; state: string };
  examId?: string;
  exam?: { id: string; examName: string; category?: string };
  subject?: string;
  semester?: string;
  language?: string;
  fileName?: string;
  fileUrl?: string;
  thumbnail?: string;
  fileSize?: string;
  fileExtension?: string;
  pages?: number;
  downloadCount: number;
  viewCount: number;
  featured: boolean;
  premium: boolean;
  price?: number;
  previewFileUrl?: string;
  previewFileName?: string;
  previewFileSize?: string;
  educationLevel?: string;
  academicSession?: string;
  specialization?: string;
  notes?: string;
  hasCredentials?: boolean;
  authorName?: string;
  authorRole?: string;
  providerName?: string;
  credentialsUrl?: string;
  credentialsNotes?: string;
  seoKeywords?: string[];
  tags?: string[];
  status: string;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function resolveThumbnailUrl(thumbnail?: string | null): string | null {
  if (!thumbnail || !thumbnail.trim()) return null;
  const trimmed = thumbnail.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const apiBase = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";
  const cleanBase = apiBase.replace(/\/v1\/?$/, "").replace(/\/+$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${cleanBase}${path}`;
}

export interface StudyMaterialListResponse {
  data: StudyMaterial[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StudyMaterialQueryParams {
  q?: string;
  page?: number;
  limit?: number;
  category?: string;
  materialType?: string;
  stream?: string;
  courseId?: string;
  collegeId?: string;
  examId?: string;
  subject?: string;
  semester?: string;
  language?: string;
  sortBy?: string;
  sortOrder?: string;
}

// ─── API Client ──────────────────────────────────────────────────────────────

export const studyMaterialsApi = {
  // Public listing
  findAll: (params?: StudyMaterialQueryParams) =>
    api.get<StudyMaterialListResponse>("/study-materials", { params }),

  findById: (id: string) =>
    api.get<StudyMaterial>(`/study-materials/${id}`),

  // Curated lists
  getRecommended: (params?: {
    category?: string;
    examId?: string;
    courseId?: string;
    materialType?: string;
    limit?: number;
  }) => api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/recommended", { params }),

  getLatest: (limit = 8) =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/latest", {
      params: { limit },
    }),

  getFeatured: (limit = 8) =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/featured", {
      params: { limit },
    }),

  getPopular: (limit = 8) =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/popular", {
      params: { limit },
    }),

  // By entity
  getByCollege: (collegeId: string, limit = 10) =>
    api.get<{ data: StudyMaterial[]; total: number }>(`/study-materials/by-college/${collegeId}`, {
      params: { limit },
    }),

  getByCourse: (courseId: string, limit = 10) =>
    api.get<{ data: StudyMaterial[]; total: number }>(`/study-materials/by-course/${courseId}`, {
      params: { limit },
    }),

  getByExam: (examId: string, limit = 12) =>
    api.get<{ data: StudyMaterial[]; total: number }>(`/study-materials/by-exam/${examId}`, {
      params: { limit },
    }),

  // Tracking (fire-and-forget)
  trackDownload: (id: string) =>
    api.post(`/study-materials/${id}/download`).catch(() => {}),

  trackView: (id: string) =>
    api.post(`/study-materials/${id}/view`).catch(() => {}),

  // Bookmarks (require auth)
  getBookmarks: () =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/bookmarks"),

  addBookmark: (id: string) =>
    api.post<{ message: string }>(`/study-materials/${id}/bookmark`),

  removeBookmark: (id: string) =>
    api.delete<{ message: string }>(`/study-materials/${id}/bookmark`),

  // History (require auth)
  getHistory: () =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/history"),

  // Access check & Entitlement
  checkAccess: (id: string) =>
    api.get<{
      materialId: string;
      isPremium: boolean;
      hasAccess: boolean;
      price: number;
      previewAvailable: boolean;
      purchase?: {
        paymentId: string;
        receiptNumber: string;
        paidAt: string;
        amount: number;
      };
    }>(`/study-materials/${id}/access`),

  createPurchaseOrder: (
    id: string,
    couponCode?: string,
    acceptedPolicies?: Array<{ policyId?: string; policyType: string; policyVersion: string }>
  ) =>
    api.post<{
      unlocked?: boolean;
      alreadyOwned?: boolean;
      hasAccess?: boolean;
      orderId?: string;
      amount?: number;
      currency?: string;
      keyId?: string;
      paymentId?: string;
      receiptNumber?: string;
      originalAmount?: number;
      discountAmount?: number;
      finalAmount?: number;
      message?: string;
      materialTitle?: string;
    }>(`/study-materials/${id}/purchase-order`, { couponCode, acceptedPolicies }),

  // Verify Razorpay signature server-side
  verifyPurchase: (
    id: string,
    payload: {
      orderId: string;
      paymentId: string;
      signature: string;
      internalPaymentId?: string;
    }
  ) =>
    api.post<{
      success: boolean;
      hasAccess: boolean;
      receiptNumber: string;
      paymentId: string;
      message: string;
    }>(`/study-materials/${id}/verify-payment`, payload),

  // My Purchased Study Materials
  getMyPurchases: () =>
    api.get<{
      data: Array<{
        paymentId: string;
        receiptNumber: string;
        amount: number;
        discountAmount: number;
        paidAmount: number;
        paidAt: string;
        gateway: string;
        transactionId: string;
        studyMaterial: StudyMaterial;
      }>;
      total: number;
    }>("/study-materials/my-purchases"),

  // Download authenticated stream (with blob fallback)
  downloadFile: async (id: string, fallbackName?: string) => {
    const response = await api.get(`/study-materials/${id}/download`, {
      responseType: "blob",
    });
    // Extract filename from header if available
    let fileName = fallbackName || `study_material_${id}.pdf`;
    const disposition = (response.headers["content-disposition"] as string) || "";
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match?.[1]) fileName = match[1];
    }

    const blob = new Blob([response.data], {
      type: (response.headers["content-type"] as string) || "application/pdf",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return { success: true, fileName };
  },

  // Preview URL generator (points to streaming endpoint)
  getPreviewUrl: (id: string) => `${api.defaults.baseURL}/study-materials/${id}/preview`,
};
