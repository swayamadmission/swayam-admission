import React, { useState } from "react";
import { Link, useParams } from "react-router";
import {
  ChevronRight, MapPin, GraduationCap, Users, Award, ArrowRight,
  Building2, Search, Star, Phone, Bot, Filter, Calendar, BookOpen,
  Globe, Clock, CheckCircle2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ALL_STATES } from "./StatesPage";
import { collegesApi, College } from "../../api/colleges.api";
import { examsApi, Exam } from "../../api/exams.api";
import { geographyApi } from "../../api/geography.api";

import { scholarshipsApi, Scholarship } from "../../api/scholarships.api";

const TABS = ["Overview", "Colleges", "Scholarships", "Exam", "Cities", "Updates"];

export default function StateDetailPage() {
  const { slug } = useParams();

  // Find matching static metadata for banner, emoji, and static descriptions
  const staticState = ALL_STATES.find(s => s.slug === slug);

  // Fetch real state details from database
  const { data: stateDetail, isLoading: isLoadingState, isError } = useQuery({
    queryKey: ["state_detail", slug],
    queryFn: () => geographyApi.getStateDetail(slug || ""),
    enabled: !!slug,
  });

  const isPublished = (status?: string | null) => {
    if (!status) return false;
    const s = status.toUpperCase();
    return s === "PUBLISHED" || s === "ACTIVE";
  };

  const stateName = stateDetail?.name || staticState?.name || "State";
  const stateId = stateDetail?.id;

  // Fetch real colleges from database for this state
  const { data: collegesRes, isLoading: isLoadingColleges } = useQuery({
    queryKey: ["state_colleges", stateName, stateId],
    queryFn: () => collegesApi.findAll({ state: stateName, limit: 100 }),
    enabled: !!stateName,
  });

  // Fetch real entrance exams from database for this state
  const { data: examsRes, isLoading: isLoadingExams } = useQuery({
    queryKey: ["state_exams", stateName, stateId],
    queryFn: () => examsApi.findAll({ state: stateName, limit: 50 }),
    enabled: !!stateName,
  });

  // Fetch real scholarships from database for this state
  const { data: scholarshipsRes, isLoading: isLoadingScholarships } = useQuery({
    queryKey: ["state_scholarships", stateName, stateId],
    queryFn: () => scholarshipsApi.findAll({ state: stateName, ...(stateId ? { stateId } : {}), limit: 50 }),
    enabled: !!stateName,
  });

  // Fetch real updates from database for this state
  const { data: updatesRes, isLoading: isLoadingUpdates } = useQuery({
    queryKey: ["state_updates", slug || stateId],
    queryFn: () => geographyApi.getStateUpdates(slug || stateId || ""),
    enabled: !!slug || !!stateId,
  });

  const [activeTab, setActiveTab] = useState("Overview");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchCollege, setSearchCollege] = useState("");
  const [examCategoryFilter, setExamCategoryFilter] = useState("All");

  const dbColleges: College[] = Array.isArray(collegesRes?.data?.data)
    ? collegesRes.data.data
    : Array.isArray(collegesRes?.data)
    ? (collegesRes.data as unknown as College[])
    : [];

  const rawExams = Array.isArray(examsRes?.data?.data)
    ? examsRes.data.data
    : Array.isArray(examsRes?.data)
    ? (examsRes.data as unknown as Exam[])
    : [];
  const dbExams: Exam[] = rawExams.filter(
    (e: any) => e && (e.status === "PUBLISHED" || !e.status)
  );

  const rawScholarships = Array.isArray(scholarshipsRes?.data?.data)
    ? scholarshipsRes.data.data
    : Array.isArray(scholarshipsRes?.data)
    ? (scholarshipsRes.data as unknown as Scholarship[])
    : [];
  const dbScholarships: Scholarship[] = rawScholarships.filter(
    (s: any) => s && (s.status === "PUBLISHED" || !s.status)
  );

  const dbUpdates: any[] = Array.isArray(updatesRes)
    ? updatesRes
    : Array.isArray((updatesRes as any)?.data)
    ? (updatesRes as any).data
    : [];
  const districts = Array.isArray(stateDetail?.districts) ? stateDetail.districts : [];

  // Filtered colleges for the Colleges tab
  const filteredColleges = dbColleges.filter(c => {
    const matchesType = typeFilter === "All" || 
      (typeFilter === "Government" && (c.ownership === "GOVERNMENT" || c.type === "GOVERNMENT")) ||
      (typeFilter === "Private" && (c.ownership !== "GOVERNMENT" && c.type !== "GOVERNMENT"));
    const matchesSearch = !searchCollege.trim() || 
      c.name.toLowerCase().includes(searchCollege.toLowerCase()) ||
      c.city?.toLowerCase().includes(searchCollege.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Filtered exams for the Exam tab
  const filteredExams = dbExams.filter(e => {
    return examCategoryFilter === "All" || e.category === examCategoryFilter;
  });

  const examCategories = ["All", ...Array.from(new Set(dbExams.map(e => e.category).filter(Boolean)))];

  const staticScholarshipsList = [
    { name: `${stateName} Post-Matric Scholarship`, amount: "₹15K–₹50K/yr", category: "SC/ST/OBC", deadline: "31/12/2026", eligibility: "10+2 passed, state domicile" },
    { name: "National Scholarship Portal (NSP)", amount: "₹20K–₹75K/yr", category: "All categories", deadline: "30/11/2026", eligibility: "Graduation students, income < ₹6L" },
    { name: "Central Sector Scholarship", amount: "₹12K–₹20K/yr", category: "Merit-based", deadline: "15/12/2026", eligibility: "80%+ in 12th, income < ₹8L" },
    { name: `${stateName} Mukhyamantri Scholarship`, amount: "₹5K–₹25K/yr", category: "All", deadline: "15/01/2027", eligibility: "State domicile, enrolled in state college" },
  ];

  if (isLoadingState) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center text-xs font-semibold text-gray-500">Loading state details...</div>
      </div>
    );
  }

  if (!stateDetail || !isPublished(stateDetail.status)) {
    return (
      <div style={{ backgroundColor: "#F8FAFC" }} className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-gray-100 shadow-xs text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <MapPin size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">State Not Available</h2>
          <p className="text-gray-500 text-xs mb-6 leading-relaxed">
            This state is currently unpublished or not found. Please explore other published states in Swayam Admission.
          </p>
          <Link
            to="/states"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-white font-semibold text-xs shadow-xs transition-opacity hover:opacity-95"
            style={{ background: "#4A7B5B" }}
          >
            Browse All Published States
          </Link>
        </div>
      </div>
    );
  }

  const totalCollegesCount = stateDetail?.collegesCount ?? (dbColleges.length || staticState?.colleges || 0);
  const govtCollegesCount = stateDetail?.governmentColleges ?? (dbColleges.filter(c => c.ownership === "GOVERNMENT" || c.type === "GOVERNMENT").length || staticState?.govtColleges || 0);
  const privateCollegesCount = stateDetail?.privateColleges ?? (dbColleges.filter(c => c.ownership !== "GOVERNMENT" && c.type !== "GOVERNMENT").length || staticState?.privateColleges || 0);
  const totalScholarshipsCount = 
    (typeof stateDetail?.scholarshipsCount === "number" && stateDetail.scholarshipsCount > 0)
      ? stateDetail.scholarshipsCount
      : (dbScholarships.length > 0 ? dbScholarships.length : (staticState?.scholarships || staticScholarshipsList.length));
  const heroBannerImg = stateDetail?.heroImage || staticState?.img || "https://images.unsplash.com/photo-1759562588736-186cce2c26b5?w=1200&q=80";
  const stateDescription = stateDetail?.description || staticState?.description || `Explore premier colleges, entrance exams, and domicile scholarships across ${stateName}.`;
  const popularCoursesList = (Array.isArray(stateDetail?.popularCourses) && stateDetail.popularCourses.length > 0)
    ? stateDetail.popularCourses
    : (Array.isArray((staticState as any)?.popularCourses) && (staticState as any).popularCourses.length > 0)
    ? (staticState as any).popularCourses
    : [staticState?.topCourse || "B.Tech", "MBA", "MBBS", "BCA", "B.Sc", "B.Com", "B.Pharm", "BA LLB"];

  // Indian date formatter helper (DD/MM/YYYY)
  const formatDate = (dateStr?: string) => {
    if (!dateStr || dateStr === "Invalid Date") return "TBA";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "TBA";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "TBA";
    }
  };

  const stateEmoji = staticState?.emoji || "🏛️";
  const studentsCount = staticState?.students || "5L+";

  return (
    <div style={{ backgroundColor: "#F8FAFC" }}>
      {/* Banner */}
      <div className="relative h-56 sm:h-64 overflow-hidden">
        <ImageWithFallback src={heroBannerImg} alt={stateName} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end px-4 sm:px-6 pb-6 max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 mb-3" style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={11} />
            <Link to="/states" className="hover:text-white transition-colors">States</Link>
            <ChevronRight size={11} />
            <span className="text-white">{stateName}</span>
          </nav>
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-4xl">{stateEmoji}</span>
                <h1 className="text-white" style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800 }}>{stateName}</h1>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {[
                  `${totalCollegesCount} Colleges`,
                  `${studentsCount} Students`,
                  `${totalScholarshipsCount}+ Scholarships`,
                  `${dbExams.length} Entrance Exams`
                ].map(l => (
                  <span key={l} className="text-white/80" style={{ fontSize: "12px" }}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { Icon: GraduationCap, label: "Total Colleges", value: totalCollegesCount },
                { Icon: Building2, label: "Govt Colleges", value: govtCollegesCount },
                { Icon: Users, label: "Private Colleges", value: privateCollegesCount },
                { Icon: Award, label: "Scholarships", value: `${totalScholarshipsCount}+` },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="w-8 h-8 bg-[#E8F3EC] rounded-xl flex items-center justify-center mb-2">
                    <Icon size={15} className="text-[#4A7B5B]" />
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#4A7B5B" }}>{value}</div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* 6 Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-5 no-scrollbar border-b border-gray-100">
              {TABS.map(t => (
                <button 
                  key={t} 
                  onClick={() => setActiveTab(t)}
                  className={`px-4 py-2.5 text-sm whitespace-nowrap shrink-0 transition-colors ${
                    activeTab === t ? "text-[#4A7B5B] border-b-2 border-[#4A7B5B] -mb-px" : "text-gray-500 hover:text-gray-700"
                  }`}
                  style={{ fontWeight: activeTab === t ? 600 : 400 }}
                >
                  {t}
                  {t === "Exam" && dbExams.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                      {dbExams.length}
                    </span>
                  )}
                  {t === "Colleges" && dbColleges.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                      {dbColleges.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* 1. OVERVIEW */}
            {activeTab === "Overview" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-3" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>About Education in {stateName}</h3>
                  <p style={{ fontSize: "14px", color: "#4B5563", lineHeight: 1.7 }}>{stateDescription}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-4" style={{ fontSize: "15px", fontWeight: 700, color: "#4A7B5B" }}>Popular Courses in {stateName}</h3>
                  <div className="flex flex-wrap gap-2">
                    {popularCoursesList.map((c: string) => (
                      <Link key={c} to={`/courses?q=${c}`}
                        className="px-3 py-1.5 bg-[#F8FAFC] border border-gray-100 rounded-xl hover:border-[#4A7B5B]/30 hover:bg-[#E8F3EC] transition-all"
                        style={{ fontSize: "12px", fontWeight: 500, color: "#374151" }}>
                        {c}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-3" style={{ fontSize: "15px", fontWeight: 700, color: "#4A7B5B" }}>Major Districts & Cities</h3>
                  <div className="flex flex-wrap gap-2">
                    {(districts.length > 0 ? districts.map(d => d.name) : staticState.popularCities).slice(0, 12).map(city => (
                      <Link 
                        key={city} 
                        to={`/colleges?state=${encodeURIComponent(stateName)}&city=${encodeURIComponent(city)}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F3EC] rounded-xl hover:bg-[#d8ebd2] transition-colors"
                      >
                        <MapPin size={11} className="text-[#4A7B5B]" />
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#4A7B5B" }}>{city}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. COLLEGES (Live Database Synced from Admin) */}
            {activeTab === "Colleges" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                    <Search size={14} className="text-gray-400" />
                    <input 
                      type="text" 
                      placeholder={`Search colleges in ${stateName}...`} 
                      value={searchCollege} 
                      onChange={e => setSearchCollege(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400" 
                    />
                  </div>
                  <select 
                    value={typeFilter} 
                    onChange={e => setTypeFilter(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B]"
                  >
                    {["All", "Government", "Private"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {isLoadingColleges && (
                  <div className="py-12 text-center text-sm text-gray-500">
                    Loading verified institutions in {stateName}...
                  </div>
                )}

                {!isLoadingColleges && filteredColleges.length === 0 && (
                  <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-[#4A7B5B] mb-1">No colleges found</h4>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                      {searchCollege 
                        ? `No colleges in ${stateName} matched "${searchCollege}".` 
                        : `No colleges are currently registered under ${stateName} in the College Directory.`}
                    </p>
                    <Link 
                      to="/colleges" 
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4A7B5B] text-white rounded-xl text-xs font-semibold hover:bg-[#3d6b4d]"
                    >
                      Browse All Colleges <ArrowRight size={12} />
                    </Link>
                  </div>
                )}

                {!isLoadingColleges && filteredColleges.map(c => {
                  const feeDisplay = c.totalFees ? `₹${(c.totalFees / 100000).toFixed(1)}L/yr` : "Affordable";
                  const collegeType = c.ownership === "GOVERNMENT" ? "Government" : (c.type || "Private");

                  return (
                    <div key={c.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex hover:shadow-sm transition-all group">
                      <div className="w-24 sm:w-36 h-28 sm:h-36 shrink-0 overflow-hidden relative">
                        <ImageWithFallback 
                          src={c.banner || c.img || "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=400&q=80"} 
                          alt={c.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-black/10" />
                      </div>
                      <div className="flex-1 p-4 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#4A7B5B" }} className="line-clamp-1">
                                {c.name}
                              </h3>
                              <div className="flex items-center gap-1 text-gray-400 mb-2 flex-wrap">
                                <MapPin size={11} />
                                <span style={{ fontSize: "11px" }}>{c.city}, {c.state}</span>
                                <span 
                                  className="ml-1 px-1.5 py-0.5 rounded text-white" 
                                  style={{ 
                                    fontSize: "9px", 
                                    fontWeight: 600, 
                                    backgroundColor: collegeType === "Government" ? "#4A7B5B" : "#3B82F6" 
                                  }}
                                >
                                  {collegeType}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-0.5 justify-end mb-1">
                                <Star size={11} className="fill-[#F0AE1A] text-[#F0AE1A]" />
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#4A7B5B" }}>{c.rating || 4.5}</span>
                              </div>
                              <div style={{ fontSize: "12px", fontWeight: 600, color: "#4A7B5B" }}>{feeDisplay}</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-2">
                            {(c.courses || []).slice(0, 4).map((co: any) => (
                              <span 
                                key={co.id || co.name} 
                                className="px-1.5 py-0.5 bg-[#F8FAFC] border border-gray-100 text-gray-500 rounded" 
                                style={{ fontSize: "9px" }}
                              >
                                {co.name || co}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-gray-50">
                          <Link 
                            to={`/colleges/${c.id}`} 
                            className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors" 
                            style={{ fontSize: "11px" }}
                          >
                            View Details
                          </Link>
                          <Link 
                            to="/apply-now" 
                            className="px-3 py-1.5 bg-[#4A7B5B] text-white rounded-lg hover:bg-[#3d6b4d] transition-colors" 
                            style={{ fontSize: "11px", fontWeight: 600 }}
                          >
                            Apply Now
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. SCHOLARSHIPS (Live Database Synced from Admin) */}
            {activeTab === "Scholarships" && (
              <div className="space-y-4">
                <div className="bg-[#E8F3EC] rounded-2xl p-4 border border-[#4A7B5B]/20 mb-2">
                  <p style={{ fontSize: "13px", color: "#4A7B5B", lineHeight: 1.6 }}>
                    🎓 <strong>{(dbScholarships.length > 0 ? dbScholarships.length : totalScholarshipsCount)}+ scholarships</strong> are available for students domiciled in {stateName}. Check eligibility and apply before deadlines.
                  </p>
                </div>

                {isLoadingScholarships && (
                  <div className="py-12 text-center text-sm text-gray-500">
                    Loading scholarships for {stateName}...
                  </div>
                )}

                {!isLoadingScholarships && dbScholarships.length > 0 && (
                  <div className="space-y-4">
                    {dbScholarships.map(sch => (
                      <div key={sch.id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#4A7B5B" }}>{sch.scholarshipName}</h3>
                            {sch.provider && (
                              <p className="text-xs text-gray-500 mt-0.5">Offered by: {sch.provider}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2 mb-3">
                              {sch.category && (
                                <span className="px-2 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-full" style={{ fontSize: "10px", fontWeight: 600 }}>{sch.category}</span>
                              )}
                              {sch.scholarshipType && (
                                <span className="px-2 py-0.5 bg-[#F1F5F9] text-[#64748B] rounded-full" style={{ fontSize: "10px", fontWeight: 600 }}>{sch.scholarshipType}</span>
                              )}
                              {sch.applicationEnd && (
                                <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded-full" style={{ fontSize: "10px", fontWeight: 600 }}>Deadline: {formatDate(sch.applicationEnd)}</span>
                              )}
                            </div>
                            {sch.eligibility && (
                              <p style={{ fontSize: "12px", color: "#64748b" }}>{sch.eligibility}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div style={{ fontSize: "16px", fontWeight: 800, color: "#4A7B5B" }}>
                              {sch.amount ? `₹${sch.amount.toLocaleString("en-IN")}` : "Full / Partial"}
                            </div>
                            <Link to={sch.slug ? `/scholarships/${sch.slug}` : (sch.id ? `/scholarships/${sch.id}` : "/scholarships")} className="text-xs text-[#4A7B5B] hover:underline">Details →</Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isLoadingScholarships && dbScholarships.length === 0 && (
                  <div className="space-y-4">
                    {staticScholarshipsList.map(sch => (
                      <div key={sch.name} className="bg-white rounded-2xl p-5 border border-gray-100">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#4A7B5B" }}>{sch.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2 mb-3">
                              <span className="px-2 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-full" style={{ fontSize: "10px", fontWeight: 600 }}>{sch.category}</span>
                              <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded-full" style={{ fontSize: "10px", fontWeight: 600 }}>Deadline: {sch.deadline}</span>
                            </div>
                            <p style={{ fontSize: "12px", color: "#64748b" }}>{sch.eligibility}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div style={{ fontSize: "16px", fontWeight: 800, color: "#4A7B5B" }}>{sch.amount}</div>
                            <Link to="/scholarships" className="text-xs text-[#4A7B5B] hover:underline">Details →</Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Link to="/scholarships" className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#4A7B5B]/30 text-[#4A7B5B] rounded-2xl hover:bg-[#E8F3EC] transition-colors">
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>View All Scholarships</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* 4. NEW EXAM TAB (Database Synced from Admin Panel) */}
            {activeTab === "Exam" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100">
                  <div>
                    <h3 className="text-sm font-bold text-[#4A7B5B]">Entrance Exams in {stateName}</h3>
                    <p className="text-xs text-[#94A3B8]">
                      State-level and national exams required for admission to colleges in {stateName}
                    </p>
                  </div>
                  {examCategories.length > 2 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Category:</span>
                      <select
                        value={examCategoryFilter}
                        onChange={e => setExamCategoryFilter(e.target.value)}
                        className="h-8 px-2.5 rounded-xl border border-gray-200 text-xs bg-[#F8FAFC] text-gray-700 focus:outline-none focus:border-[#4A7B5B]"
                      >
                        {examCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {isLoadingExams && (
                  <div className="py-12 text-center text-sm text-gray-500">
                    Loading entrance exams for {stateName}...
                  </div>
                )}

                {!isLoadingExams && filteredExams.length === 0 && (
                  <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#E8F3EC] flex items-center justify-center mx-auto mb-3 text-xl">
                      📝
                    </div>
                    <h4 className="text-base font-bold text-[#4A7B5B] mb-1">No Entrance Exams Listed Yet</h4>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
                      There are currently no entrance exams assigned to {stateName}. Entrance exams created and assigned in the Admin Panel appear here automatically.
                    </p>
                    <Link
                      to="/exams"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4A7B5B] text-white rounded-xl text-xs font-semibold hover:bg-[#3d6b4d] transition-colors"
                    >
                      Browse National Exams <ArrowRight size={12} />
                    </Link>
                  </div>
                )}

                {!isLoadingExams && filteredExams.map(exam => {
                  return (
                    <div key={exam.id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-sm transition-all space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                              {exam.category || "General"}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F5F9] text-[#64748B]">
                              {exam.level || "State Level"}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F5F9] text-[#64748B]">
                              {exam.examMode === "ONLINE" ? "Online CBT" : exam.examMode === "OFFLINE" ? "Pen & Paper" : "Hybrid"}
                            </span>
                          </div>
                          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>
                            {exam.examName}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Conducted by: <span className="text-gray-600 font-medium">{exam.conductedBy || "State Examination Authority"}</span>
                          </p>
                        </div>

                        {exam.officialWebsite && (
                          <a
                            href={exam.officialWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:text-[#4A7B5B] hover:border-[#4A7B5B] transition-colors"
                          >
                            <Globe size={12} /> Official Site
                          </a>
                        )}
                      </div>

                      {exam.description && (
                        <p className="text-xs text-[#4B5563] leading-relaxed line-clamp-2">
                          {exam.description}
                        </p>
                      )}

                      {/* Important dates banner formatted DD/MM/YYYY */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-50 text-xs">
                        <div className="bg-[#F8FAFC] p-2 rounded-xl">
                          <div className="text-[10px] text-gray-400 font-medium">Exam Date</div>
                          <div className="font-bold text-[#4A7B5B] mt-0.5">{formatDate(exam.examDate)}</div>
                        </div>
                        <div className="bg-[#F8FAFC] p-2 rounded-xl">
                          <div className="text-[10px] text-gray-400 font-medium">Reg. End Date</div>
                          <div className="font-bold text-[#4A7B5B] mt-0.5">{formatDate(exam.applicationEnd)}</div>
                        </div>
                        <div className="bg-[#F8FAFC] p-2 rounded-xl">
                          <div className="text-[10px] text-gray-400 font-medium">Application Fee</div>
                          <div className="font-bold text-[#4A7B5B] mt-0.5">{exam.applicationFee ? `₹${exam.applicationFee}` : "Free / TBA"}</div>
                        </div>
                        <div className="bg-[#F8FAFC] p-2 rounded-xl">
                          <div className="text-[10px] text-gray-400 font-medium">Result Date</div>
                          <div className="font-bold text-[#4A7B5B] mt-0.5">{formatDate(exam.resultDate)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5. CITIES / DISTRICTS (Database Synced) */}
            {activeTab === "Cities" && (
              <div className="grid sm:grid-cols-2 gap-4">
                {(districts.length > 0 ? districts : staticState.popularCities.map((city, idx) => ({ id: `city-${idx}`, name: city, collegesCount: 0 }))).map(d => (
                  <div key={d.id || d.name} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-sm transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin size={16} className="text-[#4A7B5B]" />
                        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>{d.name}</h3>
                      </div>
                      <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                        {d.collegesCount ?? 0} {d.collegesCount === 1 ? "college" : "colleges"} listed
                      </p>
                    </div>
                    <Link 
                      to={`/colleges?state=${encodeURIComponent(stateName)}&city=${encodeURIComponent(d.name)}`} 
                      className="mt-4 inline-flex items-center gap-1.5 text-[#4A7B5B]" 
                      style={{ fontSize: "12px", fontWeight: 600 }}
                    >
                      Browse Colleges in {d.name} <ArrowRight size={12} />
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* 6. UPDATES (Live Database Synced from Admin) */}
            {activeTab === "Updates" && (
              <div className="space-y-3">
                {isLoadingUpdates && (
                  <div className="py-10 text-center text-sm text-gray-500">
                    Loading state updates & announcements...
                  </div>
                )}

                {!isLoadingUpdates && dbUpdates.length > 0 && (
                  <div className="space-y-3">
                    {dbUpdates.map((update: any) => (
                      <div key={update.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-start gap-3 hover:shadow-xs transition-shadow">
                        {update.image ? (
                          <img src={update.image} alt={update.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#4A7B5B] mt-2 shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-full" style={{ fontSize: "9px", fontWeight: 600 }}>
                              {update.type || "Circular"}
                            </span>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                              {formatDate(update.publishDate || update.createdAt)}
                            </span>
                          </div>
                          <p style={{ fontSize: "14px", fontWeight: 600, color: "#1E293B" }}>{update.title}</p>
                          {update.content && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                              {update.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isLoadingUpdates && dbUpdates.length === 0 && (
                  <div className="space-y-3">
                    {[
                      { title: `${stateName} B.Tech Counseling 2026 Dates Announced`, date: "20/05/2026", type: "Admission Update" },
                      { title: `New Scholarship Scheme Launched for Students in ${stateName}`, date: "15/05/2026", type: "Scholarship" },
                      { title: `${stateName} Post-Matric Scholarship Application Opens`, date: "10/05/2026", type: "Scholarship" },
                      { title: `Top Engineering Colleges in ${stateName}: Rankings 2026`, date: "05/05/2026", type: "Rankings" },
                    ].map((update, i) => (
                      <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#4A7B5B] mt-2 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-full" style={{ fontSize: "9px", fontWeight: 600 }}>{update.type}</span>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>{update.date}</span>
                          </div>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#4A7B5B" }}>{update.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-64 space-y-4 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-20">
              <h3 className="mb-4" style={{ fontSize: "15px", fontWeight: 700, color: "#4A7B5B" }}>Get Admission in {stateName}</h3>
              <Link to="/apply-now" className="w-full flex items-center justify-center gap-2 py-3 bg-[#4A7B5B] text-white rounded-xl hover:bg-[#3d6b4d] transition-colors mb-3" style={{ fontWeight: 600, fontSize: "14px" }}>
                Apply Now Free <ArrowRight size={14} />
              </Link>
              <a href="tel:+919000000000" className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors mb-4" style={{ fontSize: "13px" }}>
                <Phone size={13} /> Free Counseling
              </a>
              <div className="space-y-2">
                {[
                  { label: "Total Colleges", value: totalCollegesCount },
                  { label: "Govt Colleges", value: govtCollegesCount },
                  { label: "Region", value: staticState.region },
                  { label: "State Entrance Exams", value: dbExams.length },
                ].map(i => (
                  <div key={i.label} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>{i.label}</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#4A7B5B" }}>{i.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={16} className="text-[#F0AE1A]" />
                <span className="text-white" style={{ fontSize: "13px", fontWeight: 700 }}>AI Counselor</span>
              </div>
              <p className="text-white/80 mb-3" style={{ fontSize: "12px" }}>Find the best colleges in {stateName} for your profile</p>
              <Link to="/ai-counselor" className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-[#4A7B5B] rounded-xl" style={{ fontWeight: 600, fontSize: "13px" }}>
                Get Suggestions
              </Link>
            </div>

            {/* Other states */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#4A7B5B" }} className="mb-3">Explore Other States</h4>
              <div className="space-y-1.5">
                {ALL_STATES.filter(s => s.slug !== slug).slice(0, 5).map(s => (
                  <Link key={s.slug} to={`/states/${s.slug}`}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#E8F3EC] transition-colors group">
                    <span className="text-lg">{s.emoji}</span>
                    <span className="group-hover:text-[#4A7B5B] transition-colors" style={{ fontSize: "12px", fontWeight: 500, color: "#374151" }}>{s.name}</span>
                    <span className="ml-auto" style={{ fontSize: "10px", color: "#94a3b8" }}>{s.colleges}</span>
                  </Link>
                ))}
                <Link to="/states" className="flex items-center gap-1.5 text-[#4A7B5B] pt-1 pl-2" style={{ fontSize: "12px", fontWeight: 600 }}>
                  All states <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
