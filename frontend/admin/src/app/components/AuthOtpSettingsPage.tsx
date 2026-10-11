import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authOtpApi, OtpConfig } from "../../api/authOtp.api";
import { Shield, Smartphone, Mail, Settings, AlertCircle, CheckCircle2, PlayCircle } from "lucide-react";

export function AuthOtpSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ['otpConfig', activeTab],
    queryFn: () => authOtpApi.getConfig(activeTab),
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: Partial<OtpConfig>) => authOtpApi.updateConfig(activeTab, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otpConfig', activeTab] });
      alert("Settings updated successfully!");
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || "Failed to update settings");
    }
  });

  const testConfigMutation = useMutation({
    mutationFn: async (input: string) => {
      if (activeTab === 'WHATSAPP') return authOtpApi.testWhatsApp(input);
      return authOtpApi.testEmail(input);
    },
    onSuccess: (data) => {
      setTestResult({ success: true, message: data.message });
    },
    onError: (err: any) => {
      setTestResult({ success: false, message: err?.response?.data?.message || "Failed to send test OTP" });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<OtpConfig> = {
      enabled: formData.get('enabled') === 'on',
      provider: formData.get('provider') as string,
      providerUrl: formData.get('providerUrl') as string,
      apiKey: formData.get('apiKey') as string,
      apiPassword: formData.get('apiPassword') as string,
      senderId: formData.get('senderId') as string,
      templateId: formData.get('templateId') as string,
      expirySeconds: Number(formData.get('expirySeconds')),
      maxAttempts: Number(formData.get('maxAttempts')),
      resendCooldownSec: Number(formData.get('resendCooldownSec')),
      rateLimitCount: Number(formData.get('rateLimitCount')),
      rateLimitWindowSec: Number(formData.get('rateLimitWindowSec')),
    };
    updateConfigMutation.mutate(data);
  };

  const handleTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput) return;
    setTestResult(null);
    testConfigMutation.mutate(testInput);
  };

  if (isLoading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
          <Shield className="w-6 h-6 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Authentication & OTP Settings</h1>
          <p className="text-slate-500">Configure global settings for WhatsApp and Email OTPs</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveTab('WHATSAPP'); setTestResult(null); setTestInput(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
              activeTab === 'WHATSAPP' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            WhatsApp OTP
          </button>
          <button
            onClick={() => { setActiveTab('EMAIL'); setTestResult(null); setTestInput(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
              activeTab === 'EMAIL' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email OTP
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <h3 className="font-semibold text-slate-800">Enable {activeTab} OTP</h3>
                <p className="text-sm text-slate-500">Allow users to receive OTPs via {activeTab.toLowerCase()}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="enabled" defaultChecked={config?.enabled} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Provider Settings
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Provider Name</label>
                  <input type="text" name="provider" defaultValue={config?.provider || ''} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder={activeTab === 'WHATSAPP' ? 'Meta Cloud API' : 'SMTP'} />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">API URL (Optional)</label>
                  <input type="text" name="providerUrl" defaultValue={config?.providerUrl || ''} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">API Key / Username</label>
                  <input type="password" name="apiKey" defaultValue={config?.apiKey ? '********' : ''} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">API Password / Secret</label>
                  <input type="password" name="apiPassword" defaultValue={config?.apiPassword ? '********' : ''} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sender ID / From Address</label>
                  <input type="text" name="senderId" defaultValue={config?.senderId || ''} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                
                {activeTab === 'WHATSAPP' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Template ID</label>
                    <input type="text" name="templateId" defaultValue={config?.templateId || ''} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Security & Limits
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">OTP Expiry (seconds)</label>
                  <input type="number" name="expirySeconds" defaultValue={config?.expirySeconds || 300} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Verification Attempts</label>
                  <input type="number" name="maxAttempts" defaultValue={config?.maxAttempts || 5} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Resend Cooldown (seconds)</label>
                  <input type="number" name="resendCooldownSec" defaultValue={config?.resendCooldownSec || 30} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-2">Global Rate Limiting</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Max Requests</label>
                      <input type="number" name="rateLimitCount" defaultValue={config?.rateLimitCount || 10} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Time Window (sec)</label>
                      <input type="number" name="rateLimitWindowSec" defaultValue={config?.rateLimitWindowSec || 3600} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-200">
              <button 
                type="submit" 
                disabled={updateConfigMutation.isPending}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50"
              >
                {updateConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Testing Section */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <PlayCircle className="w-5 h-5" /> Test Configuration
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Send a test OTP to verify your configuration before saving or after making changes.
          </p>
          
          <form onSubmit={handleTest} className="flex gap-4 items-start">
            <div className="flex-1">
              <input 
                type={activeTab === 'WHATSAPP' ? 'tel' : 'email'} 
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder={activeTab === 'WHATSAPP' ? 'Enter Mobile Number (+91...)' : 'Enter Email Address'} 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={testConfigMutation.isPending || !config?.enabled}
              className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium transition-colors disabled:opacity-50"
            >
              {testConfigMutation.isPending ? 'Sending...' : 'Send Test OTP'}
            </button>
          </form>

          {testResult && (
            <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${testResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
              {testResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <div>
                <p className="font-medium">{testResult.success ? 'Success' : 'Test Failed'}</p>
                <p className="text-sm opacity-90">{testResult.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
