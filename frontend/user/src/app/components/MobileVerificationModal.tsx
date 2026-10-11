import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Smartphone, CheckCircle2, Loader2, ArrowRight, ShieldAlert } from "lucide-react";
import { authApi } from "../../api/auth.api";
import { useAuth } from "../../context/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  reason?: string;
  allowSkip?: boolean;
  onSkip?: () => void;
}

export default function MobileVerificationModal({
  open,
  onClose,
  onSuccess,
  reason,
  allowSkip = true,
  onSkip,
}: Props) {
  const { user, refreshUser } = useAuth();
  const [mobile, setMobile] = useState("");
  const [step, setStep] = useState<"input" | "otp">("input");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);


  useEffect(() => {
    if (open) {
      setError(null);
      setOtp("");

      if (user?.mobile) {
        const raw = user.mobile.replace(/\D/g, "");
        setMobile(raw.slice(-10));
      } else {
        setMobile("");
      }
      setStep("input");
    }
  }, [open, user]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (loading) return;
    setError(null);
    const digits = mobile.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.sendMobileVerification({ mobile: digits });
      setStep("otp");
      setCooldown(res.data?.resendCooldownSeconds || 30);

    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to send verification OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (loading) return;
    setError(null);
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const digits = mobile.replace(/\D/g, "");
      await authApi.verifyUserMobile({ mobile: digits, otp: cleanOtp });
      await refreshUser();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Incorrect OTP. Please enter the valid code."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl gap-0">
        {/* Header */}
        <div className="bg-[#4A7B5B] px-6 pt-6 pb-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone size={22} className="text-white" />
            <DialogTitle className="text-white text-lg font-bold">
              Verify Mobile Number
            </DialogTitle>
          </div>
          <p className="text-white/80 text-xs">
            {reason || "Secure your Swayam Admission account and enable counselor support"}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium">
              {error}
            </div>
          )}

          {step === "input" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Mobile Number
                </label>
                <div className="flex rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#4A7B5B] overflow-hidden">
                  <span className="flex items-center px-3 text-xs font-semibold text-gray-500 bg-gray-100 border-r border-gray-200">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                    className="w-full px-3 py-2.5 bg-transparent text-sm focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  We'll send a 6-digit verification OTP.
                </p>
              </div>

              <div className="flex gap-2">
                {allowSkip && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSkip) onSkip();
                      onClose();
                    }}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Skip for Now
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || mobile.length !== 10}
                  className="flex-1 bg-[#4A7B5B] text-white py-2.5 rounded-xl hover:bg-[#3d6b4d] text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      Send OTP <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <div>
                  <span>OTP sent to </span>
                  <span className="font-semibold">+91 {mobile}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="text-[#4A7B5B] hover:underline font-semibold text-[11px]"
                >
                  Change
                </button>
              </div>



              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-lg tracking-widest font-mono font-bold focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Valid for 5 mins</span>
                {cooldown > 0 ? (
                  <span className="text-gray-400">Resend in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-[#4A7B5B] font-semibold hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                {allowSkip && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSkip) onSkip();
                      onClose();
                    }}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Skip
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="flex-1 bg-[#4A7B5B] text-white py-2.5 rounded-xl hover:bg-[#3d6b4d] text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Verify Mobile"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
