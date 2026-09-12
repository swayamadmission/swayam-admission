import api from "./axios";

export interface ShortlistOfferingPayload {
  collegeId: string;
  courseId: string;
  branchId?: string;
  academicSession?: string;
  recommendationId?: string;
  notes?: string;
}

export interface SelectOfferingPayload {
  collegeId: string;
  courseId: string;
  branchId?: string;
  academicSession?: string;
  studentChoiceConfirmed?: boolean;
}

export interface InitiateApplicationPayload {
  collegeId: string;
  courseId: string;
  branchId?: string;
  academicSession?: string;
  studentChoiceConfirmed?: boolean;
}

export const counselingApi = {
  // Student self requirement profile
  getMyRequirementProfile: () => api.get<any>("/students/me/requirement-profile"),

  updateMyRequirementProfile: (data: any) =>
    api.patch<any>("/students/me/requirement-profile", data),

  // Student recommendations
  getMyRecommendations: () => api.get<any>("/students/me/college-recommendations"),

  declineRecommendation: (id: string) =>
    api.patch<any>(`/students/me/college-recommendations/${id}/decline`),

  // Student shortlist
  getMyShortlist: () => api.get<any>("/students/me/college-shortlist"),

  addToShortlist: (data: ShortlistOfferingPayload) =>
    api.post<any>("/students/me/college-shortlist", data),

  removeFromShortlist: (id: string) =>
    api.delete<any>(`/students/me/college-shortlist/${id}`),

  // Student selection & Application initiation
  getMySelection: () => api.get<any>("/students/me/college-selection"),

  selectOffering: (data: SelectOfferingPayload) =>
    api.post<any>("/students/me/college-selection", data),

  initiateApplication: (data: InitiateApplicationPayload) =>
    api.post<any>("/applications/initiate", data),
};
