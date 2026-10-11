import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Building2,
  BookOpen,
  Home,
  Award,
  FileText,
  ImageIcon,
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  Upload,
  Download,
  ExternalLink,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collegesApi, College } from "../../api/colleges.api";
import { organizationApi, StateItem, DistrictItem } from "../../api/organization.api";

interface CollegeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  college?: College | null;
}

type TabKey = "overview" | "courses" | "hostel" | "placement" | "materials" | "gallery" | "seo";

export default function CollegeFormModal({ isOpen, onClose, college }: CollegeFormModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [formData, setFormData] = useState<Partial<College>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [statesList, setStatesList] = useState<StateItem[]>([]);
  const [districtsList, setDistrictsList] = useState<DistrictItem[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Gallery item draft for adding new image
  const [newGalleryImg, setNewGalleryImg] = useState({
    imageUrl: "",
    caption: "",
    isCover: false,
    sortOrder: 0,
  });

  // Course item draft for adding new course
  const [newCourse, setNewCourse] = useState({
    name: "",
    level: "UG",
    duration: "4 Years",
    totalFees: 0,
    semesterFees: 0,
    applicationFee: 0,
    seats: 60,
    eligibility: "",
    specialization: "",
    scholarshipInfo: "",
  });

  // Study material link draft
  const [materialLinkInput, setMaterialLinkInput] = useState("");
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Load complete college record if editing
  useEffect(() => {
    if (!isOpen) return;

    if (college?.id) {
      setIsLoadingDetails(true);
      collegesApi
        .findById(college.id)
        .then((res) => {
          if (res.data) {
            setFormData({
              ...res.data,
              approvals: res.data.approvals || [],
              placementCompanies: res.data.placementCompanies || [],
              hostelFacilities: res.data.hostelFacilities || [],
              seoKeywords: res.data.seoKeywords || [],
              gallery: res.data.gallery || [],
              courses: res.data.courses || [],
              StudyMaterial: res.data.StudyMaterial || [],
            });
          }
        })
        .catch(() => {
          setFormData({
            ...college,
            approvals: college.approvals || [],
            placementCompanies: college.placementCompanies || [],
            hostelFacilities: college.hostelFacilities || [],
            seoKeywords: college.seoKeywords || [],
            gallery: college.gallery || [],
            courses: college.courses || [],
            StudyMaterial: college.StudyMaterial || [],
          });
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    } else {
      setFormData({
        status: "PUBLISHED",
        type: "PRIVATE",
        ownership: "PRIVATE",
        approvals: ["UGC", "AICTE"],
        rating: 4.5,
        featured: false,
        verified: true,
        hostelAvailable: true,
        boysHostelAvailable: true,
        girlsHostelAvailable: true,
        hostelFacilities: ["Wi-Fi", "24/7 Security", "Gym", "Cafeteria"],
        placementCompanies: ["TCS", "Infosys", "Wipro", "Capgemini"],
        gallery: [],
        courses: [],
        StudyMaterial: [],
      });
    }
  }, [college, isOpen]);

  // Load states when modal opens
  useEffect(() => {
    if (!isOpen) return;
    organizationApi
      .getStates()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setStatesList(list);
      })
      .catch((err) => {
        console.error("Failed to load states:", err);
      });
  }, [isOpen]);

  // Load districts whenever stateId changes
  useEffect(() => {
    if (!formData.stateId) {
      setDistrictsList([]);
      return;
    }
    setLoadingDistricts(true);
    organizationApi
      .getDistricts(formData.stateId)
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setDistrictsList(list);
      })
      .catch((err) => {
        console.error("Failed to load districts:", err);
        setDistrictsList([]);
      })
      .finally(() => {
        setLoadingDistricts(false);
      });
  }, [formData.stateId]);

  // If college has state name but no stateId, try to resolve stateId once statesList is loaded
  useEffect(() => {
    if (statesList.length > 0 && formData.state && !formData.stateId) {
      const matched = statesList.find(
        (s) =>
          s.name.toLowerCase() === formData.state?.toLowerCase() ||
          s.code.toLowerCase() === formData.state?.toLowerCase()
      );
      if (matched) {
        setFormData((prev) => ({ ...prev, stateId: matched.id, state: matched.name }));
      }
    }
  }, [statesList, formData.state, formData.stateId]);

  // If college has city name but no districtId, try to resolve districtId once districtsList is loaded
  useEffect(() => {
    if (districtsList.length > 0 && formData.city && !formData.districtId) {
      const matched = districtsList.find(
        (d) => d.name.toLowerCase() === formData.city?.toLowerCase()
      );
      if (matched) {
        setFormData((prev) => ({ ...prev, districtId: matched.id, city: matched.name }));
      }
    }
  }, [districtsList, formData.city, formData.districtId]);

  const mutation = useMutation({
    mutationFn: (data: Partial<College>) => {
      if (college?.id) {
        return collegesApi.update(college.id, data);
      }
      return collegesApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_colleges"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      queryClient.invalidateQueries({ queryKey: ["admin_state_colleges"] });
      queryClient.invalidateQueries({ queryKey: ["admin_states_list"] });
      queryClient.invalidateQueries({ queryKey: ["admin_state_detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin_state_districts"] });
      queryClient.invalidateQueries({ queryKey: ["public_states"] });
      queryClient.invalidateQueries({ queryKey: ["public_state_detail"] });
      onClose();
    },
  });

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "number") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? undefined : Number(value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleTogglePublish = () => {
    const nextStatus = formData.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    setFormData((prev) => ({ ...prev, status: nextStatus }));
  };

  const handleAddGalleryImage = () => {
    if (!newGalleryImg.imageUrl.trim()) {
      alert("Please provide an image URL");
      return;
    }
    const updatedGallery = [
      ...(formData.gallery || []),
      {
        imageUrl: newGalleryImg.imageUrl.trim(),
        caption: newGalleryImg.caption.trim(),
        isCover: newGalleryImg.isCover,
        sortOrder: (formData.gallery?.length || 0),
      },
    ];
    setFormData((prev) => ({ ...prev, gallery: updatedGallery }));
    setNewGalleryImg({ imageUrl: "", caption: "", isCover: false, sortOrder: 0 });
  };

  const handleRemoveGalleryImage = (index: number) => {
    const updated = (formData.gallery || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, gallery: updated }));
  };

  const handleSetCoverImage = (index: number) => {
    const updated = (formData.gallery || []).map((img, i) => ({
      ...img,
      isCover: i === index,
    }));
    setFormData((prev) => ({ ...prev, gallery: updated }));
  };

  const handleMediaUpload = async (
    file: File,
    type: "logo" | "banner" | "brochure" | "gallery",
  ) => {
    if (!college?.id) {
      alert("Please save the college record first before uploading files directly.");
      return;
    }
    try {
      setUploadingField(type);
      const res = await collegesApi.uploadMedia(college.id, file, type);
      if (res.data?.url) {
        if (type === "logo") setFormData((prev) => ({ ...prev, logo: res.data.url }));
        if (type === "banner") setFormData((prev) => ({ ...prev, banner: res.data.url }));
        if (type === "brochure") setFormData((prev) => ({ ...prev, brochureUrl: res.data.url }));
        if (type === "gallery") {
          setFormData((prev) => ({
            ...prev,
            gallery: [
              ...(prev.gallery || []),
              {
                imageUrl: res.data.url,
                caption: file.name.replace(/\.[^/.]+$/, ""),
                isCover: false,
                sortOrder: prev.gallery?.length || 0,
              },
            ],
          }));
        }
      }
    } catch (err: any) {
      alert("Failed to upload media: " + (err.response?.data?.message || err.message || "Unknown error"));
    } finally {
      setUploadingField(null);
    }
  };

  const handleAddCourse = () => {
    if (!newCourse.name.trim()) {
      alert("Please provide course name");
      return;
    }
    const courseObj: any = {
      id: `temp-${Date.now()}`,
      name: newCourse.name.trim(),
      level: newCourse.level,
      duration: newCourse.duration,
      totalFees: Number(newCourse.totalFees) || 0,
      semesterFees: Number(newCourse.semesterFees) || 0,
      applicationFee: Number(newCourse.applicationFee) || 0,
      seats: Number(newCourse.seats) || 60,
      eligibility: newCourse.eligibility.trim(),
      specialization: newCourse.specialization.trim(),
      scholarshipInfo: newCourse.scholarshipInfo.trim(),
      status: "PUBLISHED",
    };
    setFormData((prev) => ({
      ...prev,
      courses: [...(prev.courses || []), courseObj],
    }));
    setNewCourse({
      name: "",
      level: "UG",
      duration: "4 Years",
      totalFees: 0,
      semesterFees: 0,
      applicationFee: 0,
      seats: 60,
      eligibility: "",
      specialization: "",
      scholarshipInfo: "",
    });
  };

  const handleRemoveCourse = (courseIndex: number) => {
    const updated = (formData.courses || []).filter((_, i) => i !== courseIndex);
    setFormData((prev) => ({ ...prev, courses: updated }));
  };

  const handleLinkMaterial = async () => {
    if (!materialLinkInput.trim() || !formData.id) return;
    try {
      await collegesApi.linkStudyMaterial(formData.id, materialLinkInput.trim());
      // Refresh study materials
      const res = await collegesApi.getStudyMaterials(formData.id);
      if (res.data) {
        setFormData((prev) => ({ ...prev, StudyMaterial: res.data }));
      }
      setMaterialLinkInput("");
    } catch (err: any) {
      alert("Failed to link study material: " + (err.response?.data?.message || err.message));
    }
  };

  const handleUnlinkMaterial = async (matId: string) => {
    if (!formData.id) return;
    try {
      await collegesApi.unlinkStudyMaterial(formData.id, matId);
      setFormData((prev) => ({
        ...prev,
        StudyMaterial: (prev.StudyMaterial || []).filter((m) => m.id !== matId),
      }));
    } catch (err: any) {
      alert("Failed to unlink study material");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const tabs: Array<{ key: TabKey; label: string; icon: any }> = [
    { key: "overview", label: "1. Overview", icon: Building2 },
    { key: "courses", label: "2. Courses & Fees", icon: BookOpen },
    { key: "hostel", label: "3. Hostel", icon: Home },
    { key: "placement", label: "4. Placement", icon: Award },
    { key: "materials", label: "5. Study Materials", icon: FileText },
    { key: "gallery", label: "6. Gallery", icon: ImageIcon },
    { key: "seo", label: "7. SEO & Settings", icon: Globe },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden border border-[#E2E8F0]">
        
        {/* Header with Title and Publish/Draft Toggle */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9] bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F3EC] flex items-center justify-center text-[#4A7B5B]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#4A7B5B]">
                  {college ? "Edit College Profile" : "Create New College"}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    formData.status === "PUBLISHED"
                      ? "bg-[#E8F3EC] text-[#4A7B5B]"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {formData.status === "PUBLISHED" ? "● Published" : "○ Draft Mode"}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Manage all 6 college profile sections matching the public student page
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTogglePublish}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                formData.status === "PUBLISHED"
                  ? "bg-white text-gray-700 hover:bg-gray-100 border-gray-200"
                  : "bg-[#4A7B5B] text-white hover:bg-[#3d6b4d] border-transparent"
              }`}
            >
              {formData.status === "PUBLISHED" ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-gray-500" /> Switch to Draft
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-white" /> Publish College
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="px-6 bg-white border-b border-gray-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-[#4A7B5B] text-[#4A7B5B] font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#4A7B5B]" : "text-gray-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
          {isLoadingDetails && (
            <div className="py-12 text-center text-xs text-gray-500 font-medium">
              Loading verified college sections...
            </div>
          )}

          {!isLoadingDetails && (
            <form id="collegeForm" onSubmit={handleSubmit} className="space-y-6">

              {/* 1. OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Basic Identity */}
                  <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#4A7B5B]" /> Basic Identity
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-gray-700 mb-1">College Name *</label>
                        <input
                          required
                          name="name"
                          value={formData.name || ""}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm font-medium"
                          placeholder="e.g. Indian Institute of Technology Bombay"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Established Year</label>
                        <input
                          type="number"
                          name="establishedYear"
                          value={formData.establishedYear || ""}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                          placeholder="e.g. 1958"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Ownership</label>
                        <select
                          name="ownership"
                          value={formData.ownership || "PRIVATE"}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:border-[#4A7B5B] outline-none text-sm"
                        >
                          <option value="PRIVATE">Private</option>
                          <option value="GOVERNMENT">Government</option>
                          <option value="TRUST">Trust</option>
                          <option value="PUBLIC_PRIVATE">Public-Private Partnership</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">College Type</label>
                        <select
                          name="type"
                          value={formData.type || "PRIVATE"}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:border-[#4A7B5B] outline-none text-sm"
                        >
                          <option value="PRIVATE">Private</option>
                          <option value="GOVERNMENT">Government</option>
                          <option value="DEEMED">Deemed to be University</option>
                          <option value="AUTONOMOUS">Autonomous Institute</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Rating (0 – 5 ★)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="rating"
                          value={formData.rating !== undefined ? formData.rating : 4.5}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                        />
                      </div>
                    </div>

                    {/* Featured College on Homepage Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-[#E8F3EC]/70 border border-[#A7D7B5]/70 rounded-2xl">
                      <div>
                        <div className="text-xs font-bold text-[#4A7B5B] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#F0AE1A]" />
                          Featured College on Homepage
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Enable to spotlight this institution in the "Popular Colleges" section on the Swayam Admission Home Page.
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          name="featured"
                          checked={Boolean(formData.featured)}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4A7B5B]"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1 text-xs">Short Description</label>
                      <textarea
                        name="shortDescription"
                        value={formData.shortDescription || ""}
                        onChange={handleChange}
                        rows={2}
                        className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-xs leading-relaxed"
                        placeholder="Concise overview of the institution for cards and snippets"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1 text-xs">Full Detailed Description</label>
                      <textarea
                        name="fullDescription"
                        value={formData.fullDescription || ""}
                        onChange={handleChange}
                        rows={4}
                        className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-xs leading-relaxed"
                        placeholder="Comprehensive history, accreditation, campus life, and academic ethos"
                      />
                    </div>
                  </div>

                  {/* Location & Contact */}
                  <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#4A7B5B]" /> Location & Official Contact
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">State *</label>
                        <select
                          required
                          name="stateId"
                          value={formData.stateId || ""}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const st = statesList.find((s) => s.id === selectedId);
                            setFormData((prev) => ({
                              ...prev,
                              stateId: selectedId,
                              state: st ? st.name : "",
                              districtId: "",
                              city: "",
                            }));
                          }}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:border-[#4A7B5B] outline-none text-sm font-medium"
                        >
                          <option value="">Select State</option>
                          {statesList.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name} ({st.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">City / District *</label>
                        <select
                          required
                          name="districtId"
                          value={formData.districtId || ""}
                          disabled={!formData.stateId || loadingDistricts}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const dist = districtsList.find((d) => d.id === selectedId);
                            setFormData((prev) => ({
                              ...prev,
                              districtId: selectedId,
                              city: dist ? dist.name : "",
                            }));
                          }}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:border-[#4A7B5B] outline-none text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {loadingDistricts
                              ? "Loading districts..."
                              : !formData.stateId
                              ? "Select State first"
                              : "Select District / City"}
                          </option>
                          {districtsList.map((dist) => (
                            <option key={dist.id} value={dist.id}>
                              {dist.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Pincode</label>
                        <input
                          name="pincode"
                          value={formData.pincode || ""}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block font-semibold text-gray-700 mb-1">Full Campus Address</label>
                        <input
                          name="address"
                          value={formData.address || ""}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                          placeholder="Street, locality, landmarks"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Official Website</label>
                        <input
                          name="website"
                          value={formData.website || ""}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                          placeholder="https://"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Admissions Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email || ""}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Helpline Phone</label>
                        <input
                          name="phone"
                          value={formData.phone || ""}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">WhatsApp Support</label>
                        <input
                          name="whatsapp"
                          value={formData.whatsapp || ""}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Contact Person / Dean</label>
                        <input
                          name="contactPerson"
                          value={formData.contactPerson || ""}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                          placeholder="e.g. Dr. A. Sharma (Registrar)"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Application / Admission Fee (₹)</label>
                        <input
                          type="number"
                          name="applicationFee"
                          value={formData.applicationFee || ""}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                          placeholder="1000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Accreditations & Media */}
                  <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#4A7B5B]" /> Accreditation & Media
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">NAAC Grade</label>
                        <input
                          name="naacGrade"
                          value={formData.naacGrade || ""}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                          placeholder="A++"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">NIRF Ranking</label>
                        <input
                          type="number"
                          name="nirfRanking"
                          value={formData.nirfRanking || ""}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Affiliated University</label>
                        <input
                          name="university"
                          value={formData.university || ""}
                          onChange={handleChange}
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block font-semibold text-gray-700 mb-1">Approvals (Comma Separated)</label>
                        <input
                          value={formData.approvals?.join(", ") || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              approvals: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }))
                          }
                          className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                          placeholder="UGC, AICTE, NBA, PCI"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-gray-700">Logo URL</label>
                          <label className="cursor-pointer text-[11px] font-bold text-[#4A7B5B] hover:underline flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            {uploadingField === "logo" ? "Uploading..." : "Upload / Replace"}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingField === "logo"}
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleMediaUpload(e.target.files[0], "logo");
                              }}
                            />
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            name="logo"
                            value={formData.logo || ""}
                            onChange={handleChange}
                            className="flex-1 h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                            placeholder="https://"
                          />
                          {formData.logo && (
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-gray-200 p-1 shrink-0 overflow-hidden flex items-center justify-center">
                              <img src={formData.logo} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-gray-700">Brochure URL</label>
                          <label className="cursor-pointer text-[11px] font-bold text-[#4A7B5B] hover:underline flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            {uploadingField === "brochure" ? "Uploading..." : "Upload / Replace"}
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              disabled={uploadingField === "brochure"}
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleMediaUpload(e.target.files[0], "brochure");
                              }}
                            />
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            name="brochureUrl"
                            value={formData.brochureUrl || ""}
                            onChange={handleChange}
                            className="flex-1 h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                            placeholder="https://.../brochure.pdf"
                          />
                          {formData.brochureUrl && (
                            <a
                              href={formData.brochureUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-10 px-2.5 rounded-xl border border-[#A7D7B5] bg-[#E8F3EC] text-[#4A7B5B] flex items-center gap-1 text-xs font-bold hover:bg-[#d5ebd9] shrink-0"
                              title="Preview Stored Brochure"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-gray-700">Cover / Banner Image URL</label>
                          <label className="cursor-pointer text-[11px] font-bold text-[#4A7B5B] hover:underline flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            {uploadingField === "banner" ? "Uploading..." : "Upload / Replace Banner"}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingField === "banner"}
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleMediaUpload(e.target.files[0], "banner");
                              }}
                            />
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            name="banner"
                            value={formData.banner || ""}
                            onChange={handleChange}
                            className="flex-1 h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                            placeholder="https://"
                          />
                          {formData.banner && (
                            <div className="w-16 h-10 rounded-xl bg-slate-50 border border-gray-200 overflow-hidden shrink-0">
                              <img src={formData.banner} alt="Banner" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pt-3 border-t border-gray-100 text-xs font-semibold text-gray-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="featured"
                          checked={!!formData.featured}
                          onChange={handleChange}
                          className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                        />
                        Featured College on Homepage
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="verified"
                          checked={!!formData.verified}
                          onChange={handleChange}
                          className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                        />
                        Verified Partner Institution
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. COURSES & FEES TAB */}
              {activeTab === "courses" && (
                <div className="space-y-6">
                  {/* Add New Course Section */}
                  <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider flex items-center gap-2">
                      <Plus className="w-4 h-4 text-[#4A7B5B]" /> Add Program / Course
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-gray-700 mb-1">Course Name *</label>
                        <input
                          value={newCourse.name}
                          onChange={(e) => setNewCourse((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none"
                          placeholder="e.g. B.Tech Computer Science & Engineering"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Level</label>
                        <select
                          value={newCourse.level}
                          onChange={(e) => setNewCourse((prev) => ({ ...prev, level: e.target.value }))}
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white focus:border-[#4A7B5B] outline-none"
                        >
                          <option value="UG">UG (Undergraduate)</option>
                          <option value="PG">PG (Postgraduate)</option>
                          <option value="DIPLOMA">Diploma</option>
                          <option value="DOCTORATE">Doctorate / Ph.D</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Duration</label>
                        <input
                          value={newCourse.duration}
                          onChange={(e) => setNewCourse((prev) => ({ ...prev, duration: e.target.value }))}
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none"
                          placeholder="4 Years"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Total Course Fee (₹)</label>
                        <input
                          type="number"
                          value={newCourse.totalFees || ""}
                          onChange={(e) => setNewCourse((prev) => ({ ...prev, totalFees: Number(e.target.value) }))}
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none"
                          placeholder="e.g. 750000"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Semester Fee (₹)</label>
                        <input
                          type="number"
                          value={newCourse.semesterFees || ""}
                          onChange={(e) => setNewCourse((prev) => ({ ...prev, semesterFees: Number(e.target.value) }))}
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Intake / Seats</label>
                        <input
                          type="number"
                          value={newCourse.seats || ""}
                          onChange={(e) => setNewCourse((prev) => ({ ...prev, seats: Number(e.target.value) }))}
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Specialization</label>
                        <input
                          value={newCourse.specialization}
                          onChange={(e) => setNewCourse((prev) => ({ ...prev, specialization: e.target.value }))}
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none"
                          placeholder="AI & Data Science"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-gray-700 mb-1">Eligibility Criteria</label>
                        <input
                          value={newCourse.eligibility}
                          onChange={(e) => setNewCourse((prev) => ({ ...prev, eligibility: e.target.value }))}
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none"
                          placeholder="10+2 with 60% in PCM and valid score"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-gray-700 mb-1">Scholarship Info</label>
                        <input
                          value={newCourse.scholarshipInfo}
                          onChange={(e) => setNewCourse((prev) => ({ ...prev, scholarshipInfo: e.target.value }))}
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none"
                          placeholder="Up to 100% merit scholarship for top rankers"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCourse}
                      className="px-4 py-2 bg-[#E8F3EC] hover:bg-[#d5ebd9] text-[#4A7B5B] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-[#4A7B5B]/30"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Course to College
                    </button>
                  </div>

                  {/* Existing Courses List */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">
                        Configured Courses ({formData.courses?.length || 0})
                      </span>
                    </div>

                    {!formData.courses || formData.courses.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400">
                        No courses added yet. Add a course above.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 text-xs">
                        {formData.courses.map((c: any, idx: number) => (
                          <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[#4A7B5B]">{c.name}</span>
                                {c.level && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                                    {c.level}
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-500 mt-1 flex items-center gap-3">
                                <span>Duration: {c.duration || "4 Years"}</span>
                                <span>· Seats: {c.seats || 60}</span>
                                <span>· Total Fee: ₹{(c.totalFees || c.fees || 0).toLocaleString()}</span>
                              </div>
                              {c.eligibility && (
                                <div className="text-gray-600 text-[11px] mt-1 italic">
                                  Eligibility: {c.eligibility}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveCourse(idx)}
                              className="w-8 h-8 rounded-lg hover:bg-rose-50 text-rose-500 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. HOSTEL TAB */}
              {activeTab === "hostel" && (
                <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-5 text-xs">
                  <h3 className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider flex items-center gap-2">
                    <Home className="w-4 h-4 text-[#4A7B5B]" /> Hostel & Residential Infrastructure
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <label className="flex items-center gap-2 p-4 rounded-xl border border-gray-200 cursor-pointer bg-gray-50 hover:bg-white transition-colors">
                      <input
                        type="checkbox"
                        name="hostelAvailable"
                        checked={!!formData.hostelAvailable}
                        onChange={handleChange}
                        className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                      />
                      <span className="font-bold text-gray-800">Campus Hostel Available</span>
                    </label>

                    <label className="flex items-center gap-2 p-4 rounded-xl border border-gray-200 cursor-pointer bg-gray-50 hover:bg-white transition-colors">
                      <input
                        type="checkbox"
                        name="boysHostelAvailable"
                        checked={!!formData.boysHostelAvailable}
                        onChange={handleChange}
                        className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                      />
                      <span className="font-bold text-gray-800">Boys Hostel Available</span>
                    </label>

                    <label className="flex items-center gap-2 p-4 rounded-xl border border-gray-200 cursor-pointer bg-gray-50 hover:bg-white transition-colors">
                      <input
                        type="checkbox"
                        name="girlsHostelAvailable"
                        checked={!!formData.girlsHostelAvailable}
                        onChange={handleChange}
                        className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                      />
                      <span className="font-bold text-gray-800">Girls Hostel Available</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Hostel Fee / Range</label>
                      <input
                        name="hostelFee"
                        value={formData.hostelFee || ""}
                        onChange={handleChange}
                        className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                        placeholder="e.g. ₹60,000–₹95,000/yr"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Hostel Amenities (Comma Separated)</label>
                      <input
                        value={formData.hostelFacilities?.join(", ") || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            hostelFacilities: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          }))
                        }
                        className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                        placeholder="Wi-Fi, AC Rooms, 24/7 Power, Mess, Sports, Gym"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Mess & Food Details</label>
                    <textarea
                      name="messInfo"
                      value={formData.messInfo || ""}
                      onChange={handleChange}
                      rows={2}
                      className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-xs"
                      placeholder="e.g. Clean hygienic mess with multi-cuisine vegetarian and non-vegetarian selections"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Other Campus Amenities (Comma Separated)</label>
                    <input
                      value={Array.isArray(formData.otherFacilities) ? formData.otherFacilities.join(", ") : (formData.otherFacilities || "")}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          otherFacilities: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                      placeholder="Central Library, Sports Arena, Innovation Center, Auditorium"
                    />
                  </div>
                </div>
              )}

              {/* 4. PLACEMENT TAB */}
              {activeTab === "placement" && (
                <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-5 text-xs">
                  <h3 className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#4A7B5B]" /> Placement Statistics & Top Recruiters
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Placement Percentage (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="placementPercentage"
                        value={formData.placementPercentage !== undefined ? formData.placementPercentage : ""}
                        onChange={handleChange}
                        className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                        placeholder="e.g. 88.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Highest Package (LPA)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="highestPackage"
                        value={formData.highestPackage !== undefined ? formData.highestPackage : ""}
                        onChange={handleChange}
                        className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                        placeholder="e.g. 48.0"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Average Package (LPA)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="averagePackage"
                        value={formData.averagePackage !== undefined ? formData.averagePackage : ""}
                        onChange={handleChange}
                        className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                        placeholder="e.g. 8.5"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Median Package (LPA)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="medianPackage"
                        value={formData.medianPackage !== undefined ? formData.medianPackage : ""}
                        onChange={handleChange}
                        className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                        placeholder="e.g. 7.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Placement Year / Session</label>
                    <input
                      name="placementYear"
                      value={formData.placementYear || ""}
                      onChange={handleChange}
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                      placeholder="e.g. 2024-2025"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Top Recruiting Partners (Comma Separated)</label>
                    <input
                      value={formData.placementCompanies?.join(", ") || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          placementCompanies: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                      placeholder="Google, Microsoft, Amazon, Infosys, Wipro, TCS, Deloitte"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Placement Highlights & Notes</label>
                    <textarea
                      name="placementInfo"
                      value={formData.placementInfo || ""}
                      onChange={handleChange}
                      rows={3}
                      className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-xs"
                      placeholder="Detailed insights into career fairs, internship stipends, and recruiter diversity"
                    />
                  </div>
                </div>
              )}

              {/* 5. STUDY MATERIALS TAB */}
              {activeTab === "materials" && (
                <div className="space-y-5">
                  <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4 text-xs">
                    <h3 className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#4A7B5B]" /> Study Materials Linked to this College
                    </h3>
                    <p className="text-gray-500">
                      Students can access and download these verified syllabus notes, papers, and guides directly from the college profile.
                    </p>

                    {formData.id && (
                      <div className="flex items-center gap-3">
                        <input
                          value={materialLinkInput}
                          onChange={(e) => setMaterialLinkInput(e.target.value)}
                          placeholder="Paste Study Material ID to link"
                          className="flex-1 h-9 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:border-[#4A7B5B] outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleLinkMaterial}
                          className="px-4 py-2 bg-[#E8F3EC] text-[#4A7B5B] font-bold rounded-xl text-xs hover:bg-[#d5ebd9] transition-colors"
                        >
                          Link Material
                        </button>
                      </div>
                    )}

                    {!formData.StudyMaterial || formData.StudyMaterial.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400">
                        No study materials linked to this college yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {formData.StudyMaterial.map((mat: any) => (
                          <div key={mat.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <div>
                              <div className="font-bold text-gray-800 text-xs">{mat.title}</div>
                              <div className="text-[11px] text-gray-500">{mat.materialType || "Notes"} · {mat.category || "General"}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUnlinkMaterial(mat.id)}
                              className="text-xs text-rose-500 hover:underline font-semibold"
                            >
                              Unlink
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. GALLERY TAB */}
              {activeTab === "gallery" && (
                <div className="space-y-5">
                  {/* Add Image Card */}
                  <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4 text-xs">
                    <h3 className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#4A7B5B]" /> Add Campus Photo to Gallery
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-gray-700 mb-1">Image URL *</label>
                        <input
                          value={newGalleryImg.imageUrl}
                          onChange={(e) => setNewGalleryImg((prev) => ({ ...prev, imageUrl: e.target.value }))}
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Caption / Title</label>
                        <input
                          value={newGalleryImg.caption}
                          onChange={(e) => setNewGalleryImg((prev) => ({ ...prev, caption: e.target.value }))}
                          className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none"
                          placeholder="e.g. Central Library Building"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newGalleryImg.isCover}
                          onChange={(e) => setNewGalleryImg((prev) => ({ ...prev, isCover: e.target.checked }))}
                          className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                        />
                        Set as Featured Cover Photo
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-gray-200 cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingField === "gallery" ? "Uploading..." : "Upload from File"}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingField === "gallery"}
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleMediaUpload(e.target.files[0], "gallery");
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleAddGalleryImage}
                          className="px-4 py-2 bg-[#E8F3EC] hover:bg-[#d5ebd9] text-[#4A7B5B] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-[#4A7B5B]/30"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Image URL
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Gallery Grid */}
                  <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
                    <div className="text-xs font-bold text-gray-700 mb-3 flex items-center justify-between">
                      <span>College Gallery ({formData.gallery?.length || 0} Images)</span>
                      <span className="text-[11px] text-gray-400 font-normal">Click star to set cover image</span>
                    </div>

                    {!formData.gallery || formData.gallery.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400">
                        No gallery images added yet. Add image URLs above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {formData.gallery.map((img: any, idx: number) => (
                          <div
                            key={idx}
                            className="relative group aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
                          >
                            <img
                              src={img.imageUrl}
                              alt={img.caption || "Gallery"}
                              className="w-full h-full object-cover"
                            />
                            {img.isCover && (
                              <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#4A7B5B] text-white text-[10px] font-bold rounded-md shadow">
                                Cover
                              </span>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                              {!img.isCover && (
                                <button
                                  type="button"
                                  onClick={() => handleSetCoverImage(idx)}
                                  className="px-2 py-1 bg-white text-gray-800 text-[10px] font-bold rounded hover:bg-gray-100"
                                >
                                  Make Cover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveGalleryImage(idx)}
                                className="w-6 h-6 rounded bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {img.caption && (
                              <div className="absolute inset-x-0 bottom-0 p-1.5 bg-black/60 text-white text-[10px] truncate">
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

              {/* 7. SEO TAB */}
              {activeTab === "seo" && (
                <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4 text-xs">
                  <h3 className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#4A7B5B]" /> Search Engine Optimization (SEO) & Metadata
                  </h3>
                  <p className="text-gray-500">
                    Synchronize custom title tags, meta descriptions, and keywords to rank on Google and provide rich public previews.
                  </p>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">SEO Title Tag</label>
                    <input
                      name="seoTitle"
                      value={formData.seoTitle || ""}
                      onChange={handleChange}
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                      placeholder="e.g. IIT Bombay Admissions 2026, Cutoff, Fees, Placements & Ranking"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">SEO Meta Description</label>
                    <textarea
                      name="seoDescription"
                      value={formData.seoDescription || ""}
                      onChange={handleChange}
                      rows={3}
                      className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-xs"
                      placeholder="e.g. Find complete details about IIT Bombay admissions, course eligibility, highest salary packages, hostel fees, and scholarships."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">SEO Keywords (Comma Separated)</label>
                    <input
                      value={formData.seoKeywords?.join(", ") || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          seoKeywords: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm"
                      placeholder="IIT Bombay, Engineering Colleges, JEE Advanced Cutoff, Top Colleges in India"
                    />
                  </div>
                </div>
              )}

            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-[#F1F5F9] bg-white flex items-center justify-between">
          <div className="text-xs text-gray-500 font-medium">
            Status: <span className="font-bold text-[#4A7B5B]">{formData.status}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="collegeForm"
              disabled={mutation.isPending}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
              style={{ background: "#4A7B5B" }}
            >
              <Save className="w-4 h-4" />
              {mutation.isPending ? "Saving Profile..." : "Save College Profile"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
