import api from "./axios";

export interface PublicLegalPolicy {
  id: string;
  policyType: string;
  slug: string;
  title: string;
  content: string;
  version: string;
  effectiveDate: string;
  publishedAt?: string | null;
  changeSummary?: string | null;
}

export interface ActionPolicyRequirement {
  id: string;
  policyType: string;
  slug: string;
  title: string;
  version: string;
  effectiveDate: string;
}

export interface ActionRequirementsResponse {
  actionType: string;
  isMandatory: boolean;
  description?: string;
  policies: ActionPolicyRequirement[];
}

export interface CookieDeclaration {
  id: string;
  name: string;
  category: string;
  purpose: string;
  provider: string;
  duration: string;
  isActive: boolean;
}

export const LegalUserApi = {
  getPublishedPolicies: async () => {
    const res = await api.get<{ success: boolean; data: PublicLegalPolicy[] }>("/legal-policies");
    return res.data?.data || [];
  },

  getPolicyBySlug: async (slug: string) => {
    const res = await api.get<{ success: boolean; data: PublicLegalPolicy }>(`/legal-policies/${slug}`);
    return res.data?.data;
  },

  getActionRequirements: async (actionType: string): Promise<ActionRequirementsResponse> => {
    const res = await api.get<{ success: boolean; data: ActionRequirementsResponse }>(
      `/legal-policies/action-requirements/${actionType}`
    );
    return res.data?.data || { actionType, isMandatory: true, policies: [] };
  },

  getCookies: async () => {
    const res = await api.get<{ success: boolean; data: CookieDeclaration[] }>("/legal-policies/cookies");
    return res.data?.data || [];
  },

  recordConsent: async (payload: {
    actionContext: string;
    acceptedPolicies: Array<{
      policyId?: string;
      policyType: string;
      policyVersion: string;
    }>;
    applicationId?: string;
    documentId?: string;
    paymentId?: string;
    purchaseId?: string;
    deletionRequestId?: string;
    referralId?: string;
  }) => {
    const res = await api.post<{ success: boolean; data: any }>("/policy-consents", payload);
    return res.data?.data;
  },

  submitGrievance: async (payload: {
    category: string;
    subject: string;
    description: string;
    fullName?: string;
    email?: string;
    mobile?: string;
  }) => {
    const res = await api.post<{ success: boolean; data: any }>("/legal-policies/grievances", payload);
    return res.data?.data;
  },
};
