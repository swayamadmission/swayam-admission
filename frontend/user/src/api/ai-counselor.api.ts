import api from "./axios";

export interface AiMessage {
  id: string;
  type: "ai" | "user";
  content: string;
  chips?: string[];
  colleges?: {
    id: string;
    name: string;
    location: string;
    fees: string;
    rating: number;
    match: number;
  }[];
}

export interface ChatPayload {
  message: string;
  conversationId?: string;
  language?: string;
  studentProfile?: any;
}

export const aiCounselorApi = {
  chat: (data: ChatPayload) =>
    api.post<any>("/ai/chat", data),

  getHistory: () =>
    api.get<any[]>("/ai/conversations"),

  getConversations: () =>
    api.get<any[]>("/ai/conversations"),

  getConversationById: (id: string) =>
    api.get<any>(`/ai/conversation/${id}`),

  getRecommendations: () =>
    api.get<any[]>("/ai/recommendations"),

  submitFeedback: (data: { conversationId: string; messageId?: string; rating: number; feedbackText?: string }) =>
    api.post("/ai/feedback", data),

  escalate: (data: { conversationId: string; reason?: string; summary?: string }) =>
    api.post("/ai/escalate", data),
};
