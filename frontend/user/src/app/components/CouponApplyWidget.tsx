import React, { useState, useEffect } from 'react';
import { Tag, Check, X, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { couponsApi, CouponValidationResponse, AvailableCoupon } from '../../api/coupons.api';

interface CouponApplyWidgetProps {
  transactionAmount: number;
  applicableScope?: string;
  collegeId?: string;
  courseId?: string;
  branchId?: string;
  onCouponApplied?: (result: CouponValidationResponse) => void;
  onCouponRemoved?: () => void;
  appliedCoupon?: CouponValidationResponse | null;
}

export const CouponApplyWidget: React.FC<CouponApplyWidgetProps> = ({
  transactionAmount,
  applicableScope = 'ALL',
  collegeId,
  courseId,
  branchId,
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [currentCoupon, setCurrentCoupon] = useState<CouponValidationResponse | null>(
    appliedCoupon || null,
  );

  useEffect(() => {
    if (appliedCoupon !== undefined) {
      setCurrentCoupon(appliedCoupon);
    }
  }, [appliedCoupon]);

  useEffect(() => {
    let isMounted = true;
    const loadOffers = async () => {
      try {
        const offers = await couponsApi.getAvailableCoupons({
          scope: applicableScope,
          amount: transactionAmount,
          collegeId,
          courseId,
        });
        if (isMounted) {
          setAvailableCoupons(offers);
        }
      } catch {
        // Fallback silently if available coupons endpoint not reachable
      }
    };
    loadOffers();
    return () => {
      isMounted = false;
    };
  }, [applicableScope, transactionAmount, collegeId, courseId]);

  const handleApplyCode = async (codeToApply: string) => {
    const cleanCode = codeToApply.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a coupon code.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await couponsApi.validateCoupon({
        code: cleanCode,
        transactionAmount,
        applicableScope,
        collegeId,
        courseId,
        branchId,
      });

      if (res.valid) {
        setCurrentCoupon(res);
        setInputCode(cleanCode);
        if (onCouponApplied) onCouponApplied(res);
      } else {
        setError(res.message || 'Invalid coupon code or conditions not met.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to apply coupon. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setCurrentCoupon(null);
    setInputCode('');
    setError(null);
    if (onCouponRemoved) onCouponRemoved();
  };

  return (
    <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Tag className="w-3.5 h-3.5 text-[#4A7B5B]" />
          <span>Have a Promo or Coupon Code?</span>
        </div>
        {currentCoupon && (
          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            Applied
          </span>
        )}
      </div>

      {currentCoupon ? (
        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-xs text-emerald-900">{currentCoupon.code}</span>
              <span className="text-[11px] font-bold text-emerald-700">
                -₹{(currentCoupon.discountAmount || 0).toLocaleString()} Saved!
              </span>
            </div>
            <p className="text-[10px] text-emerald-600">
              {currentCoupon.discountType === 'PERCENTAGE'
                ? `${currentCoupon.discountValue}% discount applied to this order`
                : `Flat ₹${currentCoupon.discountValue} discount applied`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs font-bold text-slate-500 hover:text-red-600 px-2.5 py-1 hover:bg-red-50 rounded-lg transition flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Remove
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter coupon code (e.g. CA100, SWY20)"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyCode(inputCode);
                  }
                }}
                className="w-full uppercase font-mono px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
            <button
              type="button"
              onClick={() => handleApplyCode(inputCode)}
              disabled={loading || !inputCode.trim()}
              className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply'
              )}
            </button>
          </div>

          {error && (
            <div className="text-[11px] text-red-600 font-medium flex items-center gap-1.5 pt-0.5">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {availableCoupons.length > 0 && (
            <div className="pt-2 border-t border-slate-200/60">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#4A7B5B]" />
                Available Offers
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {availableCoupons.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 hover:border-[#4A7B5B]/50 transition text-left"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-mono font-bold text-xs text-slate-800">{c.code}</span>
                      <p className="text-[10px] text-slate-500 truncate">{c.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyCode(c.code)}
                      disabled={loading}
                      className="shrink-0 text-[11px] font-bold text-[#4A7B5B] hover:text-[#3d694d] bg-[#E8F3EC] px-2.5 py-1 rounded-md transition hover:shadow-xs disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CouponApplyWidget;
