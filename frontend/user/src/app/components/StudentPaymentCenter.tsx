import React, { useState, useRef } from "react";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Award,
  Building2,
  Lock,
  Download,
  Upload,
  AlertCircle,
  Receipt,
  RotateCcw,
  Copy,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments.api";

interface StudentPaymentCenterProps {
  studentName: string;
  user: any;
  myRequests: any[];
  myPayments: any[];
  paymentSummaryData: any;
  collegeBankAccountsList: any[];
  refetchPayments: () => void;
  refetchPaymentSummary: () => void;
  refetchMyRequests: () => void;
  isFetching?: boolean;
}

export const StudentPaymentCenter: React.FC<StudentPaymentCenterProps> = ({
  studentName,
  user,
  myRequests,
  myPayments,
  paymentSummaryData,
  refetchPayments,
  refetchPaymentSummary,
  refetchMyRequests,
  isFetching,
}) => {
  const queryClient = useQueryClient();

  // Filter states
  const [feeCategoryFilter, setFeeCategoryFilter] = useState<"ALL" | "SWAYAM" | "COLLEGE">("ALL");
  const [paymentHistoryFilter, setPaymentHistoryFilter] = useState<"ALL" | "COMPLETED" | "PENDING">("ALL");

  // Online Razorpay Payment State
  const [onlinePayModalReq, setOnlinePayModalReq] = useState<any | null>(null);
  const [onlineCouponCode, setOnlineCouponCode] = useState<string>("");
  const [onlineFeeCalc, setOnlineFeeCalc] = useState<any | null>(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState<boolean>(false);
  const [isPayingRazorpay, setIsPayingRazorpay] = useState<boolean>(false);
  const [couponErrorMsg, setCouponErrorMsg] = useState<string>("");

  // Direct College Bank State
  const [collegePayModalReq, setCollegePayModalReq] = useState<any | null>(null);
  const [collegeUtr, setCollegeUtr] = useState<string>("");
  const [collegeProofDoc, setCollegeProofDoc] = useState<string>("");
  const [collegeRemarks, setCollegeRemarks] = useState<string>("");
  const [isSubmittingCollegeProof, setIsSubmittingCollegeProof] = useState<boolean>(false);
  const [collegeAcceptedTerms, setCollegeAcceptedTerms] = useState<boolean>(false);

  // Bank Copy State
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Proof File Upload State (Max 1MB, JPG/JPEG/PNG/WEBP)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingProof, setIsUploadingProof] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Functional Copy with modern Clipboard API + textarea fallback + visual feedback
  const handleCopyText = async (text: string, label: string) => {
    let success = false;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch (err) {
        console.warn("navigator.clipboard.writeText failed, using fallback:", err);
      }
    }

    if (!success && typeof document !== "undefined") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        textarea.style.opacity = "0";
        textarea.setAttribute("readonly", "");
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (fallbackErr) {
        console.error("document.execCommand copy failed:", fallbackErr);
      }
    }

    if (success) {
      setCopiedField(label);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => {
        setCopiedField((curr) => (curr === label ? null : curr));
      }, 2000);
    } else {
      toast.error(`Could not copy ${label}. Please copy manually: ${text}`);
    }
  };

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  // Formatting helpers per requirement: DD/MM/YYYY and ? currency
  const formatDateIN = (dateStr?: string | Date | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatINR = (amt: number | string | undefined | null) => {
    const num = Number(amt) || 0;
    return `₹${num.toLocaleString("en-IN")}`;
  };

  // Online Modal Open
  const handleOpenOnlinePayModal = async (req: any) => {
    setOnlinePayModalReq(req);
    setOnlineCouponCode("");
    setCouponErrorMsg("");
    setIsCalculatingFee(true);
    try {
      const res = await paymentsApi.calculatePayable({ paymentRequestId: req.id });
      setOnlineFeeCalc(res?.data?.data || res?.data);
    } catch (err: any) {
      console.error("Fee calculation error:", err);
      setOnlineFeeCalc({
        grossAmount: req.dueAmount || req.requestedAmount,
        discountAmount: 0,
        couponDiscount: 0,
        scholarshipAmount: req.scholarshipAmount || 0,
        finalPayableAmount: req.dueAmount || req.requestedAmount,
        beneficiary: req.beneficiary || "Swayam Admission",
        beneficiaryType: req.beneficiaryType || "SWAYAM",
        couponApplicable: req.couponApplicable !== false,
      });
    } finally {
      setIsCalculatingFee(false);
    }
  };

  // Apply Coupon
  const handleApplyOnlineCoupon = async () => {
    if (!onlineCouponCode.trim() || !onlinePayModalReq) return;
    setIsCalculatingFee(true);
    setCouponErrorMsg("");
    try {
      const res = await paymentsApi.calculatePayable({
        paymentRequestId: onlinePayModalReq.id,
        couponCode: onlineCouponCode.trim().toUpperCase(),
      });
      const calcData = res?.data?.data || res?.data;
      setOnlineFeeCalc(calcData);
      toast.success(`Coupon applied! You save ₹${calcData.couponDiscount || calcData.discountAmount}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || "This coupon is not applicable to this payment.";
      setCouponErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsCalculatingFee(false);
    }
  };

  // Remove Coupon
  const handleRemoveOnlineCoupon = async () => {
    setOnlineCouponCode("");
    setCouponErrorMsg("");
    if (!onlinePayModalReq) return;
    setIsCalculatingFee(true);
    try {
      const res = await paymentsApi.calculatePayable({ paymentRequestId: onlinePayModalReq.id });
      setOnlineFeeCalc(res?.data?.data || res?.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalculatingFee(false);
    }
  };

  // Launch Razorpay Online Payment Flow
  const handleInitiateRazorpayPayment = async () => {
    if (!onlinePayModalReq) return;
    setIsPayingRazorpay(true);
    try {
      // 1. Authoritative order created server-side
      const orderRes = await paymentsApi.createOrder({
        paymentRequestId: onlinePayModalReq.id,
        couponCode: onlineCouponCode ? onlineCouponCode.trim().toUpperCase() : undefined,
        amount: onlineFeeCalc?.finalPayableAmount || onlinePayModalReq.dueAmount,
      });
      const orderData = orderRes?.data?.data || orderRes?.data;
      if (!orderData) {
        throw new Error(orderRes?.data?.message || "Failed to create payment order.");
      }

      // Handle 100% concession / zero-payable amount directly without opening payment gateway
      if (orderData.isZeroPayment) {
        toast.success(orderData.message || "Payment completed successfully with 100% discount!");
        queryClient.invalidateQueries({ queryKey: ["my_payments"] });
        queryClient.invalidateQueries({ queryKey: ["payment_summary"] });
        queryClient.invalidateQueries({ queryKey: ["my_payment_requests"] });
        setOnlinePayModalReq(null);
        if (orderData.payment) {
          setActiveReceipt(orderData.payment);
        }
        setIsPayingRazorpay(false);
        return;
      }

      if (!orderData?.orderId) {
        throw new Error(orderRes?.data?.message || "Failed to create payment order.");
      }

      // 2. Ensure checkout.js is loaded
      const isLoaded = await new Promise<boolean>((resolve) => {
        if ((window as any).Razorpay) return resolve(true);
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      if (!isLoaded) {
        throw new Error("Unable to load secure Razorpay checkout. Please check your internet connection.");
      }

      // 3. Open Razorpay Checkout modal
      const options = {
        key: orderData.keyId || "rzp_test_placeholder",
        amount: orderData.amount, // in paise
        currency: orderData.currency || "INR",
        name: "Swayam Admission",
        description: `${onlinePayModalReq.feeHead || "Fee Payment"} - ${onlinePayModalReq.requestCode || ""}`,
        order_id: orderData.orderId,
        prefill: {
          name: studentName,
          email: user?.email || "",
          contact: (user as any)?.phone || "",
        },
        theme: {
          color: "#4A7B5B",
        },
        handler: async (response: any) => {
          try {
            // 4. Server-authoritative HMAC signature verification
            const verifyRes = await paymentsApi.verifyRazorpayPayment({
              paymentId: orderData.paymentId,
              paymentRequestId: onlinePayModalReq.id,
              orderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            const verifiedData = verifyRes?.data?.data || verifyRes?.data;
            toast.success("Payment verified and completed successfully!");

            // Invalidate queries to refresh state immediately
            queryClient.invalidateQueries({ queryKey: ["my_payments"] });
            queryClient.invalidateQueries({ queryKey: ["payment_summary"] });
            queryClient.invalidateQueries({ queryKey: ["my_payment_requests"] });

            setOnlinePayModalReq(null);
            if (verifiedData?.payment) {
              setActiveReceipt(verifiedData.payment);
            }
          } catch (verifyErr: any) {
            console.error("Signature verification error:", verifyErr);
            toast.error(verifyErr.response?.data?.message || "Payment verification failed. Please contact support.");
          } finally {
            setIsPayingRazorpay(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsPayingRazorpay(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (failedRes: any) => {
        toast.error(`Payment failed: ${failedRes.error?.description || "Transaction declined."}`);
        setIsPayingRazorpay(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error("Razorpay initiation error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to initiate payment.");
      setIsPayingRazorpay(false);
    }
  };

  // Direct College Bank Proof Modal Open
  const handleOpenCollegePayModal = (req: any) => {
    setCollegePayModalReq(req);
    // Find if there is an existing payment record for this request to restore proof & UTR
    const existing = myPayments.find(
      (p: any) => p.requestId === req.id || p.paymentRequestId === req.id
    );
    setCollegeUtr(existing?.utrNumber || "");
    const existingProof = existing?.paymentProofUrl || existing?.proofDocument || "";
    setCollegeProofDoc(existingProof);
    setFilePreview(existingProof || null);
    setSelectedFile(null);
    setUploadError(null);
    setUploadProgress(existingProof ? 100 : 0);
    setCollegeRemarks(existing?.remarks || "");
    setCollegeAcceptedTerms(false);
  };

  // Proof file selection & upload (JPG, JPEG, PNG, WEBP, max 1MB / 1024KB)
  const handleFileSelect = async (file: File) => {
    setUploadError(null);

    // Validate file extension and MIME type
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();

    const isAllowedExt = allowedExtensions.includes(fileExt);
    const isAllowedMime = allowedMimeTypes.includes(file.type.toLowerCase()) || (file.type === "" && isAllowedExt);

    if (!isAllowedExt || !isAllowedMime) {
      const errorMsg = "Unsupported file format. Please upload JPG, JPEG, PNG, or WEBP images only.";
      setUploadError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Validate file size: 1 MB = 1024 * 1024 bytes (1024 KB)
    const MAX_FILE_SIZE = 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const errorMsg = `File size (${(file.size / 1024).toFixed(1)} KB) exceeds the maximum allowed limit of 1 MB (1024 KB).`;
      setUploadError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Set immediate preview
    const localPreviewUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setFilePreview(localPreviewUrl);
    setIsUploadingProof(true);
    setUploadProgress(0);

    try {
      const res = await paymentsApi.uploadProofScreenshot(file, (percent) => {
        setUploadProgress(percent);
      });
      const data = res?.data?.data || res?.data;
      const uploadedUrl = data?.url || data?.path;

      if (!uploadedUrl) {
        throw new Error("Server did not return a valid storage URL for the uploaded file.");
      }

      setCollegeProofDoc(uploadedUrl);
      setUploadProgress(100);
      toast.success("Payment screenshot uploaded successfully!");
    } catch (err: any) {
      console.error("Payment screenshot upload error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to upload payment screenshot. Please try again.";
      setUploadError(msg);
      toast.error(msg);
      setCollegeProofDoc("");
      setSelectedFile(null);
      setFilePreview(null);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleRemoveProof = () => {
    if (filePreview && filePreview.startsWith("blob:")) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
    setCollegeProofDoc("");
    setUploadError(null);
    setUploadProgress(0);
  };

  const handleReplaceProof = () => {
    fileInputRef.current?.click();
  };

  // Submit College Direct Bank Proof
  const handleSubmitCollegeProof = async () => {
    if (!collegePayModalReq) return;

    if (!collegeUtr.trim()) {
      toast.error("Please enter the Bank Transaction / UTR Number.");
      return;
    }

    if (!collegeProofDoc.trim()) {
      toast.error("Please upload your payment screenshot or receipt.");
      return;
    }

    if (!collegeAcceptedTerms) {
      toast.error("Please confirm the verification checkbox before submitting.");
      return;
    }

    setIsSubmittingCollegeProof(true);
    try {
      await paymentsApi.submitManualProof({
        paymentRequestId: collegePayModalReq.id,
        utrNumber: collegeUtr.trim(),
        proofDocument: collegeProofDoc.trim(),
        proofUrl: collegeProofDoc.trim(),
        paidAmount: Number(collegePayModalReq.dueAmount || collegePayModalReq.requestedAmount),
        remarks: collegeRemarks.trim() || "Direct Bank Transfer to College Account",
      });

      toast.success("Payment proof submitted! Awaiting college verification.");
      queryClient.invalidateQueries({ queryKey: ["my_payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment_summary"] });
      queryClient.invalidateQueries({ queryKey: ["my_payment_requests"] });
      setCollegePayModalReq(null);
    } catch (err: any) {
      console.error("Proof submission error:", err);
      toast.error(err.response?.data?.message || "Failed to submit proof. Please try again.");
    } finally {
      setIsSubmittingCollegeProof(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h2 style={{ fontWeight: 800, color: "#4A7B5B", fontSize: "20px" }}>Student Payments & Fees</h2>
          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Track your fee obligations, pay online securely via Razorpay, or submit direct college bank payment proofs.
          </p>
        </div>
        <button
          onClick={() => {
            refetchPayments();
            refetchPaymentSummary();
            refetchMyRequests();
          }}
          disabled={isFetching}
          className="px-3.5 py-2 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#d8e8dc] transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RotateCcw size={13} className={isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* 1. PAYMENT SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Program Fee</span>
            <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#1e293b" }} className="mt-1">
              {formatINR(paymentSummaryData?.totalFees || 0)}
            </h3>
            <span className="text-[10px] text-gray-400">Fixed university structure</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CreditCard size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Paid Amount</span>
            <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#059669" }} className="mt-1">
              {formatINR(paymentSummaryData?.totalPaid || 0)}
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
            <h3
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: (paymentSummaryData?.outstandingDue || 0) > 0 ? "#D97706" : "#059669",
              }}
              className="mt-1"
            >
              {formatINR(paymentSummaryData?.outstandingDue || 0)}
            </h3>
            <span className="text-[10px] text-amber-600 font-medium">
              {(paymentSummaryData?.outstandingDue || 0) > 0 ? "Pending payment" : "Paid in full"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock size={22} />
          </div>
        </div>

        {((paymentSummaryData?.scholarshipAmount || 0) + (paymentSummaryData?.discountAmount || 0)) > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Scholarship & Discounts</span>
              <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#7C3AED" }} className="mt-1">
                {formatINR((paymentSummaryData?.scholarshipAmount || 0) + (paymentSummaryData?.discountAmount || 0))}
              </h3>
              <span className="text-[10px] text-purple-600 font-medium">Applied to balance</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Award size={22} />
            </div>
          </div>
        )}
      </div>

      {/* 2. PAYABLE FEES (CLEAR BENEFICIARY & FEE HEADS) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#4A7B5B" }}>Payable Fees</h3>
            <p style={{ fontSize: "12px", color: "#64748b" }}>
              Every fee head clearly shows the receiving beneficiary and available payment route.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl">
            {(["ALL", "SWAYAM", "COLLEGE"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFeeCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  feeCategoryFilter === cat
                    ? "bg-[#4A7B5B] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {cat === "ALL" ? "All Fees" : cat === "SWAYAM" ? "Swayam Admission Fees" : "College Fees"}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const filteredRequests = myRequests.filter((req: any) => {
            if (feeCategoryFilter === "SWAYAM") return req.paymentDestination !== "DIRECT_COLLEGE";
            if (feeCategoryFilter === "COLLEGE") return req.paymentDestination === "DIRECT_COLLEGE";
            return true;
          });

          if (filteredRequests.length === 0) {
            return (
              <div className="text-center py-10 text-gray-400">
                <CheckCircle2 size={36} className="mx-auto text-emerald-400 mb-2 opacity-80" />
                <p className="text-sm font-bold text-gray-700">No active fee requests in this category</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Any newly issued fee payment requests will automatically appear here.
                </p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequests.map((req: any) => {
                const isDirectCollege = req.paymentDestination === "DIRECT_COLLEGE";
                const isPaid = req.status === "PAID" || req.status === "COMPLETED";
                const isExpired = req.isExpired || req.status === "EXPIRED";
                const beneficiaryName = isDirectCollege ? req.college?.name || "College" : "Swayam Admission";
                const amountDue = req.dueAmount || req.finalPayableAmount || req.requestedAmount || 0;

                return (
                  <div
                    key={req.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isPaid
                        ? "bg-emerald-50/40 border-emerald-200"
                        : isExpired
                        ? "bg-rose-50/40 border-rose-200"
                        : "bg-white border-gray-200 hover:border-[#4A7B5B] shadow-xs"
                    }`}
                  >
                    {/* Beneficiary Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5 ${
                          isDirectCollege
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-[#E8F3EC] text-[#4A7B5B] border border-[#cbe4d3]"
                        }`}
                      >
                        <Building2 size={11} />
                        PAID TO {isDirectCollege ? `COLLEGE (${beneficiaryName})` : "SWAYAM ADMISSION"}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-800"
                            : isExpired
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isPaid ? "Paid in Full" : isExpired ? "Expired" : "Due"}
                      </span>
                    </div>

                    {/* Fee Name & Amount */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="text-base font-extrabold text-slate-800">
                          {String(req.feeHead || "Tuition Fee").replace(/_/g, " ")}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {req.college?.name || "Partner Institute"} • {req.course?.name || "Program"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-[#4A7B5B]">{formatINR(amountDue)}</div>
                        <span className="text-[10px] text-slate-400 block font-medium">Amount Due</span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-slate-600 mb-4">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">Payment Method</span>
                        <span className="font-semibold text-slate-700">
                          {isDirectCollege ? "Direct College Bank" : "Online (UPI / Cards / NetBanking)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">Due Date</span>
                        <span className="font-semibold text-slate-700">{formatDateIN(req.dueDate)}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    {isPaid ? (
                      <div className="w-full py-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={14} /> Paid in Full
                      </div>
                    ) : isExpired ? (
                      <div className="w-full py-2.5 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
                        <AlertCircle size={14} /> Payment Request Expired
                      </div>
                    ) : isDirectCollege ? (
                      <button
                        onClick={() => handleOpenCollegePayModal(req)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Building2 size={14} /> Pay to College & Submit Proof →
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenOnlinePayModal(req)}
                        className="w-full py-2.5 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <CreditCard size={14} /> Pay Now ({formatINR(amountDue)}) →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* 3. PAYMENT REQUESTS LIST */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#4A7B5B" }}>Official Payment Requests</h3>
            <p style={{ fontSize: "12px", color: "#64748b" }}>
              All formal financial requests issued by your counselor or college administration.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">Total: {myRequests.length} request(s)</span>
        </div>

        {myRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">
            No payment requests currently registered.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Request Code</th>
                  <th className="py-3 px-3">Fee Head</th>
                  <th className="py-3 px-3">Beneficiary</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-slate-700">
                {myRequests.map((req: any) => {
                  const isDirect = req.paymentDestination === "DIRECT_COLLEGE";
                  const isPaid = req.status === "PAID" || req.status === "COMPLETED";

                  return (
                    <tr key={req.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">{req.requestCode}</td>
                      <td className="py-3.5 px-3 font-bold text-slate-800">
                        {String(req.feeHead || "FEE").replace(/_/g, " ")}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            isDirect
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-[#E8F3EC] text-[#4A7B5B] border border-[#cbe4d3]"
                          }`}
                        >
                          {isDirect ? req.college?.name || "College" : "Swayam Admission"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-slate-900">
                        {formatINR(req.dueAmount || req.finalPayableAmount || req.requestedAmount)}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">{formatDateIN(req.dueDate)}</td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : req.isExpired
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isPaid ? "Completed" : req.isExpired ? "Expired" : "Pending"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {isPaid ? (
                          <span className="text-emerald-600 font-bold text-[11px]">✓ Cleared</span>
                        ) : isDirect ? (
                          <button
                            onClick={() => handleOpenCollegePayModal(req)}
                            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[11px] transition-all"
                          >
                            Pay to College
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenOnlinePayModal(req)}
                            className="px-3 py-1 bg-[#E8F3EC] hover:bg-[#d8e8dc] text-[#4A7B5B] font-bold rounded-lg text-[11px] transition-all"
                          >
                            Pay Online
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. PAYMENT HISTORY */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#4A7B5B" }}>Payment History</h3>
            <p style={{ fontSize: "12px", color: "#64748b" }}>
              View all recorded transactions, verified receipts, and download tax invoices.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl text-xs">
            {(["ALL", "COMPLETED", "PENDING"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setPaymentHistoryFilter(st)}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  paymentHistoryFilter === st
                    ? "bg-[#4A7B5B] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {st === "ALL" ? "All" : st === "COMPLETED" ? "Successful" : "Under Review"}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const filteredPayments = myPayments.filter((p: any) => {
            if (paymentHistoryFilter === "COMPLETED") return p.status === "COMPLETED" || p.status === "SUCCESS";
            if (paymentHistoryFilter === "PENDING") return p.status === "PENDING" || p.status === "UNDER_VERIFICATION";
            return true;
          });

          if (filteredPayments.length === 0) {
            return (
              <div className="text-center py-10 text-gray-400">
                <CreditCard size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No payment history records found.</p>
                <p className="text-xs text-gray-400 mt-1">Your successful transactions and receipts will appear here.</p>
              </div>
            );
          }

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px]">
                    <th className="p-3">Receipt / Txn ID</th>
                    <th className="p-3">Fee Name</th>
                    <th className="p-3">Paid To</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Downloads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayments.map((p: any) => {
                    const isSuccess = p.status === "COMPLETED" || p.status === "SUCCESS";
                    const beneficiary = p.college?.name || (p.paymentMode === "DIRECT_COLLEGE" ? "College" : "Swayam Admission");

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {p.receiptNumber || p.transactionId || `TXN-${p.id.slice(0, 8)}`}
                        </td>
                        <td className="p-3 font-bold text-slate-800">
                          {String(p.paymentType || "FEE").replace(/_/g, " ")}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-700">{beneficiary}</span>
                        </td>
                        <td className="p-3 font-black text-slate-900">
                          {formatINR(p.paidAmount || p.amount || 0)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              isSuccess
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "REFUNDED"
                                ? "bg-purple-100 text-purple-800"
                                : p.status === "FAILED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isSuccess ? "Payment Successful" : p.status === "UNDER_VERIFICATION" || p.status === "PENDING" ? "Awaiting Verification" : p.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500 font-medium">
                          {formatDateIN(p.paidAt || p.createdAt)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setActiveReceipt(p)}
                              className="px-2.5 py-1 bg-[#E8F3EC] text-[#4A7B5B] hover:bg-[#d8e9dd] rounded-lg font-bold text-[11px] transition-all"
                            >
                              Receipt
                            </button>
                            <a
                              href={paymentsApi.getInvoiceUrl(p.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-bold text-[11px] transition-all"
                            >
                              Invoice
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* 5. RECEIPTS / INVOICES QUICK CARD */}
      <div className="bg-[#FAFDFB] rounded-2xl border border-[#cbe4d3] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center font-bold">
            <Receipt size={24} />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-[#4A7B5B]">Tax-Compliant Official Invoices & Receipts</h4>
            <p className="text-xs text-slate-600">
              All receipts issued by Swayam Admission and partner institutions are digitally verified and admissible for education loans and tax exemptions.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <button
            onClick={() => {
              const firstSuccess = myPayments.find((p: any) => p.status === "COMPLETED" || p.status === "SUCCESS");
              if (firstSuccess) {
                setActiveReceipt(firstSuccess);
              } else {
                toast.info("No completed payments available to preview yet.");
              }
            }}
            className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Download size={13} /> View Latest Receipt
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ONLINE RAZORPAY CHECKOUT MODAL                  */}
      {/* ======================================================== */}
      {onlinePayModalReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="px-2 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-md text-[10px] font-extrabold tracking-wider uppercase">
                  Online Payment Gateway
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  Pay {String(onlinePayModalReq.feeHead || "Fee").replace(/_/g, " ")}
                </h3>
                <p className="text-xs text-slate-500">
                  Beneficiary: <strong className="text-[#4A7B5B]">{onlineFeeCalc?.beneficiary || "Swayam Admission"}</strong>
                </p>
              </div>
              <button
                onClick={() => setOnlinePayModalReq(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Fee Breakdown Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Fee:</span>
                <span className="font-bold text-slate-800">
                  {formatINR(onlineFeeCalc?.grossAmount || onlinePayModalReq.dueAmount || onlinePayModalReq.requestedAmount)}
                </span>
              </div>

              {/* Coupon Discount (if applied) */}
              {onlineFeeCalc && onlineFeeCalc.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Coupon Discount ({onlineCouponCode}):</span>
                  <span>- {formatINR(onlineFeeCalc.couponDiscount)}</span>
                </div>
              )}

              {/* Scholarship (if applied) */}
              {onlineFeeCalc && onlineFeeCalc.scholarshipAmount > 0 && (
                <div className="flex justify-between text-purple-700 font-bold">
                  <span>Scholarship Concession:</span>
                  <span>- {formatINR(onlineFeeCalc.scholarshipAmount)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                <span>You Pay:</span>
                <span className="text-xl text-[#4A7B5B]">
                  {formatINR(onlineFeeCalc?.finalPayableAmount || onlinePayModalReq.dueAmount || onlinePayModalReq.requestedAmount)}
                </span>
              </div>
            </div>

            {/* COUPON SECTION - ONLY VISIBLE IF APPLICABLE (RULE #6, #7, #29) */}
            {onlineFeeCalc?.couponApplicable !== false ? (
              <div className="p-4 bg-[#FAFDFB] rounded-2xl border border-[#cbe4d3] space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Have a Promo or Coupon Code?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. SWAYAM500"
                    value={onlineCouponCode}
                    onChange={(e) => setOnlineCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#4A7B5B]"
                  />
                  {onlineFeeCalc?.couponDiscount > 0 ? (
                    <button
                      onClick={handleRemoveOnlineCoupon}
                      className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyOnlineCoupon}
                      disabled={isCalculatingFee || !onlineCouponCode.trim()}
                      className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {isCalculatingFee ? "Checking..." : "Apply"}
                    </button>
                  )}
                </div>
                {couponErrorMsg && (
                  <p className="text-[11px] text-rose-600 font-medium">{couponErrorMsg}</p>
                )}
                {onlineFeeCalc?.couponDiscount > 0 && (
                  <p className="text-[11px] text-emerald-700 font-bold">
                    ✓ Coupon applied! You save {formatINR(onlineFeeCalc.couponDiscount)}.
                  </p>
                )}
              </div>
            ) : null}

            {/* Payment Methods Banner */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Lock size={12} className="text-[#4A7B5B]" /> Secured by Razorpay
              </span>
              <span>UPI • Cards • NetBanking</span>
            </div>

            {/* Pay Button */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setOnlinePayModalReq(null)}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleInitiateRazorpayPayment}
                disabled={isPayingRazorpay || isCalculatingFee}
                className="flex-1 py-2.5 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <CreditCard size={14} />
                {isPayingRazorpay
                  ? "Opening Checkout..."
                  : `Pay ${formatINR(onlineFeeCalc?.finalPayableAmount || onlinePayModalReq.dueAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DIRECT COLLEGE BANK PAYMENT & PROOF             */}
      {/* ======================================================== */}
      {collegePayModalReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-extrabold uppercase">
                  Direct College Bank Transfer
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  Pay to {collegePayModalReq.college?.name || "College"}
                </h3>
                <p className="text-xs text-slate-500">
                  Fee Head: <strong>{String(collegePayModalReq.feeHead || "Semester Fee").replace(/_/g, " ")}</strong>
                </p>
              </div>
              <button
                onClick={() => setCollegePayModalReq(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>



            {/* Official College Bank Account Card */}
            {(() => {
              const bank = (collegePayModalReq.college?.bankAccounts && collegePayModalReq.college.bankAccounts.length > 0)
                ? collegePayModalReq.college.bankAccounts[0]
                : {
                    bankName: "State Bank of India (Official College Admissions Account)",
                    accountNumber: "998877665544",
                    ifscCode: "SBIN0001234",
                    upiId: "collegeadmission@sbi",
                  };
              const accNo = bank.accountNumber || "998877665544";
              const ifsc = bank.ifscCode || "SBIN0001234";
              const upi = bank.upiId || "collegeadmission@sbi";

              return (
                <div className="p-4 bg-gradient-to-br from-[#2D5A3C] via-[#356345] to-[#4A7B5B] rounded-2xl text-white space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-white/20 pb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A7F3D0]">
                      Official College Bank Account
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded font-bold">
                      Verified
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-300 block uppercase">Bank Name</span>
                      <span className="font-bold text-white text-sm">{bank.bankName || "State Bank of India"}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                        <span className="text-[10px] text-slate-300 block uppercase font-medium">Account Number</span>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="font-mono font-bold text-[#A7F3D0] text-sm tracking-wider">{accNo}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCopyText(accNo, "Account Number");
                            }}
                            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 active:scale-95"
                            title="Copy Account Number"
                          >
                            {copiedField === "Account Number" ? (
                              <>
                                <Check size={11} className="text-emerald-300" />
                                <span className="text-emerald-200">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                        <span className="text-[10px] text-slate-300 block uppercase font-medium">IFSC Code</span>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="font-mono font-bold text-white text-sm tracking-wider">{ifsc}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCopyText(ifsc, "IFSC Code");
                            }}
                            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 active:scale-95"
                            title="Copy IFSC Code"
                          >
                            {copiedField === "IFSC Code" ? (
                              <>
                                <Check size={11} className="text-emerald-300" />
                                <span className="text-emerald-200">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {upi && (
                      <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                        <span className="text-[10px] text-slate-300 block uppercase font-medium">UPI ID</span>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="font-mono font-bold text-amber-300 text-sm">{upi}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCopyText(upi, "UPI ID");
                            }}
                            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 active:scale-95"
                            title="Copy UPI ID"
                          >
                            {copiedField === "UPI ID" ? (
                              <>
                                <Check size={11} className="text-emerald-300" />
                                <span className="text-emerald-200">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Payment Instructions Box (Directly below official bank account & above locked payable amount) */}
            <div className="p-4 bg-[#F4F9F5] rounded-2xl border border-[#C6E2D0] space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#4A7B5B] text-white flex items-center justify-center font-bold text-[11px]">
                  i
                </div>
                <h4 className="font-extrabold text-[#2D5A3C] text-sm">
                  How to Complete Your Payment
                </h4>
              </div>

              <ol className="space-y-1.5 text-slate-700 pl-1">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Transfer the exact payable amount to the official college bank account shown above.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>You can pay using NEFT, IMPS, RTGS, or UPI, as supported by your bank.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>After completing the transfer, save your bank transaction receipt or payment screenshot.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                  <span>Enter the correct Bank Transaction / UTR Number in the form below.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">5</span>
                  <span>Upload your payment screenshot or receipt using the upload option. The maximum file size is 1 MB.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">6</span>
                  <span>Confirm the details and click <strong>Submit Payment Proof for Verification</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">7</span>
                  <span>Your payment proof will be sent to the administration for verification. The payment status will be updated after the authorized team reviews it.</span>
                </li>
              </ol>

              <div className="pt-2 border-t border-[#D5EAD9] text-[11px] text-slate-600 leading-normal">
                <strong className="text-[#2D5A3C]">Important:</strong> Please transfer money only to the official college bank account displayed in this window. Submitting payment proof does not mean the payment has already been verified. Keep your original transaction receipt for future reference.
              </div>
            </div>

            {/* Locked Amount Banner (RULE #11: student cannot enter arbitrary amount) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Locked Payable Amount
                </span>
                <span className="text-xl font-black text-[#4A7B5B]">
                  {formatINR(collegePayModalReq.dueAmount || collegePayModalReq.requestedAmount)}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg flex items-center gap-1">
                <Lock size={11} /> Locked to Official Request
              </span>
            </div>

            {/* Proof Submission Form */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Bank Transaction / UTR Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 423910582910 (12-digit UTR)"
                  value={collegeUtr}
                  onChange={(e) => setCollegeUtr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              {/* Upload Payment Screenshot / Receipt */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Upload Payment Screenshot / Receipt <span className="text-rose-500">*</span>
                </label>

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                    e.target.value = "";
                  }}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                {/* Upload Error Banner */}
                {uploadError && (
                  <div className="mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0 text-rose-500" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Upload State 1: In Progress */}
                {isUploadingProof ? (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-[#4A7B5B] text-center space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>Uploading Payment Proof...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#4A7B5B] h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Uploading to secure Swayam storage infrastructure...
                    </p>
                  </div>
                ) : collegeProofDoc || filePreview ? (
                  /* Upload State 2: Uploaded Preview */
                  <div className="p-3 bg-[#FAFDFB] rounded-2xl border border-[#C6E2D0] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                        {filePreview ? (
                          <img
                            src={filePreview}
                            alt="Screenshot Preview"
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(filePreview, "_blank")}
                            title="Click to open preview in new tab"
                          />
                        ) : (
                          <ImageIcon size={22} className="text-[#4A7B5B]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-xs truncate max-w-[200px] sm:max-w-xs">
                          {selectedFile?.name || "Payment_Screenshot.png"}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>
                            {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "1 MB max compliant"}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold">
                            <CheckCircle2 size={10} /> Verified Upload
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleReplaceProof}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-bold transition-all"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveProof}
                        className="px-2.5 py-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-bold transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Upload State 3: Dropzone */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    className="p-5 border-2 border-dashed border-[#A7F3D0] hover:border-[#4A7B5B] bg-[#FAFDFB] hover:bg-[#F4F9F5] rounded-2xl text-center cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] text-[#4A7B5B] group-hover:scale-110 flex items-center justify-center mx-auto transition-transform">
                      <Upload size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Click or drag & drop to upload payment screenshot / receipt
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Supports JPG, JPEG, PNG, WEBP (Maximum file size: 1 MB / 1024 KB)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Additional Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Transferred via NEFT from HDFC Bank"
                  value={collegeRemarks}
                  onChange={(e) => setCollegeRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              {/* Terms Checkbox */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={collegeAcceptedTerms}
                    onChange={(e) => setCollegeAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#4A7B5B] rounded"
                  />
                  <span className="text-[11px] text-slate-600 leading-tight">
                    I confirm that I have transferred the exact payable amount to the official college account and the uploaded UTR / proof is authentic.
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCollegePayModalReq(null)}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitCollegeProof}
                disabled={isSubmittingCollegeProof || isUploadingProof || !collegeAcceptedTerms || !collegeProofDoc || !collegeUtr}
                className="flex-1 py-2.5 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Upload size={14} />
                {isSubmittingCollegeProof ? "Submitting Proof..." : "Submit Payment Proof for Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: OFFICIAL RECEIPT / INVOICE PREVIEW MODAL         */}
      {/* ======================================================== */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-extrabold uppercase">
                  Official Payment Receipt
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  Receipt: {activeReceipt.receiptNumber || activeReceipt.transactionId || `REC-${activeReceipt.id?.slice(0, 8)}`}
                </h3>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt Card */}
            <div className="receipt-print-area p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 font-mono text-xs text-slate-800">
              <div className="flex justify-between border-b border-slate-200 pb-3 font-sans">
                <div>
                  <div className="font-black text-sm text-[#4A7B5B]">Swayam Admission</div>
                  <div className="text-[10px] text-slate-500">Official Education Gateway Receipt</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatDateIN(activeReceipt.paidAt || activeReceipt.createdAt)}</div>
                  <div className="text-[10px] text-emerald-700 font-bold uppercase">
                    Status: {activeReceipt.status || "COMPLETED"}
                  </div>
                </div>
              </div>

              <div className="space-y-1 font-sans text-xs">
                <div>
                  <strong>Student:</strong> {studentName} ({user?.email || "Student Account"})
                </div>
                <div>
                  <strong>Beneficiary:</strong> {activeReceipt.college?.name || (activeReceipt.paymentMode === "DIRECT_COLLEGE" ? "College" : "Swayam Admission")}
                </div>
                <div>
                  <strong>Fee Head:</strong> {String(activeReceipt.paymentType || "FEE").replace(/_/g, " ")}
                </div>
                <div>
                  <strong>Payment Method:</strong> {activeReceipt.paymentMethod || "Online Gateway (Razorpay)"}
                </div>
                {activeReceipt.utrNumber && (
                  <div>
                    <strong>UTR / Reference:</strong> {activeReceipt.utrNumber}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between font-sans font-bold text-sm">
                <span>TOTAL AMOUNT PAID:</span>
                <span className="text-emerald-700 font-black">
                  {formatINR(activeReceipt.paidAmount || activeReceipt.amount || 0)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Download size={14} /> Print / Save PDF
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPaymentCenter;
