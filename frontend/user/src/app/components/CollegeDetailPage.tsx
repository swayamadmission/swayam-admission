import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import {
  MapPin,
  Star,
  Phone,
  CheckCircle2,
  Bot,
  ArrowRight,
  Building2,
  Users,
  Award,
  BookOpen,
  IndianRupee,
  Home,
  FileText,
  Download,
  Mail,
  Globe,
  ImageIcon,
  Sparkles,
  Calendar,
  Bookmark,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collegesApi } from "../../api/colleges.api";
import { recommendationApi } from "../../api/recommendation.api";
import { studyMaterialsApi, StudyMaterial } from "../../api/study-materials.api";
import { usersApi } from "../../api/users.api";
import { useAuth as useAuthContext } from "../../context/AuthContext";

const TABS = ["Overview", "Courses & Fees", "Hostel", "Placement", "Study Materials", "Gallery"];

export default function CollegeDetailPage() {
  const { id } = useParams();
  const { isLoggedIn } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: shortlistIdsRes } = useQuery({
    queryKey: ["shortlist_ids"],
    queryFn: () => usersApi.getShortlistIds(),
    enabled: isLoggedIn,
  });

  const rawShortlist = shortlistIdsRes?.data;
  const savedIds: string[] = Array.isArray(rawShortlist)
    ? rawShortlist
    : Array.isArray(rawShortlist?.data)
    ? rawShortlist.data
    : Array.isArray(rawShortlist?.collegeIds)
    ? rawShortlist.collegeIds
    : [];
  const isSaved = id ? savedIds.includes(id) : false;

  const toggleSaveMutation = useMutation({
    mutationFn: () => usersApi.toggleShortlist(id as string),
    onSuccess: (res: any) => {
      const savedNow = res?.data?.saved ?? res?.data?.isSaved ?? !isSaved;
      if (savedNow) {
        toast.success("College bookmarked and saved to your dashboard!");
      } else {
        toast.success("College removed from saved list");
      }
      queryClient.invalidateQueries({ queryKey: ["shortlist_ids"] });
      queryClient.invalidateQueries({ queryKey: ["shortlist"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update saved college");
    },
  });

  const handleToggleSave = () => {
    if (!isLoggedIn) {
      toast.error("Please login to save colleges to your shortlist");
      return;
    }
    if (!id) return;
    toggleSaveMutation.mutate();
  };

  const { data: collegeRes, isLoading } = useQuery({
    queryKey: ["college", id],
    queryFn: () => collegesApi.findById(id as string),
    enabled: !!id,
  });

  const { data: matchRes } = useQuery({
    queryKey: ["matchScore", id],
    queryFn: () => recommendationApi.getMatchScore(id as string),
    enabled: !!id && isLoggedIn,
  });

  const { data: materialsRes } = useQuery({
    queryKey: ["college_materials", id],
    queryFn: () => studyMaterialsApi.getByCollege(id as string, 10),
    enabled: !!id,
  });

  const apiCollege = collegeRes?.data;
  const matchData = matchRes?.data;

  // SEO synchronization
  useEffect(() => {
    if (apiCollege) {
      document.title = apiCollege.seoTitle || `${apiCollege.name} - Admission, Fees, Placement | Swayam Admission`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && apiCollege.seoDescription) {
        metaDesc.setAttribute("content", apiCollege.seoDescription);
      }
    }
  }, [apiCollege]);

  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedGalleryImg, setSelectedGalleryImg] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-500">
        <div className="w-10 h-10 border-4 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading verified college profile...</p>
      </div>
    );
  }

  if (!apiCollege) {
    return (
      <div className="text-center py-28 max-w-md mx-auto px-4">
        <Building2 className="w-12 h-12 text-[#94A3B8] mx-auto mb-3 opacity-60" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">College Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">The college you are looking for is either unpublished or does not exist.</p>
        <Link to="/colleges" className="px-5 py-2.5 bg-[#4A7B5B] text-white rounded-xl text-sm font-semibold hover:bg-[#3d6b4d] transition-colors">
          Browse All Colleges
        </Link>
      </div>
    );
  }

  // Format fee string
  const formatFees = () => {
    if (apiCollege.courses && apiCollege.courses.length > 0) {
      const feesList = apiCollege.courses
        .map((c) => c.totalFees || (typeof c.fees === "number" ? c.fees : null))
        .filter((f): f is number => f !== null && f > 0);
      if (feesList.length > 0) {
        const minFee = Math.min(...feesList);
        const maxFee = Math.max(...feesList);
        if (minFee === maxFee) {
          return minFee >= 100000 ? `₹${(minFee / 100000).toFixed(1)}L/yr` : `₹${minFee.toLocaleString()}/yr`;
        }
        return `₹${(minFee / 100000).toFixed(1)}L – ₹${(maxFee / 100000).toFixed(1)}L/yr`;
      }
    }
    if (apiCollege.totalFees && apiCollege.totalFees > 0) {
      return apiCollege.totalFees >= 100000
        ? `₹${(apiCollege.totalFees / 100000).toFixed(1)}L/yr`
        : `₹${apiCollege.totalFees.toLocaleString()}/yr`;
    }
    return "Fees on Request";
  };

  const bannerImg =
    apiCollege.banner ||
    apiCollege.img ||
    (apiCollege.gallery && apiCollege.gallery.length > 0 ? apiCollege.gallery[0].imageUrl : "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80");

  const collegeDesc =
    apiCollege.fullDescription ||
    apiCollege.shortDescription ||
    `${apiCollege.name} is a premier educational institution in ${apiCollege.city}, ${apiCollege.state} dedicated to academic excellence, industry-oriented training, and student development.`;

  const hostelAvailable =
    apiCollege.hostelAvailable || apiCollege.boysHostelAvailable || apiCollege.girlsHostelAvailable || false;

  const placementCompanies = apiCollege.placementCompanies || [];
  const galleryItems = apiCollege.gallery || [];
  const linkedMaterials = materialsRes?.data?.data || apiCollege.StudyMaterial || [];

  return (
    <div style={{ backgroundColor: "#F8FAFC" }} className="min-h-screen">
      {/* Banner */}
      <div className="relative h-60 sm:h-80 overflow-hidden bg-slate-900">
        <ImageWithFallback src={bannerImg} alt={apiCollege.name} className="w-full h-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-6 max-w-7xl mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div className="flex items-start sm:items-center gap-4">
              {apiCollege.logo ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1.5 shadow-lg border border-white/20 shrink-0 overflow-hidden flex items-center justify-center">
                  <img
                    src={apiCollege.logo}
                    alt={`${apiCollege.name} logo`}
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shrink-0 flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg">
                  {apiCollege.name ? apiCollege.name.charAt(0) : "C"}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-white ${
                      apiCollege.type === "GOVERNMENT" ? "bg-[#4A7B5B]" : "bg-[#3B82F6]"
                    }`}
                    style={{ fontSize: "11px", fontWeight: 600 }}
                  >
                    {apiCollege.type || "College"} {apiCollege.establishedYear ? `· Est. ${apiCollege.establishedYear}` : ""}
                  </span>
                  {apiCollege.ownership && (
                    <span className="px-2.5 py-0.5 rounded-full text-white bg-slate-700/80" style={{ fontSize: "11px", fontWeight: 600 }}>
                      {apiCollege.ownership}
                    </span>
                  )}
                  {apiCollege.naacGrade && (
                    <span className="px-2.5 py-0.5 rounded-full text-white bg-[#F0AE1A]" style={{ fontSize: "11px", fontWeight: 700 }}>
                      NAAC {apiCollege.naacGrade}
                    </span>
                  )}
                  {matchData?.matchScore && (
                    <span className="px-2.5 py-0.5 rounded-full text-white bg-[#F0AE1A] inline-flex items-center gap-1" style={{ fontSize: "11px", fontWeight: 800 }}>
                      <Bot size={11} /> {matchData.matchScore}% AI Match
                    </span>
                  )}
                </div>

                <h1 className="text-white mb-2" style={{ fontSize: "clamp(20px,3.2vw,32px)", fontWeight: 800 }}>
                  {apiCollege.name}
                </h1>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1 text-white/90">
                    <MapPin size={14} className="text-[#F0AE1A]" />
                    <span style={{ fontSize: "13px" }}>
                      {apiCollege.city}, {apiCollege.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star size={14} className="fill-[#F0AE1A] text-[#F0AE1A]" />
                    <span className="text-white" style={{ fontSize: "13px", fontWeight: 700 }}>
                      {apiCollege.rating ? apiCollege.rating.toFixed(1) : "4.2"}
                    </span>
                    <span className="text-white/70" style={{ fontSize: "12px" }}>
                      ({apiCollege._count?.applications ? `${apiCollege._count.applications * 12}+ reviews` : "Verified Institution"})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Apply & Save Buttons on banner */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {apiCollege.brochureUrl && (
                <a
                  href={apiCollege.brochureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-4 py-3 rounded-xl font-bold text-sm shadow-md transition-all inline-flex items-center gap-2 bg-[#F0AE1A] hover:bg-[#d99b14] text-white"
                >
                  <Download size={16} /> Download Brochure
                </a>
              )}
              <button
                type="button"
                onClick={handleToggleSave}
                disabled={toggleSaveMutation.isPending}
                className={`px-4 py-3 rounded-xl font-bold text-sm shadow-md transition-all inline-flex items-center gap-2 backdrop-blur-sm border ${
                  isSaved
                    ? "bg-[#4A7B5B] text-white border-[#4A7B5B]"
                    : "bg-white/15 text-white hover:bg-white/25 border-white/25"
                }`}
              >
                <Bookmark size={16} className={isSaved ? "fill-white text-white" : "text-white"} />
                {toggleSaveMutation.isPending ? "..." : isSaved ? "Saved" : "Save College"}
              </button>
              <div className="hidden sm:block">
                <Link
                  to="/apply-now"
                  className="px-6 py-3 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white rounded-xl font-bold text-sm shadow-lg transition-all inline-flex items-center gap-2"
                >
                  Apply for Admission <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Approvals */}
            {apiCollege.approvals && apiCollege.approvals.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-5">
                {apiCollege.approvals.map((a: string) => (
                  <span key={a} className="flex items-center gap-1 px-3 py-1.5 bg-[#E8F3EC] rounded-xl text-[#4A7B5B]" style={{ fontSize: "11px", fontWeight: 600 }}>
                    <CheckCircle2 size={12} /> {a}
                  </span>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-6 no-scrollbar border-b border-gray-200">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-4 py-2.5 rounded-t-lg text-sm whitespace-nowrap transition-colors shrink-0 ${
                    activeTab === t
                      ? "text-[#4A7B5B] border-b-2 border-[#4A7B5B] font-bold"
                      : "text-gray-500 hover:text-gray-800 font-medium"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* 1. OVERVIEW TAB */}
            {activeTab === "Overview" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="mb-3 font-bold text-base text-[#4A7B5B] flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#4A7B5B]" /> About the College
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{collegeDesc}</p>
                </div>

                {/* Overview Highlights Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { Icon: Building2, label: "Ownership / Type", value: `${apiCollege.ownership || "Private"} · ${apiCollege.type || ""}` },
                    { Icon: Award, label: "NAAC Grade", value: apiCollege.naacGrade ? `Grade ${apiCollege.naacGrade}` : "Accredited" },
                    { Icon: IndianRupee, label: "Annual Fees Range", value: formatFees() },
                    { Icon: Users, label: "Placement Rate", value: apiCollege.placementPercentage ? `${apiCollege.placementPercentage}%` : "85%+" },
                  ].map(({ Icon, label, value }) => (
                    <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                      <div className="w-9 h-9 bg-[#E8F3EC] rounded-xl flex items-center justify-center mb-2">
                        <Icon size={16} className="text-[#4A7B5B]" />
                      </div>
                      <div className="text-xs text-gray-400 font-medium">{label}</div>
                      <div className="text-sm font-bold text-[#4A7B5B] mt-0.5 truncate">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Location & Contact Information */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-bold text-base text-[#4A7B5B] flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#4A7B5B]" /> Contact & Campus Location
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-[#4A7B5B] mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold block text-gray-800">Campus Address:</span>
                        <span>{apiCollege.address || `${apiCollege.city}, ${apiCollege.state}`} {apiCollege.pincode ? `– ${apiCollege.pincode}` : ""}</span>
                      </div>
                    </div>
                    {apiCollege.website && (
                      <div className="flex items-start gap-2.5">
                        <Globe className="w-4 h-4 text-[#4A7B5B] mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold block text-gray-800">Official Website:</span>
                          <a href={apiCollege.website} target="_blank" rel="noopener noreferrer" className="text-[#4A7B5B] hover:underline break-all">
                            {apiCollege.website}
                          </a>
                        </div>
                      </div>
                    )}
                    {apiCollege.email && (
                      <div className="flex items-start gap-2.5">
                        <Mail className="w-4 h-4 text-[#4A7B5B] mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold block text-gray-800">Admissions Email:</span>
                          <a href={`mailto:${apiCollege.email}`} className="text-[#4A7B5B] hover:underline">
                            {apiCollege.email}
                          </a>
                        </div>
                      </div>
                    )}
                    {apiCollege.phone && (
                      <div className="flex items-start gap-2.5">
                        <Phone className="w-4 h-4 text-[#4A7B5B] mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold block text-gray-800">Helpline / Phone:</span>
                          <span>{apiCollege.phone}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. COURSES & FEES TAB */}
            {activeTab === "Courses & Fees" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-base text-[#4A7B5B]">Academic Programs & Fee Structure</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Explore available courses, degrees, eligibility, and fee structure</p>
                  </div>
                  <span className="px-3 py-1 bg-[#E8F3EC] text-[#4A7B5B] text-xs font-semibold rounded-lg">
                    {apiCollege.courses?.length || 0} Programs Listed
                  </span>
                </div>

                {!apiCollege.courses || apiCollege.courses.length === 0 ? (
                  <div className="text-center py-12 px-4 text-gray-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#4A7B5B]" />
                    <p className="text-sm font-medium text-gray-600">No courses listed yet for this college.</p>
                    <p className="text-xs text-gray-400 mt-1">Please talk to a counselor or check back shortly for updated offerings.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {apiCollege.courses.map((c: any) => {
                      const displayFees =
                        c.totalFees && c.totalFees > 0
                          ? `₹${(c.totalFees >= 100000 ? (c.totalFees / 100000).toFixed(1) + " Lakhs" : c.totalFees.toLocaleString())}`
                          : c.fees
                            ? typeof c.fees === "number" ? `₹${c.fees.toLocaleString()}` : c.fees
                            : "Contact for Fees";

                      return (
                        <div key={c.id || c.name} className="p-5 hover:bg-[#F8FAFC] transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                              <div className="w-10 h-10 bg-[#E8F3EC] rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                <BookOpen size={18} className="text-[#4A7B5B]" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-base text-[#4A7B5B]">{c.name}</h4>
                                  {c.level && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">
                                      {c.level}
                                    </span>
                                  )}
                                  {c.specialization && (
                                    <span className="px-2 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] text-[10px] font-semibold rounded">
                                      {c.specialization}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                                  <span>Duration: {c.duration || "4 Years"}</span>
                                  {c.seats && <span>· Intake: {c.seats} Seats</span>}
                                  {c.semesterFees && <span>· Semester Fee: ₹{c.semesterFees.toLocaleString()}</span>}
                                </div>
                                {c.eligibility && (
                                  <div className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <span className="font-semibold text-gray-700">Eligibility: </span> {c.eligibility}
                                  </div>
                                )}
                                {c.scholarshipInfo && (
                                  <div className="text-xs text-[#4A7B5B] mt-1 flex items-center gap-1 font-medium">
                                    <Sparkles size={12} /> {c.scholarshipInfo}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="sm:text-right shrink-0">
                              <div className="text-base font-bold text-[#4A7B5B]">{displayFees}</div>
                              <div className="text-[11px] text-gray-400 mb-2">Total Program Fee</div>
                              <Link
                                to="/apply-now"
                                className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#4A7B5B] text-white rounded-lg text-xs font-semibold hover:bg-[#3d6b4d] transition-colors"
                              >
                                Apply Now <ArrowRight size={12} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. HOSTEL TAB */}
            {activeTab === "Hostel" && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-base text-[#4A7B5B] mb-4 flex items-center gap-2">
                    <Home className="w-5 h-5 text-[#4A7B5B]" /> Residential & Hostel Facilities
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className={`p-5 rounded-2xl border ${apiCollege.boysHostelAvailable || hostelAvailable ? "bg-[#E8F3EC] border-[#4A7B5B]/30" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <Home size={18} className={apiCollege.boysHostelAvailable || hostelAvailable ? "text-[#4A7B5B]" : "text-gray-400"} />
                        <span className="font-bold text-sm text-[#4A7B5B]">Boys Hostel</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-600">
                        {apiCollege.boysHostelAvailable || hostelAvailable ? "Available on Campus" : "Not Available"}
                      </span>
                    </div>

                    <div className={`p-5 rounded-2xl border ${apiCollege.girlsHostelAvailable || hostelAvailable ? "bg-[#E8F3EC] border-[#4A7B5B]/30" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <Home size={18} className={apiCollege.girlsHostelAvailable || hostelAvailable ? "text-[#4A7B5B]" : "text-gray-400"} />
                        <span className="font-bold text-sm text-[#4A7B5B]">Girls Hostel</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-600">
                        {apiCollege.girlsHostelAvailable || hostelAvailable ? "Available on Campus (24/7 Security)" : "Not Available"}
                      </span>
                    </div>
                  </div>

                  {apiCollege.hostelFee && (
                    <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-gray-100 mb-5">
                      <div className="text-xs text-gray-400 font-medium">Annual Hostel & Accommodation Fee</div>
                      <div className="text-lg font-bold text-[#4A7B5B] mt-0.5">{apiCollege.hostelFee}</div>
                    </div>
                  )}

                  {apiCollege.hostelFacilities && apiCollege.hostelFacilities.length > 0 && (
                    <div className="mb-5">
                      <h4 className="text-sm font-semibold text-gray-800 mb-2.5">Hostel Amenities:</h4>
                      <div className="flex flex-wrap gap-2">
                        {apiCollege.hostelFacilities.map((f: string) => (
                          <span key={f} className="px-3 py-1.5 bg-[#F1F5F9] text-gray-700 rounded-xl text-xs font-medium border border-gray-200 flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-[#4A7B5B]" /> {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {apiCollege.messInfo && (
                    <div className="p-4 bg-[#FFFBEB] rounded-2xl border border-[#FDE68A]">
                      <h4 className="text-xs font-bold text-[#B45309] uppercase tracking-wider mb-1">Mess & Dining Info</h4>
                      <p className="text-sm text-[#78350F]">{apiCollege.messInfo}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. PLACEMENT TAB */}
            {activeTab === "Placement" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                    <div className="text-2xl font-black text-[#4A7B5B]">
                      {apiCollege.averagePackage ? `₹${apiCollege.averagePackage} LPA` : "₹6.5 LPA"}
                    </div>
                    <div className="text-xs text-gray-400 font-medium mt-1">Average CTC Package</div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                    <div className="text-2xl font-black text-[#4A7B5B]">
                      {apiCollege.highestPackage ? `₹${apiCollege.highestPackage} LPA` : "₹28+ LPA"}
                    </div>
                    <div className="text-xs text-gray-400 font-medium mt-1">Highest Domestic CTC</div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                    <div className="text-2xl font-black text-[#4A7B5B]">
                      {apiCollege.placementPercentage ? `${apiCollege.placementPercentage}%` : "85%+"}
                    </div>
                    <div className="text-xs text-gray-400 font-medium mt-1">
                      Placement Rate {apiCollege.placementYear ? `(${apiCollege.placementYear})` : ""}
                    </div>
                  </div>
                </div>

                {apiCollege.placementInfo && (
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-base text-[#4A7B5B] mb-2">Placement Highlights</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{apiCollege.placementInfo}</p>
                  </div>
                )}

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-base text-[#4A7B5B] mb-4">Top Recruiting Partners</h3>
                  {placementCompanies.length === 0 ? (
                    <div className="text-sm text-gray-400 py-3">Leading tech and core companies participate in annual recruitment.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {placementCompanies.map((c: string) => (
                        <span key={c} className="px-3.5 py-1.5 bg-[#F8FAFC] border border-gray-200 rounded-xl text-xs font-semibold text-gray-700">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. STUDY MATERIALS TAB */}
            {activeTab === "Study Materials" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-base text-[#4A7B5B] mb-4 flex items-center gap-2">
                    <BookOpen size={18} className="text-[#4A7B5B]" /> Linked Study Materials & Notes
                  </h3>

                  {linkedMaterials.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#4A7B5B]" />
                      <p className="text-sm font-medium text-gray-600">No study materials linked to this college yet.</p>
                      <Link to="/study-materials" className="text-sm text-[#4A7B5B] font-semibold hover:underline mt-2 inline-block">
                        Browse Swayam Study Library →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {linkedMaterials.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-xl hover:bg-[#EFF6F1] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#E8F3EC] flex items-center justify-center shrink-0">
                              <FileText size={16} className="text-[#4A7B5B]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#4A7B5B] line-clamp-1">{m.title}</p>
                              <p className="text-xs text-gray-400">
                                {m.materialType || "Notes"} · {m.category || "General"} {m.subject ? `· ${m.subject}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {m.downloadCount !== undefined && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Download size={12} /> {m.downloadCount}
                              </span>
                            )}
                            {m.fileUrl && (
                              <a
                                href={m.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => studyMaterialsApi.trackDownload(m.id)}
                                className="px-3.5 py-1.5 bg-[#4A7B5B] text-white text-xs font-semibold rounded-lg hover:bg-[#3d6b4d] transition-colors"
                              >
                                Download
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 text-center">
                        <Link to="/study-materials" className="text-xs text-[#4A7B5B] font-bold hover:underline">
                          View All Free Engineering & Medical Study Materials →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. GALLERY TAB */}
            {activeTab === "Gallery" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-base text-[#4A7B5B] mb-4 flex items-center gap-2">
                    <ImageIcon size={18} className="text-[#4A7B5B]" /> Campus Photo Gallery
                  </h3>

                  {galleryItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#4A7B5B]" />
                      <p className="text-sm font-medium text-gray-600">No campus photos uploaded yet.</p>
                      <p className="text-xs text-gray-400 mt-1">Verified campus photographs will appear here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                      {galleryItems.map((img: any, i: number) => (
                        <div
                          key={img.id || i}
                          onClick={() => setSelectedGalleryImg(img.imageUrl)}
                          className="aspect-video rounded-2xl overflow-hidden cursor-pointer relative group bg-gray-100 border border-gray-200"
                        >
                          <ImageWithFallback
                            src={img.imageUrl}
                            alt={img.caption || `${apiCollege.name} Gallery ${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {img.caption && (
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-black/60 text-white text-[11px] font-medium truncate backdrop-blur-xs">
                              {img.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-4 shrink-0">
            {/* Quick action application card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-20">
              <div className="text-center mb-4">
                <div className="text-2xl font-black text-[#4A7B5B]">{formatFees()}</div>
                <div className="text-xs text-gray-400 mt-0.5">Indicative Annual Fees</div>
              </div>

              <Link
                to="/apply-now"
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white rounded-xl transition-all shadow-md mb-2 font-bold text-sm"
              >
                Apply Now <ArrowRight size={15} />
              </Link>

              {apiCollege.brochureUrl && (
                <a
                  href={apiCollege.brochureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#EFF6F1] hover:bg-[#E2EFE5] text-[#4A7B5B] border border-[#4A7B5B]/30 rounded-xl transition-all mb-2 font-bold text-sm"
                >
                  <Download size={15} /> Download Brochure
                </a>
              )}

              <button
                type="button"
                onClick={handleToggleSave}
                disabled={toggleSaveMutation.isPending}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all mb-2.5 ${
                  isSaved
                    ? "bg-[#E8F3EC] text-[#4A7B5B] border-[#4A7B5B]"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Bookmark size={15} className={isSaved ? "fill-[#4A7B5B] text-[#4A7B5B]" : "text-gray-500"} />
                {toggleSaveMutation.isPending ? "Updating..." : isSaved ? "Saved to My Shortlist" : "Bookmark & Save"}
              </button>

              <a
                href={apiCollege.phone ? `tel:${apiCollege.phone}` : "tel:+919000000000"}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium mb-4"
              >
                <Phone size={14} /> Talk to Counselor
              </a>

              <div className="space-y-2.5 pt-3 border-t border-gray-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Quality Rating</span>
                  <span className="font-bold text-[#4A7B5B]">{apiCollege.rating ? `${apiCollege.rating.toFixed(1)} / 5.0 ★` : "4.2 / 5.0 ★"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Institution Type</span>
                  <span className="font-semibold text-gray-700 capitalize">{apiCollege.type?.toLowerCase() || "College"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">State / Region</span>
                  <span className="font-semibold text-gray-700">{apiCollege.city}, {apiCollege.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Hostel</span>
                  <span className="font-semibold text-[#4A7B5B]">{hostelAvailable ? "Available" : "No"}</span>
                </div>
              </div>
            </div>

            {/* AI Admission Guidance Card */}
            <div className="bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] rounded-2xl p-5 text-white shadow-md">
              <div className="flex items-center gap-2 mb-2.5">
                <Bot size={20} className="text-[#F0AE1A]" />
                <span className="font-bold text-sm text-[#F0AE1A]">AI Admission Match</span>
              </div>
              <p className="text-white/80 text-xs leading-relaxed mb-4">
                {matchData?.matchReason ||
                  `Our AI career counselor analyzed ${apiCollege.name}'s curriculum, placement trends, and fee affordability to give you personalized guidance.`}
              </p>
              <Link
                to="/ai-counselor"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-[#4A7B5B] rounded-xl font-bold text-xs hover:bg-gray-50 transition-colors shadow-sm"
              >
                Ask AI Counselor about this College
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Gallery Images */}
      {selectedGalleryImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedGalleryImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black">
            <img src={selectedGalleryImg} alt="Preview" className="w-full h-full object-contain max-h-[85vh]" />
            <button
              onClick={() => setSelectedGalleryImg(null)}
              className="absolute top-4 right-4 bg-white/20 text-white hover:bg-white/40 rounded-full w-8 h-8 flex items-center justify-center font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
