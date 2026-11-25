import api from "./axios";

export interface SubscribeAlertResponse {
  success: boolean;
  alreadySubscribed: boolean;
  email: string;
  message: string;
}

export const alertsApi = {
  subscribe: (email: string, source = "BLOG_SIDEBAR") =>
    api.post<SubscribeAlertResponse>("/alerts/subscribe", { email, source }),
};
