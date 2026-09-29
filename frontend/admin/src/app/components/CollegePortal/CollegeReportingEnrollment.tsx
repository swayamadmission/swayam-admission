import React, { useState, useEffect } from "react";
import {
  Award,
  Search,
  CheckCircle2,
  Calendar,
  UserCheck,
  Building2,
  FileCheck,
  X,
  AlertCircle,
} from "lucide-react";
import api from "../../../api/axios";

interface CollegeReportingEnrollmentProps {
  collegeId: string;
}

export const CollegeReportingEnrollment: React.FC<CollegeReportingEnrollmentProps> = ({
  collegeId,
}) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Form state
  const [rollNumber, setRollNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadReportingRecords = async () => {
    try {
      setLoading(true);
      const res = await api.get("/reporting", {
        params: { collegeId, search: search || undefined },
      });
      if (res.data?.data || res.data) {
        setRecords(res.data.data || res.data || []);
      }
    } catch (err) {
      console.error("Failed to load reporting records", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (collegeId) {
      loadReportingRecords();
    }
  }, [collegeId]);

  const handleVerifyReporting = async (reportingId: string) => {
    try {
      await api.post(`/reporting/${reportingId}/verify`, {
        remarks: "Physical campus reporting and original certificate verification completed.",
      });
      loadReportingRecords();
    } catch (err: any) {
      alert(err.response?.data?.message || "Verification failed");
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      setSubmitting(true);
      await api.post(`/reporting/${selectedRecord.id}/enroll`, {
        rollNumber: rollNumber.trim() || undefined,
        registrationNumber: registrationNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });
      setSelectedRecord(null);
      setRollNumber("");
      setRegistrationNumber("");
      setRemarks("");
      loadReportingRecords();
    } catch (err: any) {
      alert(err.response?.data?.message || "Enrollment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#4A7B5B]">
            Campus Reporting & Student Final Enrollment
          </h2>
          <p className="text-xs text-[#64748B]">
            Verify physical reporting at campus and assign institutional roll numbers.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate name or token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadReportingRecords()}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[#64748B]">Loading reporting records...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-[#64748B] space-y-3">
            <Award className="w-10 h-10 mx-auto text-[#94A3B8]" />
            <p className="font-medium text-[#4A7B5B]">No reporting records found</p>
            <p className="text-xs">
              Admitted students with paid seat confirmation will appear here for physical reporting.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Student Candidate</th>
                  <th className="py-3.5 px-4">Program</th>
                  <th className="py-3.5 px-4">Reporting Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Enrollment Details</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#F8FAFC]/70 transition">
                    <td className="py-3.5 px-4 font-semibold text-[#4A7B5B]">
                      {rec.application?.user?.fullName || rec.studentName || "Candidate"}
                      <div className="text-xs font-normal text-[#64748B]">
                        App #: {rec.application?.applicationNumber || "N/A"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#4A7B5B]">
                      {rec.application?.course?.name || "Academic Program"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#64748B]">
                      {rec.reportingDate
                        ? new Date(rec.reportingDate).toLocaleDateString()
                        : "Scheduled Soon"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          rec.status === "REPORTING_COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : rec.status === "ENROLLED"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {rec.enrollment ? (
                        <div className="space-y-0.5 font-mono text-[#4A7B5B]">
                          <div>Roll: {rec.enrollment.rollNumber || "Assigned"}</div>
                          <div className="text-[#64748B]">Reg: {rec.enrollment.registrationNumber || "N/A"}</div>
                        </div>
                      ) : (
                        <span className="text-[#94A3B8]">Pending Enrollment</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {rec.status !== "REPORTING_COMPLETED" && rec.status !== "ENROLLED" && (
                        <button
                          onClick={() => handleVerifyReporting(rec.id)}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Mark Reported
                        </button>
                      )}

                      {!rec.enrollment && (
                        <button
                          onClick={() => {
                            setSelectedRecord(rec);
                            setRollNumber(`ROLL-${Date.now().toString().slice(-4)}`);
                            setRegistrationNumber(`REG-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#4A7B5B] text-white hover:bg-[#3D674C] rounded-lg transition"
                        >
                          <UserCheck className="w-3.5 h-3.5 inline mr-1" /> Enroll Student
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enrollment Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E2E8F0] my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-bold text-[#4A7B5B] text-lg">Final Student Enrollment</h3>
                <p className="text-xs text-[#64748B]">
                  Candidate: {selectedRecord.application?.user?.fullName}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-[#64748B] hover:text-[#4A7B5B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#4A7B5B] mb-1">
                  Institutional Roll Number *
                </label>
                <input
                  type="text"
                  required
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. CSE-2026-042"
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A7B5B] mb-1">
                  University / College Registration Number
                </label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. REG-2026-98124"
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A7B5B] mb-1">
                  Enrollment Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional notes regarding orientation or batch allocation..."
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-[#4A7B5B] text-white hover:bg-[#3D674C] rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Enrolling..." : "Confirm Final Enrollment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
