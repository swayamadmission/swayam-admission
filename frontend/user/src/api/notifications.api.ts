import api from "./axios";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category?: string;
  priority?: string;
  isRead: boolean;
  actionUrl?: string;
  actionType?: string;
  relatedApplicationId?: string;
  relatedPaymentId?: string;
  createdAt: string;
}

export interface UserCommunicationPreference {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  promotionalOptOut: boolean;
}

export const notificationsApi = {
  getMyNotifications: () =>
    api.get<Notification[]>("/notifications/my"),

  getUnreadCount: () =>
    api.get<{ count: number; recent: Notification[] }>("/notifications/unread"),

  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch("/notifications/read-all"),

  getPreferences: () =>
    api.get<UserCommunicationPreference>("/notifications/preferences"),

  updatePreferences: (data: Partial<UserCommunicationPreference>) =>
    api.patch<UserCommunicationPreference>("/notifications/preferences", data),
};
