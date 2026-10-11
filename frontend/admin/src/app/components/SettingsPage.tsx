import { useState, useMemo } from "react";
import {
  Globe,
  Bell,
  Palette,
  Mail,
  Shield,
  Zap,
  Activity,
  RefreshCw,
  Download,
  Layers,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Check,
  History,
  RotateCcw,
  Upload,
  Clock,
  FileCheck,
  Lock,
  Cpu,
  Server,
  DollarSign,
  Briefcase,
  GraduationCap,
  FileText,
  Star,
  Award,
  BarChart3,
  Power,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  settingsApi,
  SystemConfiguration,
  SystemConfigurationVersion,
  ConfigurationApprovalRequest,
  ConfigurationCategory,
  ConfigurationScope,
  TelemetryMetrics,
  SystemSetting,
  BrandingSetting,
  NotificationSetting,
  IntegrationSetting,
  SecuritySetting,
  SEOSetting,
} from "../../api/settings.api";
import BrandContactManager from "./BrandContactManager";

interface CategoryTab {
  id: string;
  label: string;
  category?: ConfigurationCategory;
  icon: any;
  badge?: number;
}

const CATEGORY_TABS: CategoryTab[] = [
  { id: "all", label: "All Configurations", icon: Sliders },
  { id: "brand_contact", label: "Brand, Contact & Social", icon: Palette },
  { id: "COUNSELING", label: "CRM & Counseling", category: "COUNSELING", icon: Briefcase },
  { id: "TASKS_SLA", label: "Tasks & SLAs", category: "TASKS_SLA", icon: Clock },
  { id: "ADMISSIONS", label: "Admissions Workflow", category: "ADMISSIONS", icon: GraduationCap },
  { id: "APPLICATIONS", label: "Application Rules", category: "APPLICATIONS", icon: FileText },
  { id: "PAYMENTS", label: "Payments & Finance", category: "PAYMENTS", icon: DollarSign },
  { id: "DOCUMENTS", label: "Documents & Files", category: "DOCUMENTS", icon: FileCheck },
  { id: "REPORTING_ENROLLMENT", label: "Reporting & Enrollment", category: "REPORTING_ENROLLMENT", icon: Globe },
  { id: "NOTIFICATIONS", label: "Notifications", category: "NOTIFICATIONS", icon: Bell },
  { id: "CAMPAIGNS", label: "Campaigns & Marketing", category: "CAMPAIGNS", icon: Zap },
  { id: "REVIEWS", label: "Reviews & Feedback", category: "REVIEWS", icon: Star },
  { id: "RANKINGS", label: "Ranking Algorithm", category: "RANKINGS", icon: Award },
  { id: "ANALYTICS", label: "Analytics & MIS", category: "ANALYTICS", icon: BarChart3 },
  { id: "SECURITY", label: "Security & Policy", category: "SECURITY", icon: Shield },
  { id: "MAINTENANCE", label: "Maintenance Mode", category: "MAINTENANCE", icon: Power },
  { id: "FEATURE_FLAGS", label: "Feature Flags", category: "FEATURE_FLAGS", icon: Layers },
  { id: "approvals", label: "Governance Approvals", icon: AlertTriangle },
  { id: "telemetry", label: "System Telemetry", icon: Activity },
  { id: "legacy", label: "Platform Essentials", icon: Globe },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // State Management
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScope, setSelectedScope] = useState<ConfigurationScope>("GLOBAL");
  const [scopeIdInput, setScopeIdInput] = useState("");
  const [selectedConfigForDetail, setSelectedConfigForDetail] = useState<SystemConfiguration | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Edit State Modal
  const [editingConfig, setEditingConfig] = useState<SystemConfiguration | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const [editReason, setEditReason] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  // Rollback Modal State
  const [rollbackConfig, setRollbackConfig] = useState<SystemConfiguration | null>(null);
  const [selectedVersionForRollback, setSelectedVersionForRollback] = useState<number | null>(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const [showRollbackModal, setShowRollbackModal] = useState(false);

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importDryRunResult, setImportDryRunResult] = useState<any>(null);
  const [importReason, setImportReason] = useState("");

  // Queries
  const { data: configRes, isLoading: isConfigsLoading, refetch: refetchConfigs } = useQuery({
    queryKey: ["admin_system_configurations", activeCategoryTab, selectedScope, scopeIdInput, searchQuery],
    queryFn: () =>
      settingsApi.queryConfigurations({
        category: activeCategoryTab !== "all" && activeCategoryTab !== "approvals" && activeCategoryTab !== "telemetry" && activeCategoryTab !== "legacy" && activeCategoryTab !== "brand_contact"
          ? activeCategoryTab
          : undefined,
        scope: selectedScope,
        scopeId: scopeIdInput.trim() || undefined,
        search: searchQuery.trim() || undefined,
        limit: 100,
      }),
  });

  const { data: approvalsRes, refetch: refetchApprovals } = useQuery({
    queryKey: ["admin_configuration_approvals"],
    queryFn: () => settingsApi.getPendingApprovals(),
    enabled: activeCategoryTab === "approvals" || activeCategoryTab === "all",
  });

  const { data: telemetryRes, refetch: refetchTelemetry } = useQuery({
    queryKey: ["admin_system_telemetry"],
    queryFn: () => settingsApi.getTelemetryMetrics(),
    enabled: activeCategoryTab === "telemetry",
    refetchInterval: activeCategoryTab === "telemetry" ? 5000 : false,
  });

  const { data: historyRes, refetch: refetchHistory } = useQuery({
    queryKey: ["admin_configuration_history", selectedConfigForDetail?.key],
    queryFn: () =>
      selectedConfigForDetail
        ? settingsApi.getConfigurationHistory(selectedConfigForDetail.key, selectedScope, scopeIdInput)
        : null,
    enabled: !!selectedConfigForDetail,
  });

  // Legacy platform settings for "Platform Essentials" tab
  const { data: legacySettingsRes } = useQuery({
    queryKey: ["admin_legacy_settings"],
    queryFn: () => settingsApi.getAllSettings(),
    enabled: activeCategoryTab === "legacy",
  });

  const configurations: SystemConfiguration[] = configRes?.data?.data || [];
  const pendingApprovals: ConfigurationApprovalRequest[] = approvalsRes?.data || [];
  const telemetry: TelemetryMetrics | null = telemetryRes?.data || null;
  const historyList: SystemConfigurationVersion[] = historyRes?.data || [];

  const triggerNotice = (message: string, type: "success" | "error" = "success") => {
    setFeedbackNotice({ type, message });
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: any }) =>
      settingsApi.updateConfiguration(key, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin_system_configurations"] });
      queryClient.invalidateQueries({ queryKey: ["admin_configuration_approvals"] });
      if (res?.data?.status === "SUBMITTED_FOR_APPROVAL") {
        triggerNotice("Proposed change submitted for second-person governance approval.", "success");
      } else {
        triggerNotice("Configuration updated and verified successfully!", "success");
      }
      setShowEditModal(false);
      setEditingConfig(null);
      setEditReason("");
    },
    onError: (err: any) => {
      triggerNotice(err?.response?.data?.message || err.message || "Failed to update configuration", "error");
    },
  });

  const reviewApprovalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: "APPROVED" | "REJECTED"; reviewNotes?: string } }) =>
      settingsApi.reviewApproval(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin_system_configurations"] });
      queryClient.invalidateQueries({ queryKey: ["admin_configuration_approvals"] });
      triggerNotice(`Approval request ${vars.data.status.toLowerCase()} successfully!`, "success");
    },
    onError: (err: any) => {
      triggerNotice(err?.response?.data?.message || err.message || "Governance action failed", "error");
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: any }) =>
      settingsApi.rollbackConfiguration(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_system_configurations"] });
      queryClient.invalidateQueries({ queryKey: ["admin_configuration_history"] });
      triggerNotice("Setting rolled back to selected version successfully!", "success");
      setShowRollbackModal(false);
      setRollbackConfig(null);
    },
    onError: (err: any) => {
      triggerNotice(err?.response?.data?.message || err.message || "Rollback failed", "error");
    },
  });

  const resetMutation = useMutation({
    mutationFn: (key: string) =>
      settingsApi.resetConfigurationToDefault(key, selectedScope, scopeIdInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_system_configurations"] });
      triggerNotice("Setting restored to default baseline value.", "success");
    },
    onError: (err: any) => {
      triggerNotice(err?.response?.data?.message || err.message || "Reset failed", "error");
    },
  });

  const importMutation = useMutation({
    mutationFn: (data: any) => settingsApi.importConfigurations(data),
    onSuccess: (res: any) => {
      if (res?.data?.dryRun) {
        setImportDryRunResult(res.data);
      } else {
        queryClient.invalidateQueries({ queryKey: ["admin_system_configurations"] });
        triggerNotice(res?.data?.message || "Configurations imported successfully!", "success");
        setShowImportModal(false);
        setImportDryRunResult(null);
        setImportJsonText("");
      }
    },
    onError: (err: any) => {
      triggerNotice(err?.response?.data?.message || err.message || "Import validation failed", "error");
    },
  });

  const handleOpenEdit = (config: SystemConfiguration) => {
    setEditingConfig(config);
    setEditValue(config.value);
    setEditReason("");
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingConfig) return;
    if (editingConfig.isHighRisk && !editReason.trim()) {
      triggerNotice("Change reason is mandatory for high-impact settings.", "error");
      return;
    }

    updateMutation.mutate({
      key: editingConfig.key,
      data: {
        value: editValue,
        changeReason: editReason.trim(),
        expectedVersion: editingConfig.version,
        scope: selectedScope,
        scopeId: scopeIdInput.trim() || undefined,
      },
    });
  };

  const handleExportJson = async () => {
    try {
      const res = await settingsApi.exportConfigurations();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `swayam_configurations_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerNotice("Non-secret configuration bundle exported.", "success");
    } catch (err: any) {
      triggerNotice("Export failed: " + err.message, "error");
    }
  };

  const handleDryRunImport = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const payload = parsed.configurations || parsed;
      importMutation.mutate({
        configurations: payload,
        dryRun: true,
        changeReason: importReason.trim() || "Dry-run validation",
      });
    } catch (e: any) {
      triggerNotice("Invalid JSON syntax: " + e.message, "error");
    }
  };

  const handleApplyImport = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const payload = parsed.configurations || parsed;
      importMutation.mutate({
        configurations: payload,
        dryRun: false,
        changeReason: importReason.trim() || "Bulk configuration import",
      });
    } catch (e: any) {
      triggerNotice("Invalid JSON syntax: " + e.message, "error");
    }
  };

  const handlePurgeCache = async () => {
    try {
      await settingsApi.clearCache();
      queryClient.invalidateQueries();
      triggerNotice("System and query cache cleared successfully!", "success");
    } catch (err: any) {
      triggerNotice("Cache purge failed: " + err.message, "error");
    }
  };

  return (
    <div className="p-4 lg:p-7 min-h-screen" style={{ background: "#F8FAFC" }}>
      {/* Top Header & Notice */}
      <div className="max-w-7xl mx-auto space-y-5">
        {feedbackNotice && (
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold shadow-sm animate-in fade-in ${
              feedbackNotice.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackNotice.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{feedbackNotice.message}</span>
            </div>
            <button onClick={() => setFeedbackNotice(null)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#F1F5F9] shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#E8F3EC] flex items-center justify-center text-[#4A7B5B]">
                <Sliders className="w-4 h-4" />
              </div>
              <h1 className="text-[#4A7B5B] text-xl font-extrabold tracking-tight">
                Enterprise System Configuration & Governance Control Center
              </h1>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Centralized, strongly typed, scoped, and audited business rule engine for Swayam Admission Platform.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePurgeCache}
              className="h-9 px-3.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#4A7B5B] bg-white hover:bg-slate-50 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#4A7B5B]" />
              Purge Cache
            </button>

            <button
              onClick={handleExportJson}
              className="h-9 px-3.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#4A7B5B] bg-white hover:bg-slate-50 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#4A7B5B]" />
              Export JSON
            </button>

            <button
              onClick={() => {
                setShowImportModal(true);
                setImportDryRunResult(null);
              }}
              className="h-9 px-3.5 rounded-xl border border-[#4A7B5B] text-xs font-bold text-white bg-[#4A7B5B] hover:bg-[#3d654a] flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Bundle
            </button>
          </div>
        </div>

        {/* Scope and Search Filter Strip */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-3.5 rounded-2xl border border-[#F1F5F9] shadow-sm">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by setting key, label, or description (e.g. escalationHours, capacity)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E2E8F0] text-xs text-[#4A7B5B] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#94A3B8] whitespace-nowrap">Scope:</span>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value as ConfigurationScope)}
              className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs text-[#4A7B5B] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#4A7B5B]"
            >
              <option value="GLOBAL">GLOBAL (Platform Default)</option>
              <option value="ORGANIZATION">ORGANIZATION</option>
              <option value="DEPARTMENT">DEPARTMENT</option>
              <option value="UNIT">UNIT</option>
              <option value="COLLEGE">COLLEGE / INSTITUTION</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <input
              type="text"
              placeholder={selectedScope === "GLOBAL" ? "Scope ID (Disabled for GLOBAL)" : "Enter Specific Scope ID..."}
              disabled={selectedScope === "GLOBAL"}
              value={scopeIdInput}
              onChange={(e) => setScopeIdInput(e.target.value)}
              className={`w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs text-[#4A7B5B] ${
                selectedScope === "GLOBAL" ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-[#F8FAFC] focus:bg-white"
              } focus:outline-none focus:border-[#4A7B5B]`}
            />
          </div>
        </div>

        {/* Main Grid: Category Navigation on Left, Content on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Categories Sidebar */}
          <div className="lg:col-span-3 space-y-1">
            <div className="bg-white p-2 rounded-2xl border border-[#F1F5F9] shadow-sm space-y-1">
              <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
                Configuration Domains
              </div>
              {CATEGORY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeCategoryTab === tab.id;
                const hasPending = tab.id === "approvals" && pendingApprovals.length > 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategoryTab(tab.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#E8F3EC] text-[#4A7B5B] font-bold"
                        : "text-[#64748B] hover:bg-slate-50 hover:text-[#4A7B5B]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </div>
                    {hasPending && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                        {pendingApprovals.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Work Area */}
          <div className="lg:col-span-9 space-y-5">
            {/* 1. APPROVALS TAB */}
            {activeCategoryTab === "approvals" && (
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-[#F1F5F9] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#4A7B5B] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Pending Governance Approvals ({pendingApprovals.length})
                      </h3>
                      <p className="text-xs text-[#94A3B8]">
                        High-risk configuration modifications requiring second-person administrative authorization.
                      </p>
                    </div>
                    <button
                      onClick={() => refetchApprovals()}
                      className="text-xs text-[#4A7B5B] font-bold hover:underline"
                    >
                      Refresh
                    </button>
                  </div>

                  {pendingApprovals.length === 0 ? (
                    <div className="p-8 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0]">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-[#4A7B5B]">All pending approvals resolved</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">No configuration change requests currently pending sign-off.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingApprovals.map((req) => (
                        <div
                          key={req.id}
                          className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#4A7B5B]">{req.key}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                PENDING REVIEW
                              </span>
                            </div>
                            <span className="text-[11px] text-[#94A3B8]">
                              Requested by <strong className="text-[#4A7B5B]">{req.requestedByName}</strong> on{" "}
                              {new Date(req.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-amber-200/60 text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-[#94A3B8] block uppercase">Current Value</span>
                              <span className="font-mono font-bold text-slate-700">
                                {typeof req.currentValue === "object" ? JSON.stringify(req.currentValue) : String(req.currentValue)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-emerald-700 block uppercase">Proposed New Value</span>
                              <span className="font-mono font-bold text-emerald-700">
                                {typeof req.proposedValue === "object" ? JSON.stringify(req.proposedValue) : String(req.proposedValue)}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-amber-100">
                            <strong>Reason: </strong> {req.changeReason}
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() =>
                                reviewApprovalMutation.mutate({
                                  id: req.id,
                                  data: { status: "REJECTED", reviewNotes: "Rejected by administrator" },
                                })
                              }
                              className="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-50"
                            >
                              Reject Proposal
                            </button>
                            <button
                              onClick={() =>
                                reviewApprovalMutation.mutate({
                                  id: req.id,
                                  data: { status: "APPROVED", reviewNotes: "Approved and verified" },
                                })
                              }
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
                            >
                              Approve & Apply
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. TELEMETRY TAB */}
            {activeCategoryTab === "telemetry" && (
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-[#F1F5F9] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#4A7B5B] flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#4A7B5B]" />
                        Real-Time Platform Diagnostics & System Telemetry
                      </h3>
                      <p className="text-xs text-[#94A3B8]">
                        Authoritative server latency, PostgreSQL health, memory utilization, and background queues.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-bold text-emerald-700">Live Polling (5s)</span>
                    </div>
                  </div>

                  {telemetry ? (
                    <div className="space-y-4">
                      {/* Metric Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                          <span className="text-[10px] font-extrabold uppercase text-[#94A3B8] block">Database Status</span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-extrabold text-[#4A7B5B]">
                              {telemetry.database.status}
                            </span>
                            <span className="text-xs font-mono font-bold text-[#4A7B5B]">
                              {telemetry.database.latencyMs}ms
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                          <span className="text-[10px] font-extrabold uppercase text-[#94A3B8] block">Node.js Memory RSS</span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-extrabold text-[#4A7B5B]">
                              {telemetry.system.memoryUsageMb.rss} MB
                            </span>
                            <span className="text-[10px] font-bold text-[#94A3B8]">
                              Heap: {telemetry.system.memoryUsageMb.heapUsed}MB
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                          <span className="text-[10px] font-extrabold uppercase text-[#94A3B8] block">Server Uptime</span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-extrabold text-[#4A7B5B]">
                              {Math.floor(telemetry.system.uptimeSeconds / 3600)}h {Math.floor((telemetry.system.uptimeSeconds % 3600) / 60)}m
                            </span>
                            <span className="text-[10px] font-bold text-[#94A3B8]">
                              {telemetry.system.platform} ({telemetry.system.cpus} CPU)
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                          <span className="text-[10px] font-extrabold uppercase text-[#94A3B8] block">Config Cache Keys</span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-extrabold text-[#4A7B5B]">
                              {telemetry.cache.cachedKeysCount} Keys
                            </span>
                            <span className="text-xs font-bold text-emerald-600">
                              TTL: {telemetry.cache.ttlSeconds}s
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Queue Counts */}
                      <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white">
                        <span className="text-xs font-bold text-[#4A7B5B] block mb-3">Live Active Entity Queues</span>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-[#94A3B8] uppercase font-bold block">Active Pending Tasks</span>
                            <span className="text-lg font-extrabold text-[#4A7B5B]">{telemetry.queues.activeTasks}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-[#94A3B8] uppercase font-bold block">New Applications</span>
                            <span className="text-lg font-extrabold text-[#4A7B5B]">{telemetry.queues.pendingApplications}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-[#94A3B8] uppercase font-bold block">Pending Payments</span>
                            <span className="text-lg font-extrabold text-[#4A7B5B]">{telemetry.queues.pendingPayments}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-[#94A3B8]">Loading telemetry streams...</div>
                  )}
                </div>
              </div>
            )}

            {/* 3. PLATFORM ESSENTIALS (LEGACY GENERAL / BRANDING / NOTIFICATION PROPS) */}
            {activeCategoryTab === "legacy" && (
              <div className="bg-white p-5 rounded-2xl border border-[#F1F5F9] shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#4A7B5B]">Platform Branding & Identification</h3>
                  <p className="text-xs text-[#94A3B8]">Core organizational identity and default values.</p>
                </div>
                {legacySettingsRes?.data?.system ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Platform Name</span>
                      <span className="font-bold text-[#4A7B5B]">{legacySettingsRes.data.system.platformName}</span>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Support Email</span>
                      <span className="font-bold text-[#4A7B5B]">{legacySettingsRes.data.system.supportEmail}</span>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Timezone</span>
                      <span className="font-bold text-[#4A7B5B]">{legacySettingsRes.data.system.timezone}</span>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Academic Session</span>
                      <span className="font-bold text-[#4A7B5B]">{legacySettingsRes.data.system.academicSession}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-xs text-[#94A3B8]">Loading platform details...</div>
                )}
              </div>
            )}

            {/* 4. BRAND, CONTACT & SOCIAL MASTER SETTINGS */}
            {activeCategoryTab === "brand_contact" && (
              <BrandContactManager triggerNotice={triggerNotice} />
            )}

            {/* 5. CANONICAL CONFIGURATIONS LIST */}
            {activeCategoryTab !== "approvals" && activeCategoryTab !== "telemetry" && activeCategoryTab !== "legacy" && activeCategoryTab !== "brand_contact" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-[#4A7B5B]">
                    Showing {configurations.length} Configuration Rules ({selectedScope})
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">
                    Precedence: COLLEGE &rarr; UNIT &rarr; DEPARTMENT &rarr; ORGANIZATION &rarr; GLOBAL
                  </span>
                </div>

                {isConfigsLoading ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-[#F1F5F9]">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#4A7B5B] mx-auto mb-2" />
                    <p className="text-xs font-bold text-[#4A7B5B]">Resolving Authoritative Configuration Engine...</p>
                  </div>
                ) : configurations.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-[#F1F5F9]">
                    <FileText className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                    <p className="text-xs font-bold text-[#4A7B5B]">No configuration rules found</p>
                    <p className="text-[11px] text-[#94A3B8] mt-1">Try clearing search filters or changing the active scope.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {configurations.map((config) => {
                      const isOverridden = config.scope !== "GLOBAL";
                      return (
                        <div
                          key={config.id || config.key}
                          className="bg-white p-4 rounded-2xl border border-[#F1F5F9] shadow-sm hover:border-[#E2E8F0] transition-all space-y-3"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-extrabold text-[#4A7B5B] bg-slate-100 px-2 py-0.5 rounded-md">
                                  {config.key}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                                  {config.dataType}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  v{config.version}
                                </span>
                                {config.isHighRisk && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                    HIGH RISK
                                  </span>
                                )}
                                {config.requiresApproval && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    MANDATES APPROVAL
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-[#4A7B5B] mt-1.5">{config.label}</h4>
                              {config.description && (
                                <p className="text-[11px] text-[#64748B] mt-0.5">{config.description}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 self-end md:self-center">
                              <button
                                onClick={() => setSelectedConfigForDetail(config)}
                                className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                              >
                                <History className="w-3 h-3 text-[#4A7B5B]" />
                                History
                              </button>

                              <button
                                onClick={() => resetMutation.mutate(config.key)}
                                title="Reset to system default"
                                className="h-8 px-2 rounded-lg border border-[#E2E8F0] text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(config)}
                                className="h-8 px-3 rounded-lg bg-[#4A7B5B] text-white text-xs font-bold hover:bg-[#3d654a] shadow-sm"
                              >
                                Edit Setting
                              </button>
                            </div>
                          </div>

                          {/* Value Display Box */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-xs">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-[#94A3B8] block">Current Effective Value</span>
                              <span className="font-mono font-bold text-[#4A7B5B]">
                                {config.dataType === "BOOLEAN"
                                  ? String(config.value) === "true" || config.value === true
                                    ? "ENABLED (true)"
                                    : "DISABLED (false)"
                                  : typeof config.value === "object"
                                  ? JSON.stringify(config.value)
                                  : String(config.value)}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-[#94A3B8] block">Default Baseline</span>
                              <span className="font-mono text-slate-500">
                                {typeof config.defaultValue === "object"
                                  ? JSON.stringify(config.defaultValue)
                                  : String(config.defaultValue)}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-[#94A3B8] block">Scope / Last Updated</span>
                              <span className="text-[11px] text-[#64748B]">
                                {config.scope} {config.scopeId ? `(${config.scopeId})` : ""} &bull;{" "}
                                {config.lastModifiedByName || "System"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── EDIT SETTING MODAL ── */}
      {showEditModal && editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden space-y-4 p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <span className="font-mono text-[10px] font-extrabold text-[#4A7B5B] uppercase bg-[#E8F3EC] px-2 py-0.5 rounded">
                  {editingConfig.dataType} &bull; v{editingConfig.version}
                </span>
                <h3 className="text-sm font-bold text-[#4A7B5B] mt-1">{editingConfig.label}</h3>
                <span className="font-mono text-[11px] text-[#94A3B8]">{editingConfig.key}</span>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editingConfig.isHighRisk && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block">High-Impact Business Configuration</strong>
                  Changing this value alters live system behavior and requires an explicit rationale.
                </div>
              </div>
            )}

            {/* Type-Aware Value Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#4A7B5B]">New Value</label>
              {editingConfig.dataType === "BOOLEAN" ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                  <button
                    type="button"
                    onClick={() => setEditValue(!editValue)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${
                      editValue ? "bg-[#4A7B5B]" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                        editValue ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-xs font-bold text-[#4A7B5B]">
                    {editValue ? "ENABLED (true)" : "DISABLED (false)"}
                  </span>
                </div>
              ) : editingConfig.dataType === "ENUM" && editingConfig.validationRules?.enumOptions ? (
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#4A7B5B] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#4A7B5B]"
                >
                  {editingConfig.validationRules.enumOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : editingConfig.dataType === "INTEGER" || editingConfig.dataType === "DECIMAL" ? (
                <div>
                  <input
                    type="number"
                    min={editingConfig.validationRules?.min}
                    max={editingConfig.validationRules?.max}
                    step={editingConfig.validationRules?.step || 1}
                    value={editValue}
                    onChange={(e) => setEditValue(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] font-mono text-sm font-bold text-[#4A7B5B] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                  {editingConfig.validationRules && (
                    <span className="text-[10px] text-[#94A3B8] mt-1 block">
                      Allowed range: {editingConfig.validationRules.min ?? 0} &ndash;{" "}
                      {editingConfig.validationRules.max ?? "unlimited"}
                    </span>
                  )}
                </div>
              ) : editingConfig.dataType === "JSON" ? (
                <textarea
                  rows={5}
                  value={typeof editValue === "object" ? JSON.stringify(editValue, null, 2) : editValue}
                  onChange={(e) => {
                    try {
                      setEditValue(JSON.parse(e.target.value));
                    } catch {
                      setEditValue(e.target.value);
                    }
                  }}
                  className="w-full p-3 font-mono text-xs rounded-xl border border-[#E2E8F0] text-[#4A7B5B] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#4A7B5B]"
                />
              ) : (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#4A7B5B] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#4A7B5B]"
                />
              )}
            </div>

            {/* Change Reason Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#4A7B5B] flex items-center justify-between">
                <span>Change Reason</span>
                {editingConfig.isHighRisk && <span className="text-rose-600 text-[10px] font-bold">* Mandatory</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. Raised upload limit for high-res scanned certificates"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs text-[#4A7B5B] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="px-5 py-2 rounded-xl bg-[#4A7B5B] text-white text-xs font-bold hover:bg-[#3d654a] shadow-sm flex items-center gap-1.5"
              >
                {updateMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {editingConfig.requiresApproval ? "Submit Proposal" : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY & DIFF DRAWER ── */}
      {selectedConfigForDetail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-[#4A7B5B] bg-[#E8F3EC] px-2 py-0.5 rounded">
                  Version History & Audits
                </span>
                <h3 className="text-sm font-bold text-[#4A7B5B] mt-1">{selectedConfigForDetail.label}</h3>
                <span className="font-mono text-[11px] text-[#94A3B8]">{selectedConfigForDetail.key}</span>
              </div>
              <button
                onClick={() => setSelectedConfigForDetail(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Current Value:</span>
                <strong className="font-mono text-[#4A7B5B]">
                  {typeof selectedConfigForDetail.value === "object"
                    ? JSON.stringify(selectedConfigForDetail.value)
                    : String(selectedConfigForDetail.value)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Default Value:</span>
                <span className="font-mono text-slate-500">
                  {typeof selectedConfigForDetail.defaultValue === "object"
                    ? JSON.stringify(selectedConfigForDetail.defaultValue)
                    : String(selectedConfigForDetail.defaultValue)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-[#4A7B5B] block">Chronological Version Timeline</span>

              {historyList.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#94A3B8]">No previous audit revisions recorded.</div>
              ) : (
                historyList.map((ver) => (
                  <div key={ver.id} className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#4A7B5B] bg-[#E8F3EC] px-2 py-0.5 rounded text-[10px]">
                        v{ver.versionNumber} ({ver.action})
                      </span>
                      <span className="text-[10px] text-[#94A3B8]">{new Date(ver.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-[#F8FAFC] p-2 rounded text-[11px]">
                      <div>
                        <span className="text-[9px] text-[#94A3B8] uppercase block font-bold">Old</span>
                        <span className="font-mono text-slate-500">
                          {ver.oldValue !== null && ver.oldValue !== undefined
                            ? typeof ver.oldValue === "object"
                              ? JSON.stringify(ver.oldValue)
                              : String(ver.oldValue)
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-700 uppercase block font-bold">New</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {typeof ver.newValue === "object" ? JSON.stringify(ver.newValue) : String(ver.newValue)}
                        </span>
                      </div>
                    </div>

                    {ver.changeReason && (
                      <p className="text-[11px] text-slate-600">
                        <strong>Reason:</strong> {ver.changeReason}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-[#94A3B8]">
                      <span>By: {ver.actorName || "System"}</span>
                      {ver.versionNumber < selectedConfigForDetail.version && (
                        <button
                          onClick={() => {
                            setRollbackConfig(selectedConfigForDetail);
                            setSelectedVersionForRollback(ver.versionNumber);
                            setShowRollbackModal(true);
                          }}
                          className="text-xs font-bold text-[#4A7B5B] hover:underline"
                        >
                          Rollback to v{ver.versionNumber}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ROLLBACK MODAL ── */}
      {showRollbackModal && rollbackConfig && selectedVersionForRollback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-5 space-y-4 animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-[#4A7B5B]">
              Rollback Setting to Version v{selectedVersionForRollback}
            </h3>
            <p className="text-xs text-[#64748B]">
              This will create a new audited version for <strong>{rollbackConfig.key}</strong> restoring the state from version v{selectedVersionForRollback}.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#4A7B5B]">Rollback Reason</label>
              <input
                type="text"
                placeholder="e.g. Reverting due to regulatory change"
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs text-[#4A7B5B] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRollbackModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  rollbackMutation.mutate({
                    key: rollbackConfig.key,
                    data: {
                      targetVersionNumber: selectedVersionForRollback,
                      changeReason: rollbackReason.trim(),
                      scope: selectedScope,
                      scopeId: scopeIdInput.trim() || undefined,
                    },
                  })
                }
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm"
              >
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT BUNDLE MODAL ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl p-6 space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#4A7B5B]">Import Configuration Bundle</h3>
                <p className="text-xs text-[#94A3B8]">
                  Paste JSON configuration payload to validate schema and preview diffs before applying.
                </p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#4A7B5B]">JSON Configuration Payload</label>
              <textarea
                rows={7}
                placeholder='{ "configurations": [ { "key": "crm.task.escalationHours", "value": 36 } ] }'
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full p-3 font-mono text-xs rounded-xl border border-[#E2E8F0] text-[#4A7B5B] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#4A7B5B]">Batch Reason</label>
              <input
                type="text"
                placeholder="e.g. Q3 2026 Policy Alignment"
                value={importReason}
                onChange={(e) => setImportReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs text-[#4A7B5B] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            {/* Dry Run Diff Preview Report */}
            {importDryRunResult && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-emerald-900">
                  <span>Validation Preview Diff</span>
                  <span>
                    Modified: {importDryRunResult.summary.modified} | Added: {importDryRunResult.summary.added} | Invalid:{" "}
                    {importDryRunResult.summary.invalid}
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 text-[11px]">
                  {importDryRunResult.diffReport.map((diff: any) => (
                    <div
                      key={diff.key}
                      className={`p-2 rounded flex justify-between font-mono ${
                        diff.status === "MODIFIED"
                          ? "bg-amber-100 text-amber-900"
                          : diff.status === "ADDED"
                          ? "bg-emerald-100 text-emerald-900"
                          : diff.status === "INVALID"
                          ? "bg-rose-100 text-rose-900"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <span>{diff.key}</span>
                      <span>
                        {diff.status === "INVALID"
                          ? diff.error
                          : `${JSON.stringify(diff.oldValue)} &rarr; ${JSON.stringify(diff.newValue)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDryRunImport}
                disabled={!importJsonText.trim() || importMutation.isPending}
                className="px-4 py-2 rounded-xl border border-[#4A7B5B] text-[#4A7B5B] text-xs font-bold hover:bg-[#E8F3EC]"
              >
                Preview Diff (Dry Run)
              </button>
              <button
                type="button"
                onClick={handleApplyImport}
                disabled={!importJsonText.trim() || importMutation.isPending}
                className="px-5 py-2 rounded-xl bg-[#4A7B5B] text-white text-xs font-bold hover:bg-[#3d654a] shadow-sm"
              >
                Apply Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
