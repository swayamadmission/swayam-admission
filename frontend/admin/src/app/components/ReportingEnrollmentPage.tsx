import React, { useState } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  Filter,
  Calendar,
  Building2,
  BookOpen,
  Users,
  Award,
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
  ShieldCheck,
  Send,
  UserCheck,
  GraduationCap,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reportingEnrollmentApi } from "../../api/reporting-enrollment.api";
import { collegesApi } from "../../api/colleges.api";

export default function ReportingEnrollmentPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "all" | "verification_pending" | "correction_required" | "completed"
  >("verification_pending");
  const [search, setSearch] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Selected item for drawer/modal
  const [selectedReporting, setSelectedReporting] = useState<any | null>(null);
  const [verificationSource, setVerificationSource] = useState("MANUAL_VERIFIED");
  const [verificationRemarks, setVerificationRemarks] = useState("");

  // Correction Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [publicCorrectionReason, setPublicCorrectionReason] = useState("");

  // Enrollment Modal State
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [targetEnrollApp, setTargetEnrollApp] = useState<any | null>(null);
  const [enrollRemarks, setEnrollRemarks] = useState("");

  // ==========================================
  // QUERIES
  // ==========================================
  const { data: queueRes, isLoading, refetch } = useQuery({
    queryKey: ["reporting_queue", activeTab, search, selectedCollege, page],
    queryFn: () =>
      reportingEnrollmentApi.getQueue({
        tab: activeTab === "all" ? undefined : activeTab,
        search: search || undefined,
        collegeId: selectedCollege || undefined,
        page,
        limit,
      }),
  });

  const { data: collegesRes } = useQuery({
    queryKey: ["colleges_filter_reporting"],
    queryFn: () => collegesApi.findAll({ limit: 100 }),
  });

  const reportings = queueRes?.data?.data || [];
  const meta = queueRes?.data?.meta || { counts: {}, total: 0, totalPages: 1 };
  const counts = meta.counts || {};
  const colleges = collegesRes?.data?.data || [];

  // ==========================================
  // MUTATIONS
  // ==========================================
  const claimMutation = useMutation({
    mutationFn: (id: string) => reportingEnrollmentApi.claimReporting(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["reporting_queue"] });
      if (selectedReporting && selectedReporting.id === res.data.data.id) {
        setSelectedReporting(res.data.data);
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to claim reporting review");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (payload: { id: string; verificationSource?: string; verificationRemarks?: string }) =>
      reportingEnrollmentApi.verifyReporting(payload.id, {
        verificationSource: payload.verificationSource,
        verificationRemarks: payload.verificationRemarks,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reporting_queue"] });
      setSelectedReporting(null);
      setVerificationRemarks("");
      alert("Campus reporting verified successfully! Application is now ADMISSION_COMPLETED.");
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Verification failed");
    },
  });

  const correctionMutation = useMutation({
    mutationFn: (payload: { id: string; correctionReason: string; publicCorrectionReason?: string }) =>
      reportingEnrollmentApi.requestCorrection(payload.id, {
        correctionReason: payload.correctionReason,
        publicCorrectionReason: payload.publicCorrectionReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reporting_queue"] });
      setCorrectionModalOpen(false);
      setSelectedReporting(null);
      setCorrectionReason("");
      setPublicCorrectionReason("");
      alert("Correction request sent to student successfully.");
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Correction request failed");
    },
  });

  const confirmEnrollmentMutation = useMutation({
    mutationFn: (payload: { applicationId: string; remarks?: string }) =>
      reportingEnrollmentApi.confirmEnrollment(payload.applicationId, { remarks: payload.remarks }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["reporting_queue"] });
      setEnrollModalOpen(false);
      setTargetEnrollApp(null);
      setEnrollRemarks("");
      alert(`🎉 Student officially enrolled! Official Enrollment Number: ${res.data.data.enrollmentNumber}`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Enrollment confirmation failed");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REPORTING_COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "REPORTING_SUBMITTED":
      case "VERIFICATION_PENDING":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "CORRECTION_REQUIRED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "REPORTING_REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Post-Admission Reporting & Enrollment Engine</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/20">
              ERP Phase 6
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Validate student campus reporting, verify college acknowledgements, and confirm official university enrollment.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs self-start"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin text-[#4A7B5B]" : ""} /> Refresh
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Verification</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{counts.verificationPending || 0}</div>
          <span className="text-[11px] text-blue-600 font-medium">Awaiting staff review</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correction Required</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{counts.correctionRequired || 0}</div>
          <span className="text-[11px] text-amber-600 font-medium">Resubmission pending</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reporting Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{counts.completed || 0}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Eligible for final enrollment</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Submissions</span>
            <div className="w-8 h-8 rounded-xl bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center">
              <GraduationCap size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{counts.total || 0}</div>
          <span className="text-[11px] text-slate-400 font-medium">All student applications</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: "verification_pending", label: "Verification Pending", count: counts.verificationPending },
          { id: "correction_required", label: "Correction Required", count: counts.correctionRequired },
          { id: "completed", label: "Reporting Completed & Enrolled", count: counts.completed },
          { id: "all", label: "All Submissions", count: counts.total },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-[#4A7B5B] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by student name, mobile, App ID, Reporting Code, or College Ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20"
          />
        </div>

        <select
          value={selectedCollege}
          onChange={(e) => setSelectedCollege(e.target.value)}
          className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <option value="">All Colleges</option>
          {colleges.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 text-xs">Loading reporting queue...</div>
        ) : reportings.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
            <h3 className="text-sm font-bold text-slate-900">Queue is Clear!</h3>
            <p className="text-slate-400 text-xs mt-1">No campus reporting submissions in this category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Student & App ID</th>
                  <th className="px-5 py-3.5">College & Program</th>
                  <th className="px-5 py-3.5">Reporting Details</th>
                  <th className="px-5 py-3.5">Proof & Reference</th>
                  <th className="px-5 py-3.5">Reviewer & Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportings.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{item.student?.fullName || "Student"}</div>
                      <div className="text-[11px] text-slate-500">{item.student?.email || item.student?.mobile}</div>
                      <div className="text-[10px] text-blue-600 font-mono mt-0.5">
                        App: {item.application?.applicationNumber || item.applicationId}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-800">{item.college?.name || "Institute"}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.course?.name} {item.branch?.name ? `(${item.branch.name})` : ""}
                      </div>
                      <span className="inline-block mt-0.5 text-[10px] text-slate-400 font-mono">
                        Code: {item.reportingCode}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="text-slate-800 font-semibold">Campus: {item.collegeCampus || "Main Campus"}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar size={12} /> Reported:{" "}
                        {item.reportingDate ? new Date(item.reportingDate).toLocaleDateString("en-IN") : "N/A"}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="text-[11px] font-mono text-slate-700 font-bold">
                        Ref: {item.collegeReferenceNumber || "N/A"}
                      </div>
                      {item.proofDocumentUrl ? (
                        <a
                          href={item.proofDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1 mt-1"
                        >
                          <FileText size={12} /> View Proof Slip
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">No document attached</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                      {item.reviewer ? (
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <UserCheck size={12} /> {item.reviewer.fullName || item.reviewer.email}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-1">Unassigned</div>
                      )}
                      {item.enrollment && (
                        <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1 font-mono">
                          <Award size={12} /> {item.enrollment.enrollmentNumber}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedReporting(item)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Eye size={12} /> Review
                        </button>

                        {item.status === "REPORTING_COMPLETED" && !item.enrollment && (
                          <button
                            onClick={() => {
                              setTargetEnrollApp(item);
                              setEnrollModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                          >
                            <GraduationCap size={12} /> Enroll
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Verification Drawer */}
      {selectedReporting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Campus Reporting Verification</h3>
                <span className="text-xs text-slate-400 font-mono">{selectedReporting.reportingCode}</span>
              </div>
              <button
                onClick={() => setSelectedReporting(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Student & College Summary */}
            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Student Name:</span>
                <span className="font-bold text-slate-900">{selectedReporting.student?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Application Number:</span>
                <span className="font-mono font-bold text-blue-600">
                  {selectedReporting.application?.applicationNumber || selectedReporting.applicationId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Target College:</span>
                <span className="font-bold text-slate-900">{selectedReporting.college?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Program:</span>
                <span className="font-semibold text-slate-800">{selectedReporting.course?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Reporting Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(selectedReporting.status)}`}>
                  {selectedReporting.status}
                </span>
              </div>
            </div>

            {/* Campus Reporting Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Submitted Reporting Evidence</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Reporting Date</span>
                  <span className="font-bold text-slate-900">
                    {selectedReporting.reportingDate
                      ? new Date(selectedReporting.reportingDate).toLocaleDateString("en-IN")
                      : "N/A"}
                  </span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">College Campus</span>
                  <span className="font-bold text-slate-900">{selectedReporting.collegeCampus || "Main Campus"}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl col-span-2">
                  <span className="text-slate-400 block text-[10px]">College Reference / Acknowledgement Number</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {selectedReporting.collegeReferenceNumber || "Not Provided"}
                  </span>
                </div>
              </div>

              {selectedReporting.studentRemarks && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-slate-400 block text-[10px]">Student Remarks</span>
                  <p className="text-slate-700 mt-1">{selectedReporting.studentRemarks}</p>
                </div>
              )}

              {selectedReporting.proofDocumentUrl && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Reporting Proof Document</span>
                  <a
                    href={selectedReporting.proofDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4A7B5B] text-white rounded-lg text-xs font-bold hover:bg-[#3d674c]"
                  >
                    <FileText size={13} /> View Attached Proof Document
                  </a>
                </div>
              )}
            </div>

            {/* Verification Inputs */}
            {selectedReporting.status !== "REPORTING_COMPLETED" && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Verification Source & Notes</h4>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Verification Channel / Source *</label>
                    <select
                      value={verificationSource}
                      onChange={(e) => setVerificationSource(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
                    >
                      <option value="COLLEGE_PORTAL">College Admission Portal (Verified)</option>
                      <option value="COLLEGE_ERP">College ERP Direct System</option>
                      <option value="OFFICIAL_EMAIL">Official College Email Confirmation</option>
                      <option value="MANUAL_VERIFIED">Manual Document & Stamp Verification</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Review Remarks (Optional)</label>
                    <textarea
                      rows={2}
                      value={verificationRemarks}
                      onChange={(e) => setVerificationRemarks(e.target.value)}
                      placeholder="e.g. Physical reporting slip verified against college admissions ledger"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
              {!selectedReporting.reviewerId && (
                <button
                  onClick={() => claimMutation.mutate(selectedReporting.id)}
                  disabled={claimMutation.isPending}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  {claimMutation.isPending ? "Claiming..." : "Claim Review"}
                </button>
              )}

              {selectedReporting.status !== "REPORTING_COMPLETED" && (
                <>
                  <button
                    onClick={() => {
                      setCorrectionReason("");
                      setPublicCorrectionReason("");
                      setCorrectionModalOpen(true);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                  >
                    Request Correction
                  </button>

                  <button
                    onClick={() =>
                      verifyMutation.mutate({
                        id: selectedReporting.id,
                        verificationSource,
                        verificationRemarks,
                      })
                    }
                    disabled={verifyMutation.isPending}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    {verifyMutation.isPending ? "Verifying..." : "Verify & Complete Reporting"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Request Correction Modal */}
      {correctionModalOpen && selectedReporting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Request Reporting Correction</h3>
            <p className="text-xs text-slate-500">
              The student will be prompted to re-upload their reporting proof or correct campus details.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                correctionMutation.mutate({
                  id: selectedReporting.id,
                  correctionReason,
                  publicCorrectionReason: publicCorrectionReason || correctionReason,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Student-Facing Correction Message *</label>
                <textarea
                  rows={3}
                  required
                  value={publicCorrectionReason}
                  onChange={(e) => setPublicCorrectionReason(e.target.value)}
                  placeholder="e.g. Uploaded reporting slip is unreadable. Please attach a clear scan with the college official stamp."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Note (Private)</label>
                <input
                  type="text"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Stamp missing on slip"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCorrectionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correctionMutation.isPending}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
                >
                  {correctionMutation.isPending ? "Submitting..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Enrollment Confirmation Modal */}
      {enrollModalOpen && targetEnrollApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <GraduationCap size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Official Enrollment</h3>
                <p className="text-xs text-slate-500">Award final enrollment and complete student admission journey.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 text-xs border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-900">{targetEnrollApp.student?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">College:</span>
                <span className="font-bold text-slate-900">{targetEnrollApp.college?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Program:</span>
                <span className="font-semibold text-slate-800">{targetEnrollApp.course?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reporting Status:</span>
                <span className="text-emerald-700 font-bold">✓ REPORTING_COMPLETED</span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                confirmEnrollmentMutation.mutate({
                  applicationId: targetEnrollApp.applicationId,
                  remarks: enrollRemarks,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Enrollment Remarks / Batch (Optional)</label>
                <input
                  type="text"
                  value={enrollRemarks}
                  onChange={(e) => setEnrollRemarks(e.target.value)}
                  placeholder="e.g. Regular Batch 2026-2030, Section A"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEnrollModalOpen(false);
                    setTargetEnrollApp(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmEnrollmentMutation.isPending}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-xs"
                >
                  {confirmEnrollmentMutation.isPending ? "Confirming..." : "Confirm Final Enrollment 🎓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
