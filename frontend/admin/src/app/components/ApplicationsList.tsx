import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Eye, 
  FileText, 
  Download, 
  Search, 
  Filter, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Archive, 
  RotateCcw, 
  MoreVertical,
  Briefcase,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { hrApi, type JobApplication, type Vacancy } from "../../api/hr.api";
import ApplicationDetailDrawer from "./ApplicationDetailDrawer";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  APPLIED: { label: "Applied", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  UNDER_REVIEW: { label: "Under Review", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  SHORTLISTED: { label: "Shortlisted", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  INTERVIEW_SCHEDULED: { label: "Interview Scheduled", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  INTERVIEWED: { label: "Interviewed", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  SELECTED: { label: "Selected", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  OFFERED: { label: "Offered", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  OFFER_SENT: { label: "Offer Sent", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  OFFER_ACCEPTED: { label: "Offer Accepted", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  OFFER_DECLINED: { label: "Offer Declined", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  CLEARANCE: { label: "Clearance", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  VERIFICATION_FAILED: { label: "Verification Failed", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  ONBOARDING: { label: "Onboarding", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  JOINED: { label: "Joined / Active", bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  ON_HOLD: { label: "On Hold", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  REJECTED: { label: "Rejected", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  WITHDRAWN: { label: "Withdrawn", bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
  HIRED: { label: "Hired", bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  ARCHIVED: { label: "Archived", bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300" },
};

export default function ApplicationsList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [vacancyFilter, setVacancyFilter] = useState<string>("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

  // Queries
  const { data: appRes, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin_applications", statusFilter, vacancyFilter, showArchived],
    queryFn: () => hrApi.getApplications({
      status: statusFilter === "ALL" ? undefined : statusFilter,
      vacancyId: vacancyFilter === "ALL" ? undefined : vacancyFilter,
      isArchived: showArchived ? "true" : "false",
    }),
  });

  const { data: vacRes } = useQuery({
    queryKey: ["admin_vacancies_filter_list"],
    queryFn: () => hrApi.getVacancies(),
  });

  const rawApps = appRes?.data;
  const applications: JobApplication[] = Array.isArray(rawApps)
    ? rawApps
    : Array.isArray((rawApps as any)?.data)
    ? (rawApps as any).data
    : Array.isArray((rawApps as any)?.applications)
    ? (rawApps as any).applications
    : [];

  const rawVacs = vacRes?.data;
  const vacancies: Vacancy[] = Array.isArray(rawVacs)
    ? rawVacs
    : Array.isArray((rawVacs as any)?.data)
    ? (rawVacs as any).data
    : [];

  // Mutations
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      hrApi.updateApplicationStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to update status");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => hrApi.archiveApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to archive application");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => hrApi.restoreApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to restore application");
    },
  });

  // Client-side text filter
  const filteredApps = applications.filter((app) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const fullName = `${app.firstName || ""} ${app.lastName || ""}`.toLowerCase();
    const email = (app.email || "").toLowerCase();
    const mobile = (app.mobile || "").toLowerCase();
    const appId = (app.applicationId || "").toLowerCase();
    const title = (app.vacancy?.title || "").toLowerCase();
    return fullName.includes(q) || email.includes(q) || mobile.includes(q) || appId.includes(q) || title.includes(q);
  });

  const handleDownloadResume = (e: React.MouseEvent, app: JobApplication) => {
    e.stopPropagation();
    const resumeUrl = app.resumeUrl || app.documents?.find(d => d.fileUrl)?.fileUrl;
    if (!resumeUrl) {
      alert("No resume attached for this applicant.");
      return;
    }
    const fullUrl = resumeUrl.startsWith("http")
      ? resumeUrl
      : `${window.location.origin}${resumeUrl.startsWith("/") ? "" : "/"}${resumeUrl}`;
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="p-4 bg-white border-b border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative min-w-[260px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, phone, or application ID..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] text-gray-700"
          >
            <option value="ALL">All Statuses</option>
            {Object.keys(STATUS_CONFIG).map((st) => (
              <option key={st} value={st}>
                {STATUS_CONFIG[st].label}
              </option>
            ))}
          </select>

          {/* Vacancy Filter */}
          <select
            value={vacancyFilter}
            onChange={(e) => setVacancyFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] text-gray-700 max-w-[200px] truncate"
          >
            <option value="ALL">All Vacancies</option>
            {vacancies.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>

          {/* Archive Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
              showArchived
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchived ? "Archived Only" : "Active Apps"}
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      {isLoading ? (
        <div className="p-16 text-center">
          <div className="w-8 h-8 border-4 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading job applications...</p>
        </div>
      ) : isError ? (
        <div className="p-12 text-center bg-white rounded-xl border border-red-100 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">Failed to load applications</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
            {(error as any)?.response?.data?.message || (error as any)?.message || "A network or authorization error occurred while fetching candidate applications."}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-[#4A7B5B] text-white text-xs font-semibold rounded-lg hover:bg-[#3D664B] transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retry Loading
          </button>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl">
          <div className="w-16 h-16 rounded-full bg-[#E8F3EC] flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[#4A7B5B]" />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B] mb-1">
            {searchTerm || statusFilter !== "ALL" || vacancyFilter !== "ALL"
              ? "No applications match your criteria"
              : "No applications found"}
          </h3>
          <p className="text-sm text-[#64748B] max-w-sm mx-auto mb-4">
            {searchTerm || statusFilter !== "ALL" || vacancyFilter !== "ALL"
              ? "Try adjusting your search terms or clearing the status/vacancy filters."
              : "When candidates apply through the Careers portal, their applications will appear here."}
          </p>
          {(searchTerm || statusFilter !== "ALL" || vacancyFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setVacancyFilter("ALL");
              }}
              className="px-4 py-2 text-xs font-semibold text-[#4A7B5B] bg-[#E8F3EC] rounded-lg hover:bg-[#d8ecde] transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3.5">App ID</th>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Job Role</th>
                <th className="px-5 py-3.5">Applied Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Recruiter</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredApps.map((app) => {
                const conf = STATUS_CONFIG[app.status] || {
                  label: app.status,
                  bg: "bg-gray-100",
                  text: "text-gray-700",
                  border: "border-gray-200",
                };
                const hasResume = !!(app.resumeUrl || app.documents?.some((d) => d.fileUrl));

                return (
                  <tr
                    key={app.id}
                    onClick={() => setSelectedApplicationId(app.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* App ID */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900 group-hover:text-[#4A7B5B] transition-colors flex items-center gap-1.5">
                        {app.applicationId || "N/A"}
                      </div>
                      <span className="text-xs text-gray-400">
                        {app.vacancy?.department || "General"}
                      </span>
                    </td>

                    {/* Candidate */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">
                        {app.firstName} {app.lastName}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                        <span>{app.email}</span>
                        {app.mobile && <span className="text-gray-400">• {app.mobile}</span>}
                      </div>
                    </td>

                    {/* Vacancy */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900 line-clamp-1">
                        {app.vacancy?.title || "Unknown Vacancy"}
                      </div>
                      <div className="text-xs text-gray-400">
                        {app.vacancy?.vacancyCode || (app.vacancyId ? "ID: " + app.vacancyId.slice(0, 8) : "—")}
                      </div>
                    </td>

                    {/* Applied Date */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500">
                      {app.createdAt ? format(new Date(app.createdAt), "MMM d, yyyy") : "—"}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${conf.bg} ${conf.text} ${conf.border}`}
                      >
                        {conf.label}
                      </span>
                    </td>

                    {/* Recruiter */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      {app.recruiter ? (
                        <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-[#4A7B5B]" />
                          <span>{app.recruiter.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 whitespace-nowrap text-right text-xs" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Download resume button */}
                        {hasResume && (
                          <button
                            onClick={(e) => handleDownloadResume(e, app)}
                            className="p-1.5 text-gray-500 hover:text-[#4A7B5B] hover:bg-[#E8F3EC] rounded-lg transition-colors"
                            title="Download / View Resume"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}

                        {/* Open Drawer Button */}
                        <button
                          onClick={() => setSelectedApplicationId(app.id)}
                          className="px-2.5 py-1.5 text-[#4A7B5B] bg-[#E8F3EC] hover:bg-[#d8ecde] font-semibold rounded-lg transition-colors flex items-center gap-1"
                          title="View application details & actions"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>

                        {/* Quick Archive / Restore */}
                        {app.isArchived ? (
                          <button
                            onClick={() => restoreMutation.mutate(app.id)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Restore application"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (window.confirm("Archive this application?")) {
                                archiveMutation.mutate(app.id);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Archive application"
                          >
                            <Archive className="w-4 h-4" />
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
      )}

      {/* Slide-out Candidate Detail & Actions Drawer */}
      {selectedApplicationId && (
        <ApplicationDetailDrawer
          applicationId={selectedApplicationId}
          onClose={() => setSelectedApplicationId(null)}
        />
      )}
    </div>
  );
}
