import { useState } from "react";
import { Search, Plus, MapPin, Star, Users, MoreHorizontal, LayoutGrid, Table2, Edit, Download, Upload, CheckCircle2, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collegesApi, CollegeQueryParams, College } from "../../api/colleges.api";
import { organizationApi, StateItem } from "../../api/organization.api";
import { useDebounce } from "../../hooks/useDebounce";
import CollegeFormModal from "./CollegeFormModal";
import CollegeDetailDrawer from "./CollegeDetailDrawer";
import BulkCollegeUploadModal from "./BulkCollegeUploadModal";

const TYPE_COLORS: Record<string, { bg: string, text: string }> = {
  GOVERNMENT: { bg: "#DBEAFE", text: "#2563EB" },
  PRIVATE: { bg: "#FEF3C7", text: "#D97706" },
  DEEMED: { bg: "#E8F3EC", text: "#4A7B5B" },
  AUTONOMOUS: { bg: "#F3E8FF", text: "#9333EA" }
};

export default function CollegesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedState, setSelectedState] = useState("All");
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);

  const queryClient = useQueryClient();
  const types = ["All", "GOVERNMENT", "PRIVATE", "DEEMED", "AUTONOMOUS"];

  const { data: statesRes } = useQuery({
    queryKey: ["geography_states"],
    queryFn: () => organizationApi.getStates(),
  });
  const statesList: StateItem[] = Array.isArray(statesRes) ? statesRes : (statesRes as any)?.data || [];

  const queryParams: CollegeQueryParams = { limit: 20 };
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (selectedType !== "All") queryParams.ownership = selectedType === "GOVERNMENT" ? "GOVERNMENT" : (selectedType === "PRIVATE" ? "PRIVATE" : undefined);
  if (selectedType === "DEEMED" || selectedType === "AUTONOMOUS") queryParams.type = selectedType;
  if (selectedState !== "All") queryParams.state = selectedState;

  const { data: statsRes } = useQuery({
    queryKey: ["admin_dashboard_metrics"],
    queryFn: () => collegesApi.getStats()
  });

  const { data: collegesRes, isLoading } = useQuery({
    queryKey: ["admin_colleges", queryParams],
    queryFn: () => collegesApi.findAll(queryParams),
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "PUBLISHED" | "DRAFT" }) =>
      collegesApi.setPublishStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_colleges"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
    },
  });

  const handleTogglePublish = (college: College, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = college.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    togglePublishMutation.mutate({ id: college.id, status: nextStatus });
  };

  const COLLEGES = collegesRes?.data?.data || [];
  const totalColleges = collegesRes?.data?.total || 0;
  const stats = statsRes?.data;

  const handleExport = async () => {
    try {
      const res = await collegesApi.findAll({ ...queryParams, limit: 10000 });
      const data = res.data.data;
      if (!data.length) return alert("No data to export");

      const csvRows = [
        ["ID", "Name", "City", "State", "Ownership", "Type", "NAAC", "Applications", "Status"],
        ...data.map(c => [
          c.id, 
          `"${c.name}"`, 
          c.city, 
          c.state, 
          c.ownership, 
          c.type, 
          c.naacGrade, 
          c._count?.applications || 0,
          c.status
        ])
      ];

      const csvString = csvRows.map(row => row.join(",")).join("\n");
      const blob = new Blob([csvString], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `colleges_export_${new Date().toISOString()}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      alert("Export failed");
    }
  };

  const openAdd = () => {
    setSelectedCollege(null);
    setIsFormOpen(true);
  };

  const openEdit = (c: College) => {
    setSelectedCollege(c);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const openView = (c: College) => {
    setSelectedCollege(c);
    setIsDetailOpen(true);
  };

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100%" }}>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Colleges", value: stats?.totalColleges || 0, sub: "Listed" },
          { label: "States Covered", value: stats?.statesCovered || 0, sub: "Across India" },
          { label: "Avg Rating", value: `${stats?.averageRating || 0}★`, sub: "Quality score" },
          { label: "Total Students", value: stats?.totalStudentsEnrolled || 0, sub: "Enrolled" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-[#F1F5F9]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="text-2xl font-semibold text-[#4A7B5B]">{s.value}</div>
            <div className="text-xs text-[#4A7B5B] font-medium mt-0.5">{s.label}</div>
            <div className="text-xs text-[#94A3B8]">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search colleges..."
              className="w-full sm:w-64 h-9 pl-9 pr-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>
          <div className="flex items-center bg-white rounded-xl p-0.5 border border-[#E2E8F0]">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                style={{ background: selectedType === t ? "#E8F3EC" : "transparent", color: selectedType === t ? "#4A7B5B" : "#94A3B8" }}
              >
                {t.toLowerCase()}
              </button>
            ))}
          </div>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] focus:outline-none focus:border-[#4A7B5B]"
          >
            <option value="All">All States</option>
            {statesList.map((st) => (
              <option key={st.id} value={st.name}>
                {st.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button 
            onClick={() => setIsBulkOpen(true)}
            className="h-9 px-3.5 rounded-xl border border-[#4A7B5B]/30 bg-[#E8F3EC] text-[#4A7B5B] text-sm font-semibold flex items-center gap-1.5 hover:bg-[#d8ebd2] transition-colors shadow-xs"
          >
            <Upload className="w-4 h-4" /> Bulk Upload Colleges
          </button>
          <button onClick={handleExport} className="h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white text-[#475569] text-sm font-medium flex items-center gap-1.5 hover:bg-[#F8FAFC]">
            <Download className="w-4 h-4" /> Export
          </button>
          <div className="flex items-center bg-[#F1F5F9] rounded-xl p-0.5">
            <button onClick={() => setView("grid")} className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs" style={{ background: view === "grid" ? "#fff" : "transparent", color: view === "grid" ? "#4A7B5B" : "#94A3B8" }}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setView("table")} className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs" style={{ background: view === "table" ? "#fff" : "transparent", color: view === "table" ? "#4A7B5B" : "#94A3B8" }}>
              <Table2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={openAdd} className="h-9 px-4 rounded-xl text-white text-sm font-medium flex items-center gap-1.5" style={{ background: "#4A7B5B" }}>
            <Plus className="w-3.5 h-3.5" /> Add College
          </button>
        </div>
      </div>

      {/* Grid view */}
      {view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading && <div className="col-span-full py-10 text-center text-gray-500">Loading colleges...</div>}
          {!isLoading && COLLEGES.length === 0 && <div className="col-span-full py-10 text-center text-gray-500">No colleges found.</div>}
          {!isLoading && COLLEGES.map(college => {
            const typeKey = college.ownership === 'GOVERNMENT' ? 'GOVERNMENT' : (college.type || 'PRIVATE').toUpperCase();
            const typeConf = TYPE_COLORS[typeKey] || TYPE_COLORS.PRIVATE;
            
            return (
              <div
                key={college.id}
                onClick={() => openView(college)}
                className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden cursor-pointer hover:shadow-md transition-all group relative"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {/* Card header */}
                <div
                  className="h-24 flex items-center justify-center relative overflow-hidden"
                  style={{ 
                    background: college.banner ? `url(${college.banner})` : "linear-gradient(135deg, #E8F3EC, #D1FAE5)",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="absolute inset-0 bg-black/10" />
                  {!college.banner && <span className="text-4xl relative z-10">🏛️</span>}
                  
                  {/* Status badge */}
                  <button
                    onClick={(e) => handleTogglePublish(college, e)}
                    title="Click to toggle publish status"
                    className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-semibold z-10 shadow-xs transition-transform hover:scale-105 ${
                      college.status === 'PUBLISHED'
                        ? 'bg-[#E8F3EC] text-[#4A7B5B] border border-[#A7D7B5]'
                        : 'bg-white/90 text-gray-700 border border-gray-200'
                    }`}
                  >
                    ● {college.status || 'DRAFT'}
                  </button>

                  {college.featured && (
                    <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium z-10" style={{ background: "#FEF3C7", color: "#D97706" }}>
                      ⭐ Featured
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      {college.logo && (
                         <div className="w-10 h-10 rounded-lg bg-white border border-[#F1F5F9] p-1 shrink-0 -mt-8 relative z-10 flex items-center justify-center">
                           <img src={college.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                         </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[#4A7B5B] text-sm font-medium leading-tight truncate">{college.name}</h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#94A3B8]" />
                          <span className="text-xs text-[#94A3B8] truncate">{college.city}, {college.state}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: typeConf.bg, color: typeConf.text }}>
                      {typeKey}
                    </span>
                    {college.naacGrade && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "#F1F5F9", color: "#64748B" }}>
                        NAAC {college.naacGrade}
                      </span>
                    )}
                  </div>

                  {/* Courses */}
                  <div className="flex gap-1 flex-wrap mb-3">
                    {college.courses && college.courses.slice(0, 3).map((c: any) => (
                      <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: "#E8F3EC", color: "#4A7B5B" }}>
                        {c.name}
                      </span>
                    ))}
                    {college.courses && college.courses.length > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#94A3B8]">
                        +{college.courses.length - 3}
                      </span>
                    )}
                    {(!college.courses || college.courses.length === 0) && (
                      <span className="text-[10px] text-[#94A3B8]">No courses listed</span>
                    )}
                  </div>

                  {/* Footer stats */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3" style={{ color: "#F0AE1A" }} />
                      <span className="text-xs font-medium text-[#4A7B5B]">{stats?.averageRating || "4.5"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#94A3B8]" />
                      <span className="text-xs text-[#64748B]">{college._count?.applications || 0} Apps</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(college); }} className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: "#4A7B5B" }}>
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table view */}
      {view === "table" && (
        <div className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #F1F5F9", background: "#FAFAFA" }}>
                  {["College", "Location", "Type", "Applications", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#94A3B8] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-500">Loading colleges...</td>
                  </tr>
                )}
                {!isLoading && COLLEGES.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-500">No colleges found.</td>
                  </tr>
                )}
                {!isLoading && COLLEGES.map((college, i) => {
                  const typeKey = college.ownership === 'GOVERNMENT' ? 'GOVERNMENT' : (college.type || 'PRIVATE').toUpperCase();
                  const typeConf = TYPE_COLORS[typeKey] || TYPE_COLORS.PRIVATE;
                  
                  return (
                    <tr key={college.id} className="hover:bg-[#F8FAFC] transition-colors group" style={{ borderBottom: i < COLLEGES.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                      <td className="px-5 py-3" onClick={() => openView(college)}>
                        <div className="flex items-center gap-3 cursor-pointer">
                          {college.logo ? (
                            <img src={college.logo} alt="logo" className="w-8 h-8 rounded border border-[#E2E8F0] object-contain bg-white" />
                          ) : (
                            <div className="w-8 h-8 rounded border border-[#E2E8F0] bg-gray-50 flex items-center justify-center text-lg">🏛️</div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-[#4A7B5B]">{college.name}</div>
                            <div className="text-xs text-[#94A3B8]">{college.university || 'No university'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-[#475569]">{college.city}, {college.state}</td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: typeConf.bg, color: typeConf.text }}>{typeKey}</span>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-[#475569]">
                        {college._count?.applications || 0}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={(e) => handleTogglePublish(college, e)}
                          title="Click to toggle publish status"
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium transition-all cursor-pointer ${
                            college.status === 'PUBLISHED'
                              ? 'bg-[#E8F3EC] text-[#4A7B5B] hover:bg-amber-100 hover:text-amber-800'
                              : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E8F3EC] hover:text-[#4A7B5B]'
                          }`}
                        >
                          ● {college.status || 'DRAFT'}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(college)} className="text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-[#E8F3EC] transition-colors" style={{ color: "#4A7B5B", border: "1px solid #E8F3EC" }}>Edit</button>
                          <button onClick={() => openView(college)} className="text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-[#F1F5F9] transition-colors" style={{ color: "#64748B", border: "1px solid #F1F5F9" }}>View</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CollegeFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        college={selectedCollege} 
      />
      
      <CollegeDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        college={selectedCollege}
        onEdit={openEdit}
      />

      <BulkCollegeUploadModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin_colleges"] });
          queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
        }}
      />
      
    </div>
  );
}
