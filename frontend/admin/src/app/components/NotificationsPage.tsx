import React, { useState, useEffect, useMemo } from "react";
import {
  Bell, Search, RefreshCw, Plus, CheckCircle, Trash2,
  AlertTriangle, ShieldAlert, CheckCircle2, Clock, Filter,
  Send, User, FileText, X, Sparkles, Radio,
  Mail, Phone, MessageSquare, Users, MapPin, GraduationCap, Building,
  Check, ArrowRight, ShieldCheck, BarChart3, Activity, AlertCircle,
  RotateCcw, Calendar, Eye, Edit3, ChevronRight, Layers, Sliders,
  Bookmark, BookmarkCheck, Copy, Archive, ExternalLink
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  notificationsApi,
  CreateNotificationPayload,
  AudienceFilterPayload,
  CreateCampaignPayload,
  CreateTemplatePayload,
  SaveAudiencePayload,
  SavedAudienceItem,
} from "../../api/notifications.api";
import ErrorBoundary from "./ErrorBoundary";

type ActiveTab = "overview" | "campaigns" | "audience_builder" | "saved_audiences" | "templates" | "delivery_logs" | "system_alerts";

const CATEGORIES = ["SYSTEM", "CRM", "APPLICATION", "DOCUMENT", "PAYMENT", "MARKETING", "SECURITY", "EXAM", "SCHOLARSHIP"];
const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const ROLES = ["STUDENT", "COUNSELOR", "ADMIN", "SUPER_ADMIN", "SENIOR_COUNSELOR"];

export interface CampaignDraft {
  campaignName: string;
  campaignType: "PROMOTIONAL" | "TRANSACTIONAL";
  channels: ("IN_APP" | "EMAIL" | "SMS" | "WHATSAPP")[];
  targetEntity: "STUDENT" | "LEAD" | "STAFF" | "ALL";
  audienceId?: string;
  messageTitle: string;
  emailSubject?: string;
  messageBody: string;
  smsBody?: string;
  whatsAppBody?: string;
  emailHtml?: string;
  templateId?: string;
  scheduledAt?: string;
  audienceFilter: AudienceFilterPayload;
}

export function normalizeCampaignDraft(
  draft: Partial<CampaignDraft>,
  liveAudience?: AudienceFilterPayload
): CampaignDraft {
  const cName = (draft.campaignName || (draft as any).name || "").trim();
  const mTitle = (draft.messageTitle || (draft as any).title || "").trim();
  const mBody = (draft.messageBody || (draft as any).message || "").trim();
  const eSub = (draft.emailSubject || (draft as any).subject || "").trim();

  return {
    campaignName: cName,
    campaignType: draft.campaignType || (draft as any).type || "PROMOTIONAL",
    channels: Array.isArray(draft.channels) && draft.channels.length > 0
      ? draft.channels
      : ["IN_APP", "EMAIL"],
    targetEntity: draft.targetEntity || "STUDENT",
    audienceId: draft.audienceId || undefined,
    messageTitle: mTitle,
    emailSubject: eSub || undefined,
    messageBody: mBody,
    smsBody: draft.smsBody?.trim() || undefined,
    whatsAppBody: draft.whatsAppBody?.trim() || undefined,
    emailHtml: draft.emailHtml || undefined,
    templateId: draft.templateId || undefined,
    scheduledAt: draft.scheduledAt?.trim() || undefined,
    audienceFilter: liveAudience || draft.audienceFilter || {
      targetEntity: draft.targetEntity || "STUDENT",
      conditions: [],
      exclusions: [],
      collegeRelationship: "ANY",
    },
  };
}

export function validateCampaignDraft(
  draft: CampaignDraft,
  options: { requireRecipients?: boolean; recipientCount?: number; sendImmediately?: boolean } = {}
): { isValid: boolean; error?: string } {
  if (!draft.campaignName || draft.campaignName.trim() === "") {
    return { isValid: false, error: "Campaign name is required." };
  }
  if (!draft.messageTitle || draft.messageTitle.trim() === "") {
    return { isValid: false, error: "Message title is required." };
  }
  if (!draft.messageBody || draft.messageBody.trim() === "") {
    return { isValid: false, error: "Message body is required." };
  }
  if (!draft.channels || draft.channels.length === 0) {
    return { isValid: false, error: "Please select at least one delivery channel." };
  }
  if (draft.scheduledAt && draft.scheduledAt.trim() !== "") {
    const parsed = new Date(draft.scheduledAt);
    if (isNaN(parsed.getTime())) {
      return { isValid: false, error: "Scheduled time format is invalid." };
    }
    if (parsed.getTime() <= Date.now() && !options.sendImmediately) {
      return { isValid: false, error: "Scheduled time must be in the future. Leave blank to save as draft." };
    }
  }
  if (options.requireRecipients && (options.recipientCount === 0 || options.recipientCount === undefined)) {
    return { isValid: false, error: "No eligible recipients found. Broaden audience filters to dispatch immediately." };
  }
  return { isValid: true };
}

const initialCampaignDraft: CampaignDraft = {
  campaignName: "",
  campaignType: "PROMOTIONAL",
  channels: ["IN_APP", "EMAIL"],
  targetEntity: "STUDENT",
  audienceId: undefined,
  messageTitle: "",
  emailSubject: "",
  messageBody: "",
  smsBody: "",
  whatsAppBody: "",
  emailHtml: "",
  scheduledAt: "",
  audienceFilter: {
    targetEntity: "STUDENT",
    conditions: [],
    exclusions: [],
    collegeRelationship: "ANY",
  },
};

function NotificationsPageInner() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  // Global Action Feedback Banner
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showFeedback = (type: "success" | "error" | "info", message: string) => {
    setFeedbackBanner({ type, message });
    setTimeout(() => {
      setFeedbackBanner(null);
    }, 6000);
  };

  // ─── SYSTEM ALERTS STATE ──────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isReadFilter, setIsReadFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState<CreateNotificationPayload>({
    title: "",
    message: "",
    priority: "MEDIUM",
    category: "SYSTEM",
    type: "SYSTEM",
    receiverRole: "STUDENT",
  });

  // ─── CAMPAIGNS STATE & SINGLE AUTHORITATIVE DRAFT STATE ────────────────────
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("");
  const [campaignChannelFilter, setCampaignChannelFilter] = useState("");
  const [campaignPage, setCampaignPage] = useState(1);
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [sendNowImmediate, setSendNowImmediate] = useState(false);

  // Single Canonical Campaign Draft State
  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft>(initialCampaignDraft);

  // ─── AUDIENCE BUILDER STATE (Shared for Wizard & Tab) ──────────────────────
  const [builderTargetEntity, setBuilderTargetEntity] = useState<"STUDENT" | "LEAD" | "STAFF" | "ALL">("STUDENT");
  const [builderState, setBuilderState] = useState("");
  const [builderDistrict, setBuilderDistrict] = useState("");
  const [builderEducation, setBuilderEducation] = useState("");
  const [builderPassingYear, setBuilderPassingYear] = useState<number | "">("");
  const [builderStream, setBuilderStream] = useState("");
  const [builderCourse, setBuilderCourse] = useState("");
  const [builderBranch, setBuilderBranch] = useState("");
  const [builderCollege, setBuilderCollege] = useState("");
  const [builderCollegeRel, setBuilderCollegeRel] = useState<any>("ANY");
  const [builderAppStatus, setBuilderAppStatus] = useState("");
  const [builderPaymentStatus, setBuilderPaymentStatus] = useState("");
  const [builderRole, setBuilderRole] = useState("");
  const [builderCounselor, setBuilderCounselor] = useState("");
  const [builderAppAge, setBuilderAppAge] = useState("");
  const [builderLastLogin, setBuilderLastLogin] = useState("");
  const [excludeAppStatus, setExcludeAppStatus] = useState("");

  // ─── SAVED AUDIENCES STATE ────────────────────────────────────────────────
  const [savedAudienceSearch, setSavedAudienceSearch] = useState("");
  const [savedAudienceEntityFilter, setSavedAudienceEntityFilter] = useState("");
  const [savedAudiencePage, setSavedAudiencePage] = useState(1);
  const [showSaveAudienceModal, setShowSaveAudienceModal] = useState(false);
  const [saveAudienceForm, setSaveAudienceForm] = useState<{
    name: string;
    description: string;
    entityType: "STUDENT" | "LEAD" | "STAFF" | "ALL";
  }>({
    name: "",
    description: "",
    entityType: "STUDENT",
  });

  // ─── TEMPLATES STATE ──────────────────────────────────────────────────────
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [previewTemplateCode, setPreviewTemplateCode] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<CreateTemplatePayload>({
    code: "",
    name: "",
    category: "TRANSACTIONAL",
    channels: ["IN_APP", "EMAIL"],
    subject: "",
    inAppTitle: "",
    inAppMessage: "",
    emailHtml: "",
    emailText: "",
    smsBody: "",
    whatsAppBody: "",
  });

  // ─── DELIVERY LOGS STATE ──────────────────────────────────────────────────
  const [logChannel, setLogChannel] = useState("");
  const [logStatus, setLogStatus] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logPage, setLogPage] = useState(1);

  // ─── QUERIES ──────────────────────────────────────────────────────────────

  // 1. Stats
  const { data: statsRes, refetch: refetchStats } = useQuery({
    queryKey: ["notification_stats"],
    queryFn: () => notificationsApi.getStats(),
  });

  // 2. Audience Meta Options (States, Districts, Courses, Branches, Roles, etc.)
  const { data: metaRes } = useQuery({
    queryKey: ["audience_meta"],
    queryFn: () => notificationsApi.getAudienceMeta(),
  });
  const meta = metaRes?.data || {};

  // 3. System Alerts List
  const { data: notifsRes, isLoading: isNotifsLoading, refetch: refetchNotifs } = useQuery({
    queryKey: ["notifications", search, priorityFilter, categoryFilter, roleFilter, isReadFilter, page],
    queryFn: () =>
      notificationsApi.getPaginated({
        search: search || undefined,
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
        receiverRole: roleFilter || undefined,
        isRead: isReadFilter || undefined,
        page,
        limit: 10,
      }),
  });

  // 4. Campaigns List
  const { data: campaignsRes, isLoading: isCampaignsLoading, refetch: refetchCampaigns } = useQuery({
    queryKey: ["communication_campaigns", campaignSearch, campaignStatusFilter, campaignChannelFilter, campaignPage],
    queryFn: () =>
      notificationsApi.getCampaigns({
        search: campaignSearch || undefined,
        status: campaignStatusFilter || undefined,
        channel: campaignChannelFilter || undefined,
        page: campaignPage,
        limit: 10,
      }),
  });

  // 5. Campaign Analytics Detail
  const { data: campaignAnalyticsRes } = useQuery({
    queryKey: ["campaign_analytics", selectedCampaignId],
    queryFn: () => notificationsApi.getCampaignAnalytics(selectedCampaignId!),
    enabled: !!selectedCampaignId,
  });

  // 6. Provider Health
  const { data: providerHealthRes, refetch: refetchHealth } = useQuery({
    queryKey: ["provider_health"],
    queryFn: () => notificationsApi.getProviderHealth(),
  });

  // 7. Templates List
  const { data: templatesRes, isLoading: isTemplatesLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ["communication_templates", templateSearch, templateCategory],
    queryFn: () =>
      notificationsApi.getTemplates({
        search: templateSearch || undefined,
        category: templateCategory || undefined,
      }),
  });

  // 8. Template Preview Render
  const { data: templatePreviewRes } = useQuery({
    queryKey: ["template_preview", previewTemplateCode],
    queryFn: () => notificationsApi.previewTemplate(previewTemplateCode!),
    enabled: !!previewTemplateCode,
  });

  // 9. Delivery Logs List
  const { data: deliveryLogsRes, isLoading: isLogsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["delivery_logs", logChannel, logStatus, logSearch, logPage],
    queryFn: () =>
      notificationsApi.getDeliveryLogs({
        channel: logChannel || undefined,
        status: logStatus || undefined,
        search: logSearch || undefined,
        page: logPage,
        limit: 15,
      }),
  });

  // 10. Saved Audiences Query
  const { data: savedAudiencesRes, isLoading: isSavedAudiencesLoading, refetch: refetchSavedAudiences } = useQuery({
    queryKey: ["saved_audiences", savedAudienceSearch, savedAudienceEntityFilter, savedAudiencePage],
    queryFn: () =>
      notificationsApi.getSavedAudiences({
        search: savedAudienceSearch || undefined,
        entityType: savedAudienceEntityFilter || undefined,
        page: savedAudiencePage,
        limit: 10,
      }),
  });

  // 11. Live Audience Filter Payload Computation (Memoized)
  const currentAudiencePayload: AudienceFilterPayload = useMemo(() => ({
    targetEntity: builderTargetEntity,
    collegeRelationship: builderCollegeRel,
    conditions: [
      ...(builderState ? [{ field: "state", operator: "EQ" as const, value: builderState }] : []),
      ...(builderDistrict ? [{ field: "district", operator: "EQ" as const, value: builderDistrict }] : []),
      ...(builderEducation ? [{ field: "educationLevel", operator: "EQ" as const, value: builderEducation }] : []),
      ...(builderPassingYear ? [{ field: "passingYear", operator: "EQ" as const, value: Number(builderPassingYear) }] : []),
      ...(builderStream ? [{ field: "stream", operator: "EQ" as const, value: builderStream }] : []),
      ...(builderCourse ? [{ field: "courseId", operator: "EQ" as const, value: builderCourse }] : []),
      ...(builderBranch ? [{ field: "branchId", operator: "EQ" as const, value: builderBranch }] : []),
      ...(builderCollege ? [{ field: "collegeId", operator: "EQ" as const, value: builderCollege }] : []),
      ...(builderAppStatus ? [{ field: "applicationStatus", operator: "EQ" as const, value: builderAppStatus }] : []),
      ...(builderPaymentStatus ? [{ field: "paymentStatus", operator: "EQ" as const, value: builderPaymentStatus }] : []),
      ...(builderRole ? [{ field: "role", operator: "EQ" as const, value: builderRole }] : []),
      ...(builderCounselor ? [{ field: "counselorId", operator: "EQ" as const, value: builderCounselor }] : []),
      ...(builderAppAge ? [{ field: "applicationAge", operator: "EQ" as const, value: builderAppAge }] : []),
      ...(builderLastLogin ? [{ field: "lastLogin", operator: "EQ" as const, value: builderLastLogin }] : []),
    ],
    exclusions: [
      ...(excludeAppStatus ? [{ field: "applicationStatus", operator: "EQ" as const, value: excludeAppStatus }] : []),
    ],
  }), [
    builderTargetEntity,
    builderCollegeRel,
    builderState,
    builderDistrict,
    builderEducation,
    builderPassingYear,
    builderStream,
    builderCourse,
    builderBranch,
    builderCollege,
    builderAppStatus,
    builderPaymentStatus,
    builderRole,
    builderCounselor,
    builderAppAge,
    builderLastLogin,
    excludeAppStatus,
  ]);

  const { data: audiencePreviewRes, isFetching: isAudienceCalculating, refetch: refetchAudiencePreview } = useQuery({
    queryKey: ["audience_preview", currentAudiencePayload, campaignDraft.channels, campaignDraft.campaignType],
    queryFn: () => notificationsApi.previewAudience(currentAudiencePayload, campaignDraft.channels),
    staleTime: 1000,
  });

  const audiencePreview = audiencePreviewRes?.data || {
    totalAudience: 0,
    eligibleCount: 0,
    excludedConsentCount: 0,
    invalidContactCount: 0,
    sampleRecipients: [],
  };

  // ─── MUTATIONS ────────────────────────────────────────────────────────────

  // Campaign Mutations
  const createCampaignMutation = useMutation({
    mutationFn: (data: CreateCampaignPayload) => notificationsApi.createCampaign(data),
    onSuccess: async (res) => {
      const createdCampaign = res.data;
      queryClient.invalidateQueries({ queryKey: ["communication_campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["notification_stats"] });

      const displayName = createdCampaign?.name || campaignDraft.campaignName || "Broadcast";

      if (sendNowImmediate && createdCampaign?.id) {
        try {
          await notificationsApi.sendCampaignNow(createdCampaign.id);
          queryClient.invalidateQueries({ queryKey: ["communication_campaigns"] });
          queryClient.invalidateQueries({ queryKey: ["delivery_logs"] });
          showFeedback("success", `Campaign "${displayName}" created and dispatched immediately!`);
        } catch (sendErr: any) {
          showFeedback("info", `Campaign created as draft, but auto-send returned: ${sendErr?.response?.data?.message || sendErr.message}`);
        }
      } else if (campaignDraft.scheduledAt) {
        showFeedback("success", `Campaign "${displayName}" scheduled successfully for ${new Date(campaignDraft.scheduledAt).toLocaleString()}!`);
      } else {
        showFeedback("success", `Campaign "${displayName}" saved as DRAFT successfully!`);
      }

      setShowCampaignWizard(false);
      setWizardStep(1);
      setWizardError(null);
      setSendNowImmediate(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err.message || "Failed to save campaign. Please verify fields.";
      setWizardError(msg);
      showFeedback("error", `Campaign Save Error: ${msg}`);
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.sendCampaignNow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communication_campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["notification_stats"] });
      queryClient.invalidateQueries({ queryKey: ["delivery_logs"] });
      showFeedback("success", "Campaign dispatch initiated. Deliveries are being tracked.");
    },
    onError: (err: any) => {
      showFeedback("error", `Send Failed: ${err?.response?.data?.message || err.message}`);
    },
  });

  const cancelCampaignMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.cancelCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communication_campaigns"] });
      showFeedback("success", "Campaign cancelled successfully.");
    },
    onError: (err: any) => {
      showFeedback("error", `Cancel Failed: ${err?.response?.data?.message || err.message}`);
    },
  });

  const retryCampaignMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.retryFailedDeliveries(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communication_campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["delivery_logs"] });
      showFeedback("success", "Failed deliveries queued for retry.");
    },
    onError: (err: any) => {
      showFeedback("error", `Retry Failed: ${err?.response?.data?.message || err.message}`);
    },
  });

  // Saved Audience Mutations
  const createSavedAudienceMutation = useMutation({
    mutationFn: (data: SaveAudiencePayload) => notificationsApi.createSavedAudience(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["saved_audiences"] });
      setShowSaveAudienceModal(false);
      setSaveAudienceForm({ name: "", description: "", entityType: "STUDENT" });
      showFeedback("success", `Audience "${res?.data?.name || saveAudienceForm.name || 'Segment'}" saved successfully!`);
    },
    onError: (err: any) => {
      showFeedback("error", `Save Audience Failed: ${err?.response?.data?.message || err.message}`);
    },
  });

  const duplicateSavedAudienceMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.duplicateSavedAudience(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_audiences"] });
      showFeedback("success", "Audience segment duplicated.");
    },
    onError: (err: any) => {
      showFeedback("error", `Duplicate Failed: ${err?.response?.data?.message || err.message}`);
    },
  });

  const archiveSavedAudienceMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.archiveSavedAudience(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_audiences"] });
      showFeedback("success", "Audience segment archived.");
    },
    onError: (err: any) => {
      showFeedback("error", `Archive Failed: ${err?.response?.data?.message || err.message}`);
    },
  });

  // Template Mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data: CreateTemplatePayload) => notificationsApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communication_templates"] });
      setShowTemplateModal(false);
      showFeedback("success", "Template created and published successfully.");
    },
    onError: (err: any) => {
      showFeedback("error", `Template Error: ${err?.response?.data?.message || err.message}`);
    },
  });

  const seedTemplatesMutation = useMutation({
    mutationFn: () => notificationsApi.seedDefaultTemplates(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communication_templates"] });
      showFeedback("success", "Default system templates verified and loaded.");
    },
  });

  // System Alerts Mutations
  const sendAlertMutation = useMutation({
    mutationFn: (data: CreateNotificationPayload) => notificationsApi.sendNotification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification_stats"] });
      setShowSendModal(false);
      setSendForm({ title: "", message: "", priority: "MEDIUM", category: "SYSTEM", type: "SYSTEM", receiverRole: "STUDENT" });
      showFeedback("success", "System in-app alert broadcasted successfully.");
    },
    onError: (err: any) => {
      showFeedback("error", `Broadcast Failed: ${err?.response?.data?.message || err.message}`);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification_stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification_stats"] });
      showFeedback("success", "Notification deleted.");
    },
  });

  const bulkReadMutation = useMutation({
    mutationFn: () => notificationsApi.bulkRead(selectedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification_stats"] });
      setSelectedIds([]);
      showFeedback("success", "Selected notifications marked as read.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: () => notificationsApi.bulkDelete(selectedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification_stats"] });
      setSelectedIds([]);
      showFeedback("success", "Selected notifications deleted.");
    },
  });

  // ─── DERIVED DATA ─────────────────────────────────────────────────────────
  const stats = statsRes?.data?.data || statsRes?.data || {};
  const campaignsList = campaignsRes?.data?.data || [];
  const templatesList = templatesRes?.data || [];
  const deliveryLogsList = deliveryLogsRes?.data?.data || [];
  const savedAudiencesList = savedAudiencesRes?.data?.data || [];
  const notifList = notifsRes?.data?.data || notifsRes?.data?.data?.data || [];

  // Selected State's Districts
  const selectedStateObj = meta?.states?.find((s: any) => s.name === builderState || s.id === builderState);
  const availableDistricts = selectedStateObj?.districts || [];

  // Selected Course's Branches
  const selectedCourseObj = meta?.courses?.find((c: any) => c.id === builderCourse);
  const availableBranches = selectedCourseObj?.branches || [];

  // ─── HELPER: RESTORE SAVED AUDIENCE INTO BUILDER ─────────────────────────
  const restoreSavedAudienceIntoBuilder = (audience: SavedAudienceItem, openWizard = false) => {
    const def = audience.audienceDefinitionJson || ({} as AudienceFilterPayload);
    setBuilderTargetEntity((audience.entityType as any) || def.targetEntity || "STUDENT");
    setBuilderCollegeRel(def.collegeRelationship || "ANY");

    const conds = def.conditions || [];
    setBuilderState(conds.find((c) => c.field === "state" || c.field === "stateId")?.value || "");
    setBuilderDistrict(conds.find((c) => c.field === "district" || c.field === "districtId")?.value || "");
    setBuilderEducation(conds.find((c) => c.field === "educationLevel")?.value || "");
    setBuilderPassingYear(conds.find((c) => c.field === "passingYear")?.value || "");
    setBuilderStream(conds.find((c) => c.field === "stream")?.value || "");
    setBuilderCourse(conds.find((c) => c.field === "courseId" || c.field === "course")?.value || "");
    setBuilderBranch(conds.find((c) => c.field === "branchId" || c.field === "branch")?.value || "");
    setBuilderCollege(conds.find((c) => c.field === "collegeId" || c.field === "college")?.value || "");
    setBuilderAppStatus(conds.find((c) => c.field === "applicationStatus")?.value || "");
    setBuilderPaymentStatus(conds.find((c) => c.field === "paymentStatus")?.value || "");
    setBuilderRole(conds.find((c) => c.field === "role")?.value || "");
    setBuilderCounselor(conds.find((c) => c.field === "counselorId")?.value || "");
    setBuilderAppAge(conds.find((c) => c.field === "applicationAge")?.value || "");
    setBuilderLastLogin(conds.find((c) => c.field === "lastLogin")?.value || "");

    const excl = def.exclusions || [];
    setExcludeAppStatus(excl.find((e) => e.field === "applicationStatus")?.value || "");

    if (openWizard) {
      setCampaignDraft((prev) => ({
        ...prev,
        targetEntity: (audience.entityType as any) || "STUDENT",
        audienceId: audience.id,
        audienceFilter: def,
      }));
      setWizardStep(1);
      setWizardError(null);
      setShowCampaignWizard(true);
      showFeedback("info", `Audience "${audience.name}" loaded into Campaign Wizard.`);
    } else {
      setActiveTab("audience_builder");
      showFeedback("info", `Audience "${audience.name}" loaded in Audience Builder.`);
    }
  };

  // ─── WIZARD STEP TRANSITION & VALIDATION ──────────────────────────────────
  const handleWizardNext = () => {
    setWizardError(null);
    const normalized = normalizeCampaignDraft(campaignDraft, currentAudiencePayload);

    if (wizardStep === 1) {
      if (!normalized.campaignName) {
        setWizardError("Campaign name is required.");
        return;
      }
      if (!normalized.messageTitle) {
        setWizardError("Message title is required.");
        return;
      }
      if (!normalized.messageBody) {
        setWizardError("Message body is required.");
        return;
      }
      if (!normalized.channels || normalized.channels.length === 0) {
        setWizardError("Please select at least one delivery channel.");
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      setWizardStep(3);
    }
  };

  const handleConfirmSaveCampaign = (sendImmediately = false) => {
    setWizardError(null);
    setSendNowImmediate(sendImmediately);

    // Canonical normalization directly from state
    const normalized = normalizeCampaignDraft(campaignDraft, currentAudiencePayload);

    // Validate the EXACT normalized draft object
    const validation = validateCampaignDraft(normalized, {
      requireRecipients: sendImmediately,
      recipientCount: audiencePreview.eligibleCount,
      sendImmediately,
    });

    if (!validation.isValid) {
      setWizardError(validation.error || "Validation failed.");
      if (!normalized.campaignName || !normalized.messageTitle || !normalized.messageBody) {
        setWizardStep(1);
      }
      return;
    }

    const payload: CreateCampaignPayload = {
      campaignName: normalized.campaignName,
      name: normalized.campaignName,
      type: normalized.campaignType,
      channels: normalized.channels,
      targetEntity: normalized.targetEntity,
      audienceId: normalized.audienceId,
      title: normalized.messageTitle,
      messageTitle: normalized.messageTitle,
      subject: normalized.emailSubject,
      emailSubject: normalized.emailSubject,
      message: normalized.messageBody,
      messageBody: normalized.messageBody,
      smsBody: normalized.smsBody,
      whatsAppBody: normalized.whatsAppBody,
      scheduledAt: sendImmediately ? undefined : (normalized.scheduledAt ? new Date(normalized.scheduledAt).toISOString() : undefined),
      audienceFilter: currentAudiencePayload,
    };

    createCampaignMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* ─── ACTION FEEDBACK TOAST / BANNER ─── */}
      {feedbackBanner && (
        <div
          className={`fixed top-4 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all ${
            feedbackBanner.type === "success"
              ? "bg-[#E8F3EC] border-[#4A7B5B] text-[#4A7B5B]"
              : feedbackBanner.type === "error"
              ? "bg-red-50 border-red-300 text-red-700"
              : "bg-blue-50 border-blue-300 text-blue-800"
          }`}
        >
          {feedbackBanner.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : feedbackBanner.type === "error" ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-xs font-bold">{feedbackBanner.message}</span>
          <button onClick={() => setFeedbackBanner(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-5 sticky top-0 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] flex items-center justify-center text-[#4A7B5B]">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#4A7B5B] tracking-tight">
                  Enterprise Communication Engine
                </h1>
                <p className="text-xs text-[#94A3B8]">
                  Audience Segmentation • Reusable Segments • Multi-Channel Broadcasts • Scheduled Campaigns
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                refetchStats();
                refetchCampaigns();
                refetchSavedAudiences();
                refetchTemplates();
                refetchNotifs();
                refetchLogs();
                refetchHealth();
                refetchAudiencePreview();
                showFeedback("info", "Communication Center data refreshed.");
              }}
              className="px-3 py-2 text-xs font-semibold text-[#4A7B5B] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] flex items-center gap-1.5 transition shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#94A3B8]" />
              Refresh
            </button>

            <button
              onClick={() => {
                setCampaignDraft({
                  ...initialCampaignDraft,
                  targetEntity: builderTargetEntity,
                  audienceFilter: currentAudiencePayload,
                });
                setWizardStep(1);
                setWizardError(null);
                setShowCampaignWizard(true);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-[#4A7B5B] hover:bg-[#3D664B] rounded-lg flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Campaign
            </button>
          </div>
        </div>

        {/* ─── NAVIGATION TABS ─── */}
        <div className="flex items-center gap-2 mt-5 border-t border-[#F1F5F9] pt-3 overflow-x-auto">
          {[
            { id: "overview", label: "Overview & Analytics", icon: BarChart3 },
            { id: "campaigns", label: "Campaigns Broadcast Hub", icon: Send, badge: campaignsList.length },
            { id: "audience_builder", label: "Dynamic Audience Builder", icon: Users },
            { id: "saved_audiences", label: "Saved Audiences & Segments", icon: Bookmark, badge: savedAudiencesList.length },
            { id: "templates", label: "Message Templates", icon: FileText, badge: templatesList.length },
            { id: "delivery_logs", label: "Delivery Tracking & DLQ", icon: Activity },
            { id: "system_alerts", label: "System In-App Alerts", icon: Bell, badge: stats?.unread || undefined },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
                  isActive
                    ? "bg-[#4A7B5B] text-white shadow-xs"
                    : "text-[#4A7B5B] hover:bg-[#E8F3EC] hover:text-[#4A7B5B]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#94A3B8]"}`} />
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#4A7B5B]"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── MAIN BODY CONTAINER ─── */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: OVERVIEW & ANALYTICS
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {[
                { label: "Total Broadcasts", value: stats?.totalSent || 0, icon: Send, color: "text-[#4A7B5B]", bg: "bg-[#E8F3EC]" },
                { label: "Delivered", value: stats?.delivered || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Active Campaigns", value: campaignsList.filter((c: any) => c.status === "SCHEDULED" || c.status === "PROCESSING").length, icon: Radio, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Saved Audiences", value: savedAudiencesList.length, icon: Bookmark, color: "text-purple-600", bg: "bg-purple-50" },
                { label: "Templates", value: templatesList.length, icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Dead-Letter / Failed", value: stats?.failed || 0, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#94A3B8]">{kpi.label}</span>
                      <div className={`w-7 h-7 rounded-lg ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-[#4A7B5B] mt-2">{kpi.value.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions & Recent Broadcasts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                  <h3 className="text-sm font-bold text-[#4A7B5B]">Recent Broadcast Campaigns</h3>
                  <button onClick={() => setActiveTab("campaigns")} className="text-xs font-bold text-[#4A7B5B] hover:underline">
                    View All →
                  </button>
                </div>
                <div className="divide-y divide-[#F1F5F9]">
                  {campaignsList.slice(0, 5).map((c: any) => (
                    <div key={c.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-[#4A7B5B] block">{c.name}</span>
                        <span className="text-[10px] text-[#94A3B8] font-mono">
                          {c.campaignCode} • {c.type} • {c.channels?.join(", ")}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#E8F3EC] text-[#4A7B5B]">
                          {c.status}
                        </span>
                        <p className="text-[10px] text-[#94A3B8] mt-0.5">{new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {campaignsList.length === 0 && (
                    <p className="text-xs text-[#94A3B8] text-center py-6">No campaigns created yet.</p>
                  )}
                </div>
              </div>

              {/* Gateway Provider Health */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#4A7B5B]">Gateway Channel Status</h3>
                <div className="space-y-3">
                  {[
                    { channel: "In-App Realtime", provider: "WebSocket Server", status: "ONLINE", latency: "12ms" },
                    { channel: "Email Gateway", provider: "SMTP / Nodemailer", status: "ONLINE", latency: "240ms" },
                    { channel: "SMS Gateway", provider: "DLT / Fast2SMS", status: "ONLINE", latency: "480ms" },
                    { channel: "WhatsApp API", provider: "Meta Cloud API", status: "ONLINE", latency: "310ms" },
                  ].map((gw, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-[#4A7B5B] block">{gw.channel}</strong>
                        <span className="text-[10px] text-[#94A3B8]">{gw.provider}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-[#4A7B5B] flex items-center gap-1 justify-end">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4A7B5B]" /> {gw.status}
                        </span>
                        <span className="text-[10px] text-[#94A3B8] font-mono">{gw.latency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: CAMPAIGNS BROADCAST HUB
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "campaigns" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={campaignSearch}
                    onChange={(e) => setCampaignSearch(e.target.value)}
                    placeholder="Search campaigns..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <select
                  value={campaignStatusFilter}
                  onChange={(e) => setCampaignStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SENT">SENT</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="FAILED">FAILED</option>
                </select>

                <select
                  value={campaignChannelFilter}
                  onChange={(e) => setCampaignChannelFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                >
                  <option value="">All Channels</option>
                  <option value="IN_APP">IN_APP</option>
                  <option value="EMAIL">EMAIL</option>
                  <option value="SMS">SMS</option>
                  <option value="WHATSAPP">WHATSAPP</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setCampaignDraft({
                    ...initialCampaignDraft,
                    targetEntity: builderTargetEntity,
                    audienceFilter: currentAudiencePayload,
                  });
                  setWizardStep(1);
                  setWizardError(null);
                  setShowCampaignWizard(true);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#4A7B5B] hover:bg-[#3D664B] rounded-lg flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Create Campaign Wizard
              </button>
            </div>

            {/* Campaigns Table */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#94A3B8] font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Campaign Name & Code</th>
                      <th className="px-4 py-3.5">Type & Target</th>
                      <th className="px-4 py-3.5">Channels</th>
                      <th className="px-4 py-3.5">Audience & Reach</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {isCampaignsLoading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-xs text-[#94A3B8]">
                          Loading campaigns...
                        </td>
                      </tr>
                    ) : campaignsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-xs text-[#94A3B8]">
                          No campaigns found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      campaignsList.map((c: any) => {
                        const isSent = c.status === "SENT";
                        const isScheduled = c.status === "SCHEDULED";
                        const isFailed = c.status === "FAILED" || c.status === "PARTIALLY_SENT";
                        const isDraft = c.status === "DRAFT";

                        return (
                          <tr key={c.id} className="hover:bg-[#F8FAFC]/50 transition">
                            <td className="px-5 py-4">
                              <div className="font-bold text-[#4A7B5B]">{c.name}</div>
                              <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5">
                                {c.campaignCode} {c.savedAudience ? `• Seg: ${c.savedAudience.name}` : ""}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-semibold text-[#4A7B5B]">{c.type}</div>
                              <div className="text-[10px] text-[#94A3B8]">Target: {c.targetEntity}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-1">
                                {c.channels?.map((ch: string) => (
                                  <span key={ch} className="px-1.5 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] rounded text-[10px] font-bold">
                                    {ch}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#4A7B5B]">{c.sentCount} / {c.totalAudience}</span>
                              </div>
                              <div className="w-24 bg-[#F1F5F9] rounded-full h-1.5 mt-1 overflow-hidden">
                                <div
                                  className="bg-[#4A7B5B] h-full"
                                  style={{ width: `${c.totalAudience > 0 ? (c.sentCount / c.totalAudience) * 100 : 0}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isSent
                                    ? "bg-[#E8F3EC] text-[#4A7B5B]"
                                    : isScheduled
                                    ? "bg-blue-50 text-blue-700"
                                    : isFailed
                                    ? "bg-red-50 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-[#94A3B8] text-[11px]">
                              {c.scheduledAt ? (
                                <div>
                                  <span className="font-semibold text-blue-600 block">Scheduled:</span>
                                  {new Date(c.scheduledAt).toLocaleString()}
                                </div>
                              ) : c.sentAt ? (
                                new Date(c.sentAt).toLocaleDateString()
                              ) : (
                                new Date(c.createdAt).toLocaleDateString()
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedCampaignId(c.id)}
                                  className="px-2.5 py-1 text-xs font-semibold text-[#4A7B5B] bg-white border border-[#E2E8F0] rounded hover:bg-[#F8FAFC]"
                                >
                                  Analytics
                                </button>

                                {(isDraft || isScheduled) && (
                                  <button
                                    onClick={() => sendCampaignMutation.mutate(c.id)}
                                    disabled={sendCampaignMutation.isPending}
                                    className="px-2.5 py-1 text-xs font-bold text-white bg-[#4A7B5B] rounded hover:bg-[#3D664B] disabled:opacity-50"
                                  >
                                    {sendCampaignMutation.isPending ? "Sending..." : "Send Now"}
                                  </button>
                                )}

                                {isScheduled && (
                                  <button
                                    onClick={() => cancelCampaignMutation.mutate(c.id)}
                                    className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 rounded hover:bg-red-100"
                                  >
                                    Cancel
                                  </button>
                                )}

                                {isFailed && (
                                  <button
                                    onClick={() => retryCampaignMutation.mutate(c.id)}
                                    className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 rounded hover:bg-amber-100 flex items-center gap-1"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Retry Failed
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Campaign Analytics Detail Drawer */}
            {selectedCampaignId && campaignAnalyticsRes?.data && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                    <div>
                      <h3 className="text-base font-bold text-[#4A7B5B]">
                        {campaignAnalyticsRes.data.campaign.name}
                      </h3>
                      <p className="text-xs text-[#94A3B8] font-mono">
                        {campaignAnalyticsRes.data.campaign.code} • Status: {campaignAnalyticsRes.data.campaign.status}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCampaignId(null)}
                      className="text-[#94A3B8] hover:text-[#4A7B5B]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Funnel Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-center">
                      <span className="text-[11px] text-[#94A3B8]">Total Audience</span>
                      <p className="text-lg font-black text-[#4A7B5B] mt-1">
                        {campaignAnalyticsRes.data.summary.totalAudience}
                      </p>
                    </div>
                    <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-center">
                      <span className="text-[11px] text-[#94A3B8]">Sent</span>
                      <p className="text-lg font-black text-blue-600 mt-1">
                        {campaignAnalyticsRes.data.summary.sentCount}
                      </p>
                    </div>
                    <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-center">
                      <span className="text-[11px] text-[#94A3B8]">Delivered</span>
                      <p className="text-lg font-black text-[#4A7B5B] mt-1">
                        {campaignAnalyticsRes.data.summary.deliveredCount}
                      </p>
                    </div>
                    <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-center">
                      <span className="text-[11px] text-[#94A3B8]">Delivery Rate</span>
                      <p className="text-lg font-black text-[#4A7B5B] mt-1">
                        {campaignAnalyticsRes.data.summary.deliveryRate}
                      </p>
                    </div>
                  </div>

                  {/* Channel Breakdown */}
                  <div>
                    <h4 className="text-xs font-bold text-[#4A7B5B] mb-3">Delivery Breakdown by Channel</h4>
                    <div className="space-y-2">
                      {campaignAnalyticsRes.data.channelDistribution?.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 bg-[#F8FAFC] rounded-lg flex items-center justify-between text-xs">
                          <span className="font-bold text-[#4A7B5B]">{item.channel}</span>
                          <span className="text-[#94A3B8]">Status: <strong className="text-[#4A7B5B]">{item.status}</strong></span>
                          <span className="font-bold text-[#4A7B5B]">{item.count} messages</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                    <button
                      onClick={() => retryCampaignMutation.mutate(selectedCampaignId)}
                      disabled={retryCampaignMutation.isPending}
                      className="px-4 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg flex items-center gap-1.5 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retry Failed Deliveries
                    </button>
                    <button
                      onClick={() => setSelectedCampaignId(null)}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#4A7B5B] rounded-lg"
                    >
                      Close Analytics
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: DYNAMIC AUDIENCE BUILDER
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "audience_builder" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Filter Controls */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#4A7B5B]">Target Audience Configuration</h3>
                  <p className="text-xs text-[#94A3B8]">Multi-dimensional database query resolver with state-dependent filters</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setBuilderState("");
                      setBuilderDistrict("");
                      setBuilderEducation("");
                      setBuilderPassingYear("");
                      setBuilderStream("");
                      setBuilderCourse("");
                      setBuilderBranch("");
                      setBuilderCollege("");
                      setBuilderAppStatus("");
                      setBuilderPaymentStatus("");
                      setBuilderRole("");
                      setBuilderCounselor("");
                      setBuilderAppAge("");
                      setBuilderLastLogin("");
                      setExcludeAppStatus("");
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Reset Filters
                  </button>
                  <button
                    onClick={() => {
                      setSaveAudienceForm({
                        name: "",
                        description: "",
                        entityType: builderTargetEntity,
                      });
                      setShowSaveAudienceModal(true);
                    }}
                    className="px-3 py-1.5 bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/30 rounded-lg text-xs font-bold hover:bg-[#4A7B5B] hover:text-white transition flex items-center gap-1.5"
                  >
                    <Bookmark className="w-3.5 h-3.5" /> Save Audience
                  </button>
                </div>
              </div>

              {/* Target Entity Toggle */}
              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-2">Target Entity Group</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "STUDENT", label: "Students (Registered)" },
                    { id: "LEAD", label: "Prospective Leads" },
                    { id: "STAFF", label: "Staff & Counselors" },
                    { id: "ALL", label: "Combined All" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setBuilderTargetEntity(t.id as any)}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        builderTargetEntity === t.id
                          ? "bg-[#4A7B5B] text-white border-[#4A7B5B]"
                          : "bg-[#F8FAFC] text-[#4A7B5B] border-[#E2E8F0] hover:bg-white"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Academic Filters */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#4A7B5B]">
                  <GraduationCap className="w-4 h-4 text-[#4A7B5B]" /> Academic Segmentation
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">Education Level</label>
                    <select
                      value={builderEducation}
                      onChange={(e) => setBuilderEducation(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                    >
                      <option value="">All Education Levels</option>
                      {meta?.educationLevels?.map((lvl: string) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">Passing Year</label>
                    <select
                      value={builderPassingYear}
                      onChange={(e) => setBuilderPassingYear(e.target.value ? Number(e.target.value) : "")}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                    >
                      <option value="">All Years</option>
                      {meta?.passingYears?.map((yr: number) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">12th Stream</label>
                    <select
                      value={builderStream}
                      onChange={(e) => setBuilderStream(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                    >
                      <option value="">All Streams</option>
                      {meta?.streams?.map((st: string) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Course & Branch Dependent */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">Course Program</label>
                    <select
                      value={builderCourse}
                      onChange={(e) => {
                        setBuilderCourse(e.target.value);
                        setBuilderBranch("");
                      }}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                    >
                      <option value="">All Courses</option>
                      {meta?.courses?.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">
                      Branch / Specialization {builderCourse ? `(${availableBranches.length} available)` : "(Select course first)"}
                    </label>
                    <select
                      value={builderBranch}
                      onChange={(e) => setBuilderBranch(e.target.value)}
                      disabled={!builderCourse || availableBranches.length === 0}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg disabled:opacity-50"
                    >
                      <option value="">All Branches</option>
                      {availableBranches.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Geographic Filters */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#4A7B5B]">
                  <MapPin className="w-4 h-4 text-[#4A7B5B]" /> Geography (States + UTs)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">State / UT</label>
                    <select
                      value={builderState}
                      onChange={(e) => {
                        setBuilderState(e.target.value);
                        setBuilderDistrict("");
                      }}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                    >
                      <option value="">All States & UTs</option>
                      {meta?.states?.map((s: any) => (
                        <option key={s.id} value={s.name}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">
                      District {builderState ? `(${availableDistricts.length} available)` : "(Select state first)"}
                    </label>
                    <select
                      value={builderDistrict}
                      onChange={(e) => setBuilderDistrict(e.target.value)}
                      disabled={!builderState || availableDistricts.length === 0}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg disabled:opacity-50"
                    >
                      <option value="">All Districts</option>
                      {availableDistricts.map((d: any) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* College & Status Filters */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#4A7B5B]">
                  <Building className="w-4 h-4 text-[#4A7B5B]" /> Institution & Application Status
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">College Relationship</label>
                    <select
                      value={builderCollegeRel}
                      onChange={(e) => setBuilderCollegeRel(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                    >
                      {meta?.collegeRelationships?.map((rel: any) => (
                        <option key={rel.id} value={rel.id}>{rel.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">College Target</label>
                    <select
                      value={builderCollege}
                      onChange={(e) => setBuilderCollege(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                    >
                      <option value="">All Institutions</option>
                      {meta?.colleges?.map((col: any) => (
                        <option key={col.id} value={col.id}>{col.name} ({col.city})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">Application Status</label>
                    <select
                      value={builderAppStatus}
                      onChange={(e) => setBuilderAppStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                    >
                      <option value="">All Application Statuses</option>
                      {meta?.applicationStatuses?.map((st: string) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Counselor / IAM Staff Filters & Operational */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#4A7B5B]">
                  <ShieldAlert className="w-4 h-4 text-[#4A7B5B]" /> Counselor, IAM & Operational Filters
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">Assigned Counselor</label>
                    <select
                      value={builderCounselor}
                      onChange={(e) => setBuilderCounselor(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                    >
                      <option value="">All Counselors</option>
                      {meta?.counselors?.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.fullName} ({c.email})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">Staff IAM Role</label>
                    <select
                      value={builderRole}
                      onChange={(e) => setBuilderRole(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                    >
                      <option value="">All IAM Roles</option>
                      {meta?.roles?.map((r: any) => (
                        <option key={r.id} value={r.code}>{r.name} ({r.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">Application Age</label>
                    <select
                      value={builderAppAge}
                      onChange={(e) => setBuilderAppAge(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                    >
                      <option value="">Any Time</option>
                      <option value="1">Created Today</option>
                      <option value="7">Last 7 Days</option>
                      <option value="30">Last 30 Days</option>
                      <option value="90">Last 90 Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8] block mb-1">Last Login</label>
                    <select
                      value={builderLastLogin}
                      onChange={(e) => setBuilderLastLogin(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                    >
                      <option value="">Any Login Status</option>
                      <option value="NEVER">Never Logged In</option>
                      <option value="1">Active in Last 24 Hours</option>
                      <option value="7">Active in Last 7 Days</option>
                      <option value="30">Active in Last 30 Days</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Live Audience Estimate & Sample PII Preview */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#4A7B5B]">Live Audience Preview</h3>
                  {isAudienceCalculating && (
                    <RefreshCw className="w-3.5 h-3.5 text-[#4A7B5B] animate-spin" />
                  )}
                </div>

                <div className="bg-[#E8F3EC] p-4 rounded-xl text-center border border-[#4A7B5B]/20">
                  <span className="text-xs font-semibold text-[#4A7B5B]">Estimated Matching Recipients</span>
                  <p className="text-3xl font-black text-[#4A7B5B] mt-1">
                    {audiencePreview.totalAudience.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <div className="flex items-center justify-between p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[#94A3B8]">Eligible for Send:</span>
                    <strong className="text-[#4A7B5B] font-bold">{audiencePreview.eligibleCount}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[#94A3B8]">Excluded (Consent Opt-out):</span>
                    <strong className="text-amber-700 font-bold">{audiencePreview.excludedConsentCount}</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[#94A3B8]">Invalid / Missing Contact:</span>
                    <strong className="text-red-600 font-bold">{audiencePreview.invalidContactCount}</strong>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      setCampaignDraft((prev) => ({
                        ...prev,
                        targetEntity: builderTargetEntity,
                        audienceFilter: currentAudiencePayload,
                      }));
                      setWizardStep(1);
                      setWizardError(null);
                      setShowCampaignWizard(true);
                    }}
                    className="w-full py-2.5 bg-[#4A7B5B] text-white rounded-lg text-xs font-bold hover:bg-[#3D664B] transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    Create Campaign from Segment →
                  </button>

                  <button
                    onClick={() => {
                      setSaveAudienceForm({
                        name: "",
                        description: "",
                        entityType: builderTargetEntity,
                      });
                      setShowSaveAudienceModal(true);
                    }}
                    className="w-full py-2 bg-white text-[#4A7B5B] border border-[#4A7B5B]/30 rounded-lg text-xs font-bold hover:bg-[#E8F3EC] transition flex items-center justify-center gap-1.5"
                  >
                    <Bookmark className="w-3.5 h-3.5" /> Save as Reusable Audience
                  </button>
                </div>
              </div>

              {/* Masked Sample Records */}
              <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-[#4A7B5B]">Safe Masked PII Sample (First 5)</h4>
                <div className="space-y-2">
                  {audiencePreview.sampleRecipients.length === 0 ? (
                    <p className="text-[11px] text-[#94A3B8] text-center py-4">
                      No matching records found in this segment.
                    </p>
                  ) : (
                    audiencePreview.sampleRecipients.slice(0, 5).map((r: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded bg-[#F8FAFC] border border-[#F1F5F9] text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#4A7B5B]">{r.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8F3EC] text-[#4A7B5B] font-bold">
                            {r.recipientType}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#94A3B8] mt-1 flex flex-wrap gap-2">
                          <span>📱 {r.maskedMobile}</span>
                          <span>✉️ {r.maskedEmail}</span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5">
                          {r.state && <span>{r.state} • </span>}
                          {r.course && <span>{r.course}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 4: SAVED AUDIENCES & REUSABLE SEGMENTS
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "saved_audiences" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={savedAudienceSearch}
                    onChange={(e) => setSavedAudienceSearch(e.target.value)}
                    placeholder="Search saved segments..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <select
                  value={savedAudienceEntityFilter}
                  onChange={(e) => setSavedAudienceEntityFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                >
                  <option value="">All Entities</option>
                  <option value="STUDENT">Students</option>
                  <option value="LEAD">Leads</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("audience_builder")}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#4A7B5B] hover:bg-[#3D664B] rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Build New Segment
                </button>
              </div>
            </div>

            {/* Saved Audiences Table */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#94A3B8] font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Segment Name & Description</th>
                      <th className="px-4 py-3.5">Target Entity</th>
                      <th className="px-4 py-3.5">Estimated Reach</th>
                      <th className="px-4 py-3.5">Version & Campaigns</th>
                      <th className="px-4 py-3.5">Last Updated</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {isSavedAudiencesLoading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-xs text-[#94A3B8]">
                          Loading saved audiences...
                        </td>
                      </tr>
                    ) : savedAudiencesList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-xs text-[#94A3B8]">
                          No saved audiences found. Go to Dynamic Audience Builder to construct and save segments.
                        </td>
                      </tr>
                    ) : (
                      savedAudiencesList.map((item: SavedAudienceItem) => (
                        <tr key={item.id} className="hover:bg-[#F8FAFC]/50 transition">
                          <td className="px-5 py-4">
                            <div className="font-bold text-[#4A7B5B]">{item.name}</div>
                            <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-1">
                              {item.description || "No description provided."}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-0.5 rounded bg-[#E8F3EC] text-[#4A7B5B] text-[10px] font-bold">
                              {item.entityType}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <strong className="text-[#4A7B5B] font-bold">
                              {(item.lastPreviewCount || 0).toLocaleString()} recipients
                            </strong>
                          </td>
                          <td className="px-4 py-4 text-[#94A3B8]">
                            <span>v{item.version || 1} • {item._count?.campaigns || 0} broadcasts</span>
                          </td>
                          <td className="px-4 py-4 text-[#94A3B8] text-[11px]">
                            {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => restoreSavedAudienceIntoBuilder(item, true)}
                                className="px-2.5 py-1 text-xs font-bold text-white bg-[#4A7B5B] hover:bg-[#3D664B] rounded flex items-center gap-1 shadow-xs"
                                title="Use in New Campaign"
                              >
                                <Send className="w-3 h-3" /> Use Audience
                              </button>

                              <button
                                onClick={() => restoreSavedAudienceIntoBuilder(item, false)}
                                className="px-2 py-1 text-xs font-semibold text-[#4A7B5B] bg-white border border-[#E2E8F0] rounded hover:bg-[#F8FAFC]"
                                title="Open in Audience Builder"
                              >
                                View Filters
                              </button>

                              <button
                                onClick={() => duplicateSavedAudienceMutation.mutate(item.id)}
                                disabled={duplicateSavedAudienceMutation.isPending}
                                className="p-1.5 text-slate-500 hover:text-[#4A7B5B] hover:bg-[#E8F3EC] rounded"
                                title="Duplicate Segment"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  if (window.confirm(`Archive audience segment "${item.name}"?`)) {
                                    archiveSavedAudienceMutation.mutate(item.id);
                                  }
                                }}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Archive Segment"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 5: MESSAGE TEMPLATES
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "templates" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Search templates..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">All Categories</option>
                  <option value="TRANSACTIONAL">TRANSACTIONAL</option>
                  <option value="PROMOTIONAL">PROMOTIONAL</option>
                  <option value="SYSTEM">SYSTEM</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => seedTemplatesMutation.mutate()}
                  disabled={seedTemplatesMutation.isPending}
                  className="px-3 py-2 text-xs font-semibold text-[#4A7B5B] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC]"
                >
                  Seed System Defaults
                </button>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#4A7B5B] hover:bg-[#3D664B] rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Template
                </button>
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isTemplatesLoading ? (
                <div className="col-span-3 py-12 text-center text-xs text-[#94A3B8]">
                  Loading templates...
                </div>
              ) : templatesList.length === 0 ? (
                <div className="col-span-3 py-12 text-center text-xs text-[#94A3B8]">
                  No templates found. Click "Seed System Defaults" to install default event templates.
                </div>
              ) : (
                templatesList.map((tpl: any) => (
                  <div key={tpl.id} className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                          {tpl.category}
                        </span>
                        <span className="text-[10px] text-[#94A3B8] font-mono">v{tpl.version}</span>
                      </div>
                      <h4 className="text-sm font-bold text-[#4A7B5B] mt-2">{tpl.name}</h4>
                      <p className="text-xs text-[#94A3B8] font-mono mt-0.5">{tpl.code}</p>

                      <div className="flex flex-wrap gap-1 mt-3">
                        {tpl.channels?.map((ch: string) => (
                          <span key={ch} className="px-1.5 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] font-semibold text-[#4A7B5B]">
                            {ch}
                          </span>
                        ))}
                      </div>

                      {tpl.subject && (
                        <p className="text-[11px] text-[#94A3B8] mt-2 line-clamp-1">
                          <strong>Sub:</strong> {tpl.subject}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                      <span className="text-[10px] text-[#94A3B8]">
                        {tpl.variables?.length || 0} Variables
                      </span>
                      <button
                        onClick={() => setPreviewTemplateCode(tpl.code)}
                        className="px-3 py-1 text-xs font-bold text-[#4A7B5B] bg-[#E8F3EC] hover:bg-[#4A7B5B] hover:text-white rounded transition"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Template Preview Modal */}
            {previewTemplateCode && templatePreviewRes?.data && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#4A7B5B]">
                        Live Template Render Preview
                      </h3>
                      <p className="text-xs text-[#94A3B8]">
                        Code: {templatePreviewRes.data.code} (v{templatePreviewRes.data.version})
                      </p>
                    </div>
                    <button onClick={() => setPreviewTemplateCode(null)} className="text-[#94A3B8] hover:text-[#4A7B5B]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Channel Previews */}
                  <div className="space-y-4 text-xs">
                    <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <span className="font-bold text-[#4A7B5B] block">IN-APP NOTIFICATION</span>
                      <div className="font-semibold text-[#4A7B5B]">{templatePreviewRes.data.previews?.IN_APP?.title}</div>
                      <p className="text-[#94A3B8]">{templatePreviewRes.data.previews?.IN_APP?.message}</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <span className="font-bold text-[#4A7B5B] block">EMAIL PREVIEW</span>
                      <div className="font-semibold text-[#4A7B5B]">Sub: {templatePreviewRes.data.previews?.EMAIL?.subject}</div>
                      <div
                        className="mt-2 p-3 bg-white border border-[#E2E8F0] rounded"
                        dangerouslySetInnerHTML={{ __html: templatePreviewRes.data.previews?.EMAIL?.bodyHtml }}
                      />
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#4A7B5B]">SMS PREVIEW</span>
                        <span className="text-[10px] text-[#94A3B8]">
                          {templatePreviewRes.data.previews?.SMS?.charCount} characters
                        </span>
                      </div>
                      <p className="text-[#4A7B5B] font-mono bg-white p-2.5 rounded border border-[#E2E8F0]">
                        {templatePreviewRes.data.previews?.SMS?.body}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
                    <button
                      onClick={() => setPreviewTemplateCode(null)}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#4A7B5B] rounded-lg"
                    >
                      Close Preview
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 6: DELIVERY TRACKING & DEAD-LETTER QUEUE
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "delivery_logs" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search logs by name, email, mobile, ID..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <select
                  value={logChannel}
                  onChange={(e) => setLogChannel(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                >
                  <option value="">All Channels</option>
                  <option value="IN_APP">IN_APP</option>
                  <option value="EMAIL">EMAIL</option>
                  <option value="SMS">SMS</option>
                  <option value="WHATSAPP">WHATSAPP</option>
                </select>

                <select
                  value={logStatus}
                  onChange={(e) => setLogStatus(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                >
                  <option value="">All Delivery Statuses</option>
                  <option value="QUEUED">QUEUED</option>
                  <option value="SENDING">SENDING</option>
                  <option value="SENT">SENT</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="FAILED">FAILED (Dead-Letter)</option>
                  <option value="SKIPPED">SKIPPED (Consent/Invalid)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => refetchLogs()}
                  className="px-3 py-2 text-xs font-semibold text-[#4A7B5B] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#94A3B8]" /> Refresh Logs
                </button>
              </div>
            </div>

            {/* Delivery Logs Table */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#94A3B8] font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Recipient & Type</th>
                      <th className="px-4 py-3.5">Contact Detail</th>
                      <th className="px-4 py-3.5">Channel</th>
                      <th className="px-4 py-3.5">Provider Message ID</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Failure / Skip Reason</th>
                      <th className="px-5 py-3.5 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {isLogsLoading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-xs text-[#94A3B8]">
                          Loading delivery records...
                        </td>
                      </tr>
                    ) : deliveryLogsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-xs text-[#94A3B8]">
                          No delivery records found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      deliveryLogsList.map((log: any) => (
                        <tr key={log.id} className="hover:bg-[#F8FAFC]/50 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-[#4A7B5B]">{log.recipientName || "Anonymous"}</div>
                            <div className="text-[10px] text-[#94A3B8]">{log.recipientType}</div>
                          </td>
                          <td className="px-4 py-3.5 text-[#94A3B8]">
                            <div>{log.recipientEmail || log.recipientMobile || "N/A"}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#E8F3EC] text-[#4A7B5B] font-bold text-[10px]">
                              {log.channel}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[10px] text-[#94A3B8]">
                            {log.providerMessageId || "N/A"}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.status === "DELIVERED"
                                  ? "bg-[#E8F3EC] text-[#4A7B5B]"
                                  : log.status === "SENT"
                                  ? "bg-blue-50 text-blue-700"
                                  : log.status === "FAILED"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-[11px] text-[#94A3B8] max-w-xs truncate">
                            {log.failureReason || log.errorMessage || "—"}
                          </td>
                          <td className="px-5 py-3.5 text-right text-[10px] text-[#94A3B8]">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 7: SYSTEM IN-APP ALERTS
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "system_alerts" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search system alerts..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                >
                  <option value="">All Priorities</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {selectedIds.length > 0 && (
                  <>
                    <button
                      onClick={() => bulkReadMutation.mutate()}
                      className="px-3 py-2 text-xs font-semibold text-[#4A7B5B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg hover:bg-white flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-[#4A7B5B]" /> Mark Read ({selectedIds.length})
                    </button>
                    <button
                      onClick={() => bulkDeleteMutation.mutate()}
                      className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedIds.length})
                    </button>
                  </>
                )}

                <button
                  onClick={() => setShowSendModal(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#4A7B5B] hover:bg-[#3D664B] rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Broadcast System Alert
                </button>
              </div>
            </div>

            {/* Notifications Feed Table */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#94A3B8] font-bold">
                    <tr>
                      <th className="px-4 py-3.5 w-10">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(notifList.map((n: any) => n.id));
                            else setSelectedIds([]);
                          }}
                          checked={selectedIds.length === notifList.length && notifList.length > 0}
                          className="rounded border-[#E2E8F0]"
                        />
                      </th>
                      <th className="px-4 py-3.5">Title & Message</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Target Role</th>
                      <th className="px-4 py-3.5">Priority</th>
                      <th className="px-4 py-3.5">Read Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {isNotifsLoading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-xs text-[#94A3B8]">
                          Loading notifications...
                        </td>
                      </tr>
                    ) : notifList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-xs text-[#94A3B8]">
                          No system notifications found.
                        </td>
                      </tr>
                    ) : (
                      notifList.map((n: any) => (
                        <tr key={n.id} className="hover:bg-[#F8FAFC]/50 transition">
                          <td className="px-4 py-3.5">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(n.id)}
                              onChange={() => {
                                if (selectedIds.includes(n.id)) setSelectedIds(selectedIds.filter((id) => id !== n.id));
                                else setSelectedIds([...selectedIds, n.id]);
                              }}
                              className="rounded border-[#E2E8F0]"
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-[#4A7B5B]">{n.title}</div>
                            <p className="text-[11px] text-[#94A3B8] line-clamp-1 mt-0.5">{n.message}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#4A7B5B] text-[10px] font-semibold">
                              {n.category}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-[#4A7B5B] font-semibold">
                            {n.receiverRole || n.user?.fullName || "ALL"}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                n.priority === "CRITICAL"
                                  ? "bg-red-50 text-red-700"
                                  : n.priority === "HIGH"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-[#E8F3EC] text-[#4A7B5B]"
                              }`}
                            >
                              {n.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {n.isRead ? (
                              <span className="text-[#4A7B5B] font-bold text-[10px]">Read</span>
                            ) : (
                              <span className="text-amber-600 font-bold text-[10px]">Unread</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!n.isRead && (
                                <button
                                  onClick={() => markReadMutation.mutate(n.id)}
                                  className="text-xs font-semibold text-[#4A7B5B] hover:underline"
                                >
                                  Mark Read
                                </button>
                              )}
                              <button
                                onClick={() => deleteMutation.mutate(n.id)}
                                className="text-xs font-semibold text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MULTI-STEP CAMPAIGN CREATION WIZARD MODAL (CANONICAL CAMPAIGN DRAFT)
      ══════════════════════════════════════════════════════════════════════ */}
      {showCampaignWizard && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            {/* Wizard Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#4A7B5B]">Campaign Creation Wizard</h3>
                <div className="flex items-center gap-2 mt-1">
                  {[
                    { step: 1, label: "Details & Message" },
                    { step: 2, label: "Audience Targeting" },
                    { step: 3, label: "Review & Schedule" },
                  ].map((s) => (
                    <div key={s.step} className="flex items-center gap-1.5 text-xs">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          wizardStep === s.step
                            ? "bg-[#4A7B5B] text-white"
                            : wizardStep > s.step
                            ? "bg-[#E8F3EC] text-[#4A7B5B]"
                            : "bg-[#F1F5F9] text-[#94A3B8]"
                        }`}
                      >
                        {wizardStep > s.step ? "✓" : s.step}
                      </span>
                      <span className={wizardStep === s.step ? "font-bold text-[#4A7B5B]" : "text-[#94A3B8]"}>
                        {s.label}
                      </span>
                      {s.step < 3 && <ChevronRight className="w-3.5 h-3.5 text-[#E2E8F0]" />}
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  const hasEnteredData = campaignDraft.campaignName || campaignDraft.messageTitle;
                  if (hasEnteredData) {
                    if (window.confirm("Close campaign wizard? Entered draft details will remain until refreshed.")) {
                      setShowCampaignWizard(false);
                      setWizardStep(1);
                      setWizardError(null);
                    }
                  } else {
                    setShowCampaignWizard(false);
                    setWizardStep(1);
                    setWizardError(null);
                  }
                }}
                className="text-[#94A3B8] hover:text-[#4A7B5B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message Alert */}
            {wizardError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{wizardError}</span>
              </div>
            )}

            {/* ─── STEP 1: CAMPAIGN DETAILS & MESSAGE ─── */}
            {wizardStep === 1 && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#4A7B5B] block mb-1">Campaign Name *</label>
                    <input
                      id="campaign_name_input"
                      name="campaignName"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={campaignDraft.campaignName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCampaignDraft((prev) => ({
                          ...prev,
                          campaignName: val,
                        }));
                      }}
                      placeholder="e.g. Few Seats For BPT"
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#4A7B5B] block mb-1">Campaign Type</label>
                    <select
                      id="campaign_type_select"
                      name="campaignType"
                      value={campaignDraft.campaignType}
                      onChange={(e) => setCampaignDraft((prev) => ({ ...prev, campaignType: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                    >
                      <option value="PROMOTIONAL">PROMOTIONAL (Enforces Opt-Out)</option>
                      <option value="TRANSACTIONAL">TRANSACTIONAL (Policy Directives)</option>
                    </select>
                  </div>
                </div>

                {/* Delivery Channels */}
                <div>
                  <label className="font-bold text-[#4A7B5B] block mb-1.5">Delivery Channels *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "IN_APP", label: "In-App Notification", icon: Bell },
                      { id: "EMAIL", label: "Email Gateway", icon: Mail },
                      { id: "SMS", label: "SMS DLT Gateway", icon: Phone },
                      { id: "WHATSAPP", label: "WhatsApp Cloud API", icon: MessageSquare },
                    ].map((ch) => {
                      const isSelected = campaignDraft.channels.includes(ch.id as any);
                      const Icon = ch.icon;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? campaignDraft.channels.filter((c) => c !== ch.id)
                              : [...campaignDraft.channels, ch.id as any];
                            if (next.length > 0) setCampaignDraft((prev) => ({ ...prev, channels: next }));
                          }}
                          className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition ${
                            isSelected
                              ? "bg-[#E8F3EC] text-[#4A7B5B] border-[#4A7B5B]"
                              : "bg-[#F8FAFC] text-[#4A7B5B] border-[#E2E8F0] hover:bg-white"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? "text-[#4A7B5B]" : "text-[#94A3B8]"}`} />
                          <span className="font-bold text-[11px]">{ch.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Template Pre-loader */}
                {templatesList.length > 0 && (
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#4A7B5B] block">Load from Saved Template (Optional)</span>
                      <span className="text-[11px] text-[#94A3B8]">Pre-populate message fields with an approved template</span>
                    </div>
                    <select
                      id="template_preload_select"
                      name="templateId"
                      onChange={(e) => {
                        const tpl = templatesList.find((t: any) => t.id === e.target.value);
                        if (tpl) {
                          setCampaignDraft((prev) => ({
                            ...prev,
                            templateId: tpl.id,
                            messageTitle: tpl.inAppTitle || tpl.name,
                            emailSubject: tpl.subject || tpl.name,
                            messageBody: tpl.inAppMessage || "",
                            smsBody: tpl.smsBody || "",
                            whatsAppBody: tpl.whatsAppBody || "",
                            channels: tpl.channels?.length ? tpl.channels : prev.channels,
                          }));
                        }
                      }}
                      className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg"
                    >
                      <option value="">Select Template...</option>
                      {templatesList.map((tpl: any) => (
                        <option key={tpl.id} value={tpl.id}>{tpl.name} ({tpl.code})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Message Title */}
                <div>
                  <label className="font-bold text-[#4A7B5B] block mb-1">Message Title / Heading *</label>
                  <input
                    id="message_title_input"
                    name="messageTitle"
                    type="text"
                    autoComplete="off"
                    value={campaignDraft.messageTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCampaignDraft((prev) => ({ ...prev, messageTitle: val }));
                    }}
                    placeholder="e.g. Admissions Open for BPT Programs"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                {/* Email Subject */}
                {campaignDraft.channels.includes("EMAIL") && (
                  <div>
                    <label className="font-bold text-[#4A7B5B] block mb-1">Email Subject Line</label>
                    <input
                      id="email_subject_input"
                      name="emailSubject"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={campaignDraft.emailSubject || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCampaignDraft((prev) => ({ ...prev, emailSubject: val }));
                      }}
                      placeholder="e.g. Important Admission Update: Few Seats Remaining for BPT"
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                    />
                  </div>
                )}

                {/* In-App & General Message Body */}
                <div>
                  <label className="font-bold text-[#4A7B5B] block mb-1">In-App & General Message Body *</label>
                  <textarea
                    id="message_body_input"
                    name="messageBody"
                    rows={3}
                    value={campaignDraft.messageBody}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCampaignDraft((prev) => ({ ...prev, messageBody: val }));
                    }}
                    placeholder="Hello {{studentName}}, admissions are open for {{courseName}}..."
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg font-sans focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                {/* SMS Body */}
                {campaignDraft.channels.includes("SMS") && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#4A7B5B]">SMS Body (DLT / 160 Char Standard)</label>
                      <span className="text-[10px] text-[#94A3B8] font-mono">
                        {(campaignDraft.smsBody || campaignDraft.messageBody || "").length} characters
                      </span>
                    </div>
                    <textarea
                      id="sms_body_input"
                      name="smsBody"
                      rows={2}
                      value={campaignDraft.smsBody || ""}
                      onChange={(e) => setCampaignDraft((prev) => ({ ...prev, smsBody: e.target.value }))}
                      placeholder="Swayam: Hello {{studentName}}, apply for {{courseName}} today."
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg font-mono text-[11px]"
                    />
                  </div>
                )}

                {/* WhatsApp Body */}
                {campaignDraft.channels.includes("WHATSAPP") && (
                  <div>
                    <label className="font-bold text-[#4A7B5B] block mb-1">WhatsApp Message Body (Optional)</label>
                    <textarea
                      id="whatsapp_body_input"
                      name="whatsAppBody"
                      rows={2}
                      value={campaignDraft.whatsAppBody || ""}
                      onChange={(e) => setCampaignDraft((prev) => ({ ...prev, whatsAppBody: e.target.value }))}
                      placeholder="Optional customized WhatsApp copy (defaults to general message body)"
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg font-sans text-xs"
                    />
                  </div>
                )}

                {/* Variable Chips */}
                <div>
                  <span className="text-[11px] font-bold text-[#94A3B8] block mb-1">Supported Dynamic Placeholders:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["studentName", "courseName", "branchName", "collegeName", "applicationNumber", "dueDate"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          const currentMsg = campaignDraft.messageBody || "";
                          const updated = currentMsg + ` {{${v}}}`;
                          setCampaignDraft((prev) => ({ ...prev, messageBody: updated }));
                        }}
                        className="px-2 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] rounded text-[10px] font-mono font-bold hover:bg-[#4A7B5B] hover:text-white transition"
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 2: DYNAMIC AUDIENCE TARGETING ─── */}
            {wizardStep === 2 && (
              <div className="space-y-4 text-xs">
                {/* Target Entity Toggle */}
                <div>
                  <label className="font-bold text-[#4A7B5B] block mb-1.5">Target Entity Group</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "STUDENT", label: "Students (Registered)" },
                      { id: "LEAD", label: "Prospective Leads" },
                      { id: "STAFF", label: "Staff & Counselors" },
                      { id: "ALL", label: "Combined All" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setBuilderTargetEntity(t.id as any)}
                        className={`py-2 text-xs font-bold rounded-lg border transition ${
                          builderTargetEntity === t.id
                            ? "bg-[#4A7B5B] text-white border-[#4A7B5B]"
                            : "bg-[#F8FAFC] text-[#4A7B5B] border-[#E2E8F0] hover:bg-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Academic Criteria */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center gap-2 font-bold text-[#4A7B5B]">
                    <GraduationCap className="w-4 h-4 text-[#4A7B5B]" /> Academic Segmentation
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] text-[#94A3B8] font-semibold block mb-1">Education Level</label>
                      <select
                        id="builder_education_select"
                        value={builderEducation}
                        onChange={(e) => setBuilderEducation(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg"
                      >
                        <option value="">All Education Levels</option>
                        {meta?.educationLevels?.map((lvl: string) => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#94A3B8] font-semibold block mb-1">Course Program</label>
                      <select
                        id="builder_course_select"
                        value={builderCourse}
                        onChange={(e) => {
                          setBuilderCourse(e.target.value);
                          setBuilderBranch("");
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg"
                      >
                        <option value="">All Courses</option>
                        {meta?.courses?.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#94A3B8] font-semibold block mb-1">Branch</label>
                      <select
                        id="builder_branch_select"
                        value={builderBranch}
                        onChange={(e) => setBuilderBranch(e.target.value)}
                        disabled={!builderCourse || availableBranches.length === 0}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-50"
                      >
                        <option value="">All Branches</option>
                        {availableBranches.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Geography Criteria */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center gap-2 font-bold text-[#4A7B5B]">
                    <MapPin className="w-4 h-4 text-[#4A7B5B]" /> Geographic Filtering
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-[#94A3B8] font-semibold block mb-1">State / UT</label>
                      <select
                        id="builder_state_select"
                        value={builderState}
                        onChange={(e) => {
                          setBuilderState(e.target.value);
                          setBuilderDistrict("");
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg"
                      >
                        <option value="">All States & UTs</option>
                        {meta?.states?.map((s: any) => (
                          <option key={s.id} value={s.name}>{s.name} ({s.code})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#94A3B8] font-semibold block mb-1">District</label>
                      <select
                        id="builder_district_select"
                        value={builderDistrict}
                        onChange={(e) => setBuilderDistrict(e.target.value)}
                        disabled={!builderState || availableDistricts.length === 0}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg disabled:opacity-50"
                      >
                        <option value="">All Districts</option>
                        {availableDistricts.map((d: any) => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Live Counter in Step 2 */}
                <div className="p-4 rounded-xl bg-[#E8F3EC] border border-[#4A7B5B]/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#4A7B5B]">Estimated Audience Reach</span>
                    <p className="text-xl font-black text-[#4A7B5B] mt-0.5">
                      {audiencePreview.eligibleCount.toLocaleString()} Eligible Recipients
                    </p>
                    <p className="text-[11px] text-[#94A3B8]">
                      Total: {audiencePreview.totalAudience} • Opt-Outs: {audiencePreview.excludedConsentCount} • Invalid: {audiencePreview.invalidContactCount}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => refetchAudiencePreview()}
                    className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#4A7B5B] hover:bg-[#F8FAFC] flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAudienceCalculating ? 'animate-spin' : ''}`} /> Recalculate
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 3: REVIEW, SCHEDULE & PERSIST ─── */}
            {wizardStep === 3 && (
              <div className="space-y-4 text-xs">
                {/* Summary Card */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <div>
                      <h4 className="font-bold text-[#4A7B5B] text-sm">
                        {campaignDraft.campaignName || "Untitled Campaign"}
                      </h4>
                      <span className="text-[11px] text-[#94A3B8]">
                        {campaignDraft.campaignType} • Target: {campaignDraft.targetEntity || builderTargetEntity}
                        {campaignDraft.audienceId ? " • Reusable Segment Attached" : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {campaignDraft.channels.map((ch) => (
                        <span key={ch} className="px-2 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] rounded text-[10px] font-bold">
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-[#94A3B8]">
                      Title: <strong className="text-[#4A7B5B]">{campaignDraft.messageTitle || "—"}</strong>
                    </p>
                    {campaignDraft.emailSubject && (
                      <p className="text-[#94A3B8]">
                        Subject: <strong className="text-[#4A7B5B]">{campaignDraft.emailSubject}</strong>
                      </p>
                    )}
                    <p className="text-[#4A7B5B] bg-white p-3 rounded-lg border border-[#E2E8F0] mt-1 font-sans whitespace-pre-wrap">
                      {campaignDraft.messageBody || "—"}
                    </p>
                    {campaignDraft.channels.includes("SMS") && campaignDraft.smsBody && (
                      <div className="mt-2 pt-2 border-t border-[#E2E8F0]">
                        <span className="text-[11px] font-bold text-[#94A3B8]">SMS Body:</span>
                        <p className="text-[#4A7B5B] font-mono text-[11px] bg-white p-2 rounded border border-[#E2E8F0] mt-0.5">
                          {campaignDraft.smsBody}
                        </p>
                      </div>
                    )}
                    {campaignDraft.channels.includes("WHATSAPP") && campaignDraft.whatsAppBody && (
                      <div className="mt-2 pt-2 border-t border-[#E2E8F0]">
                        <span className="text-[11px] font-bold text-[#94A3B8]">WhatsApp Body:</span>
                        <p className="text-[#4A7B5B] bg-white p-2 rounded border border-[#E2E8F0] mt-0.5">
                          {campaignDraft.whatsAppBody}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audience Count Banner */}
                <div className="p-4 rounded-xl bg-[#E8F3EC] border border-[#4A7B5B]/20 text-center">
                  <span className="text-xs font-semibold text-[#4A7B5B]">Final Validated Audience</span>
                  <p className="text-2xl font-black text-[#4A7B5B] mt-0.5">
                    {audiencePreview.eligibleCount.toLocaleString()} Eligible Recipients
                  </p>
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    {audiencePreview.excludedConsentCount} Excluded due to consent opt-out • {audiencePreview.invalidContactCount} Invalid contact details
                  </p>
                </div>

                {/* Scheduling Input */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#4A7B5B] block">Schedule Broadcast Timing (Optional)</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Calendar className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                      <input
                        id="scheduled_at_input"
                        name="scheduledAt"
                        type="datetime-local"
                        value={campaignDraft.scheduledAt || ""}
                        onChange={(e) => setCampaignDraft((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                      />
                    </div>
                    {campaignDraft.scheduledAt && (
                      <button
                        type="button"
                        onClick={() => setCampaignDraft((prev) => ({ ...prev, scheduledAt: "" }))}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Clear Schedule
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-[#94A3B8]">
                    Leave blank to save as a Draft (or click "Save & Send Now" below to broadcast immediately).
                  </p>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-[#E2E8F0]">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setWizardError(null);
                    setWizardStep((wizardStep - 1) as any);
                  }}
                  className="px-4 py-2 text-xs font-bold text-[#4A7B5B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg hover:bg-white transition"
                >
                  ← Back
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleWizardNext}
                    className="px-5 py-2 text-xs font-bold text-white bg-[#4A7B5B] rounded-lg hover:bg-[#3D664B] transition shadow-xs flex items-center gap-1.5"
                  >
                    Next Step →
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={createCampaignMutation.isPending}
                      onClick={() => handleConfirmSaveCampaign(true)}
                      className="px-4 py-2 text-xs font-bold text-[#4A7B5B] bg-[#E8F3EC] border border-[#4A7B5B]/30 rounded-lg hover:bg-[#4A7B5B] hover:text-white transition disabled:opacity-50"
                    >
                      {createCampaignMutation.isPending && sendNowImmediate ? "Sending..." : "Save & Send Now"}
                    </button>

                    <button
                      type="button"
                      disabled={createCampaignMutation.isPending}
                      onClick={() => handleConfirmSaveCampaign(false)}
                      className="px-5 py-2 text-xs font-bold text-white bg-[#4A7B5B] rounded-lg hover:bg-[#3D664B] transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {createCampaignMutation.isPending && !sendNowImmediate ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : campaignDraft.scheduledAt ? (
                        "Schedule Campaign"
                      ) : (
                        "Confirm & Save Campaign"
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SAVE AUDIENCE / SEGMENT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showSaveAudienceModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#4A7B5B]" />
                <h3 className="text-sm font-bold text-[#4A7B5B]">Save Reusable Audience Segment</h3>
              </div>
              <button onClick={() => setShowSaveAudienceModal(false)} className="text-[#94A3B8] hover:text-[#4A7B5B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#4A7B5B] block mb-1">Audience / Segment Name *</label>
                <input
                  type="text"
                  value={saveAudienceForm.name}
                  onChange={(e) => setSaveAudienceForm({ ...saveAudienceForm, name: e.target.value })}
                  placeholder="e.g. Bihar 12th Science 2026"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A7B5B] block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={saveAudienceForm.description}
                  onChange={(e) => setSaveAudienceForm({ ...saveAudienceForm, description: e.target.value })}
                  placeholder="e.g. 12th Science students from Bihar who selected B.Tech."
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div className="p-3 bg-[#E8F3EC] border border-[#4A7B5B]/20 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#4A7B5B] font-bold block">Current Resolved Reach</span>
                  <span className="text-xs text-[#4A7B5B] font-bold">
                    {audiencePreview.eligibleCount.toLocaleString()} Eligible Recipients
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-white text-[#4A7B5B] text-[10px] font-bold rounded">
                  Dynamic Definition
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setShowSaveAudienceModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#4A7B5B] bg-[#F8FAFC] rounded-lg hover:bg-[#E2E8F0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!saveAudienceForm.name.trim()) {
                    showFeedback("error", "Audience name is required.");
                    return;
                  }
                  createSavedAudienceMutation.mutate({
                    name: saveAudienceForm.name.trim(),
                    description: saveAudienceForm.description.trim(),
                    entityType: saveAudienceForm.entityType,
                    audienceDefinition: currentAudiencePayload,
                    lastPreviewCount: audiencePreview.eligibleCount,
                  });
                }}
                disabled={!saveAudienceForm.name.trim() || createSavedAudienceMutation.isPending}
                className="px-4 py-2 text-xs font-bold text-white bg-[#4A7B5B] rounded-lg hover:bg-[#3D664B] disabled:opacity-50"
              >
                {createSavedAudienceMutation.isPending ? "Saving Audience..." : "Save Audience"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast System Alert Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#4A7B5B]">Broadcast System Alert</h3>
              <button onClick={() => setShowSendModal(false)} className="text-[#94A3B8] hover:text-[#4A7B5B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#4A7B5B] block mb-1">Target Role</label>
                <select
                  value={sendForm.receiverRole}
                  onChange={(e) => setSendForm({ ...sendForm, receiverRole: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#4A7B5B] block mb-1">Alert Title *</label>
                <input
                  type="text"
                  value={sendForm.title}
                  onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
                  placeholder="e.g. Scheduled System Maintenance"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A7B5B] block mb-1">Message Content *</label>
                <textarea
                  rows={3}
                  value={sendForm.message}
                  onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                  placeholder="Enter broadcast message details..."
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#4A7B5B] block mb-1">Priority</label>
                  <select
                    value={sendForm.priority}
                    onChange={(e) => setSendForm({ ...sendForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#4A7B5B] block mb-1">Category</label>
                  <select
                    value={sendForm.category}
                    onChange={(e) => setSendForm({ ...sendForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#4A7B5B] bg-[#F8FAFC] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => sendAlertMutation.mutate(sendForm)}
                disabled={!sendForm.title || !sendForm.message || sendAlertMutation.isPending}
                className="px-4 py-2 text-xs font-bold text-white bg-[#4A7B5B] rounded-lg hover:bg-[#3D664B] disabled:opacity-50"
              >
                {sendAlertMutation.isPending ? "Broadcasting..." : "Broadcast Alert"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#4A7B5B]">Create Authoritative Template</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-[#94A3B8] hover:text-[#4A7B5B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#4A7B5B] block mb-1">Template Code *</label>
                  <input
                    type="text"
                    value={templateForm.code}
                    onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. APPLICATION_APPROVED"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#4A7B5B] block mb-1">Category</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                  >
                    <option value="TRANSACTIONAL">TRANSACTIONAL</option>
                    <option value="PROMOTIONAL">PROMOTIONAL</option>
                    <option value="SYSTEM">SYSTEM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#4A7B5B] block mb-1">Template Name *</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g. Admission Approval Confirmation"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A7B5B] block mb-1">In-App Notification Title</label>
                <input
                  type="text"
                  value={templateForm.inAppTitle}
                  onChange={(e) => setTemplateForm({ ...templateForm, inAppTitle: e.target.value })}
                  placeholder="Admission Approved 🎉"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A7B5B] block mb-1">In-App & General Message *</label>
                <textarea
                  rows={2}
                  value={templateForm.inAppMessage}
                  onChange={(e) => setTemplateForm({ ...templateForm, inAppMessage: e.target.value })}
                  placeholder="Hello {{studentName}}, your application {{applicationNumber}} is approved..."
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A7B5B] block mb-1">Email Subject Line</label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="Admission Decision for {{courseName}}"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#4A7B5B] bg-[#F8FAFC] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => createTemplateMutation.mutate(templateForm)}
                disabled={!templateForm.code || !templateForm.name || createTemplateMutation.isPending}
                className="px-4 py-2 text-xs font-bold text-white bg-[#4A7B5B] rounded-lg hover:bg-[#3D664B] disabled:opacity-50"
              >
                {createTemplateMutation.isPending ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ErrorBoundary>
      <NotificationsPageInner />
    </ErrorBoundary>
  );
}
