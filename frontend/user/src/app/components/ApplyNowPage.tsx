import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  IndianRupee,
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  Bot,
  MessageCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Gift,
} from "lucide-react";
import { leadsApi } from "../../api/leads.api";
import { applicationsApi } from "../../api/applications.api";
import { geographyApi, StateItem, DistrictItem } from "../../api/geography.api";
import { coursesApi, Course, CourseBranch } from "../../api/courses.api";
import { collegesApi, College } from "../../api/colleges.api";
import {
  EDUCATION_LEVELS,
  STREAMS,
  BUDGET_OPTIONS,
  getDynamicPassingYears,
  getStreamsForEducationLevel,
} from "../../constants/academic.constants";
import { referralApi } from "../../api/referral.api";
import { useAuth as useAuthContext } from "../../context/AuthContext";

const STEPS = [
  { num: 1, label: "Basic Info", icon: User },
  { num: 2, label: "Preferences", icon: BookOpen },
  { num: 3, label: "College Choice", icon: Building2 },
  { num: 4, label: "Done!", icon: CheckCircle2 },
];

export default function ApplyNowPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { user, isLoggedIn } = useAuthContext();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdApplication, setCreatedApplication] = useState<any>(null);
  const [referralInfo, setReferralInfo] = useState<{
    code: string;
    referrerName?: string;
    valid: boolean;
  } | null>(null);

  useEffect(() => {
    const refCode = searchParams.get("ref") || searchParams.get("referralCode") || searchParams.get("referral");
    if (refCode) {
      referralApi.validateCode(refCode).then((res) => {
        if (res && res.valid && res.code) {
          setReferralInfo({
            code: res.code,
            referrerName: res.referrerName || "Verified Student Ambassador",
            valid: true,
          });
        }
      }).catch(() => {});
    }
  }, [searchParams]);

  // Dynamic Passing Years
  const passingYears = getDynamicPassingYears();

  // Form State
  const [form, setForm] = useState({
    // Step 1: Basic Info & Academic Profile
    name: "",
    mobile: "",
    email: "",
    educationLevel: "",
    passingYear: String(new Date().getFullYear()),
    stream: "",

    // Step 2: Geographic & Academic Preferences
    stateId: "",
    state: "",
    districtId: "",
    district: "",
    courseId: "",
    course: "",
    customCourseText: "",
    branchId: "",
    branch: "",
    customBranchText: "",
    budget: "",

    // Step 3: College Choice & Consent
    city: "",
    collegeId: "",
    college: "",
    preferredCollegeText: "",
    isCustomCollege: false,
    message: "",
    hasConsent: false, // STRICT SAFEGUARD: Defaults to false!
    whatsappConsent: false,
    smsConsent: false,
  });

  useEffect(() => {
    if (user && isLoggedIn) {
      const u = user as any;
      setForm((prev) => ({
        ...prev,
        name: prev.name || u.fullName || "",
        mobile: prev.mobile || u.mobile || "",
        email: prev.email || u.email || "",
        educationLevel: prev.educationLevel || u.profile?.highestQualification || "",
        state: prev.state || u.profile?.state || u.state || "",
        district: prev.district || u.profile?.district || "",
      }));
    }
  }, [user, isLoggedIn]);

  // ── 1. Fetch States (Remote Field Lifecycle) ────────────────────────────────
  const {
    data: states = [],
    isLoading: isStatesLoading,
    isError: isStatesError,
    refetch: refetchStates,
  } = useQuery({
    queryKey: ["public_states"],
    queryFn: geographyApi.getStates,
    staleTime: 1000 * 60 * 15,
  });

  // ── 2. Fetch Dependent Districts (Resets when State changes) ─────────────────
  const {
    data: districts = [],
    isLoading: isDistrictsLoading,
    isError: isDistrictsError,
    refetch: refetchDistricts,
  } = useQuery({
    queryKey: ["public_districts", form.stateId],
    queryFn: () => geographyApi.getDistricts(form.stateId),
    enabled: !!form.stateId,
    staleTime: 1000 * 60 * 15,
  });

  // ── 3. Fetch Database-Driven Courses (Filtered by Education Level & Stream) ──
  const {
    data: coursesData,
    isLoading: isCoursesLoading,
    isError: isCoursesError,
    refetch: refetchCourses,
  } = useQuery({
    queryKey: [
      "public_courses_lead_form",
      form.educationLevel,
      form.stream,
    ],
    queryFn: () =>
      coursesApi.findAll({
        educationLevel: form.educationLevel || undefined,
        stream:
          form.stream &&
          form.stream !== "Not Applicable" &&
          form.stream !== "Other"
            ? form.stream
            : undefined,
        status: "PUBLISHED",
        limit: 100,
      }),
    staleTime: 1000 * 60 * 15,
  });

  // Normalize courses array
  const courses: Course[] = coursesData?.data || [];

  // ── 3b. Fetch Dependent Branches / Specializations for Selected Course ──────
  const {
    data: branchResponse,
    isLoading: isBranchesLoading,
    isError: isBranchesError,
    refetch: refetchBranches,
  } = useQuery({
    queryKey: ["public_branches_for_course", form.courseId],
    queryFn: () => coursesApi.getBranches(form.courseId),
    enabled: !!form.courseId && form.courseId !== "OTHER",
    staleTime: 1000 * 60 * 15,
  });

  const branches = branchResponse?.data || [];
  const selectedCourseObj = courses.find((c) => c.id === form.courseId);
  const allowOtherBranch =
    branchResponse?.allowOtherBranch ??
    selectedCourseObj?.allowOtherBranch ??
    true;

  // ── 4. Fetch Colleges (Optional selection in Step 3) ─────────────────────────
  const {
    data: collegesData,
    isLoading: isCollegesLoading,
    isError: isCollegesError,
    refetch: refetchColleges,
  } = useQuery({
    queryKey: ["public_colleges_lead_form"],
    queryFn: () => collegesApi.findAll({ limit: 60 }),
    staleTime: 1000 * 60 * 15,
  });

  const colleges: College[] = Array.isArray(collegesData?.data)
    ? (collegesData?.data as College[])
    : Array.isArray(collegesData)
    ? (collegesData as unknown as College[])
    : [];

  // Auto-adjust Stream when Education Level is 10th
  useEffect(() => {
    if (form.educationLevel === "10th" && form.stream !== "Not Applicable") {
      setForm((prev) => ({ ...prev, stream: "Not Applicable" }));
    }
  }, [form.educationLevel, form.stream]);

  // Revalidate selected course if education level or stream changes
  useEffect(() => {
    if (form.courseId && form.courseId !== "OTHER" && courses.length > 0) {
      const stillEligible = courses.some((c) => c.id === form.courseId);
      if (!stillEligible) {
        setForm((prev) => ({
          ...prev,
          courseId: "",
          course: "",
          customCourseText: "",
          branchId: "",
          branch: "",
          customBranchText: "",
        }));
      }
    }
  }, [courses, form.courseId]);

  // Revalidate selected branch if available branches change
  useEffect(() => {
    if (form.branchId && form.branchId !== "OTHER" && branches.length > 0) {
      const stillValidBranch = branches.some((b) => b.id === form.branchId);
      if (!stillValidBranch) {
        setForm((prev) => ({
          ...prev,
          branchId: "",
          branch: "",
          customBranchText: "",
        }));
      }
    }
  }, [branches, form.branchId]);

  const update = (key: string, val: any) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Education Level Change Handler with cascade reset
  const handleEducationLevelChange = (selectedLevel: string) => {
    setForm((prev) => ({
      ...prev,
      educationLevel: selectedLevel,
      stream: selectedLevel === "10th" ? "Not Applicable" : "",
      courseId: "",
      course: "",
      customCourseText: "",
      branchId: "",
      branch: "",
      customBranchText: "",
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.educationLevel;
      delete next.stream;
      delete next.courseId;
      delete next.customCourseText;
      delete next.branchId;
      delete next.customBranchText;
      return next;
    });
  };

  // Stream Change Handler with course & branch reset
  const handleStreamChange = (selectedStream: string) => {
    setForm((prev) => ({
      ...prev,
      stream: selectedStream,
      courseId: "",
      course: "",
      customCourseText: "",
      branchId: "",
      branch: "",
      customBranchText: "",
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.stream;
      delete next.courseId;
      delete next.customCourseText;
      delete next.branchId;
      delete next.customBranchText;
      return next;
    });
  };

  // State Change Handler with strict District Reset
  const handleStateChange = (selectedStateId: string) => {
    const selectedState = states.find((s: StateItem) => s.id === selectedStateId);
    setForm((prev) => ({
      ...prev,
      stateId: selectedStateId,
      state: selectedState ? selectedState.name : "",
      districtId: "", // Strict reset
      district: "", // Strict reset
    }));
    if (errors.stateId || errors.districtId) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.stateId;
        delete next.districtId;
        return next;
      });
    }
  };

  // District Change Handler
  const handleDistrictChange = (selectedDistrictId: string) => {
    const selectedDistrict = districts.find((d: DistrictItem) => d.id === selectedDistrictId);
    setForm((prev) => ({
      ...prev,
      districtId: selectedDistrictId,
      district: selectedDistrict ? selectedDistrict.name : "",
    }));
    if (errors.districtId) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.districtId;
        return next;
      });
    }
  };

  // Course Change Handler
  const handleCourseChange = (selectedCourseId: string) => {
    if (selectedCourseId === "OTHER") {
      setForm((prev) => ({
        ...prev,
        courseId: "OTHER",
        course: prev.customCourseText || "Other",
        branchId: "",
        branch: "",
        customBranchText: "",
      }));
    } else {
      const selectedCourse = courses.find((c: Course) => c.id === selectedCourseId);
      setForm((prev) => ({
        ...prev,
        courseId: selectedCourseId,
        course: selectedCourse ? selectedCourse.name : "",
        customCourseText: "",
        branchId: "",
        branch: "",
        customBranchText: "",
      }));
    }
    if (
      errors.courseId ||
      errors.customCourseText ||
      errors.branchId ||
      errors.customBranchText
    ) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.courseId;
        delete next.customCourseText;
        delete next.branchId;
        delete next.customBranchText;
        return next;
      });
    }
  };

  // Branch Change Handler
  const handleBranchChange = (selectedBranchId: string) => {
    if (selectedBranchId === "OTHER") {
      setForm((prev) => ({
        ...prev,
        branchId: "OTHER",
        branch: prev.customBranchText || "Other",
      }));
    } else {
      const selectedBr = branches.find((b: CourseBranch) => b.id === selectedBranchId);
      setForm((prev) => ({
        ...prev,
        branchId: selectedBranchId,
        branch: selectedBr ? selectedBr.name : "",
        customBranchText: "",
      }));
    }
    if (errors.branchId || errors.customBranchText) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.branchId;
        delete next.customBranchText;
        return next;
      });
    }
  };

  // College Change Handler (Preferred college is optional)
  const handleCollegeChange = (selectedCollegeId: string) => {
    if (selectedCollegeId === "CUSTOM") {
      setForm((prev) => ({
        ...prev,
        isCustomCollege: true,
        collegeId: "",
        college: "",
      }));
    } else if (!selectedCollegeId || selectedCollegeId === "OPEN") {
      setForm((prev) => ({
        ...prev,
        isCustomCollege: false,
        collegeId: "",
        college: "",
        preferredCollegeText: "",
      }));
    } else {
      const selectedCol = colleges.find((c: College) => c.id === selectedCollegeId);
      setForm((prev) => ({
        ...prev,
        isCustomCollege: false,
        collegeId: selectedCollegeId,
        college: selectedCol ? selectedCol.name : "",
        preferredCollegeText: "",
      }));
    }
  };

  // Step Validation
  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!form.name.trim()) {
        newErrors.name = "Full name is required";
      }
      const cleanMobile = form.mobile.trim().replace(/\D/g, "");
      if (!cleanMobile) {
        newErrors.mobile = "Mobile number is required";
      } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        newErrors.mobile = "Enter a valid 10-digit Indian mobile number (e.g. 9876543210)";
      }

      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        newErrors.email = "Please enter a valid email address";
      }

      if (!form.educationLevel) {
        newErrors.educationLevel = "Please select your current education level";
      }

      if (!form.passingYear) {
        newErrors.passingYear = "Please select your passing year";
      }

      if (!form.stream && form.educationLevel !== "10th") {
        newErrors.stream = "Please select your stream";
      }
    }

    if (currentStep === 2) {
      if (!form.stateId) {
        newErrors.stateId = "Please select your state";
      }
      if (!form.districtId) {
        newErrors.districtId = "Please select your district";
      }
      if (!form.courseId) {
        newErrors.courseId = "Please select an interested course";
      } else if (form.courseId === "OTHER" && !form.customCourseText.trim()) {
        newErrors.customCourseText = "Please specify your course name";
      }
      if (form.branchId === "OTHER" && !form.customBranchText.trim()) {
        newErrors.customBranchText = "Please specify your branch/specialization";
      }
      if (!form.budget) {
        newErrors.budget = "Please select your annual budget range";
      }
    }

    if (currentStep === 3) {
      if (!form.hasConsent) {
        newErrors.hasConsent = "You must give consent to receive counseling calls & messages";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    try {
      const isOtherCourse = form.courseId === "OTHER";
      const finalCourseId = isOtherCourse ? undefined : (form.courseId || undefined);
      const finalCourseName = isOtherCourse
        ? form.customCourseText.trim()
        : form.course || undefined;

      const isOtherBranch = form.branchId === "OTHER";
      const finalBranchId = isOtherBranch ? undefined : (form.branchId || undefined);
      const finalBranchName = isOtherBranch
        ? form.customBranchText.trim()
        : (form.branch || undefined);
      const finalCustomBranchText = isOtherBranch
        ? form.customBranchText.trim()
        : undefined;

      // 1. Submit Structured Lead to CRM
      await leadsApi.create({
        fullName: form.name.trim(),
        mobile: form.mobile.trim().replace(/\D/g, "").slice(-10),
        email: form.email.trim() || undefined,
        educationLevel: form.educationLevel || undefined,
        passingYear: form.passingYear ? parseInt(form.passingYear, 10) : undefined,
        stream: form.stream || undefined,
        stateId: form.stateId || undefined,
        districtId: form.districtId || undefined,
        state: form.state || undefined,
        district: form.district || undefined,
        city: form.city?.trim() || undefined,
        courseId: finalCourseId,
        preferredCourse: finalCourseName,
        branchId: finalBranchId,
        preferredBranch: finalBranchName,
        customBranchText: finalCustomBranchText,
        collegeId: form.collegeId || undefined,
        preferredCollege: form.college || undefined,
        preferredCollegeText: form.preferredCollegeText?.trim() || undefined,
        budget: form.budget || undefined,
        message: form.message?.trim() || undefined,
        hasConsent: form.hasConsent,
        whatsappConsent: form.whatsappConsent,
        smsConsent: form.smsConsent,
        source: referralInfo?.valid ? "REFERRAL" : "WEBSITE",
        referralCode: referralInfo?.valid ? referralInfo.code : undefined,
        campaign: form.budget
          ? `Budget: ${form.budget} | Level: ${form.educationLevel || "N/A"}`
          : undefined,
      });

      // 2. Safe Application Invalidation / Creation for logged-in students
      try {
        const appRes = await applicationsApi.create({
          collegeId: form.collegeId || undefined,
          collegeName: form.college || form.preferredCollegeText || undefined,
          courseId: finalCourseId,
          courseName: finalCourseName,
          branchName: finalBranchName,
          branchId: finalBranchId,
          fullName: form.name.trim(),
          mobile: form.mobile.trim().replace(/\D/g, "").slice(-10),
          email: form.email.trim() || undefined,
          state: form.state || undefined,
          stateId: form.stateId || undefined,
          district: form.district || undefined,
          districtId: form.districtId || undefined,
          educationLevel: form.educationLevel || undefined,
          stream: form.stream || undefined,
          passingYear: form.passingYear ? String(form.passingYear) : undefined,
          preferredCollege: form.college || form.preferredCollegeText || undefined,
          preferredCity: form.city?.trim() || undefined,
          remarks: form.message || undefined,
        });
        const appObj = (appRes as any)?.data?.data || (appRes as any)?.data?.application || (appRes as any)?.data;
        if (appObj) {
          setCreatedApplication(appObj);
        }
        await queryClient.invalidateQueries({ queryKey: ["myApplications"] });
        await queryClient.invalidateQueries({ queryKey: ["applications_quota"] });
        await queryClient.invalidateQueries({ queryKey: ["journey"] });
        await queryClient.invalidateQueries({ queryKey: ["user_me"] });
      } catch (appErr) {
        console.warn("Application sync log:", appErr);
      }

      setStep(4);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        "Failed to submit application. Please check your inputs and try again.";
      setErrors({ submit: Array.isArray(msg) ? msg.join(", ") : msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setErrors({});
    setForm({
      name: "",
      mobile: "",
      email: "",
      educationLevel: "",
      passingYear: String(new Date().getFullYear()),
      stream: "",
      stateId: "",
      state: "",
      districtId: "",
      district: "",
      courseId: "",
      course: "",
      customCourseText: "",
      branchId: "",
      branch: "",
      customBranchText: "",
      budget: "",
      city: "",
      collegeId: "",
      college: "",
      preferredCollegeText: "",
      isCustomCollege: false,
      message: "",
      hasConsent: false,
      whatsappConsent: false,
      smsConsent: false,
    });
  };

  const inputCls =
    "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B] focus:ring-2 focus:ring-[#4A7B5B]/10 transition-all text-slate-800";
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1.5";

  return (
    <div style={{ backgroundColor: "#F8FAFC" }} className="min-h-screen py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#E8F3EC] rounded-full mb-4">
            <Sparkles size={13} className="text-[#4A7B5B]" />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#4A7B5B" }}>
              Free Admission & Career Guidance
            </span>
          </div>
          <h1
            style={{
              fontWeight: 800,
              color: "#0F172A",
              fontSize: "clamp(24px,4vw,32px)",
            }}
          >
            Apply for Admission
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b" }} className="mt-2">
            Get expert counseling, verified college choices, and admission assistance in 4 simple steps
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-200 -z-0">
            <div
              className="h-full bg-[#4A7B5B] transition-all duration-500"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
          </div>
          {STEPS.map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-1.5 z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  step > s.num
                    ? "bg-[#4A7B5B]"
                    : step === s.num
                    ? "bg-[#4A7B5B] ring-4 ring-[#4A7B5B]/20"
                    : "bg-white border-2 border-gray-200"
                }`}
              >
                {step > s.num ? (
                  <CheckCircle2 size={18} className="text-white" />
                ) : (
                  <s.icon
                    size={16}
                    className={step === s.num ? "text-white" : "text-gray-400"}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: step === s.num ? 700 : 400,
                  color: step === s.num ? "#4A7B5B" : step > s.num ? "#4A7B5B" : "#94a3b8",
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Referral Welcome Banner */}
        {referralInfo?.valid && (
          <div className="mb-6 p-4 bg-[#E8F3EC] border border-[#4A7B5B]/30 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#4A7B5B] text-white">
                <Gift className="w-5 h-5 text-[#F0AE1A]" />
              </div>
              <div>
                <p className="font-bold text-[#0F172A] text-sm">Referred by {referralInfo.referrerName}</p>
                <p className="text-[11px] text-[#4A7B5B] font-mono font-semibold">Referral Code: {referralInfo.code} (Active)</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#4A7B5B] text-white font-bold text-[10px] tracking-wide uppercase shrink-0">
              ✓ Verified Referral
            </span>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-7">
            {/* ── STEP 1: Basic Info & Academic Profile ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2
                    style={{ fontWeight: 700, color: "#0F172A", fontSize: "20px" }}
                    className="mb-1"
                  >
                    Basic Information & Academic Profile
                  </h2>
                  <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                    Tell us about your background so counselors can recommend eligible programs
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <label className={labelCls}>
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="e.g. Rahul Kumar"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      className={`${inputCls} pl-10 ${
                        errors.name ? "border-red-400 focus:border-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.name}
                    </p>
                  )}
                </div>

                {/* Mobile & Email Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={form.mobile}
                        onChange={(e) => update("mobile", e.target.value)}
                        className={`${inputCls} pl-10 ${
                          errors.mobile ? "border-red-400 focus:border-red-500" : ""
                        }`}
                      />
                    </div>
                    {errors.mobile && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.mobile}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>
                      Email Address <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Mail
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="email"
                        placeholder="your.email@example.com"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        className={`${inputCls} pl-10 ${
                          errors.email ? "border-red-400 focus:border-red-500" : ""
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Education Level, Passing Year & Stream Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className={labelCls}>
                      Education Level <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <GraduationCap
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                      <select
                        value={form.educationLevel}
                        onChange={(e) => handleEducationLevelChange(e.target.value)}
                        className={`${inputCls} pl-9 appearance-none ${
                          errors.educationLevel ? "border-red-400" : ""
                        }`}
                      >
                        <option value="">Select Level</option>
                        {EDUCATION_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.educationLevel && (
                      <p className="text-[11px] text-red-500 mt-1">{errors.educationLevel}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>
                      Passing Year <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                      <select
                        value={form.passingYear}
                        onChange={(e) => update("passingYear", e.target.value)}
                        className={`${inputCls} pl-9 appearance-none ${
                          errors.passingYear ? "border-red-400" : ""
                        }`}
                      >
                        {passingYears.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.passingYear && (
                      <p className="text-[11px] text-red-500 mt-1">{errors.passingYear}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>
                      Stream{" "}
                      {form.educationLevel === "10th" ? (
                        <span className="text-gray-400 font-normal">(N/A)</span>
                      ) : (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <Layers
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                      <select
                        disabled={form.educationLevel === "10th"}
                        value={form.stream}
                        onChange={(e) => handleStreamChange(e.target.value)}
                        className={`${inputCls} pl-9 appearance-none disabled:bg-gray-100 disabled:text-gray-400 ${
                          errors.stream ? "border-red-400" : ""
                        }`}
                      >
                        <option value="">Select Stream</option>
                        {getStreamsForEducationLevel(form.educationLevel).map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.stream && (
                      <p className="text-[11px] text-red-500 mt-1">{errors.stream}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Geographic & Academic Preferences ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2
                    style={{ fontWeight: 700, color: "#0F172A", fontSize: "20px" }}
                    className="mb-1"
                  >
                    Your Preferences & Location
                  </h2>
                  <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                    Select your state, district, and course to connect with your regional counselor
                  </p>
                </div>

                {/* State & District (Dependent Dropdown) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* State Dropdown */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={labelCls + " mb-0"}>
                        State <span className="text-red-500">*</span>
                      </label>
                      {isStatesError && (
                        <button
                          type="button"
                          onClick={() => refetchStates()}
                          className="text-[11px] text-[#4A7B5B] flex items-center gap-1 font-semibold hover:underline"
                        >
                          <RefreshCw size={10} /> Retry
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <MapPin
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                      <select
                        disabled={isStatesLoading}
                        value={form.stateId}
                        onChange={(e) => handleStateChange(e.target.value)}
                        className={`${inputCls} pl-10 appearance-none ${
                          errors.stateId ? "border-red-400" : ""
                        }`}
                      >
                        <option value="">
                          {isStatesLoading
                            ? "Loading states..."
                            : isStatesError
                            ? "Unable to load states (Click Retry)"
                            : states.length === 0
                            ? "No states available"
                            : "Select your State"}
                        </option>
                        {states.map((st: StateItem) => (
                          <option key={st.id} value={st.id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.stateId && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.stateId}
                      </p>
                    )}
                  </div>

                  {/* District Dropdown (Strictly depends on selected State) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={labelCls + " mb-0"}>
                        District <span className="text-red-500">*</span>
                      </label>
                      {isDistrictsError && form.stateId && (
                        <button
                          type="button"
                          onClick={() => refetchDistricts()}
                          className="text-[11px] text-[#4A7B5B] flex items-center gap-1 font-semibold hover:underline"
                        >
                          <RefreshCw size={10} /> Retry
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <MapPin
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                      <select
                        disabled={!form.stateId || isDistrictsLoading}
                        value={form.districtId}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className={`${inputCls} pl-10 appearance-none disabled:bg-gray-100 disabled:text-gray-400 ${
                          errors.districtId ? "border-red-400" : ""
                        }`}
                      >
                        <option value="">
                          {!form.stateId
                            ? "← Select State first"
                            : isDistrictsLoading
                            ? "Loading districts..."
                            : isDistrictsError
                            ? "Failed to load districts"
                            : districts.length === 0
                            ? "No districts found for this state"
                            : "Select your District"}
                        </option>
                        {districts.map((dst: DistrictItem) => (
                          <option key={dst.id} value={dst.id}>
                            {dst.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.districtId && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.districtId}
                      </p>
                    )}
                  </div>
                </div>

                {/* Database-Driven Interested Course Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelCls + " mb-0"}>
                      Interested Course <span className="text-red-500">*</span>
                    </label>
                    {isCoursesError && (
                      <button
                        type="button"
                        onClick={() => refetchCourses()}
                        className="text-[11px] text-[#4A7B5B] flex items-center gap-1 font-semibold hover:underline"
                      >
                        <RefreshCw size={10} /> Retry
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <BookOpen
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <select
                      disabled={isCoursesLoading}
                      value={form.courseId}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      className={`${inputCls} pl-10 appearance-none ${
                        errors.courseId ? "border-red-400" : ""
                      }`}
                    >
                      <option value="">
                        {isCoursesLoading
                          ? "Loading courses..."
                          : isCoursesError
                          ? "Unable to load courses (Click Retry)"
                          : courses.length === 0
                          ? "No courses found for selected eligibility"
                          : "Select your desired Course / Program"}
                      </option>
                      {courses.map((crs: Course) => (
                        <option key={crs.id} value={crs.id}>
                          {crs.name} {crs.level ? `(${crs.level})` : ""}
                        </option>
                      ))}
                      <option value="OTHER">Other (Specify below)</option>
                    </select>
                  </div>
                  {errors.courseId && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.courseId}
                    </p>
                  )}

                  {/* Custom Course Name Input when "Other" is selected */}
                  {form.courseId === "OTHER" && (
                    <div className="mt-3">
                      <label className={labelCls}>
                        Please specify your course <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. B.Tech in Aerospace Engineering, Merchant Navy, Fine Arts..."
                        value={form.customCourseText}
                        onChange={(e) => {
                          update("customCourseText", e.target.value);
                          update("course", e.target.value);
                        }}
                        className={`${inputCls} ${
                          errors.customCourseText ? "border-red-400 focus:border-red-500" : ""
                        }`}
                      />
                      {errors.customCourseText && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {errors.customCourseText}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Database-Driven Branch / Specialization Dropdown (Only when course has branches) */}
                {form.courseId && form.courseId !== "OTHER" && branches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={labelCls + " mb-0"}>
                        Branch / Specialization{" "}
                        <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      {isBranchesError && (
                        <button
                          type="button"
                          onClick={() => refetchBranches()}
                          className="text-[11px] text-[#4A7B5B] flex items-center gap-1 font-semibold hover:underline"
                        >
                          <RefreshCw size={10} /> Retry
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Layers
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                      <select
                        disabled={isBranchesLoading}
                        value={form.branchId}
                        onChange={(e) => handleBranchChange(e.target.value)}
                        className={`${inputCls} pl-10 appearance-none ${
                          errors.branchId ? "border-red-400" : ""
                        }`}
                      >
                        <option value="">
                          {isBranchesLoading
                            ? "Loading specializations..."
                            : isBranchesError
                            ? "Unable to load specializations"
                            : branches.length === 0
                            ? "No specialization required for this program (General)"
                            : "Select Branch / Specialization (Optional)"}
                        </option>
                        {branches.map((br: CourseBranch) => (
                          <option key={br.id} value={br.id}>
                            {br.name} {br.code ? `(${br.code})` : ""}
                          </option>
                        ))}
                        {allowOtherBranch && (
                          <option value="OTHER">Other Specialization (Specify below)</option>
                        )}
                      </select>
                    </div>
                    {!isBranchesLoading && branches.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        No specialization required for this program. You can continue with general enrollment.
                      </p>
                    )}
                    {errors.branchId && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.branchId}
                      </p>
                    )}

                    {/* Custom Branch input when "OTHER" is selected */}
                    {form.branchId === "OTHER" && (
                      <div className="mt-3">
                        <label className={labelCls}>
                          Please specify your branch / specialization{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Robotics, Marine Engineering, Applied Mathematics..."
                          value={form.customBranchText}
                          onChange={(e) => {
                            update("customBranchText", e.target.value);
                            update("branch", e.target.value);
                          }}
                          className={`${inputCls} ${
                            errors.customBranchText
                              ? "border-red-400 focus:border-red-500"
                              : ""
                          }`}
                        />
                        {errors.customBranchText && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle size={12} /> {errors.customBranchText}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Annual Budget Selection */}
                <div>
                  <label className={labelCls}>
                    Annual Budget <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {BUDGET_OPTIONS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => update("budget", b)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs text-center transition-all ${
                          form.budget === b
                            ? "border-[#4A7B5B] bg-[#E8F3EC] text-[#4A7B5B] font-bold shadow-sm"
                            : "border-gray-200 bg-gray-50 text-slate-700 hover:border-[#4A7B5B]/30"
                        }`}
                      >
                        <IndianRupee size={12} />
                        {b}
                      </button>
                    ))}
                  </div>
                  {errors.budget && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.budget}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 3: College Choice & Consent ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2
                    style={{ fontWeight: 700, color: "#0F172A", fontSize: "20px" }}
                    className="mb-1"
                  >
                    College Choice & Consent
                  </h2>
                  <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                    Select preferred colleges or specify custom preferences
                  </p>
                </div>

                {/* Preferred City */}
                <div>
                  <label className={labelCls}>
                    Preferred City <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Patna, Chandigarh, Delhi NCR, Pune..."
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Database-Driven College Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelCls + " mb-0"}>
                      Preferred College{" "}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    {isCollegesError && (
                      <button
                        type="button"
                        onClick={() => refetchColleges()}
                        className="text-[11px] text-[#4A7B5B] flex items-center gap-1 font-semibold hover:underline"
                      >
                        <RefreshCw size={10} /> Retry
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Building2
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <select
                      disabled={isCollegesLoading}
                      value={form.isCustomCollege ? "CUSTOM" : form.collegeId}
                      onChange={(e) => handleCollegeChange(e.target.value)}
                      className={`${inputCls} pl-10 appearance-none`}
                    >
                      <option value="">
                        {isCollegesLoading
                          ? "Loading verified colleges..."
                          : isCollegesError
                          ? "Unable to load colleges (Click Retry)"
                          : "Select from verified colleges (or choose unlisted)"}
                      </option>
                      {colleges.map((col: College) => (
                        <option key={col.id} value={col.id}>
                          {col.name} — {col.city}, {col.state}
                        </option>
                      ))}
                      <option value="CUSTOM">+ Enter Other / Unlisted College</option>
                    </select>
                  </div>

                  {form.isCustomCollege && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Type name of your preferred unlisted college..."
                        value={form.preferredCollegeText}
                        onChange={(e) => update("preferredCollegeText", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  )}
                </div>

                {/* Additional Message */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelCls + " mb-0"}>
                      Additional Message / Questions{" "}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <span className="text-[11px] text-gray-400">
                      {form.message.length}/1000
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    placeholder="Mention specific queries, entrance test scores (JEE, NEET, CUET), scholarship requests, or preferred admission timelines..."
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B] focus:ring-2 focus:ring-[#4A7B5B]/10 resize-none text-slate-800"
                  />
                </div>

                {/* Explicit Consent (Strict Mandatory Requirement: Defaults to false) */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    errors.hasConsent
                      ? "bg-red-50/70 border-red-300"
                      : form.hasConsent
                      ? "bg-[#E8F3EC]/80 border-[#4A7B5B]/30"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.hasConsent}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        update("hasConsent", checked);
                        update("whatsappConsent", checked);
                        update("smsConsent", checked);
                      }}
                      className="mt-1 w-4 h-4 rounded text-[#4A7B5B] focus:ring-[#4A7B5B] border-gray-300"
                    />
                    <div className="text-xs text-slate-700 leading-relaxed">
                      <span className="font-semibold text-slate-900">
                        Consent for Admission Counseling & Updates
                      </span>
                      <p className="mt-0.5 text-slate-600">
                        I agree to receive personalized counseling, admission alerts, and college updates via Call, WhatsApp, and SMS from Swayam Admission advisors. My information is secure and never sold.
                      </p>
                    </div>
                  </label>
                  {errors.hasConsent && (
                    <p className="text-xs text-red-600 mt-2 font-medium flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.hasConsent}
                    </p>
                  )}
                </div>

                {/* Server error alert if any */}
                {errors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{errors.submit}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 4: Success Confirmation ── */}
            {step === 4 && (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-[#E8F3EC] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={40} className="text-[#4A7B5B]" />
                </div>
                <h2
                  style={{ fontWeight: 800, color: "#0F172A", fontSize: "24px" }}
                  className="mb-1"
                >
                  Application Created Successfully! 🎉
                </h2>

                {/* Canonical Application Code Badge */}
                <div className="flex flex-col items-center justify-center my-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-850 border border-emerald-300 text-xs font-bold shadow-xs">
                    <CheckCircle2 size={15} className="text-[#4A7B5B]" />
                    {createdApplication?.applicationNumber || createdApplication?.applicationId ? (
                      <span>Application Code: <span className="font-mono font-black text-emerald-950 tracking-wide">{createdApplication?.applicationNumber || createdApplication?.applicationId}</span></span>
                    ) : (
                      <span>Application Synchronized Successfully</span>
                    )}
                  </div>
                  {createdApplication && (
                    <span className="text-[11px] text-slate-500 mt-1">
                      Status: <strong className="text-slate-800 uppercase">{createdApplication.status || "DRAFT"}</strong> • Canonical Database Record
                    </span>
                  )}
                </div>

                <p
                  style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}
                  className="max-w-md mx-auto mb-6"
                >
                  Thank you{" "}
                  <strong className="text-[#0F172A]">{form.name || "Student"}</strong>! Your application has been logged into our centralized ERP. A senior counselor mapped to{" "}
                  <strong className="text-[#0F172A]">
                    {form.district || form.state || "your region"}
                  </strong>{" "}
                  will assist your admission journey.
                </p>

                {/* Summary Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-7">
                  <div className="p-3 bg-[#F8FAFC] border border-slate-100 rounded-2xl text-left">
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>Target Program</div>
                    <div
                      style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}
                      className="truncate"
                    >
                      {form.courseId === "OTHER"
                        ? form.customCourseText || "Other"
                        : form.course || "General"}
                    </div>
                  </div>

                  <div className="p-3 bg-[#F8FAFC] border border-slate-100 rounded-2xl text-left">
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>State & District</div>
                    <div
                      style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}
                      className="truncate"
                    >
                      {form.district ? `${form.district}, ${form.state}` : form.state || "India"}
                    </div>
                  </div>

                  <div className="p-3 bg-[#F8FAFC] border border-slate-100 rounded-2xl text-left">
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>Academic Level</div>
                    <div
                      style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}
                      className="truncate"
                    >
                      {form.educationLevel || "N/A"} ({form.passingYear})
                    </div>
                  </div>

                  <div className="p-3 bg-[#F8FAFC] border border-slate-100 rounded-2xl text-left">
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>Budget</div>
                    <div
                      style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}
                      className="truncate"
                    >
                      {form.budget || "Standard"}
                    </div>
                  </div>
                </div>

                {/* Action CTA Buttons */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {createdApplication?.id ? (
                      <Link
                        to={`/dashboard?tab=applications&appId=${createdApplication.id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white rounded-xl transition-all shadow-md font-bold text-sm"
                      >
                        <ArrowRight size={16} /> Continue Application (Submit & Pay)
                      </Link>
                    ) : (
                      <Link
                        to="/dashboard?tab=applications"
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white rounded-xl transition-all shadow-md font-bold text-sm"
                      >
                        <ArrowRight size={16} /> View My Applications
                      </Link>
                    )}
                    <Link
                      to="/dashboard?tab=applications"
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-sm font-bold text-sm"
                    >
                      My Applications List
                    </Link>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <a
                      href="https://wa.me/919000000000"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl transition-all shadow-sm text-xs font-semibold"
                    >
                      <MessageCircle size={15} /> Instant WhatsApp Support
                    </a>
                    <Link
                      to="/ai-counselor"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all text-xs font-semibold"
                    >
                      <Bot size={15} /> Talk to AI Counselor
                    </Link>
                  </div>
                </div>

                <button
                  onClick={resetForm}
                  className="mt-6 text-xs text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1 font-medium"
                >
                  <RefreshCw size={11} /> Start a new admission application
                </button>
              </div>
            )}
          </div>

          {/* Navigation Bar */}
          {step < 4 && (
            <div className="px-7 pb-6 flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => prev - 1)}
                  className="flex items-center gap-2 px-5 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                  style={{ fontSize: "14px", fontWeight: 600 }}
                >
                  <ArrowLeft size={15} /> Back
                </button>
              )}
              <button
                type="button"
                onClick={step === 3 ? handleSubmit : handleNext}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white rounded-xl transition-colors shadow-sm disabled:opacity-50"
                style={{ fontWeight: 600, fontSize: "14px" }}
              >
                {isSubmitting ? (
                  "Submitting Application..."
                ) : step === 3 ? (
                  "Submit Application"
                ) : (
                  "Continue"
                )}
                {!isSubmitting && <ArrowRight size={15} />}
              </button>
            </div>
          )}
        </div>

        {/* Trust Badges */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-5 mt-5 flex-wrap">
            {[
              "100% Free Counseling",
              "No Hidden Charges",
              "Verified UGC/AICTE Colleges",
              "Senior Counselor Routing",
            ].map((t) => (
              <div
                key={t}
                className="flex items-center gap-1.5"
                style={{ fontSize: "11px", color: "#94a3b8" }}
              >
                <CheckCircle2 size={12} className="text-[#4A7B5B]" />
                {t}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
