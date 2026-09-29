import React, { useState, useMemo, useEffect } from "react";
import {
  MapPin,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Building2,
  GraduationCap,
  Award,
  BookOpen,
  Calendar,
  Layers,
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Info,
  ChevronRight,
  Filter,
  Globe,
  IndianRupee,
  AlertTriangle,
  Clock,
  Check,
  X,
  FileText,
  UploadCloud,
  FileCheck2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  organizationApi,
  StateItem,
  StateDetail,
  DistrictItem,
  StateUpdateItem,
} from "../../api/organization.api";
import { collegesApi, College } from "../../api/colleges.api";
import { scholarshipsApi, Scholarship } from "../../api/scholarships.api";
import { examsApi, Exam } from "../../api/exams.api";
import CollegeFormModal from "./CollegeFormModal";

// Indian Date Formatter (DD/MM/YYYY)
const formatDate = (dateStr?: string | null) => {
  if (!dateStr || dateStr === "Invalid Date") return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "—";
  }
};

export const isStatePublished = (status?: string | null) => {
  if (!status) return false;
  const upper = status.toUpperCase();
  return upper === "PUBLISHED" || upper === "ACTIVE";
};

// Indian Currency Formatter (₹)
const formatINR = (val?: number | string | null) => {
  if (val === undefined || val === null || val === "") return "—";
  const num = typeof val === "number" ? val : Number(val);
  if (isNaN(num)) return String(val);
  return `₹${num.toLocaleString("en-IN")}`;
};

const REGIONS = ["North", "South", "East", "West", "Central", "North-East", "Union Territory"];

const STATE_SECTIONS = [
  { id: "overview", label: "Overview", icon: Layers },
  { id: "colleges", label: "Colleges", icon: Building2 },
  { id: "scholarships", label: "Scholarships", icon: Award },
  { id: "exam", label: "Exam", icon: GraduationCap },
  { id: "cities", label: "Cities", icon: MapPin },
  { id: "updates", label: "Updates", icon: FileText },
] as const;

type SectionTab = (typeof STATE_SECTIONS)[number]["id"];

interface StatesManagementPageProps {
  onPageChange?: (page: string) => void;
}

export default function StatesManagementPage({ onPageChange }: StatesManagementPageProps) {
  const queryClient = useQueryClient();

  // Navigation & View state
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionTab>("overview");

  // Filtering states in list view
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [isStateModalOpen, setIsStateModalOpen] = useState(false);
  const [editingState, setEditingState] = useState<StateItem | StateDetail | null>(null);

  const [isDistrictModalOpen, setIsDistrictModalOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<DistrictItem | null>(null);

  const [isScholarshipModalOpen, setIsScholarshipModalOpen] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<StateUpdateItem | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "state" | "district" | "scholarship" | "exam" | "update";
    id: string;
    name: string;
  } | null>(null);

  // College Form Modal
  const [isCollegeModalOpen, setIsCollegeModalOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);

  // Query: States list with aggregated counts
  const {
    data: statesData,
    isLoading: isLoadingStates,
    refetch: refetchStates,
  } = useQuery({
    queryKey: ["admin_states_list"],
    queryFn: () => organizationApi.getStates(),
  });

  const statesList: StateItem[] = Array.isArray(statesData)
    ? statesData
    : (statesData as any)?.data || [];

  // Query: Currently selected state detailed record
  const {
    data: stateDetail,
    isLoading: isLoadingDetail,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ["admin_state_detail", selectedStateId],
    queryFn: () => organizationApi.getStateById(selectedStateId!),
    enabled: !!selectedStateId,
  });

  // Query: Colleges belonging to the selected state (Single source of truth)
  const [collegeSearch, setCollegeSearch] = useState("");
  const [collegeOwnershipFilter, setCollegeOwnershipFilter] = useState("ALL");
  const {
    data: collegesRes,
    isLoading: isLoadingColleges,
    refetch: refetchColleges,
  } = useQuery({
    queryKey: ["admin_state_colleges", stateDetail?.name],
    queryFn: () => collegesApi.findAll({ state: stateDetail?.name, limit: 100 }),
    enabled: !!stateDetail?.name && activeSection === "colleges",
  });

  // Query: Scholarships assigned to this state
  const [scholarshipSearch, setScholarshipSearch] = useState("");
  const {
    data: scholarshipsRes,
    isLoading: isLoadingScholarships,
    refetch: refetchScholarships,
  } = useQuery({
    queryKey: ["admin_state_scholarships", selectedStateId, stateDetail?.name],
    queryFn: () =>
      scholarshipsApi.findAll({
        state: stateDetail?.name,
        stateId: selectedStateId || undefined,
        limit: 100,
      }),
    enabled: !!stateDetail?.name && activeSection === "scholarships",
  });

  // Query: Exams assigned to this state
  const [examSearch, setExamSearch] = useState("");
  const {
    data: examsRes,
    isLoading: isLoadingExams,
    refetch: refetchExams,
  } = useQuery({
    queryKey: ["admin_state_exams", selectedStateId, stateDetail?.name],
    queryFn: () =>
      examsApi.findAll({
        state: stateDetail?.name,
        stateId: selectedStateId || undefined,
        limit: 100,
      }),
    enabled: !!stateDetail?.name && activeSection === "exam",
  });

  // Query: State Updates / News / Circulars
  const [updateSearch, setUpdateSearch] = useState("");
  const {
    data: updatesRes,
    isLoading: isLoadingUpdates,
    refetch: refetchUpdates,
  } = useQuery({
    queryKey: ["admin_state_updates", selectedStateId],
    queryFn: () => organizationApi.getStateUpdates({ stateId: selectedStateId! }),
    enabled: !!selectedStateId && activeSection === "updates",
  });

  // Query: Districts for this state
  const [districtSearch, setDistrictSearch] = useState("");
  const {
    data: districtsRes,
    isLoading: isLoadingDistricts,
    refetch: refetchDistricts,
  } = useQuery({
    queryKey: ["admin_state_districts", selectedStateId],
    queryFn: () => organizationApi.getDistricts(selectedStateId!),
    enabled: !!selectedStateId && activeSection === "cities",
  });

  // Filtered lists
  const filteredStates = useMemo(() => {
    return statesList.filter((s) => {
      const matchSearch =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRegion = regionFilter === "ALL" || s.region === regionFilter;
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE"
          ? isStatePublished(s.status)
          : !isStatePublished(s.status));
      return matchSearch && matchRegion && matchStatus;
    });
  }, [statesList, searchQuery, regionFilter, statusFilter]);

  // Overall metric totals
  const totalCollegesAcrossStates = statesList.reduce((acc, s) => acc + (s.collegesCount || 0), 0);
  const totalDistrictsAcrossStates = statesList.reduce((acc, s) => acc + (s.districtsCount || 0), 0);
  const totalExamsAcrossStates = statesList.reduce((acc, s) => acc + (s.examsCount || 0), 0);
  const totalScholarshipsAcrossStates = statesList.reduce((acc, s) => acc + (s.scholarshipsCount || 0), 0);
  const totalActiveStates = statesList.filter((s) => isStatePublished(s.status)).length;

  // Mutations
  const toggleStateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      organizationApi.updateState(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_states_list"] });
      queryClient.invalidateQueries({ queryKey: ["admin_state_detail"] });
      queryClient.invalidateQueries({ queryKey: ["geography_states"] });
      queryClient.invalidateQueries({ queryKey: ["state_detail"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to update state status");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (target: { type: string; id: string }) => {
      if (target.type === "state") return organizationApi.deleteState(target.id);
      if (target.type === "district") return organizationApi.deleteDistrict(target.id);
      if (target.type === "scholarship") return scholarshipsApi.delete(target.id);
      if (target.type === "exam") return examsApi.delete(target.id);
      if (target.type === "update") return organizationApi.deleteStateUpdate(target.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_states_list"] });
      queryClient.invalidateQueries({ queryKey: ["admin_state_detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin_state_districts"] });
      queryClient.invalidateQueries({ queryKey: ["admin_state_scholarships"] });
      queryClient.invalidateQueries({ queryKey: ["admin_state_exams"] });
      queryClient.invalidateQueries({ queryKey: ["admin_state_updates"] });
      queryClient.invalidateQueries({ queryKey: ["geography_states"] });
      queryClient.invalidateQueries({ queryKey: ["state_detail"] });
      if (deleteConfirm?.type === "state" && deleteConfirm.id === selectedStateId) {
        setSelectedStateId(null);
      }
      setDeleteConfirm(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to delete item");
    },
  });

  // Toggle publish status for scholarship
  const toggleScholarshipStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "PUBLISHED" | "DRAFT" }) =>
      scholarshipsApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_state_scholarships"] });
      queryClient.invalidateQueries({ queryKey: ["admin_state_detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin_states_list"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to update scholarship status");
    },
  });

  // Toggle publish status for exam
  const toggleExamStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "PUBLISHED" | "DRAFT" }) =>
      examsApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_state_exams"] });
      queryClient.invalidateQueries({ queryKey: ["admin_state_detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin_states_list"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to update exam status");
    },
  });

  // Toggle publish status for update
  const toggleUpdateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "PUBLISHED" | "DRAFT" }) =>
      organizationApi.updateStateUpdate(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_state_updates"] });
      queryClient.invalidateQueries({ queryKey: ["admin_state_detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin_states_list"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to update state update status");
    },
  });

  // Toggle district status
  const toggleDistrictStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "DISABLED" }) =>
      organizationApi.updateDistrict(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_state_districts"] });
      queryClient.invalidateQueries({ queryKey: ["admin_state_detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin_states_list"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to update district status");
    },
  });

  // If a state is selected, render the 6-Section Detail View
  if (selectedStateId) {
    const rawColleges: College[] = Array.isArray(collegesRes?.data)
      ? collegesRes.data
      : (collegesRes?.data?.data || []);
    const collegesList = rawColleges.filter((c) => {
      const matchSearch =
        !collegeSearch.trim() ||
        c.name.toLowerCase().includes(collegeSearch.toLowerCase()) ||
        c.city?.toLowerCase().includes(collegeSearch.toLowerCase());
      const matchOwnership =
        collegeOwnershipFilter === "ALL" ||
        (collegeOwnershipFilter === "GOVERNMENT" &&
          (c.ownership === "GOVERNMENT" || c.type === "GOVERNMENT")) ||
        (collegeOwnershipFilter === "PRIVATE" &&
          c.ownership !== "GOVERNMENT" &&
          c.type !== "GOVERNMENT");
      return matchSearch && matchOwnership;
    });

    const rawScholarships: Scholarship[] = Array.isArray(scholarshipsRes?.data)
      ? scholarshipsRes.data
      : (scholarshipsRes?.data?.data || []);
    const scholarshipsList = rawScholarships.filter(
      (s) =>
        !scholarshipSearch.trim() ||
        s.scholarshipName.toLowerCase().includes(scholarshipSearch.toLowerCase()) ||
        s.provider?.toLowerCase().includes(scholarshipSearch.toLowerCase())
    );

    const rawExams: Exam[] = Array.isArray(examsRes?.data)
      ? examsRes.data
      : (examsRes?.data?.data || []);
    const examsList = rawExams.filter(
      (e) =>
        !examSearch.trim() ||
        e.examName.toLowerCase().includes(examSearch.toLowerCase()) ||
        e.category?.toLowerCase().includes(examSearch.toLowerCase())
    );

    const rawUpdates: StateUpdateItem[] = Array.isArray(updatesRes)
      ? updatesRes
      : Array.isArray((updatesRes as any)?.data)
      ? (updatesRes as any).data
      : [];
    const updatesList = rawUpdates.filter(
      (u) =>
        !updateSearch.trim() ||
        u.title.toLowerCase().includes(updateSearch.toLowerCase()) ||
        u.content?.toLowerCase().includes(updateSearch.toLowerCase())
    );

    const rawDistricts: DistrictItem[] = Array.isArray(districtsRes)
      ? districtsRes
      : Array.isArray((districtsRes as any)?.data)
      ? (districtsRes as any).data
      : (stateDetail?.districts || []);
    const districtsList = rawDistricts.filter(
      (d) =>
        !districtSearch.trim() ||
        d.name.toLowerCase().includes(districtSearch.toLowerCase()) ||
        (d.code && d.code.toLowerCase().includes(districtSearch.toLowerCase()))
    );

    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#F1F5F9] shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedStateId(null)}
              className="p-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569] transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Back to States
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#1E293B]">{stateDetail?.name || "State"}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                  {stateDetail?.code || "—"}
                </span>
                {stateDetail?.region && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#64748B]">
                    {stateDetail.region}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isStatePublished(stateDetail?.status)
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      : "bg-amber-50 text-amber-600 border border-amber-200"
                  }`}
                >
                  {isStatePublished(stateDetail?.status) ? "PUBLISHED" : "DRAFT"}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Managing 6 sections: Overview, Colleges, Scholarships, Exam, Cities, and Updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() =>
                stateDetail &&
                toggleStateStatusMutation.mutate({
                  id: stateDetail.id,
                  status: isStatePublished(stateDetail.status) ? "DRAFT" : "PUBLISHED",
                })
              }
              className={`h-9 px-3.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                isStatePublished(stateDetail?.status)
                  ? "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                  : "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
              }`}
            >
              {isStatePublished(stateDetail?.status) ? (
                <>
                  <XCircle className="w-3.5 h-3.5" /> Unpublish State
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Publish State
                </>
              )}
            </button>
            <button
              onClick={() => {
                setEditingState(stateDetail || null);
                setIsStateModalOpen(true);
              }}
              className="h-9 px-3.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#475569] flex items-center gap-1.5 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#4A7B5B]" /> Edit State Info
            </button>
            <button
              onClick={() => {
                if (stateDetail) {
                  setDeleteConfirm({
                    type: "state",
                    id: stateDetail.id,
                    name: stateDetail.name,
                  });
                }
              }}
              className="h-9 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>

        {/* Dynamic Metric Pills Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Colleges",
              val: stateDetail?.metrics?.totalColleges ?? rawColleges.length,
              sub: `${stateDetail?.metrics?.governmentColleges || 0} Govt · ${stateDetail?.metrics?.privateColleges || 0} Pvt`,
              icon: Building2,
            },
            {
              label: "Cities / Districts",
              val: stateDetail?.metrics?.districtsCount ?? rawDistricts.length,
              sub: "Linked Districts",
              icon: MapPin,
            },
            {
              label: "Entrance Exams",
              val: stateDetail?.metrics?.examsCount ?? rawExams.length,
              sub: "State Entrance",
              icon: GraduationCap,
            },
            {
              label: "Scholarships",
              val: stateDetail?.metrics?.scholarshipsCount ?? rawScholarships.length,
              sub: "State Domicile",
              icon: Award,
            },
            {
              label: "State Updates",
              val: stateDetail?.metrics?.updatesCount ?? rawUpdates.length,
              sub: "Circulars & News",
              icon: FileText,
            },
            {
              label: "Database Status",
              val: "Synced",
              sub: "Single Source of Truth",
              icon: FileCheck2,
            },
          ].map((m, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-3.5 border border-[#F1F5F9] shadow-xs flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-[#E8F3EC] flex items-center justify-center shrink-0">
                <m.icon className="w-4 h-4 text-[#4A7B5B]" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold text-[#1E293B] truncate">{m.val}</div>
                <div className="text-[11px] font-semibold text-[#4A7B5B] truncate">{m.label}</div>
                <div className="text-[10px] text-[#94A3B8] truncate">{m.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 6 Mandatory Section Tabs Bar */}
        <div className="bg-white rounded-2xl border border-[#F1F5F9] p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto">
          {STATE_SECTIONS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#4A7B5B] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#4A7B5B]"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* SECTION 1: OVERVIEW */}
        {activeSection === "overview" && stateDetail && (
          <OverviewSection
            state={stateDetail}
            onUpdate={() => {
              refetchDetail();
              refetchStates();
            }}
          />
        )}

        {/* SECTION 2: COLLEGES */}
        {activeSection === "colleges" && (
          <div className="space-y-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#F1F5F9] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  Colleges in {stateDetail?.name} ({collegesList.length})
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Synchronized with the central College Directory. Colleges linked to this state
                  automatically appear in State and City search views.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setEditingCollege(null);
                    setIsCollegeModalOpen(true);
                  }}
                  className="h-9 px-4 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-95"
                  style={{ background: "#4A7B5B" }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add College to {stateDetail?.name}
                </button>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search colleges by name or city..."
                  value={collegeSearch}
                  onChange={(e) => setCollegeSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E2E8F0] bg-white text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
              <div className="flex items-center bg-white rounded-xl p-0.5 border border-[#E2E8F0]">
                {["ALL", "GOVERNMENT", "PRIVATE"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setCollegeOwnershipFilter(type)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      background: collegeOwnershipFilter === type ? "#E8F3EC" : "transparent",
                      color: collegeOwnershipFilter === type ? "#4A7B5B" : "#64748B",
                    }}
                  >
                    {type.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingColleges && (
              <div className="py-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-100">
                Loading colleges in {stateDetail?.name}...
              </div>
            )}

            {!isLoadingColleges && collegesList.length === 0 && (
              <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F3EC] flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6 text-[#4A7B5B]" />
                </div>
                <h4 className="text-sm font-bold text-[#1E293B] mb-1">No Colleges Found in {stateDetail?.name}</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                  Add colleges and select {stateDetail?.name} and a district to link them to this state.
                </p>
                <button
                  onClick={() => {
                    setEditingCollege(null);
                    setIsCollegeModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
                  style={{ background: "#4A7B5B" }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add First College
                </button>
              </div>
            )}

            {!isLoadingColleges && collegesList.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {collegesList.map((college) => (
                  <div
                    key={college.id}
                    className="bg-white rounded-2xl border border-[#F1F5F9] p-4 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            college.ownership === "GOVERNMENT" || college.type === "GOVERNMENT"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {college.ownership || college.type || "PRIVATE"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            college.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {college.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#1E293B] line-clamp-1">{college.name}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-[#64748B] mt-1">
                        <MapPin className="w-3 h-3 text-[#4A7B5B]" />
                        <span>{college.city || "—"}, {college.state}</span>
                      </div>
                      {college.naacGrade && (
                        <div className="mt-2 text-[11px] text-gray-500">
                          NAAC Grade: <strong className="text-[#4A7B5B]">{college.naacGrade}</strong>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {college.courses?.length || 0} Courses
                      </span>
                      <button
                        onClick={() => {
                          setEditingCollege(college);
                          setIsCollegeModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-[#F8FAFC] text-xs font-semibold text-[#4A7B5B] flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: SCHOLARSHIPS */}
        {activeSection === "scholarships" && (
          <div className="space-y-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#F1F5F9] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  State Scholarships for {stateDetail?.name} ({scholarshipsList.length})
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Manage state-specific and domicile-linked scholarships. Published scholarships
                  automatically synchronize with the public State detail page.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingScholarship(null);
                  setIsScholarshipModalOpen(true);
                }}
                className="h-9 px-4 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                style={{ background: "#4A7B5B" }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Scholarship
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search scholarships by title or provider..."
                value={scholarshipSearch}
                onChange={(e) => setScholarshipSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E2E8F0] bg-white text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            {isLoadingScholarships && (
              <div className="py-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-100">
                Loading scholarships...
              </div>
            )}

            {!isLoadingScholarships && scholarshipsList.length === 0 && (
              <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F3EC] flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-[#4A7B5B]" />
                </div>
                <h4 className="text-sm font-bold text-[#1E293B] mb-1">No Scholarships Listed</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                  Add state scholarships or link existing scholarships to {stateDetail?.name}.
                </p>
                <button
                  onClick={() => {
                    setEditingScholarship(null);
                    setIsScholarshipModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
                  style={{ background: "#4A7B5B" }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Scholarship
                </button>
              </div>
            )}

            {!isLoadingScholarships && scholarshipsList.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scholarshipsList.map((sch) => (
                  <div
                    key={sch.id}
                    className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                            {sch.category || "State"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F5F9] text-[#64748B]">
                            {sch.scholarshipType || "Merit Based"}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            sch.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {sch.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-[#1E293B] mb-1">{sch.scholarshipName}</h4>
                      <p className="text-xs text-[#64748B] mb-2">Provided by: {sch.provider || "State Government"}</p>

                      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-gray-100 my-2">
                        <div>
                          <span className="text-[10px] text-gray-400 block">Amount / Grant</span>
                          <strong className="text-sm font-bold text-[#4A7B5B]">{formatINR(sch.amount)}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">Deadline</span>
                          <strong className="text-xs font-semibold text-gray-700">
                            {formatDate(sch.applicationEnd)}
                          </strong>
                        </div>
                      </div>

                      {sch.eligibility && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{sch.eligibility}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() =>
                          toggleScholarshipStatusMutation.mutate({
                            id: sch.id,
                            status: sch.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                          })
                        }
                        className="text-xs text-gray-600 hover:text-[#4A7B5B] font-medium flex items-center gap-1"
                      >
                        {sch.status === "PUBLISHED" ? (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-amber-500" /> Unpublish
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Publish
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingScholarship(sch);
                            setIsScholarshipModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-[#F8FAFC] text-xs font-semibold text-[#4A7B5B] flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              type: "scholarship",
                              id: sch.id,
                              name: sch.scholarshipName,
                            })
                          }
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: EXAM */}
        {activeSection === "exam" && (
          <div className="space-y-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#F1F5F9] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  State Entrance Exams for {stateDetail?.name} ({examsList.length})
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Manage State entrance exams, schedules, and eligibility. Synchronizes with State Detail
                  → Exam tab.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingExam(null);
                  setIsExamModalOpen(true);
                }}
                className="h-9 px-4 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                style={{ background: "#4A7B5B" }}
              >
                <Plus className="w-3.5 h-3.5" /> Add State Exam
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search exams by name or category..."
                value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E2E8F0] bg-white text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            {isLoadingExams && (
              <div className="py-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-100">
                Loading entrance exams...
              </div>
            )}

            {!isLoadingExams && examsList.length === 0 && (
              <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F3EC] flex items-center justify-center mx-auto mb-3">
                  <GraduationCap className="w-6 h-6 text-[#4A7B5B]" />
                </div>
                <h4 className="text-sm font-bold text-[#1E293B] mb-1">No State Entrance Exams Listed</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                  Create state-specific entrance tests and assign them to {stateDetail?.name}.
                </p>
                <button
                  onClick={() => {
                    setEditingExam(null);
                    setIsExamModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
                  style={{ background: "#4A7B5B" }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add State Exam
                </button>
              </div>
            )}

            {!isLoadingExams && examsList.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {examsList.map((exam) => (
                  <div
                    key={exam.id}
                    className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                            {exam.category || "General"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F5F9] text-[#64748B]">
                            {exam.examMode || "Online"}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            exam.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {exam.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-[#1E293B] mb-0.5">{exam.examName}</h4>
                      <p className="text-xs text-[#64748B] mb-3">Conducted by: {exam.conductedBy || "State Board"}</p>

                      <div className="grid grid-cols-3 gap-2 text-xs py-2 border-y border-gray-100 my-2">
                        <div>
                          <span className="text-[10px] text-gray-400 block">Exam Date</span>
                          <strong className="text-xs font-bold text-[#4A7B5B]">
                            {formatDate(exam.examDate)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">Reg. Closes</span>
                          <strong className="text-xs font-semibold text-gray-700">
                            {formatDate(exam.applicationEnd)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">App. Fee</span>
                          <strong className="text-xs font-bold text-[#1E293B]">
                            {formatINR(exam.applicationFee)}
                          </strong>
                        </div>
                      </div>

                      {exam.eligibility && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{exam.eligibility}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() =>
                          toggleExamStatusMutation.mutate({
                            id: exam.id,
                            status: exam.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                          })
                        }
                        className="text-xs text-gray-600 hover:text-[#4A7B5B] font-medium flex items-center gap-1"
                      >
                        {exam.status === "PUBLISHED" ? (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-amber-500" /> Unpublish
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Publish
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingExam(exam);
                            setIsExamModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-[#F8FAFC] text-xs font-semibold text-[#4A7B5B] flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              type: "exam",
                              id: exam.id,
                              name: exam.examName,
                            })
                          }
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 5: CITIES / DISTRICTS */}
        {activeSection === "cities" && (
          <div className="space-y-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#F1F5F9] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  Districts & Cities of {stateDetail?.name} ({districtsList.length})
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Cities/Districts are strictly linked to {stateDetail?.name}. Colleges in this state
                  belong to these districts.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingDistrict(null);
                  setIsDistrictModalOpen(true);
                }}
                className="h-9 px-4 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                style={{ background: "#4A7B5B" }}
              >
                <Plus className="w-3.5 h-3.5" /> Add District / City
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search districts by name or code..."
                value={districtSearch}
                onChange={(e) => setDistrictSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E2E8F0] bg-white text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            {isLoadingDistricts && (
              <div className="py-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-100">
                Loading districts...
              </div>
            )}

            {!isLoadingDistricts && districtsList.length === 0 && (
              <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F3EC] flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-[#4A7B5B]" />
                </div>
                <h4 className="text-sm font-bold text-[#1E293B] mb-1">No Districts Added Yet</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                  Add the official districts or administrative cities belonging to {stateDetail?.name}.
                </p>
                <button
                  onClick={() => {
                    setEditingDistrict(null);
                    setIsDistrictModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
                  style={{ background: "#4A7B5B" }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add First District
                </button>
              </div>
            )}

            {!isLoadingDistricts && districtsList.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#F1F5F9] text-[#64748B] font-semibold">
                    <tr>
                      <th className="p-3.5 pl-5">District / City</th>
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Colleges Count</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {districtsList.map((dist) => (
                      <tr key={dist.id} className="hover:bg-[#F8FAFC]/50 transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-[#1E293B]">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#4A7B5B]" />
                            <span>{dist.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-[#64748B] font-mono">{dist.code || "—"}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                            {dist.collegesCount ?? 0} {dist.collegesCount === 1 ? "College" : "Colleges"}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() =>
                              toggleDistrictStatusMutation.mutate({
                                id: dist.id,
                                status: dist.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                              })
                            }
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer ${
                              dist.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {dist.status || "ACTIVE"}
                          </button>
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingDistrict(dist);
                                setIsDistrictModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-gray-200 hover:bg-[#F8FAFC] text-gray-600"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "district",
                                  id: dist.id,
                                  name: dist.name,
                                })
                              }
                              className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION 6: UPDATES */}
        {activeSection === "updates" && (
          <div className="space-y-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#F1F5F9] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  State Circulars & News for {stateDetail?.name} ({updatesList.length})
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Publish state admission updates, notifications, and counsel schedules.
                  Synchronizes directly with State Detail → Updates tab.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingUpdate(null);
                  setIsUpdateModalOpen(true);
                }}
                className="h-9 px-4 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                style={{ background: "#4A7B5B" }}
              >
                <Plus className="w-3.5 h-3.5" /> Add State Update
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search updates by title or content..."
                value={updateSearch}
                onChange={(e) => setUpdateSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E2E8F0] bg-white text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            {isLoadingUpdates && (
              <div className="py-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-100">
                Loading updates...
              </div>
            )}

            {!isLoadingUpdates && updatesList.length === 0 && (
              <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F3EC] flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-[#4A7B5B]" />
                </div>
                <h4 className="text-sm font-bold text-[#1E293B] mb-1">No Updates Published Yet</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                  Keep students informed by posting admission notifications and entrance circulars for {stateDetail?.name}.
                </p>
                <button
                  onClick={() => {
                    setEditingUpdate(null);
                    setIsUpdateModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
                  style={{ background: "#4A7B5B" }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Update
                </button>
              </div>
            )}

            {!isLoadingUpdates && updatesList.length > 0 && (
              <div className="space-y-3">
                {updatesList.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-[#F1F5F9] p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all flex flex-col sm:flex-row items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-[#4A7B5B]" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                            {item.type || "Circular"}
                          </span>
                          <span className="text-[11px] text-[#94A3B8] font-medium">
                            {formatDate(item.publishDate || item.createdAt)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              item.status === "PUBLISHED"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#1E293B]">{item.title}</h4>
                        {item.content && (
                          <p className="text-xs text-[#64748B] mt-1 line-clamp-2 leading-relaxed">
                            {item.content}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() =>
                          toggleUpdateStatusMutation.mutate({
                            id: item.id,
                            status: item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                          })
                        }
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-[#F8FAFC] text-gray-600 flex items-center gap-1"
                      >
                        {item.status === "PUBLISHED" ? (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-amber-500" /> Unpublish
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Publish
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingUpdate(item);
                          setIsUpdateModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-gray-200 text-[#4A7B5B] hover:bg-[#F8FAFC]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            type: "update",
                            id: item.id,
                            name: item.title,
                          })
                        }
                        className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Global Modals */}
        {isStateModalOpen && (
          <StateFormModal
            isOpen={isStateModalOpen}
            onClose={() => {
              setIsStateModalOpen(false);
              setEditingState(null);
            }}
            state={editingState}
            onSuccess={() => {
              refetchDetail();
              refetchStates();
            }}
          />
        )}

        {isDistrictModalOpen && (
          <DistrictFormModal
            isOpen={isDistrictModalOpen}
            onClose={() => {
              setIsDistrictModalOpen(false);
              setEditingDistrict(null);
            }}
            stateId={selectedStateId}
            district={editingDistrict}
            onSuccess={() => {
              refetchDistricts();
              refetchDetail();
            }}
          />
        )}

        {isScholarshipModalOpen && (
          <ScholarshipFormModalInline
            isOpen={isScholarshipModalOpen}
            onClose={() => {
              setIsScholarshipModalOpen(false);
              setEditingScholarship(null);
            }}
            defaultStateName={stateDetail?.name}
            defaultStateId={selectedStateId}
            scholarship={editingScholarship}
            onSuccess={() => {
              refetchScholarships();
              refetchDetail();
            }}
          />
        )}

        {isExamModalOpen && (
          <ExamFormModalInline
            isOpen={isExamModalOpen}
            onClose={() => {
              setIsExamModalOpen(false);
              setEditingExam(null);
            }}
            defaultStateName={stateDetail?.name}
            defaultStateId={selectedStateId}
            exam={editingExam}
            onSuccess={() => {
              refetchExams();
              refetchDetail();
            }}
          />
        )}

        {isUpdateModalOpen && (
          <StateUpdateFormModal
            isOpen={isUpdateModalOpen}
            onClose={() => {
              setIsUpdateModalOpen(false);
              setEditingUpdate(null);
            }}
            stateId={selectedStateId}
            stateName={stateDetail?.name || ""}
            updateItem={editingUpdate}
            onSuccess={() => {
              refetchUpdates();
              refetchDetail();
            }}
          />
        )}

        {isCollegeModalOpen && (
          <CollegeFormModal
            isOpen={isCollegeModalOpen}
            onClose={() => {
              setIsCollegeModalOpen(false);
              setEditingCollege(null);
            }}
            college={editingCollege}
          />
        )}

        {deleteConfirm && (
          <DeleteConfirmDialog
            isOpen={!!deleteConfirm}
            title={`Delete ${deleteConfirm.type.toUpperCase()}`}
            message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
            onConfirm={() => deleteItemMutation.mutate(deleteConfirm)}
            onCancel={() => setDeleteConfirm(null)}
            isDeleting={deleteItemMutation.isPending}
          />
        )}
      </div>
    );
  }

  // STATES DIRECTORY & LIST VIEW
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1E293B]">State Management & Sections</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F3EC] text-[#4A7B5B]">
              {statesList.length} States
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Administer Indian states, overview data, college directory sync, scholarships, entrance exams,
            districts, and circulars.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => refetchStates()}
            className="h-9 px-3 rounded-xl border border-[#E2E8F0] hover:bg-white text-xs font-semibold text-[#475569] flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#4A7B5B]" /> Refresh
          </button>
          <button
            onClick={() => {
              setEditingState(null);
              setIsStateModalOpen(true);
            }}
            className="h-9 px-4 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-opacity hover:opacity-95"
            style={{ background: "#4A7B5B" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add State
          </button>
        </div>
      </div>

      {/* Top Aggregated Metric Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[
          { label: "Total States", value: statesList.length, sub: `${totalActiveStates} Published`, icon: Globe },
          { label: "Total Districts", value: totalDistrictsAcrossStates, sub: "Administrative Cities", icon: MapPin },
          { label: "Linked Colleges", value: totalCollegesAcrossStates, sub: "Single Source of Truth", icon: Building2 },
          { label: "State Entrance Exams", value: totalExamsAcrossStates, sub: "Entrance Schedules", icon: GraduationCap },
          { label: "State Scholarships", value: totalScholarshipsAcrossStates, sub: "Financial Grants", icon: Award },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 border border-[#F1F5F9] shadow-xs flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#E8F3EC] flex items-center justify-center shrink-0">
              <stat.icon className="w-5 h-5 text-[#4A7B5B]" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#1E293B]">{stat.value}</div>
              <div className="text-xs font-semibold text-[#4A7B5B]">{stat.label}</div>
              <div className="text-[10px] text-[#94A3B8]">{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#F1F5F9] shadow-xs">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search states by name or code (e.g. Bihar, BR)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] focus:outline-none focus:border-[#4A7B5B]"
          >
            <option value="ALL">All Regions</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r} Region
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] focus:outline-none focus:border-[#4A7B5B]"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Published (Active)</option>
            <option value="DISABLED">Draft / Disabled</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "grid" ? "bg-[#E8F3EC] text-[#4A7B5B]" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "table" ? "bg-[#E8F3EC] text-[#4A7B5B]" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoadingStates && (
        <div className="py-20 text-center text-xs text-gray-500">
          Loading Indian states and regional modules...
        </div>
      )}

      {/* Empty State */}
      {!isLoadingStates && filteredStates.length === 0 && (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F3EC] flex items-center justify-center mx-auto mb-3">
            <Globe className="w-7 h-7 text-[#4A7B5B]" />
          </div>
          <h3 className="text-base font-bold text-[#1E293B] mb-1">No States Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
            Try adjusting your search query or region filter, or add a new state.
          </p>
          <button
            onClick={() => {
              setEditingState(null);
              setIsStateModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
            style={{ background: "#4A7B5B" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add New State
          </button>
        </div>
      )}

      {/* GRID VIEW */}
      {!isLoadingStates && viewMode === "grid" && filteredStates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStates.map((st) => (
            <div
              key={st.id}
              className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Hero preview / Header */}
                <div className="relative h-32 bg-gradient-to-r from-[#4A7B5B] to-[#2D5E3F] overflow-hidden">
                  {st.heroImage ? (
                    <img
                      src={st.heroImage}
                      alt={st.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#E8F3EC]">
                      <MapPin className="w-10 h-10 text-[#4A7B5B]/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-[#4A7B5B] backdrop-blur-xs">
                      {st.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isStatePublished(st.status)
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-800/80 text-gray-200"
                      }`}
                    >
                      {isStatePublished(st.status) ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-base font-bold text-white drop-shadow-sm">{st.name}</h3>
                    {st.region && (
                      <p className="text-[11px] text-white/80 font-medium">{st.region} Region</p>
                    )}
                  </div>
                </div>

                {/* Body Metrics */}
                <div className="p-4 space-y-3">
                  {st.description && (
                    <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                      {st.description}
                    </p>
                  )}

                  {/* 6 Sections live counter badges */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
                    <div className="bg-[#F8FAFC] p-2 rounded-xl">
                      <div className="text-xs font-bold text-[#4A7B5B]">{st.collegesCount ?? 0}</div>
                      <div className="text-[9px] text-[#94A3B8] font-medium">Colleges</div>
                    </div>
                    <div className="bg-[#F8FAFC] p-2 rounded-xl">
                      <div className="text-xs font-bold text-[#4A7B5B]">{st.districtsCount ?? 0}</div>
                      <div className="text-[9px] text-[#94A3B8] font-medium">Districts</div>
                    </div>
                    <div className="bg-[#F8FAFC] p-2 rounded-xl">
                      <div className="text-xs font-bold text-[#4A7B5B]">{st.examsCount ?? 0}</div>
                      <div className="text-[9px] text-[#94A3B8] font-medium">Exams</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#94A3B8] px-1">
                    <span>{st.scholarshipsCount ?? 0} Scholarships</span>
                    <span>{st.updatesCount ?? 0} Circulars</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons footer */}
              <div className="p-4 pt-0 flex items-center justify-between gap-2 border-t border-gray-100/60 mt-2">
                <button
                  onClick={() => setSelectedStateId(st.id)}
                  className="flex-1 h-9 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-opacity hover:opacity-95"
                  style={{ background: "#4A7B5B" }}
                >
                  <Layers className="w-3.5 h-3.5" /> Manage (6 Sections)
                </button>
                <button
                  onClick={() => {
                    setEditingState(st);
                    setIsStateModalOpen(true);
                  }}
                  className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-[#F8FAFC] transition-colors"
                  title="Edit State"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    setDeleteConfirm({
                      type: "state",
                      id: st.id,
                      name: st.name,
                    })
                  }
                  className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete State"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABLE VIEW */}
      {!isLoadingStates && viewMode === "table" && filteredStates.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#F1F5F9] text-[#64748B] font-semibold">
              <tr>
                <th className="p-3.5 pl-5">State Name</th>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Region</th>
                <th className="p-3.5">Districts</th>
                <th className="p-3.5">Colleges</th>
                <th className="p-3.5">Exams</th>
                <th className="p-3.5">Scholarships</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredStates.map((st) => (
                <tr key={st.id} className="hover:bg-[#F8FAFC]/50 transition-colors">
                  <td className="p-3.5 pl-5 font-bold text-[#1E293B]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#E8F3EC] flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-[#4A7B5B]" />
                      </div>
                      <span>{st.name}</span>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-[#64748B] font-bold">{st.code}</td>
                  <td className="p-3.5 text-[#64748B]">{st.region || "—"}</td>
                  <td className="p-3.5 font-semibold text-[#1E293B]">{st.districtsCount ?? 0}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#E8F3EC] text-[#4A7B5B]">
                      {st.collegesCount ?? 0}
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold text-[#1E293B]">{st.examsCount ?? 0}</td>
                  <td className="p-3.5 font-semibold text-[#1E293B]">{st.scholarshipsCount ?? 0}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isStatePublished(st.status)
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {isStatePublished(st.status) ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="p-3.5 pr-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedStateId(st.id)}
                        className="px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                        style={{ background: "#4A7B5B" }}
                      >
                        <Layers className="w-3 h-3" /> Manage
                      </button>
                      <button
                        onClick={() => {
                          setEditingState(st);
                          setIsStateModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-[#F8FAFC]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            type: "state",
                            id: st.id,
                            name: st.name,
                          })
                        }
                        className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* State Add/Edit Modal */}
      {isStateModalOpen && (
        <StateFormModal
          isOpen={isStateModalOpen}
          onClose={() => {
            setIsStateModalOpen(false);
            setEditingState(null);
          }}
          state={editingState}
          onSuccess={() => refetchStates()}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <DeleteConfirmDialog
          isOpen={!!deleteConfirm}
          title={`Delete ${deleteConfirm.type.toUpperCase()}`}
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          onConfirm={() => deleteItemMutation.mutate(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          isDeleting={deleteItemMutation.isPending}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENT: OVERVIEW TAB
// -------------------------------------------------------------
function OverviewSection({
  state,
  onUpdate,
}: {
  state: StateDetail;
  onUpdate: () => void;
}) {
  const [formData, setFormData] = useState({
    name: state.name || "",
    code: state.code || "",
    region: state.region || "North",
    heroImage: state.heroImage || "",
    description: state.description || "",
    popularCourses: (state.popularCourses || []).join(", "),
    status: isStatePublished(state.status) ? "PUBLISHED" : "DRAFT",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    setFormData({
      name: state.name || "",
      code: state.code || "",
      region: state.region || "North",
      heroImage: state.heroImage || "",
      description: state.description || "",
      popularCourses: (state.popularCourses || []).join(", "),
      status: isStatePublished(state.status) ? "PUBLISHED" : "DRAFT",
    });
  }, [state]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg("");
    try {
      const coursesArray = formData.popularCourses
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      await organizationApi.updateState(state.id, {
        name: formData.name,
        code: formData.code,
        region: formData.region,
        heroImage: formData.heroImage,
        description: formData.description,
        popularCourses: coursesArray,
        status: formData.status,
      });

      setSuccessMsg("State overview updated successfully!");
      onUpdate();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update state overview");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Edit Form */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-[#F1F5F9] shadow-xs">
        <h3 className="text-base font-bold text-[#1E293B] mb-1">State Information & Content</h3>
        <p className="text-xs text-[#94A3B8] mb-5">
          Configure the public presentation, hero banner, regional classification, and popular course
          highlights.
        </p>

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
            <Check className="w-4 h-4" /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">State Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                State Code (2-letter ISO) *
              </label>
              <input
                type="text"
                required
                maxLength={3}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] uppercase font-mono focus:border-[#4A7B5B] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">Region</label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] focus:outline-none bg-white"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">Publish Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] focus:outline-none bg-white"
              >
                <option value="PUBLISHED">PUBLISHED (Published)</option>
                <option value="DRAFT">DRAFT (Unpublished)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
              Hero / Banner Image URL
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={formData.heroImage}
              onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
              className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
              Popular Courses (Comma separated)
            </label>
            <input
              type="text"
              placeholder="B.Tech, MBA, BCA, MBBS, B.Sc Nursing, Law"
              value={formData.popularCourses}
              onChange={(e) => setFormData({ ...formData, popularCourses: e.target.value })}
              className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
              About State & Higher Education Landscape
            </label>
            <textarea
              rows={5}
              placeholder="Describe the state's educational ecosystem, universities, admission process, and opportunities..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] focus:outline-none leading-relaxed"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="h-10 px-6 rounded-xl text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-opacity hover:opacity-95 disabled:opacity-50"
              style={{ background: "#4A7B5B" }}
            >
              {isSaving ? "Saving changes..." : "Save Overview Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="space-y-4">
        {/* Banner Preview Card */}
        <div className="bg-white rounded-2xl p-5 border border-[#F1F5F9] shadow-xs">
          <h4 className="text-xs font-bold text-[#1E293B] mb-3">Hero Banner Preview</h4>
          <div className="relative h-36 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
            {formData.heroImage ? (
              <img
                src={formData.heroImage}
                alt={formData.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <MapPin className="w-6 h-6 mb-1" />
                <span className="text-[10px]">No image URL provided</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
              <div className="text-white">
                <div className="text-xs font-bold">{formData.name || "State Name"}</div>
                <div className="text-[10px] text-white/80">{formData.region} Region</div>
              </div>
            </div>
          </div>
        </div>

        {/* Database Aggregated Counters Card */}
        <div className="bg-white rounded-2xl p-5 border border-[#F1F5F9] shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-[#1E293B]">Live Database Counts</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Total Colleges</span>
              <strong className="text-[#4A7B5B]">{state.metrics?.totalColleges || 0}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Govt. Colleges</span>
              <strong className="text-[#1E293B]">{state.metrics?.governmentColleges || 0}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Private Colleges</span>
              <strong className="text-[#1E293B]">{state.metrics?.privateColleges || 0}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Districts / Cities</span>
              <strong className="text-[#1E293B]">{state.metrics?.districtsCount || 0}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">State Entrance Exams</span>
              <strong className="text-[#1E293B]">{state.metrics?.examsCount || 0}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Scholarships</span>
              <strong className="text-[#1E293B]">{state.metrics?.scholarshipsCount || 0}</strong>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">State Updates</span>
              <strong className="text-[#1E293B]">{state.metrics?.updatesCount || 0}</strong>
            </div>
          </div>
        </div>

        {/* Database Synchronization Notice */}
        <div className="bg-[#E8F3EC] rounded-2xl p-4 border border-[#4A7B5B]/20 text-xs text-[#4A7B5B] space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Full Relational Sync
          </div>
          <p className="text-[11px] leading-relaxed text-[#4A7B5B]/90">
            All 6 sections link directly to central database tables. College Directory is the single
            source of truth for colleges.
          </p>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STATE FORM MODAL (Add / Edit State)
// -------------------------------------------------------------
function StateFormModal({
  isOpen,
  onClose,
  state,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  state: StateItem | StateDetail | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(state?.name || "");
  const [code, setCode] = useState(state?.code || "");
  const [region, setRegion] = useState(state?.region || "North");
  const [heroImage, setHeroImage] = useState(state?.heroImage || "");
  const [description, setDescription] = useState(state?.description || "");
  const [popularCourses, setPopularCourses] = useState(
    (state?.popularCourses || []).join(", ")
  );
  const [status, setStatus] = useState(
    isStatePublished(state?.status) ? "PUBLISHED" : (state?.status ? "DRAFT" : "PUBLISHED")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(state?.name || "");
    setCode(state?.code || "");
    setRegion(state?.region || "North");
    setHeroImage(state?.heroImage || "");
    setDescription(state?.description || "");
    setPopularCourses((state?.popularCourses || []).join(", "));
    setStatus(
      isStatePublished(state?.status) ? "PUBLISHED" : (state?.status ? "DRAFT" : "PUBLISHED")
    );
  }, [state, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const coursesArray = popularCourses
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const targetStatus = isStatePublished(status) ? "PUBLISHED" : "DRAFT";

      if (state?.id) {
        await organizationApi.updateState(state.id, {
          name,
          code,
          region,
          heroImage,
          description,
          popularCourses: coursesArray,
          status: targetStatus,
        });
      } else {
        await organizationApi.createState({
          name,
          code,
          region,
          heroImage,
          description,
          popularCourses: coursesArray,
          status: targetStatus,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save state");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <h3 className="text-base font-bold text-[#1E293B]">
            {state?.id ? `Edit State: ${state.name}` : "Add Indian State"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">State Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maharashtra"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                State Code (ISO) *
              </label>
              <input
                type="text"
                required
                maxLength={3}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. MH"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 uppercase font-mono focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft / Disabled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">Hero Image URL</label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={heroImage}
              onChange={(e) => setHeroImage(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Popular Courses (Comma separated)
            </label>
            <input
              type="text"
              placeholder="B.Tech, MBA, BCA, MBBS, Law"
              value={popularCourses}
              onChange={(e) => setPopularCourses(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Description / About
            </label>
            <textarea
              rows={4}
              placeholder="Overview of higher education in this state..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs"
              style={{ background: "#4A7B5B" }}
            >
              {isSubmitting ? "Saving..." : state?.id ? "Update State" : "Create State"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// DISTRICT FORM MODAL (Add / Edit District under selected State)
// -------------------------------------------------------------
function DistrictFormModal({
  isOpen,
  onClose,
  stateId,
  district,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  stateId: string;
  district: DistrictItem | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(district?.name || "");
  const [code, setCode] = useState(district?.code || "");
  const [status, setStatus] = useState(district?.status || "ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(district?.name || "");
      setCode(district?.code || "");
      setStatus(district?.status || "ACTIVE");
    }
  }, [district, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (district?.id) {
        await organizationApi.updateDistrict(district.id, { name, code, status });
      } else {
        await organizationApi.createDistrict({ name, stateId, code, status });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save district");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <h3 className="text-base font-bold text-[#1E293B]">
            {district?.id ? `Edit District: ${district.name}` : "Add District / City"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              District / City Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pune"
              className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                District Code (Optional)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. PUN"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 uppercase font-mono focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs"
              style={{ background: "#4A7B5B" }}
            >
              {isSubmitting ? "Saving..." : district?.id ? "Update District" : "Add District"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SCHOLARSHIP FORM MODAL (Add / Edit State Scholarship)
// -------------------------------------------------------------
function ScholarshipFormModalInline({
  isOpen,
  onClose,
  defaultStateName,
  defaultStateId,
  scholarship,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultStateName?: string;
  defaultStateId?: string;
  scholarship: Scholarship | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(scholarship?.scholarshipName || "");
  const [provider, setProvider] = useState(scholarship?.provider || "State Government");
  const [category, setCategory] = useState(scholarship?.category || "State");
  const [type, setType] = useState(scholarship?.scholarshipType || "Merit Based");
  const [amount, setAmount] = useState<number | undefined>(scholarship?.amount);
  const [applicationStart, setApplicationStart] = useState(
    scholarship?.applicationStart ? String(scholarship.applicationStart).split("T")[0] : ""
  );
  const [applicationEnd, setApplicationEnd] = useState(
    scholarship?.applicationEnd ? String(scholarship.applicationEnd).split("T")[0] : ""
  );
  const [eligibility, setEligibility] = useState(scholarship?.eligibility || "");
  const [description, setDescription] = useState(scholarship?.description || "");
  const [officialWebsite, setOfficialWebsite] = useState(scholarship?.officialWebsite || "");
  const [status, setStatus] = useState<"PUBLISHED" | "DRAFT">(
    (scholarship?.status as any) || "PUBLISHED"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(scholarship?.scholarshipName || "");
      setProvider(scholarship?.provider || "State Government");
      setCategory(scholarship?.category || "State");
      setType(scholarship?.scholarshipType || "Merit Based");
      setAmount(scholarship?.amount);
      setApplicationStart(
        scholarship?.applicationStart ? String(scholarship.applicationStart).split("T")[0] : ""
      );
      setApplicationEnd(
        scholarship?.applicationEnd ? String(scholarship.applicationEnd).split("T")[0] : ""
      );
      setEligibility(scholarship?.eligibility || "");
      setDescription(scholarship?.description || "");
      setOfficialWebsite(scholarship?.officialWebsite || "");
      setStatus((scholarship?.status as any) || "PUBLISHED");
    }
  }, [scholarship, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        scholarshipName: name,
        provider,
        category,
        scholarshipType: type,
        amount: amount ? Number(amount) : undefined,
        applicationStart: applicationStart || undefined,
        applicationEnd: applicationEnd || undefined,
        eligibility,
        description,
        officialWebsite,
        status,
        state: defaultStateName || scholarship?.state,
        stateId: defaultStateId,
        states: defaultStateName ? [defaultStateName] : [],
      };

      if (scholarship?.id) {
        await scholarshipsApi.update(scholarship.id, payload);
      } else {
        await scholarshipsApi.create(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save scholarship");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <h3 className="text-base font-bold text-[#1E293B]">
            {scholarship?.id ? `Edit Scholarship` : `Add Scholarship for ${defaultStateName || "State"}`}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Scholarship Scheme Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Post-Matric Scholarship Scheme"
              className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                Conducted / Offered By
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. Department of Higher Education"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                Amount / Grant (in ₹)
              </label>
              <input
                type="number"
                value={amount ?? ""}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 50000"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="State">State Scheme</option>
                <option value="Central">Central Scheme</option>
                <option value="Merit-based">Merit-based</option>
                <option value="Need-based">Need-based</option>
                <option value="SC/ST/OBC">SC/ST/OBC</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="Merit Based">Merit Based</option>
                <option value="Need Based">Need Based</option>
                <option value="Minority">Minority</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="DRAFT">DRAFT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                Application Start Date
              </label>
              <input
                type="date"
                value={applicationStart}
                onChange={(e) => setApplicationStart(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                Application Deadline
              </label>
              <input
                type="date"
                value={applicationEnd}
                onChange={(e) => setApplicationEnd(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Eligibility Criteria
            </label>
            <textarea
              rows={2}
              placeholder="e.g. State domicile required, 60%+ in 12th standard, family income under ₹2.5L"
              value={eligibility}
              onChange={(e) => setEligibility(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Official Portal Link
            </label>
            <input
              type="url"
              placeholder="https://scholarships.gov.in"
              value={officialWebsite}
              onChange={(e) => setOfficialWebsite(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs"
              style={{ background: "#4A7B5B" }}
            >
              {isSubmitting ? "Saving..." : scholarship?.id ? "Update Scholarship" : "Add Scholarship"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// EXAM FORM MODAL (Add / Edit State Entrance Exam)
// -------------------------------------------------------------
function ExamFormModalInline({
  isOpen,
  onClose,
  defaultStateName,
  defaultStateId,
  exam,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultStateName?: string;
  defaultStateId?: string;
  exam: Exam | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(exam?.examName || "");
  const [category, setCategory] = useState(exam?.category || "ENGINEERING");
  const [conductedBy, setConductedBy] = useState(exam?.conductedBy || "State Examination Authority");
  const [examMode, setExamMode] = useState(exam?.examMode || "ONLINE");
  const [examDate, setExamDate] = useState(
    exam?.examDate ? String(exam.examDate).split("T")[0] : ""
  );
  const [applicationStart, setApplicationStart] = useState(
    exam?.applicationStart ? String(exam.applicationStart).split("T")[0] : ""
  );
  const [applicationEnd, setApplicationEnd] = useState(
    exam?.applicationEnd ? String(exam.applicationEnd).split("T")[0] : ""
  );
  const [applicationFee, setApplicationFee] = useState<number | undefined>(exam?.applicationFee);
  const [eligibility, setEligibility] = useState(exam?.eligibility || "");
  const [officialWebsite, setOfficialWebsite] = useState(exam?.officialWebsite || "");
  const [description, setDescription] = useState(exam?.description || "");
  const [status, setStatus] = useState<"PUBLISHED" | "DRAFT">(
    (exam?.status as any) || "PUBLISHED"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(exam?.examName || "");
      setCategory(exam?.category || "ENGINEERING");
      setConductedBy(exam?.conductedBy || "State Examination Authority");
      setExamMode(exam?.examMode || "ONLINE");
      setExamDate(
        exam?.examDate ? String(exam.examDate).split("T")[0] : ""
      );
      setApplicationStart(
        exam?.applicationStart ? String(exam.applicationStart).split("T")[0] : ""
      );
      setApplicationEnd(
        exam?.applicationEnd ? String(exam.applicationEnd).split("T")[0] : ""
      );
      setApplicationFee(exam?.applicationFee);
      setEligibility(exam?.eligibility || "");
      setOfficialWebsite(exam?.officialWebsite || "");
      setDescription(exam?.description || "");
      setStatus((exam?.status as any) || "PUBLISHED");
    }
  }, [exam, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        examName: name,
        category,
        level: "STATE",
        conductedBy,
        examMode,
        examDate: examDate || undefined,
        applicationStart: applicationStart || undefined,
        applicationEnd: applicationEnd || undefined,
        applicationFee: applicationFee ? Number(applicationFee) : undefined,
        eligibility,
        officialWebsite,
        description,
        status,
        stateId: defaultStateId,
      };

      if (exam?.id) {
        await examsApi.update(exam.id, payload);
      } else {
        await examsApi.create(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save entrance exam");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <h3 className="text-base font-bold text-[#1E293B]">
            {exam?.id ? `Edit Entrance Exam` : `Add State Entrance Exam (${defaultStateName || "State"})`}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Exam Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MHT CET 2026, BCECE 2026"
              className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Stream / Field</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="ENGINEERING">Engineering</option>
                <option value="MEDICAL">Medical</option>
                <option value="MANAGEMENT">Management</option>
                <option value="LAW">Law</option>
                <option value="PHARMACY">Pharmacy</option>
                <option value="AGRICULTURE">Agriculture</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Exam Mode</label>
              <select
                value={examMode}
                onChange={(e) => setExamMode(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="ONLINE">Online CBT</option>
                <option value="OFFLINE">Pen & Paper</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="DRAFT">DRAFT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                Conducted By
              </label>
              <input
                type="text"
                value={conductedBy}
                onChange={(e) => setConductedBy(e.target.value)}
                placeholder="State Examination Cell"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                Application Fee (in ₹)
              </label>
              <input
                type="number"
                value={applicationFee ?? ""}
                onChange={(e) =>
                  setApplicationFee(e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="e.g. 1000"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Exam Date</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Reg. Start</label>
              <input
                type="date"
                value={applicationStart}
                onChange={(e) => setApplicationStart(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Reg. End</label>
              <input
                type="date"
                value={applicationEnd}
                onChange={(e) => setApplicationEnd(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Eligibility & Domicile
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 10+2 with Physics, Chemistry & Math with 45%+ aggregate. Domicile rules apply."
              value={eligibility}
              onChange={(e) => setEligibility(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Official Examination Portal
            </label>
            <input
              type="url"
              placeholder="https://cetcell.mahacet.org"
              value={officialWebsite}
              onChange={(e) => setOfficialWebsite(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs"
              style={{ background: "#4A7B5B" }}
            >
              {isSubmitting ? "Saving..." : exam?.id ? "Update Exam" : "Add Exam"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STATE UPDATE FORM MODAL (Add / Edit Circular or Update)
// -------------------------------------------------------------
function StateUpdateFormModal({
  isOpen,
  onClose,
  stateId,
  stateName,
  updateItem,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  stateId: string;
  stateName: string;
  updateItem: StateUpdateItem | null;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(updateItem?.title || "");
  const [type, setType] = useState(updateItem?.type || "Admission Notice");
  const [publishDate, setPublishDate] = useState(
    updateItem?.publishDate ? String(updateItem.publishDate).split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [image, setImage] = useState(updateItem?.image || "");
  const [content, setContent] = useState(updateItem?.content || "");
  const [status, setStatus] = useState<"PUBLISHED" | "DRAFT">(
    (updateItem?.status as any) || "PUBLISHED"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(updateItem?.title || "");
      setType(updateItem?.type || "Admission Notice");
      setPublishDate(
        updateItem?.publishDate ? String(updateItem.publishDate).split("T")[0] : new Date().toISOString().split("T")[0]
      );
      setImage(updateItem?.image || "");
      setContent(updateItem?.content || "");
      setStatus((updateItem?.status as any) || "PUBLISHED");
    }
  }, [updateItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (updateItem?.id) {
        await organizationApi.updateStateUpdate(updateItem.id, {
          title,
          type,
          publishDate,
          image,
          content,
          status,
        });
      } else {
        await organizationApi.createStateUpdate({
          title,
          type,
          publishDate,
          image,
          content,
          status,
          stateId,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save state update");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <h3 className="text-base font-bold text-[#1E293B]">
            {updateItem?.id ? `Edit Update` : `Add State Circular / Notice (${stateName})`}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Title / Circular Subject *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. B.Tech 2026 Counseling Schedule Announced"
              className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Category / Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="Admission Notice">Admission Notice</option>
                <option value="Exam Circular">Exam Circular</option>
                <option value="Scholarship Alert">Scholarship Alert</option>
                <option value="Counseling Update">Counseling Update</option>
                <option value="Rankings">Rankings</option>
                <option value="General Notice">General Notice</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Publish Date</label>
              <input
                type="date"
                required
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="DRAFT">DRAFT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Banner / Thumbnail Image URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Circular Description & Content *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Full details of the announcement, links to apply, cutoff scores, deadlines..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#4A7B5B] leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs"
              style={{ background: "#4A7B5B" }}
            >
              {isSubmitting ? "Publishing..." : updateItem?.id ? "Update Notice" : "Publish Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// DELETE CONFIRMATION MODAL
// -------------------------------------------------------------
function DeleteConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl border border-gray-100 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[#1E293B] mb-1">{title}</h3>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">{message}</p>

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-xs disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
