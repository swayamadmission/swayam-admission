import { useState } from "react";
import { Search, Activity, Clock, ShieldAlert, CheckCircle2, AlertTriangle, FileSpreadsheet, Download, RefreshCw, Eye, Filter, ShieldCheck, KeyRound, Building2, GraduationCap, CreditCard, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { activityLogsApi, AuditLogItem, AuditLogQuery } from "../../api/activityLogs.api";
import ActivityLogDrawer from "./ActivityLogDrawer";

type GovernanceTab = "ALL" | "SECURITY" | "HIGH_RISK" | "IAM" | "ADMISSIONS" | "FINANCE" | "DOCUMENTS";

export default function ActivityLogsPage() {
  const [activeTab, setActiveTab] = useState<GovernanceTab>("ALL");
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedEntityType, setSelectedEntityType] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [page, setPage] = useState(1);

  // Derive active tab query filters
  const getTabFilters = (): Partial<AuditLogQuery> => {
    switch (activeTab) {
      case "SECURITY":
        return { securityOnly: true };
      case "HIGH_RISK":
        return { severity: "CRITICAL" };
      case "IAM":
        return { module: "ROLES" };
      case "ADMISSIONS":
        return { module: "APPLICATIONS" };
      case "FINANCE":
        return { module: "PAYMENTS" };
      case "DOCUMENTS":
        return { module: "DOCUMENTS" };
      default:
        return {};
    }
  };

  const queryParams: AuditLogQuery = {
    ...getTabFilters(),
    search: search || undefined,
    module: selectedModule || (activeTab === "ALL" ? undefined : getTabFilters().module),
    severity: selectedSeverity || (activeTab === "ALL" ? undefined : getTabFilters().severity),
    status: selectedStatus || undefined,
    entityType: selectedEntityType || undefined,
    page,
    limit: 30,
  };

  // Fetch Live Audit Stats
  const { data: statsRes } = useQuery({
    queryKey: ["audit_stats"],
    queryFn: () => activityLogsApi.getStats(),
    refetchInterval: 10000,
  });

  // Fetch Live Activity Logs
  const { data: logsRes, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin_activity_logs", queryParams],
    queryFn: () => activityLogsApi.getLogs(queryParams),
    refetchInterval: 10000,
  });

  const stats = statsRes?.data || {
    totalActivities: 0,
    todayActivities: 0,
    successfulActions: 0,
    failedActions: 0,
    securityEvents: 0,
    criticalEvents: 0,
    activeUsers: 1,
    avgResponseTimeMs: 14,
    topActiveModule: "CRM",
  };

  const logsData: AuditLogItem[] = logsRes?.data?.data || logsRes?.data || [];
  const meta = logsRes?.data?.meta || { total: logsData.length, page: 1, totalPages: 1 };

  const handleExportCSV = async () => {
    try {
      const res = await activityLogsApi.exportLogs(queryParams, "csv");
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_logs_${Date.now()}.csv`;
      a.click();
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const severityBadges: Record<string, string> = {
    INFO: "bg-blue-50 text-blue-700 border-blue-200",
    SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
    WARNING: "bg-amber-50 text-amber-700 border-amber-200",
    ERROR: "bg-rose-50 text-rose-700 border-rose-200",
    CRITICAL: "bg-red-100 text-red-900 border-red-300 font-extrabold",
    SECURITY: "bg-purple-50 text-purple-700 border-purple-200 shadow-xs",
    SYSTEM: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100%" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Governance & Audit Control Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E8F3EC] text-[#4A7B5B] border border-emerald-200">
              IMMUTABLE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Authoritative append-only audit trail and compliance investigation across all platform events.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition-all shadow-xs"
            style={{ background: "#4A7B5B" }}
          >
            <Download className="w-3.5 h-3.5" />
            Export Filtered CSV
          </button>
        </div>
      </div>

      {/* Live Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">Total Audited Events</span>
          <span className="text-xl font-extrabold text-slate-900">{stats.totalActivities}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">Today's Events</span>
          <span className="text-xl font-extrabold text-blue-600">{stats.todayActivities}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">Successful Actions</span>
          <span className="text-xl font-extrabold text-emerald-600">{stats.successfulActions}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">Failed / Denied</span>
          <span className="text-xl font-extrabold text-rose-600">{stats.failedActions}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">Security Events</span>
          <span className="text-xl font-extrabold text-purple-600">{stats.securityEvents}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">Avg Response</span>
          <span className="text-xl font-extrabold text-slate-700">{stats.avgResponseTimeMs} ms</span>
        </div>
      </div>

      {/* Governance Queue Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: "ALL", label: "All Events", icon: Activity },
          { id: "SECURITY", label: "Security & Auth", icon: ShieldAlert },
          { id: "HIGH_RISK", label: "High Risk & Critical", icon: AlertTriangle },
          { id: "IAM", label: "IAM & Staff Posts", icon: KeyRound },
          { id: "ADMISSIONS", label: "Admissions", icon: GraduationCap },
          { id: "FINANCE", label: "Finance & Payments", icon: CreditCard },
          { id: "DOCUMENTS", label: "Documents & KYC", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as GovernanceTab);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-[#4A7B5B] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by actor, action, entityId, requestId, IP address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
          />
        </div>

        <select
          value={selectedModule}
          onChange={(e) => {
            setSelectedModule(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none"
        >
          <option value="">All Modules</option>
          <option value="AUTH">AUTH</option>
          <option value="STUDENTS">STUDENTS</option>
          <option value="LEADS">LEADS CRM</option>
          <option value="APPLICATIONS">APPLICATIONS</option>
          <option value="PAYMENTS">PAYMENTS</option>
          <option value="DOCUMENTS">DOCUMENTS</option>
          <option value="ROLES">ROLES & IAM</option>
          <option value="SETTINGS">SETTINGS</option>
          <option value="SUPPORT">SUPPORT</option>
          <option value="SYSTEM">SYSTEM</option>
        </select>

        <select
          value={selectedEntityType}
          onChange={(e) => {
            setSelectedEntityType(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none"
        >
          <option value="">All Entity Types</option>
          <option value="User">User</option>
          <option value="Application">Application</option>
          <option value="Lead">Lead</option>
          <option value="Payment">Payment</option>
          <option value="Document">Document</option>
          <option value="Ticket">Ticket</option>
          <option value="Position">Position</option>
          <option value="Setting">Setting</option>
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => {
            setSelectedSeverity(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none"
        >
          <option value="">All Severities</option>
          <option value="INFO">INFO</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="WARNING">WARNING</option>
          <option value="ERROR">ERROR</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="SECURITY">SECURITY</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="PENDING">PENDING</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-500 font-medium">Loading audit events from PostgreSQL...</div>
      ) : logsData.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <Activity className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-base font-bold text-slate-900">No audit records found</h3>
          <p className="text-slate-500 text-xs mt-1">Try resetting search query or selecting a different governance tab.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor Attribution</th>
                <th className="px-5 py-3.5">Action & Entity Context</th>
                <th className="px-5 py-3.5">Severity / Result</th>
                <th className="px-5 py-3.5">Client Context</th>
                <th className="px-5 py-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {logsData.map((log: AuditLogItem) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Clock size={13} className="text-slate-400" />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900">{log.userName || "System / Guest"}</div>
                    <div className="text-[11px] text-slate-400">
                      {log.email || (log.userId ? `ID: ${log.userId.slice(-6)}` : "Automated Job")}
                    </div>
                    {log.companyEmail && (
                      <div className="text-[10px] text-emerald-700 font-mono mt-0.5">{log.companyEmail}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-extrabold text-slate-800">{log.action}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      <span className="font-semibold text-slate-700">{log.module}</span>
                      {log.entityType && (
                        <span> • {log.entityType} {log.entityId ? `(#${log.entityId.slice(-8)})` : ""}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${severityBadges[log.severity] || "bg-slate-50 text-slate-700"}`}>
                        {log.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${log.status === "SUCCESS" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                        {log.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                    <div>{log.ipAddress || "127.0.0.1"}</div>
                    <div className="text-slate-400 text-[10px]">{log.browser || "Browser"} / {log.operatingSystem || "OS"}</div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-[#E8F3EC] hover:text-[#4A7B5B] flex items-center justify-center ml-auto text-slate-600 transition-colors">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Footer */}
          <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing Page {meta.page} of {meta.totalPages} ({meta.total} Total Records)</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 h-8 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 hover:bg-slate-50 transition-all"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 h-8 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 hover:bg-slate-50 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <ActivityLogDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}

