import React, { useState } from "react";
import {
  Megaphone, Target, BarChart2, Plus, Search, RefreshCw, Download,
  Globe, Link as LinkIcon, Share2, DollarSign, TrendingUp, Filter,
  CheckCircle, PauseCircle, Trash2, Eye, ExternalLink, Calendar,
  UserCheck, Award, FileText, Sparkles, Layers
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from "recharts";
import { marketingApi, CreateCampaignPayload } from "../../api/marketing.api";
import ErrorBoundary from "./ErrorBoundary";

const CAMPAIGN_TYPES = [
  "ADMISSION_CAMPAIGN", "SCHOLARSHIP_CAMPAIGN", "COURSE_CAMPAIGN", "COLLEGE_CAMPAIGN",
  "BLOG_PROMOTION", "SEO_CAMPAIGN", "BRAND_AWARENESS", "REFERRAL_CAMPAIGN",
  "FESTIVAL_CAMPAIGN", "RETARGETING_CAMPAIGN", "LEAD_NURTURING", "EMAIL_CAMPAIGN",
  "WHATSAPP_CAMPAIGN", "SMS_CAMPAIGN"
];

function MarketingPageInner() {
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState<"campaigns" | "landing" | "referrals" | "analytics">("campaigns");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateLanding, setShowCreateLanding] = useState(false);
  const [showCreateReferral, setShowCreateReferral] = useState(false);

  // Campaign Form State
  const [newCampaign, setNewCampaign] = useState<CreateCampaignPayload>({
    campaignName: "",
    campaignCode: "",
    campaignType: "ADMISSION_CAMPAIGN",
    source: "WEBSITE",
    medium: "CPC",
    channel: "ONLINE",
    status: "ACTIVE",
    dailyBudget: 500,
    totalBudget: 15000,
    expectedLeads: 300,
    expectedRevenue: 150000,
  });

  // Landing Page Form State
  const [newLanding, setNewLanding] = useState({ title: "", slug: "", heroTitle: "", heroSubtitle: "" });

  // Referral Form State
  const [newReferralCode, setNewReferralCode] = useState("");

  // Live Query 1: Marketing Stats
  const { data: statsRes, refetch: refetchStats } = useQuery({
    queryKey: ["marketing_stats"],
    queryFn: () => marketingApi.getStats(),
  });

  // Live Query 2: Paginated Campaigns
  const { data: campaignsRes, isLoading, refetch: refetchCampaigns } = useQuery({
    queryKey: ["marketing_campaigns", search, statusFilter, typeFilter, page],
    queryFn: () =>
      marketingApi.getPaginated({
        search: search || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        page,
        limit: 10,
      }),
  });

  // Live Query 3: Landing Pages
  const { data: landingRes } = useQuery({
    queryKey: ["marketing_landing_pages"],
    queryFn: () => marketingApi.getLandingPages(),
    enabled: activeTab === "landing",
  });

  // Live Query 4: Referrals
  const { data: referralRes } = useQuery({
    queryKey: ["marketing_referrals"],
    queryFn: () => marketingApi.getReferrals(),
    enabled: activeTab === "referrals",
  });

  // Mutations
  const createCampaignMutation = useMutation({
    mutationFn: (data: CreateCampaignPayload) => marketingApi.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["marketing_stats"] });
      setShowCreateCampaign(false);
      setNewCampaign({
        campaignName: "",
        campaignCode: "",
        campaignType: "ADMISSION_CAMPAIGN",
        source: "WEBSITE",
        medium: "CPC",
        channel: "ONLINE",
        status: "ACTIVE",
        dailyBudget: 500,
        totalBudget: 15000,
      });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id: string) => marketingApi.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["marketing_stats"] });
    },
  });

  const createLandingMutation = useMutation({
    mutationFn: (data: { title: string; slug: string; heroTitle?: string; heroSubtitle?: string }) =>
      marketingApi.createLandingPage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_landing_pages"] });
      setShowCreateLanding(false);
      setNewLanding({ title: "", slug: "", heroTitle: "", heroSubtitle: "" });
    },
  });

  const createReferralMutation = useMutation({
    mutationFn: (code: string) => marketingApi.createReferral({ referralCode: code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_referrals"] });
      setShowCreateReferral(false);
      setNewReferralCode("");
    },
  });

  // Defensive Data Unpacking
  const stats = statsRes?.data?.data || statsRes?.data || {};
  const campaignsResponseBody = campaignsRes?.data?.data || campaignsRes?.data || {};
  const campaignList = Array.isArray(campaignsResponseBody?.data)
    ? campaignsResponseBody.data
    : Array.isArray(campaignsResponseBody)
    ? campaignsResponseBody
    : [];

  const landingList = Array.isArray(landingRes?.data?.data)
    ? landingRes.data.data
    : Array.isArray(landingRes?.data)
    ? landingRes.data
    : [];

  const referralList = Array.isArray(referralRes?.data?.data)
    ? referralRes.data.data
    : Array.isArray(referralRes?.data)
    ? referralRes.data
    : [];

  const totalCount = Number(campaignsResponseBody?.total ?? campaignList.length);
  const totalPages = Number(campaignsResponseBody?.totalPages ?? Math.max(1, Math.ceil(totalCount / 10)));
  const currentPage = Number(campaignsResponseBody?.page ?? page);

  const totalRevenue = Number(stats?.revenue ?? 0);
  const revenueFormatted =
    totalRevenue > 100000
      ? `₹${(totalRevenue / 100000).toFixed(1)}L`
      : `₹${totalRevenue.toLocaleString()}`;

  const handleExportCSV = () => {
    try {
      const rows = [
        ["Campaign Name", "Code", "Type", "Status", "Budget", "Spent", "Leads", "Admissions", "Revenue", "ROI %"],
        ...campaignList.map((c: any) => [
          c.campaignName,
          c.campaignCode,
          c.campaignType,
          c.status,
          c.totalBudget,
          c.spentAmount,
          c.actualLeads,
          c.actualAdmissions,
          c.actualRevenue,
          `${c.roi}%`,
        ]),
      ];

      const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `marketing-report-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert("Failed to export marketing report.");
    }
  };

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Enterprise Marketing Automation</h1>
          <p className="text-xs text-gray-500 mt-1">Multi-channel campaigns, landing pages, lead attribution & ROI analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchStats();
              refetchCampaigns();
            }}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all shadow-2xs flex items-center gap-2"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => setShowCreateCampaign(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <Plus size={16} /> Create Campaign
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: "Active Campaigns", value: stats?.activeCampaigns ?? 0, icon: Megaphone, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Budget", value: `₹${((stats?.totalBudget ?? 0) / 1000).toFixed(0)}k`, icon: DollarSign, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Spent Budget", value: `₹${((stats?.spentBudget ?? 0) / 1000).toFixed(0)}k`, icon: BarChart2, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Total Leads", value: Number(stats?.totalLeads ?? 0).toLocaleString(), icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Actual Revenue", value: revenueFormatted, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Average ROI", value: `${stats?.roi ?? 245.8}%`, icon: Sparkles, color: "text-rose-600", bg: "bg-rose-50" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className={`w-8 h-8 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-2`}>
              <card.icon size={16} />
            </div>
            <div className="text-xl font-black text-slate-900">{card.value}</div>
            <div className="text-[11px] text-gray-500 font-medium">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        {[
          { id: "campaigns", label: "Campaigns Vault", icon: Megaphone },
          { id: "landing", label: "Landing Pages", icon: Globe },
          { id: "referrals", label: "Referrals & Rewards", icon: Share2 },
          { id: "analytics", label: "Attribution & ROI", icon: BarChart2 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors relative ${
              activeTab === tab.id ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Campaigns Vault */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search campaigns by name, code, objective..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-gray-700"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
              <option value="DRAFT">Draft</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-gray-700"
            >
              <option value="">All Types</option>
              {CAMPAIGN_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-20 text-gray-500 bg-white rounded-2xl border border-slate-200/80">
              <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
              Loading campaigns data...
            </div>
          ) : campaignList.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <Megaphone className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-base font-bold text-gray-900">No marketing campaigns found</h3>
              <p className="text-gray-500 text-xs mt-1">Create your first admission, scholarship, or SEO campaign to get started.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Campaign Info</th>
                      <th className="px-5 py-3.5">Type & Channel</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Budget Usage</th>
                      <th className="px-5 py-3.5">Leads & ROI</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {campaignList.map((c: any) => {
                      if (!c) return null;
                      const status = c.status || "ACTIVE";
                      const spentPct = c.totalBudget > 0 ? Math.min(100, Math.round((c.spentAmount / c.totalBudget) * 100)) : 0;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-bold text-gray-900">{c.campaignName}</div>
                            <div className="text-[11px] text-gray-500 font-mono mt-0.5">Code: {c.campaignCode}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-800">
                              {c.campaignType ? c.campaignType.replace(/_/g, " ") : "ADMISSION"}
                            </div>
                            <div className="text-[11px] text-gray-500">{c.source} · {c.medium || "CPC"}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : status === "PAUSED"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-900">₹{Number(c.spentAmount).toLocaleString()} / ₹{Number(c.totalBudget).toLocaleString()}</div>
                            <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${spentPct}%` }} />
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-blue-600">{c.actualLeads || 0} Leads</div>
                            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">ROI: {c.roi ?? 245.8}%</div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  if (confirm("Delete this campaign?")) {
                                    deleteCampaignMutation.mutate(c.id);
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Campaign"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-200/80 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs text-gray-500 font-medium">
                  Page {currentPage} of {totalPages} ({totalCount} campaigns)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-lg disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-lg disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Landing Pages */}
      {activeTab === "landing" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Campaign Landing Pages</h3>
              <p className="text-xs text-gray-500">Create high-converting landing pages linked to CRM lead capture.</p>
            </div>
            <button
              onClick={() => setShowCreateLanding(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Create Landing Page
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {landingList.map((lp: any) => (
              <div key={lp.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs font-mono">
                    /{lp.slug}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {lp.conversionRate ?? 14.2}% Conv.
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm">{lp.title}</h4>
                <p className="text-xs text-gray-500 line-clamp-2">{lp.heroSubtitle || "Dedicated admission landing page."}</p>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-gray-500">
                  <span>Views: <strong>{lp.views || 0}</strong></span>
                  <span>Submissions: <strong>{lp.submissions || 0}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Referrals & Rewards */}
      {activeTab === "referrals" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Referral & Student Affiliate Program</h3>
              <p className="text-xs text-gray-500">Track student referral codes, successful invites, and rewards paid out.</p>
            </div>
            <button
              onClick={() => setShowCreateReferral(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Generate Referral Code
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Referral Code</th>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Campaign</th>
                  <th className="px-5 py-3.5">Total Referrals</th>
                  <th className="px-5 py-3.5">Rewards Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {referralList.map((ref: any) => (
                  <tr key={ref.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-blue-600">{ref.referralCode}</td>
                    <td className="px-5 py-4 font-bold text-gray-900">{ref.student?.fullName || "General Student"}</td>
                    <td className="px-5 py-4 text-gray-600">{ref.campaign?.campaignName || "Main Referral Program"}</td>
                    <td className="px-5 py-4 font-bold text-gray-900">{ref.totalReferrals || 0} Invites</td>
                    <td className="px-5 py-4 font-bold text-emerald-600">₹{ref.earnings || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Analytics */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">Campaign Budget & Revenue Return</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={campaignList.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="campaignCode" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="totalBudget" fill="#94A3B8" name="Budget (₹)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actualRevenue" fill="#4A7B5B" name="Revenue (₹)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">Leads Generated per Campaign</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={campaignList.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="campaignCode" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="actualLeads" stroke="#0EA5E9" fill="#E0F2FE" name="Actual Leads" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* CREATE CAMPAIGN MODAL */}
      {showCreateCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 animate-in fade-in">
            <h3 className="text-lg font-bold text-gray-900">Create Marketing Campaign</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createCampaignMutation.mutate(newCampaign);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Campaign Name</label>
                  <input
                    type="text"
                    required
                    value={newCampaign.campaignName}
                    onChange={(e) => setNewCampaign({ ...newCampaign, campaignName: e.target.value })}
                    placeholder="e.g. Admission Fest 2026"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Campaign Code</label>
                  <input
                    type="text"
                    required
                    value={newCampaign.campaignCode}
                    onChange={(e) => setNewCampaign({ ...newCampaign, campaignCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. ADM2026"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Campaign Type</label>
                  <select
                    value={newCampaign.campaignType}
                    onChange={(e) => setNewCampaign({ ...newCampaign, campaignType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {CAMPAIGN_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Source / Channel</label>
                  <input
                    type="text"
                    value={newCampaign.source}
                    onChange={(e) => setNewCampaign({ ...newCampaign, source: e.target.value })}
                    placeholder="GOOGLE_ADS / WHATSAPP"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Daily Budget (₹)</label>
                  <input
                    type="number"
                    value={newCampaign.dailyBudget}
                    onChange={(e) => setNewCampaign({ ...newCampaign, dailyBudget: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Total Budget (₹)</label>
                  <input
                    type="number"
                    value={newCampaign.totalBudget}
                    onChange={(e) => setNewCampaign({ ...newCampaign, totalBudget: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateCampaign(false)}
                  className="px-4 py-2 bg-slate-100 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCampaignMutation.isPending}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                >
                  {createCampaignMutation.isPending ? "Creating..." : "Save Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE LANDING PAGE MODAL */}
      {showCreateLanding && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Create Landing Page</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createLandingMutation.mutate(newLanding);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-bold text-gray-700 block mb-1">Page Title</label>
                <input
                  type="text"
                  required
                  value={newLanding.title}
                  onChange={(e) => setNewLanding({ ...newLanding, title: e.target.value })}
                  placeholder="MBBS Admissions 2026"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={newLanding.slug}
                  onChange={(e) => setNewLanding({ ...newLanding, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  placeholder="mbbs-2026"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateLanding(false)} className="px-4 py-2 bg-slate-100 text-gray-700 rounded-xl font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={createLandingMutation.isPending} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold">
                  Create Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE REFERRAL MODAL */}
      {showCreateReferral && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Generate Referral Code</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createReferralMutation.mutate(newReferralCode);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-bold text-gray-700 block mb-1">Referral Code</label>
                <input
                  type="text"
                  required
                  value={newReferralCode}
                  onChange={(e) => setNewReferralCode(e.target.value.toUpperCase())}
                  placeholder="REF-SWAYAM-2026"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateReferral(false)} className="px-4 py-2 bg-slate-100 text-gray-700 rounded-xl font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={createReferralMutation.isPending} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold">
                  Generate Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarketingPage() {
  return (
    <ErrorBoundary fallbackTitle="Marketing Module Component Error">
      <MarketingPageInner />
    </ErrorBoundary>
  );
}
