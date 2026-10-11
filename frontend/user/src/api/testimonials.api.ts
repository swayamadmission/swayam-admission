import api from "./axios";

export interface TestimonialItem {
  id: string;
  name: string;
  role?: string;
  course?: string;
  college?: string;
  state?: string;
  text: string;
  rating: number;
  image?: string;
  videoUrl?: string;
  featured: boolean;
  isVerified: boolean;
  status: string;
  createdAt: string;
}

export const testimonialsApi = {
  findPublic: (params?: number | { limit?: number; featured?: boolean }) => {
    const queryParams = typeof params === "number" ? { limit: params } : params;
    return api.get<{ data: TestimonialItem[]; total: number }>("/testimonials", {
      params: queryParams,
    });
  },
};
