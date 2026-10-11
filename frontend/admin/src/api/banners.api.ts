import api from "./axios";

export interface BannerDto {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  mediaType: "IMAGE" | "VIDEO";
  buttonText?: string | null;
  buttonUrl?: string | null;
  openInNewTab?: boolean;
  slot: string;
  type?: string;
  priority?: number;
  sortOrder?: number;
  startDate?: string | null;
  endDate?: string | null;
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SlotMetadata {
  slot: string;
  label: string;
  page: string;
  location: string;
  recommendedDimensions: string;
  aspectRatio: string;
  supportsVideo: boolean;
  supportsImage: boolean;
}

export interface CreateBannerPayload {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType: "IMAGE" | "VIDEO";
  buttonText?: string;
  buttonUrl?: string;
  openInNewTab?: boolean;
  slot: string;
  type?: string;
  priority?: number;
  sortOrder?: number;
  startDate?: string | null;
  endDate?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "DRAFT";
  isActive?: boolean;
}

export interface BannerQueryParams {
  slot?: string;
  search?: string;
  status?: string;
  mediaType?: string;
  page?: number;
  limit?: number;
}

export const bannersApi = {
  // Public retrieval (cached on frontend user side)
  getPublic: (slot?: string) =>
    api.get<BannerDto[]>("/banners/public", { params: slot ? { slot } : {} }),

  // Slot metadata & options
  getSlots: () => api.get<SlotMetadata[]>("/banners/slots"),

  // Admin CRUD
  findAll: (params?: BannerQueryParams) =>
    api.get<{
      items: BannerDto[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>("/banners", { params }),

  findById: (id: string) => api.get<BannerDto>(`/banners/${id}`),

  create: (data: CreateBannerPayload) =>
    api.post<BannerDto>("/banners", data),

  update: (id: string, data: Partial<CreateBannerPayload>) =>
    api.patch<BannerDto>(`/banners/${id}`, data),

  toggleStatus: (id: string) =>
    api.patch<BannerDto>(`/banners/${id}/status`),

  delete: (id: string) => api.delete<{ success: boolean }>(`/banners/${id}`),

  uploadMedia: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<{
      success: boolean;
      url: string;
      mediaType: "IMAGE" | "VIDEO";
      originalName: string;
      size: number;
      mimetype: string;
    }>("/banners/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
