import { useState } from "react";
import {
  Search, Filter, Download, CheckCircle2, Clock, XCircle, FileText, Eye,
  ChevronRight, AlertCircle, Plus, User, Building2, ShieldAlert, ArrowRight, RotateCcw, AlertTriangle, MessageSquare
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, ApplicationQueryParams } from "../../api/applications.api";
import { useDebounce } from "../../hooks/useDebounce";
import { useLiveSync } from "../../hooks/useLiveSync";
import ApplicationFormModal from "./ApplicationFormModal";
import CounselorChatModal from "./CounselorChatModal";

const STAGES = ["All", "SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUIRED", "APPROVED", "REJECTED"];

const STAGE_CONFIG: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  "DRAFT": { bg: "#F1F5F9", text: "#64748B", icon: Clock, label: "Draft" },
  "SUBMITTED": { bg: "#DBEAFE", text: "#1D4ED8", icon: FileText, label: "Submitted" },
  "UNDER_REVIEW": { bg: "#FEF3C7", text: "#B45309", icon: Eye, label: "Under Review" },
  "CORRECTION_REQUIRED": { bg: "#FFEDD5", text: "#C2410C", icon: AlertTriangle, label: "Correction Req." },
  "APPROVED": { bg: "#E8F3EC", text: "#4A7B5B", icon: CheckCircle2, label: "Admission Approved" },
  "REJECTED": { bg: "#FEE2E2", text: "#DC2626", icon: XCircle, label: "Rejected" },
  "WITHDRAWN": { bg: "#F1F5F9", text: "#475569", icon: AlertCircle, label: "Withdrawn" },
};

const ALL_DOCS = ["Marksheet", "Aadhaar", "Photo", "Certificate", "Signature"];

export default function ApplicationsPage() {
  useLiveSync("admin");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedStage, setSelectedStage] = useState("All");
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<any | null>(null);

  // Decision Modal States
  const [approveModalApp, setApproveModalApp] = useState<any | null>(null);
  const [approveNotes, setApproveNotes] = useState("");

  const [rejectModalApp, setRejectModalApp] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionCategory, setRejectionCategory] = useState("ELIGIBILITY");
  const [publicRejectionReason, setPublicRejectionReason] = useState("");

  const [correctionModalApp, setCorrectionModalApp] = useState<any | null>(null);
  const [correctionSection, setCorrectionSection] = useState("Academic Details");
  const [correctionReason, setCorrectionReason] = useState("");

  const [reopenModalApp, setReopenModalApp] = useState<any | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [chatModalApp, setChatModalApp] = useState<any | null>(null);

  const queryClient = useQueryClient();

  // Queries
  const queryParams: ApplicationQueryParams = { limit: 50, search: debouncedSearch };
  if (selectedStage !== "All") queryParams.status = selectedStage;

  const { data: queueRes, isLoading, refetch } = useQuery({
    queryKey: ["admin_review_queue", selectedStage, debouncedSearch],
    queryFn: () => applicationsApi.getReviewQueue(queryParams),
  });

  const rawApps = queueRes?.data?.data || queueRes?.data || [];
  const meta = queueRes?.data?.meta || {};
  const counts = meta.counts || {};

  // Mutations
  const claimMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.claimReview(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin_review_queue"] });
      if (selectedApp?.id === res.data?.data?.id) {
        setSelectedApp(res.data?.data);
      }
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || "Failed to claim review");
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      applicationsApi.approveAdmission(id, notes),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin_review_queue"] });
      setApproveModalApp(null);
      setApproveNotes("");
      if (selectedApp?.id === res.data?.data?.id) {
        setSelectedApp(res.data?.data);
      }
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || "Failed to approve admission");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason, category, publicReason }: { id: string; reason: string; category?: string; publicReason?: string }) =>
      applicationsApi.rejectAdmission(id, reason, category, publicReason),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin_review_queue"] });
      setRejectModalApp(null);
      setRejectionReason("");
      setPublicRejectionReason("");
      if (selectedApp?.id === res.data?.data?.id) {
        setSelectedApp(res.data?.data);
      }
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || "Failed to reject application");
    },
  });

  const correctionMutation = useMutation({
    mutationFn: ({ id, section, reason }: { id: string; section: string; reason: string }) =>
      applicationsApi.requestCorrection(id, section, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_review_queue"] });
      setCorrectionModalApp(null);
      setCorrectionReason("");
      if (selectedApp) setSelectedApp(null);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || "Failed to request correction");
    },
  });

  const reopenMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      applicationsApi.reopenDecision(id, reason),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin_review_queue"] });
      setReopenModalApp(null);
      setReopenReason("");
      if (selectedApp?.id === res.data?.data?.id) {
        setSelectedApp(res.data?.data);
      }
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || "Failed to reopen decision");
    },
  });

  const handleExport = async () => {
    try {
      const res = await applicationsApi.getReviewQueue({ limit: 10000 });
      const appsToExport = res.data?.data || [];
      if (!appsToExport.length) return;

      const headers = ["App Number", "Student", "Mobile", "College", "Course", "Branch", "Status", "Counselor", "Reviewer", "Submitted At"];
      const csvContent = [
        headers.join(","),
        ...appsToExport.map((a: any) => [
          a.applicationNumber || a.id,
          `"${a.user?.fullName || 'Unknown'}"`,
          a.user?.mobile || '',
          `"${a.college?.name || 'Unknown'}"`,
          `"${a.course?.name || 'Unknown'}"`,
          `"${a.branch?.name || ''}"`,
          a.status,
          `"${a.counselor?.fullName || 'Unassigned'}"`,
          `"${a.reviewer?.fullName || 'Unassigned'}"`,
          new Date(a.submittedAt || a.createdAt).toLocaleDateString(),
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute("download", `admission_review_queue_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed", error);
    }
  };

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100%" }}>
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#4A7B5B] tracking-tight">Admission Review & Decision Governance</h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Review submitted applications, manage reviewer claims, verify program offerings, request corrections & execute governance decisions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="px-3.5 py-2 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#d8e8dc] transition-all"
          >
            <RotateCcw size={13} /> Refresh Queue
          </button>
          <button
            onClick={handleExport}
            className="px-3.5 py-2 border border-[#E2E8F0] bg-white text-[#475569] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#F8FAFC] transition-all"
          >
            <Download size={13} /> Export Queue
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: "All", label: "Total Applications", count: meta.total || rawApps.length, icon: FileText, color: "#4A7B5B", bg: "#E8F3EC" },
          { key: "SUBMITTED", label: "New Submissions", count: counts.submitted || 0, icon: FileText, color: "#1D4ED8", bg: "#DBEAFE" },
          { key: "UNDER_REVIEW", label: "Under Review", count: counts.underReview || 0, icon: Eye, color: "#B45309", bg: "#FEF3C7" },
          { key: "CORRECTION_REQUIRED", label: "Correction Req.", count: counts.correctionRequired || 0, icon: AlertTriangle, color: "#C2410C", bg: "#FFEDD5" },
          { key: "APPROVED", label: "Admission Approved", count: counts.approved || 0, icon: CheckCircle2, color: "#4A7B5B", bg: "#E8F3EC" },
          { key: "REJECTED", label: "Rejected", count: counts.rejected || 0, icon: XCircle, color: "#DC2626", bg: "#FEE2E2" },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = selectedStage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setSelectedStage(item.key)}
              className="bg-white rounded-2xl p-4 border text-left transition-all hover:shadow-md flex flex-col justify-between"
              style={{
                borderColor: isSelected ? item.color : "#F1F5F9",
                boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.02)"
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#94A3B8] uppercase">{item.label}</span>
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: item.bg, color: item.color }}>
                  <Icon size={14} />
                </div>
              </div>
              <div className="text-2xl font-black text-[#4A7B5B] mt-2">{item.count}</div>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-[#F1F5F9] p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by App No, Student Name, Mobile, College, Course..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs focus:outline-none focus:border-[#4A7B5B] font-medium"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {STAGES.map((stg) => {
            const isSel = selectedStage === stg;
            return (
              <button
                key={stg}
                onClick={() => setSelectedStage(stg)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isSel ? "bg-[#4A7B5B] text-white shadow-xs" : "bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9]"
                }`}
              >
                {stg === "All" ? "All Queue" : STAGE_CONFIG[stg]?.label || stg}
              </button>
            );
          })}
        </div>
      </div>

      {/* Review Queue Table */}
      <div className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #F1F5F9", background: "#FAFAFA" }}>
                {["App Number", "Student Info", "Program Offering", "Counselor / Reviewer", "Age / SLA", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs font-medium text-slate-400">
                    Loading review queue...
                  </td>
                </tr>
              )}

              {!isLoading && rawApps.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs font-medium text-slate-400">
                    No applications currently waiting in this review queue tab.
                  </td>
                </tr>
              )}

              {!isLoading &&
                rawApps.map((app: any, i: number) => {
                  const stageConf = STAGE_CONFIG[app.status] || STAGE_CONFIG["DRAFT"];
                  const StageIcon = stageConf.icon;
                  const displayAppId = app.applicationNumber || app.applicationId || app.id;
                  const studentName = app.formData?.personalInfo?.fullName || app.user?.fullName || "Student";
                  const collegeName = app.college?.name || app.formData?.preferences?.preferredCollege || app.formData?.preferences?.preferredCollegeText || "Open / Pending Guidance";
                  const studentMobile = app.formData?.personalInfo?.mobile || app.user?.mobile || "";
                  const studentId = app.user?.studentId;
                  const regNo = app.user?.registrationNumber;

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group border-b border-[#F1F5F9] last:border-none"
                      onClick={() => setSelectedApp(app)}
                    >
                      {/* App Number */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-xs font-mono font-bold text-[#4A7B5B] block">{displayAppId}</span>
                      </td>

                      {/* Student Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#4A7B5B] flex items-center gap-2">
                              <span>{studentName}</span>
                              {studentId && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-[#4A7B5B] border border-emerald-200">
                                  {studentId}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
                              {regNo && <span className="font-mono text-slate-500">Reg: {regNo} •</span>}
                              <span>{studentMobile || "No mobile"}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Offering */}
                      <td className="px-5 py-3.5">
                        <div className="text-xs font-bold text-[#4A7B5B] max-w-[200px] truncate">{collegeName}</div>
                        <div className="text-[10px] text-[#94A3B8]">
                          {app.course?.name || "Course"} {app.branch?.name ? `• ${app.branch.name}` : ""}
                        </div>
                      </td>

                      {/* Counselor / Reviewer Ownership */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-xs text-[#475569]">
                          <span className="font-semibold text-slate-400">Counselor:</span> {app.counselor?.fullName || "Unassigned"}
                        </div>
                        <div className="text-xs text-[#4A7B5B] flex items-center gap-1 mt-0.5">
                          <span className="font-semibold text-slate-400">Reviewer:</span>{" "}
                          {app.reviewer?.fullName ? (
                            <span className="font-bold text-[#4A7B5B]">{app.reviewer.fullName}</span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                claimMutation.mutate(app.id);
                              }}
                              className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold hover:bg-amber-100"
                            >
                              + Claim Review
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Age / SLA */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className={app.isOverdue ? "text-red-500" : "text-slate-400"} />
                          <span className={`text-xs font-bold ${app.isOverdue ? "text-red-600" : "text-slate-700"}`}>
                            {app.ageInHours || 0} hrs
                          </span>
                          {app.isOverdue && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase">OVERDUE</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Sub: {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold"
                          style={{ background: stageConf.bg, color: stageConf.text }}
                        >
                          <StageIcon size={12} />
                          {stageConf.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApp(app);
                          }}
                          className="px-3 py-1.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl text-xs font-bold hover:bg-[#d8e8dc] transition-all flex items-center gap-1"
                        >
                          Review <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Review Detail Drawer */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-black uppercase text-[#4A7B5B] tracking-wider block">Admission Governance Review</span>
                <h2 className="text-lg font-extrabold text-[#4A7B5B]">
                  {selectedApp.applicationNumber || selectedApp.applicationId || selectedApp.id}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedApp.formData?.personalInfo?.fullName || selectedApp.user?.fullName || "Student"} • {selectedApp.college?.name || selectedApp.formData?.preferences?.preferredCollege || selectedApp.formData?.preferences?.preferredCollegeText || "Open / Pending Guidance"}
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center font-bold text-sm shadow-2xs"
              >
                ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Offering Context Card */}
              <div className="bg-[#E8F3EC] border border-[#d8e8dc] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#4A7B5B] tracking-wider">Program Offering Context</span>
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      background: STAGE_CONFIG[selectedApp.status]?.bg || "#fff",
                      color: STAGE_CONFIG[selectedApp.status]?.text || "#000"
                    }}
                  >
                    {STAGE_CONFIG[selectedApp.status]?.label || selectedApp.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">College</span>
                    <span className="text-xs font-bold text-[#4A7B5B]">{selectedApp.college?.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Course & Branch</span>
                    <span className="text-xs font-bold text-[#4A7B5B]">
                      {selectedApp.course?.name || "N/A"} {selectedApp.branch?.name ? `(${selectedApp.branch.name})` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Candidate Profile, Category & Academic Snapshot */}
              {(() => {
                const formData = selectedApp.formData || {};
                const snapshot = formData.submittedSnapshot || {};
                const personal = snapshot.personalInfo || formData.personalInfo || {};
                const academic = snapshot.academicInfo || formData.academicInfo || {};
                const address = snapshot.address || formData.address || {};
                const fin = snapshot.financialAssistance || formData.financialAssistance || {};
                const studentCategory = personal.category || selectedApp.user?.profile?.category || "GENERAL";

                return (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider">Candidate Application Snapshot</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                        Category: <strong>{studentCategory}</strong>
                      </span>
                    </div>

                    {/* Academic Snapshot */}
                    <div className="space-y-1.5 text-xs">
                      <span className="font-bold text-slate-700 block">Academic Qualifications:</span>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-slate-50 border">
                          <span className="text-slate-400 block">10th Standard</span>
                          <span className="font-bold text-slate-800">
                            {academic.tenthBoard || selectedApp.user?.profile?.tenthBoard || "—"} ({academic.tenthMarks || selectedApp.user?.profile?.tenthMarks || "—"}%)
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border">
                          <span className="text-slate-400 block">12th Standard</span>
                          <span className="font-bold text-slate-800">
                            {academic.twelfthBoard || selectedApp.user?.profile?.twelfthBoard || "—"} ({academic.twelfthMarks || selectedApp.user?.profile?.twelfthMarks || "—"}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Address Snapshot */}
                    <div className="space-y-1 text-xs">
                      <span className="font-bold text-slate-700 block">Communication Address:</span>
                      <p className="text-slate-600 text-[11px]">
                        {address.streetAddress || selectedApp.formData?.communicationAddress || selectedApp.user?.profile?.address || "—"}, {address.district || selectedApp.formData?.communicationDistrict || selectedApp.user?.profile?.district || "—"}, {address.state || selectedApp.formData?.communicationState || selectedApp.user?.profile?.state || "—"} - {address.pincode || selectedApp.formData?.communicationPincode || selectedApp.user?.profile?.pincode || "—"}
                      </p>
                    </div>

                    {/* Education Financing & Scholarship Preference */}
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950">Financial Assistance Preference:</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                          {fin.preference || "DIRECT_PAYMENT"}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        {fin.schemeName ? `Scheme: ${fin.schemeName}` : fin.preference === 'STATE_SCHEME' ? 'State Student Credit Scheme' : fin.preference === 'SCHOLARSHIP' ? 'Merit/Need Scholarship' : 'Direct self-payment'}
                        {fin.remarks ? ` • Remarks: ${fin.remarks}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Reviewer & Counselor Ownership Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                <span className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider block">Responsibility Assignment</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Guidance Counselor</span>
                    <span className="text-xs font-bold text-[#4A7B5B] block mt-0.5">
                      {selectedApp.counselor?.fullName || "Unassigned"}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Admission Reviewer</span>
                    <span className="text-xs font-bold text-[#4A7B5B] block mt-0.5">
                      {selectedApp.reviewer?.fullName || "Unassigned Reviewer"}
                    </span>
                  </div>
                </div>

                {!selectedApp.reviewer && (
                  <button
                    onClick={() => claimMutation.mutate(selectedApp.id)}
                    disabled={claimMutation.isPending}
                    className="w-full py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all flex items-center justify-center gap-1.5"
                  >
                    <User size={13} /> {claimMutation.isPending ? "Claiming..." : "Claim Review Ownership"}
                  </button>
                )}

                <button
                  onClick={() => setChatModalApp(selectedApp)}
                  className="w-full py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <MessageSquare size={13} /> Chat with Applicant
                </button>
              </div>

              {/* Structured Review Checklist */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider block">Structured Pre-Decision Review Checklist</span>
                <div className="space-y-2">
                  {[
                    { label: "Applicant Identity & Contact Verified", ok: !!selectedApp.user?.fullName && !!selectedApp.user?.mobile },
                    { label: "Academic Qualification & Eligibility Validated", ok: !!selectedApp.user?.profile?.tenthMarks || !!selectedApp.user?.profile?.twelfthMarks },
                    { label: "Program Offering Active & Seat Available", ok: !!selectedApp.college && !!selectedApp.course },
                    { label: "Required Application Terms Declared", ok: Boolean(selectedApp.declarationAccepted) },
                    { label: "Document Checklist Verified", ok: selectedApp.documentsVerified || (selectedApp.documents && selectedApp.documents.length > 0) },
                  ].map((chk, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-medium text-slate-700">{chk.label}</span>
                      {chk.ok ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-[#4A7B5B]">
                          <CheckCircle2 size={14} /> Passed
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                          <AlertCircle size={14} /> Incomplete
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rejection / Correction Warning if present */}
              {selectedApp.status === "CORRECTION_REQUIRED" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                  <span className="text-xs font-bold text-amber-900 block">Correction Outstanding</span>
                  <p className="text-xs text-amber-800">
                    Section: <strong>{selectedApp.correctionSection || "General"}</strong> — {selectedApp.correctionReason}
                  </p>
                </div>
              )}

              {selectedApp.status === "REJECTED" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-1">
                  <span className="text-xs font-bold text-red-900 block">Application Rejected</span>
                  <p className="text-xs text-red-800">
                    Internal Reason: {selectedApp.rejectionReason}
                  </p>
                  <p className="text-xs text-red-700 italic">
                    Public Reason: {selectedApp.publicRejectionReason}
                  </p>
                </div>
              )}

              {/* Timeline Log */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider block">Audit Timeline Log</span>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(!selectedApp.timeline || selectedApp.timeline.length === 0) ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-400">No timeline events recorded yet.</div>
                  ) : (
                    selectedApp.timeline.map((tm: any, idx: number) => (
                      <div key={tm.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-0.5">
                        <div className="flex justify-between font-bold text-[#4A7B5B]">
                          <span>{tm.action}</span>
                          <span className="text-[10px] text-slate-400">{new Date(tm.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-600">{tm.remarks || `Status moved to ${tm.newStatus}`}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Action CTAs */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setApproveModalApp(selectedApp)}
                  className="flex-1 py-2.5 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> Approve Admission
                </button>
                <button
                  onClick={() => setCorrectionModalApp(selectedApp)}
                  className="py-2.5 px-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all flex items-center gap-1.5"
                >
                  <AlertTriangle size={14} /> Request Correction
                </button>
                <button
                  onClick={() => setRejectModalApp(selectedApp)}
                  className="py-2.5 px-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-1.5"
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>

              {(selectedApp.status === "APPROVED" || selectedApp.status === "REJECTED") && (
                <button
                  onClick={() => setReopenModalApp(selectedApp)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <RotateCcw size={12} /> Reopen Decision Governance
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL MODAL */}
      {approveModalApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-[#4A7B5B]">Confirm Admission Approval</h3>
              <button onClick={() => setApproveModalApp(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <p className="text-xs text-slate-600">
              You are approving admission for application <strong>{approveModalApp.applicationNumber || approveModalApp.id}</strong> ({approveModalApp.user?.fullName}).
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Internal Decision Notes (Optional)</label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="e.g. Approved based on 12th marks eligibility and verified certificates..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setApproveModalApp(null)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
              <button
                onClick={() => approveMutation.mutate({ id: approveModalApp.id, notes: approveNotes })}
                disabled={approveMutation.isPending}
                className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {approveMutation.isPending ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-[#4A7B5B]">Reject Application</h3>
              <button onClick={() => setRejectModalApp(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Rejection Category</label>
                <select
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="ELIGIBILITY">Eligibility Criteria Not Met</option>
                  <option value="DOCUMENTATION">Incomplete Documentation</option>
                  <option value="ACADEMIC_CRITERIA">Academic Marks Below Cutoff</option>
                  <option value="SEAT_UNAVAILABLE">Program Seats Full</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Internal Rejection Reason (Mandatory)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Internal notes for board audit..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Student-Visible Reason (Safe Public Message)</label>
                <textarea
                  value={publicRejectionReason}
                  onChange={(e) => setPublicRejectionReason(e.target.value)}
                  placeholder="Public reason shown on student dashboard..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setRejectModalApp(null)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
              <button
                onClick={() =>
                  rejectMutation.mutate({
                    id: rejectModalApp.id,
                    reason: rejectionReason,
                    category: rejectionCategory,
                    publicReason: publicRejectionReason,
                  })
                }
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST CORRECTION MODAL */}
      {correctionModalApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-[#4A7B5B]">Request Student Correction</h3>
              <button onClick={() => setCorrectionModalApp(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Affected Form Section</label>
                <select
                  value={correctionSection}
                  onChange={(e) => setCorrectionSection(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="Personal Information">Personal Information</option>
                  <option value="Academic Details">Academic Details</option>
                  <option value="Address Information">Address Information</option>
                  <option value="Document Uploads">Document Uploads</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Correction Instructions for Student</label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Please re-upload 12th marksheet as image was blurry..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setCorrectionModalApp(null)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
              <button
                onClick={() =>
                  correctionMutation.mutate({
                    id: correctionModalApp.id,
                    section: correctionSection,
                    reason: correctionReason,
                  })
                }
                disabled={correctionMutation.isPending || !correctionReason.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {correctionMutation.isPending ? "Sending..." : "Send Correction Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN DECISION MODAL */}
      {reopenModalApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-[#4A7B5B]">Reopen Decision Governance</h3>
              <button onClick={() => setReopenModalApp(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Reopening decision for application <strong>{reopenModalApp.applicationNumber || reopenModalApp.id}</strong>. This will move the status back to Under Review.
              </p>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Reopen Rationale (Mandatory Audit Log)</label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Reopening review due to updated university eligibility policy..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setReopenModalApp(null)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
              <button
                onClick={() =>
                  reopenMutation.mutate({
                    id: reopenModalApp.id,
                    reason: reopenReason,
                  })
                }
                disabled={reopenMutation.isPending || !reopenReason.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {reopenMutation.isPending ? "Reopening..." : "Confirm Reopen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isFormModalOpen && (
        <ApplicationFormModal
          app={editingApp}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingApp(null);
          }}
        />
      )}

      {chatModalApp && (
        <CounselorChatModal
          isOpen={!!chatModalApp}
          onClose={() => setChatModalApp(null)}
          applicationId={chatModalApp.id}
          applicationNumber={chatModalApp.applicationNumber}
          studentName={chatModalApp.user?.fullName}
          collegeName={chatModalApp.college?.name}
          courseName={chatModalApp.course?.name}
        />
      )}
    </div>
  );
}
