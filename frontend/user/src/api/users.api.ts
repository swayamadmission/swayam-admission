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
    api.get<any>("/users/me/shortlist"),

  getShortlistIds: () =>
    api.get<{ success: boolean; data: string[]; collegeIds: string[] }>("/users/me/shortlist/ids"),

  addToShortlist: (typeOrCollegeId: string, itemId?: string) => {
    const collegeId = itemId || typeOrCollegeId;
    return api.post<{ success: boolean; saved: boolean; isSaved: boolean; message: string }>("/users/me/shortlist", {
      collegeId,
      itemId: collegeId,
      type: itemId ? typeOrCollegeId : "COLLEGE",
    });
  },

  removeFromShortlist: (id: string) =>
    api.delete<{ success: boolean; saved: boolean; isSaved: boolean; message: string }>(`/users/me/shortlist/${id}`),

  toggleShortlist: (collegeId: string) =>
    api.post<{ success: boolean; saved: boolean; isSaved: boolean; message: string }>("/users/me/shortlist/toggle", { collegeId }),


  getRecentlyViewed: () =>
    api.get<any[]>("/users/me/recently-viewed"),

  addRecentlyViewed: (type: string, itemId: string) =>
    api.post("/users/me/recently-viewed", { type, itemId }),

  getJourney: () =>
    api.get<any>("/users/me/journey"),
};
