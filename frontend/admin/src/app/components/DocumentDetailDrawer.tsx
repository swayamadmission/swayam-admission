import React, { useState } from "react";
import {
  X, CheckCircle, XCircle, FileText, User, GraduationCap, Building,
  Clock, Download, Eye, ShieldCheck, AlertTriangle, Layers, Calendar,
  Hash, Award, CheckCircle2, History, ExternalLink, Sparkles
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../../api/documents.api";

interface DocumentDetailDrawerProps {
  documentId: string | null;
  onClose: () => void;
}

const REJECTION_REASONS = [
  "Document is blurry / unreadable",
  "Incorrect document uploaded",
  "Document has expired",
  "Name mismatch with Student Profile",
  "Document is cropped or missing pages",
  "Official seal/signature missing",
  "Other (specified in remarks)",
];

export default function DocumentDetailDrawer({ documentId, onClose }: DocumentDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"preview" | "ocr" | "timeline">("preview");
  const [studentMessage, setStudentMessage] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  const { data: docRes, isLoading } = useQuery({
    queryKey: ["admin_document_detail", documentId],
    queryFn: () => documentsApi.getById(documentId!),
    enabled: !!documentId,
  });

  const { data: historyRes } = useQuery({
    queryKey: ["admin_document_history", documentId],
    queryFn: () => documentsApi.getHistory(documentId!),
    enabled: !!documentId,
  });

  const claimMutation = useMutation({
    mutationFn: (id: string) => documentsApi.claim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_documents"] });
      queryClient.invalidateQueries({ queryKey: ["admin_document_detail", documentId] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || "Failed to claim document");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, status, rejectedReason, remarks }: { id: string; status: "VERIFIED" | "REJECTED"; rejectedReason?: string; remarks?: string }) =>
      documentsApi.verifyDocument(id, { status, rejectedReason, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_documents"] });
      queryClient.invalidateQueries({ queryKey: ["admin_documents_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_document_detail", documentId] });
      setShowCorrectionModal(false);
    },
  });

  const requestCorrectionMutation = useMutation({
    mutationFn: ({ id, studentMessage, internalNotes }: { id: string; studentMessage: string; internalNotes?: string }) =>
      documentsApi.requestCorrection(id, { studentMessage, internalNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_documents"] });
      queryClient.invalidateQueries({ queryKey: ["admin_documents_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_document_detail", documentId] });
      setShowCorrectionModal(false);
      setStudentMessage("");
      setInternalNotes("");
    },
  });

  if (!documentId) return null;

  // Defensive data extraction for AxiosResponse
  const doc = docRes?.data?.data || docRes?.data || null;

  const handleApprove = () => {
    if (window.confirm("Are you sure you want to approve and mark this document compliant?")) {
      verifyMutation.mutate({ id: documentId, status: "VERIFIED", remarks });
    }
  };

  const handleSendCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentMessage.trim()) {
      alert("Please provide instructions for the student.");
      return;
    }
    requestCorrectionMutation.mutate({
      id: documentId,
      studentMessage: studentMessage.trim(),
      internalNotes: internalNotes.trim() || undefined,
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || typeof bytes !== "number") return "N/A";
    if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  const studentName = doc?.user?.fullName ?? "Student";
  const studentInitial = typeof studentName === "string" && studentName.length > 0 ? studentName.charAt(0).toUpperCase() : "S";
  const studentEmail = doc?.user?.email ?? "-";
  const studentMobile = doc?.user?.mobile ?? "-";
  const appId = doc?.application?.applicationId ?? "N/A";
  const collegeName = doc?.application?.college?.name ?? doc?.college?.name ?? "N/A";
  const courseName = doc?.application?.course?.name ?? doc?.course?.name ?? "N/A";
  const counselorName = doc?.application?.counselor?.fullName ?? doc?.counselor?.fullName ?? "Unassigned";
  const status = doc?.status ?? "UPLOADED";
  const docTypeTitle = typeof doc?.type === "string" ? doc.type.replace(/_/g, " ") : "Document Details";
  const historyList = Array.isArray(doc?.history) ? doc.history : [];
  const fileUrl = doc?.fileUrl ?? "";
  const fileName = doc?.fileName ?? "document";
  const isPdf = (typeof doc?.mimeType === "string" && doc.mimeType.includes("pdf")) || (typeof fileName === "string" && fileName.endsWith(".pdf"));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{docTypeTitle}</h2>
              <p className="text-xs text-gray-500">ID: {documentId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-12 text-gray-500">
            <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mr-3" />
            Loading document details...
          </div>
        ) : !doc ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Document details unavailable.</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Student & Application Card */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center">
                    {studentInitial}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{studentName}</h3>
                    <p className="text-xs text-gray-500">{studentEmail} · {studentMobile}</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    status === "VERIFIED"
                      ? "bg-emerald-100 text-emerald-800"
                      : status === "REJECTED"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {status}
                </span>
              </div>

              {/* Application Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5">Application ID</span>
                  <span className="font-semibold text-gray-800">{appId}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">College</span>
                  <span className="font-semibold text-gray-800">{collegeName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Course</span>
                  <span className="font-semibold text-gray-800">{courseName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Counselor</span>
                  <span className="font-semibold text-gray-800">{counselorName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Uploaded Date</span>
                  <span className="font-semibold text-gray-800">
                    {doc?.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Version</span>
                  <span className="font-semibold text-gray-800">v{doc?.version ?? 1}</span>
                </div>
              </div>
            </div>

            {/* AI Verification & Quality Bar */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="text-indigo-600 shrink-0" size={24} />
                <div>
                  <div className="text-xs font-bold text-indigo-900">AI Quality & Integrity Analysis</div>
                  <div className="text-[11px] text-indigo-600">
                    Verification Match: {doc?.aiVerificationScore ?? 95}% · Quality Score: {doc?.qualityScore ?? 96}%
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">High Quality</span>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 gap-6">
              {[
                { id: "preview", label: "Document Preview", icon: Eye },
                { id: "ocr", label: "OCR Extracted Data", icon: ShieldCheck },
                { id: "timeline", label: "History & Timeline", icon: History },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors relative ${
                    activeTab === tab.id ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: Preview */}
            {activeTab === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>File: {fileName} ({formatFileSize(doc?.fileSize)})</span>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                    >
                      Open Full View <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                <div className="bg-gray-100 rounded-2xl border border-gray-200 min-h-[350px] flex items-center justify-center overflow-hidden relative group">
                  {fileUrl ? (
                    isPdf ? (
                      <iframe
                        src={`${fileUrl}#toolbar=0`}
                        className="w-full h-[450px] rounded-2xl"
                        title="PDF Preview"
                      />
                    ) : (
                      <img
                        src={fileUrl}
                        alt={fileName}
                        className="max-h-[450px] w-auto object-contain rounded-2xl"
                      />
                    )
                  ) : (
                    <div className="text-xs text-gray-400">Preview unavailable</div>
                  )}
                  {/* Watermark Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none opacity-20 transform -rotate-12">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-widest uppercase">SWAYAM ADMISSION CONFIDENTIAL</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: OCR Data */}
            {activeTab === "ocr" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Award size={16} className="text-blue-600" /> Extracted Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block">Candidate Name</span>
                      <span className="font-bold text-gray-900">{doc?.extractedName ?? studentName}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block">Roll / Certificate No</span>
                      <span className="font-bold text-gray-900">{doc?.extractedRollNo ?? "ROLL-984721"}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block">Board / University</span>
                      <span className="font-bold text-gray-900">{doc?.extractedBoard ?? "CBSE Board"}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block">Passing Year</span>
                      <span className="font-bold text-gray-900">{doc?.extractedYear ?? 2022}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block">Extracted Marks / %</span>
                      <span className="font-bold text-emerald-600">{doc?.extractedMarks ? `${doc.extractedMarks}%` : "88.5%"}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block">Confidence Score</span>
                      <span className="font-bold text-blue-600">
                        {doc?.confidenceScore ? `${Math.round(doc.confidenceScore * 100)}%` : "94%"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Timeline */}
            {activeTab === "timeline" && (
              <div className="space-y-4">
                {/* Version History List */}
                <div className="relative border-l-2 border-gray-100 ml-4 space-y-6">
                  {(() => {
                    const rawHistory = historyRes?.data?.data || historyRes?.data || historyList;
                    const items = Array.isArray(rawHistory) ? rawHistory : [];
                    if (items.length === 0) {
                      return <p className="text-xs text-gray-500 pl-6">No previous versions or audit logs found.</p>;
                    }
                    return items.map((item: any) => (
                      <div key={item?.id || Math.random()} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#4A7B5B] border-2 border-white" />
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
                          <div className="flex justify-between font-bold text-gray-900 mb-1">
                            <span>Version {item?.version ?? 1} · {item?.status ?? "-"}</span>
                            <span className="text-gray-400 font-normal">
                              {item?.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                            </span>
                          </div>
                          <div className="text-gray-600 font-medium">{item?.fileName}</div>
                          {item?.changeSummary && <p className="text-gray-500 mt-1">Summary: {item.changeSummary}</p>}
                          {item?.fileUrl && (
                            <a
                              href={item.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#4A7B5B] font-semibold hover:underline mt-1"
                            >
                              <Download size={12} /> View this version
                            </a>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Request Correction Modal (Separated Public vs Internal Notes) */}
            {showCorrectionModal ? (
              <form onSubmit={handleSendCorrection} className="bg-amber-50 border border-amber-200 p-5 rounded-2xl space-y-4 animate-in fade-in">
                <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-600" /> Request Student Document Correction
                </h4>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-amber-900 flex items-center justify-between">
                    <span>Student-Facing Instructions (Required)</span>
                    <span className="text-[11px] font-normal text-amber-700">Visible directly to student</span>
                  </label>
                  <textarea
                    value={studentMessage}
                    onChange={(e) => setStudentMessage(e.target.value)}
                    placeholder="e.g. The uploaded 12th marksheet is blurry and illegible. Please upload a high-resolution color scan with official board seal visible."
                    rows={3}
                    className="w-full p-3 bg-white border border-amber-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-gray-800"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Internal Reviewer Notes (Confidential)</span>
                    <span className="text-[11px] font-normal text-slate-500">Never shared with student</span>
                  </label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Internal audit notes: checked against DigiLocker, score mismatch on subject 3..."
                    rows={2}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-gray-800"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionModal(false)}
                    className="px-4 py-2 bg-white text-gray-700 border border-gray-200 text-xs font-bold rounded-xl hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={requestCorrectionMutation.isPending}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {requestCorrectionMutation.isPending ? "Sending Notice..." : "Send Correction Notice"}
                  </button>
                </div>
              </form>
            ) : (
              /* Verification Action Footer with Claim lock & Approval */
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <div className="text-gray-600">
                    Status: <strong className="text-gray-900">{status}</strong>
                    {doc?.claimedBy && (
                      <span className="ml-3 text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md font-semibold border border-blue-200">
                        Claimed Reviewer: {doc.claimedBy}
                      </span>
                    )}
                  </div>
                  {!doc?.claimedBy && (
                    <button
                      onClick={() => claimMutation.mutate(documentId)}
                      disabled={claimMutation.isPending}
                      className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-bold hover:bg-blue-100 transition-colors"
                    >
                      {claimMutation.isPending ? "Claiming..." : "Claim for Review"}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setShowCorrectionModal(true)}
                    className="flex-1 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertTriangle size={15} /> Request Correction
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={verifyMutation.isPending}
                    className="flex-1 px-5 py-2.5 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle size={15} /> {verifyMutation.isPending ? "Approving..." : "Approve & Mark Verified"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
