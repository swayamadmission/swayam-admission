import React, { useState, useEffect } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  KeyRound,
  Clock,
  Building2,
  Briefcase,
  Mail,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { authApi, ActivationVerifyResponse } from "../../api/auth.api";
// @ts-ignore
import saLogo from "../../assets/SA_logo-removebg-preview.png";
import { toast } from "sonner";

export default function AccountActivationPage() {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<ActivationVerifyResponse | null>(null);

  // Form states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const [activatedPortalUrl, setActivatedPortalUrl] = useState<string>("");

  useEffect(() => {
    // Extract token from query param or URL path
    let extractedToken = "";
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      extractedToken = searchParams.get("token") || "";

      if (!extractedToken && window.location.pathname.includes("/activate/")) {
        const parts = window.location.pathname.split("/activate/");
        extractedToken = parts[1]?.split("?")[0] || "";
      }
    }

    if (!extractedToken) {
      setLoading(false);
      setVerifyError(
        "No activation token was provided in the URL. Please verify your activation link or check the invitation email sent to your official address."
      );
      return;
    }

    setToken(extractedToken);

    // Verify token with backend
    authApi
      .verifyActivationToken(extractedToken)
      .then((res) => {
        setTokenData(res);
        setVerifyError(null);
      })
      .catch((err: any) => {
        const msg =
          err?.response?.data?.message ||
          "This activation link is invalid, has expired (valid 24h), or has already been used.";
        setVerifyError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Password Policy Checks
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-/+=~`]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordValid =
    hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && passwordsMatch;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!isPasswordValid) {
      setSubmitError("Please ensure your password satisfies all security requirements.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.activateAccount({
        token,
        password,
        confirmPassword,
      });

      setActivated(true);
      setActivatedPortalUrl(res.loginPortalUrl || tokenData?.loginPortalUrl || "/");
      toast.success("Account successfully activated! You may now sign in.");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Failed to activate account. The activation link may have expired or already been consumed.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: "radial-gradient(ellipse at top, #F0FDF4 0%, #F8FAFC 70%)",
        }}
      >
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-gray-100 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-[#4A7B5B]">
            <RefreshCw className="w-7 h-7 animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Validating Activation Link</h2>
            <p className="text-xs text-gray-500 mt-1">
              Verifying your cryptographic security token with Swayam Admission...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State (Invalid / Expired / Already Used)
  if (verifyError || !tokenData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: "radial-gradient(ellipse at top, #FEF2F2 0%, #F8FAFC 70%)",
        }}
      >
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-rose-100 shadow-xl text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Activation Link Invalid</h2>
            <p className="text-xs text-gray-600 leading-relaxed">{verifyError}</p>
          </div>

          <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] text-gray-500 text-left space-y-1.5">
            <div className="font-semibold text-gray-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Security Policy Notice</span>
            </div>
            <p>
              • Activation links expire strictly after 24 hours.
              <br />
              • Each link is single-use and invalidated immediately upon first activation or when a replacement is re-issued.
              <br />
              • If your account was already activated, you can proceed directly to the login portal.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <a
              href="/"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white text-xs shadow-sm transition hover:shadow"
              style={{ background: "#4A7B5B" }}
            >
              <span>Go to Login Portal</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <p className="text-[11px] text-gray-400">
              Need assistance? Contact your HR team or administrator at{" "}
              <a
                href="mailto:swayamadmissions@gmail.com"
                className="text-[#4A7B5B] hover:underline font-medium"
              >
                swayamadmissions@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Success State (Activation Complete)
  if (activated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: "radial-gradient(ellipse at top, #ECFDF5 0%, #F8FAFC 70%)",
        }}
      >
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-emerald-100 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto text-[#4A7B5B] shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              ACCOUNT ACTIVE & VERIFIED
            </span>
            <h2 className="text-2xl font-bold text-gray-900">Welcome to Swayam Admission!</h2>
            <p className="text-xs text-gray-600">
              Your official employee account has been successfully activated. Your email has been verified and your private password is set.
            </p>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-left text-xs space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-emerald-100/60">
              <span className="text-gray-500">Employee ID:</span>
              <span className="font-mono font-bold text-emerald-900">
                {tokenData.user.employeeId || "ASSIGNED"}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-emerald-100/60">
              <span className="text-gray-500">Official Email:</span>
              <span className="font-semibold text-gray-800">{tokenData.user.email}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500">Portal:</span>
              <span className="font-bold text-[#4A7B5B]">{tokenData.portalName}</span>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href={activatedPortalUrl || tokenData.loginPortalUrl || "/"}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-white text-sm shadow-md transition hover:shadow-lg"
              style={{ background: "#4A7B5B" }}
            >
              <span>Proceed to Login Portal</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <p className="text-[11px] text-gray-400">
              You can log in using either your Employee ID (
              <strong className="font-mono">{tokenData.user.employeeId}</strong>) or official email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 4. Set Password & Activation Form
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 py-12"
      style={{
        background: "radial-gradient(ellipse at top, #F0FDF4 0%, #F8FAFC 80%)",
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-100 shadow-2xl p-8 space-y-6 animate-in fade-in duration-200">
        {/* Header / Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-1">
            <img src={saLogo} alt="Swayam Admission" className="h-12 w-auto object-contain" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#4A7B5B]/10 text-[#4A7B5B]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure Employee Account Activation</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Activate Your Account</h1>
          <p className="text-xs text-gray-500">
            Create your permanent confidential password to finalize setup and access your assigned portal.
          </p>
        </div>

        {/* Employee Verified Profile Summary */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center font-bold text-[#4A7B5B] shadow-xs">
                {tokenData.user.fullName?.slice(0, 2).toUpperCase() || "EM"}
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">{tokenData.user.fullName}</div>
                <div className="text-xs text-gray-600 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-[#4A7B5B]" />
                  <span>{tokenData.user.email}</span>
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white text-emerald-900 border border-emerald-200 shadow-xs">
              {tokenData.user.employeeId || "NEW JOINER"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-100 text-xs">
            <div>
              <span className="text-[11px] text-gray-500 block">Department & Role:</span>
              <span className="font-semibold text-gray-800">
                {tokenData.user.role} {tokenData.user.department ? `• ${tokenData.user.department}` : ""}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 block">Assigned Portal:</span>
              <span className="font-bold text-[#4A7B5B]">{tokenData.portalName}</span>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleActivate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 block">
              Create New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter strong password"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 block">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Real-time Password Security Checklist */}
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-2 text-xs">
            <div className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider">
              Password Security Checklist
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-700 font-medium" : "text-gray-400"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? "text-emerald-600" : "text-gray-300"}`} />
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpper ? "text-emerald-700 font-medium" : "text-gray-400"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasUpper ? "text-emerald-600" : "text-gray-300"}`} />
                <span>1 Uppercase letter (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLower ? "text-emerald-700 font-medium" : "text-gray-400"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasLower ? "text-emerald-600" : "text-gray-300"}`} />
                <span>1 Lowercase letter (a-z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-700 font-medium" : "text-gray-400"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? "text-emerald-600" : "text-gray-300"}`} />
                <span>1 Numeric digit (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecial ? "text-emerald-700 font-medium" : "text-gray-400"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasSpecial ? "text-emerald-600" : "text-gray-300"}`} />
                <span>1 Special symbol (!@#$)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-700 font-medium" : "text-gray-400"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${passwordsMatch ? "text-emerald-600" : "text-gray-300"}`} />
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isPasswordValid || submitting}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-white text-sm shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg flex items-center justify-center gap-2"
            style={{ background: "#4A7B5B" }}
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Activating Account...</span>
              </>
            ) : (
              <>
                <span>Activate Account & Complete Setup</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-gray-100">
          <p className="text-[11px] text-gray-400">
            Swayam Admission Enterprise HRMS • Secure 256-bit Token Activation
          </p>
        </div>
      </div>
    </div>
  );
}
