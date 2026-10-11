import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import {
  Search,
  Building2,
  GraduationCap,
  FileText,
  Compass,
  Award,
  BookOpen,
  MapPin,
  ArrowRight,
  Download,
  Calendar,
  IndianRupee,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Newspaper,
  ShieldCheck,
  X,
} from "lucide-react";
import { LiquidGlassSearchBar } from "./LiquidGlassSearchBar";
import { searchApi, GlobalSearchResponse } from "../../api/search.api";

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const typeParam = (searchParams.get("type") || "ALL").toUpperCase();

  const [activeFilter, setActiveFilter] = useState<string>(typeParam);
  const [results, setResults] = useState<GlobalSearchResponse>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [query]);

  useEffect(() => {
    setActiveFilter(typeParam);
  }, [typeParam]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({});
      return;
    }

    setIsLoading(true);
    searchApi
      .search(query.trim(), "ALL")
      .then((res) => {
        if (res.data) {
          setResults(res.data);
        }
      })
      .catch((err) => {
        console.error("Search failed:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [query]);

  const colleges = results.colleges || [];
  const courses = results.courses || [];
  const studyMaterials = results.studyMaterials || [];
  const guides = results.guides || [];
  const exams = results.exams || [];
  const scholarships = results.scholarships || [];
  const streams = results.streams || [];
  const blogs = results.blogs || [];
  const reports = results.reports || [];
  const locations = results.locations || [];

  const totalResults =
    colleges.length +
    courses.length +
    studyMaterials.length +
    guides.length +
    exams.length +
    scholarships.length +
    streams.length +
    blogs.length +
    reports.length +
    locations.length;

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    const newParams = new URLSearchParams(searchParams);
    if (filter === "ALL") {
      newParams.delete("type");
    } else {
      newParams.set("type", filter);
    }
    setSearchParams(newParams);
  };

  const filters = [
    { key: "ALL", label: "All", count: totalResults, icon: Search },
    { key: "COLLEGES", label: "Colleges", count: colleges.length, icon: Building2 },
    { key: "COURSES", label: "Courses", count: courses.length, icon: GraduationCap },
    { key: "MATERIALS", label: "Materials", count: studyMaterials.length, icon: FileText },
    { key: "GUIDES", label: "Guides", count: guides.length, icon: Compass },
    { key: "EXAMS", label: "Exams", count: exams.length, icon: Award },
    { key: "SCHOLARSHIPS", label: "Scholarships", count: scholarships.length, icon: BookOpen },
    { key: "STREAMS", label: "Streams", count: streams.length, icon: Layers },
    { key: "BLOGS", label: "Blogs", count: blogs.length, icon: Newspaper },
    { key: "REPORTS", label: "Reports", count: reports.length, icon: ShieldCheck },
  ];

  const currentCategoryCount =
    activeFilter === "ALL"
      ? totalResults
      : activeFilter === "COLLEGES"
      ? colleges.length
      : activeFilter === "COURSES"
      ? courses.length
      : activeFilter === "MATERIALS"
      ? studyMaterials.length
      : activeFilter === "GUIDES"
      ? guides.length
      : activeFilter === "EXAMS"
      ? exams.length
      : activeFilter === "SCHOLARSHIPS"
      ? scholarships.length
      : activeFilter === "STREAMS"
      ? streams.length
      : activeFilter === "BLOGS"
      ? blogs.length
      : reports.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── HEADER SEARCH BANNER ── */}
      <section className="relative pt-8 sm:pt-10 pb-6 sm:pb-8 border-b border-gray-200/80 bg-gradient-to-b from-[#E8F3EC]/70 via-white to-slate-50 overflow-visible">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-5 sm:mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F3EC] text-[#4A7B5B] text-xs font-semibold mb-2 sm:mb-3">
              <Sparkles size={13} />
              <span>Swayam Unified Search Platform</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {query ? (
                <>
                  Search Results for &ldquo;
                  <span className="text-[#4A7B5B]">{query}</span>&rdquo;
                </>
              ) : (
                "Search Across Swayam Admission"
              )}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1.5 sm:mt-2 max-w-xl mx-auto">
              {isLoading
                ? "Searching live database in real-time..."
                : query
                ? `Found ${totalResults} verified matching entries across all academic categories`
                : "Explore verified colleges, official courses, study notes, admission guides and exams"}
            </p>
          </div>

          {/* 1. LIQUID GLASS SEARCH BAR */}
          <div className="max-w-3xl mx-auto w-full relative z-30">
            <LiquidGlassSearchBar
              initialValue={query}
              placeholder="Search by college, degree, exam, notes, scholarship or city..."
              onSearchSubmit={(newQuery) => {
                const params = new URLSearchParams(searchParams);
                if (newQuery) {
                  params.set("q", newQuery);
                } else {
                  params.delete("q");
                }
                setSearchParams(params);
              }}
            />
          </div>

          {/* 2. CATEGORY TABS / CHIPS — DIRECTLY BELOW SEARCH BAR */}
          <div className="mt-4 sm:mt-5 max-w-4xl mx-auto w-full relative z-20">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-1 no-scrollbar scroll-smooth">
              {filters.map((f) => {
                const isActive = activeFilter === f.key;
                const Icon = f.icon;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => handleFilterChange(f.key)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                      isActive
                        ? "bg-[#4A7B5B] text-white shadow-sm ring-2 ring-[#4A7B5B]/20"
                        : "bg-white text-gray-700 hover:text-[#4A7B5B] hover:bg-white/95 border border-gray-200/90 shadow-2xs"
                    }`}
                  >
                    <Icon size={14} className={isActive ? "text-white" : "text-[#4A7B5B]"} />
                    <span>{f.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* 3. RESULT COUNT & FILTER ROW */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-200/80">
          <div className="flex items-center gap-2 flex-wrap text-sm text-gray-600">
            <span className="font-semibold text-gray-900">
              {isLoading ? (
                "Searching live database in real-time..."
              ) : (
                <>
                  Showing <span className="font-bold text-[#4A7B5B]">{currentCategoryCount}</span>{" "}
                  {activeFilter === "ALL"
                    ? "total results"
                    : `${filters.find((f) => f.key === activeFilter)?.label || activeFilter} results`}
                  {query ? (
                    <>
                      {" "}for &ldquo;<span className="font-bold text-gray-900">{query}</span>&rdquo;
                    </>
                  ) : ""}
                </>
              )}
            </span>
            {!isLoading && totalResults > 0 && activeFilter !== "ALL" && (
              <span className="text-xs text-gray-400">
                (filtered from {totalResults} total verified entries)
              </span>
            )}
          </div>

          {/* Active Filter Indicator & Reset */}
          <div className="flex items-center gap-2 shrink-0">
            {activeFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => handleFilterChange("ALL")}
                className="text-xs font-semibold text-[#4A7B5B] hover:text-[#3d6b4d] flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition-colors"
              >
                <span>Clear Category Filter</span>
                <X size={12} />
              </button>
            )}
            <span className="text-xs text-gray-400 bg-white border border-gray-200 px-2.5 py-1 rounded-lg font-medium shadow-2xs">
              Live Verified Database
            </span>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-[#4A7B5B]/20 border-t-[#4A7B5B] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium text-sm">Searching live database...</p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && totalResults === 0 && query && (
          <div className="py-16 text-center max-w-md mx-auto bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
            <Search size={40} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">No Results Found</h3>
            <p className="text-sm text-gray-500 mb-6">
              We couldn&apos;t find anything matching &ldquo;{query}&rdquo;. Try checking the spelling or browse our popular categories below.
            </p>
            <div className="grid grid-cols-2 gap-2 text-left">
              <Link
                to="/colleges"
                className="p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#4A7B5B] flex items-center justify-between transition-colors"
              >
                <span>Browse Colleges</span>
                <ChevronRight size={14} />
              </Link>
              <Link
                to="/courses"
                className="p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#4A7B5B] flex items-center justify-between transition-colors"
              >
                <span>Explore Courses</span>
                <ChevronRight size={14} />
              </Link>
              <Link
                to="/study-materials"
                className="p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#4A7B5B] flex items-center justify-between transition-colors"
              >
                <span>Study Materials</span>
                <ChevronRight size={14} />
              </Link>
              <Link
                to="/blogs"
                className="p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#4A7B5B] flex items-center justify-between transition-colors"
              >
                <span>Admission Guides</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* CATEGORY EMPTY STATE */}
        {!isLoading && totalResults > 0 && activeFilter !== "ALL" && currentCategoryCount === 0 && (
          <div className="py-14 text-center max-w-md mx-auto bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
            <Search size={36} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-base font-bold text-gray-800 mb-1">
              No {filters.find((f) => f.key === activeFilter)?.label} Found
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              We couldn&apos;t find any {filters.find((f) => f.key === activeFilter)?.label.toLowerCase()} matching &ldquo;{query}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => handleFilterChange("ALL")}
              className="px-4 py-2 bg-[#4A7B5B] text-white text-xs font-semibold rounded-xl hover:bg-[#3d6b4d] transition-colors"
            >
              View All {totalResults} Results
            </button>
          </div>
        )}

        {/* NO QUERY STATE */}
        {!isLoading && !query && (
          <div className="py-12 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-gray-200 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-[#4A7B5B] rounded-2xl flex items-center justify-center mx-auto">
              <Search size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Explore Swayam Admission</h3>
              <p className="text-xs text-gray-500 mt-1">
                Type in the search bar above to instantly find colleges, courses, study notes, scholarships, and exam guides.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-left pt-2">
              <Link to="/colleges" className="p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#4A7B5B] flex items-center justify-between transition-colors">
                <span>Browse Colleges</span>
                <ChevronRight size={14} />
              </Link>
              <Link to="/courses" className="p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#4A7B5B] flex items-center justify-between transition-colors">
                <span>Explore Courses</span>
                <ChevronRight size={14} />
              </Link>
              <Link to="/study-materials" className="p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#4A7B5B] flex items-center justify-between transition-colors">
                <span>Study Materials</span>
                <ChevronRight size={14} />
              </Link>
              <Link to="/scholarships" className="p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#4A7B5B] flex items-center justify-between transition-colors">
                <span>Scholarships</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* RESULTS SECTIONS */}
        {!isLoading && totalResults > 0 && (
          <div className="space-y-10">
            {/* 1. COLLEGES */}
            {(activeFilter === "ALL" || activeFilter === "COLLEGES") && colleges.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="text-[#4A7B5B]" size={20} />
                    <h2 className="text-lg font-bold text-gray-900">Colleges ({colleges.length})</h2>
                  </div>
                  <Link
                    to={`/colleges?q=${encodeURIComponent(query)}`}
                    className="text-xs font-semibold text-[#4A7B5B] hover:underline flex items-center gap-1"
                  >
                    <span>View all colleges</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {colleges.map((c: any) => (
                    <Link
                      key={c.id}
                      to={`/colleges/${c.slug || c.id}`}
                      className="bg-white p-4 rounded-2xl border border-gray-200 hover:border-[#4A7B5B]/50 hover:shadow-lg transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[11px] font-semibold text-[#4A7B5B]">
                            {c.ownership || "College"}
                          </span>
                          {c.nirfRanking && (
                            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                              NIRF #{c.nirfRanking}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-3 mb-2">
                          {c.logo ? (
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-2xs p-1 shrink-0 flex items-center justify-center overflow-hidden">
                              <img src={c.logo} alt={`${c.name} logo`} className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] text-[#4A7B5B] font-bold text-xs shrink-0 flex items-center justify-center">
                              {c.name ? c.name.charAt(0) : "C"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-[#4A7B5B] transition-colors line-clamp-2">
                              {c.name}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                              <MapPin size={13} className="shrink-0 text-gray-400" />
                              <span className="truncate">
                                {c.city ? `${c.city}, ` : ""}
                                {c.state || "India"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-[#4A7B5B]">
                        <span>Explore College Profile</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 2. COURSES */}
            {(activeFilter === "ALL" || activeFilter === "COURSES") && courses.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="text-emerald-700" size={20} />
                    <h2 className="text-lg font-bold text-gray-900">Academic Courses ({courses.length})</h2>
                  </div>
                  <Link
                    to={`/courses?q=${encodeURIComponent(query)}`}
                    className="text-xs font-semibold text-[#4A7B5B] hover:underline flex items-center gap-1"
                  >
                    <span>View all courses</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map((co: any) => (
                    <Link
                      key={co.id}
                      to={`/courses?q=${encodeURIComponent(co.name)}`}
                      className="bg-white p-4 rounded-2xl border border-gray-200 hover:border-emerald-500/50 hover:shadow-lg transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[11px] font-semibold text-emerald-800">
                            {co.category || "Course"}
                          </span>
                          {co.level && (
                            <span className="text-[11px] font-medium text-gray-500">
                              {co.level}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors line-clamp-2">
                          {co.name}
                        </h3>
                        {co.college?.name && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                            Offered by {co.college.name}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
                        <span>Check Fees & Eligibility</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 3. STUDY MATERIALS */}
            {(activeFilter === "ALL" || activeFilter === "MATERIALS") && studyMaterials.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="text-blue-600" size={20} />
                    <h2 className="text-lg font-bold text-gray-900">Study Materials ({studyMaterials.length})</h2>
                  </div>
                  <Link
                    to={`/study-materials?q=${encodeURIComponent(query)}`}
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>View all materials</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studyMaterials.map((sm: any) => (
                    <Link
                      key={sm.id}
                      to={`/study-materials?q=${encodeURIComponent(sm.title)}`}
                      className="bg-white p-4 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[11px] font-semibold text-blue-700">
                            {sm.materialType || "Notes"}
                          </span>
                          <span className={`text-xs font-bold ${sm.premium ? "text-amber-700" : "text-emerald-600"}`}>
                            {sm.premium ? `₹${sm.price || 0}` : "FREE"}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-blue-600 transition-colors line-clamp-2">
                          {sm.title}
                        </h3>
                        <div className="text-xs text-gray-500 mt-1">
                          {sm.subject || sm.category || "General Studies"}
                          {sm.pages ? ` · ${sm.pages} pages` : ""}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                        <span className="flex items-center gap-1">
                          <Download size={13} /> {sm.downloadCount || 0} Downloads
                        </span>
                        <span>Access Material</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 4. GUIDES */}
            {(activeFilter === "ALL" || activeFilter === "GUIDES") && guides.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Compass className="text-amber-600" size={20} />
                    <h2 className="text-lg font-bold text-gray-900">Career & Admission Guides ({guides.length})</h2>
                  </div>
                  <Link
                    to="/blogs"
                    className="text-xs font-semibold text-amber-700 hover:underline flex items-center gap-1"
                  >
                    <span>View all guides</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {guides.map((g: any) => (
                    <Link
                      key={g.id}
                      to={g.isCareer ? `/courses?category=${encodeURIComponent(g.meta?.stream || "")}` : `/blog/${g.slug || g.id}`}
                      className="bg-white p-4 rounded-2xl border border-gray-200 hover:border-amber-400 hover:shadow-lg transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-[11px] font-semibold text-amber-800">
                            {g.category || "Guide"}
                          </span>
                          {g.readingTime && (
                            <span className="text-[11px] text-gray-400">
                              {g.readingTime} min read
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-amber-700 transition-colors line-clamp-2">
                          {g.title}
                        </h3>
                        {g.career && (
                          <div className="text-xs text-gray-500 mt-1">
                            Career Pathway: {g.career}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-amber-700">
                        <span>Read Full Guide</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 5. EXAMS */}
            {(activeFilter === "ALL" || activeFilter === "EXAMS") && exams.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="text-purple-600" size={20} />
                    <h2 className="text-lg font-bold text-gray-900">Entrance Exams ({exams.length})</h2>
                  </div>
                  <Link
                    to="/exams"
                    className="text-xs font-semibold text-purple-700 hover:underline flex items-center gap-1"
                  >
                    <span>View all exams</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exams.map((e: any) => (
                    <Link
                      key={e.id}
                      to={`/exams/${e.slug || e.id}`}
                      className="bg-white p-4 rounded-2xl border border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[11px] font-semibold text-purple-700">
                            {e.category || "Exam"}
                          </span>
                          {e.examMode && (
                            <span className="text-[11px] text-gray-500">
                              {e.examMode}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-purple-700 transition-colors line-clamp-2">
                          {e.examName}
                        </h3>
                        {e.level && (
                          <div className="text-xs text-gray-500 mt-1">Level: {e.level}</div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-purple-700">
                        <span>Check Exam Dates & Syllabus</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 6. SCHOLARSHIPS */}
            {(activeFilter === "ALL" || activeFilter === "SCHOLARSHIPS") && scholarships.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="text-teal-600" size={20} />
                    <h2 className="text-lg font-bold text-gray-900">Scholarships ({scholarships.length})</h2>
                  </div>
                  <Link
                    to="/scholarships"
                    className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
                  >
                    <span>View all scholarships</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scholarships.map((s: any) => (
                    <Link
                      key={s.id}
                      to={`/scholarships/${s.slug || s.id}`}
                      className="bg-white p-4 rounded-2xl border border-gray-200 hover:border-teal-400 hover:shadow-lg transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-[11px] font-semibold text-teal-700">
                            {s.category || "Scholarship"}
                          </span>
                          {s.amount && (
                            <span className="text-xs font-bold text-emerald-700">
                              Up to ₹{s.amount}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-teal-700 transition-colors line-clamp-2">
                          {s.scholarshipName}
                        </h3>
                        {s.provider && (
                          <div className="text-xs text-gray-500 mt-1">Provider: {s.provider}</div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-teal-700">
                        <span>Check Eligibility & Apply</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 7. STREAMS */}
            {(activeFilter === "ALL" || activeFilter === "STREAMS") && streams.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="text-indigo-600" size={20} />
                    <h2 className="text-lg font-bold text-gray-900">Academic Streams ({streams.length})</h2>
                  </div>
                  <Link
                    to="/courses"
                    className="text-xs font-semibold text-indigo-700 hover:underline flex items-center gap-1"
                  >
                    <span>Browse all courses by stream</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {streams.map((st: any) => (
                    <Link
                      key={st.id}
                      to={st.url || `/courses?category=${encodeURIComponent(st.name || st.title)}`}
                      className="bg-white p-4 rounded-2xl border border-gray-200 hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-2 text-indigo-600">
                          <Layers size={14} />
                          <span className="text-[11px] font-semibold uppercase">Stream</span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base group-hover:text-indigo-600 transition-colors">
                          {st.name || st.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Explore degree courses & accredited colleges
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                        <span>View Stream Programs</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 8. BLOGS */}
            {(activeFilter === "ALL" || activeFilter === "BLOGS") && blogs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Newspaper className="text-rose-600" size={20} />
                    <h2 className="text-lg font-bold text-gray-900">Articles & Editorial ({blogs.length})</h2>
                  </div>
                  <Link
                    to="/blogs"
                    className="text-xs font-semibold text-rose-700 hover:underline flex items-center gap-1"
                  >
                    <span>View all blogs</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {blogs.map((b: any) => (
                    <Link
                      key={b.id}
                      to={`/blog/${b.slug || b.id}`}
                      className="bg-white p-4 rounded-2xl border border-gray-200 hover:border-rose-400 hover:shadow-lg transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-[11px] font-semibold text-rose-700">
                            {b.category || "Blog"}
                          </span>
                          {b.readingTime && (
                            <span className="text-[11px] text-gray-400">
                              {b.readingTime} min read
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-rose-600 transition-colors line-clamp-2">
                          {b.title}
                        </h3>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-rose-600">
                        <span>Read Article</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 9. RESEARCH REPORTS */}
            {(activeFilter === "ALL" || activeFilter === "REPORTS") && reports.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-[#4A7B5B]" size={20} />
                    <h2 className="text-lg font-bold text-gray-900">Empirical Research Reports ({reports.length})</h2>
                  </div>
                  <Link
                    to="/rankings"
                    className="text-xs font-semibold text-[#4A7B5B] hover:underline flex items-center gap-1"
                  >
                    <span>View Ranking & Research Portal</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reports.map((r: any) => (
                    <Link
                      key={r.id}
                      to={r.url || `/rankings?year=${r.year || 2026}`}
                      className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-[#4A7B5B]/50 hover:shadow-lg transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#E8F3EC] text-[#4A7B5B] text-xs font-bold flex items-center gap-1">
                            <ShieldCheck size={13} /> Official Publication {r.year || 2026}
                          </span>
                          {r.status && (
                            <span className="text-[11px] font-semibold text-gray-500 uppercase">
                              {r.status}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg group-hover:text-[#4A7B5B] transition-colors">
                          {r.title}
                        </h3>
                        {r.summary && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-3 leading-relaxed">
                            {r.summary}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-[#4A7B5B]">
                        <span>Read National Empirical Research Report</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
