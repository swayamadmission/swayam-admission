import api from "./axios";

export type ConfigurationDataType =
  | "STRING"
  | "INTEGER"
  | "DECIMAL"
  | "BOOLEAN"
  | "JSON"
  | "DATE"
  | "DATETIME"
  | "ENUM";

export type ConfigurationScope =
  | "GLOBAL"
  | "ORGANIZATION"
  | "DEPARTMENT"
  | "UNIT"
  | "COLLEGE"
  | "ROLE";

export type ConfigurationCategory =
  | "GENERAL"
  | "ADMISSIONS"
  | "APPLICATIONS"
  | "COUNSELING"
  | "TASKS_SLA"
  | "PAYMENTS"
  | "DOCUMENTS"
  | "REPORTING_ENROLLMENT"
  | "NOTIFICATIONS"
  | "CAMPAIGNS"
  | "REVIEWS"
  | "RANKINGS"
  | "ANALYTICS"
  | "SECURITY"
  | "MAINTENANCE"
  | "FEATURE_FLAGS";

export interface ValidationRules {
  min?: number;
  max?: number;
  enumOptions?: string[];
  regex?: string;
  step?: number;
  requiresReason?: boolean;
}

export interface SystemConfigurationVersion {
  id: string;
  configurationId: string;
  key: string;
  versionNumber: number;
  oldValue?: any;
  newValue: any;
  changeReason?: string;
  action: "CREATE" | "UPDATE" | "APPROVE" | "ROLLBACK" | "RESET" | "IMPORT";
  actorId?: string;
  actorName?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface ConfigurationApprovalRequest {
  id: string;
  configurationId: string;
  key: string;
  proposedValue: any;
  currentValue: any;
  changeReason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedById: string;
  requestedByName: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  configuration?: SystemConfiguration;
}

export interface SystemConfiguration {
  id: string;
  key: string;
  category: ConfigurationCategory;
  label: string;
  description?: string;
  dataType: ConfigurationDataType;
  value: any;
  defaultValue: any;
  scope: ConfigurationScope;
  scopeId?: string;
  isEncrypted: boolean;
  isHighRisk: boolean;
  requiresApproval: boolean;
  validationRules?: ValidationRules;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "ACTIVE" | "ARCHIVED";
  version: number;
  changeReason?: string;
  lastModifiedById?: string;
  lastModifiedByName?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  versions?: SystemConfigurationVersion[];
  approvals?: ConfigurationApprovalRequest[];
}

export interface TelemetryMetrics {
  status: "ONLINE" | "DEGRADED" | "DOWN";
  timestamp: string;
  latencyMs: number;
  database: {
    status: string;
    latencyMs: number;
    dialect: string;
  };
  system: {
    nodeVersion: string;
    uptimeSeconds: number;
    osUptimeSeconds: number;
    platform: string;
    cpus: number;
    memoryUsageMb: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
      systemFree: number;
      systemTotal: number;
    };
  };
  queues: {
    activeTasks: number;
    pendingApplications: number;
    pendingPayments: number;
  };
  cache: {
    status: string;
    cachedKeysCount: number;
    ttlSeconds: number;
  };
}

export interface SystemSetting {
  id?: string;
  platformName?: string;
  tagline?: string;
  websiteUrl?: string;
  companyName?: string;
  address?: string;
  supportEmail?: string;
  supportPhone?: string;
  whatsappPhone?: string;
  gstNumber?: string;
  panNumber?: string;
  registrationNumber?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  dateFormat?: string;
  timeFormat?: string;
  academicSession?: string;
  admissionSession?: string;
  defaultLeadStatus?: string;
  defaultStudentStatus?: string;
  defaultApplicationStatus?: string;
  defaultTheme?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
}

export interface BrandingSetting {
  id?: string;
  logo?: string;
  darkLogo?: string;
  lightLogo?: string;
  favicon?: string;
  appIcon?: string;
  invoiceLogo?: string;
  receiptLogo?: string;
  emailLogo?: string;
  emailHeader?: string;
  emailFooter?: string;
  watermark?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  successColor?: string;
  warningColor?: string;
  dangerColor?: string;
  typography?: string;
  fontFamily?: string;
  borderRadius?: string;
  buttonStyle?: string;
  cardStyle?: string;
  navbarStyle?: string;
  footerStyle?: string;
}

export interface NotificationSetting {
  id?: string;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  whatsappEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  sslEnabled?: boolean;
  defaultSenderName?: string;
  emailSignature?: string;
  retryAttempts?: number;
}

export interface IntegrationSetting {
  id?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  googleSearchConsole?: string;
  googleMapsApiKey?: string;
  metaPixelId?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  phonepeMerchantId?: string;
  phonepeSaltKey?: string;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  cashfreeAppId?: string;
  cashfreeSecretKey?: string;
  paytmMerchantId?: string;
  paytmMerchantKey?: string;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  awsS3Bucket?: string;
  firebaseConfigJson?: string;
  openAiApiKey?: string;
  geminiApiKey?: string;
  claudeApiKey?: string;
  groqApiKey?: string;
  deepseekApiKey?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  msg91AuthKey?: string;
  msg91SenderId?: string;
  resendApiKey?: string;
  brevoApiKey?: string;
  recaptchaSiteKey?: string;
  recaptchaSecretKey?: string;
  cloudflareZoneId?: string;
  cdnUrl?: string;
  webhookUrlsJson?: string;
}

export interface SecuritySetting {
  id?: string;
  jwtExpiryMinutes?: number;
  refreshTokenExpiryDays?: number;
  passwordMinLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  maxLoginAttempts?: number;
  accountLockMinutes?: number;
  sessionTimeoutMinutes?: number;
  otpLength?: number;
  otpExpiryMinutes?: number;
  twoFactorEnabled?: boolean;
  deviceVerification?: boolean;
  emailVerificationRequired?: boolean;
  phoneVerificationRequired?: boolean;
  ipWhitelist?: string;
  maxFileUploadSizeMb?: number;
  allowedFileTypes?: string;
  encryptionMode?: string;
  auditLoggingEnabled?: boolean;
}

export interface SEOSetting {
  id?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  canonicalDomain?: string;
  googleConsoleCode?: string;
  bingMasterCode?: string;
  yandexMasterCode?: string;
  indexNowKey?: string;
  geoSeoEnabled?: boolean;
  aiSummaryEnabled?: boolean;
  schemaEnabled?: boolean;
  openGraphImage?: string;
  twitterCardType?: string;
  organizationSchemaJson?: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  category: string;
}

export interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  variables: string;
  enabled: boolean;
  category: string;
}

export interface SettingAuditLog {
  id: string;
  module: string;
  key?: string;
  oldValue?: any;
  newValue?: any;
  userId?: string;
  userName?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface SystemBackup {
  id: string;
  filename: string;
  fileSize: string;
  storagePath: string;
  status: string;
  type: string;
  createdBy: string;
  createdAt: string;
}

export const settingsApi = {
  // ── Canonical Enterprise Configuration Engine ──
  queryConfigurations: (params?: {
    search?: string;
    category?: string;
    scope?: string;
    scopeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => api.get("/settings/config", { params }),

  getEffectiveConfig: (key: string, context?: {
    collegeId?: string;
    organizationId?: string;
    departmentId?: string;
    unitId?: string;
  }) => api.get("/settings/config/effective", { params: { key, ...context } }),

  getConfigurationByKey: (key: string, scope?: string, scopeId?: string) =>
    api.get(`/settings/config/${encodeURIComponent(key)}`, { params: { scope, scopeId } }),

  createConfiguration: (data: any) => api.post("/settings/config", data),

  updateConfiguration: (
    key: string,
    data: {
      value: any;
      changeReason?: string;
      expectedVersion?: number;
      scope?: string;
      scopeId?: string;
    }
  ) => api.patch(`/settings/config/${encodeURIComponent(key)}`, data),

  submitForApproval: (
    key: string,
    data: {
      proposedValue: any;
      changeReason: string;
      scope?: string;
      scopeId?: string;
    }
  ) => api.post(`/settings/config/${encodeURIComponent(key)}/submit`, data),

  getPendingApprovals: () => api.get("/settings/config/approvals"),

  reviewApproval: (
    approvalId: string,
    data: { status: "APPROVED" | "REJECTED"; reviewNotes?: string }
  ) => api.post(`/settings/config/approvals/${approvalId}/review`, data),

  rollbackConfiguration: (
    key: string,
    data: {
      targetVersionNumber: number;
      changeReason?: string;
      scope?: string;
      scopeId?: string;
    }
  ) => api.post(`/settings/config/${encodeURIComponent(key)}/rollback`, data),

  resetConfigurationToDefault: (key: string, scope?: string, scopeId?: string) =>
    api.post(`/settings/config/${encodeURIComponent(key)}/reset`, null, { params: { scope, scopeId } }),

  getConfigurationHistory: (key: string, scope?: string, scopeId?: string) =>
    api.get(`/settings/config/${encodeURIComponent(key)}/history`, { params: { scope, scopeId } }),

  exportConfigurations: () => api.get("/settings/config/export"),

  importConfigurations: (data: {
    configurations: Record<string, any> | any[];
    dryRun?: boolean;
    changeReason?: string;
  }) => api.post("/settings/config/import", data),

  getTelemetryMetrics: () => api.get("/settings/telemetry"),

  // ── Existing / Legacy Setting Endpoints ──
  getPublicSettings: () => api.get("/settings/public"),
  getAllSettings: () => api.get("/settings"),

  getGeneral: () => api.get("/settings/general"),
  updateGeneral: (data: SystemSetting) => api.patch("/settings/general", data),

  getBranding: () => api.get("/settings/branding"),
  updateBranding: (data: BrandingSetting) => api.patch("/settings/branding", data),

  getNotifications: () => api.get("/settings/notifications"),
  updateNotifications: (data: NotificationSetting) => api.patch("/settings/notifications", data),

  getIntegrations: () => api.get("/settings/integrations"),
  updateIntegrations: (data: IntegrationSetting) => api.patch("/settings/integrations", data),

  getSecurity: () => api.get("/settings/security"),
  updateSecurity: (data: SecuritySetting) => api.patch("/settings/security", data),

  getSeo: () => api.get("/settings/seo"),
  updateSeo: (data: SEOSetting) => api.patch("/settings/seo", data),

  getFeatureFlags: () => api.get("/settings/feature-flags"),
  toggleFeatureFlag: (key: string, enabled: boolean) => api.patch(`/settings/feature-flags/${key}`, { enabled }),

  getEmailTemplates: () => api.get("/settings/email-templates"),
  updateEmailTemplate: (id: string, data: Partial<EmailTemplate>) => api.patch(`/settings/email-templates/${id}`, data),

  // Test endpoints
  testEmail: (recipient?: string) => api.post("/settings/test-email", { recipient }),
  testSms: (phone?: string) => api.post("/settings/test-sms", { phone }),
  testWhatsapp: (phone?: string) => api.post("/settings/test-whatsapp", { phone }),
  testPush: () => api.post("/settings/test-push"),
  testPayment: () => api.post("/settings/test-payment"),
  testStorage: () => api.post("/settings/test-storage"),
  testAi: () => api.post("/settings/test-ai"),

  // Backup & Restore
  createBackup: () => api.post("/settings/backup"),
  getBackups: () => api.get("/settings/backups"),
  restoreBackup: (id: string) => api.post(`/settings/restore/${id}`),

  // History & Audit
  getHistory: () => api.get("/settings/history"),
  rollbackSetting: (id: string) => api.post(`/settings/rollback/${id}`),

  // Export / Import / Reset / Cache
  exportSettings: () => api.get("/settings/export"),
  importSettings: (data: any) => api.post("/settings/import", data),
  resetSettings: () => api.post("/settings/reset"),
  clearCache: () => api.post("/settings/cache/clear"),

  // System Diagnostics & Metrics
  getSystemHealth: () => api.get("/settings/system-health"),
  getEnvironmentInfo: () => api.get("/settings/environment"),
  getStorageUsage: () => api.get("/settings/storage-usage"),
  getLicenseInfo: () => api.get("/settings/license"),
};
