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
  createdAt?: string;
}

export interface JobApplicationPayload {
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
}

export interface RecruitmentPublicSettings {
  recruitmentEmail: string;
  recruitmentDisplayName: string;
  heroTitle?: string;
  heroSubtitle?: string;
  allowedResumeFormats?: string[];
  maxResumeSizeMB?: number;
  applicationIdPrefix?: string;
}

export interface ApplicationSubmitResponse {
  success: boolean;
  message: string;
  applicationId: string;
  position: string;
  department: string;
  submittedAt: string;
  status: string;
  applicantName: string;
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
  createdAt: string;
  updatedAt: string;
  application?: {
    id: string;
    applicationId: string;
    firstName: string;
    lastName?: string;
    email: string;
    mobile: string;
    vacancy?: {
      id: string;
      title: string;
      department: string;
      designation?: string;
      workMode?: string;
      location?: string;
    };
  };
}

export interface RespondOfferPayload {
  action: "ACCEPT" | "DECLINE";
  reason?: string;
  channel?: string;
}

export const careersApi = {
  getVacancies: async (params?: {
    search?: string;
    department?: string;
    location?: string;
    employmentType?: string;
    workMode?: string;
  }) => {
    return api.get<Vacancy[]>("/careers/vacancies", { params });
  },

  getVacancy: async (code: string) => {
    return api.get<Vacancy>(`/careers/vacancies/${code}`);
  },

  getSettings: async () => {
    return api.get<RecruitmentPublicSettings>("/careers/settings");
  },

  getOffer: async (identifier: string) => {
    return api.get<Offer>(`/careers/offers/${identifier}`);
  },

  respondOffer: async (identifier: string, payload: RespondOfferPayload) => {
    return api.post(`/careers/offers/${identifier}/respond`, payload);
  },

  uploadResume: async (file: File) => {
    const formData = new FormData();
    formData.append("resume", file);
    return api.post<{
      success: boolean;
      fileUrl: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }>("/careers/upload-resume", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  applyForJob: async (
    vacancyId: string,
    data: JobApplicationPayload,
    resumeFile?: File,
  ) => {
    if (resumeFile) {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          if (Array.isArray(val)) {
            formData.append(key, JSON.stringify(val));
          } else {
            formData.append(key, String(val));
          }
        }
      });
      return api.post<ApplicationSubmitResponse>(
        `/careers/vacancies/${vacancyId}/apply`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    }

    return api.post<ApplicationSubmitResponse>(
      `/careers/vacancies/${vacancyId}/apply`,
      data,
    );
  },
};

