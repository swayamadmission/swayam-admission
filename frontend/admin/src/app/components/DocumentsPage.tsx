import React, { useState } from "react";
import {
  CheckCircle, XCircle, Search, FolderOpen, FileText, Download,
  Eye, RefreshCw, Clock, TrendingUp, HardDrive, Trash2, ShieldAlert,
  ShieldCheck, AlertTriangle, Play, PauseCircle, Lock, Shield, Check, X,
  Send, Bell
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../../api/documents.api";
import DocumentDetailDrawer from "./DocumentDetailDrawer";
import ErrorBoundary from "./ErrorBoundary";

const DOCUMENT_TYPES = [
  "TENTH_MARKSHEET", "TWELFTH_MARKSHEET", "GRADUATION", "DIPLOMA",
  "AADHAAR", "PAN", "PASSPORT", "DRIVING_LICENSE", "PHOTO", "SIGNATURE",
  "MIGRATION", "TRANSFER_CERTIFICATE", "CHARACTER_CERTIFICATE",
  "CASTE_CERTIFICATE", "INCOME_CERTIFICATE", "DOMICILE", "MEDICAL_CERTIFICATE",
  "GAP_CERTIFICATE", "OTHER"
];

function DocumentsPageInner() {
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Query Stats
  const { data: statsRes } = useQuery({
    queryKey: ["admin_documents_stats"],
    queryFn: () => documentsApi.getStats(),
  });

  // Query Paginated Documents
  const { data: docsRes, isLoading, refetch } = useQuery({
    queryKey: ["admin_documents", search, typeFilter, statusFilter, page],
    queryFn: () =>
      documentsApi.getPaginated({
        search: search || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 10,
      }),
  });

  // Mutations
  const verifyMutation = useMutation({
    mutationFn: ({ id, status, rejectedReason }: { id: string; status: "VERIFIED" | "REJECTED"; rejectedReason?: string }) =>
      documentsApi.verifyDocument(id, { status, rejectedReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_documents"] });
      queryClient.invalidateQueries({ queryKey: ["admin_documents_stats"] });
    },
  });

  const bulkVerifyMutation = useMutation({
    mutationFn: ({ status, rejectedReason }: { status: "VERIFIED" | "REJECTED"; rejectedReason?: string }) =>
      documentsApi.bulkVerify({ documentIds: selectedDocIds, status, rejectedReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_documents"] });
      queryClient.invalidateQueries({ queryKey: ["admin_documents_stats"] });
      setSelectedDocIds([]);
    },
  });

  // Module Switching
  const [activeModule, setActiveModule] = useState<"DOCS" | "DELETION_REQUESTS" | "AUDIT_LOGS">("DOCS");

  // Deletion Requests State
  const [delStatusFilter, setDelStatusFilter] = useState("");
  const [delPage, setDelPage] = useState(1);
  const [reviewingReq, setReviewingReq] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT" | "HOLD">("APPROVE");
  const [reviewReason, setReviewReason] = useState("");
  const [resendingReq, setResendingReq] = useState<any>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["WEBSITE", "EMAIL", "WHATSAPP", "SMS"]);

  // Audit Logs State
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditResultFilter, setAuditResultFilter] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  // Queries for Deletion Requests & Audit
  const {
    data: deletionRequestsRes,
    isLoading: isDelLoading,
    refetch: refetchDeletionRequests,
  } = useQuery({
    queryKey: ["admin_deletion_requests", delStatusFilter, delPage],
    queryFn: () =>
      documentsApi.getDeletionRequests({
        status: delStatusFilter || undefined,
        page: delPage,
        limit: 10,
      }),
    enabled: activeModule === "DELETION_REQUESTS",
  });

  const {
    data: auditLogsRes,
    isLoading: isAuditLoading,
    refetch: refetchAuditLogs,
  } = useQuery({
    queryKey: ["admin_document_audit_logs", auditActionFilter, auditResultFilter, auditPage],
    queryFn: () =>
      documentsApi.getAuditLogs({
        action: auditActionFilter || undefined,
        result: auditResultFilter || undefined,
        page: auditPage,
        limit: 15,
      }),
    enabled: activeModule === "AUDIT_LOGS",
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { action: "APPROVE" | "REJECT" | "HOLD"; rejectionReason?: string; holdReason?: string } }) =>
      documentsApi.reviewDeletionRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_deletion_requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin_documents"] });
      queryClient.invalidateQueries({ queryKey: ["admin_document_audit_logs"] });
      setReviewingReq(null);
      setReviewReason("");
      alert("Deletion request review updated successfully.");
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || "Failed to update deletion request.");
    },
  });

  const resendNotificationMutation = useMutation({
    mutationFn: ({ id, channels }: { id: string; channels?: string[] }) =>
      documentsApi.resendDeletionNotification(id, channels),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin_deletion_requests"] });
      const results = res?.data?.results || res?.data;
      const details = Array.isArray(results?.results)
        ? results.results.map((r: any) => `${r.channel}: ${r.status}`).join("\n")
        : "Dispatched";
      alert(`Deletion confirmation notifications dispatched.\n\n${details}`);
      setResendingReq(null);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || "Failed to resend notification.");
    },
  });

  const runRetentionCleanupMutation = useMutation({
    mutationFn: () => documentsApi.runRetentionCleanup(),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin_deletion_requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin_documents"] });
      queryClient.invalidateQueries({ queryKey: ["admin_document_audit_logs"] });
      const stats = res?.data?.result || res?.data?.data || res?.data;
      const isPartial = (stats?.failed ?? 0) > 0;
      const msg = isPartial
        ? `Retention Cleanup Completed with ${stats?.failed} Failure(s):\n\nTotal Evaluated: ${stats?.totalEvaluated ?? 0}\nEligible for Deletion: ${stats?.eligible ?? 0}\nPermanently Deleted: ${stats?.deleted ?? 0}\nSkipped (Active Retention Hold): ${stats?.skippedByHold ?? stats?.skippedOnHold ?? 0}\nNotifications Queued/Dispatched: ${stats?.notificationsQueued ?? 0}\nFailed: ${stats?.failed ?? 0}`
        : `Retention Cleanup Completed Successfully:\n\nTotal Evaluated: ${stats?.totalEvaluated ?? 0}\nEligible for Deletion: ${stats?.eligible ?? 0}\nPermanently Deleted: ${stats?.deleted ?? 0}\nSkipped (Active Retention Hold): ${stats?.skippedByHold ?? stats?.skippedOnHold ?? 0}\nNotifications Queued/Dispatched: ${stats?.notificationsQueued ?? 0}\nFailed: 0`;
      alert(msg);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || "Failed to run retention cleanup.");
    },
  });

  const formatDDMMYYYY = (dateStr?: string | Date) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  // Safe Stats Extraction
  const statsBody = statsRes?.data?.data || statsRes?.data || {};
  const stats = {
    totalDocuments: Number(statsBody?.totalDocuments ?? 0),
    pending: Number(statsBody?.pending ?? 0),
    verified: Number(statsBody?.verified ?? 0),
    rejected: Number(statsBody?.rejected ?? 0),
    todayUploads: Number(statsBody?.todayUploads ?? 0),
    storageUsed: String(statsBody?.storageUsed ?? "0 MB"),
  };

  // Safe Documents Extraction
  const responseBody = docsRes?.data?.data || docsRes?.data || {};
  const documentsList = Array.isArray(responseBody?.data)
    ? responseBody.data
    : Array.isArray(responseBody)
    ? responseBody
    : [];

  const totalCount = Number(responseBody?.total ?? documentsList.length);
  const totalPages = Number(responseBody?.totalPages ?? Math.max(1, Math.ceil(totalCount / 10)));
  const currentPage = Number(responseBody?.page ?? page);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && Array.isArray(documentsList)) {
      setSelectedDocIds(documentsList.map((d: any) => d?.id).filter(Boolean));
    } else {
      setSelectedDocIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (!id) return;
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter((item) => item !== id));
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  const handleExport = async () => {
    try {
      const res = await documentsApi.exportDocuments({ search, type: typeFilter, status: statusFilter });
      const exportData = res?.data?.data || res?.data || [];
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documents-report-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
    } catch (err) {
      alert("Failed to export documents dataset.");
    }
  };

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Enterprise Document Verification</h1>
          <p className="text-xs text-gray-500 mt-1">Manage, verify, and audit all student admission documents in real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors shadow-xs"
            title="Refresh List"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2"
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Module Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveModule("DOCS")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeModule === "DOCS"
              ? "bg-[#4A7B5B] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <FileText size={15} /> Document Verification Queue
        </button>
        <button
          onClick={() => setActiveModule("DELETION_REQUESTS")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeModule === "DELETION_REQUESTS"
              ? "bg-[#4A7B5B] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Trash2 size={15} /> Deletion Requests (45-Day Retention)
        </button>
        <button
          onClick={() => setActiveModule("AUDIT_LOGS")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeModule === "AUDIT_LOGS"
              ? "bg-[#4A7B5B] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <ShieldAlert size={15} /> Access & Security Audit Logs
        </button>
      </div>

      {activeModule === "DOCS" && (
        <div className="space-y-6">
          {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Documents", value: stats.totalDocuments, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Verified", value: stats.verified, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Today's Uploads", value: stats.todayUploads, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Storage Used", value: stats.storageUsed, icon: HardDrive, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className={`w-8 h-8 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-2`}>
              <card.icon size={16} />
            </div>
            <div className="text-xl font-black text-slate-900">{card.value}</div>
            <div className="text-[11px] text-gray-500 font-medium">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Queue Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: "", label: "All Documents", count: stats.totalDocuments },
          { id: "UPLOADED", label: "Pending Verification", count: stats.pending },
          { id: "UNDER_VERIFICATION", label: "Claimed / Under Review" },
          { id: "REJECTED", label: "Correction Required / Rejected", count: stats.rejected },
          { id: "VERIFIED", label: "Verified Compliant", count: stats.verified },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusFilter(tab.id);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              statusFilter === tab.id
                ? "bg-[#4A7B5B] text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  statusFilter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by student name, email, mobile, application ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] transition-all"
            />
          </div>

          {/* Document Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none"
          >
            <option value="">All Document Types</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        {/* Bulk Action Controls */}
        {selectedDocIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl animate-in fade-in">
            <span className="text-xs font-bold text-blue-900">
              {selectedDocIds.length} document(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => bulkVerifyMutation.mutate({ status: "VERIFIED" })}
                disabled={bulkVerifyMutation.isPending}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
              >
                Bulk Approve
              </button>
              <button
                onClick={() => {
                  const reason = prompt("Enter bulk rejection reason:");
                  if (reason) bulkVerifyMutation.mutate({ status: "REJECTED", rejectedReason: reason });
                }}
                disabled={bulkVerifyMutation.isPending}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors"
              >
                Bulk Reject
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Document Table */}
      {isLoading ? (
        <div className="text-center py-24 text-gray-500 bg-white rounded-2xl border border-slate-200/80">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          Loading documents records...
        </div>
      ) : documentsList.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-900">No documents found</h3>
          <p className="text-gray-500 text-xs mt-1">Try adjusting your search parameters or filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={documentsList.length > 0 && selectedDocIds.length === documentsList.length}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3.5">Student Info</th>
                  <th className="px-4 py-3.5">Application</th>
                  <th className="px-4 py-3.5">Document Details</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Uploaded Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {documentsList.map((doc: any) => {
                  if (!doc) return null;
                  const docId = doc?.id ?? Math.random().toString();
                  const isSelected = selectedDocIds.includes(docId);
                  const studentName = doc?.user?.fullName ?? "Student";
                  const studentInitial = typeof studentName === "string" && studentName.length > 0 ? studentName.charAt(0).toUpperCase() : "S";
                  const studentEmail = doc?.user?.email ?? "No email";
                  const studentMobile = doc?.user?.mobile ?? "";
                  const appId = doc?.application?.applicationId ?? null;
                  const collegeName = doc?.application?.college?.name ?? doc?.college?.name ?? "-";
                  const title = doc?.title ?? (typeof doc?.type === "string" ? doc.type.replace(/_/g, " ") : "Document");
                  const version = doc?.version ?? 1;
                  const ext = typeof doc?.extension === "string" ? doc.extension.toUpperCase() : "FILE";
                  const status = doc?.status ?? "UPLOADED";
                  const uploadedAtFormatted = doc?.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "-";

                  return (
                    <tr
                      key={docId}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-blue-50/30" : ""}`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(docId)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Student Info */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                            {studentInitial}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{studentName}</div>
                            <div className="text-[11px] text-gray-500">{studentEmail} · {studentMobile}</div>
                          </div>
                        </div>
                      </td>

                      {/* Application Info */}
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-800">
                          {appId ? (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[11px]">
                              {appId}
                            </span>
                          ) : (
                            <span className="text-gray-400">Direct Upload</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate max-w-[180px]">
                          {collegeName}
                        </div>
                      </td>

                      {/* Document Details */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-blue-600 shrink-0" />
                          <div>
                            <div className="font-bold text-gray-900">{title}</div>
                            <div className="text-[11px] text-gray-500">v{version} · {ext}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            status === "VERIFIED"
                              ? "bg-emerald-100 text-emerald-800"
                              : status === "REJECTED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Upload Date */}
                      <td className="px-4 py-4 text-gray-600 font-medium">
                        {uploadedAtFormatted}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedDocId(docId)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 rounded-lg transition-colors text-xs flex items-center gap-1"
                          >
                            <Eye size={14} /> Review
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Approve this document?")) {
                                verifyMutation.mutate({ id: docId, status: "VERIFIED" });
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt("Enter rejection reason:");
                              if (reason) {
                                verifyMutation.mutate({ id: docId, status: "REJECTED", rejectedReason: reason });
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200/80 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-gray-500 font-medium">
              Showing Page {currentPage} of {totalPages} ({totalCount} items)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      )}

      {/* DELETION REQUESTS MODULE */}
      {activeModule === "DELETION_REQUESTS" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Trash2 className="text-rose-600" size={20} />
                Student Document Deletion Requests
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Statutory 45-day retention queue and regulatory compliance reviews.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => refetchDeletionRequests()}
                disabled={isDelLoading}
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors shadow-xs"
                title="Refresh Requests"
              >
                <RefreshCw size={15} className={isDelLoading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => {
                  if (confirm("Execute automatic retention cleanup now? This will permanently delete documents whose 45-day request or 90-day post-admission deadline has arrived, skipping any documents under active retention holds.")) {
                    runRetentionCleanupMutation.mutate();
                  }
                }}
                disabled={runRetentionCleanupMutation.isPending}
                className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                <Play size={14} /> {runRetentionCleanupMutation.isPending ? "Executing..." : "Run 45/90-Day Retention Cleanup"}
              </button>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: "", label: "All Requests" },
              { id: "PENDING_REVIEW", label: "Pending Review" },
              { id: "SCHEDULED_FOR_DELETION", label: "Scheduled for Deletion" },
              { id: "ON_HOLD", label: "Retention Hold" },
              { id: "APPROVED", label: "Approved" },
              { id: "REJECTED", label: "Rejected" },
              { id: "DELETED", label: "Permanently Deleted" },
              { id: "CANCELLED", label: "Cancelled by Student" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setDelStatusFilter(tab.id);
                  setDelPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  delStatusFilter === tab.id
                    ? "bg-[#4A7B5B] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Deletion Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3.5">Request ID</th>
                    <th className="px-4 py-3.5">Student Info</th>
                    <th className="px-4 py-3.5">Application</th>
                    <th className="px-4 py-3.5">Requested Document(s)</th>
                    <th className="px-4 py-3.5">Reason & Details</th>
                    <th className="px-4 py-3.5">Request Date</th>
                    <th className="px-4 py-3.5">Scheduled Deletion</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(() => {
                    const reqs = Array.isArray(deletionRequestsRes?.data?.data)
                      ? deletionRequestsRes.data.data
                      : Array.isArray(deletionRequestsRes?.data)
                      ? (deletionRequestsRes.data as any)
                      : [];

                    if (isDelLoading) {
                      return (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            Loading deletion requests...
                          </td>
                        </tr>
                      );
                    }

                    if (reqs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            No document deletion requests found matching current filter.
                          </td>
                        </tr>
                      );
                    }

                    return reqs.map((req: any) => {
                      const reqId = req.id || "";
                      const studentName = req.student?.fullName || req.student?.name || "Student";
                      const studentId = req.student?.officialStudentId || req.student?.studentId || req.officialStudentId || req.student?.officialId || "SWY-STU-PENDING";
                      const email = req.student?.email || "";
                      const appId = req.application?.applicationId || req.applicationId || "General Vault";
                      const items = Array.isArray(req.items) ? req.items : [];
                      const status = req.status || "PENDING_REVIEW";

                      return (
                        <tr key={reqId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-4 font-mono font-bold text-slate-800">
                            {reqId.slice(0, 10).toUpperCase()}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-bold text-slate-900">{studentName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{studentId}</div>
                            <div className="text-[10px] text-slate-400">{email}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono">
                              {appId}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {items.map((item: any, idx: number) => {
                                const docTitle = item.document?.title || (typeof item.document?.type === 'string' ? item.document.type.replace(/_/g, ' ') : 'Document');
                                return (
                                  <span key={idx} className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-medium">
                                    {docTitle}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-4 max-w-[200px]">
                            <div className="font-semibold text-slate-800">{req.reason}</div>
                            {req.additionalDetails && (
                              <div className="text-[11px] text-slate-500 truncate" title={req.additionalDetails}>
                                {req.additionalDetails}
                              </div>
                            )}
                            {req.rejectionReason && (
                              <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                                Rejection: {req.rejectionReason}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 font-medium text-slate-700">
                            {formatDDMMYYYY(req.requestedAt)}
                          </td>
                          <td className="px-4 py-4 font-bold text-rose-700">
                            {formatDDMMYYYY(req.scheduledDeletionAt)}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              status === 'SCHEDULED_FOR_DELETION' || status === 'APPROVED'
                                ? 'bg-amber-100 text-amber-800'
                                : status === 'ON_HOLD'
                                ? 'bg-purple-100 text-purple-800'
                                : status === 'DELETED'
                                ? 'bg-slate-200 text-slate-700'
                                : status === 'REJECTED' || status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {status !== 'DELETED' && status !== 'CANCELLED' && (
                              <button
                                onClick={() => {
                                  setReviewingReq(req);
                                  setReviewAction("APPROVE");
                                  setReviewReason("");
                                }}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors"
                              >
                                Review
                              </button>
                            )}
                            {status === 'DELETED' && (
                              <button
                                onClick={() => {
                                  setResendingReq(req);
                                  setSelectedChannels(["WEBSITE", "EMAIL", "WHATSAPP", "SMS"]);
                                }}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                                title="Resend deletion confirmation notification"
                              >
                                <Send size={12} /> Resend Notification
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOGS MODULE */}
      {activeModule === "AUDIT_LOGS" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="text-emerald-700" size={20} />
                Document Vault Access & Security Audit Logs
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Cryptographically audited tracking of all view, preview, download, and modification events.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => refetchAuditLogs()}
                disabled={isAuditLoading}
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors shadow-xs"
                title="Refresh Audit Logs"
              >
                <RefreshCw size={15} className={isAuditLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Audit Filters Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap gap-3 items-center">
            <div>
              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="">All Actions</option>
                <option value="VIEW">VIEW</option>
                <option value="PREVIEW">PREVIEW (Watermarked)</option>
                <option value="DOWNLOAD">DOWNLOAD (Watermarked)</option>
                <option value="UPLOAD">UPLOAD</option>
                <option value="REPLACE">REPLACE</option>
                <option value="VERIFY">VERIFY</option>
                <option value="REJECT">REJECT</option>
                <option value="DELETE_REQUEST">DELETE_REQUEST</option>
                <option value="DELETE_EXECUTED">DELETE_EXECUTED</option>
                <option value="DELETION_SKIPPED_HOLD">DELETION_SKIPPED_HOLD</option>
                <option value="ACCESS_DENIED">ACCESS_DENIED (Security Alert)</option>
              </select>
            </div>

            <div>
              <select
                value={auditResultFilter}
                onChange={(e) => {
                  setAuditResultFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="">All Results</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="DENIED">DENIED</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3.5">Timestamp (DD/MM/YYYY)</th>
                    <th className="px-4 py-3.5">Action</th>
                    <th className="px-4 py-3.5">Result</th>
                    <th className="px-4 py-3.5">Actor Role & Staff ID</th>
                    <th className="px-4 py-3.5">Target Student ID</th>
                    <th className="px-4 py-3.5">Document ID</th>
                    <th className="px-4 py-3.5">IP Address</th>
                    <th className="px-4 py-3.5">Reason / Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(() => {
                    const logs = Array.isArray(auditLogsRes?.data?.data)
                      ? auditLogsRes.data.data
                      : Array.isArray(auditLogsRes?.data)
                      ? (auditLogsRes.data as any)
                      : [];

                    if (isAuditLoading) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            Loading audit logs...
                          </td>
                        </tr>
                      );
                    }

                    if (logs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            No access audit events recorded matching current filter.
                          </td>
                        </tr>
                      );
                    }

                    return logs.map((log: any) => {
                      const isSuccess = log.result === "SUCCESS";
                      const isDenied = log.result === "DENIED" || log.action === "ACCESS_DENIED";

                      return (
                        <tr key={log.id} className={`hover:bg-slate-50/80 transition-colors ${isDenied ? 'bg-rose-50/20' : ''}`}>
                          <td className="px-4 py-4 font-mono font-medium text-slate-700">
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="px-4 py-4 font-bold text-slate-900">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[11px]">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isSuccess ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {log.result}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900">{log.actorRole}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Staff ID: {log.staffId || log.actorUserId || "N/A"}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-mono text-slate-700">
                            {log.student?.officialStudentId || log.student?.studentId || (log.studentId ? `STU-${log.studentId.slice(0, 8)}` : "-")}
                          </td>
                          <td className="px-4 py-4 font-mono text-slate-600 text-[11px]">
                            {log.documentId ? log.documentId.slice(0, 10) : "-"}
                          </td>
                          <td className="px-4 py-4 font-mono text-slate-500 text-[11px]">
                            {log.ipAddress || "-"}
                          </td>
                          <td className="px-4 py-4 text-slate-600 max-w-[200px] truncate" title={log.reason || ""}>
                            {log.reason || (log.metadata?.isWatermarked ? "Watermarked Staff Copy" : "-")}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Review Deletion Request Modal */}
      {reviewingReq && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" /> Review Deletion Request
              </h3>
              <button
                onClick={() => setReviewingReq(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Student:</span>
                <span className="font-bold text-gray-900">{reviewingReq.student?.fullName || reviewingReq.student?.name || "Student"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Official Student ID:</span>
                <span className="font-mono font-bold text-gray-900">{reviewingReq.student?.officialStudentId || reviewingReq.student?.studentId || reviewingReq.officialStudentId || reviewingReq.student?.officialId || "SWY-STU-PENDING"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reason:</span>
                <span className="font-semibold text-gray-900">{reviewingReq.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Scheduled Deletion:</span>
                <span className="font-bold text-rose-700">{formatDDMMYYYY(reviewingReq.scheduledDeletionAt)}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Administrative Action *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction("APPROVE")}
                    className={`py-2 px-2 rounded-xl font-bold text-center border transition-all ${
                      reviewAction === "APPROVE"
                        ? "bg-emerald-600 text-white border-transparent shadow-xs"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction("HOLD")}
                    className={`py-2 px-2 rounded-xl font-bold text-center border transition-all ${
                      reviewAction === "HOLD"
                        ? "bg-purple-600 text-white border-transparent shadow-xs"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Place On Hold
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction("REJECT")}
                    className={`py-2 px-2 rounded-xl font-bold text-center border transition-all ${
                      reviewAction === "REJECT"
                        ? "bg-rose-600 text-white border-transparent shadow-xs"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  {reviewAction === "REJECT" ? "Rejection Reason *" : reviewAction === "HOLD" ? "Retention Hold Reason *" : "Optional Internal Review Notes"}
                </label>
                <textarea
                  rows={2}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder={
                    reviewAction === "REJECT"
                      ? "Enter mandatory rejection reason explained to the student..."
                      : reviewAction === "HOLD"
                      ? "Specify legal, verification, audit, or dispute retention hold reason..."
                      : "Optional notes for the audit trail..."
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-1 focus:ring-[#4A7B5B]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingReq(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (reviewAction === "REJECT" && !reviewReason.trim()) {
                      alert("Please provide a reason for rejecting the deletion request.");
                      return;
                    }
                    if (reviewAction === "HOLD" && !reviewReason.trim()) {
                      alert("Please provide a valid retention hold reason.");
                      return;
                    }
                    reviewMutation.mutate({
                      id: reviewingReq.id,
                      data: {
                        action: reviewAction,
                        rejectionReason: reviewAction === "REJECT" ? reviewReason.trim() : undefined,
                        holdReason: reviewAction === "HOLD" ? reviewReason.trim() : undefined,
                      },
                    });
                  }}
                  disabled={reviewMutation.isPending}
                  className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white font-bold text-xs rounded-xl transition-all shadow-xs disabled:opacity-50"
                >
                  {reviewMutation.isPending ? "Updating..." : "Save Review Decision"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resend Notification Modal */}
      {resendingReq && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Bell size={16} className="text-emerald-700" />
                Resend Deletion Confirmation Notification
              </h3>
              <button
                onClick={() => setResendingReq(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Student:</span>
                <span className="font-bold text-gray-900">{resendingReq.student?.fullName || resendingReq.student?.name || "Student"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Official Student ID:</span>
                <span className="font-mono font-bold text-gray-900">{resendingReq.student?.officialStudentId || resendingReq.student?.studentId || resendingReq.officialStudentId || resendingReq.student?.officialId || "SWY-STU-PENDING"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Request ID:</span>
                <span className="font-mono font-bold text-slate-800">{resendingReq.id?.slice(0, 10).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Database Status:</span>
                <span className="font-bold text-emerald-700">PERMANENTLY DELETED</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900 text-[11px]">
              The database confirms this document deletion has already executed. You can dispatch privacy-safe deletion confirmation notices across enabled communication channels.
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-gray-700 font-bold mb-1">Select Delivery Channels *</label>
              {[
                { id: "WEBSITE", label: "Website (In-App Dashboard Notification)" },
                { id: "EMAIL", label: "Email (Official Confirmation)" },
                { id: "WHATSAPP", label: "WhatsApp (Safe Template Notice)" },
                { id: "SMS", label: "SMS (Short Privacy Text)" },
              ].map((ch) => {
                const isChecked = selectedChannels.includes(ch.id);
                return (
                  <label key={ch.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedChannels([...selectedChannels, ch.id]);
                        } else {
                          setSelectedChannels(selectedChannels.filter((c) => c !== ch.id));
                        }
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-gray-800 font-medium">{ch.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResendingReq(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedChannels.length === 0) {
                    alert("Please select at least one delivery channel.");
                    return;
                  }
                  resendNotificationMutation.mutate({
                    id: resendingReq.id,
                    channels: selectedChannels,
                  });
                }}
                disabled={resendNotificationMutation.isPending || selectedChannels.length === 0}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send size={13} />
                {resendNotificationMutation.isPending ? "Dispatching..." : "Send Notification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <DocumentDetailDrawer
        documentId={selectedDocId}
        onClose={() => setSelectedDocId(null)}
      />
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <ErrorBoundary fallbackTitle="Document Management Runtime Error">
      <DocumentsPageInner />
    </ErrorBoundary>
  );
}
