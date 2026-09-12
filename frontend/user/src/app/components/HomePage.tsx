import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  Search, ArrowRight, Star, MapPin, Building2, Users, Award, Bot, Phone,
  MessageCircle, Upload, FileText, ChevronDown, ChevronUp, CheckCircle2,
  GraduationCap, TrendingUp, Cpu, Scale, Stethoscope, Hotel, Wrench, BookOpen,
  Play, Sparkles, Clock, TrendingUp as TrendingIcon
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useAuth } from "./Navbar";
import { useAuth as useAuthContext } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { collegesApi } from "../../api/colleges.api";
import { recommendationApi } from "../../api/recommendation.api";
import { searchApi } from "../../api/search.api";
import { blogsApi } from "../../api/blogs.api";
import { faqsApi } from "../../api/faqs.api";
import { useDebounce } from "../../hooks/useDebounce";

const COURSES = [
  { icon: Cpu, label: "B.Tech", color: "#3B82F6", bg: "#EFF6FF" },
  { icon: TrendingUp, label: "MBA", color: "#8B5CF6", bg: "#F5F3FF" },
  { icon: BookOpen, label: "BCA", color: "#F59E0B", bg: "#FFFBEB" },
  { icon: Cpu, label: "MCA", color: "#06B6D4", bg: "#ECFEFF" },
  { icon: TrendingUp, label: "BBA", color: "#10B981", bg: "#ECFDF5" },
  { icon: Stethoscope, label: "Nursing", color: "#EF4444", bg: "#FEF2F2" },
  { icon: Wrench, label: "Polytechnic", color: "#F97316", bg: "#FFF7ED" },
  { icon: Scale, label: "Law", color: "#6366F1", bg: "#EEF2FF" },
  { icon: Hotel, label: "Hotel Mgmt", color: "#EC4899", bg: "#FDF2F8" },
];

const STATES = [
  { name: "Bihar", colleges: "120+ Colleges", emoji: "🏛️" },
  { name: "Uttar Pradesh", colleges: "200+ Colleges", emoji: "🕌" },
  { name: "Delhi NCR", colleges: "150+ Colleges", emoji: "🏙️" },
  { name: "Haryana", colleges: "80+ Colleges", emoji: "🌾" },
  { name: "Punjab", colleges: "90+ Colleges", emoji: "🌿" },
  { name: "Rajasthan", colleges: "100+ Colleges", emoji: "🏜️" },
];

const HOW_IT_WORKS = [
  { step:"01", title:"Fill Application", desc:"Share your details, course interest and budget preferences in 2 minutes.", color:"#4A7B5B" },
  { step:"02", title:"Get Counseling", desc:"AI + expert counselors analyze your profile and guide you personally.", color:"#F0AE1A" },
  { step:"03", title:"Select College", desc:"Browse verified college options shortlisted just for your profile.", color:"#3B82F6" },
  { step:"04", title:"Secure Admission", desc:"Complete documentation, pay fees and confirm your admission.", color:"#8B5CF6" },
];

const TESTIMONIALS = [
  { name:"Rahul Sharma", course:"B.Tech – DTU, Delhi", text:"Swayam Admission helped me find the perfect B.Tech college. The AI counselor suggested exactly what I needed based on my budget and marks!", rating:5, img:"https://images.unsplash.com/photo-1603764377193-75b991876878?w=120&q=80", state:"Bihar" },
  { name:"Priya Singh", course:"MBA – Amity, Noida", text:"I was so confused between colleges. The counselor call helped me decide in 30 minutes flat. What an amazing platform!", rating:5, img:"https://images.unsplash.com/photo-1769159522162-335b60c8146a?w=120&q=80", state:"UP" },
  { name:"Amit Kumar", course:"BCA – Chandigarh University", text:"Free counseling changed my life. Got scholarship guidance too! I highly recommend this to all students from Bihar and UP.", rating:5, img:"https://images.unsplash.com/photo-1758270703662-b7d58bf0a8a2?w=120&q=80", state:"Jharkhand" },
];

const FAQS = [
  { q:"Is Swayam Admission free to use?", a:"Yes! Our basic counseling and college search are completely free. We believe every student deserves guidance regardless of their background." },
  { q:"What courses and colleges are available?", a:"We have 500+ verified colleges across India offering B.Tech, MBA, BCA, MCA, BBA, Nursing, Law, Hotel Management, Polytechnic, and many more." },
  { q:"How does the AI counselor work?", a:"Our AI analyzes your marks, budget, location, and career goals to suggest the best-fit colleges and courses for you in real-time." },
  { q:"Can I get scholarship guidance?", a:"Absolutely! Our team guides you through central and state government scholarships, private scholarships, and college-specific fee waivers." },
  { q:"What states are covered?", a:"We cover Bihar, UP, Delhi NCR, Haryana, Punjab, Rajasthan, MP, Maharashtra, and more — with Pan India coverage expanding monthly." },
];

const STUDY_MATERIALS = [
  { icon: FileText, label:"JEE Main Papers", sub:"2019–2024 PDFs", color:"#3B82F6" },
  { icon: FileText, label:"NEET Question Bank", sub:"Topic-wise practice", color:"#EF4444" },
  { icon: FileText, label:"MBA Entrance Notes", sub:"CAT / MAT / CMAT", color:"#8B5CF6" },
  { icon: FileText, label:"Polytechnic Papers", sub:"State-wise PDFs", color:"#F59E0B" },
];

const BLOGS = [
  { title:"Top 10 Engineering Colleges in UP for 2024 Admission", category:"Engineering", date:"May 18, 2024", read:"5 min", img:"https://images.unsplash.com/photo-1770226698529-a9c8726949c6?w=300&q=80", color:"#3B82F6" },
  { title:"How to Get Scholarship for MBA in India: Complete Guide", category:"MBA", date:"May 15, 2024", read:"7 min", img:"https://images.unsplash.com/photo-1778664305516-8243da9c2098?w=300&q=80", color:"#8B5CF6" },
  { title:"Bihar State Scholarship 2024: Apply Before Deadline", category:"Scholarship", date:"May 12, 2024", read:"4 min", img:"https://images.unsplash.com/photo-1771190529606-41c36b101641?w=300&q=80", color:"#10B981" },
];

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  const { openAuth } = useAuth();
  const { isLoggedIn } = useAuthContext();
  const navigate = useNavigate();
  const debouncedSearch = useDebounce(search, 300);

  const { data: collegesRes, isLoading: isLoadingColleges } = useQuery({
    queryKey: ["featuredColleges"],
    queryFn: () => collegesApi.findAll({ limit: 6, featured: true }), 
  });
  
  const { data: recsRes } = useQuery({
    queryKey: ["homepageRecommendations"],
    queryFn: () => recommendationApi.getHomepage(),
    enabled: isLoggedIn,
  });

  const { data: suggestionsRes } = useQuery({
    queryKey: ["searchSuggestions", debouncedSearch],
    queryFn: () => searchApi.getSuggestions(debouncedSearch),
    enabled: debouncedSearch.length > 2,
  });

  const { data: trendingRes } = useQuery({
    queryKey: ["searchTrending"],
    queryFn: () => searchApi.getTrending(),
  });

  const { data: homeBlogsRes } = useQuery({
    queryKey: ["homeBlogs"],
    queryFn: () => blogsApi.findPublic({ limit: 3 }),
  });

  const { data: homeFaqsRes } = useQuery({
    queryKey: ["homeFaqs"],
    queryFn: () => faqsApi.findPublic({ limit: 5 }),
  });

  const handleSearchSubmit = () => {
    if (search.trim()) {
      setShowDropdown(false);
      navigate(`/colleges?q=${search}`);
    }
  };

  const colleges = collegesRes?.data?.data || [];
  const recommendedColleges = recsRes?.data?.recommendedColleges || [];
  const displayColleges = isLoggedIn && recommendedColleges.length > 0 ? recommendedColleges : colleges;
  const isPersonalized = isLoggedIn && recommendedColleges.length > 0;
  
  const suggestions = suggestionsRes?.data || [];
  const trending = trendingRes?.data || [];

  return (
    <div style={{ backgroundColor: "#F8FAFC" }}>

      {/* ── HERO ── */}
      <section className="bg-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background:"radial-gradient(ellipse 80% 50% at 50% -5%, rgba(74,123,91,0.08) 0%, transparent 70%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20">

          {/* Split Layout: Video Left | Content Right */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* LEFT SIDE - VIDEO SHOWCASE */}
            <div className="relative group order-2 lg:order-1 animate-[fadeIn_0.8s_ease-out]">
              {/* Video Card */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-transparent bg-gradient-to-br from-[#4A7B5B]/10 via-transparent to-[#F0AE1A]/10 p-1">
                <div className="relative rounded-[22px] overflow-hidden bg-white">
                  {/* Video Image */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=800&q=80"
                      alt="Swayam Admission Counseling"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Glassmorphism Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button className="w-20 h-20 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 group-hover:bg-[#4A7B5B] group-hover:text-white animate-[pulse_2s_ease-in-out_infinite]">
                        <Play size={32} className="fill-current ml-1" />
                      </button>
                    </div>

                    {/* Overlay Text */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-[#F0AE1A]" />
                        <span style={{fontSize:"11px",fontWeight:600,color:"white",textTransform:"uppercase",letterSpacing:"0.5px"}}>Watch Success Story</span>
                      </div>
                      <h3 className="text-white mb-1" style={{fontSize:"20px",fontWeight:800}}>Swayam Admission Counseling</h3>
                      <p className="text-white/90" style={{fontSize:"13px"}}>Helping Students Find Their Perfect Career Path</p>
                    </div>

                    {/* Floating Stats Badges */}
                    <div className="absolute top-4 right-4 space-y-2 animate-[fadeIn_1s_ease-out_0.5s_both]">
                      <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg border border-white/20 hover:scale-105 transition-transform">
                        <div style={{fontSize:"16px",fontWeight:800,color:"#4A7B5B"}}>50,000+</div>
                        <div style={{fontSize:"9px",color:"#64748b",fontWeight:600}}>Students Guided</div>
                      </div>
                      <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg border border-white/20 hover:scale-105 transition-transform">
                        <div style={{fontSize:"16px",fontWeight:800,color:"#4A7B5B"}}>500+</div>
                        <div style={{fontSize:"9px",color:"#64748b",fontWeight:600}}>Colleges</div>
                      </div>
                      <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg border border-white/20 hover:scale-105 transition-transform">
                        <div className="flex items-center gap-1">
                          <Bot size={14} className="text-[#4A7B5B]" />
                          <span style={{fontSize:"10px",fontWeight:700,color:"#4A7B5B"}}>AI-Powered</span>
                        </div>
                      </div>
                    </div>

                    {/* Floating Badge Top Left */}
                    <div className="absolute top-4 left-4 animate-[fadeIn_1s_ease-out_0.3s_both]">
                      <div className="bg-gradient-to-r from-[#4A7B5B] to-[#3d6b4d] text-white rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-[#F0AE1A] rounded-full animate-pulse" />
                        <span style={{fontSize:"10px",fontWeight:700}}>LIVE COUNSELING</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Floating Elements */}
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-[#4A7B5B]/10 rounded-full blur-2xl animate-[pulse_3s_ease-in-out_infinite]" />
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#F0AE1A]/10 rounded-full blur-2xl animate-[pulse_3s_ease-in-out_infinite_1s]" />
            </div>

            {/* RIGHT SIDE - EXISTING CONTENT */}
            <div className="order-1 lg:order-2 text-center lg:text-left animate-[fadeIn_0.8s_ease-out_0.2s_both] relative z-20">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#E8F3EC] rounded-full mb-6">
                <Bot size={13} className="text-[#4A7B5B]" />
                <span style={{ fontSize:"12px", fontWeight:600, color:"#4A7B5B" }}>AI-Powered Admission Guidance — Free for Students</span>
              </div>
              <h1 style={{ fontSize:"clamp(28px,5vw,52px)", fontWeight:800, lineHeight:1.15, color:"#0F172A" }} className="mb-5">
                Find Your Dream College{" "}
                <span style={{ color:"#4A7B5B" }}>with Smart AI</span>{" "}
                Guidance
              </h1>
              <p style={{ fontSize:"clamp(15px,2vw,18px)", color:"#64748b", lineHeight:1.7 }} className="max-w-xl lg:mx-0 mx-auto mb-8">
                500+ verified colleges · AI counseling · Scholarship guidance — all at zero cost for students across India.
              </p>
              
              {/* Search with Autocomplete */}
              <div className="relative max-w-xl lg:mx-0 mx-auto mb-7">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl shadow-lg p-2 hover:shadow-xl transition-shadow relative z-20">
                  <Search size={17} className="text-gray-400 ml-2 shrink-0" />
                  <input
                    type="text" placeholder="Search colleges, courses or cities..."
                    value={search} 
                    onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    onKeyDown={e => e.key === "Enter" && handleSearchSubmit()}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400 py-2"
                  />
                  <button onClick={handleSearchSubmit} className="px-4 py-2.5 bg-[#4A7B5B] text-white rounded-xl text-sm shrink-0 hover:bg-[#3d6b4d] transition-colors font-semibold">
                    Search
                  </button>
                </div>
                
                {/* Search Dropdown */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-30">
                    {search.length > 2 ? (
                      <div className="p-2">
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Suggestions</div>
                        {suggestions.length > 0 ? suggestions.map((s: any) => (
                          <Link key={s.id} to={`/colleges/${s.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg">
                            <Building2 size={16} className="text-gray-400" />
                            <div className="text-sm font-medium text-gray-700">{s.name}</div>
                            <div className="text-xs text-gray-400 ml-auto">{s.city}</div>
                          </Link>
                        )) : (
                          <div className="px-3 py-3 text-sm text-gray-500">No matches found.</div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2">
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <TrendingIcon size={12}/> Trending Searches
                        </div>
                        {trending.map((t: any, i: number) => (
                          <button key={i} onClick={() => { setSearch(t.query); setShowDropdown(false); navigate(`/colleges?q=${t.query}`); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-left">
                            <Search size={14} className="text-gray-300" />
                            <div className="text-sm font-medium text-gray-700">{t.query}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CTAs */}
              <div className="flex items-center lg:justify-start justify-center gap-3 flex-wrap mb-10 relative z-10">
                <Link to="/apply-now" className="flex items-center gap-2 px-7 py-3 bg-[#4A7B5B] text-white rounded-2xl shadow-md hover:bg-[#3d6b4d] transition-all hover:shadow-lg hover:scale-105" style={{fontWeight:600,fontSize:"15px"}}>
                  Apply Now <ArrowRight size={16}/>
                </Link>
                <button onClick={openAuth} className="flex items-center gap-2 px-7 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:border-[#4A7B5B] hover:text-[#4A7B5B] transition-all hover:scale-105" style={{fontSize:"15px"}}>
                  Free Counselling <Phone size={14}/>
                </button>
              </div>
              {/* Mini stats */}
              <div className="flex items-center lg:justify-start justify-center gap-10 flex-wrap relative z-10">
                {[{n:"50,000+",l:"Students Helped"},{n:"500+",l:"Verified Colleges"},{n:"95%",l:"Satisfaction Rate"}].map(s=>(
                  <div key={s.l} className="text-center lg:text-left">
                    <div style={{fontSize:"22px",fontWeight:800,color:"#0F172A"}}>{s.n}</div>
                    <div style={{fontSize:"11px",color:"#94a3b8"}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {Icon:Building2,label:"500+ Colleges",sub:"Across India"},
              {Icon:MapPin,label:"Pan India",sub:"All States Covered"},
              {Icon:Award,label:"Scholarship",sub:"Guidance & Support"},
              {Icon:Users,label:"Expert Counsellors",sub:"Available 24×7"},
            ].map(({Icon,label,sub})=>(
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-[#4A7B5B]"/>
                </div>
                <div>
                  <div style={{fontSize:"13px",fontWeight:700,color:"#0F172A"}}>{label}</div>
                  <div style={{fontSize:"11px",color:"#94a3b8"}}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI COUNSELOR BANNER ── */}
      <section className="py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 overflow-hidden relative">
            <div className="absolute right-0 top-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none"/>
            <div className="flex-1 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full mb-4">
                <div className="w-2 h-2 bg-[#F0AE1A] rounded-full animate-pulse"/>
                <span style={{fontSize:"11px",fontWeight:600,color:"white"}}>AI Active — Online Now</span>
              </div>
              <h2 className="text-white mb-3" style={{fontSize:"clamp(20px,3vw,30px)",fontWeight:800}}>Meet Swayam AI Counselor</h2>
              <p className="text-white/80 mb-6 max-w-md" style={{fontSize:"14px",lineHeight:1.7}}>
                Tell your marks, budget and career goals. Our AI will instantly recommend perfect colleges and courses — for free!
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Link to="/ai-counselor" className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#4A7B5B] rounded-xl hover:bg-gray-50 transition-colors" style={{fontWeight:700,fontSize:"14px"}}>
                  <Bot size={15}/> Start AI Chat
                </Link>
                <a href="https://wa.me/919000000000" className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-xl hover:bg-[#1ebe5d] transition-colors" style={{fontWeight:600,fontSize:"14px"}}>
                  <MessageCircle size={15}/> WhatsApp Us
                </a>
              </div>
            </div>
            {/* Chat preview */}
            <div className="w-full md:w-72 relative z-10 shrink-0">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4 space-y-3">
                {[
                  {side:"ai", msg:"Namaste! 👋 I'm your AI counselor. Share your marks and budget to get personalized recommendations."},
                  {side:"user", msg:"I got 75% in PCM. Budget is ₹2L/year"},
                  {side:"ai", msg:"Perfect! Found 12 B.Tech colleges in your budget. Top pick: DTU Delhi 🎓"},
                ].map((m,i)=>(
                  <div key={i} className={`flex items-end gap-2 ${m.side==="user"?"justify-end":""}`}>
                    {m.side==="ai"&&<div className="w-6 h-6 rounded-full bg-[#F0AE1A] flex items-center justify-center shrink-0"><Bot size={12} className="text-white"/></div>}
                    <div className={`rounded-2xl px-3 py-2 max-w-[85%] ${m.side==="ai"?"bg-white/20 rounded-tl-none text-white":"bg-white rounded-tr-none text-gray-700"}`} style={{fontSize:"12px",lineHeight:1.5}}>
                      {m.msg}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── POPULAR COURSES ── */}
      <section className="pb-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-7">
            <div>
              <div style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}} className="mb-1">Explore</div>
              <h2 style={{fontWeight:700,color:"#0F172A"}}>Popular Courses</h2>
            </div>
            <Link to="/courses" className="flex items-center gap-1 text-sm text-[#4A7B5B] hover:underline"><span>View All</span><ArrowRight size={13}/></Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {COURSES.map(({icon:Icon,label,color,bg})=>(
              <Link key={label} to={`/courses?q=${label}`} className="group flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-transparent transition-all">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{backgroundColor:bg}}>
                  <Icon size={20} style={{color}}/>
                </div>
                <span className="text-center leading-tight" style={{fontSize:"11px",fontWeight:600,color:"#374151"}}>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOP STATES ── */}
      <section className="pb-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-7">
            <div>
              <div style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}} className="mb-1">Browse by Location</div>
              <h2 style={{fontWeight:700,color:"#0F172A"}}>Top States</h2>
            </div>
            <Link to="/colleges" className="flex items-center gap-1 text-sm text-[#4A7B5B] hover:underline"><span>All States</span><ArrowRight size={13}/></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {STATES.map(s=>(
              <Link key={s.name} to={`/colleges?state=${s.name}`} className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-[#4A7B5B]/20 transition-all text-center group">
                <div className="text-3xl mb-1">{s.emoji}</div>
                <div style={{fontSize:"13px",fontWeight:700,color:"#0F172A"}}>{s.name}</div>
                <div style={{fontSize:"11px",color:"#94a3b8"}}>{s.colleges}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED/RECOMMENDED COLLEGES ── */}
      <section className="pb-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-7">
            <div>
              <div style={{fontSize:"12px",fontWeight:600,color:isPersonalized ? "#F0AE1A" : "#4A7B5B"}} className="mb-1">
                {isPersonalized ? "✨ Curated For You" : "Top Picks"}
              </div>
              <h2 style={{fontWeight:700,color:"#0F172A"}}>
                {isPersonalized ? "Recommended Colleges" : "Featured Colleges"}
              </h2>
            </div>
            <Link to="/colleges" className="flex items-center gap-1 text-sm text-[#4A7B5B] hover:underline"><span>View All</span><ArrowRight size={13}/></Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {isLoadingColleges ? (
              <div className="col-span-full text-center text-gray-500 py-10">Loading colleges...</div>
            ) : displayColleges.map((c: any) => (
              <Link key={c.id} to={`/colleges/${c.id}`} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 relative">
                <div className="h-44 overflow-hidden relative">
                  <ImageWithFallback src={c.img || "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=400&q=80"} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                  <div className="absolute top-3 left-3">
                    {c.matchScore && <span className="px-2 py-0.5 bg-[#F0AE1A] rounded-full text-white" style={{fontSize:"9px",fontWeight:800}}>{c.matchScore}% Match</span>}
                  </div>
                  <div className="absolute top-3 right-3 flex gap-1 flex-wrap justify-end">
                      <span className="px-2 py-0.5 bg-white/90 rounded-full text-gray-700" style={{fontSize:"9px",fontWeight:600}}>{c.type}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="group-hover:text-[#4A7B5B] transition-colors mb-1 truncate" style={{fontSize:"15px",fontWeight:700,color:"#0F172A"}}>{c.name}</h3>
                  <div className="flex items-center gap-1 text-gray-400 mb-2">
                    <MapPin size={11}/><span style={{fontSize:"11px"}}>{c.city}, {c.state}</span>
                  </div>
                  {c.matchReason && (
                    <p style={{fontSize:"11px", color:"#4B5563"}} className="mb-3 line-clamp-2 italic">{c.matchReason}</p>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div style={{fontSize:"10px",color:"#94a3b8"}}>Annual Fees</div>
                      <div style={{fontSize:"13px",fontWeight:700,color:"#4A7B5B"}}>₹{c.totalFees ? c.totalFees.toLocaleString() + "/yr" : "1.2L–₹2.4L/yr"}</div> 
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#E8F3EC] rounded-lg">
                      <Star size={11} className="fill-[#F0AE1A] text-[#F0AE1A]"/><span style={{fontSize:"12px",fontWeight:700,color:"#4A7B5B"}}>{c.ranking || 4.5}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <span className="flex-1 text-center py-2 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl" style={{fontSize:"11px",fontWeight:600}}>View Details</span>
                    <Link to="/apply-now" onClick={e=>e.stopPropagation()} className="flex-1 text-center py-2 bg-[#4A7B5B] text-white rounded-xl hover:bg-[#3d6b4d] transition-colors" style={{fontSize:"11px",fontWeight:600}}>Apply Now</Link>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}} className="mb-2">Simple Process</div>
            <h2 style={{fontWeight:700,color:"#0F172A"}}>How It Works</h2>
            <p style={{fontSize:"14px",color:"#94a3b8"}} className="mt-2">Get your dream college admission in just 4 simple steps</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step,i)=>(
              <div key={step.step} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{backgroundColor:step.color+"15"}}>
                  <span style={{fontSize:"22px",fontWeight:800,color:step.color}}>{step.step}</span>
                </div>
                <h3 className="mb-2" style={{fontSize:"16px",fontWeight:700,color:"#0F172A"}}>{step.title}</h3>
                <p style={{fontSize:"13px",color:"#94a3b8",lineHeight:1.6}}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}} className="mb-2">Student Stories</div>
            <h2 style={{fontWeight:700,color:"#0F172A"}}>Success Stories</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t=>(
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({length:t.rating}).map((_,i)=><Star key={i} size={14} className="fill-[#F0AE1A] text-[#F0AE1A]"/>)}
                </div>
                <p className="italic mb-5" style={{fontSize:"13px",color:"#4B5563",lineHeight:1.7}}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <ImageWithFallback src={t.img} alt={t.name} className="w-11 h-11 rounded-full object-cover border-2 border-[#E8F3EC]"/>
                  <div>
                    <div style={{fontSize:"13px",fontWeight:700,color:"#0F172A"}}>{t.name}</div>
                    <div style={{fontSize:"11px",color:"#94a3b8"}}>{t.course}</div>
                    <span className="px-2 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-full" style={{fontSize:"9px",fontWeight:600}}>{t.state}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STUDY MATERIALS ── */}
      <section className="py-14 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-7">
            <div>
              <div style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}} className="mb-1">Free Resources</div>
              <h2 style={{fontWeight:700,color:"#0F172A"}}>Study Materials</h2>
            </div>
            <Link to="/blogs" className="flex items-center gap-1 text-sm text-[#4A7B5B] hover:underline"><span>View All</span><ArrowRight size={13}/></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STUDY_MATERIALS.map(m=>(
              <div key={m.label} className="flex flex-col items-center gap-3 p-6 bg-[#F8FAFC] rounded-2xl border border-gray-100 hover:shadow-md hover:border-[#4A7B5B]/20 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{backgroundColor:m.color+"15"}}>
                  <m.icon size={22} style={{color:m.color}}/>
                </div>
                <div className="text-center">
                  <div style={{fontSize:"13px",fontWeight:700,color:"#0F172A"}}>{m.label}</div>
                  <div style={{fontSize:"11px",color:"#94a3b8"}}>{m.sub}</div>
                </div>
                <div className="flex items-center gap-1.5 text-[#4A7B5B]" style={{fontSize:"11px",fontWeight:600}}>
                  <Upload size={11}/> Download Free
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BLOGS ── */}
      <section className="py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-7">
            <div>
              <div style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}} className="mb-1">Latest Articles</div>
              <h2 style={{fontWeight:700,color:"#0F172A"}}>From Our Blog</h2>
            </div>
            <Link to="/blogs" className="flex items-center gap-1 text-sm text-[#4A7B5B] hover:underline"><span>All Blogs</span><ArrowRight size={13}/></Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {(homeBlogsRes?.data?.data && homeBlogsRes.data.data.length > 0
              ? homeBlogsRes.data.data
              : BLOGS
            ).map((b: any) => (
              <Link
                key={b.id || b.title}
                to={b.slug ? `/blog/${b.slug}` : "/blogs"}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 overflow-hidden bg-slate-100">
                    <ImageWithFallback
                      src={b.featuredImage || b.thumbnail || b.img || "https://images.unsplash.com/photo-1770226698529-a9c8726949c6?w=400&q=80"}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="px-2 py-0.5 rounded-full text-white" style={{ fontSize: "10px", fontWeight: 600, backgroundColor: b.color || "#3B82F6" }}>
                        {b.category || "General"}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {b.publishedAt ? new Date(b.publishedAt).toLocaleDateString() : b.date || "Recent"} · {b.readingTime || b.read || 5} min read
                      </span>
                    </div>
                    <h3 className="group-hover:text-[#4A7B5B] transition-colors leading-snug line-clamp-2" style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>
                      {b.title}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}} className="mb-2">Got Questions?</div>
            <h2 style={{fontWeight:700,color:"#0F172A"}}>Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {(homeFaqsRes?.data?.data && homeFaqsRes.data.data.length > 0
              ? homeFaqsRes.data.data.map((f: any) => ({ q: f.question, a: f.answer, slug: f.slug }))
              : FAQS
            ).map((f: any, i: number) => (
              <div key={f.slug || i} className="bg-[#F8FAFC] rounded-2xl border border-gray-100 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }} className="pr-4">{f.q}</span>
                  {openFaq === i ? <ChevronUp size={17} className="text-[#4A7B5B] shrink-0" /> : <ChevronDown size={17} className="text-gray-400 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 space-y-2">
                    <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.7 }}>{f.a}</p>
                    {f.slug && (
                      <Link to={`/faq/${f.slug}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4A7B5B] hover:underline">
                        Learn more <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-14 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl p-10 text-center relative overflow-hidden" style={{background:"linear-gradient(135deg,#4A7B5B 0%,#2d5e3f 100%)"}}>
            <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:"radial-gradient(circle at 20% 80%,rgba(240,174,26,0.2) 0%,transparent 50%)"}}/>
            <div className="relative z-10">
              <h2 className="text-white mb-3" style={{fontWeight:800,fontSize:"clamp(22px,3vw,32px)"}}>Ready to Start Your Admission Journey?</h2>
              <p className="text-white/80 mb-7 max-w-lg mx-auto" style={{fontSize:"15px"}}>Join 50,000+ students who found their dream college through Swayam Admission. It's free!</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link to="/apply-now" className="flex items-center gap-2 px-7 py-3.5 bg-white text-[#4A7B5B] rounded-2xl hover:bg-gray-50 transition-colors" style={{fontWeight:700}}>
                  Apply Now Free <ArrowRight size={16}/>
                </Link>
                <Link to="/ai-counselor" className="flex items-center gap-2 px-7 py-3.5 bg-white/20 text-white border border-white/30 rounded-2xl hover:bg-white/30 transition-colors" style={{fontWeight:600}}>
                  <Bot size={15}/> Talk to AI
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
