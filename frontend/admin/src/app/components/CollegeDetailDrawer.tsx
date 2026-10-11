import React, { useState } from "react";
import {
  X,
  MapPin,
  Building,
  Globe,
  Star,
  Users,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  BedDouble,
  Award,
  Image as ImageIcon,
  BookOpen,
  ExternalLink,
  GraduationCap,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collegesApi, College } from "../../api/colleges.api";

interface CollegeDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  college: College | null;
  onEdit: (college: College) => void;
}

export default function CollegeDetailDrawer({
  isOpen,
  onClose,
  college: initialCollege,
  onEdit,
}: CollegeDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "courses" | "hostel" | "placement" | "materials" | "gallery"
  >("overview");

  const queryClient = useQueryClient();

  // Fetch full college data with relations (courses, galleries, studyMaterials)
  const { data: fullCollegeRes, isLoading } = useQuery({
    queryKey: ["college_detail", initialCollege?.id],
    queryFn: () => collegesApi.findOne(initialCollege!.id),
    enabled: !!initialCollege?.id && isOpen,
  });

  const college = fullCollegeRes?.data || initialCollege;

  // Toggle Publish / Unpublish mutation
  const publishMutation = useMutation({
    mutationFn: (newStatus: "PUBLISHED" | "DRAFT") =>
      collegesApi.setPublishStatus(college!.id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_colleges"] });
      queryClient.invalidateQueries({ queryKey: ["college_detail", college?.id] });
    },
  });

  // Toggle Featured on Homepage mutation
  const featuredMutation = useMutation({
    mutationFn: (featured: boolean) =>
      collegesApi.setFeaturedStatus(college!.id, featured),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_colleges"] });
      queryClient.invalidateQueries({ queryKey: ["college_detail", college?.id] });
    },
  });

  if (!isOpen || !college) return null;

  const isPublished = college.status === "PUBLISHED";
  const galleryList = college.galleries || college.gallery || [];
  const materialsList = college.studyMaterials || college.StudyMaterial || [];

  const handleTogglePublish = () => {
    const nextStatus = isPublished ? "DRAFT" : "PUBLISHED";
    publishMutation.mutate(nextStatus);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "courses", label: `Courses (${college.courses?.length || 0})`, icon: GraduationCap },
    { id: "hostel", label: "Hostel", icon: BedDouble },
    { id: "placement", label: "Placement", icon: Award },
    { id: "materials", label: `Materials (${materialsList.length})`, icon: BookOpen },
    { id: "gallery", label: `Gallery (${galleryList.length})`, icon: ImageIcon },
  ] as const;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header Cover & Identity */}
        <div className="h-44 relative shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: college.banner
                ? `url(${college.banner})`
                : "linear-gradient(135deg, #E8F3EC, #D1FAE5)",
              backgroundColor: "#E8F3EC",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Quick Publish Badge on Top-Left */}
          <div className="absolute top-4 left-4 z-20">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm ${
                isPublished
                  ? "bg-[#E8F3EC] text-[#4A7B5B] border border-[#A7D7B5]"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              ● {college.status || "DRAFT"}
            </span>
          </div>

          <div className="absolute -bottom-6 left-6 right-6 flex items-end justify-between gap-4 z-10">
            <div className="flex items-end gap-3 min-w-0">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-lg p-1.5 flex items-center justify-center border-2 border-white overflow-hidden shrink-0">
                {college.logo ? (
                  <img
                    src={college.logo}
                    alt={college.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <Building className="w-10 h-10 text-[#4A7B5B]" />
                )}
              </div>
              <div className="pb-1 min-w-0">
                <h2 className="text-lg font-bold text-white mb-0.5 drop-shadow truncate">
                  {college.name}
                </h2>
                <div className="flex items-center gap-1.5 text-white/90 text-xs truncate">
                  <MapPin className="w-3.5 h-3.5 shrink-0" /> {college.city}, {college.state}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between p-4 border-b border-[#F1F5F9] mt-8 gap-2 shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePublish}
              disabled={publishMutation.isPending}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isPublished
                  ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                  : "bg-[#E8F3EC] text-[#4A7B5B] border border-[#A7D7B5] hover:bg-[#d5ebd9]"
              }`}
            >
              {publishMutation.isPending
                ? "Updating..."
                : isPublished
                ? "Unpublish to Draft"
                : "Publish Live"}
            </button>

            <button
              type="button"
              onClick={() => featuredMutation.mutate(!college.featured)}
              disabled={featuredMutation.isPending}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                college.featured
                  ? "bg-[#FEF3C7] text-[#D97706] border-amber-300 hover:bg-amber-100"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {featuredMutation.isPending
                ? "Updating..."
                : college.featured
                ? "⭐ Featured on Homepage"
                : "☆ Feature on Homepage"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {college.website && (
              <a
                href={college.website}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl text-xs font-medium border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] flex items-center gap-1"
              >
                <Globe className="w-3.5 h-3.5" /> Website
              </a>
            )}
            {college.brochureUrl && (
              <a
                href={college.brochureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-300 text-[#4A7B5B] bg-[#E8F3EC] hover:bg-[#d5ebd9] flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" /> Brochure
              </a>
            )}
            <button
              onClick={() => {
                onClose();
                onEdit(college);
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1"
              style={{ background: "#4A7B5B" }}
            >
              Edit College Profile
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[#F1F5F9] bg-[#FAFAFA] overflow-x-auto shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  active
                    ? "bg-white text-[#4A7B5B] shadow-xs font-semibold border border-[#E2E8F0]"
                    : "text-[#64748B] hover:text-[#4A7B5B]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F8FAFC]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Quick Key Facts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-[11px] text-[#94A3B8] font-medium mb-0.5">Established</div>
                  <div className="text-sm font-semibold text-[#4A7B5B]">
                    {college.establishedYear || "N/A"}
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-[11px] text-[#94A3B8] font-medium mb-0.5">Ownership</div>
                  <div className="text-sm font-semibold text-[#4A7B5B] capitalize">
                    {college.ownership?.toLowerCase() || "N/A"}
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-[11px] text-[#94A3B8] font-medium mb-0.5">Type</div>
                  <div className="text-sm font-semibold text-[#4A7B5B] capitalize">
                    {college.type?.toLowerCase() || "N/A"}
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-[11px] text-[#94A3B8] font-medium mb-0.5">NAAC Grade</div>
                  <div className="text-sm font-semibold text-[#4A7B5B]">
                    {college.naacGrade || "N/A"}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white p-4 rounded-xl border border-[#F1F5F9] shadow-xs">
                <h3 className="text-xs font-semibold text-[#4A7B5B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#4A7B5B]" /> About Institution
                </h3>
                <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-line">
                  {college.description || college.shortDescription || "No detailed overview provided."}
                </p>
              </div>

              {/* Contact Details */}
              <div className="bg-white p-4 rounded-xl border border-[#F1F5F9] shadow-xs">
                <h3 className="text-xs font-semibold text-[#4A7B5B] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#4A7B5B]" /> Contact & Campus Location
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#475569]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#94A3B8] shrink-0" />
                    <span className="truncate">{college.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#94A3B8] shrink-0" />
                    <span>{college.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-[#94A3B8] mt-0.5 shrink-0" />
                    <span>
                      {college.address ? `${college.address}, ` : ""}
                      {college.city}, {college.state} {college.pincode || ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Approvals */}
              {college.approvals && college.approvals.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <h3 className="text-xs font-semibold text-[#4A7B5B] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4A7B5B]" /> Accreditations & Recognitions
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {college.approvals.map((a: string) => (
                      <span
                        key={a}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F1F5F9] text-[#475569]"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SEO Summary */}
              <div className="bg-white p-4 rounded-xl border border-[#F1F5F9] shadow-xs">
                <h3 className="text-xs font-semibold text-[#4A7B5B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#4A7B5B]" /> Search Engine Optimization (SEO)
                </h3>
                <div className="text-xs text-[#64748B] space-y-1">
                  <div>
                    <span className="font-medium text-[#475569]">Slug:</span>{" "}
                    <code>{college.slug || "auto-generated"}</code>
                  </div>
                  <div>
                    <span className="font-medium text-[#475569]">SEO Title:</span>{" "}
                    {college.seoTitle || `${college.name} - Admissions, Courses & Fees`}
                  </div>
                  <div>
                    <span className="font-medium text-[#475569]">SEO Description:</span>{" "}
                    {college.seoDescription || "Configured for public ranking"}
                  </div>
                  {college.seoKeywords && college.seoKeywords.length > 0 && (
                    <div>
                      <span className="font-medium text-[#475569]">Keywords:</span>{" "}
                      {college.seoKeywords.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COURSES & FEES */}
          {activeTab === "courses" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#4A7B5B] uppercase tracking-wider">
                  Offered Academic Programs ({college.courses?.length || 0})
                </h3>
              </div>
              {(!college.courses || college.courses.length === 0) && (
                <div className="p-8 text-center bg-white rounded-xl border border-[#F1F5F9] text-xs text-[#94A3B8]">
                  No courses listed yet. Add courses by clicking "Edit College Profile".
                </div>
              )}
              {college.courses?.map((course: any) => (
                <div
                  key={course.id}
                  className="bg-white p-4 rounded-xl border border-[#F1F5F9] shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-[#4A7B5B]">{course.name}</h4>
                      <div className="text-xs text-[#64748B]">
                        {course.degree || course.level || "Degree"} • {course.duration}
                        {course.specialization ? ` • ${course.specialization}` : ""}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        course.status === "ACTIVE"
                          ? "bg-[#E8F3EC] text-[#4A7B5B]"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {course.status || "ACTIVE"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#F8FAFC] text-xs">
                    <div>
                      <span className="text-[#94A3B8] block text-[10px]">Annual Fee</span>
                      <span className="font-semibold text-[#4A7B5B]">
                        {course.totalFees || course.fees ? `₹${(course.totalFees || course.fees).toLocaleString()}` : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#94A3B8] block text-[10px]">Total Seats</span>
                      <span className="font-semibold text-[#475569]">{course.seats || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[#94A3B8] block text-[10px]">Eligibility</span>
                      <span className="font-medium text-[#475569] truncate block">
                        {course.eligibility || "Standard"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#94A3B8] block text-[10px]">Application Fee</span>
                      <span className="font-medium text-[#475569]">
                        {course.applicationFee ? `₹${course.applicationFee}` : "Free"}
                      </span>
                    </div>
                  </div>

                  {course.scholarshipInfo && (
                    <div className="text-[11px] text-[#4A7B5B] bg-[#E8F3EC] p-2 rounded-lg">
                      <span className="font-semibold">Scholarship:</span> {course.scholarshipInfo}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: HOSTEL */}
          {activeTab === "hostel" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-xs text-[#94A3B8] font-medium mb-1">Boys Hostel</div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        college.boysHostelAvailable ? "bg-[#4A7B5B]" : "bg-red-400"
                      }`}
                    />
                    {college.boysHostelAvailable ? "Available On-Campus" : "Not Available"}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-xs text-[#94A3B8] font-medium mb-1">Girls Hostel</div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        college.girlsHostelAvailable ? "bg-[#4A7B5B]" : "bg-red-400"
                      }`}
                    />
                    {college.girlsHostelAvailable ? "Available On-Campus" : "Not Available"}
                  </div>
                </div>
              </div>

              {college.hostelFee && (
                <div className="bg-white p-4 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-xs text-[#94A3B8] font-medium mb-1">Hostel Fee Structure</div>
                  <div className="text-sm font-semibold text-[#4A7B5B]">{college.hostelFee}</div>
                </div>
              )}

              {college.messInfo && (
                <div className="bg-white p-4 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-xs text-[#94A3B8] font-medium mb-1">Mess & Food Info</div>
                  <div className="text-xs text-[#475569]">{college.messInfo}</div>
                </div>
              )}

              {college.hostelFacilities && college.hostelFacilities.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-xs text-[#94A3B8] font-medium mb-2">Hostel Amenities</div>
                  <div className="flex flex-wrap gap-1.5">
                    {college.hostelFacilities.map((f: string) => (
                      <span
                        key={f}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E8F3EC] text-[#4A7B5B]"
                      >
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {college.otherFacilities && (
                <div className="bg-white p-4 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-xs text-[#94A3B8] font-medium mb-1">Other Campus Facilities</div>
                  <div className="text-xs text-[#475569]">{college.otherFacilities}</div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PLACEMENT */}
          {activeTab === "placement" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-[11px] text-[#94A3B8] font-medium mb-0.5">Placement Rate</div>
                  <div className="text-base font-bold text-[#4A7B5B]">
                    {college.placementPercentage || college.placementRate ? `${college.placementPercentage || college.placementRate}%` : "N/A"}
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-[11px] text-[#94A3B8] font-medium mb-0.5">Avg Package</div>
                  <div className="text-base font-bold text-[#4A7B5B]">
                    {college.averagePackage ? `₹${college.averagePackage} LPA` : "N/A"}
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-[11px] text-[#94A3B8] font-medium mb-0.5">Highest Package</div>
                  <div className="text-base font-bold text-[#D97706]">
                    {college.highestPackage ? `₹${college.highestPackage} LPA` : "N/A"}
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <div className="text-[11px] text-[#94A3B8] font-medium mb-0.5">Median Package</div>
                  <div className="text-base font-bold text-[#4A7B5B]">
                    {college.medianPackage ? `₹${college.medianPackage} LPA` : "N/A"}
                  </div>
                </div>
              </div>

              {college.placementYear && (
                <div className="text-xs text-[#64748B] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                  Placement statistics report session:{" "}
                  <span className="font-semibold text-[#475569]">{college.placementYear}</span>
                </div>
              )}

              {college.placementInfo && (
                <div className="bg-white p-4 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <h3 className="text-xs font-semibold text-[#4A7B5B] uppercase tracking-wider mb-2">
                    Placement Overview & Trends
                  </h3>
                  <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-line">
                    {college.placementInfo}
                  </p>
                </div>
              )}

              {college.placementCompanies && college.placementCompanies.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-[#F1F5F9] shadow-xs">
                  <h3 className="text-xs font-semibold text-[#4A7B5B] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#4A7B5B]" /> Major Hiring Recruiters
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {college.placementCompanies.map((c: string) => (
                      <span
                        key={c}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#FEF3C7] text-[#D97706]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: STUDY MATERIALS */}
          {activeTab === "materials" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#4A7B5B] uppercase tracking-wider">
                  Linked Study Materials ({materialsList.length})
                </h3>
              </div>

              {materialsList.length === 0 && (
                <div className="p-8 text-center bg-white rounded-xl border border-[#F1F5F9] text-xs text-[#94A3B8]">
                  No study materials linked to this college yet. Link resources via Edit Profile.
                </div>
              )}

              {materialsList.map((mat: any) => (
                <div
                  key={mat.id}
                  className="bg-white p-3.5 rounded-xl border border-[#F1F5F9] shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#4A7B5B] truncate">{mat.title}</div>
                    <div className="text-[11px] text-[#94A3B8]">
                      {mat.subject || "Subject"} {mat.stream ? `• ${mat.stream}` : ""}
                    </div>
                  </div>
                  {mat.fileUrl && (
                    <a
                      href={mat.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#E8F3EC] text-[#4A7B5B] hover:bg-[#d5ebd9] shrink-0 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 6: GALLERY */}
          {activeTab === "gallery" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#4A7B5B] uppercase tracking-wider">
                  Campus Visual Gallery ({galleryList.length})
                </h3>
              </div>

              {galleryList.length === 0 && (
                <div className="p-8 text-center bg-white rounded-xl border border-[#F1F5F9] text-xs text-[#94A3B8]">
                  No gallery images added yet. Upload images via Edit Profile.
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {galleryList.map((img: any) => (
                  <div
                    key={img.id || img.imageUrl}
                    className="relative group rounded-xl overflow-hidden border border-[#E2E8F0] bg-white aspect-video"
                  >
                    <img
                      src={img.imageUrl}
                      alt={img.caption || "Campus"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {img.isCover && (
                      <span className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded font-semibold bg-[#4A7B5B] text-white">
                        Cover
                      </span>
                    )}
                    {img.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <span className="text-[10px] text-white font-medium truncate block">
                          {img.caption}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
