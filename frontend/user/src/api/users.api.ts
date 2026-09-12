import api from "./axios";
import type { AuthUser } from "./auth.api";

export interface UpdateProfilePayload {
  fullName?: string;
  mobile?: string;
  email?: string;
  dob?: string;
  gender?: string;
  category?: string;
  country?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  tenthBoard?: string;
  tenthMarks?: number;
  tenthPassingYear?: number;
  twelfthBoard?: string;
  twelfthMarks?: number;
  twelfthPassingYear?: number;
  graduationCourse?: string;
  graduationCollege?: string;
  graduationPercentage?: number;
  preferences?: Record<string, any>;
}

export const usersApi = {
  getMe: () =>
    api.get<AuthUser>("/users/me"),

  updateProfile: (data: UpdateProfilePayload) =>
    api.patch("/users/me/profile", data),

  getShortlist: () =>
    api.get<any[]>("/users/me/shortlist"),

  addToShortlist: (type: string, itemId: string) =>
    api.post("/users/me/shortlist", { type, itemId }),

  removeFromShortlist: (id: string) =>
    api.delete(`/users/me/shortlist/${id}`),

  getRecentlyViewed: () =>
    api.get<any[]>("/users/me/recently-viewed"),

  addRecentlyViewed: (type: string, itemId: string) =>
    api.post("/users/me/recently-viewed", { type, itemId }),

  getJourney: () =>
    api.get<any>("/users/me/journey"),
};
