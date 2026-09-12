import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateConfigurationDto,
  UpdateConfigurationDto,
  QueryConfigurationDto,
  RollbackConfigurationDto,
  ImportConfigurationDto,
  SubmitApprovalDto,
  ReviewApprovalDto,
  ConfigurationDataType,
  ConfigurationScope,
  ConfigurationCategory,
} from './dto/configuration.dto';
import * as os from 'os';

export interface ScopeContext {
  organizationId?: string;
  departmentId?: string;
  unitId?: string;
  collegeId?: string;
  roleId?: string;
}

export interface ConfigurationDefinition {
  key: string;
  category: ConfigurationCategory;
  label: string;
  description: string;
  dataType: ConfigurationDataType;
  defaultValue: any;
  isHighRisk?: boolean;
  requiresApproval?: boolean;
  validationRules?: {
    min?: number;
    max?: number;
    enumOptions?: string[];
    regex?: string;
    step?: number;
    requiresReason?: boolean;
  };
}

export const CANONICAL_SETTINGS: ConfigurationDefinition[] = [
  // ── CRM & COUNSELING ──────────────────────────────────────────────────────────
  {
    key: 'crm.counselor.defaultMaxCapacity',
    category: ConfigurationCategory.COUNSELING,
    label: 'Default Counselor Active Case Capacity',
    description: 'Maximum number of concurrent active leads/students assigned to a counselor before routing bypass.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 20,
    isHighRisk: true,
    validationRules: { min: 1, max: 200, step: 1, requiresReason: true },
  },
  {
    key: 'crm.task.escalationHours',
    category: ConfigurationCategory.TASKS_SLA,
    label: 'CRM Task Overdue Escalation Threshold (Hours)',
    description: 'Time in hours after which an uncompleted overdue task is flagged and escalated to senior counselors/managers.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 24,
    isHighRisk: false,
    validationRules: { min: 1, max: 168, step: 1 },
  },
  {
    key: 'crm.task.reminderLeadMinutes',
    category: ConfigurationCategory.TASKS_SLA,
    label: 'Task Reminder Advance Notice (Minutes)',
    description: 'Advance time before task due date to dispatch push/in-app reminders.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 30,
    isHighRisk: false,
    validationRules: { min: 5, max: 1440, step: 5 },
  },
  {
    key: 'crm.reassignment.maxBulkBatch',
    category: ConfigurationCategory.COUNSELING,
    label: 'Maximum Bulk Reassignment Batch Size',
    description: 'Upper bound on number of leads/students that can be reallocated in a single bulk action.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 50,
    isHighRisk: false,
    validationRules: { min: 1, max: 500, step: 5 },
  },

  // ── ADMISSIONS & APPLICATIONS ────────────────────────────────────────────────
  {
    key: 'application.review.slaHoursNormal',
    category: ConfigurationCategory.ADMISSIONS,
    label: 'Application Review SLA - Normal Priority (Hours)',
    description: 'Target turnaround time in hours for review of standard priority admission applications.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 48,
    isHighRisk: true,
    validationRules: { min: 1, max: 240, step: 1, requiresReason: true },
  },
  {
    key: 'application.review.slaHoursHigh',
    category: ConfigurationCategory.ADMISSIONS,
    label: 'Application Review SLA - High Priority (Hours)',
    description: 'Target turnaround time in hours for review of high-priority applications.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 24,
    isHighRisk: true,
    validationRules: { min: 1, max: 120, step: 1, requiresReason: true },
  },
  {
    key: 'application.review.slaHoursUrgent',
    category: ConfigurationCategory.ADMISSIONS,
    label: 'Application Review SLA - Urgent Priority (Hours)',
    description: 'Target turnaround time in hours for expedited/urgent applications.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 12,
    isHighRisk: true,
    validationRules: { min: 1, max: 72, step: 1, requiresReason: true },
  },
  {
    key: 'application.draft.expiryDays',
    category: ConfigurationCategory.APPLICATIONS,
    label: 'Application Draft Expiry (Days)',
    description: 'Number of days an incomplete draft application remains active before being archived.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 30,
    isHighRisk: false,
    validationRules: { min: 7, max: 180, step: 1 },
  },
  {
    key: 'application.correction.windowHours',
    category: ConfigurationCategory.APPLICATIONS,
    label: 'Applicant Correction Window (Hours)',
    description: 'Time window provided to a student to fix queries or resubmit rejected documents.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 72,
    isHighRisk: false,
    validationRules: { min: 12, max: 336, step: 1 },
  },

  // ── PAYMENTS & FINANCE ────────────────────────────────────────────────────────
  {
    key: 'payment.verification.slaHours',
    category: ConfigurationCategory.PAYMENTS,
    label: 'Payment Verification SLA (Hours)',
    description: 'SLA threshold for finance officers to review and verify offline/UTR payments.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 24,
    isHighRisk: true,
    requiresApproval: true,
    validationRules: { min: 1, max: 120, step: 1, requiresReason: true },
  },
  {
    key: 'payment.invoice.dueDays',
    category: ConfigurationCategory.PAYMENTS,
    label: 'Default Invoice Due Period (Days)',
    description: 'Standard number of days from issuance until an admission invoice becomes overdue.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 15,
    isHighRisk: false,
    validationRules: { min: 1, max: 90, step: 1 },
  },
  {
    key: 'payment.refund.approvalThreshold',
    category: ConfigurationCategory.PAYMENTS,
    label: 'Refund Second-Person Approval Threshold (INR)',
    description: 'Refund requests exceeding this monetary value mandate multi-tier management sign-off.',
    dataType: ConfigurationDataType.DECIMAL,
    defaultValue: 25000,
    isHighRisk: true,
    requiresApproval: true,
    validationRules: { min: 1000, max: 1000000, step: 500, requiresReason: true },
  },
  {
    key: 'payment.retry.maxAttempts',
    category: ConfigurationCategory.PAYMENTS,
    label: 'Gateway Payment Auto-Retry Max Attempts',
    description: 'Maximum consecutive automated webhook retry attempts for pending transactions.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 3,
    isHighRisk: false,
    validationRules: { min: 1, max: 10, step: 1 },
  },

  // ── DOCUMENTS & STORAGE ───────────────────────────────────────────────────────
  {
    key: 'document.maxUploadSizeMb',
    category: ConfigurationCategory.DOCUMENTS,
    label: 'Maximum Document File Upload Size (MB)',
    description: 'Maximum allowable file size for individual student certificates, marksheets, and identity proofs.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 10,
    isHighRisk: true,
    validationRules: { min: 1, max: 50, step: 1, requiresReason: true },
  },
  {
    key: 'document.allowedExtensions',
    category: ConfigurationCategory.DOCUMENTS,
    label: 'Allowed Document File Extensions',
    description: 'Comma-delimited list of accepted MIME types/extensions for uploaded student documents.',
    dataType: ConfigurationDataType.STRING,
    defaultValue: 'pdf,jpg,jpeg,png,webp,docx',
    isHighRisk: true,
    validationRules: { requiresReason: true },
  },
  {
    key: 'document.retention.days',
    category: ConfigurationCategory.DOCUMENTS,
    label: 'Student Document Retention Policy (Days)',
    description: 'Duration after student graduation or archival before unreferenced temporary files are purged.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 1095, // 3 years
    isHighRisk: false,
    validationRules: { min: 30, max: 3650, step: 30 },
  },

  // ── REPORTING & ENROLLMENT ────────────────────────────────────────────────────
  {
    key: 'reporting.windowDays',
    category: ConfigurationCategory.REPORTING_ENROLLMENT,
    label: 'College Reporting Window (Days)',
    description: 'Days allowed for a student to report physically/digitally to the allotted college after seat confirmation.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 7,
    isHighRisk: false,
    validationRules: { min: 1, max: 30, step: 1 },
  },
  {
    key: 'enrollment.autoConfirmDays',
    category: ConfigurationCategory.REPORTING_ENROLLMENT,
    label: 'Final Enrollment Confirmation Period (Days)',
    description: 'Grace period for university registrar to confirm final registration numbers.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 5,
    isHighRisk: false,
    validationRules: { min: 1, max: 30, step: 1 },
  },

  // ── NOTIFICATIONS & CAMPAIGNS ────────────────────────────────────────────────
  {
    key: 'notification.campaign.maxRecipients',
    category: ConfigurationCategory.CAMPAIGNS,
    label: 'Maximum Campaign Audience Batch Size',
    description: 'Hard safety cap on audience recipients per single broadcast marketing campaign execution.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 5000,
    isHighRisk: true,
    validationRules: { min: 100, max: 100000, step: 100, requiresReason: true },
  },
  {
    key: 'notification.retry.maxAttempts',
    category: ConfigurationCategory.NOTIFICATIONS,
    label: 'Notification Provider Dispatch Retries',
    description: 'Maximum delivery attempts for failed SMS, Email, and WhatsApp dispatches.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 3,
    isHighRisk: false,
    validationRules: { min: 1, max: 10, step: 1 },
  },
  {
    key: 'notification.rateLimitPerMinute',
    category: ConfigurationCategory.NOTIFICATIONS,
    label: 'Global Notification Rate Limit (Dispatches/Min)',
    description: 'Outbound dispatch throttle to prevent provider rate-limit penalties.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 120,
    isHighRisk: false,
    validationRules: { min: 10, max: 1000, step: 10 },
  },
  {
    key: 'campaign.duplicateWindowHours',
    category: ConfigurationCategory.CAMPAIGNS,
    label: 'Campaign Duplicate Prevention Window (Hours)',
    description: 'Time window during which identical promotional messages cannot be re-sent to the same recipient.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 24,
    isHighRisk: false,
    validationRules: { min: 1, max: 168, step: 1 },
  },

  // ── REVIEWS & RANKINGS ────────────────────────────────────────────────────────
  {
    key: 'ranking.minimumVerifiedReviews',
    category: ConfigurationCategory.RANKINGS,
    label: 'Ranking Bayesian Prior Minimum Reviews Threshold',
    description: 'Minimum review count weight (m) utilized in Bayesian ranking computation algorithm.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 3,
    isHighRisk: true,
    validationRules: { min: 1, max: 50, step: 1, requiresReason: true },
  },
  {
    key: 'review.minimumCommentLength',
    category: ConfigurationCategory.REVIEWS,
    label: 'Student Review Minimum Text Length (Characters)',
    description: 'Minimum characters required when submitting qualitative college/counselor feedback.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 20,
    isHighRisk: false,
    validationRules: { min: 0, max: 200, step: 5 },
  },
  {
    key: 'review.autoModerationEnabled',
    category: ConfigurationCategory.REVIEWS,
    label: 'Automated Profanity & Spam Moderation Filter',
    description: 'Automatically filter reviews containing sensitive or prohibited content prior to public posting.',
    dataType: ConfigurationDataType.BOOLEAN,
    defaultValue: true,
    isHighRisk: false,
  },

  // ── ANALYTICS ─────────────────────────────────────────────────────────────────
  {
    key: 'analytics.dashboardCacheMinutes',
    category: ConfigurationCategory.ANALYTICS,
    label: 'Executive MIS Analytics Cache TTL (Minutes)',
    description: 'Duration for caching expensive aggregate analytics metrics in memory.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 5,
    isHighRisk: false,
    validationRules: { min: 1, max: 60, step: 1 },
  },
  {
    key: 'analytics.maxExportRecords',
    category: ConfigurationCategory.ANALYTICS,
    label: 'Maximum Exportable Records per MIS Report',
    description: 'Upper bound on CSV/Excel row extraction to safeguard server memory.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 10000,
    isHighRisk: false,
    validationRules: { min: 500, max: 100000, step: 500 },
  },

  // ── SECURITY & SESSIONS ───────────────────────────────────────────────────────
  {
    key: 'security.sessionTimeoutMinutes',
    category: ConfigurationCategory.SECURITY,
    label: 'User Inactivity Session Expiry (Minutes)',
    description: 'Automatic session invalidation window for idle web and mobile sessions.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 480, // 8 hours
    isHighRisk: true,
    validationRules: { min: 15, max: 1440, step: 15, requiresReason: true },
  },
  {
    key: 'security.maxLoginAttempts',
    category: ConfigurationCategory.SECURITY,
    label: 'Account Lockout Failed Login Threshold',
    description: 'Number of consecutive invalid credential attempts before temporary IP/Account lockout.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 5,
    isHighRisk: true,
    validationRules: { min: 3, max: 20, step: 1, requiresReason: true },
  },
  {
    key: 'security.accountLockMinutes',
    category: ConfigurationCategory.SECURITY,
    label: 'Account Lockout Duration (Minutes)',
    description: 'Duration for which an account remains locked after exceeding failed attempts.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 30,
    isHighRisk: true,
    validationRules: { min: 5, max: 1440, step: 5, requiresReason: true },
  },
  {
    key: 'security.passwordMinLength',
    category: ConfigurationCategory.SECURITY,
    label: 'Minimum Password Character Length',
    description: 'Minimum length enforced during registration and password resets.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 8,
    isHighRisk: true,
    validationRules: { min: 8, max: 32, step: 1, requiresReason: true },
  },

  // ── MAINTENANCE & SYSTEM ─────────────────────────────────────────────────────
  {
    key: 'system.maintenance.mode',
    category: ConfigurationCategory.MAINTENANCE,
    label: 'Platform Maintenance Mode State',
    description: 'Control maintenance lockout: OFF (Normal), ADMIN_ONLY (Staff/Admin allowed), or FULL_LOCKOUT.',
    dataType: ConfigurationDataType.ENUM,
    defaultValue: 'OFF',
    isHighRisk: true,
    requiresApproval: true,
    validationRules: {
      enumOptions: ['OFF', 'ADMIN_ONLY', 'FULL_LOCKOUT'],
      requiresReason: true,
    },
  },
  {
    key: 'system.maintenance.message',
    category: ConfigurationCategory.MAINTENANCE,
    label: 'Public Maintenance Announcement Notice',
    description: 'Message displayed on student portal and public landing pages during maintenance windows.',
    dataType: ConfigurationDataType.STRING,
    defaultValue: 'We are currently conducting scheduled system enhancements. Please check back shortly.',
    isHighRisk: false,
  },

  // ── FEATURE FLAGS ─────────────────────────────────────────────────────────────
  {
    key: 'feature.collegePortal.enabled',
    category: ConfigurationCategory.FEATURE_FLAGS,
    label: 'Direct College Admissions Portal Access',
    description: 'Enables autonomous college partner administrative access and quota management.',
    dataType: ConfigurationDataType.BOOLEAN,
    defaultValue: true,
    isHighRisk: false,
  },
  {
    key: 'feature.aiCounselor.enabled',
    category: ConfigurationCategory.FEATURE_FLAGS,
    label: 'AI Student Copilot & Recommendation Engine',
    description: 'Enables autonomous student 360 AI counseling recommendations and query resolution.',
    dataType: ConfigurationDataType.BOOLEAN,
    defaultValue: true,
    isHighRisk: false,
  },
  {
    key: 'feature.dynamicAudienceBuilder.enabled',
    category: ConfigurationCategory.FEATURE_FLAGS,
    label: 'Dynamic Audience Builder for Campaigns',
    description: 'Enables advanced rule-based student segment creation for targeted notifications.',
    dataType: ConfigurationDataType.BOOLEAN,
    defaultValue: true,
    isHighRisk: false,
  },
  // ─── SUPPORT DESK & SLA SETTINGS ─────────────────────────────────────────────
  {
    key: 'support.firstResponseSlaHours',
    category: ConfigurationCategory.TASKS_SLA,
    label: 'Support Desk First Response SLA (Hours)',
    description: 'Standard SLA timeframe in hours for support agents to provide first response on new tickets.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 2,
    isHighRisk: false,
  },
  {
    key: 'support.resolutionSlaHours',
    category: ConfigurationCategory.TASKS_SLA,
    label: 'Support Desk Resolution SLA (Hours)',
    description: 'Standard target timeframe in hours for full ticket resolution.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 24,
    isHighRisk: false,
  },
  {
    key: 'support.escalationHours',
    category: ConfigurationCategory.TASKS_SLA,
    label: 'Support Ticket Automatic Escalation Threshold (Hours)',
    description: 'Hours after ticket creation before automatic escalation to supervisor or department manager.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 48,
    isHighRisk: false,
  },
  {
    key: 'support.autoCloseHours',
    category: ConfigurationCategory.TASKS_SLA,
    label: 'Resolved Ticket Auto-Close Duration (Hours)',
    description: 'Duration in hours before a resolved ticket automatically transitions to closed status.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 72,
    isHighRisk: false,
  },
  {
    key: 'support.maxAttachments',
    category: ConfigurationCategory.DOCUMENTS,
    label: 'Maximum Attachments per Ticket',
    description: 'Maximum number of files that can be attached to a support ticket or message reply.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 5,
    isHighRisk: false,
  },
  {
    key: 'support.maxAttachmentSizeMb',
    category: ConfigurationCategory.DOCUMENTS,
    label: 'Maximum Attachment Size (MB)',
    description: 'Maximum permitted file upload size in megabytes for support ticket attachments.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 10,
    isHighRisk: false,
  },
  {
    key: 'support.bulkActionLimit',
    category: ConfigurationCategory.GENERAL,
    label: 'Support Bulk Action Item Limit',
    description: 'Maximum number of support tickets that can be updated in a single bulk operation.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 50,
    isHighRisk: false,
  },
  // ─── DOCUMENT & VERIFICATION GOVERNANCE SETTINGS ─────────────────────────────
  {
    key: 'document.maxUploadSizeMb',
    category: ConfigurationCategory.DOCUMENTS,
    label: 'Maximum Document Upload Size (MB)',
    description: 'Maximum permitted file upload size in megabytes for student, KYC, and application documents.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 10,
    isHighRisk: false,
  },
  {
    key: 'document.verification.slaHours',
    category: ConfigurationCategory.TASKS_SLA,
    label: 'Document Verification SLA (Hours)',
    description: 'Standard SLA in hours for admission verifiers to review and decide on uploaded documents.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 24,
    isHighRisk: false,
  },
  {
    key: 'document.correction.responseHours',
    category: ConfigurationCategory.TASKS_SLA,
    label: 'Document Correction Student Response Window (Hours)',
    description: 'Allowed timeframe in hours for student to upload corrected document version.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 48,
    isHighRisk: false,
  },
  {
    key: 'document.expiryReminderDays',
    category: ConfigurationCategory.DOCUMENTS,
    label: 'Document Expiry Warning Threshold (Days)',
    description: 'Days before document expiration to dispatch warning notifications.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 30,
    isHighRisk: false,
  },
  {
    key: 'document.maxVersions',
    category: ConfigurationCategory.DOCUMENTS,
    label: 'Maximum Document Versions Retained',
    description: 'Maximum number of historical document versions tracked in version history.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 5,
    isHighRisk: false,
  },
  {
    key: 'document.bulkActionLimit',
    category: ConfigurationCategory.GENERAL,
    label: 'Document Bulk Verification Batch Limit',
    description: 'Maximum number of documents that can be verified in a single bulk operation.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 50,
    isHighRisk: false,
  },
  // ─── AUDIT, COMPLIANCE & GOVERNANCE SETTINGS ────────────────────────────────
  {
    key: 'audit.retentionDays',
    category: ConfigurationCategory.GENERAL,
    label: 'Audit Log Active Retention Period (Days)',
    description: 'Duration in days for which immutable audit logs remain queryable in primary storage.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 365,
    isHighRisk: false,
  },
  {
    key: 'audit.archiveAfterDays',
    category: ConfigurationCategory.GENERAL,
    label: 'Audit Log Archival Threshold (Days)',
    description: 'Timeframe after which historical logs are transitioned to long-term cold archive.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 180,
    isHighRisk: false,
  },
  {
    key: 'audit.exportLimit',
    category: ConfigurationCategory.GENERAL,
    label: 'Maximum Audit Export Record Count',
    description: 'Maximum number of audit events that can be exported in a single batch.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 2000,
    isHighRisk: false,
  },
  {
    key: 'audit.searchPageLimit',
    category: ConfigurationCategory.GENERAL,
    label: 'Audit Search Page Size Limit',
    description: 'Maximum permitted rows per page in audit log search queries.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 50,
    isHighRisk: false,
  },
  {
    key: 'audit.highRiskAlertEnabled',
    category: ConfigurationCategory.SECURITY,
    label: 'High-Risk Audit Alerts Enabled',
    description: 'Enables automatic administrator notifications on critical security and permission changes.',
    dataType: ConfigurationDataType.BOOLEAN,
    defaultValue: true,
    isHighRisk: false,
  },
  // ─── NOTIFICATION & COMMUNICATION GOVERNANCE SETTINGS ─────────────────────
  {
    key: 'notification.retryLimit',
    category: ConfigurationCategory.GENERAL,
    label: 'Notification Delivery Maximum Retries',
    description: 'Maximum number of automatic retry attempts for transient delivery failures.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 3,
    isHighRisk: false,
  },
  {
    key: 'notification.batchSize',
    category: ConfigurationCategory.GENERAL,
    label: 'Campaign Delivery Batch Size',
    description: 'Number of recipients processed per worker batch in campaign dispatches.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 100,
    isHighRisk: false,
  },
  {
    key: 'notification.deliveryTimeout',
    category: ConfigurationCategory.GENERAL,
    label: 'Provider Delivery Timeout (Seconds)',
    description: 'Maximum seconds to wait for gateway acknowledgment before marking transient failure.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 30,
    isHighRisk: false,
  },
  {
    key: 'notification.rateLimitPerSec',
    category: ConfigurationCategory.GENERAL,
    label: 'Gateway Outbound Rate Limit (Messages/Sec)',
    description: 'Maximum permitted outbound messages per second across external SMS/WhatsApp/Email gateways.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 50,
    isHighRisk: false,
  },
  {
    key: 'notification.dlqRetentionDays',
    category: ConfigurationCategory.GENERAL,
    label: 'Dead Letter Queue Retention (Days)',
    description: 'Number of days failed communication logs are preserved for operational diagnosis.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 90,
    isHighRisk: false,
  },
  {
    key: 'notification.quietHoursEnabled',
    category: ConfigurationCategory.GENERAL,
    label: 'Promotional Quiet Hours Enforced',
    description: 'Restricts non-transactional marketing broadcasts between 9:00 PM and 8:00 AM recipient local time.',
    dataType: ConfigurationDataType.BOOLEAN,
    defaultValue: false,
    isHighRisk: false,
  },
  // ─── STUDENT REFERRAL & REWARD GOVERNANCE SETTINGS ────────────────────────
  {
    key: 'referral.enabled',
    category: ConfigurationCategory.GENERAL,
    label: 'Student Referral Program Active',
    description: 'Master switch controlling student referral link generation and reward attribution.',
    dataType: ConfigurationDataType.BOOLEAN,
    defaultValue: true,
    isHighRisk: false,
  },
  {
    key: 'referral.attributionWindowDays',
    category: ConfigurationCategory.GENERAL,
    label: 'Referral Attribution Validity Window (Days)',
    description: 'Maximum days between referral link opening and lead/application creation for valid attribution.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 90,
    isHighRisk: false,
  },
  {
    key: 'referral.maxActiveReferralsPerStudent',
    category: ConfigurationCategory.GENERAL,
    label: 'Maximum Referrals Per Student',
    description: 'Cap on total active rewarded referrals allowed per student account to prevent spam abuse.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 50,
    isHighRisk: false,
  },
  {
    key: 'referral.rewardApprovalRequired',
    category: ConfigurationCategory.PAYMENTS,
    label: 'Referral Reward Approval Required',
    description: 'Requires explicit Finance or Administrator sign-off before rewards can be disbursed.',
    dataType: ConfigurationDataType.BOOLEAN,
    defaultValue: true,
    isHighRisk: false,
  },
  {
    key: 'referral.rewardRuleVersion',
    category: ConfigurationCategory.PAYMENTS,
    label: 'Referral Reward Policy Rule Version',
    description: 'Canonical active reward calculation rule version applied on newly qualified enrollments.',
    dataType: ConfigurationDataType.STRING,
    defaultValue: 'v1.0',
    isHighRisk: false,
  },
  {
    key: 'referral.defaultRewardAmount',
    category: ConfigurationCategory.PAYMENTS,
    label: 'Default Student Referral Reward Amount (INR)',
    description: 'Standard cash reward disbursed upon confirmed enrollment of a referred applicant.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 500,
    isHighRisk: false,
  },
  {
    key: 'referral.fraudReviewThreshold',
    category: ConfigurationCategory.GENERAL,
    label: 'Referral Fraud Detection Flag Threshold',
    description: 'Threshold for automated fraud risk score before a referral is routed to compliance queue.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 5,
    isHighRisk: false,
  },
  {
    key: 'referral.historyPageLimit',
    category: ConfigurationCategory.GENERAL,
    label: 'Referral List Page Size',
    description: 'Standard pagination size for student and admin referral history queues.',
    dataType: ConfigurationDataType.INTEGER,
    defaultValue: 20,
    isHighRisk: false,
  },
];

@Injectable()
export class SystemConfigurationService implements OnModuleInit {
  private readonly logger = new Logger(SystemConfigurationService.name);
  private cache: Map<string, { value: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedCanonicalSettings();
  }

  /**
   * Seed or synchronize default canonical configuration keys
   */
  async seedCanonicalSettings() {
    try {
      for (const def of CANONICAL_SETTINGS) {
        const existing = await this.prisma.systemConfiguration.findUnique({
          where: {
            key_scope_scopeId: {
              key: def.key,
              scope: ConfigurationScope.GLOBAL,
              scopeId: '',
            },
          },
        });

        if (!existing) {
          const created = await this.prisma.systemConfiguration.create({
            data: {
              key: def.key,
              category: def.category,
              label: def.label,
              description: def.description,
              dataType: def.dataType,
              value: def.defaultValue,
              defaultValue: def.defaultValue,
              scope: ConfigurationScope.GLOBAL,
              scopeId: '',
              isHighRisk: def.isHighRisk || false,
              requiresApproval: def.requiresApproval || false,
              validationRules: def.validationRules ? JSON.parse(JSON.stringify(def.validationRules)) : null,
              status: 'ACTIVE',
              version: 1,
              changeReason: 'Initial System Seed',
              lastModifiedByName: 'System Bootstrapper',
            },
          });

          // Create initial version
          await this.prisma.systemConfigurationVersion.create({
            data: {
              configurationId: created.id,
              key: created.key,
              versionNumber: 1,
              oldValue: Prisma.DbNull,
              newValue: def.defaultValue,
              changeReason: 'Initial System Seed',
              action: 'CREATE',
              actorName: 'System Bootstrapper',
            },
          });
        }
      }
      this.logger.log(`Initialized ${CANONICAL_SETTINGS.length} canonical system configurations`);
    } catch (err: any) {
      this.logger.error(`Error seeding system configurations: ${err.message}`, err.stack);
    }
  }

  /**
   * Clear in-memory configuration cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.log('Configuration cache purged.');
  }

  // ─── AUTHORITATIVE RESOLUTION & TYPED GETTERS ───────────────────────────────

  /**
   * Resolve effective setting value honoring scope precedence:
   * 1. COLLEGE
   * 2. UNIT
   * 3. DEPARTMENT
   * 4. ORGANIZATION
   * 5. GLOBAL
   * 6. Code-level default fallback
   */
  async getEffectiveValue<T = any>(key: string, context?: ScopeContext): Promise<T> {
    const cacheKey = `${key}:${JSON.stringify(context || {})}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.value as T;
    }

    // 1. Check scopes in order of highest precedence
    const searchScopes: { scope: ConfigurationScope; scopeId?: string }[] = [];

    if (context?.collegeId) {
      searchScopes.push({ scope: ConfigurationScope.COLLEGE, scopeId: context.collegeId });
    }
    if (context?.unitId) {
      searchScopes.push({ scope: ConfigurationScope.UNIT, scopeId: context.unitId });
    }
    if (context?.departmentId) {
      searchScopes.push({ scope: ConfigurationScope.DEPARTMENT, scopeId: context.departmentId });
    }
    if (context?.organizationId) {
      searchScopes.push({ scope: ConfigurationScope.ORGANIZATION, scopeId: context.organizationId });
    }
    searchScopes.push({ scope: ConfigurationScope.GLOBAL, scopeId: '' });

    for (const s of searchScopes) {
      const match = await this.prisma.systemConfiguration.findUnique({
        where: {
          key_scope_scopeId: {
            key,
            scope: s.scope,
            scopeId: s.scopeId || '',
          },
        },
      });

      if (match && match.status === 'ACTIVE' && match.value !== null && match.value !== undefined) {
        const parsed = this.castValue(match.value, match.dataType as ConfigurationDataType);
        this.cache.set(cacheKey, { value: parsed, timestamp: Date.now() });
        return parsed as T;
      }
    }

    // 2. Fallback to canonical code-level definition
    const def = CANONICAL_SETTINGS.find((s) => s.key === key);
    if (def) {
      this.cache.set(cacheKey, { value: def.defaultValue, timestamp: Date.now() });
      return def.defaultValue as T;
    }

    return undefined as unknown as T;
  }

  async getNumber(key: string, defaultVal: number, context?: ScopeContext): Promise<number> {
    const val = await this.getEffectiveValue(key, context);
    return typeof val === 'number' ? val : Number(val ?? defaultVal);
  }

  async getBoolean(key: string, defaultVal: boolean, context?: ScopeContext): Promise<boolean> {
    const val = await this.getEffectiveValue(key, context);
    return typeof val === 'boolean' ? val : (val === 'true' || val === 1 ? true : val === 'false' || val === 0 ? false : defaultVal);
  }

  async getString(key: string, defaultVal: string, context?: ScopeContext): Promise<string> {
    const val = await this.getEffectiveValue(key, context);
    return val !== undefined && val !== null ? String(val) : defaultVal;
  }

  async getJson<T = any>(key: string, defaultVal: T, context?: ScopeContext): Promise<T> {
    const val = await this.getEffectiveValue<T>(key, context);
    return val !== undefined && val !== null ? val : defaultVal;
  }

  // ─── QUERY & CRUD OPERATIONS ─────────────────────────────────────────────────

  async queryConfigurations(dto: QueryConfigurationDto) {
    const { search, category, scope, scopeId, status, page = 1, limit = 50 } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (scope) {
      where.scope = scope;
      if (scopeId !== undefined) {
        where.scopeId = scopeId;
      }
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { key: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.systemConfiguration.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
        include: {
          approvals: {
            where: { status: 'PENDING' },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.systemConfiguration.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getConfigurationByKey(key: string, scope: ConfigurationScope = ConfigurationScope.GLOBAL, scopeId: string = '') {
    const config = await this.prisma.systemConfiguration.findUnique({
      where: {
        key_scope_scopeId: {
          key,
          scope,
          scopeId: scopeId || '',
        },
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 10,
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!config) {
      // Check if canonical definition exists
      const def = CANONICAL_SETTINGS.find((s) => s.key === key);
      if (def) {
        return {
          key: def.key,
          category: def.category,
          label: def.label,
          description: def.description,
          dataType: def.dataType,
          value: def.defaultValue,
          defaultValue: def.defaultValue,
          scope,
          scopeId,
          isHighRisk: def.isHighRisk || false,
          requiresApproval: def.requiresApproval || false,
          validationRules: def.validationRules,
          status: 'ACTIVE',
          version: 1,
          versions: [],
          approvals: [],
        };
      }
      throw new NotFoundException(`Configuration with key '${key}' not found.`);
    }

    return config;
  }

  /**
   * Update configuration with validation, optimistic concurrency, and approval checks
   */
  async updateConfiguration(
    key: string,
    dto: UpdateConfigurationDto,
    user: { id?: string; fullName?: string; email?: string; role?: string },
  ) {
    const scope = dto.scope || ConfigurationScope.GLOBAL;
    const scopeId = dto.scopeId || '';

    const existing = await this.prisma.systemConfiguration.findUnique({
      where: {
        key_scope_scopeId: {
          key,
          scope,
          scopeId,
        },
      },
    });

    if (!existing) {
      // Fallback create if it exists canonically
      const def = CANONICAL_SETTINGS.find((s) => s.key === key);
      if (def) {
        return this.createConfiguration(
          {
            key: def.key,
            label: def.label,
            description: def.description,
            category: def.category,
            dataType: def.dataType,
            defaultValue: def.defaultValue,
            value: dto.value,
            scope,
            scopeId,
            isHighRisk: def.isHighRisk,
            requiresApproval: def.requiresApproval,
            validationRules: def.validationRules,
            changeReason: dto.changeReason,
          },
          user,
        );
      }
      throw new NotFoundException(`Setting '${key}' does not exist.`);
    }

    // 1. Optimistic Locking Concurrency Check
    if (dto.expectedVersion !== undefined && existing.version !== dto.expectedVersion) {
      throw new ConflictException(
        `Setting '${key}' was modified by another administrator (Current version: v${existing.version}). Please refresh and try again.`,
      );
    }

    // 2. Validate value according to dataType and validationRules
    const validatedValue = this.validateAndCast(dto.value, existing.dataType as ConfigurationDataType, existing.validationRules);

    // 3. High Risk & Reason Check
    if (existing.isHighRisk && !dto.changeReason?.trim()) {
      throw new BadRequestException(`A change reason is mandatory for high-impact setting '${key}'.`);
    }

    // 4. Approval Workflow Check (If approval is mandatory and user is not Super Admin)
    if (existing.requiresApproval && user.role !== 'SUPER_ADMIN') {
      const pendingApproval = await this.prisma.configurationApprovalRequest.create({
        data: {
          configurationId: existing.id,
          key: existing.key,
          proposedValue: validatedValue,
          currentValue: existing.value as any,
          changeReason: dto.changeReason || 'Update proposed for governance approval',
          status: 'PENDING',
          requestedById: user.id || 'admin',
          requestedByName: user.fullName || user.email || 'Administrator',
        },
      });

      return {
        message: `Change for high-risk setting '${key}' submitted for second-person governance approval.`,
        approvalRequestId: pendingApproval.id,
        status: 'SUBMITTED_FOR_APPROVAL',
      };
    }

    // 5. Apply Direct Update
    const newVersion = existing.version + 1;
    const updated = await this.prisma.systemConfiguration.update({
      where: { id: existing.id },
      data: {
        value: validatedValue,
        version: newVersion,
        changeReason: dto.changeReason,
        lastModifiedById: user.id,
        lastModifiedByName: user.fullName || user.email || 'Administrator',
        updatedAt: new Date(),
      },
    });

    // 6. Record Version Snapshot
    await this.prisma.systemConfigurationVersion.create({
      data: {
        configurationId: existing.id,
        key: existing.key,
        versionNumber: newVersion,
        oldValue: existing.value as any,
        newValue: validatedValue,
        changeReason: dto.changeReason || 'Direct update by administrator',
        action: 'UPDATE',
        actorId: user.id,
        actorName: user.fullName || user.email || 'Administrator',
      },
    });

    // 7. Invalidate Cache
    this.clearCache();

    return updated;
  }

  async createConfiguration(
    dto: CreateConfigurationDto,
    user: { id?: string; fullName?: string; email?: string },
  ) {
    const scope = dto.scope || ConfigurationScope.GLOBAL;
    const scopeId = dto.scopeId || '';

    const validatedValue = this.validateAndCast(dto.value, dto.dataType, dto.validationRules);
    const validatedDefault = this.validateAndCast(dto.defaultValue, dto.dataType, dto.validationRules);

    const created = await this.prisma.systemConfiguration.create({
      data: {
        key: dto.key,
        label: dto.label,
        description: dto.description,
        category: dto.category,
        dataType: dto.dataType,
        value: validatedValue,
        defaultValue: validatedDefault,
        scope,
        scopeId,
        isEncrypted: dto.isEncrypted || false,
        isHighRisk: dto.isHighRisk || false,
        requiresApproval: dto.requiresApproval || false,
        validationRules: dto.validationRules ? JSON.parse(JSON.stringify(dto.validationRules)) : null,
        status: 'ACTIVE',
        version: 1,
        changeReason: dto.changeReason || 'Created custom configuration',
        lastModifiedById: user.id,
        lastModifiedByName: user.fullName || user.email || 'Administrator',
      },
    });

    await this.prisma.systemConfigurationVersion.create({
      data: {
        configurationId: created.id,
        key: created.key,
        versionNumber: 1,
        oldValue: Prisma.DbNull,
        newValue: validatedValue,
        changeReason: dto.changeReason || 'Created configuration',
        action: 'CREATE',
        actorId: user.id,
        actorName: user.fullName || user.email || 'Administrator',
      },
    });

    this.clearCache();
    return created;
  }

  // ─── APPROVAL WORKFLOW ───────────────────────────────────────────────────────

  async submitForApproval(
    key: string,
    dto: SubmitApprovalDto,
    user: { id?: string; fullName?: string; email?: string },
  ) {
    const scope = dto.scope || ConfigurationScope.GLOBAL;
    const scopeId = dto.scopeId || '';

    const config = await this.prisma.systemConfiguration.findUnique({
      where: { key_scope_scopeId: { key, scope, scopeId } },
    });

    if (!config) {
      throw new NotFoundException(`Setting '${key}' does not exist.`);
    }

    const validatedProposed = this.validateAndCast(
      dto.proposedValue,
      config.dataType as ConfigurationDataType,
      config.validationRules,
    );

    const approval = await this.prisma.configurationApprovalRequest.create({
      data: {
        configurationId: config.id,
        key: config.key,
        proposedValue: validatedProposed,
        currentValue: config.value as any,
        changeReason: dto.changeReason,
        status: 'PENDING',
        requestedById: user.id || 'admin',
        requestedByName: user.fullName || user.email || 'Administrator',
      },
    });

    return approval;
  }

  async reviewApproval(
    approvalId: string,
    dto: ReviewApprovalDto,
    user: { id?: string; fullName?: string; email?: string; role?: string },
  ) {
    const approval = await this.prisma.configurationApprovalRequest.findUnique({
      where: { id: approvalId },
      include: { configuration: true },
    });

    if (!approval) {
      throw new NotFoundException(`Approval request '${approvalId}' not found.`);
    }

    if (approval.status !== 'PENDING') {
      throw new BadRequestException(`Approval request has already been ${approval.status.toLowerCase()}.`);
    }

    // Second-person verification: Submitter cannot approve their own high-risk request unless Super Admin
    if (approval.requestedById === user.id && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Second-person rule violation: You cannot approve your own configuration proposal.');
    }

    const updatedApproval = await this.prisma.configurationApprovalRequest.update({
      where: { id: approvalId },
      data: {
        status: dto.status,
        reviewedById: user.id,
        reviewedByName: user.fullName || user.email || 'Approver',
        reviewNotes: dto.reviewNotes,
        updatedAt: new Date(),
      },
    });

    if (dto.status === 'APPROVED') {
      const config = approval.configuration;
      const newVersion = config.version + 1;

      await this.prisma.systemConfiguration.update({
        where: { id: config.id },
        data: {
          value: approval.proposedValue as any,
          version: newVersion,
          changeReason: `[APPROVED] ${approval.changeReason}`,
          approvedById: user.id,
          approvedByName: user.fullName || user.email || 'Approver',
          approvedAt: new Date(),
          lastModifiedById: user.id,
          lastModifiedByName: user.fullName || user.email || 'Approver',
        },
      });

      await this.prisma.systemConfigurationVersion.create({
        data: {
          configurationId: config.id,
          key: config.key,
          versionNumber: newVersion,
          oldValue: config.value as any,
          newValue: approval.proposedValue as any,
          changeReason: `[APPROVED by ${user.fullName || user.email}] ${approval.changeReason}`,
          action: 'APPROVE',
          actorId: user.id,
          actorName: user.fullName || user.email || 'Approver',
        },
      });

      this.clearCache();
    }

    return updatedApproval;
  }

  async getPendingApprovals() {
    return this.prisma.configurationApprovalRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        configuration: true,
      },
    });
  }

  // ─── ROLLBACK & RESET ────────────────────────────────────────────────────────

  async rollbackConfiguration(
    key: string,
    dto: RollbackConfigurationDto,
    user: { id?: string; fullName?: string; email?: string },
  ) {
    const scope = dto.scope || ConfigurationScope.GLOBAL;
    const scopeId = dto.scopeId || '';

    const config = await this.prisma.systemConfiguration.findUnique({
      where: { key_scope_scopeId: { key, scope, scopeId } },
    });

    if (!config) {
      throw new NotFoundException(`Setting '${key}' does not exist.`);
    }

    const targetVersion = await this.prisma.systemConfigurationVersion.findFirst({
      where: {
        configurationId: config.id,
        versionNumber: dto.targetVersionNumber,
      },
    });

    if (!targetVersion) {
      throw new NotFoundException(`Target version v${dto.targetVersionNumber} not found for '${key}'.`);
    }

    const newVersionNumber = config.version + 1;
    const rollbackValue = targetVersion.newValue;

    const updated = await this.prisma.systemConfiguration.update({
      where: { id: config.id },
      data: {
        value: rollbackValue as any,
        version: newVersionNumber,
        changeReason: dto.changeReason || `Rolled back to version v${dto.targetVersionNumber}`,
        lastModifiedById: user.id,
        lastModifiedByName: user.fullName || user.email || 'Administrator',
        updatedAt: new Date(),
      },
    });

    await this.prisma.systemConfigurationVersion.create({
      data: {
        configurationId: config.id,
        key: config.key,
        versionNumber: newVersionNumber,
        oldValue: config.value as any,
        newValue: rollbackValue as any,
        changeReason: dto.changeReason || `Rolled back to v${dto.targetVersionNumber}`,
        action: 'ROLLBACK',
        actorId: user.id,
        actorName: user.fullName || user.email || 'Administrator',
      },
    });

    this.clearCache();
    return updated;
  }

  async resetToDefault(
    key: string,
    scope: ConfigurationScope = ConfigurationScope.GLOBAL,
    scopeId: string = '',
    user: { id?: string; fullName?: string; email?: string },
  ) {
    const config = await this.prisma.systemConfiguration.findUnique({
      where: { key_scope_scopeId: { key, scope, scopeId } },
    });

    if (!config) {
      throw new NotFoundException(`Setting '${key}' does not exist.`);
    }

    const newVersionNumber = config.version + 1;

    const updated = await this.prisma.systemConfiguration.update({
      where: { id: config.id },
      data: {
        value: config.defaultValue as any,
        version: newVersionNumber,
        changeReason: 'Reset to system default value',
        lastModifiedById: user.id,
        lastModifiedByName: user.fullName || user.email || 'Administrator',
        updatedAt: new Date(),
      },
    });

    await this.prisma.systemConfigurationVersion.create({
      data: {
        configurationId: config.id,
        key: config.key,
        versionNumber: newVersionNumber,
        oldValue: config.value as any,
        newValue: config.defaultValue as any,
        changeReason: 'Reset to default',
        action: 'RESET',
        actorId: user.id,
        actorName: user.fullName || user.email || 'Administrator',
      },
    });

    this.clearCache();
    return updated;
  }

  async getConfigurationHistory(key: string, scope: ConfigurationScope = ConfigurationScope.GLOBAL, scopeId: string = '') {
    const config = await this.prisma.systemConfiguration.findUnique({
      where: { key_scope_scopeId: { key, scope, scopeId } },
    });

    if (!config) {
      throw new NotFoundException(`Setting '${key}' does not exist.`);
    }

    return this.prisma.systemConfigurationVersion.findMany({
      where: { configurationId: config.id },
      orderBy: { versionNumber: 'desc' },
    });
  }

  // ─── EXPORT & IMPORT ─────────────────────────────────────────────────────────

  /**
   * Export all non-secret configurations
   */
  async exportNonSecretConfigurations() {
    const configs = await this.prisma.systemConfiguration.findMany({
      where: {
        isEncrypted: false,
      },
      select: {
        key: true,
        category: true,
        label: true,
        description: true,
        dataType: true,
        value: true,
        defaultValue: true,
        scope: true,
        scopeId: true,
        isHighRisk: true,
        validationRules: true,
        version: true,
        updatedAt: true,
      },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return {
      exportedAt: new Date().toISOString(),
      platform: 'Swayam Admission Enterprise',
      version: '1.0',
      totalConfigurations: configs.length,
      configurations: configs,
    };
  }

  /**
   * Import configurations with schema validation and diff preview
   */
  async importConfigurations(
    dto: ImportConfigurationDto,
    user: { id?: string; fullName?: string; email?: string },
  ) {
    const inputConfigs = dto.configurations;
    const diffReport: {
      key: string;
      status: 'UNCHANGED' | 'MODIFIED' | 'ADDED' | 'INVALID';
      oldValue?: any;
      newValue?: any;
      error?: string;
    }[] = [];

    const itemsToApply: {
      configId?: string;
      key: string;
      value: any;
      category?: string;
      label?: string;
      dataType?: string;
      defaultValue?: any;
      scope?: string;
      scopeId?: string;
    }[] = [];

    const entries = Array.isArray(inputConfigs) ? inputConfigs : Object.entries(inputConfigs).map(([k, v]) => ({ key: k, value: v }));

    for (const item of entries) {
      const key = item.key;
      const proposedVal = item.value !== undefined ? item.value : item;
      const scope = item.scope || ConfigurationScope.GLOBAL;
      const scopeId = item.scopeId || '';

      const existing = await this.prisma.systemConfiguration.findUnique({
        where: { key_scope_scopeId: { key, scope, scopeId } },
      });

      if (existing) {
        try {
          const validated = this.validateAndCast(
            proposedVal,
            existing.dataType as ConfigurationDataType,
            existing.validationRules,
          );

          const isSame = JSON.stringify(existing.value) === JSON.stringify(validated);
          if (isSame) {
            diffReport.push({ key, status: 'UNCHANGED', oldValue: existing.value, newValue: validated });
          } else {
            diffReport.push({ key, status: 'MODIFIED', oldValue: existing.value, newValue: validated });
            itemsToApply.push({ configId: existing.id, key, value: validated });
          }
        } catch (err: any) {
          diffReport.push({ key, status: 'INVALID', oldValue: existing.value, newValue: proposedVal, error: err.message });
        }
      } else {
        const canonical = CANONICAL_SETTINGS.find((s) => s.key === key);
        if (canonical) {
          try {
            const validated = this.validateAndCast(
              proposedVal,
              canonical.dataType,
              canonical.validationRules,
            );
            diffReport.push({ key, status: 'ADDED', oldValue: null, newValue: validated });
            itemsToApply.push({
              key,
              value: validated,
              category: canonical.category,
              label: canonical.label,
              dataType: canonical.dataType,
              defaultValue: canonical.defaultValue,
              scope,
              scopeId,
            });
          } catch (err: any) {
            diffReport.push({ key, status: 'INVALID', oldValue: null, newValue: proposedVal, error: err.message });
          }
        } else {
          diffReport.push({ key, status: 'INVALID', error: `Unknown configuration key '${key}'.` });
        }
      }
    }

    // If Dry Run, return diff only
    if (dto.dryRun) {
      return {
        dryRun: true,
        summary: {
          total: diffReport.length,
          modified: diffReport.filter((r) => r.status === 'MODIFIED').length,
          added: diffReport.filter((r) => r.status === 'ADDED').length,
          unchanged: diffReport.filter((r) => r.status === 'UNCHANGED').length,
          invalid: diffReport.filter((r) => r.status === 'INVALID').length,
        },
        diffReport,
      };
    }

    // If there are invalid entries, abort import
    const invalidEntries = diffReport.filter((r) => r.status === 'INVALID');
    if (invalidEntries.length > 0) {
      throw new BadRequestException({
        message: 'Import validation failed. Correct invalid configuration values before applying.',
        invalidEntries,
      });
    }

    // Apply transactional import
    for (const item of itemsToApply) {
      if (item.configId) {
        const curr = await this.prisma.systemConfiguration.findUnique({ where: { id: item.configId } });
        if (curr) {
          const newVer = curr.version + 1;
          await this.prisma.systemConfiguration.update({
            where: { id: item.configId },
            data: {
              value: item.value,
              version: newVer,
              changeReason: dto.changeReason || 'Bulk configuration import',
              lastModifiedById: user.id,
              lastModifiedByName: user.fullName || user.email || 'Administrator',
            },
          });

          await this.prisma.systemConfigurationVersion.create({
            data: {
              configurationId: item.configId,
              key: item.key,
              versionNumber: newVer,
              oldValue: curr.value as any,
              newValue: item.value,
              changeReason: dto.changeReason || 'Bulk configuration import',
              action: 'IMPORT',
              actorId: user.id,
              actorName: user.fullName || user.email || 'Administrator',
            },
          });
        }
      } else {
        const created = await this.prisma.systemConfiguration.create({
          data: {
            key: item.key,
            label: item.label || item.key,
            category: (item.category as ConfigurationCategory) || ConfigurationCategory.GENERAL,
            dataType: (item.dataType as ConfigurationDataType) || ConfigurationDataType.STRING,
            value: item.value,
            defaultValue: item.defaultValue || item.value,
            scope: (item.scope as ConfigurationScope) || ConfigurationScope.GLOBAL,
            scopeId: item.scopeId || '',
            status: 'ACTIVE',
            version: 1,
            changeReason: dto.changeReason || 'Bulk configuration import',
            lastModifiedById: user.id,
            lastModifiedByName: user.fullName || user.email || 'Administrator',
          },
        });

        await this.prisma.systemConfigurationVersion.create({
          data: {
            configurationId: created.id,
            key: created.key,
            versionNumber: 1,
            oldValue: Prisma.DbNull,
            newValue: item.value,
            changeReason: dto.changeReason || 'Bulk import create',
            action: 'IMPORT',
            actorId: user.id,
            actorName: user.fullName || user.email || 'Administrator',
          },
        });
      }
    }

    this.clearCache();

    return {
      message: `Successfully applied ${itemsToApply.length} configuration updates.`,
      appliedCount: itemsToApply.length,
      diffReport,
    };
  }

  // ─── REAL SYSTEM HEALTH & TELEMETRY ──────────────────────────────────────────

  async getSystemHealthMetrics() {
    const startTime = Date.now();
    let dbStatus = 'HEALTHY';
    let dbLatencyMs = 0;

    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch (err: any) {
      dbStatus = 'DOWN';
      dbLatencyMs = -1;
    }

    const memUsage = process.memoryUsage();
    const systemFreeMem = os.freemem();
    const systemTotalMem = os.totalmem();

    // Check application queue & counts
    let activeTasksCount = 0;
    let pendingApplicationsCount = 0;
    let pendingPaymentsCount = 0;

    try {
      [activeTasksCount, pendingApplicationsCount, pendingPaymentsCount] = await Promise.all([
        this.prisma.task.count({ where: { status: 'PENDING' } }),
        this.prisma.application.count({ where: { status: 'NEW' } }),
        this.prisma.payment.count({ where: { status: 'PENDING' } }),
      ]);
    } catch {
      // Ignored if counting fails
    }

    return {
      status: dbStatus === 'HEALTHY' ? 'ONLINE' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        dialect: 'PostgreSQL',
      },
      system: {
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        osUptimeSeconds: Math.floor(os.uptime()),
        platform: os.platform(),
        cpus: os.cpus().length,
        memoryUsageMb: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
          systemFree: Math.round(systemFreeMem / 1024 / 1024),
          systemTotal: Math.round(systemTotalMem / 1024 / 1024),
        },
      },
      queues: {
        activeTasks: activeTasksCount,
        pendingApplications: pendingApplicationsCount,
        pendingPayments: pendingPaymentsCount,
      },
      cache: {
        status: 'ONLINE',
        cachedKeysCount: this.cache.size,
        ttlSeconds: this.CACHE_TTL_MS / 1000,
      },
    };
  }

  // ─── VALIDATION & CASTING UTILITIES ──────────────────────────────────────────

  private validateAndCast(value: any, dataType: ConfigurationDataType, rules?: any): any {
    if (value === null || value === undefined) {
      throw new BadRequestException('Configuration value cannot be null or empty.');
    }

    let parsed: any;

    switch (dataType) {
      case ConfigurationDataType.INTEGER: {
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num)) {
          throw new BadRequestException(`Value '${value}' must be a valid integer.`);
        }
        if (rules?.min !== undefined && num < rules.min) {
          throw new BadRequestException(`Value ${num} is below minimum allowed threshold (${rules.min}).`);
        }
        if (rules?.max !== undefined && num > rules.max) {
          throw new BadRequestException(`Value ${num} exceeds maximum allowed limit (${rules.max}).`);
        }
        parsed = num;
        break;
      }

      case ConfigurationDataType.DECIMAL: {
        const num = Number(value);
        if (isNaN(num)) {
          throw new BadRequestException(`Value '${value}' must be a valid number.`);
        }
        if (rules?.min !== undefined && num < rules.min) {
          throw new BadRequestException(`Value ${num} is below minimum allowed threshold (${rules.min}).`);
        }
        if (rules?.max !== undefined && num > rules.max) {
          throw new BadRequestException(`Value ${num} exceeds maximum allowed limit (${rules.max}).`);
        }
        parsed = num;
        break;
      }

      case ConfigurationDataType.BOOLEAN: {
        if (typeof value === 'boolean') {
          parsed = value;
        } else if (value === 'true' || value === 1 || value === '1') {
          parsed = true;
        } else if (value === 'false' || value === 0 || value === '0') {
          parsed = false;
        } else {
          throw new BadRequestException(`Value '${value}' must be a boolean.`);
        }
        break;
      }

      case ConfigurationDataType.ENUM: {
        const str = String(value).trim();
        if (rules?.enumOptions && Array.isArray(rules.enumOptions)) {
          if (!rules.enumOptions.includes(str)) {
            throw new BadRequestException(
              `Invalid option '${str}'. Must be one of: [${rules.enumOptions.join(', ')}].`,
            );
          }
        }
        parsed = str;
        break;
      }

      case ConfigurationDataType.JSON: {
        if (typeof value === 'object') {
          parsed = value;
        } else {
          try {
            parsed = JSON.parse(String(value));
          } catch (e: any) {
            throw new BadRequestException(`Invalid JSON format: ${e.message}`);
          }
        }
        break;
      }

      case ConfigurationDataType.STRING:
      default: {
        const str = String(value);
        if (rules?.regex) {
          const reg = new RegExp(rules.regex);
          if (!reg.test(str)) {
            throw new BadRequestException(`Value '${str}' does not match required format constraint.`);
          }
        }
        parsed = str;
        break;
      }
    }

    return parsed;
  }

  private castValue(value: any, dataType: ConfigurationDataType): any {
    if (value === null || value === undefined) return value;
    switch (dataType) {
      case ConfigurationDataType.INTEGER:
      case ConfigurationDataType.DECIMAL:
        return Number(value);
      case ConfigurationDataType.BOOLEAN:
        return typeof value === 'boolean' ? value : value === 'true' || value === 1;
      case ConfigurationDataType.JSON:
        return typeof value === 'object' ? value : JSON.parse(String(value));
      default:
        return value;
    }
  }
}
