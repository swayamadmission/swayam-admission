import React, { useState, useEffect } from "react";
import {
  Building2,
  GraduationCap,
  BedDouble,
  Award,
  Image as ImageIcon,
  BookOpen,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Globe,
  Mail,
  Phone,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collegesApi, College, CollegeGallery } from "../../../api/colleges.api";

interface PartnerProfileManagerProps {
  collegeId: string;
}

export const PartnerProfileManager: React.FC<PartnerProfileManagerProps> = ({ collegeId }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "overview" | "courses" | "hostel" | "placement" | "materials" | "gallery"
  >("overview");

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch college details
  const { data: collegeRes, isLoading } = useQuery({
    queryKey: ["partner_college_profile", collegeId],
    queryFn: () => collegesApi.findOne(collegeId),
    enabled: !!collegeId,
  });

  const college = collegeRes?.data;

  // Form State
  const [formData, setFormData] = useState<Partial<College>>({});
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [galleryList, setGalleryList] = useState<CollegeGallery[]>([]);
  const [newRecruiter, setNewRecruiter] = useState("");
  const [newFacility, setNewFacility] = useState("");
  const [newApproval, setNewApproval] = useState("");

  // New gallery item input
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageCaption, setNewImageCaption] = useState("");
  const [newImageIsCover, setNewImageIsCover] = useState(false);

  // New course item input
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseDegree, setNewCourseDegree] = useState("Undergraduate");
  const [newCourseSpecialization, setNewCourseSpecialization] = useState("");
  const [newCourseDuration, setNewCourseDuration] = useState("4 Years");
  const [newCourseFees, setNewCourseFees] = useState("");
  const [newCourseSeats, setNewCourseSeats] = useState("");
  const [newCourseEligibility, setNewCourseEligibility] = useState("");

  useEffect(() => {
    if (college) {
      setFormData({
        name: college.name || "",
        shortDescription: college.shortDescription || "",
        fullDescription: college.fullDescription || college.description || "",
        logo: college.logo || "",
        banner: college.banner || "",
        establishedYear: college.establishedYear,
        ownership: college.ownership || "PRIVATE",
        type: college.type || "ENGINEERING",
        city: college.city || "",
        state: college.state || "",
        address: college.address || "",
        pincode: college.pincode || "",
        website: college.website || "",
        email: college.email || "",
        phone: college.phone || "",
        whatsapp: college.whatsapp || "",
        contactPerson: college.contactPerson || "",
        naacGrade: college.naacGrade || "",
        approvals: college.approvals || [],
        // Hostel
        boysHostelAvailable: college.boysHostelAvailable ?? false,
        girlsHostelAvailable: college.girlsHostelAvailable ?? false,
        hostelFee: college.hostelFee || "",
        messInfo: college.messInfo || "",
        hostelFacilities: college.hostelFacilities || [],
        otherFacilities: college.otherFacilities || "",
        // Placement
        placementPercentage: college.placementPercentage || college.placementRate,
        averagePackage: college.averagePackage,
        highestPackage: college.highestPackage,
        medianPackage: college.medianPackage,
        placementYear: college.placementYear || "2024-25",
        placementCompanies: college.placementCompanies || [],
        placementInfo: college.placementInfo || "",
        // SEO
        seoTitle: college.seoTitle || "",
        seoDescription: college.seoDescription || "",
      });

      setCoursesList(college.courses || []);
      setGalleryList(college.galleries || college.gallery || []);
    }
  }, [college]);

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<College>) => collegesApi.update(collegeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner_college_profile", collegeId] });
      queryClient.invalidateQueries({ queryKey: ["admin_colleges"] });
      queryClient.invalidateQueries({ queryKey: ["college_detail", collegeId] });
      showNotification("success", "Institutional profile synchronized and saved successfully!");
    },
    onError: (err: any) => {
      showNotification("error", err?.response?.data?.message || "Failed to update profile.");
    },
  });

  const handleFieldChange = (field: keyof College, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  // Add gallery image
  const handleAddGalleryImage = async () => {
    if (!newImageUrl.trim()) return;
    try {
      await collegesApi.addGalleryImage(collegeId, {
        imageUrl: newImageUrl.trim(),
        caption: newImageCaption.trim() || undefined,
        isCover: newImageIsCover,
      });
      setNewImageUrl("");
      setNewImageCaption("");
      setNewImageIsCover(false);
      queryClient.invalidateQueries({ queryKey: ["partner_college_profile", collegeId] });
      showNotification("success", "Gallery image added and synchronized!");
    } catch (e: any) {
      showNotification("error", e?.response?.data?.message || "Failed to add gallery image.");
    }
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    try {
      await collegesApi.deleteGalleryImage(collegeId, imageId);
      queryClient.invalidateQueries({ queryKey: ["partner_college_profile", collegeId] });
      showNotification("success", "Gallery image removed.");
    } catch (e: any) {
      showNotification("error", "Failed to remove image.");
    }
  };

  // Add course
  const handleAddCourse = async () => {
    if (!newCourseName.trim()) return;
    try {
      await collegesApi.addCourse(collegeId, {
        name: newCourseName.trim(),
        level: newCourseDegree,
        degree: newCourseDegree,
        specialization: newCourseSpecialization.trim() || undefined,
        duration: newCourseDuration,
        totalFees: newCourseFees ? Number(newCourseFees) : undefined,
        fees: newCourseFees ? Number(newCourseFees) : undefined,
        seats: newCourseSeats ? Number(newCourseSeats) : undefined,
        eligibility: newCourseEligibility.trim() || undefined,
        status: "ACTIVE",
      });
      setNewCourseName("");
      setNewCourseSpecialization("");
      setNewCourseFees("");
      setNewCourseSeats("");
      setNewCourseEligibility("");
      queryClient.invalidateQueries({ queryKey: ["partner_college_profile", collegeId] });
      showNotification("success", "Course added successfully!");
    } catch (e: any) {
      showNotification("error", e?.response?.data?.message || "Failed to add course.");
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await collegesApi.deleteCourse(courseId);
      queryClient.invalidateQueries({ queryKey: ["partner_college_profile", collegeId] });
      showNotification("success", "Course removed.");
    } catch (e: any) {
      showNotification("error", "Failed to remove course.");
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "courses", label: `Courses & Fees (${coursesList.length})`, icon: GraduationCap },
    { id: "hostel", label: "Hostel Facilities", icon: BedDouble },
    { id: "placement", label: "Placement Records", icon: Award },
    { id: "materials", label: `Study Materials (${college?.studyMaterials?.length || college?.StudyMaterial?.length || 0})`, icon: BookOpen },
    { id: "gallery", label: `Campus Gallery (${galleryList.length})`, icon: ImageIcon },
  ] as const;

  if (isLoading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-[#E2E8F0] text-center text-[#64748B]">
        Loading institutional profile...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Synchronized Notice */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#4A7B5B]">
              {college?.name || "College Organization Profile"}
            </h2>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                college?.status === "PUBLISHED"
                  ? "bg-[#E8F3EC] text-[#4A7B5B] border border-[#A7D7B5]"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              ● {college?.status || "DRAFT"}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Partner updates synchronize directly with the Central Database, Public College Page, and Student Portal.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="h-10 px-5 rounded-xl font-semibold text-white text-sm flex items-center gap-2 shadow-sm transition-all hover:opacity-90 disabled:opacity-50 shrink-0"
          style={{ background: "#4A7B5B" }}
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? "Synchronizing..." : "Save Changes"}
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            notification.type === "success"
              ? "bg-[#E8F3EC] text-[#4A7B5B] border border-[#A7D7B5]"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Section Subtabs */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-[#E2E8F0] overflow-x-auto shadow-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                active
                  ? "bg-[#4A7B5B] text-white shadow-xs"
                  : "text-[#64748B] hover:text-[#4A7B5B] hover:bg-[#F8FAFC]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-6">
          <div className="border-b border-[#F1F5F9] pb-3">
            <h3 className="text-sm font-bold text-[#4A7B5B] flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Institutional Identity & Overview
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              General institutional information displayed to prospective students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">College Name *</label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Establishment Year</label>
              <input
                type="number"
                value={formData.establishedYear || ""}
                onChange={(e) => handleFieldChange("establishedYear", Number(e.target.value))}
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Logo URL</label>
              <input
                type="text"
                value={formData.logo || ""}
                onChange={(e) => handleFieldChange("logo", e.target.value)}
                placeholder="https://..."
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Cover / Banner Image URL</label>
              <input
                type="text"
                value={formData.banner || ""}
                onChange={(e) => handleFieldChange("banner", e.target.value)}
                placeholder="https://..."
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Ownership Type</label>
              <select
                value={formData.ownership || "PRIVATE"}
                onChange={(e) => handleFieldChange("ownership", e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="GOVERNMENT">Government / Public</option>
                <option value="PRIVATE">Private</option>
                <option value="DEEMED">Deemed to be University</option>
                <option value="AUTONOMOUS">Autonomous</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">NAAC Grade</label>
              <input
                type="text"
                value={formData.naacGrade || ""}
                onChange={(e) => handleFieldChange("naacGrade", e.target.value)}
                placeholder="A++, A+, A, B++"
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Official Website</label>
              <input
                type="text"
                value={formData.website || ""}
                onChange={(e) => handleFieldChange("website", e.target.value)}
                placeholder="https://..."
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Admission Email</label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                placeholder="admissions@institution.edu"
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone || ""}
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                placeholder="+91..."
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Contact Person / Dean</label>
              <input
                type="text"
                value={formData.contactPerson || ""}
                onChange={(e) => handleFieldChange("contactPerson", e.target.value)}
                placeholder="Prof. John Doe"
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">City / District *</label>
              <input
                type="text"
                value={formData.city || ""}
                onChange={(e) => handleFieldChange("city", e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">State *</label>
              <input
                type="text"
                value={formData.state || ""}
                onChange={(e) => handleFieldChange("state", e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#475569] mb-1">Full Campus Address</label>
              <input
                type="text"
                value={formData.address || ""}
                onChange={(e) => handleFieldChange("address", e.target.value)}
                placeholder="Sector / Road, Landmark..."
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#475569] mb-1">Detailed Description & Overview</label>
              <textarea
                rows={4}
                value={formData.fullDescription || ""}
                onChange={(e) => handleFieldChange("fullDescription", e.target.value)}
                placeholder="Institutional background, vision, campus environment, accreditation..."
                className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: COURSES & FEES */}
      {activeTab === "courses" && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-6">
          <div className="border-b border-[#F1F5F9] pb-3">
            <h3 className="text-sm font-bold text-[#4A7B5B] flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Academic Programs & Fee Matrix
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Add programs with fees, eligibility, and intake capacity.
            </p>
          </div>

          {/* Add Course Form */}
          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-3">
            <div className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider">
              Add New Academic Course
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#475569] mb-1">Course Name *</label>
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science"
                  className="w-full h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#475569] mb-1">Level / Degree</label>
                <select
                  value={newCourseDegree}
                  onChange={(e) => setNewCourseDegree(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Postgraduate">Postgraduate</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Doctorate">Doctorate / Ph.D.</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#475569] mb-1">Specialization</label>
                <input
                  type="text"
                  value={newCourseSpecialization}
                  onChange={(e) => setNewCourseSpecialization(e.target.value)}
                  placeholder="e.g. AI & Machine Learning"
                  className="w-full h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#475569] mb-1">Duration</label>
                <input
                  type="text"
                  value={newCourseDuration}
                  onChange={(e) => setNewCourseDuration(e.target.value)}
                  placeholder="e.g. 4 Years"
                  className="w-full h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#475569] mb-1">Annual Fee (₹)</label>
                <input
                  type="number"
                  value={newCourseFees}
                  onChange={(e) => setNewCourseFees(e.target.value)}
                  placeholder="e.g. 120000"
                  className="w-full h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#475569] mb-1">Seats / Intake</label>
                <input
                  type="number"
                  value={newCourseSeats}
                  onChange={(e) => setNewCourseSeats(e.target.value)}
                  placeholder="e.g. 60"
                  className="w-full h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-[11px] font-medium text-[#475569] mb-1">Eligibility</label>
                <input
                  type="text"
                  value={newCourseEligibility}
                  onChange={(e) => setNewCourseEligibility(e.target.value)}
                  placeholder="e.g. 10+2 with 60% in PCM, JEE Main valid score"
                  className="w-full h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddCourse}
                className="h-8 px-4 rounded-lg text-xs font-semibold text-white flex items-center gap-1 shadow-xs"
                style={{ background: "#4A7B5B" }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Program
              </button>
            </div>
          </div>

          {/* Existing Courses List */}
          <div className="space-y-3">
            {coursesList.length === 0 && (
              <div className="p-8 text-center bg-[#F8FAFC] rounded-xl text-xs text-[#94A3B8]">
                No courses listed yet. Add programs above.
              </div>
            )}
            {coursesList.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-[#4A7B5B] truncate">{c.name}</div>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    {c.degree || c.level} • {c.duration} {c.specialization ? `• ${c.specialization}` : ""}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#475569] mt-1.5">
                    <span>
                      Fee:{" "}
                      <strong className="text-[#4A7B5B]">
                        {c.fees || c.totalFees ? `₹${(c.fees || c.totalFees).toLocaleString()}` : "N/A"}
                      </strong>
                    </span>
                    <span>Seats: {c.seats || "N/A"}</span>
                    {c.eligibility && <span className="truncate">Eligibility: {c.eligibility}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCourse(c.id)}
                  className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: HOSTEL */}
      {activeTab === "hostel" && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-6">
          <div className="border-b border-[#F1F5F9] pb-3">
            <h3 className="text-sm font-bold text-[#4A7B5B] flex items-center gap-2">
              <BedDouble className="w-4 h-4" /> Hostel & Accommodation Facilities
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Specify on-campus accommodation options, pricing, and food details.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
              <input
                type="checkbox"
                id="boysHostel"
                checked={formData.boysHostelAvailable ?? false}
                onChange={(e) => handleFieldChange("boysHostelAvailable", e.target.checked)}
                className="w-4 h-4 accent-[#4A7B5B] rounded cursor-pointer"
              />
              <label htmlFor="boysHostel" className="text-xs font-semibold text-[#475569] cursor-pointer">
                Boys Hostel Available On Campus
              </label>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
              <input
                type="checkbox"
                id="girlsHostel"
                checked={formData.girlsHostelAvailable ?? false}
                onChange={(e) => handleFieldChange("girlsHostelAvailable", e.target.checked)}
                className="w-4 h-4 accent-[#4A7B5B] rounded cursor-pointer"
              />
              <label htmlFor="girlsHostel" className="text-xs font-semibold text-[#475569] cursor-pointer">
                Girls Hostel Available On Campus
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Hostel Fee Range</label>
              <input
                type="text"
                value={formData.hostelFee || ""}
                onChange={(e) => handleFieldChange("hostelFee", e.target.value)}
                placeholder="e.g. ₹60,000 - ₹95,000 per year"
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Mess & Food Info</label>
              <input
                type="text"
                value={formData.messInfo || ""}
                onChange={(e) => handleFieldChange("messInfo", e.target.value)}
                placeholder="e.g. 4-meal hygienic menu, veg/non-veg options"
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#475569] mb-1">Other Campus Amenities</label>
              <textarea
                rows={3}
                value={formData.otherFacilities || ""}
                onChange={(e) => handleFieldChange("otherFacilities", e.target.value)}
                placeholder="Wi-Fi, 24/7 power backup, sports complex, gym, medical center..."
                className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: PLACEMENT */}
      {activeTab === "placement" && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-6">
          <div className="border-b border-[#F1F5F9] pb-3">
            <h3 className="text-sm font-bold text-[#4A7B5B] flex items-center gap-2">
              <Award className="w-4 h-4" /> Career & Placement Metrics
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Placement statistics, top packages, and hiring company network.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Placement Rate (%)</label>
              <input
                type="number"
                value={formData.placementPercentage || ""}
                onChange={(e) => handleFieldChange("placementPercentage", Number(e.target.value))}
                placeholder="e.g. 88"
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Average Package (LPA)</label>
              <input
                type="number"
                step="0.1"
                value={formData.averagePackage || ""}
                onChange={(e) => handleFieldChange("averagePackage", Number(e.target.value))}
                placeholder="e.g. 7.5"
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Highest Package (LPA)</label>
              <input
                type="number"
                step="0.1"
                value={formData.highestPackage || ""}
                onChange={(e) => handleFieldChange("highestPackage", Number(e.target.value))}
                placeholder="e.g. 42"
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Median Package (LPA)</label>
              <input
                type="number"
                step="0.1"
                value={formData.medianPackage || ""}
                onChange={(e) => handleFieldChange("medianPackage", Number(e.target.value))}
                placeholder="e.g. 6.8"
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#475569] mb-1">Placement Session Year</label>
              <input
                type="text"
                value={formData.placementYear || ""}
                onChange={(e) => handleFieldChange("placementYear", e.target.value)}
                placeholder="2024-25"
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-[#475569] mb-1">Placement Information & Highlights</label>
              <textarea
                rows={3}
                value={formData.placementInfo || ""}
                onChange={(e) => handleFieldChange("placementInfo", e.target.value)}
                placeholder="Highlight placement drives, prominent recruiters, international offers..."
                className="w-full p-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: STUDY MATERIALS */}
      {activeTab === "materials" && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="border-b border-[#F1F5F9] pb-3">
            <h3 className="text-sm font-bold text-[#4A7B5B] flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Academic Study Materials & Syllabi
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Materials linked from Swayam Admission repository to your college profile.
            </p>
          </div>

          <div className="space-y-3">
            {(!college?.studyMaterials || college.studyMaterials.length === 0) && (
              <div className="p-8 text-center bg-[#F8FAFC] rounded-xl text-xs text-[#94A3B8]">
                No study materials linked to this college yet.
              </div>
            )}
            {college?.studyMaterials?.map((mat: any) => (
              <div
                key={mat.id}
                className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#4A7B5B] truncate">{mat.title}</div>
                  <div className="text-[11px] text-[#94A3B8]">
                    {mat.subject || "Academic"} {mat.stream ? `• ${mat.stream}` : ""}
                  </div>
                </div>
                {mat.fileUrl && (
                  <a
                    href={mat.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#E8F3EC] text-[#4A7B5B] hover:bg-[#d5ebd9] flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View Resource
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: GALLERY */}
      {activeTab === "gallery" && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-6">
          <div className="border-b border-[#F1F5F9] pb-3">
            <h3 className="text-sm font-bold text-[#4A7B5B] flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Campus Visual Gallery
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Add campus photos with captions and designate a cover photo.
            </p>
          </div>

          {/* Add Image URL Form */}
          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-medium text-[#475569] mb-1">Image URL *</label>
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-medium text-[#475569] mb-1">Caption</label>
              <input
                type="text"
                value={newImageCaption}
                onChange={(e) => setNewImageCaption(e.target.value)}
                placeholder="e.g. Central Library & Auditorium"
                className="w-full h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
            <div className="flex items-center gap-2 pb-1.5 shrink-0">
              <input
                type="checkbox"
                id="isCoverNew"
                checked={newImageIsCover}
                onChange={(e) => setNewImageIsCover(e.target.checked)}
                className="w-4 h-4 accent-[#4A7B5B] rounded cursor-pointer"
              />
              <label htmlFor="isCoverNew" className="text-xs font-medium text-[#475569] cursor-pointer">
                Cover Photo
              </label>
            </div>
            <button
              type="button"
              onClick={handleAddGalleryImage}
              className="h-8 px-4 rounded-lg text-xs font-semibold text-white flex items-center gap-1 shadow-xs shrink-0"
              style={{ background: "#4A7B5B" }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Photo
            </button>
          </div>

          {/* Images Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {galleryList.length === 0 && (
              <div className="col-span-full p-8 text-center bg-[#F8FAFC] rounded-xl text-xs text-[#94A3B8]">
                No gallery images added yet.
              </div>
            )}
            {galleryList.map((img) => (
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
                {img.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteGalleryImage(img.id!)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
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
  );
};
