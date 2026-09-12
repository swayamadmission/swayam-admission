import api from "./axios";

export interface CreateLeadPayload {
  fullName: string;
  mobile: string;
  email?: string;

  // Academic Profiling
  educationLevel?: string;
  passingYear?: number;
  stream?: string;

  // Authoritative Geography
  stateId?: string;
  districtId?: string;
  state?: string;
  district?: string;
  city?: string;

  // Authoritative Course, Branch & College
  courseId?: string;
  preferredCourse?: string;
  branchId?: string;
  preferredBranch?: string;
  customBranchText?: string;
  collegeId?: string;
  preferredCollege?: string;
  preferredCollegeText?: string;

  // Preferences & Messaging
  budget?: string;
  message?: string;

  // Explicit Consent (Defaults to false)
  hasConsent?: boolean;
  whatsappConsent?: boolean;
  smsConsent?: boolean;

  source?: string;
  campaign?: string;
  referralCode?: string;
}

export const leadsApi = {
  create: (data: CreateLeadPayload) =>
    api.post("/leads", data),
};
