import React, { useState, useEffect } from "react";
import { X, CheckCircle, RefreshCw, DollarSign, CreditCard, User, Building, BookOpen, AlertCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentsApi, CreatePaymentPayload, VerifyPaymentPayload, RefundPaymentPayload } from "../../api/payments.api";
import { usersApi } from "../../api/users.api";
import { collegesApi } from "../../api/colleges.api";
import { coursesApi } from "../../api/courses.api";
import { applicationsApi } from "../../api/applications.api";

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "verify" | "refund";
  targetPayment?: any;
}

export default function PaymentFormModal({
  isOpen,
  onClose,
  mode,
  targetPayment,
}: PaymentFormModalProps) {
  const queryClient = useQueryClient();

  // Create Mode state
  const [studentId, setStudentId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [paymentType, setPaymentType] = useState("REGISTRATION_FEE");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [gateway, setGateway] = useState("Manual");
  const [amount, setAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [scholarshipAmount, setScholarshipAmount] = useState<number>(0);
  const [remarks, setRemarks] = useState("");

  // Verify Mode state
  const [verifyTxnId, setVerifyTxnId] = useState("");
  const [verifyGatewayTxnId, setVerifyGatewayTxnId] = useState("");
  const [verifyRemarks, setVerifyRemarks] = useState("");

  // Refund Mode state
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState("");

  // Fetch dropdown data
  const { data: studentsRes } = useQuery({
    queryKey: ["admin_students_list"],
    queryFn: () => usersApi.getAll({ role: "STUDENT", limit: 100 }),
    enabled: isOpen && mode === "create",
  });

  const { data: collegesRes } = useQuery({
    queryKey: ["admin_colleges_list"],
    queryFn: () => collegesApi.findAll({ limit: 100 }),
    enabled: isOpen && mode === "create",
  });

  const { data: coursesRes } = useQuery({
    queryKey: ["admin_courses_list", collegeId],
    queryFn: () => coursesApi.findAll({ collegeId: collegeId || undefined, limit: 100 }),
    enabled: isOpen && mode === "create",
  });

  const { data: appsRes } = useQuery({
    queryKey: ["admin_apps_list"],
    queryFn: () => applicationsApi.findAll({ limit: 100 }),
    enabled: isOpen && mode === "create",
  });

  useEffect(() => {
    if (targetPayment) {
      if (mode === "verify") {
        setVerifyTxnId(targetPayment.transactionId || "");
        setVerifyGatewayTxnId(targetPayment.gatewayTransactionId || "");
      } else if (mode === "refund") {
        setRefundAmount(targetPayment.paidAmount || targetPayment.amount || 0);
      }
    }
  }, [targetPayment, mode]);

  const createMutation = useMutation({
    mutationFn: (data: CreatePaymentPayload) => paymentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment_stats"] });
      onClose();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (data: VerifyPaymentPayload) => paymentsApi.verify(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment_stats"] });
      onClose();
    },
  });

  const refundMutation = useMutation({
    mutationFn: (data: RefundPaymentPayload) => paymentsApi.refund(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment_stats"] });
      onClose();
    },
  });

  const students: any[] = Array.isArray(studentsRes?.data?.data)
    ? studentsRes?.data?.data
    : Array.isArray(studentsRes?.data)
    ? studentsRes?.data
    : [];

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

  const applications: any[] = Array.isArray(appsRes?.data?.data)
    ? appsRes?.data?.data
    : Array.isArray(appsRes?.data)
    ? appsRes?.data
    : [];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") {
      createMutation.mutate({
        studentId: studentId || undefined,
        applicationId: applicationId || undefined,
        collegeId: collegeId || undefined,
        courseId: courseId || undefined,
        paymentType,
        paymentMethod,
        gateway,
        amount: Number(amount),
        discountAmount: Number(discountAmount),
        scholarshipAmount: Number(scholarshipAmount),
        remarks,
      });
    } else if (mode === "verify") {
      verifyMutation.mutate({
        paymentId: targetPayment.id,
        transactionId: verifyTxnId || undefined,
        gatewayTransactionId: verifyGatewayTxnId || undefined,
        remarks: verifyRemarks,
      });
    } else if (mode === "refund") {
      refundMutation.mutate({
        paymentId: targetPayment.id,
        refundAmount: Number(refundAmount),
        reason: refundReason,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            {mode === "create" && <CreditCard size={18} className="text-[#4A7B5B]" />}
            {mode === "verify" && <CheckCircle size={18} className="text-emerald-400" />}
            {mode === "refund" && <RefreshCw size={18} className="text-purple-400" />}
            {mode === "create" && "Record New Financial Payment"}
            {mode === "verify" && "Verify & Approve Payment"}
            {mode === "refund" && "Process Payment Refund"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {mode === "create" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Student</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#4A7B5B]/20"
                >
                  <option value="">Select Student</option>
                  {students.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Link Application (Optional)</label>
                <select
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#4A7B5B]/20"
                >
                  <option value="">Select Application</option>
                  {applications.map((app: any) => (
                    <option key={app.id} value={app.id}>
                      {app.applicationId} - {app.college?.name} ({app.course?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">College</label>
                  <select
                    value={collegeId}
                    onChange={(e) => setCollegeId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#4A7B5B]/20"
                  >
                    <option value="">Select College</option>
                    {colleges.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course</label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#4A7B5B]/20"
                  >
                    <option value="">Select Course</option>
                    {courses.map((crs: any) => (
                      <option key={crs.id} value={crs.id}>
                        {crs.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Type</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="REGISTRATION_FEE">Registration Fee</option>
                    <option value="ADMISSION_FEE">Admission Fee</option>
                    <option value="SEMESTER_FEE">Semester Fee</option>
                    <option value="HOSTEL_FEE">Hostel Fee</option>
                    <option value="EXAM_FEE">Exam Fee</option>
                    <option value="COUNSELING_FEE">Counseling Fee</option>
                    <option value="DOCUMENT_FEE">Document Fee</option>
                    <option value="MISCELLANEOUS">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="UPI">UPI / QR</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="DEBIT_CARD">Debit Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="DEMAND_DRAFT">Demand Draft</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Gross Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-700 uppercase mb-1">Scholarship (₹)</label>
                  <input
                    type="number"
                    value={scholarshipAmount}
                    onChange={(e) => setScholarshipAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Gateway Provider</label>
                <select
                  value={gateway}
                  onChange={(e) => setGateway(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="Manual">Manual / Portal Entry</option>
                  <option value="Razorpay">Razorpay</option>
                  <option value="PhonePe">PhonePe</option>
                  <option value="Cashfree">Cashfree</option>
                  <option value="Stripe">Stripe</option>
                  <option value="Paytm">Paytm</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Remarks / Internal Notes</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="Enter transaction notes, bank reference or receipt remarks..."
                />
              </div>
            </>
          )}

          {mode === "verify" && (
            <>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                <p className="font-bold">Approve Payment #{targetPayment?.receiptNumber || targetPayment?.id}</p>
                <p>Gross Amount: ₹{(targetPayment?.amount || 0).toLocaleString("en-IN")}</p>
                <p>Student: {targetPayment?.user?.fullName || "Student"}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bank Transaction ID / Ref No</label>
                <input
                  type="text"
                  value={verifyTxnId}
                  onChange={(e) => setVerifyTxnId(e.target.value)}
                  placeholder="e.g. TXN987654321"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Gateway Reference ID</label>
                <input
                  type="text"
                  value={verifyGatewayTxnId}
                  onChange={(e) => setVerifyGatewayTxnId(e.target.value)}
                  placeholder="e.g. rzp_pay_12345"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Verification Remarks</label>
                <textarea
                  value={verifyRemarks}
                  onChange={(e) => setVerifyRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. Bank statement verified. Approved for admission confirmation."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </>
          )}

          {mode === "refund" && (
            <>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1">
                <p className="font-bold">Refund Payment #{targetPayment?.receiptNumber || targetPayment?.id}</p>
                <p>Original Amount Paid: ₹{(targetPayment?.paidAmount || targetPayment?.amount || 0).toLocaleString("en-IN")}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Refund Amount (₹)</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reason for Refund</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Student cancelled admission / Overpayment refund"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || verifyMutation.isPending || refundMutation.isPending}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              {(createMutation.isPending || verifyMutation.isPending || refundMutation.isPending) && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {mode === "create" && "Submit Payment Record"}
              {mode === "verify" && "Confirm Verification"}
              {mode === "refund" && "Initiate Refund"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
