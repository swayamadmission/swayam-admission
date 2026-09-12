import api from "./axios";

export interface CreateNotificationPayload {
  title: string;
  message: string;
  shortMessage?: string;
  userId?: string;
  receiverId?: string;
  receiverRole?: string;
  type?: string;
  priority?: string;
  category?: string;
  icon?: string;
  color?: string;
  actionUrl?: string;
  actionType?: string;
  metadata?: any;
}

export interface NotificationQueryParams {
  search?: string;
  type?: string;
  priority?: string;
  category?: string;
  receiverRole?: string;
  isRead?: string;
  page?: number;
  limit?: number;
}

export interface FilterCondition {
  field: string;
  operator: 'EQ' | 'NEQ' | 'IN' | 'NOT_IN' | 'CONTAINS' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'BETWEEN';
  value: any;
}

export interface AudienceFilterPayload {
  logic?: 'AND' | 'OR';
  conditions?: FilterCondition[];
  exclusions?: FilterCondition[];
  targetEntity?: 'STUDENT' | 'LEAD' | 'STAFF' | 'ALL';
  collegeRelationship?: 'ANY' | 'PREFERRED' | 'SHORTLISTED' | 'APPLIED' | 'ADMITTED' | 'ENROLLED';
}

export interface CreateCampaignPayload {
  campaignName?: string;
  name?: string;
  type?: 'TRANSACTIONAL' | 'PROMOTIONAL';
  channels: ('IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP')[];
  targetEntity?: 'STUDENT' | 'LEAD' | 'STAFF' | 'ALL';
  audienceId?: string;
  audienceFilter: AudienceFilterPayload;
  audienceType?: 'DYNAMIC' | 'SNAPSHOT';
  title?: string;
  messageTitle?: string;
  subject?: string;
  emailSubject?: string;
  message?: string;
  messageBody?: string;
  smsBody?: string;
  whatsAppTemplateName?: string;
  whatsAppBody?: string;
  emailHtml?: string;
  templateId?: string;
  scheduledAt?: string;
  timezone?: string;
  estimatedCost?: number;
}

export interface SaveAudiencePayload {
  name: string;
  description?: string;
  entityType?: 'STUDENT' | 'LEAD' | 'STAFF' | 'ALL';
  audienceDefinition: AudienceFilterPayload;
  lastPreviewCount?: number;
}

export interface UpdateSavedAudiencePayload {
  name?: string;
  description?: string;
  entityType?: 'STUDENT' | 'LEAD' | 'STAFF' | 'ALL';
  audienceDefinition?: AudienceFilterPayload;
  status?: 'ACTIVE' | 'ARCHIVED';
  lastPreviewCount?: number;
}

export interface SavedAudienceItem {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  status: 'ACTIVE' | 'ARCHIVED';
  audienceDefinitionJson: AudienceFilterPayload;
  lastPreviewCount: number;
  version: number;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    campaigns: number;
  };
}

export interface CreateTemplatePayload {
  code: string;
  name: string;
  category?: 'TRANSACTIONAL' | 'PROMOTIONAL' | 'SYSTEM';
  channels: ('IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP')[];
  subject?: string;
  inAppTitle?: string;
  inAppMessage?: string;
  emailHtml?: string;
  emailText?: string;
  smsBody?: string;
  whatsAppTemplateName?: string;
  whatsAppBody?: string;
  variables?: string[];
  isActive?: boolean;
}

export const notificationsApi = {
  // Stats & In-App
  getStats: () => api.get("/notifications/stats"),

  getUnreadCount: () => api.get("/notifications/unread"),

  getPaginated: (params?: NotificationQueryParams) =>
    api.get("/notifications", { params }),

  getById: (id: string) => api.get(`/notifications/${id}`),

  sendNotification: (data: CreateNotificationPayload) =>
    api.post("/notifications/send", data),

  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllAsRead: () => api.patch("/notifications/read-all"),

  archiveNotification: (id: string) => api.patch(`/notifications/${id}/archive`),

  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),

  bulkRead: (ids: string[]) => api.post("/notifications/bulk-read", { ids }),

  bulkDelete: (ids: string[]) => api.post("/notifications/bulk-delete", { ids }),

  // Audience Builder & Saved Audiences
  getAudienceMeta: () => api.get("/notifications/audience/meta"),

  previewAudience: (filter: AudienceFilterPayload, channels?: string[]) =>
    api.post("/notifications/audience/preview", { filter, channels }),

  getSavedAudiences: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    entityType?: string;
  }) => api.get("/notifications/audience/saved", { params }),

  getSavedAudienceById: (id: string) =>
    api.get(`/notifications/audience/saved/${id}`),

  createSavedAudience: (data: SaveAudiencePayload) =>
    api.post("/notifications/audience/saved", data),

  updateSavedAudience: (id: string, data: UpdateSavedAudiencePayload) =>
    api.patch(`/notifications/audience/saved/${id}`, data),

  duplicateSavedAudience: (id: string) =>
    api.post(`/notifications/audience/saved/${id}/duplicate`),

  archiveSavedAudience: (id: string) =>
    api.patch(`/notifications/audience/saved/${id}/archive`),

  // Campaigns
  getCampaigns: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
    channel?: string;
  }) => api.get("/notifications/campaigns", { params }),

  getCampaignById: (id: string) => api.get(`/notifications/campaigns/${id}`),

  getCampaignAnalytics: (id: string) =>
    api.get(`/notifications/campaigns/${id}/analytics`),

  createCampaign: (data: CreateCampaignPayload) =>
    api.post("/notifications/campaigns", data),

  updateCampaign: (id: string, data: Partial<CreateCampaignPayload>) =>
    api.patch(`/notifications/campaigns/${id}`, data),

  sendCampaignNow: (id: string) =>
    api.post(`/notifications/campaigns/${id}/send`),

  cancelCampaign: (id: string) =>
    api.post(`/notifications/campaigns/${id}/cancel`),

  retryFailedDeliveries: (id: string) =>
    api.post(`/notifications/campaigns/${id}/retry`),

  getDeliveryLogs: (params?: {
    campaignId?: string;
    channel?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get("/notifications/campaigns/delivery-logs", { params }),

  getProviderHealth: () => api.get("/notifications/campaigns/provider-health"),

  // Templates
  getTemplates: (params?: { search?: string; category?: string; channel?: string }) =>
    api.get("/notifications/templates", { params }),

  getTemplateByIdOrCode: (idOrCode: string) =>
    api.get(`/notifications/templates/${idOrCode}`),

  createTemplate: (data: CreateTemplatePayload) =>
    api.post("/notifications/templates", data),

  updateTemplate: (id: string, data: Partial<CreateTemplatePayload>) =>
    api.patch(`/notifications/templates/${id}`, data),

  previewTemplate: (templateIdOrCode: string, sampleData?: Record<string, string>) =>
    api.post("/notifications/templates/preview", { templateIdOrCode, sampleData }),

  seedDefaultTemplates: () => api.post("/notifications/templates/seed-defaults"),
};
