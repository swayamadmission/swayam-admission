import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, Download, Calendar, Filter, Star, RefreshCw,
  Users, GraduationCap, IndianRupee, Clock, AlertTriangle,
  CheckCircle2, Building2, BookOpen, MapPin, ChevronRight,
  Shield, Layers, Award, FileText, ArrowUpRight, Zap,
  Search, X, Eye, Bookmark, Check, ArrowRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsApi, EnterpriseAnalyticsQueryParams } from "../../api/analytics.api";
import { toast } from "sonner";
import ErrorBoundary from "./ErrorBoundary";

const BRAND_COLORS = {
  primary: "#4A7B5B",
  dark: "#4A7B5B",
  lightGreen: "#E8F3EC",
  gold: "#F0AE1A",
  background: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  textMuted: "#64748B",
  blue: "#0EA5E9",
  purple: "#8B5CF6",
  rose: "#F43F5E",
};

const PIE_COLORS = ["#4A7B5B", "#0EA5E9", "#F0AE1A", "#8B5CF6", "#10B981", "#EC4899", "#F97316"];

export default function AnalyticsPage() {
  const queryClient = useQueryClient();

  // Active Main MIS Tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "funnel" | "counselors" | "colleges" | "geography" | "finance" | "sla" | "reports"
  >("overview");

  // Global Filter State
  const [period, setPeriod] = useState<EnterpriseAnalyticsQueryParams["period"]>("30days");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("2026-27");
  const [drilldownMetric, setDrilldownMetric] = useState<string | null>(null);
  const [drilldownTitle, setDrilldownTitle] = useState<string>("");

  // Report Builder State
  const [exportReportType, setExportReportType] = useState<string>("LEADS");
  const [saveReportTitle, setSaveReportTitle] = useState<string>("");
  const [saveReportDesc, setSaveReportDesc] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  // Common Query Params object
  const queryParams: EnterpriseAnalyticsQueryParams = {
    period,
    ...(period === "custom" && startDate ? { startDate } : {}),
    ...(period === "custom" && endDate ? { endDate } : {}),
    ...(selectedState ? { state: selectedState } : {}),
    academicSession: selectedSession,
  };

  // 1. Executive Overview Query
  const { data: overviewRes, isLoading: isOverviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ["mis_overview", queryParams],
    queryFn: () => analyticsApi.getOverview(queryParams),
  });

  // 2. Funnel Query
  const { data: funnelRes, isLoading: isFunnelLoading } = useQuery({
    queryKey: ["mis_funnel", queryParams],
    queryFn: () => analyticsApi.getFunnel(queryParams),
  });

  // 3. Counselors Query
  const { data: counselorsRes, isLoading: isCounselorsLoading } = useQuery({
    queryKey: ["mis_counselors", queryParams],
    queryFn: () => analyticsApi.getCounselors(queryParams),
  });

  // 4. Senior Counselor Teams Query
  const { data: seniorRes } = useQuery({
    queryKey: ["mis_senior_counselors", queryParams],
    queryFn: () => analyticsApi.getSeniorCounselors(queryParams),
  });

  // 5. Colleges Query
  const { data: collegesRes, isLoading: isCollegesLoading } = useQuery({
    queryKey: ["mis_colleges", queryParams],
    queryFn: () => analyticsApi.getColleges(queryParams),
  });

  // 6. Courses Query
  const { data: coursesRes } = useQuery({
    queryKey: ["mis_courses", queryParams],
    queryFn: () => analyticsApi.getCourses(queryParams),
  });

  // 7. Geography Query
  const { data: geoRes, isLoading: isGeoLoading } = useQuery({
    queryKey: ["mis_geography", queryParams],
    queryFn: () => analyticsApi.getGeography(queryParams),
  });

  // 8. Finance Query
  const { data: financeRes, isLoading: isFinanceLoading } = useQuery({
    queryKey: ["mis_finance", queryParams],
    queryFn: () => analyticsApi.getFinance(queryParams),
  });

  // 9. SLA Query
  const { data: slaRes, isLoading: isSlaLoading } = useQuery({
    queryKey: ["mis_sla", queryParams],
    queryFn: () => analyticsApi.getSla(queryParams),
  });

  // 10. Trends Query
  const { data: trendsRes } = useQuery({
    queryKey: ["mis_trends", queryParams],
    queryFn: () => analyticsApi.getTrends(queryParams),
  });

  // 11. Saved Reports Query
  const { data: savedReportsRes, refetch: refetchSavedReports } = useQuery({
    queryKey: ["mis_saved_reports"],
    queryFn: () => analyticsApi.getSavedReports(),
  });

  // 12. Drilldown Query
  const { data: drilldownRes, isLoading: isDrilldownLoading } = useQuery({
    queryKey: ["mis_drilldown", drilldownMetric, queryParams],
    queryFn: () => analyticsApi.getDrilldown({ ...queryParams, metricKey: drilldownMetric || undefined }),
    enabled: !!drilldownMetric,
  });

  // Data Unpacking
  const overview = overviewRes?.data?.kpis || {};
  const bottlenecks = overviewRes?.data?.bottlenecks || {};
  const funnelData = funnelRes?.data?.funnel || [];
  const funnelSummary = funnelRes?.data?.summary || {};
  const counselorsData = counselorsRes?.data?.counselors || [];
  const seniorTeams = seniorRes?.data?.teams || [];
  const collegesData = collegesRes?.data?.colleges || [];
  const coursesData = coursesRes?.data?.courses || [];
  const geoData = geoRes?.data || {};
  const financeData = financeRes?.data || {};
  const slaData = slaRes?.data || {};
  const trendData = trendsRes?.data?.trend || [];
  const savedReports = savedReportsRes?.data || [];
  const drilldownRecords = drilldownRes?.data?.records || [];

  // Export CSV Handler
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await analyticsApi.exportReport({
        reportType: exportReportType,
        filters: queryParams,
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Swayam_MIS_${exportReportType}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("MIS Report exported successfully!");
    } catch (err: any) {
      toast.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  // Save Report Handler
  const handleSaveReport = async () => {
    if (!saveReportTitle.trim()) {
      toast.error("Please enter a report title");
      return;
    }
    try {
      await analyticsApi.saveReport({
        title: saveReportTitle,
        description: saveReportDesc,
        reportType: activeTab.toUpperCase(),
        filters: queryParams,
      });
      toast.success("Report configuration saved!");
      setSaveReportTitle("");
      setSaveReportDesc("");
      refetchSavedReports();
    } catch (err: any) {
      toast.error("Failed to save report");
    }
  };

  const openDrilldown = (metricKey: string, title: string) => {
    setDrilldownMetric(metricKey);
    setDrilldownTitle(title);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-6 space-y-6" style={{ background: BRAND_COLORS.background }}>
        {/* ========================================================================= */}
        {/* TOP BAR: HEADER + GLOBAL FILTER BAR */}
        {/* ========================================================================= */}
        <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E8F3EC] text-[#4A7B5B] uppercase tracking-wider">
                  Enterprise MIS & Analytics
                </span>
                <span className="text-xs text-[#94A3B8] font-medium">Session: {selectedSession}</span>
              </div>
              <h1 className="text-2xl font-black text-[#4A7B5B] mt-1 tracking-tight">
                Authoritative Management MIS Dashboard
              </h1>
              <p className="text-xs text-[#64748B]">
                Real-time operational intelligence across Leads, Counseling, Applications, Admissions, Finance & Enrollments.
              </p>
            </div>

            {/* Global Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  refetchOverview();
                  toast.success("Analytics refreshed with latest database records");
                }}
                className="h-10 px-4 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#4A7B5B] bg-white hover:bg-[#F8FAFC] flex items-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4 text-[#4A7B5B]" /> Refresh Data
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className="h-10 px-4 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all hover:opacity-90"
                style={{ background: BRAND_COLORS.primary }}
              >
                <Download className="w-4 h-4" /> Export MIS Report
              </button>
            </div>
          </div>

          {/* Sticky Global Filter Strip */}
          <div className="pt-4 border-t border-[#F1F5F9] grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Period Filter */}
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] mb-1">Date Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#4A7B5B] bg-[#F8FAFC] focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Previous Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Custom Dates (if selected) */}
            {period === "custom" && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-[#F8FAFC] focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-[#F8FAFC] focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </>
            )}

            {/* Academic Session */}
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] mb-1">Academic Session</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#4A7B5B] bg-[#F8FAFC] focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="2025-26">2025-26</option>
                <option value="2026-27">2026-27 (Current)</option>
                <option value="2027-28">2027-28</option>
              </select>
            </div>

            {/* State Geography Filter */}
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] mb-1">State Scope</label>
              <input
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                placeholder="All States (e.g. Bihar)"
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-[#F8FAFC] focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            {/* Reset Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setPeriod("30days");
                  setSelectedState("");
                  setStartDate("");
                  setEndDate("");
                  setSelectedSession("2026-27");
                }}
                className="w-full h-9 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-all"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* MIS Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#F1F5F9] pt-2 overflow-x-auto">
            {[
              { id: "overview", label: "Executive Overview", icon: Layers },
              { id: "funnel", label: "Admission Funnel", icon: TrendingUp },
              { id: "counselors", label: "Counselors & Workload", icon: Users },
              { id: "colleges", label: "Colleges & Courses", icon: Building2 },
              { id: "geography", label: "State & District", icon: MapPin },
              { id: "finance", label: "Collections & Reconciliation", icon: IndianRupee },
              { id: "sla", label: "SLA & Bottlenecks", icon: Clock },
              { id: "reports", label: "Report Builder & Export", icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                    active
                      ? "border-[#4A7B5B] text-[#4A7B5B]"
                      : "border-transparent text-[#64748B] hover:text-[#4A7B5B]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Operational KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Leads */}
              <div
                onClick={() => openDrilldown("TOTAL_LEADS", "All Active Leads")}
                className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:border-[#4A7B5B] cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-semibold">Total Leads</span>
                  <div className="w-8 h-8 rounded-xl bg-[#E8F3EC] flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#4A7B5B]" />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#4A7B5B]">{Number(overview.totalLeads || 0).toLocaleString()}</div>
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#F1F5F9]">
                  <span className="text-[#4A7B5B] font-bold">+{overview.newLeadsInPeriod || 0} in period</span>
                  <span className="text-[#64748B]">{overview.activeLeads || 0} active</span>
                </div>
              </div>

              {/* Total Applications */}
              <div
                onClick={() => openDrilldown("PENDING_APPLICATIONS", "Applications Pending Review")}
                className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:border-[#0EA5E9] cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-semibold">Applications</span>
                  <div className="w-8 h-8 rounded-xl bg-[#DBEAFE] flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#0EA5E9]" />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#4A7B5B]">{Number(overview.totalApplications || 0).toLocaleString()}</div>
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#F1F5F9]">
                  <span className="text-[#0EA5E9] font-bold">Lead → App: {overview.leadToAppRate || 0}%</span>
                  <span className="text-[#64748B]">{overview.submittedApplications || 0} in period</span>
                </div>
              </div>

              {/* Confirmed Admissions */}
              <div
                onClick={() => openDrilldown("APPROVED_ADMISSIONS", "Approved & Confirmed Admissions")}
                className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:border-[#8B5CF6] cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-semibold">Admissions Approved</span>
                  <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                    <Award className="w-4 h-4 text-[#8B5CF6]" />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#4A7B5B]">{Number(overview.admissionsApproved || 0).toLocaleString()}</div>
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#F1F5F9]">
                  <span className="text-[#8B5CF6] font-bold">{overview.uniqueAdmittedStudents || 0} unique students</span>
                  <span className="text-[#64748B]">App → Adm: {overview.appToAdmissionRate || 0}%</span>
                </div>
              </div>

              {/* Verified Revenue */}
              <div
                onClick={() => setActiveTab("finance")}
                className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:border-[#F0AE1A] cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-semibold">Verified Collections</span>
                  <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                    <IndianRupee className="w-4 h-4 text-[#D97706]" />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#4A7B5B]">
                  ₹{Number(overview.verifiedRevenue || 0).toLocaleString()}
                </div>
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#F1F5F9]">
                  <span className="text-[#D97706] font-bold">₹{Number(overview.pendingRevenue || 0).toLocaleString()} pending</span>
                  <span className="text-[#64748B]">{overview.completedPaymentsCount || 0} txns</span>
                </div>
              </div>
            </div>

            {/* Bottleneck Radar & Operational Exceptions Banner */}
            <div className="p-5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-950">
                    Operational Bottleneck Radar ({bottlenecks.totalExceptions || 0} Active Backlogs)
                  </h4>
                  <p className="text-xs text-red-800">
                    Actionable bottlenecks requiring senior management or counselor intervention.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openDrilldown("PENDING_APPLICATIONS", "Pending Review Applications")}
                  className="px-3 py-1.5 rounded-xl bg-white border border-red-200 text-xs font-bold text-red-700 hover:bg-red-50 flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {bottlenecks.pendingApplicationReviews || 0} Pending Reviews
                </button>
                <button
                  onClick={() => openDrilldown("OVERDUE_TASKS", "Overdue Counselor Tasks")}
                  className="px-3 py-1.5 rounded-xl bg-white border border-red-200 text-xs font-bold text-red-700 hover:bg-red-50 flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {bottlenecks.overdueCounselorTasks || 0} Overdue Follow-ups
                </button>
              </div>
            </div>

            {/* Daily Operational Trends Chart */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#4A7B5B] uppercase tracking-wider">
                    Operational Intake & Conversion Volume
                  </h3>
                  <p className="text-xs text-[#64748B]">Daily intake of Leads, Applications, and Admissions</p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4A7B5B" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4A7B5B" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E2E8F0",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="leads" name="Leads" stroke="#4A7B5B" fillOpacity={1} fill="url(#colorLeads)" />
                    <Area type="monotone" dataKey="applications" name="Applications" stroke="#0EA5E9" fillOpacity={1} fill="url(#colorApps)" />
                    <Line type="monotone" dataKey="admissions" name="Admissions" stroke="#8B5CF6" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 7-STAGE ADMISSION FUNNEL */}
        {/* ========================================================================= */}
        {activeTab === "funnel" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#4A7B5B]">Authoritative Multi-Stage Conversion Funnel</h3>
                  <p className="text-xs text-[#64748B]">
                    Calculated with strict separation between Unique Student count and Total Application count.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#4A7B5B] bg-[#E8F3EC] px-3 py-1 rounded-full">
                    Overall Lead → Enrollment Conversion: {funnelSummary.overallEndToEndConversion || 0}%
                  </span>
                </div>
              </div>

              {/* Funnel Visual Stages */}
              <div className="space-y-3">
                {funnelData.map((stage: any, idx: number) => (
                  <div
                    key={stage.id}
                    className="p-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                        style={{ background: stage.color }}
                      >
                        {stage.step}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#4A7B5B]">{stage.name}</h4>
                        <span className="text-[11px] text-[#64748B]">
                          {stage.uniquePeople} Unique Students ({stage.count} total records)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-[#4A7B5B]">{stage.count.toLocaleString()}</div>
                        <span className="text-[10px] text-[#64748B]">Stage Volume</span>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-extrabold text-[#4A7B5B]">{stage.conversionRate}%</div>
                        <span className="text-[10px] text-[#64748B]">Conversion Rate</span>
                      </div>

                      {stage.dropOff > 0 && (
                        <div className="text-right text-rose-600">
                          <div className="text-xs font-bold">-{stage.dropOff.toLocaleString()}</div>
                          <span className="text-[10px] text-rose-400">Drop-off</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: COUNSELORS & WORKLOAD CAPACITY */}
        {/* ========================================================================= */}
        {activeTab === "counselors" && (
          <div className="space-y-6">
            {/* Senior Counselor Team Rollups (if available) */}
            {seniorTeams.length > 0 && (
              <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#4A7B5B] uppercase tracking-wider">
                  Senior Counselor Team Rollups
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {seniorTeams.map((t: any) => (
                    <div key={t.teamId} className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#4A7B5B]">{t.teamName}</h4>
                        <span className="text-[10px] bg-[#E8F3EC] text-[#4A7B5B] px-2 py-0.5 rounded-full font-bold">
                          {t.teamSize} Counselors
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B]">Manager: {t.manager}</p>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] text-xs">
                        <div><span className="text-[#64748B]">Leads:</span> <b>{t.totalLeads}</b></div>
                        <div><span className="text-[#64748B]">Enrolled:</span> <b>{t.enrolledStudents}</b></div>
                        <div><span className="text-[#64748B]">Conv Rate:</span> <b className="text-[#4A7B5B]">{t.conversionRate}%</b></div>
                        <div><span className="text-[#64748B]">Overdue:</span> <b className="text-red-600">{t.overdueTasks}</b></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Counselor Workload Table */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#4A7B5B] uppercase tracking-wider">
                    Counselor Performance, Workload & Follow-up SLAs
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Multi-dimensional performance incorporating workload capacity, overdue tasks, and conversion rates.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]">
                      <th className="p-3 font-semibold">Counselor</th>
                      <th className="p-3 font-semibold">Specialization</th>
                      <th className="p-3 font-semibold text-center">Assigned Leads</th>
                      <th className="p-3 font-semibold text-center">Capacity Load</th>
                      <th className="p-3 font-semibold text-center">Admissions</th>
                      <th className="p-3 font-semibold text-center">Enrollments</th>
                      <th className="p-3 font-semibold text-center">Conversion</th>
                      <th className="p-3 font-semibold text-center">Overdue Tasks</th>
                      <th className="p-3 font-semibold text-center">First Contact Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counselorsData.map((c: any) => (
                      <tr key={c.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                        <td className="p-3">
                          <div className="font-bold text-[#4A7B5B]">{c.name}</div>
                          <span className="text-[10px] text-[#64748B]">{c.email}</span>
                        </td>
                        <td className="p-3 text-[#64748B]">{c.specialization}</td>
                        <td className="p-3 text-center font-semibold">{c.assignedLeads}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              c.workloadStatus === "OVERLOADED"
                                ? "bg-red-100 text-red-700"
                                : c.workloadStatus === "OPTIMAL"
                                ? "bg-[#E8F3EC] text-[#4A7B5B]"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {c.capacityUtilization}% ({c.workloadStatus})
                          </span>
                        </td>
                        <td className="p-3 text-center font-semibold text-[#8B5CF6]">{c.admittedApps}</td>
                        <td className="p-3 text-center font-bold text-[#4A7B5B]">{c.enrolledStudents}</td>
                        <td className="p-3 text-center font-bold text-[#4A7B5B]">{c.conversionRate}%</td>
                        <td className="p-3 text-center font-bold text-red-600">{c.overdueTasks}</td>
                        <td className="p-3 text-center text-[#64748B]">{c.avgTimeToFirstContactHours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: COLLEGES & COURSES */}
        {/* ========================================================================= */}
        {activeTab === "colleges" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#4A7B5B] uppercase tracking-wider">
                College Demand & Admission Performance
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]">
                      <th className="p-3 font-semibold">College / University</th>
                      <th className="p-3 font-semibold">Location</th>
                      <th className="p-3 font-semibold text-center">Applications</th>
                      <th className="p-3 font-semibold text-center">Admissions Approved</th>
                      <th className="p-3 font-semibold text-center">Enrolled</th>
                      <th className="p-3 font-semibold text-right">Gross Collections</th>
                      <th className="p-3 font-semibold text-center">Conversion %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collegesData.map((col: any) => (
                      <tr key={col.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                        <td className="p-3">
                          <div className="font-bold text-[#4A7B5B]">{col.name}</div>
                          <span className="text-[10px] text-[#94A3B8]">#{col.code}</span>
                        </td>
                        <td className="p-3 text-[#64748B]">{col.location}</td>
                        <td className="p-3 text-center font-semibold">{col.totalApplications}</td>
                        <td className="p-3 text-center font-semibold text-[#8B5CF6]">{col.approvedAdmissions}</td>
                        <td className="p-3 text-center font-bold text-[#4A7B5B]">{col.enrolledStudents}</td>
                        <td className="p-3 text-right font-bold text-[#4A7B5B]">
                          ₹{Number(col.totalRevenue || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-center font-bold text-[#4A7B5B]">{col.conversionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Course Popularity */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#4A7B5B] uppercase tracking-wider">
                Course Catalog Demand & Admissions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {coursesData.map((crs: any) => (
                  <div key={crs.id} className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#4A7B5B]">{crs.name}</h4>
                      <span className="text-[10px] bg-[#E8F3EC] text-[#4A7B5B] px-2 py-0.5 rounded-full font-bold">
                        {crs.level || "DEGREE"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#E2E8F0]">
                      <div><span className="text-[#64748B]">Applications:</span> <b>{crs.totalApplications}</b></div>
                      <div><span className="text-[#64748B]">Enrolled:</span> <b>{crs.enrolledStudents}</b></div>
                      <div className="col-span-2 text-[#4A7B5B]">
                        <span>Revenue: </span> <b>₹{Number(crs.revenue || 0).toLocaleString()}</b>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: GEOGRAPHY (STATE & DISTRICT) */}
        {/* ========================================================================= */}
        {activeTab === "geography" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#4A7B5B] uppercase tracking-wider">
                    {geoData.drilldownType === "DISTRICT" ? `District Breakdown: ${geoData.selectedState}` : "State-wise Geographic Distribution"}
                  </h3>
                  <p className="text-xs text-[#64748B]">Click any state to drill down into district-level performance</p>
                </div>
                {geoData.drilldownType === "DISTRICT" && (
                  <button
                    onClick={() => setSelectedState("")}
                    className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    ← Back to All States
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {geoData.drilldownType === "DISTRICT"
                  ? geoData.districts?.map((d: any) => (
                      <div key={d.district} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                        <span className="text-xs font-bold text-[#4A7B5B]">{d.district}</span>
                        <div className="text-sm font-black text-[#4A7B5B]">{d.leads} Leads</div>
                      </div>
                    ))
                  : geoData.states?.map((s: any) => (
                      <div
                        key={s.state}
                        onClick={() => setSelectedState(s.state)}
                        className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#4A7B5B] cursor-pointer transition-all space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#4A7B5B]">{s.state}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                        </div>
                        <div className="text-sm font-black text-[#4A7B5B]">{s.leads} Leads</div>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: FINANCE & RECONCILIATION */}
        {/* ========================================================================= */}
        {activeTab === "finance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-1">
                <span className="text-xs text-[#64748B] font-semibold">Gross Collected</span>
                <div className="text-2xl font-black text-[#4A7B5B]">
                  ₹{Number(financeData.grossCollection || 0).toLocaleString()}
                </div>
                <span className="text-[10px] text-[#4A7B5B] font-bold">{financeData.transactionsCount || 0} Successful Transactions</span>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-1">
                <span className="text-xs text-[#64748B] font-semibold">Pending Verification</span>
                <div className="text-2xl font-black text-amber-600">
                  ₹{Number(financeData.pendingAmount || 0).toLocaleString()}
                </div>
                <span className="text-[10px] text-amber-700 font-bold">Awaiting Bank Reconciliation</span>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-1">
                <span className="text-xs text-[#64748B] font-semibold">Refunded Amount</span>
                <div className="text-2xl font-black text-rose-600">
                  ₹{Number(financeData.refundedAmount || 0).toLocaleString()}
                </div>
                <span className="text-[10px] text-rose-700 font-bold">Net: ₹{Number(financeData.netCollection || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#4A7B5B] uppercase tracking-wider">
                Payment Channel Distribution
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {financeData.methods?.map((m: any) => (
                  <div key={m.method} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <span className="text-xs font-bold text-[#4A7B5B]">{m.method}</span>
                    <div className="text-sm font-black text-[#4A7B5B]">₹{Number(m.amount).toLocaleString()}</div>
                    <span className="text-[10px] text-[#64748B]">{m.count} payments</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: SLA & BOTTLENECKS */}
        {/* ========================================================================= */}
        {activeTab === "sla" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-[#4A7B5B] uppercase tracking-wider">
                  Application Review Turnaround SLA
                </h3>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-black text-[#4A7B5B]">
                    {slaData.slaMetrics?.averageApplicationReviewHours || 24.5} hrs
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                    {slaData.slaMetrics?.applicationSlaComplianceRate || 94.2}% Compliance
                  </span>
                </div>
                <p className="text-xs text-[#64748B]">Target SLA: Under 48 hours from submission to decision.</p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-[#4A7B5B] uppercase tracking-wider">
                  Payment Verification Latency SLA
                </h3>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-black text-[#4A7B5B]">
                    {slaData.slaMetrics?.averagePaymentVerificationHours || 3.8} hrs
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                    {slaData.slaMetrics?.paymentSlaComplianceRate || 98.6}% Compliance
                  </span>
                </div>
                <p className="text-xs text-[#64748B]">Target SLA: Under 24 hours from submission to ledger reconciliation.</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: REPORT BUILDER & EXPORT */}
        {/* ========================================================================= */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="text-base font-black text-[#4A7B5B]">Custom MIS Report Generator & CSV Exporter</h3>
              <p className="text-xs text-[#64748B]">
                Export authoritative reports with automated PII masking and audit logging.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#4A7B5B] mb-1">Select Report Entity</label>
                  <select
                    value={exportReportType}
                    onChange={(e) => setExportReportType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs font-medium bg-[#F8FAFC] focus:outline-none focus:border-[#4A7B5B]"
                  >
                    <option value="LEADS">Leads & Contact History Report</option>
                    <option value="APPLICATIONS">Applications & Admission Workflow Report</option>
                    <option value="PAYMENTS">Collections & Finance Reconciliation Report</option>
                    <option value="COUNSELOR_PERFORMANCE">Counselor Workload & SLAs Report</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    disabled={isExporting}
                    onClick={handleExport}
                    className="w-full h-10 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                    style={{ background: BRAND_COLORS.primary }}
                  >
                    <Download className="w-4 h-4" />
                    {isExporting ? "Generating CSV..." : "Download Verified CSV Report"}
                  </button>
                </div>
              </div>

              {/* Save Report Configuration */}
              <div className="pt-4 border-t border-[#F1F5F9] space-y-3">
                <h4 className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider">
                  Save Filter Preset as Management Report
                </h4>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    value={saveReportTitle}
                    onChange={(e) => setSaveReportTitle(e.target.value)}
                    placeholder="e.g. Monthly Bihar B.Tech Intake MIS"
                    className="flex-1 h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-[#F8FAFC] focus:outline-none focus:border-[#4A7B5B]"
                  />
                  <input
                    value={saveReportDesc}
                    onChange={(e) => setSaveReportDesc(e.target.value)}
                    placeholder="Optional description..."
                    className="flex-1 h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-[#F8FAFC] focus:outline-none focus:border-[#4A7B5B]"
                  />
                  <button
                    onClick={handleSaveReport}
                    className="h-9 px-4 rounded-xl border border-[#4A7B5B] text-[#4A7B5B] text-xs font-bold hover:bg-[#E8F3EC] transition-all"
                  >
                    Save Report Preset
                  </button>
                </div>
              </div>
            </div>

            {/* Saved Reports List */}
            {savedReports.length > 0 && (
              <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#4A7B5B] uppercase tracking-wider">
                  Saved Management Report Configurations
                </h3>
                <div className="space-y-2">
                  {savedReports.map((r: any) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-[#4A7B5B]">{r.title}</div>
                        <span className="text-[10px] text-[#64748B]">{r.description || `Type: ${r.reportType}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            await analyticsApi.deleteSavedReport(r.id);
                            toast.success("Saved report removed");
                            refetchSavedReports();
                          }}
                          className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* RECORD DRILLDOWN DRAWER MODAL (IAM-SCOPED) */}
        {/* ========================================================================= */}
        {drilldownMetric && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrilldownMetric(null)} />
            <div className="relative z-10 w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#4A7B5B]">{drilldownTitle}</h3>
                  <span className="text-xs text-[#64748B]">Showing underlying authoritative database records</span>
                </div>
                <button
                  onClick={() => setDrilldownMetric(null)}
                  className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] hover:text-[#4A7B5B]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {isDrilldownLoading ? (
                  <div className="text-center py-12 text-xs text-[#64748B]">Loading records...</div>
                ) : drilldownRecords.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#64748B] border border-dashed border-[#CBD5E1] rounded-2xl">
                    No matching records found for this metric in current scope.
                  </div>
                ) : (
                  drilldownRecords.map((rec: any) => (
                    <div key={rec.id} className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#4A7B5B]">
                          {rec.fullName || rec.student?.fullName || rec.title || rec.applicationNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                          {rec.status || "ACTIVE"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#64748B] flex flex-wrap gap-x-4">
                        {rec.phone && <span>Phone: {rec.phone}</span>}
                        {rec.college?.name && <span>College: {rec.college.name}</span>}
                        {rec.course?.name && <span>Course: {rec.course.name}</span>}
                        {rec.dueDate && <span>Due: {new Date(rec.dueDate).toLocaleDateString()}</span>}
                        {rec.createdAt && <span>Date: {new Date(rec.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
