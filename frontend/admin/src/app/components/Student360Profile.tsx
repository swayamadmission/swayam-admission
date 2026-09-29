import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Edit, UserCheck, Plus, Upload, Bell, Phone, MessageSquare, Mail,
  Printer, Download, Activity, Ban, Trash2, CheckCircle2, Clock, XCircle,
  FileText, DollarSign, Shield, Calendar, MapPin, Award, AlertTriangle, Sparkles,
  ChevronRight, Filter, Search, User, Lock, BookOpen, CreditCard, LifeBuoy,
  FileCheck, Zap, Paperclip, Send, Check
} from "lucide-react";
import { studentsApi } from "../../api/students.api";
import { usersApi } from "../../api/users.api";
import { counselorsApi } from "../../api/counselors.api";
import { documentsApi } from "../../api/documents.api";
import DocumentDetailDrawer from "./DocumentDetailDrawer";
import NextActionPanel from "./NextActionPanel";
import CentralActivityTimeline from "./CentralActivityTimeline";
import LogInteractionModal from "./LogInteractionModal";
import { toast } from "sonner";

interface Student360ProfileProps {
  studentId: string;
  onBack: () => void;
}

const JOURNEY_STAGES = [
  "Account Created",
  "Profile Completed",
  "Counselor Assigned",
  "Documents Uploaded",
  "Documents Verified",
  "College Shortlisted",
  "Application Submitted",
  "Application Under Review",
  "Admission Approved",
  "Fee Payment Completed",
  "Admission Confirmed",
  "Counselor Review",
  "Reporting Completed",
  "College Review",
  "Journey Completed",
];


export default function Student360Profile({ studentId, onBack }: Student360ProfileProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCounselorModalOpen, setIsCounselorModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedReviewDocId, setSelectedReviewDocId] = useState<string | null>(null);
  const [isLogInteractionOpen, setIsLogInteractionOpen] = useState(false);
  const [logInteractionTab, setLogInteractionTab] = useState<"call" | "whatsapp" | "meeting" | "note" | "task">("call");

  // Form states
  const [selectedCounselorId, setSelectedCounselorId] = useState("");
  const [counselorRemarks, setCounselorRemarks] = useState("");
  const [notifChannel, setNotifChannel] = useState<"EMAIL" | "SMS" | "WHATSAPP" | "PUSH">("EMAIL");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteType, setNoteType] = useState("GENERAL");
  const [noteContent, setNoteContent] = useState("");
  const [notePinned, setNotePinned] = useState(false);

  // 1. Primary Student Detail Query
  const { data: studentRes, isLoading: studentLoading } = useQuery({
    queryKey: ["student_360_detail", studentId],
    queryFn: () => studentsApi.getStudent(studentId),
  });

  // Tab-specific queries (lazy loaded by tab)
  const { data: overviewRes } = useQuery({
    queryKey: ["student_overview", studentId],
    queryFn: () => studentsApi.getOverview(studentId),
    enabled: activeTab === "overview",
  });

  const { data: appsRes } = useQuery({
    queryKey: ["student_applications", studentId],
    queryFn: () => studentsApi.getApplications(studentId),
    enabled: activeTab === "applications" || activeTab === "overview",
  });

  const { data: docsRes } = useQuery({
    queryKey: ["student_documents", studentId],
    queryFn: () => studentsApi.getDocuments(studentId),
    enabled: activeTab === "documents" || activeTab === "overview",
  });

  const { data: studentChecklistRes } = useQuery({
    queryKey: ["admin_student_checklist", studentId],
    queryFn: () => documentsApi.getChecklist({ userId: studentId }),
    enabled: activeTab === "documents" || activeTab === "overview",
  });

  const { data: paymentsRes } = useQuery({
    queryKey: ["student_payments", studentId],
    queryFn: () => studentsApi.getPayments(studentId),
    enabled: activeTab === "payments" || activeTab === "overview",
  });

  const { data: timelineRes } = useQuery({
    queryKey: ["student_timeline", studentId],
    queryFn: () => studentsApi.getTimeline(studentId),
    enabled: activeTab === "timeline",
  });

  const { data: activityRes } = useQuery({
    queryKey: ["student_activity", studentId],
    queryFn: () => studentsApi.getActivity(studentId),
    enabled: activeTab === "activity",
  });

  const { data: counselorRes } = useQuery({
    queryKey: ["student_counselor", studentId],
    queryFn: () => studentsApi.getCounselor(studentId),
    enabled: activeTab === "counselor",
  });

  const { data: notesRes } = useQuery({
    queryKey: ["student_notes", studentId],
    queryFn: () => studentsApi.getNotes(studentId),
    enabled: activeTab === "notes",
  });

  const { data: supportRes } = useQuery({
    queryKey: ["student_support", studentId],
    queryFn: () => studentsApi.getSupport(studentId),
    enabled: activeTab === "support",
  });

  const { data: analyticsRes } = useQuery({
    queryKey: ["student_analytics", studentId],
    queryFn: () => studentsApi.getAnalytics(studentId),
    enabled: activeTab === "analytics" || activeTab === "overview",
  });

  const { data: commRes } = useQuery({
    queryKey: ["student_communication", studentId],
    queryFn: () => studentsApi.getCommunication(studentId),
    enabled: activeTab === "communication",
  });

  // Query counselors list for assignment modal
  const { data: counselorsListRes } = useQuery({
    queryKey: ["admin_counselors_list"],
    queryFn: () => counselorsApi.getAll({ limit: 100 }),
    enabled: isCounselorModalOpen,
  });

  const availableCounselors = Array.isArray(counselorsListRes?.data?.data)
    ? counselorsListRes.data.data
    : Array.isArray(counselorsListRes?.data)
    ? counselorsListRes.data
    : [];

  // Mutations
  const updateStudentMutation = useMutation({
    mutationFn: (data: any) => studentsApi.updateStudent(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student_360_detail", studentId] });
      setIsEditModalOpen(false);
      toast.success("Student details updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update student details");
    },
  });

  const assignCounselorMutation = useMutation({
    mutationFn: (data: { counselorId: string; remarks?: string }) =>
      counselorsApi.assignStudent({ counselorId: data.counselorId, studentId, remarks: data.remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student_360_detail", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student_counselor", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student_overview", studentId] });
      queryClient.invalidateQueries({ queryKey: ["admin_students_list"] });
      queryClient.invalidateQueries({ queryKey: ["admin_counselors"] });
      queryClient.invalidateQueries({ queryKey: ["admin_counselor_stats"] });
      setIsCounselorModalOpen(false);
      setSelectedCounselorId("");
      setCounselorRemarks("");
      toast.success("Counselor assigned successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to assign counselor");
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: (data: any) => studentsApi.sendNotification(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student_communication", studentId] });
      setIsNotificationModalOpen(false);
      setNotifTitle("");
      setNotifMessage("");
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: (data: any) => studentsApi.createNote(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student_notes", studentId] });
      setIsNoteModalOpen(false);
      setNoteTitle("");
      setNoteContent("");
    },
  });

  const exportPdfMutation = useMutation({
    mutationFn: () => studentsApi.exportProfile(studentId),
    onSuccess: (res) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Student_360_Profile_${studentId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    },
  });

  if (studentLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-screen" style={{ background: "#F8FAFC" }}>
        <div className="w-10 h-10 border-3 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-[#64748B]">Loading Enterprise Student 360° Profile...</p>
      </div>
    );
  }

  const student = studentRes?.data?.data || studentRes?.data || {};
  const profile = student.profile || {};
  const assignedCounselor = student.assignedCounselor;
  const leadDetails = student.leadDetails || {};
  const applications = appsRes?.data?.data || student.applications || [];
  const documents = docsRes?.data?.data?.documents || student.documents || [];
  const payments = paymentsRes?.data?.data?.payments || student.payments || [];
  const analytics = analyticsRes?.data?.data || {};
  const notes = notesRes?.data?.data || [];
  const supportTickets = supportRes?.data?.data || [];
  const timelineEvents = timelineRes?.data?.data || [];
  const activityLogs = activityRes?.data?.data?.auditLogs || [];
  const communications = commRes?.data?.data || [];

  // Stage index for visual journey bar
  const currentStageName = student.currentStage || "Registration";
  let currentStageIndex = JOURNEY_STAGES.findIndex(s => s.toLowerCase() === currentStageName.toLowerCase());
  if (currentStageIndex === -1) currentStageIndex = 1;

  return (
    <div className="p-4 lg:p-6 space-y-6" style={{ background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-[#4A7B5B] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Student Management
        </button>
        <div className="text-xs text-[#94A3B8]">
          Last Login: {student.lastLogin ? new Date(student.lastLogin).toLocaleString() : "Never"}
        </div>
      </div>

      {/* 1. STUDENT HEADER */}
      <div className="bg-white rounded-2xl border border-[#F1F5F9] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md"
                style={{ background: "linear-gradient(135deg, #4A7B5B 0%, #3B6349 100%)" }}
              >
                {student.avatar ? (
                  <img src={student.avatar} alt={student.fullName} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  student.fullName?.charAt(0)?.toUpperCase() || "S"
                )}
              </div>
              <span
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px]"
                style={{ background: student.isActive ? "#10B981" : "#EF4444" }}
                title={student.isActive ? "Active" : "Inactive"}
              >
                ✓
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[#4A7B5B]">{student.fullName}</h1>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    background: student.isApproved ? "#D1FAE5" : "#FED7AA",
                    color: student.isApproved ? "#059669" : "#EA580C",
                  }}
                >
                  {student.isApproved ? "Approved Student" : "Pending Approval"}
                </span>
                {student.isVerifiedBadge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0284C7] font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified Profile
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-[#64748B] flex-wrap">
                <span><strong>Student ID:</strong> {student.studentId}</span>
                <span>•</span>
                <span><strong>Reg No:</strong> {student.registrationNumber}</span>
                <span>•</span>
                <span><strong>App ID:</strong> {student.applicationId}</span>
                {student.crmLeadId && (
                  <>
                    <span>•</span>
                    <span><strong>CRM Lead ID:</strong> {student.crmLeadId}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-[#64748B] pt-1 flex-wrap">
                <span>Stage: <strong className="text-[#4A7B5B]">{student.currentStage}</strong></span>
                <span>•</span>
                <span>Counselor: <strong>{assignedCounselor?.fullName || "Unassigned"}</strong></span>
                <span>•</span>
                <span>Joined: {new Date(student.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Profile Completion Gauge */}
          <div className="flex items-center gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#F1F5F9] w-full lg:w-auto justify-between lg:justify-start">
            <div className="text-right">
              <div className="text-xs text-[#94A3B8] font-medium">Profile Completion</div>
              <div className="text-2xl font-bold text-[#4A7B5B]">{student.profileCompletionPercentage || 0}%</div>
            </div>
            <div className="w-16 bg-[#E2E8F0] h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${student.profileCompletionPercentage || 0}%`,
                  background: "#4A7B5B",
                }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="mt-6 pt-5 border-t border-[#F1F5F9] flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => {
              setLogInteractionTab("call");
              setIsLogInteractionOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4A7B5B] text-white text-xs font-semibold hover:opacity-90 transition-all shadow-xs"
          >
            <Phone className="w-3.5 h-3.5" /> Log Call
          </button>
          <button
            onClick={() => {
              setLogInteractionTab("whatsapp");
              setIsLogInteractionOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Log WhatsApp
          </button>
          <button
            onClick={() => {
              setLogInteractionTab("meeting");
              setIsLogInteractionOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" /> Log Meeting
          </button>
          <button
            onClick={() => {
              setLogInteractionTab("task");
              setIsLogInteractionOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold hover:bg-purple-100 transition-all"
          >
            <Clock className="w-3.5 h-3.5" /> Set Follow-Up
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#4A7B5B] hover:bg-[#F8FAFC] transition-colors"
          >
            <Edit className="w-3.5 h-3.5 text-[#4A7B5B]" /> Edit Profile
          </button>
          <button
            onClick={() => setIsCounselorModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#4A7B5B] hover:bg-[#F8FAFC] transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#4A7B5B]" /> Assign Counselor
          </button>
          <button
            onClick={() => setIsDocModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#4A7B5B] hover:bg-[#F8FAFC] transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-[#4A7B5B]" /> Upload Document
          </button>
          <button
            onClick={() => setIsNotificationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#4A7B5B] hover:bg-[#F8FAFC] transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-[#4A7B5B]" /> Send Notification
          </button>

          {/* Quick Direct Links */}
          <a
            href={`tel:${student.mobile}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#4A7B5B] hover:bg-[#F8FAFC] transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-[#0EA5E9]" /> Call
          </a>
          <a
            href={`https://wa.me/${student.mobile?.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#4A7B5B] hover:bg-[#F8FAFC] transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#10B981]" /> WhatsApp
          </a>
          <a
            href={`mailto:${student.email}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#4A7B5B] hover:bg-[#F8FAFC] transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-[#F0AE1A]" /> Email
          </a>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#4A7B5B] hover:bg-[#F8FAFC] transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-[#64748B]" /> Print Profile
          </button>
          <button
            onClick={() => exportPdfMutation.mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#4A7B5B] hover:bg-[#F8FAFC] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" /> Export PDF
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#4A7B5B] hover:bg-[#F8FAFC] transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-[#8B5CF6]" /> View Activity
          </button>

          <button
            onClick={() => updateStudentMutation.mutate({ isActive: !student.isActive })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
          >
            <Ban className="w-3.5 h-3.5" /> {student.isActive ? "Suspend Student" : "Activate Student"}
          </button>
        </div>
      </div>

      {/* 5. STUDENT JOURNEY PROGRESS BAR */}
      <div className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">Student Journey Progress</h3>
        <div className="flex items-center justify-between overflow-x-auto pb-2 relative">
          {JOURNEY_STAGES.map((stage, idx) => {
            const isPassed = idx <= currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stage} className="flex flex-col items-center min-w-[110px] text-center relative z-10 px-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mb-2 transition-all"
                  style={{
                    background: isCurrent ? "#4A7B5B" : isPassed ? "#D1FAE5" : "#F1F5F9",
                    color: isCurrent ? "#FFFFFF" : isPassed ? "#059669" : "#94A3B8",
                    border: isCurrent ? "2px solid #4A7B5B" : "none",
                  }}
                >
                  {isPassed ? "✓" : idx + 1}
                </div>
                <span
                  className="text-[11px] font-medium leading-tight"
                  style={{ color: isCurrent ? "#4A7B5B" : isPassed ? "#4A7B5B" : "#94A3B8" }}
                >
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. AI INSIGHTS BANNER */}
      {analytics.insights && analytics.insights.length > 0 && (
        <div className="bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#4A7B5B] text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#065F46]">AI Admission Insights</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#059669] font-semibold">
                  Probability: {analytics.admissionProbability || 85}%
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] font-semibold">
                  Risk: {analytics.riskLevel || "Low"}
                </span>
              </div>
              <p className="text-xs text-[#047857] mt-0.5">
                Suggested Action: <strong>{analytics.suggestedNextAction || "Complete document verification"}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("analytics")}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#4A7B5B] text-white hover:bg-[#3B6349] transition-colors whitespace-nowrap"
          >
            View Full AI Analytics →
          </button>
        </div>
      )}

      {/* 2. QUICK STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Applications", value: applications.length, sub: `${applications.filter((a: any) => a.status === "APPROVED").length} Approved`, icon: BookOpen, color: "#4A7B5B" },
          { label: "Documents", value: documents.length, sub: `${documents.filter((d: any) => d.status === "VERIFIED").length} Verified`, icon: FileCheck, color: "#0EA5E9" },
          { label: "Payments", value: payments.length, sub: `₹${payments.reduce((s: number, p: any) => s + (p.amount || 0), 0).toLocaleString()}`, icon: CreditCard, color: "#F0AE1A" },
          { label: "Timeline Events", value: timelineEvents.length, sub: "Real-time logs", icon: Clock, color: "#8B5CF6" },
          { label: "Support Tickets", value: supportTickets.length, sub: `${supportTickets.filter((t: any) => t.status === "OPEN").length} Open`, icon: LifeBuoy, color: "#EC4899" },
          { label: "Completion", value: `${student.profileCompletionPercentage || 0}%`, sub: "Profile Score", icon: Award, color: "#10B981" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-4 border border-[#F1F5F9] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#94A3B8]">{card.label}</span>
              <card.icon className="w-4 h-4" style={{ color: card.color }} />
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold" style={{ color: card.color }}>{card.value}</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT AREA WITH RIGHT SIDE STICKY PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* LEFT 3 COLUMNS: TABS & CONTENT */}
        <div className="lg:col-span-3 space-y-6">

          {/* 3. ENTERPRISE TABS HEADER */}
          <div className="bg-white rounded-2xl border border-[#F1F5F9] p-2 shadow-sm overflow-x-auto scrollbar-none">
            <div className="flex gap-1 min-w-max">
              {[
                { key: "overview", label: "Overview" },
                { key: "personal", label: "Personal Info" },
                { key: "academic", label: "Academic Details" },
                { key: "applications", label: "Applications", count: applications.length },
                { key: "documents", label: "Documents", count: documents.length },
                { key: "payments", label: "Payments", count: payments.length },
                { key: "counselor", label: "Counselor" },
                { key: "timeline", label: "Timeline" },
                { key: "communication", label: "Communication" },
                { key: "activity", label: "Activity Logs" },
                { key: "notes", label: "Notes", count: notes.length },
                { key: "support", label: "Support", count: supportTickets.length },
                { key: "analytics", label: "Analytics" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
                  style={{
                    background: activeTab === tab.key ? "#4A7B5B" : "transparent",
                    color: activeTab === tab.key ? "#FFFFFF" : "#64748B",
                  }}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className="px-1.5 py-0.2 rounded-full text-[10px]"
                      style={{
                        background: activeTab === tab.key ? "#FFFFFF30" : "#F1F5F9",
                        color: activeTab === tab.key ? "#FFFFFF" : "#4A7B5B",
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* TAB CONTENTS */}

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Next Operational Action Card */}
              <NextActionPanel
                contextType="STUDENT"
                contextId={studentId}
                studentName={student.fullName}
                assignedCounselorId={assignedCounselor?.id}
                onOpenLogModal={(tab) => {
                  setLogInteractionTab(tab);
                  setIsLogInteractionOpen(true);
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-semibold text-[#4A7B5B]">Admission Summary</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                      <span className="text-[#94A3B8]">Full Name</span>
                      <span className="font-semibold text-[#4A7B5B]">{student.fullName}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                      <span className="text-[#94A3B8]">Email</span>
                      <span className="font-semibold text-[#4A7B5B]">{student.email}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                      <span className="text-[#94A3B8]">Mobile</span>
                      <span className="font-semibold text-[#4A7B5B]">{student.mobile}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                      <span className="text-[#94A3B8]">Admission Status</span>
                      <span className="font-semibold text-[#4A7B5B]">{student.admissionStatus}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-[#94A3B8]">Assigned Counselor</span>
                      <span className="font-semibold text-[#4A7B5B]">{assignedCounselor?.fullName || "None"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-semibold text-[#4A7B5B]">Recent Remarks & Status</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    {overviewRes?.data?.data?.remarks || "Student account is synchronized with PostgreSQL backend and active in admission cycle."}
                  </p>
                  <div className="pt-2 border-t border-[#F8FAFC] flex justify-between items-center text-xs">
                    <span className="text-[#94A3B8]">Pending Documents</span>
                    <span className="font-bold text-[#EA580C]">{documents.filter((d: any) => d.status !== "VERIFIED").length} files</span>
                  </div>
                </div>
              </div>

              {/* Latest Applications Preview */}
              <div className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-[#4A7B5B]">Latest Applications</h3>
                  <button onClick={() => setActiveTab("applications")} className="text-xs text-[#4A7B5B] hover:underline">View All ({applications.length})</button>
                </div>
                {applications.length === 0 ? (
                  <div className="text-xs text-[#94A3B8] py-4 text-center">No applications submitted yet.</div>
                ) : (
                  <div className="space-y-2">
                    {applications.slice(0, 3).map((app: any) => (
                      <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC]">
                        <div>
                          <div className="text-xs font-semibold text-[#4A7B5B]">{app.course?.name || "Course"}</div>
                          <div className="text-[11px] text-[#94A3B8]">{app.college?.name || "College"}</div>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-semibold">
                          {app.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL INFORMATION */}
          {activeTab === "personal" && (
            <div className="bg-white rounded-2xl border border-[#F1F5F9] p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-4">
                <h3 className="text-base font-bold text-[#4A7B5B]">Personal Details</h3>
                <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#4A7B5B]">
                  <Edit className="w-3.5 h-3.5" /> Edit Personal Info
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { label: "Full Name", val: student.fullName || "Not provided" },
                  { label: "Date of Birth", val: profile.dob ? new Date(profile.dob).toLocaleDateString("en-IN") : student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-IN") : "Not provided" },
                  { label: "Gender", val: profile.gender || student.gender || "Not provided" },
                  { label: "Category", val: profile.category || "Not provided" },
                  { label: "Religion", val: profile.religion || "Not provided" },
                  { label: "Nationality", val: profile.nationality || student.country || "Indian" },
                  { label: "Blood Group", val: profile.bloodGroup || student.bloodGroup || "Not provided" },
                  { label: "Aadhaar Number", val: profile.aadhaar ? `•••• •••• ${profile.aadhaar.slice(-4)}` : "Not provided" },
                  { label: "Mobile Number", val: student.mobile || "Not provided" },
                  { label: "Alternate Mobile", val: profile.alternateMobile || student.alternatePhone || "Not provided" },
                  { label: "Email Address", val: student.email || "Not provided" },
                  { label: "Parent Name", val: profile.parentName || "Not provided" },
                  { label: "Parent Contact", val: profile.parentContact || "Not provided" },
                  { label: "Address", val: profile.address || student.address || "Not provided" },
                  { label: "District", val: profile.district || "Not provided" },
                  { label: "City", val: profile.city || student.city || "Not provided" },
                  { label: "State", val: profile.state || student.state || "Not provided" },
                  { label: "Country", val: profile.country || student.country || "India" },
                  { label: "PIN Code", val: profile.pincode || student.pincode || "Not provided" },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-[#F8FAFC]">
                    <div className="text-[11px] text-[#94A3B8] font-medium">{item.label}</div>
                    <div className="text-xs font-semibold text-[#4A7B5B] mt-0.5">{item.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ACADEMIC DETAILS */}
          {activeTab === "academic" && (
            <div className="space-y-5">
              {/* 10th & 12th Marks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm space-y-3">
                  <h4 className="text-sm font-bold text-[#4A7B5B] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#4A7B5B]" /> 10th Standard (SSLC / Matric)
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#F8FAFC]"><span>Board</span><span className="font-semibold">{profile.tenthBoard || "—"}</span></div>
                    <div className="flex justify-between py-1 border-b border-[#F8FAFC]"><span>School</span><span className="font-semibold">{profile.tenthSchool || "—"}</span></div>
                    <div className="flex justify-between py-1 border-b border-[#F8FAFC]"><span>Passing Year</span><span className="font-semibold">{profile.tenthPassingYear || "—"}</span></div>
                    <div className="flex justify-between py-1"><span>Percentage / Marks</span><span className="font-semibold text-[#4A7B5B]">{profile.tenthMarks ? `${profile.tenthMarks}%` : "—"}</span></div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm space-y-3">
                  <h4 className="text-sm font-bold text-[#4A7B5B] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#0EA5E9]" /> 12th Standard (HSC / Intermediate)
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#F8FAFC]"><span>Board / Stream</span><span className="font-semibold">{profile.twelfthBoard || profile.twelfthStream || "—"}</span></div>
                    <div className="flex justify-between py-1 border-b border-[#F8FAFC]"><span>School</span><span className="font-semibold">{profile.twelfthSchool || "—"}</span></div>
                    <div className="flex justify-between py-1 border-b border-[#F8FAFC]"><span>Passing Year</span><span className="font-semibold">{profile.twelfthPassingYear || "—"}</span></div>
                    <div className="flex justify-between py-1"><span>Percentage / Marks</span><span className="font-semibold text-[#0EA5E9]">{profile.twelfthMarks ? `${profile.twelfthMarks}%` : "—"}</span></div>
                  </div>
                </div>
              </div>

              {/* Higher Education */}
              <div className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-[#4A7B5B]">Graduation & Higher Qualification</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-[#F8FAFC]">
                    <div className="text-[#94A3B8]">Graduation Course</div>
                    <div className="font-semibold text-[#4A7B5B] mt-0.5">{profile.graduationCourse || "—"}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8FAFC]">
                    <div className="text-[#94A3B8]">College / Institute</div>
                    <div className="font-semibold text-[#4A7B5B] mt-0.5">{profile.graduationCollege || "—"}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8FAFC]">
                    <div className="text-[#94A3B8]">University</div>
                    <div className="font-semibold text-[#4A7B5B] mt-0.5">{profile.graduationUniversity || profile.university || "—"}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8FAFC]">
                    <div className="text-[#94A3B8]">Percentage / CGPA</div>
                    <div className="font-semibold text-[#4A7B5B] mt-0.5">{profile.graduationPercentage ? `${profile.graduationPercentage}%` : profile.graduationCgpa ? `${profile.graduationCgpa} CGPA` : "—"}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8FAFC]">
                    <div className="text-[#94A3B8]">Gap Years</div>
                    <div className="font-semibold text-[#4A7B5B] mt-0.5">{profile.gapYears || 0} years</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8FAFC]">
                    <div className="text-[#94A3B8]">Active Backlogs</div>
                    <div className="font-semibold text-[#4A7B5B] mt-0.5">{profile.backlogs || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: APPLICATIONS */}
          {activeTab === "applications" && (
            <div className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#F1F5F9] flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#4A7B5B]">Complete Application History</h3>
                <span className="text-xs text-[#94A3B8]">Total: {applications.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#FAFAFA] border-b border-[#F1F5F9] text-[#94A3B8] font-semibold uppercase">
                    <tr>
                      <th className="p-3.5">App ID</th>
                      <th className="p-3.5">College</th>
                      <th className="p-3.5">Course</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Payment</th>
                      <th className="p-3.5">Counselor</th>
                      <th className="p-3.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {applications.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-[#94A3B8]">No applications record found.</td></tr>
                    ) : (
                      applications.map((app: any) => (
                        <tr key={app.id} className="hover:bg-[#F8FAFC]">
                          <td className="p-3.5 font-semibold text-[#4A7B5B]">{app.applicationId || app.id.slice(0, 8)}</td>
                          <td className="p-3.5 font-medium text-[#4A7B5B]">{app.college?.name || "—"}</td>
                          <td className="p-3.5 text-[#64748B]">{app.course?.name || "—"}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-semibold">
                              {app.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-[#64748B]">{app.paymentStatus || "PENDING"}</td>
                          <td className="p-3.5 text-[#64748B]">{app.counselor?.fullName || "—"}</td>
                          <td className="p-3.5 text-[#94A3B8]">{new Date(app.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: DOCUMENTS & COMPLIANCE VAULT */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              {/* Compliance Scorecard */}
              {(() => {
                const checklistData = (studentChecklistRes?.data as any)?.data || studentChecklistRes?.data;
                const summary = checklistData?.summary;
                const totalReq = summary?.totalRequired ?? documents.length;
                const verified = summary?.verifiedCount ?? documents.filter((d: any) => d.status === "VERIFIED").length;
                const pending = summary?.pendingReviewCount ?? documents.filter((d: any) => d.status === "UPLOADED" || d.status === "UNDER_VERIFICATION").length;
                const correction = summary?.correctionRequiredCount ?? documents.filter((d: any) => d.status === "CORRECTION_REQUIRED" || d.status === "REJECTED").length;
                const pct = summary?.completionPercentage ?? (totalReq > 0 ? Math.round((verified / totalReq) * 100) : 0);

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-[#F1F5F9] shadow-xs">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <div className="text-[11px] text-gray-500 font-semibold">Total Required</div>
                      <div className="text-xl font-bold text-slate-800 mt-0.5">{totalReq}</div>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl">
                      <div className="text-[11px] text-emerald-700 font-semibold">Verified Compliant</div>
                      <div className="text-xl font-bold text-emerald-800 mt-0.5">{verified} ({pct}%)</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <div className="text-[11px] text-blue-700 font-semibold">Under Review</div>
                      <div className="text-xl font-bold text-blue-800 mt-0.5">{pending}</div>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-xl">
                      <div className="text-[11px] text-rose-700 font-semibold">Correction Needed</div>
                      <div className="text-xl font-bold text-rose-800 mt-0.5">{correction}</div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#4A7B5B]">Document Verification & Audit Vault</h3>
                <button onClick={() => setIsDocModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4A7B5B] text-white text-xs font-semibold hover:bg-[#3d674c]">
                  <Upload className="w-3.5 h-3.5" /> Upload Document
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.length === 0 ? (
                  <div className="col-span-2 bg-white rounded-2xl p-8 border border-[#F1F5F9] text-center text-xs text-[#94A3B8]">
                    No documents uploaded for this student yet.
                  </div>
                ) : (
                  documents.map((doc: any) => (
                    <div key={doc.id} className="bg-white rounded-2xl border border-[#F1F5F9] p-4 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-[#F1F5F9] text-[#4A7B5B]">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#4A7B5B]">{doc.title || doc.fileName}</div>
                            <div className="text-[11px] text-[#94A3B8]">{doc.type} • v{doc.version || 1}</div>
                          </div>
                        </div>
                        <span
                          className="text-[10px] px-2.5 py-0.5 rounded-full font-bold"
                          style={{
                            background: doc.status === "VERIFIED" ? "#D1FAE5" : doc.status === "REJECTED" || doc.status === "CORRECTION_REQUIRED" ? "#FEE2E2" : "#DBEAFE",
                            color: doc.status === "VERIFIED" ? "#059669" : doc.status === "REJECTED" || doc.status === "CORRECTION_REQUIRED" ? "#DC2626" : "#1D4ED8",
                          }}
                        >
                          {doc.status}
                        </span>
                      </div>

                      {doc.rejectedReason && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-[11px] text-rose-800">
                          <strong>Correction Instruction:</strong> {doc.rejectedReason}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-[#F8FAFC] text-xs">
                        <span className="text-[#94A3B8]">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-3">
                          {doc.fileUrl && (
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-slate-900 font-semibold">
                              Download
                            </a>
                          )}
                          <button
                            onClick={() => setSelectedReviewDocId(doc.id)}
                            className="px-2.5 py-1 bg-[#4A7B5B] text-white rounded-lg font-bold text-xs hover:bg-[#3d674c]"
                          >
                            Review & Verify
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: PAYMENTS */}
          {activeTab === "payments" && (
            <div className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden shadow-sm space-y-4 p-5">
              <h3 className="text-sm font-bold text-[#4A7B5B]">Financial Records & Invoices</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#FAFAFA] border-b border-[#F1F5F9] text-[#94A3B8] font-semibold uppercase">
                    <tr>
                      <th className="p-3">Txn ID</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Gateway</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {payments.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 text-[#94A3B8]">No payment records.</td></tr>
                    ) : (
                      payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-3 font-semibold text-[#4A7B5B]">{p.transactionId || p.id.slice(0, 8)}</td>
                          <td className="p-3 font-bold text-[#4A7B5B]">₹{(p.amount || 0).toLocaleString()}</td>
                          <td className="p-3 text-[#64748B]">{p.gateway || "Manual"}</td>
                          <td className="p-3 text-[#64748B]">{p.paymentType || "REGISTRATION"}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#059669] font-semibold">
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3 text-[#94A3B8]">{new Date(p.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: COUNSELOR */}
          {activeTab === "counselor" && (
            <div className="bg-white rounded-2xl border border-[#F1F5F9] p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-4">
                <h3 className="text-sm font-bold text-[#4A7B5B]">Assigned Counselor Details</h3>
                <button onClick={() => setIsCounselorModalOpen(true)} className="px-3 py-1.5 rounded-lg bg-[#4A7B5B] text-white text-xs font-semibold">
                  Transfer / Assign Counselor
                </button>
              </div>

              {assignedCounselor ? (
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#F8FAFC]">
                  <div className="w-14 h-14 rounded-2xl bg-[#4A7B5B] text-white flex items-center justify-center text-xl font-bold">
                    {assignedCounselor.fullName?.charAt(0) || "C"}
                  </div>
                  <div className="space-y-1 text-xs">
                    <h4 className="text-sm font-bold text-[#4A7B5B]">{assignedCounselor.fullName}</h4>
                    <p className="text-[#64748B]">{assignedCounselor.email}</p>
                    <p className="text-[#64748B]">{assignedCounselor.mobile}</p>
                    <div className="text-[11px] text-[#94A3B8] pt-1">Performance Notes: High responsiveness & active follow-ups</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#94A3B8] text-center py-6">No counselor assigned to this student.</div>
              )}
            </div>
          )}

          {/* TAB 8: TIMELINE */}
          {activeTab === "timeline" && (
            <CentralActivityTimeline
              contextType="STUDENT"
              contextId={studentId}
              studentName={student.fullName}
              assignedCounselorId={assignedCounselor?.id}
              applicationId={applications[0]?.id}
            />
          )}

          {/* TAB 9: COMMUNICATION */}
          {activeTab === "communication" && (
            <div className="bg-white rounded-2xl border border-[#F1F5F9] p-6 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                <h3 className="text-sm font-bold text-[#4A7B5B]">Communication Logs</h3>
                <button onClick={() => setIsNotificationModalOpen(true)} className="px-3 py-1.5 rounded-lg bg-[#4A7B5B] text-white text-xs font-semibold">
                  Send Outbound Message
                </button>
              </div>

              <div className="space-y-3">
                {communications.length === 0 ? (
                  <div className="text-xs text-[#94A3B8] text-center py-6">No communication log entries.</div>
                ) : (
                  communications.map((c: any) => (
                    <div key={c.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] space-y-1 text-xs">
                      <div className="flex justify-between font-semibold text-[#4A7B5B]">
                        <span>{c.channel} ({c.type})</span>
                        <span className="text-[#94A3B8] text-[11px]">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-[#475569] font-medium">{c.subject}</div>
                      <div className="text-[#64748B]">{c.content}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 10: ACTIVITY LOGS */}
          {activeTab === "activity" && (
            <div className="bg-white rounded-2xl border border-[#F1F5F9] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#4A7B5B]">Audit Module & System Actions</h3>
              <div className="space-y-2">
                {activityLogs.length === 0 ? (
                  <div className="text-xs text-[#94A3B8] py-4 text-center">No system activity logged.</div>
                ) : (
                  activityLogs.map((log: any) => (
                    <div key={log.id} className="flex justify-between items-center p-3 rounded-xl bg-[#F8FAFC] text-xs">
                      <div>
                        <div className="font-semibold text-[#4A7B5B]">{log.action}</div>
                        <div className="text-[11px] text-[#94A3B8]">{log.description || "Executed by system"}</div>
                      </div>
                      <div className="text-right text-[11px] text-[#94A3B8]">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 11: NOTES */}
          {activeTab === "notes" && (
            <div className="bg-white rounded-2xl border border-[#F1F5F9] p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                <h3 className="text-sm font-bold text-[#4A7B5B]">Private & Counselor Notes</h3>
                <button onClick={() => setIsNoteModalOpen(true)} className="px-3 py-1.5 rounded-lg bg-[#4A7B5B] text-white text-xs font-semibold">
                  + Add Note
                </button>
              </div>

              <div className="space-y-3">
                {notes.length === 0 ? (
                  <div className="text-xs text-[#94A3B8] text-center py-6">No notes added.</div>
                ) : (
                  notes.map((n: any) => (
                    <div key={n.id} className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#F1F5F9] space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#4A7B5B]">{n.title || "Note"}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-semibold">
                          {n.noteType}
                        </span>
                      </div>
                      <p className="text-[#64748B] leading-relaxed">{n.content}</p>
                      <div className="text-[10px] text-[#94A3B8] pt-1">
                        By {n.author?.fullName || "Staff"} on {new Date(n.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 12: SUPPORT */}
          {activeTab === "support" && (
            <div className="bg-white rounded-2xl border border-[#F1F5F9] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#4A7B5B]">Support Tickets & Issues</h3>
              <div className="space-y-3 text-xs">
                {supportTickets.length === 0 ? (
                  <div className="text-[#94A3B8] text-center py-6">No support tickets found for this student.</div>
                ) : (
                  supportTickets.map((t: any) => (
                    <div key={t.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-[#4A7B5B]">{t.subject}</div>
                        <div className="text-[11px] text-[#94A3B8]">{t.category} • Priority: {t.priority}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0284C7] font-semibold">
                        {t.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 13: ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="bg-white rounded-2xl border border-[#F1F5F9] p-6 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-[#4A7B5B]">Student Conversion & AI Analytics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#A7F3D0]">
                  <div className="text-xs text-[#047857]">Admission Chance</div>
                  <div className="text-2xl font-extrabold text-[#059669] mt-1">{analytics.admissionProbability || 85}%</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A]">
                  <div className="text-xs text-[#92400E]">Risk Score</div>
                  <div className="text-2xl font-extrabold text-[#D97706] mt-1">{analytics.riskLevel || "Low"}</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#E0F2FE] border border-[#BAE6FD]">
                  <div className="text-xs text-[#0369A1]">Suggested Action</div>
                  <div className="text-xs font-bold text-[#0284C7] mt-1">{analytics.suggestedNextAction || "Document Check"}</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT SIDE STICKY SUMMARY PANEL */}
        <div className="space-y-6 lg:sticky lg:top-6 self-start">
          <div className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Quick Student Summary</h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                <span className="text-[#94A3B8]">Current Status</span>
                <span className="font-bold text-[#4A7B5B]">{student.admissionStatus}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                <span className="text-[#94A3B8]">Current Stage</span>
                <span className="font-semibold text-[#4A7B5B]">{student.currentStage}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                <span className="text-[#94A3B8]">Counselor</span>
                <span className="font-semibold text-[#4A7B5B]">{assignedCounselor?.fullName || "Unassigned"}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                <span className="text-[#94A3B8]">Risk Level</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] font-semibold text-[10px]">
                  {analytics.riskLevel || "Low"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                <span className="text-[#94A3B8]">Profile Score</span>
                <span className="font-bold text-[#4A7B5B]">{student.profileCompletionPercentage}%</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#F8FAFC]">
                <span className="text-[#94A3B8]">Pending Docs</span>
                <span className="font-bold text-[#EA580C]">{documents.filter((d: any) => d.status !== "VERIFIED").length}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-[#94A3B8]">Applications</span>
                <span className="font-semibold text-[#4A7B5B]">{applications.length}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsCounselorModalOpen(true)}
                className="w-full py-2 rounded-xl bg-[#4A7B5B] text-white text-xs font-semibold hover:bg-[#3B6349] transition-colors"
              >
                Assign / Transfer Counselor
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL 1: ASSIGN COUNSELOR MODAL */}
      {isCounselorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#4A7B5B]">Assign or Transfer Counselor</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#64748B] mb-1">Select Counselor</label>
                <select
                  value={selectedCounselorId}
                  onChange={(e) => setSelectedCounselorId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs"
                >
                  <option value="">Select Counselor...</option>
                  {availableCounselors.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.email}) {c.department ? `• ${c.department}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#64748B] mb-1">Remarks</label>
                <textarea
                  value={counselorRemarks}
                  onChange={(e) => setCounselorRemarks(e.target.value)}
                  placeholder="Optional assignment notes..."
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs h-20"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsCounselorModalOpen(false)} className="px-4 py-2 rounded-xl border text-xs font-medium">Cancel</button>
              <button
                onClick={() => assignCounselorMutation.mutate({ counselorId: selectedCounselorId, remarks: counselorRemarks })}
                disabled={!selectedCounselorId || assignCounselorMutation.isPending}
                className="px-4 py-2 rounded-xl bg-[#4A7B5B] text-white text-xs font-semibold disabled:opacity-50"
              >
                Assign Counselor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SEND NOTIFICATION MODAL */}
      {isNotificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#4A7B5B]">Send Student Notification</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#64748B] mb-1">Channel</label>
                <select
                  value={notifChannel}
                  onChange={(e: any) => setNotifChannel(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs"
                >
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="PUSH">Push Notification</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#64748B] mb-1">Subject / Title</label>
                <input
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Notification title..."
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[#64748B] mb-1">Message Content</label>
                <textarea
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Write message content here..."
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs h-24"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsNotificationModalOpen(false)} className="px-4 py-2 rounded-xl border text-xs font-medium">Cancel</button>
              <button
                onClick={() => sendNotificationMutation.mutate({ channel: notifChannel, title: notifTitle, message: notifMessage })}
                disabled={!notifTitle || !notifMessage || sendNotificationMutation.isPending}
                className="px-4 py-2 rounded-xl bg-[#4A7B5B] text-white text-xs font-semibold disabled:opacity-50"
              >
                Send Notification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD NOTE MODAL */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#4A7B5B]">Add Student Note</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#64748B] mb-1">Note Type</label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs"
                >
                  <option value="GENERAL">General Note</option>
                  <option value="COUNSELOR">Counselor Note</option>
                  <option value="MANAGER">Manager Note</option>
                  <option value="PRIVATE">Private Note</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#64748B] mb-1">Title</label>
                <input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title..."
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[#64748B] mb-1">Content</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Note details..."
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs h-24"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsNoteModalOpen(false)} className="px-4 py-2 rounded-xl border text-xs font-medium">Cancel</button>
              <button
                onClick={() => createNoteMutation.mutate({ title: noteTitle, content: noteContent, noteType })}
                disabled={!noteContent || createNoteMutation.isPending}
                className="px-4 py-2 rounded-xl bg-[#4A7B5B] text-white text-xs font-semibold disabled:opacity-50"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Drawer */}
      {selectedReviewDocId && (
        <DocumentDetailDrawer
          documentId={selectedReviewDocId}
          onClose={() => {
            setSelectedReviewDocId(null);
            queryClient.invalidateQueries({ queryKey: ["student_documents", studentId] });
            queryClient.invalidateQueries({ queryKey: ["admin_student_checklist", studentId] });
          }}
        />
      )}

      {/* CRM Log Interaction Modal */}
      <LogInteractionModal
        isOpen={isLogInteractionOpen}
        onClose={() => setIsLogInteractionOpen(false)}
        contextType="STUDENT"
        contextId={studentId}
        studentName={student.fullName}
        assignedCounselorId={assignedCounselor?.id}
        applicationId={applications[0]?.id}
        defaultTab={logInteractionTab}
      />
    </div>
  );
}
