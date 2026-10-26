import api from './axios';

export interface OtpConfig {
  id?: string;
  channel?: string;
  enabled: boolean;
  provider: string;
  providerUrl?: string;
  apiHost?: string;
  apiPort?: number;
  apiUser?: string;
  apiPassword?: string;
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
  senderId?: string;
  templateId?: string;
  templateLanguage?: string;
  phoneNumberId?: string;
  accountId?: string;
  expirySeconds: number;
  maxAttempts: number;
  resendCooldownSec: number;
  rateLimitCount: number;
  rateLimitWindowSec: number;
  updatedAt?: string;
  createdAt?: string;
}

export const authOtpApi = {
  getDashboardStats: async () => {
    const res = await api.get('/admin/otp-settings/dashboard');
    return res.data;
  },
  
  getConfig: async (channel: 'WHATSAPP' | 'EMAIL') => {
    const res = await api.get(`/admin/otp-settings/config/${channel}`);
    return res.data as OtpConfig;
  },

  updateConfig: async (channel: 'WHATSAPP' | 'EMAIL', data: Partial<OtpConfig>) => {
    const res = await api.put(`/admin/otp-settings/config/${channel}`, data);
    return res.data;
  },

  testWhatsApp: async (mobile: string) => {
    const res = await api.post('/admin/otp-settings/test/whatsapp', { mobile });
    return res.data;
  },

  testEmail: async (email: string) => {
    const res = await api.post('/admin/otp-settings/test/email', { email });
    return res.data;
  }
};
