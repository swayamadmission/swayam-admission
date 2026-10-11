import api from "./axios";

export interface LegalPolicy {
  id: string;
  policyType: string;
  slug: string;
  title: string;
  content: string;
  version: string;
  versionNumber: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  effectiveDate: string;
  publishedAt?: string | null;
  archivedAt?: string | null;
  changeSummary?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentConfiguration {
  id: string;
  actionType: string;
  policyTypes: string[];
  isMandatory: boolean;
  description?: string | null;
  updatedBy?: string | null;
  updatedAt: string;
  detailedPolicies?: Array<{
    policyType: string;
    title: string;
    version: string;
    slug?: string;
  }>;
}

export interface PolicyAcceptanceRecord {
  id: string;
  userId: string;
  policyId: string;
  policyType: string;
  policyVersion: string;
  accepted: boolean;
  acceptedAt: string;
  actionContext: string;
  applicationId?: string | null;
  documentId?: string | null;
  paymentId?: string | null;
  purchaseId?: string | null;
  deletionRequestId?: string | null;
  referralId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email?: string | null;
    mobile?: string | null;
    registrationNumber?: string | null;
  };
  policy?: {
    id: string;
    title: string;
    slug: string;
    version: string;
  };
}

export interface GrievanceItem {
  id: string;
  complaintId: string;
  userId: string;
  category: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  assignedToId?: string | null;
  response?: string | null;
  resolution?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    email?: string | null;
    mobile?: string | null;
  };
  assignedTo?: {
    id: string;
    fullName: string;
    email?: string | null;
  };
}

export interface CookieItem {
  id: string;
  name: string;
  category: string;
  purpose: string;
  provider: string;
  duration: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const LegalApi = {
  // Policies
  getPolicies: async (params?: { status?: string; search?: string }) => {
    const res = await api.get<{ success: boolean; data: LegalPolicy[] }>("/admin/legal-policies", { params });
    return res.data?.data || [];
  },

  getPolicyById: async (id: string) => {
    const res = await api.get<{ success: boolean; data: LegalPolicy }>(`/admin/legal-policies/${id}`);
    return res.data?.data;
  },

  getPolicyVersions: async (id: string) => {
    const res = await api.get<{ success: boolean; data: LegalPolicy[] }>(`/admin/legal-policies/${id}/versions`);
    return res.data?.data || [];
  },

  createPolicy: async (data: {
    policyType: string;
    title: string;
    content: string;
    effectiveDate?: string;
    changeSummary?: string;
  }) => {
    const res = await api.post<{ success: boolean; data: LegalPolicy }>("/admin/legal-policies", data);
    return res.data?.data;
  },

  updatePolicy: async (
    id: string,
    data: {
      title?: string;
      content?: string;
      effectiveDate?: string;
      changeSummary?: string;
    }
  ) => {
    const res = await api.patch<{ success: boolean; data: LegalPolicy }>(`/admin/legal-policies/${id}`, data);
    return res.data?.data;
  },

  publishPolicy: async (id: string) => {
    const res = await api.post<{ success: boolean; data: LegalPolicy }>(`/admin/legal-policies/${id}/publish`);
    return res.data?.data;
  },

  unpublishPolicy: async (id: string) => {
    const res = await api.post<{ success: boolean; data: LegalPolicy }>(`/admin/legal-policies/${id}/unpublish`);
    return res.data?.data;
  },

  archivePolicy: async (id: string) => {
    const res = await api.post<{ success: boolean; data: LegalPolicy }>(`/admin/legal-policies/${id}/archive`);
    return res.data?.data;
  },

  // Consent Configuration
  getConsentConfigs: async () => {
    const res = await api.get<{ success: boolean; data: ConsentConfiguration[] }>("/admin/legal-consent-config");
    return res.data?.data || [];
  },

  updateConsentConfig: async (data: {
    actionType: string;
    policyTypes: string[];
    isMandatory?: boolean;
    description?: string;
  }) => {
    const res = await api.put<{ success: boolean; data: ConsentConfiguration }>("/admin/legal-consent-config", data);
    return res.data?.data;
  },

  // Consent Records
  getConsentRecords: async (params?: { actionContext?: string; userId?: string; limit?: number; page?: number }) => {
    const res = await api.get<{
      success: boolean;
      data: { records: PolicyAcceptanceRecord[]; total: number; page: number; limit: number };
    }>("/admin/policy-consents", { params });
    return res.data?.data || { records: [], total: 0, page: 1, limit: 50 };
  },

  // Grievances
  getGrievances: async (params?: { status?: string; category?: string; search?: string }) => {
    const res = await api.get<{ success: boolean; data: GrievanceItem[] }>("/admin/grievances", { params });
    return res.data?.data || [];
  },

  updateGrievance: async (
    id: string,
    data: {
      status?: string;
      assignedToId?: string;
      response?: string;
      resolution?: string;
    }
  ) => {
    const res = await api.patch<{ success: boolean; data: GrievanceItem }>(`/admin/grievances/${id}`, data);
    return res.data?.data;
  },

  // Cookies
  getCookies: async () => {
    const res = await api.get<{ success: boolean; data: CookieItem[] }>("/admin/cookies");
    return res.data?.data || [];
  },

  createCookie: async (data: Omit<CookieItem, "id" | "createdAt" | "updatedAt">) => {
    const res = await api.post<{ success: boolean; data: CookieItem }>("/admin/cookies", data);
    return res.data?.data;
  },

  updateCookie: async (id: string, data: Partial<CookieItem>) => {
    const res = await api.patch<{ success: boolean; data: CookieItem }>(`/admin/cookies/${id}`, data);
    return res.data?.data;
  },

  deleteCookie: async (id: string) => {
    const res = await api.delete<{ success: boolean }>(`/admin/cookies/${id}`);
    return res.data?.success;
  },
};
