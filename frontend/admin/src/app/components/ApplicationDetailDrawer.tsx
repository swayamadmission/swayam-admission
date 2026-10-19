import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Download,
  ExternalLink,
  UserCheck,
  Calendar,
  Clock,
  Video,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Archive,
  RotateCcw,
  Plus,
  Send,
  Loader2,
  Building,
  User,
  Check,
  DollarSign,
  Award,
  ShieldCheck,
  UserPlus,
  ClipboardCheck,
  ArrowRight,
  RefreshCw,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  hrApi,
  JobApplication,
  Interview,
  RecruiterStaff,
  Offer,
  EmployeeClearance,
  ClearanceChecklistItem,
  RecruitmentOnboarding,
} from "../../api/hr.api";

interface ApplicationDetailDrawerProps {
  applicationId: string | null;
  onClose: () => void;
  initialTab?: "overview" | "timeline" | "interviews" | "notes" | "workflow";
}

const safeFormatDate = (val?: string | Date | null, fmt = "MMM d, yyyy") => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt);
  } catch {
    return "—";
  }
};

const STATUS_COLORS: Record<string, string> = {
  APPLIED: "bg-blue-100 text-blue-800 border-blue-200",
  UNDER_REVIEW: "bg-purple-100 text-purple-800 border-purple-200",
  SHORTLISTED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  INTERVIEW_SCHEDULED: "bg-amber-100 text-amber-800 border-amber-200",
  INTERVIEWED: "bg-teal-100 text-teal-800 border-teal-200",
  SELECTED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  OFFERED: "bg-cyan-100 text-cyan-800 border-cyan-200",
  OFFER_SENT: "bg-cyan-100 text-cyan-800 border-cyan-200",
  OFFER_ACCEPTED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  OFFER_DECLINED: "bg-rose-100 text-rose-800 border-rose-200",
  CLEARANCE: "bg-blue-100 text-blue-800 border-blue-200",
  VERIFICATION_FAILED: "bg-red-100 text-red-800 border-red-200",
  ONBOARDING: "bg-amber-100 text-amber-800 border-amber-200",
  JOINED: "bg-green-100 text-green-900 border-green-300",
  ACTIVE: "bg-green-100 text-green-900 border-green-300",
  ON_HOLD: "bg-yellow-100 text-yellow-800 border-yellow-200",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
  WITHDRAWN: "bg-gray-100 text-gray-800 border-gray-200",
  HIRED: "bg-green-100 text-green-900 border-green-300",
  ARCHIVED: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function ApplicationDetailDrawer({
  applicationId,
  onClose,
  initialTab,
}: ApplicationDetailDrawerProps) {
  const queryClient = useQueryClient();

  // Active section tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "timeline" | "interviews" | "notes" | "workflow"
  >(initialTab || "overview");

  // Interview modal state
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    interviewType: "ONLINE",
    interviewDate: "",
    time: "11:00 AM",
    interviewerId: "",
    meetingLink: "",
    location: "",
    instructions: "",
  });

  // Note form state
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("NOTE");

  // Status prompt modal state (e.g. for rejection or hold reason)
  const [reasonPrompt, setReasonPrompt] = useState<{
    targetStatus: string;
    label: string;
  } | null>(null);
  const [reasonText, setReasonText] = useState("");

  // Recruiter assignment state
  const [selectedRecruiterId, setSelectedRecruiterId] = useState("");
  const [assignNote, setAssignNote] = useState("");

  // 1. Fetch detailed application
  const {
    data: appRes,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin_application_detail", applicationId],
    queryFn: () => hrApi.getApplication(applicationId!),
    enabled: !!applicationId,
  });

  // 2. Fetch recruiters list
  const { data: recruitersRes } = useQuery({
    queryKey: ["admin_recruiters_list"],
    queryFn: hrApi.getRecruiters,
  });

  // 3. Post-selection queries: Offer, Clearance, Onboarding
  const { data: offerRes, refetch: refetchOffer } = useQuery({
    queryKey: ["admin_application_offer", applicationId],
    queryFn: () => hrApi.getOffer(applicationId!),
    enabled: !!applicationId,
  });

  const { data: clearanceRes, refetch: refetchClearance } = useQuery({
    queryKey: ["admin_application_clearance", applicationId],
    queryFn: () => hrApi.getClearance(applicationId!),
    enabled: !!applicationId,
  });

  const { data: onboardingRes, refetch: refetchOnboarding } = useQuery({
    queryKey: ["admin_application_onboarding", applicationId],
    queryFn: () => hrApi.getOnboarding(applicationId!),
    enabled: !!applicationId,
  });

  const app = appRes?.data;
  const recruiters = recruitersRes?.data || [];
  const offer = offerRes?.data || app?.offer;
  const clearance = clearanceRes?.data || app?.clearance;
  const onboarding = onboardingRes?.data || app?.onboarding;

  // Post-Selection Modal States
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerForm, setOfferForm] = useState({
    designation: "",
    department: "",
    employmentType: "FULL_TIME",
    workMode: "ONSITE",
    workLocation: "Head Office",
    reportingManager: "",
    joiningDate: "",
    salary: "450000",
    salaryFrequency: "ANNUAL",
    validUntil: "",
    notes: "",
    terms: "Subject to background verification and identity clearance as per Swayam Admission standard recruitment policy.",
    sendImmediately: true,
  });

  const [isDeclinePromptOpen, setIsDeclinePromptOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const [reviewItem, setReviewItem] = useState<ClearanceChecklistItem | null>(null);
  const [reviewForm, setReviewForm] = useState({
    status: "VERIFIED" as "PENDING" | "IN_REVIEW" | "VERIFIED" | "FAILED" | "NOT_REQUIRED",
    remarks: "",
    failureReason: "",
    documentUrl: "",
  });

  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({
    employeeId: "",
    joiningDate: "",
    department: "",
    designation: "",
    reportingManager: "",
    workLocation: "Head Office",
    workMode: "ONSITE",
    employmentType: "FULL_TIME",
    officialEmail: "",
    officialMobile: "",
    notes: "",
  });

  const [isCompleteOnboardingModalOpen, setIsCompleteOnboardingModalOpen] = useState(false);
  const [completeOnboardingError, setCompleteOnboardingError] = useState<string | null>(null);
  const [completeOnboardingForm, setCompleteOnboardingForm] = useState({
    employeeId: "",
    role: "COUNSELOR",
    notes: "Staff credentials issued and onboarding verified.",
  });

  // Pre-fill forms when application, offer, or onboarding loads
  useEffect(() => {
    if (!app) return;

    setOfferForm((prev) => ({
      ...prev,
      designation: offer?.designation || app.vacancy?.designation || app.vacancy?.title || "",
      department: offer?.department || app.vacancy?.department || "Admissions",
      employmentType: (offer?.employmentType || (app.vacancy as any)?.employmentType || "FULL_TIME") as any,
      workMode: (offer?.workMode || app.vacancy?.workMode || "ONSITE") as any,
      workLocation: offer?.workLocation || app.vacancy?.location || "Head Office",
      salary: offer?.salary ? String(offer.salary) : app.expectedSalary ? String(app.expectedSalary).replace(/[^0-9]/g, "") || "450000" : "450000",
      validUntil: offer?.validUntil ? format(new Date(offer.validUntil), "yyyy-MM-dd") : format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      joiningDate: offer?.joiningDate ? format(new Date(offer.joiningDate), "yyyy-MM-dd") : format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    }));

    const randomEmpNum = Math.floor(1000 + Math.random() * 9000);
    const fallbackEmpId = `SWY-EMP-${new Date().getFullYear()}-${randomEmpNum}`;
    const generatedEmpId = onboarding?.employeeId || fallbackEmpId;

    const parsedJoiningDate = onboarding?.joiningDate
      ? format(new Date(onboarding.joiningDate), "yyyy-MM-dd")
      : offer?.joiningDate
      ? format(new Date(offer.joiningDate), "yyyy-MM-dd")
      : format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

    setOnboardingForm({
      employeeId: onboarding?.employeeId || generatedEmpId,
      department: onboarding?.department || offer?.department || app.vacancy?.department || "Admissions",
      designation: onboarding?.designation || offer?.designation || app.vacancy?.designation || app.vacancy?.title || "",
      officialEmail: onboarding?.officialEmail || app.email || "",
      officialMobile: onboarding?.officialMobile || app.mobile || "",
      joiningDate: parsedJoiningDate,
      reportingManager: onboarding?.reportingManager || offer?.reportingManager || "",
      workLocation: onboarding?.workLocation || offer?.workLocation || app.vacancy?.location || "Head Office",
      workMode: (onboarding?.workMode || offer?.workMode || app.vacancy?.workMode || "ONSITE") as any,
      employmentType: (onboarding?.employmentType || offer?.employmentType || (app.vacancy as any)?.employmentType || "FULL_TIME") as any,
      notes: onboarding?.notes || "",
    });

    setCompleteOnboardingForm((prev) => ({
      ...prev,
      employeeId: onboarding?.employeeId || generatedEmpId,
    }));
  }, [app, offer, onboarding]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, applicationId]);

  // Mutations
  const statusMutation = useMutation({
    mutationFn: ({
      status,
      note,
      reason,
    }: {
      status: string;
      note?: string;
      reason?: string;
    }) => hrApi.updateApplicationStatus(applicationId!, { status, note, reason }),
    onSuccess: (_, vars) => {
      toast.success(`Application status updated to ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      refetch();
      setReasonPrompt(null);
      setReasonText("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update status");
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({
      recruiterId,
      notes,
    }: {
      recruiterId: string;
      notes?: string;
    }) => hrApi.assignRecruiter(applicationId!, { recruiterId, notes }),
    onSuccess: () => {
      toast.success("Recruiter assigned successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      refetch();
      setAssignNote("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to assign recruiter");
    },
  });

  const noteMutation = useMutation({
    mutationFn: ({ note, type }: { note: string; type: string }) =>
      hrApi.addNote(applicationId!, { note, type }),
    onSuccess: () => {
      toast.success("Internal note added");
      refetch();
      setNoteText("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to add note");
    },
  });

  const scheduleInterviewMutation = useMutation({
    mutationFn: (payload: any) =>
      hrApi.scheduleInterview(applicationId!, payload),
    onSuccess: () => {
      toast.success("Interview scheduled successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      refetch();
      setIsInterviewModalOpen(false);
      setInterviewForm({
        interviewType: "ONLINE",
        interviewDate: "",
        time: "11:00 AM",
        interviewerId: "",
        meetingLink: "",
        location: "",
        instructions: "",
      });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Failed to schedule interview",
      );
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      app?.isArchived
        ? hrApi.restoreApplication(applicationId!)
        : hrApi.archiveApplication(applicationId!),
    onSuccess: () => {
      toast.success(
        app?.isArchived ? "Application restored" : "Application archived",
      );
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Failed to update archive status",
      );
    },
  });

  // Post-Selection Mutations
  const createOfferMutation = useMutation({
    mutationFn: (payload: any) =>
      hrApi.createOffer({
        applicationId: applicationId!,
        ...payload,
      }),
    onSuccess: () => {
      toast.success(
        offerForm.sendImmediately
          ? "Official offer generated and dispatched via In-App, Email & WhatsApp!"
          : "Offer draft created successfully!",
      );
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_application_offer", applicationId] });
      refetch();
      refetchOffer();
      setIsOfferModalOpen(false);
      setActiveTab("workflow");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create offer");
    },
  });

  const sendOfferMutation = useMutation({
    mutationFn: (offerId: string) => hrApi.sendOffer(offerId),
    onSuccess: () => {
      toast.success("Offer sent to candidate via In-App, Email & WhatsApp!");
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_application_offer", applicationId] });
      refetch();
      refetchOffer();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to send offer");
    },
  });

  const resendOfferMutation = useMutation({
    mutationFn: (offerId: string) => hrApi.resendOffer(offerId),
    onSuccess: () => {
      toast.success("Offer notifications resent via In-App, Email & WhatsApp!");
      queryClient.invalidateQueries({ queryKey: ["admin_application_offer", applicationId] });
      refetchOffer();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to resend offer");
    },
  });

  const cancelOfferMutation = useMutation({
    mutationFn: ({ offerId, reason }: { offerId: string; reason?: string }) =>
      hrApi.cancelOffer(offerId, reason),
    onSuccess: () => {
      toast.success("Offer has been cancelled.");
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_application_offer", applicationId] });
      refetch();
      refetchOffer();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to cancel offer");
    },
  });

  const respondOfferMutation = useMutation({
    mutationFn: ({ offerId, action, reason }: { offerId: string; action: "ACCEPT" | "DECLINE"; reason?: string }) =>
      hrApi.respondOffer(offerId, { action, reason, channel: "HR_PORTAL" }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === "ACCEPT"
          ? "Offer accepted! Candidate clearance checklist has been initiated."
          : "Offer marked as declined.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_application_offer", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["admin_application_clearance", applicationId] });
      refetch();
      refetchOffer();
      refetchClearance();
      setIsDeclinePromptOpen(false);
      setDeclineReason("");
      setActiveTab("workflow");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to record candidate response");
    },
  });

  const startClearanceMutation = useMutation({
    mutationFn: () => hrApi.startClearance(applicationId!),
    onSuccess: () => {
      toast.success("Clearance checklist initialized for candidate!");
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_application_clearance", applicationId] });
      refetch();
      refetchClearance();
      setActiveTab("workflow");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to start clearance");
    },
  });

  const updateClearanceItemMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: any }) =>
      hrApi.updateClearanceItem(itemId, payload),
    onSuccess: () => {
      toast.success("Clearance checklist item updated!");
      queryClient.invalidateQueries({ queryKey: ["admin_application_clearance", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_clearances"] });
      refetchClearance();
      refetch();
      setReviewItem(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update clearance item");
    },
  });

  const completeClearanceMutation = useMutation({
    mutationFn: ({ clearanceId, approveAllItems }: { clearanceId: string; approveAllItems?: boolean }) =>
      hrApi.completeClearance(clearanceId, { notes: "All required verifications completed by HR.", approveAllItems }),
    onSuccess: () => {
      toast.success("Clearance completed successfully! Candidate is ready for onboarding.");
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_application_clearance", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["admin_clearances"] });
      refetch();
      refetchClearance();
      setActiveTab("workflow");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to complete clearance");
    },
  });

  const startOnboardingMutation = useMutation({
    mutationFn: (payload: any) => hrApi.startOnboarding(applicationId!, payload),
    onSuccess: () => {
      toast.success("Onboarding started successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_application_onboarding", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["admin_clearances"] });
      refetch();
      refetchOnboarding();
      setIsOnboardingModalOpen(false);
      setActiveTab("workflow");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to start onboarding");
    },
  });

  const resendActivationMutation = useMutation({
    mutationFn: () => hrApi.resendActivationEmail(applicationId!),
    onSuccess: (res: any) => {
      const email = res.data?.email || onboarding?.officialEmail || app?.email;
      toast.success(res.data?.message || `Activation email resent successfully to ${email}!`);
      setCompleteOnboardingError(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to resend activation email";
      toast.error(msg);
      setCompleteOnboardingError(msg);
    },
  });

  const [isReconciling, setIsReconciling] = useState(false);

  const handleReconcileStatus = async () => {
    if (!applicationId) return;
    setIsReconciling(true);
    try {
      const res = await hrApi.getApplication(applicationId);
      const appData = res.data;
      if (appData?.status === "JOINED" || appData?.onboarding?.status === "COMPLETED") {
        toast.success("Server verified: Candidate is already linked and status is JOINED!");
        queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
        queryClient.invalidateQueries({ queryKey: ["admin_application_detail", applicationId] });
        queryClient.invalidateQueries({ queryKey: ["admin_application_onboarding", applicationId] });
        queryClient.invalidateQueries({ queryKey: ["admin_application_clearance", applicationId] });
        queryClient.invalidateQueries({ queryKey: ["admin_clearances"] });
        queryClient.invalidateQueries({ queryKey: ["admin_employees"] });
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        refetch();
        refetchOnboarding();
        setIsCompleteOnboardingModalOpen(false);
        setCompleteOnboardingError(null);
      } else {
        toast.info("Server status checked: Candidate has not yet joined. You may safely retry.");
      }
    } catch (checkErr: any) {
      toast.error("Could not reach server to verify status: " + (checkErr?.message || "Network error"));
    } finally {
      setIsReconciling(false);
    }
  };

  const completeOnboardingMutation = useMutation({
    mutationFn: (payload: any) => hrApi.completeOnboarding(applicationId!, payload),
    onSuccess: (res: any) => {
      const staffEmail = res.data?.user?.email || app?.email || "Candidate";
      const staffEmpId = res.data?.onboarding?.employeeId || res.data?.user?.employeeId || completeOnboardingForm.employeeId;
      const isAlready = res.data?.alreadyCompleted;
      toast.success(
        isAlready
          ? `Candidate is already linked to Staff record ${staffEmpId}. Status: JOINED.`
          : `Onboarding completed! ${app?.firstName || "Candidate"} is now JOINED. Activation email dispatched to ${staffEmail} (ID: ${staffEmpId}).`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_application_detail", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["admin_application_onboarding", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["admin_application_clearance", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["admin_clearances"] });
      queryClient.invalidateQueries({ queryKey: ["admin_employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      refetch();
      refetchOnboarding();
      refetchClearance();
      setIsCompleteOnboardingModalOpen(false);
      setCompleteOnboardingError(null);
      setActiveTab("workflow");
    },
    onError: async (err: any) => {
      const isTimeout =
        err?.code === "ECONNABORTED" ||
        err?.message?.toLowerCase().includes("timeout") ||
        err?.response?.status === 504;

      if (isTimeout && applicationId) {
        setCompleteOnboardingError("The request timed out while waiting for server response. Checking server state...");
        try {
          const res = await hrApi.getApplication(applicationId);
          const appData = res.data;
          if (appData?.status === "JOINED" || appData?.onboarding?.status === "COMPLETED") {
            toast.success("Server confirmed: Candidate is now JOINED and activation email is queued!");
            queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
            queryClient.invalidateQueries({ queryKey: ["admin_application_detail", applicationId] });
            queryClient.invalidateQueries({ queryKey: ["admin_application_onboarding", applicationId] });
            queryClient.invalidateQueries({ queryKey: ["admin_application_clearance", applicationId] });
            queryClient.invalidateQueries({ queryKey: ["admin_clearances"] });
            queryClient.invalidateQueries({ queryKey: ["admin_employees"] });
            queryClient.invalidateQueries({ queryKey: ["employees"] });
            refetch();
            refetchOnboarding();
            refetchClearance();
            setIsCompleteOnboardingModalOpen(false);
            setCompleteOnboardingError(null);
            setActiveTab("workflow");
            return;
          }
        } catch {
          // Ignore verification error and show informative error
        }
        setCompleteOnboardingError("The request timed out while communicating with the server. The server might still be completing the operation. You can click 'Check Server Status' below or retry.");
        return;
      }

      const msg = Array.isArray(err?.response?.data?.message)
        ? err.response.data.message.join(", ")
        : err?.response?.data?.message || err?.message || "Failed to complete onboarding";
      setCompleteOnboardingError(msg);
      toast.error(msg);
    },
  });

  const handleConfirmCompleteOnboarding = () => {
    setCompleteOnboardingError(null);
    const trimmedEmpId = completeOnboardingForm.employeeId?.trim();
    if (!trimmedEmpId) {
      setCompleteOnboardingError("Employee ID is required.");
      return;
    }
    if (!/^[A-Za-z0-9_-]{4,30}$/.test(trimmedEmpId)) {
      setCompleteOnboardingError("Employee ID must be 4 to 30 characters (letters, numbers, hyphens, or underscores).");
      return;
    }
    if (!completeOnboardingForm.role) {
      setCompleteOnboardingError("Please select a system role for this staff member.");
      return;
    }
    completeOnboardingMutation.mutate({
      employeeId: trimmedEmpId,
      role: completeOnboardingForm.role,
      notes: completeOnboardingForm.notes?.trim() || undefined,
    });
  };

  // If no application selected, drawer is not open
  if (!applicationId) return null;

  // Active Loading State
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#4A7B5B]" />
          <span className="text-sm font-semibold text-slate-700">
            Loading candidate application...
          </span>
        </div>
      </div>
    );
  }

  // API Error or Not Found State
  if (isError || !app) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Failed to load application
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {(error as any)?.response?.data?.message ||
                "Candidate application could not be retrieved from the server. Please try again."}
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-xs font-bold bg-[#4A7B5B] text-white hover:bg-[#3D664A] rounded-xl shadow-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleQuickStatus = (status: string) => {
    if (status === "REJECTED") {
      setReasonPrompt({
        targetStatus: "REJECTED",
        label: "Reason for Rejection",
      });
      return;
    }
    if (status === "ON_HOLD") {
      setReasonPrompt({
        targetStatus: "ON_HOLD",
        label: "Reason for putting On Hold",
      });
      return;
    }
    statusMutation.mutate({ status });
  };

  const handlePromptSubmit = () => {
    if (!reasonPrompt) return;
    statusMutation.mutate({
      status: reasonPrompt.targetStatus,
      reason: reasonText,
      note: reasonText,
    });
  };

  const resumeUrl =
    app.resumeUrl ||
    app.documents?.find((d) => d.title.toLowerCase().includes("resume"))
      ?.fileUrl;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                {app.applicationId}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  STATUS_COLORS[app.status] || "bg-gray-100 text-gray-700"
                }`}
              >
                {app.status.replace(/_/g, " ")}
              </span>
              {app.isArchived && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                  ARCHIVED
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              {app.firstName} {app.lastName || ""}
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Applied for{" "}
              <strong className="text-slate-700">
                {app.vacancy?.title || "Role"}
              </strong>{" "}
              ({app.vacancy?.vacancyCode}) •{" "}
              {safeFormatDate(app.createdAt, "MMM d, yyyy h:mm a")}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button Strip (Section 12: All Visible Functional Actions) */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center gap-2 shrink-0">
          {/* Quick Workflow Transitions */}
          {app.status !== "SHORTLISTED" && (
            <button
              onClick={() => handleQuickStatus("SHORTLISTED")}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors border border-indigo-200"
            >
              Shortlist
            </button>
          )}

          {app.status !== "UNDER_REVIEW" && (
            <button
              onClick={() => handleQuickStatus("UNDER_REVIEW")}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg transition-colors border border-purple-200"
            >
              Review
            </button>
          )}

          <button
            onClick={() => setIsInterviewModalOpen(true)}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg transition-colors border border-amber-200 flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule Interview</span>
          </button>

          {app.status !== "SELECTED" && (
            <button
              onClick={() => handleQuickStatus("SELECTED")}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#4A7B5B] text-xs font-bold rounded-lg transition-colors border border-emerald-200"
            >
              Select
            </button>
          )}

          {/* Section 14: Dynamic Post-Selection Actions */}
          {app.status === "SELECTED" && !offer && (
            <button
              onClick={() => {
                setIsOfferModalOpen(true);
              }}
              className="px-3 py-1.5 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5 animate-pulse"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Start Offer Process</span>
            </button>
          )}

          {app.status === "SELECTED" && offer && offer.status === "DRAFT" && (
            <button
              onClick={() => sendOfferMutation.mutate(offer.id)}
              disabled={sendOfferMutation.isPending}
              className="px-3 py-1.5 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendOfferMutation.isPending ? "Sending..." : "Send Offer"}</span>
            </button>
          )}

          {app.status === "OFFER_SENT" && offer && (
            <>
              <button
                onClick={() => resendOfferMutation.mutate(offer.id)}
                disabled={resendOfferMutation.isPending}
                className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold rounded-lg transition-colors border border-cyan-200 flex items-center gap-1.5"
                title="Resend email, WhatsApp & In-app offer alert"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Resend Offer</span>
              </button>
              <button
                onClick={() => respondOfferMutation.mutate({ offerId: offer.id, action: "ACCEPT" })}
                disabled={respondOfferMutation.isPending}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg transition-colors border border-emerald-200 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Accepted</span>
              </button>
              <button
                onClick={() => setIsDeclinePromptOpen(true)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors border border-rose-200 flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Mark Declined</span>
              </button>
            </>
          )}

          {app.status === "OFFER_ACCEPTED" && (
            <button
              onClick={() => startClearanceMutation.mutate()}
              disabled={startClearanceMutation.isPending}
              className="px-3 py-1.5 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{startClearanceMutation.isPending ? "Starting..." : "Start Clearance"}</span>
            </button>
          )}

          {app.status === "CLEARANCE" && (
            <>
              <button
                onClick={() => setActiveTab("workflow")}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-lg transition-colors border border-blue-200 flex items-center gap-1.5"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Review Checklist</span>
              </button>
              <button
                onClick={() => setIsOnboardingModalOpen(true)}
                className="px-3 py-1.5 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Start Onboarding</span>
              </button>
            </>
          )}

          {app.status === "ONBOARDING" && (
            <button
              onClick={() => {
                setCompleteOnboardingError(null);
                setIsCompleteOnboardingModalOpen(true);
              }}
              className="px-3 py-1.5 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Complete Onboarding</span>
            </button>
          )}

          {(app.status === "JOINED" || app.status === "ACTIVE") && (
            <span className="px-3 py-1.5 bg-green-50 text-green-800 text-xs font-bold rounded-lg border border-green-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
              <span>Active Employee</span>
            </span>
          )}

          {app.status !== "ON_HOLD" && (
            <button
              onClick={() => handleQuickStatus("ON_HOLD")}
              className="px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 text-xs font-bold rounded-lg transition-colors border border-yellow-200"
            >
              Hold
            </button>
          )}

          {app.status !== "REJECTED" && (
            <button
              onClick={() => handleQuickStatus("REJECTED")}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors border border-rose-200"
            >
              Reject
            </button>
          )}

          {/* Download Resume Button */}
          {resumeUrl && (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3 py-1.5 bg-[#E8F3EC] hover:bg-[#d9ede0] text-[#4A7B5B] text-xs font-bold rounded-lg transition-colors border border-[#CBD5E1] flex items-center gap-1.5 ml-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Resume</span>
            </a>
          )}

          {/* Archive / Restore Button */}
          <button
            onClick={() => archiveMutation.mutate()}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title={app.isArchived ? "Restore Application" : "Archive Application"}
          >
            {app.isArchived ? (
              <RotateCcw className="w-4 h-4 text-emerald-600" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="flex border-b border-slate-200 px-6 gap-6 text-sm font-semibold shrink-0 bg-slate-50/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "overview"
                ? "border-[#4A7B5B] text-[#4A7B5B]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Candidate Profile
          </button>
          <button
            onClick={() => setActiveTab("workflow")}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "workflow"
                ? "border-[#4A7B5B] text-[#4A7B5B]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Award className="w-4 h-4 text-[#4A7B5B]" />
            <span>Offer & Onboarding</span>
            {(offer || clearance || onboarding || ["SELECTED", "OFFER_SENT", "OFFER_ACCEPTED", "CLEARANCE", "ONBOARDING", "JOINED"].includes(app.status)) && (
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-bold rounded-full">
                {app.status === "SELECTED" ? "Offer Ready" : app.status.replace(/_/g, " ")}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "timeline"
                ? "border-[#4A7B5B] text-[#4A7B5B]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Timeline</span>
            <span className="text-[11px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full">
              {app.statusHistory?.length || 1}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("interviews")}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "interviews"
                ? "border-[#4A7B5B] text-[#4A7B5B]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Interviews</span>
            <span className="text-[11px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full">
              {app.interviews?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "notes"
                ? "border-[#4A7B5B] text-[#4A7B5B]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Notes</span>
            <span className="text-[11px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full">
              {app.timelineNotes?.length || 0}
            </span>
          </button>
        </div>

        {/* Drawer Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 text-sm">
              {/* Recruiter Assignment Panel */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#4A7B5B]" />
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Assigned Recruiter
                    </span>
                  </div>
                  {app.recruiter ? (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      {app.recruiter.fullName} ({app.recruiter.email})
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">
                      Unassigned
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-200">
                  <select
                    value={selectedRecruiterId}
                    onChange={(e) => setSelectedRecruiterId(e.target.value)}
                    className="w-full sm:flex-1 text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                  >
                    <option value="">Select Recruiter / Staff Member...</option>
                    {recruiters.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.fullName} ({r.role}) - {r.email}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      if (!selectedRecruiterId) {
                        toast.error("Please select a recruiter first");
                        return;
                      }
                      assignMutation.mutate({
                        recruiterId: selectedRecruiterId,
                        notes: assignNote,
                      });
                    }}
                    disabled={assignMutation.isPending || !selectedRecruiterId}
                    className="w-full sm:w-auto px-4 py-2 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                  >
                    {assignMutation.isPending ? "Assigning..." : "Assign"}
                  </button>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b pb-1 text-slate-400">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5 text-slate-700">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <a
                      href={`mailto:${app.email}`}
                      className="hover:text-[#4A7B5B] hover:underline"
                    >
                      {app.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <a
                      href={`tel:${app.mobile}`}
                      className="hover:text-[#4A7B5B] hover:underline"
                    >
                      {app.mobile}
                    </a>
                  </div>
                  {(app.city || app.state || app.address) && (
                    <div className="flex items-center gap-2.5 text-slate-700 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        {[app.address, app.city, app.state]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Experience */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b pb-1 text-slate-400">
                  Professional Experience & Education
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">
                      Qualification
                    </span>
                    <span className="font-semibold text-slate-800">
                      {app.qualification || "Not provided"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">
                      Total Experience
                    </span>
                    <span className="font-semibold text-slate-800">
                      {app.experience || "Not provided"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">
                      Previous / Current Org
                    </span>
                    <span className="font-semibold text-slate-800">
                      {app.previousOrganization || "Not provided"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">
                      Current Designation
                    </span>
                    <span className="font-semibold text-slate-800">
                      {app.currentDesignation || "Not provided"}
                    </span>
                  </div>
                  {app.expectedSalary && (
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">
                        Expected CTC
                      </span>
                      <span className="font-semibold text-slate-800">
                        {app.expectedSalary}
                      </span>
                    </div>
                  )}
                  {app.noticePeriod && (
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">
                        Notice Period
                      </span>
                      <span className="font-semibold text-slate-800">
                        {app.noticePeriod}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills */}
              {app.skills && app.skills.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b pb-1 text-slate-400">
                    Candidate Skills
                  </h3>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {app.skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-[#E8F3EC] text-[#2A5239] rounded-md text-xs font-medium border border-[#CBD5E1]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Online Links */}
              {(app.linkedInUrl || app.portfolioUrl) && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b pb-1 text-slate-400">
                    Web & Profiles
                  </h3>
                  <div className="flex flex-wrap gap-4 pt-1">
                    {app.linkedInUrl && (
                      <a
                        href={app.linkedInUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>LinkedIn Profile</span>
                      </a>
                    )}
                    {app.portfolioUrl && (
                      <a
                        href={app.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Portfolio / Website</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Cover Letter */}
              {app.coverLetter && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b pb-1 text-slate-400">
                    Cover Letter / Statement
                  </h3>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                    {app.coverLetter}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b pb-1 text-slate-400">
                  Uploaded Documents
                </h3>
                {resumeUrl ? (
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <FileText className="w-7 h-7 text-[#4A7B5B]" />
                      <div>
                        <div className="font-semibold text-slate-900 text-xs line-clamp-1">
                          {app.resumeFileName || "Candidate Resume"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {app.resumeFileSize
                            ? `${(app.resumeFileSize / 1024 / 1024).toFixed(2)} MB • `
                            : ""}
                          Verified Resume Document
                        </div>
                      </div>
                    </div>

                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="px-3.5 py-1.5 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                    No resume document uploaded for this candidate.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TIMELINE */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status Transition History
                </h3>
                <span className="text-xs text-slate-400">
                  Immutable Audit Records
                </span>
              </div>

              {app.statusHistory && app.statusHistory.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {app.statusHistory.map((item, idx) => (
                    <div key={idx} className="relative space-y-1">
                      <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-[#4A7B5B] ring-4 ring-white" />
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold border ${
                            STATUS_COLORS[item.status] || "bg-slate-100"
                          }`}
                        >
                          {item.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-slate-400">
                          {safeFormatDate(item.timestamp, "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {item.note || "Status updated"}
                      </p>
                      {item.actorName && (
                        <p className="text-[11px] text-slate-400">
                          By: {item.actorName}
                        </p>
                      )}
                      {item.reason && (
                        <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg mt-1 border border-rose-200">
                          <strong>Reason:</strong> {item.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Initial application logged on{" "}
                  {safeFormatDate(app.createdAt, "MMM d, yyyy")}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INTERVIEWS */}
          {activeTab === "interviews" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Scheduled Interviews ({app.interviews?.length || 0})
                </h3>
                <button
                  onClick={() => setIsInterviewModalOpen(true)}
                  className="px-3 py-1 bg-[#4A7B5B] text-white text-xs font-bold rounded-lg hover:bg-[#3D664A] transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule New</span>
                </button>
              </div>

              {app.interviews && app.interviews.length > 0 ? (
                <div className="space-y-3">
                  {app.interviews.map((iv) => (
                    <div
                      key={iv.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {safeFormatDate(
                              iv.interviewDate,
                              "EEEE, MMM d, yyyy",
                            )}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[11px]">
                            {iv.time || "Time TBD"}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold uppercase text-[10px]">
                          {iv.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-slate-600">
                        <div>
                          <strong className="text-slate-700">Mode:</strong>{" "}
                          {iv.interviewType}
                        </div>
                        {iv.interviewer && (
                          <div>
                            <strong className="text-slate-700">
                              Interviewer:
                            </strong>{" "}
                            {iv.interviewer.fullName}
                          </div>
                        )}
                        {iv.meetingLink && (
                          <div className="col-span-2">
                            <strong className="text-slate-700">Link:</strong>{" "}
                            <a
                              href={iv.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {iv.meetingLink}
                            </a>
                          </div>
                        )}
                      </div>

                      {iv.instructions && (
                        <p className="text-slate-500 italic bg-white p-2.5 rounded border border-slate-200">
                          {iv.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-400 text-xs">
                  No interviews scheduled yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INTERNAL NOTES */}
          {activeTab === "notes" && (
            <div className="space-y-6">
              {/* Add Note Input */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Add Internal Recruiter Note
                </span>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Type an internal remark, candidate feedback, or phone follow-up summary..."
                  className="w-full p-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#4A7B5B]"
                />

                <div className="flex items-center justify-between">
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="NOTE">General Note</option>
                    <option value="FOLLOW_UP">Follow-Up Note</option>
                    <option value="PHONE_SCREEN">Phone Screening</option>
                    <option value="REFERENCE_CHECK">Reference Check</option>
                  </select>

                  <button
                    onClick={() => {
                      if (!noteText.trim()) return;
                      noteMutation.mutate({ note: noteText, type: noteType });
                    }}
                    disabled={noteMutation.isPending || !noteText.trim()}
                    className="px-4 py-1.5 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    <span>Post Note</span>
                  </button>
                </div>
              </div>

              {/* Existing Notes List */}
              <div className="space-y-3">
                {app.timelineNotes && app.timelineNotes.length > 0 ? (
                  app.timelineNotes.map((n) => (
                    <div
                      key={n.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {n.authorName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {safeFormatDate(n.createdAt, "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed pt-1">
                        {n.note}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No notes recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: OFFER, CLEARANCE & ONBOARDING WORKFLOW */}
          {activeTab === "workflow" && (
            <div className="space-y-6 text-sm">
              {/* Visual Pipeline Progression Header */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#4A7B5B]" />
                    <span>Post-Selection Recruitment Lifecycle</span>
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[app.status] || "bg-gray-100 text-gray-700"}`}>
                    Current: {app.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 text-center">
                  {[
                    { label: "1. Selected", active: ["SELECTED", "OFFERED", "OFFER_SENT", "OFFER_ACCEPTED", "CLEARANCE", "ONBOARDING", "JOINED", "ACTIVE"].includes(app.status), done: ["OFFERED", "OFFER_SENT", "OFFER_ACCEPTED", "CLEARANCE", "ONBOARDING", "JOINED", "ACTIVE"].includes(app.status) },
                    { label: "2. Offer Sent", active: ["OFFER_SENT", "OFFER_ACCEPTED", "CLEARANCE", "ONBOARDING", "JOINED", "ACTIVE"].includes(app.status), done: ["OFFER_ACCEPTED", "CLEARANCE", "ONBOARDING", "JOINED", "ACTIVE"].includes(app.status) },
                    { label: "3. Accepted", active: ["OFFER_ACCEPTED", "CLEARANCE", "ONBOARDING", "JOINED", "ACTIVE"].includes(app.status), done: ["CLEARANCE", "ONBOARDING", "JOINED", "ACTIVE"].includes(app.status) },
                    { label: "4. Clearance", active: ["CLEARANCE", "ONBOARDING", "JOINED", "ACTIVE"].includes(app.status), done: ["ONBOARDING", "JOINED", "ACTIVE"].includes(app.status) },
                    { label: "5. Onboarding", active: ["ONBOARDING", "JOINED", "ACTIVE"].includes(app.status), done: ["JOINED", "ACTIVE"].includes(app.status) },
                    { label: "6. Joined", active: ["JOINED", "ACTIVE"].includes(app.status), done: ["JOINED", "ACTIVE"].includes(app.status) },
                  ].map((st, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition-colors ${
                        st.done
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : st.active
                          ? "bg-[#4A7B5B] text-white border-[#4A7B5B] shadow-xs"
                          : "bg-white text-slate-400 border-slate-200"
                      }`}
                    >
                      {st.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD 1: OFFER MANAGEMENT */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4A7B5B]" />
                    <h3 className="font-bold text-slate-900 text-sm">Employment Offer Management</h3>
                  </div>
                  {offer ? (
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${STATUS_COLORS[offer.status] || "bg-gray-100 text-gray-700"}`}>
                      {offer.status.replace(/_/g, " ")}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">No Offer Drafted</span>
                  )}
                </div>

                {offer ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Offer Code</span>
                        <span className="font-mono font-bold text-slate-800">{offer.offerCode || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Role / Designation</span>
                        <span className="font-bold text-slate-800">{offer.designation || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
                        <span className="font-semibold text-slate-700">{offer.department || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Annual CTC / Salary</span>
                        <span className="font-bold text-[#4A7B5B]">₹{Number(offer.salary || 0).toLocaleString("en-IN")} / {offer.salaryFrequency || "ANNUAL"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Work Mode & Location</span>
                        <span className="font-semibold text-slate-700">{offer.workMode} • {offer.workLocation}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Reporting Manager</span>
                        <span className="font-semibold text-slate-700">{offer.reportingManager || "Department Head"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Proposed Joining</span>
                        <span className="font-semibold text-slate-700">{safeFormatDate(offer.joiningDate)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Offer Valid Until</span>
                        <span className="font-semibold text-slate-700">{safeFormatDate(offer.validUntil)}</span>
                      </div>
                    </div>

                    {offer.terms && (
                      <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-900 space-y-1">
                        <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-800">Additional Terms & Conditions</span>
                        <p className="leading-relaxed">{offer.terms}</p>
                      </div>
                    )}

                    {offer.declinedReason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                        <span className="font-bold block text-[10px] uppercase tracking-wider text-rose-700">Decline Reason Recorded</span>
                        <p className="leading-relaxed">{offer.declinedReason}</p>
                      </div>
                    )}

                    {/* Offer Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                      {offer.status === "DRAFT" && (
                        <>
                          <button
                            onClick={() => sendOfferMutation.mutate(offer.id)}
                            disabled={sendOfferMutation.isPending}
                            className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{sendOfferMutation.isPending ? "Sending..." : "Send Offer to Candidate"}</span>
                          </button>
                          <button
                            onClick={() => setIsOfferModalOpen(true)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                          >
                            Edit Offer Draft
                          </button>
                        </>
                      )}

                      {offer.status === "OFFER_SENT" && (
                        <>
                          <button
                            onClick={() => resendOfferMutation.mutate(offer.id)}
                            disabled={resendOfferMutation.isPending}
                            className="px-3.5 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold rounded-xl border border-cyan-200 transition-colors flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{resendOfferMutation.isPending ? "Resending..." : "Resend Notification (All Channels)"}</span>
                          </button>
                          <button
                            onClick={() => respondOfferMutation.mutate({ offerId: offer.id, action: "ACCEPT" })}
                            disabled={respondOfferMutation.isPending}
                            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Record Candidate Acceptance</span>
                          </button>
                          <button
                            onClick={() => setIsDeclinePromptOpen(true)}
                            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Record Candidate Decline</span>
                          </button>
                          <button
                            onClick={() => cancelOfferMutation.mutate({ offerId: offer.id })}
                            disabled={cancelOfferMutation.isPending}
                            className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold ml-auto"
                          >
                            Cancel Offer
                          </button>
                        </>
                      )}

                      {offer.status === "OFFER_ACCEPTED" && (
                        <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 w-full">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Candidate confirmed offer acceptance on {safeFormatDate(offer.acceptedAt, "MMM d, yyyy h:mm a")}. Ready for clearance.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 rounded-xl space-y-3">
                    <p className="text-xs text-slate-500">
                      Applicant is selected! Generate an official employment offer with CTC, position, and start date.
                    </p>
                    <button
                      onClick={() => setIsOfferModalOpen(true)}
                      className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Official Offer</span>
                    </button>
                  </div>
                )}
              </div>

              {/* CARD 2: PRE-EMPLOYMENT CLEARANCE CHECKLIST */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#4A7B5B]" />
                    <h3 className="font-bold text-slate-900 text-sm">Clearance & Document Verification Checklist</h3>
                  </div>
                  {clearance ? (
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${STATUS_COLORS[clearance.status] || "bg-gray-100 text-gray-700"}`}>
                      {clearance.status.replace(/_/g, " ")}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Pending Offer Acceptance</span>
                  )}
                </div>

                {/* Candidate Identity Strip for Clearance Section */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl text-xs border border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Candidate</span>
                    <span className="font-bold text-slate-800">{app.firstName} {app.lastName || ""}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{app.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Application & Job</span>
                    <span className="font-mono font-bold text-slate-800">{app.applicationNumber}</span>
                    <span className="text-[11px] text-[#4A7B5B] font-medium block truncate">{app.vacancy?.title || "Staff Position"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Department & Code</span>
                    <span className="font-semibold text-slate-700">{app.vacancy?.department || "General"}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{app.vacancy?.vacancyCode || "VAC-GEN"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Recruiter & Joining</span>
                    <span className="font-semibold text-slate-700">{app.recruiter?.fullName || "Not assigned"}</span>
                    <span className="text-[11px] text-emerald-700 font-bold block">{offer?.joiningDate ? safeFormatDate(offer.joiningDate) : "TBD"}</span>
                  </div>
                </div>

                {clearance ? (
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    {clearance.checklistItems && clearance.checklistItems.length > 0 && (() => {
                      const totalRequired = clearance.checklistItems.filter((i) => i.isRequired).length;
                      const verifiedRequired = clearance.checklistItems.filter((i) => i.isRequired && i.status === "VERIFIED").length;
                      const pct = totalRequired > 0 ? Math.round((verifiedRequired / totalRequired) * 100) : 0;
                      return (
                        <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-700">Required Verifications Completed</span>
                            <span className="text-[#4A7B5B] font-bold">{verifiedRequired} of {totalRequired} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-[#4A7B5B] h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Checklist Items Table */}
                    <div className="space-y-2">
                      {clearance.checklistItems?.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs hover:border-slate-300 transition-colors"
                        >
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800">{item.title}</span>
                              {item.isRequired ? (
                                <span className="text-[10px] px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold">Required</span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">Optional</span>
                              )}
                              <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${
                                item.status === "VERIFIED"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : item.status === "FAILED"
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : item.status === "IN_REVIEW"
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            {item.remarks && (
                              <p className="text-slate-500 text-[11px] italic">Remarks: {item.remarks}</p>
                            )}
                            {item.failureReason && (
                              <p className="text-rose-600 text-[11px] font-semibold">Failure reason: {item.failureReason}</p>
                            )}
                            {item.reviewedBy && (
                              <p className="text-slate-400 text-[10px]">Reviewed by {item.reviewedBy.fullName} • {safeFormatDate(item.reviewedAt, "MMM d, h:mm a")}</p>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setReviewItem(item);
                              setReviewForm({
                                status: item.status,
                                remarks: item.remarks || "",
                                failureReason: item.failureReason || "",
                                documentUrl: item.documentUrl || "",
                              });
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors shrink-0"
                          >
                            Review
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Complete Clearance Banner & Button */}
                    {(() => {
                      const isClearanceFinished = ["COMPLETED", "FINAL_CLEARED", "HR_CLEARED"].includes(clearance.status);
                      const pendingReq = clearance.checklistItems?.filter((i) => i.isRequired && i.status !== "VERIFIED" && i.status !== "NOT_REQUIRED") || [];

                      if (isClearanceFinished) {
                        return (
                          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5 text-emerald-900 font-bold">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                              <div>
                                <span className="block text-sm">Clearance Completed & Final Approved</span>
                                <span className="text-[11px] text-emerald-700 font-normal">
                                  {clearance.reviewedAt ? `Approved on ${safeFormatDate(clearance.reviewedAt)}` : "All pre-employment verifications verified."} Candidate is cleared for onboarding.
                                </span>
                              </div>
                            </div>
                            {!onboarding && (
                              <button
                                onClick={() => setIsOnboardingModalOpen(true)}
                                className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Start Onboarding</span>
                              </button>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3 pt-2 border-t">
                          {pendingReq.length > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                              <div className="flex items-center gap-2 font-bold text-amber-800">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Verification Pending: {pendingReq.length} required item(s) unverified</span>
                              </div>
                              <p className="text-amber-800 text-[11px]">
                                Missing: <span className="font-semibold">{pendingReq.map((i) => i.title).join(", ")}</span>.
                                All required checklist items must be verified/approved before final clearance.
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-end gap-2.5">
                            {pendingReq.length > 0 && (
                              <button
                                onClick={() => completeClearanceMutation.mutate({ clearanceId: clearance.id, approveAllItems: true })}
                                disabled={completeClearanceMutation.isPending}
                                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                                title="Verify all required items and mark clearance complete in one click"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{completeClearanceMutation.isPending ? "Approving All..." : "Approve All & Finalize"}</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (pendingReq.length > 0) {
                                  toast.error(`Cannot complete clearance: ${pendingReq.length} required item(s) are still pending (${pendingReq.map((i) => i.title).join(", ")}).`);
                                  return;
                                }
                                completeClearanceMutation.mutate({ clearanceId: clearance.id });
                              }}
                              disabled={completeClearanceMutation.isPending}
                              className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{completeClearanceMutation.isPending ? "Completing clearance..." : "Complete Clearance & Approve"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 rounded-xl space-y-3">
                    <p className="text-xs text-slate-500">
                      Clearance checklist is ready to be initiated once the employment offer is accepted.
                    </p>
                    <button
                      onClick={() => startClearanceMutation.mutate()}
                      disabled={startClearanceMutation.isPending || !offer}
                      className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{startClearanceMutation.isPending ? "Starting..." : "Start Clearance Checklist"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* CARD 3: ONBOARDING & STAFF RECORD LINKING */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-[#4A7B5B]" />
                    <h3 className="font-bold text-slate-900 text-sm">Employee Onboarding & Staff Linking</h3>
                  </div>
                  {onboarding ? (
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${STATUS_COLORS[onboarding.status] || "bg-gray-100 text-gray-700"}`}>
                      {onboarding.status.replace(/_/g, " ")}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Pending Clearance</span>
                  )}
                </div>

                {/* Candidate Identity Strip for Onboarding Section */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl text-xs border border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Candidate</span>
                    <span className="font-bold text-slate-800">{app.firstName} {app.lastName || ""}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{app.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Application & Job</span>
                    <span className="font-mono font-bold text-slate-800">{app.applicationNumber}</span>
                    <span className="text-[11px] text-[#4A7B5B] font-medium block truncate">{app.vacancy?.title || "Staff Position"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
                    <span className="font-semibold text-slate-700">{app.vacancy?.department || "General"}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{app.vacancy?.vacancyCode || "VAC-GEN"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Clearance Status</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      clearance && ["COMPLETED", "FINAL_CLEARED", "HR_CLEARED"].includes(clearance.status)
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {clearance && ["COMPLETED", "FINAL_CLEARED", "HR_CLEARED"].includes(clearance.status)
                        ? "CLEARED"
                        : clearance?.status ? clearance.status.replace(/_/g, " ") : "PENDING"}
                    </span>
                  </div>
                </div>

                {onboarding ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Employee ID</span>
                        <span className="font-mono font-bold text-slate-800">{onboarding.employeeId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Email</span>
                        <span className="font-semibold text-slate-700 truncate block">{onboarding.officialEmail || app.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Mobile</span>
                        <span className="font-semibold text-slate-700">{onboarding.officialMobile || app.mobile}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Joining Date</span>
                        <span className="font-bold text-[#4A7B5B]">{safeFormatDate(onboarding.joiningDate)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Department & Role</span>
                        <span className="font-semibold text-slate-700">{onboarding.department || app.vacancy?.department} — {onboarding.designation || app.vacancy?.title}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Location & Mode</span>
                        <span className="font-semibold text-slate-700">{onboarding.workLocation || "Head Office"} ({onboarding.workMode || "ONSITE"})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Employment Type</span>
                        <span className="font-semibold text-slate-700">{onboarding.employmentType || "FULL_TIME"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Reporting Manager</span>
                        <span className="font-semibold text-slate-700">{onboarding.reportingManager || "Not assigned"}</span>
                      </div>
                    </div>

                    {onboarding.status === "COMPLETED" || ["JOINED", "ACTIVE"].includes(app.status) ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Candidate Successfully Joined & Staff Record Linked</span>
                        </div>
                        <p className="text-xs text-emerald-700 leading-relaxed">
                          The employee profile is active in Swayam Admission with Staff ID <strong>{onboarding.employeeId}</strong>. Historical applications, recruiter history, and recruitment offer logs are permanently preserved.
                        </p>
                        <div className="flex items-center gap-2 pt-1 border-t border-emerald-200/60">
                          <button
                            type="button"
                            onClick={() => resendActivationMutation.mutate()}
                            disabled={resendActivationMutation.isPending}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {resendActivationMutation.isPending ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Resending Activation Email...</span>
                              </>
                            ) : (
                              <>
                                <Mail className="w-3.5 h-3.5" />
                                <span>Resend Activation Email</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsOnboardingModalOpen(true)}
                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs"
                          >
                            Edit Onboarding Details
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setCompleteOnboardingError(null);
                            setIsCompleteOnboardingModalOpen(true);
                          }}
                          className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Complete Onboarding & Link Staff Record</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 rounded-xl space-y-3">
                    <p className="text-xs text-slate-500">
                      {clearance && ["COMPLETED", "FINAL_CLEARED", "HR_CLEARED"].includes(clearance.status)
                        ? "Clearance verified and approved! Candidate is ready for staff onboarding details."
                        : "Onboarding details can be initialized upon completion and approval of the pre-employment clearance checklist."}
                    </p>
                    <button
                      onClick={() => setIsOnboardingModalOpen(true)}
                      disabled={!clearance || !["COMPLETED", "FINAL_CLEARED", "HR_CLEARED"].includes(clearance.status)}
                      className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Start Onboarding</span>
                    </button>
                    {(!clearance || !["COMPLETED", "FINAL_CLEARED", "HR_CLEARED"].includes(clearance.status)) && (
                      <p className="text-[11px] text-amber-600 font-medium">
                        Complete and approve clearance in Section 2 above to unlock onboarding.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REASON PROMPT MODAL (for REJECT or HOLD) */}
      {reasonPrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              {reasonPrompt.label}
            </h3>
            <textarea
              rows={3}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Enter internal explanation or note for candidate record..."
              className="w-full p-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#4A7B5B]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReasonPrompt(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handlePromptSubmit}
                disabled={statusMutation.isPending}
                className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Confirm Status Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE INTERVIEW MODAL */}
      {isInterviewModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 text-base">
                Schedule Interview for {app.firstName}
              </h3>
              <button
                onClick={() => setIsInterviewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={interviewForm.interviewDate}
                    onChange={(e) =>
                      setInterviewForm({
                        ...interviewForm,
                        interviewDate: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={interviewForm.time}
                    onChange={(e) =>
                      setInterviewForm({
                        ...interviewForm,
                        time: e.target.value,
                      })
                    }
                    placeholder="e.g. 11:30 AM"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Interview Mode
                </label>
                <select
                  value={interviewForm.interviewType}
                  onChange={(e) =>
                    setInterviewForm({
                      ...interviewForm,
                      interviewType: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="ONLINE">Online (Google Meet / Zoom)</option>
                  <option value="OFFLINE">In-Person (Office / Campus)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Interviewer / Panelist
                </label>
                <select
                  value={interviewForm.interviewerId}
                  onChange={(e) =>
                    setInterviewForm({
                      ...interviewForm,
                      interviewerId: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Select Staff Panelist...</option>
                  {recruiters.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} ({r.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Meeting Link or Location
                </label>
                <input
                  type="text"
                  value={interviewForm.meetingLink}
                  onChange={(e) =>
                    setInterviewForm({
                      ...interviewForm,
                      meetingLink: e.target.value,
                    })
                  }
                  placeholder="https://meet.google.com/xyz-abc or Office Address"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Instructions / Candidate Agenda
                </label>
                <textarea
                  rows={2}
                  value={interviewForm.instructions}
                  onChange={(e) =>
                    setInterviewForm({
                      ...interviewForm,
                      instructions: e.target.value,
                    })
                  }
                  placeholder="Instructions sent to candidate in notification..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsInterviewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!interviewForm.interviewDate) {
                    toast.error("Please specify interview date");
                    return;
                  }
                  scheduleInterviewMutation.mutate(interviewForm);
                }}
                disabled={scheduleInterviewMutation.isPending}
                className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-lg shadow-sm"
              >
                {scheduleInterviewMutation.isPending
                  ? "Scheduling..."
                  : "Confirm & Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 1. CREATE / EDIT OFFER MODAL */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#4A7B5B]" />
                <h3 className="font-bold text-slate-900 text-base">
                  Generate Employment Offer for {app.firstName} {app.lastName || ""}
                </h3>
              </div>
              <button
                onClick={() => setIsOfferModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Role / Designation *</label>
                  <input
                    type="text"
                    required
                    value={offerForm.designation}
                    onChange={(e) => setOfferForm({ ...offerForm, designation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={offerForm.department}
                    onChange={(e) => setOfferForm({ ...offerForm, department: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employment Type</label>
                  <select
                    value={offerForm.employmentType}
                    onChange={(e) => setOfferForm({ ...offerForm, employmentType: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Work Mode</label>
                  <select
                    value={offerForm.workMode}
                    onChange={(e) => setOfferForm({ ...offerForm, workMode: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="ONSITE">Onsite</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Work Location</label>
                  <input
                    type="text"
                    value={offerForm.workLocation}
                    onChange={(e) => setOfferForm({ ...offerForm, workLocation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Salary / CTC (₹) *</label>
                  <input
                    type="number"
                    required
                    value={offerForm.salary}
                    onChange={(e) => setOfferForm({ ...offerForm, salary: e.target.value })}
                    placeholder="e.g. 450000"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-[#4A7B5B]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Salary Frequency</label>
                  <select
                    value={offerForm.salaryFrequency}
                    onChange={(e) => setOfferForm({ ...offerForm, salaryFrequency: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="ANNUAL">Per Annum (Annual CTC)</option>
                    <option value="MONTHLY">Per Month (Monthly Gross)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Proposed Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={offerForm.joiningDate}
                    onChange={(e) => setOfferForm({ ...offerForm, joiningDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Offer Validity / Expiry Date</label>
                  <input
                    type="date"
                    value={offerForm.validUntil}
                    onChange={(e) => setOfferForm({ ...offerForm, validUntil: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reporting Manager</label>
                <input
                  type="text"
                  value={offerForm.reportingManager}
                  onChange={(e) => setOfferForm({ ...offerForm, reportingManager: e.target.value })}
                  placeholder="e.g. Dr. Alok Kumar (Director Admissions)"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={offerForm.terms}
                  onChange={(e) => setOfferForm({ ...offerForm, terms: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Internal HR Notes</label>
                <textarea
                  rows={2}
                  value={offerForm.notes}
                  onChange={(e) => setOfferForm({ ...offerForm, notes: e.target.value })}
                  placeholder="Confidential remarks for recruitment records..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendImmediately"
                  checked={offerForm.sendImmediately}
                  onChange={(e) => setOfferForm({ ...offerForm, sendImmediately: e.target.checked })}
                  className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                />
                <label htmlFor="sendImmediately" className="text-xs text-emerald-900 font-semibold cursor-pointer">
                  Send offer immediately upon generation (Dispatches In-App, Email & WhatsApp)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsOfferModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!offerForm.designation || !offerForm.department || !offerForm.salary) {
                    toast.error("Please fill in role, department and salary");
                    return;
                  }
                  createOfferMutation.mutate(offerForm);
                }}
                disabled={createOfferMutation.isPending}
                className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-lg shadow-sm"
              >
                {createOfferMutation.isPending ? "Generating..." : offerForm.sendImmediately ? "Generate & Send Offer" : "Save Offer Draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DECLINE REASON MODAL */}
      {isDeclinePromptOpen && offer && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 text-base">Record Candidate Decline</h3>
            </div>
            <p className="text-xs text-slate-500">
              A mandatory reason must be captured when an employment offer is marked declined.
            </p>
            <textarea
              rows={3}
              required
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Higher counter-offer received / Relocation constraints..."
              className="w-full p-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeclinePromptOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!declineReason.trim()) {
                    toast.error("A reason is mandatory when declining an offer");
                    return;
                  }
                  respondOfferMutation.mutate({
                    offerId: offer.id,
                    action: "DECLINE",
                    reason: declineReason.trim(),
                  });
                }}
                disabled={respondOfferMutation.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                {respondOfferMutation.isPending ? "Recording..." : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. REVIEW CLEARANCE CHECKLIST ITEM MODAL */}
      {reviewItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 text-base">
                Verify: {reviewItem.title}
              </h3>
              <button
                onClick={() => setReviewItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Verification Status *</label>
                <select
                  value={reviewForm.status}
                  onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="VERIFIED">Verified & Approved</option>
                  <option value="IN_REVIEW">Under Review / In Progress</option>
                  <option value="PENDING">Pending Verification</option>
                  <option value="FAILED">Verification Failed (Reason Required)</option>
                  <option value="NOT_REQUIRED">Not Required / Waived</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">HR Review Remarks</label>
                <textarea
                  rows={2}
                  value={reviewForm.remarks}
                  onChange={(e) => setReviewForm({ ...reviewForm, remarks: e.target.value })}
                  placeholder="e.g. Aadhaar card verified against DigiLocker portal."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              {reviewForm.status === "FAILED" && (
                <div>
                  <label className="block text-rose-700 font-semibold mb-1">Mandatory Failure Reason *</label>
                  <textarea
                    rows={2}
                    required
                    value={reviewForm.failureReason}
                    onChange={(e) => setReviewForm({ ...reviewForm, failureReason: e.target.value })}
                    placeholder="Explain discrepancy or why verification failed..."
                    className="w-full p-2 border border-rose-300 bg-rose-50/50 rounded-lg text-rose-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Supporting Reference / Document URL</label>
                <input
                  type="text"
                  value={reviewForm.documentUrl}
                  onChange={(e) => setReviewForm({ ...reviewForm, documentUrl: e.target.value })}
                  placeholder="https://... or certificate ID"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setReviewItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (reviewForm.status === "FAILED" && !reviewForm.failureReason.trim()) {
                    toast.error("A failure reason is mandatory when marking verification as FAILED");
                    return;
                  }
                  updateClearanceItemMutation.mutate({
                    itemId: reviewItem.id,
                    payload: reviewForm,
                  });
                }}
                disabled={updateClearanceItemMutation.isPending}
                className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-lg shadow-sm"
              >
                {updateClearanceItemMutation.isPending ? "Saving..." : "Save Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. START ONBOARDING MODAL */}
      {isOnboardingModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#4A7B5B]" />
                <h3 className="font-bold text-slate-900 text-base">
                  {onboarding ? "Update Employee Onboarding" : "Initialize Employee Onboarding"}
                </h3>
              </div>
              <button
                onClick={() => setIsOnboardingModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Candidate Identity Strip in Onboarding Modal */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Candidate Name</span>
                <span className="font-bold text-slate-900">{app.firstName} {app.lastName || ""}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Application ID</span>
                <span className="font-mono font-bold text-slate-800">{app.applicationNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Vacancy / Job Role</span>
                <span className="font-semibold text-slate-800">{app.vacancy?.title || "Staff Position"} ({app.vacancy?.vacancyCode || "VAC"})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Recruiter</span>
                <span className="font-medium text-slate-700">{app.recruiter?.fullName || "Not assigned"}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employee / Staff ID *</label>
                  <input
                    type="text"
                    required
                    value={onboardingForm.employeeId}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, employeeId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={onboardingForm.joiningDate}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, joiningDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Official Email</label>
                  <input
                    type="email"
                    value={onboardingForm.officialEmail}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, officialEmail: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Official Mobile</label>
                  <input
                    type="tel"
                    value={onboardingForm.officialMobile}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, officialMobile: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={onboardingForm.department}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, department: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Designation</label>
                  <input
                    type="text"
                    value={onboardingForm.designation}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, designation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Work Location</label>
                  <input
                    type="text"
                    value={onboardingForm.workLocation}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, workLocation: e.target.value })}
                    placeholder="Head Office"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Work Mode</label>
                  <select
                    value={onboardingForm.workMode}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, workMode: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="ONSITE">On-site</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employment Type</label>
                  <select
                    value={onboardingForm.employmentType}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, employmentType: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reporting Manager</label>
                <input
                  type="text"
                  value={onboardingForm.reportingManager}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, reportingManager: e.target.value })}
                  placeholder="e.g. Head of Admissions"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Onboarding Notes</label>
                <textarea
                  rows={2}
                  value={onboardingForm.notes}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, notes: e.target.value })}
                  placeholder="Orientation date, equipment allocation..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsOnboardingModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!onboardingForm.employeeId) {
                    toast.error("Employee ID is required");
                    return;
                  }
                  startOnboardingMutation.mutate(onboardingForm);
                }}
                disabled={startOnboardingMutation.isPending}
                className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-60"
              >
                {startOnboardingMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Initializing onboarding...</span>
                  </>
                ) : (
                  <span>{onboarding ? "Save Onboarding Details" : "Start Onboarding"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. COMPLETE ONBOARDING & LINK STAFF MODAL */}
      {isCompleteOnboardingModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-slate-900 text-base">Complete Onboarding & Link Staff</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCompleteOnboardingModalOpen(false);
                  setCompleteOnboardingError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action links <strong>{app.firstName} {app.lastName || ""}</strong> to the system Staff/User directory, sets recruitment status to <strong>JOINED</strong>, and dispatches an account activation invitation.
            </p>

            {/* Candidate & Account Identity Preview */}
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-500">Candidate:</span>
                <span className="font-semibold text-slate-900">{app.firstName} {app.lastName || ""}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-500">Official / Linked Email:</span>
                <span className="font-semibold text-emerald-800 font-mono text-[11px]">{onboarding?.officialEmail || app.email}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-500">Designation & Department:</span>
                <span className="font-medium text-slate-800">
                  {onboarding?.designation || offer?.designation || app.vacancy?.title || "Staff Member"} • {onboarding?.department || offer?.department || "General"}
                </span>
              </div>
            </div>

            {/* Passwordless Security Notice */}
            <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl text-[11px] text-blue-800 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Passwordless Activation Security</span>
                A secure single-use activation link (valid for 24h) will be emailed to <strong className="font-mono text-blue-900">{onboarding?.officialEmail || app.email}</strong>. No temporary passwords are used; the employee securely sets their own password upon first sign-in.
              </div>
            </div>

            {/* Candidate Already Linked / Completed Status Banner */}
            {(app.status === "JOINED" || onboarding?.status === "COMPLETED") && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Candidate Already Linked (Status: JOINED)</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                    {onboarding?.employeeId || (app as any)?.user?.employeeId || completeOnboardingForm.employeeId}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  This candidate has already been linked to the staff directory. You can resend their passwordless activation email anytime below.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => resendActivationMutation.mutate()}
                    disabled={resendActivationMutation.isPending}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
                  >
                    {resendActivationMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Resending Link...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Resend Activation Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Inline Error Alert */}
            {completeOnboardingError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block mb-0.5">Action Status</span>
                    <span>{completeOnboardingError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompleteOnboardingError(null)}
                    className="text-red-400 hover:text-red-700 font-bold ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-red-200/60">
                  <button
                    type="button"
                    onClick={handleReconcileStatus}
                    disabled={isReconciling}
                    className="px-2.5 py-1 bg-white hover:bg-red-100/50 text-red-800 border border-red-300 rounded-lg font-semibold text-[11px] inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isReconciling ? "animate-spin" : ""}`} />
                    <span>{isReconciling ? "Checking Server..." : "Check Server Status"}</span>
                  </button>
                  {(app.status === "JOINED" || onboarding?.status === "COMPLETED") && (
                    <button
                      type="button"
                      onClick={() => resendActivationMutation.mutate()}
                      disabled={resendActivationMutation.isPending}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Mail className="w-3 h-3" />
                      <span>{resendActivationMutation.isPending ? "Resending..." : "Resend Activation Email"}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={completeOnboardingForm.employeeId}
                  onChange={(e) => {
                    setCompleteOnboardingError(null);
                    setCompleteOnboardingForm({ ...completeOnboardingForm, employeeId: e.target.value });
                  }}
                  placeholder="e.g. SWY-EMP-2026-1001"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Unique identifier (4-30 alphanumeric characters, hyphens or underscores).
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Assigned System Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={completeOnboardingForm.role}
                  onChange={(e) => {
                    setCompleteOnboardingError(null);
                    setCompleteOnboardingForm({ ...completeOnboardingForm, role: e.target.value });
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                >
                  <option value="COUNSELOR">Counselor (Admissions Portal)</option>
                  <option value="SENIOR_COUNSELOR">Senior Counselor (Admissions Portal)</option>
                  <option value="ACCOUNTS_MANAGER">Accounts Manager (Finance / ERP)</option>
                  <option value="MARKETING_TEAM">Marketing Team (ERP Portal)</option>
                  <option value="CONTENT_MANAGER">Content Manager (ERP Portal)</option>
                  <option value="ADMIN">System Administrator (Admin Portal)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Completion Notes</label>
                <textarea
                  rows={2}
                  value={completeOnboardingForm.notes}
                  onChange={(e) => setCompleteOnboardingForm({ ...completeOnboardingForm, notes: e.target.value })}
                  placeholder="Optional audit or onboarding completion notes..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                />
              </div>
            </div>

            <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsCompleteOnboardingModalOpen(false);
                  setCompleteOnboardingError(null);
                }}
                disabled={completeOnboardingMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCompleteOnboarding}
                disabled={completeOnboardingMutation.isPending}
                className="px-5 py-2.5 bg-[#4A7B5B] hover:bg-[#3D664A] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                {completeOnboardingMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Completing & Activating...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Confirm & Activate Employee</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
