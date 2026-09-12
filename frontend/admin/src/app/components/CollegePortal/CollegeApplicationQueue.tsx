import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  UserCheck,
  Eye,
  X,
  FileCheck,
  ShieldCheck,
  Send,
  Lock,
} from "lucide-react";
import api from "../../../api/axios";

interface CollegeApplicationQueueProps {
  collegeId: string;
}

export const CollegeApplicationQueue: React.FC<CollegeApplicationQueueProps> = ({
  collegeId,
}) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [activeActionTab, setActiveActionTab] = useState<"approve" | "correction" | "reject">("approve");

  // Action form state
  const [decisionNotes, setDecisionNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [publicRejectionReason, setPublicRejectionReason] = useState("");
  const [correctionSection, setCorrectionSection] = useState("ACADEMIC");
  const [correctionReason, setCorrectionReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/applications/admission-review/queue", {
        params: {
          collegeId,
          status: statusFilter || undefined,
          search: search || undefined,
        },
      });
      if (res.data?.success) {
        setApplications(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load application queue", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (collegeId) {
      loadApplications();
    }
  }, [collegeId, statusFilter]);

  const handleClaimReview = async (appId: string) => {
    try {
      await api.post(`/applications/${appId}/review/claim`, { priority: "NORMAL" });
      loadApplications();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to claim review");
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    try {
      setSubmittingAction(true);
      await api.post(`/applications/${selectedApp.id}/admission/approve`, {
        decisionNotes,
      });
      setSelectedApp(null);
      setDecisionNotes("");
      loadApplications();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to approve admission");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRequestCorrection = async () => {
    if (!selectedApp) return;
    try {
      setSubmittingAction(true);
      await api.post(`/applications/${selectedApp.id}/correction`, {
        affectedSection: correctionSection,
        reason: correctionReason,
      });
      setSelectedApp(null);
      setCorrectionReason("");
      loadApplications();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to request correction");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    try {
      setSubmittingAction(true);
      await api.post(`/applications/${selectedApp.id}/admission/reject`, {
        rejectionReason,
        publicRejectionReason: publicRejectionReason || undefined,
        rejectionCategory: "ELIGIBILITY",
      });
      setSelectedApp(null);
      setRejectionReason("");
      setPublicRejectionReason("");
      loadApplications();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reject application");
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">
            College Admission Review Queue
          </h2>
          <p className="text-xs text-[#64748B]">
            Process applicant admission decisions, verify documents, and allocate program seats.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, application # or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadApplications()}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 bg-white text-[#64748B]"
          >
            <option value="">All Review Statuses</option>
            <option value="SUBMITTED">Submitted (Unclaimed)</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="CORRECTION_REQUIRED">Correction Required</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[#64748B]">Loading admission queue...</div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-[#64748B] space-y-3">
            <FileText className="w-10 h-10 mx-auto text-[#94A3B8]" />
            <p className="font-medium text-[#0F172A]">No applications in queue</p>
            <p className="text-xs">Incoming student applications will appear here for review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Application #</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Program / Branch</th>
                  <th className="py-3.5 px-4">Reviewer</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">SLA / Age</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-[#F8FAFC]/70 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#4A7B5B]">
                      {app.applicationNumber || app.applicationId || app.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#0F172A]">
                        {app.user?.fullName || "Applicant"}
                      </div>
                      <div className="text-xs text-[#64748B]">
                        {app.user?.mobile || app.user?.email || "No contact"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#0F172A]">
                      {app.course?.name || "Course N/A"}
                      <div className="text-xs text-[#64748B]">
                        {app.branch?.name || "General"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {app.reviewer ? (
                        <span className="text-xs font-medium text-slate-800 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {app.reviewer.fullName || app.reviewer.email}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaimReview(app.id)}
                          className="px-2 py-1 text-xs font-medium bg-[#E8F3EC] text-[#4A7B5B] hover:bg-[#D5EADB] rounded-lg transition"
                        >
                          Claim Review
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          app.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : app.status === "UNDER_REVIEW"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : app.status === "CORRECTION_REQUIRED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : app.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#64748B]">
                      {app.ageInHours !== undefined ? `${app.ageInHours}h ago` : "Recent"}
                      {app.isOverdue && (
                        <span className="ml-1 text-rose-600 font-bold">(Overdue)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#4A7B5B] text-white hover:bg-[#3D674C] rounded-xl shadow-sm transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review & Decide
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Review Drawer */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-[#E2E8F0] my-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-bold text-[#0F172A] text-lg">
                  Admission Review: {selectedApp.applicationNumber || selectedApp.id}
                </h3>
                <p className="text-xs text-[#64748B]">
                  Candidate: {selectedApp.user?.fullName} • {selectedApp.course?.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate & Academic Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-xl text-xs">
              <div>
                <span className="text-[#64748B] block">Email & Mobile:</span>
                <span className="font-semibold text-[#0F172A]">
                  {selectedApp.user?.email} • {selectedApp.user?.mobile}
                </span>
              </div>
              <div>
                <span className="text-[#64748B] block">Program Selection:</span>
                <span className="font-semibold text-[#0F172A]">
                  {selectedApp.course?.name} ({selectedApp.branch?.name || "General"})
                </span>
              </div>
              <div>
                <span className="text-[#64748B] block">12th / Qualifying Marks:</span>
                <span className="font-semibold text-[#0F172A]">
                  {selectedApp.user?.profile?.twelfthMarks || "Pending Verification"}
                </span>
              </div>
              <div>
                <span className="text-[#64748B] block">Current Status:</span>
                <span className="font-semibold text-emerald-700">
                  {selectedApp.status}
                </span>
              </div>
            </div>

            {/* Decision Tabs */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#E2E8F0] pb-2">
                <button
                  type="button"
                  onClick={() => setActiveActionTab("approve")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    activeActionTab === "approve"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "text-[#64748B] hover:bg-slate-100"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Grant Approval & Seat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveActionTab("correction")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    activeActionTab === "correction"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "text-[#64748B] hover:bg-slate-100"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> Request Correction
                </button>
                <button
                  type="button"
                  onClick={() => setActiveActionTab("reject")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    activeActionTab === "reject"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "text-[#64748B] hover:bg-slate-100"
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5 inline mr-1" /> Reject Admission
                </button>
              </div>

              {activeActionTab === "approve" && (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800">
                    <p className="font-semibold">Atomic Seat Allocation Guarantee:</p>
                    <p>
                      Approving this application will automatically decrement 1 available seat
                      from the offering seat matrix and enable student fee payment.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Admission Decision Remarks (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      placeholder="e.g. Verified 12th PCM marksheet. Candidate meets cutoff criteria."
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleApprove}
                      disabled={submittingAction}
                      className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl shadow-sm transition disabled:opacity-50"
                    >
                      {submittingAction ? "Processing..." : "Confirm Admission Approval"}
                    </button>
                  </div>
                </div>
              )}

              {activeActionTab === "correction" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Affected Application Section *
                    </label>
                    <select
                      value={correctionSection}
                      onChange={(e) => setCorrectionSection(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl"
                    >
                      <option value="ACADEMIC">Academic Marks / Certificate</option>
                      <option value="DOCUMENTS">Document Uploads (Blurry / Expired)</option>
                      <option value="PERSONAL">Personal / Contact Information</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Correction Directive for Student *
                    </label>
                    <textarea
                      rows={3}
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      placeholder="Explain precisely what the student must correct or re-upload..."
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleRequestCorrection}
                      disabled={submittingAction || !correctionReason}
                      className="px-5 py-2 text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 rounded-xl shadow-sm transition disabled:opacity-50"
                    >
                      {submittingAction ? "Sending..." : "Send Correction Request"}
                    </button>
                  </div>
                </div>
              )}

              {activeActionTab === "reject" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Internal Audit Rejection Reason *
                    </label>
                    <textarea
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Internal explanation recorded in audit log..."
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Public Student-Facing Reason (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={publicRejectionReason}
                      onChange={(e) => setPublicRejectionReason(e.target.value)}
                      placeholder="Candidate-friendly polite message displayed on student portal..."
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleReject}
                      disabled={submittingAction || !rejectionReason}
                      className="px-5 py-2 text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-xl shadow-sm transition disabled:opacity-50"
                    >
                      {submittingAction ? "Rejecting..." : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
