import React, { useState } from "react";
import { X, CheckCircle, XCircle, RefreshCw, FileText, Download, User, Building, BookOpen, Calendar, DollarSign, ShieldCheck, Tag, Award, CreditCard, Clock, Activity } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments.api";

interface PaymentDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId: string | null;
  onVerify: (payment: any) => void;
  onRefund: (payment: any) => void;
}

export default function PaymentDetailDrawer({
  isOpen,
  onClose,
  paymentId,
  onVerify,
  onRefund,
}: PaymentDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "gateway" | "ledger">("overview");

  const { data: paymentRes, isLoading } = useQuery({
    queryKey: ["payment_detail", paymentId],
    queryFn: () => paymentsApi.findOne(paymentId!),
    enabled: !!paymentId && isOpen,
  });

  const payment = paymentRes?.data;

  if (!isOpen || !paymentId) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "SUCCESS":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "FAILED":
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "REFUNDED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "PARTIALLY_PAID":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white shrink-0 relative flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20">
                {payment?.paymentType || "Transaction"}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(
                  payment?.status || ""
                )}`}
              >
                {payment?.status || "PENDING"}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              {payment?.transactionId || `Txn #${payment?.id?.slice(0, 8)}`}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Receipt: <strong>{payment?.receiptNumber || "Pending"}</strong> • Invoice: <strong>{payment?.invoiceNumber || "Pending"}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Action Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2 shrink-0">
          {payment?.status !== "COMPLETED" && payment?.status !== "SUCCESS" && (
            <button
              onClick={() => onVerify(payment)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <CheckCircle size={14} /> Verify & Approve
            </button>
          )}
          {payment?.status === "COMPLETED" && (
            <button
              onClick={() => onRefund(payment)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <RefreshCw size={14} /> Process Refund
            </button>
          )}
          <a
            href={`/api/payments/${payment?.id}/receipt`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <FileText size={14} /> Receipt
          </a>
          <a
            href={`/api/payments/${payment?.id}/invoice`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download size={14} /> Invoice
          </a>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white shrink-0">
          {(["overview", "timeline", "gateway", "ledger"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-[#4A7B5B] text-[#4A7B5B]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-20 text-slate-400 text-sm">Loading transaction details...</div>
          ) : !payment ? (
            <div className="text-center py-20 text-slate-400 text-sm">Transaction details not found.</div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Financial Breakdown Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <DollarSign size={14} /> Financial Breakdown
                    </h3>
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <span className="text-xs text-slate-500 block">Gross Amount</span>
                        <span className="text-lg font-bold text-slate-900">₹{(payment.amount || 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Net Paid Amount</span>
                        <span className="text-lg font-bold text-emerald-700">₹{(payment.paidAmount || payment.amount || 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Scholarship Deducted</span>
                        <span className="text-sm font-semibold text-purple-700">-₹{(payment.scholarshipAmount || 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Discount Concession</span>
                        <span className="text-sm font-semibold text-blue-700">-₹{(payment.discountAmount || 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">GST (18%)</span>
                        <span className="text-sm font-semibold text-slate-700">+₹{(payment.gstAmount || 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Outstanding Balance</span>
                        <span className="text-sm font-semibold text-rose-600">₹{(payment.pendingAmount || 0).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Student & Application Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <User size={14} className="text-[#4A7B5B]" /> Student Information
                      </h4>
                      <p className="text-sm font-bold text-slate-900">{payment.user?.fullName || "Student"}</p>
                      <p className="text-xs text-slate-500">{payment.user?.email}</p>
                      <p className="text-xs text-slate-500">{payment.user?.mobile}</p>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Building size={14} className="text-blue-600" /> College & Program
                      </h4>
                      <p className="text-sm font-bold text-slate-900">{payment.college?.name || payment.application?.college?.name || "N/A"}</p>
                      <p className="text-xs text-slate-500">{payment.course?.name || payment.application?.course?.name || "N/A"}</p>
                      <p className="text-xs text-slate-400">App ID: {payment.application?.applicationId || payment.applicationId || "N/A"}</p>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                      <CreditCard size={14} className="text-slate-700" /> Payment & Verification
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Payment Method</span>
                        <span className="font-semibold text-slate-800">{payment.paymentMethod || "UPI"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Gateway Provider</span>
                        <span className="font-semibold text-slate-800">{payment.gateway || "Manual"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Verified By</span>
                        <span className="font-semibold text-slate-800">{payment.verifier?.fullName || payment.verifiedBy || "System"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Paid Date</span>
                        <span className="font-semibold text-slate-800">{payment.paidAt ? new Date(payment.paidAt).toLocaleString("en-IN") : "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Counselor Commission</span>
                        <span className="font-semibold text-amber-700">₹{(payment.counselorCommission || 0).toLocaleString("en-IN")} ({payment.counselor?.fullName || 'Assigned'})</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "timeline" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={14} /> Application & Payment Audit Timeline
                  </h4>
                  {payment.application?.timeline?.length > 0 ? (
                    <div className="space-y-3 relative pl-4 border-l-2 border-slate-200">
                      {payment.application.timeline.map((item: any) => (
                        <div key={item.id} className="relative group">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#4A7B5B]" />
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                              <span>{item.action}</span>
                              <span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString("en-IN")}</span>
                            </div>
                            {item.remarks && <p className="text-xs text-slate-600 mt-1">{item.remarks}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs py-10 text-center">No timeline events recorded.</div>
                  )}
                </div>
              )}

              {activeTab === "gateway" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gateway Response Metadata</h4>
                  <pre className="bg-slate-900 text-emerald-400 text-xs p-4 rounded-xl overflow-x-auto font-mono">
                    {JSON.stringify(payment.gatewayResponse || { gateway: payment.gateway, orderId: payment.orderId, status: payment.status }, null, 2)}
                  </pre>
                </div>
              )}

              {activeTab === "ledger" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={14} /> ERP Financial Ledger Entries
                  </h4>
                  {payment.ledgerEntries?.length > 0 ? (
                    <div className="space-y-2">
                      {payment.ledgerEntries.map((entry: any) => (
                        <div key={entry.id} className="flex justify-between items-center p-3 border border-slate-200 rounded-lg text-xs bg-slate-50">
                          <div>
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] mr-2 ${entry.entryType === 'DEBIT' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {entry.entryType}
                            </span>
                            <span className="font-semibold text-slate-800">{entry.accountType}</span>
                            <p className="text-slate-500 text-[11px] mt-0.5">{entry.description}</p>
                          </div>
                          <span className="font-bold text-slate-900">₹{entry.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs py-10 text-center">No double-entry ledger items available.</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
