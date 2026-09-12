import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  LayoutDashboard, BookmarkCheck, FileText, Bot, Upload,
  Bell, History, GraduationCap, Star, MapPin, ChevronRight,
  User, LogOut, CheckCircle2, Clock, AlertCircle, Award,
  Map as MapIcon, CircleDot, BookOpen, Download, Bookmark, BookmarkX, HelpCircle, CreditCard, RotateCcw, Search, Phone, MessageSquare, Filter,
  LifeBuoy, Building2, ArrowRight, Receipt, Lock, X, Settings, Mail, Gift, Paperclip, Send,
  Edit, Plus, Trash2, Check, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useAuth } from "./Navbar";
import { useAuth as useAuthContext } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, Application } from "../../api/applications.api";
import { aiCounselorApi } from "../../api/ai-counselor.api";
import { usersApi } from "../../api/users.api";
import { geographyApi, StateItem, DistrictItem } from "../../api/geography.api";
import { journeyApi } from "../../api/journey.api";
import { recommendationApi } from "../../api/recommendation.api";
import { collegesApi } from "../../api/colleges.api";
import { documentsApi } from "../../api/documents.api";
import { notificationsApi, Notification } from "../../api/notifications.api";
import { studyMaterialsApi, StudyMaterial } from "../../api/study-materials.api";
import { blogsApi } from "../../api/blogs.api";
import { faqsApi } from "../../api/faqs.api";
import { paymentsApi } from "../../api/payments.api";
import { reportingEnrollmentApi } from "../../api/reporting-enrollment.api";
import { supportApi } from "../../api/support.api";
import ErrorState from "./ui/ErrorState";
import ErrorBoundary from "./ui/ErrorBoundary";
import { ApplicationWorkflowForm } from "./ApplicationWorkflowForm";
import ReferralDashboard from "./ReferralDashboard";
import CouponApplyWidget from "./CouponApplyWidget";
import FirstLoginReferralModal from "./FirstLoginReferralModal";
import { CouponValidationResponse } from "../../api/coupons.api";

const SIDEBAR_ITEMS = [
  { id:"overview", label:"Overview", icon:LayoutDashboard },
  { id:"profile", label:"My Profile", icon:User },
  { id:"journey", label:"My Journey", icon:MapIcon },
  { id:"saved", label:"Saved Colleges", icon:BookmarkCheck },
  { id:"applications", label:"My Applications", icon:FileText },
  { id:"payments", label:"Payments & Fees", icon:CreditCard },
  { id:"referrals", label:"Refer a Student", icon:Gift },
  { id:"support", label:"Help & Support Center", icon:LifeBuoy },
  { id:"ai", label:"AI Recommendations", icon:Bot },
  { id:"materials", label:"Study Materials", icon:BookOpen },
  { id:"blogs", label:"Career & Admission Guides", icon:FileText },
  { id:"faqs", label:"Frequently Asked Questions", icon:HelpCircle },
  { id:"docs", label:"Documents", icon:Upload },
  { id:"counseling", label:"Counseling History", icon:History },
  { id:"notifications", label:"Notifications", icon:Bell },
];


const REQUIRED_DOCS = [
  { id: "TENTH_MARKSHEET", name: "10th Marksheet", category: "Academic", required: true },
  { id: "TWELFTH_MARKSHEET", name: "12th Marksheet", category: "Academic", required: true },
  { id: "GRADUATION", name: "Graduation Marksheet/Degree", category: "Academic", required: false },
  { id: "AADHAAR", name: "Aadhaar Card", category: "Identity", required: true },
  { id: "PHOTO", name: "Candidate Photograph", category: "Personal", required: true },
  { id: "SIGNATURE", name: "Specimen Signature", category: "Personal", required: false },
  { id: "MIGRATION", name: "Migration Certificate", category: "Academic", required: false },
  { id: "TRANSFER_CERTIFICATE", name: "Transfer Certificate (TC)", category: "Academic", required: false },
  { id: "CHARACTER_CERTIFICATE", name: "Character Certificate", category: "Academic", required: false },
  { id: "CASTE_CERTIFICATE", name: "Caste / Category Certificate", category: "Certificate", required: false },
  { id: "INCOME_CERTIFICATE", name: "Income Certificate", category: "Certificate", required: false },
  { id: "DOMICILE", name: "Domicile / Residence Certificate", category: "Certificate", required: false },
  { id: "MEDICAL_CERTIFICATE", name: "Medical Fitness Certificate", category: "Medical", required: false },
  { id: "GAP_CERTIFICATE", name: "Gap Certificate", category: "Certificate", required: false },
];


export default function StudentDashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const { user, isLoggedIn, isLoading } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [showReferralModal, setShowReferralModal] = useState<boolean>(false);

  useEffect(() => {
    const tab = searchParams.get("tab") || searchParams.get("section");
    if (tab) {
      setActiveSection(tab);
    }
    const appId = searchParams.get("appId") || searchParams.get("applicationId");
    if (appId) {
      setSelectedWorkflowAppId(appId);
      setActiveSection("applications");
    }
  }, [searchParams]);

  const {
    data: meRes,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
    refetch: refetchMe,
    isFetching: isMeFetching,
  } = useQuery({
    queryKey: ["user_me"],
    queryFn: () => usersApi.getMe(),
    enabled: isLoggedIn,
  });

  const studentUser = (meRes?.data || user) as any;

  const calculateProfileCompletion = (u: any) => {
    if (!u) return 0;
    const p = u.profile || {};
    const fields = [
      u.fullName,
      u.email,
      u.mobile,
      p.dob,
      p.gender,
      p.category,
      p.city || u.city,
      p.state || u.state,
      p.address || u.address,
      p.tenthBoard,
      p.tenthMarks,
      p.twelfthBoard,
      p.twelfthMarks,
    ];
    const filled = fields.filter(
      (f) => f !== null && f !== undefined && String(f).trim() !== ''
    ).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completionRate = calculateProfileCompletion(studentUser);

  useEffect(() => {
    if (studentUser && studentUser.role === 'STUDENT' && studentUser.hasCompletedReferralOnboarding === false) {
      setShowReferralModal(true);
    }
  }, [studentUser]);

  // --------------------------------------------------------------------------
  // STUDENT PROFILE & PREFERENCES REAL ERP STATE
  // --------------------------------------------------------------------------
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    dob: "",
    gender: "Male",
    category: "General",
    country: "India",
    mobile: "",
    email: "",
    state: "",
    district: "",
    pincode: "",
    tenthBoard: "CBSE",
    tenthMarks: "",
    twelfthBoard: "CBSE",
    twelfthMarks: "",
    graduationCourse: "",
    graduationCollege: "",
    graduationPercentage: "",
  });

  useEffect(() => {
    if (studentUser) {
      const p = studentUser.profile || {};
      setProfileForm({
        fullName: studentUser.fullName || "",
        dob: p.dob
          ? new Date(p.dob).toISOString().split("T")[0]
          : studentUser.dateOfBirth
          ? new Date(studentUser.dateOfBirth).toISOString().split("T")[0]
          : "",
        gender: p.gender || studentUser.gender || "Male",
        category: p.category || "General",
        country: studentUser.country || p.nationality || "India",
        mobile: studentUser.mobile || "",
        email: studentUser.email || "",
        state: p.state || studentUser.state || "",
        district: p.district || "",
        pincode: p.pincode || studentUser.pincode || "",
        tenthBoard: p.tenthBoard || "CBSE",
        tenthMarks:
          p.tenthMarks !== undefined && p.tenthMarks !== null
            ? String(p.tenthMarks)
            : "",
        twelfthBoard: p.twelfthBoard || "CBSE",
        twelfthMarks:
          p.twelfthMarks !== undefined && p.twelfthMarks !== null
            ? String(p.twelfthMarks)
            : "",
        graduationCourse: p.graduationCourse || "",
        graduationCollege: p.graduationCollege || "",
        graduationPercentage:
          p.graduationPercentage !== undefined &&
          p.graduationPercentage !== null
            ? String(p.graduationPercentage)
            : "",
      });
    }
  }, [studentUser, isEditProfileOpen]);

  // Master Geography: Indian States
  const { data: statesList = [] } = useQuery<StateItem[]>({
    queryKey: ["public_states"],
    queryFn: () => geographyApi.getStates(),
    staleTime: 1000 * 60 * 60,
  });

  // Dynamic District Resolution: loads districts for selected state
  const matchedState = statesList.find(
    (s) =>
      s.name?.toLowerCase() === profileForm.state?.toLowerCase() ||
      s.id === profileForm.state,
  );
  const selectedStateKey = matchedState?.id || profileForm.state;

  const { data: districtsList = [], isFetching: isDistrictsLoading } = useQuery<DistrictItem[]>({
    queryKey: ["public_districts", selectedStateKey],
    queryFn: () => geographyApi.getDistricts(selectedStateKey),
    enabled: Boolean(selectedStateKey && selectedStateKey.trim().length > 0),
    staleTime: 1000 * 60 * 60,
  });

  const handleProfileStateChange = (newState: string) => {
    setProfileForm((prev) => ({
      ...prev,
      state: newState,
      district: "", // Always reset district on state change
    }));
  };

  const updateProfileMutation = useMutation({
    mutationFn: (payload: any) => usersApi.updateProfile(payload),
    onSuccess: () => {
      toast.success("Profile saved successfully");
      setIsEditProfileOpen(false);
      queryClient.invalidateQueries({ queryKey: ["user_me"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      fullName: profileForm.fullName.trim(),
      dob: profileForm.dob ? profileForm.dob : undefined,
      gender: profileForm.gender,
      category: profileForm.category,
      country: profileForm.country,
      state: profileForm.state,
      district: profileForm.district,
      pincode: profileForm.pincode,
      tenthBoard: profileForm.tenthBoard,
      tenthMarks: profileForm.tenthMarks
        ? Number(profileForm.tenthMarks)
        : undefined,
      twelfthBoard: profileForm.twelfthBoard,
      twelfthMarks: profileForm.twelfthMarks
        ? Number(profileForm.twelfthMarks)
        : undefined,
      graduationCourse: profileForm.graduationCourse,
      graduationCollege: profileForm.graduationCollege,
      graduationPercentage: profileForm.graduationPercentage
        ? Number(profileForm.graduationPercentage)
        : undefined,
    };
    updateProfileMutation.mutate(payload);
  };

  // --------------------------------------------------------------------------
  // PREFERENCES STATE & MUTATIONS
  // --------------------------------------------------------------------------
  const rawPreferences = (studentUser?.preferences || {}) as any;
  const initialEdu = rawPreferences.education || {};
  const [eduPreferencesForm, setEduPreferencesForm] = useState({
    educationLevel: initialEdu.educationLevel || "",
    admissionYear: initialEdu.admissionYear || "2026",
    studyMode: initialEdu.studyMode || "Full Time",
    course: initialEdu.course || "",
    specialization: initialEdu.specialization || "",
    preferredState: initialEdu.preferredState || "",
    preferredCity: initialEdu.preferredCity || "",
    budgetMin: initialEdu.budgetMin ? String(initialEdu.budgetMin) : "",
    budgetMax: initialEdu.budgetMax ? String(initialEdu.budgetMax) : "",
    collegePreferences: Array.isArray(initialEdu.collegePreferences)
      ? initialEdu.collegePreferences.join(", ")
      : initialEdu.collegePreferences || "",
  });

  useEffect(() => {
    if (studentUser?.preferences?.education) {
      const e = studentUser.preferences.education;
      setEduPreferencesForm({
        educationLevel: e.educationLevel || "",
        admissionYear: e.admissionYear || "2026",
        studyMode: e.studyMode || "Full Time",
        course: e.course || "",
        specialization: e.specialization || "",
        preferredState: e.preferredState || "",
        preferredCity: e.preferredCity || "",
        budgetMin: e.budgetMin ? String(e.budgetMin) : "",
        budgetMax: e.budgetMax ? String(e.budgetMax) : "",
        collegePreferences: Array.isArray(e.collegePreferences)
          ? e.collegePreferences.join(", ")
          : e.collegePreferences || "",
      });
    }
  }, [studentUser]);

  // Exam Preferences Modal State
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examForm, setExamForm] = useState({
    examName: "JEE Main",
    score: "",
    rank: "",
    year: "2026",
    status: "APPEARED",
  });

  // Education Background Modal State
  const [isAddEduBgOpen, setIsAddEduBgOpen] = useState(false);
  const [eduBgForm, setEduBgForm] = useState({
    level: "10th",
    schoolCollege: "",
    board: "CBSE",
    passingYear: "2022",
    percentage: "",
  });

  // Work Experience Modal State
  const [isAddWorkExpOpen, setIsAddWorkExpOpen] = useState(false);
  const [workExpForm, setWorkExpForm] = useState({
    company: "",
    role: "",
    duration: "",
    description: "",
  });

  // Master mutation for preferences
  const savePreferencesMutation = useMutation({
    mutationFn: (newPreferences: any) =>
      usersApi.updateProfile({ preferences: newPreferences }),
    onSuccess: () => {
      toast.success("Preferences saved successfully");
      queryClient.invalidateQueries({ queryKey: ["user_me"] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Failed to update preferences",
      );
    },
  });

  const handleSaveEducationPreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedEdu = {
      ...eduPreferencesForm,
      budgetMin: Number(eduPreferencesForm.budgetMin) || 100000,
      budgetMax: Number(eduPreferencesForm.budgetMax) || 500000,
      collegePreferences: eduPreferencesForm.collegePreferences
        ? eduPreferencesForm.collegePreferences
            .split(",")
            .map((c: string) => c.trim())
            .filter(Boolean)
        : [],
    };
    const updatedPrefs = {
      ...rawPreferences,
      education: updatedEdu,
    };
    savePreferencesMutation.mutate(updatedPrefs);
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.examName.trim()) {
      toast.error("Please enter exam name");
      return;
    }
    const currentExams = Array.isArray(rawPreferences.exams)
      ? [...rawPreferences.exams]
      : [];
    let updatedExams: any[];
    if (editingExamId) {
      updatedExams = currentExams.map((ex: any) =>
        ex.id === editingExamId ? { ...examForm, id: editingExamId } : ex,
      );
    } else {
      updatedExams = [
        ...currentExams,
        { ...examForm, id: `exam_${Date.now()}` },
      ];
    }
    const updatedPrefs = {
      ...rawPreferences,
      exams: updatedExams,
    };
    savePreferencesMutation.mutate(updatedPrefs);
    setIsAddExamOpen(false);
    setEditingExamId(null);
    setExamForm({
      examName: "JEE Main",
      score: "",
      rank: "",
      year: "2026",
      status: "APPEARED",
    });
  };

  const handleRemoveExam = (examId: string) => {
    const currentExams = Array.isArray(rawPreferences.exams)
      ? rawPreferences.exams
      : [];
    const updatedPrefs = {
      ...rawPreferences,
      exams: currentExams.filter((ex: any) => ex.id !== examId),
    };
    savePreferencesMutation.mutate(updatedPrefs);
  };

  const handleSaveEduBg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduBgForm.schoolCollege.trim()) {
      toast.error("Please enter school or college name");
      return;
    }
    const currentList = Array.isArray(rawPreferences.educationBackground)
      ? [...rawPreferences.educationBackground]
      : [];
    const updatedList = [
      ...currentList,
      { ...eduBgForm, id: `edu_${Date.now()}` },
    ];
    const updatedPrefs = {
      ...rawPreferences,
      educationBackground: updatedList,
    };
    savePreferencesMutation.mutate(updatedPrefs);
    setIsAddEduBgOpen(false);
    setEduBgForm({
      level: "10th",
      schoolCollege: "",
      board: "CBSE",
      passingYear: "2022",
      percentage: "",
    });
  };

  const handleRemoveEduBg = (id: string) => {
    const currentList = Array.isArray(rawPreferences.educationBackground)
      ? rawPreferences.educationBackground
      : [];
    const updatedPrefs = {
      ...rawPreferences,
      educationBackground: currentList.filter((item: any) => item.id !== id),
    };
    savePreferencesMutation.mutate(updatedPrefs);
  };

  const handleSaveWorkExp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workExpForm.company.trim() || !workExpForm.role.trim()) {
      toast.error("Please enter company and role");
      return;
    }
    const currentList = Array.isArray(rawPreferences.workExperience)
      ? [...rawPreferences.workExperience]
      : [];
    const updatedList = [
      ...currentList,
      { ...workExpForm, id: `work_${Date.now()}` },
    ];
    const updatedPrefs = {
      ...rawPreferences,
      workExperience: updatedList,
    };
    savePreferencesMutation.mutate(updatedPrefs);
    setIsAddWorkExpOpen(false);
    setWorkExpForm({ company: "", role: "", duration: "", description: "" });
  };

  const handleRemoveWorkExp = (id: string) => {
    const currentList = Array.isArray(rawPreferences.workExperience)
      ? rawPreferences.workExperience
      : [];
    const updatedPrefs = {
      ...rawPreferences,
      workExperience: currentList.filter((item: any) => item.id !== id),
    };
    savePreferencesMutation.mutate(updatedPrefs);
  };

  const {
    data: docsRes,
    isLoading: isDocsLoading,
    isError: isDocsError,
    error: docsError,
    refetch: refetchDocs,
    isFetching: isDocsFetching,
  } = useQuery({
    queryKey: ["my_documents"],
    queryFn: () => documentsApi.getMyDocuments(),
    enabled: isLoggedIn,
  });

  const {
    data: dynamicChecklistRes,
    isLoading: isChecklistLoading,
    refetch: refetchChecklist,
    isFetching: isChecklistFetching,
  } = useQuery({
    queryKey: ["my_documents_checklist"],
    queryFn: () => documentsApi.getChecklist(),
    enabled: isLoggedIn,
  });

  const [docCategoryFilter, setDocCategoryFilter] = useState<string>("ALL");
  const [viewHistoryDocId, setViewHistoryDocId] = useState<string | null>(null);

  const { data: docHistoryRes, isLoading: isDocHistoryLoading } = useQuery({
    queryKey: ["doc_history", viewHistoryDocId],
    queryFn: () => documentsApi.getHistory(viewHistoryDocId!),
    enabled: !!viewHistoryDocId,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ type, file }: { type: string; file: File }) => {
      if (file.size > 300 * 1024) {
        throw new Error("File size must not exceed 300 KB.");
      }
      return documentsApi.upload(type, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_documents"] });
      queryClient.invalidateQueries({ queryKey: ["my_documents_checklist"] });
      queryClient.invalidateQueries({ queryKey: ["journey"] });
    },
  });

  const replaceDocMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      if (file.size > 300 * 1024) {
        throw new Error("File size must not exceed 300 KB.");
      }
      return documentsApi.replace(id, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_documents"] });
      queryClient.invalidateQueries({ queryKey: ["my_documents_checklist"] });
      queryClient.invalidateQueries({ queryKey: ["journey"] });
    },
  });

  const {
    data: notificationsRes,
    isLoading: isNotificationsLoading,
    isError: isNotificationsError,
    error: notificationsError,
    refetch: refetchNotifications,
    isFetching: isNotificationsFetching,
  } = useQuery({
    queryKey: ["my_notifications"],
    queryFn: () => notificationsApi.getMyNotifications(),
    enabled: isLoggedIn,
  });

  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  const { data: preferencesRes } = useQuery({
    queryKey: ["my_comm_preferences"],
    queryFn: () => notificationsApi.getPreferences(),
    enabled: isLoggedIn,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (data: any) => notificationsApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_comm_preferences"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_notifications"] });
    },
  });

  const markSingleNotificationRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const markAllNotificationsRead = () => {
    markAllReadMutation.mutate();
  };

  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Admissions Query");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newApplicationId, setNewApplicationId] = useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [newAttachmentName, setNewAttachmentName] = useState("");
  const [selectedStudentTicketId, setSelectedStudentTicketId] = useState<string | null>(null);
  const [studentReplyText, setStudentReplyText] = useState("");
  const [ticketFilterStatus, setTicketFilterStatus] = useState("ALL");
  const [ticketSearchQuery, setTicketSearchQuery] = useState("");

  // Feedback & Reopen States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [closeTicketRating, setCloseTicketRating] = useState(5);
  const [closeTicketComment, setCloseTicketComment] = useState("");
  const [showStudentReopenModal, setShowStudentReopenModal] = useState(false);
  const [studentReopenReason, setStudentReopenReason] = useState("");

  const [appSearchQuery, setAppSearchQuery] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("ALL");
  const [appSortBy, setAppSortBy] = useState("latest");
  const [selectedTimelineApp, setSelectedTimelineApp] = useState<any>(null);

  // Reporting Modal States
  const [reportingModalApp, setReportingModalApp] = useState<any>(null);
  const [reportingForm, setReportingForm] = useState({
    reportingDate: "",
    collegeCampus: "Main Campus",
    collegeReferenceNumber: "",
    proofDocumentUrl: "",
    studentRemarks: "",
  });
  const [isSubmittingReporting, setIsSubmittingReporting] = useState(false);

  const {
    data: studentTicketsRes,
    isLoading: isTicketsLoading,
    isError: isTicketsError,
    error: ticketsError,
    refetch: refetchTickets,
    isFetching: isTicketsFetching,
  } = useQuery({
    queryKey: ["student_tickets"],
    queryFn: () => supportApi.getTickets(),
    enabled: isLoggedIn,
  });

  const {
    data: ticketDetailRes,
    isLoading: isTicketDetailLoading,
    isError: isTicketDetailError,
    refetch: refetchTicketDetail,
  } = useQuery({
    queryKey: ["student_ticket_detail", selectedStudentTicketId],
    queryFn: () => supportApi.getTicket(selectedStudentTicketId!),
    enabled: !!selectedStudentTicketId,
    refetchInterval: 4000,
  });

  const { data: supportFaqsRes } = useQuery({
    queryKey: ["student_support_faqs"],
    queryFn: () => supportApi.getFaqs(),
    enabled: isLoggedIn,
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const createTicketMutation = useMutation({
    mutationFn: (data: any) => supportApi.createTicket(data),
    onSuccess: () => {
      setShowNewTicketModal(false);
      setNewSubject("");
      setNewDesc("");
      setNewApplicationId("");
      setNewAttachmentUrl("");
      setNewAttachmentName("");
      queryClient.invalidateQueries({ queryKey: ["student_tickets"] });
    },
  });

  const replyTicketMutation = useMutation({
    mutationFn: (data: any) => supportApi.replyTicket(selectedStudentTicketId!, data),
    onSuccess: () => {
      setStudentReplyText("");
      queryClient.invalidateQueries({ queryKey: ["student_ticket_detail", selectedStudentTicketId] });
      queryClient.invalidateQueries({ queryKey: ["student_tickets"] });
    },
  });

  const closeStudentTicketMutation = useMutation({
    mutationFn: (data: { rating?: number; comment?: string }) =>
      supportApi.closeTicket(selectedStudentTicketId!, data.rating, data.comment),
    onSuccess: () => {
      setShowFeedbackModal(false);
      setCloseTicketComment("");
      queryClient.invalidateQueries({ queryKey: ["student_ticket_detail", selectedStudentTicketId] });
      queryClient.invalidateQueries({ queryKey: ["student_tickets"] });
    },
  });

  const reopenStudentTicketMutation = useMutation({
    mutationFn: (reason?: string) => supportApi.reopenTicket(selectedStudentTicketId!, reason),
    onSuccess: () => {
      setShowStudentReopenModal(false);
      setStudentReopenReason("");
      queryClient.invalidateQueries({ queryKey: ["student_ticket_detail", selectedStudentTicketId] });
      queryClient.invalidateQueries({ queryKey: ["student_tickets"] });
    },
  });

  const studentTickets = studentTicketsRes?.data?.data || studentTicketsRes?.data || [];
  const selectedTicketDetail = ticketDetailRes?.data || ticketDetailRes;
  const supportFaqs = supportFaqsRes?.data || [];

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      navigate("/", { replace: true });
    }
  }, [isLoading, isLoggedIn, navigate]);

  const studentName = user?.fullName || "Student";
  const studentInitial = studentName.charAt(0).toUpperCase();

  const [selectedStudentAppJourney, setSelectedStudentAppJourney] = useState<any | null>(null);

  const {
    data: appsRes,
    isLoading: isAppsLoading,
    isError: isAppsError,
    error: appsError,
    refetch: refetchApps,
    isFetching: isAppsFetching,
  } = useQuery({
    queryKey: ["myApplications"],
    queryFn: () => applicationsApi.findMyApplications(),
    enabled: isLoggedIn,
  });

  const {
    data: quotaRes,
    refetch: refetchQuota,
  } = useQuery({
    queryKey: ["applications_quota"],
    queryFn: () => applicationsApi.getQuota(),
    enabled: isLoggedIn,
  });

  const {
    data: historyRes,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory,
    isFetching: isHistoryFetching,
  } = useQuery({
    queryKey: ["aiHistory"],
    queryFn: () => aiCounselorApi.getHistory(),
    enabled: isLoggedIn,
  });

  const {
    data: shortlistRes,
    isLoading: isShortlistLoading,
    isError: isShortlistError,
    error: shortlistError,
    refetch: refetchShortlist,
    isFetching: isShortlistFetching,
  } = useQuery({
    queryKey: ["shortlist"],
    queryFn: () => usersApi.getShortlist(),
    enabled: isLoggedIn,
  });

  const {
    data: journeyRes,
    isLoading: isJourneyLoading,
    isError: isJourneyError,
    error: journeyError,
    refetch: refetchJourney,
    isFetching: isJourneyFetching,
  } = useQuery({
    queryKey: ["journey"],
    queryFn: () => journeyApi.getJourney(),
    enabled: isLoggedIn,
  });

  const {
    data: recsRes,
    isLoading: isRecsLoading,
    isError: isRecsError,
    error: recsError,
    refetch: refetchRecs,
    isFetching: isRecsFetching,
  } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => recommendationApi.getHomepage(),
    enabled: isLoggedIn,
  });

  const {
    data: materialBookmarksRes,
    isLoading: isMaterialBookmarksLoading,
    isError: isMaterialBookmarksError,
    error: materialBookmarksError,
    refetch: refetchMaterialBookmarks,
    isFetching: isMaterialBookmarksFetching,
  } = useQuery({
    queryKey: ["study_material_bookmarks"],
    queryFn: () => studyMaterialsApi.getBookmarks(),
    enabled: isLoggedIn,
  });

  const {
    data: materialHistoryRes,
    isLoading: isMaterialHistoryLoading,
    isError: isMaterialHistoryError,
    error: materialHistoryError,
    refetch: refetchMaterialHistory,
    isFetching: isMaterialHistoryFetching,
  } = useQuery({
    queryKey: ["study_material_history"],
    queryFn: () => studyMaterialsApi.getHistory(),
    enabled: isLoggedIn,
  });

  const {
    data: recommendedMaterialsRes,
    isLoading: isRecommendedMaterialsLoading,
    isError: isRecommendedMaterialsError,
    error: recommendedMaterialsError,
    refetch: refetchRecommendedMaterials,
    isFetching: isRecommendedMaterialsFetching,
  } = useQuery({
    queryKey: ["study_materials_recommended"],
    queryFn: () => studyMaterialsApi.getRecommended({ limit: 6 }),
    enabled: isLoggedIn,
  });

  const {
    data: myPaymentsRes,
    isLoading: isPaymentsLoading,
    isError: isPaymentsError,
    error: paymentsError,
    refetch: refetchPayments,
    isFetching: isPaymentsFetching,
  } = useQuery({
    queryKey: ["my_payments"],
    queryFn: () => paymentsApi.getMyPayments(),
    enabled: isLoggedIn,
  });

  const {
    data: paymentSummaryRes,
    isLoading: isPaymentSummaryLoading,
    isError: isPaymentSummaryError,
    error: paymentSummaryError,
    refetch: refetchPaymentSummary,
    isFetching: isPaymentSummaryFetching,
  } = useQuery({
    queryKey: ["payment_summary"],
    queryFn: () => paymentsApi.getSummary(),
    enabled: isLoggedIn,
  });

  const {
    data: myRequestsRes,
    isLoading: isMyRequestsLoading,
    isError: isMyRequestsError,
    error: myRequestsError,
    refetch: refetchMyRequests,
    isFetching: isMyRequestsFetching,
  } = useQuery({
    queryKey: ["my_payment_requests"],
    queryFn: () => paymentsApi.getMyRequests(),
    enabled: isLoggedIn,
  });

  const [paymentModeTab, setPaymentModeTab] = useState<"GATEWAY" | "DIRECT_COLLEGE">("DIRECT_COLLEGE");
  const [proofForm, setProofForm] = useState({
    paymentId: "",
    utrNumber: "",
    paidAmount: "",
    proofDocument: "",
    remarks: "",
  });
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [copyToast, setCopyToast] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedWorkflowAppId, setSelectedWorkflowAppId] = useState<string | null>(null);
  const [selectedTimelinePaymentId, setSelectedTimelinePaymentId] = useState<string | null>(null);
  const [submitUtrModal, setSubmitUtrModal] = useState<{ paymentId: string; utrNumber: string } | null>(null);
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResponse | null>(null);

  const [counselorRating, setCounselorRating] = useState<number>(5);
  const [counselorComment, setCounselorComment] = useState<string>("");
  const [isSubmittingCounselorReview, setIsSubmittingCounselorReview] = useState<boolean>(false);

  const [collegeRating, setCollegeRating] = useState<number>(5);
  const [collegeComment, setCollegeComment] = useState<string>("");
  const [isSubmittingCollegeReview, setIsSubmittingCollegeReview] = useState<boolean>(false);

  const submitCounselorReview = async () => {
    try {
      setIsSubmittingCounselorReview(true);
      await journeyApi.submitCounselorReview({
        rating: counselorRating,
        comment: counselorComment.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["journey"] });
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to submit counselor review");
    } finally {
      setIsSubmittingCounselorReview(false);
    }
  };

  const submitCollegeReview = async () => {
    try {
      setIsSubmittingCollegeReview(true);
      await journeyApi.submitCollegeReview({
        rating: collegeRating,
        comment: collegeComment.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["journey"] });
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to submit college review");
    } finally {
      setIsSubmittingCollegeReview(false);
    }
  };

  const { data: timelineRes } = useQuery({
    queryKey: ["payment_timeline", selectedTimelinePaymentId],
    queryFn: () => paymentsApi.getTimeline(selectedTimelinePaymentId!),
    enabled: !!selectedTimelinePaymentId,
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: (id: string) => studyMaterialsApi.removeBookmark(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study_material_bookmarks"] }),
  });

  const { data: counselorStatusRes, refetch: refetchCounselorStatus } = useQuery({
    queryKey: ["counselorRequestStatus"],
    queryFn: () => journeyApi.getCounselorRequestStatus(),
    enabled: isLoggedIn,
  });

  const [isRequestingCounselor, setIsRequestingCounselor] = useState(false);
  const handleRequestCounselor = async () => {
    setIsRequestingCounselor(true);
    try {
      await journeyApi.requestCounselor();
      toast.success("Counselor request submitted! An advisor will be assigned shortly.");
      await refetchCounselorStatus();
      await refetchJourney();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit counselor request.");
    } finally {
      setIsRequestingCounselor(false);
    }
  };

  const normalizeArray = (resData: any): any[] => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.applications)) return resData.applications;
    if (Array.isArray(resData?.data?.applications)) return resData.data.applications;
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.data?.data)) return resData.data.data;
    if (Array.isArray(resData?.notifications)) return resData.notifications;
    if (Array.isArray(resData?.documents)) return resData.documents;
    return [];
  };

  const myDocuments = normalizeArray(docsRes?.data);
  const myApplications = normalizeArray(appsRes?.data || appsRes);
  const aiHistory = normalizeArray(historyRes?.data);
  const savedItems = normalizeArray(shortlistRes?.data);
  const aiRecs = normalizeArray(recsRes?.data?.recommendedColleges || recsRes?.data);
  const journeyProgress = Number(
    journeyRes?.progress?.progressPercentage ??
    (journeyRes as any)?.overallJourney?.progress ??
    0
  );
  const journeySteps = normalizeArray(
    journeyRes?.progress?.steps ||
    journeyRes?.checklist ||
    journeyRes?.overallJourney?.checkpoints
  );
  const journeyTimeline = normalizeArray(journeyRes?.timeline);
  const journeyChecklist = normalizeArray(journeyRes?.checklist || journeyRes?.overallJourney?.checkpoints);
  const journeyTasks = normalizeArray(journeyRes?.upcomingTasks);
  const assignedCounselor =
    journeyRes?.assignedCounselor ||
    (meRes?.data as any)?.assignedCounselor ||
    counselorStatusRes?.counselor ||
    null;
  const isCounselorRequestPending = Boolean(counselorStatusRes?.isRequestPending);
  const myNotifications = normalizeArray(notificationsRes?.data);
  const materialBookmarks = normalizeArray(materialBookmarksRes?.data?.data || materialBookmarksRes?.data);
  const materialHistory = normalizeArray(materialHistoryRes?.data?.data || materialHistoryRes?.data);
  const recommendedMaterials = normalizeArray(recommendedMaterialsRes?.data?.data || recommendedMaterialsRes?.data);
  const myPayments = normalizeArray(myPaymentsRes?.data?.data || myPaymentsRes?.data);
  const paymentSummaryData = paymentSummaryRes?.data?.summary || paymentSummaryRes?.data || {};
  const paymentBreakdown = normalizeArray(paymentSummaryRes?.data?.breakdown);
  const paymentInstallments = normalizeArray(paymentSummaryRes?.data?.installments);
  const allPaymentsList = normalizeArray(paymentSummaryRes?.data?.payments || myPaymentsRes?.data);
  const collegeBankAccountsList = normalizeArray(paymentSummaryRes?.data?.bankAccounts);
  const myRequests = normalizeArray(myRequestsRes?.data?.data || myRequestsRes?.data);

  // Auto-select first active payment request if none selected
  useEffect(() => {
    if (!proofForm.paymentId && myRequests.length > 0) {
      const activeReq = myRequests.find((r: any) => !r.isExpired && r.status !== 'EXPIRED' && r.status !== 'PAID');
      if (activeReq) {
        setProofForm((prev) => ({
          ...prev,
          paymentId: activeReq.id,
          paidAmount: String(activeReq.dueAmount || activeReq.finalPayableAmount || activeReq.requestedAmount),
        }));
      }
    }
  }, [myRequests, proofForm.paymentId]);



  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
      case "READY_TO_SUBMIT":
        return "#64748B"; // Slate
      case "NEW":
      case "SUBMITTED":
        return "#3B82F6"; // Blue
      case "UNDER_REVIEW":
      case "COUNSELOR_ASSIGNED":
        return "#F59E0B"; // Amber / Yellow
      case "DOCUMENTS_VERIFIED":
      case "APPROVED":
      case "COLLEGE_APPROVED":
      case "ADMISSION_CONFIRMED":
      case "STUDENT_ENROLLED":
      case "COMPLETED":
        return "#10B981"; // Green
      case "REJECTED":
      case "CANCELLED":
        return "#EF4444"; // Red
      case "PAYMENT_PENDING":
      case "DOCUMENT_PENDING":
        return "#F97316"; // Orange
      default:
        return "#4A7B5B";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F8FAFC" }}>
        <div className="animate-spin w-8 h-8 border-3 border-[#4A7B5B] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <div style={{ backgroundColor: "#F8FAFC" }} className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-60 shrink-0 hidden md:block">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-20">
              {/* Profile */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#4A7B5B] flex items-center justify-center" style={{fontSize:"18px",fontWeight:800,color:"white"}}>
                    {studentInitial}
                  </div>
                  <div>
                    <div style={{fontSize:"14px",fontWeight:700,color:"#0F172A"}}>{studentName}</div>
                    <div style={{fontSize:"11px",color:"#94a3b8"}}>B.Tech 2024 Aspirant</div>
                  </div>
                </div>
              </div>
              {/* Nav */}
              <div className="p-2">
                {SIDEBAR_ITEMS.map(item=>(
                  <button key={item.id} onClick={()=>setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors mb-0.5 ${activeSection===item.id?"bg-[#E8F3EC] text-[#4A7B5B]":"text-gray-600 hover:bg-gray-50"}`}
                    style={{fontWeight:activeSection===item.id?600:400}}>
                    <item.icon size={16}/>{item.label}
                    {item.id==="notifications" && myNotifications.length > 0 && <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center" style={{fontSize:"9px",fontWeight:700}}>{myNotifications.length}</span>}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <Link to="/" onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-50 transition-colors">
                    <LogOut size={16}/> Logout
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile nav pills */}
            <div className="md:hidden flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
              {SIDEBAR_ITEMS.map(item=>(
                <button key={item.id} onClick={()=>setActiveSection(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs whitespace-nowrap shrink-0 transition-colors ${activeSection===item.id?"bg-[#4A7B5B] text-white":"bg-white border border-gray-200 text-gray-600"}`}
                  style={{fontWeight:activeSection===item.id?600:400}}>
                  <item.icon size={12}/>{item.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW */}
            {activeSection==="overview" && (
              <div className="space-y-5">
                <div>
                  <h2 style={{fontWeight:800,color:"#0F172A",fontSize:"22px"}}>Welcome back, {studentName.split(" ")[0]}! 👋</h2>
                  <p style={{fontSize:"13px",color:"#94a3b8"}}>Here's a summary of your admission journey</p>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {label:"Saved Colleges",value: shortlistRes ? savedItems.length.toString() : "-",icon:BookmarkCheck,color:"#4A7B5B",bg:"#E8F3EC"},
                    {label:"Applications",value: appsRes ? myApplications.length.toString() : "-",icon:FileText,color:"#3B82F6",bg:"#EFF6FF"},
                    {label:"AI Matches",value: recsRes ? aiRecs.length.toString() : "-",icon:Bot,color:"#8B5CF6",bg:"#F5F3FF"},
                    {label:"Docs Uploaded",value: docsRes ? `${myDocuments.length}/${REQUIRED_DOCS.length}` : "-",icon:Upload,color:"#F59E0B",bg:"#FFFBEB"},
                  ].map(s=>(
                    <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{backgroundColor:s.bg}}>
                        <s.icon size={16} style={{color:s.color}}/>
                      </div>
                      <div style={{fontSize:"24px",fontWeight:800,color:"#0F172A"}}>{s.value}</div>
                      <div style={{fontSize:"11px",color:"#94a3b8"}}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Assigned Counselor Section */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>Your Assigned Educational Counselor</h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E8F3EC] text-[#4A7B5B]">
                      Live Support
                    </span>
                  </div>

                  {assignedCounselor ? (
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#4A7B5B] text-white font-bold text-lg flex items-center justify-center">
                          {assignedCounselor.fullName?.charAt(0) || "C"}
                        </div>
                        <div>
                          <div className="font-bold text-[#0F172A] text-sm">{assignedCounselor.fullName}</div>
                          <div className="text-xs text-gray-500">{assignedCounselor.designation || "Senior Educational Counselor"}</div>
                          <div className="text-[11px] text-gray-400">{assignedCounselor.department || "Admissions Department"}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        {assignedCounselor.mobile && (
                          <a
                            href={`tel:${assignedCounselor.mobile}`}
                            className="flex-1 sm:flex-initial px-3 py-2 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#d8e8dc]"
                          >
                            Call Counselor
                          </a>
                        )}
                        {assignedCounselor.mobile && (
                          <a
                            href={`https://wa.me/${(assignedCounselor.mobile || "").replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 sm:flex-initial px-3 py-2 bg-[#DCFCE7] text-[#16A34A] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#c8f8d6]"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  ) : isCounselorRequestPending ? (
                    <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
                          <Clock size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-[#0F172A] text-sm flex items-center gap-2">
                            Request Submitted — Pending Assignment
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-200 text-amber-900">
                              In Review
                            </span>
                          </div>
                          <div className="text-xs text-amber-800/80">
                            Your request for an admission counselor is currently pending review. An academic advisor will be assigned to guide your admissions.
                          </div>
                        </div>
                      </div>
                      <button
                        disabled
                        className="px-3.5 py-2 bg-amber-200/80 text-amber-900 rounded-xl text-xs font-semibold cursor-not-allowed opacity-80 shrink-0"
                      >
                        Request Pending
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0">
                          <User size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-[#0F172A] text-sm">No counselor assigned yet</div>
                          <div className="text-xs text-gray-500">
                            Get a dedicated admission advisor to guide your course, eligibility, and college selection.
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleRequestCounselor}
                        disabled={isRequestingCounselor}
                        className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        {isRequestingCounselor ? "Submitting..." : "Request Counselor"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Application status */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 style={{fontSize:"16px",fontWeight:700,color:"#0F172A"}}>Recent Applications</h3>
                    <button onClick={()=>setActiveSection("applications")} className="text-xs text-[#4A7B5B] hover:underline">View all</button>
                  </div>
                  <div className="space-y-3">
                    {isAppsLoading ? (
                      <div className="animate-pulse h-12 bg-slate-100 rounded-xl w-full"></div>
                    ) : isAppsError ? (
                      <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center justify-between">
                        <span>Unable to load recent applications.</span>
                        <button onClick={() => refetchApps()} className="font-bold underline cursor-pointer">Retry</button>
                      </div>
                    ) : myApplications.length === 0 ? (
                      <p className="text-sm text-gray-500">No applications yet.</p>
                    ) : (
                      myApplications.slice(0,2).map((app: any)=>(
                        <div key={app.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl">
                          <div>
                            <div style={{fontSize:"13px",fontWeight:600,color:"#0F172A"}}>
                              {app.college?.name || app.formData?.preferences?.preferredCollege || "College Preference: Not Selected"}
                            </div>
                            <div style={{fontSize:"11px",color:"#94a3b8"}}>{app.course?.name} · {new Date(app.createdAt).toLocaleDateString()}</div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-white" style={{fontSize:"10px",fontWeight:600,backgroundColor:getStatusColor(app.status)}}>{app.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* AI recommendation preview */}
                <div className="bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot size={18} className="text-[#F0AE1A]"/>
                    <span className="text-white" style={{fontSize:"14px",fontWeight:700}}>AI Counselor Active</span>
                  </div>
                  <p className="text-white/80 mb-4" style={{fontSize:"12px"}}>Interact with your personalized AI counselor to find your best matches.</p>
                  <Link to="/ai-counselor" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#4A7B5B] rounded-xl" style={{fontWeight:600,fontSize:"13px"}}>
                    Start Chat <ChevronRight size={14}/>
                  </Link>
                </div>
              </div>
            )}

            {/* JOURNEY TRACKER */}
            {activeSection==="journey" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 style={{fontWeight:800,color:"#0F172A",fontSize:"20px"}}>My Admission Journey</h2>
                    <p style={{fontSize:"13px",color:"#94a3b8"}}>Track your live progress, checklist, and admission events.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => refetchJourney()}
                      disabled={isJourneyFetching}
                      className="px-3 py-2 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#d8e8dc] transition-all disabled:opacity-50"
                    >
                      <RotateCcw size={13} className={isJourneyFetching ? "animate-spin" : ""} /> Refresh
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const blob = await journeyApi.exportCsv();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `admission_journey_${Date.now()}.csv`;
                          a.click();
                        } catch (err) {
                          alert("Failed to export journey CSV. Please try again.");
                        }
                      }}
                      className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800 transition-all"
                    >
                      <Download size={13} /> Export CSV
                    </button>
                  </div>
                </div>

                {isJourneyLoading ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-1/3 mb-6"></div>
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl w-full"></div>)}
                  </div>
                ) : isJourneyError ? (
                  <ErrorState
                    title="Unable to load your admission journey"
                    error={journeyError}
                    onRetry={() => refetchJourney()}
                    isRetrying={isJourneyFetching}
                  />
                ) : journeySteps.length === 0 ? (
                  <div className="text-center py-12 px-6 bg-white rounded-2xl border border-gray-100 shadow-xs">
                    <div className="w-14 h-14 bg-[#E8F3EC] text-[#4A7B5B] rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <MapIcon size={28} />
                    </div>
                    <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }} className="mb-1">
                      Your admission journey is being prepared
                    </h3>
                    <p className="text-gray-500 text-xs max-w-md mx-auto mb-5">
                      Your checkpoints will activate automatically as your profile, counselor guidance, and applications progress.
                    </p>
                    <button
                      onClick={() => refetchJourney()}
                      className="px-4 py-2 bg-[#4A7B5B] text-white text-xs font-bold rounded-xl hover:bg-[#3d674c] transition-all"
                    >
                      Refresh Journey
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Overall Progress Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Stage</span>
                          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
                            {journeyRes?.progress?.currentStage || "Profile Setup"}
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-[#4A7B5B]">{journeyProgress}%</span>
                          <span className="text-xs text-gray-400 block font-medium">Completed</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-[#4A7B5B] h-full rounded-full transition-all duration-1000"
                          style={{ width: `${journeyProgress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* REFER A STUDENT PROMINENT OVERVIEW HERO CARD */}
                    <div className="rounded-2xl p-5 bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border border-white/10">
                      <div className="space-y-1 max-w-md">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4A7B5B]/30 text-[#E8F3EC] text-[11px] font-semibold border border-[#4A7B5B]/40">
                          <Gift size={13} className="text-[#F0AE1A]" />
                          Swayam Admission Referral & Rewards
                        </div>
                        <h3 className="text-base font-bold text-white">Refer Students & Earn Up to ₹10,000</h3>
                        <p className="text-xs text-slate-300">
                          Invite peers to apply. Earn ₹4,000 for Tier 1 (4/3) and ₹10,000 for Tier 2 (8/6)! Referred students get 100% Free Counselling.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveSection("referrals")}
                        className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                      >
                        <Gift size={14} />
                        Refer Now & View Dashboard
                      </button>
                    </div>

                    {/* Assigned Counselor Widget */}
                    {assignedCounselor ? (
                      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#4A7B5B] rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0">
                            {assignedCounselor.fullName?.charAt(0) || "C"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-[#4A7B5B]/30 text-[#A7F3D0] text-[10px] font-bold rounded-md">Assigned Counselor</span>
                              {journeyRes?.reviews?.counselorReview && (
                                <span className="flex items-center gap-0.5 px-2 py-0.5 bg-amber-400/20 text-[#F0AE1A] text-[10px] font-bold rounded-md">
                                  <Star size={10} className="fill-[#F0AE1A]" /> {journeyRes.reviews.counselorReview.rating}/5
                                </span>
                              )}
                            </div>
                            <h4 style={{ fontSize: "16px", fontWeight: 700 }} className="text-white mt-0.5">{assignedCounselor.fullName}</h4>
                            <p style={{ fontSize: "12px" }} className="text-slate-300">{assignedCounselor.designation} · {assignedCounselor.department}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {assignedCounselor.mobile && (
                            <a href={`tel:${assignedCounselor.mobile}`} className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5">
                              <Phone size={13} /> Call
                            </a>
                          )}
                          <Link to="/ai-counselor" className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                            <MessageSquare size={13} /> Chat
                          </Link>
                        </div>
                      </div>
                    ) : isCounselorRequestPending ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center shrink-0">
                            <Clock size={18} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#92400E" }} className="flex items-center gap-2">
                              Request Submitted — Pending Assignment
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                                In Review
                              </span>
                            </h4>
                            <p style={{ fontSize: "12px", color: "#B45309" }}>An admission advisor will be assigned to guide your application process.</p>
                          </div>
                        </div>
                        <button
                          disabled
                          className="px-3.5 py-2 bg-amber-200 text-amber-900 rounded-xl text-xs font-bold shrink-0 opacity-80 cursor-not-allowed"
                        >
                          Request Pending
                        </button>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
                            <User size={18} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#92400E" }}>No Counselor Assigned Yet</h4>
                            <p style={{ fontSize: "12px", color: "#B45309" }}>Get a dedicated admission advisor to guide your college selection.</p>
                          </div>
                        </div>
                        <button
                          onClick={handleRequestCounselor}
                          disabled={isRequestingCounselor}
                          className="px-3.5 py-2 bg-[#92400E] hover:bg-[#78350F] text-white rounded-xl text-xs font-bold shrink-0 disabled:opacity-50"
                        >
                          {isRequestingCounselor ? "Submitting..." : "Request Counselor"}
                        </button>
                      </div>
                    )}

                    {/* Admission Checkpoints Grid */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
                      <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }} className="mb-4">Admission Checkpoints</h3>
                      <div className="relative border-l-2 border-slate-100 ml-4 space-y-6 pb-2">
                        {journeySteps.length === 0 ? (
                          <div className="text-center py-6 text-gray-400 text-sm">No checkpoints generated yet.</div>
                        ) : (
                          journeySteps.map((step: any, i: number) => {
                            const isCompleted = step.completed || step.status === "COMPLETED";
                            const isCurrent = step.status === "IN_PROGRESS";
                            const stepTitle = step.title || step.label || "Admission Checkpoint";
                            const stepDesc = step.description || (isCompleted ? "Step completed successfully." : "Pending completion.");
                            const displayDate = isCompleted && step.date && step.date !== "Pending" && step.date !== "Not available"
                              ? `Completed on: ${step.date}`
                              : "Pending";

                            const isCounselorReviewStep = step.id === "COUNSELOR_REVIEW";
                            const isCollegeReviewStep = step.id === "COLLEGE_REVIEW";
                            const submittedCounselorReview = journeyRes?.reviews?.counselorReview;
                            const submittedCollegeReview = journeyRes?.reviews?.collegeReview;
                            const canReviewCounselor = journeyRes?.reviewEligibility?.counselorReviewEligible || isCurrent;
                            const canReviewCollege = journeyRes?.reviewEligibility?.collegeReviewEligible || isCurrent;

                            return (
                              <div key={step.id || `step_${i}`} className={`relative pl-7 ${isCompleted ? "opacity-100" : isCurrent ? "opacity-100" : "opacity-60"}`}>
                                <div className={`absolute -left-[10px] top-1 w-4 h-4 rounded-full flex items-center justify-center border-2 ${
                                  isCompleted ? "border-[#4A7B5B] bg-[#4A7B5B]" : isCurrent ? "border-[#F0AE1A] bg-[#F0AE1A]" : "border-gray-200 bg-white"
                                }`}>
                                  {isCompleted ? <CheckCircle2 size={10} className="text-white" /> : <CircleDot size={8} className={isCurrent ? "text-white" : "text-gray-300"} />}
                                </div>
                                <div className="bg-[#F8FAFC] rounded-xl p-4 border border-gray-100">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <h4 className="text-sm font-bold text-gray-900">{stepTitle}</h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isCompleted ? "bg-[#E8F3EC] text-[#4A7B5B]" : isCurrent ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                                    }`}>
                                      {isCompleted ? "COMPLETED" : isCurrent ? "IN_PROGRESS" : "PENDING"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">{stepDesc}</p>
                                  <span className={`text-[11px] mt-2 block font-medium ${isCompleted ? "text-[#4A7B5B]" : "text-gray-400"}`}>
                                    {displayDate}
                                  </span>

                                  {/* COUNSELOR REVIEW INTERACTIVE CARD */}
                                  {isCounselorReviewStep && (
                                    submittedCounselorReview ? (
                                      <div className="mt-3 pt-3 border-t border-slate-200/60">
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <div className="flex items-center">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Star
                                                key={star}
                                                size={14}
                                                className={star <= submittedCounselorReview.rating ? "text-[#F0AE1A] fill-[#F0AE1A]" : "text-gray-300"}
                                              />
                                            ))}
                                          </div>
                                          <span className="text-xs font-bold text-slate-700">{submittedCounselorReview.rating}/5 Stars</span>
                                          <span className="text-[10px] bg-[#E8F3EC] text-[#4A7B5B] font-bold px-2 py-0.5 rounded-full ml-auto">SUBMITTED</span>
                                        </div>
                                        {submittedCounselorReview.comment && (
                                          <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-100 mt-1.5">
                                            "{submittedCounselorReview.comment}"
                                          </p>
                                        )}
                                      </div>
                                    ) : canReviewCounselor ? (
                                      <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2.5">
                                        <p className="text-xs font-medium text-slate-700">How was your experience with your counselor?</p>
                                        <div className="flex items-center gap-1">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                              key={star}
                                              type="button"
                                              onClick={() => setCounselorRating(star)}
                                              className="p-1 hover:scale-110 transition-transform focus:outline-none"
                                            >
                                              <Star
                                                size={18}
                                                className={star <= counselorRating ? "text-[#F0AE1A] fill-[#F0AE1A]" : "text-gray-300"}
                                              />
                                            </button>
                                          ))}
                                          <span className="text-xs font-semibold text-slate-500 ml-1.5">{counselorRating} of 5 Stars</span>
                                        </div>
                                        <textarea
                                          value={counselorComment}
                                          onChange={(e) => setCounselorComment(e.target.value)}
                                          placeholder="Optional: Share feedback about your counselor..."
                                          rows={2}
                                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A7B5B] resize-none"
                                        />
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-[11px] text-slate-400">Optional · Does not block admission</span>
                                          <button
                                            type="button"
                                            disabled={isSubmittingCounselorReview}
                                            onClick={submitCounselorReview}
                                            className="px-3.5 py-1.5 bg-[#4A7B5B] hover:bg-[#3d674c] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                          >
                                            {isSubmittingCounselorReview ? "Submitting..." : "Submit Review"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : null
                                  )}

                                  {/* COLLEGE REVIEW INTERACTIVE CARD */}
                                  {isCollegeReviewStep && (
                                    submittedCollegeReview ? (
                                      <div className="mt-3 pt-3 border-t border-slate-200/60">
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <div className="flex items-center">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Star
                                                key={star}
                                                size={14}
                                                className={star <= submittedCollegeReview.rating ? "text-[#F0AE1A] fill-[#F0AE1A]" : "text-gray-300"}
                                              />
                                            ))}
                                          </div>
                                          <span className="text-xs font-bold text-slate-700">{submittedCollegeReview.rating}/5 Stars</span>
                                          <span className="text-[10px] bg-[#E8F3EC] text-[#4A7B5B] font-bold px-2 py-0.5 rounded-full ml-auto">SUBMITTED</span>
                                        </div>
                                        {submittedCollegeReview.comment && (
                                          <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-100 mt-1.5">
                                            "{submittedCollegeReview.comment}"
                                          </p>
                                        )}
                                      </div>
                                    ) : canReviewCollege ? (
                                      <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2.5">
                                        <p className="text-xs font-medium text-slate-700">How was your college admission experience?</p>
                                        <div className="flex items-center gap-1">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                              key={star}
                                              type="button"
                                              onClick={() => setCollegeRating(star)}
                                              className="p-1 hover:scale-110 transition-transform focus:outline-none"
                                            >
                                              <Star
                                                size={18}
                                                className={star <= collegeRating ? "text-[#F0AE1A] fill-[#F0AE1A]" : "text-gray-300"}
                                              />
                                            </button>
                                          ))}
                                          <span className="text-xs font-semibold text-slate-500 ml-1.5">{collegeRating} of 5 Stars</span>
                                        </div>
                                        <textarea
                                          value={collegeComment}
                                          onChange={(e) => setCollegeComment(e.target.value)}
                                          placeholder="Optional: Share feedback about your college admission experience..."
                                          rows={2}
                                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A7B5B] resize-none"
                                        />
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-[11px] text-slate-400">Optional · Does not block journey</span>
                                          <button
                                            type="button"
                                            disabled={isSubmittingCollegeReview}
                                            onClick={submitCollegeReview}
                                            className="px-3.5 py-1.5 bg-[#4A7B5B] hover:bg-[#3d674c] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                          >
                                            {isSubmittingCollegeReview ? "Submitting..." : "Submit Review"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : null
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>


                    {/* MY APPLICATIONS & APPLICATION-SPECIFIC JOURNEYS */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>My Applications ({journeyRes?.applications?.length || 0})</h3>
                          <p className="text-xs text-slate-500">Each application tracks its own independent admission journey.</p>
                        </div>
                      </div>

                      {!journeyRes?.applications?.length ? (
                        <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                          You have not submitted any college applications yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {journeyRes.applications.map((app: any) => (
                            <div key={app.applicationId} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="text-[10px] font-mono text-slate-400">{app.applicationNumber || app.applicationId}</span>
                                  <h4 className="font-bold text-sm text-slate-900">{app.college?.name || app.formData?.preferences?.preferredCollege || "Open / Pending Counselor Guidance"}</h4>
                                  <p className="text-xs text-slate-600">
                                    {app.course?.name || "Degree Program"} • <span className="font-semibold text-[#4A7B5B]">{app.branch?.code || app.branch?.name || "General"}</span>
                                  </p>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                                  {app.status}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-200/50">
                                <div>
                                  <span className="text-slate-500">Payment: </span>
                                  <span className={`font-semibold ${app.paymentStatus === 'SUCCESS' || app.paymentStatus === 'COMPLETED' ? 'text-green-600' : 'text-amber-600'}`}>
                                    {app.paymentStatus}
                                  </span>
                                </div>
                                <button
                                  onClick={() => setSelectedStudentAppJourney(app)}
                                  className="px-3 py-1.5 rounded-xl bg-[#E8F3EC] text-[#4A7B5B] font-bold text-xs hover:bg-[#4A7B5B] hover:text-white transition-all"
                                >
                                  View Journey →
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Application Journey Modal */}
                    {selectedStudentAppJourney && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                        <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                          <div className="p-6 bg-[#F8FAFC] border-b border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-mono text-slate-400">{selectedStudentAppJourney.applicationNumber || selectedStudentAppJourney.applicationId}</span>
                              <h3 className="text-lg font-bold text-slate-900">{selectedStudentAppJourney.college?.name || selectedStudentAppJourney.formData?.preferences?.preferredCollege || "Open / Pending Counselor Guidance"}</h3>
                              <p className="text-xs text-slate-600">{selectedStudentAppJourney.course?.name || "Degree Program"} • {selectedStudentAppJourney.branch?.code || selectedStudentAppJourney.branch?.name || "General"}</p>
                            </div>
                            <button onClick={() => setSelectedStudentAppJourney(null)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500">
                              <X size={18} />
                            </button>
                          </div>

                          <div className="p-6 overflow-y-auto space-y-6">
                            <div className="p-4 rounded-2xl bg-[#E8F3EC] border border-[#BBF7D0] flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-[#4A7B5B] font-bold uppercase tracking-wider">Application Journey Status</span>
                                <div className="text-base font-extrabold text-slate-900">{selectedStudentAppJourney.status}</div>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-extrabold text-[#4A7B5B]">{selectedStudentAppJourney.progress}%</span>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Application Checkpoints</h4>
                              {selectedStudentAppJourney.checkpoints.map((step: any) => (
                                <div key={step.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start gap-3">
                                  {step.completed ? (
                                    <CheckCircle2 size={18} className="text-[#4A7B5B] shrink-0 mt-0.5" />
                                  ) : (
                                    <CircleDot size={18} className="text-slate-300 shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                                      <span>{step.title} {step.isOptional && <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>}</span>
                                      <span className="text-[10px] text-slate-400 font-normal">{step.date}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Live Chronological Timeline */}
                    {journeyTimeline.length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
                        <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }} className="mb-4">Activity & Audit Timeline</h3>
                        <div className="space-y-3">
                          {journeyTimeline.map((evt: any, idx: number) => (
                            <div key={evt.id || `evt_${idx}`} className="flex items-start gap-3.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-[#4A7B5B]">
                                <Clock size={15} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h5 className="text-xs font-bold text-gray-900 truncate">{evt.title}</h5>
                                  <span className="text-[10px] text-gray-400 font-medium shrink-0">{evt.timestamp && evt.timestamp !== "Not available" ? new Date(evt.timestamp).toLocaleString() : "Not available"}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{evt.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SAVED COLLEGES */}
            {activeSection==="saved" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 style={{fontWeight:800,color:"#0F172A",fontSize:"20px"}}>Saved Colleges</h2>
                    <p style={{fontSize:"13px",color:"#94a3b8"}}>Institutions you have bookmarked for comparison and applications.</p>
                  </div>
                  <button
                    onClick={() => refetchShortlist()}
                    disabled={isShortlistFetching}
                    className="px-3 py-1.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#d8e8dc] disabled:opacity-50"
                  >
                    <RotateCcw size={12} className={isShortlistFetching ? "animate-spin" : ""} /> Refresh
                  </button>
                </div>
                {isShortlistLoading ? (
                  [1,2].map(i=><div key={i} className="animate-pulse h-24 bg-slate-100 rounded-2xl w-full"></div>)
                ) : isShortlistError ? (
                  <ErrorState
                    title="Unable to load saved colleges"
                    error={shortlistError}
                    onRetry={() => refetchShortlist()}
                    isRetrying={isShortlistFetching}
                  />
                ) : savedItems.length === 0 ? (
                  <div className="text-center p-8 bg-white rounded-2xl border border-gray-100">
                    <BookmarkCheck size={32} className="mx-auto text-gray-300 mb-3"/>
                    <p className="text-gray-500 text-sm">You haven't saved any colleges yet.</p>
                    <Link to="/colleges" className="mt-3 inline-block px-4 py-2 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold hover:bg-[#3d674c]">
                      Browse Colleges
                    </Link>
                  </div>
                ) : (
                  savedItems.map((item: any)=>(
                    <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all">
                      <ImageWithFallback src={item.college?.img} alt={item.college?.name} className="w-16 h-16 rounded-xl object-cover shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <div style={{fontSize:"15px",fontWeight:700,color:"#0F172A"}}>{item.college?.name}</div>
                        <div className="flex items-center gap-1 text-gray-400 mb-1">
                          <MapPin size={11}/><span style={{fontSize:"11px"}}>{item.college?.city}, {item.college?.state}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span style={{fontSize:"12px",fontWeight:600,color:"#4A7B5B"}}>₹{item.college?.totalFees?.toLocaleString()}/yr</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Link to={`/colleges/${item.collegeId}`} className="px-3 py-1.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-lg text-xs font-semibold mr-2">View</Link>
                        <Link to="/apply-now" className="px-3 py-1.5 bg-[#4A7B5B] text-white rounded-lg" style={{fontSize:"11px",fontWeight:600}}>Apply</Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* APPLICATIONS */}
            {activeSection==="applications" && (
              selectedWorkflowAppId ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedWorkflowAppId(null)}
                    className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-1"
                  >
                    ← Back to Applications List
                  </button>
                  <ApplicationWorkflowForm
                    applicationId={selectedWorkflowAppId}
                    onBack={() => setSelectedWorkflowAppId(null)}
                    onSubmitted={() => {
                      setSelectedWorkflowAppId(null);
                      refetchApps();
                    }}
                  />
                </div>
              ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 style={{fontWeight:800,color:"#0F172A",fontSize:"20px"}}>My Applications</h2>
                    <p style={{fontSize:"13px",color:"#94a3b8"}}>View live status, counselor guidance, timeline & document requirements.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { refetchApps(); refetchQuota(); }}
                      disabled={isAppsFetching}
                      className="px-3 py-2 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#d8e8dc] transition-all disabled:opacity-50"
                    >
                      <RotateCcw size={12} className={isAppsFetching ? "animate-spin" : ""} /> Refresh
                    </button>
                    <Link
                      to="/apply-now"
                      className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      + Apply to New College
                    </Link>
                  </div>
                </div>

                {/* 3 Free Applications Rule Quota Banner */}
                {quotaRes?.data && (
                  <div className="bg-gradient-to-r from-[#E8F3EC] to-emerald-50 border border-[#4A7B5B]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#4A7B5B] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                        {quotaRes.data.freeRemaining}/3
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {quotaRes.data.isNextFree
                              ? "First 3 Applications: 100% Free"
                              : "3 Free Applications Used"}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              quotaRes.data.isNextFree
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-amber-100 text-amber-800 border border-amber-300"
                            }`}
                          >
                            {quotaRes.data.isNextFree
                              ? `${quotaRes.data.freeRemaining} Free Remaining`
                              : "Application Fee Required"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {quotaRes.data.isNextFree
                            ? `Every registered student gets 3 free application submissions. You have submitted ${quotaRes.data.submittedCount} of 3 free applications.`
                            : `You have utilized your 3 free application submissions. Subsequent applications require an application fee of ₹${quotaRes.data.applicationFeeAmount.toLocaleString()} (promo coupons accepted).`}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/apply-now"
                      className="shrink-0 px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      {quotaRes.data.isNextFree ? "Submit Free Application" : "Apply to College"}
                    </Link>
                  </div>
                )}

                {/* Filter & Search Toolbar */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by college, course or application ID..."
                      value={appSearchQuery}
                      onChange={(e) => setAppSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#4A7B5B]"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    <select
                      value={appStatusFilter}
                      onChange={(e) => setAppStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:border-[#4A7B5B]"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="DRAFT">Draft</option>
                      <option value="NEW">New</option>
                      <option value="READY_TO_SUBMIT">Ready to Submit</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="DOCUMENTS_VERIFIED">Documents Verified</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="PAYMENT_PENDING">Payment Pending</option>
                      <option value="ADMISSION_CONFIRMED">Admission Confirmed</option>
                    </select>
                    <select
                      value={appSortBy}
                      onChange={(e) => setAppSortBy(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:border-[#4A7B5B]"
                    >
                      <option value="latest">Sort by: Latest</option>
                      <option value="oldest">Sort by: Oldest</option>
                      <option value="college">Sort by: College Name</option>
                    </select>
                  </div>
                </div>

                {isAppsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse h-40 bg-slate-100 rounded-2xl w-full"></div>
                    ))}
                  </div>
                ) : isAppsError ? (
                  <ErrorState
                    title="Unable to load applications"
                    error={appsError}
                    onRetry={() => refetchApps()}
                    isRetrying={isAppsFetching}
                  />
                ) : myApplications.length === 0 ? (
                  <div className="text-center py-12 px-6 bg-white rounded-2xl border border-gray-100 shadow-xs">
                    <div className="w-16 h-16 bg-[#E8F3EC] text-[#4A7B5B] rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText size={32} />
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }} className="mb-1">
                      You haven't submitted any applications yet
                    </h3>
                    <p className="text-gray-500 text-xs max-w-md mx-auto mb-6">
                      Explore top partner colleges, compare courses, and submit your admission application in 1-click.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <Link
                        to="/colleges"
                        className="px-4 py-2.5 bg-[#4A7B5B] text-white text-xs font-bold rounded-xl hover:bg-[#3d674c] transition-all"
                      >
                        Browse Colleges
                      </Link>
                      <Link
                        to="/apply-now"
                        className="px-4 py-2.5 bg-[#0F172A] text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all"
                      >
                        Start New Application
                      </Link>
                      <Link
                        to="/ai-counselor"
                        className="px-4 py-2.5 bg-[#E8F3EC] text-[#4A7B5B] text-xs font-bold rounded-xl hover:bg-[#d8e8dc] transition-all flex items-center gap-1.5"
                      >
                        <Bot size={14} /> Talk to AI Counselor
                      </Link>
                    </div>
                  </div>
                ) : (() => {
                  const filtered = myApplications
                    .filter((app: any) => {
                      const matchSearch =
                        !appSearchQuery ||
                        app.college?.name?.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
                        app.course?.name?.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
                        app.applicationId?.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
                        app.id?.toLowerCase().includes(appSearchQuery.toLowerCase());
                      const matchStatus = appStatusFilter === "ALL" || app.status === appStatusFilter;
                      return matchSearch && matchStatus;
                    })
                    .sort((a: any, b: any) => {
                      if (appSortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                      if (appSortBy === "college") return (a.college?.name || "").localeCompare(b.college?.name || "");
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                        <p className="text-gray-500 text-xs">No applications match your search filters.</p>
                        <button
                          onClick={() => { setAppSearchQuery(""); setAppStatusFilter("ALL"); }}
                          className="mt-2 text-xs font-bold text-[#4A7B5B] underline"
                        >
                          Clear Filters
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-5">
                      {filtered.map((app: any) => {
                        const appNo = app.applicationNumber || app.applicationId || `APP-${app.id?.slice(0, 8).toUpperCase()}`;
                        const submittedDate = app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";
                        const hasDocsVerified = app.documentsVerified || (app.documents && app.documents.some((d: any) => d.status === "VERIFIED"));
                        const hasPaidFee = app.paymentStatus === "COMPLETED" || app.paymentStatus === "SUCCESS";
                        const counselorObj = app.counselor;
                        const collegeName = app.college?.name || app.formData?.preferences?.preferredCollege || app.formData?.preferences?.preferredCollegeText || "College Preference: Not Selected";
                        const applicantSnapshotName = app.formData?.personalInfo?.fullName;
                        const locationStr = app.college?.city && app.college?.state 
                          ? `${app.college.city}, ${app.college.state}`
                          : app.formData?.preferences?.preferredCity
                          ? `Preferred City: ${app.formData.preferences.preferredCity}`
                          : "Pan-India / Flexible";

                        return (
                          <div key={app.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4 hover:border-slate-300 transition-all">
                            {/* Header Section */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                              <div className="flex items-center gap-4">
                                {app.college?.logo ? (
                                  <img src={app.college.logo} alt={collegeName} className="w-12 h-12 rounded-xl object-contain border border-slate-100 shrink-0" />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-[#E8F3EC] text-[#4A7B5B] font-black text-lg flex items-center justify-center shrink-0">
                                    {collegeName.charAt(0) || "C"}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>{collegeName}</h3>
                                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">{appNo}</span>
                                  </div>
                                  <p style={{ fontSize: "12px", color: "#64748B" }} className="mt-0.5">
                                    {app.course?.name || "Degree Program"} {app.course?.level ? `(${app.course.level})` : ""} · {locationStr}
                                    {applicantSnapshotName && (
                                      <span className="ml-2 text-slate-500 font-medium">· Applicant: {applicantSnapshotName}</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className="px-3 py-1 rounded-full text-white font-bold text-xs shadow-2xs"
                                  style={{ backgroundColor: getStatusColor(app.status) }}
                                >
                                  {app.status}
                                </span>
                              </div>
                            </div>

                            {/* Details & Badges Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs">
                              <div>
                                <span className="text-gray-400 block text-[10px] font-medium uppercase">Applied Date</span>
                                <span className="font-bold text-slate-800">{submittedDate}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[10px] font-medium uppercase">Annual Fee</span>
                                <span className="font-bold text-[#4A7B5B]">
                                  {app.course?.totalFees ? `₹${app.course.totalFees.toLocaleString()}/yr` : "As per university"}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[10px] font-medium uppercase">Documents Status</span>
                                <span className={`font-bold ${hasDocsVerified ? "text-emerald-600" : "text-amber-600"}`}>
                                  {hasDocsVerified ? "✓ Verified" : "Pending Review"}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[10px] font-medium uppercase">Payment Status</span>
                                <span className={`font-bold ${hasPaidFee ? "text-emerald-600" : "text-amber-600"}`}>
                                  {hasPaidFee ? "✓ Paid" : "Pending"}
                                </span>
                              </div>
                            </div>

                            {/* Counselor Subcard */}
                            {counselorObj && (
                              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-3.5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-[#4A7B5B] text-white flex items-center justify-center font-bold shrink-0 text-sm">
                                    {counselorObj.fullName?.charAt(0) || "C"}
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-[#A7F3D0] uppercase">Assigned Counselor</span>
                                    <h4 className="text-xs font-bold text-white">{counselorObj.fullName}</h4>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {counselorObj.mobile && (
                                    <a
                                      href={`tel:${counselorObj.mobile}`}
                                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                                    >
                                      <Phone size={12} /> Call
                                    </a>
                                  )}
                                  <Link
                                    to="/ai-counselor"
                                    className="px-3 py-1.5 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-lg text-xs font-bold flex items-center gap-1"
                                  >
                                    <MessageSquare size={12} /> Chat
                                  </Link>
                                </div>
                              </div>
                            )}

                            {/* Action Buttons Row */}
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                              <button
                                onClick={() => setSelectedWorkflowAppId(app.id)}
                                className="px-3.5 py-2 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold hover:bg-[#3d674c] flex items-center gap-1.5 transition-all shadow-xs"
                              >
                                <FileText size={13} />
                                {app.status === 'DRAFT' || app.status === 'NEW' || app.status === 'READY_TO_SUBMIT' || app.status === 'CORRECTION_REQUIRED'
                                  ? 'Continue Application'
                                  : 'View Form Details'}
                              </button>
                              <button
                                onClick={() => setSelectedTimelineApp(app)}
                                className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 transition-all"
                              >
                                <Clock size={13} /> Track Progress
                              </button>
                              <button
                                onClick={() => setActiveSection("docs")}
                                className="px-3 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all"
                              >
                                Upload Documents
                              </button>
                              {!hasPaidFee && (
                                <button
                                  onClick={() => setActiveSection("payments")}
                                  className="px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all"
                                >
                                  Pay Application Fee
                                </button>
                              )}
                              {(app.status === "APPROVED" || app.status === "COLLEGE_APPROVED" || app.status === "ADMISSION_CONFIRMED") && (
                                <button
                                  onClick={() => alert(`Downloading Offer Letter for ${appNo}...`)}
                                  className="px-3.5 py-2 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#d8e8dc] transition-all"
                                >
                                  <Download size={13} /> Download Offer Letter
                                </button>
                              )}
                              {(app.status === "ADMISSION_CONFIRMED" || app.status === "ADMISSION_COMPLETED" || app.status === "STUDENT_ENROLLED") && (
                                <button
                                  onClick={() => {
                                    setReportingModalApp(app);
                                    setReportingForm({
                                      reportingDate: app.reporting?.reportingDate
                                        ? new Date(app.reporting.reportingDate).toISOString().split("T")[0]
                                        : new Date().toISOString().split("T")[0],
                                      collegeCampus: app.reporting?.collegeCampus || "Main Campus",
                                      collegeReferenceNumber: app.reporting?.collegeReferenceNumber || "",
                                      proofDocumentUrl: app.reporting?.proofDocumentUrl || "",
                                      studentRemarks: app.reporting?.studentRemarks || "",
                                    });
                                  }}
                                  className="px-3.5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-800 transition-all shadow-2xs"
                                >
                                  <GraduationCap size={13} />{" "}
                                  {app.status === "STUDENT_ENROLLED"
                                    ? "Enrolled 🎓 View Details"
                                    : "Campus Reporting 🏛️"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Campus Reporting Modal */}
                {reportingModalApp && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#4A7B5B]">College Campus Reporting</span>
                          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>
                            {reportingModalApp.college?.name || "College Admission"}
                          </h3>
                        </div>
                        <button
                          onClick={() => setReportingModalApp(null)}
                          className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold flex items-center justify-center text-sm"
                        >
                          ✕
                        </button>
                      </div>

                      {reportingModalApp.status === "STUDENT_ENROLLED" ? (
                        <div className="p-5 bg-[#E8F3EC] border border-[#4A7B5B]/20 rounded-2xl text-center space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#4A7B5B] text-white flex items-center justify-center mx-auto shadow-sm">
                            <GraduationCap size={24} />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-slate-900">Congratulations! You are Officially Enrolled! 🎓</h4>
                            <p className="text-xs text-slate-600 mt-1">
                              Your admission journey for {reportingModalApp.course?.name} at {reportingModalApp.college?.name} is complete.
                            </p>
                          </div>
                          {reportingModalApp.enrollment && (
                            <div className="p-3 bg-white rounded-xl border border-[#4A7B5B]/30 inline-block font-mono font-bold text-sm text-[#4A7B5B]">
                              Enrollment No: {reportingModalApp.enrollment.enrollmentNumber}
                            </div>
                          )}
                        </div>
                      ) : (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setIsSubmittingReporting(true);
                            try {
                              await reportingEnrollmentApi.submitReporting(reportingModalApp.id, reportingForm);
                              queryClient.invalidateQueries({ queryKey: ["applications"] });
                              queryClient.invalidateQueries({ queryKey: ["journey"] });
                              alert("Campus reporting submitted successfully! Verification is in progress.");
                              setReportingModalApp(null);
                            } catch (err: any) {
                              alert(err.response?.data?.message || "Failed to submit reporting details.");
                            } finally {
                              setIsSubmittingReporting(false);
                            }
                          }}
                          className="space-y-4 text-xs"
                        >
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                            <div className="flex justify-between font-medium text-slate-600">
                              <span>Program:</span>
                              <span className="font-bold text-slate-900">{reportingModalApp.course?.name}</span>
                            </div>
                            <div className="flex justify-between font-medium text-slate-600">
                              <span>Admission Status:</span>
                              <span className="font-bold text-emerald-700">✓ {reportingModalApp.status}</span>
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Campus Reporting Date *</label>
                            <input
                              type="date"
                              required
                              value={reportingForm.reportingDate}
                              onChange={(e) => setReportingForm({ ...reportingForm, reportingDate: e.target.value })}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">College Campus / Department *</label>
                            <input
                              type="text"
                              required
                              value={reportingForm.collegeCampus}
                              onChange={(e) => setReportingForm({ ...reportingForm, collegeCampus: e.target.value })}
                              placeholder="e.g. Main Campus, Department of CSE"
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">College Reference / Roll / Acknowledgement No.</label>
                            <input
                              type="text"
                              value={reportingForm.collegeReferenceNumber}
                              onChange={(e) => setReportingForm({ ...reportingForm, collegeReferenceNumber: e.target.value })}
                              placeholder="e.g. GKU/ADM/2026/089"
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Reporting Slip / Document URL or Photo</label>
                            <input
                              type="url"
                              value={reportingForm.proofDocumentUrl}
                              onChange={(e) => setReportingForm({ ...reportingForm, proofDocumentUrl: e.target.value })}
                              placeholder="https://... (or link to uploaded document)"
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Remarks (Optional)</label>
                            <textarea
                              rows={2}
                              value={reportingForm.studentRemarks}
                              onChange={(e) => setReportingForm({ ...reportingForm, studentRemarks: e.target.value })}
                              placeholder="Any additional information regarding your reporting..."
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setReportingModalApp(null)}
                              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmittingReporting}
                              className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl font-bold shadow-xs"
                            >
                              {isSubmittingReporting ? "Submitting..." : "Submit Reporting Proof"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline Modal Drawer */}
                {selectedTimelineApp && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-in fade-in">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#4A7B5B]">Application Audit Log</span>
                          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>
                            {selectedTimelineApp.college?.name || "College Application"}
                          </h3>
                        </div>
                        <button
                          onClick={() => setSelectedTimelineApp(null)}
                          className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold flex items-center justify-center text-sm"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(!selectedTimelineApp.timeline || selectedTimelineApp.timeline.length === 0) ? (
                          <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500">
                            Application submitted successfully on {new Date(selectedTimelineApp.createdAt).toLocaleString()}. Under review by admission board.
                          </div>
                        ) : (
                          selectedTimelineApp.timeline.map((item: any, idx: number) => (
                            <div key={item.id || idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900">{item.action || "STATUS_CHANGE"}</span>
                                <span className="text-[10px] text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</span>
                              </div>
                              <p className="text-xs text-slate-600">{item.remarks || `Status transitioned to ${item.newStatus || "UPDATED"}`}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => setSelectedTimelineApp(null)}
                          className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
                        >
                          Close Timeline
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* AI RECOMMENDATIONS */}
            {activeSection==="ai" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 style={{fontWeight:800,color:"#0F172A",fontSize:"20px"}}>AI Recommendations</h2>
                    <p style={{fontSize:"13px",color:"#94a3b8"}}>Colleges shortlisted based on your profile and preferences</p>
                  </div>
                  <button
                    onClick={() => refetchRecs()}
                    disabled={isRecsFetching}
                    className="px-3 py-1.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#d8e8dc] disabled:opacity-50"
                  >
                    <RotateCcw size={12} className={isRecsFetching ? "animate-spin" : ""} /> Refresh
                  </button>
                </div>
                {isRecsLoading ? (
                  [1,2].map(i=><div key={i} className="animate-pulse h-32 bg-slate-100 rounded-2xl w-full"></div>)
                ) : isRecsError ? (
                  <ErrorState
                    title="Unable to load AI recommendations"
                    error={recsError}
                    onRetry={() => refetchRecs()}
                    isRetrying={isRecsFetching}
                  />
                ) : aiRecs.length === 0 ? (
                  <div className="text-center p-8 bg-white rounded-2xl border border-gray-100">
                    <Bot size={32} className="mx-auto text-gray-300 mb-3"/>
                    <p className="text-gray-500 text-sm">No recommendations available at the moment. Interact more to get matches.</p>
                  </div>
                ) : (
                  aiRecs.map((rec: any)=>(
                    <div key={rec.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-[#E8F3EC] rounded-2xl flex items-center justify-center shrink-0">
                          <GraduationCap size={22} className="text-[#4A7B5B]"/>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 style={{fontSize:"15px",fontWeight:700,color:"#0F172A"}}>{rec.name}</h3>
                            {rec.matchScore && <span className="px-2 py-0.5 bg-[#4A7B5B] text-white rounded-full" style={{fontSize:"10px",fontWeight:700}}>{rec.matchScore}% Match</span>}
                          </div>
                          <p style={{fontSize:"12px",color:"#94a3b8"}} className="mt-1">{rec.city}, {rec.state} · ₹{rec.totalFees?.toLocaleString() || "N/A"}</p>
                          <p style={{fontSize:"12px",color:"#4B5563",lineHeight:1.5}} className="mt-2">{rec.matchReason || "Recommended based on your profile."}</p>
                          <div className="flex gap-2 mt-3">
                            <Link to={`/colleges/${rec.id}`} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs hover:bg-gray-50">View College</Link>
                            <Link to="/apply-now" className="px-4 py-2 bg-[#4A7B5B] text-white rounded-xl text-xs hover:bg-[#3d6b4d]">Apply Now</Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* MY PROFILE (STUDENT 360° PORTAL VIEW & PREFERENCES) */}
            {activeSection === "profile" && (
              <div className="space-y-6">
                {/* Profile Header Banner */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center font-bold text-2xl shrink-0 shadow-xs">
                        {(studentUser?.fullName || user?.fullName || "S").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-xl font-bold text-slate-900">{studentUser?.fullName || user?.fullName || "Student Profile"}</h2>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/20">
                            Active Student
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span>Joined Swayam Admission: {studentUser?.createdAt ? new Date(studentUser.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "2026"}</span>
                          <span>•</span>
                          <span>{studentUser?.email || user?.email}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      {/* Official Unique Immutable Identity Badges */}
                      <div className="flex flex-wrap items-center gap-3 bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official Student ID</span>
                          <span className="font-mono text-xs font-bold text-[#4A7B5B] block mt-0.5">
                            {studentUser?.studentId || (user as any)?.studentId || "SWY-STU-PENDING"}
                          </span>
                        </div>
                      </div>

                      {/* Edit Profile Button */}
                      <button
                        onClick={() => setIsEditProfileOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-[#4A7B5B] text-white text-xs font-semibold hover:bg-[#3D664B] transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Edit size={14} /> Edit Profile
                      </button>
                    </div>
                  </div>

                  {/* Profile Completion Bar */}
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-slate-700">Profile Completion Status</span>
                      <span className="font-bold text-[#4A7B5B]">{completionRate}% Completed</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#4A7B5B] h-full rounded-full transition-all duration-500"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 1. Personal Information (Strict 10 ERP Fields) */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <User size={16} className="text-[#4A7B5B]" /> Personal Information
                      </h3>
                      <button
                        onClick={() => setIsEditProfileOpen(true)}
                        className="text-xs text-[#4A7B5B] font-semibold hover:underline flex items-center gap-1"
                      >
                        <Edit size={12} /> Edit
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">1. Full Name</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">{studentUser?.fullName || "Not provided"}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">2. Date of Birth</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {studentUser?.profile?.dob
                            ? new Date(studentUser.profile.dob).toLocaleDateString("en-IN")
                            : studentUser?.dateOfBirth
                            ? new Date(studentUser.dateOfBirth).toLocaleDateString("en-IN")
                            : "Not provided"}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">3. Gender</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">{studentUser?.profile?.gender || studentUser?.gender || "Not provided"}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">4. Category</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">{studentUser?.profile?.category || "General"}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">5. Country</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">{studentUser?.country || studentUser?.profile?.nationality || "India"}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">6. Mobile Number</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">{studentUser?.mobile || "Not provided"}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">7. Email Address</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block truncate">{studentUser?.email || "Not provided"}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">8. State</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">{studentUser?.profile?.state || studentUser?.state || "Not provided"}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">9. District</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">{studentUser?.profile?.district || "Not provided"}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">10. PIN Code</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">{studentUser?.profile?.pincode || studentUser?.pincode || "Not provided"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Academic Background */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <GraduationCap size={16} className="text-[#4A7B5B]" /> Academic Qualifications
                      </h3>
                      <button
                        onClick={() => setIsEditProfileOpen(true)}
                        className="text-xs text-[#4A7B5B] font-semibold hover:underline flex items-center gap-1"
                      >
                        <Edit size={12} /> Edit
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">10th Board</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">{studentUser?.profile?.tenthBoard || "CBSE"}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">10th Percentage</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">{studentUser?.profile?.tenthMarks ? `${studentUser.profile.tenthMarks}%` : "Not provided"}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">12th Board & Stream</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {studentUser?.profile?.twelfthBoard || "CBSE"} ({studentUser?.profile?.twelfthStream || "Science"})
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">12th Percentage</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">{studentUser?.profile?.twelfthMarks ? `${studentUser.profile.twelfthMarks}%` : "Not provided"}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                        <span className="text-slate-400 text-[10px] block">Graduation (if applicable)</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {studentUser?.profile?.graduationCourse || "Undergraduate Candidate"} {studentUser?.profile?.graduationPercentage ? `(${studentUser.profile.graduationPercentage}%)` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. YOUR PREFERENCES SECTION (EDUCATION & EXAM PREFERENCES) */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Star size={18} className="text-[#4A7B5B]" /> YOUR PREFERENCES & TARGET GOALS
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Configure your education, college, and exam preferences to receive AI-powered recommendations and priority admission counseling.
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E8F3EC] text-[#4A7B5B]">
                        Live ERP Synced
                      </span>
                    </div>
                    {(!eduPreferencesForm.course && !eduPreferencesForm.educationLevel) && (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-600 shrink-0" />
                        <span>No preferences added yet. Please configure your education and admission preferences below.</span>
                      </div>
                    )}
                  </div>

                  {/* Section A: Education Preferences Form */}
                  <form onSubmit={handleSaveEducationPreferences} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <GraduationCap size={14} className="text-[#4A7B5B]" /> Section A: Education Preferences
                      </h4>
                      <button
                        type="submit"
                        disabled={savePreferencesMutation.isPending}
                        className="px-3 py-1.5 rounded-lg bg-[#4A7B5B] text-white text-xs font-semibold hover:bg-[#3D664B] transition flex items-center gap-1 shadow-xs"
                      >
                        {savePreferencesMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                        Save Education Preferences
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Education Level</label>
                        <select
                          value={eduPreferencesForm.educationLevel}
                          onChange={(e) => setEduPreferencesForm({ ...eduPreferencesForm, educationLevel: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                        >
                          <option value="Undergraduate">Undergraduate (UG)</option>
                          <option value="Postgraduate">Postgraduate (PG)</option>
                          <option value="Diploma">Diploma / Polytechnic</option>
                          <option value="Doctorate">Doctorate (Ph.D.)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Admission Year</label>
                        <select
                          value={eduPreferencesForm.admissionYear}
                          onChange={(e) => setEduPreferencesForm({ ...eduPreferencesForm, admissionYear: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                        >
                          <option value="2026">2026 Academic Session</option>
                          <option value="2027">2027 Academic Session</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Study Mode</label>
                        <select
                          value={eduPreferencesForm.studyMode}
                          onChange={(e) => setEduPreferencesForm({ ...eduPreferencesForm, studyMode: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                        >
                          <option value="Full Time">Full Time (On-Campus)</option>
                          <option value="Part Time">Part Time</option>
                          <option value="Distance">Distance Education</option>
                          <option value="Online">Online Degree</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Course</label>
                        <input
                          type="text"
                          value={eduPreferencesForm.course}
                          onChange={(e) => setEduPreferencesForm({ ...eduPreferencesForm, course: e.target.value })}
                          placeholder="e.g. B.Tech Computer Science, MBA"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                        >
                        </input>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Specialization / Branch</label>
                        <input
                          type="text"
                          value={eduPreferencesForm.specialization}
                          onChange={(e) => setEduPreferencesForm({ ...eduPreferencesForm, specialization: e.target.value })}
                          placeholder="e.g. AI & ML, Finance, Robotics"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Preferred State</label>
                        <select
                          value={eduPreferencesForm.preferredState}
                          onChange={(e) => setEduPreferencesForm({ ...eduPreferencesForm, preferredState: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                        >
                          <option value="">Any State</option>
                          {statesList.map((st) => (
                            <option key={st.id} value={st.name}>{st.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Preferred City</label>
                        <input
                          type="text"
                          value={eduPreferencesForm.preferredCity}
                          onChange={(e) => setEduPreferencesForm({ ...eduPreferencesForm, preferredCity: e.target.value })}
                          placeholder="e.g. Bangalore, Delhi, Pune"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Min Budget (₹ / Year)</label>
                        <input
                          type="number"
                          value={eduPreferencesForm.budgetMin}
                          onChange={(e) => setEduPreferencesForm({ ...eduPreferencesForm, budgetMin: e.target.value })}
                          placeholder="e.g. 100000"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Max Budget (₹ / Year)</label>
                        <input
                          type="number"
                          value={eduPreferencesForm.budgetMax}
                          onChange={(e) => setEduPreferencesForm({ ...eduPreferencesForm, budgetMax: e.target.value })}
                          placeholder="e.g. 500000"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2 md:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Preferred Colleges (Comma Separated)</label>
                        <input
                          type="text"
                          value={eduPreferencesForm.collegePreferences}
                          onChange={(e) => setEduPreferencesForm({ ...eduPreferencesForm, collegePreferences: e.target.value })}
                          placeholder="e.g. RV College of Engineering, BMS College, MS Ramaiah"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                        />
                      </div>
                    </div>
                  </form>

                  {/* Section B: Exam Preferences */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <Award size={14} className="text-[#4A7B5B]" /> Section B: Exam Preferences
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingExamId(null);
                          setExamForm({ examName: "JEE Main", score: "", rank: "", year: "2026", status: "APPEARED" });
                          setIsAddExamOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/20 text-xs font-semibold hover:bg-[#d5eadc] transition flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Exam
                      </button>
                    </div>

                    {(!rawPreferences.exams || rawPreferences.exams.length === 0) ? (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                        No exam preferences added yet. Click &quot;Add Exam&quot; to record your entrance exams (JEE, NEET, CUET, CAT, etc.).
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {rawPreferences.exams.map((ex: any) => (
                          <div key={ex.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">{ex.examName}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                                  {ex.year || "2026"}
                                </span>
                              </div>
                              <div className="mt-2 space-y-1 text-xs text-slate-600">
                                <div>Score: <strong className="text-slate-800">{ex.score || "Appeared"}</strong></div>
                                {ex.rank && <div>Rank: <strong className="text-slate-800">{ex.rank}</strong></div>}
                                <div className="text-[10px] text-slate-400">Status: {ex.status}</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingExamId(ex.id);
                                  setExamForm({
                                    examName: ex.examName || "",
                                    score: ex.score || "",
                                    rank: ex.rank || "",
                                    year: ex.year || "2026",
                                    status: ex.status || "APPEARED",
                                  });
                                  setIsAddExamOpen(true);
                                }}
                                className="text-[11px] text-[#4A7B5B] hover:underline font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveExam(ex.id)}
                                className="text-[11px] text-red-600 hover:underline font-semibold"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section C: Education Background */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <BookOpen size={14} className="text-[#4A7B5B]" /> Section C: Education Background
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsAddEduBgOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/20 text-xs font-semibold hover:bg-[#d5eadc] transition flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Qualification
                      </button>
                    </div>

                    {(!rawPreferences.educationBackground || rawPreferences.educationBackground.length === 0) ? (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                        No previous qualifications recorded. Click &quot;Add Qualification&quot; to add your 10th, 12th, or diploma credentials.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {rawPreferences.educationBackground.map((item: any) => (
                          <div key={item.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{item.level} Standard</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 font-semibold">{item.board || "CBSE"}</span>
                              </div>
                              <div className="text-xs text-slate-700 mt-1 font-medium">{item.schoolCollege}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">Passing Year: {item.passingYear} • Marks: {item.percentage}%</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveEduBg(item.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Delete qualification"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section D: Work Experience */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <Building2 size={14} className="text-[#4A7B5B]" /> Section D: Work Experience & Internships
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsAddWorkExpOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/20 text-xs font-semibold hover:bg-[#d5eadc] transition flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Experience
                      </button>
                    </div>

                    {(!rawPreferences.workExperience || rawPreferences.workExperience.length === 0) ? (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                        No work experience or internships added yet. Optional for undergraduate students.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {rawPreferences.workExperience.map((item: any) => (
                          <div key={item.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-start">
                            <div>
                              <div className="font-bold text-xs text-slate-900">{item.role}</div>
                              <div className="text-xs text-slate-700 font-medium">{item.company}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">Duration: {item.duration}</div>
                              {item.description && <div className="text-[11px] text-slate-600 mt-1 italic">&quot;{item.description}&quot;</div>}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveWorkExp(item.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Delete experience"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* EDIT PROFILE MODAL */}
                {isEditProfileOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900">Edit Student Profile</h2>
                          <p className="text-xs text-slate-500 mt-0.5">Update your personal and academic information</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditProfileOpen(false)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={handleSaveProfile} className="p-6 overflow-y-auto flex-1 space-y-5">
                        {/* Immutable Identity Notice */}
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Official Student ID (Immutable)</span>
                            <span className="font-mono font-bold text-[#4A7B5B]">{studentUser?.studentId || (user as any)?.studentId || "SWY-STU-PENDING"}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-[#4A7B5B] font-semibold border border-emerald-200">
                            ERP System Locked
                          </span>
                        </div>

                        {/* Personal Information Fields */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Personal Information</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">1. Full Name *</label>
                              <input
                                type="text"
                                required
                                value={profileForm.fullName}
                                onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">2. Date of Birth *</label>
                              <input
                                type="date"
                                value={profileForm.dob}
                                onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                              />
                            </div>

                            {/* Gender: Single field only (no duplicates) */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">3. Gender *</label>
                              <select
                                value={profileForm.gender}
                                onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">4. Category *</label>
                              <select
                                value={profileForm.category}
                                onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                              >
                                <option value="General">General</option>
                                <option value="OBC">OBC</option>
                                <option value="SC">SC</option>
                                <option value="ST">ST</option>
                                <option value="EWS">EWS</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">5. Country *</label>
                              <input
                                type="text"
                                value={profileForm.country}
                                onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">6. Mobile Number</label>
                              <input
                                type="text"
                                disabled
                                value={profileForm.mobile}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs cursor-not-allowed outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">7. Email Address</label>
                              <input
                                type="email"
                                disabled
                                value={profileForm.email}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs cursor-not-allowed outline-none"
                              />
                            </div>

                            {/* 8. Dynamic State Dropdown */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">8. State *</label>
                              <select
                                value={profileForm.state}
                                onChange={(e) => handleProfileStateChange(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                              >
                                <option value="">Select State</option>
                                {statesList.map((st) => (
                                  <option key={st.id} value={st.name}>{st.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* 9. Dynamic District Dropdown: Depends on State, resets if state changes */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                9. District {isDistrictsLoading && "(Loading...)"}
                              </label>
                              {districtsList.length > 0 ? (
                                <select
                                  value={profileForm.district}
                                  onChange={(e) => setProfileForm({ ...profileForm, district: e.target.value })}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                                >
                                  <option value="">Select District</option>
                                  {districtsList.map((d) => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  placeholder={profileForm.state ? "Enter District Name" : "Select State first"}
                                  value={profileForm.district}
                                  onChange={(e) => setProfileForm({ ...profileForm, district: e.target.value })}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">10. PIN Code</label>
                              <input
                                type="text"
                                value={profileForm.pincode}
                                onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                                placeholder="6-digit PIN code"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Academic Qualifications Fields */}
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Academic Qualifications</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">10th Board</label>
                              <input
                                type="text"
                                value={profileForm.tenthBoard}
                                onChange={(e) => setProfileForm({ ...profileForm, tenthBoard: e.target.value })}
                                placeholder="e.g. CBSE, ICSE, State Board"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">10th Percentage (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={profileForm.tenthMarks}
                                onChange={(e) => setProfileForm({ ...profileForm, tenthMarks: e.target.value })}
                                placeholder="e.g. 88.5"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">12th Board</label>
                              <input
                                type="text"
                                value={profileForm.twelfthBoard}
                                onChange={(e) => setProfileForm({ ...profileForm, twelfthBoard: e.target.value })}
                                placeholder="e.g. CBSE, ISC, State Board"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">12th Percentage (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={profileForm.twelfthMarks}
                                onChange={(e) => setProfileForm({ ...profileForm, twelfthMarks: e.target.value })}
                                placeholder="e.g. 85.0"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => setIsEditProfileOpen(false)}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={updateProfileMutation.isPending}
                            className="px-5 py-2 rounded-xl bg-[#4A7B5B] text-white text-xs font-semibold hover:bg-[#3D664B] transition flex items-center gap-1.5 shadow-xs"
                          >
                            {updateProfileMutation.isPending && <RefreshCw size={12} className="animate-spin" />}
                            Save Profile
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* ADD/EDIT EXAM PREFERENCE MODAL */}
                {isAddExamOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-bold text-slate-900">
                          {editingExamId ? "Edit Exam Preference" : "Add Exam Preference"}
                        </h3>
                        <button type="button" onClick={() => setIsAddExamOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleSaveExam} className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Exam Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. JEE Main, NEET, CUET, CAT, GATE"
                            value={examForm.examName}
                            onChange={(e) => setExamForm({ ...examForm, examName: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Score / Percentile</label>
                          <input
                            type="text"
                            placeholder="e.g. 94.5 Percentile, 620 Marks"
                            value={examForm.score}
                            onChange={(e) => setExamForm({ ...examForm, score: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">All India Rank (AIR)</label>
                          <input
                            type="text"
                            placeholder="e.g. 14200"
                            value={examForm.rank}
                            onChange={(e) => setExamForm({ ...examForm, rank: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Exam Year</label>
                          <select
                            value={examForm.year}
                            onChange={(e) => setExamForm({ ...examForm, year: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                          >
                            <option value="2026">2026</option>
                            <option value="2025">2025</option>
                            <option value="2024">2024</option>
                            <option value="2027">2027 (Upcoming)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status</label>
                          <select
                            value={examForm.status}
                            onChange={(e) => setExamForm({ ...examForm, status: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                          >
                            <option value="APPEARED">Appeared / Qualified</option>
                            <option value="AWAITING_RESULT">Awaiting Result</option>
                            <option value="PLANNING_TO_APPEAR">Planning to Appear</option>
                          </select>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddExamOpen(false)}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savePreferencesMutation.isPending}
                            className="px-4 py-1.5 rounded-xl bg-[#4A7B5B] text-white font-semibold hover:bg-[#3D664B]"
                          >
                            Save Exam
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* ADD EDUCATION BACKGROUND MODAL */}
                {isAddEduBgOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-bold text-slate-900">Add Academic Qualification</h3>
                        <button type="button" onClick={() => setIsAddEduBgOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleSaveEduBg} className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Level *</label>
                          <select
                            value={eduBgForm.level}
                            onChange={(e) => setEduBgForm({ ...eduBgForm, level: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                          >
                            <option value="10th">10th Standard</option>
                            <option value="12th">12th Standard</option>
                            <option value="Diploma">Diploma</option>
                            <option value="Graduation">Graduation (Bachelor&apos;s)</option>
                            <option value="Post-Graduation">Post-Graduation (Master&apos;s)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">School / College / Institute *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. St. Xavier&apos;s College, Delhi Public School"
                            value={eduBgForm.schoolCollege}
                            onChange={(e) => setEduBgForm({ ...eduBgForm, schoolCollege: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Board / University</label>
                          <input
                            type="text"
                            placeholder="e.g. CBSE, ICSE, Mumbai University"
                            value={eduBgForm.board}
                            onChange={(e) => setEduBgForm({ ...eduBgForm, board: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Passing Year</label>
                            <input
                              type="number"
                              placeholder="e.g. 2024"
                              value={eduBgForm.passingYear}
                              onChange={(e) => setEduBgForm({ ...eduBgForm, passingYear: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Percentage / CGPA</label>
                            <input
                              type="text"
                              placeholder="e.g. 88.5% or 8.9 CGPA"
                              value={eduBgForm.percentage}
                              onChange={(e) => setEduBgForm({ ...eduBgForm, percentage: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                            />
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddEduBgOpen(false)}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savePreferencesMutation.isPending}
                            className="px-4 py-1.5 rounded-xl bg-[#4A7B5B] text-white font-semibold hover:bg-[#3D664B]"
                          >
                            Save Qualification
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* ADD WORK EXPERIENCE MODAL */}
                {isAddWorkExpOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-bold text-slate-900">Add Work Experience / Internship</h3>
                        <button type="button" onClick={() => setIsAddWorkExpOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleSaveWorkExp} className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Company / Organization *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Infosys, TCS, Tech Startup"
                            value={workExpForm.company}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, company: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Role / Designation *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Software Engineering Intern"
                            value={workExpForm.role}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, role: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Duration</label>
                          <input
                            type="text"
                            placeholder="e.g. June 2025 - August 2025 (3 months)"
                            value={workExpForm.duration}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, duration: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description / Projects</label>
                          <textarea
                            rows={2}
                            placeholder="Briefly describe your tasks and accomplishments"
                            value={workExpForm.description}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, description: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] outline-none"
                          />
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddWorkExpOpen(false)}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savePreferencesMutation.isPending}
                            className="px-4 py-1.5 rounded-xl bg-[#4A7B5B] text-white font-semibold hover:bg-[#3D664B]"
                          >
                            Save Experience
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAYMENTS & FEES */}
            {activeSection === "payments" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 style={{ fontWeight: 800, color: "#0F172A", fontSize: "20px" }}>Payments & Admission Fee Center</h2>
                    <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                      Manage tuition, semester & hostel fees, view official college bank accounts, submit payment proofs, and download tax-compliant receipts.
                    </p>
                  </div>
                  {copyToast && (
                    <div className="px-3 py-1.5 bg-[#E8F3EC] text-[#4A7B5B] text-xs font-bold rounded-xl flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle2 size={14} /> {copyToast}
                    </div>
                  )}
                </div>

                {/* Summary KPI Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Program Fee</span>
                      <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A" }} className="mt-1">
                        ₹{(paymentSummaryData.totalFees || 0).toLocaleString()}
                      </h3>
                      <span className="text-[10px] text-gray-400">Fixed university structure</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <CreditCard size={22} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Paid Amount</span>
                      <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#059669" }} className="mt-1">
                        ₹{(paymentSummaryData.totalPaid || 0).toLocaleString()}
                      </h3>
                      <span className="text-[10px] text-emerald-600 font-medium">✓ Verified & Cleared</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <CheckCircle2 size={22} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Outstanding Due</span>
                      <h3 style={{ fontSize: "20px", fontWeight: 800, color: (paymentSummaryData.outstandingDue || 0) > 0 ? "#D97706" : "#059669" }} className="mt-1">
                        ₹{(paymentSummaryData.outstandingDue || 0).toLocaleString()}
                      </h3>
                      <span className="text-[10px] text-amber-600 font-medium">
                        {(paymentSummaryData.outstandingDue || 0) > 0 ? "Pending payment" : "No pending balance"}
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Clock size={22} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Scholarship & Discounts</span>
                      <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#7C3AED" }} className="mt-1">
                        ₹{((paymentSummaryData.scholarshipAmount || 0) + (paymentSummaryData.discountAmount || 0)).toLocaleString()}
                      </h3>
                      <span className="text-[10px] text-purple-600 font-medium">Applied to balance</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <Award size={22} />
                    </div>
                  </div>
                </div>

                {/* Mandatory Admin Payment Routing & Active Payment Requests */}
                <div className="space-y-6">
                  {/* Official Payment Requests Section */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A7F3D0] bg-[#4A7B5B]/30 px-2.5 py-1 rounded-full border border-[#4A7B5B]/40">
                            Admin Controlled Payment Routing
                          </span>
                        </div>
                        <h3 style={{ fontSize: "18px", fontWeight: 800 }} className="text-white mt-1 flex items-center gap-2">
                          <Receipt size={20} className="text-emerald-400" /> Official Fee Payment Requests
                        </h3>
                        <p className="text-xs text-slate-300">
                          Select an official payment request generated by college administration to complete your payment.
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30">
                        {myRequests.length} Active Request(s)
                      </span>
                    </div>

                    {myRequests.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {myRequests.map((req: any) => {
                          const isSelected = proofForm.paymentId === req.id;
                          const isExpired = req.isExpired || req.status === 'EXPIRED';
                          const isPaid = req.status === 'PAID';

                          return (
                            <div
                              key={req.id}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-400"
                                  : isExpired
                                  ? "bg-red-950/20 border-red-800/40 opacity-70"
                                  : isPaid
                                  ? "bg-emerald-900/20 border-emerald-800/40"
                                  : "bg-slate-800/80 border-slate-700 hover:border-slate-500"
                              }`}
                              onClick={() => {
                                if (!isExpired && !isPaid) {
                                  setProofForm((prev) => ({
                                    ...prev,
                                    paymentId: req.id,
                                    paidAmount: String(req.dueAmount || req.requestedAmount),
                                  }));
                                }
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wide">
                                    {req.requestCode} • {req.feeHead || "FEE"}
                                  </span>
                                  <h4 className="text-xs font-bold text-white mt-0.5">{req.college?.name || "Target College"}</h4>
                                  <p className="text-[11px] text-slate-300">
                                    Installment {req.installmentNumber} of {req.totalInstallments}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-extrabold text-emerald-300">
                                    ₹{Number(req.finalPayableAmount || req.requestedAmount).toLocaleString("en-IN")}
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                      isPaid
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : isExpired
                                        ? 'bg-red-500/20 text-red-300'
                                        : 'bg-amber-500/20 text-amber-300'
                                    }`}
                                  >
                                    {req.status}
                                  </span>
                                </div>
                              </div>

                              {req.totalAmount > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-slate-700/60 text-[10px] space-y-1 bg-slate-900/40 p-2.5 rounded-xl border border-slate-700/40">
                                  <div className="flex justify-between text-slate-300">
                                    <span>Gross Total Fee:</span>
                                    <span className="font-semibold text-white">₹{Number(req.totalAmount).toLocaleString("en-IN")}</span>
                                  </div>
                                  {req.discountAmount > 0 && (
                                    <div className="flex justify-between text-blue-300">
                                      <span>Discount Concession:</span>
                                      <span className="font-semibold">- ₹{Number(req.discountAmount).toLocaleString("en-IN")}</span>
                                    </div>
                                  )}
                                  {req.scholarshipAmount > 0 && (
                                    <div className="flex justify-between text-purple-300">
                                      <span>Scholarship Applied:</span>
                                      <span className="font-semibold">- ₹{Number(req.scholarshipAmount).toLocaleString("en-IN")}</span>
                                    </div>
                                  )}
                                  {req.lateFeeAmount > 0 && (
                                    <div className="flex justify-between text-amber-300">
                                      <span>Late Fee Component:</span>
                                      <span className="font-semibold">+ ₹{Number(req.lateFeeAmount).toLocaleString("en-IN")}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-extrabold text-emerald-400 pt-1 border-t border-slate-700/50">
                                    <span>Final Payable Amount:</span>
                                    <span>₹{Number(req.finalPayableAmount || req.requestedAmount).toLocaleString("en-IN")}</span>
                                  </div>
                                </div>
                              )}

                              {req.collegeBank && (
                                <div className="mt-2 text-[10px] text-slate-300 flex items-center gap-1.5">
                                  <Building2 size={12} className="text-emerald-400" /> Bank Account: <span className="font-semibold text-white">{req.collegeBank.bankName}</span> ({req.collegeBank.accountCategory || "General"})
                                </div>
                              )}
                              {req.dueDate && (
                                <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-slate-400 flex items-center justify-between">
                                  <span>Due Date: {new Date(req.dueDate).toLocaleDateString()}</span>
                                  {isSelected ? (
                                    <span className="text-emerald-400 font-bold">✓ Selected for Payment</span>
                                  ) : !isExpired && !isPaid ? (
                                    <span className="text-emerald-400 font-semibold underline">Click to Select Request →</span>
                                  ) : (
                                    <span className="text-slate-500">{isExpired ? "Expired" : "Settled"}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700 text-center space-y-2">
                        <AlertCircle className="mx-auto text-amber-400" size={32} />
                        <h4 className="text-sm font-bold text-white">No Active Fee Payment Request</h4>
                        <p className="text-xs text-slate-300 max-w-md mx-auto">
                          College administration or your counselor has not issued any active fee payment request yet. Payment proof upload requires an official payment request.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Official Bank Account Details Card */}
                  {collegeBankAccountsList.length > 0 ? (
                    collegeBankAccountsList.map((bank: any) => (
                      <div key={bank.id} className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-6 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white p-2 flex items-center justify-center shrink-0 shadow-md">
                              <Building2 className="text-[#4A7B5B]" size={28} />
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A7F3D0] bg-[#4A7B5B]/30 px-2.5 py-1 rounded-full border border-[#4A7B5B]/40">
                                Assigned Official Bank Account ({bank.category || "General"})
                              </span>
                              <h3 style={{ fontSize: "18px", fontWeight: 800 }} className="text-white mt-1">
                                {bank.bankName || "Partner Bank"}
                              </h3>
                              <p className="text-xs text-slate-300">Direct Bank Transfer & Official QR Payment</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                              <CheckCircle2 size={13} /> Admin Verified Bank Account
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Bank Details */}
                          <div className="space-y-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-medium">Account Holder Name</span>
                              <div className="text-sm font-bold text-white mt-0.5">{bank.accountHolder || "College Admission Account"}</div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-medium">Account Number</span>
                                <div className="text-sm font-bold font-mono text-emerald-300 tracking-wider mt-0.5">
                                  {bank.accountNumber || "000000000000"}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(bank.accountNumber);
                                  setCopyToast("Account Number copied!");
                                  setTimeout(() => setCopyToast(""), 3000);
                                }}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-all"
                              >
                                Copy
                              </button>
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-medium">IFSC Code</span>
                                <div className="text-sm font-bold font-mono text-white mt-0.5">{bank.ifscCode || "IFSC0001234"}</div>
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(bank.ifscCode);
                                  setCopyToast("IFSC Code copied!");
                                  setTimeout(() => setCopyToast(""), 3000);
                                }}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-all"
                              >
                                Copy
                              </button>
                            </div>

                            {bank.upiId && (
                              <div className="flex items-center justify-between pt-2 border-t border-slate-700/40">
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-medium">Official UPI ID</span>
                                  <div className="text-sm font-bold text-amber-300 mt-0.5">{bank.upiId}</div>
                                </div>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(bank.upiId);
                                    setCopyToast("UPI ID copied!");
                                    setTimeout(() => setCopyToast(""), 3000);
                                  }}
                                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  Copy UPI
                                </button>
                              </div>
                            )}
                          </div>

                          {/* QR Code & Instructions */}
                          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 flex flex-col sm:flex-row items-center gap-4">
                            {bank.qrCodeUrl ? (
                              <div className="text-center shrink-0">
                                <img
                                  src={bank.qrCodeUrl}
                                  alt="Official College QR Code"
                                  className="w-32 h-32 rounded-xl object-contain bg-white p-2 border border-slate-600 shadow-md"
                                />
                                <a
                                  href={bank.qrCodeUrl}
                                  download="College_Official_QR.png"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-[#A7F3D0] hover:underline mt-2 font-bold"
                                >
                                  <Download size={12} /> Save QR Code
                                </a>
                              </div>
                            ) : (
                              <div className="w-32 h-32 rounded-xl bg-slate-700/60 border border-dashed border-slate-500 flex flex-col items-center justify-center text-center p-3 shrink-0">
                                <CreditCard size={28} className="text-slate-400 mb-1" />
                                <span className="text-[10px] text-slate-300 font-medium">Use Bank NEFT/RTGS/UPI</span>
                              </div>
                            )}
                            <div className="flex-1 space-y-2">
                              <span className="text-[10px] text-[#A7F3D0] font-extrabold uppercase tracking-wider block">
                                Payment Instructions
                              </span>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {bank.instructions ||
                                  "1. Transfer payable fee amount via NEFT/RTGS/IMPS/UPI to the bank account above.\n2. Keep your UTR/Reference number and payment screenshot ready.\n3. Upload the payment proof below for immediate verification."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : null}

                  {/* Upload Payment Proof Form Card */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>Submit Payment Proof for Verification</h3>
                        <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                          Upload payment receipt screenshot against your active Payment Request. Amount is locked by Admin.
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100 flex items-center gap-1">
                        <Lock size={12} /> Read-Only Amount Locked
                      </span>
                    </div>

                    {/* Promotional Coupon Apply Widget */}
                    <CouponApplyWidget
                      transactionAmount={Number(proofForm.paidAmount) || 5000}
                      applicableScope="TUITION_FEE"
                      appliedCoupon={appliedCoupon}
                      onCouponApplied={(res) => setAppliedCoupon(res)}
                      onCouponRemoved={() => setAppliedCoupon(null)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                          <span>Paid Amount (₹) <span className="text-red-500">*</span></span>
                          <span className="text-[10px] text-amber-600 font-bold">🔒 Locked to Request</span>
                        </label>
                        <input
                          type="number"
                          readOnly
                          disabled
                          placeholder="Select a Payment Request above"
                          value={proofForm.paidAmount}
                          className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          UTR / Bank Transaction Reference No. <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 423910582910 (12-digit UTR)"
                          value={proofForm.utrNumber}
                          onChange={(e) => setProofForm((prev) => ({ ...prev, utrNumber: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4A7B5B] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Proof Screenshot / Receipt Document URL <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="https://... (or image URL)"
                          value={proofForm.proofDocument}
                          onChange={(e) => setProofForm((prev) => ({ ...prev, proofDocument: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4A7B5B]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Additional Remarks (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Paid via Bank NEFT / NetBanking"
                          value={proofForm.remarks}
                          onChange={(e) => setProofForm((prev) => ({ ...prev, remarks: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4A7B5B]"
                        />
                      </div>
                    </div>

                    {/* Mandatory Terms & Conditions Checkbox */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acceptedTerms}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            setAcceptedTerms(checked);
                            if (checked && proofForm.paymentId) {
                              try {
                                await paymentsApi.acceptTerms({
                                  paymentRequestId: proofForm.paymentId,
                                  acceptedTerms: true,
                                });
                              } catch (err) {
                                console.error("Terms audit error:", err);
                              }
                            }
                          }}
                          className="mt-0.5 w-4 h-4 text-[#4A7B5B] focus:ring-[#4A7B5B] rounded border-slate-300"
                        />
                        <span className="text-xs text-slate-700 leading-relaxed font-medium">
                          I have read and agree to the <strong>Terms & Conditions</strong>, <strong>Refund Policy</strong>, <strong>Fee Policy</strong>, <strong>Privacy Policy</strong>, and understand that all payments are subject to verification by Swayam Admission and/or the respective college.
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-[11px] text-gray-500">
                        ✓ Proof verified by assigned reviewer within 2-4 hours.
                      </span>
                      <button
                        onClick={async () => {
                          if (!acceptedTerms) {
                            alert("Please explicitly accept the Terms & Conditions before submitting payment proof.");
                            return;
                          }
                          if (!proofForm.paymentId) {
                            alert("Please select an active Payment Request from above before submitting proof.");
                            return;
                          }
                          if (!proofForm.proofDocument && !proofForm.utrNumber) {
                            alert("Please provide either proof document screenshot or UTR number.");
                            return;
                          }
                          setIsUploadingProof(true);
                          try {
                            await paymentsApi.submitManualProof({
                              paymentRequestId: proofForm.paymentId,
                              proofDocument: proofForm.proofDocument || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400",
                              utrNumber: proofForm.utrNumber,
                              paidAmount: Number(proofForm.paidAmount),
                              remarks: proofForm.remarks,
                            });

                            queryClient.invalidateQueries({ queryKey: ["payment_summary"] });
                            queryClient.invalidateQueries({ queryKey: ["my_payments"] });
                            queryClient.invalidateQueries({ queryKey: ["my_payment_requests"] });
                            queryClient.invalidateQueries({ queryKey: ["journey"] });

                            alert("Payment proof uploaded successfully! Verification in progress.");
                            setProofForm({ paymentId: "", utrNumber: "", paidAmount: "", proofDocument: "", remarks: "" });
                          } catch (err: any) {
                            console.error("Proof upload error:", err);
                            alert(err.response?.data?.message || "Failed to submit payment proof. Please ensure a valid payment request is selected.");
                          } finally {
                            setIsUploadingProof(false);
                          }
                        }}
                        disabled={isUploadingProof || !proofForm.paymentId || !acceptedTerms}
                        className="px-6 py-2.5 bg-[#4A7B5B] hover:bg-[#3d674c] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Upload size={14} /> {isUploadingProof ? "Submitting Proof..." : "Submit Payment Proof"}
                      </button>
                    </div>
                  </div>

                  {/* Verification Progress Stepper */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Payment Governance Stepper</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
                      {[
                        { num: 1, title: "Request Issued", desc: "Admin Creates Payment Request" },
                        { num: 2, title: "Proof Uploaded", desc: "Student Submits UTR & Receipt" },
                        { num: 3, title: "Multi-Role Audit", desc: "Counselor / Accounts Review" },
                        { num: 4, title: "Receipt & Offer Unlocked", desc: "Verified & Fully Settled" },
                      ].map((st, idx) => (
                        <div key={st.num} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#4A7B5B] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {idx < 2 ? "✓" : st.num}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{st.title}</div>
                            <div className="text-[10px] text-slate-400">{st.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FEE BREAKDOWN TABLE */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>Course Fee Structure Breakdown</h3>
                      <p style={{ fontSize: "12px", color: "#94a3b8" }}>Itemized list of all tuition, hostel, exam, and registration charges.</p>
                    </div>
                    <span className="text-xs font-bold text-slate-400">Currency: INR (₹)</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="py-3 px-2">Fee Head / Component</th>
                          <th className="py-3 px-2 text-right">Total Amount</th>
                          <th className="py-3 px-2 text-right">Paid Amount</th>
                          <th className="py-3 px-2 text-right">Due Amount</th>
                          <th className="py-3 px-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                        {paymentBreakdown.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-2 font-bold text-slate-900">{item.label}</td>
                            <td className="py-3.5 px-2 text-right font-mono font-bold">₹{item.amount?.toLocaleString()}</td>
                            <td className="py-3.5 px-2 text-right font-mono text-emerald-600 font-bold">₹{item.paid?.toLocaleString()}</td>
                            <td className="py-3.5 px-2 text-right font-mono text-amber-600 font-bold">₹{item.due?.toLocaleString()}</td>
                            <td className="py-3.5 px-2 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  item.status === "PAID"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : item.status === "DUE" || item.status === "PENDING"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TRANSACTION HISTORY & RECEIPTS TABLE */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>Payment Audit & Transaction History</h3>
                      <p style={{ fontSize: "12px", color: "#94a3b8" }}>Download official receipts and tax-compliant invoices.</p>
                    </div>
                  </div>

                  {allPaymentsList.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No payment transactions recorded yet. Submit your first payment above.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allPaymentsList.map((p: any) => (
                        <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">{p.receiptNumber || p.transactionId || `TXN-${p.id?.slice(0, 8)}`}</span>
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold text-[10px]">{p.paymentType}</span>
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                p.status === "COMPLETED" || p.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" : p.status === "UNDER_VERIFICATION" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                              }`}>
                                {p.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {p.college?.name || "Admission Account"} · {p.paymentMode || "GATEWAY"} ({p.gateway || p.paymentMethod}) · {p.paidAt || p.createdAt ? new Date(p.paidAt || p.createdAt).toLocaleString() : ""}
                            </div>
                            {p.utrNumber && (
                              <div className="text-[10px] text-emerald-700 font-mono font-medium">
                                UTR Ref: {p.utrNumber}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-sm font-bold text-slate-900 font-mono">₹{(p.paidAmount || p.amount).toLocaleString()}</div>
                              <div className="text-[10px] text-slate-400">{p.currency || "INR"}</div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedReceipt(p)}
                                className="px-3 py-1.5 bg-[#E8F3EC] hover:bg-[#d8e8dc] text-[#4A7B5B] text-xs font-bold rounded-xl flex items-center gap-1"
                              >
                                <Download size={12} /> Receipt
                              </button>
                              <button
                                onClick={() => setSelectedInvoice(p)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                              >
                                <FileText size={12} /> Invoice
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* RECEIPT / INVOICE MODAL DRAWER */}
                {(selectedReceipt || selectedInvoice) && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-in fade-in">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#4A7B5B]">
                            {selectedReceipt ? "Official Fee Receipt" : "Tax Invoice"}
                          </span>
                          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>
                            {selectedReceipt?.receiptNumber || selectedInvoice?.invoiceNumber || "DOCUMENT"}
                          </h3>
                        </div>
                        <button
                          onClick={() => { setSelectedReceipt(null); setSelectedInvoice(null); }}
                          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-200"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 font-mono text-xs text-slate-800">
                        <div className="flex justify-between border-b border-slate-200 pb-3">
                          <div>
                            <div className="font-black text-sm text-[#4A7B5B]">SWAYAM ADMISSIONS</div>
                            <div className="text-[10px] text-slate-500 font-sans">Higher Education Gateway</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">Date: {new Date().toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-500">Status: {selectedReceipt?.status || selectedInvoice?.status}</div>
                          </div>
                        </div>

                        <div className="space-y-1 font-sans text-xs">
                          <div><strong>Student:</strong> {studentName} ({user?.email || "Student Account"})</div>
                          <div><strong>College:</strong> {selectedReceipt?.college?.name || selectedInvoice?.college?.name || "Partner Institute"}</div>
                          <div><strong>Transaction ID:</strong> {selectedReceipt?.transactionId || selectedInvoice?.transactionId || "TXN-VERIFIED"}</div>
                          {selectedReceipt?.utrNumber && <div><strong>UTR Reference:</strong> {selectedReceipt.utrNumber}</div>}
                          <div><strong>Payment Method:</strong> {selectedReceipt?.paymentMethod || selectedInvoice?.paymentMethod || "Direct Transfer"}</div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                          <span>TOTAL AMOUNT PAID:</span>
                          <span className="text-emerald-700">₹{(selectedReceipt?.paidAmount || selectedReceipt?.amount || selectedInvoice?.amount || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => window.print()}
                          className="flex-1 py-2.5 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold hover:bg-[#3d674c] flex items-center justify-center gap-1.5"
                        >
                          <Download size={14} /> Print / Save PDF
                        </button>
                        <button
                          onClick={() => { setSelectedReceipt(null); setSelectedInvoice(null); }}
                          className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeSection==="docs" && (
              <div className="space-y-6">
                {/* Header & Dynamic Metrics */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                  <div>
                    <h2 style={{fontWeight:800,color:"#0F172A",fontSize:"20px"}}>Student Document Vault & Compliance Center</h2>
                    <p style={{fontSize:"13px",color:"#94a3b8"}}>Authoritative single source of truth for all admission applications and compliance checks.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        refetchDocs();
                        refetchChecklist();
                      }}
                      disabled={isDocsFetching || isChecklistFetching}
                      className="px-3 py-2 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#d8e8dc] transition-all disabled:opacity-50"
                    >
                      <RotateCcw size={13} className={isDocsFetching || isChecklistFetching ? "animate-spin" : ""} /> Refresh Status
                    </button>
                  </div>
                </div>

                {/* Metrics Cards */}
                {(() => {
                  const summary = (dynamicChecklistRes?.data as any)?.data?.summary || (dynamicChecklistRes?.data as any)?.summary;
                  const totalReq = summary?.totalRequired ?? REQUIRED_DOCS.filter(d => d.required).length;
                  const uploaded = summary?.uploadedCount ?? myDocuments.length;
                  const verified = summary?.verifiedCount ?? myDocuments.filter((d: any) => d.status === "VERIFIED" || d.status === "APPROVED").length;
                  const pending = summary?.pendingReviewCount ?? myDocuments.filter((d: any) => d.status === "UPLOADED" || d.status === "UNDER_VERIFICATION").length;
                  const correction = summary?.correctionRequiredCount ?? myDocuments.filter((d: any) => d.status === "CORRECTION_REQUIRED" || d.status === "REJECTED").length;
                  const pct = summary?.completionPercentage ?? (totalReq > 0 ? Math.round((verified / totalReq) * 100) : 0);

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                        <div className="text-xs text-gray-500 font-semibold">Total Required</div>
                        <div className="text-2xl font-black text-slate-800 mt-1">{totalReq}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Mandatory for admission</div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                        <div className="text-xs text-emerald-600 font-semibold">Verified Compliant</div>
                        <div className="text-2xl font-black text-emerald-700 mt-1">{verified}</div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">{pct}% Verified</div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                        <div className="text-xs text-amber-600 font-semibold">Under Review</div>
                        <div className="text-2xl font-black text-amber-700 mt-1">{pending}</div>
                        <div className="text-[11px] text-amber-600 mt-0.5">Review in progress</div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                        <div className="text-xs text-rose-600 font-semibold">Action Required</div>
                        <div className="text-2xl font-black text-rose-700 mt-1">{correction}</div>
                        <div className="text-[11px] text-rose-600 mt-0.5">Need re-upload / correction</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Category Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[
                    { id: "ALL", label: "All Documents" },
                    { id: "IDENTITY", label: "Identity Proofs" },
                    { id: "ACADEMIC", label: "Academic Records" },
                    { id: "PERSONAL", label: "Personal / Photos" },
                    { id: "CERTIFICATE", label: "Certificates" },
                    { id: "MEDICAL", label: "Medical / Gap" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDocCategoryFilter(tab.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        docCategoryFilter === tab.id
                          ? "bg-[#4A7B5B] text-white shadow-xs"
                          : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {isDocsLoading || isChecklistLoading ? (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden p-6 space-y-4">
                    {[1,2,3,4].map(i=><div key={i} className="animate-pulse h-16 bg-slate-100 rounded-xl w-full"></div>)}
                  </div>
                ) : isDocsError ? (
                  <ErrorState
                    title="Unable to load documents"
                    error={docsError}
                    onRetry={() => { refetchDocs(); refetchChecklist(); }}
                    isRetrying={isDocsFetching}
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      {(() => {
                        const rawChecklist = (dynamicChecklistRes?.data as any)?.data?.checklist || (dynamicChecklistRes?.data as any)?.checklist;
                        const checklistItems = rawChecklist && rawChecklist.length > 0
                          ? rawChecklist
                          : REQUIRED_DOCS.map((d) => {
                              const uploaded = myDocuments.find((m: any) => m.type === d.id);
                              return {
                                type: d.id,
                                name: d.name,
                                category: d.category.toUpperCase(),
                                isRequired: d.required,
                                maxSizeMB: 5,
                                allowedMimes: ['image/jpeg', 'image/png', 'application/pdf'],
                                description: `${d.name} for verification`,
                                documentId: uploaded?.id,
                                fileName: uploaded?.fileName,
                                fileUrl: uploaded?.fileUrl,
                                status: (uploaded?.status || 'NOT_UPLOADED') as any,
                                rejectedReason: uploaded?.rejectedReason,
                                version: uploaded?.version || 1,
                                uploadedAt: uploaded?.uploadedAt,
                              };
                            });

                        const filtered = checklistItems.filter((item: any) => {
                          if (docCategoryFilter === "ALL") return true;
                          return (item.category || "").toUpperCase().includes(docCategoryFilter);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="p-8 text-center text-gray-500 text-sm">
                              No documents found in this category.
                            </div>
                          );
                        }

                        return filtered.map((docItem: any) => {
                          const isVerified = docItem.status === "VERIFIED" || docItem.status === "APPROVED" as any;
                          const isCorrection = docItem.status === "CORRECTION_REQUIRED" || docItem.status === "REJECTED";
                          const isPending = docItem.status === "UPLOADED" || docItem.status === "UNDER_VERIFICATION";
                          const isNotUploaded = docItem.status === "NOT_UPLOADED";

                          return (
                            <div key={docItem.type} className="p-4 hover:bg-slate-50/50 transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    isVerified
                                      ? "bg-emerald-100 text-emerald-700"
                                      : isCorrection
                                      ? "bg-rose-100 text-rose-700"
                                      : isPending
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-400"
                                  }`}>
                                    {isVerified ? (
                                      <CheckCircle2 size={18} />
                                    ) : isCorrection ? (
                                      <AlertCircle size={18} />
                                    ) : isPending ? (
                                      <Clock size={18} />
                                    ) : (
                                      <FileText size={18} />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span style={{fontSize:"14px",fontWeight:700,color:"#0F172A"}}>{docItem.name}</span>
                                      {docItem.isRequired && (
                                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md font-bold text-[10px]">
                                          Required
                                        </span>
                                      )}
                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-medium text-[10px]">
                                        {docItem.category}
                                      </span>
                                      {docItem.documentId && (
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
                                          v{docItem.version || 1}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                      {docItem.fileName ? (
                                        <>
                                          <span className="text-gray-600 font-medium">{docItem.fileName}</span>
                                          {docItem.uploadedAt && (
                                            <span>· {new Date(docItem.uploadedAt).toLocaleDateString()}</span>
                                          )}
                                        </>
                                      ) : (
                                        <span>Not uploaded yet · Max {docItem.maxSizeMB || 5}MB (PDF, JPG, PNG)</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Status Badge & Actions */}
                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                    isVerified
                                      ? "bg-emerald-100 text-emerald-800"
                                      : isCorrection
                                      ? "bg-rose-100 text-rose-800"
                                      : isPending
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-600"
                                  }`}>
                                    {docItem.status.replace(/_/g, ' ')}
                                  </span>

                                  {/* Version History Button */}
                                  {docItem.documentId && (
                                    <button
                                      onClick={() => setViewHistoryDocId(docItem.documentId!)}
                                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                      title="View Version Audit Log"
                                    >
                                      History
                                    </button>
                                  )}

                                  {docItem.fileUrl && (
                                    <a
                                      href={docItem.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-2 text-gray-500 hover:text-[#4A7B5B] hover:bg-[#E8F3EC] rounded-xl transition-colors"
                                      title="View / Download File"
                                    >
                                      <Download size={16} />
                                    </a>
                                  )}

                                  {/* Upload / Replace Action */}
                                  <label
                                    className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center border ${
                                      docItem.documentId
                                        ? isCorrection
                                          ? "bg-rose-600 text-white border-transparent hover:bg-rose-700 shadow-xs"
                                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                        : "bg-[#4A7B5B] text-white border-transparent hover:bg-[#3d6b4d]"
                                    }`}
                                  >
                                    {(uploadMutation.isPending && uploadMutation.variables?.type === docItem.type) ||
                                     (replaceDocMutation.isPending && replaceDocMutation.variables?.id === docItem.documentId)
                                      ? "Uploading..."
                                      : docItem.documentId
                                      ? isCorrection
                                        ? "Re-upload Corrected"
                                        : "Replace (New Ver)"
                                      : "Upload File"}
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".jpg,.jpeg,.png,.pdf"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          if (file.size > 300 * 1024) {
                                            alert("File size must not exceed 300 KB.");
                                            return;
                                          }
                                          if (docItem.documentId) {
                                            replaceDocMutation.mutate({ id: docItem.documentId, file });
                                          } else {
                                            uploadMutation.mutate({ type: docItem.type, file });
                                          }
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>

                              {/* Public Correction Notice Alert */}
                              {isCorrection && docItem.rejectedReason && (
                                <div className="mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <strong className="block font-bold text-rose-900">Official Correction Instructions:</strong>
                                    <p className="mt-0.5 text-rose-800">{docItem.rejectedReason}</p>
                                    <p className="text-[11px] text-rose-600 mt-1">Please replace with a valid, legible copy to proceed with verification.</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
                <p style={{fontSize:"12px",color:"#94a3b8"}}>
                  🔒 Swayam Vault: All documents are encrypted in storage, audit-logged on every access, and shared securely across all your college applications.
                </p>

                {/* Version History Modal */}
                {viewHistoryDocId && (
                  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                          <Clock className="w-5 h-5 text-[#4A7B5B]" /> Document Version History
                        </h3>
                        <button
                          onClick={() => setViewHistoryDocId(null)}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                        >
                          ✕
                        </button>
                      </div>

                      {isDocHistoryLoading ? (
                        <div className="py-8 text-center text-gray-500 text-xs animate-pulse">
                          Loading version audit log...
                        </div>
                      ) : !Array.isArray(docHistoryRes?.data?.data) || docHistoryRes.data.data.length === 0 ? (
                        <div className="py-6 text-center text-gray-500 text-xs">
                          This is the initial version (v1). No previous revisions on record.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                          {docHistoryRes.data.data.map((ver: any) => (
                            <div key={ver.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between font-bold text-slate-800">
                                <span>Version {ver.version}</span>
                                <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px]">{ver.status}</span>
                              </div>
                              <div className="text-gray-600">{ver.fileName}</div>
                              <div className="text-[11px] text-gray-400">
                                Uploaded on {new Date(ver.createdAt).toLocaleString()}
                              </div>
                              {ver.fileUrl && (
                                <a
                                  href={ver.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[#4A7B5B] font-semibold hover:underline mt-1"
                                >
                                  <Download size={12} /> View this version
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setViewHistoryDocId(null)}
                          className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NOTIFICATIONS */}
            {activeSection==="notifications" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                  <div>
                    <h2 style={{fontWeight:800,color:"#0F172A",fontSize:"20px"}}>Notifications & Alerts Center</h2>
                    <p style={{fontSize:"13px",color:"#94a3b8"}}>Real-time admission journey alerts, payment receipts, reporting updates & broadcasts.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => markAllNotificationsRead()}
                      className="px-3 py-1.5 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-xl text-xs font-bold hover:bg-[#F8FAFC] transition shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={13} className="text-[#4A7B5B]" /> Mark All Read
                    </button>
                    <button
                      onClick={() => setShowPreferencesModal(true)}
                      className="px-3 py-1.5 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-xl text-xs font-bold hover:bg-[#F8FAFC] transition shadow-xs flex items-center gap-1.5"
                    >
                      <Settings size={13} className="text-[#4A7B5B]" /> Preferences
                    </button>
                    <button
                      onClick={() => refetchNotifications()}
                      disabled={isNotificationsFetching}
                      className="px-3 py-1.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#d8e8dc] disabled:opacity-50 transition"
                    >
                      <RotateCcw size={12} className={isNotificationsFetching ? "animate-spin" : ""} /> Refresh
                    </button>
                  </div>
                </div>

                {isNotificationsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse p-4 bg-white rounded-2xl border border-gray-100 flex gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-slate-100 rounded-md w-1/3" />
                          <div className="h-3 bg-slate-100 rounded-md w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isNotificationsError ? (
                  <ErrorState
                    title="Unable to load notifications"
                    error={notificationsError}
                    onRetry={() => refetchNotifications()}
                    isRetrying={isNotificationsFetching}
                  />
                ) : myNotifications.length === 0 ? (
                  <div className="text-center p-12 bg-white rounded-2xl border border-gray-100 shadow-xs">
                    <div className="w-16 h-16 bg-[#E8F3EC] text-[#4A7B5B] rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Bell size={28} />
                    </div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>No notifications available</h3>
                    <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto">
                      You're all caught up! Updates regarding application status, document verifications, and payments will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myNotifications.map((n: any, idx: number) => {
                      const isSystem = n.type === "SYSTEM" || n.category === "SYSTEM";
                      const isAdmission = n.type === "ADMISSION" || n.category === "APPLICATION" || n.category === "ADMISSION";
                      const isPayment = n.type === "PAYMENT" || n.category === "PAYMENT";
                      const isUnread = !n.isRead;

                      return (
                        <div
                          key={n.id || `notif_${idx}`}
                          className={`flex items-start gap-3.5 p-4.5 bg-white rounded-2xl border transition-all ${
                            isUnread
                              ? "border-[#4A7B5B]/30 bg-[#F8FAFC]"
                              : "border-gray-100 hover:border-gray-200"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isSystem
                                ? "bg-amber-50 text-amber-600"
                                : isAdmission
                                ? "bg-[#E8F3EC] text-[#4A7B5B]"
                                : isPayment
                                ? "bg-blue-50 text-blue-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {isSystem ? (
                              <AlertCircle size={18} />
                            ) : isAdmission ? (
                              <CheckCircle2 size={18} />
                            ) : isPayment ? (
                              <CreditCard size={18} />
                            ) : (
                              <Bell size={18} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }} className="truncate">
                                  {n.title || "Notification Update"}
                                </h4>
                                {isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-[#4A7B5B]" />
                                )}
                              </div>
                              {n.priority && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    n.priority === "HIGH" || n.priority === "CRITICAL"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {n.priority}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: "12.5px", color: "#475569", lineHeight: 1.5 }}>
                              {n.message || n.description}
                            </p>
                            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-gray-50 text-[11px] text-gray-400">
                              <div className="flex items-center gap-2 font-medium">
                                <span>{new Date(n.createdAt || Date.now()).toLocaleString()}</span>
                                {n.category && <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-600">{n.category}</span>}
                              </div>

                              <div className="flex items-center gap-2">
                                {n.actionUrl && (
                                  <button
                                    onClick={() => {
                                      if (n.actionUrl?.includes("application")) setActiveSection("applications");
                                      else if (n.actionUrl?.includes("payment")) setActiveSection("payments");
                                      else if (n.actionUrl?.includes("college")) setActiveSection("colleges");
                                    }}
                                    className="px-2.5 py-1 text-xs font-bold text-[#4A7B5B] bg-[#E8F3EC] rounded-lg hover:bg-[#4A7B5B] hover:text-white transition"
                                  >
                                    Take Action →
                                  </button>
                                )}
                                {isUnread && (
                                  <button
                                    onClick={() => markSingleNotificationRead(n.id)}
                                    className="text-xs font-semibold text-slate-500 hover:text-[#4A7B5B]"
                                  >
                                    Mark Read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* NOTIFICATION PREFERENCES MODAL */}
                {showPreferencesModal && (
                  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                          <h3 className="text-base font-bold text-[#0F172A]">Communication Preferences</h3>
                          <p className="text-xs text-gray-400">Control how and where you receive Swayam notifications.</p>
                        </div>
                        <button onClick={() => setShowPreferencesModal(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={20} />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        {[
                          { key: "inAppEnabled", label: "In-App Notifications", desc: "Dashboard alerts & journey milestones", icon: Bell },
                          { key: "emailEnabled", label: "Email Notifications", desc: "Admission approvals & receipts to your email", icon: Mail },
                          { key: "smsEnabled", label: "SMS Urgent Alerts", desc: "Critical verification & seat deadlines via SMS", icon: Phone },
                          { key: "whatsappEnabled", label: "WhatsApp Updates", desc: "Instant counselor updates on WhatsApp", icon: MessageSquare },
                        ].map((ch) => {
                          const Icon = ch.icon;
                          const currentVal = preferencesRes?.data?.[ch.key as keyof typeof preferencesRes.data] ?? true;

                          return (
                            <div key={ch.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-[#4A7B5B]">
                                  <Icon size={16} />
                                </div>
                                <div>
                                  <span className="font-bold text-[#0F172A] block">{ch.label}</span>
                                  <span className="text-[11px] text-gray-400">{ch.desc}</span>
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={currentVal}
                                onChange={(e) => updatePreferencesMutation.mutate({ [ch.key]: e.target.checked })}
                                className="w-4 h-4 rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                              />
                            </div>
                          );
                        })}

                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/60 mt-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-amber-900 block">Promotional Communications</span>
                              <span className="text-[11px] text-amber-700">Opt-out from marketing & promotional broadcasts</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={preferencesRes?.data?.promotionalOptOut || false}
                              onChange={(e) => updatePreferencesMutation.mutate({ promotionalOptOut: e.target.checked })}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-3 border-t border-gray-100">
                        <button
                          onClick={() => setShowPreferencesModal(false)}
                          className="px-4 py-2 text-xs font-bold text-white bg-[#4A7B5B] rounded-xl hover:bg-[#3D664B]"
                        >
                          Save & Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COUNSELING HISTORY */}
            {activeSection==="counseling" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 style={{fontWeight:800,color:"#0F172A",fontSize:"20px"}}>Counseling History</h2>
                  <button
                    onClick={() => refetchHistory()}
                    disabled={isHistoryFetching}
                    className="px-3 py-1.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#d8e8dc] disabled:opacity-50"
                  >
                    <RotateCcw size={12} className={isHistoryFetching ? "animate-spin" : ""} /> Refresh
                  </button>
                </div>
                {isHistoryLoading ? (
                  [1,2].map(i=><div key={i} className="animate-pulse h-24 bg-slate-100 rounded-2xl w-full"></div>)
                ) : isHistoryError ? (
                  <ErrorState
                    title="Unable to load counseling history"
                    error={historyError}
                    onRetry={() => refetchHistory()}
                    isRetrying={isHistoryFetching}
                  />
                ) : aiHistory.length === 0 ? (
                  <div className="text-center p-8 bg-white rounded-2xl border border-gray-100">
                    <History size={32} className="mx-auto text-gray-300 mb-3"/>
                    <p className="text-gray-500 text-sm">No counseling history found.</p>
                    <Link to="/ai-counselor" className="mt-3 inline-block px-4 py-2 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold hover:bg-[#3d674c]">
                      Start Counseling Chat
                    </Link>
                  </div>
                ) : (
                  aiHistory.map((h: any,i: number)=>(
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-white text-xs font-semibold ${h.type==="AI Chat"?"bg-[#4A7B5B]":"bg-[#3B82F6]"}`}>{h.type || "AI Chat"}</span>
                        <span style={{fontSize:"12px",color:"#94a3b8"}}>{new Date(h.createdAt || Date.now()).toLocaleDateString()}</span>
                      </div>
                      <p style={{fontSize:"13px",color:"#4B5563",lineHeight:1.6}}>{h.content}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* STUDY MATERIALS */}
            {activeSection==="materials" && (
              <div className="space-y-6">
                <div>
                  <h2 style={{fontWeight:800,color:"#0F172A",fontSize:"20px"}} className="flex items-center gap-2">
                    <BookOpen size={20} className="text-[#4A7B5B]"/> Study Materials
                  </h2>
                  <p style={{fontSize:"13px",color:"#94a3b8"}}>Your bookmarks, recent views, and recommended resources</p>
                </div>

                {/* Bookmarked Materials */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 style={{fontSize:"16px",fontWeight:700,color:"#0F172A"}} className="flex items-center gap-2">
                      <Bookmark size={15} className="text-[#4A7B5B]"/> Bookmarked Materials
                    </h3>
                    <Link to="/study-materials" className="text-xs text-[#4A7B5B] hover:underline">Browse All</Link>
                  </div>
                  {materialBookmarks.length === 0 ? (
                    <div className="text-center py-6 text-[#94A3B8]">
                      <BookOpen size={28} className="mx-auto mb-2 opacity-30"/>
                      <p className="text-sm">No bookmarked materials yet.</p>
                      <Link to="/study-materials" className="text-xs text-[#4A7B5B] font-semibold hover:underline mt-1 inline-block">Explore Study Materials</Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {materialBookmarks.map((m: StudyMaterial) => (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl hover:bg-[#EFF6F1] transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#E8F3EC] flex items-center justify-center shrink-0">
                              <FileText size={13} className="text-[#4A7B5B]"/>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0F172A] truncate">{m.title}</p>
                              <p className="text-xs text-[#94A3B8]">{m.materialType} · {m.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-[#94A3B8] flex items-center gap-0.5"><Download size={10}/>{m.downloadCount}</span>
                            {m.fileUrl && (
                              <a href={m.fileUrl} target="_blank" rel="noreferrer"
                                onClick={() => studyMaterialsApi.trackDownload(m.id)}
                                className="px-2.5 py-1 bg-[#4A7B5B] text-white text-xs font-semibold rounded-lg">
                                Get
                              </a>
                            )}
                            <button
                              onClick={() => removeBookmarkMutation.mutate(m.id)}
                              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Remove bookmark">
                              <BookmarkX size={14}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recently Viewed */}
                {materialHistory.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="mb-4 flex items-center gap-2" style={{fontSize:"16px",fontWeight:700,color:"#0F172A"}}>
                      <History size={15} className="text-[#64748B]"/> Recently Viewed
                    </h3>
                    <div className="space-y-2">
                      {materialHistory.slice(0, 5).map((m: StudyMaterial) => (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
                              <FileText size={13} className="text-[#64748B]"/>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0F172A] truncate">{m.title}</p>
                              <p className="text-xs text-[#94A3B8]">{m.materialType} · {m.subject || m.category}</p>
                            </div>
                          </div>
                          {m.fileUrl && (
                            <a href={m.fileUrl} target="_blank" rel="noreferrer"
                              onClick={() => studyMaterialsApi.trackDownload(m.id)}
                              className="px-2.5 py-1 bg-[#F1F5F9] text-[#64748B] text-xs font-semibold rounded-lg ml-2 shrink-0">
                              {m.premium ? "Unlock" : "View"}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Materials */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="mb-4 flex items-center gap-2" style={{fontSize:"16px",fontWeight:700,color:"#0F172A"}}>
                    <Star size={15} className="text-amber-500"/> Recommended for You
                  </h3>
                  {recommendedMaterials.length === 0 ? (
                    <div className="text-center py-6 text-[#94A3B8]">
                      <Star size={28} className="mx-auto mb-2 opacity-30"/>
                      <p className="text-sm">No recommendations available yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {recommendedMaterials.slice(0, 6).map((m: StudyMaterial) => (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] hover:bg-[#EFF6F1] transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#E8F3EC] flex items-center justify-center shrink-0">
                              <FileText size={13} className="text-[#4A7B5B]"/>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0F172A] truncate">{m.title}</p>
                              <p className="text-xs text-[#94A3B8]">{m.materialType}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {m.featured && <Star size={11} className="text-amber-400 fill-amber-400"/>}
                            {m.fileUrl && (
                              <a href={m.fileUrl} target="_blank" rel="noreferrer"
                                onClick={() => studyMaterialsApi.trackDownload(m.id)}
                                className="px-2.5 py-1 bg-[#4A7B5B] text-white text-xs font-semibold rounded-lg">
                                Get
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link to="/study-materials" className="flex items-center justify-center gap-1 text-sm text-[#4A7B5B] font-semibold py-3 mt-3 hover:underline">
                    Browse Full Library &rarr;
                  </Link>
                </div>
              </div>
            )}

            {/* PAYMENTS & FEES */}
            {activeSection === "payments" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 style={{ fontWeight: 800, color: "#0F172A", fontSize: "22px" }}>My Payments & Fee Records</h2>
                    <p style={{ fontSize: "13px", color: "#94a3b8" }}>Track your application fees, admission installments, receipts, and invoices.</p>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Paid</span>
                    <span className="text-2xl font-black text-[#4A7B5B]">
                      ₹{myPayments.reduce((acc: number, p: any) => acc + (p.status === 'COMPLETED' || p.status === 'SUCCESS' ? (p.paidAmount || p.amount || 0) : 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Outstanding Due</span>
                    <span className="text-2xl font-black text-rose-600">
                      ₹{myPayments.reduce((acc: number, p: any) => acc + (p.status === 'PENDING' || p.status === 'PARTIALLY_PAID' ? (p.pendingAmount || p.amount || 0) : 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Completed Transactions</span>
                    <span className="text-2xl font-black text-slate-900">
                      {myPayments.filter((p: any) => p.status === 'COMPLETED' || p.status === 'SUCCESS').length}
                    </span>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-5">
                  <h3 className="text-base font-bold text-[#0F172A] mb-4">Transaction History</h3>
                  {myPayments.length === 0 ? (
                    <div className="text-center py-12 text-[#94A3B8]">
                      <CreditCard size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-semibold">No payment records found.</p>
                      <p className="text-xs text-gray-400 mt-1">Payments made during college application will appear here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                            <th className="p-3">Receipt / Txn ID</th>
                            <th className="p-3">College & Course</th>
                            <th className="p-3">Payment Type</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Date</th>
                            <th className="p-3 text-right">Downloads</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {myPayments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-3 font-bold text-slate-900">
                                {p.receiptNumber || p.transactionId || `TXN-${p.id.slice(0, 8)}`}
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-800">{p.college?.name || p.application?.college?.name || 'Institute'}</div>
                                <div className="text-gray-400 text-[11px]">{p.course?.name || p.application?.course?.name || 'Program'}</div>
                              </td>
                              <td className="p-3 font-medium text-slate-700">
                                {p.paymentType} • {p.paymentMethod || 'UPI'}
                              </td>
                              <td className="p-3 font-bold text-slate-900">
                                ₹{(p.paidAmount || p.amount || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="p-3">
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                  p.status === 'COMPLETED' || p.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' :
                                  p.status === 'REFUNDED' ? 'bg-purple-100 text-purple-800' :
                                  p.status === 'FAILED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="p-3 text-gray-500">
                                {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : new Date(p.createdAt).toLocaleDateString('en-IN')}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <a
                                    href={`/api/payments/${p.id}/receipt`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 bg-[#E8F3EC] text-[#4A7B5B] hover:bg-[#d8e9dd] rounded-lg font-bold text-[11px]"
                                  >
                                    Receipt
                                  </a>
                                  <a
                                    href={`/api/payments/${p.id}/invoice`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-bold text-[11px]"
                                  >
                                    Invoice
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* HELP & SUPPORT CENTER */}
            {activeSection === "support" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 style={{ fontWeight: 800, color: "#0F172A", fontSize: "22px" }}>Student Support Center</h2>
                    <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                      Direct assistance with your admissions, payments, verification, and technical requests.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNewTicketModal(true)}
                    className="px-5 py-2.5 bg-[#4A7B5B] text-white rounded-xl font-bold text-xs hover:bg-[#3d694d] shadow-sm transition-all flex items-center gap-2"
                  >
                    <LifeBuoy size={16} />
                    Create New Support Ticket
                  </button>
                </div>

                {/* Filter Tabs & Search */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                    {[
                      { key: "ALL", label: "All Tickets" },
                      { key: "OPEN", label: "Open" },
                      { key: "IN_PROGRESS", label: "In Progress" },
                      { key: "WAITING_FOR_STUDENT", label: "Waiting on Me" },
                      { key: "RESOLVED", label: "Resolved" },
                      { key: "CLOSED", label: "Closed" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setTicketFilterStatus(tab.key)}
                        className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                          ticketFilterStatus === tab.key
                            ? "bg-[#4A7B5B] text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search ticket subject or ID..."
                      value={ticketSearchQuery}
                      onChange={(e) => setTicketSearchQuery(e.target.value)}
                      className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#4A7B5B]"
                    />
                  </div>
                </div>

                {/* Tickets Table / List */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">My Support Tickets</h3>
                    <span className="text-xs text-slate-400 font-semibold">{studentTickets.length} Total</span>
                  </div>

                  {studentTickets.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <LifeBuoy size={40} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-semibold text-sm">No support tickets created yet.</p>
                      <p className="text-xs text-slate-400 mt-1">If you have any admission or payment query, click "Create New Support Ticket" above.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {studentTickets
                        .filter((t: any) => {
                          if (ticketFilterStatus !== "ALL" && t.status !== ticketFilterStatus) return false;
                          if (ticketSearchQuery.trim()) {
                            const q = ticketSearchQuery.toLowerCase();
                            return (
                              t.ticketId?.toLowerCase().includes(q) ||
                              t.subject?.toLowerCase().includes(q) ||
                              t.category?.toLowerCase().includes(q)
                            );
                          }
                          return true;
                        })
                        .map((t: any) => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedStudentTicketId(t.id)}
                            className="py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/70 p-3 rounded-2xl cursor-pointer transition-colors gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-slate-900">{t.ticketId}</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    t.status === "RESOLVED"
                                      ? "bg-teal-50 text-teal-800 border-teal-200"
                                      : t.status === "CLOSED"
                                      ? "bg-gray-100 text-gray-700 border-gray-200"
                                      : t.status === "WAITING_FOR_STUDENT"
                                      ? "bg-amber-50 text-amber-800 border-amber-300 animate-pulse"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}
                                >
                                  {t.status}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {t.category}
                                </span>
                                {t.applicationId && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    Linked App
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-slate-800 text-sm">{t.subject}</h4>
                              <p className="text-xs text-slate-500 line-clamp-1">{t.description}</p>
                            </div>

                            <div className="sm:text-right flex sm:flex-col justify-between sm:justify-center items-end gap-1">
                              <span className="text-[11px] text-slate-400 font-mono">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </span>
                              <span className="text-xs font-bold text-[#4A7B5B] hover:underline inline-block">
                                View Conversation &rarr;
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* FAQs & Knowledge Center */}
                {supportFaqs.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900">Frequently Asked Questions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {supportFaqs.map((faq: any) => (
                        <div key={faq.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                          <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4A7B5B]"></span>
                            {faq.question}
                          </h5>
                          <p className="text-xs text-slate-600 leading-relaxed pl-3">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* REFER A STUDENT & REWARDS SECTION */}
            {activeSection === "referrals" && (
              <div className="space-y-4">
                <ReferralDashboard />
              </div>
            )}

            {/* CREATE TICKET MODAL */}
            {showNewTicketModal && (
              <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <LifeBuoy className="text-[#4A7B5B]" size={18} />
                      Create Support Ticket
                    </h3>
                    <button onClick={() => setShowNewTicketModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border rounded-xl font-medium focus:outline-none focus:border-[#4A7B5B]"
                      >
                        <option value="Admissions Query">Admissions Query</option>
                        <option value="Payment & Refund">Payment & Refund</option>
                        <option value="Document Verification">Document Verification</option>
                        <option value="Technical Support">Technical Support</option>
                        <option value="Scholarship & Financial Aid">Scholarship & Financial Aid</option>
                        <option value="General Query">General Query</option>
                      </select>
                    </div>

                    {/* Linked Application Context Selector */}
                    {(() => {
                      const appList: any[] = Array.isArray(appsRes?.data)
                        ? appsRes.data
                        : Array.isArray((appsRes?.data as any)?.data)
                        ? (appsRes?.data as any).data
                        : [];
                      if (appList.length === 0) return null;
                      return (
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Link to Application (Optional)</label>
                          <select
                            value={newApplicationId}
                            onChange={(e) => setNewApplicationId(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border rounded-xl font-medium focus:outline-none focus:border-[#4A7B5B]"
                          >
                            <option value="">-- No specific application --</option>
                            {appList.map((app: any) => (
                              <option key={app.id} value={app.id}>
                                {app.applicationNumber || app.id.slice(0, 8)}: {app.college?.name || "College"} - {app.course?.name || "Course"}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Subject</label>
                      <input
                        type="text"
                        placeholder="Brief summary of your query or issue"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border rounded-xl font-medium focus:outline-none focus:border-[#4A7B5B]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Detailed Description</label>
                      <textarea
                        rows={4}
                        placeholder="Please describe your query in detail with all relevant details..."
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border rounded-xl font-medium focus:outline-none focus:border-[#4A7B5B]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Attachment File URL (Optional)</label>
                      <input
                        type="text"
                        placeholder="Paste document or screenshot link (e.g. Google Drive, Cloudinary)"
                        value={newAttachmentUrl}
                        onChange={(e) => setNewAttachmentUrl(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border rounded-xl font-medium focus:outline-none focus:border-[#4A7B5B]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowNewTicketModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!newSubject.trim() || !newDesc.trim() || createTicketMutation.isPending}
                      onClick={() =>
                        createTicketMutation.mutate({
                          subject: newSubject,
                          description: newDesc,
                          category: newCategory,
                          priority: newPriority,
                          applicationId: newApplicationId || undefined,
                          attachmentUrl: newAttachmentUrl || undefined,
                          attachmentName: newAttachmentUrl ? "Student Attachment" : undefined,
                        })
                      }
                      className="px-5 py-2 bg-[#4A7B5B] text-white text-xs font-bold rounded-xl hover:bg-[#3d694d] disabled:opacity-40 shadow-sm"
                    >
                      {createTicketMutation.isPending ? "Submitting..." : "Submit Ticket"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TICKET CONVERSATION DRAWER FOR STUDENT */}
            {selectedStudentTicketId && selectedTicketDetail && (
              <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100 animate-in slide-in-from-right duration-200">
                <div className="p-4 border-b flex items-center justify-between bg-slate-50/80">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-black text-slate-900">{selectedTicketDetail.ticketId}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          selectedTicketDetail.status === "RESOLVED"
                            ? "bg-teal-50 text-teal-800 border-teal-200"
                            : selectedTicketDetail.status === "CLOSED"
                            ? "bg-gray-100 text-gray-700 border-gray-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {selectedTicketDetail.status}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {selectedTicketDetail.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm max-w-md truncate">{selectedTicketDetail.subject}</h3>
                  </div>
                  <button onClick={() => setSelectedStudentTicketId(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
                </div>

                {/* Resolution Banner if ticket is RESOLVED */}
                {selectedTicketDetail.status === "RESOLVED" && (
                  <div className="p-4 bg-teal-50 border-b border-teal-200 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-teal-900">
                      <CheckCircle2 size={16} className="text-teal-700" />
                      <span>This support request has been marked as resolved by our team.</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setShowFeedbackModal(true)}
                        className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
                      >
                        Accept & Close Ticket
                      </button>
                      <button
                        onClick={() => setShowStudentReopenModal(true)}
                        className="px-3.5 py-1.5 bg-white border border-teal-300 text-teal-800 hover:bg-teal-100 rounded-xl font-bold text-xs transition-all"
                      >
                        Still Need Help? Reopen
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages Thread */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                  {selectedTicketDetail.messages?.map((msg: any) => {
                    const isMe = msg.senderId === user?.id || msg.sender?.role === "STUDENT";
                    return (
                      <div
                        key={msg.id}
                        className={`p-3.5 rounded-2xl border ${
                          isMe
                            ? "bg-slate-50 border-slate-200 ml-6"
                            : "bg-emerald-50/60 border-emerald-200 mr-6"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 text-[11px] font-bold text-slate-700">
                          <span>{isMe ? "You" : msg.sender?.fullName || "Support Counselor"}</span>
                          <span className="text-slate-400 font-normal font-mono text-[10px]">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-wrap gap-2">
                            {msg.attachments.map((att: any) => (
                              <a
                                key={att.id}
                                href={att.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border text-slate-700 text-[10px] font-bold hover:underline"
                              >
                                <Paperclip size={10} />
                                {att.fileName}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Reply Input Box */}
                {selectedTicketDetail.status !== "CLOSED" && (
                  <div className="p-4 border-t bg-white space-y-2">
                    <textarea
                      rows={3}
                      placeholder="Type your message to the counseling team..."
                      value={studentReplyText}
                      onChange={(e) => setStudentReplyText(e.target.value)}
                      className="w-full p-3 border rounded-xl text-xs focus:outline-none focus:border-[#4A7B5B]"
                    />
                    <div className="flex justify-end">
                      <button
                        disabled={!studentReplyText.trim() || replyTicketMutation.isPending}
                        onClick={() => replyTicketMutation.mutate({ message: studentReplyText })}
                        className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white text-xs font-bold rounded-xl disabled:opacity-40 shadow-sm flex items-center gap-1.5"
                      >
                        <Send size={12} />
                        {replyTicketMutation.isPending ? "Sending..." : "Send Message"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FEEDBACK & CLOSE MODAL FOR STUDENT */}
            {showFeedbackModal && (
              <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
                  <h3 className="font-extrabold text-slate-900 text-sm">Rate Your Support Experience</h3>
                  <p className="text-xs text-slate-500">Your feedback helps us continuously improve counseling quality.</p>

                  <div className="flex justify-center gap-2 py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setCloseTicketRating(star)}
                        className={`text-2xl transition-transform hover:scale-110 ${
                          star <= closeTicketRating ? "text-amber-400" : "text-gray-300"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Optional comment about your experience..."
                    value={closeTicketComment}
                    onChange={(e) => setCloseTicketComment(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-xs text-left"
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowFeedbackModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={closeStudentTicketMutation.isPending}
                      onClick={() =>
                        closeStudentTicketMutation.mutate({
                          rating: closeTicketRating,
                          comment: closeTicketComment,
                        })
                      }
                      className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl"
                    >
                      {closeStudentTicketMutation.isPending ? "Submitting..." : "Confirm & Close"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* REOPEN MODAL FOR STUDENT */}
            {showStudentReopenModal && (
              <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <h3 className="font-extrabold text-slate-900 text-sm">Reopen Support Ticket</h3>
                  <p className="text-xs text-slate-500">Please provide reason why the issue remains unresolved.</p>

                  <textarea
                    rows={3}
                    placeholder="Describe what additional help is needed..."
                    value={studentReopenReason}
                    onChange={(e) => setStudentReopenReason(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-xs"
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowStudentReopenModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!studentReopenReason.trim() || reopenStudentTicketMutation.isPending}
                      onClick={() => reopenStudentTicketMutation.mutate(studentReopenReason)}
                      className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl disabled:opacity-40"
                    >
                      {reopenStudentTicketMutation.isPending ? "Reopening..." : "Confirm Reopen"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* One-Time First Login Referral Modal */}
            <FirstLoginReferralModal
              isOpen={showReferralModal}
              onClose={() => setShowReferralModal(false)}
              onSuccess={() => {
                refetchMe();
              }}
            />

          </div>
        </div>
      </div>
    </div>
  );
}
