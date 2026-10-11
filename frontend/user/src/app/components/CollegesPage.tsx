import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { Search, MapPin, Star, SlidersHorizontal, X, GraduationCap, Scale, Bookmark } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collegesApi, CollegeQueryParams } from "../../api/colleges.api";
import { geographyApi } from "../../api/geography.api";
import { usersApi } from "../../api/users.api";
import { useAuth as useAuthContext } from "../../context/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";
import PageBannerSlider from "./common/PageBannerSlider";

const COURSES_FILTER = ["All Courses","B.Tech","MBA","BCA","MCA","Nursing","Law","BBA","Hotel Management"];
const TYPES = ["All Types","Government","Private","Deemed"];
const OWNERSHIPS = ["All Ownerships", "Public", "Private", "Trust"];

export default function CollegesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultSearch = searchParams.get("q") || "";
  const defaultState = searchParams.get("state") || "All States";
  const defaultCity = searchParams.get("city") || "";

  const [search, setSearch] = useState(defaultSearch);
  const [stateFilter, setStateFilter] = useState(defaultState);
  const [cityFilter, setCityFilter] = useState(defaultCity);
  const [courseFilter, setCourseFilter] = useState("All Courses");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [ownershipFilter, setOwnershipFilter] = useState("All Ownerships");
  const [hostelRequired, setHostelRequired] = useState(false);
  const [budgetMax, setBudgetMax] = useState<number | "">("");
  
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(search, 500);

  const { data: dbStates = [] } = useQuery({
    queryKey: ["geography_states"],
    queryFn: () => geographyApi.getStates(),
  });
  const stateOptions = ["All States", ...dbStates.map((s) => s.name)];

  const queryParams: CollegeQueryParams = {};
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (stateFilter !== "All States") queryParams.state = stateFilter;
  if (cityFilter) queryParams.city = cityFilter;
  if (typeFilter !== "All Types") queryParams.type = typeFilter.toUpperCase();
  if (ownershipFilter !== "All Ownerships") queryParams.ownership = ownershipFilter;
  if (hostelRequired) queryParams.hostel = true;
  if (budgetMax !== "") queryParams.budgetMax = Number(budgetMax);

  const { data: collegesRes, isLoading } = useQuery({
    queryKey: ["colleges", queryParams],
    queryFn: () => collegesApi.findAll(queryParams),
  });

  const filtered = collegesRes?.data?.data || [];

  const hasFilters = stateFilter !== "All States" || cityFilter !== "" || courseFilter !== "All Courses" || typeFilter !== "All Types" || ownershipFilter !== "All Ownerships" || hostelRequired || budgetMax !== "";

  const [compareList, setCompareList] = useState<{id:string, name:string}[]>([]);

  const toggleCompare = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (compareList.find(c => c.id === id)) {
      setCompareList(compareList.filter(c => c.id !== id));
    } else {
      if (compareList.length >= 3) {
        alert("You can compare up to 3 colleges at a time.");
        return;
      }
      setCompareList([...compareList, { id, name }]);
    }
  };

  const handleCompare = () => {
    navigate(`/colleges/compare?ids=${compareList.map(c => c.id).join(",")}`);
  };

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
  const [savingCollegeId, setSavingCollegeId] = useState<string | null>(null);

  const toggleShortlistMutation = useMutation({
    mutationFn: (collegeId: string) => usersApi.toggleShortlist(collegeId),
    onSuccess: (res: any) => {
      const savedNow = res?.data?.saved ?? res?.data?.isSaved;
      if (savedNow) {
        toast.success("College saved to your shortlist!");
      } else {
        toast.success("College removed from shortlist");
      }
      queryClient.invalidateQueries({ queryKey: ["shortlist_ids"] });
      queryClient.invalidateQueries({ queryKey: ["shortlist"] });
      setSavingCollegeId(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update saved college");
      setSavingCollegeId(null);
    },
  });

  const handleToggleSave = (e: React.MouseEvent, collegeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      toast.error("Please login to save colleges to your shortlist");
      return;
    }
    setSavingCollegeId(collegeId);
    toggleShortlistMutation.mutate(collegeId);
  };

  return (
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "100vh", position: "relative", paddingBottom: "100px" }}>
      {/* Top Banner Slot (Navbar ke bilkul neeche) */}
      <PageBannerSlider slot="COLLEGES_TOP" />

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="mb-2" style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}}>Browse</div>
          <h1 className="mb-2" style={{fontWeight:800,color:"#4A7B5B",fontSize:"clamp(24px,4vw,36px)"}}>All Colleges</h1>
          <p style={{fontSize:"14px",color:"#64748b"}}>500+ verified colleges across India with detailed information and direct admission</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Search bar */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <Search size={16} className="text-gray-400 shrink-0"/>
            <input type="text" placeholder="Search colleges by name or city..." value={search} onChange={e=>setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"/>
          </div>
          <button onClick={()=>setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm transition-colors ${showFilters?"bg-[#4A7B5B] text-white border-[#4A7B5B]":"bg-white border-gray-200 text-gray-700 hover:border-[#4A7B5B]"}`}
            style={{fontWeight:600}}>
            <SlidersHorizontal size={15}/> Filters {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#F0AE1A]"/>}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              {label:"State",value:stateFilter,opts:stateOptions,set:setStateFilter},
              {label:"Course",value:courseFilter,opts:COURSES_FILTER,set:setCourseFilter},
              {label:"College Type",value:typeFilter,opts:TYPES,set:setTypeFilter},
              {label:"Ownership",value:ownershipFilter,opts:OWNERSHIPS,set:setOwnershipFilter},
            ].map(f=>(
              <div key={f.label}>
                <label style={{fontSize:"11px",fontWeight:600,color:"#94a3b8"}} className="block mb-1.5">{f.label.toUpperCase()}</label>
                <select value={f.value} onChange={e=>f.set(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-[#4A7B5B]">
                  {f.opts.map((o: string)=><option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            
            <div>
              <label style={{fontSize:"11px",fontWeight:600,color:"#94a3b8"}} className="block mb-1.5">MAX BUDGET (₹)</label>
              <input type="number" placeholder="e.g. 500000" value={budgetMax} onChange={e=>setBudgetMax(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-[#4A7B5B]"/>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="hostel" checked={hostelRequired} onChange={e=>setHostelRequired(e.target.checked)} className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"/>
              <label htmlFor="hostel" className="text-sm text-gray-700 font-medium">Hostel Available</label>
            </div>

            {hasFilters && (
              <div className="sm:col-span-4 flex justify-end">
                <button onClick={()=>{setStateFilter("All States");setCityFilter("");setCourseFilter("All Courses");setTypeFilter("All Types");setOwnershipFilter("All Ownerships");setHostelRequired(false);setBudgetMax("")}}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700">
                  <X size={13}/> Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active City Filter Badge */}
        {cityFilter && (
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F3EC] text-[#4A7B5B] rounded-full text-xs font-semibold">
              <MapPin size={11} /> City: {cityFilter}
              <button onClick={() => setCityFilter("")} className="hover:text-red-500 ml-1">
                <X size={12} />
              </button>
            </span>
          </div>
        )}

        <p className="mb-5" style={{fontSize:"13px",color:"#94a3b8"}}>
          {isLoading ? "Loading colleges..." : `${collegesRes?.data?.total || 0} colleges found`}
        </p>

        {/* College cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(c=>(
            <Link key={c.id} to={`/colleges/${c.id}`} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 relative">
              <div className="h-44 overflow-hidden relative">
                <ImageWithFallback src={c.banner || c.img || "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=400&q=80"} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"/>
                <div className="absolute top-3 left-3">
                  <span className={`px-2 py-0.5 rounded-full text-white ${c.type==="Government"?"bg-[#4A7B5B]":"bg-[#3B82F6]"}`} style={{fontSize:"9px",fontWeight:600}}>{c.type}</span>
                </div>
                <div className="absolute top-3 right-3 flex gap-1 flex-wrap justify-end">
                  {(c.approvals || []).slice(0,2).map(a=>(
                    <span key={a} className="px-2 py-0.5 bg-white/90 rounded-full text-gray-700" style={{fontSize:"9px",fontWeight:600}}>{a}</span>
                  ))}
                </div>
                {/* Actions: Save & Compare */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                  <button 
                    type="button"
                    onClick={(e) => handleToggleSave(e, c.id)}
                    disabled={savingCollegeId === c.id}
                    title={savedIds.includes(c.id) ? "Saved to your shortlist" : "Save to shortlist"}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1 ${
                      savedIds.includes(c.id)
                        ? "bg-[#4A7B5B] text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Bookmark size={13} className={savedIds.includes(c.id) ? "fill-white text-white" : "text-gray-600"} />
                    {savingCollegeId === c.id ? "..." : savedIds.includes(c.id) ? "Saved" : "Save"}
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => toggleCompare(e, c.id, c.name)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-md transition-colors ${compareList.find(item => item.id === c.id) ? "bg-[#F0AE1A] text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                  >
                    {compareList.find(item => item.id === c.id) ? "Comparing" : "+ Compare"}
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  {c.logo ? (
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-xs p-1 shrink-0 flex items-center justify-center overflow-hidden">
                      <img src={c.logo} alt={`${c.name} logo`} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] text-[#4A7B5B] font-bold text-xs shrink-0 flex items-center justify-center">
                      {c.name ? c.name.charAt(0) : "C"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-0.5 group-hover:text-[#4A7B5B] transition-colors line-clamp-1" style={{fontSize:"15px",fontWeight:700,color:"#4A7B5B"}}>{c.name}</h3>
                    <div className="flex items-center gap-1 text-gray-400">
                      <MapPin size={11}/><span style={{fontSize:"11px"}}>{c.city}, {c.state}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap mb-3">
                  {c.courses && c.courses.slice(0,3).map((co: any)=>(
                    <span key={co.id} className="px-2 py-0.5 bg-[#F8FAFC] border border-gray-100 text-gray-600 rounded-lg" style={{fontSize:"10px",fontWeight:500}}>{co.name}</span>
                  ))}
                  {c.courses && c.courses.length > 3 && <span className="px-2 py-0.5 bg-[#F8FAFC] border border-gray-100 text-gray-400 rounded-lg" style={{fontSize:"10px"}}>+{c.courses.length-3}</span>}
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div style={{fontSize:"10px",color:"#94a3b8"}}>Annual Fees</div>
                    <div style={{fontSize:"14px",fontWeight:700,color:"#4A7B5B"}}>₹1.2L–₹2.4L/yr</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="fill-[#F0AE1A] text-[#F0AE1A]"/>
                      <span style={{fontSize:"13px",fontWeight:700,color:"#4A7B5B"}}>{c.ranking || 4.5}</span>
                    </div>
                    <div style={{fontSize:"10px",color:"#94a3b8"}}>Verified</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="flex-1 text-center py-2 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl" style={{fontSize:"11px",fontWeight:600}}>View Details</span>
                  <Link to="/apply-now" onClick={e=>e.stopPropagation()} className="flex-1 text-center py-2 bg-[#4A7B5B] text-white rounded-xl hover:bg-[#3d6b4d] transition-colors" style={{fontSize:"11px",fontWeight:600}}>Apply Now</Link>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20">
            <GraduationCap size={44} className="text-gray-300 mx-auto mb-3"/>
            <p style={{fontSize:"16px",color:"#94a3b8"}}>No colleges found. Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      {/* Floating Compare Action Bar */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 transform transition-transform">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[#4A7B5B] font-bold">
                <Scale size={20} className="text-[#4A7B5B]" /> Compare ({compareList.length}/3)
              </div>
              <div className="hidden sm:flex gap-2">
                {compareList.map(c => (
                  <div key={c.id} className="flex items-center gap-2 bg-[#F8FAFC] border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700">
                    <span className="truncate max-w-[150px]">{c.name}</span>
                    <button onClick={(e) => toggleCompare(e, c.id, c.name)} className="text-gray-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setCompareList([])} className="text-sm text-gray-500 hover:text-red-500 font-medium">Clear All</button>
              <button 
                onClick={handleCompare}
                disabled={compareList.length < 2}
                className={`px-6 py-2.5 rounded-xl text-white font-bold transition-colors ${compareList.length >= 2 ? "bg-[#4A7B5B] hover:bg-[#3d6b4d]" : "bg-gray-300 cursor-not-allowed"}`}
              >
                Compare Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

