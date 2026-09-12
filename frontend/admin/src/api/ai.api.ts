import api from "./axios";

export interface AISettingsPayload {
  provider?: string;
  modelName?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
  confidenceThreshold?: number;
  escalationEnabled?: boolean;
  autoLeadCreation?: boolean;
  autoLeadScoring?: boolean;
  ragEnabled?: boolean;
  topKChunks?: number;
  rateLimitPerMin?: number;
  dailyCostCap?: number;
}

export const aiApi = {
  getStats: () =>
    api.get<any>("/ai/stats"),

  getLogs: (page = 1, limit = 20) =>
    api.get<any>(`/ai/logs?page=${page}&limit=${limit}`),

  getConversations: () =>
    api.get<any[]>("/ai/conversations"),

  getConversationById: (id: string) =>
    api.get<any>(`/ai/conversation/${id}`),

  submitFeedback: (data: { conversationId: string; messageId?: string; rating: number; feedbackText?: string; isCorrected?: boolean; correctedText?: string }) =>
    api.post("/ai/feedback", data),

  escalate: (data: { conversationId: string; reason?: string; summary?: string; counselorId?: string }) =>
    api.post("/ai/escalate", data),

  uploadDocument: (data: { title: string; category: string; fileType: string; content: string }) =>
    api.post("/ai/upload", data),

  trainKnowledge: () =>
    api.post("/ai/train/knowledge"),

  reindex: () =>
    api.post("/ai/reindex"),

  getModels: () =>
    api.get<any[]>("/ai/models"),

  getProviderStatus: () =>
    api.get<any>("/ai/provider-status"),

  getSettings: () =>
    api.get<any>("/ai/settings"),

  updateSettings: (data: AISettingsPayload) =>
    api.patch("/ai/settings", data),

  getCost: () =>
    api.get<any>("/ai/cost"),

  getAnalytics: () =>
    api.get<any>("/ai/analytics"),

  getRecommendations: () =>
    api.get<any[]>("/ai/recommendations"),

  getKnowledge: () =>
    api.get<any[]>("/ai/knowledge"),

  deleteKnowledge: (id: string) =>
    api.delete(`/ai/knowledge/${id}`),
};
