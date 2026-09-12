import React, { useState } from 'react';
import { Sparkles, Gift, ArrowRight, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { referralApi } from '../../api/referral.api';

interface FirstLoginReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const FirstLoginReferralModal: React.FC<FirstLoginReferralModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedInfo, setVerifiedInfo] = useState<{
    valid: boolean;
    referrerName?: string;
    counsellingBenefit?: any;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  if (!isOpen) return null;

  const handleValidate = async () => {
    if (!code.trim()) return;
    try {
      setIsValidating(true);
      setError(null);
      const res = await referralApi.validateCode(code.trim());
      if (res.valid) {
        setVerifiedInfo(res);
      } else {
        setVerifiedInfo(null);
        setError(res.message || 'Invalid or inactive referral code.');
      }
    } catch (err: any) {
      setVerifiedInfo(null);
      setError(err.response?.data?.message || 'Failed to validate referral code.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleApply = async () => {
    if (!code.trim()) {
      setError('Please enter a referral code.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await referralApi.applyOnboarding(code.trim());
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to apply referral code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setLoading(true);
      await referralApi.skipOnboarding();
      onClose();
    } catch (err) {
      console.error('Failed to skip referral onboarding:', err);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-100 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#4A7B5B]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#F0AE1A]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Skip button top right */}
        <button
          onClick={handleSkip}
          disabled={loading}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          title="Skip"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-5">
          {/* Header Icon */}
          <div className="w-12 h-12 bg-[#E8F3EC] rounded-2xl flex items-center justify-center text-[#4A7B5B] shadow-xs">
            <Gift className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8F3EC] text-[#4A7B5B] text-xs font-semibold">
              <Sparkles className="w-3 h-3 text-[#F0AE1A]" />
              Welcome to Swayam Admission
            </div>
            <h2 className="text-xl font-bold text-slate-900">Were you referred by a student?</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              If an existing Swayam student invited you, enter their code now to claim your exclusive{' '}
              <strong className="text-slate-800">100% Free Counselling Benefit</strong>.
            </p>
          </div>

          {/* Referral Input Box */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Referral Code (Optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. SWY-JOHN-A1B2"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setVerifiedInfo(null);
                  setError(null);
                }}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
              />
              <button
                type="button"
                onClick={handleValidate}
                disabled={isValidating || !code.trim()}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
              </button>
            </div>
          </div>

          {/* Validation Feedback */}
          {verifiedInfo && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Referred by {verifiedInfo.referrerName}</div>
                <div className="text-emerald-700 mt-0.5">
                  ✓ {verifiedInfo.counsellingBenefit?.message || '100% OFF — FREE Counselling Session'}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleApply}
              disabled={loading || !code.trim()}
              className="w-full py-3 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Applying Referral...
                </>
              ) : (
                <>
                  Apply Referral Code
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={handleSkip}
              disabled={loading}
              className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-xs font-semibold transition"
            >
              I don't have a referral code, skip for now
            </button>
          </div>

          <div className="text-center">
            <span className="text-[11px] text-slate-400">
              Note: Referral attribution can only be linked once during registration.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FirstLoginReferralModal;
