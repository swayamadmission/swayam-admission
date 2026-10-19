import api from "./axios";

export interface Vacancy {
  id: string;
  vacancyCode: string;
  title: string;
  department: string;
  designation: string;
  employmentType: string;
  location?: string;
  workMode: string;
  numberOfPositions: number;
  minimumQualification?: string;
  preferredQualification?: string;
  experience?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  jobDescription?: string;
  responsibilities?: string;
  educationRequirements?: string;
  experienceRequirements?: string;
  applicationStartDate?: string;
  applicationEndDate?: string;
  applicationDeadline?: string;
  status: string;
  priority?: string;
  interviewType?: string;
  interviewMode?: string;
  recruiterId?: string;
  reportingManagerId?: string;
  createdAt: string;
  _count?: {
    applications: number;
  };
}

export interface CreateVacancyPayload {
  title: string;
  department: string;
  designation: string;
  employmentType: string;
  location?: string;
  workMode: string;
  numberOfPositions: number;
  minimumQualification?: string;
  preferredQualification?: string;
  experience?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  jobDescription?: string;
  responsibilities?: string;
  educationRequirements?: string;
  experienceRequirements?: string;
  applicationStartDate?: string;
  applicationEndDate?: string;
  applicationDeadline?: string;
  status?: string;
  priority?: string;
  interviewType?: string;
  interviewMode?: string;
  recruiterId?: string;
  reportingManagerId?: string;
}

export interface CandidateDocument {
  id: string;
  applicationId: string;
  title: string;
  fileUrl: string;
  fileName: string;
  isRequired: boolean;
  status: string;
  createdAt: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  interviewType: string;
  interviewDate: string;
  time?: string;
  interviewerId?: string;
  meetingLink?: string;
  location?: string;
  instructions?: string;
  status: string;
  createdAt: string;
  interviewer?: {
    id: string;
    fullName: string;
    email: string;
  };
  evaluations?: any[];
}

export interface TimelineNote {
  id: string;
  type: string;
  note: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface StatusHistoryItem {
  status: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
  note?: string;
  reason?: string;
}

export interface JobApplication {
  id: string;
  applicationId: string;
  vacancyId: string;
  userId?: string;
  firstName: string;
  lastName?: string;
  email: string;
  mobile: string;
  address?: string;
  state?: string;
  city?: string;
  qualification?: string;
  experience?: string;
  previousOrganization?: string;
  currentDesignation?: string;
  skills?: string[];
  expectedSalary?: string;
  noticePeriod?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  coverLetter?: string;
  additionalInfo?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  resumeFileSize?: number;
  resumeMimeType?: string;
  recruiterId?: string;
  assignedById?: string;
  assignedAt?: string;
  internalNotes?: string;
  rejectionReason?: string;
  holdReason?: string;
  isArchived: boolean;
  archivedAt?: string;
  status: string;
  statusHistory?: StatusHistoryItem[];
  timelineNotes?: TimelineNote[];
  createdAt: string;
  updatedAt: string;
  vacancy?: {
    id: string;
    title: string;
    vacancyCode: string;
    department: string;
    designation?: string;
    workMode?: string;
    location?: string;
  };
  recruiter?: {
    id: string;
    fullName: string;
    email: string;
  };
  assignedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
  documents?: CandidateDocument[];
  interviews?: Interview[];
  offer?: Offer;
  onboarding?: RecruitmentOnboarding;
  clearance?: EmployeeClearance;
}

export interface Offer {
  id: string;
  offerCode?: string;
  applicationId: string;
  designation?: string;
  department?: string;
  employmentType?: string;
  workMode?: string;
  workLocation?: string;
  reportingManager?: string;
  joiningDate?: string;
  salary?: number;
  salaryFrequency?: string;
  validUntil?: string;
  notes?: string;
  terms?: string;
  offerLetterUrl?: string;
  status: string;
  sentAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  declinedReason?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  application?: JobApplication;
  clearance?: EmployeeClearance;
}

export interface ClearanceChecklistItem {
  id: string;
  clearanceId: string;
  itemKey: string;
  title: string;
  status: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'FAILED' | 'NOT_REQUIRED';
  isRequired: boolean;
  reviewedById?: string;
  reviewedAt?: string;
  remarks?: string;
  failureReason?: string;
  documentUrl?: string;
  reviewedBy?: {
    id: string;
    fullName: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeClearance {
  id: string;
  offerId: string;
  userId?: string;
  status: string;
  failureReason?: string;
  notes?: string;
  hrClearedAt?: string;
  finalClearedAt?: string;
  checklistItems?: ClearanceChecklistItem[];
  offer?: Offer;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
  hrClearedBy?: {
    id: string;
    fullName: string;
  };
  finalClearedBy?: {
    id: string;
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RecruitmentOnboarding {
  id: string;
  applicationId: string;
  employeeId: string;
  department: string;
  designation: string;
  reportingManager?: string;
  workLocation?: string;
  workMode?: string;
  employmentType?: string;
  officialEmail?: string;
  officialMobile?: string;
  joiningDate: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  completedAt?: string;
  completedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferPayload {
  applicationId: string;
  designation?: string;
  department?: string;
  employmentType?: string;
  workMode?: string;
  workLocation?: string;
  reportingManager?: string;
  joiningDate?: string;
  salary: number | string;
  salaryFrequency?: string;
  validUntil?: string;
  notes?: string;
  terms?: string;
  offerLetterUrl?: string;
  sendImmediately?: boolean;
}

export interface RespondOfferPayload {
  action: 'ACCEPT' | 'DECLINE';
  reason?: string;
  channel?: string;
}

export interface UpdateClearanceItemPayload {
  status: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'FAILED' | 'NOT_REQUIRED';
  remarks?: string;
  failureReason?: string;
  documentUrl?: string;
}

export interface StartOnboardingPayload {
  employeeId?: string;
  department?: string;
  designation?: string;
  reportingManager?: string;
  workLocation?: string;
  workMode?: string;
  employmentType?: string;
  officialEmail?: string;
  officialMobile?: string;
  joiningDate?: string;
  notes?: string;
}

export interface CompleteOnboardingPayload {
  employeeId?: string;
  role?: string;
  notes?: string;
  officialEmail?: string;
  officialMobile?: string;
}

export interface RecruiterStaff {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface RecruitmentSetting {
  id: string;
  recruitmentEmail: string;
  recruitmentDisplayName: string;
  replyToEmail?: string;
  ccEmails: string[];
  bccEmails: string[];
  candidateAckEnabled: boolean;
  adminNotificationEnabled: boolean;
  resumeAttachmentEnabled: boolean;
  maxResumeSizeMB: number;
  allowedResumeFormats: string[];
  applicationIdPrefix: string;
  heroTitle?: string;
  heroSubtitle?: string;
  autoSendRejectionEmail: boolean;
  autoSendShortlistEmail: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClearanceItem {
  id: string;
  offerId: string;
  status: string;
  notes?: string;
  hrClearedAt?: string;
  finalClearedAt?: string;
  createdAt: string;
  applicationId?: string | null;
  applicationNumber?: string;
  candidateName?: string;
  candidateEmail?: string;
  candidateMobile?: string;
  jobRole?: string;
  vacancyId?: string;
  department?: string;
  recruiterName?: string;
  appliedDate?: string | null;
  joiningDate?: string | null;
  totalRequiredItems?: number;
  verifiedRequiredItems?: number;
  hrClearanceStatus?: string;
  finalClearanceStatus?: string;
  onboardingStatus?: string;
  onboardingEmployeeId?: string | null;
  checklistItems?: ClearanceChecklistItem[];
  offer?: {
    id: string;
    designation?: string;
    department?: string;
    joiningDate?: string;
    application?: {
      id: string;
      applicationId: string;
      firstName: string;
      lastName?: string;
      email: string;
      mobile: string;
      createdAt?: string;
      vacancy?: {
        id?: string;
        title: string;
        vacancyCode: string;
        department: string;
        designation?: string;
      };
      recruiter?: {
        fullName?: string;
      };
      onboarding?: RecruitmentOnboarding;
    };
  };
  application?: any;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
  hrClearedBy?: {
    id: string;
    fullName: string;
  };
  finalClearedBy?: {
    id: string;
    fullName: string;
  };
}

export const hrApi = {
  // Vacancies
  getVacancies: async (params?: any) => {
    return api.get<Vacancy[]>("/hr/vacancies", { params });
  },

  getVacancy: async (id: string) => {
    return api.get<Vacancy>(`/hr/vacancies/${id}`);
  },

  createVacancy: async (data: CreateVacancyPayload) => {
    return api.post<Vacancy>("/hr/vacancies", data);
  },

  updateVacancy: async (id: string, data: Partial<CreateVacancyPayload>) => {
    return api.patch<Vacancy>(`/hr/vacancies/${id}`, data);
  },

  publishVacancy: async (id: string) => {
    return api.post(`/hr/vacancies/${id}/publish`);
  },

  pauseVacancy: async (id: string) => {
    return api.post(`/hr/vacancies/${id}/pause`);
  },

  resumeVacancy: async (id: string) => {
    return api.post(`/hr/vacancies/${id}/resume`);
  },

  closeVacancy: async (id: string) => {
    return api.post(`/hr/vacancies/${id}/close`);
  },

  archiveVacancy: async (id: string) => {
    return api.post(`/hr/vacancies/${id}/archive`);
  },

  duplicateVacancy: async (id: string) => {
    return api.post<Vacancy>(`/hr/vacancies/${id}/duplicate`);
  },

  // Applications
  getApplications: async (params?: {
    status?: string;
    vacancyId?: string;
    recruiterId?: string;
    search?: string;
    isArchived?: boolean | string;
  }) => {
    return api.get<JobApplication[]>("/hr/applications", { params });
  },

  getApplication: async (id: string) => {
    return api.get<JobApplication>(`/hr/applications/${id}`);
  },

  updateApplicationStatus: async (
    id: string,
    payload: { status: string; note?: string; reason?: string },
  ) => {
    return api.patch<JobApplication>(`/hr/applications/${id}/status`, payload);
  },

  assignRecruiter: async (
    id: string,
    payload: { recruiterId: string; notes?: string },
  ) => {
    return api.post<JobApplication>(`/hr/applications/${id}/assign`, payload);
  },

  addNote: async (
    id: string,
    payload: { note: string; type?: string },
  ) => {
    return api.post<JobApplication>(`/hr/applications/${id}/notes`, payload);
  },

  scheduleInterview: async (
    applicationId: string,
    payload: {
      interviewType?: string;
      interviewDate: string;
      time?: string;
      interviewerId?: string;
      meetingLink?: string;
      location?: string;
      instructions?: string;
    },
  ) => {
    return api.post<Interview>(
      `/hr/applications/${applicationId}/interviews`,
      payload,
    );
  },

  updateInterview: async (
    interviewId: string,
    payload: {
      interviewType?: string;
      interviewDate?: string;
      time?: string;
      interviewerId?: string;
      meetingLink?: string;
      location?: string;
      instructions?: string;
      status?: string;
      result?: string;
      feedback?: string;
    },
  ) => {
    return api.patch<Interview>(`/hr/interviews/${interviewId}`, payload);
  },

  archiveApplication: async (id: string) => {
    return api.post(`/hr/applications/${id}/archive`);
  },

  restoreApplication: async (id: string) => {
    return api.post(`/hr/applications/${id}/restore`);
  },

  getRecruiters: async () => {
    return api.get<RecruiterStaff[]>("/hr/recruiters");
  },

  // Settings
  getSettings: async () => {
    return api.get<RecruitmentSetting>("/hr/settings");
  },

  updateSettings: async (payload: Partial<RecruitmentSetting>) => {
    return api.patch<RecruitmentSetting>("/hr/settings", payload);
  },

  // Clearance
  getClearances: async () => {
    return api.get<ClearanceItem[]>("/hr/clearance");
  },

  updateClearanceStatus: async (
    id: string,
    payload: { status: string; notes?: string },
  ) => {
    return api.put(`/hr/clearance/${id}`, payload);
  },

  // Offers
  getOffer: async (applicationId: string) => {
    return api.get<Offer>(`/hr/applications/${applicationId}/offer`);
  },

  createOffer: async (data: CreateOfferPayload) => {
    return api.post<Offer>("/hr/offers", data);
  },

  sendOffer: async (offerId: string) => {
    return api.post<Offer>(`/hr/offers/${offerId}/send`);
  },

  resendOffer: async (offerId: string) => {
    return api.post<Offer>(`/hr/offers/${offerId}/resend`);
  },

  cancelOffer: async (offerId: string, reason?: string) => {
    return api.post<Offer>(`/hr/offers/${offerId}/cancel`, { reason });
  },

  respondOffer: async (offerId: string, payload: RespondOfferPayload) => {
    return api.post(`/hr/offers/${offerId}/respond`, payload);
  },

  // Clearance Checklist
  startClearance: async (applicationId: string) => {
    return api.post<EmployeeClearance>(`/hr/applications/${applicationId}/clearance/start`);
  },

  getClearance: async (applicationId: string) => {
    return api.get<EmployeeClearance>(`/hr/applications/${applicationId}/clearance`);
  },

  updateClearanceItem: async (itemId: string, payload: UpdateClearanceItemPayload) => {
    return api.patch<ClearanceChecklistItem>(`/hr/clearance/items/${itemId}`, payload);
  },

  completeClearance: async (
    clearanceId: string,
    payload?: { notes?: string; approveAllItems?: boolean },
  ) => {
    return api.post<EmployeeClearance>(`/hr/clearance/${clearanceId}/complete`, payload || {});
  },

  // Onboarding
  startOnboarding: async (applicationId: string, payload: StartOnboardingPayload) => {
    return api.post<RecruitmentOnboarding>(`/hr/applications/${applicationId}/onboarding/start`, payload);
  },

  getOnboarding: async (applicationId: string) => {
    return api.get<RecruitmentOnboarding>(`/hr/applications/${applicationId}/onboarding`);
  },

  completeOnboarding: async (applicationId: string, payload: CompleteOnboardingPayload) => {
    return api.post<{ success: boolean; onboarding: RecruitmentOnboarding; user: any; emailStatus?: string; message?: string }>(
      `/hr/applications/${applicationId}/onboarding/complete`,
      payload
    );
  },

  resendActivationEmail: async (applicationId: string) => {
    return api.post<{ success: boolean; message: string }>(
      `/hr/applications/${applicationId}/resend-activation`
    );
  },
};
