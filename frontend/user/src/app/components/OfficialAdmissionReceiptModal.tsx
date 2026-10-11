import React from 'react';
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  Building2,
  FileText,
  Calendar,
  CreditCard,
  Tag,
  ShieldCheck,
  Check,
} from 'lucide-react';

export interface AdmissionReceiptData {
  receiptNumber: string;
  applicationId: string;
  applicationNumber?: string;
  studentName?: string;
  studentEmail?: string;
  studentMobile?: string;
  collegeName?: string;
  courseName?: string;
  date?: string;
  paymentDate?: string;
  feeDescription?: string;
  originalAmount: number;
  discountAmount?: number;
  discount?: number;
  couponCode?: string;
  coupon?: string;
  paidAmount: number;
  netAmount?: number;
  paymentStatus: string;
  paymentMethod?: string;
  transactionReference?: string;
  transactionId?: string;
  utrNumber?: string;
  remarks?: string;
}

interface OfficialAdmissionReceiptModalProps {
  receipt: AdmissionReceiptData;
  onClose: () => void;
  onViewApplications?: () => void;
  isInline?: boolean; // if true, renders directly in-page rather than in a fixed overlay
}

export const OfficialAdmissionReceiptModal: React.FC<OfficialAdmissionReceiptModalProps> = ({
  receipt,
  onClose,
  onViewApplications,
  isInline = false,
}) => {
  const original = receipt.originalAmount || 1500;
  const discount = receipt.discountAmount ?? receipt.discount ?? 0;
  const finalPaid = receipt.paidAmount ?? receipt.netAmount ?? Math.max(0, original - discount);
  const coupon = receipt.couponCode || receipt.coupon || (discount > 0 ? 'FEE_WAIVER' : 'NONE');
  const appCode = receipt.applicationNumber || receipt.applicationId;
  const dateFormatted =
    receipt.paymentDate ||
    receipt.date ||
    new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadOfflineHtml = () => {
    // Generate clean self-contained offline receipt HTML
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt_${receipt.receiptNumber}_Swayam_Admission</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
    .receipt { max-width: 650px; margin: 0 auto; border: 2px solid #0f172a; border-radius: 12px; padding: 28px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
    .brand { font-size: 20px; font-weight: 900; color: #4A7B5B; letter-spacing: -0.5px; }
    .brand-sub { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px; }
    .rec-badge { font-family: monospace; font-size: 12px; font-weight: 700; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; font-size: 12px; }
    .label { color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 2px; }
    .val { font-weight: 700; color: #0f172a; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    .table th { background: #f8fafc; text-align: left; padding: 8px 10px; border-bottom: 1px solid #cbd5e1; font-size: 11px; color: #475569; }
    .table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .total-row { font-size: 14px; font-weight: 900; color: #4A7B5B; background: #f0fdf4; }
    .footer { font-size: 10px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 14px; line-height: 1.5; }
    @media print { body { padding: 0; } .receipt { border: 1.5px solid #000; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div>
        <div class="brand">Swayam Admission</div>
        <div class="brand-sub">Central Admission & Fee Settlement Registry</div>
        <div style="font-size: 11px; font-weight: bold; color: #1e293b; margin-top: 4px;">Official Settlement Receipt</div>
      </div>
      <div style="text-align: right;">
        <span class="rec-badge">${receipt.receiptNumber}</span>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${dateFormatted}</div>
      </div>
    </div>
    <div class="grid">
      <div><span class="label">Application ID</span><span class="val">${appCode}</span></div>
      <div><span class="label">Payment Status</span><span class="val" style="color: #166534;">${receipt.paymentStatus}</span></div>
      <div><span class="label">Student Name</span><span class="val">${receipt.studentName || 'Student'}</span></div>
      <div><span class="label">Payment Method</span><span class="val">${receipt.paymentMethod || 'Online Gateway (Razorpay)'}</span></div>
      <div><span class="label">Target College</span><span class="val">${receipt.collegeName || 'Partner College'}</span></div>
      <div><span class="label">Academic Program</span><span class="val">${receipt.courseName || 'Degree Program'}</span></div>
      <div style="grid-column: span 2;"><span class="label">Transaction Reference</span><span class="val" style="font-family: monospace;">${receipt.transactionReference || receipt.transactionId || 'TXN_VERIFIED'}</span></div>
    </div>
    <table class="table">
      <thead>
        <tr><th>Fee Description</th><th style="text-align: right;">Amount</th></tr>
      </thead>
      <tbody>
        <tr><td>${receipt.feeDescription || 'Application Submission Fee - Academic Session 2026-2027'}</td><td style="text-align: right; font-weight: 600;">₹${original.toLocaleString()}</td></tr>
        ${discount > 0 ? `<tr><td style="color: #166534;">Coupon Discount / Waiver (${coupon})</td><td style="text-align: right; color: #166534; font-weight: 700;">-₹${discount.toLocaleString()}</td></tr>` : ''}
        <tr class="total-row"><td><strong>Total Paid / Settled Amount</strong></td><td style="text-align: right;"><strong>₹${finalPaid.toLocaleString()}</strong></td></tr>
      </tbody>
    </table>
    <div class="footer">
      This is an authoritative, digitally validated official admission fee receipt issued by <strong>Swayam Admission</strong>.<br />
      Verified by the Central Admission Registry. For queries, contact support@swayamadmission.com.
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Swayam_Admission_Receipt_${receipt.receiptNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const receiptContent = (
    <div className="receipt-print-area bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Official Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center font-black text-sm">
              SA
            </div>
            <div>
              <h2 className="text-xl font-black text-[#4A7B5B] tracking-tight">Swayam Admission</h2>
              <p className="text-[11px] font-semibold text-slate-500">Central Admission & Fee Settlement Registry</p>
            </div>
          </div>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Official Settlement Receipt
          </div>
        </div>

        <div className="text-left sm:text-right space-y-1">
          <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 block sm:inline-block">
            {receipt.receiptNumber}
          </span>
          <div className="text-[11px] text-slate-500 flex items-center sm:justify-end gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{dateFormatted}</span>
          </div>
        </div>
      </div>

      {/* Student & College Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Application ID</span>
          <span className="font-mono font-bold text-slate-900 text-sm">{appCode}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Payment Status</span>
          <span className="font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md inline-block mt-0.5">
            {receipt.paymentStatus}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Student Name</span>
          <span className="font-bold text-slate-900">{receipt.studentName || 'Student Applicant'}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Payment Method</span>
          <span className="font-bold text-slate-900">{receipt.paymentMethod || 'Online Gateway (Razorpay)'}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Target College</span>
          <span className="font-bold text-slate-900">{receipt.collegeName || 'Partner College'}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Academic Program</span>
          <span className="font-bold text-slate-900">{receipt.courseName || 'Degree Program'}</span>
        </div>
        <div className="sm:col-span-2 pt-1 border-t border-slate-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Transaction Reference / UTR</span>
          <span className="font-mono font-bold text-slate-800 break-all">
            {receipt.transactionReference || receipt.transactionId || receipt.utrNumber || 'TXN_CENTRAL_REGISTRY'}
          </span>
        </div>
      </div>

      {/* Authoritative Settlement Fee Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4 text-left">Fee Head Description</th>
              <th className="py-2.5 px-4 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-3 px-4 font-semibold text-slate-800">
                {receipt.feeDescription || 'Application Submission Fee - Academic Session 2026-2027'}
              </td>
              <td className="py-3 px-4 text-right font-bold text-slate-900">
                ₹{original.toLocaleString()}
              </td>
            </tr>
            {discount > 0 && (
              <tr className="bg-emerald-50/40">
                <td className="py-2.5 px-4 font-bold text-emerald-800 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  Coupon Discount / Fee Waiver ({coupon})
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                  -₹{discount.toLocaleString()}
                </td>
              </tr>
            )}
            <tr className="bg-emerald-100/40 border-t-2 border-emerald-300">
              <td className="py-3.5 px-4 font-black text-sm text-gray-900">
                Total Paid / Settled Amount
              </td>
              <td className="py-3.5 px-4 text-right font-black text-base text-[#4A7B5B]">
                ₹{finalPaid.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Official Security & Verification Stamp */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#4A7B5B] shrink-0" />
          <div className="text-[11px] text-slate-600 leading-snug">
            <strong>Digitally Authenticated Document</strong>
            <p className="text-[10px] text-slate-400">Verified by Swayam Admission Central Admission Registry</p>
          </div>
        </div>
        <span className="text-[10px] font-black font-mono text-emerald-800 bg-emerald-100 px-2 py-1 rounded border border-emerald-300 shrink-0">
          AUTHENTICATED
        </span>
      </div>

      {/* Official Footer Note */}
      <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3 leading-relaxed">
        This is a computer-generated official receipt issued by <strong>Swayam Admission</strong>. No physical signature required.
        <br />
        For verification or admissions support, please contact admissions@swayamadmission.com.
      </div>
    </div>
  );

  // If inline rendering requested (e.g. at the end of the form)
  if (isInline) {
    return (
      <div className="space-y-4">
        {receiptContent}

        {/* Action Controls (Hidden when printing via .no-print) */}
        <div className="no-print flex flex-col sm:flex-row gap-3 pt-2 max-w-2xl mx-auto" data-no-print="true">
          {onViewApplications && (
            <button
              type="button"
              onClick={onViewApplications}
              className="flex-1 py-3 px-6 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" /> View in My Applications
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
          <button
            type="button"
            onClick={handleDownloadOfflineHtml}
            className="flex-1 py-3 px-6 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#4A7B5B]" /> Download Receipt
          </button>
        </div>
      </div>
    );
  }

  // Modal Overlay rendering
  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8">
        {/* Modal Close Button (Floating in top right, hidden during print) */}
        <button
          type="button"
          onClick={onClose}
          className="no-print absolute -top-4 -right-4 w-9 h-9 rounded-full bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-lg border border-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer z-10"
          data-no-print="true"
        >
          <X className="w-4 h-4" />
        </button>

        {receiptContent}

        {/* Modal Action Controls (Hidden during print) */}
        <div className="no-print flex flex-col sm:flex-row gap-3 pt-4" data-no-print="true">
          {onViewApplications && (
            <button
              type="button"
              onClick={onViewApplications}
              className="flex-1 py-3 px-6 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" /> View in My Applications
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
          <button
            type="button"
            onClick={handleDownloadOfflineHtml}
            className="flex-1 py-3 px-6 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#4A7B5B]" /> Download Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfficialAdmissionReceiptModal;
