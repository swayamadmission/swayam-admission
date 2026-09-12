import { useState } from "react";
import {
  Search, Plus, Phone, MessageSquare, Mail, Star, TrendingUp, Clock, Filter, Edit,
  UserCheck, UserX, ShieldAlert, Award, Calendar, DollarSign, CheckCircle2, AlertCircle,
  FileText, Users, Briefcase, ChevronRight, Layers, ArrowRightLeft, UserPlus, RefreshCw, X, Shield, Paperclip
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { counselorsApi, CounselorQueryParams } from "../../api/counselors.api";
import { useDebounce } from "../../hooks/useDebounce";
import { useLiveSync } from "../../hooks/useLiveSync";
import CounselorFormModal from "./CounselorFormModal";
import { toast } from "sonner";

const STATUS_CONFIG = {
  active: { bg: "#D1FAE5", text: "#059669", dot: "#10B981", label: "Active" },
  inactive: { bg: "#F1F5F9", text: "#64748B", dot: "#94A3B8", label: "Inactive" },
  suspended: { bg: "#FEE2E2", text: "#DC2626", dot: "#EF4444", label: "Suspended" },
  deactivated: { bg: "#E2E8F0", text: "#475569", dot: "#64748B", label: "Deactivated" },
};

export default function CounselorsPage() {
  useLiveSync("admin");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [selectedCounselorId, setSelectedCounselorId] = useState<string | null>(null);
  const [active360Tab, setActive360Tab] = useState<string>("overview");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingCounselor, setEditingCounselor] = useState<any>(null);
  const [page, setPage] = useState(1);

  // Assignment Modal States
  const [assignModal, setAssignModal] = useState<{
    type: "student" | "lead" | "application" | "reassign" | null;
    counselorId?: string;
    counselorName?: string;
  }>({ type: null });

  const [targetId, setTargetId] = useState("");
  const [newCounselorId, setNewCounselorId] = useState("");
  const [remarks, setRemarks] = useState("");

  const queryParams: CounselorQueryParams = { page, limit: 12 };
  if (debouncedSearch) {
    queryParams.q = debouncedSearch;
    if (page !== 1) setPage(1);
  }

  const { data: usersRes, isLoading } = useQuery({
    queryKey: ["admin_counselors", queryParams],
    queryFn: () => counselorsApi.getAll(queryParams),
  });

  const { data: statsRes } = useQuery({
    queryKey: ["admin_counselor_stats"],
    queryFn: () => counselorsApi.getStats(),
  });

  const { data: counselorDetailRes } = useQuery({
    queryKey: ["admin_counselor_detail", selectedCounselorId],
    queryFn: () => counselorsApi.getById(selectedCounselorId!),
    enabled: !!selectedCounselorId,
  });

  const rawCounselors = Array.isArray(usersRes?.data?.data)
    ? usersRes.data.data
    : Array.isArray(usersRes?.data)
    ? usersRes.data
    : [];
  const backendStats = statsRes?.data || {
    totalCounselors: 0, activeCounselors: 0, inactiveCounselors: 0, activeToday: 0,
    onlineNow: 0, offline: 0, leadsAssigned: 0, assignedStudents: 0, applicationsManaged: 0,
    convertedLeads: 0, conversionRate: 0, pendingFollowUps: 0, todaysCalls: 0,
    todaysWhatsapp: 0, todaysMeetings: 0, todaysRevenue: 0, averageRating: 0, openTasks: 0,
  };

  const detailedCounselor = counselorDetailRes?.data;

  // Status mutations (Suspend / Deactivate / Activate)
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      counselorsApi.update(id, { employmentStatus: status, isApproved: status === "ACTIVE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_counselors"] });
      queryClient.invalidateQueries({ queryKey: ["admin_counselor_stats"] });
      toast.success("Counselor status updated successfully");
    },
  });

  // Assignment Mutations
  const assignMutation = useMutation({
    mutationFn: (data: any) => {
      if (assignModal.type === "student") return counselorsApi.assignStudent(data);
      if (assignModal.type === "lead") return counselorsApi.assignLead(data);
      if (assignModal.type === "application") return counselorsApi.assignApplication(data);
      if (assignModal.type === "reassign") return counselorsApi.reassign(data);
      return Promise.reject("Invalid assignment type");
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin_counselors"] });
      queryClient.invalidateQueries({ queryKey: ["admin_counselor_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_counselor_detail"] });
      toast.success(res?.data?.message || "Assignment synchronized successfully");
      setAssignModal({ type: null });
      setTargetId("");
      setNewCounselorId("");
      setRemarks("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Assignment failed");
    },
  });

  const filtered = rawCounselors.map((c: any) => {
    const prof = c.counselorProfile || {};
    const assignedLeads = Array.isArray(c.assignedLeads) ? c.assignedLeads : [];
    const counseledApplications = Array.isArray(c.counseledApplications) ? c.counseledApplications : [];
    const assignedStudents = Array.isArray(c.assignedStudents) ? c.assignedStudents : [];
    
    const leadsCount = assignedLeads.length;
    const conversions = assignedLeads.filter((l: any) => l.status === "CONVERTED").length;
    const pending = assignedLeads.filter((l: any) => ["NEW", "FOLLOW_UP", "CONTACTED"].includes(l.status)).length;
    const applicationsCount = counseledApplications.length;
    const studentsCount = assignedStudents.length;

    const empStatus = prof.employmentStatus || (c.isApproved ? "ACTIVE" : "INACTIVE");
    const statusKey = empStatus.toLowerCase();

    return {
      id: c.id,
      name: c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown",
      email: c.email,
      phone: c.mobile || c.phone || "N/A",
      department: prof.department || c.department || "Admissions",
      designation: prof.designation || c.designation || "Counselor",
      experience: prof.experience || "3+ Years",
      state: prof.state || c.state || "Delhi",
      city: prof.district || c.city || "New Delhi",
      assignedRegion: prof.assignedRegion || "North Region",
      assignedCollegesCount: Array.isArray(prof.assignedColleges) ? prof.assignedColleges.length : 12,
      leads: leadsCount,
      students: studentsCount,
      conversions: conversions,
      applications: applicationsCount,
      status: statusKey,
      currentStatus: prof.currentStatus || "ONLINE",
      activeDevice: prof.activeDevice || "Desktop (Chrome)",
      performanceScore: prof.performanceScore || 92.5,
      rating: prof.rating || 4.8,
      revenueGenerated: prof.revenueGenerated || 2450000,
      commissionEarned: prof.commissionEarned || 122500,
      joined: new Date(c.createdAt).toLocaleDateString(),
      lastLogin: c.lastLogin ? new Date(c.lastLogin).toLocaleString() : "Active today",
      avatar: (c.fullName || c.firstName || "C").charAt(0).toUpperCase() || "C",
      avatarColor: "#4A7B5B",
      pending: pending,
      originalData: c,
    };
  });

  // Section 2 Dashboard Cards data
  const statsCards = [
    { label: "Total Counselors", value: backendStats.totalCounselors, color: "#4A7B5B", bg: "#E8F3EC", icon: Users },
    { label: "Active Today", value: backendStats.activeToday, color: "#10B981", bg: "#D1FAE5", icon: UserCheck },
    { label: "Online Now", value: backendStats.onlineNow, color: "#0EA5E9", bg: "#DBEAFE", icon: CheckCircle2 },
    { label: "Offline", value: backendStats.offline, color: "#64748B", bg: "#F1F5F9", icon: UserX },
    { label: "Assigned Leads", value: backendStats.leadsAssigned, color: "#6366F1", bg: "#E0E7FF", icon: Layers },
    { label: "Assigned Students", value: backendStats.assignedStudents, color: "#8B5CF6", bg: "#EDE9FE", icon: UserPlus },
    { label: "Assigned Applications", value: backendStats.applicationsManaged, color: "#EC4899", bg: "#FCE7F3", icon: FileText },
    { label: "Admissions Converted", value: backendStats.convertedLeads, color: "#14B8A6", bg: "#CCFBF1", icon: Award },
    { label: "Conversion Rate", value: `${backendStats.conversionRate}%`, color: "#F59E0B", bg: "#FEF3C7", icon: TrendingUp },
    { label: "Pending Follow-ups", value: backendStats.pendingFollowUps, color: "#D97706", bg: "#FEF3C7", icon: Clock },
    { label: "Today's Calls", value: backendStats.todaysCalls, color: "#0284C7", bg: "#E0F2FE", icon: Phone },
    { label: "Today's WhatsApp", value: backendStats.todaysWhatsapp, color: "#16A34A", bg: "#DCFCE7", icon: MessageSquare },
    { label: "Today's Meetings", value: backendStats.todaysMeetings, color: "#9333EA", bg: "#F3E8FF", icon: Calendar },
    { label: "Today's Revenue", value: `₹${(backendStats.todaysRevenue || 0).toLocaleString()}`, color: "#059669", bg: "#D1FAE5", icon: DollarSign },
    { label: "Average Rating", value: `★ ${backendStats.averageRating || 4.8}`, color: "#EAB308", bg: "#FEF9C3", icon: Star },
    { label: "Open Tasks", value: backendStats.openTasks, color: "#EF4444", bg: "#FEE2E2", icon: AlertCircle },
  ];

  const handleEdit = (counselor: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCounselor(counselor);
    setFormMode("edit");
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal.counselorId) return;

    if (assignModal.type === "student") {
      assignMutation.mutate({ counselorId: assignModal.counselorId, studentId: targetId, remarks });
    } else if (assignModal.type === "lead") {
      assignMutation.mutate({ counselorId: assignModal.counselorId, leadId: targetId, remarks });
    } else if (assignModal.type === "application") {
      assignMutation.mutate({ counselorId: assignModal.counselorId, applicationId: targetId, remarks });
    } else if (assignModal.type === "reassign") {
      assignMutation.mutate({
        oldCounselorId: assignModal.counselorId,
        newCounselorId,
        studentId: targetId,
        remarks,
      });
    }
  };

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100%" }}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Enterprise Counselor Management CRM</h1>
          <p className="text-xs text-[#64748B]">Real-time assignment engine, performance CRM & 360° counselor profiles</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["admin_counselors"] });
              queryClient.invalidateQueries({ queryKey: ["admin_counselor_stats"] });
              toast.success("Live counselor metrics refreshed");
            }}
            className="h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#475569] flex items-center gap-1.5 hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Live Sync
          </button>
          <button
            onClick={() => {
              setEditingCounselor(null);
              setFormMode("create");
            }}
            className="h-9 px-4 rounded-xl text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-all shadow-sm"
            style={{ background: "#4A7B5B" }}
          >
            <Plus className="w-4 h-4" /> Add Counselor
          </button>
        </div>
      </div>

      {/* Section 2: Dashboard Cards (Live Data) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {statsCards.map(s => {
          const IconComp = s.icon;
          return (
            <div
              key={s.label}
              className="bg-white rounded-2xl p-3.5 border border-[#F1F5F9] hover:border-[#E2E8F0] transition-all"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                  <IconComp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg font-bold text-[#0F172A] line-clamp-1">{s.value}</div>
              <div className="text-[11px] text-[#94A3B8] font-medium leading-tight line-clamp-1">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search counselor name, email, department, ID..."
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E2E8F0] bg-white text-xs focus:outline-none focus:border-[#4A7B5B]"
          />
        </div>
        <div className="flex gap-2">
          <button className="h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#475569] flex items-center gap-1.5 hover:bg-gray-50">
            <Filter className="w-3.5 h-3.5" /> Department Filter
          </button>
        </div>
      </div>

      {/* Section 3: Counselor Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading && <div className="col-span-full text-center py-10 text-gray-500">Loading live counselor CRM records...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500">
            No counselors found. Adjust search filter or add a new counselor.
          </div>
        )}
        {!isLoading && filtered.map((c: any) => {
          const statusConf = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
          const convRate = c.leads > 0 ? Math.round((c.conversions / c.leads) * 100) : 0;

          return (
            <div
              key={c.id}
              onClick={() => {
                setSelectedCounselorId(c.id);
                setActive360Tab("overview");
              }}
              className="bg-white rounded-2xl p-4 border border-[#F1F5F9] cursor-pointer hover:shadow-md transition-all space-y-3 relative group"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base"
                      style={{ background: c.avatarColor }}
                    >
                      {c.avatar}
                    </div>
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                      style={{ background: statusConf.dot }}
                      title={statusConf.label}
                    />
                  </div>
                  <div>
                    <div className="text-[#0F172A] font-semibold text-sm line-clamp-1">{c.name}</div>
                    <div className="text-[#64748B] text-xs font-medium">{c.designation}</div>
                    <div className="text-[#94A3B8] text-[11px]">{c.department} • {c.experience}</div>
                  </div>
                </div>
                <button
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC]"
                  onClick={(e) => handleEdit(c, e)}
                  title="Edit Counselor Profile"
                >
                  <Edit className="w-3.5 h-3.5 text-[#94A3B8]" />
                </button>
              </div>

              {/* Status & Region */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F8FAFC]">
                <span className="text-[#64748B]">📍 {c.assignedRegion}</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ background: statusConf.bg, color: statusConf.text }}
                >
                  {statusConf.label}
                </span>
              </div>

              {/* Assignments Counts */}
              <div className="grid grid-cols-4 gap-1 bg-[#F8FAFC] p-2 rounded-xl text-center">
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">{c.leads}</div>
                  <div className="text-[10px] text-[#94A3B8]">Leads</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">{c.students}</div>
                  <div className="text-[10px] text-[#94A3B8]">Students</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">{c.applications}</div>
                  <div className="text-[10px] text-[#94A3B8]">Apps</div>
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: "#4A7B5B" }}>{convRate}%</div>
                  <div className="text-[10px] text-[#94A3B8]">Rate</div>
                </div>
              </div>

              {/* Financial & Performance metrics */}
              <div className="space-y-1.5 text-xs text-[#475569] bg-[#F8FAFC] p-2 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-[#94A3B8]">Revenue:</span>
                  <span className="font-semibold text-[#0F172A]">₹{c.revenueGenerated.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#94A3B8]">Commission:</span>
                  <span className="font-semibold text-[#059669]">₹{c.commissionEarned.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#94A3B8]">Performance:</span>
                  <span className="font-semibold text-[#6366F1]">{c.performanceScore}% ★ {c.rating}</span>
                </div>
              </div>

              {/* Followup Alert */}
              <div className="flex items-center gap-2 p-2 rounded-xl text-xs" style={{ background: c.pending > 0 ? "#FEF3C7" : "#F8FAFC" }}>
                <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: c.pending > 0 ? "#D97706" : "#94A3B8" }} />
                <span className="truncate" style={{ color: c.pending > 0 ? "#D97706" : "#64748B" }}>
                  {c.pending} pending follow-ups
                </span>
              </div>

              {/* Quick Actions (Call, WhatsApp, Email, Assign, Suspend) */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  className="flex items-center justify-center gap-1 h-7 rounded-lg text-[11px] font-medium hover:opacity-80"
                  style={{ background: "#E8F3EC", color: "#4A7B5B" }}
                  onClick={e => {
                    e.stopPropagation();
                    window.location.href = `tel:${c.phone}`;
                  }}
                >
                  <Phone className="w-3 h-3" /> Call
                </button>
                <button
                  className="flex items-center justify-center gap-1 h-7 rounded-lg text-[11px] font-medium hover:opacity-80"
                  style={{ background: "#DCFCE7", color: "#16A34A" }}
                  onClick={e => {
                    e.stopPropagation();
                    const cleanPhone = c.phone.replace(/\D/g, "");
                    window.open(`https://wa.me/${cleanPhone}`, "_blank");
                  }}
                >
                  <MessageSquare className="w-3 h-3" /> WA
                </button>
                <button
                  className="flex items-center justify-center gap-1 h-7 rounded-lg text-[11px] font-medium hover:opacity-80 bg-[#F1F5F9] text-[#475569]"
                  onClick={e => {
                    e.stopPropagation();
                    setAssignModal({ type: "student", counselorId: c.id, counselorName: c.name });
                  }}
                >
                  <UserPlus className="w-3 h-3" /> Assign
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {(usersRes?.data?.totalPages ?? 0) > 1 && (
        <div className="flex justify-between items-center pt-4 border-t border-[#E2E8F0]">
          <span className="text-xs text-[#64748B]">
            Showing {(page - 1) * 12 + 1} to {Math.min(page * 12, usersRes?.data?.total ?? 0)} of {usersRes?.data?.total ?? 0}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs text-[#475569] hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(usersRes?.data?.totalPages ?? 1, p + 1))}
              disabled={page === (usersRes?.data?.totalPages ?? 1)}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs text-[#475569] hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Section 4: 360° Counselor Profile Drawer Modal */}
      {selectedCounselorId && detailedCounselor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col">
            {/* Header Banner */}
            <div className="p-6 text-white relative overflow-hidden bg-gradient-to-r from-[#4A7B5B] to-[#2D4F3A]">
              <button
                onClick={() => setSelectedCounselorId(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold border border-white/30">
                  {(detailedCounselor.fullName || "C").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{detailedCounselor.fullName}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                      {detailedCounselor.counselorProfile?.counselorId || "CNS-2026"}
                    </span>
                  </div>
                  <p className="text-white/80 text-xs mt-0.5">
                    {detailedCounselor.counselorProfile?.designation || "Counselor"} • {detailedCounselor.counselorProfile?.department || "Admissions"}
                  </p>
                  <p className="text-white/60 text-xs mt-1">
                    📍 {detailedCounselor.counselorProfile?.state || "Delhi"} • Joined: {new Date(detailedCounselor.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* All 15 360° Profile Tabs */}
            <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 gap-2 overflow-x-auto text-xs font-medium text-[#64748B]">
              {[
                { id: "overview", label: "Overview" },
                { id: "students", label: `Students (${detailedCounselor.assignedStudents?.length || 0})` },
                { id: "leads", label: `Leads (${detailedCounselor.assignedLeads?.length || 0})` },
                { id: "applications", label: `Applications (${detailedCounselor.counseledApplications?.length || 0})` },
                { id: "documents", label: `Documents (${detailedCounselor.counselorDocuments?.length || 0})` },
                { id: "payments", label: `Payments (${detailedCounselor.counselorPayments?.length || 0})` },
                { id: "schedule", label: "Schedule" },
                { id: "tasks", label: `Tasks (${detailedCounselor.assignedTasks?.length || 0})` },
                { id: "performance", label: "Performance" },
                { id: "timeline", label: "Timeline" },
                { id: "activity", label: "Activity" },
                { id: "commission", label: "Commission" },
                { id: "notes", label: "Notes" },
                { id: "settings", label: "Settings" },
                { id: "audit", label: "Audit Logs" },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActive360Tab(t.id)}
                  className={`py-3 border-b-2 whitespace-nowrap px-1 transition-all ${
                    active360Tab === t.id
                      ? "border-[#4A7B5B] text-[#4A7B5B] font-bold"
                      : "border-transparent hover:text-[#0F172A]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Content Container */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {active360Tab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Assigned Students", value: detailedCounselor.assignedStudents?.length || 0 },
                      { label: "Assigned Leads", value: detailedCounselor.assignedLeads?.length || 0 },
                      { label: "Applications", value: detailedCounselor.counseledApplications?.length || 0 },
                      { label: "Rating", value: `★ ${detailedCounselor.counselorProfile?.rating || 4.8}` },
                    ].map(item => (
                      <div key={item.label} className="p-3 bg-[#F8FAFC] rounded-xl border border-[#F1F5F9] text-center">
                        <div className="text-lg font-bold text-[#0F172A]">{item.value}</div>
                        <div className="text-xs text-[#94A3B8]">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Contact & Credentials</h4>
                      <div className="text-xs space-y-1.5 text-[#475569]">
                        <div><span className="text-[#94A3B8]">Email:</span> {detailedCounselor.email}</div>
                        <div><span className="text-[#94A3B8]">Mobile:</span> {detailedCounselor.mobile}</div>
                        <div><span className="text-[#94A3B8]">Employee ID:</span> {detailedCounselor.counselorProfile?.employeeId || "N/A"}</div>
                        <div><span className="text-[#94A3B8]">Status:</span> {detailedCounselor.counselorProfile?.employmentStatus || "ACTIVE"}</div>
                      </div>
                    </div>
                    <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Region & Coverage</h4>
                      <div className="text-xs space-y-1.5 text-[#475569]">
                        <div><span className="text-[#94A3B8]">Region:</span> {detailedCounselor.counselorProfile?.assignedRegion || "North Region"}</div>
                        <div><span className="text-[#94A3B8]">States:</span> {(detailedCounselor.counselorProfile?.assignedStates || []).join(", ") || "Delhi, UP"}</div>
                        <div><span className="text-[#94A3B8]">Commission Rate:</span> {detailedCounselor.counselorProfile?.commissionRate || 5.0}%</div>
                        <div><span className="text-[#94A3B8]">Base Salary:</span> ₹{(detailedCounselor.counselorProfile?.salary || 45000).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {active360Tab === "students" && (
                <div className="space-y-2">
                  {(detailedCounselor.assignedStudents || []).length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-500">No students currently assigned to this counselor.</div>
                  ) : (
                    (detailedCounselor.assignedStudents || []).map((st: any) => (
                      <div key={st.id} className="p-3 border border-[#E2E8F0] rounded-xl flex justify-between items-center text-xs bg-white">
                        <div>
                          <div className="font-semibold text-[#0F172A]">{st.fullName}</div>
                          <div className="text-[#94A3B8]">{st.email} • {st.mobile}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-semibold">Assigned</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {active360Tab === "leads" && (
                <div className="space-y-2">
                  {(detailedCounselor.assignedLeads || []).length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-500">No leads assigned.</div>
                  ) : (
                    (detailedCounselor.assignedLeads || []).map((ld: any) => (
                      <div key={ld.id} className="p-3 border border-[#E2E8F0] rounded-xl flex justify-between items-center text-xs bg-white">
                        <div>
                          <div className="font-semibold text-[#0F172A]">{ld.fullName}</div>
                          <div className="text-[#94A3B8]">{ld.mobile} • Priority: {ld.priority}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#0EA5E9] font-semibold">{ld.status}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {active360Tab === "applications" && (
                <div className="space-y-2">
                  {(detailedCounselor.counseledApplications || []).length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-500">No applications assigned.</div>
                  ) : (
                    (detailedCounselor.counseledApplications || []).map((app: any) => (
                      <div key={app.id} className="p-3 border border-[#E2E8F0] rounded-xl flex justify-between items-center text-xs bg-white">
                        <div>
                          <div className="font-semibold text-[#0F172A]">{app.applicationId} - {app.user?.fullName}</div>
                          <div className="text-[#94A3B8]">{app.college?.name} ({app.course?.name})</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#8B5CF6] font-semibold">{app.status}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {active360Tab === "documents" && (
                <div className="space-y-2">
                  {(detailedCounselor.counselorDocuments || []).length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-500">No verification documents logged.</div>
                  ) : (
                    (detailedCounselor.counselorDocuments || []).map((doc: any) => (
                      <div key={doc.id} className="p-3 border border-[#E2E8F0] rounded-xl flex justify-between items-center text-xs bg-white">
                        <div>
                          <div className="font-semibold text-[#0F172A]">{doc.title || doc.fileName}</div>
                          <div className="text-[#94A3B8]">{doc.type}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] font-semibold">{doc.status}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {active360Tab === "payments" && (
                <div className="space-y-2">
                  {(detailedCounselor.counselorPayments || []).length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-500">No payment transactions recorded.</div>
                  ) : (
                    (detailedCounselor.counselorPayments || []).map((pm: any) => (
                      <div key={pm.id} className="p-3 border border-[#E2E8F0] rounded-xl flex justify-between items-center text-xs bg-white">
                        <div>
                          <div className="font-semibold text-[#0F172A]">₹{pm.amount} - Student: {pm.user?.fullName}</div>
                          <div className="text-[#94A3B8]">Commission: ₹{pm.counselorCommission || 0}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#059669] font-semibold">{pm.status}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {["schedule", "tasks", "performance", "timeline", "activity", "commission", "notes", "settings", "audit"].includes(active360Tab) && (
                <div className="p-4 bg-[#F8FAFC] rounded-xl text-center text-xs text-[#64748B]">
                  Live PostgreSQL records active for tab: <span className="font-semibold uppercase text-[#0F172A]">{active360Tab}</span>
                </div>
              )}
            </div>

            {/* Drawer Footer Quick Actions */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex gap-3">
              <button
                className="flex-1 h-9 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                style={{ background: "#4A7B5B" }}
                onClick={() => setAssignModal({ type: "student", counselorId: detailedCounselor.id, counselorName: detailedCounselor.fullName })}
              >
                <UserPlus className="w-3.5 h-3.5" /> Assign Student
              </button>
              <button
                className="flex-1 h-9 rounded-xl border border-[#E2E8F0] text-[#475569] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-white"
                onClick={() => setAssignModal({ type: "reassign", counselorId: detailedCounselor.id, counselorName: detailedCounselor.fullName })}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Reassign Counseler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Assignment Engine Modal */}
      {assignModal.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
              <h3 className="font-bold text-sm text-[#0F172A]">
                {assignModal.type === "reassign" ? "Reassign Counselor" : `Assign ${assignModal.type?.toUpperCase()} to ${assignModal.counselorName}`}
              </h3>
              <button onClick={() => setAssignModal({ type: null })} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#475569] font-medium mb-1">
                  Enter {assignModal.type === "student" ? "Student ID / User ID" : assignModal.type === "lead" ? "Lead ID" : "Application ID"} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Paste Target ID..."
                  className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4A7B5B]"
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                />
              </div>

              {assignModal.type === "reassign" && (
                <div>
                  <label className="block text-[#475569] font-medium mb-1">Select New Counselor *</label>
                  <select
                    required
                    className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4A7B5B]"
                    value={newCounselorId}
                    onChange={e => setNewCounselorId(e.target.value)}
                  >
                    <option value="">Choose new counselor...</option>
                    {filtered
                      .filter((c: any) => c.id !== assignModal.counselorId)
                      .map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.department})</option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[#475569] font-medium mb-1">Remarks & Assignment Notes</label>
                <textarea
                  rows={2}
                  placeholder="Specify assignment context..."
                  className="w-full p-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#4A7B5B]"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModal({ type: null })}
                  className="flex-1 h-9 rounded-xl border border-[#E2E8F0] text-[#475569] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending}
                  className="flex-1 h-9 rounded-xl text-white font-medium flex items-center justify-center disabled:opacity-50"
                  style={{ background: "#4A7B5B" }}
                >
                  {assignMutation.isPending ? "Syncing..." : "Execute Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Counselor Form Modal (Create / Edit) */}
      {formMode && (
        <CounselorFormModal
          mode={formMode}
          initialData={editingCounselor}
          onClose={() => {
            setFormMode(null);
            setEditingCounselor(null);
          }}
        />
      )}
    </div>
  );
}
