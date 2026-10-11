import api from "./axios";

export interface BannerItem {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  mediaType: "IMAGE" | "VIDEO";
  buttonText?: string | null;
  buttonUrl?: string | null;
  openInNewTab?: boolean;
  slot: string;
  sortOrder?: number;
  priority?: number;
}

export const bannersApi = {
  getPublic: (slot?: string) =>
    api.get<BannerItem[]>("/banners/public", {
      params: slot ? { slot } : {},
    }),
};
