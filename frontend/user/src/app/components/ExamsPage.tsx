import React, { useState } from "react";
import { Link } from "react-router";
import {
  Search, Calendar, Clock, Users, ArrowRight, FileText,
  Cpu, TrendingUp, Stethoscope, Scale, GraduationCap, BookOpen,
  Star, Bell, ChevronRight, Filter
} from "lucide-react";

export interface Exam {
  slug: string;
  name: string;
  fullName: string;
  category: string;
  conducting: string;
  mode: string;
  frequency: string;
  nextDate: string;
  registrationEnd: string;
  totalApplicants: string;
  difficulty: "Easy" | "Moderate" | "Hard";
  color: string;
  bg: string;
  icon: React.ElementType;
  badge?: string;
  description: string;
  eligibility: string;
  topColleges: string[];
}

import { useQuery } from "@tanstack/react-query";
import { examsApi, ExamQueryParams } from "../../api/exams.api";
import { useDebounce } from "../../hooks/useDebounce";

// Kept one dummy exam to use as default values if needed, or to reference icons/colors based on category
const getDefaultExamData = (category: string) => {
  let icon = FileText;
  let color = "#3B82F6";
  let bg = "#EFF6FF";

  switch (category?.toLowerCase()) {
    case "engineering": icon = Cpu; color = "#3B82F6"; bg = "#EFF6FF"; break;
    case "medical": icon = Stethoscope; color = "#EF4444"; bg = "#FEF2F2"; break;
    case "mba": icon = TrendingUp; color = "#F59E0B"; bg = "#FFFBEB"; break;
    case "law": icon = Scale; color = "#6366F1"; bg = "#EEF2FF"; break;
    case "central-university": icon = GraduationCap; color = "#8B5CF6"; bg = "#F5F3FF"; break;
    case "architecture": icon = BookOpen; color = "#14B8A6"; bg = "#F0FDFA"; break;
  }

  return { icon, color, bg };
};

const CATEGORIES = [
  { id: "all", label: "All Exams" },
  { id: "engineering", label: "Engineering" },
  { id: "mba", label: "MBA / Management" },
  { id: "medical", label: "Medical" },
  { id: "law", label: "Law" },
  { id: "central-university", label: "Central University" },
  { id: "architecture", label: "Architecture" },
];

// UPCOMING removed for now, or could fetch specifically if needed

export default function ExamsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const debouncedSearch = useDebounce(search, 500);

  const queryParams: ExamQueryParams = {};
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (activeCategory !== "all") queryParams.category = activeCategory.toUpperCase();

  const { data: examsRes, isLoading } = useQuery({
    queryKey: ["exams", queryParams],
    queryFn: () => examsApi.findAll(queryParams),
  });

  const filtered = examsRes?.data?.data || [];
  
  const upcoming = filtered.filter(e => e.applicationEnd && new Date(e.applicationEnd) > new Date()).slice(0, 4);

  const difficultyColor = (d: string) =>
    d === "Easy" ? "#10B981" : d === "Moderate" ? "#F59E0B" : "#EF4444";

  return (
    <div style={{ backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <nav className="flex items-center gap-2 mb-4" style={{ fontSize: "12px", color: "#94a3b8" }}>
            <Link to="/" className="hover:text-[#4A7B5B] transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span style={{ color: "#0F172A", fontWeight: 600 }}>Exams</span>
          </nav>
          <div className="mb-2" style={{ fontSize: "12px", fontWeight: 600, color: "#4A7B5B" }}>Entrance Exams</div>
          <h1 className="mb-2" style={{ fontWeight: 800, color: "#0F172A", fontSize: "clamp(24px,4vw,36px)" }}>
            All Entrance Exams
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b" }}>
            Explore JEE, NEET, CAT, CUET and 50+ entrance exams — eligibility, dates, syllabus and top colleges
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Upcoming exams banner */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>Upcoming Registration Deadlines</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {upcoming.map(exam => {
              const { icon: Icon, color, bg } = getDefaultExamData(exam.category);
              return (
              <Link key={exam.slug} to={`/exams/${exam.slug}`}
                className="flex items-start gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-[#4A7B5B]/20 transition-all group">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                  <Icon size={16} style={{ color: color }} />
                </div>
                <div className="min-w-0">
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }} className="truncate">{exam.examName}</div>
                  <div className="flex items-center gap-1 mt-0.5" style={{ fontSize: "10px", color: "#EF4444" }}>
                    <Calendar size={9} />
                    <span className="truncate">Reg ends: {exam.applicationEnd ? new Date(exam.applicationEnd).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </Link>
            )})}
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 mb-5">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Search exams by name..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400" />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap shrink-0 transition-all ${activeCategory === cat.id ? "bg-[#4A7B5B] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-[#4A7B5B]/40 hover:text-[#4A7B5B]"}`}
              style={{ fontWeight: activeCategory === cat.id ? 600 : 400 }}>
              {cat.label}
            </button>
          ))}
        </div>

        <p className="mb-5" style={{ fontSize: "13px", color: "#94a3b8" }}>
          {isLoading ? "Loading exams..." : `${examsRes?.data?.total || 0} exams found`}
        </p>

        {/* Exam cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(exam => {
            const { icon: Icon, color, bg } = getDefaultExamData(exam.category);
            return (
            <Link key={exam.slug} to={`/exams/${exam.slug}`}
              className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all hover:-translate-y-0.5 flex flex-col">
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: bg }}>
                    <Icon size={22} style={{ color: color }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>{exam.examName}</h3>
                    <p style={{ fontSize: "11px", color: "#94a3b8" }}>{exam.conductedBy || "Varies"}</p>
                  </div>
                </div>
                {(exam as any).badge && (
                  <span className="px-2 py-1 rounded-xl text-white shrink-0 ml-2" style={{ fontSize: "10px", fontWeight: 700, backgroundColor: color }}>
                    {(exam as any).badge}
                  </span>
                )}
              </div>

              <p className="mb-4" style={{ fontSize: "12px", color: "#4B5563", lineHeight: 1.6 }}>{(exam as any).description || "Entrance examination."}</p>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: "Next Exam", value: exam.examDate ? new Date(exam.examDate).toLocaleDateString() : "TBA", Icon: Calendar },
                  { label: "Mode", value: exam.examMode || "TBA", Icon: FileText },
                  { label: "Applicants", value: (exam as any).totalApplicants || "N/A", Icon: Users },
                  { label: "Frequency", value: (exam as any).frequency || "N/A", Icon: Clock },
                ].map(({ label, value, Icon }) => (
                  <div key={label} className="bg-[#F8FAFC] rounded-xl p-2.5">
                    <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 600 }}>{label.toUpperCase()}</div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F172A" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Difficulty + eligibility */}
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-1 rounded-full text-white" style={{ fontSize: "10px", fontWeight: 600, backgroundColor: difficultyColor((exam as any).difficulty || "Moderate") }}>
                  {(exam as any).difficulty || "Moderate"}
                </span>
                <span style={{ fontSize: "11px", color: "#64748b" }}>{exam.eligibility || "Check official website"}</span>
              </div>

              {/* Reg deadline alert */}
              {exam.applicationEnd && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-xl mb-4">
                  <Bell size={12} className="text-red-400 shrink-0" />
                  <span style={{ fontSize: "11px", color: "#DC2626" }}>Reg. Deadline: <strong>{new Date(exam.applicationEnd).toLocaleDateString()}</strong></span>
                </div>
              )}

              {/* CTAs */}
              <div className="flex gap-2 mt-auto">
                <span className="flex-1 text-center py-2.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl group-hover:bg-[#4A7B5B] group-hover:text-white transition-colors" style={{ fontSize: "12px", fontWeight: 600 }}>
                  View Details
                </span>
                <Link to="/apply-now" onClick={e => e.stopPropagation()}
                  className="flex-1 text-center py-2.5 bg-[#4A7B5B] text-white rounded-xl hover:bg-[#3d6b4d] transition-colors" style={{ fontSize: "12px", fontWeight: 600 }}>
                  Apply Now
                </Link>
              </div>
            </Link>
          )})}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20">
            <FileText size={44} className="text-gray-300 mx-auto mb-3" />
            <p style={{ fontSize: "16px", color: "#94a3b8" }}>No exams found. Try adjusting your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
