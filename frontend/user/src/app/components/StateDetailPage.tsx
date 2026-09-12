import React, { useState } from "react";
import { Link, useParams } from "react-router";
import {
  ChevronRight, MapPin, GraduationCap, Users, Award, ArrowRight,
  Building2, Search, Star, Phone, Bot, Filter
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ALL_STATES } from "./StatesPage";

const STATE_COLLEGES: Record<string, any[]> = {
  "uttar-pradesh": [
    { name: "Amity University Noida", city: "Noida", fees: "₹2.5L–₹4.5L/yr", rating: 4.3, type: "Private", courses: ["B.Tech","MBA","Law"], img: "https://images.unsplash.com/photo-1759562588736-186cce2c26b5?w=300&q=80" },
    { name: "Sharda University", city: "Greater Noida", fees: "₹2.0L–₹3.8L/yr", rating: 4.2, type: "Private", courses: ["MBA","Law","MCA"], img: "https://images.unsplash.com/photo-1770967004881-5e8795cb5fde?w=300&q=80" },
    { name: "Galgotias University", city: "Greater Noida", fees: "₹1.4L–₹2.6L/yr", rating: 4.1, type: "Private", courses: ["B.Tech","BCA","MBA"], img: "https://images.unsplash.com/photo-1663845444742-17a059b56b3a?w=300&q=80" },
    { name: "AKTU (Dr. APJ Abdul Kalam)", city: "Lucknow", fees: "₹60K–₹1.5L/yr", rating: 4.4, type: "Government", courses: ["B.Tech","MBA","MCA","Polytechnic"], img: "https://images.unsplash.com/photo-1592542306951-17d42a2d0d1b?w=300&q=80" },
  ],
  "bihar": [
    { name: "Patna University", city: "Patna", fees: "₹20K–₹60K/yr", rating: 4.0, type: "Government", courses: ["B.Sc","B.A.","B.Com","LLB"], img: "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=300&q=80" },
    { name: "NIT Patna", city: "Patna", fees: "₹1.2L–₹1.5L/yr", rating: 4.5, type: "Government", courses: ["B.Tech","M.Tech","MCA"], img: "https://images.unsplash.com/photo-1777654770487-b49bb24f61ec?w=300&q=80" },
    { name: "Chanakya National Law University", city: "Patna", fees: "₹80K–₹1L/yr", rating: 4.2, type: "Government", courses: ["LLB","LLM"], img: "https://images.unsplash.com/photo-1758292109543-a5c7f0c4cb9b?w=300&q=80" },
  ],
  "delhi-ncr": [
    { name: "Delhi Technological University", city: "Delhi", fees: "₹1.2L–₹2.4L/yr", rating: 4.5, type: "Government", courses: ["B.Tech","MBA","MCA"], img: "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=300&q=80" },
    { name: "Amity University (Delhi)", city: "Noida", fees: "₹2.5L–₹4.5L/yr", rating: 4.3, type: "Private", courses: ["B.Tech","BBA","Law"], img: "https://images.unsplash.com/photo-1759562588736-186cce2c26b5?w=300&q=80" },
    { name: "Manav Rachna University", city: "Faridabad", fees: "₹1.2L–₹2.5L/yr", rating: 4.0, type: "Private", courses: ["B.Tech","BBA","MBA"], img: "https://images.unsplash.com/photo-1680084521631-e4e6d77704d8?w=300&q=80" },
  ],
  "punjab": [
    { name: "Chandigarh University", city: "Chandigarh", fees: "₹1.8L–₹3.2L/yr", rating: 4.6, type: "Private", courses: ["B.Tech","MBA","BCA","Nursing"], img: "https://images.unsplash.com/photo-1777654770487-b49bb24f61ec?w=300&q=80" },
    { name: "Lovely Professional University", city: "Phagwara", fees: "₹1.5L–₹2.8L/yr", rating: 4.4, type: "Private", courses: ["B.Tech","Nursing","BBA"], img: "https://images.unsplash.com/photo-1758292109543-a5c7f0c4cb9b?w=300&q=80" },
    { name: "Panjab University", city: "Chandigarh", fees: "₹30K–₹90K/yr", rating: 4.2, type: "Government", courses: ["B.Tech","MBA","Law","BCA"], img: "https://images.unsplash.com/photo-1592542306951-17d42a2d0d1b?w=300&q=80" },
  ],
};

const DEFAULT_COLLEGES = [
  { name: "State Engineering College", city: "Main City", fees: "₹80K–₹1.5L/yr", rating: 4.1, type: "Government", courses: ["B.Tech","BCA","MBA"], img: "https://images.unsplash.com/photo-1663845444742-17a059b56b3a?w=300&q=80" },
  { name: "Private University (State)", city: "Capital", fees: "₹1.5L–₹3L/yr", rating: 4.0, type: "Private", courses: ["B.Tech","MBA","BBA"], img: "https://images.unsplash.com/photo-1770967004881-5e8795cb5fde?w=300&q=80" },
];

const TABS = ["Overview", "Colleges", "Scholarships", "Cities", "Updates"];

export default function StateDetailPage() {
  const { slug } = useParams();
  const state = ALL_STATES.find(s => s.slug === slug) || ALL_STATES[0];
  const colleges = STATE_COLLEGES[slug!] || DEFAULT_COLLEGES;
  const [activeTab, setActiveTab] = useState("Overview");
  const [courseFilter, setCourseFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchCollege, setSearchCollege] = useState("");

  const filteredColleges = colleges.filter(c =>
    (typeFilter === "All" || c.type === typeFilter) &&
    (courseFilter === "All" || c.courses.some((x: string) => x.includes(courseFilter))) &&
    (searchCollege === "" || c.name.toLowerCase().includes(searchCollege.toLowerCase()))
  );

  const STATE_SCHOLARSHIPS = [
    { name: `${state.name} Post-Matric Scholarship`, amount: "₹15K–₹50K/yr", category: "SC/ST/OBC", deadline: "Dec 31, 2024", eligibility: "10+2 passed, state domicile" },
    { name: "National Scholarship Portal (NSP)", amount: "₹20K–₹75K/yr", category: "All categories", deadline: "Nov 30, 2024", eligibility: "Graduation students, income < ₹6L" },
    { name: "Central Sector Scholarship", amount: "₹12K–₹20K/yr", category: "Merit-based", deadline: "Dec 15, 2024", eligibility: "80%+ in 12th, income < ₹8L" },
    { name: `${state.name} Mukhyamantri Scholarship`, amount: "₹5K–₹25K/yr", category: "All", deadline: "Jan 15, 2025", eligibility: "State domicile, enrolled in state college" },
  ];

  const CITY_COLLEGES = state.popularCities.map((city, i) => ({
    city,
    count: Math.max(5, state.colleges / state.popularCities.length | 0) - i * 2,
    topCollege: colleges[i % colleges.length]?.name || "State College",
  }));

  return (
    <div style={{ backgroundColor: "#F8FAFC" }}>
      {/* Banner */}
      <div className="relative h-56 sm:h-64 overflow-hidden">
        <ImageWithFallback src={state.img} alt={state.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end px-4 sm:px-6 pb-6 max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 mb-3" style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={11} />
            <Link to="/states" className="hover:text-white transition-colors">States</Link>
            <ChevronRight size={11} />
            <span className="text-white">{state.name}</span>
          </nav>
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-4xl">{state.emoji}</span>
                <h1 className="text-white" style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800 }}>{state.name}</h1>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {[`${state.colleges} Colleges`, `${state.students} Students`, `${state.scholarships} Scholarships`].map(l => (
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
                { Icon: GraduationCap, label: "Total Colleges", value: state.colleges },
                { Icon: Building2, label: "Govt Colleges", value: state.govtColleges },
                { Icon: Users, label: "Private Colleges", value: state.privateColleges },
                { Icon: Award, label: "Scholarships", value: state.scholarships + "+" },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="w-8 h-8 bg-[#E8F3EC] rounded-xl flex items-center justify-center mb-2">
                    <Icon size={15} className="text-[#4A7B5B]" />
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A" }}>{value}</div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-5 no-scrollbar border-b border-gray-100">
              {TABS.map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-4 py-2.5 text-sm whitespace-nowrap shrink-0 transition-colors ${activeTab === t ? "text-[#4A7B5B] border-b-2 border-[#4A7B5B] -mb-px" : "text-gray-500 hover:text-gray-700"}`}
                  style={{ fontWeight: activeTab === t ? 600 : 400 }}>
                  {t}
                </button>
              ))}
            </div>

            {/* OVERVIEW */}
            {activeTab === "Overview" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-3" style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>About Education in {state.name}</h3>
                  <p style={{ fontSize: "14px", color: "#4B5563", lineHeight: 1.7 }}>{state.description}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-4" style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>Popular Courses in {state.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {["B.Tech", "MBA", "BCA", "MCA", "Nursing", "BBA", "Law", "Hotel Management", "Polytechnic", "B.Pharm"].map(c => (
                      <Link key={c} to={`/courses?q=${c}`}
                        className="px-3 py-1.5 bg-[#F8FAFC] border border-gray-100 rounded-xl hover:border-[#4A7B5B]/30 hover:bg-[#E8F3EC] transition-all"
                        style={{ fontSize: "12px", fontWeight: 500, color: "#374151" }}>
                        {c}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-3" style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>Major Cities</h3>
                  <div className="flex flex-wrap gap-2">
                    {state.popularCities.map(city => (
                      <div key={city} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F3EC] rounded-xl">
                        <MapPin size={11} className="text-[#4A7B5B]" />
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#4A7B5B" }}>{city}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* COLLEGES */}
            {activeTab === "Colleges" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                    <Search size={14} className="text-gray-400" />
                    <input type="text" placeholder="Search colleges..." value={searchCollege} onChange={e => setSearchCollege(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400" />
                  </div>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B]">
                    {["All", "Government", "Private"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {filteredColleges.map(c => (
                  <div key={c.name} className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex hover:shadow-sm transition-all">
                    <div className="w-24 sm:w-32 h-24 sm:h-32 shrink-0 overflow-hidden">
                      <ImageWithFallback src={c.img} alt={c.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>{c.name}</h3>
                          <div className="flex items-center gap-1 text-gray-400 mb-2">
                            <MapPin size={10} /><span style={{ fontSize: "11px" }}>{c.city}</span>
                            <span className="ml-1 px-1.5 py-0.5 rounded text-white" style={{ fontSize: "9px", fontWeight: 600, backgroundColor: c.type === "Government" ? "#4A7B5B" : "#3B82F6" }}>{c.type}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {c.courses.slice(0, 3).map((co: string) => (
                              <span key={co} className="px-1.5 py-0.5 bg-[#F8FAFC] border border-gray-100 text-gray-500 rounded" style={{ fontSize: "9px" }}>{co}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-0.5 justify-end mb-1">
                            <Star size={11} className="fill-[#F0AE1A] text-[#F0AE1A]" />
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>{c.rating}</span>
                          </div>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#4A7B5B" }}>{c.fees}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to="/colleges" className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors" style={{ fontSize: "11px" }}>View</Link>
                        <Link to="/apply-now" className="px-3 py-1.5 bg-[#4A7B5B] text-white rounded-lg hover:bg-[#3d6b4d] transition-colors" style={{ fontSize: "11px", fontWeight: 600 }}>Apply</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SCHOLARSHIPS */}
            {activeTab === "Scholarships" && (
              <div className="space-y-4">
                <div className="bg-[#E8F3EC] rounded-2xl p-4 border border-[#4A7B5B]/20 mb-2">
                  <p style={{ fontSize: "13px", color: "#4A7B5B", lineHeight: 1.6 }}>
                    🎓 <strong>{state.scholarships}+ scholarships</strong> are available for students domiciled in {state.name}. Check eligibility and apply before deadlines.
                  </p>
                </div>
                {STATE_SCHOLARSHIPS.map(sch => (
                  <div key={sch.name} className="bg-white rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>{sch.name}</h3>
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
                <Link to="/scholarships" className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#4A7B5B]/30 text-[#4A7B5B] rounded-2xl hover:bg-[#E8F3EC] transition-colors">
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>View All Scholarships</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* CITIES */}
            {activeTab === "Cities" && (
              <div className="grid sm:grid-cols-2 gap-4">
                {CITY_COLLEGES.map(c => (
                  <div key={c.city} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin size={16} className="text-[#4A7B5B]" />
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>{c.city}</h3>
                    </div>
                    <p style={{ fontSize: "13px", color: "#94a3b8" }}>{c.count}+ colleges</p>
                    <p style={{ fontSize: "12px", color: "#64748b" }} className="mt-1">Top: {c.topCollege}</p>
                    <Link to={`/colleges?city=${c.city}`} className="mt-3 flex items-center gap-1.5 text-[#4A7B5B]" style={{ fontSize: "12px", fontWeight: 600 }}>
                      Browse Colleges <ArrowRight size={12} />
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* UPDATES */}
            {activeTab === "Updates" && (
              <div className="space-y-3">
                {[
                  { title: `${state.name} B.Tech Counseling 2024 Dates Announced`, date: "May 20, 2024", type: "Admission Update" },
                  { title: `New Scholarship Scheme Launched for Students in ${state.name}`, date: "May 15, 2024", type: "Scholarship" },
                  { title: `${state.name} Post-Matric Scholarship Application Opens`, date: "May 10, 2024", type: "Scholarship" },
                  { title: `Top Engineering Colleges in ${state.name}: Rankings 2024`, date: "May 5, 2024", type: "Rankings" },
                ].map((update, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#4A7B5B] mt-2 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-full" style={{ fontSize: "9px", fontWeight: 600 }}>{update.type}</span>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>{update.date}</span>
                      </div>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{update.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-64 space-y-4 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-20">
              <h3 className="mb-4" style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>Get Admission in {state.name}</h3>
              <Link to="/apply-now" className="w-full flex items-center justify-center gap-2 py-3 bg-[#4A7B5B] text-white rounded-xl hover:bg-[#3d6b4d] transition-colors mb-3" style={{ fontWeight: 600, fontSize: "14px" }}>
                Apply Now Free <ArrowRight size={14} />
              </Link>
              <a href="tel:+919000000000" className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors mb-4" style={{ fontSize: "13px" }}>
                <Phone size={13} /> Free Counseling
              </a>
              <div className="space-y-2">
                {[
                  { label: "Total Colleges", value: state.colleges },
                  { label: "Govt Colleges", value: state.govtColleges },
                  { label: "Region", value: state.region },
                ].map(i => (
                  <div key={i.label} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>{i.label}</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>{i.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={16} className="text-[#F0AE1A]" />
                <span className="text-white" style={{ fontSize: "13px", fontWeight: 700 }}>AI Counselor</span>
              </div>
              <p className="text-white/80 mb-3" style={{ fontSize: "12px" }}>Find the best colleges in {state.name} for your profile</p>
              <Link to="/ai-counselor" className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-[#4A7B5B] rounded-xl" style={{ fontWeight: 600, fontSize: "13px" }}>
                Get Suggestions
              </Link>
            </div>

            {/* Other states */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }} className="mb-3">Explore Other States</h4>
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
