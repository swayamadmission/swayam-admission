import { useState } from "react";
import {
  Search,
  LifeBuoy,
  Clock,
  CheckCircle2,
  AlertOctagon,
  MessageSquare,
  Plus,
  RefreshCw,
  Eye,
  UserCheck,
  Filter,
  Layers,
  ArrowUpDown,
  AlertTriangle,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  supportApi,
  SupportTicketItem,
  SupportTicketQuery,
  BulkSupportActionPayload,
} from "../../api/support.api";
import SupportTicketDrawer from "./SupportTicketDrawer";

export default function SupportTicketsPage() {
  const queryClient = useQueryClient();
  const [activeQueue, setActiveQueue] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedSlaStatus, setSelectedSlaStatus] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Bulk Selection State
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [bulkActionType, setBulkActionType] = useState<string>("");
  const [bulkTargetValue, setBulkTargetValue] = useState<string>("");
  const [bulkReason, setBulkReason] = useState<string>("");

  const queryParams: SupportTicketQuery = {
    search: search || undefined,
    category: selectedCategory || undefined,
    priority: selectedPriority || undefined,
    status: selectedStatus || undefined,
    slaStatus: selectedSlaStatus || undefined,
    queue: activeQueue === "all" ? undefined : activeQueue,
    page,
    limit: 25,
  };

  const { data: dashboardRes } = useQuery({
    queryKey: ["support_dashboard"],
    queryFn: () => supportApi.getDashboard(),
    refetchInterval: 10000,
  });

  const { data: ticketsRes, isLoading, refetch } = useQuery({
    queryKey: ["admin_support_tickets", queryParams],
    queryFn: () => supportApi.getTickets(queryParams),
    refetchInterval: 8000,
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ["support_categories"],
    queryFn: () => supportApi.getCategories(),
  });

  const stats = dashboardRes?.data || {
    totalTickets: 0,
    openTickets: 0,
    myTickets: 0,
    inProgressTickets: 0,
    waitingStudentTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    escalatedTickets: 0,
    slaBreached: 0,
    avgSatisfactionRating: 4.8,
  };

  const categories = categoriesRes?.data || [];
  const tickets: SupportTicketItem[] = ticketsRes?.data?.data || ticketsRes?.data || [];
  const meta = ticketsRes?.data?.meta || { total: tickets.length, page: 1, totalPages: 1 };

  // Bulk Mutation
  const bulkMutation = useMutation({
    mutationFn: (payload: BulkSupportActionPayload) => supportApi.bulkAction(payload),
    onSuccess: () => {
      setSelectedTicketIds([]);
      setBulkActionType("");
      setBulkTargetValue("");
      setBulkReason("");
      queryClient.invalidateQueries({ queryKey: ["admin_support_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support_dashboard"] });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTicketIds(tickets.map((t) => t.id));
    } else {
      setSelectedTicketIds([]);
    }
  };

  const handleToggleTicket = (id: string) => {
    setSelectedTicketIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkAction = () => {
    if (!bulkActionType || selectedTicketIds.length === 0) return;

    let payload: BulkSupportActionPayload;
    if (bulkActionType === "ASSIGN") {
      payload = {
        ticketIds: selectedTicketIds,
        action: "ASSIGN",
        assignedToId: bulkTargetValue,
        reason: bulkReason,
      };
    } else if (bulkActionType === "CHANGE_STATUS") {
      payload = {
        ticketIds: selectedTicketIds,
        action: "CHANGE_STATUS",
        status: bulkTargetValue,
        reason: bulkReason,
      };
    } else if (bulkActionType === "CHANGE_PRIORITY") {
      payload = {
        ticketIds: selectedTicketIds,
        action: "CHANGE_PRIORITY",
        priority: bulkTargetValue,
        reason: bulkReason,
      };
    } else {
      payload = {
        ticketIds: selectedTicketIds,
        action: "CLOSE",
        reason: bulkReason,
      };
    }

    bulkMutation.mutate(payload);
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      const res = await supportApi.exportTickets(format, queryParams);
      const dataPayload = res.data?.data || res.data;
      if (format === "csv") {
        const blob = new Blob([dataPayload], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `support_tickets_${Date.now()}.csv`;
        a.click();
      } else {
        const jsonStr = typeof dataPayload === "string" ? dataPayload : JSON.stringify(dataPayload, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `support_tickets_${Date.now()}.json`;
        a.click();
      }
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const priorityBadges: Record<string, string> = {
    LOW: "bg-slate-100 text-slate-700 border-slate-200",
    MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
    HIGH: "bg-amber-50 text-amber-700 border-amber-200",
    URGENT: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
    CRITICAL: "bg-red-100 text-red-900 border-red-300 font-extrabold animate-pulse",
  };

  const statusBadges: Record<string, string> = {
    OPEN: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
    IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200 font-semibold",
    WAITING_FOR_STUDENT: "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
    WAITING_STUDENT: "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
    RESOLVED: "bg-teal-50 text-teal-800 border-teal-200 font-bold",
    CLOSED: "bg-gray-100 text-gray-700 border-gray-200",
    ESCALATED: "bg-rose-100 text-rose-800 border-rose-300 font-extrabold",
    REOPENED: "bg-orange-50 text-orange-800 border-orange-200 font-bold",
  };

  const slaBadges: Record<string, string> = {
    ON_TRACK: "bg-emerald-50 text-emerald-700 border-emerald-200",
    DUE_SOON: "bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse",
    BREACHED: "bg-rose-50 text-rose-800 border-rose-300 font-extrabold",
    COMPLETED: "bg-slate-50 text-slate-500 border-slate-200",
  };

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100%" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Support Desk</h1>
          <p className="text-xs text-slate-500 mt-1">Multi-queue ticket management, dynamic SLA compliance, and cross-department resolution.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport("json")}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            Export JSON
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div
          onClick={() => { setActiveQueue("all"); setPage(1); }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeQueue === "all" ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/10" : "bg-white border-gray-100 hover:border-gray-300 shadow-sm"
          }`}
        >
          <span className="text-[11px] font-semibold text-gray-400 block">Total Tickets</span>
          <span className="text-xl font-extrabold text-slate-900">{stats.totalTickets}</span>
        </div>

        <div
          onClick={() => { setActiveQueue("my"); setPage(1); }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeQueue === "my" ? "bg-white border-blue-500 shadow-md ring-2 ring-blue-500/10" : "bg-white border-gray-100 hover:border-gray-300 shadow-sm"
          }`}
        >
          <span className="text-[11px] font-semibold text-blue-500 block">My Queue</span>
          <span className="text-xl font-extrabold text-blue-700">{stats.myTickets || 0}</span>
        </div>

        <div
          onClick={() => { setActiveQueue("unassigned"); setPage(1); }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeQueue === "unassigned" ? "bg-white border-amber-500 shadow-md ring-2 ring-amber-500/10" : "bg-white border-gray-100 hover:border-gray-300 shadow-sm"
          }`}
        >
          <span className="text-[11px] font-semibold text-amber-500 block">Unassigned</span>
          <span className="text-xl font-extrabold text-amber-700">{stats.totalTickets - (stats.assignedTickets || 0)}</span>
        </div>

        <div
          onClick={() => { setActiveQueue("team"); setPage(1); }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeQueue === "team" ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/10" : "bg-white border-gray-100 hover:border-gray-300 shadow-sm"
          }`}
        >
          <span className="text-[11px] font-semibold text-emerald-600 block">In Progress</span>
          <span className="text-xl font-extrabold text-emerald-700">{stats.inProgressTickets}</span>
        </div>

        <div
          onClick={() => { setActiveQueue("escalated"); setPage(1); }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeQueue === "escalated" ? "bg-white border-rose-500 shadow-md ring-2 ring-rose-500/10" : "bg-white border-gray-100 hover:border-gray-300 shadow-sm"
          }`}
        >
          <span className="text-[11px] font-semibold text-rose-500 block">Escalated</span>
          <span className="text-xl font-extrabold text-rose-700">{stats.escalatedTickets}</span>
        </div>

        <div
          onClick={() => { setActiveQueue("overdue"); setPage(1); }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeQueue === "overdue" ? "bg-white border-red-500 shadow-md ring-2 ring-red-500/10" : "bg-white border-gray-100 hover:border-gray-300 shadow-sm"
          }`}
        >
          <span className="text-[11px] font-semibold text-red-600 block">SLA Breached</span>
          <span className="text-xl font-extrabold text-red-700">{stats.slaBreached}</span>
        </div>

        <div
          onClick={() => { setActiveQueue("resolved"); setPage(1); }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeQueue === "resolved" ? "bg-white border-teal-500 shadow-md ring-2 ring-teal-500/10" : "bg-white border-gray-100 hover:border-gray-300 shadow-sm"
          }`}
        >
          <span className="text-[11px] font-semibold text-teal-600 block">Resolved</span>
          <span className="text-xl font-extrabold text-teal-700">{stats.resolvedTickets}</span>
        </div>
      </div>

      {/* Queue Selection Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 pb-2 overflow-x-auto text-xs">
        {[
          { key: "all", label: "All Tickets" },
          { key: "my", label: "My Queue" },
          { key: "team", label: "Team Assigned" },
          { key: "unassigned", label: "Unassigned Tickets" },
          { key: "escalated", label: "Escalated & High Risk" },
          { key: "overdue", label: "SLA Overdue" },
          { key: "resolved", label: "Resolved" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveQueue(tab.key);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
              activeQueue === tab.key
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#F1F5F9] shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search ticket ID (SUP-...), subject, student name, email, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs text-slate-700 font-medium focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedPriority}
          onChange={(e) => { setSelectedPriority(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs text-slate-700 font-medium focus:outline-none"
        >
          <option value="">All Priorities</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="URGENT">URGENT</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs text-slate-700 font-medium focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="WAITING_FOR_STUDENT">WAITING_FOR_STUDENT</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
          <option value="ESCALATED">ESCALATED</option>
          <option value="REOPENED">REOPENED</option>
        </select>

        <select
          value={selectedSlaStatus}
          onChange={(e) => { setSelectedSlaStatus(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs text-slate-700 font-medium focus:outline-none"
        >
          <option value="">All SLA States</option>
          <option value="ON_TRACK">On Track</option>
          <option value="DUE_SOON">Due Soon (&lt; 2h)</option>
          <option value="BREACHED">SLA Breached</option>
        </select>
      </div>

      {/* Bulk Action Bar (When tickets selected) */}
      {selectedTicketIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[11px] font-black">
              {selectedTicketIds.length}
            </span>
            <span>Tickets Selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={bulkActionType}
              onChange={(e) => { setBulkActionType(e.target.value); setBulkTargetValue(""); }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none"
            >
              <option value="">Select Bulk Action</option>
              <option value="CHANGE_STATUS">Change Status</option>
              <option value="CHANGE_PRIORITY">Change Priority</option>
              <option value="CLOSE">Close Tickets</option>
            </select>

            {bulkActionType === "CHANGE_STATUS" && (
              <select
                value={bulkTargetValue}
                onChange={(e) => setBulkTargetValue(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none"
              >
                <option value="">Select Status</option>
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="WAITING_FOR_STUDENT">WAITING_FOR_STUDENT</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            )}

            {bulkActionType === "CHANGE_PRIORITY" && (
              <select
                value={bulkTargetValue}
                onChange={(e) => setBulkTargetValue(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none"
              >
                <option value="">Select Priority</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            )}

            <button
              disabled={!bulkActionType || bulkMutation.isPending}
              onClick={handleExecuteBulkAction}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-40 transition-all text-xs"
            >
              {bulkMutation.isPending ? "Executing..." : "Apply Bulk Update"}
            </button>

            <button
              onClick={() => setSelectedTicketIds([])}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tickets Table */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-500 font-medium text-xs">Loading support tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <LifeBuoy className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No support tickets in this queue</h3>
          <p className="text-gray-500 text-xs mt-1">There are no tickets matching your current filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedTicketIds.length === tickets.length && tickets.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-4 py-3.5">Ticket ID & Requester</th>
                <th className="px-4 py-3.5">Subject & Category</th>
                <th className="px-4 py-3.5">Assignee</th>
                <th className="px-4 py-3.5">Priority / Status</th>
                <th className="px-4 py-3.5">SLA Compliance</th>
                <th className="px-4 py-3.5">Created Date</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {tickets.map((t: SupportTicketItem) => {
                const isChecked = selectedTicketIds.includes(t.id);
                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                      isChecked ? "bg-emerald-50/30" : ""
                    }`}
                  >
                    <td
                      className="px-4 py-3.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleTicket(t.id)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td
                      className="px-4 py-3.5"
                      onClick={() => setSelectedTicketId(t.id)}
                    >
                      <div className="font-mono font-extrabold text-slate-900">{t.ticketId}</div>
                      <div className="text-[11px] text-gray-500 font-medium">{t.user?.fullName || "Student"}</div>
                    </td>
                    <td
                      className="px-4 py-3.5 max-w-xs"
                      onClick={() => setSelectedTicketId(t.id)}
                    >
                      <div className="font-bold text-slate-800 truncate">{t.subject}</div>
                      <div className="text-[11px] text-gray-400 font-medium">{t.category}</div>
                    </td>
                    <td
                      className="px-4 py-3.5"
                      onClick={() => setSelectedTicketId(t.id)}
                    >
                      {t.assignedTo ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="font-semibold text-slate-800 text-xs">{t.assignedTo.fullName}</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3.5"
                      onClick={() => setSelectedTicketId(t.id)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityBadges[t.priority] || ""}`}>
                          {t.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadges[t.status] || ""}`}>
                          {t.status}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3.5"
                      onClick={() => setSelectedTicketId(t.id)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${slaBadges[t.slaStatus || "ON_TRACK"]}`}>
                          {t.slaStatus === "BREACHED" ? "BREACHED" : t.slaStatus === "DUE_SOON" ? "DUE SOON" : t.slaStatus || "ON TRACK"}
                        </span>
                        {t.slaDeadline && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(t.slaDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className="px-4 py-3.5 text-gray-500 font-mono text-[11px]"
                      onClick={() => setSelectedTicketId(t.id)}
                    >
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedTicketId(t.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1 transition-all"
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-5 py-3.5 bg-slate-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing Page {meta.page} of {meta.totalPages} ({meta.total} Total Tickets)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 h-8 rounded-lg border border-gray-200 bg-white font-semibold disabled:opacity-40 shadow-sm"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 h-8 rounded-lg border border-gray-200 bg-white font-semibold disabled:opacity-40 shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail & Thread Drawer */}
      <SupportTicketDrawer
        ticketId={selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
      />
    </div>
  );
}
