import { useState } from "react";
import {
  Search,
  Download,
  Eye,
  Phone,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  MapPin,
  Calendar,
  Shield,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  GraduationCap,
  UserCheck,
  User,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsApi, StudentQueryParams } from "../../api/students.api";
import { usersApi } from "../../api/users.api";
import { useDebounce } from "../../hooks/useDebounce";
import { useLiveSync } from "../../hooks/useLiveSync";
import Student360Profile from "./Student360Profile";

const APPROVAL_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: "#E8F3EC", text: "#4A7B5B", label: "Approved" },
  pending: { bg: "#FEF3C7", text: "#D97706", label: "Pending Approval" },
};

export default function StudentsPage() {
  useLiveSync("admin");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const limit = 20;

  const queryParams: StudentQueryParams = { page, limit };
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (selectedFilter === "approved") queryParams.isApproved = "true";
  if (selectedFilter === "pending") queryParams.isApproved = "false";

  const {
    data: studentsRes,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin_students_list", queryParams],
    queryFn: async () => {
      try {
        const res = await studentsApi.getAll(queryParams);
        return res.data;
      } catch {
        // Fallback to usersApi if necessary
        const fallbackRes = await usersApi.getAll({ ...queryParams, role: "STUDENT" });
        return fallbackRes.data;
      }
    },
  });

  // Extract student array and pagination safely
  const rawData = studentsRes;
  const students: any[] = Array.isArray(rawData?.data)
    ? rawData.data
    : Array.isArray(rawData)
    ? rawData
    : [];
  const total = rawData?.total !== undefined ? rawData.total : students.length;
  const totalPages = rawData?.totalPages || Math.ceil(total / limit) || 1;

  // Toggle approval mutation
  const toggleMutation = useMutation({
    mutationFn: (id: string) => usersApi.toggleApproval(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_students_list"] });
      queryClient.invalidateQueries({ queryKey: ["admin_student_detail"] });
    },
  });

  // Enterprise Student 360° Profile View
  if (selectedStudent) {
    return (
      <Student360Profile
        studentId={selectedStudent}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100%" }}>
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-[#0F172A]">Student Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/30">
              Live DB
            </span>
          </div>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Authoritative directory of registered students, admission pipelines, counseling assignments & profile verification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-[#4A7B5B] hover:bg-[#E8F3EC] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: total, color: "#4A7B5B", sub: "Registered database users" },
          {
            label: "Approved",
            value: students.filter((s: any) => s.isApproved).length,
            color: "#4A7B5B",
            sub: "Verified accounts",
          },
          {
            label: "Pending Approval",
            value: students.filter((s: any) => !s.isApproved).length,
            color: "#D97706",
            sub: "Requires admin review",
          },
          {
            label: "Showing on Page",
            value: students.length,
            color: "#0F172A",
            sub: `Page ${page} of ${totalPages}`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-200 shadow-sm transition hover:shadow-md"
          >
            <div className="text-2xl lg:text-3xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-1">{stat.label}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Student ID, Reg No, Name, Mobile, Email..."
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-xs lg:text-sm focus:outline-none focus:border-[#4A7B5B] focus:bg-white transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { key: "all", label: "All Students", count: total },
            { key: "approved", label: "Approved" },
            { key: "pending", label: "Pending" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setSelectedFilter(f.key);
                setPage(1);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition"
              style={{
                background: selectedFilter === f.key ? "#4A7B5B" : "#F1F5F9",
                color: selectedFilter === f.key ? "#FFFFFF" : "#64748B",
              }}
            >
              {f.label} {f.count !== undefined && <span className="opacity-80">({f.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Student Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Student Profile</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Counselor</th>
                <th className="py-3 px-4">Admission Stage</th>
                <th className="py-3 px-4">Approval Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs lg:text-sm">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#4A7B5B] mb-2" />
                    Loading database student records...
                  </td>
                </tr>
              )}

              {!isLoading && isError && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-red-600">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                    <div>{(error as any)?.message || "Failed to load student data from server."}</div>
                    <button
                      onClick={() => refetch()}
                      className="mt-3 px-4 py-1.5 bg-[#4A7B5B] text-white rounded-xl text-xs font-semibold hover:bg-[#3D664B]"
                    >
                      Retry Query
                    </button>
                  </td>
                </tr>
              )}

              {!isLoading && !isError && students.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No students match the selected filter criteria.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !isError &&
                students.map((student: any) => {
                  const isApproved = !!student.isApproved;
                  const approvalConf = APPROVAL_CONFIG[isApproved ? "approved" : "pending"];
                  const profile = student.profile || {};
                  const counselor = student.assignedCounselor;
                  const city = profile.city || student.city;
                  const state = profile.state || student.state;
                  const appCount = student.applicationsCount ?? student.applications?.length ?? 0;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedStudent(student.id)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
                            style={{ background: "#4A7B5B" }}
                          >
                            {student.fullName?.charAt(0)?.toUpperCase() || "S"}
                          </div>
                          <div>
                            <div className="text-slate-900 font-semibold text-sm group-hover:text-[#4A7B5B] transition flex items-center gap-2">
                              <span>{student.fullName || "Unnamed Student"}</span>
                              {student.studentId && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-[#4A7B5B] border border-emerald-200">
                                  {student.studentId}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                              {student.registrationNumber && (
                                <span className="font-mono text-[10px] text-slate-500">
                                  Reg: {student.registrationNumber}
                                </span>
                              )}
                              <span>•</span>
                              <span>Registered {student.createdAt ? new Date(student.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not provided"}</span>
                              {student.completionPercentage !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-slate-600">
                                    {student.completionPercentage}% profile
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium text-xs">{student.mobile || "—"}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{student.email || "—"}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 text-xs font-medium">
                          {city ? `${city}, ` : ""}{state || "—"}
                        </div>
                        {profile.twelfthStream && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            12th: {profile.twelfthStream} ({profile.twelfthMarks || "—"}%)
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {counselor ? (
                          <div>
                            <div className="text-xs font-semibold text-slate-800">{counselor.fullName}</div>
                            <div className="text-[11px] text-slate-400">{counselor.mobile}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-xs font-medium text-slate-800">
                          {student.journeyStage || "Registration"}
                        </div>
                        <div className="text-[11px] text-[#4A7B5B] font-semibold mt-0.5">
                          {appCount} {appCount === 1 ? "application" : "applications"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-semibold inline-block border"
                          style={{
                            background: approvalConf.bg,
                            color: approvalConf.text,
                            borderColor: `${approvalConf.text}40`,
                          }}
                        >
                          {approvalConf.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedStudent(student.id)}
                            className="p-1.5 text-slate-600 hover:text-[#4A7B5B] hover:bg-[#E8F3EC] rounded-lg transition"
                            title="View 360° Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleMutation.mutate(student.id)}
                            disabled={toggleMutation.isPending}
                            className={`p-1.5 rounded-lg transition ${
                              isApproved
                                ? "text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={isApproved ? "Revoke Approval" : "Approve Student"}
                          >
                            {isApproved ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Showing {students.length} of {total} total students (Page {page} of {totalPages})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg text-xs flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-lg text-xs font-semibold transition"
                  style={{
                    background: p === page ? "#4A7B5B" : "#FFFFFF",
                    color: p === page ? "#FFFFFF" : "#475569",
                    border: `1px solid ${p === page ? "#4A7B5B" : "#E2E8F0"}`,
                  }}
                >
                  {p}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg text-xs flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
