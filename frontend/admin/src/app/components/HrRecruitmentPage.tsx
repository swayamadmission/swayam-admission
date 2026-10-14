import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Filter, 
  Briefcase, 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  MoreVertical, 
  Edit, 
  Upload, 
  Pause, 
  Play, 
  Eye, 
  Archive, 
  XCircle, 
  MapPin, 
  Copy,
  Settings,
  Mail,
  ShieldCheck,
  Save,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { hrApi, type Vacancy, type RecruitmentSetting, type ClearanceItem } from "../../api/hr.api";
import VacancyFormModal from "./VacancyFormModal";
import ApplicationsList from "./ApplicationsList";
import ApplicationDetailDrawer from "./ApplicationDetailDrawer";

const labelFmt = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "Not assigned";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "Not assigned"
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  } catch {
    return "Not assigned";
  }
};

export default function HrRecruitmentPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"vacancies" | "applications" | "onboarding" | "settings">("vacancies");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedDrawerTab, setSelectedDrawerTab] = useState<"overview" | "timeline" | "interviews" | "notes" | "workflow">("overview");
  
  // Vacancy states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [vacancySearch, setVacancySearch] = useState("");
  const [vacancyStatusFilter, setVacancyStatusFilter] = useState("ALL");
  const [vacancyDeptFilter, setVacancyDeptFilter] = useState("ALL");

  // Settings form local state
  const [settingsForm, setSettingsForm] = useState<any>({});
  const [settingsInitialized, setSettingsInitialized] = useState(false);
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);

  // Queries
  const { data: vacanciesRes, isLoading: isLoadingVacancies } = useQuery({
    queryKey: ["admin_vacancies"],
    queryFn: hrApi.getVacancies,
  });

  const { data: settingsRes, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["admin_recruitment_settings"],
    queryFn: hrApi.getSettings,
  });

  const { data: clearancesRes, isLoading: isLoadingClearances } = useQuery({
    queryKey: ["admin_clearances"],
    queryFn: hrApi.getClearances,
    enabled: activeTab === "onboarding",
  });

  // Populate settings form when data loads
  React.useEffect(() => {
    if (settingsRes?.data && !settingsInitialized) {
      const d = settingsRes.data as any;
      setSettingsForm({
        ...d,
        recruitmentDisplayName: d.recruitmentDisplayName || d.hrDisplayName || "",
        ccEmails: Array.isArray(d.ccEmails) ? d.ccEmails.join(", ") : d.ccEmails || "",
        allowedResumeFormats: Array.isArray(d.allowedResumeFormats)
          ? d.allowedResumeFormats.join(", ").toUpperCase()
          : d.allowedResumeFormats || "PDF, DOC, DOCX",
        candidateAckEnabled: d.candidateAckEnabled ?? d.candidateAcknowledgementEnabled ?? true,
        adminNotificationEnabled: d.adminNotificationEnabled ?? true,
        resumeAttachmentEnabled: d.resumeAttachmentEnabled ?? true,
        maxResumeSizeMB: d.maxResumeSizeMB ?? d.maxResumeSizeMb ?? 10,
        applicationIdPrefix: d.applicationIdPrefix || "SWY-JOB-APP-",
      });
      setSettingsInitialized(true);
    }
  }, [settingsRes, settingsInitialized]);

  const vacancies: Vacancy[] = vacanciesRes?.data || [];
  const clearances: ClearanceItem[] = clearancesRes?.data || [];

  // Filtered vacancies
  const filteredVacancies = vacancies.filter((v) => {
    if (vacancyStatusFilter !== "ALL" && v.status !== vacancyStatusFilter) return false;
    if (vacancyDeptFilter !== "ALL" && v.department !== vacancyDeptFilter) return false;
    if (vacancySearch.trim()) {
      const q = vacancySearch.toLowerCase();
      const matchTitle = (v.title || "").toLowerCase().includes(q);
      const matchCode = (v.vacancyCode || "").toLowerCase().includes(q);
      const matchDept = (v.department || "").toLowerCase().includes(q);
      const matchLoc = (v.location || "").toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchDept && !matchLoc) return false;
    }
    return true;
  });

  const departments = Array.from(new Set(vacancies.map((v) => v.department).filter(Boolean)));

  const handleCreateNew = () => {
    setSelectedVacancy(null);
    setIsModalOpen(true);
  };

  const handleEdit = (v: Vacancy) => {
    setSelectedVacancy(v);
    setIsModalOpen(true);
  };

  // Status mutations
  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "publish" | "pause" | "resume" | "close" | "archive" }) => {
      if (action === "publish") return hrApi.publishVacancy(id);
      if (action === "pause") return hrApi.pauseVacancy(id);
      if (action === "resume") return hrApi.resumeVacancy(id);
      if (action === "close") return hrApi.closeVacancy(id);
      if (action === "archive") return hrApi.archiveVacancy(id);
      throw new Error("Invalid action");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_vacancies"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to update status");
    },
  });

  // Duplicate vacancy mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => hrApi.duplicateVacancy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_vacancies"] });
      alert("Vacancy duplicated successfully as Draft.");
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to duplicate vacancy");
    },
  });

  // Settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (payload: any) => hrApi.updateSettings(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin_recruitment_settings"] });
      queryClient.invalidateQueries({ queryKey: ["careers_public_settings"] });
      const d = res.data as any;
      setSettingsForm({
        ...d,
        recruitmentDisplayName: d.recruitmentDisplayName || d.hrDisplayName || "",
        ccEmails: Array.isArray(d.ccEmails) ? d.ccEmails.join(", ") : d.ccEmails || "",
        allowedResumeFormats: Array.isArray(d.allowedResumeFormats)
          ? d.allowedResumeFormats.join(", ").toUpperCase()
          : d.allowedResumeFormats || "PDF, DOC, DOCX",
        candidateAckEnabled: d.candidateAckEnabled ?? d.candidateAcknowledgementEnabled ?? true,
        adminNotificationEnabled: d.adminNotificationEnabled ?? true,
        resumeAttachmentEnabled: d.resumeAttachmentEnabled ?? true,
        maxResumeSizeMB: d.maxResumeSizeMB ?? d.maxResumeSizeMb ?? 10,
        applicationIdPrefix: d.applicationIdPrefix || "SWY-JOB-APP-",
      });
      setSettingsSaveSuccess(true);
      setSettingsSaveError(null);
      toast.success("Recruitment settings saved successfully.");
      setTimeout(() => setSettingsSaveSuccess(false), 5000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || "Failed to save recruitment settings. Please check fields and retry.";
      setSettingsSaveError(msg);
      setSettingsSaveSuccess(false);
      toast.error(msg);
    },
  });

  // Clearance mutation
  const updateClearanceMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      hrApi.updateClearanceStatus(id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_clearances"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to update clearance");
    },
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (updateSettingsMutation.isPending) return;
    setSettingsSaveError(null);

    const payload: any = {
      recruitmentEmail: settingsForm.recruitmentEmail?.trim(),
      recruitmentDisplayName: (settingsForm.recruitmentDisplayName || settingsForm.hrDisplayName)?.trim(),
      replyToEmail: settingsForm.replyToEmail?.trim(),
      ccEmails: typeof settingsForm.ccEmails === "string"
        ? settingsForm.ccEmails.split(",").map((s: string) => s.trim()).filter(Boolean)
        : settingsForm.ccEmails,
      candidateAckEnabled: settingsForm.candidateAckEnabled ?? true,
      adminNotificationEnabled: settingsForm.adminNotificationEnabled ?? true,
      resumeAttachmentEnabled: settingsForm.resumeAttachmentEnabled ?? true,
      maxResumeSizeMB: Number(settingsForm.maxResumeSizeMB || 10),
      allowedResumeFormats: typeof settingsForm.allowedResumeFormats === "string"
        ? settingsForm.allowedResumeFormats.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean)
        : settingsForm.allowedResumeFormats || ["pdf", "doc", "docx"],
      applicationIdPrefix: settingsForm.applicationIdPrefix?.trim() || "SWY-JOB-APP-",
      heroTitle: settingsForm.heroTitle?.trim(),
      heroSubtitle: settingsForm.heroSubtitle?.trim(),
    };

    updateSettingsMutation.mutate(payload);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">HR & Recruitment</h1>
          <p className="text-[#64748B]">
            Manage job vacancies, applicant tracking, clearance onboarding, and recruitment policies
          </p>
        </div>

        {activeTab === "vacancies" && (
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-[#4A7B5B] text-white rounded-lg hover:bg-[#3d664c] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="font-semibold text-sm">Post Vacancy</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#E2E8F0] overflow-x-auto">
        <button
          onClick={() => setActiveTab("vacancies")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "vacancies"
              ? "border-[#4A7B5B] text-[#4A7B5B]"
              : "border-transparent text-[#64748B] hover:text-[#1E293B] hover:border-[#CBD5E1]"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Job Vacancies
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 font-medium">
            {vacancies.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("applications")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "applications"
              ? "border-[#4A7B5B] text-[#4A7B5B]"
              : "border-transparent text-[#64748B] hover:text-[#1E293B] hover:border-[#CBD5E1]"
          }`}
        >
          <FileText className="w-4 h-4" />
          Applications
        </button>
        <button
          onClick={() => setActiveTab("onboarding")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "onboarding"
              ? "border-[#4A7B5B] text-[#4A7B5B]"
              : "border-transparent text-[#64748B] hover:text-[#1E293B] hover:border-[#CBD5E1]"
          }`}
        >
          <Users className="w-4 h-4" />
          Clearance & Onboarding
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "settings"
              ? "border-[#4A7B5B] text-[#4A7B5B]"
              : "border-transparent text-[#64748B] hover:text-[#1E293B] hover:border-[#CBD5E1]"
          }`}
        >
          <Settings className="w-4 h-4" />
          Recruitment Settings
        </button>
      </div>

      {/* Tab 1: Job Vacancies */}
      {activeTab === "vacancies" && (
        <div className="space-y-4">
          {/* Vacancies Filter Toolbar */}
          <div className="p-4 bg-white rounded-xl border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={vacancySearch}
                onChange={(e) => setVacancySearch(e.target.value)}
                placeholder="Search vacancies by title, code, department..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={vacancyStatusFilter}
                onChange={(e) => setVacancyStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="PAUSED">Paused</option>
                <option value="CLOSED">Closed</option>
                <option value="ARCHIVED">Archived</option>
              </select>

              <select
                value={vacancyDeptFilter}
                onChange={(e) => setVacancyDeptFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingVacancies ? (
            <div className="flex justify-center p-16">
              <div className="w-8 h-8 border-4 border-[#4A7B5B] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredVacancies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVacancies.map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-[#1E293B] text-base line-clamp-1" title={v.title}>
                          {v.title}
                        </h3>
                        <p className="text-xs text-[#64748B] font-medium mt-0.5">{v.vacancyCode}</p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full shrink-0 ${
                          v.status === "PUBLISHED"
                            ? "bg-green-100 text-green-700"
                            : v.status === "DRAFT"
                            ? "bg-gray-100 text-gray-700"
                            : v.status === "PAUSED"
                            ? "bg-yellow-100 text-yellow-700"
                            : v.status === "CLOSED"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {labelFmt(v.status)}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4 text-xs text-[#475569]">
                      <div className="flex items-center">
                        <Briefcase className="w-3.5 h-3.5 mr-2 text-[#94A3B8]" />
                        <span>
                          {v.department} • {labelFmt(v.employmentType)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-2 text-[#94A3B8]" />
                        <span>
                          {labelFmt(v.workMode)} {v.location ? `• ${v.location}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-3.5 h-3.5 mr-2 text-[#94A3B8]" />
                        <span>
                          {v.numberOfPositions} Opening{v.numberOfPositions > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FileText className="w-3.5 h-3.5 mr-2 text-[#94A3B8]" />
                        <span className="font-semibold text-gray-700">
                          {v._count?.applications || 0} Application{v._count?.applications !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {v.applicationDeadline && (
                        <div className="flex items-center text-amber-700">
                          <Clock className="w-3.5 h-3.5 mr-2 text-amber-500" />
                          <span>Deadline: {new Date(v.applicationDeadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-1.5 pt-4 border-t border-[#E2E8F0] overflow-x-auto">
                    <button
                      onClick={() => handleEdit(v)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#4A7B5B] hover:bg-[#E8F3EC] rounded-lg transition-colors flex items-center gap-1"
                      title="Edit Vacancy"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => duplicateMutation.mutate(v.id)}
                      disabled={duplicateMutation.isPending}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                      title="Duplicate Vacancy"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicate</span>
                    </button>

                    {v.status === "DRAFT" && (
                      <button
                        onClick={() => statusMutation.mutate({ id: v.id, action: "publish" })}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 ml-auto"
                        title="Publish to Careers page"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                    )}

                    {v.status === "PUBLISHED" && (
                      <>
                        <button
                          onClick={() => statusMutation.mutate({ id: v.id, action: "pause" })}
                          className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Pause Vacancy"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => statusMutation.mutate({ id: v.id, action: "close" })}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Close Vacancy"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {v.status === "PAUSED" && (
                      <button
                        onClick={() => statusMutation.mutate({ id: v.id, action: "resume" })}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 ml-auto"
                        title="Resume (Reopen) Vacancy"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </button>
                    )}

                    {v.status === "CLOSED" && (
                      <button
                        onClick={() => statusMutation.mutate({ id: v.id, action: "resume" })}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1"
                        title="Reopen Vacancy"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen</span>
                      </button>
                    )}

                    {["DRAFT", "CLOSED"].includes(v.status) && (
                      <button
                        onClick={() => statusMutation.mutate({ id: v.id, action: "archive" })}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
                        title="Archive Vacancy"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#E8F3EC] flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-[#4A7B5B]" />
              </div>
              <h3 className="text-lg font-bold text-[#1E293B] mb-2">No vacancies match your criteria</h3>
              <p className="text-[#64748B] max-w-sm mx-auto mb-4 text-sm">
                Create a new job vacancy or adjust your search filters to view positions.
              </p>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-[#4A7B5B] text-white rounded-lg text-sm font-semibold hover:bg-[#3d664c] transition-colors"
              >
                Post New Vacancy
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Applications */}
      {activeTab === "applications" && (
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
          <ApplicationsList />
        </div>
      )}

      {/* Tab 3: Clearance & Onboarding */}
      {activeTab === "onboarding" && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Onboarding & Clearance Pipeline</h2>
              <p className="text-xs text-gray-500">
                Track HR verification, document clearance, and final employment authorization
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-[#E8F3EC] text-[#4A7B5B] rounded-full">
              {clearances.length} Active Records
            </span>
          </div>

          {isLoadingClearances ? (
            <div className="flex justify-center p-16">
              <div className="w-8 h-8 border-4 border-[#4A7B5B] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : clearances.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                    <th className="px-4 py-3.5">Candidate</th>
                    <th className="px-4 py-3.5">Application ID</th>
                    <th className="px-4 py-3.5">Job Role</th>
                    <th className="px-4 py-3.5">Vacancy ID</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Recruiter</th>
                    <th className="px-4 py-3.5">Applied Date</th>
                    <th className="px-4 py-3.5">HR Clearance</th>
                    <th className="px-4 py-3.5">Final Clearance</th>
                    <th className="px-4 py-3.5">Onboarding</th>
                    <th className="px-4 py-3.5">Joining Date</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clearances.map((c) => {
                    const appId =
                      c.applicationId ||
                      (c as any).application?.id ||
                      (c as any).offer?.application?.id;
                    const candName =
                      c.candidateName ||
                      `${c.application?.firstName || ""} ${c.application?.lastName || ""}`.trim() ||
                      "Candidate";
                    const appNumber =
                      c.applicationNumber ||
                      c.application?.applicationId ||
                      "Not assigned";
                    const roleTitle =
                      c.jobRole ||
                      c.application?.vacancy?.title ||
                      c.offer?.designation ||
                      "Not assigned";
                    const vacCode =
                      c.vacancyId ||
                      c.application?.vacancy?.vacancyCode ||
                      "Not assigned";
                    const deptName =
                      c.department ||
                      c.application?.vacancy?.department ||
                      c.offer?.department ||
                      "Not assigned";
                    const recName =
                      c.recruiterName ||
                      c.application?.recruiter?.fullName ||
                      "Not assigned";
                    const email =
                      c.candidateEmail ||
                      c.application?.email ||
                      "Not assigned";
                    const mobile =
                      c.candidateMobile ||
                      c.application?.mobile ||
                      "Not assigned";
                    const isFinalCleared =
                      c.finalClearanceStatus === "APPROVED" ||
                      c.status === "COMPLETED" ||
                      c.status === "FINAL_CLEARED" ||
                      Boolean(c.finalClearedAt);
                    const onbStatus =
                      c.onboardingStatus ||
                      (c.application?.onboarding?.status) ||
                      "NOT_STARTED";

                    return (
                      <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-gray-900 text-sm">{candName}</div>
                          <div className="text-[11px] text-gray-500">{email}</div>
                          {mobile !== "Not assigned" && (
                            <div className="text-[10px] text-gray-400">{mobile}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {appNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-gray-900 text-xs">{roleTitle}</div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-gray-600">
                          {vacCode}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-gray-700 font-medium">
                          {deptName}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-gray-600">
                          {recName}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-gray-500 text-[11px]">
                          {formatDate(c.appliedDate)}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              c.hrClearanceStatus === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : c.hrClearanceStatus === "FAILED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {c.hrClearanceStatus || "PENDING"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              isFinalCleared
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : c.finalClearanceStatus === "FAILED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {isFinalCleared ? "APPROVED" : c.finalClearanceStatus || "PENDING"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              onbStatus === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800"
                                : onbStatus === "IN_PROGRESS"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {labelFmt(onbStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-gray-700 text-[11px]">
                          {formatDate(c.joiningDate)}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                if (appId) {
                                  setSelectedDrawerTab("workflow");
                                  setSelectedAppId(appId);
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                              title="Open candidate clearance & onboarding review"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Review</span>
                            </button>
                            {isFinalCleared ? (
                              <button
                                onClick={() => {
                                  if (appId) {
                                    setSelectedDrawerTab("workflow");
                                    setSelectedAppId(appId);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-semibold bg-[#4A7B5B] text-white hover:bg-[#3D664A] rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                title="Start or manage onboarding workflow"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>{onbStatus === "IN_PROGRESS" || onbStatus === "COMPLETED" ? "Onboarding" : "Start Onboarding"}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (appId) {
                                    setSelectedDrawerTab("workflow");
                                    setSelectedAppId(appId);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1"
                                title="Review clearance items to complete and approve"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Clearance</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#E8F3EC] flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[#4A7B5B]" />
              </div>
              <h3 className="text-lg font-bold text-[#1E293B] mb-2">No candidates in onboarding</h3>
              <p className="text-[#64748B] max-w-sm mx-auto text-sm">
                Candidates who are selected and accept employment will appear here for document verification and HR clearance.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Recruitment Settings */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Status feedback */}
          {settingsSaveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Recruitment settings saved successfully and synchronized across the Careers portal.</span>
            </div>
          )}

          {/* Careers Banner Banner Link Card */}
          <div className="bg-gradient-to-r from-emerald-800 to-[#2e513a] text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-lg">Careers Hero Banner (Slot: CAREERS_PAGE_TOP)</h3>
              </div>
              <p className="text-emerald-100 text-xs sm:text-sm max-w-xl">
                Configure 1600 × 450 px hero slides for the public Careers page with image upload, custom URLs, auto-sliding rotation, and CTA buttons.
              </p>
            </div>
            <a
              href="/admin/banners"
              className="px-4 py-2 bg-white text-[#2e513a] font-semibold text-xs sm:text-sm rounded-xl hover:bg-emerald-50 transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
            >
              <span>Manage Careers Banners</span>
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </a>
          </div>

          {/* Section 1: Email Configuration */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Mail className="w-5 h-5 text-[#4A7B5B]" />
              <div>
                <h3 className="font-bold text-gray-900">Recruitment & Contact Email</h3>
                <p className="text-xs text-gray-500">
                  Controls the authoritative contact email displayed publicly on job details ("Send Resume To") and notifications
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Primary Recruitment Email *
                </label>
                <input
                  type="email"
                  required
                  value={settingsForm.recruitmentEmail || ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, recruitmentEmail: e.target.value })}
                  placeholder="e.g. careers@swayamadmission.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  HR Display Name
                </label>
                <input
                  type="text"
                  value={settingsForm.recruitmentDisplayName ?? settingsForm.hrDisplayName ?? ""}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      recruitmentDisplayName: e.target.value,
                      hrDisplayName: e.target.value,
                    })
                  }
                  placeholder="e.g. Swayam Admission Recruitment Team"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reply-To Email</label>
                <input
                  type="email"
                  value={settingsForm.replyToEmail || ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, replyToEmail: e.target.value })}
                  placeholder="e.g. hr@swayamadmission.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notification CC Email(s)</label>
                <input
                  type="text"
                  value={settingsForm.ccEmails ?? settingsForm.ccEmail ?? ""}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      ccEmails: e.target.value,
                      ccEmail: e.target.value,
                    })
                  }
                  placeholder="e.g. hr-notifications@swayamadmission.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Notifications & Acknowledgement Policies */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <ShieldCheck className="w-5 h-5 text-[#4A7B5B]" />
              <div>
                <h3 className="font-bold text-gray-900">Notification & Application Policies</h3>
                <p className="text-xs text-gray-500">
                  Control automatic candidate receipts, internal alerts, and upload restrictions
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.candidateAckEnabled ?? settingsForm.candidateAcknowledgementEnabled ?? true}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      candidateAckEnabled: e.target.checked,
                      candidateAcknowledgementEnabled: e.target.checked,
                    })
                  }
                  className="mt-0.5 rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                />
                <div>
                  <span className="block text-xs font-semibold text-gray-900">Candidate Acknowledgement</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    Send instant confirmation email with application ID to applicants
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.adminNotificationEnabled ?? true}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, adminNotificationEnabled: e.target.checked })
                  }
                  className="mt-0.5 rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                />
                <div>
                  <span className="block text-xs font-semibold text-gray-900">Admin Notification</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    Notify recruitment email whenever a new candidate applies
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.resumeAttachmentEnabled ?? true}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, resumeAttachmentEnabled: e.target.checked })
                  }
                  className="mt-0.5 rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                />
                <div>
                  <span className="block text-xs font-semibold text-gray-900">Resume Uploads Allowed</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    Allow candidates to attach PDF, DOC, or DOCX resumes
                  </span>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Max Resume Size (MB)</label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={settingsForm.maxResumeSizeMB ?? settingsForm.maxResumeSizeMb ?? 10}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      maxResumeSizeMB: parseInt(e.target.value) || 10,
                      maxResumeSizeMb: parseInt(e.target.value) || 10,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Application ID Prefix</label>
                <input
                  type="text"
                  value={settingsForm.applicationIdPrefix || "SWY-JOB-APP-"}
                  onChange={(e) => setSettingsForm({ ...settingsForm, applicationIdPrefix: e.target.value })}
                  placeholder="e.g. SWY-JOB-APP-"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Allowed File Formats</label>
                <input
                  type="text"
                  value={settingsForm.allowedResumeFormats ?? settingsForm.allowedFileFormats ?? "PDF, DOC, DOCX"}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      allowedResumeFormats: e.target.value,
                      allowedFileFormats: e.target.value,
                    })
                  }
                  placeholder="e.g. PDF, DOC, DOCX"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Careers Page Hero Copy */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Sparkles className="w-5 h-5 text-[#4A7B5B]" />
              <div>
                <h3 className="font-bold text-gray-900">Careers Page Hero Copy</h3>
                <p className="text-xs text-gray-500">
                  Customizes the fallback hero message on the public /careers portal
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Hero Title</label>
                <input
                  type="text"
                  value={settingsForm.heroTitle || ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroTitle: e.target.value })}
                  placeholder="e.g. Join Swayam Admission"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Hero Subtitle</label>
                <textarea
                  rows={2}
                  value={settingsForm.heroSubtitle || ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })}
                  placeholder="e.g. Discover opportunities to build a rewarding career with us and help shape the future of education."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                />
              </div>
            </div>
          </div>

          {/* Save Button Strip with Immediate Status Feedback */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
            <div>
              {settingsSaveSuccess && (
                <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-4 py-2.5 rounded-xl text-sm font-semibold border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Recruitment settings saved successfully.</span>
                </div>
              )}
              {settingsSaveError && (
                <div className="flex items-center gap-2 text-rose-800 bg-rose-50 px-4 py-2.5 rounded-xl text-sm font-semibold border border-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{settingsSaveError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="px-6 py-2.5 bg-[#4A7B5B] hover:bg-[#3d664c] text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed shrink-0"
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : settingsSaveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Settings Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Recruitment Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Vacancy Form Modal */}
      <VacancyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        vacancy={selectedVacancy}
      />

      {/* Candidate Onboarding & Application Review Drawer */}
      {selectedAppId && (
        <ApplicationDetailDrawer
          applicationId={selectedAppId}
          onClose={() => {
            setSelectedAppId(null);
            setSelectedDrawerTab("overview");
            queryClient.invalidateQueries({ queryKey: ["admin_clearances"] });
          }}
          initialTab={selectedDrawerTab}
        />
      )}
    </div>
  );
}
