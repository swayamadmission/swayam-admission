import React, { useState } from "react";
import { Link, useParams } from "react-router";
import { MapPin, Star, Phone, CheckCircle2, Bot, ArrowRight, Building2, Users, Award, BookOpen, IndianRupee, Home, Briefcase, FileText, Download } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

import { useQuery } from "@tanstack/react-query";
import { collegesApi } from "../../api/colleges.api";
import { recommendationApi } from "../../api/recommendation.api";
import { studyMaterialsApi, StudyMaterial } from "../../api/study-materials.api";
import { useAuth as useAuthContext } from "../../context/AuthContext";

const DEFAULT_COLLEGE = { 
  name:"Loading...", city:"India", state:"India", rating:4.2, reviews:500, fees:"₹1.5L–₹3L/yr", 
  type:"Private", established:2000, approvals:["UGC","AICTE"], img:"https://images.unsplash.com/photo-1777654770487-b49bb24f61ec?w=800&q=80", 
  desc:"A premier educational institution offering world-class programs and facilities for students across India.", 
  courses:[{name:"B.Tech",fees:"₹1.8L/yr",seats:120,duration:"4 Yrs"},{name:"MBA",fees:"₹2.5L/yr",seats:60,duration:"2 Yrs"},{name:"BCA",fees:"₹80K/yr",seats:60,duration:"3 Yrs"}], 
  placement:{avg:"₹6.5 LPA",highest:"₹28 LPA",placed:"85%",companies:["TCS","Wipro","Infosys","HCL","Capgemini"]}, 
  hostel:{boys:true,girls:true,fee:"₹50K–₹80K/yr"} 
};

const TABS = ["Overview","Courses & Fees","Hostel","Placement","Study Materials","Gallery"];

export default function CollegeDetailPage() {
  const { id } = useParams();
  const { isLoggedIn } = useAuthContext();
  
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
  
  // Merge API data with default layout data since some fields may be missing from DB schema
  const college = apiCollege ? {
    ...DEFAULT_COLLEGE,
    ...apiCollege,
    approvals: apiCollege.approvals || DEFAULT_COLLEGE.approvals,
    img: apiCollege.img || apiCollege.banner || DEFAULT_COLLEGE.img,
    desc: (apiCollege as any).fullDescription || (apiCollege as any).shortDescription || DEFAULT_COLLEGE.desc,
    fees: apiCollege.totalFees ? `₹${apiCollege.totalFees}/yr` : DEFAULT_COLLEGE.fees,
    courses: apiCollege.courses?.length ? apiCollege.courses : DEFAULT_COLLEGE.courses,
    placement: {
      avg: (apiCollege as any).averagePackage ? `₹${(apiCollege as any).averagePackage} LPA` : DEFAULT_COLLEGE.placement.avg,
      highest: (apiCollege as any).highestPackage ? `₹${(apiCollege as any).highestPackage} LPA` : DEFAULT_COLLEGE.placement.highest,
      placed: (apiCollege as any).placementPercentage ? `${(apiCollege as any).placementPercentage}%` : DEFAULT_COLLEGE.placement.placed,
      companies: DEFAULT_COLLEGE.placement.companies,
    },
    hostel: {
      boys: apiCollege.hasHostel,
      girls: apiCollege.hasHostel,
      fee: DEFAULT_COLLEGE.hostel.fee,
    }
  } : DEFAULT_COLLEGE;

  const [activeTab, setActiveTab] = useState("Overview");

  if (isLoading) {
    return <div className="text-center py-20 text-gray-500">Loading college details...</div>;
  }

  return (
    <div style={{ backgroundColor: "#F8FAFC" }}>
      {/* Banner */}
      <div className="relative h-56 sm:h-72 overflow-hidden">
        <ImageWithFallback src={college.img} alt={college.name} className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-6 max-w-7xl mx-auto">
          <div className="flex items-end justify-between">
            <div>
              <span className={`px-2 py-0.5 rounded-full text-white mb-2 inline-block ${college.type==="Government"?"bg-[#4A7B5B]":"bg-[#3B82F6]"}`} style={{fontSize:"10px",fontWeight:600}}>{college.type} · Est. {college.established}</span>
              {matchData?.matchScore && (
                <span className="px-2 py-0.5 ml-2 rounded-full text-white bg-[#F0AE1A] mb-2 inline-flex items-center gap-1" style={{fontSize:"10px",fontWeight:800}}><Bot size={11} /> {matchData.matchScore}% AI Match</span>
              )}
              <h1 className="text-white mb-1" style={{fontSize:"clamp(18px,3vw,28px)",fontWeight:800}}>{college.name}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 text-white/80">
                  <MapPin size={13}/><span style={{fontSize:"12px"}}>{college.city}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={13} className="fill-[#F0AE1A] text-[#F0AE1A]"/>
                  <span className="text-white" style={{fontSize:"13px",fontWeight:700}}>{college.rating}</span>
                  <span className="text-white/60" style={{fontSize:"12px"}}>({college.reviews.toLocaleString()} reviews)</span>
                </div>
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
            <div className="flex items-center gap-2 flex-wrap mb-5">
              {college.approvals.map((a: string) => (
                <span key={a} className="flex items-center gap-1 px-3 py-1.5 bg-[#E8F3EC] rounded-xl" style={{fontSize:"11px",fontWeight:600,color:"#4A7B5B"}}>
                  <CheckCircle2 size={11}/>{a}
                </span>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-6 no-scrollbar border-b border-gray-100">
              {TABS.map(t=>(
                <button key={t} onClick={()=>setActiveTab(t)}
                  className={`px-4 py-2.5 rounded-t-lg text-sm whitespace-nowrap transition-colors shrink-0 ${activeTab===t?"text-[#4A7B5B] border-b-2 border-[#4A7B5B]":"text-gray-500 hover:text-gray-700"}`}
                  style={{fontWeight:activeTab===t?600:400}}>
                  {t}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === "Overview" && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-3" style={{fontSize:"16px",fontWeight:700,color:"#0F172A"}}>About the College</h3>
                  <p style={{fontSize:"14px",color:"#4B5563",lineHeight:1.7}}>{college.desc}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {Icon:Building2,label:"Type",value:college.type},
                    {Icon:Award,label:"NAAC Grade",value:college.approvals.find((a:string)=>a.startsWith("NAAC"))?.replace("NAAC ","A")||"A"},
                    {Icon:IndianRupee,label:"Annual Fees",value:college.fees},
                    {Icon:Users,label:"Placement",value:college.placement.placed},
                  ].map(({Icon,label,value})=>(
                    <div key={label} className="bg-[#F8FAFC] rounded-2xl p-4 border border-gray-100">
                      <div className="w-9 h-9 bg-[#E8F3EC] rounded-xl flex items-center justify-center mb-2">
                        <Icon size={16} className="text-[#4A7B5B]"/>
                      </div>
                      <div style={{fontSize:"11px",color:"#94a3b8"}}>{label}</div>
                      <div style={{fontSize:"14px",fontWeight:700,color:"#0F172A"}}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Courses & Fees */}
            {activeTab === "Courses & Fees" && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 style={{fontSize:"16px",fontWeight:700,color:"#0F172A"}}>Available Courses & Fees</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {college.courses.map((c: any) => (
                    <div key={c.name} className="flex items-center justify-between p-4 hover:bg-[#F8FAFC] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#E8F3EC] rounded-xl flex items-center justify-center shrink-0">
                          <BookOpen size={15} className="text-[#4A7B5B]"/>
                        </div>
                        <div>
                          <div style={{fontSize:"14px",fontWeight:600,color:"#0F172A"}}>{c.name}</div>
                          <div style={{fontSize:"11px",color:"#94a3b8"}}>{c.duration} · {c.seats} seats</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div style={{fontSize:"14px",fontWeight:700,color:"#4A7B5B"}}>{c.fees}</div>
                        <Link to="/apply-now" className="text-xs text-[#4A7B5B] hover:underline">Apply →</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hostel */}
            {activeTab === "Hostel" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-4" style={{fontSize:"16px",fontWeight:700,color:"#0F172A"}}>Hostel Facilities</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[{label:"Boys Hostel",available:college.hostel.boys},{label:"Girls Hostel",available:college.hostel.girls}].map(h=>(
                      <div key={h.label} className={`p-4 rounded-2xl border ${h.available?"bg-[#E8F3EC] border-[#4A7B5B]/20":"bg-gray-50 border-gray-200"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Home size={16} className={h.available?"text-[#4A7B5B]":"text-gray-400"}/>
                          <span style={{fontSize:"14px",fontWeight:600,color:h.available?"#4A7B5B":"#9ca3af"}}>{h.label}</span>
                        </div>
                        <span style={{fontSize:"12px",color:h.available?"#4A7B5B":"#9ca3af"}}>{h.available?"Available":"Not Available"}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-[#F8FAFC] rounded-2xl">
                    <div style={{fontSize:"12px",color:"#94a3b8"}}>Annual Hostel Fee</div>
                    <div style={{fontSize:"18px",fontWeight:700,color:"#0F172A"}}>{college.hostel.fee}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Placement */}
            {activeTab === "Placement" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {[{label:"Avg Package",value:college.placement.avg},{label:"Highest Package",value:college.placement.highest},{label:"Placement Rate",value:college.placement.placed}].map(s=>(
                    <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 text-center">
                      <div style={{fontSize:"22px",fontWeight:800,color:"#4A7B5B"}}>{s.value}</div>
                      <div style={{fontSize:"11px",color:"#94a3b8"}} className="mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-4" style={{fontSize:"15px",fontWeight:700,color:"#0F172A"}}>Top Recruiters</h3>
                  <div className="flex flex-wrap gap-2">
                    {college.placement.companies.map((c: string) => (
                      <span key={c} className="px-3 py-1.5 bg-[#F8FAFC] border border-gray-200 rounded-xl" style={{fontSize:"12px",fontWeight:600,color:"#374151"}}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Study Materials */}
            {activeTab === "Study Materials" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-4 flex items-center gap-2" style={{fontSize:"16px",fontWeight:700,color:"#0F172A"}}>
                    <BookOpen size={16} className="text-[#4A7B5B]"/>
                    Study Resources
                  </h3>
                  {!materialsRes?.data?.data?.length ? (
                    <div className="text-center py-8 text-[#94A3B8]">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No study materials linked to this college yet.</p>
                      <Link to="/study-materials" className="text-sm text-[#4A7B5B] font-semibold hover:underline mt-1 inline-block">Browse All Materials →</Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(materialsRes?.data?.data ?? []).map((m: StudyMaterial) => (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl hover:bg-[#EFF6F1] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor:"#E8F3EC"}}>
                              <FileText size={14} className="text-[#4A7B5B]"/>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#0F172A] line-clamp-1">{m.title}</p>
                              <p className="text-xs text-[#94A3B8]">{m.materialType} · {m.category} {m.subject ? `· ${m.subject}` : ""}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#94A3B8] flex items-center gap-1"><Download size={11}/>{m.downloadCount}</span>
                            {m.fileUrl && (
                              <a
                                href={m.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => studyMaterialsApi.trackDownload(m.id)}
                                className="px-3 py-1.5 bg-[#4A7B5B] text-white text-xs font-semibold rounded-lg hover:bg-[#3d6b4d] transition-colors"
                              >
                                {m.premium ? "Unlock" : "Download"}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                      <Link to="/study-materials" className="flex items-center justify-center gap-1 text-sm text-[#4A7B5B] font-semibold py-2 hover:underline">
                        View All Materials →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gallery */}
            {activeTab === "Gallery" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=300&q=80",
                  "https://images.unsplash.com/photo-1759562588736-186cce2c26b5?w=300&q=80",
                  "https://images.unsplash.com/photo-1777654770487-b49bb24f61ec?w=300&q=80",
                  "https://images.unsplash.com/photo-1758292109543-a5c7f0c4cb9b?w=300&q=80",
                  "https://images.unsplash.com/photo-1770967004881-5e8795cb5fde?w=300&q=80",
                  "https://images.unsplash.com/photo-1663845444742-17a059b56b3a?w=300&q=80",
                ].map((img,i)=>(
                  <div key={i} className="aspect-video rounded-2xl overflow-hidden">
                    <ImageWithFallback src={img} alt={`Gallery ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"/>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-72 space-y-4 shrink-0">
            {/* Apply card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-20">
              <div className="text-center mb-4">
                <div style={{fontSize:"24px",fontWeight:800,color:"#4A7B5B"}}>{college.fees}</div>
                <div style={{fontSize:"11px",color:"#94a3b8"}}>Annual Fees Range</div>
              </div>
              <Link to="/apply-now" className="w-full flex items-center justify-center gap-2 py-3 bg-[#4A7B5B] text-white rounded-xl hover:bg-[#3d6b4d] transition-colors mb-3" style={{fontWeight:600,fontSize:"14px"}}>
                Apply Now <ArrowRight size={15}/>
              </Link>
              <a href="tel:+919000000000" className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors mb-4" style={{fontSize:"14px"}}>
                <Phone size={14}/> Talk to Counselor
              </a>
              <div className="space-y-2.5">
                {[{label:"Rating",value:`${college.rating}/5`},{label:"Type",value:college.type},{label:"Location",value:college.city}].map(i=>(
                  <div key={i.label} className="flex justify-between">
                    <span style={{fontSize:"12px",color:"#94a3b8"}}>{i.label}</span>
                    <span style={{fontSize:"12px",fontWeight:600,color:"#0F172A"}}>{i.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI recommendation */}
            <div className="bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Bot size={18} className="text-[#F0AE1A]"/>
                <span className="text-white" style={{fontSize:"13px",fontWeight:700}}>AI Insights</span>
              </div>
              <p className="text-white/80 mb-4" style={{fontSize:"12px",lineHeight:1.6}}>
                {matchData?.matchReason || "Get personalized insights about this college based on your profile and career goals."}
              </p>
              {!matchData && (
                <Link to="/ai-counselor" className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-[#4A7B5B] rounded-xl hover:bg-gray-50 transition-colors" style={{fontWeight:600,fontSize:"13px"}}>
                  Get AI Suggestions
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
