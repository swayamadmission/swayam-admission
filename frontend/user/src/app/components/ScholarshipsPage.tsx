import React, { useState } from "react";
import { Link } from "react-router";
import { Search, Award, ChevronRight, Filter, X, CheckCircle, IndianRupee, Calendar, Users, TrendingUp, Sparkles } from "lucide-react";

export interface Scholarship {
  slug: string;
  name: string;
  shortName: string;
  category: "Government" | "Merit-based" | "State-specific" | "Private/NGO";
  amount: string;
  amountNum: number;
  deadline: string;
  deadlineDate: string;
  provider: string;
  eligibility: string;
  eligibleStates: string[];
  eligibleCategories: string[];
  maxIncome: number;
  eligibleCourses: string[];
  color: string;
  bg: string;
  students: string;
  featured: boolean;
  description: string;
  badge?: string;
}

import { useQuery } from "@tanstack/react-query";
import { scholarshipsApi, ScholarshipQueryParams } from "../../api/scholarships.api";
import { useDebounce } from "../../hooks/useDebounce";

const getCategoryColor = (category: string) => {
  switch (category?.toLowerCase()) {
    case "government": return { color: "#4A7B5B", bg: "#E8F3EC" };
    case "merit-based": return { color: "#3B82F6", bg: "#DBEAFE" };
    case "state-specific": return { color: "#F59E0B", bg: "#FEF3C7" };
    case "private/ngo": return { color: "#EC4899", bg: "#FCE7F3" };
    default: return { color: "#3B82F6", bg: "#DBEAFE" };
  }
};

const CATEGORIES = ["All", "Government", "Merit-based", "State-specific", "Private/NGO"];
const INCOME_OPTIONS = [
  { label: "Any Income", value: 9999999 },
  { label: "Below ₹1 Lakh", value: 100000 },
  { label: "Below ₹2.5 Lakh", value: 250000 },
  { label: "Below ₹4.5 Lakh", value: 450000 },
  { label: "Below ₹8 Lakh", value: 800000 },
];
const COURSE_OPTIONS = ["All Courses", "B.Tech", "MBBS", "B.Sc", "B.A.", "MBA", "B.Pharm", "B.Ed", "M.Sc", "LLB"];
const STATE_OPTIONS = ["All States", "Bihar", "Uttar Pradesh", "Delhi NCR", "Punjab", "Rajasthan", "Madhya Pradesh", "Maharashtra"];
const CATEGORY_OPTIONS = ["All", "SC", "ST", "OBC", "General-EWS", "Minorities"];

const CATEGORY_COLORS: Record<string, string> = {
  "Government": "#4A7B5B",
  "Merit-based": "#3B82F6",
  "State-specific": "#F59E0B",
  "Private/NGO": "#EC4899",
};

export default function ScholarshipsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showChecker, setShowChecker] = useState(false);

  // Eligibility checker state
  const [checkerState, setCheckerState] = useState("All States");
  const [checkerCategory, setCheckerCategory] = useState("All");
  const [checkerIncome, setCheckerIncome] = useState(9999999);
  const [checkerCourse, setCheckerCourse] = useState("All Courses");
  const [checkerResults, setCheckerResults] = useState<Scholarship[] | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  const queryParams: ScholarshipQueryParams = { limit: 100 };
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (category !== "All") queryParams.category = category;

  const { data: scholarshipsRes, isLoading } = useQuery({
    queryKey: ["scholarships", queryParams],
    queryFn: () => scholarshipsApi.findAll(queryParams),
  });

  const allScholarships = scholarshipsRes?.data?.data || [];
  const filtered = allScholarships;
  const featured = allScholarships.filter((s: any) => s.featured);

  function runChecker() {
    const results = allScholarships.filter((s: any) => {
      // Very basic mock check, since API schema doesn't have all these arrays natively
      const incomeMatch = (s.incomeLimit || 999999999) >= checkerIncome;
      return incomeMatch;
    });
    setCheckerResults(results as any);
  }

  return (
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <nav className="flex items-center gap-2 mb-4" style={{ fontSize: "12px", color: "#94a3b8" }}>
            <Link to="/" className="hover:text-[#4A7B5B] transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span style={{ color: "#4A7B5B", fontWeight: 600 }}>Scholarships</span>
          </nav>
          <div className="mb-2" style={{ fontSize: "12px", fontWeight: 600, color: "#4A7B5B" }}>Financial Aid & Support</div>
          <h1 className="mb-2" style={{ fontWeight: 800, color: "#4A7B5B", fontSize: "clamp(24px,4vw,36px)" }}>Scholarships & Financial Aid</h1>
          <p style={{ fontSize: "14px", color: "#64748b" }}>Discover 50+ scholarships for Indian students. Check eligibility, deadlines, and apply directly.</p>

          <button
            onClick={() => setShowChecker(!showChecker)}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white transition-all shadow-sm hover:shadow-md"
            style={{ backgroundColor: "#4A7B5B", fontSize: "13px", fontWeight: 600 }}
          >
            <Sparkles size={16} /> Scholarship Eligibility Checker
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Eligibility Checker Panel */}
        {showChecker && (
          <div className="bg-white rounded-2xl border border-[#4A7B5B]/20 shadow-sm overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: "#E8F3EC" }}>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#4A7B5B]" />
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#4A7B5B" }}>Scholarship Eligibility Checker</span>
              </div>
              <button onClick={() => { setShowChecker(false); setCheckerResults(null); }} className="p-1.5 rounded-lg hover:bg-[#4A7B5B]/10 transition-colors">
                <X size={16} className="text-[#4A7B5B]" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-5" style={{ fontSize: "13px", color: "#64748b" }}>Fill in your details to see all scholarships you are eligible for.</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Your State</label>
                  <select value={checkerState} onChange={e => setCheckerState(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#4A7B5B]" style={{ fontSize: "13px" }}>
                    {STATE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Category</label>
                  <select value={checkerCategory} onChange={e => setCheckerCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#4A7B5B]" style={{ fontSize: "13px" }}>
                    {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Annual Family Income</label>
                  <select value={checkerIncome} onChange={e => setCheckerIncome(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#4A7B5B]" style={{ fontSize: "13px" }}>
                    {INCOME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Course</label>
                  <select value={checkerCourse} onChange={e => setCheckerCourse(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#4A7B5B]" style={{ fontSize: "13px" }}>
                    {COURSE_OPTIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={runChecker}
                className="px-6 py-2.5 bg-[#4A7B5B] text-white rounded-xl hover:bg-[#3d6b4d] transition-colors shadow-sm"
                style={{ fontSize: "13px", fontWeight: 600 }}>
                Check Eligibility
              </button>

              {checkerResults !== null && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle size={18} className="text-[#4A7B5B]" />
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#4A7B5B" }}>
                      {checkerResults.length} Scholarships Found for You
                    </span>
                  </div>
                  {checkerResults.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "#94a3b8" }}>No matching scholarships found. Try adjusting your filters.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {checkerResults.map((s: any) => {
                        const style = getCategoryColor(s.category);
                        return (
                        <Link key={s.slug} to={`/scholarships/${s.slug}`}
                          className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#4A7B5B]/30 hover:shadow-sm transition-all"
                          style={{ backgroundColor: style.bg }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: style.color + "22" }}>
                            <Award size={16} style={{ color: style.color }} />
                          </div>
                          <div>
                            <p style={{ fontSize: "12px", fontWeight: 600, color: "#4A7B5B" }}>{s.scholarshipName}</p>
                            <p style={{ fontSize: "11px", color: style.color, fontWeight: 600 }}>{s.amount ? `₹${s.amount}/year` : "Varies"}</p>
                            <p style={{ fontSize: "10px", color: "#94a3b8" }}>Deadline: {s.applicationEnd ? new Date(s.applicationEnd).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </Link>
                      )})}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { Icon: Award, value: "50+", label: "Scholarships Listed" },
            { Icon: IndianRupee, value: "₹500Cr+", label: "Total Aid Available" },
            { Icon: Users, value: "1 Crore+", label: "Students Benefited" },
            { Icon: TrendingUp, value: "95%", label: "Application Success" },
          ].map(({ Icon, value, label }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E8F3EC] rounded-xl flex items-center justify-center shrink-0">
                <Icon size={18} className="text-[#4A7B5B]" />
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#4A7B5B" }}>{value}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Featured Scholarships */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>Featured Scholarships</h2>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>Most applied this season</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((s: any) => {
              const style = getCategoryColor(s.category);
              return (
              <Link key={s.slug} to={`/scholarships/${s.slug}`}
                className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-[#4A7B5B]/20 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: style.bg }}>
                    <Award size={20} style={{ color: style.color }} />
                  </div>
                  {(s as any).badge && (
                    <span className="px-2 py-1 rounded-full" style={{ fontSize: "10px", fontWeight: 600, backgroundColor: style.bg, color: style.color }}>{(s as any).badge}</span>
                  )}
                </div>
                <h3 className="mb-1" style={{ fontSize: "14px", fontWeight: 700, color: "#4A7B5B", lineHeight: 1.3 }}>{s.scholarshipName}</h3>
                <p className="mb-3" style={{ fontSize: "11px", color: "#64748b" }}>{s.provider || "Various Providers"}</p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: style.color }}>{s.amount ? `₹${s.amount}` : "Varies"}</div>
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>per year</div>
                  </div>
                  <div className="text-right">
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#4A7B5B" }}>Due: {s.applicationEnd ? new Date(s.applicationEnd).toLocaleDateString() : 'N/A'}</div>
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>N/A beneficiaries</div>
                  </div>
                </div>
              </Link>
            )})}
          </div>
        </div>

        {/* Search + Category Filter */}
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input type="text" placeholder="Search scholarships..." value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400" />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className="px-4 py-2 rounded-xl transition-all"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: category === cat ? "#4A7B5B" : "#fff",
                  color: category === cat ? "#fff" : "#64748b",
                  border: `1.5px solid ${category === cat ? "#4A7B5B" : "#e2e8f0"}`,
                }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Scholarship Cards */}
          <div className="space-y-4">
            {isLoading && <div className="text-center py-10 text-gray-500">Loading scholarships...</div>}
            {!isLoading && filtered.map((s: any) => {
              const style = getCategoryColor(s.category);
              return (
              <Link key={s.slug} to={`/scholarships/${s.slug}`}
                className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-[#4A7B5B]/20 transition-all flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: style.bg }}>
                  <Award size={24} style={{ color: style.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#4A7B5B" }}>{s.scholarshipName}</h3>
                    <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 600, backgroundColor: CATEGORY_COLORS[s.category] + "20", color: CATEGORY_COLORS[s.category] }}>{s.category || "General"}</span>
                    {(s as any).badge && <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 600, backgroundColor: style.bg, color: style.color }}>{(s as any).badge}</span>}
                  </div>
                  <p className="mb-2" style={{ fontSize: "12px", color: "#64748b" }}>{s.provider || "N/A"}</p>
                  <p className="mb-3" style={{ fontSize: "12px", color: "#475569" }}>{s.eligibility || "See official website for eligibility criteria."}</p>
                </div>
                <div className="shrink-0 text-right sm:text-right">
                  <div style={{ fontSize: "16px", fontWeight: 800, color: style.color }}>{s.amount ? `₹${s.amount}` : "Varies"}</div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }} className="mb-2">per year</div>
                  <div className="flex items-center gap-1 justify-end">
                    <Calendar size={11} className="text-orange-500" />
                    <span style={{ fontSize: "11px", color: "#F97316", fontWeight: 600 }}>Due {s.applicationEnd ? new Date(s.applicationEnd).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="mt-3 px-4 py-2 bg-[#4A7B5B] text-white rounded-xl group-hover:bg-[#3d6b4d] transition-colors text-center"
                    style={{ fontSize: "12px", fontWeight: 600 }}>
                    View Details
                  </div>
                </div>
              </Link>
            )})}

            {!isLoading && filtered.length === 0 && (
              <div className="text-center py-16">
                <Award size={44} className="text-gray-300 mx-auto mb-3" />
                <p style={{ fontSize: "16px", color: "#94a3b8" }}>No scholarships found. Try a different search.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
