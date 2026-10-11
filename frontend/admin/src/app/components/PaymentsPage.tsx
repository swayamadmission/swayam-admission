import React, { useState, useEffect } from "react";
import {
  Search, CreditCard, DollarSign, Download, Plus, CheckCircle, XCircle, RefreshCw,
  Eye, Filter, Calendar, Building, BookOpen, Users, TrendingUp, AlertTriangle, ShieldCheck, PieChart, FileText,
  Check, ArrowRight, Lock, Copy, Settings, ShieldAlert, Layers, ExternalLink, Image as ImageIcon, Send, Trash2, Edit
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi, PaymentQueryParams } from "../../api/payments.api";
import { collegesApi } from "../../api/colleges.api";
import { coursesApi } from "../../api/courses.api";
import { usersApi } from "../../api/users.api";
import PaymentDetailDrawer from "./PaymentDetailDrawer";
import PaymentFormModal from "./PaymentFormModal";

export default function PaymentsPage() {
  const queryClient = useQueryClient();

  // Filters state for All Payments
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedCounselor, setSelectedCounselor] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Drawer & Modal state
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "verify" | "refund" | null>(null);
  const [targetPayment, setTargetPayment] = useState<any>(null);

  // Enterprise Tab State
  const [activeTab, setActiveTab] = useState<
    "all_payments" | "invoices" | "reconciliation" | "verification_queue" | "payment_requests" | "fee_heads" | "college_config" | "analytics" | "sla_fraud"
  >("all_payments");

  // Reconciliation Resolution Modal State
  const [recModal, setRecModal] = useState<{ isOpen: boolean; record: any | null; action: 'RESOLVE_MATCH' | 'FORCE_RECONCILE' | 'FLAG_FRAUD' }>({
    isOpen: false,
    record: null,
    action: 'RESOLVE_MATCH',
  });
  const [recRemarks, setRecRemarks] = useState("");

  // Local Modals & Action States
  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; paymentId: string | null; action: string }>({
    isOpen: false,
    paymentId: null,
    action: "REJECT",
  });
  const [rejectionReason, setRejectionReason] = useState("");

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [newRequestForm, setNewRequestForm] = useState({
    studentId: "",
    applicationId: "",
    collegeId: "",
    courseId: "",
    feeHead: "SEMESTER_FEE",
    totalAmount: "",
    requestedAmount: "",
    discountType: "NO_DISCOUNT",
    discountValue: "",
    scholarshipAmount: "",
    lateFeeAmount: "",
    dueDate: "",
    expiryDate: "",
    paymentDestination: "",
    assignedReviewerId: "",
    remarks: "",
  });

  const [feeHeadModalOpen, setFeeHeadModalOpen] = useState(false);
  const [editingFeeHead, setEditingFeeHead] = useState<any>(null);
  const [feeHeadForm, setFeeHeadForm] = useState({
    name: "",
    code: "",
    description: "",
    defaultAmount: "",
    isMandatory: true,
    applicableCollegeId: "",
    lateFeeAmount: "0",
  });

  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
    upiId: "",
    qrCodeUrl: "",
    category: "ADMISSION",
    instructions: "",
    isDefault: true,
  });

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Config tab selected college
  const [configCollegeId, setConfigCollegeId] = useState<string>("");

  // ==========================================
  // QUERIES
  // ==========================================

  // Stats query
  const { data: statsRes, refetch: refetchStats } = useQuery({
    queryKey: ["payment_stats"],
    queryFn: () => paymentsApi.getStats(),
  });

  // Payments table query
  const queryParams: PaymentQueryParams = {
    skip: (page - 1) * limit,
    limit,
    search: search || undefined,
    status: selectedStatus || undefined,
    paymentMethod: selectedMethod || undefined,
    paymentType: selectedType || undefined,
    collegeId: selectedCollege || undefined,
    courseId: selectedCourse || undefined,
    counselorId: selectedCounselor || undefined,
  };

  const { data: paymentsRes, isLoading: isPaymentsLoading } = useQuery({
    queryKey: ["admin_payments", queryParams],
    queryFn: () => paymentsApi.findAll(queryParams),
  });

  // Verification Queue Query
  const { data: vQueueRes, refetch: refetchQueue } = useQuery({
    queryKey: ["verification_queue"],
    queryFn: () => paymentsApi.getVerificationQueue(),
    enabled: activeTab === "verification_queue",
  });

  // Payment Requests Query
  const { data: requestsRes, refetch: refetchRequests } = useQuery({
    queryKey: ["admin_payment_requests"],
    queryFn: () => paymentsApi.getAdminRequests({ limit: 100 }),
    enabled: activeTab === "payment_requests",
  });

  // Fee Heads Query
  const { data: feeHeadsRes, refetch: refetchFeeHeads } = useQuery({
    queryKey: ["admin_fee_heads"],
    queryFn: () => paymentsApi.getFeeHeads(),
    enabled: activeTab === "fee_heads" || requestModalOpen,
  });

  // SLA Breaches & Fraud Query
  const { data: fraudRes, refetch: refetchFraud } = useQuery({
    queryKey: ["fraud_alerts"],
    queryFn: () => paymentsApi.getFraudAlerts(),
    enabled: activeTab === "sla_fraud",
  });

  const { data: slaRes, refetch: refetchSla } = useQuery({
    queryKey: ["sla_breaches"],
    queryFn: () => paymentsApi.getSlaBreaches(),
    enabled: activeTab === "sla_fraud",
  });

  // Invoices Query
  const { data: invoicesRes, refetch: refetchInvoices } = useQuery({
    queryKey: ["invoices_list", search, selectedCollege, page],
    queryFn: () => paymentsApi.getInvoices({ search, collegeId: selectedCollege || undefined, page, limit }),
    enabled: activeTab === "invoices",
  });

  // Reconciliation Queue Query
  const { data: recRes, refetch: refetchRec } = useQuery({
    queryKey: ["reconciliation_queue", selectedCollege, page],
    queryFn: () => paymentsApi.getReconciliationQueue({ collegeId: selectedCollege || undefined, page, limit }),
    enabled: activeTab === "reconciliation",
  });

  // Filter Dropdowns
  const { data: collegesRes } = useQuery({
    queryKey: ["colleges_filter"],
    queryFn: () => collegesApi.findAll({ limit: 100 }),
  });

  const { data: coursesRes } = useQuery({
    queryKey: ["courses_filter", selectedCollege],
    queryFn: () => coursesApi.findAll({ collegeId: selectedCollege || undefined, limit: 100 }),
  });

  const { data: counselorsRes } = useQuery({
    queryKey: ["counselors_filter"],
    queryFn: () => usersApi.getAllCounselors({ limit: 100 }),
  });

  const { data: studentsRes } = useQuery({
    queryKey: ["students_filter"],
    queryFn: () => usersApi.getAll({ role: "STUDENT", limit: 100 }),
    enabled: requestModalOpen,
  });

  // College Config Query
  const { data: collegeConfigRes, refetch: refetchCollegeConfig } = useQuery({
    queryKey: ["college_config", configCollegeId],
    queryFn: () => paymentsApi.getCollegeConfig(configCollegeId),
    enabled: !!configCollegeId && activeTab === "college_config",
  });

  // Data Extracts
  const stats = statsRes?.data || {};
  const payments = paymentsRes?.data?.data || [];
  const totalRecords = paymentsRes?.data?.total || 0;
  const totalPages = Math.ceil(totalRecords / limit) || 1;

  const verificationQueue = vQueueRes?.data?.data || vQueueRes?.data || [];
  const adminRequests = requestsRes?.data?.data || [];
  const feeHeadsList = feeHeadsRes?.data?.data || feeHeadsRes?.data || [];
  const fraudAlertsList = fraudRes?.data?.data || fraudRes?.data || [];
  const slaBreachesList = slaRes?.data?.data || slaRes?.data || [];
  const collegeConfig = collegeConfigRes?.data?.data || collegeConfigRes?.data || null;

  const colleges: any[] = Array.isArray(collegesRes?.data?.data)
    ? collegesRes?.data?.data
    : Array.isArray(collegesRes?.data)
    ? collegesRes?.data
    : [];

  const courses: any[] = Array.isArray(coursesRes?.data?.data)
    ? coursesRes?.data?.data
    : Array.isArray(coursesRes?.data)
    ? coursesRes?.data
    : [];

  const counselors: any[] = Array.isArray(counselorsRes?.data?.data)
    ? counselorsRes?.data?.data
    : Array.isArray(counselorsRes?.data)
    ? counselorsRes?.data
    : [];

  const students: any[] = Array.isArray(studentsRes?.data?.data)
    ? studentsRes?.data?.data
    : Array.isArray(studentsRes?.data)
    ? studentsRes?.data
    : [];

  // Fetch student payment context when student is selected in request modal
  const { data: studentContextRes } = useQuery({
    queryKey: ["student_payment_context", newRequestForm.studentId],
    queryFn: () => paymentsApi.getStudentContext(newRequestForm.studentId),
    enabled: Boolean(newRequestForm.studentId),
  });

  const studentContext = studentContextRes?.data?.data || studentContextRes?.data || null;

  useEffect(() => {
    if (studentContext) {
      setNewRequestForm((prev) => ({
        ...prev,
        applicationId: studentContext.primaryApplicationId || prev.applicationId,
        collegeId: studentContext.primaryCollegeId || prev.collegeId,
        courseId: studentContext.primaryCourseId || prev.courseId,
        assignedReviewerId: studentContext.primaryCounselorId || prev.assignedReviewerId,
      }));
    }
  }, [studentContext]);

  // Default first college for config tab
  useEffect(() => {
    if (!configCollegeId && colleges.length > 0) {
      setConfigCollegeId(colleges[0].id);
    }
  }, [colleges, configCollegeId]);

  // Local state for College Config form edits
  const [configForm, setConfigForm] = useState({
    paymentMode: "HYBRID",
    platformGateways: { razorpay: true, phonepe: true, cashfree: false, stripe: false, paytm: false },
    hybridFeeHeadMapping: {
      REGISTRATION_FEE: "PLATFORM",
      COUNSELING_FEE: "PLATFORM",
      ADMISSION_FEE: "DIRECT_COLLEGE",
      SEMESTER_FEE: "DIRECT_COLLEGE",
      HOSTEL_FEE: "DIRECT_COLLEGE",
      TRANSPORT_FEE: "PLATFORM",
      EXAMINATION_FEE: "PLATFORM",
      SECURITY_DEPOSIT: "DIRECT_COLLEGE",
    },
    receiptPrefix: "SA-REC",
    invoicePrefix: "SA-INV",
  });

  useEffect(() => {
    if (collegeConfig) {
      setConfigForm({
        paymentMode: collegeConfig.paymentMode || "HYBRID",
        platformGateways: collegeConfig.platformGateways || { razorpay: true, phonepe: true, cashfree: false, stripe: false, paytm: false },
        hybridFeeHeadMapping: collegeConfig.hybridFeeHeadMapping || {
          REGISTRATION_FEE: "PLATFORM",
          COUNSELING_FEE: "PLATFORM",
          ADMISSION_FEE: "DIRECT_COLLEGE",
          SEMESTER_FEE: "DIRECT_COLLEGE",
          HOSTEL_FEE: "DIRECT_COLLEGE",
          TRANSPORT_FEE: "PLATFORM",
          EXAMINATION_FEE: "PLATFORM",
          SECURITY_DEPOSIT: "DIRECT_COLLEGE",
        },
        receiptPrefix: collegeConfig.receiptPrefix || "SA-REC",
        invoicePrefix: collegeConfig.invoicePrefix || "SA-INV",
      });
    }
  }, [collegeConfig]);

  // ==========================================
  // MUTATIONS
  // ==========================================

  const verifyStepMutation = useMutation({
    mutationFn: (payload: { paymentId: string; action: string; remarks?: string; requestedUTR?: boolean }) =>
      paymentsApi.verifyStep(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_payments"] });
      queryClient.invalidateQueries({ queryKey: ["verification_queue"] });
      queryClient.invalidateQueries({ queryKey: ["payment_stats"] });
      queryClient.invalidateQueries({ queryKey: ["sla_breaches"] });
      queryClient.invalidateQueries({ queryKey: ["fraud_alerts"] });
      setRejectionModal({ isOpen: false, paymentId: null, action: "REJECT" });
      setRejectionReason("");
    },
  });

  const updateCollegeConfigMutation = useMutation({
    mutationFn: (payload: any) => paymentsApi.updateCollegeConfig(configCollegeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["college_config", configCollegeId] });
      alert("College payment governance policy updated successfully!");
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: (payload: any) => paymentsApi.createPaymentRequest(payload),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin_payment_requests"] });
      queryClient.invalidateQueries({ queryKey: ["my_payment_requests"] });
      queryClient.invalidateQueries({ queryKey: ["payment_stats"] });
      queryClient.invalidateQueries({ queryKey: ["payment_summary"] });
      queryClient.invalidateQueries({ queryKey: ["journey"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setRequestModalOpen(false);
      setNewRequestForm({
        studentId: "",
        applicationId: "",
        collegeId: "",
        courseId: "",
        feeHead: "SEMESTER_FEE",
        totalAmount: "",
        requestedAmount: "",
        discountType: "NO_DISCOUNT",
        discountValue: "",
        scholarshipAmount: "",
        lateFeeAmount: "",
        dueDate: "",
        expiryDate: "",
        paymentDestination: "",
        assignedReviewerId: "",
        remarks: "",
      });
      alert(data?.data?.message || data?.message || "Official Payment Request generated and issued to student successfully!");
    },
    onError: (error: any) => {
      console.error("Payment Request Creation Error:", error);
      const msg = error?.response?.data?.message || error?.message || "Failed to issue payment request. Please check backend logs.";
      alert(`Error issuing payment request: ${Array.isArray(msg) ? msg.join(", ") : msg}`);
    },
  });

  const updateRequestStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => paymentsApi.updatePaymentRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_payment_requests"] });
    },
  });

  const createFeeHeadMutation = useMutation({
    mutationFn: (payload: any) => paymentsApi.createFeeHead(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_fee_heads"] });
      setFeeHeadModalOpen(false);
      setEditingFeeHead(null);
      alert("Fee head created successfully!");
    },
  });

  const updateFeeHeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => paymentsApi.updateFeeHead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_fee_heads"] });
      setFeeHeadModalOpen(false);
      setEditingFeeHead(null);
      alert("Fee head updated successfully!");
    },
  });

  const deleteFeeHeadMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.deleteFeeHead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_fee_heads"] });
    },
  });

  const addBankMutation = useMutation({
    mutationFn: (payload: any) => paymentsApi.configureCollegeBank({ collegeId: configCollegeId, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["college_config", configCollegeId] });
      setBankModalOpen(false);
      alert("College official bank account configured successfully!");
    },
  });

  const assignVerificationMutation = useMutation({
    mutationFn: (payload: { paymentId: string; reviewerId?: string; reviewerRole?: string }) =>
      paymentsApi.assignVerification(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification_queue"] });
    },
  });

  const handleExportCSV = async () => {
    try {
      const res = await paymentsApi.export(queryParams);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payments_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to export CSV:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "SUCCESS":
      case "VERIFIED":
      case "PAID":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "FAILED":
      case "CANCELLED":
      case "REJECTED":
      case "EXPIRED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "REFUNDED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "PARTIALLY_PAID":
      case "UTR_REQUESTED":
      case "REUPLOAD_REQUESTED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100%" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enterprise Payments & Financial Management</h1>
          <p className="text-xs text-slate-500 mt-1">Master control center for fee requests, routing engine, multi-role verifications, and ERP ledger accounting.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={() => setRequestModalOpen(true)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
          >
            <Send size={15} /> Issue Fee Request
          </button>
          <button
            onClick={() => {
              setTargetPayment(null);
              setModalMode("create");
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
          >
            <Plus size={15} /> Record Direct Payment
          </button>
        </div>
      </div>

      {/* 10 Dashboard Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Revenue", value: `₹${(stats.totalRevenue || 0).toLocaleString("en-IN")}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Today's Revenue", value: `₹${(stats.todayRevenue || 0).toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Monthly Revenue", value: `₹${(stats.monthlyRevenue || 0).toLocaleString("en-IN")}`, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Pending Payments", value: stats.pendingPayments || 0, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Successful Txns", value: stats.successfulPayments || 0, icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-100" },
          { label: "Failed / Cancelled", value: stats.failedPayments || 0, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Refunded Count", value: stats.refundedPayments || 0, icon: RefreshCw, color: "text-purple-700", bg: "bg-purple-100" },
          { label: "Outstanding Fees", value: `₹${(stats.outstandingFees || 0).toLocaleString("en-IN")}`, icon: CreditCard, color: "text-rose-700", bg: "bg-rose-100" },
          { label: "Collection Rate", value: `${stats.collectionRate || 100}%`, icon: PieChart, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Avg Payment", value: `₹${(stats.averagePaymentValue || 0).toLocaleString("en-IN")}`, icon: ShieldCheck, color: "text-teal-600", bg: "bg-teal-50" },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
              <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon size={14} className={card.color} />
              </div>
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">{card.value}</span>
          </div>
        ))}
      </div>

      {/* Enterprise Module Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: "all_payments", label: "All Payments", count: totalRecords },
          { id: "invoices", label: "Invoices", count: invoicesRes?.data?.meta?.total },
          { id: "reconciliation", label: "Reconciliation Engine", count: recRes?.data?.meta?.total },
          { id: "verification_queue", label: "Verification Queue", count: verificationQueue.length },
          { id: "payment_requests", label: "Payment Requests", count: adminRequests.length },
          { id: "fee_heads", label: "Fee Heads", count: feeHeadsList.length },
          { id: "college_config", label: "College Routing Engine" },
          { id: "analytics", label: "Analytics & Trends" },
          { id: "sla_fraud", label: "SLA & Fraud Alerts", count: (fraudAlertsList.length || 0) + (slaBreachesList.length || 0) },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-[#4A7B5B] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ==========================================
          TAB 1: ALL PAYMENTS
         ========================================== */}
      {activeTab === "all_payments" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by student name, email, mobile, App ID, transaction ID, receipt/invoice..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20"
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">Completed / Success</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="VERIFICATION_PENDING">Verification Pending</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="REFUNDED">Refunded</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="">All Payment Types</option>
                <option value="REGISTRATION_FEE">Registration Fee</option>
                <option value="ADMISSION_FEE">Admission Fee</option>
                <option value="SEMESTER_FEE">Semester Fee</option>
                <option value="HOSTEL_FEE">Hostel Fee</option>
                <option value="EXAM_FEE">Exam Fee</option>
                <option value="COUNSELING_FEE">Counseling Fee</option>
                <option value="DOCUMENT_FEE">Document Fee</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
              >
                <option value="">All Methods (UPI, Card, NetBanking...)</option>
                <option value="UPI">UPI / QR</option>
                <option value="NET_BANKING">Net Banking</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
              </select>

              <select
                value={selectedCollege}
                onChange={(e) => {
                  setSelectedCollege(e.target.value);
                  setSelectedCourse("");
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
              >
                <option value="">All Colleges</option>
                {colleges.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
              >
                <option value="">All Courses</option>
                {courses.map((crs: any) => (
                  <option key={crs.id} value={crs.id}>
                    {crs.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCounselor}
                onChange={(e) => setSelectedCounselor(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
              >
                <option value="">All Counselors</option>
                {counselors.map((csl: any) => (
                  <option key={csl.id} value={csl.id}>
                    {csl.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isPaymentsLoading ? (
            <div className="text-center py-20 text-slate-400 text-sm">Loading enterprise transactions...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <CreditCard className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-900">No payment records found</h3>
              <p className="text-slate-400 text-xs mt-1">Try resetting your filters or search keywords.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-5 py-3.5">Txn ID / Receipt</th>
                      <th className="px-5 py-3.5">Student & App ID</th>
                      <th className="px-5 py-3.5">College & Program</th>
                      <th className="px-5 py-3.5">Type & Method</th>
                      <th className="px-5 py-3.5">Fee Breakdown</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Date & Verifier</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-medium">
                          <div className="font-bold text-slate-900">{p.transactionId || `Txn #${p.id.slice(0, 8)}`}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Rcp: {p.receiptNumber || 'N/A'}</div>
                          <div className="text-[10px] text-slate-400">Inv: {p.invoiceNumber || 'N/A'}</div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{p.user?.fullName || "Student"}</div>
                          <div className="text-[11px] text-slate-500">{p.user?.email || p.user?.mobile}</div>
                          <div className="text-[10px] text-blue-600 mt-0.5 font-mono">App: {p.application?.applicationId || p.applicationId || "N/A"}</div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">{p.college?.name || p.application?.college?.name || "Institute"}</div>
                          <div className="text-[11px] text-slate-500">{p.course?.name || p.application?.course?.name || "Course"}</div>
                          {p.counselor && <div className="text-[10px] text-amber-700 mt-0.5">Counselor: {p.counselor.fullName}</div>}
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-slate-800 block">{p.paymentType}</span>
                          <span className="text-[11px] text-slate-500">{p.paymentMethod || 'UPI'} • {p.gateway || 'Manual'}</span>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">₹{(p.paidAmount || p.amount || 0).toLocaleString('en-IN')}</div>
                          {p.scholarshipAmount > 0 && <div className="text-[10px] text-purple-700">Sch: -₹{p.scholarshipAmount}</div>}
                          {p.discountAmount > 0 && <div className="text-[10px] text-blue-700">Disc: -₹{p.discountAmount}</div>}
                          {p.pendingAmount > 0 && <div className="text-[10px] text-rose-600 font-bold">Due: ₹{p.pendingAmount}</div>}
                        </td>

                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(p.status)}`}>
                            {p.status}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-[11px] text-slate-500">
                          <div>{p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : new Date(p.createdAt).toLocaleDateString('en-IN')}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Verified: {p.verifier?.fullName || p.verifiedBy || 'System'}</div>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedPaymentId(p.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            {p.status !== 'COMPLETED' && p.status !== 'SUCCESS' && (
                              <button
                                onClick={() => {
                                  setTargetPayment(p);
                                  setModalMode('verify');
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Verify & Approve"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            {p.status === 'COMPLETED' && (
                              <button
                                onClick={() => {
                                  setTargetPayment(p);
                                  setModalMode('refund');
                                }}
                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Process Refund"
                              >
                                <RefreshCw size={16} />
                              </button>
                            )}
                            <a
                              href={`/api/payments/${p.id}/receipt`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Receipt"
                            >
                              <FileText size={16} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing {Math.min(totalRecords, (page - 1) * limit + 1)} to {Math.min(totalRecords, page * limit)} of {totalRecords} records
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg font-semibold"
                  >
                    Previous
                  </button>
                  <span className="py-1.5 px-3 font-bold text-slate-900">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg font-semibold"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB: INVOICES MATRIX
         ========================================== */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search invoice number, student name, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedCollege}
                  onChange={(e) => setSelectedCollege(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="">All Institutions</option>
                  {colleges.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => refetchInvoices()}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs"
                  title="Refresh Invoices"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Invoice No</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Institution & Course</th>
                    <th className="py-3.5 px-4">Session & Plan</th>
                    <th className="py-3.5 px-4 text-right">Net Payable</th>
                    <th className="py-3.5 px-4 text-right">Paid</th>
                    <th className="py-3.5 px-4 text-right">Balance</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoicesRes?.data?.data && invoicesRes.data.data.length > 0 ? (
                    invoicesRes.data.data.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{inv.student?.fullName || "Student"}</div>
                          <div className="text-[11px] text-slate-400">{inv.student?.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{inv.college?.name}</div>
                          <div className="text-[11px] text-slate-500">{inv.course?.name || "Program"}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                            {inv.academicSession}
                          </span>
                          <span className="ml-1 text-[11px] text-slate-500 font-medium">({inv.feePlan})</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                          ₹{inv.finalPayableAmount?.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                          ₹{inv.paidAmount?.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                          ₹{inv.remainingBalance?.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getStatusBadge(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                              <button
                                onClick={async () => {
                                  const reason = prompt("Enter cancellation reason for invoice " + inv.invoiceNumber);
                                  if (reason) {
                                    await paymentsApi.cancelInvoice(inv.id, reason);
                                    refetchInvoices();
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Cancel Invoice"
                              >
                                <XCircle size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                        No authoritative invoices found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB: FINANCIAL RECONCILIATION ENGINE
         ========================================== */}
      {activeTab === "reconciliation" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search reconciliation ID, settlement reference, batch..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedCollege}
                  onChange={(e) => setSelectedCollege(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="">All Institutions</option>
                  {colleges.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => refetchRec()}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs"
                  title="Refresh Reconciliation Queue"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Reconciliation ID</th>
                    <th className="py-3.5 px-4">Institution</th>
                    <th className="py-3.5 px-4">Settlement Ref</th>
                    <th className="py-3.5 px-4">Batch</th>
                    <th className="py-3.5 px-4 text-right">Internal Amount</th>
                    <th className="py-3.5 px-4 text-right">Settlement Amount</th>
                    <th className="py-3.5 px-4 text-right">Difference</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Remarks / Reason</th>
                    <th className="py-3.5 px-4 text-center">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recRes?.data?.data && recRes.data.data.length > 0 ? (
                    recRes.data.data.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {r.reconciliationId}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {r.college?.name || "Institution"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {r.settlementReference || "—"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {r.settlementBatch || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          ₹{r.internalAmount?.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-blue-600">
                          ₹{r.settlementAmount?.toLocaleString("en-IN")}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-extrabold ${Math.abs(r.amountDifference) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {r.amountDifference > 0 ? `+₹${r.amountDifference.toLocaleString("en-IN")}` : `₹${r.amountDifference?.toLocaleString("en-IN")}`}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                              r.status === "MATCHED" || r.status === "RESOLVED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : r.status === "AMOUNT_MISMATCH"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                          {r.mismatchReason || r.resolvedRemarks || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {r.status !== "RESOLVED" && r.status !== "MATCHED" && (
                            <button
                              onClick={() => {
                                setRecModal({ isOpen: true, record: r, action: "RESOLVE_MATCH" });
                                setRecRemarks("");
                              }}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold shadow-sm"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                        No financial reconciliation records found in queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Resolution Modal */}
      {recModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Resolve Settlement Discrepancy</h3>
            <p className="text-xs text-slate-500">
              Record ID: <span className="font-mono font-bold text-slate-800">{recModal.record?.reconciliationId}</span>
            </p>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Resolution Action</label>
              <select
                value={recModal.action}
                onChange={(e: any) => setRecModal((p) => ({ ...p, action: e.target.value }))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="RESOLVE_MATCH">Match & Resolve Discrepancy</option>
                <option value="FORCE_RECONCILE">Force Settlement Adjustment</option>
                <option value="FLAG_FRAUD">Flag for Audit / Fraud Investigation</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Auditor Remarks *</label>
              <textarea
                rows={3}
                value={recRemarks}
                onChange={(e) => setRecRemarks(e.target.value)}
                placeholder="State the audit justification or bank reference verification details..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRecModal({ isOpen: false, record: null, action: "RESOLVE_MATCH" })}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!recRemarks.trim()) {
                    alert("Auditor remarks are required!");
                    return;
                  }
                  await paymentsApi.resolveReconciliation(recModal.record.id, {
                    remarks: recRemarks,
                    action: recModal.action,
                  });
                  setRecModal({ isOpen: false, record: null, action: "RESOLVE_MATCH" });
                  refetchRec();
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB: VERIFICATION QUEUE
         ========================================== */}
      {activeTab === "verification_queue" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Multi-Role Payment Verification Queue</h3>
              <p className="text-xs text-slate-500">Review student-submitted UTR numbers, payment proof screenshots, and perform multi-step approvals.</p>
            </div>
            <button
              onClick={() => refetchQueue()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw size={13} /> Refresh Queue
            </button>
          </div>

          {verificationQueue.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
              <h3 className="text-base font-bold text-slate-900">Verification Queue Clear!</h3>
              <p className="text-slate-400 text-xs mt-1">All pending payment proofs and UTR submissions have been processed.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-5 py-3.5">Student & App ID</th>
                      <th className="px-5 py-3.5">College & Fee Head</th>
                      <th className="px-5 py-3.5">Amount & Mode</th>
                      <th className="px-5 py-3.5">Proof Screenshot & UTR</th>
                      <th className="px-5 py-3.5">Assigned Reviewer</th>
                      <th className="px-5 py-3.5">Verification Status</th>
                      <th className="px-5 py-3.5 text-right">Governance Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {verificationQueue.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{item.user?.fullName || "Student"}</div>
                          <div className="text-[11px] text-slate-500">{item.user?.email || item.user?.mobile}</div>
                          <div className="text-[10px] text-blue-600 font-mono mt-0.5">App: {item.application?.applicationId || "N/A"}</div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">{item.college?.name || "Institute"}</div>
                          <div className="text-[11px] text-slate-500">{item.course?.name || item.paymentType}</div>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                            {item.paymentType}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900 text-sm">₹{(item.paidAmount || item.amount || 0).toLocaleString("en-IN")}</div>
                          <div className="text-[11px] text-slate-500">{item.paymentDestination || "PLATFORM"}</div>
                        </td>

                        <td className="px-5 py-3.5">
                          {(item.proofDocument || item.paymentProofUrl) ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPreviewImageUrl(item.proofDocument || item.paymentProofUrl)}
                                className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 hover:opacity-80 transition-opacity"
                              >
                                <img src={item.proofDocument || item.paymentProofUrl} alt="Proof" className="w-full h-full object-cover" />
                              </button>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-mono">UTR: {item.utrNumber || "N/A"}</span>
                                <button
                                  onClick={() => setPreviewImageUrl(item.proofDocument || item.paymentProofUrl)}
                                  className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                                >
                                  <ImageIcon size={12} /> View Proof
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">UTR: {item.utrNumber || "No proof uploaded"}</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <select
                            value={item.verifier?.id || item.verifiedBy || ""}
                            onChange={(e) =>
                              assignVerificationMutation.mutate({ paymentId: item.id, reviewerId: e.target.value })
                            }
                            className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-700"
                          >
                            <option value="">Assign Reviewer</option>
                            {counselors.map((c: any) => (
                              <option key={c.id} value={c.id}>
                                {c.fullName} ({c.role})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(item.verificationStatus || item.status)}`}>
                            {item.verificationStatus || item.status}
                          </span>
                          {item.isFlaggedFraud && (
                            <div className="text-[10px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                              <ShieldAlert size={12} /> Fraud Flagged
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => verifyStepMutation.mutate({ paymentId: item.id, action: "APPROVE", remarks: "Approved by Admin" })}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectionModal({ isOpen: true, paymentId: item.id, action: "REJECT" })}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => verifyStepMutation.mutate({ paymentId: item.id, action: "REQUEST_UTR" })}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Request UTR
                            </button>
                            <button
                              onClick={() => verifyStepMutation.mutate({ paymentId: item.id, action: "REQUEST_REUPLOAD" })}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                            >
                              Re-upload
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 3: PAYMENT REQUESTS MANAGEMENT
         ========================================== */}
      {activeTab === "payment_requests" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Official Student Payment Requests</h3>
              <p className="text-xs text-slate-500">Issued payment requests. Students cannot pay or upload proof without an official request.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRequestModalOpen(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} /> New Request
              </button>
              <button
                onClick={() => refetchRequests()}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-5 py-3.5">Request Code</th>
                    <th className="px-5 py-3.5">Student & App</th>
                    <th className="px-5 py-3.5">Fee Head & Mode</th>
                    <th className="px-5 py-3.5">Requested / Paid / Due</th>
                    <th className="px-5 py-3.5">Due Date & Expiry</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminRequests.map((req: any) => (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-900">{req.requestCode}</td>

                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{req.student?.fullName || "Student"}</div>
                        <div className="text-[11px] text-slate-500">{req.student?.email || req.student?.mobile}</div>
                        {req.application && <div className="text-[10px] text-blue-600 font-mono">App: {req.application.applicationId}</div>}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{req.feeHead}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                          {req.paymentDestination}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-medium">
                        <div className="font-bold text-slate-900">Req: ₹{(req.requestedAmount || 0).toLocaleString("en-IN")}</div>
                        <div className="text-[11px] text-emerald-600 font-bold">Paid: ₹{(req.paidAmount || 0).toLocaleString("en-IN")}</div>
                        <div className="text-[10px] text-rose-600 font-bold">Due: ₹{(req.dueAmount || 0).toLocaleString("en-IN")}</div>
                      </td>

                      <td className="px-5 py-3.5 text-[11px] text-slate-500">
                        <div>Due: {req.dueDate ? new Date(req.dueDate).toLocaleDateString("en-IN") : "N/A"}</div>
                        <div className="text-[10px] text-slate-400">Exp: {req.expiryDate ? new Date(req.expiryDate).toLocaleDateString("en-IN") : "N/A"}</div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status !== "PAID" && (
                            <button
                              onClick={() => updateRequestStatusMutation.mutate({ id: req.id, data: { status: "ISSUED" } })}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                              title="Re-issue Request"
                            >
                              Issue
                            </button>
                          )}
                          {req.status !== "CANCELLED" && (
                            <button
                              onClick={() => updateRequestStatusMutation.mutate({ id: req.id, data: { status: "CANCELLED" } })}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold"
                              title="Cancel Request"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: FEE HEADS MANAGEMENT
         ========================================== */}
      {activeTab === "fee_heads" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Enterprise Fee Heads Master Registry</h3>
              <p className="text-xs text-slate-500">Configure dynamic fee components, default amounts, late fees, and mandatory flags.</p>
            </div>
            <button
              onClick={() => {
                setEditingFeeHead(null);
                setFeeHeadForm({ name: "", code: "", description: "", defaultAmount: "", isMandatory: true, applicableCollegeId: "", lateFeeAmount: "0" });
                setFeeHeadModalOpen(true);
              }}
              className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Fee Head
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Code & Name</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Default Amount</th>
                  <th className="px-5 py-3.5">Late Fee Amount</th>
                  <th className="px-5 py-3.5">Mandatory</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feeHeadsList.map((fh: any) => (
                  <tr key={fh.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-medium">
                      <div className="font-bold text-slate-900">{fh.name}</div>
                      <div className="text-[10px] text-blue-600 font-mono">{fh.code}</div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">{fh.description || "N/A"}</td>

                    <td className="px-5 py-3.5 font-bold text-slate-900">₹{(fh.defaultAmount || 0).toLocaleString("en-IN")}</td>

                    <td className="px-5 py-3.5 text-slate-600 font-mono">₹{(fh.lateFeeAmount || 0).toLocaleString("en-IN")}</td>

                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${fh.isMandatory ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {fh.isMandatory ? "MANDATORY" : "OPTIONAL"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${fh.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700"}`}>
                        {fh.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingFeeHead(fh);
                            setFeeHeadForm({
                              name: fh.name,
                              code: fh.code,
                              description: fh.description || "",
                              defaultAmount: String(fh.defaultAmount || 0),
                              isMandatory: fh.isMandatory,
                              applicableCollegeId: fh.applicableCollegeId || "",
                              lateFeeAmount: String(fh.lateFeeAmount || 0),
                            });
                            setFeeHeadModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete fee head ${fh.name}?`)) {
                              deleteFeeHeadMutation.mutate(fh.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 5: COLLEGE ROUTING ENGINE & CONFIG
         ========================================== */}
      {activeTab === "college_config" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">College Payment Policy & Routing Control Center</h3>
              <p className="text-xs text-slate-500">Configure whether student payments route to Platform Gateways or Direct College Bank Accounts, or Hybrid per fee head.</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Select College:</label>
              <select
                value={configCollegeId}
                onChange={(e) => setConfigCollegeId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              >
                {colleges.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {collegeConfig && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Payment Mode Selector */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Settings size={16} /> 1. Select Payment Mode
                </h4>

                <div className="space-y-3">
                  {[
                    { mode: "PLATFORM", title: "PLATFORM GATEWAY ONLY", desc: "Student sees ONLY Razorpay, PhonePe, etc. Funds collect in Platform bank." },
                    { mode: "DIRECT_COLLEGE", title: "DIRECT COLLEGE BANK ONLY", desc: "Student sees ONLY assigned College Bank Account, IFSC, QR & UPI." },
                    { mode: "HYBRID", title: "HYBRID (FEE-HEAD SPECIFIC)", desc: "Automatically routes specific fee heads to Platform or College Account." },
                  ].map((item) => (
                    <label
                      key={item.mode}
                      className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                        configForm.paymentMode === item.mode
                          ? "bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMode"
                          checked={configForm.paymentMode === item.mode}
                          onChange={() => setConfigForm((prev) => ({ ...prev, paymentMode: item.mode }))}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{item.title}</span>
                          <span className="text-[11px] text-slate-500">{item.desc}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Platform Gateways Toggle */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={16} /> 2. Enabled Gateways
                </h4>

                <div className="space-y-3">
                  {["razorpay", "phonepe", "cashfree", "stripe", "paytm"].map((gw) => (
                    <label key={gw} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                      <span className="text-xs font-bold text-slate-800 capitalize">{gw}</span>
                      <input
                        type="checkbox"
                        checked={(configForm.platformGateways as any)[gw]}
                        onChange={(e) =>
                          setConfigForm((prev) => ({
                            ...prev,
                            platformGateways: { ...prev.platformGateways, [gw]: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Save Policy Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck size={16} /> 3. Document Prefixing
                  </h4>
                  <div className="space-y-3 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Prefix</label>
                      <input
                        type="text"
                        value={configForm.receiptPrefix}
                        onChange={(e) => setConfigForm((prev) => ({ ...prev, receiptPrefix: e.target.value }))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Prefix</label>
                      <input
                        type="text"
                        value={configForm.invoicePrefix}
                        onChange={(e) => setConfigForm((prev) => ({ ...prev, invoicePrefix: e.target.value }))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => updateCollegeConfigMutation.mutate(configForm)}
                  className="w-full py-3 bg-[#4A7B5B] hover:bg-[#3d674c] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Save Policy Settings
                </button>
              </div>

              {/* Hybrid Fee Head Mapping Grid (Full Width) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={16} /> 4. Hybrid Fee Head Routing Mapping
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    "REGISTRATION_FEE",
                    "COUNSELING_FEE",
                    "ADMISSION_FEE",
                    "SEMESTER_FEE",
                    "HOSTEL_FEE",
                    "TRANSPORT_FEE",
                    "EXAMINATION_FEE",
                    "SECURITY_DEPOSIT",
                  ].map((head) => (
                    <div key={head} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{head}</span>
                      <select
                        value={(configForm.hybridFeeHeadMapping as any)[head] || "PLATFORM"}
                        onChange={(e) =>
                          setConfigForm((prev) => ({
                            ...prev,
                            hybridFeeHeadMapping: { ...prev.hybridFeeHeadMapping, [head]: e.target.value },
                          }))
                        }
                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                      >
                        <option value="PLATFORM">PLATFORM GATEWAY</option>
                        <option value="DIRECT_COLLEGE">DIRECT COLLEGE BANK</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* College Accounts Manager */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Building size={16} /> College Bank Accounts
                  </h4>
                  <button
                    onClick={() => setBankModalOpen(true)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Bank
                  </button>
                </div>

                <div className="space-y-3">
                  {collegeConfig.bankAccounts?.length > 0 ? (
                    collegeConfig.bankAccounts.map((b: any) => (
                      <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{b.bankName}</span>
                          {b.isDefault && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px]">DEFAULT</span>}
                        </div>
                        <div className="font-mono text-emerald-700 font-semibold">{b.accountNumber} ({b.ifscCode})</div>
                        <div className="text-slate-500 text-[11px]">{b.accountHolder} • UPI: {b.upiId || "N/A"}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 text-xs py-6 text-center">No bank accounts configured for this college.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 6: ANALYTICS & TRENDS
         ========================================== */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Revenue & Outstanding Fee Trends</h3>
            <div className="grid grid-cols-6 gap-2 pt-2 border-t border-slate-100">
              {(stats.revenueTrend || []).map((m: any, idx: number) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">{m.month}</span>
                  <div className="text-sm font-extrabold text-emerald-700">₹{(m.revenue || 0).toLocaleString("en-IN")}</div>
                  <div className="text-[10px] text-rose-600 font-bold">Due: ₹{(m.pending || 0).toLocaleString("en-IN")}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue by College</h4>
              <div className="space-y-2">
                {(stats.revenueByCollege || []).map((c: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">{c.name}</span>
                    <span className="font-bold text-emerald-700">₹{(c.value || 0).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue by Course</h4>
              <div className="space-y-2">
                {(stats.revenueByCourse || []).map((crs: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">{crs.name}</span>
                    <span className="font-bold text-blue-700">₹{(crs.value || 0).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue by Counselor</h4>
              <div className="space-y-2">
                {(stats.revenueByCounselor || []).map((csl: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">{csl.name}</span>
                    <span className="font-bold text-purple-700">₹{(csl.value || 0).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 7: SLA & FRAUD ALERTS
         ========================================== */}
      {activeTab === "sla_fraud" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm space-y-2">
              <span className="text-xs font-bold text-rose-600 uppercase flex items-center gap-1.5">
                <ShieldAlert size={16} /> Flagged Fraud Alerts ({fraudAlertsList.length})
              </span>
              <p className="text-xs text-slate-500">Duplicate screenshot SHA-256 hash matches or suspicious UTR submissions.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm space-y-2">
              <span className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1.5">
                <AlertTriangle size={16} /> Active SLA Breaches ({slaBreachesList.length})
              </span>
              <p className="text-xs text-slate-500">Payment verification pending longer than 2 hours SLA deadline.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase">Fraud Alert Security Log</h4>
            <div className="space-y-3">
              {fraudAlertsList.length > 0 ? (
                fraudAlertsList.map((f: any) => (
                  <div key={f.id} className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{f.user?.fullName}</span> • <span className="font-mono">{f.transactionId || f.id}</span>
                      <p className="text-rose-700 font-semibold mt-0.5">{f.fraudReason || "Duplicate screenshot hash match"}</p>
                    </div>
                    <button
                      onClick={() => setSelectedPaymentId(f.id)}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-bold"
                    >
                      Audit Payment
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-xs py-8 text-center">No active fraud alerts detected.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODALS & DRAWERS
         ========================================== */}

      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Mandatory Rejection Reason Required</h3>
            <p className="text-xs text-slate-500">Please state the exact reason for rejecting this payment verification proof.</p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. UTR number invalid or amount mismatch with bank statement"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectionModal({ isOpen: false, paymentId: null, action: "REJECT" })}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rejectionReason) {
                    alert("Rejection reason is mandatory!");
                    return;
                  }
                  verifyStepMutation.mutate({
                    paymentId: rejectionModal.paymentId!,
                    action: "REJECT",
                    remarks: rejectionReason,
                  });
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2">
            <img src={previewImageUrl} alt="Proof Full Size" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            <div className="p-3 flex justify-between items-center bg-white text-xs">
              <span className="font-bold text-slate-700">Payment Screenshot Proof</span>
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {requestModalOpen && (() => {
        const calcGross = Number(newRequestForm.totalAmount || 0);
        const calcDiscVal = Number(newRequestForm.discountValue || 0);
        let calcDiscAmt = 0;
        if (newRequestForm.discountType === "PERCENTAGE") {
          calcDiscAmt = (calcGross * calcDiscVal) / 100;
        } else if (newRequestForm.discountType === "FIXED") {
          calcDiscAmt = calcDiscVal;
        }
        const calcSch = Number(newRequestForm.scholarshipAmount || 0);
        const calcLate = Number(newRequestForm.lateFeeAmount || 0);
        const calcFinal = Math.max(0, calcGross - calcDiscAmt - calcSch + calcLate);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
              <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Send size={16} className="text-emerald-400" /> Issue Official Payment Request
                </h3>
                <button onClick={() => setRequestModalOpen(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newRequestForm.studentId) {
                    alert("Please select a student.");
                    return;
                  }
                  if (!newRequestForm.collegeId) {
                    alert("Please select a college.");
                    return;
                  }
                  if (!newRequestForm.dueDate) {
                    alert("Please select a due date.");
                    return;
                  }
                  if (calcGross <= 0) {
                    alert("Total Gross Amount must be greater than zero.");
                    return;
                  }
                  if (newRequestForm.discountType === "PERCENTAGE" && calcDiscVal > 100) {
                    alert("Percentage discount cannot exceed 100%.");
                    return;
                  }
                  if (calcDiscAmt > calcGross) {
                    alert("Discount amount cannot exceed Total Gross Amount.");
                    return;
                  }
                  if (calcSch > calcGross) {
                    alert("Scholarship amount cannot exceed Total Gross Amount.");
                    return;
                  }

                  createRequestMutation.mutate({
                    studentId: newRequestForm.studentId,
                    collegeId: newRequestForm.collegeId,
                    applicationId: newRequestForm.applicationId || undefined,
                    courseId: newRequestForm.courseId || undefined,
                    feeHead: newRequestForm.feeHead,
                    totalAmount: calcGross,
                    requestedAmount: calcFinal,
                    discountType: newRequestForm.discountType,
                    discountValue: calcDiscVal,
                    discountAmount: calcDiscAmt,
                    scholarshipAmount: calcSch,
                    lateFeeAmount: calcLate,
                    finalPayableAmount: calcFinal,
                    dueDate: newRequestForm.dueDate,
                    expiryDate: newRequestForm.expiryDate || undefined,
                    assignedReviewerId: newRequestForm.assignedReviewerId || undefined,
                    remarks: newRequestForm.remarks || undefined,
                  });
                }}
                className="p-6 space-y-4 overflow-y-auto flex-1 text-xs"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Student *</label>
                  <select
                    required
                    value={newRequestForm.studentId}
                    onChange={(e) => setNewRequestForm((p) => ({ ...p, studentId: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Select Student</option>
                    {students.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.email || s.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">College *</label>
                    {(() => {
                      const activeCollegesList = (studentContext?.colleges && studentContext.colleges.length > 0)
                        ? studentContext.colleges
                        : colleges;

                      if (activeCollegesList.length === 0) {
                        return (
                          <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-[11px] font-semibold flex items-center gap-1.5">
                            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                            <span>No active colleges found. Please create a college first.</span>
                          </div>
                        );
                      }

                      return (
                        <select
                          required
                          value={newRequestForm.collegeId}
                          onChange={(e) => setNewRequestForm((p) => ({ ...p, collegeId: e.target.value }))}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 text-xs"
                        >
                          <option value="">Select College</option>
                          {activeCollegesList.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.status === 'DRAFT' ? '(Draft)' : ''}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Fee Head *</label>
                    <select
                      value={newRequestForm.feeHead}
                      onChange={(e) => setNewRequestForm((p) => ({ ...p, feeHead: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    >
                      <option value="REGISTRATION_FEE">Registration Fee</option>
                      <option value="COUNSELING_FEE">Counseling Fee</option>
                      <option value="ADMISSION_FEE">Admission Fee</option>
                      <option value="SEMESTER_FEE">Semester Fee</option>
                      <option value="HOSTEL_FEE">Hostel Fee</option>
                      <option value="EXAM_FEE">Exam Fee</option>
                      <option value="SECURITY_DEPOSIT">Security Deposit</option>
                      <option value="MISCELLANEOUS">Miscellaneous</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gross Total Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newRequestForm.totalAmount}
                    onChange={(e) => setNewRequestForm((p) => ({ ...p, totalAmount: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-slate-900 text-sm"
                    placeholder="e.g. 50000"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Discount Type</label>
                    <select
                      value={newRequestForm.discountType}
                      onChange={(e) => setNewRequestForm((p) => ({ ...p, discountType: e.target.value }))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800"
                    >
                      <option value="NO_DISCOUNT">No Discount</option>
                      <option value="FIXED">Fixed Amount (₹)</option>
                      <option value="PERCENTAGE">Percentage (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Discount Value</label>
                    <input
                      type="number"
                      disabled={newRequestForm.discountType === "NO_DISCOUNT"}
                      value={newRequestForm.discountValue}
                      onChange={(e) => setNewRequestForm((p) => ({ ...p, discountValue: e.target.value }))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-blue-700 disabled:opacity-50"
                      placeholder={newRequestForm.discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 5000"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Scholarship Adjustment (₹)</label>
                    <input
                      type="number"
                      value={newRequestForm.scholarshipAmount}
                      onChange={(e) => setNewRequestForm((p) => ({ ...p, scholarshipAmount: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-purple-700"
                      placeholder="e.g. 10000"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Late Fee Component (₹)</label>
                    <input
                      type="number"
                      value={newRequestForm.lateFeeAmount}
                      onChange={(e) => setNewRequestForm((p) => ({ ...p, lateFeeAmount: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-amber-700"
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Due Date *</label>
                    <input
                      type="date"
                      required
                      value={newRequestForm.dueDate}
                      onChange={(e) => setNewRequestForm((p) => ({ ...p, dueDate: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Assigned Reviewer</label>
                    <select
                      value={newRequestForm.assignedReviewerId}
                      onChange={(e) => setNewRequestForm((p) => ({ ...p, assignedReviewerId: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    >
                      <option value="">Select Counselor / Accounts</option>
                      {counselors.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Auto-Calculated Fee Summary Card */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 border border-slate-800">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Live Fee Calculation Breakdown</div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Gross Total Amount</span>
                    <span className="font-bold text-white">₹{calcGross.toLocaleString('en-IN')}</span>
                  </div>
                  {calcDiscAmt > 0 && (
                    <div className="flex justify-between text-xs text-blue-400">
                      <span>Discount ({newRequestForm.discountType})</span>
                      <span className="font-bold">- ₹{calcDiscAmt.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {calcSch > 0 && (
                    <div className="flex justify-between text-xs text-purple-400">
                      <span>Scholarship Adjustment</span>
                      <span className="font-bold">- ₹{calcSch.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {calcLate > 0 && (
                    <div className="flex justify-between text-xs text-amber-400">
                      <span>Late Fee Component</span>
                      <span className="font-bold">+ ₹{calcLate.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {/* Live Resolved Beneficiary Preview */}
                  {newRequestForm.collegeId && (
                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-800 text-slate-300">
                      <span>Payment Beneficiary</span>
                      <span className="font-semibold text-emerald-300">
                        {(() => {
                          const selCol = colleges.find((c: any) => c.id === newRequestForm.collegeId);
                          const isCollegeFee = [
                            "SEMESTER_FEE",
                            "ADMISSION_FEE",
                            "HOSTEL_FEE",
                            "SECURITY_DEPOSIT",
                            "TUITION_FEE",
                          ].includes(newRequestForm.feeHead);
                          if (
                            selCol?.paymentMode === "DIRECT_COLLEGE" ||
                            (selCol?.paymentMode !== "PLATFORM" && isCollegeFee)
                          ) {
                            return `${selCol?.name || "College"} (Direct College Bank)`;
                          }
                          return "Swayam Admission (Platform Gateway)";
                        })()}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-extrabold text-[#A7F3D0] uppercase">Final Payable Amount</span>
                    <span className="text-base font-extrabold text-emerald-400">₹{calcFinal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRequestModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createRequestMutation.isPending}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-sm"
                  >
                    {createRequestMutation.isPending ? "Issuing Request..." : "Issue Official Payment Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Add/Edit Fee Head Modal */}
      {feeHeadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900">{editingFeeHead ? "Edit Fee Head" : "Add New Fee Head"}</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingFeeHead) {
                  updateFeeHeadMutation.mutate({ id: editingFeeHead.id, data: feeHeadForm });
                } else {
                  createFeeHeadMutation.mutate(feeHeadForm);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fee Head Name *</label>
                <input
                  type="text"
                  required
                  value={feeHeadForm.name}
                  onChange={(e) => setFeeHeadForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. Laboratory Fee"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fee Code (Uppercase) *</label>
                <input
                  type="text"
                  required
                  value={feeHeadForm.code}
                  onChange={(e) => setFeeHeadForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  placeholder="e.g. LABORATORY_FEE"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Amount (₹)</label>
                <input
                  type="number"
                  value={feeHeadForm.defaultAmount}
                  onChange={(e) => setFeeHeadForm((p) => ({ ...p, defaultAmount: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFeeHeadModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-[#4A7B5B] text-white rounded-xl font-bold">
                  Save Fee Head
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bank Account Modal */}
      {bankModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Configure College Bank Account</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addBankMutation.mutate(bankForm);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm((p) => ({ ...p, bankName: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. HDFC Bank"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Holder Name *</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountHolder}
                  onChange={(e) => setBankForm((p) => ({ ...p, accountHolder: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. Swayam College Admissions"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Number *</label>
                  <input
                    type="text"
                    required
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm((p) => ({ ...p, accountNumber: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">IFSC Code *</label>
                  <input
                    type="text"
                    required
                    value={bankForm.ifscCode}
                    onChange={(e) => setBankForm((p) => ({ ...p, ifscCode: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official UPI ID</label>
                  <input
                    type="text"
                    value={bankForm.upiId}
                    onChange={(e) => setBankForm((p) => ({ ...p, upiId: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    placeholder="college@upi"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={bankForm.category}
                    onChange={(e) => setBankForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ADMISSION">Admission</option>
                    <option value="SEMESTER">Semester</option>
                    <option value="HOSTEL">Hostel</option>
                    <option value="EXAM">Exam</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBankModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold">
                  Save Bank Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer */}
      <PaymentDetailDrawer
        isOpen={!!selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
        paymentId={selectedPaymentId}
        onVerify={(p) => {
          setSelectedPaymentId(null);
          setTargetPayment(p);
          setModalMode("verify");
        }}
        onRefund={(p) => {
          setSelectedPaymentId(null);
          setTargetPayment(p);
          setModalMode("refund");
        }}
      />

      {/* Form Modal */}
      <PaymentFormModal
        isOpen={!!modalMode}
        onClose={() => {
          setModalMode(null);
          setTargetPayment(null);
        }}
        mode={modalMode || "create"}
        targetPayment={targetPayment}
      />
    </div>
  );
}
