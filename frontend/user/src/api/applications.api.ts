import api from "./axios";

export interface ApplicationTimelineItem {
  id: string;
  action: string;
  oldStatus?: string;
  newStatus?: string;
  remarks?: string;
  createdAt: string;
}

export interface ApplicationDocument {
  id: string;
  title: string;
  type: string;
  status: string;
  fileUrl?: string;
  uploadedAt: string;
}

export interface ApplicationPayment {
  id: string;
  amount: number;
  status: string;
  paymentType?: string;
  createdAt: string;
}

export interface ApplicationCounselor {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  counselorProfile?: {
    designation?: string;
    department?: string;
    experience?: string;
  };
}

export interface Application {
  id: string;
  applicationId?: string;
  applicationNumber?: string;
  collegeId: string;
  courseId: string;
  userId: string;
  status: string;
  paymentStatus?: string;
  admissionYear?: number;
  completionPercentage?: number;
  declarationAccepted?: boolean;
  formData?: any;
  remarks?: string;
  approvedDate?: string;
  rejectedDate?: string;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: string;
    fullName?: string;
    email?: string;
    mobile?: string;
    profile?: {
      tenthMarks?: number;
      tenthBoard?: string;
      twelfthMarks?: number;
      twelfthBoard?: string;
      address?: string;
    };
  };
  college?: {
    id: string;
    name: string;
    logo?: string;
    city?: string;
    state?: string;
  };
  course?: {
    id: string;
    name: string;
    level?: string;
    duration?: string;
    totalFees?: number;
  };
  branchId?: string;
  branchName?: string;
  branch?: {
    id: string;
    name: string;
    code?: string;
    slug: string;
    type?: string;
  };
  counselor?: ApplicationCounselor;
  documents?: ApplicationDocument[];
  payments?: ApplicationPayment[];
  timeline?: ApplicationTimelineItem[];
}

export interface FindApplicationsResponse {
  success: boolean;
  applications: Application[];
  count: number;
}

export interface CreateApplicationPayload {
  collegeId?: string;
  courseId?: string;
  branchId?: string;
  collegeName?: string;
  courseName?: string;
  branchName?: string;
  fullName?: string;
  mobile?: string;
  email?: string;
  parentMobile?: string;
  parentEmail?: string;
  state?: string;
  stateId?: string;
  district?: string;
  districtId?: string;
  pincode?: string;
  educationLevel?: string;
  stream?: string;
  passingYear?: string;
  preferredCollege?: string;
  preferredCity?: string;
  offeringId?: string;
  academicSessionId?: string;
  remarks?: string;
  admissionYear?: number;
  documentUrls?: string[];
}

export interface ApplicationQuotaResponse {
  totalAllowedFree: number;
  submittedCount: number;
  freeRemaining: number;
  isNextFree: boolean;
  applicationFeeAmount: number;
  currency: string;
  message: string;
}

export interface CategoryItem {
  code: string;
  label: string;
  description: string;
  isReservation: boolean;
  requiresCertificate: boolean;
}

export interface EducationFinanceScheme {
  id: string;
  schemeName: string;
  schemeCode: string;
  state: string;
  stateCode?: string;
  description: string;
  eligibilityCriteria: string;
  applicationGuidance: string;
  documentsRequired: string[];
  maximumFinancing: number;
  interestRate: string;
  moratoriumPeriod: string;
  applicableEducationLevels: string[];
  officialUrl: string;
  academicSession: string;
  isActive: boolean;
}

export const applicationsApi = {
  findMyApplications: () =>
    api.get<FindApplicationsResponse | Application[]>("/applications/me"),
  getQuota: () =>
    api.get<ApplicationQuotaResponse>("/applications/quota"),
  create: (data: CreateApplicationPayload) =>
    api.post("/applications", data),
  getProgress: (id: string) =>
    api.get<any>(`/applications/${id}/progress`),
  getCategories: () =>
    api.get<CategoryItem[]>("/common/categories"),
  getEducationFinanceSchemes: (params?: { state?: string; courseLevel?: string }) =>
    api.get<EducationFinanceScheme[]>("/education-finance/schemes", { params }),
  getScholarships: () =>
    api.get<any>("/scholarships"),
  getDeclarations: (id: string) =>
    api.get<any>(`/applications/${id}/declarations`),
  saveDeclarations: (id: string, data: Record<string, any>) =>
    api.patch<any>(`/applications/${id}/declarations`, data),
  saveDraft: (
    id: string,
    data: {
      section?: string;
      communicationAddress?: string;
      communicationCity?: string;
      communicationDistrict?: string;
      communicationState?: string;
      communicationPincode?: string;
      additionalInfo?: string;
      personalInfo?: Record<string, any>;
      academicInfo?: Record<string, any>;
      address?: Record<string, any>;
      financialAssistance?: Record<string, any>;
      declaration?: Record<string, any>;
      draftData?: Record<string, any>;
    }
  ) => api.patch(`/applications/${id}/draft`, data),
  getEligibility: () =>
    api.get<ApplicationQuotaResponse>('/applications/eligibility'),
  getFeeSummary: (id: string, couponCode?: string) =>
    api.get<any>(`/applications/${id}/fee-summary`, { params: { couponCode } }),
  initiatePayment: (
    id: string,
    data?: {
      couponCode?: string;
      declaration?: Record<string, any>;
      financialAssistance?: Record<string, any>;
      paymentTermsAccepted?: boolean;
      paymentPrivacyAccepted?: boolean;
      paymentMethod?: string;
      acceptedPolicies?: Array<{ policyId?: string; policyType: string; policyVersion: string }>;
    }
  ) => api.post(`/applications/${id}/initiate-payment`, data),
  verifyPayment: (
    id: string,
    data: {
      razorpayPaymentId: string;
      razorpaySignature: string;
      razorpayOrderId?: string;
      paymentId?: string;
    }
  ) => api.post(`/applications/${id}/verify-payment`, data),
  submitApplication: (
    id: string,
    declarationAccepted: boolean,
    termsVersion?: string,
    couponCode?: string,
    paymentTransactionId?: string,
    paymentReference?: string,
    additionalData?: Record<string, any>,
    declaration?: Record<string, any>,
    paymentId?: string,
    orderId?: string,
    acceptedPolicies?: Array<{ policyId?: string; policyType: string; policyVersion: string }>
  ) =>
    api.post(`/applications/${id}/submit`, {
      declarationAccepted,
      termsVersion,
      couponCode,
      paymentTransactionId,
      paymentReference,
      paymentId,
      orderId,
      acceptedPolicies,
      ...(declaration ? { declaration } : {}),
      ...(additionalData || {}),
    }),
  withdrawApplication: (id: string, reason: string) =>
    api.post(`/applications/${id}/withdraw`, { reason }),
};
