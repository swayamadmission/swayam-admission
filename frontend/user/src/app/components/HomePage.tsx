import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import {
  Search, ArrowRight, Star, MapPin, Building2, Users, Award, Bot, Phone,
  MessageCircle, Upload, Download, FileText, ChevronDown, ChevronUp, CheckCircle2,
  GraduationCap, TrendingUp, Cpu, Scale, Stethoscope, Hotel, Wrench, BookOpen,
  Play, Pause, Sparkles, Clock, TrendingUp as TrendingIcon, Trophy, ShieldCheck, HelpCircle,
  Eye, Lock, FileCode, Volume2, VolumeX
} from "lucide-react";
import { bannersApi, BannerItem } from "../../api/banners.api";
import { PageBannerSlider } from "./common/PageBannerSlider";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useAuth } from "./Navbar";
import { useAuth as useAuthContext } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { collegesApi } from "../../api/colleges.api";
import { coursesApi } from "../../api/courses.api";
import { geographyApi } from "../../api/geography.api";
import { searchApi } from "../../api/search.api";
import { blogsApi } from "../../api/blogs.api";
import { faqsApi } from "../../api/faqs.api";
import { studyMaterialsApi, resolveThumbnailUrl } from "../../api/study-materials.api";
import { testimonialsApi } from "../../api/testimonials.api";
import { reviewsRankingApi } from "../../api/reviews-ranking.api";
import { formatIndianDate } from "../../utils/date.utils";
import { LiquidGlassSearchBar } from "./LiquidGlassSearchBar";
import { usePublicSettings } from "../../context/PublicSettingsContext";

const HOW_IT_WORKS = [
  { step:"01", title:"Fill Application", desc:"Share your details, course interest and budget preferences in 2 minutes.", color:"#4A7B5B" },
  { step:"02", title:"Get Counseling", desc:"AI + expert counselors analyze your profile and guide you personally.", color:"#F0AE1A" },
  { step:"03", title:"Select College", desc:"Browse verified college options shortlisted just for your profile.", color:"#3B82F6" },
  { step:"04", title:"Secure Admission", desc:"Complete documentation, pay fees and confirm your admission.", color:"#8B5CF6" },
];

function getCourseCategoryStyle(category?: string, name?: string) {
  const text = `${category || ""} ${name || ""}`.toLowerCase();
  if (text.includes("tech") || text.includes("eng") || text.includes("b.e")) {
    return { icon: Cpu, color: "#3B82F6", bg: "#EFF6FF" };
  }
  if (text.includes("mba") || text.includes("bba") || text.includes("manag") || text.includes("pgdm")) {
    return { icon: TrendingUp, color: "#8B5CF6", bg: "#F5F3FF" };
  }
  if (text.includes("bca") || text.includes("mca") || text.includes("cs") || text.includes("it") || text.includes("computer")) {
    return { icon: BookOpen, color: "#06B6D4", bg: "#ECFEFF" };
  }
  if (text.includes("nurs") || text.includes("medic") || text.includes("mbbs") || text.includes("pharm") || text.includes("health")) {
    return { icon: Stethoscope, color: "#EF4444", bg: "#FEF2F2" };
  }
  if (text.includes("poly") || text.includes("diploma") || text.includes("mechanic") || text.includes("civil")) {
    return { icon: Wrench, color: "#F97316", bg: "#FFF7ED" };
  }
  if (text.includes("law") || text.includes("llb") || text.includes("judic")) {
    return { icon: Scale, color: "#6366F1", bg: "#EEF2FF" };
  }
  if (text.includes("hotel") || text.includes("hospitality") || text.includes("tourism") || text.includes("catering")) {
    return { icon: Hotel, color: "#EC4899", bg: "#FDF2F8" };
  }
  return { icon: GraduationCap, color: "#4A7B5B", bg: "#E8F3EC" };
}

const STUDY_MATERIAL_TYPE_CONFIG: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  PDF: { bg: "#FEE2E2", text: "#DC2626", icon: FileText },
  Notes: { bg: "#E8F3EC", text: "#4A7B5B", icon: BookOpen },
  PYQ: { bg: "#DBEAFE", text: "#2563EB", icon: FileCode },
  "Mock Test": { bg: "#F3E8FF", text: "#7C3AED", icon: GraduationCap },
  "Sample Paper": { bg: "#FEF3C7", text: "#D97706", icon: FileText },
  Syllabus: { bg: "#E0F2FE", text: "#0284C7", icon: BookOpen },
  Assignment: { bg: "#F1F5F9", text: "#475569", icon: FileText },
  "E-Book": { bg: "#E0F2FE", text: "#0284C7", icon: BookOpen },
};

function getStudyMaterialTypeConfig(type?: string) {
  if (!type) return { bg: "#E8F3EC", text: "#4A7B5B", icon: FileText };
  return STUDY_MATERIAL_TYPE_CONFIG[type] || { bg: "#E8F3EC", text: "#4A7B5B", icon: FileText };
}

function HomeStudyMaterialThumbnail({
  thumbnail,
  title,
  conf,
}: {
  thumbnail?: string;
  title: string;
  conf: { bg: string; text: string; icon: React.ElementType };
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [thumbnail]);

  const resolvedUrl = resolveThumbnailUrl(thumbnail);
  const Icon = conf.icon;

  if (resolvedUrl && !imgError) {
    return (
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 flex items-center justify-center">
        <img
          src={resolvedUrl}
          alt={title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
      </div>
    );
  }

  return (
    <div
      className="relative aspect-[16/9] w-full overflow-hidden flex flex-col items-center justify-center p-3 select-none"
      style={{
        background: "linear-gradient(135deg, #1a3a2c 0%, #254d36 40%, #4A7B5B 100%)",
      }}
    >
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -left-4 -top-4 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md mb-1"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(4px)" }}
        >
          <Icon size={20} className="text-white" />
        </div>
        <span className="text-[9px] uppercase font-extrabold tracking-widest text-emerald-200/90">
          Swayam Admission
        </span>
        <span className="text-[10px] font-semibold text-white/90 line-clamp-1 max-w-[160px] mt-0.5">
          Academic Resource
        </span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />
    </div>
  );
}

function SectionEmptyState({
  title,
  description,
  actionText,
  actionHref,
  icon: Icon = Sparkles,
}: {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  icon?: any;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-xl mx-auto my-4 shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center mx-auto mb-3">
        <Icon size={22} />
      </div>
      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1F2937" }} className="mb-1">
        {title}
      </h3>
      <p style={{ fontSize: "13px", color: "#64748b" }} className="mb-4">
        {description}
      </p>
      {actionText && actionHref && (
        <Link
          to={actionHref}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4A7B5B] text-white rounded-xl text-xs font-semibold hover:bg-[#3d6b4d] transition-colors"
        >
          <span>{actionText}</span>
          <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

const formatINR = (val?: number | string | null) => {
  if (val === undefined || val === null || val === "") return null;
  const num = typeof val === "number" ? val : Number(val);
  if (isNaN(num)) return null;
  return `₹${num.toLocaleString("en-IN")}`;
};

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  const { openAuth } = useAuth();
  const { isLoggedIn } = useAuthContext();
  const { settings } = usePublicSettings();
  const navigate = useNavigate();

  const whatsappNum = settings.whatsappNumber || settings.whatsappPhone || "6284308664";
  const cleanWhatsapp = whatsappNum.replace(/\D/g, "");
  const whatsappHref = `https://wa.me/91${cleanWhatsapp.slice(-10)}`;

  // 0. Hero Video & AI Counselor Banners
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  const { data: heroBannersRes } = useQuery({
    queryKey: ["banner_slot_HOME_HERO_VIDEO"],
    queryFn: () => bannersApi.getPublic("HOME_HERO_VIDEO"),
  });
  const heroBanner: BannerItem | undefined = heroBannersRes?.data?.[0];

  const { data: aiCounselorBannersRes } = useQuery({
    queryKey: ["banner_slot_HOME_AI_COUNSELOR"],
    queryFn: () => bannersApi.getPublic("HOME_AI_COUNSELOR"),
  });
  const aiCounselorBanner: BannerItem | undefined = aiCounselorBannersRes?.data?.[0];

  const toggleHeroVideo = () => {
    if (!heroVideoRef.current) return;
    if (heroVideoRef.current.paused) {
      heroVideoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
    } else {
      heroVideoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const toggleHeroMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!heroVideoRef.current) return;
    heroVideoRef.current.muted = !heroVideoRef.current.muted;
    setIsVideoMuted(heroVideoRef.current.muted);
  };

  // 1. Popular / Featured Courses Query (Published + Featured)
  const { data: coursesRes, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["homeFeaturedCourses"],
    queryFn: () => coursesApi.findAll({ limit: 9, featured: true, status: "PUBLISHED" }),
  });

  // 2. States Query
  const { data: statesRes, isLoading: isLoadingStates } = useQuery({
    queryKey: ["homeStates"],
    queryFn: () => geographyApi.getStates(),
  });

  // 3. Popular Colleges Query (Published + Featured only)
  const { data: collegesRes, isLoading: isLoadingColleges } = useQuery({
    queryKey: ["homePopularColleges"],
    queryFn: () => collegesApi.findAll({ limit: 6, featured: true, status: "PUBLISHED" }), 
  });

  // 4. Featured Blogs Query
  const { data: homeBlogsRes, isLoading: isLoadingBlogs } = useQuery({
    queryKey: ["homeBlogs"],
    queryFn: () => blogsApi.findPublic({ limit: 3, featured: true }),
  });

  // 5. Featured FAQs Query
  const { data: homeFaqsRes, isLoading: isLoadingFaqs } = useQuery({
    queryKey: ["homeFaqs"],
    queryFn: () => faqsApi.getFeatured(5),
  });

  // 6. Annual Ranking & Research
  const { data: homePublishedRankingRes } = useQuery({
    queryKey: ["homePublishedRankings"],
    queryFn: () => reviewsRankingApi.getPublicRankings({ limit: 4 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: homePublishedReportRes } = useQuery({
    queryKey: ["homePublishedReport"],
    queryFn: () => reviewsRankingApi.getPublicAnnualReport(new Date().getFullYear()),
    staleTime: 5 * 60 * 1000,
  });

  // 7. Success Stories / Testimonials Query
  const { data: homeTestimonialsRes, isLoading: isLoadingTestimonials } = useQuery({
    queryKey: ["homeTestimonials"],
    queryFn: () => testimonialsApi.findPublic({ limit: 3, featured: true }),
  });

  // 8. Study Materials Query
  const { data: homeStudyMaterialsRes, isLoading: isLoadingStudyMaterials } = useQuery({
    queryKey: ["homeStudyMaterials"],
    queryFn: () => studyMaterialsApi.getFeatured(4),
  });

  const publishedEdition = homePublishedRankingRes?.data?.edition;
  const publishedResults = homePublishedRankingRes?.data?.results || [];
  const publishedReport = homePublishedReportRes?.data;

  // Real data extractions
  const courses: any[] = Array.isArray(coursesRes?.data)
    ? coursesRes.data
    : ((coursesRes as any)?.data?.data || []);

  const allStates = statesRes || [];
  const topStates = [...allStates]
    .filter((s: any) => s.status === "ACTIVE" || s.status === "PUBLISHED")
    .sort((a: any, b: any) => (b.collegesCount ?? 0) - (a.collegesCount ?? 0))
    .slice(0, 6);

  const popularColleges: any[] = Array.isArray((collegesRes as any)?.data?.data)
    ? (collegesRes as any).data.data
    : (Array.isArray((collegesRes as any)?.data) ? (collegesRes as any).data : []);

  const testimonials = homeTestimonialsRes?.data?.data || [];
  
  const studyMaterials: any[] = Array.isArray((homeStudyMaterialsRes as any)?.data?.data)
    ? (homeStudyMaterialsRes as any).data.data
    : (Array.isArray((homeStudyMaterialsRes as any)?.data) ? (homeStudyMaterialsRes as any).data : []);
  
  const homeBlogs = homeBlogsRes?.data?.data || [];
  
  const homeFaqs: any[] = Array.isArray((homeFaqsRes as any)?.data)
    ? (homeFaqsRes as any).data
    : ((homeFaqsRes as any)?.data?.data || []);

  const handlePreviewMaterial = (e: React.MouseEvent, m: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (m.premium && !m.previewFileUrl) {
      navigate(`/study-materials?search=${encodeURIComponent(m.title)}`);
      return;
    }
    const previewUrl = studyMaterialsApi.getPreviewUrl(m.id);
    window.open(previewUrl, "_blank");
  };

  const handleDownloadMaterial = (e: React.MouseEvent, m: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      openAuth();
      return;
    }
    if (m.premium) {
      navigate(`/study-materials?search=${encodeURIComponent(m.title)}`);
      return;
    }
    studyMaterialsApi.downloadFile(m.id, m.fileName).catch(() => {
      navigate(`/study-materials?search=${encodeURIComponent(m.title)}`);
    });
  };

  return (
    <div style={{ backgroundColor: "#F8FAFC" }}>
      {/* ── TOP BANNER (Navbar ke just neeche) ── */}
      <PageBannerSlider slot="HOME_TOP" />

      {/* ── HERO ── */}
      <section className="bg-white relative z-20">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ background:"radial-gradient(ellipse 80% 50% at 50% -5%, rgba(74,123,91,0.08) 0%, transparent 70%)" }}>
          {/* Decorative Floating Elements contained in background layer */}
          <div className="absolute top-4 left-10 w-24 h-24 bg-[#4A7B5B]/10 rounded-full blur-2xl animate-[pulse_3s_ease-in-out_infinite]" />
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-[#F0AE1A]/10 rounded-full blur-2xl animate-[pulse_3s_ease-in-out_infinite_1s]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 sm:pt-4 lg:pt-5 pb-20 relative z-10">

          {/* Split Layout: Video Left | Content Right */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* LEFT SIDE - VIDEO SHOWCASE */}
            <div className="relative group order-2 lg:order-1 animate-[fadeIn_0.8s_ease-out]">
              {/* Video Card */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-transparent bg-gradient-to-br from-[#4A7B5B]/10 via-transparent to-[#F0AE1A]/10 p-1">
                <div className="relative rounded-[22px] overflow-hidden bg-white">
                  {/* Video / Media Area (4:3 aspect ratio) */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                    {heroBanner?.mediaType === "VIDEO" && heroBanner.videoUrl ? (
                      <>
                        <video
                          ref={heroVideoRef}
                          src={heroBanner.videoUrl}
                          playsInline
                          autoPlay
                          muted={isVideoMuted}
                          loop
                          preload="metadata"
                          onPlay={() => setIsVideoPlaying(true)}
                          onPause={() => setIsVideoPlaying(false)}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={toggleHeroVideo}
                        />

                        {/* Mute / Unmute Toggle Button */}
                        <button
                          type="button"
                          onClick={toggleHeroMute}
                          className="absolute bottom-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-950/60 backdrop-blur text-white flex items-center justify-center hover:bg-slate-950/80 transition-colors"
                          title={isVideoMuted ? "Unmute audio" : "Mute audio"}
                        >
                          {isVideoMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        </button>
                      </>
                    ) : (
                      <ImageWithFallback
                        src={
                          heroBanner?.imageUrl ||
                          "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=800&q=80"
                        }
                        alt={heroBanner?.title || "Swayam Admission Counseling"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    )}

                    {/* Glassmorphism Overlay */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent transition-opacity duration-300 pointer-events-none ${
                        isVideoPlaying ? "opacity-30 group-hover:opacity-60" : "opacity-100"
                      }`}
                    />

                    {/* Play / Pause Button in Existing Style */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={toggleHeroVideo}
                        className={`w-20 h-20 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-2xl transition-all duration-300 group-hover:bg-[#4A7B5B] group-hover:text-white cursor-pointer ${
                          isVideoPlaying
                            ? "opacity-0 group-hover:opacity-90 hover:scale-110"
                            : "opacity-100 hover:scale-110 animate-[pulse_2s_ease-in-out_infinite]"
                        }`}
                        title={isVideoPlaying ? "Pause Video" : "Play Video"}
                      >
                        {isVideoPlaying ? (
                          <Pause size={28} className="fill-current text-slate-800 group-hover:text-white" />
                        ) : (
                          <Play size={32} className="fill-current ml-1 text-[#4A7B5B] group-hover:text-white" />
                        )}
                      </button>
                    </div>

                    {/* Overlay Text */}
                    <div
                      className={`absolute bottom-0 left-0 right-0 p-6 pointer-events-none transition-opacity duration-300 ${
                        isVideoPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-[#F0AE1A]" />
                        <span style={{fontSize:"11px",fontWeight:600,color:"white",textTransform:"uppercase",letterSpacing:"0.5px"}}>
                          Watch Success Story
                        </span>
                      </div>
                      <h3 className="text-white mb-1" style={{fontSize:"20px",fontWeight:800}}>
                        {heroBanner?.title || "Swayam Admission Counseling"}
                      </h3>
                      <p className="text-white/90" style={{fontSize:"13px"}}>
                        {heroBanner?.subtitle || "Helping Students Find Their Perfect Career Path"}
                      </p>

                      {heroBanner?.buttonText && heroBanner.buttonUrl && (
                        <div className="mt-3 pointer-events-auto">
                          {heroBanner.buttonUrl.startsWith("/") ? (
                            <Link
                              to={heroBanner.buttonUrl}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F0AE1A] text-slate-900 text-xs font-bold rounded-lg shadow hover:bg-[#e0a012]"
                            >
                              <span>{heroBanner.buttonText}</span>
                              <ArrowRight size={12} />
                            </Link>
                          ) : (
                            <a
                              href={heroBanner.buttonUrl}
                              target={heroBanner.openInNewTab ? "_blank" : "_self"}
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F0AE1A] text-slate-900 text-xs font-bold rounded-lg shadow hover:bg-[#e0a012]"
                            >
                              <span>{heroBanner.buttonText}</span>
                              <ArrowRight size={12} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Floating Stats Badges */}
                    <div className="absolute top-4 right-4 space-y-2 animate-[fadeIn_1s_ease-out_0.5s_both] pointer-events-none">
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
                    <div className="absolute top-4 left-4 animate-[fadeIn_1s_ease-out_0.3s_both] pointer-events-none">
                      <div className="bg-gradient-to-r from-[#4A7B5B] to-[#3d6b4d] text-white rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-[#F0AE1A] rounded-full animate-pulse" />
                        <span style={{fontSize:"10px",fontWeight:700}}>LIVE COUNSELING</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE - EXISTING CONTENT */}
            <div className="order-1 lg:order-2 text-center lg:text-left animate-[fadeIn_0.8s_ease-out_0.2s_both] relative z-30">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#E8F3EC] rounded-full mb-6">
                <Bot size={13} className="text-[#4A7B5B]" />
                <span style={{ fontSize:"12px", fontWeight:600, color:"#4A7B5B" }}>AI-Powered Admission Guidance — Free for Students</span>
              </div>
              <h1 style={{ fontSize:"clamp(28px,5vw,52px)", fontWeight:800, lineHeight:1.15, color:"#4A7B5B" }} className="mb-5">
                Find Your Dream College{" "}
                <span style={{ color:"#4A7B5B" }}>with Smart AI</span>{" "}
                Guidance
              </h1>
              <p style={{ fontSize:"clamp(15px,2vw,18px)", color:"#64748b", lineHeight:1.7 }} className="max-w-xl lg:mx-0 mx-auto mb-8">
                500+ verified colleges · AI counseling · Scholarship guidance — all at zero cost for students across India.
              </p>
              
              {/* Liquid Glass Smart Search Bar */}
              <div className="max-w-xl lg:mx-0 mx-auto mb-7 relative z-40">
                <LiquidGlassSearchBar
                  placeholder="Search colleges, courses, study materials, guides, exams..."
                />
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
                    <div style={{fontSize:"22px",fontWeight:800,color:"#4A7B5B"}}>{s.n}</div>
                    <div style={{fontSize:"11px",color:"#94a3b8"}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="border-y border-gray-100 bg-white relative z-10">
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
                  <div style={{fontSize:"13px",fontWeight:700,color:"#4A7B5B"}}>{label}</div>
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
          <div
            className="rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 overflow-hidden relative shadow-lg"
            style={{
              background: aiCounselorBanner?.imageUrl
                ? `linear-gradient(rgba(30, 60, 42, 0.88), rgba(45, 94, 63, 0.94)), url(${aiCounselorBanner.imageUrl}) center/cover no-repeat`
                : "linear-gradient(to bottom right, #4A7B5B, #2d5e3f)",
            }}
          >
            <div className="absolute right-0 top-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none"/>
            <div className="flex-1 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full mb-4">
                <div className="w-2 h-2 bg-[#F0AE1A] rounded-full animate-pulse"/>
                <span style={{fontSize:"11px",fontWeight:600,color:"white"}}>AI Active — Online Now</span>
              </div>
              <h2 className="text-white mb-3" style={{fontSize:"clamp(20px,3vw,30px)",fontWeight:800}}>
                {aiCounselorBanner?.title || "Meet Swayam AI Counselor"}
              </h2>
              <p className="text-white/80 mb-6 max-w-md" style={{fontSize:"14px",lineHeight:1.7}}>
                {aiCounselorBanner?.subtitle || "Tell your marks, budget and career goals. Our AI will instantly recommend perfect colleges and courses — for free!"}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Link to="/ai-counselor" className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#4A7B5B] rounded-xl hover:bg-gray-50 transition-colors shadow-sm" style={{fontWeight:700,fontSize:"14px"}}>
                  <Bot size={15}/> Start AI Chat
                </Link>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-xl hover:bg-[#1ebe5d] transition-colors shadow-sm" style={{fontWeight:600,fontSize:"14px"}}>
                  <MessageCircle size={15}/> WhatsApp Us
                </a>
                {aiCounselorBanner?.buttonText && aiCounselorBanner.buttonUrl && (
                  aiCounselorBanner.buttonUrl.startsWith("/") ? (
                    <Link to={aiCounselorBanner.buttonUrl} className="flex items-center gap-2 px-5 py-2.5 bg-[#F0AE1A] text-slate-900 rounded-xl hover:bg-[#e0a012] transition-colors shadow-sm font-bold text-sm">
                      <span>{aiCounselorBanner.buttonText}</span> <ArrowRight size={14}/>
                    </Link>
                  ) : (
                    <a href={aiCounselorBanner.buttonUrl} target={aiCounselorBanner.openInNewTab ? "_blank" : "_self"} rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-[#F0AE1A] text-slate-900 rounded-xl hover:bg-[#e0a012] transition-colors shadow-sm font-bold text-sm">
                      <span>{aiCounselorBanner.buttonText}</span> <ArrowRight size={14}/>
                    </a>
                  )
                )}
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
              <h2 style={{fontWeight:700,color:"#4A7B5B"}}>Popular Courses</h2>
            </div>
            <Link to="/courses" className="flex items-center gap-1 text-sm text-[#4A7B5B] hover:underline">
              <span>View All</span>
              <ArrowRight size={13}/>
            </Link>
          </div>
          {isLoadingCourses ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading popular courses...</div>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
              {courses.map((c: any) => {
                const style = getCourseCategoryStyle(c.category, c.name);
                const Icon = style.icon;
                const feeDisplay = c.totalFees
                  ? formatINR(c.totalFees)
                  : c.semesterFees
                  ? `${formatINR(c.semesterFees)}/sem`
                  : (c.level || c.duration || "Degree");

                return (
                  <Link
                    key={c.id}
                    to={`/courses?q=${encodeURIComponent(c.name)}`}
                    className="group flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-[#4A7B5B]/30 transition-all text-center justify-between"
                  >
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0"
                        style={{ backgroundColor: style.bg }}
                      >
                        <Icon size={20} style={{ color: style.color }} />
                      </div>
                      <span
                        className="leading-tight line-clamp-2 w-full px-1 group-hover:text-[#4A7B5B] transition-colors"
                        style={{ fontSize: "11px", fontWeight: 700, color: "#374151" }}
                        title={c.name}
                      >
                        {c.name}
                      </span>
                    </div>
                    <div className="w-full pt-1.5 border-t border-gray-50 flex flex-col items-center">
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#4A7B5B" }} className="truncate max-w-full">
                        {feeDisplay}
                      </span>
                      {c.duration && (
                        <span style={{ fontSize: "9px", color: "#94a3b8" }}>
                          {c.duration}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <SectionEmptyState
              title="No Featured Courses Spotlighted"
              description="Explore accredited undergraduate and postgraduate programs across India in our full catalog."
              actionText="Explore All Courses"
              actionHref="/courses"
              icon={BookOpen}
            />
          )}
        </div>
      </section>

      {/* ── TOP STATES ── */}
      <section className="pb-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-7">
            <div>
              <div style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}} className="mb-1">Browse by Location</div>
              <h2 style={{fontWeight:700,color:"#4A7B5B"}}>Top States</h2>
            </div>
            <Link to="/states" className="flex items-center gap-1 text-sm text-[#4A7B5B] hover:underline">
              <span>All States</span>
              <ArrowRight size={13}/>
            </Link>
          </div>
          {isLoadingStates ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading top states...</div>
          ) : topStates.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {topStates.map((s: any) => (
                <Link
                  key={s.id || s.code}
                  to={`/colleges?state=${encodeURIComponent(s.name)}`}
                  className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-[#4A7B5B]/20 transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#E8F3EC] flex items-center justify-center text-[#4A7B5B] mb-1 group-hover:scale-110 transition-transform overflow-hidden">
                    {s.heroImage ? (
                      <ImageWithFallback
                        src={s.heroImage}
                        alt={s.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 size={24} />
                    )}
                  </div>
                  <div style={{fontSize:"13px",fontWeight:700,color:"#4A7B5B"}} className="truncate w-full">
                    {s.name}
                  </div>
                  <div style={{fontSize:"11px",color:"#94a3b8"}}>
                    {s.collegesCount ?? 0} {s.collegesCount === 1 ? "College" : "Colleges"}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <SectionEmptyState
              title="No Regional States Active"
              description="Browse institutions across different Indian regions and states in our directory."
              actionText="View All States"
              actionHref="/states"
              icon={MapPin}
            />
          )}
        </div>
      </section>

      {/* ── POPULAR COLLEGES ── */}
      <section className="pb-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-7">
            <div>
              <div style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}} className="mb-1">
                Top Picks
              </div>
              <h2 style={{fontWeight:700,color:"#4A7B5B"}}>
                Popular Colleges
              </h2>
            </div>
            <Link to="/colleges" className="flex items-center gap-1 text-sm text-[#4A7B5B] hover:underline font-semibold">
              <span>View All</span>
              <ArrowRight size={13}/>
            </Link>
          </div>
          {isLoadingColleges ? (
            <div className="col-span-full text-center text-gray-500 py-10">Loading popular colleges...</div>
          ) : popularColleges.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {popularColleges.map((c: any) => {
                const collegeImage = c.banner || c.img || "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=800&q=80";
                const formattedFee = c.courses?.[0]?.totalFees
                  ? formatINR(c.courses[0].totalFees)
                  : c.totalFees
                  ? formatINR(c.totalFees)
                  : null;

                const locationStr = [c.city, c.state].filter(Boolean).join(", ") || (c.state || "India");

                return (
                  <Link
                    key={c.id}
                    to={`/colleges/${c.id}`}
                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 relative flex flex-col justify-between"
                  >
                    <div>
                      {/* Banner Image */}
                      <div className="h-44 overflow-hidden relative bg-slate-100 flex items-center justify-center">
                        <ImageWithFallback
                          src={collegeImage}
                          alt={c.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />

                        <div className="absolute top-3 left-3 flex gap-1 z-10">
                          {c.featured && (
                            <span className="px-2.5 py-0.5 bg-[#4A7B5B] rounded-full text-white font-bold flex items-center gap-1 shadow-xs" style={{fontSize:"9px"}}>
                              ⭐ Featured
                            </span>
                          )}
                        </div>
                        <div className="absolute top-3 right-3 flex gap-1 flex-wrap justify-end z-10">
                          <span className="px-2 py-0.5 bg-white/95 backdrop-blur-xs rounded-full text-gray-700 shadow-xs capitalize" style={{fontSize:"9px",fontWeight:600}}>
                            {c.type || c.ownership || "College"}
                          </span>
                        </div>
                      </div>

                      {/* Card Content with Logo + Name + Course Pills */}
                      <div className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          {c.logo ? (
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-xs p-1 shrink-0 flex items-center justify-center overflow-hidden">
                              <img
                                src={c.logo}
                                alt={`${c.name} logo`}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                  const parent = (e.target as HTMLElement).parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<span class="text-[#4A7B5B] font-bold text-xs">${c.name ? c.name.charAt(0).toUpperCase() : "C"}</span>`;
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] text-[#4A7B5B] font-bold text-xs shrink-0 flex items-center justify-center">
                              {c.name ? c.name.charAt(0).toUpperCase() : "C"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="group-hover:text-[#4A7B5B] transition-colors mb-0.5 line-clamp-1 leading-snug" style={{fontSize:"15px",fontWeight:700,color:"#4A7B5B"}} title={c.name}>
                              {c.name}
                            </h3>
                            <div className="flex items-center gap-1 text-gray-400">
                              <MapPin size={11} className="shrink-0"/>
                              <span style={{fontSize:"11px"}} className="truncate">
                                {locationStr}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Course Pills */}
                        {c.courses && c.courses.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap mb-3">
                            {c.courses.slice(0, 3).map((co: any) => (
                              <span
                                key={co.id || co.name}
                                className="px-2 py-0.5 bg-[#F8FAFC] border border-gray-100 text-gray-600 rounded-lg truncate max-w-[170px]"
                                style={{ fontSize: "10px", fontWeight: 500 }}
                                title={co.name}
                              >
                                {co.name}
                              </span>
                            ))}
                            {c.courses.length > 3 && (
                              <span
                                className="px-2 py-0.5 bg-[#F8FAFC] border border-gray-100 text-gray-400 rounded-lg shrink-0"
                                style={{ fontSize: "10px" }}
                              >
                                +{c.courses.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Fees & Rating */}
                        <div className="flex items-center justify-between mb-3 pt-1 border-t border-gray-50">
                          <div>
                            <div style={{fontSize:"10px",color:"#94a3b8"}}>Annual Fees</div>
                            <div style={{fontSize:"13px",fontWeight:700,color:"#4A7B5B"}}>
                              {formattedFee ? `${formattedFee}/yr` : "Fee on Request"}
                            </div> 
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 bg-[#E8F3EC] rounded-lg">
                            <Star size={11} className="fill-[#F0AE1A] text-[#F0AE1A]"/>
                            <span style={{fontSize:"12px",fontWeight:700,color:"#4A7B5B"}}>{c.rating || c.ranking || 4.5}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 pt-0">
                      <div className="flex gap-2">
                        <span className="flex-1 text-center py-2 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl group-hover:bg-[#d8ecdf] transition-colors" style={{fontSize:"11px",fontWeight:600}}>
                          View Details
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/apply-now?collegeId=${c.id}`);
                          }}
                          className="flex-1 text-center py-2 bg-[#4A7B5B] text-white rounded-xl hover:bg-[#3d6b4d] transition-colors shadow-xs cursor-pointer"
                          style={{fontSize:"11px",fontWeight:600}}
                        >
                          Apply Now
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <SectionEmptyState
              title="No Popular Colleges Featured"
              description="Browse our complete directory of verified partner colleges across India."
              actionText="Explore College Directory"
              actionHref="/colleges"
              icon={Building2}
            />
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}} className="mb-2">Simple Process</div>
            <h2 style={{fontWeight:700,color:"#4A7B5B"}}>How It Works</h2>
            <p style={{fontSize:"14px",color:"#94a3b8"}} className="mt-2">Get your dream college admission in just 4 simple steps</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step,i)=>(
              <div key={step.step} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{backgroundColor:step.color+"15"}}>
                  <span style={{fontSize:"22px",fontWeight:800,color:step.color}}>{step.step}</span>
                </div>
                <h3 className="mb-2" style={{fontSize:"16px",fontWeight:700,color:"#4A7B5B"}}>{step.title}</h3>
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
            <h2 style={{fontWeight:700,color:"#4A7B5B"}}>Success Stories</h2>
          </div>
          {isLoadingTestimonials ? (
            <div className="text-center text-sm text-gray-500 py-8">Loading student stories...</div>
          ) : testimonials.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {testimonials.map((t: any) => (
                <div key={t.id || t.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: Math.round(t.rating || 5) }).map((_, i) => (
                        <Star key={i} size={14} className="fill-[#F0AE1A] text-[#F0AE1A]" />
                      ))}
                    </div>
                    <p className="italic mb-5" style={{ fontSize: "13px", color: "#4B5563", lineHeight: 1.7 }}>
                      "{t.text}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                    {t.image ? (
                      <ImageWithFallback
                        src={t.image}
                        alt={t.name}
                        className="w-11 h-11 rounded-full object-cover border-2 border-[#E8F3EC]"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-extrabold flex items-center justify-center border-2 border-[#E8F3EC] text-sm shrink-0">
                        {t.name ? t.name.charAt(0).toUpperCase() : "S"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate" style={{ fontSize: "13px", fontWeight: 700, color: "#4A7B5B" }}>
                        {t.name}
                      </div>
                      <div className="truncate" style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {t.course || t.college || "Verified Student"}
                      </div>
                      {t.state && (
                        <span className="px-2 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-full inline-block mt-0.5" style={{ fontSize: "9px", fontWeight: 600 }}>
                          {t.state}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <SectionEmptyState
              title="Verified Student Stories"
              description="Real admissions journeys and counselor reviews will appear here once approved by our verification team."
              actionText="Free Counselling"
              actionHref="/apply-now"
              icon={Award}
            />
          )}
        </div>
      </section>

      {/* ── STUDY MATERIALS ── */}
      <section className="py-14 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-7">
            <div>
              <div style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}} className="mb-1">Academic Resources</div>
              <h2 style={{fontWeight:700,color:"#4A7B5B"}}>Study Materials</h2>
            </div>
            <Link to="/study-materials" className="flex items-center gap-1 text-sm text-[#4A7B5B] hover:underline font-semibold">
              <span>View All</span>
              <ArrowRight size={13}/>
            </Link>
          </div>
          {isLoadingStudyMaterials ? (
            <div className="text-center text-sm text-gray-500 py-8">Loading resources...</div>
          ) : studyMaterials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {studyMaterials.map((m: any) => {
                const conf = getStudyMaterialTypeConfig(m.materialType);

                return (
                  <div
                    key={m.id || m.title}
                    onClick={() => navigate(`/study-materials?search=${encodeURIComponent(m.title)}`)}
                    className="flex flex-col justify-between bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-[#4A7B5B]/30 transition-all cursor-pointer group overflow-hidden"
                  >
                    <div>
                      {/* Thumbnail Container */}
                      <div className="relative overflow-hidden">
                        <HomeStudyMaterialThumbnail
                          thumbnail={m.thumbnail}
                          title={m.title}
                          conf={conf}
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10 pointer-events-none">
                          {m.featured && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white shadow-xs">
                              <Star size={9} fill="currentColor" /> Featured
                            </span>
                          )}
                          {m.premium ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                              <Lock size={9} /> {m.price ? `₹${m.price}` : "Premium"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                              FREE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ backgroundColor: conf.bg, color: conf.text }}
                          >
                            {m.materialType || "Notes"}
                          </span>
                          <span className="text-[11px] text-gray-500 truncate max-w-[130px]">
                            {m.category || m.subject || "Resource"}
                          </span>
                        </div>

                        <h3
                          className="line-clamp-2 group-hover:text-[#4A7B5B] transition-colors leading-snug"
                          style={{ fontSize: "13px", fontWeight: 700, color: "#1F2937" }}
                          title={m.title}
                        >
                          {m.title}
                        </h3>

                        <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-1 border-t border-gray-50">
                          <span className="flex items-center gap-1">
                            <Download size={11} /> {(m.downloadCount ?? 0).toLocaleString("en-IN")} downloads
                          </span>
                          <span>
                            {m.pages ? `${m.pages} pgs` : m.fileSize || ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 pt-0 border-t border-gray-50 flex items-center gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handlePreviewMaterial(e, m)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#4A7B5B] bg-[#E8F3EC] hover:bg-[#d9ede0] transition flex items-center gap-1 shrink-0"
                        title="Preview document"
                      >
                        <Eye size={12} /> Preview
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadMaterial(e, m)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl text-xs font-bold text-white transition-all bg-[#4A7B5B] hover:bg-[#3d694d] shadow-xs"
                      >
                        {m.premium ? (
                          <><Lock size={11} /> {m.price ? `Unlock ₹${m.price}` : "Unlock"}</>
                        ) : (
                          <><Download size={11} /> Download</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <SectionEmptyState
              title="No Featured Study Materials"
              description="Access syllabus guides, question papers, and revision notes in our academic resource library."
              actionText="Explore Study Hub"
              actionHref="/study-materials"
              icon={FileText}
            />
          )}
        </div>
      </section>

      {/* ── BLOGS ── */}
      <section className="py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-7">
            <div>
              <div style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}} className="mb-1">Latest Articles</div>
              <h2 style={{fontWeight:700,color:"#4A7B5B"}}>From Our Blog</h2>
            </div>
            <Link to="/blogs" className="flex items-center gap-1 text-sm text-[#4A7B5B] hover:underline">
              <span>All Blogs</span>
              <ArrowRight size={13}/>
            </Link>
          </div>
          {isLoadingBlogs ? (
            <div className="text-center text-sm text-gray-500 py-8">Loading articles...</div>
          ) : homeBlogs.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {homeBlogs.map((b: any) => {
                const blogImage = b.featuredImage || b.thumbnail;

                return (
                  <Link
                    key={b.id || b.title}
                    to={b.slug ? `/blog/${b.slug}` : "/blogs"}
                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-40 overflow-hidden bg-slate-100 flex items-center justify-center">
                        {blogImage ? (
                          <ImageWithFallback
                            src={blogImage}
                            alt={b.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#E8F3EC] to-[#cde5d5] text-[#4A7B5B]">
                            <BookOpen size={32} className="mb-1 opacity-70" />
                            <span className="text-xs font-semibold px-4 text-center line-clamp-1">{b.category || "Article"}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="px-2 py-0.5 rounded-full text-white" style={{ fontSize: "10px", fontWeight: 600, backgroundColor: b.color || "#4A7B5B" }}>
                            {b.category || "General"}
                          </span>
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                            {b.publishedAt ? formatIndianDate(b.publishedAt) : (b.createdAt ? formatIndianDate(b.createdAt) : "Recent")} · {b.readingTime || 5} min read
                          </span>
                        </div>
                        <h3 className="group-hover:text-[#4A7B5B] transition-colors leading-snug line-clamp-2" style={{ fontSize: "14px", fontWeight: 600, color: "#4A7B5B" }} title={b.title}>
                          {b.title}
                        </h3>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <SectionEmptyState
              title="No Articles Published"
              description="Stay tuned for expert admission guidance, exam trends, and campus updates."
              actionText="Visit Blog Hub"
              actionHref="/blogs"
              icon={BookOpen}
            />
          )}
        </div>
      </section>

      {/* ── SWAYAM ADMISSION RANKINGS & RESEARCH INTELLIGENCE ── */}
      {(publishedEdition || publishedReport) && (
        <section className="py-14 px-4 sm:px-6 bg-[#F8FAFC] border-t border-b border-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-3">
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#4A7B5B" }} className="mb-1 flex items-center gap-1.5">
                  <Award size={14} /> Evidence-Based Multi-Dimensional Intelligence
                </div>
                <h2 style={{ fontWeight: 800, color: "#4A7B5B" }}>Swayam Admission Rankings & Research</h2>
                <p style={{ fontSize: "13px", color: "#64748b" }} className="mt-1">
                  Empirical 9-pillar college rankings, verified student voice, and published annual research reports.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/rankings"
                  className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Trophy size={13} /> View Official Rankings
                </Link>
                <Link
                  to="/blogs?category=Research%20%26%20Rankings"
                  className="px-4 py-2 bg-white border border-gray-200 hover:border-[#4A7B5B]/50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <BookOpen size={13} /> Research Hub
                </Link>
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              {/* Left Column: Published Annual Research Report */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-[#E8F3EC] text-[#4A7B5B] rounded-full text-[11px] font-bold flex items-center gap-1">
                      <ShieldCheck size={12} /> Official Research Report {publishedReport?.rankingYear || publishedEdition?.year || new Date().getFullYear()}
                    </span>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      Published: {formatIndianDate(publishedReport?.publishedAt || publishedEdition?.publishedAt || new Date())}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A" }} className="mb-2 leading-snug">
                    {publishedReport?.title || `Swayam Admission National College Ranking & Research Report ${publishedEdition?.year || new Date().getFullYear()}`}
                  </h3>

                  <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.65 }} className="mb-5 line-clamp-3">
                    {publishedReport?.executiveSummary ||
                      "Synthesizing 9 balanced performance pillars across academic stability, verified student satisfaction, audited career outcomes, campus infrastructure, and real transit accessibility."}
                  </p>

                  <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-[#F8FAFC] rounded-xl border border-slate-100 text-xs mb-4">
                    <div className="text-center">
                      <span className="text-[11px] text-slate-400 block font-medium">Institutions</span>
                      <span className="font-extrabold text-[#4A7B5B] text-sm">{publishedResults.length > 0 ? `${publishedResults.length}+ Ranked` : '100+ Evaluated'}</span>
                    </div>
                    <div className="text-center border-x border-slate-200/60">
                      <span className="text-[11px] text-slate-400 block font-medium">Official Pillars</span>
                      <span className="font-extrabold text-[#0F172A] text-sm">9 Pillars (100%)</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[11px] text-slate-400 block font-medium">Confidence</span>
                      <span className="font-extrabold text-emerald-600 text-sm">Bayesian Verified</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Swayam Admission National Research Council
                  </div>
                  <Link
                    to={`/blog/swayam-annual-college-ranking-research-report-${publishedReport?.rankingYear || publishedEdition?.year || new Date().getFullYear()}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4A7B5B] hover:underline"
                  >
                    Read Full Report <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              {/* Right Column: Top Ranked Colleges Preview */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#4A7B5B" }} className="flex items-center gap-1.5">
                      <Trophy size={14} className="text-[#F0AE1A]" /> Top Ranked Colleges
                    </h4>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {publishedEdition?.title || `Official Snapshot ${publishedEdition?.year || new Date().getFullYear()}`}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {publishedResults.slice(0, 4).map((r: any, idx: number) => (
                      <div key={r.id || idx} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="w-6 h-6 rounded-lg bg-[#E8F3EC] text-[#4A7B5B] font-black text-xs flex items-center justify-center shrink-0">
                            #{r.rank || idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-800 truncate">
                              {r.college?.name || "Premier College"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {r.college?.city}, {r.college?.state}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-[#4A7B5B] text-xs">
                            {r.score?.toFixed(1) || "88.0"} / 100
                          </span>
                          <span className="block text-[9px] text-slate-400">Composite</span>
                        </div>
                      </div>
                    ))}
                    {publishedResults.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Official ranked leaderboard will be published by the governance council.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <Link
                    to="/rankings"
                    className="w-full py-2 bg-[#F8FAFC] hover:bg-[#E8F3EC] text-[#4A7B5B] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-200/60"
                  >
                    Explore Complete Rankings & Pillars <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section className="py-14 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-3">
            <div className="text-center sm:text-left">
              <div style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}} className="mb-2">Got Questions?</div>
              <h2 style={{fontWeight:700,color:"#4A7B5B"}}>Frequently Asked Questions</h2>
            </div>
            <Link to="/faq" className="flex items-center gap-1 text-sm text-[#4A7B5B] hover:underline font-semibold">
              <span>View All FAQs</span>
              <ArrowRight size={13}/>
            </Link>
          </div>
          {homeFaqs.length > 0 ? (
            <div className="space-y-3">
              {homeFaqs.map((f: any, i: number) => (
                <div key={f.id || f.slug || i} className="bg-[#F8FAFC] rounded-2xl border border-gray-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#4A7B5B" }} className="pr-4">
                      {f.question}
                    </span>
                    {openFaq === i ? (
                      <ChevronUp size={17} className="text-[#4A7B5B] shrink-0" />
                    ) : (
                      <ChevronDown size={17} className="text-gray-400 shrink-0" />
                    )}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 space-y-2">
                      <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.7 }}>
                        {f.answer}
                      </p>
                      {f.slug && (
                        <Link
                          to={`/faq/${f.slug}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4A7B5B] hover:underline"
                        >
                          Learn more <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <SectionEmptyState
              icon={HelpCircle}
              title="No Featured FAQs Available"
              description="Our comprehensive admission FAQs and student help desk guides are being updated."
              actionText="Browse All FAQs"
              actionHref="/faq"
            />
          )}
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
