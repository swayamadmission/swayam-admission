import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Mail, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
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

export default function EmailVerificationModal({
  open,
  onClose,
  onSuccess,
  reason,
  allowSkip = true,
  onSkip,
}: Props) {
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"input" | "otp">("input");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setOtp("");
      setDevCodeHint(null);
      setEmail(user?.email || user?.personalEmail || "");
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

  const handleSendCode = async () => {
    if (loading) return;
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.sendEmailVerification(cleanEmail);
      setStep("otp");
      setCooldown(res.data?.resendCooldownSeconds || 30);
      if (res.data?.devCode) {
        setDevCodeHint(res.data.devCode);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to send email verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (loading) return;
    setError(null);
    const cleanCode = otp.trim();
    if (cleanCode.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      await authApi.verifyEmail({ email: cleanEmail, code: cleanCode });
      await refreshUser();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Incorrect verification code. Please check your inbox and try again."
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
            <Mail size={22} className="text-white" />
            <DialogTitle className="text-white text-lg font-bold">
              Verify Email Address
            </DialogTitle>
          </div>
          <p className="text-white/80 text-xs">
            {reason || "Verify your email to receive admission alerts and application receipts"}
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
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B]"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  We'll send a 6-digit confirmation code to your inbox.
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
                  onClick={handleSendCode}
                  disabled={loading || !email.trim()}
                  className="flex-1 bg-[#4A7B5B] text-white py-2.5 rounded-xl hover:bg-[#3d6b4d] text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      Send Code <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <div>
                  <span>Code sent to </span>
                  <span className="font-semibold">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="text-[#4A7B5B] hover:underline font-semibold text-[11px]"
                >
                  Change
                </button>
              </div>

              {devCodeHint && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-mono text-center">
                  Demo Code: <strong>{devCodeHint}</strong>
                </div>
              )}

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
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-lg tracking-widest font-mono font-bold focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Valid for 15 mins</span>
                {cooldown > 0 ? (
                  <span className="text-gray-400">Resend in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={loading}
                    className="text-[#4A7B5B] font-semibold hover:underline"
                  >
                    Resend Code
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
                  onClick={handleVerifyCode}
                  disabled={loading || otp.length !== 6}
                  className="flex-1 bg-[#4A7B5B] text-white py-2.5 rounded-xl hover:bg-[#3d6b4d] text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Verify Email"
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
