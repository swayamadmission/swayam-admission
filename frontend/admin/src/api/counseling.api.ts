import api from "./axios";

export interface CreateRecommendationPayload {
  collegeId: string;
  courseId: string;
  branchId?: string;
  academicSession?: string;
  reason?: string;
}

export interface UpdateRequirementProfilePayload {
  hostelRequired?: boolean;
  transportRequired?: boolean;
  scholarshipRequired?: boolean;
  admissionUrgency?: string;
  otherRequirements?: string;
  counselorObservation?: string;
}

export interface CreateCounselingNotePayload {
  title?: string;
  content: string;
  visibility?: "INTERNAL" | "STUDENT_VISIBLE";
}

export const counselingApi = {
  // Requirement profile
  getRequirementProfile: (studentId: string) =>
    api.get<any>(`/counselor/students/${studentId}/requirement-profile`),

  updateRequirementProfile: (studentId: string, data: UpdateRequirementProfilePayload) =>
    api.patch<any>(`/counselor/students/${studentId}/requirement-profile`, data),

  // Recommendations
  getRecommendations: (studentId: string) =>
    api.get<any>(`/counselor/students/${studentId}/college-recommendations`),

  createRecommendation: (studentId: string, data: CreateRecommendationPayload) =>
    api.post<any>(`/counselor/students/${studentId}/college-recommendations`, data),

  // Shortlist inspection
  getShortlist: (studentId: string) =>
    api.get<any>(`/counselor/students/${studentId}/shortlist`),

  // Notes
  createCounselingNote: (studentId: string, data: CreateCounselingNotePayload) =>
    api.post<any>(`/counselor/students/${studentId}/counseling-notes`, data),

  // Selection & Application initiation on behalf of student
  createSelection: (studentId: string, data: any) =>
    api.post<any>(`/counselor/students/${studentId}/college-selection`, data),

  initiateApplication: (studentId: string, data: any) =>
    api.post<any>(`/counselor/students/${studentId}/applications/initiate`, data),
};
