import { useState } from "react";
import {
  Search, Plus, Filter, Download, Phone, MessageSquare,
  MoreHorizontal, Edit, Trash2, Eye, LayoutGrid, Table2,
  ChevronDown, X, CheckCircle2, Clock, ArrowUpRight, Flame,
  AlertTriangle, UserCheck, ShieldAlert, RefreshCw, UserPlus, MapPin, Building2, BookOpen, Users, CheckSquare, Square, AlertCircle
} from "lucide-react";
import { Badge } from "./ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  leadsApi, Lead, LeadQueryParams, AssignableCounselor, EligibleSeniorCounselor,
  TeamCounselorSummary, BulkReassignResponse, LeadAssignmentRecord
} from "../../api/leads.api";
import { journeyApi, ApplicationJourneyPayload } from "../../api/journey.api";
import { usersApi } from "../../api/users.api";
import { useDebounce } from "../../hooks/useDebounce";
import { toast } from "sonner";
import NextActionPanel from "./NextActionPanel";
import CentralActivityTimeline from "./CentralActivityTimeline";
import LogInteractionModal from "./LogInteractionModal";

type Stage = "NEW" | "CONTACTED" | "INTERESTED" | "UNDER_REVIEW" | "CONVERTED" | "LOST";
type QueueTab = "ALL" | "SENIOR_QUEUE" | "COUNSELOR_QUEUE" | "TEAM_SUMMARY" | "UNAVAILABILITY" | "EXCEPTIONS";

const STAGES: Stage[] = ["NEW", "CONTACTED", "INTERESTED", "UNDER_REVIEW", "CONVERTED", "LOST"];

const STAGE_CONFIG: Record<Stage, { bg: string; text: string; border: string; headerBg: string; label: string }> = {
  "NEW": { bg: "#F8FAFC", text: "#64748B", border: "#E2E8F0", headerBg: "#F1F5F9", label: "New" },
  "CONTACTED": { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A", headerBg: "#FEF3C7", label: "Contacted" },
  "INTERESTED": { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0", headerBg: "#DCFCE7", label: "Interested" },
  "UNDER_REVIEW": { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA", headerBg: "#FFEDD5", label: "Under Review" },
  "CONVERTED": { bg: "#F0FDF4", text: "#059669", border: "#A7F3D0", headerBg: "#D1FAE5", label: "Converted" },
  "LOST": { bg: "#FFF1F2", text: "#DC2626", border: "#FECACA", headerBg: "#FEE2E2", label: "Lost" },
};

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<QueueTab>("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [selectedStage, setSelectedStage] = useState<Stage | "All">("All");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [deleteModalLeadId, setDeleteModalLeadId] = useState<string | null>(null);
  
  // Assign Counselor Modal state
  const [assignModalLead, setAssignModalLead] = useState<Lead | null>(null);
  const [selectedCounselorForAssign, setSelectedCounselorForAssign] = useState<string>("");
  const [assignReason, setAssignReason] = useState<string>("Initial assignment");
  const [overrideCapacity, setOverrideCapacity] = useState<boolean>(false);

  // Bulk Assign Modal state
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkCounselorId, setBulkCounselorId] = useState<string>("");
  const [bulkReason, setBulkReason] = useState<string>("Bulk reassignment");
  const [bulkOverrideCapacity, setBulkOverrideCapacity] = useState<boolean>(false);
  const [bulkResult, setBulkResult] = useState<BulkReassignResponse | null>(null);

  // Application Journey Drawer state
  const [selectedAppJourney, setSelectedAppJourney] = useState<ApplicationJourneyPayload | null>(null);

  // Manual Route Modal state
  const [manualRouteModalLead, setManualRouteModalLead] = useState<Lead | null>(null);
  const [selectedSeniorForRoute, setSelectedSeniorForRoute] = useState<string>("");
  const [routeReason, setRouteReason] = useState<string>("");

  // CRM Interaction Modal state
  const [leadLogModalOpen, setLeadLogModalOpen] = useState(false);
  const [leadLogTab, setLeadLogTab] = useState<"call" | "whatsapp" | "meeting" | "note" | "task">("call");

  const [page, setPage] = useState(1);
  const [noteContent, setNoteContent] = useState("");

  const queryClient = useQueryClient();

  // Query Params
  const queryParams: LeadQueryParams = { limit: 20, page };
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (selectedStage !== "All") queryParams.status = selectedStage;

  // Main Queue / Leads List Query
  const { data: leadsRes, isLoading: isLeadsLoading } = useQuery({
    queryKey: ["leads_list", activeTab, queryParams],
    queryFn: () => {
      if (activeTab === "SENIOR_QUEUE") return leadsApi.getSeniorCounselorQueue(queryParams);
      if (activeTab === "COUNSELOR_QUEUE") return leadsApi.getCounselorQueue(queryParams);
      if (activeTab === "UNAVAILABILITY") return leadsApi.getCounselorUnavailabilityQueue(queryParams);
      if (activeTab === "EXCEPTIONS") return leadsApi.getRoutingExceptions(queryParams);
      return leadsApi.findAll(queryParams);
    },
    enabled: activeTab !== "TEAM_SUMMARY",
  });

  // Senior Counselor Stats
  const { data: seniorStatsRes } = useQuery({
    queryKey: ["senior_counselor_stats"],
    queryFn: () => leadsApi.getSeniorCounselorStats(),
  });

  // Senior Counselor Team Summary Query
  const { data: teamSummaryRes, isLoading: isTeamSummaryLoading } = useQuery({
    queryKey: ["senior_counselor_team_summary"],
    queryFn: () => leadsApi.getSeniorCounselorTeamSummary(),
    enabled: activeTab === "TEAM_SUMMARY",
  });

  const teamSummary: TeamCounselorSummary[] = teamSummaryRes?.data || [];

  // Selected Lead Details
  const { data: selectedLeadDetailRes } = useQuery({
    queryKey: ["admin_lead_detail", selectedLeadId],
    queryFn: () => leadsApi.findById(selectedLeadId!),
    enabled: !!selectedLeadId,
  });

  const selectedLeadDetail = selectedLeadDetailRes?.data;

  // Student Admission Journey & Applications
  const { data: studentJourneyRes } = useQuery({
    queryKey: ["counselor_student_journey", selectedLeadDetail?.userId || selectedLeadDetail?.id],
    queryFn: () => journeyApi.getStudentJourney(selectedLeadDetail?.userId || selectedLeadDetail?.id!),
    enabled: !!selectedLeadDetail,
  });
  const studentJourneyData = studentJourneyRes?.data;

  // Eligible Counselors for Assign Modal
  const { data: eligibleCounselorsRes, isLoading: isEligibleLoading } = useQuery({
    queryKey: ["eligible_counselors", assignModalLead?.id],
    queryFn: () => leadsApi.getEligibleCounselors(assignModalLead!.id),
    enabled: !!assignModalLead?.id,
  });

  const eligibleCounselors: AssignableCounselor[] = eligibleCounselorsRes?.data || [];

  // Senior Counselors List for Manual Routing
  const seniorCounselorsQuery = useQuery({
    queryKey: ["admin_senior_counselors_list", manualRouteModalLead?.id],
    queryFn: () => leadsApi.getEligibleSeniorCounselors(manualRouteModalLead?.id),
    enabled: !!manualRouteModalLead?.id,
  });

  const eligibleSeniorCounselors: EligibleSeniorCounselor[] = seniorCounselorsQuery.data?.data || [];

  // Mutations
  const assignCounselorMutation = useMutation({
    mutationFn: ({ leadId, counselorId, reason, overrideCapacity }: { leadId: string; counselorId: string; reason?: string; overrideCapacity?: boolean }) =>
      leadsApi.assignCounselorToLead(leadId, { counselorId, reason, overrideCapacity }),
    onSuccess: () => {
      setAssignModalLead(null);
      setSelectedCounselorForAssign("");
      setAssignReason("Initial assignment");
      setOverrideCapacity(false);
      queryClient.invalidateQueries({ queryKey: ["leads_list"] });
      queryClient.invalidateQueries({ queryKey: ["admin_lead_detail", selectedLeadId] });
      queryClient.invalidateQueries({ queryKey: ["senior_counselor_stats"] });
      toast.success("Counselor assigned successfully!");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to assign counselor")
  });

  const bulkReassignMutation = useMutation({
    mutationFn: (payload: { leadIds: string[]; targetCounselorId: string; reason: string; overrideCapacity?: boolean }) =>
      leadsApi.bulkReassignLeads(payload),
    onSuccess: (res) => {
      setBulkResult(res.data);
      setSelectedLeadIds([]);
      queryClient.invalidateQueries({ queryKey: ["leads_list"] });
      queryClient.invalidateQueries({ queryKey: ["senior_counselor_stats"] });
      toast.success(`Bulk reassignment complete (${res.data.successCount} succeeded, ${res.data.failureCount} failed)`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Bulk reassignment failed")
  });

  const manualRouteMutation = useMutation({
    mutationFn: ({ leadId, seniorCounselorId, reason }: { leadId: string; seniorCounselorId: string; reason: string }) =>
      leadsApi.manualRoute(leadId, seniorCounselorId, reason),
    onSuccess: () => {
      setManualRouteModalLead(null);
      setSelectedSeniorForRoute("");
      setRouteReason("");
      queryClient.invalidateQueries({ queryKey: ["leads_list"] });
      queryClient.invalidateQueries({ queryKey: ["routing_exceptions"] });
      queryClient.invalidateQueries({ queryKey: ["senior_counselor_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_lead_detail", selectedLeadId] });
      queryClient.invalidateQueries({ queryKey: ["admin_senior_counselors_list"] });
      toast.success("Lead manually routed to Senior Counselor!");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to route lead")
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      leadsApi.addNote(id, content),
    onSuccess: () => {
      setNoteContent("");
      queryClient.invalidateQueries({ queryKey: ["admin_lead_detail", selectedLeadId] });
      toast.success("Note added successfully");
    },
    onError: () => toast.error("Failed to add note")
  });

  const rawLeads: Lead[] = Array.isArray(leadsRes?.data?.data)
    ? leadsRes.data.data
    : Array.isArray(leadsRes?.data)
    ? leadsRes.data
    : [];
  const totalLeads = leadsRes?.data?.total !== undefined ? leadsRes.data.total : rawLeads.length;
  const seniorStats = seniorStatsRes?.data;

  // Toggle selection
  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === rawLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(rawLeads.map(l => l.id));
    }
  };

  const handleExport = () => {
    if (!rawLeads.length) return;
    const headers = ["ID", "Name", "Mobile", "Email", "State", "District", "Course", "Status", "Senior Counselor", "Counselor", "Source"];
    const csvContent = [
      headers.join(","),
      ...rawLeads.map(l => [
        l.id, `"${l.fullName}"`, l.mobile, l.email || "", `"${l.state || ''}"`, `"${l.district || l.city || ''}"`,
        `"${l.preferredCourse || ''}"`, l.status, `"${l.assignedSeniorCounselor?.fullName || ''}"`, `"${l.assignedCounselor?.fullName || ''}"`, l.source
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `crm_leads_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: "#F8FAFC" }}>
      {/* Header & Tabs */}
      <div className="px-5 lg:px-8 py-4 bg-white border-b border-[#F1F5F9]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Counselor Assignment & Operational Queue</h1>
            <p className="text-xs text-[#64748B]">State → District → Senior Counselor → Counselor → Student Ownership Hierarchy</p>
          </div>

          <div className="flex items-center gap-2">
            {selectedLeadIds.length > 0 && (
              <button
                onClick={() => setShowBulkModal(true)}
                className="h-9 px-4 rounded-xl bg-amber-600 text-white text-sm font-medium flex items-center gap-1.5 hover:bg-amber-700 transition-all shadow-sm"
              >
                <Users className="w-4 h-4" /> Bulk Assign ({selectedLeadIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 overflow-x-auto">
          <button
            onClick={() => { setActiveTab("ALL"); setPage(1); setSelectedLeadIds([]); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/20"
                : "text-[#64748B] hover:bg-[#F1F5F9]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> All CRM Leads ({totalLeads})
          </button>

          <button
            onClick={() => { setActiveTab("SENIOR_QUEUE"); setPage(1); setSelectedLeadIds([]); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "SENIOR_QUEUE"
                ? "bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/20"
                : "text-[#64748B] hover:bg-[#F1F5F9]"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Senior Counselor My Queue
          </button>

          <button
            onClick={() => { setActiveTab("COUNSELOR_QUEUE"); setPage(1); setSelectedLeadIds([]); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "COUNSELOR_QUEUE"
                ? "bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/20"
                : "text-[#64748B] hover:bg-[#F1F5F9]"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Counselor My Students
          </button>

          <button
            onClick={() => { setActiveTab("TEAM_SUMMARY"); setSelectedLeadIds([]); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "TEAM_SUMMARY"
                ? "bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/20"
                : "text-[#64748B] hover:bg-[#F1F5F9]"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Senior Counselor Team Overview
          </button>

          <button
            onClick={() => { setActiveTab("UNAVAILABILITY"); setPage(1); setSelectedLeadIds([]); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "UNAVAILABILITY"
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "text-[#64748B] hover:bg-amber-50/50"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Counselor Unavailability Queue
          </button>

          <button
            onClick={() => { setActiveTab("EXCEPTIONS"); setPage(1); setSelectedLeadIds([]); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "EXCEPTIONS"
                ? "bg-red-50 text-red-600 border border-red-200"
                : "text-[#64748B] hover:bg-red-50/50"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> Routing Exceptions Queue
            {seniorStats?.routingExceptions ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {seniorStats.routingExceptions}
              </span>
            ) : null}
          </button>
        </div>

        {/* Senior Counselor Dashboard KPI Cards */}
        {seniorStats && activeTab !== "TEAM_SUMMARY" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <p className="text-[11px] text-[#64748B] font-medium">New Inquiries</p>
              <p className="text-lg font-bold text-[#0F172A]">{seniorStats.newLeads}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <p className="text-[11px] text-[#64748B] font-medium">Unassigned Counselor</p>
              <p className="text-lg font-bold text-amber-600">{seniorStats.unassignedCounselorCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <p className="text-[11px] text-[#64748B] font-medium">Active Counseling Cases</p>
              <p className="text-lg font-bold text-[#4A7B5B]">{seniorStats.counselingPending}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <p className="text-[11px] text-[#64748B] font-medium">Follow-ups Due</p>
              <p className="text-lg font-bold text-blue-600">{seniorStats.followUpsDue}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50 border border-red-100">
              <p className="text-[11px] text-red-600 font-medium">Routing Exceptions</p>
              <p className="text-lg font-bold text-red-700">{seniorStats.routingExceptions}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <p className="text-[11px] text-[#64748B] font-medium">Total Queue</p>
              <p className="text-lg font-bold text-[#0F172A]">{seniorStats.totalLeads}</p>
            </div>
          </div>
        )}

        {/* Toolbar & Filters */}
        {activeTab !== "TEAM_SUMMARY" && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student, mobile, course, branch, state..."
                className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <select
                  value={selectedStage}
                  onChange={e => setSelectedStage(e.target.value as Stage | "All")}
                  className="h-9 pl-3 pr-8 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#475569] appearance-none focus:outline-none focus:border-[#4A7B5B] cursor-pointer"
                >
                  <option value="All">All Stages</option>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
              </div>

              <button onClick={handleExport} className="h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#475569] flex items-center gap-1.5 hover:bg-[#F8FAFC]">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main View Body */}
      <div className="flex-1 overflow-y-auto p-5 lg:p-8">
        {/* TEAM SUMMARY VIEW */}
        {activeTab === "TEAM_SUMMARY" ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0F172A]">Senior Counselor Team Workload & Capacity Overview</h2>
              <span className="text-xs text-[#64748B]">{teamSummary.length} Counselors Managed</span>
            </div>

            {isTeamSummaryLoading ? (
              <div className="py-12 text-center text-xs text-[#64748B]">Loading team workload summary...</div>
            ) : teamSummary.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0] text-xs text-[#64748B]">
                No counselors currently managed under your team scope.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      <th className="py-3 px-4">Counselor</th>
                      <th className="py-3 px-4">Employee ID</th>
                      <th className="py-3 px-4">Position</th>
                      <th className="py-3 px-4">Active Counseling Cases</th>
                      <th className="py-3 px-4">Pending Follow-ups</th>
                      <th className="py-3 px-4">Capacity Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {teamSummary.map(c => (
                      <tr key={c.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-[#0F172A]">{c.fullName}</p>
                          <p className="text-xs text-[#64748B]">{c.email}</p>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#475569] font-mono">{c.employeeId}</td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className="font-medium text-[#0F172A]">{c.positionTitle}</span>
                          <span className="text-[10px] text-[#4A7B5B] block font-mono">{c.positionCode}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-[#0F172A]">
                          {c.activeCasesCount} / {c.maxCapacity}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-blue-600">{c.pendingFollowUps}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : c.status === 'FULL'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {c.status === 'FULL' ? 'FULL CAPACITY' : c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* LEADS QUEUE TABLE */
          <div>
            {isLeadsLoading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="w-8 h-8 border-3 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-[#64748B]">Loading queue records...</p>
              </div>
            ) : rawLeads.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center max-w-md mx-auto my-12 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-[#0F172A] mb-1">
                  {activeTab === "UNAVAILABILITY"
                    ? "No Counselor Unavailability Exceptions!"
                    : activeTab === "EXCEPTIONS"
                    ? "No Routing Exceptions!"
                    : "No leads found"}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {activeTab === "UNAVAILABILITY"
                    ? "All leads in your scope are currently managed by active, operational counselors."
                    : "No student inquiries matching your active queue tab."}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                        <th className="py-3 px-4 w-10">
                          <button onClick={toggleSelectAll} className="text-[#64748B] hover:text-[#0F172A]">
                            {selectedLeadIds.length === rawLeads.length ? (
                              <CheckSquare className="w-4 h-4 text-[#4A7B5B]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Geography</th>
                        <th className="py-3 px-4">Academic Interest</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Senior Counselor</th>
                        <th className="py-3 px-4">Assigned Counselor</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {rawLeads.map((lead) => {
                        const isSelected = selectedLeadIds.includes(lead.id);
                        const isException = lead.isRoutingException;
                        const isCounselorUnavailable =
                          lead.assignedCounselor?.counselorProfile?.employmentStatus &&
                          ['RESIGNED', 'DISABLED', 'SUSPENDED', 'LOCKED', 'INACTIVE'].includes(
                            lead.assignedCounselor.counselorProfile.employmentStatus
                          );

                        return (
                          <tr key={lead.id} className={`hover:bg-[#F8FAFC]/80 transition-colors ${isSelected ? 'bg-[#E8F3EC]/30' : ''}`}>
                            <td className="py-3.5 px-4">
                              <button onClick={() => toggleSelectLead(lead.id)} className="text-[#64748B]">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-[#4A7B5B]" />
                                ) : (
                                  <Square className="w-4 h-4 text-[#94A3B8]" />
                                )}
                              </button>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-bold text-xs flex items-center justify-center shrink-0">
                                  {lead.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-[#0F172A] text-sm flex items-center gap-1.5">
                                    {lead.fullName}
                                    {isException && (
                                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold">
                                        EXCEPTION
                                      </span>
                                    )}
                                    {isCounselorUnavailable && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                                        UNAVAILABLE COUNSELOR
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-[#64748B]">{lead.mobile} • {lead.email || 'No email'}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-xs text-[#334155]">
                              <div className="flex items-center gap-1 text-[#0F172A] font-medium">
                                <MapPin className="w-3 h-3 text-[#4A7B5B]" />
                                {lead.state || 'N/A'}
                              </div>
                              <p className="text-[11px] text-[#64748B] pl-4">{lead.district || lead.city || 'State-wide'}</p>
                            </td>

                            <td className="py-3.5 px-4 text-xs">
                              <p className="font-medium text-[#0F172A]">{lead.preferredCourse || lead.courseRel?.name || 'N/A'}</p>
                              <p className="text-[11px] text-[#64748B]">
                                {lead.branchRel?.name || lead.customBranchText || 'General'}
                              </p>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                STAGE_CONFIG[lead.status as Stage]?.bg || 'bg-gray-50'
                              }`} style={{ color: STAGE_CONFIG[lead.status as Stage]?.text || '#333' }}>
                                {STAGE_CONFIG[lead.status as Stage]?.label || lead.status}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-xs">
                              {lead.assignedSeniorCounselor ? (
                                <div>
                                  <p className="font-medium text-[#0F172A]">{lead.assignedSeniorCounselor.fullName}</p>
                                  {lead.assignedPosition && (
                                    <p className="text-[10px] text-[#4A7B5B] font-mono">{lead.assignedPosition.code}</p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-red-500 font-semibold text-[11px] flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Unassigned
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-xs">
                              {lead.assignedCounselor ? (
                                <div>
                                  <p className="font-medium text-[#0F172A]">{lead.assignedCounselor.fullName}</p>
                                  {isCounselorUnavailable && (
                                    <p className="text-[10px] text-amber-600 font-semibold">Staff Resigned / Disabled</p>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAssignModalLead(lead)}
                                  className="text-xs font-semibold text-[#4A7B5B] hover:underline flex items-center gap-1"
                                >
                                  <UserPlus className="w-3.5 h-3.5" /> Assign Counselor
                                </button>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isException && (
                                  <button
                                    onClick={() => setManualRouteModalLead(lead)}
                                    className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700"
                                  >
                                    Resolve Exception
                                  </button>
                                )}

                                <button
                                  onClick={() => setAssignModalLead(lead)}
                                  title="Assign / Reassign Counselor"
                                  className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569]"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => setSelectedLeadId(lead.id)}
                                  title="View Lead 360 Detail"
                                  className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#4A7B5B]"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Assign Counselor */}
      {assignModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAssignModalLead(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Assign Educational Counselor</h3>
                <p className="text-xs text-[#64748B]">
                  Lead: {assignModalLead.fullName} ({assignModalLead.state} • {assignModalLead.district || assignModalLead.city})
                </p>
              </div>
              <button onClick={() => setAssignModalLead(null)} className="p-1 rounded-lg hover:bg-[#F1F5F9]">
                <X className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>

            {isEligibleLoading ? (
              <div className="py-8 text-center text-xs text-[#64748B]">Resolving eligible scoped counselors & active workloads...</div>
            ) : eligibleCounselors.length === 0 ? (
              <div className="py-6 text-center text-xs text-amber-600 font-medium">
                No active counselors found within your authorized scope.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {eligibleCounselors.map((c) => {
                    const isFull = c.status === 'FULL';
                    const isUnavailable = c.status === 'UNAVAILABLE';
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedCounselorForAssign === c.id
                            ? "border-[#4A7B5B] bg-[#E8F3EC]/50"
                            : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="counselor_select"
                            value={c.id}
                            checked={selectedCounselorForAssign === c.id}
                            onChange={() => setSelectedCounselorForAssign(c.id)}
                            className="text-[#4A7B5B] focus:ring-[#4A7B5B]"
                          />
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">{c.fullName}</p>
                            <p className="text-xs text-[#64748B]">{c.email} • {c.department || 'Admissions'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isFull
                              ? "bg-amber-100 text-amber-800"
                              : isUnavailable
                              ? "bg-red-100 text-red-800"
                              : "bg-[#F1F5F9] text-[#475569]"
                          }`}>
                            {c.activeCasesCount} / {c.maxCapacity} Active Cases
                          </span>
                          {isFull && <p className="text-[10px] text-amber-600 font-semibold mt-0.5">FULL CAPACITY</p>}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <label className="text-xs font-semibold text-[#0F172A] block mb-1">Assignment Reason / Note</label>
                  <input
                    value={assignReason}
                    onChange={(e) => setAssignReason(e.target.value)}
                    placeholder="Provide a reason for assignment..."
                    className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="override_cap"
                    checked={overrideCapacity}
                    onChange={(e) => setOverrideCapacity(e.target.checked)}
                    className="rounded text-[#4A7B5B]"
                  />
                  <label htmlFor="override_cap" className="text-xs text-[#475569] font-medium cursor-pointer">
                    Override capacity limit if full (Requires reason & audit event)
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 mt-4 border-t border-[#E2E8F0]">
              <button
                onClick={() => setAssignModalLead(null)}
                className="flex-1 h-10 rounded-xl border border-[#E2E8F0] text-[#475569] text-sm font-medium hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                disabled={!selectedCounselorForAssign || assignCounselorMutation.isPending}
                onClick={() =>
                  assignCounselorMutation.mutate({
                    leadId: assignModalLead.id,
                    counselorId: selectedCounselorForAssign,
                    reason: assignReason,
                    overrideCapacity,
                  })
                }
                className="flex-1 h-10 rounded-xl text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                style={{ background: "#4A7B5B" }}
              >
                {assignCounselorMutation.isPending ? "Assigning..." : "Confirm Counselor Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bulk Reassign */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBulkModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Bulk Reassign Counselor</h3>
                <p className="text-xs text-[#64748B]">{selectedLeadIds.length} leads selected for bulk transfer</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-1 rounded-lg hover:bg-[#F1F5F9]">
                <X className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>

            {bulkResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-sm font-bold text-emerald-800">
                    Bulk Operation Completed: {bulkResult.successCount} Succeeded, {bulkResult.failureCount} Failed
                  </p>
                </div>

                {bulkResult.failureCount > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    <p className="text-xs font-bold text-red-600">Failed Leads Summary:</p>
                    {bulkResult.failures.map((f, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-red-50 text-xs text-red-700 font-mono">
                        Lead {f.leadId}: {f.reason}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => { setShowBulkModal(false); setBulkResult(null); }}
                  className="w-full h-10 rounded-xl bg-[#4A7B5B] text-white font-medium text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#0F172A] block mb-1">Select Target Counselor *</label>
                  <select
                    value={bulkCounselorId}
                    onChange={(e) => setBulkCounselorId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm bg-white focus:outline-none focus:border-[#4A7B5B]"
                  >
                    <option value="">Select counselor...</option>
                    {eligibleCounselors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.activeCasesCount}/{c.maxCapacity} cases - {c.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#0F172A] block mb-1">Mandatory Reassignment Reason *</label>
                  <textarea
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                    placeholder="Provide reason for bulk transfer..."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="bulk_override"
                    checked={bulkOverrideCapacity}
                    onChange={(e) => setBulkOverrideCapacity(e.target.checked)}
                    className="rounded text-[#4A7B5B]"
                  />
                  <label htmlFor="bulk_override" className="text-xs text-[#475569] font-medium cursor-pointer">
                    Override capacity limit if target is full
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
                  <button
                    onClick={() => setShowBulkModal(false)}
                    className="flex-1 h-10 rounded-xl border border-[#E2E8F0] text-[#475569] text-sm font-medium hover:bg-[#F8FAFC]"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!bulkCounselorId || !bulkReason.trim() || bulkReassignMutation.isPending}
                    onClick={() =>
                      bulkReassignMutation.mutate({
                        leadIds: selectedLeadIds,
                        targetCounselorId: bulkCounselorId,
                        reason: bulkReason,
                        overrideCapacity: bulkOverrideCapacity,
                      })
                    }
                    className="flex-1 h-10 rounded-xl text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    style={{ background: "#4A7B5B" }}
                  >
                    {bulkReassignMutation.isPending ? "Executing Bulk Transfer..." : "Confirm Bulk Reassign"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Manual Route / Resolve Exception */}
      {manualRouteModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setManualRouteModalLead(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Manual Senior Counselor Route Override</h3>
                <p className="text-xs text-[#64748B]">
                  Lead: {manualRouteModalLead.fullName} ({manualRouteModalLead.state} • {manualRouteModalLead.district || manualRouteModalLead.city})
                </p>
              </div>
              <button onClick={() => setManualRouteModalLead(null)} className="p-1 rounded-lg hover:bg-[#F1F5F9]">
                <X className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>

            {manualRouteModalLead.routingExceptionReason && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 mb-4 font-medium">
                Exception Reason: {manualRouteModalLead.routingExceptionReason}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#0F172A] block mb-1">Select Senior Counselor *</label>
                <select
                  value={selectedSeniorForRoute}
                  onChange={(e) => setSelectedSeniorForRoute(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm bg-white focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">Select target Senior Counselor...</option>
                  {eligibleSeniorCounselors && eligibleSeniorCounselors.length > 0 ? (
                    eligibleSeniorCounselors.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.fullName} ({sc.email}) — {sc.designation} {sc.badge ? `[${sc.badge}]` : ''} • {sc.activeLeadsCount} active leads
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      {seniorCounselorsQuery.isLoading ? "Loading eligible Senior Counselors..." : "No eligible Senior Counselors found"}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0F172A] block mb-1">Override Reason *</label>
                <textarea
                  value={routeReason}
                  onChange={(e) => setRouteReason(e.target.value)}
                  placeholder="Explain why this lead is being manually assigned..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-5 mt-4 border-t border-[#E2E8F0]">
              <button
                onClick={() => setManualRouteModalLead(null)}
                className="flex-1 h-10 rounded-xl border border-[#E2E8F0] text-[#475569] text-sm font-medium hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                disabled={!selectedSeniorForRoute || !routeReason.trim() || manualRouteMutation.isPending}
                onClick={() =>
                  manualRouteMutation.mutate({
                    leadId: manualRouteModalLead.id,
                    seniorCounselorId: selectedSeniorForRoute,
                    reason: routeReason,
                  })
                }
                className="flex-1 h-10 rounded-xl text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 bg-red-600 hover:bg-red-700"
              >
                {manualRouteMutation.isPending ? "Routing..." : "Confirm Manual Override"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Lead 360 Detail View */}
      {selectedLeadDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedLeadId(null)} />
          <div className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#0F172A]">{selectedLeadDetail.fullName}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-bold text-xs">
                    {selectedLeadDetail.status}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">{selectedLeadDetail.mobile} • {selectedLeadDetail.email || 'No email'}</p>
              </div>
              <button onClick={() => setSelectedLeadId(null)} className="p-2 rounded-xl hover:bg-[#E2E8F0]/50 text-[#64748B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scroll Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Routing & Ownership Status Box */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">CRM Operational Ownership</h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#64748B] block">Senior Counselor:</span>
                    <span className="font-semibold text-[#0F172A]">
                      {selectedLeadDetail.assignedSeniorCounselor?.fullName || 'Unassigned'}
                    </span>
                    {selectedLeadDetail.assignedPosition && (
                      <span className="text-[10px] text-[#4A7B5B] block font-mono">
                        Position: {selectedLeadDetail.assignedPosition.code}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[#64748B] block">Assigned Counselor:</span>
                    <span className="font-semibold text-[#0F172A]">
                      {selectedLeadDetail.assignedCounselor?.fullName || 'Not assigned'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E2E8F0] flex gap-2">
                  <button
                    onClick={() => setAssignModalLead(selectedLeadDetail)}
                    className="flex-1 h-8 rounded-lg bg-[#4A7B5B] text-white text-xs font-medium hover:opacity-90"
                  >
                    Assign Counselor
                  </button>
                  <button
                    onClick={() => setManualRouteModalLead(selectedLeadDetail)}
                    className="h-8 px-3 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-[#F1F5F9]"
                  >
                    Re-route / Override
                  </button>
                </div>
              </div>

              {/* Next Operational Action Card */}
              <NextActionPanel
                contextType="LEAD"
                contextId={selectedLeadDetail.id}
                leadName={selectedLeadDetail.fullName}
                assignedCounselorId={selectedLeadDetail.assignedCounselorId}
                onOpenLogModal={(tab) => {
                  setLeadLogTab(tab);
                  setLeadLogModalOpen(true);
                }}
              />

              {/* Personal & Academic Profile */}
              <div>
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">Academic & Geography Profile</h4>
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white border border-[#E2E8F0] text-xs">
                  <div><span className="text-[#64748B]">State:</span> <p className="font-medium">{selectedLeadDetail.state || 'N/A'}</p></div>
                  <div><span className="text-[#64748B]">District/City:</span> <p className="font-medium">{selectedLeadDetail.district || selectedLeadDetail.city || 'N/A'}</p></div>
                  <div><span className="text-[#64748B]">Education Level:</span> <p className="font-medium">{selectedLeadDetail.educationLevel || 'N/A'}</p></div>
                  <div><span className="text-[#64748B]">Passing Year / Stream:</span> <p className="font-medium">{selectedLeadDetail.passingYear || 'N/A'} • {selectedLeadDetail.stream || 'N/A'}</p></div>
                  <div><span className="text-[#64748B]">Course Interest:</span> <p className="font-medium text-[#4A7B5B]">{selectedLeadDetail.preferredCourse || 'N/A'}</p></div>
                  <div><span className="text-[#64748B]">Branch Interest:</span> <p className="font-medium">{selectedLeadDetail.branchRel?.name || 'General'}</p></div>
                  <div><span className="text-[#64748B]">College Choice:</span> <p className="font-medium">{selectedLeadDetail.preferredCollege || selectedLeadDetail.preferredCollegeText || 'Open'}</p></div>
                  <div><span className="text-[#64748B]">Annual Budget:</span> <p className="font-medium">{selectedLeadDetail.budget || 'N/A'}</p></div>
                </div>
              </div>

              {/* Centralized Admission Journey & Multi-Applications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Overall Student Journey</h4>
                  {studentJourneyData?.overallJourney && (
                    <span className="text-xs font-bold text-[#4A7B5B] bg-[#E8F3EC] px-2.5 py-0.5 rounded-full">
                      {studentJourneyData.overallJourney.progress}% Completed
                    </span>
                  )}
                </div>

                {/* Overall Checkpoints */}
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                  {studentJourneyData?.overallJourney?.checkpoints.map((step) => (
                    <div key={step.id} className="flex items-start gap-2.5 text-xs py-1">
                      {step.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#4A7B5B] shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="w-4 h-4 text-[#94A3B8] shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between font-semibold text-[#0F172A]">
                          <span>{step.title}</span>
                          <span className="text-[10px] text-[#64748B]">{step.date}</span>
                        </div>
                        <p className="text-[11px] text-[#64748B]">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Student Applications Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      Student Applications ({studentJourneyData?.applicationsCount || 0})
                    </h4>
                  </div>

                  {!studentJourneyData?.applications?.length ? (
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-dashed border-[#CBD5E1] text-center text-xs text-[#64748B]">
                      No active applications submitted yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studentJourneyData.applications.map((app) => (
                        <div key={app.applicationId} className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-mono text-[#64748B]">#APP-{app.applicationNumber}</span>
                              <h5 className="font-bold text-sm text-[#0F172A]">{app.college.name}</h5>
                              <p className="text-xs text-[#475569]">
                                {app.course.name} • <span className="font-semibold text-[#4A7B5B]">{app.branch.code}</span>
                              </p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] text-[10px] font-bold">
                              {app.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-2 border-t border-[#F1F5F9]">
                            <div>
                              <span className="text-[#64748B]">Payment: </span>
                              <span className={`font-semibold ${app.paymentStatus === 'SUCCESS' || app.paymentStatus === 'COMPLETED' ? 'text-green-600' : 'text-amber-600'}`}>
                                {app.paymentStatus}
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedAppJourney(app)}
                              className="h-7 px-3 rounded-lg bg-[#E8F3EC] text-[#4A7B5B] font-bold text-xs hover:bg-[#4A7B5B] hover:text-white transition-colors"
                            >
                              View Journey →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment History Timeline */}
              <div>
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">Assignment Ownership History</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedLeadDetail.leadAssignments?.map((rec) => (
                    <div key={rec.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
                      <div className="flex items-center justify-between font-semibold text-[#0F172A] mb-1">
                        <span>{rec.assignedToUser?.fullName || 'System'} ({rec.assignmentType})</span>
                        <span className="text-[10px] text-[#94A3B8]">{new Date(rec.assignedAt).toLocaleString()}</span>
                      </div>
                      <p className="text-[#475569]">Reason: {rec.reason || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Authoritative Central Activity & Timeline */}
              <CentralActivityTimeline
                contextType="LEAD"
                contextId={selectedLeadDetail.id}
                leadName={selectedLeadDetail.fullName}
                assignedCounselorId={selectedLeadDetail.assignedCounselorId}
              />
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Application-Specific Journey View */}
      {selectedAppJourney && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedAppJourney(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#64748B]">#APP-{selectedAppJourney.applicationNumber}</span>
                <h3 className="text-base font-bold text-[#0F172A]">{selectedAppJourney.college.name}</h3>
                <p className="text-xs text-[#475569]">
                  {selectedAppJourney.course.name} • <span className="font-semibold text-[#4A7B5B]">{selectedAppJourney.branch.code}</span>
                </p>
              </div>
              <button onClick={() => setSelectedAppJourney(null)} className="p-2 rounded-xl hover:bg-[#E2E8F0] text-[#64748B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scroll Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Header */}
              <div className="p-4 rounded-2xl bg-[#E8F3EC] border border-[#BBF7D0] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#4A7B5B] uppercase font-bold tracking-wider">Application Journey Status</span>
                  <div className="text-base font-extrabold text-[#0F172A]">{selectedAppJourney.status}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#4A7B5B]">{selectedAppJourney.progress}% Completed</span>
                  <div className="w-24 h-2 bg-white rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-[#4A7B5B] transition-all" style={{ width: `${selectedAppJourney.progress}%` }} />
                  </div>
                </div>
              </div>

              {/* Application Checkpoints */}
              <div>
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">Application Checkpoints</h4>
                <div className="space-y-3">
                  {selectedAppJourney.checkpoints.map((step) => (
                    <div key={step.id} className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white flex items-start gap-3">
                      {step.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-[#4A7B5B] shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="w-5 h-5 text-[#94A3B8] shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between font-semibold text-xs text-[#0F172A]">
                          <span>
                            {step.title} {step.isOptional && <span className="text-[10px] text-[#64748B] font-normal">(Optional)</span>}
                          </span>
                          <span className="text-[10px] text-[#64748B]">{step.date}</span>
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Application Timeline Events */}
              <div>
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">Application Event Audit Log</h4>
                <div className="space-y-2">
                  {selectedAppJourney.timeline.map((evt) => (
                    <div key={evt.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-[#0F172A]">
                        <span>{evt.title}</span>
                        <span className="text-[10px] text-[#94A3B8]">{evt.timestamp}</span>
                      </div>
                      <p className="text-[#475569]">{evt.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRM Interaction Log Modal */}
      {selectedLeadDetail && (
        <LogInteractionModal
          isOpen={leadLogModalOpen}
          onClose={() => setLeadLogModalOpen(false)}
          contextType="LEAD"
          contextId={selectedLeadDetail.id}
          leadName={selectedLeadDetail.fullName}
          assignedCounselorId={selectedLeadDetail.assignedCounselorId}
          defaultTab={leadLogTab}
        />
      )}
    </div>
  );
}
