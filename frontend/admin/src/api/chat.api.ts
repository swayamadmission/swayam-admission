import api from "./axios";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderRole: string;
  senderName: string;
  text: string;
  sentAt: string;
  readAt?: string | null;
  createdAt: string;
}

export interface ConversationResponse {
  conversationId: string;
  studentId: string;
  counselorId: string;
  applicationId?: string | null;
  application?: {
    id: string;
    applicationNumber?: string;
    college?: { name: string };
    course?: { name: string };
  } | null;
  counselor: {
    id: string;
    displayName: string;
    role: string;
    qualifications?: string[];
  } | null;
  student: {
    id: string;
    displayName: string;
    role: string;
  };
  messages: ChatMessage[];
  unreadCount: number;
}

export const chatApi = {
  getOrCreateConversation: async (applicationId?: string, counselorId?: string) => {
    const res = await api.post<{ success: boolean; data: ConversationResponse }>("/chat/conversation", {
      applicationId,
      counselorId,
    });
    return res.data?.data || res.data;
  },

  getConversationMessages: async (conversationId: string) => {
    const res = await api.get<{ success: boolean; data: ConversationResponse }>(`/chat/conversation/${conversationId}`);
    return res.data?.data || res.data;
  },

  sendMessage: async (conversationId: string, text: string, idempotencyKey?: string) => {
    const res = await api.post<{ success: boolean; data: ChatMessage }>(`/chat/conversation/${conversationId}/messages`, {
      text,
      idempotencyKey,
    });
    return res.data?.data || res.data;
  },

  markAsRead: async (conversationId: string) => {
    const res = await api.post<{ success: boolean }>(`/chat/conversation/${conversationId}/read`);
    return res.data;
  },
};
