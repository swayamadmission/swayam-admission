import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, GraduationCap, IndianRupee, Clock,
  Phone, MessageSquare, ArrowRight, MoreHorizontal, CheckCircle2,
  AlertCircle, Star, Zap, Gift
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dashboardsApi } from "../../api/dashboards.api";

interface DashboardProps {
  onPageChange: (page: string) => void;
}

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  "New": { bg: "#F1F5F9", text: "#64748B" },
  "Contacted": { bg: "#E8F3EC", text: "#4A7B5B" },
  "Interested": { bg: "#E8F3EC", text: "#4A7B5B" },
  "Follow-up": { bg: "#FEF3C7", text: "#D97706" },
  "Docs Pending": { bg: "#FED7AA", text: "#EA580C" },
  "Applied": { bg: "#DBEAFE", text: "#2563EB" },
  "Confirmed": { bg: "#D1FAE5", text: "#059669" },
  "Lost": { bg: "#FEE2E2", text: "#DC2626" },
};

const AVATAR_COLORS = ["#4A7B5B", "#7C3AED", "#0EA5E9", "#F97316", "#EC4899"];

export default function Dashboard({ onPageChange }: DashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("week");

  const { data: metricsRes, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin_dashboard_metrics"],
    queryFn: () => dashboardsApi.getAdminMetrics(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px]" style={{ background: "#F8FAFC" }}>
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Failed to load dashboard</h3>
        <p className="text-slate-500 mb-6">There was a problem fetching the latest metrics from the server.</p>
        <button onClick={() => refetch()} className="px-6 py-2.5 bg-[#4A7B5B] text-white rounded-xl font-medium hover:bg-[#3b664a] transition-all">
          Try Again
        </button>
      </div>
    );
  }

  const payload = metricsRes?.data;
  const m = payload?.overview || { totalStudents: 0, totalLeads: 0, totalApplications: 0, totalColleges: 0 };
  const areaData = payload?.charts?.trend || [];
  const stageData = payload?.charts?.pipeline || [];
  const stateData = payload?.charts?.states || [];
  const counselorData = payload?.counselors || [];
  const recentLeads = payload?.recentLeads || [];

  const kpis = [
    {
      title: "Today's Leads",
      value: String(m.totalLeads),
      change: "Active",
      trend: "up",
      icon: Users,
      color: "#4A7B5B",
      bg: "#E8F3EC",
      sub: "Total Leads"
    },
    {
      title: "Total Students",
      value: String(m.totalStudents),
      change: "Active",
      trend: "up",
      icon: TrendingUp,
      color: "#0EA5E9",
      bg: "#DBEAFE",
      sub: "Active Users"
    },
    {
      title: "Total Apps",
      value: String(m.totalApplications),
      change: "Active",
      trend: "up",
      icon: GraduationCap,
      color: "#10B981",
      bg: "#D1FAE5",
      sub: "Submitted"
    },
    {
      title: "Colleges",
      value: String(m.totalColleges),
      change: "Active",
      trend: "up",
      icon: IndianRupee,
      color: "#F0AE1A",
      bg: "#FEF3C7",
      sub: "This month"
    },
  ];

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100%" }}>

      {/* Welcome banner */}
      <div
        className="rounded-2xl p-5 lg:p-6 flex items-center justify-between overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #4A7B5B 0%, #3a6b4c 100%)" }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: "#F0AE1A", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-1/2 w-32 h-32 rounded-full opacity-5" style={{ background: "#fff", transform: "translate(-50%, 50%)" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-yellow-300" />
            <span className="text-green-200 text-sm">Good morning!</span>
          </div>
          <h2 className="text-white mb-1">Welcome to Admin Dashboard</h2>
          <p className="text-green-200 text-sm">Monitor platform metrics, manage applications and users.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => onPageChange("referrals")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20 shrink-0"
          >
            <Gift className="w-3.5 h-3.5 text-[#F0AE1A]" /> Referrals Desk
          </button>
          <button
            onClick={() => onPageChange("leads")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90 shrink-0"
            style={{ background: "#F0AE1A", color: "#4A7B5B" }}
          >
            View Leads <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              className="bg-white rounded-2xl p-4 border border-[#F1F5F9] hover:shadow-md transition-all cursor-pointer relative"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              {isLoading ? (
                <div className="animate-pulse flex flex-col space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="w-9 h-9 bg-slate-200 rounded-xl" />
                    <div className="w-12 h-4 bg-slate-200 rounded-full" />
                  </div>
                  <div className="w-16 h-6 bg-slate-200 rounded" />
                  <div className="w-24 h-3 bg-slate-200 rounded" />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: kpi.bg }}
                    >
                      <Icon className="w-4.5 h-4.5" style={{ color: kpi.color, width: "18px", height: "18px" }} />
                    </div>
                    <span
                      className="flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        background: kpi.trend === "up" ? "#D1FAE5" : "#FEE2E2",
                        color: kpi.trend === "up" ? "#059669" : "#DC2626"
                      }}
                    >
                      {kpi.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {kpi.change}
                    </span>
                  </div>
                  <div className="text-[#4A7B5B] font-semibold text-xl leading-tight">{kpi.value}</div>
                  <div className="text-[#94A3B8] text-xs mt-0.5">{kpi.title}</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Lead trend chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-[#F1F5F9] min-h-[300px]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[#4A7B5B]">Lead Trend</h3>
              <p className="text-[#94A3B8] text-xs">Daily leads & conversions this week</p>
            </div>
          </div>
          {isLoading ? (
            <div className="w-full h-48 bg-slate-100 rounded-xl animate-pulse mt-4"></div>
          ) : areaData.length === 0 ? (
            <div className="w-full h-48 flex items-center justify-center text-slate-400 text-sm">No lead data available for this week</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={areaData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A7B5B" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4A7B5B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F0AE1A" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F0AE1A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "12px" }}
                  cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="leads" stroke="#4A7B5B" strokeWidth={2} fill="url(#leadsGrad)" name="Leads" dot={false} />
                <Area type="monotone" dataKey="conversions" stroke="#F0AE1A" strokeWidth={2} fill="url(#convGrad)" name="Conversions" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-5 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#4A7B5B" }} />
              <span className="text-[#64748B] text-xs">Leads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#F0AE1A" }} />
              <span className="text-[#64748B] text-xs">Conversions</span>
            </div>
          </div>
        </div>

        {/* Stage distribution */}
        <div className="bg-white rounded-2xl p-5 border border-[#F1F5F9] min-h-[300px]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="mb-5">
            <h3 className="text-[#4A7B5B]">Pipeline Status</h3>
            <p className="text-[#94A3B8] text-xs">Lead stage distribution</p>
          </div>
          {isLoading ? (
            <div className="flex justify-center mt-6">
              <div className="w-32 h-32 rounded-full border-4 border-slate-100 animate-pulse"></div>
            </div>
          ) : stageData.length === 0 ? (
            <div className="w-full h-32 flex items-center justify-center text-slate-400 text-sm">No pipeline data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={stageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stageData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value) => [`${value} leads`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto pr-1 no-scrollbar">
                {stageData.slice(0, 5).map((stage: any) => (
                  <div key={stage.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                      <span className="text-xs text-[#64748B]">{stage.name}</span>
                    </div>
                    <span className="text-xs font-medium text-[#4A7B5B]">{stage.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* State-wise leads */}
        <div className="bg-white rounded-2xl p-5 border border-[#F1F5F9] min-h-[250px]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[#4A7B5B]">State Performance</h3>
              <p className="text-[#94A3B8] text-xs">Top states by leads</p>
            </div>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col space-y-1 mb-2">
                  <div className="flex justify-between"><div className="h-3 bg-slate-200 w-16 rounded"></div><div className="h-3 bg-slate-200 w-6 rounded"></div></div>
                  <div className="h-2 bg-slate-100 rounded-full w-full"></div>
                </div>
              ))
            ) : stateData.length === 0 ? (
              <div className="text-slate-400 text-sm mt-8 text-center">No state data recorded</div>
            ) : (
              stateData.map((item: any, i: number) => {
                const maxLeads = stateData[0].leads || 1;
                const pct = Math.round((item.leads / maxLeads) * 100);
                return (
                  <div key={item.state}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[#475569]">{item.state}</span>
                      <span className="text-xs font-medium text-[#4A7B5B]">{item.leads}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: "#F1F5F9" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: "#4A7B5B", opacity: 1 - (i * 0.1) }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Counselor performance */}
        <div className="bg-white rounded-2xl p-5 border border-[#F1F5F9] min-h-[250px]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[#4A7B5B]">Top Counselors</h3>
              <p className="text-[#94A3B8] text-xs">Based on conversions</p>
            </div>
            <button onClick={() => onPageChange("counselors")} className="text-xs" style={{ color: "#4A7B5B" }}>
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-slate-200 w-24 rounded" />
                    <div className="h-1.5 bg-slate-100 rounded-full w-full" />
                  </div>
                </div>
              ))
            ) : counselorData.length === 0 ? (
              <div className="text-slate-400 text-sm mt-8 text-center">No counselors assigned</div>
            ) : (
              counselorData.map((c: any, i: number) => (
                <div key={c.name} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-[#4A7B5B]">{c.name}</span>
                      <span className="text-xs text-[#94A3B8]">{c.converted} conv.</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "#F1F5F9" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(c.leads / (counselorData[0]?.leads || 1)) * 100}%`, background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                      />
                    </div>
                  </div>
                  {i === 0 && <Star className="w-3.5 h-3.5 shrink-0" style={{ color: "#F0AE1A" }} />}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent leads */}
        <div className="bg-white rounded-2xl p-5 border border-[#F1F5F9] min-h-[250px]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[#4A7B5B]">Recent Leads</h3>
              <p className="text-[#94A3B8] text-xs">Latest incoming leads</p>
            </div>
            <button onClick={() => onPageChange("leads")} className="text-xs" style={{ color: "#4A7B5B" }}>
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between"><div className="h-3 bg-slate-200 w-24 rounded"></div><div className="h-3 bg-slate-200 w-12 rounded-full"></div></div>
                    <div className="flex justify-between"><div className="h-2 bg-slate-100 w-20 rounded"></div><div className="h-2 bg-slate-100 w-10 rounded"></div></div>
                  </div>
                </div>
              ))
            ) : recentLeads.length === 0 ? (
              <div className="text-slate-400 text-sm mt-8 text-center">No leads available</div>
            ) : (
              recentLeads.map((lead: any, i: number) => {
                const stage = STAGE_COLORS[lead.stage] || { bg: "#F1F5F9", text: "#64748B" };
                return (
                  <div key={lead.id} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {lead.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#4A7B5B] truncate font-medium">{lead.name}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 shrink-0"
                          style={{ background: stage.bg, color: stage.text }}
                        >
                          {lead.stage}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#94A3B8]">{lead.course} · {lead.city}</span>
                        <span className="text-[10px] text-[#CBD5E1]">{lead.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick actions */}
          <div className="mt-4 pt-4 border-t border-[#F1F5F9] grid grid-cols-2 gap-2">
            <button
              onClick={() => onPageChange("leads")}
              className="flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-medium"
              style={{ background: "#E8F3EC", color: "#4A7B5B" }}
            >
              <Phone className="w-3.5 h-3.5" /> Call Now
            </button>
            <button
              onClick={() => onPageChange("leads")}
              className="flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-medium"
              style={{ background: "#E8F3EC", color: "#4A7B5B" }}
            >
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
