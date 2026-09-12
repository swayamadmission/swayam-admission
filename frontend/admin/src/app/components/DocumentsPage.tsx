import React, { useState } from "react";
import {
  CheckCircle, XCircle, Search, FolderOpen, FileText, Download,
  Eye, RefreshCw, Clock, TrendingUp, HardDrive
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
