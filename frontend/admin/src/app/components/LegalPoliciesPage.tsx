import { useState } from "react";
import {
  FileText,
  Plus,
  Edit,
  Eye,
  History,
  CheckCircle,
  Archive,
  RotateCcw,
  Shield,
  Layers,
  Search,
  RefreshCw,
  Cookie,
  AlertCircle,
  X,
  ExternalLink,
  MessageSquare,
  UserCheck,
  Calendar,
  Lock,
  Globe,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LegalApi,
  LegalPolicy,
  ConsentConfiguration,
  PolicyAcceptanceRecord,
  GrievanceItem,
  CookieItem,
} from "../../api/legal.api";

const POLICY_TYPES_LIST = [
  { value: "TERMS_AND_CONDITIONS", label: "1. Terms & Conditions" },
  { value: "PRIVACY_POLICY", label: "2. Privacy Policy" },
  { value: "REFUND_CANCELLATION", label: "3. Refund & Cancellation Policy" },
  { value: "ADMISSION_COUNSELLING_DISCLAIMER", label: "4. Admission & Counselling Disclaimer" },
  { value: "STUDENT_APPLICATION_TERMS", label: "5. Student Application Terms" },
  { value: "DATA_DOCUMENT_PROCESSING_CONSENT", label: "6. Data & Document Processing Consent" },
  { value: "PAYMENT_TERMS", label: "7. Payment Terms" },
  { value: "COOKIE_POLICY", label: "8. Cookie Policy" },
  { value: "AI_COUNSELOR_TERMS", label: "9. AI Counselor Terms & Disclaimer" },
  { value: "REFERRAL_REWARDS_TERMS", label: "10. Referral & Rewards Terms" },
  { value: "STUDY_MATERIAL_TERMS", label: "11. Study Material Terms" },
  { value: "COLLEGE_PARTNER_TERMS", label: "12. College Partner Terms" },
  { value: "INTELLECTUAL_PROPERTY", label: "13. Intellectual Property / Copyright Policy" },
  { value: "GRIEVANCE_REDRESSAL_POLICY", label: "14. Grievance Redressal Policy" },
  { value: "CONTACT_LEGAL_INFO", label: "15. Contact & Legal Information" },
  { value: "DOCUMENT_DELETION_TERMS", label: "16. Document Deletion Request & Data Removal Terms" },
];

const ACTION_TYPES_LIST = [
  { action: "REGISTRATION", label: "Student Registration", desc: "Before student account creation" },
  { action: "APPLICATION_SUBMISSION", label: "Application Submission", desc: "Before final application submit" },
  { action: "DOCUMENT_UPLOAD", label: "Document Upload", desc: "Before uploading KYC/Academic files" },
  { action: "DOCUMENT_DELETION_REQUEST", label: "Document Deletion Request", desc: "Before submitting data deletion request" },
  { action: "PAYMENT", label: "Application Fee Payment", desc: "Before payment gateway or waiver confirmation" },
  { action: "STUDY_MATERIAL_PURCHASE", label: "Study Material Purchase", desc: "Before purchasing premium materials" },
  { action: "AI_COUNSELOR", label: "AI Counselor First Use", desc: "Upon initial interaction with AI Counselor" },
  { action: "REFERRAL", label: "Student Referral Enrolment", desc: "Upon accessing referral system & rewards" },
  { action: "COLLEGE_PARTNER_ACTION", label: "College Partner Portal", desc: "For partner actions and agreements" },
  { action: "GRIEVANCE_DATA_REQUEST", label: "Grievance / Legal Request", desc: "Before submitting formal complaint" },
];

function formatDateDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTimeDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

export default function LegalPoliciesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"policies" | "config" | "records" | "grievances" | "cookies">("policies");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals state
  const [editingPolicy, setEditingPolicy] = useState<LegalPolicy | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [viewingPolicy, setViewingPolicy] = useState<LegalPolicy | null>(null);
  const [historyPolicy, setHistoryPolicy] = useState<LegalPolicy | null>(null);
  const [selectedGrievance, setSelectedGrievance] = useState<GrievanceItem | null>(null);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [editingCookie, setEditingCookie] = useState<CookieItem | null>(null);

  // Queries
  const { data: policies = [], isLoading: isLoadingPolicies, refetch: refetchPolicies } = useQuery({
    queryKey: ["admin_legal_policies", statusFilter, search],
    queryFn: () => LegalApi.getPolicies({ status: statusFilter !== "ALL" ? statusFilter : undefined, search }),
  });

  const { data: consentConfigs = [], isLoading: isLoadingConfigs, refetch: refetchConfigs } = useQuery({
    queryKey: ["admin_consent_configs"],
    queryFn: () => LegalApi.getConsentConfigs(),
    enabled: activeTab === "config",
  });

  const { data: consentRecordsData, isLoading: isLoadingRecords } = useQuery({
    queryKey: ["admin_consent_records"],
    queryFn: () => LegalApi.getConsentRecords({ limit: 100 }),
    enabled: activeTab === "records",
  });

  const { data: grievances = [], isLoading: isLoadingGrievances, refetch: refetchGrievances } = useQuery({
    queryKey: ["admin_grievances"],
    queryFn: () => LegalApi.getGrievances(),
    enabled: activeTab === "grievances",
  });

  const { data: cookies = [], isLoading: isLoadingCookies, refetch: refetchCookies } = useQuery({
    queryKey: ["admin_cookies"],
    queryFn: () => LegalApi.getCookies(),
    enabled: activeTab === "cookies",
  });

  const { data: versionHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["admin_policy_history", historyPolicy?.id],
    queryFn: () => (historyPolicy ? LegalApi.getPolicyVersions(historyPolicy.id) : []),
    enabled: !!historyPolicy,
  });

  // Mutations
  const publishMutation = useMutation({
    mutationFn: (id: string) => LegalApi.publishPolicy(id),
    onSuccess: (data) => {
      toast.success(`Published ${data?.title} (${data?.version}) successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin_legal_policies"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to publish policy"),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => LegalApi.unpublishPolicy(id),
    onSuccess: (data) => {
      toast.success(`Unpublished ${data?.title} (reverted to DRAFT)`);
      queryClient.invalidateQueries({ queryKey: ["admin_legal_policies"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to unpublish policy"),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => LegalApi.archivePolicy(id),
    onSuccess: (data) => {
      toast.success(`Archived ${data?.title}`);
      queryClient.invalidateQueries({ queryKey: ["admin_legal_policies"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to archive policy"),
  });

  const updateConfigMutation = useMutation({
    mutationFn: (payload: { actionType: string; policyTypes: string[]; isMandatory?: boolean; description?: string }) =>
      LegalApi.updateConsentConfig(payload),
    onSuccess: () => {
      toast.success("Consent configuration updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin_consent_configs"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update consent configuration"),
  });

  const updateGrievanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => LegalApi.updateGrievance(id, data),
    onSuccess: () => {
      toast.success("Grievance updated successfully");
      setSelectedGrievance(null);
      queryClient.invalidateQueries({ queryKey: ["admin_grievances"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update grievance"),
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 lg:p-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4A7B5B]">
            <Shield className="h-4 w-4" /> Legal & Governance
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Legal & Policies Management</h1>
          <p className="text-sm text-[#64748B]">
            Authoritative policy versioning, action-based consent matrix, grievances, and cookie compliance for Swayam Admission.
          </p>
        </div>

        {activeTab === "policies" && (
          <button
            onClick={() => {
              setEditingPolicy(null);
              setIsEditorOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4A7B5B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d654a]"
          >
            <Plus className="h-4 w-4" /> Create Policy Draft
          </button>
        )}

        {activeTab === "cookies" && (
          <button
            onClick={() => {
              setEditingCookie(null);
              setIsCookieModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4A7B5B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d654a]"
          >
            <Plus className="h-4 w-4" /> Add Cookie Declaration
          </button>
        )}
      </div>

      {/* Main Tab Navigation */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-[#E2E8F0] pb-2">
        <button
          onClick={() => setActiveTab("policies")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "policies"
              ? "bg-[#4A7B5B] text-white shadow-sm"
              : "bg-white text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          }`}
        >
          <FileText className="h-4 w-4" /> Policies & Versioning
        </button>

        <button
          onClick={() => setActiveTab("config")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "config"
              ? "bg-[#4A7B5B] text-white shadow-sm"
              : "bg-white text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          }`}
        >
          <Layers className="h-4 w-4" /> Action-Based Consent Config
        </button>

        <button
          onClick={() => setActiveTab("records")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "records"
              ? "bg-[#4A7B5B] text-white shadow-sm"
              : "bg-white text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          }`}
        >
          <Shield className="h-4 w-4" /> Consent Audit Records
        </button>

        <button
          onClick={() => setActiveTab("grievances")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "grievances"
              ? "bg-[#4A7B5B] text-white shadow-sm"
              : "bg-white text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          }`}
        >
          <MessageSquare className="h-4 w-4" /> Grievance Redressal
        </button>

        <button
          onClick={() => setActiveTab("cookies")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "cookies"
              ? "bg-[#4A7B5B] text-white shadow-sm"
              : "bg-white text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          }`}
        >
          <Cookie className="h-4 w-4" /> Cookie Declarations
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: POLICIES & VERSIONING                               */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "policies" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search policy titles, slugs or types..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-4 text-sm text-[#1E293B] outline-none transition focus:border-[#4A7B5B] focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#64748B]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium text-[#1E293B] outline-none transition focus:border-[#4A7B5B]"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>

              <button
                onClick={() => refetchPolicies()}
                className="rounded-xl border border-[#E2E8F0] bg-white p-2 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#1E293B]"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            {isLoadingPolicies ? (
              <div className="py-20 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#4A7B5B] border-t-transparent" />
                <p className="text-sm text-[#64748B]">Loading legal policies...</p>
              </div>
            ) : policies.length === 0 ? (
              <div className="py-20 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-[#CBD5E1]" />
                <h3 className="text-base font-semibold text-[#1E293B]">No policies found</h3>
                <p className="text-sm text-[#64748B]">Create your first policy draft or adjust filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#1E293B]">
                  <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold uppercase text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3.5">Policy Document</th>
                      <th className="px-4 py-3.5">Version</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Effective Date</th>
                      <th className="px-4 py-3.5">Published Date</th>
                      <th className="px-4 py-3.5">Updated By</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {policies.map((p) => {
                      const isPublished = p.status === "PUBLISHED";
                      const isDraft = p.status === "DRAFT";
                      const isArchived = p.status === "ARCHIVED";

                      return (
                        <tr key={p.id} className="transition hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-[#1E293B]">{p.title}</div>
                            <div className="text-xs text-[#64748B]">
                              <span className="font-mono text-[11px] text-[#4A7B5B]">{p.policyType}</span> • /{p.slug}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="rounded-md bg-[#F1F5F9] px-2 py-1 font-mono text-xs font-semibold text-[#334155]">
                              {p.version}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                isPublished
                                  ? "bg-[#E8F3EC] text-[#4A7B5B]"
                                  : isDraft
                                  ? "bg-[#FEF3C7] text-[#D97706]"
                                  : "bg-[#F1F5F9] text-[#64748B]"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isPublished ? "bg-[#4A7B5B]" : isDraft ? "bg-[#D97706]" : "bg-[#94A3B8]"
                                }`}
                              />
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-[#64748B]">
                            {formatDateDDMMYYYY(p.effectiveDate)}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-[#64748B]">
                            {formatDateDDMMYYYY(p.publishedAt)}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-[#64748B]">
                            {p.updatedBy || "System"}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Preview / View */}
                              <button
                                onClick={() => setViewingPolicy(p)}
                                className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#4A7B5B]"
                                title="View Content"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {/* Version History */}
                              <button
                                onClick={() => setHistoryPolicy(p)}
                                className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#4A7B5B]"
                                title="Version History"
                              >
                                <History className="h-4 w-4" />
                              </button>

                              {/* Edit Draft or Create New Version */}
                              <button
                                onClick={() => {
                                  setEditingPolicy(p);
                                  setIsEditorOpen(true);
                                }}
                                className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#4A7B5B]"
                                title={isPublished ? "Edit as New Version" : "Edit Draft"}
                              >
                                <Edit className="h-4 w-4" />
                              </button>

                              {/* Publish / Unpublish / Archive */}
                              {isDraft && (
                                <button
                                  onClick={() => publishMutation.mutate(p.id)}
                                  disabled={publishMutation.isPending}
                                  className="rounded-lg p-1.5 text-[#4A7B5B] transition hover:bg-[#E8F3EC]"
                                  title="Publish Policy"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}

                              {isPublished && (
                                <>
                                  <button
                                    onClick={() => unpublishMutation.mutate(p.id)}
                                    disabled={unpublishMutation.isPending}
                                    className="rounded-lg p-1.5 text-[#D97706] transition hover:bg-[#FEF3C7]"
                                    title="Unpublish (Revert to Draft)"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => archiveMutation.mutate(p.id)}
                                    disabled={archiveMutation.isPending}
                                    className="rounded-lg p-1.5 text-[#EF4444] transition hover:bg-[#FEE2E2]"
                                    title="Archive Policy"
                                  >
                                    <Archive className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: ACTION-BASED CONSENT CONFIGURATION MATRIX           */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "config" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#1E293B]">Action-Based Consent Matrix</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Configure exactly which published policy documents students and users must accept before executing protected actions.
              Backend authoritatively enforces that missing mandatory consents block execution.
            </p>

            {isLoadingConfigs ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#4A7B5B] border-t-transparent" />
                <p className="text-sm text-[#64748B]">Loading consent configuration matrix...</p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {ACTION_TYPES_LIST.map((actionMeta) => {
                  const currentCfg = consentConfigs.find((c) => c.actionType === actionMeta.action);
                  const selectedTypes = currentCfg?.policyTypes || [];
                  const isMandatory = currentCfg?.isMandatory ?? true;

                  return (
                    <ActionConfigCard
                      key={actionMeta.action}
                      actionMeta={actionMeta}
                      currentCfg={currentCfg}
                      allPolicyTypes={POLICY_TYPES_LIST}
                      publishedPolicies={policies}
                      onSave={(newTypes, mandatory, desc) => {
                        updateConfigMutation.mutate({
                          actionType: actionMeta.action,
                          policyTypes: newTypes,
                          isMandatory: mandatory,
                          description: desc,
                        });
                      }}
                      isPending={updateConfigMutation.isPending}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: CONSENT AUDIT RECORDS                               */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "records" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
              <h3 className="font-bold text-[#1E293B]">Immutable User Consent Log</h3>
              <p className="text-xs text-[#64748B]">
                Tamper-evident record of exact policy versions accepted by users at each protected action checkpoint.
              </p>
            </div>

            {isLoadingRecords ? (
              <div className="py-20 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#4A7B5B] border-t-transparent" />
                <p className="text-sm text-[#64748B]">Loading consent audit trail...</p>
              </div>
            ) : !consentRecordsData?.records?.length ? (
              <div className="py-16 text-center">
                <Shield className="mx-auto mb-3 h-10 w-10 text-[#CBD5E1]" />
                <h3 className="text-base font-semibold text-[#1E293B]">No consent records logged yet</h3>
                <p className="text-sm text-[#64748B]">Consent records will appear as students register, apply, and transact.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#1E293B]">
                  <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold uppercase text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3.5">Student / User</th>
                      <th className="px-4 py-3.5">Action Context</th>
                      <th className="px-4 py-3.5">Policy & Version</th>
                      <th className="px-4 py-3.5">Related Entity</th>
                      <th className="px-4 py-3.5">IP Address</th>
                      <th className="px-4 py-3.5">Accepted Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {consentRecordsData.records.map((r: PolicyAcceptanceRecord) => (
                      <tr key={r.id} className="transition hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-[#1E293B]">{r.user?.fullName || "Student"}</div>
                          <div className="text-xs text-[#64748B]">
                            {r.user?.email || r.user?.mobile || `ID: ${r.userId.slice(-6)}`}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-md bg-[#E8F3EC] px-2 py-1 font-mono text-xs font-semibold text-[#4A7B5B]">
                            {r.actionContext}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-[#1E293B]">{r.policy?.title || r.policyType}</div>
                          <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#475569]">
                            {r.policyVersion}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#64748B]">
                          {r.applicationId && <span className="block font-mono">App: {r.applicationId.slice(-8)}</span>}
                          {r.paymentId && <span className="block font-mono">Pay: {r.paymentId.slice(-8)}</span>}
                          {r.documentId && <span className="block font-mono">Doc: {r.documentId.slice(-8)}</span>}
                          {!r.applicationId && !r.paymentId && !r.documentId && "-"}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono text-[#64748B]">
                          {r.ipAddress || "Internal"}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#64748B]">
                          {formatDateTimeDDMMYYYY(r.acceptedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 4: GRIEVANCE REDRESSAL                                 */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "grievances" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
              <h3 className="font-bold text-[#1E293B]">Grievance & Legal Complaints</h3>
              <p className="text-xs text-[#64748B]">
                Statutory student grievance handling mechanism. Assigned legal officers can review, respond, and log resolution.
              </p>
            </div>

            {isLoadingGrievances ? (
              <div className="py-20 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#4A7B5B] border-t-transparent" />
                <p className="text-sm text-[#64748B]">Loading grievances...</p>
              </div>
            ) : grievances.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle className="mx-auto mb-3 h-10 w-10 text-[#4A7B5B]" />
                <h3 className="text-base font-semibold text-[#1E293B]">No active grievances</h3>
                <p className="text-sm text-[#64748B]">All complaints are resolved or none have been submitted.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#1E293B]">
                  <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold uppercase text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3.5">Complaint ID</th>
                      <th className="px-4 py-3.5">User</th>
                      <th className="px-4 py-3.5">Category & Subject</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Assigned To</th>
                      <th className="px-4 py-3.5">Created Date</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {grievances.map((g) => (
                      <tr key={g.id} className="transition hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-bold text-[#4A7B5B]">{g.complaintId}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-[#1E293B]">{g.user?.fullName || "User"}</div>
                          <div className="text-xs text-[#64748B]">{g.user?.email || g.user?.mobile || "-"}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#475569]">
                            {g.category}
                          </span>
                          <div className="mt-1 font-medium text-[#1E293B]">{g.subject}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              g.status === "RESOLVED"
                                ? "bg-[#E8F3EC] text-[#4A7B5B]"
                                : g.status === "IN_PROGRESS"
                                ? "bg-[#EFF6FF] text-[#2563EB]"
                                : g.status === "REJECTED"
                                ? "bg-[#FEE2E2] text-[#DC2626]"
                                : "bg-[#FEF3C7] text-[#D97706]"
                            }`}
                          >
                            {g.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#64748B]">
                          {g.assignedTo?.fullName || "Unassigned"}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#64748B]">
                          {formatDateDDMMYYYY(g.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedGrievance(g)}
                            className="rounded-lg bg-[#E8F3EC] px-3 py-1.5 text-xs font-semibold text-[#4A7B5B] transition hover:bg-[#d5e7db]"
                          >
                            Review & Resolve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 5: COOKIE DECLARATIONS                                 */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "cookies" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
              <h3 className="font-bold text-[#1E293B]">Cookie Registry & Tracking Governance</h3>
              <p className="text-xs text-[#64748B]">
                Publicly declared cookies and categories powering the platform's Cookie Policy. Only non-invasive, strictly declared cookies are allowed.
              </p>
            </div>

            {isLoadingCookies ? (
              <div className="py-20 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#4A7B5B] border-t-transparent" />
                <p className="text-sm text-[#64748B]">Loading cookies...</p>
              </div>
            ) : cookies.length === 0 ? (
              <div className="py-16 text-center">
                <Cookie className="mx-auto mb-3 h-10 w-10 text-[#CBD5E1]" />
                <h3 className="text-base font-semibold text-[#1E293B]">No cookies registered</h3>
                <p className="text-sm text-[#64748B]">Add declared cookies to display in Cookie Policy.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#1E293B]">
                  <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold uppercase text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3.5">Cookie Name</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Purpose</th>
                      <th className="px-4 py-3.5">Provider</th>
                      <th className="px-4 py-3.5">Duration</th>
                      <th className="px-4 py-3.5">Active</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {cookies.map((c) => (
                      <tr key={c.id} className="transition hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-[#1E293B]">{c.name}</td>
                        <td className="px-4 py-3.5">
                          <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-xs font-semibold text-[#475569]">
                            {c.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#64748B]">{c.purpose}</td>
                        <td className="px-4 py-3.5 text-xs text-[#64748B]">{c.provider}</td>
                        <td className="px-4 py-3.5 text-xs text-[#64748B]">{c.duration}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              c.isActive ? "bg-[#E8F3EC] text-[#4A7B5B]" : "bg-[#F1F5F9] text-[#64748B]"
                            }`}
                          >
                            {c.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setEditingCookie(c);
                              setIsCookieModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#4A7B5B]"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 1: POLICY EDITOR / VERSION CREATOR                   */}
      {/* ────────────────────────────────────────────────────────── */}
      {isEditorOpen && (
        <PolicyEditorModal
          policy={editingPolicy}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingPolicy(null);
          }}
          onSaved={() => {
            setIsEditorOpen(false);
            setEditingPolicy(null);
            refetchPolicies();
          }}
        />
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 2: POLICY VIEW / PREVIEW                             */}
      {/* ────────────────────────────────────────────────────────── */}
      {viewingPolicy && (
        <PolicyPreviewModal
          policy={viewingPolicy}
          onClose={() => setViewingPolicy(null)}
        />
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 3: VERSION HISTORY DRAWER                            */}
      {/* ────────────────────────────────────────────────────────── */}
      {historyPolicy && (
        <VersionHistoryModal
          policy={historyPolicy}
          versions={versionHistory}
          isLoading={isLoadingHistory}
          onClose={() => setHistoryPolicy(null)}
          onSelectVersion={(selected) => setViewingPolicy(selected)}
        />
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 4: GRIEVANCE REVIEW DRAWER                           */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedGrievance && (
        <GrievanceReviewDrawer
          grievance={selectedGrievance}
          onClose={() => setSelectedGrievance(null)}
          onSubmit={(data) => {
            updateGrievanceMutation.mutate({ id: selectedGrievance.id, data });
          }}
          isPending={updateGrievanceMutation.isPending}
        />
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 5: COOKIE DECLARATION MODAL                          */}
      {/* ────────────────────────────────────────────────────────── */}
      {isCookieModalOpen && (
        <CookieModal
          cookie={editingCookie}
          onClose={() => {
            setIsCookieModalOpen(false);
            setEditingCookie(null);
          }}
          onSaved={() => {
            setIsCookieModalOpen(false);
            setEditingCookie(null);
            refetchCookies();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Action Consent Config Card
// ─────────────────────────────────────────────────────────────────────────────
function ActionConfigCard({
  actionMeta,
  currentCfg,
  allPolicyTypes,
  publishedPolicies,
  onSave,
  isPending,
}: {
  actionMeta: { action: string; label: string; desc: string };
  currentCfg?: ConsentConfiguration;
  allPolicyTypes: Array<{ value: string; label: string }>;
  publishedPolicies: LegalPolicy[];
  onSave: (policyTypes: string[], isMandatory: boolean, desc: string) => void;
  isPending: boolean;
}) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(currentCfg?.policyTypes || []);
  const [isMandatory, setIsMandatory] = useState<boolean>(currentCfg?.isMandatory ?? true);
  const [desc, setDesc] = useState<string>(currentCfg?.description || actionMeta.desc);
  const [isDirty, setIsDirty] = useState(false);

  const togglePolicyType = (typeVal: string) => {
    setSelectedTypes((prev) => {
      const exists = prev.includes(typeVal);
      const next = exists ? prev.filter((t) => t !== typeVal) : [...prev, typeVal];
      setIsDirty(true);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition hover:border-[#CBD5E1]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#4A7B5B]">{actionMeta.action}</span>
            <span className="font-semibold text-[#1E293B]">{actionMeta.label}</span>
          </div>
          <p className="text-xs text-[#64748B]">{actionMeta.desc}</p>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-[#1E293B]">
            <input
              type="checkbox"
              checked={isMandatory}
              onChange={(e) => {
                setIsMandatory(e.target.checked);
                setIsDirty(true);
              }}
              className="h-4 w-4 rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
            />
            Mandatory Block
          </label>

          <button
            onClick={() => {
              onSave(selectedTypes, isMandatory, desc);
              setIsDirty(false);
            }}
            disabled={isPending || (!isDirty && !!currentCfg)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              isDirty || !currentCfg
                ? "bg-[#4A7B5B] text-white hover:bg-[#3d654a]"
                : "bg-[#E2E8F0] text-[#94A3B8]"
            }`}
          >
            {isPending ? "Saving..." : "Save Config"}
          </button>
        </div>
      </div>

      {/* Checkboxes of Applicable Policies */}
      <div className="mt-3 grid grid-cols-1 gap-2 border-t border-[#E2E8F0] pt-3 sm:grid-cols-2 md:grid-cols-3">
        {allPolicyTypes.map((pt) => {
          const isChecked = selectedTypes.includes(pt.value);
          const publishedMatch = publishedPolicies.find((p) => p.policyType === pt.value && p.status === "PUBLISHED");

          return (
            <label
              key={pt.value}
              className={`flex items-start gap-2 rounded-lg border p-2 text-xs transition cursor-pointer ${
                isChecked
                  ? "border-[#4A7B5B] bg-[#E8F3EC]/50 text-[#1E293B]"
                  : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1]"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => togglePolicyType(pt.value)}
                className="mt-0.5 h-3.5 w-3.5 rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
              />
              <div className="flex-1">
                <span className="font-medium text-[#1E293B]">{pt.label}</span>
                {publishedMatch ? (
                  <span className="block text-[10px] text-[#4A7B5B]">
                    Active: {publishedMatch.version} ({publishedMatch.title})
                  </span>
                ) : (
                  <span className="block text-[10px] text-[#D97706]">⚠️ No published version</span>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Policy Editor Modal
// ─────────────────────────────────────────────────────────────────────────────
function PolicyEditorModal({
  policy,
  onClose,
  onSaved,
}: {
  policy: LegalPolicy | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditingPublished = policy?.status === "PUBLISHED";
  const [policyType, setPolicyType] = useState(policy?.policyType || "TERMS_AND_CONDITIONS");
  const [title, setTitle] = useState(policy?.title || "Terms & Conditions");
  const [effectiveDate, setEffectiveDate] = useState(
    policy?.effectiveDate ? policy.effectiveDate.split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [changeSummary, setChangeSummary] = useState(
    policy ? (isEditingPublished ? "Superseded revision" : policy.changeSummary || "") : "Initial policy draft"
  );
  const [content, setContent] = useState(policy?.content || "");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (publishImmediately: boolean) => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and policy content are required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (policy && !isEditingPublished) {
        // Edit existing draft
        await LegalApi.updatePolicy(policy.id, {
          title,
          content,
          effectiveDate,
          changeSummary,
        });
        if (publishImmediately) {
          await LegalApi.publishPolicy(policy.id);
        }
        toast.success(publishImmediately ? "Policy updated and published!" : "Draft updated successfully");
      } else {
        // Create new policy or new version from published
        const created = await LegalApi.createPolicy({
          policyType,
          title,
          content,
          effectiveDate,
          changeSummary,
        });
        if (publishImmediately && created?.id) {
          await LegalApi.publishPolicy(created.id);
        }
        toast.success(
          isEditingPublished
            ? "New policy version created and archived previous version!"
            : publishImmediately
            ? "Policy created and published successfully!"
            : "New policy draft saved"
        );
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save policy");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <h3 className="font-bold text-[#1E293B]">
              {policy ? (isEditingPublished ? `New Version: ${policy.title}` : `Edit Draft: ${policy.title}`) : "Create Policy Draft"}
            </h3>
            <p className="text-xs text-[#64748B]">
              {isEditingPublished
                ? "Published policies are immutable. Saving will generate a new incremented version and preserve historical audits."
                : "Policies remain in DRAFT until explicitly published."}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B]">Policy Type</label>
              <select
                disabled={!!policy}
                value={policyType}
                onChange={(e) => {
                  setPolicyType(e.target.value);
                  const matched = POLICY_TYPES_LIST.find((p) => p.value === e.target.value);
                  if (matched) setTitle(matched.label.replace(/^\d+\.\s*/, ""));
                }}
                className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
              >
                {POLICY_TYPES_LIST.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B]">Policy Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Terms & Conditions"
                className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B]">Effective Date (DD/MM/YYYY)</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B]">Change Summary / Revision Note</label>
              <input
                type="text"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="e.g. Updated Section 4 regarding admission fee refunds"
                className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>

          {/* Tab Switcher & Toolbar */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`border-b-2 px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "edit"
                    ? "border-[#4A7B5B] text-[#4A7B5B]"
                    : "border-transparent text-[#64748B] hover:text-[#1E293B]"
                }`}
              >
                HTML / Markdown Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`border-b-2 px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "preview"
                    ? "border-[#4A7B5B] text-[#4A7B5B]"
                    : "border-transparent text-[#64748B] hover:text-[#1E293B]"
                }`}
              >
                Live Preview
              </button>
            </div>

            {activeTab === "edit" && (
              <div className="flex items-center gap-1 text-xs text-[#64748B]">
                <button
                  type="button"
                  onClick={() => setContent((c) => c + "\n<h2>Section Title</h2>\n<p>Content goes here...</p>\n")}
                  className="rounded bg-[#F1F5F9] px-2 py-1 hover:bg-[#E2E8F0]"
                >
                  + Heading
                </button>
                <button
                  type="button"
                  onClick={() => setContent((c) => c + "\n<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>\n")}
                  className="rounded bg-[#F1F5F9] px-2 py-1 hover:bg-[#E2E8F0]"
                >
                  + List
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setContent(
                      (c) =>
                        c +
                        "\n<table>\n  <thead><tr><th>Tier</th><th>Criteria</th><th>Reward</th></tr></thead>\n  <tbody><tr><td>Tier 1</td><td>4 Referrals</td><td>₹4,000</td></tr></tbody>\n</table>\n"
                    )
                  }
                  className="rounded bg-[#F1F5F9] px-2 py-1 hover:bg-[#E2E8F0]"
                >
                  + Table
                </button>
              </div>
            )}
          </div>

          {/* Editor Area */}
          {activeTab === "edit" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              placeholder="Enter policy content in HTML or formatted text..."
              className="w-full font-mono text-xs rounded-xl border border-[#E2E8F0] p-4 text-[#1E293B] outline-none focus:border-[#4A7B5B]"
            />
          ) : (
            <div
              className="prose prose-sm max-w-none rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6"
              dangerouslySetInnerHTML={{ __html: content || "<p class='text-gray-400'>No content provided</p>" }}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="rounded-xl border border-[#4A7B5B] px-4 py-2 text-sm font-semibold text-[#4A7B5B] transition hover:bg-[#E8F3EC]"
            >
              {isSubmitting ? "Saving..." : "Save as Draft"}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="rounded-xl bg-[#4A7B5B] px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#3d654a]"
            >
              {isSubmitting ? "Publishing..." : "Publish Immediately"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Policy Preview Modal
// ─────────────────────────────────────────────────────────────────────────────
function PolicyPreviewModal({ policy, onClose }: { policy: LegalPolicy; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#4A7B5B]">{policy.version}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  policy.status === "PUBLISHED"
                    ? "bg-[#E8F3EC] text-[#4A7B5B]"
                    : policy.status === "DRAFT"
                    ? "bg-[#FEF3C7] text-[#D97706]"
                    : "bg-[#F1F5F9] text-[#64748B]"
                }`}
              >
                {policy.status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#1E293B]">{policy.title}</h2>
            <p className="text-xs text-[#64748B]">
              Effective Date: {formatDateDDMMYYYY(policy.effectiveDate)} • Swayam Admission
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div
            className="prose prose-sm max-w-none text-[#334155]"
            dangerouslySetInnerHTML={{ __html: policy.content }}
          />
        </div>

        <div className="flex items-center justify-end border-t border-[#E2E8F0] px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-[#4A7B5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3d654a]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Version History Modal
// ─────────────────────────────────────────────────────────────────────────────
function VersionHistoryModal({
  policy,
  versions,
  isLoading,
  onClose,
  onSelectVersion,
}: {
  policy: LegalPolicy;
  versions: LegalPolicy[];
  isLoading: boolean;
  onClose: () => void;
  onSelectVersion: (ver: LegalPolicy) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <h3 className="font-bold text-[#1E293B]">Version History: {policy.title}</h3>
            <p className="text-xs text-[#64748B]">
              Immutable record of all historical and published versions of this legal document.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-[#64748B]">Loading history...</div>
          ) : versions.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#64748B]">No previous versions found.</div>
          ) : (
            <div className="space-y-4">
              {versions.map((ver, idx) => (
                <div
                  key={ver.id}
                  className="flex items-start justify-between rounded-xl border border-[#E2E8F0] p-4 transition hover:border-[#CBD5E1]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#4A7B5B]">{ver.version}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          ver.status === "PUBLISHED"
                            ? "bg-[#E8F3EC] text-[#4A7B5B]"
                            : ver.status === "DRAFT"
                            ? "bg-[#FEF3C7] text-[#D97706]"
                            : "bg-[#F1F5F9] text-[#64748B]"
                        }`}
                      >
                        {ver.status}
                      </span>
                      {idx === 0 && <span className="text-[10px] text-[#4A7B5B] font-semibold">(Current)</span>}
                    </div>

                    <div className="mt-1 text-xs text-[#64748B]">
                      Effective: {formatDateDDMMYYYY(ver.effectiveDate)} • Published:{" "}
                      {formatDateDDMMYYYY(ver.publishedAt)}
                    </div>

                    {ver.changeSummary && (
                      <p className="mt-1 text-xs text-[#334155] italic">"{ver.changeSummary}"</p>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectVersion(ver)}
                    className="flex items-center gap-1 rounded-lg bg-[#F1F5F9] px-3 py-1.5 text-xs font-semibold text-[#1E293B] hover:bg-[#E2E8F0]"
                  >
                    <Eye className="h-3.5 w-3.5" /> View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-[#E2E8F0] px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Grievance Review Drawer
// ─────────────────────────────────────────────────────────────────────────────
function GrievanceReviewDrawer({
  grievance,
  onClose,
  onSubmit,
  isPending,
}: {
  grievance: GrievanceItem;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [status, setStatus] = useState<string>(grievance.status);
  const [response, setResponse] = useState<string>(grievance.response || "");
  const [resolution, setResolution] = useState<string>(grievance.resolution || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <span className="font-mono text-xs font-bold text-[#4A7B5B]">{grievance.complaintId}</span>
            <h3 className="font-bold text-[#1E293B]">{grievance.subject}</h3>
            <p className="text-xs text-[#64748B]">
              From: {grievance.user?.fullName} ({grievance.user?.email || grievance.user?.mobile}) •{" "}
              {formatDateTimeDDMMYYYY(grievance.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="rounded-xl bg-[#F8FAFC] p-4 border border-[#E2E8F0]">
            <span className="text-xs font-semibold text-[#64748B] uppercase">Complaint Description</span>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[#1E293B]">{grievance.description}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B]">Resolution Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B]">Officer Response / Communication</label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              placeholder="Internal communication or response sent to student..."
              className="mt-1 w-full rounded-xl border border-[#E2E8F0] p-3 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B]">Final Resolution Summary</label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={3}
              placeholder="Formal resolution findings and closure notes..."
              className="mt-1 w-full rounded-xl border border-[#E2E8F0] p-3 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#E2E8F0] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => onSubmit({ status, response, resolution })}
            className="rounded-xl bg-[#4A7B5B] px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[#3d654a]"
          >
            {isPending ? "Updating..." : "Save Resolution"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Cookie Modal
// ─────────────────────────────────────────────────────────────────────────────
function CookieModal({
  cookie,
  onClose,
  onSaved,
}: {
  cookie: CookieItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(cookie?.name || "");
  const [category, setCategory] = useState(cookie?.category || "NECESSARY");
  const [purpose, setPurpose] = useState(cookie?.purpose || "");
  const [provider, setProvider] = useState(cookie?.provider || "Swayam Admission");
  const [duration, setDuration] = useState(cookie?.duration || "Session");
  const [isActive, setIsActive] = useState(cookie ? cookie.isActive : true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !purpose.trim()) {
      toast.error("Name and purpose are required");
      return;
    }
    setIsSubmitting(true);
    try {
      if (cookie) {
        await LegalApi.updateCookie(cookie.id, { name, category, purpose, provider, duration, isActive });
        toast.success("Cookie updated successfully");
      } else {
        await LegalApi.createCookie({ name, category, purpose, provider, duration, isActive });
        toast.success("Cookie created successfully");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save cookie");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="font-bold text-[#1E293B]">{cookie ? "Edit Cookie" : "Add Cookie Declaration"}</h3>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#1E293B]">Cookie Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. sa_session"
              className="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B]">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
            >
              <option value="NECESSARY">NECESSARY</option>
              <option value="FUNCTIONAL">FUNCTIONAL</option>
              <option value="SECURITY">SECURITY</option>
              <option value="ANALYTICS">ANALYTICS</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B]">Purpose</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Session authentication and state persistence"
              className="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B]">Provider</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B]">Duration</label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 7 days"
                className="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 pt-2 text-xs font-semibold text-[#1E293B]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
            />
            Active in Cookie Policy
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
          >
            Cancel
          </button>
          <button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="rounded-xl bg-[#4A7B5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3d654a]"
          >
            {isSubmitting ? "Saving..." : "Save Cookie"}
          </button>
        </div>
      </div>
    </div>
  );
}
