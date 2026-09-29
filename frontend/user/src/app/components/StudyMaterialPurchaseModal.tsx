import React, { useState } from 'react';
import {
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  FileText,
  ShieldCheck,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { StudyMaterial, studyMaterialsApi, resolveThumbnailUrl } from '../../api/study-materials.api';
import { CouponApplyWidget } from './CouponApplyWidget';
import { CouponValidationResponse } from '../../api/coupons.api';

interface StudyMaterialPurchaseModalProps {
  material: StudyMaterial;
  isOpen: boolean;
  onClose: () => void;
  onPurchaseSuccess: (material: StudyMaterial) => void;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export const StudyMaterialPurchaseModal: React.FC<StudyMaterialPurchaseModalProps> = ({
  material,
  isOpen,
  onClose,
  onPurchaseSuccess,
}) => {
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<{
    receiptNumber: string;
    amount: number;
    discount: number;
    paidAmount: number;
    date: string;
  } | null>(null);

  if (!isOpen) return null;

  const originalPrice = material.price || 0;
  const discountAmount = appliedCoupon ? (appliedCoupon.discountAmount || 0) : 0;
  const finalPayable = Math.max(0, originalPrice - discountAmount);

  // Helper to load Razorpay script dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleProcessPayment = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      // 1. Create Purchase Order via authoritative backend API
      const orderRes = await studyMaterialsApi.createPurchaseOrder(
        material.id,
        appliedCoupon?.code,
      );

      // Case A: ₹0 / 100% Coupon instant entitlement
      if ((orderRes.data as any)?.status === 'COMPLETED' || finalPayable === 0) {
        setSuccessReceipt({
          receiptNumber: (orderRes.data as any)?.receiptNumber || `RCP-ZERO-${Date.now()}`,
          amount: originalPrice,
          discount: discountAmount || 0,
          paidAmount: 0,
          date: new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
        });
        setLoading(false);
        onPurchaseSuccess(material);
        // Trigger auto-download
        try {
          await studyMaterialsApi.downloadFile(material.id, material.fileName);
        } catch {
          // Manual download button is visible on success screen
        }
        return;
      }

      // Case B: Non-zero payment -> Launch Razorpay Checkout
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setError('Payment gateway failed to load. Please check your internet connection.');
        setLoading(false);
        return;
      }

      const { orderId, amount, currency, keyId } = orderRes.data;

      const options = {
        key: keyId || 'rzp_test_placeholder',
        amount: Math.round(((amount as number) || finalPayable) * 100), // In paise
        currency: currency || 'INR',
        name: 'Swayam Admission ERP',
        description: `Premium Access: ${material.title}`,
        order_id: orderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setLoading(true);
            const verifyRes = await studyMaterialsApi.verifyPurchase(material.id, {
              orderId: response.razorpay_order_id || orderId || '',
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            if ((verifyRes.data as any)?.status === 'COMPLETED' || (verifyRes.data as any)?.hasAccess || (verifyRes.data as any)?.entitled) {
              setSuccessReceipt({
                receiptNumber: (verifyRes.data as any)?.receiptNumber || response.razorpay_payment_id,
                amount: originalPrice,
                discount: discountAmount || 0,
                paidAmount: finalPayable,
                date: new Date().toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }),
              });
              onPurchaseSuccess(material);
              // Trigger auto-download
              try {
                await studyMaterialsApi.downloadFile(material.id, material.fileName);
              } catch {
                // Ignore
              }
            } else {
              setError('Payment verification failed on server. Please contact support.');
            }
          } catch (err: any) {
            setError(err.response?.data?.message || 'Payment verification failed.');
          } finally {
            setLoading(false);
          }
        },
        prefill: {},
        theme: {
          color: '#4A7B5B',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setError(resp.error?.description || 'Payment was unsuccessful. Please try again.');
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initiate purchase. Please try again.');
      setLoading(false);
    }
  };

  const handleDownloadPurchased = async () => {
    try {
      setLoading(true);
      await studyMaterialsApi.downloadFile(material.id, material.fileName);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Download failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-[#4A7B5B] to-[#3d694d] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Lock className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Unlock Premium Material</h3>
              <p className="text-xs text-emerald-100 font-medium">Instant lifetime digital access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {successReceipt ? (
            /* Success & Receipt Screen */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-[#4A7B5B] rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900">Purchase Confirmed!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Full material has been unlocked for your account.
                </p>
              </div>

              {/* Official Receipt Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-[#4A7B5B]" />
                    Receipt Ref
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {successReceipt.receiptNumber}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Resource</span>
                  <span className="font-bold text-slate-900 text-right line-clamp-1 max-w-[200px]">
                    {material.title}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>List Price</span>
                  <span>₹{successReceipt.amount.toLocaleString()}</span>
                </div>
                {successReceipt.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount Applied</span>
                    <span>-₹{successReceipt.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Amount Paid</span>
                  <span className="text-sm text-[#4A7B5B]">
                    ₹{successReceipt.paidAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Date</span>
                  <span>{successReceipt.date}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPurchased}
                  disabled={loading}
                  className="w-full py-3 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download Full Material Now
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl transition"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            /* Purchase Flow */
            <>
              {/* Material Summary Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3.5">
                {resolveThumbnailUrl(material.thumbnail) ? (
                  <div className="w-20 aspect-[16/9] rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-xs bg-slate-950 flex items-center justify-center">
                    <img
                      src={resolveThumbnailUrl(material.thumbnail)!}
                      alt={material.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a3a2c] to-[#4A7B5B] flex items-center justify-center text-white shrink-0 shadow-xs">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                      PREMIUM
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {material.materialType} • {material.category}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mt-1 line-clamp-2">
                    {material.title}
                  </h4>
                  {material.subject && (
                    <p className="text-xs text-slate-500 mt-0.5">Subject: {material.subject}</p>
                  )}
                </div>
              </div>

              {/* Coupon Widget */}
              <div className="border border-slate-200/80 rounded-2xl p-3.5 bg-white">
                <CouponApplyWidget
                  transactionAmount={originalPrice}
                  applicableScope="STUDY_MATERIAL_FEE"
                  appliedCoupon={appliedCoupon}
                  onCouponApplied={(res) => setAppliedCoupon(res)}
                  onCouponRemoved={() => setAppliedCoupon(null)}
                />
              </div>

              {/* Price Breakdown */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Original Price</span>
                  <span className="font-bold text-slate-800">
                    ₹{originalPrice.toLocaleString()}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Coupon Discount ({appliedCoupon?.code})
                    </span>
                    <span>-₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 text-sm font-black text-slate-900">
                  <span>Total Payable</span>
                  <div className="text-right">
                    <span className="text-lg text-[#4A7B5B]">
                      {finalPayable === 0 ? 'FREE (₹0)' : `₹${finalPayable.toLocaleString()}`}
                    </span>
                    {finalPayable === 0 && (
                      <p className="text-[10px] font-normal text-emerald-600">100% discount applied</p>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Security & Action */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={loading}
                  className="w-full py-3.5 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Securing Order...</span>
                    </>
                  ) : finalPayable === 0 ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Claim Free & Download (₹0)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay ₹{finalPayable.toLocaleString()} & Download</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#4A7B5B]" />
                  <span>Verified 256-Bit Encrypted Transaction • Razorpay Gateway</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
