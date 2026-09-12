import api from "./axios";

export interface CreateCampaignPayload {
  campaignName: string;
  campaignCode: string;
  slug?: string;
  description?: string;
  objective?: string;
  campaignType?: string;
  source?: string;
  medium?: string;
  channel?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  dailyBudget?: number;
  totalBudget?: number;
  expectedLeads?: number;
  expectedAdmissions?: number;
  expectedRevenue?: number;
}

export interface MarketingQueryParams {
  search?: string;
  status?: string;
  type?: string;
  channel?: string;
  page?: number;
  limit?: number;
}

export const marketingApi = {
  getStats: () => api.get("/marketing/stats"),

  getPaginated: (params?: MarketingQueryParams) =>
    api.get("/marketing", { params }),

  getById: (id: string) => api.get(`/marketing/${id}`),

  createCampaign: (data: CreateCampaignPayload) =>
    api.post("/marketing", data),

  updateCampaign: (id: string, data: Partial<CreateCampaignPayload>) =>
    api.patch(`/marketing/${id}`, data),

  deleteCampaign: (id: string) => api.delete(`/marketing/${id}`),

  getLandingPages: () => api.get("/marketing/landing-pages"),

  createLandingPage: (data: { title: string; slug: string; heroTitle?: string; heroSubtitle?: string; campaignId?: string }) =>
    api.post("/marketing/landing-pages", data),

  getReferrals: () => api.get("/marketing/referrals"),

  createReferral: (data: { referralCode: string; studentId?: string; campaignId?: string }) =>
    api.post("/marketing/referrals", data),
};
