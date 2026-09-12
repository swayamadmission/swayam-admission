import React, { useState } from "react";
import { Link } from "react-router";
import { Search, Filter, Clock, IndianRupee, BookOpen, Cpu, TrendingUp, Scale, Stethoscope, Hotel, Wrench, ArrowRight, Star } from "lucide-react";

const CATEGORIES = [
  { id:"all", label:"All Courses", icon:BookOpen },
  { id:"engineering", label:"Engineering", icon:Cpu },
  { id:"management", label:"Management", icon:TrendingUp },
  { id:"law", label:"Law", icon:Scale },
  { id:"medical", label:"Medical", icon:Stethoscope },
  { id:"hospitality", label:"Hospitality", icon:Hotel },
  { id:"polytechnic", label:"Polytechnic", icon:Wrench },
];

import { useQuery } from "@tanstack/react-query";
import { coursesApi, CourseQueryParams } from "../../api/courses.api";
import { useDebounce } from "../../hooks/useDebounce";

const FEE_RANGES = ["All Fees","Under ₹1L","₹1L–₹3L","₹3L–₹5L","Above ₹5L"];
const DURATIONS = ["All Duration","1 Year","2 Years","3 Years","4+ Years"];

export default function CoursesPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [feeRange, setFeeRange] = useState("All Fees");
  const [duration, setDuration] = useState("All Duration");

  const debouncedSearch = useDebounce(search, 500);

  const queryParams: CourseQueryParams = {};
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (activeCategory !== "all") queryParams.category = activeCategory.toUpperCase();
  if (feeRange !== "All Fees") queryParams.feeRange = feeRange;
  if (duration !== "All Duration") queryParams.duration = duration;

  const { data: coursesRes, isLoading } = useQuery({
    queryKey: ["courses", queryParams],
    queryFn: () => coursesApi.findAll(queryParams),
  });

  const filtered = coursesRes?.data || [];

  return (
    <div style={{ backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="mb-2" style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}}>Explore</div>
          <h1 className="mb-2" style={{fontWeight:800,color:"#0F172A",fontSize:"clamp(24px,4vw,36px)"}}>All Courses</h1>
          <p style={{fontSize:"14px",color:"#64748b"}}>Discover 100+ courses across engineering, management, medical, law and more</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <Search size={16} className="text-gray-400 shrink-0"/>
            <input type="text" placeholder="Search courses..." value={search} onChange={e=>setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"/>
          </div>
          <select value={feeRange} onChange={e=>setFeeRange(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-[#4A7B5B]">
            {FEE_RANGES.map(f=><option key={f}>{f}</option>)}
          </select>
          <select value={duration} onChange={e=>setDuration(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-[#4A7B5B]">
            {DURATIONS.map(d=><option key={d}>{d}</option>)}
          </select>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-7 no-scrollbar">
          {CATEGORIES.map(cat=>(
            <button key={cat.id} onClick={()=>setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all shrink-0 ${activeCategory===cat.id?"bg-[#4A7B5B] text-white shadow-sm":"bg-white border border-gray-200 text-gray-600 hover:border-[#4A7B5B] hover:text-[#4A7B5B]"}`}
              style={{fontWeight:activeCategory===cat.id?600:400}}>
              <cat.icon size={14}/>{cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="mb-5" style={{fontSize:"13px",color:"#94a3b8"}}>
          {isLoading ? "Loading courses..." : `${coursesRes?.total || 0} courses found`}
        </p>

        {/* Course cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(course=>(
            <div key={course.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{backgroundColor:(course.color || "#4A7B5B")+"15"}}>
                  <BookOpen size={20} style={{color:course.color || "#4A7B5B"}}/>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {course.badge && (
                    <span className="px-2 py-0.5 rounded-full text-white" style={{fontSize:"10px",fontWeight:600,backgroundColor:course.color || "#4A7B5B"}}>
                      {course.badge}
                    </span>
                  )}
                  {!!course._count?.branches && course._count.branches > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[#2D5A3D] bg-[#E8F3EC] border border-[#C2DEC9]" style={{fontSize:"10px",fontWeight:600}}>
                      {course._count.branches} Specializations
                    </span>
                  )}
                </div>
              </div>
              <h3 className="mb-1" style={{fontSize:"15px",fontWeight:700,color:"#0F172A"}}>{course.name}</h3>
              <div className="flex items-center gap-1 mb-3">
                <Star size={11} className="fill-[#F0AE1A] text-[#F0AE1A]"/>
                <span style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}}>{course.rating || "4.8"}</span>
                <span style={{fontSize:"11px",color:"#94a3b8"}}>· {course.students || "500+"} students</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  {label:"Duration",value:course.duration ? `${course.duration} ${course.durationType?.toLowerCase() || 'years'}` : "Varies",Icon:Clock},
                  {label:"Annual Fees",value:course.totalFees ? `₹${course.totalFees.toLocaleString('en-IN')}` : "Varies",Icon:IndianRupee},
                ].map(({label,value})=>(
                  <div key={label} className="bg-[#F8FAFC] rounded-xl p-2.5">
                    <div style={{fontSize:"10px",color:"#94a3b8"}}>{label}</div>
                    <div style={{fontSize:"12px",fontWeight:600,color:"#0F172A"}}>{value || "Varies"}</div>
                  </div>
                ))}
              </div>

              <div className="mb-3">
                <div style={{fontSize:"10px",fontWeight:600,color:"#94a3b8"}} className="mb-1">ELIGIBILITY</div>
                <p style={{fontSize:"12px",color:"#4B5563"}}>{course.eligibility || "10+2 / Equivalent"}</p>
              </div>
              <div className="mb-4 flex-1">
                <div style={{fontSize:"10px",fontWeight:600,color:"#94a3b8"}} className="mb-1">CAREER OPPORTUNITIES</div>
                <p style={{fontSize:"12px",color:"#4B5563"}}>{course.careerScope || course.careerOpportunities || "Industry Career Paths Available"}</p>
              </div>
              <div className="flex gap-2 mt-auto">
                <Link to="/colleges" className="flex-1 text-center py-2.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl hover:bg-[#4A7B5B] hover:text-white transition-colors" style={{fontSize:"12px",fontWeight:600}}>
                  Find Colleges
                </Link>
                <Link to="/apply-now" className="flex-1 text-center py-2.5 bg-[#4A7B5B] text-white rounded-xl hover:bg-[#3d6b4d] transition-colors" style={{fontSize:"12px",fontWeight:600}}>
                  Apply Now
                </Link>
              </div>
            </div>
          ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20">
            <BookOpen size={40} className="text-gray-300 mx-auto mb-3"/>
            <p style={{fontSize:"16px",color:"#94a3b8"}}>No courses found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
