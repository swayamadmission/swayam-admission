import api from './axios';

export interface SafePublicStaff {
  id: string;
  fullName: string;
  displayName: string;
  role: string;
  designation: string;
  qualification: string;
  avatar?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderRole: 'STUDENT' | 'COUNSELOR' | 'ADMIN';
  messageType: 'TEXT';
  text: string;
  sentAt: string;
  readAt?: string | null;
  createdAt: string;
}

export interface ConversationData {
  id: string;
  studentId: string;
  counselorId: string;
  applicationId?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    fullName: string;
    avatar?: string | null;
    studentId?: string | null;
  };
  counselor: SafePublicStaff;
  application?: {
    id: string;
    applicationId?: string;
    applicationNumber?: string;
    college?: { id: string; name: string };
    course?: { id: string; name: string };
  } | null;
  messages: ChatMessage[];
  unreadCount?: number;
}

export interface AssignedCounselorResponse {
  hasCounselor: boolean;
  counselor: SafePublicStaff | null;
  application?: {
    id: string;
    applicationNumber?: string;
    collegeName?: string;
    courseName?: string;
  } | null;
  message?: string;
}

export interface ConversationResponse {
  hasConversation: boolean;
  conversation: ConversationData;
  disclaimer: string;
  message?: string;
}

export const chatApi = {
  getAssignedCounselor: (applicationId?: string) =>
    api.get<AssignedCounselorResponse>('/chat/assigned-counselor', {
      params: applicationId ? { applicationId } : {},
    }),

  getOrCreateConversation: (applicationId?: string, counselorId?: string) =>
    api.get<ConversationResponse>('/chat/conversation', {
      params: {
        ...(applicationId ? { applicationId } : {}),
        ...(counselorId ? { counselorId } : {}),
      },
    }),

  listConversations: () =>
    api.get<ConversationData[]>('/chat/conversations'),

  getMessages: (conversationId: string) =>
    api.get<{
      conversation: ConversationData;
      messages: ChatMessage[];
      disclaimer: string;
    }>(`/chat/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: string, text: string, idempotencyKey?: string) =>
    api.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, {
      text,
      idempotencyKey,
    }),

  markAsRead: (conversationId: string) =>
    api.patch(`/chat/conversations/${conversationId}/read`),

  getUnreadCount: () =>
    api.get<{ unreadCount: number }>('/chat/unread-count'),
};
