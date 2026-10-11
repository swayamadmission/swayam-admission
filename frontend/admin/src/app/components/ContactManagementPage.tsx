import { useState } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  Copy,
  Check,
  Building,
  Headphones,
  GraduationCap,
  Calendar,
  Save,
  X,
  Send,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  UserCheck,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  contactAdminApi,
  DepartmentContact,
  ContactEnquiryItem,
  ContactSettings,
  AssignableStaff,
} from "../../api/contact.api";

// Clean custom SVG icons for platforms not built into lucide
function RedditIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.56 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.703zM9.25 12C8.56 12 8 12.56 8 13.25c0 .688.56 1.25 1.25 1.25.688 0 1.25-.562 1.25-1.25 0-.69-.562-1.25-1.25-1.25zm5.5 0c-.69 0-1.25.56-1.25 1.25 0 .688.56 1.25 1.25 1.25.688 0 1.25-.562 1.25-1.25 0-.69-.562-1.25-1.25-1.25zm-5.465 4.015a.51.51 0 0 0-.094.708c.573.743 1.62 1.152 2.809 1.152 1.189 0 2.236-.409 2.809-1.152a.512.512 0 0 0-.094-.708.513.513 0 0 0-.71.094c-.42.544-1.196.844-2.005.844-.809 0-1.585-.3-2.005-.844a.513.513 0 0 0-.71-.094z" />
    </svg>
  );
}

function TelegramIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.939z" />
    </svg>
  );
}

function DiscordIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const ENQUIRY_CATEGORIES = [
  "Admission Counselling",
  "College and Course Information",
  "Application Support",
  "Payment and Fee Enquiry",
  "College Partnership",
  "Technical Support",
  "Other",
];

const CTA_ACTIONS = [
  { value: "CALL", label: "Phone Call (tel:)" },
  { value: "WHATSAPP", label: "WhatsApp Chat" },
  { value: "EMAIL", label: "Email (mailto:)" },
  { value: "URL", label: "External / Custom Link" },
];

export default function ContactManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"departments" | "enquiries" | "settings">("departments");

  // ─── TAB 1: DEPARTMENTS STATE ──────────────────────────────────────────────
  const [deptSearch, setDeptSearch] = useState("");
  const [deptActiveFilter, setDeptActiveFilter] = useState("ALL");
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentContact | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<DepartmentContact | null>(null);

  // Form State for Department Modal
  const [deptFormData, setDeptFormData] = useState({
    name: "",
    badge: "",
    description: "",
    phone: "",
    whatsapp: "",
    email: "",
    officeHours: "",
    workingDays: "",
    address: "",
    ctaText: "",
    ctaAction: "CALL",
    ctaUrl: "",
    sortOrder: 0,
    isActive: true,
  });

  // ─── TAB 2: ENQUIRIES STATE ────────────────────────────────────────────────
  const [enquirySearch, setEnquirySearch] = useState("");
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState("ALL");
  const [enquiryCategoryFilter, setEnquiryCategoryFilter] = useState("ALL");
  const [enquiryPage, setEnquiryPage] = useState(1);
  const [selectedEnquiry, setSelectedEnquiry] = useState<ContactEnquiryItem | null>(null);
  const [adminNotesInput, setAdminNotesInput] = useState("");
  const [assignedDeptInput, setAssignedDeptInput] = useState("");
  const [assignedStaffInput, setAssignedStaffInput] = useState("");
  const [enquiryToDelete, setEnquiryToDelete] = useState<ContactEnquiryItem | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // ─── QUERIES ───────────────────────────────────────────────────────────────

  // 1. Departments Query
  const {
    data: departmentsData = [],
    isLoading: isDepartmentsLoading,
    refetch: refetchDepartments,
  } = useQuery({
    queryKey: ["adminDepartmentContacts", deptSearch, deptActiveFilter],
    queryFn: async () => {
      const res = await contactAdminApi.getDepartments({
        search: deptSearch || undefined,
        isActive: deptActiveFilter !== "ALL" ? deptActiveFilter : undefined,
      });
      return res.data;
    },
  });

  // 2. Enquiries Query
  const {
    data: enquiriesData,
    isLoading: isEnquiriesLoading,
    refetch: refetchEnquiries,
  } = useQuery({
    queryKey: [
      "adminContactEnquiries",
      enquiryPage,
      enquiryStatusFilter,
      enquiryCategoryFilter,
      enquirySearch,
    ],
    queryFn: async () => {
      const res = await contactAdminApi.getEnquiries({
        page: enquiryPage,
        limit: 15,
        status: enquiryStatusFilter !== "ALL" ? enquiryStatusFilter : undefined,
        category: enquiryCategoryFilter !== "ALL" ? enquiryCategoryFilter : undefined,
        search: enquirySearch || undefined,
      });
      return res.data;
    },
  });

  // 3. Assignable Staff Query
  const { data: staffList = [] } = useQuery({
    queryKey: ["adminAssignableStaff"],
    queryFn: async () => {
      const res = await contactAdminApi.getStaff();
      return res.data;
    },
  });

  // 4. Contact Page & Business Hours Settings Query
  const {
    data: settingsData,
    isLoading: isSettingsLoading,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ["adminContactSettings"],
    queryFn: async () => {
      const res = await contactAdminApi.getSettings();
      return res.data;
    },
  });

  // Business Hours & Page Settings Form State
  const [settingsForm, setSettingsForm] = useState<ContactSettings>({
    pageHeading: "",
    pageSubheading: "",
    helpdeskBadge: "",
    officeHours: "",
    workingDays: "",
    holidayNotice: "",
    expectedResponseTime: "",
    address: "",
    googleMapsUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    youtubeUrl: "",
    linkedinUrl: "",
    xUrl: "",
    githubUrl: "",
    redditUrl: "",
    telegramUrl: "",
    discordUrl: "",
  });

  const [settingsLoaded, setSettingsLoaded] = useState(false);
  if (settingsData && !settingsLoaded) {
    setSettingsForm({
      pageHeading: settingsData.pageHeading || "Contact Swayam Admission",
      pageSubheading:
        settingsData.pageSubheading ||
        "India Ka Mission Swayam Admission — Your Trusted Education Partner. Get help with college admissions, courses, applications and counselling.",
      helpdeskBadge: settingsData.helpdeskBadge || "Official Swayam Admission Helpdesk",
      officeHours: settingsData.officeHours || "Monday – Saturday: 9:30 AM – 6:30 PM",
      workingDays: settingsData.workingDays || "Monday to Saturday",
      holidayNotice: settingsData.holidayNotice || "Closed on Sundays & National Holidays",
      expectedResponseTime: settingsData.expectedResponseTime || "Within 2 to 4 business hours",
      address: settingsData.address || "New Delhi, India",
      googleMapsUrl: settingsData.googleMapsUrl || "",
      instagramUrl: settingsData.instagramUrl || "",
      facebookUrl: settingsData.facebookUrl || "",
      youtubeUrl: settingsData.youtubeUrl || "",
      linkedinUrl: settingsData.linkedinUrl || "",
      xUrl: settingsData.xUrl || "",
      githubUrl: settingsData.githubUrl || "",
      redditUrl: settingsData.redditUrl || "",
      telegramUrl: settingsData.telegramUrl || "",
      discordUrl: settingsData.discordUrl || "",
    });
    setSettingsLoaded(true);
  }

  // ─── MUTATIONS ─────────────────────────────────────────────────────────────

  // Save / Update Department Contact
  const saveDeptMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingDept) {
        return contactAdminApi.updateDepartment(editingDept.id, data);
      } else {
        return contactAdminApi.createDepartment(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminDepartmentContacts"] });
      toast.success(editingDept ? "Department updated successfully" : "Department created successfully");
      setIsDeptModalOpen(false);
      setEditingDept(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to save department contact");
    },
  });

  // Delete Department Contact
  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => contactAdminApi.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminDepartmentContacts"] });
      toast.success("Department contact deleted");
      setDeptToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete department");
    },
  });

  // Toggle Active/Inactive Status
  const toggleDeptStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      contactAdminApi.updateDepartment(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminDepartmentContacts"] });
      toast.success("Department status updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to toggle status");
    },
  });

  // Reorder Departments
  const reorderDeptsMutation = useMutation({
    mutationFn: (ids: string[]) => contactAdminApi.reorderDepartments(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminDepartmentContacts"] });
      toast.success("Display order saved");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to reorder departments");
    },
  });

  // Update Enquiry Status, Notes & Assignment
  const updateEnquiryStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      adminNotes,
      assignedDepartment,
      assignedStaffId,
      assignedStaffName,
    }: {
      id: string;
      status: string;
      adminNotes?: string;
      assignedDepartment?: string;
      assignedStaffId?: string;
      assignedStaffName?: string;
    }) =>
      contactAdminApi.updateEnquiryStatus(id, {
        status,
        adminNotes,
        assignedDepartment,
        assignedStaffId,
        assignedStaffName,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["adminContactEnquiries"] });
      toast.success("Enquiry updated successfully");
      if (selectedEnquiry && selectedEnquiry.id === res.data.id) {
        setSelectedEnquiry(res.data);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update enquiry");
    },
  });

  // Delete Enquiry
  const deleteEnquiryMutation = useMutation({
    mutationFn: (id: string) => contactAdminApi.deleteEnquiry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminContactEnquiries"] });
      toast.success("Enquiry record deleted");
      setEnquiryToDelete(null);
      if (selectedEnquiry?.id === enquiryToDelete?.id) {
        setSelectedEnquiry(null);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete enquiry");
    },
  });

  // Save Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: (data: Partial<ContactSettings>) => contactAdminApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminContactSettings"] });
      toast.success("Contact page & business hours settings saved successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update settings");
    },
  });

  // ─── HANDLERS ──────────────────────────────────────────────────────────────

  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptFormData({
      name: "",
      badge: "",
      description: "",
      phone: "",
      whatsapp: "",
      email: "",
      officeHours: "Mon – Sat: 9:30 AM – 6:30 PM",
      workingDays: "Monday to Saturday",
      address: "New Delhi, India",
      ctaText: "",
      ctaAction: "CALL",
      ctaUrl: "",
      sortOrder: (departmentsData.length || 0) + 1,
      isActive: true,
    });
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: DepartmentContact) => {
    setEditingDept(dept);
    setDeptFormData({
      name: dept.name,
      badge: dept.badge || "",
      description: dept.description || "",
      phone: dept.phone || "",
      whatsapp: dept.whatsapp || "",
      email: dept.email || "",
      officeHours: dept.officeHours || "",
      workingDays: dept.workingDays || "",
      address: dept.address || "",
      ctaText: dept.ctaText || "",
      ctaAction: dept.ctaAction || "CALL",
      ctaUrl: dept.ctaUrl || "",
      sortOrder: dept.sortOrder,
      isActive: dept.isActive,
    });
    setIsDeptModalOpen(true);
  };

  const handleDeptFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptFormData.name.trim()) {
      toast.error("Department Name is required");
      return;
    }
    saveDeptMutation.mutate(deptFormData);
  };

  const handleMoveDept = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === departmentsData.length - 1)
    ) {
      return;
    }

    const newItems = [...departmentsData];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const ids = newItems.map((item) => item.id);
    reorderDeptsMutation.mutate(ids);
  };

  const handleViewEnquiry = (enquiry: ContactEnquiryItem) => {
    setSelectedEnquiry(enquiry);
    setAdminNotesInput(enquiry.adminNotes || "");
    setAssignedDeptInput(enquiry.assignedDepartment || "");
    setAssignedStaffInput(enquiry.assignedStaffId || "");
  };

  const handleSaveEnquiryDetails = () => {
    if (!selectedEnquiry) return;
    const staff = staffList.find((s) => s.id === assignedStaffInput);

    updateEnquiryStatusMutation.mutate({
      id: selectedEnquiry.id,
      status: selectedEnquiry.status,
      adminNotes: adminNotesInput,
      assignedDepartment: assignedDeptInput,
      assignedStaffId: assignedStaffInput || undefined,
      assignedStaffName: staff?.fullName || undefined,
    });
  };

  const handleUpdateStatus = (newStatus: string) => {
    if (!selectedEnquiry) return;
    const staff = staffList.find((s) => s.id === assignedStaffInput);

    updateEnquiryStatusMutation.mutate({
      id: selectedEnquiry.id,
      status: newStatus,
      adminNotes: adminNotesInput,
      assignedDepartment: assignedDeptInput,
      assignedStaffId: assignedStaffInput || undefined,
      assignedStaffName: staff?.fullName || undefined,
    });
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-max">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> New
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 w-max">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> In Review
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-max">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Assigned
          </span>
        );
      case "RESOLVED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Resolved
          </span>
        );
      case "CLOSED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-1 w-max">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#4A7B5B] flex items-center justify-center font-bold">
              <Headphones size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Contact Management & Helpdesk</h1>
              <p className="text-xs text-gray-500">
                Manage department contacts, live enquiry inbox, assignment workflow, and public page settings.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="http://localhost:5173/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ExternalLink size={14} /> Preview Contact Page
          </a>

          {activeTab === "departments" && (
            <button
              onClick={handleOpenAddDept}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#4A7B5B" }}
            >
              <Plus size={15} /> Add Department Contact
            </button>
          )}
        </div>
      </div>

      {/* ─── TAB NAVIGATION ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("departments")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "departments"
              ? "border-[#4A7B5B] text-[#4A7B5B]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Building size={16} /> Department Contacts ({departmentsData.length})
        </button>

        <button
          onClick={() => setActiveTab("enquiries")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "enquiries"
              ? "border-[#4A7B5B] text-[#4A7B5B]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Mail size={16} /> Contact Enquiries
          {enquiriesData?.summary?.NEW ? (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {enquiriesData.summary.NEW} new
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "settings"
              ? "border-[#4A7B5B] text-[#4A7B5B]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Share2 size={16} /> Page Settings & Social Media
        </button>
      </div>

      {/* ─── TAB 1: DEPARTMENT CONTACTS ─────────────────────────────────────── */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search departments by name, phone, email..."
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              <select
                value={deptActiveFilter}
                onChange={(e) => setDeptActiveFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>

            <button
              onClick={() => refetchDepartments()}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Department Cards / Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-16">Order</th>
                    <th className="py-3.5 px-4">Department & Badge</th>
                    <th className="py-3.5 px-4">Direct Contact Points</th>
                    <th className="py-3.5 px-4">Working Schedule</th>
                    <th className="py-3.5 px-4">CTA Action</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isDepartmentsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        <div className="w-6 h-6 border-2 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading department contacts...
                      </td>
                    </tr>
                  ) : departmentsData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        No department contacts found. Click "+ Add Department Contact" to create one.
                      </td>
                    </tr>
                  ) : (
                    departmentsData.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Order & Reordering buttons */}
                        <td className="py-3.5 px-4 font-mono font-medium text-gray-500">
                          <div className="flex items-center gap-1">
                            <span className="w-5">{item.sortOrder}</span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                disabled={idx === 0}
                                onClick={() => handleMoveDept(idx, "up")}
                                className="p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-30"
                                title="Move Up"
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                disabled={idx === departmentsData.length - 1}
                                onClick={() => handleMoveDept(idx, "down")}
                                className="p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-30"
                                title="Move Down"
                              >
                                <ArrowDown size={11} />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Name & Badge */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{item.name}</div>
                          {item.badge && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 bg-amber-50 text-amber-800 border border-amber-200">
                              {item.badge}
                            </span>
                          )}
                          {item.description && (
                            <div className="text-[11px] text-gray-500 truncate max-w-xs mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </td>

                        {/* Contact details */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {item.phone && (
                              <div className="flex items-center gap-1.5 text-gray-800 font-mono">
                                <Phone size={12} className="text-[#4A7B5B]" /> +91 {item.phone}
                              </div>
                            )}
                            {item.whatsapp && (
                              <div className="flex items-center gap-1.5 text-green-700 font-mono">
                                <MessageCircle size={12} className="text-green-600" /> WhatsApp: +91 {item.whatsapp}
                              </div>
                            )}
                            {item.email && (
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Mail size={12} className="text-amber-600" /> {item.email}
                              </div>
                            )}
                            {!item.phone && !item.whatsapp && !item.email && (
                              <span className="text-[11px] text-gray-400 italic">No direct phone/email</span>
                            )}
                          </div>
                        </td>

                        {/* Schedule & Hours */}
                        <td className="py-3.5 px-4 text-gray-600">
                          {item.officeHours && (
                            <div className="flex items-center gap-1">
                              <Clock size={12} className="text-gray-400" /> {item.officeHours}
                            </div>
                          )}
                          {item.workingDays && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                              <Calendar size={11} /> {item.workingDays}
                            </div>
                          )}
                          {!item.officeHours && !item.workingDays && (
                            <span className="text-gray-400 italic">Default business hours</span>
                          )}
                        </td>

                        {/* CTA button */}
                        <td className="py-3.5 px-4">
                          {item.ctaText ? (
                            <span className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {item.ctaText} ({item.ctaAction})
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Standard</span>
                          )}
                        </td>

                        {/* Active toggle */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() =>
                              toggleDeptStatusMutation.mutate({
                                id: item.id,
                                isActive: !item.isActive,
                              })
                            }
                            className={`w-8 h-4.5 rounded-full transition-colors relative inline-block p-0.5 ${
                              item.isActive ? "bg-[#4A7B5B]" : "bg-gray-300"
                            }`}
                            title={item.isActive ? "Active on public page" : "Inactive (hidden on public page)"}
                          >
                            <span
                              className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                                item.isActive ? "translate-x-3.5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditDept(item)}
                              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeptToDelete(item)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: CONTACT ENQUIRIES ───────────────────────────────────────── */}
      {activeTab === "enquiries" && (
        <div className="space-y-4">
          {/* Statistics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {[
              { label: "Total", count: enquiriesData?.summary?.TOTAL || 0, color: "text-gray-800", bg: "bg-white" },
              { label: "New", count: enquiriesData?.summary?.NEW || 0, color: "text-amber-700", bg: "bg-amber-50/50" },
              { label: "In Review", count: enquiriesData?.summary?.IN_REVIEW || 0, color: "text-purple-700", bg: "bg-purple-50/50" },
              { label: "Assigned", count: enquiriesData?.summary?.ASSIGNED || 0, color: "text-blue-700", bg: "bg-blue-50/50" },
              { label: "Resolved", count: enquiriesData?.summary?.RESOLVED || 0, color: "text-emerald-700", bg: "bg-emerald-50/50" },
              { label: "Closed", count: enquiriesData?.summary?.CLOSED || 0, color: "text-gray-500", bg: "bg-gray-50" },
            ].map((stat, i) => (
              <div key={i} className={`p-4 rounded-xl border border-gray-200 shadow-2xs ${stat.bg}`}>
                <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
                <div className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.count}</div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by reference, name, email, mobile, department..."
                  value={enquirySearch}
                  onChange={(e) => {
                    setEnquirySearch(e.target.value);
                    setEnquiryPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              <select
                value={enquiryStatusFilter}
                onChange={(e) => {
                  setEnquiryStatusFilter(e.target.value);
                  setEnquiryPage(1);
                }}
                className="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>

              <select
                value={enquiryCategoryFilter}
                onChange={(e) => {
                  setEnquiryCategoryFilter(e.target.value);
                  setEnquiryPage(1);
                }}
                className="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {ENQUIRY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => refetchEnquiries()}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Enquiries Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Ref Number</th>
                    <th className="py-3.5 px-4">Contact Details</th>
                    <th className="py-3.5 px-4">Subject & Category</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Assigned To</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isEnquiriesLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        <div className="w-6 h-6 border-2 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading enquiries inbox...
                      </td>
                    </tr>
                  ) : enquiriesData?.items?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        No contact enquiries match your current filters.
                      </td>
                    </tr>
                  ) : (
                    enquiriesData?.items?.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50/60 transition-colors ${
                          item.status === "NEW" ? "bg-amber-50/20 font-medium" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                          <button
                            onClick={() => handleCopyText(item.referenceNo)}
                            className="hover:underline text-gray-900 inline-flex items-center gap-1"
                            title="Click to copy"
                          >
                            {item.referenceNo}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{item.fullName}</div>
                          <div className="text-[11px] text-gray-500 font-mono">
                            +91 {item.mobile}
                            {item.email ? ` • ${item.email}` : ""}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                            {item.category}
                          </span>
                          <div className="text-gray-800 font-medium truncate max-w-xs mt-0.5">{item.subject}</div>
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>
                        <td className="py-3.5 px-4">
                          {item.assignedStaffName ? (
                            <div className="font-semibold text-gray-900 flex items-center gap-1">
                              <UserCheck size={13} className="text-[#4A7B5B]" /> {item.assignedStaffName}
                            </div>
                          ) : item.assignedDepartment ? (
                            <div className="text-gray-600 text-[11px]">{item.assignedDepartment}</div>
                          ) : (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 font-mono">
                          {new Date(item.createdAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleViewEnquiry(item)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 shadow-2xs"
                              style={{ backgroundColor: "#4A7B5B" }}
                            >
                              <Eye size={13} className="inline mr-1" /> View & Process
                            </button>
                            <button
                              onClick={() => setEnquiryToDelete(item)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {enquiriesData?.pagination && enquiriesData.pagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <div>
                  Page {enquiriesData.pagination.page} of {enquiriesData.pagination.totalPages} (
                  {enquiriesData.pagination.total} total enquiries)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={enquiryPage <= 1}
                    onClick={() => setEnquiryPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={enquiryPage >= enquiriesData.pagination.totalPages}
                    onClick={() => setEnquiryPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: PAGE SETTINGS & SOCIAL MEDIA ────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-2xs max-w-4xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Contact Us Page Configuration</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage public page headings, badge text, visiting hours, official address, and database-driven social media profiles.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSettingsMutation.mutate(settingsForm);
            }}
            className="space-y-6"
          >
            {/* Section 1: Page Header & Badge */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Hero Section & Helpdesk Badge
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Page Heading</label>
                  <input
                    type="text"
                    value={settingsForm.pageHeading}
                    onChange={(e) => setSettingsForm({ ...settingsForm, pageHeading: e.target.value })}
                    placeholder="e.g. Contact Swayam Admission"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Helpdesk Badge</label>
                  <input
                    type="text"
                    value={settingsForm.helpdeskBadge}
                    onChange={(e) => setSettingsForm({ ...settingsForm, helpdeskBadge: e.target.value })}
                    placeholder="e.g. Official Swayam Admission Helpdesk"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Page Subheading</label>
                <input
                  type="text"
                  value={settingsForm.pageSubheading}
                  onChange={(e) => setSettingsForm({ ...settingsForm, pageSubheading: e.target.value })}
                  placeholder="e.g. Get help with college admissions, courses, applications and counselling."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
            </div>

            {/* Section 2: Business Hours & Address */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Business Hours & Visiting Location
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Office Hours</label>
                  <input
                    type="text"
                    value={settingsForm.officeHours}
                    onChange={(e) => setSettingsForm({ ...settingsForm, officeHours: e.target.value })}
                    placeholder="e.g. Monday – Saturday: 9:30 AM – 6:30 PM"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Working Days</label>
                  <input
                    type="text"
                    value={settingsForm.workingDays}
                    onChange={(e) => setSettingsForm({ ...settingsForm, workingDays: e.target.value })}
                    placeholder="e.g. Monday to Saturday"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Holiday Notice</label>
                  <input
                    type="text"
                    value={settingsForm.holidayNotice}
                    onChange={(e) => setSettingsForm({ ...settingsForm, holidayNotice: e.target.value })}
                    placeholder="e.g. Closed on Sundays & National Holidays"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Response Time Promise</label>
                  <input
                    type="text"
                    value={settingsForm.expectedResponseTime}
                    onChange={(e) => setSettingsForm({ ...settingsForm, expectedResponseTime: e.target.value })}
                    placeholder="e.g. Within 2 to 4 business hours"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Office Address</label>
                  <input
                    type="text"
                    value={settingsForm.address}
                    onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                    placeholder="e.g. New Delhi, India"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Google Maps URL</label>
                  <input
                    type="url"
                    value={settingsForm.googleMapsUrl}
                    onChange={(e) => setSettingsForm({ ...settingsForm, googleMapsUrl: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Official Social Media Channels */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Official Social Media Profiles
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Only non-empty links are rendered on the public contact page. Blank fields remain hidden.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Instagram URL</label>
                  <input
                    type="url"
                    value={settingsForm.instagramUrl || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, instagramUrl: e.target.value })}
                    placeholder="https://www.instagram.com/swayamadmission"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Facebook URL</label>
                  <input
                    type="url"
                    value={settingsForm.facebookUrl || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, facebookUrl: e.target.value })}
                    placeholder="https://www.facebook.com/swayamadmission"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">YouTube Channel URL</label>
                  <input
                    type="url"
                    value={settingsForm.youtubeUrl || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, youtubeUrl: e.target.value })}
                    placeholder="https://www.youtube.com/@swayamadmission"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={settingsForm.linkedinUrl || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, linkedinUrl: e.target.value })}
                    placeholder="https://www.linkedin.com/company/swayamadmission"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">X (Twitter) URL</label>
                  <input
                    type="url"
                    value={settingsForm.xUrl || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, xUrl: e.target.value })}
                    placeholder="https://x.com/swayamadmission"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">GitHub URL</label>
                  <input
                    type="url"
                    value={settingsForm.githubUrl || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, githubUrl: e.target.value })}
                    placeholder="https://github.com/swayamadmission"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reddit URL</label>
                  <input
                    type="url"
                    value={settingsForm.redditUrl || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, redditUrl: e.target.value })}
                    placeholder="https://www.reddit.com/user/swayamadmission/"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telegram URL</label>
                  <input
                    type="url"
                    value={settingsForm.telegramUrl || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, telegramUrl: e.target.value })}
                    placeholder="https://t.me/swayamadmission"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Discord Invite URL</label>
                  <input
                    type="url"
                    value={settingsForm.discordUrl || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, discordUrl: e.target.value })}
                    placeholder="https://discord.gg/..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saveSettingsMutation.isPending}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#4A7B5B" }}
              >
                <Save size={15} /> Save Contact Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL: ADD / EDIT DEPARTMENT CONTACT ────────────────────────────── */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {editingDept ? "Edit Department Contact" : "Add New Department Contact"}
              </h2>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDeptFormSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Department Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={deptFormData.name}
                    onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                    placeholder="e.g. Admissions & Counselling"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Badge / Tag</label>
                  <input
                    type="text"
                    value={deptFormData.badge}
                    onChange={(e) => setDeptFormData({ ...deptFormData, badge: e.target.value })}
                    placeholder="e.g. Primary Helpline, Application Desk"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={deptFormData.description}
                  onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                  placeholder="Describe what queries this department handles..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={deptFormData.phone}
                    onChange={(e) => setDeptFormData({ ...deptFormData, phone: e.target.value })}
                    placeholder="e.g. 6284308664"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    value={deptFormData.whatsapp}
                    onChange={(e) => setDeptFormData({ ...deptFormData, whatsapp: e.target.value })}
                    placeholder="e.g. 6284308664"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={deptFormData.email}
                    onChange={(e) => setDeptFormData({ ...deptFormData, email: e.target.value })}
                    placeholder="e.g. swayamadmissions@gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Office Hours</label>
                  <input
                    type="text"
                    value={deptFormData.officeHours}
                    onChange={(e) => setDeptFormData({ ...deptFormData, officeHours: e.target.value })}
                    placeholder="e.g. Mon – Sat: 9:30 AM – 6:30 PM"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Working Days</label>
                  <input
                    type="text"
                    value={deptFormData.workingDays}
                    onChange={(e) => setDeptFormData({ ...deptFormData, workingDays: e.target.value })}
                    placeholder="e.g. Monday to Saturday"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Office Location / Address</label>
                <input
                  type="text"
                  value={deptFormData.address}
                  onChange={(e) => setDeptFormData({ ...deptFormData, address: e.target.value })}
                  placeholder="e.g. New Delhi, India"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={deptFormData.ctaText}
                    onChange={(e) => setDeptFormData({ ...deptFormData, ctaText: e.target.value })}
                    placeholder="e.g. Call Now, Discuss Partnership"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">CTA Action Type</label>
                  <select
                    value={deptFormData.ctaAction}
                    onChange={(e) => setDeptFormData({ ...deptFormData, ctaAction: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none"
                  >
                    {CTA_ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={deptFormData.sortOrder}
                    onChange={(e) =>
                      setDeptFormData({ ...deptFormData, sortOrder: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {deptFormData.ctaAction === "URL" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Custom CTA URL</label>
                  <input
                    type="url"
                    value={deptFormData.ctaUrl}
                    onChange={(e) => setDeptFormData({ ...deptFormData, ctaUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={deptFormData.isActive}
                  onChange={(e) => setDeptFormData({ ...deptFormData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-[#4A7B5B] focus:ring-[#4A7B5B]"
                />
                <label htmlFor="isActive" className="text-xs font-semibold text-gray-700">
                  Active (Display this department on public Contact Us page)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveDeptMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#4A7B5B" }}
                >
                  {editingDept ? "Save Changes" : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DRAWER / MODAL: VIEW & PROCESS ENQUIRY ──────────────────────────── */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-xs font-mono font-bold text-gray-500">
                  {selectedEnquiry.referenceNo}
                </span>
                <h2 className="text-base font-bold text-gray-900 mt-0.5">
                  Enquiry: {selectedEnquiry.subject}
                </h2>
              </div>
              <button
                onClick={() => setSelectedEnquiry(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Status:</span>
                {getStatusBadge(selectedEnquiry.status)}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleUpdateStatus("IN_REVIEW")}
                  className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                >
                  Mark In Review
                </button>
                <button
                  onClick={() => handleUpdateStatus("RESOLVED")}
                  className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                >
                  Resolve
                </button>
                <button
                  onClick={() => handleUpdateStatus("CLOSED")}
                  className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                >
                  Close
                </button>
                {selectedEnquiry.status === "CLOSED" || selectedEnquiry.status === "RESOLVED" ? (
                  <button
                    onClick={() => handleUpdateStatus("NEW")}
                    className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                  >
                    Reopen
                  </button>
                ) : null}
              </div>
            </div>

            {/* Student & Query Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                <div>
                  <span className="text-gray-400 block">Full Name</span>
                  <span className="font-bold text-gray-900 text-sm">{selectedEnquiry.fullName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Mobile Number</span>
                  <a
                    href={`tel:${selectedEnquiry.mobile}`}
                    className="font-mono font-semibold text-[#4A7B5B] hover:underline"
                  >
                    +91 {selectedEnquiry.mobile}
                  </a>
                </div>
                <div>
                  <span className="text-gray-400 block">Email Address</span>
                  {selectedEnquiry.email ? (
                    <a
                      href={`mailto:${selectedEnquiry.email}`}
                      className="font-semibold text-gray-800 hover:underline"
                    >
                      {selectedEnquiry.email}
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">Not provided (optional)</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                <div>
                  <span className="text-gray-400 block">Category</span>
                  <span className="font-semibold text-gray-800">{selectedEnquiry.category}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Submitted At</span>
                  <span className="font-mono text-gray-700">
                    {new Date(selectedEnquiry.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Client IP</span>
                  <span className="font-mono text-gray-500">{selectedEnquiry.ipAddress || "Unknown"}</span>
                </div>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <span className="text-xs font-bold text-gray-700 block mb-1">Student Message</span>
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                {selectedEnquiry.message || "No message content provided."}
              </div>
            </div>

            {/* Department & Staff Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assign Department
                </label>
                <select
                  value={assignedDeptInput}
                  onChange={(e) => setAssignedDeptInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">Unassigned</option>
                  {departmentsData.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assign Counselor / Staff
                </label>
                <select
                  value={assignedStaffInput}
                  onChange={(e) => setAssignedStaffInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">Unassigned</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Internal Admin Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Internal Administrative Notes
              </label>
              <textarea
                rows={3}
                value={adminNotesInput}
                onChange={(e) => setAdminNotesInput(e.target.value)}
                placeholder="Log internal follow-up notes, call remarks, or guidance provided..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            {/* Resolution info */}
            {selectedEnquiry.resolvedAt && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <span>
                  Resolved by <strong>{selectedEnquiry.resolvedBy || "Admin"}</strong>
                </span>
                <span className="font-mono text-[11px]">
                  {new Date(selectedEnquiry.resolvedAt).toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setEnquiryToDelete(selectedEnquiry);
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Delete Enquiry
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEnquiry(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveEnquiryDetails}
                  disabled={updateEnquiryStatusMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#4A7B5B" }}
                >
                  Save Assignment & Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE CONFIRMATION ──────────────────────────────────────── */}
      {(deptToDelete || enquiryToDelete) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-gray-900 text-base">Confirm Deletion</h3>
              <p className="text-xs text-gray-500 mt-1">
                {deptToDelete
                  ? `Are you sure you want to delete department contact "${deptToDelete.name}"? This action cannot be undone.`
                  : `Are you sure you want to permanently delete enquiry reference "${enquiryToDelete?.referenceNo}"?`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setDeptToDelete(null);
                  setEnquiryToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deptToDelete) {
                    deleteDeptMutation.mutate(deptToDelete.id);
                  } else if (enquiryToDelete) {
                    deleteEnquiryMutation.mutate(enquiryToDelete.id);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
