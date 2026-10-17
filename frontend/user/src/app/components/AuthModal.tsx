import React, { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import {
  Eye,
  EyeOff,
  Mail,
  Smartphone,
  Loader2,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  RotateCw,
} from "lucide-react";
import {
  authApi,
  type LoginPayload,
  type SignupPayload,
} from "../../api/auth.api";
import { geographyApi, type StateItem, type DistrictItem } from "../../api/geography.api";
import { useAuth } from "../../context/AuthContext";
import ActionConsentSection, { AcceptedPolicyPayload } from "./ActionConsentSection";

type AuthTab = "login" | "signup" | "forgot";

interface Props {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
  authLogin: (data: LoginPayload) => Promise<boolean>;
  authSignup: (data: SignupPayload) => Promise<boolean>;
  authError: string | null;
  authLoading: boolean;
  clearError: () => void;
}

export default function AuthModal({
  open,
  onClose,
  onLogin,
  authLogin,
  authSignup,
  authError,
  authLoading,
  clearError,
}: Props) {
  const { loginWithGoogle } = useAuth();

  const [tab, setTab] = useState<AuthTab>("login");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Email / Mobile + Password Login State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Registration Form State
  const [signupForm, setSignupForm] = useState({
    fullName: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    state: "",
    district: "",
    referralCode: "",
  });
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [regConsentValid, setRegConsentValid] = useState(false);
  const [regAcceptedPolicies, setRegAcceptedPolicies] = useState<AcceptedPolicyPayload[]>([]);

  // Registration Mobile OTP Verification State
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtp, setRegOtp] = useState("");
  const [regOtpVerified, setRegOtpVerified] = useState(false);
  const [regVerificationToken, setRegVerificationToken] = useState("");
  const [regOtpLoading, setRegOtpLoading] = useState(false);
  const [regResendCooldown, setRegResendCooldown] = useState(0);


  // Master State and District Data
  const [statesList, setStatesList] = useState<StateItem[]>([]);
  const [districtsList, setDistrictsList] = useState<DistrictItem[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  // Forgot / Reset Password State
  const [forgotMethod, setForgotMethod] = useState<"MOBILE" | "EMAIL">("EMAIL");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotStep, setForgotStep] = useState<"input" | "otp" | "new_password">("input");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotResetToken, setForgotResetToken] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotCooldown, setForgotCooldown] = useState(0);


  // Load States from DB master data when modal opens
  useEffect(() => {
    if (open) {
      setStatesLoading(true);
      geographyApi
        .getStates()
        .then((res) => {
          if (Array.isArray(res)) {
            // Sort alphabetically for clean UI
            const sorted = [...res].sort((a, b) => a.name.localeCompare(b.name));
            setStatesList(sorted);
          }
        })
        .catch((err) => {
          console.error("Failed to load states:", err);
        })
        .finally(() => {
          setStatesLoading(false);
        });
    }
  }, [open]);

  // Load Districts dynamically when selected state changes
  useEffect(() => {
    if (!signupForm.state) {
      setDistrictsList([]);
      return;
    }

    const stateObj = statesList.find(
      (s) => s.name.toLowerCase() === signupForm.state.toLowerCase() || s.id === signupForm.state
    );

    if (stateObj) {
      setDistrictsLoading(true);
      geographyApi
        .getDistricts(stateObj.id)
        .then((res) => {
          if (Array.isArray(res)) {
            const sorted = [...res].sort((a, b) => a.name.localeCompare(b.name));
            setDistrictsList(sorted);
          }
        })
        .catch((err) => {
          console.error("Failed to load districts:", err);
        })
        .finally(() => {
          setDistrictsLoading(false);
        });
    }
  }, [signupForm.state, statesList]);

  // Registration OTP Cooldown Timer
  useEffect(() => {
    if (regResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setRegResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [regResendCooldown]);

  // Forgot Password OTP Cooldown Timer
  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  const switchTab = (t: AuthTab) => {
    setTab(t);
    clearError();
    setLocalError(null);
    setSignupSuccess(false);
    setForgotMessage(null);
    setForgotStep("input");

    if (t === "forgot") {
      setForgotMethod("EMAIL");
    }
  };

  // 1. Password Login Handler (Email/Mobile + Password)
  const handlePasswordLogin = async () => {
    if (authLoading) return;
    setLocalError(null);
    clearError();
    if (!identifier.trim() || !password.trim()) {
      setLocalError("Please enter your email or mobile number and password.");
      return;
    }
    const success = await authLogin({ email: identifier.trim(), password });
    if (success) {
      onLogin();
      setIdentifier("");
      setPassword("");
    }
  };

  // 2. Google Identity Services Setup & Handlers
  const handleGoogleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      if (!response?.credential) {
        setLocalError(
          "Google authentication did not return a valid credential. Please try again.",
        );
        return;
      }
      setIsGoogleLoading(true);
      setLocalError(null);
      clearError();
      try {
        const referralCode =
          new URLSearchParams(window.location.search).get("ref") ||
          new URLSearchParams(window.location.search).get("referralCode") ||
          undefined;

        const success = await loginWithGoogle({
          idToken: response.credential,
          credential: response.credential,
          referralCode,
        });
        if (success) {
          onLogin();
        }
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          err?.apiError?.userMessage ||
          "Google sign-in failed. Please try again.";
        setLocalError(msg);
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [loginWithGoogle, onLogin, clearError],
  );

  useEffect(() => {
    if (!open || tab !== "login") return;

    const clientId =
      (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
      (import.meta as any).env?.VITE_GOOGLE_OAUTH_CLIENT_ID;

    if (!clientId) {
      setIsGsiLoaded(false);
      return;
    }

    let isCancelled = false;

    const renderGsiButton = () => {
      if (isCancelled || !googleBtnContainerRef.current) return;
      const g = (window as any).google;
      if (!g?.accounts?.id) return;

      try {
        g.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = "";
          const containerWidth = googleBtnContainerRef.current.offsetWidth || 360;
          const width = Math.min(Math.max(containerWidth, 240), 400);

          g.accounts.id.renderButton(googleBtnContainerRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width,
          });
          setIsGsiLoaded(true);
        }
      } catch (e) {
        console.warn("[Google Identity Services Init]", e);
      }
    };

    if ((window as any).google?.accounts?.id) {
      renderGsiButton();
    } else {
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(interval);
          renderGsiButton();
        }
      }, 150);
      const timeout = setTimeout(() => clearInterval(interval), 6000);
      return () => {
        isCancelled = true;
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    return () => {
      isCancelled = true;
    };
  }, [open, tab, handleGoogleCredentialResponse]);

  const handleGoogleFallbackClick = () => {
    if (authLoading || isGoogleLoading) return;
    setLocalError(null);
    clearError();

    const clientId =
      (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
      (import.meta as any).env?.VITE_GOOGLE_OAUTH_CLIENT_ID;

    if (!clientId) {
      setLocalError(
        "Google Sign-In is not configured yet. Please configure VITE_GOOGLE_CLIENT_ID in your environment.",
      );
      return;
    }

    const g = (window as any).google;
    if (g?.accounts?.id) {
      g.accounts.id.prompt((notification: any) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          console.log(
            "[GIS Notification]",
            notification.getNotDisplayedReason?.() || notification.getSkippedReason?.(),
          );
        }
      });
    } else {
      setLocalError(
        "Google authentication services are loading. Please check your internet connection or ad blocker and try again.",
      );
    }
  };

  // 3. Registration: Send Mobile OTP
  const handleSendRegistrationOtp = async () => {
    if (regOtpLoading) return;
    setLocalError(null);
    clearError();
    const cleanMobile = signupForm.mobile.replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length !== 10) {
      setLocalError("Please enter a valid 10-digit mobile number first.");
      return;
    }

    setRegOtpLoading(true);
    try {
      const res = await authApi.sendRegistrationMobileOtp({ mobile: cleanMobile });
      setRegOtpSent(true);
      setRegResendCooldown(res.data?.resendCooldownSeconds || 30);
      setRegOtp(""); // User manually enters OTP

    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err?.apiError?.userMessage ||
        "Failed to send OTP. Please check your mobile number.";
      setLocalError(msg);
    } finally {
      setRegOtpLoading(false);
    }
  };

  // 4. Registration: Verify Mobile OTP
  const handleVerifyRegistrationOtp = async () => {
    if (regOtpLoading) return;
    setLocalError(null);
    clearError();
    const cleanOtp = regOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setLocalError("Please enter the 6-digit OTP sent to your mobile.");
      return;
    }

    setRegOtpLoading(true);
    try {
      const cleanMobile = signupForm.mobile.replace(/\D/g, "");
      const res = await authApi.verifyRegistrationMobileOtp({
        mobile: cleanMobile,
        otp: cleanOtp,
      });

      if (res.data?.verificationToken) {
        setRegVerificationToken(res.data.verificationToken);
        setRegOtpVerified(true);
        setRegOtpSent(false);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err?.apiError?.userMessage ||
        "Incorrect OTP. Please enter the valid 6-digit OTP.";
      setLocalError(msg);
    } finally {
      setRegOtpLoading(false);
    }
  };

  // 5. Create Account Submission
  const handleSignupSubmit = async () => {
    setLocalError(null);
    clearError();

    if (!signupForm.fullName.trim()) {
      setLocalError("Full Name is required.");
      return;
    }

    const cleanMobile = signupForm.mobile.replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length !== 10) {
      setLocalError("Valid 10-digit mobile number is required.");
      return;
    }

    if (!regOtpVerified || !regVerificationToken) {
      setLocalError("Please verify your mobile number with OTP before creating an account.");
      return;
    }

    if (!signupForm.password || signupForm.password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setLocalError("Password and Confirm Password do not match.");
      return;
    }

    if (!signupForm.state.trim()) {
      setLocalError("State is required. Please select your State.");
      return;
    }

    if (!signupForm.district.trim()) {
      setLocalError("District is required. Please select your District.");
      return;
    }

    if (!regConsentValid) {
      setLocalError("Please review and accept the mandatory Terms & Conditions and Privacy Policy to create your account.");
      return;
    }

    const payload: SignupPayload = {
      fullName: signupForm.fullName.trim(),
      mobile: cleanMobile,
      email: signupForm.email.trim() || undefined,
      password: signupForm.password,
      confirmPassword: signupForm.confirmPassword,
      state: signupForm.state.trim(),
      district: signupForm.district.trim(),
      referralCode: signupForm.referralCode.trim().toUpperCase() || undefined,
      verificationToken: regVerificationToken,
      acceptedPolicies: regAcceptedPolicies,
      termsAccepted: true,
    };

    const success = await authSignup(payload);
    if (success) {
      setSignupSuccess(true);
      setSignupForm({
        fullName: "",
        mobile: "",
        email: "",
        password: "",
        confirmPassword: "",
        state: "",
        district: "",
        referralCode: "",
      });
      setRegOtpVerified(false);
      setRegVerificationToken("");
      setRegOtp("");
      setRegOtpSent(false);
    }
  };

  // 6. Forgot Password: Step 1 - Send OTP via Mobile or Email
  const handleSendForgotOtp = async () => {
    if (forgotLoading) return;
    setLocalError(null);
    setForgotMessage(null);
    clearError();

    const cleanId = forgotIdentifier.trim();
    if (!cleanId) {
      setLocalError(
        forgotMethod === "MOBILE"
          ? "Please enter your registered 10-digit mobile number."
          : "Please enter your registered email address."
      );
      return;
    }

    if (forgotMethod === "MOBILE") {
      const digits = cleanId.replace(/\D/g, "");
      if (digits.length !== 10) {
        setLocalError("Please enter a valid 10-digit Indian mobile number.");
        return;
      }
    }

    setForgotLoading(true);
    try {
      const res = await authApi.forgotPasswordSendOtp({
        method: forgotMethod,
        identifier: cleanId,
      });

      setForgotStep("otp");
      setForgotOtp(""); // Never autofill OTP - user enters OTP from their email
      setForgotCooldown(res.data?.resendCooldownSeconds || 30);
      setForgotMessage(
        res.data?.message ||
          "A 6-digit verification code has been sent to your registered email. Please check your inbox or spam folder."
      );

    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err?.apiError?.userMessage ||
        "Unable to send OTP. Please try again.";
      setLocalError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  // 7. Forgot Password: Step 2 - Verify OTP & Receive Reset Token
  const handleVerifyForgotOtp = async () => {
    if (forgotLoading) return;
    setLocalError(null);
    clearError();

    const cleanOtp = forgotOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setLocalError("Please enter the 6-digit OTP.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authApi.forgotPasswordVerifyOtp({
        method: forgotMethod,
        identifier: forgotIdentifier.trim(),
        otp: cleanOtp,
      });

      if (res.data?.resetToken) {
        setForgotResetToken(res.data.resetToken);
        setForgotStep("new_password");
        setForgotMessage(null);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err?.apiError?.userMessage ||
        "Incorrect OTP. Please enter the valid 6-digit OTP.";
      setLocalError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  // 8. Forgot Password: Step 3 - Submit New Password with Token
  const handleResetPasswordSubmit = async () => {
    if (forgotLoading) return;
    setLocalError(null);
    clearError();

    if (!forgotResetToken) {
      setLocalError("Reset token missing or expired. Please request OTP again.");
      return;
    }

    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setLocalError("New password must be at least 6 characters.");
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setLocalError("New Password and Confirm Password do not match.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authApi.resetPasswordWithToken({
        resetToken: forgotResetToken,
        newPassword: forgotNewPassword,
        confirmPassword: forgotConfirmPassword,
      });

      setForgotMessage(
        res.data?.message || "Password reset successfully. Redirecting to login..."
      );
      setTimeout(() => {
        switchTab("login");
      }, 1500);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err?.apiError?.userMessage ||
        "Failed to reset password. Token may be expired.";
      setLocalError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl gap-0 max-h-[92vh] flex flex-col">
        {/* Swayam Admission Brand Header */}
        <div className="bg-[#4A7B5B] px-6 pt-6 pb-5 text-white shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <DialogTitle
              className="text-white"
              style={{ fontSize: "19px", fontWeight: 700 }}
            >
              {tab === "login" && "Welcome to Swayam Admission"}
              {tab === "signup" && "Create Student Account"}
              {tab === "forgot" &&
                (forgotStep === "new_password"
                  ? "Set New Password"
                  : "Reset Password via OTP")}
            </DialogTitle>
          </div>
          <p className="text-white/85" style={{ fontSize: "13px" }}>
            {tab === "login" && "Sign in to access your admissions dashboard"}
            {tab === "signup" &&
              (signupSuccess
                ? "Your account is ready!"
                : "Join Swayam Admission to apply and get expert counselling")}
            {tab === "forgot" &&
              (forgotStep === "input"
                ? "Select Mobile or Email to receive a verification OTP"
                : forgotStep === "otp"
                ? "Enter the verification OTP to proceed"
                : "Set a strong new password for Swayam Admission")}
          </p>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-4">
          {/* Error Display */}
          {displayError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium space-y-2">
              <p>{displayError}</p>
              {tab === "forgot" &&
                (displayError.toLowerCase().includes("not registered") ||
                  displayError.toLowerCase().includes("register") ||
                  displayError.toLowerCase().includes("create a new account")) && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const emailOrMobile = forgotIdentifier.trim();
                        switchTab("signup");
                        if (emailOrMobile) {
                          if (emailOrMobile.includes("@")) {
                            setSignupForm((prev) => ({ ...prev, email: emailOrMobile }));
                          } else {
                            setSignupForm((prev) => ({ ...prev, mobile: emailOrMobile.replace(/\D/g, "") }));
                          }
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4A7B5B] text-white rounded-lg text-xs font-semibold hover:bg-[#3d6b4d] transition-colors shadow-sm"
                    >
                      Create Account / Register Now →
                    </button>
                  </div>
                )}
            </div>
          )}

          {/* ===================== LOGIN TAB ===================== */}
          {tab === "login" && (
            <div className="space-y-4">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Email or Mobile Number
                  </label>
                  <input
                    type="text"
                    placeholder="student@example.com or 10-digit mobile"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B] focus:ring-2 focus:ring-[#4A7B5B]/10"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-gray-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchTab("forgot")}
                      className="text-xs text-[#4A7B5B] hover:underline font-semibold"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B] focus:ring-2 focus:ring-[#4A7B5B]/10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePasswordLogin}
                  disabled={authLoading}
                  className="w-full bg-[#4A7B5B] text-white py-3 rounded-xl hover:bg-[#3d6b4d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-semibold shadow-sm"
                >
                  {authLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>

              {/* Continue with Google */}
              <div className="relative flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 uppercase font-medium">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="w-full flex flex-col items-center justify-center">
                <div
                  ref={googleBtnContainerRef}
                  className={`w-full flex justify-center min-h-[44px] ${
                    isGsiLoaded ? "block" : "hidden"
                  }`}
                />
                {!isGsiLoaded && (
                  <button
                    type="button"
                    onClick={handleGoogleFallbackClick}
                    disabled={authLoading || isGoogleLoading}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60"
                  >
                    {isGoogleLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-[#4A7B5B]" />
                        <span>Connecting with Google...</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 18 18">
                          <path
                            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.659 14.035 17.64 11.727 17.64 9.2z"
                            fill="#4285F4"
                          />
                          <path
                            d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                            fill="#34A853"
                          />
                          <path
                            d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                            fill="#EA4335"
                          />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </button>
                )}
              </div>

              <p className="text-center text-xs text-gray-500 pt-1">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signup")}
                  className="text-[#4A7B5B] hover:underline font-semibold"
                >
                  Create Account free
                </button>
              </p>
            </div>
          )}

          {/* ===================== SIGNUP TAB ===================== */}
          {tab === "signup" && (
            <div className="space-y-3.5">
              {signupSuccess ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-[#E8F3EC] rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={32} className="text-[#4A7B5B]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#4A7B5B] mb-1">
                    Account Created Successfully!
                  </h3>
                  <p className="text-xs text-gray-600 mb-4 max-w-xs mx-auto">
                    Your account has been registered with verified mobile number. You can now explore colleges and apply.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSignupSuccess(false);
                      onLogin();
                    }}
                    className="w-full bg-[#4A7B5B] text-white py-3 rounded-xl hover:bg-[#3d6b4d] transition-colors font-semibold text-sm"
                  >
                    Continue to Dashboard
                  </button>
                </div>
              ) : (
                <>
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter student full name"
                      value={signupForm.fullName}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, fullName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B]"
                    />
                  </div>

                  {/* Mobile Number + Compulsory OTP Verification */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Mobile Number *{" "}
                      {regOtpVerified && (
                        <span className="text-emerald-700 font-semibold inline-flex items-center gap-1 text-[11px] ml-1">
                          <CheckCircle2 size={13} /> Verified
                        </span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 flex rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#4A7B5B] overflow-hidden">
                        <span className="flex items-center px-2.5 text-xs font-semibold text-gray-500 bg-gray-100 border-r border-gray-200">
                          +91
                        </span>
                        <input
                          type="tel"
                          maxLength={10}
                          disabled={regOtpVerified}
                          placeholder="10-digit mobile"
                          value={signupForm.mobile}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            setSignupForm({ ...signupForm, mobile: val });
                            if (regOtpVerified) {
                              setRegOtpVerified(false);
                              setRegVerificationToken("");
                            }
                          }}
                          className="w-full px-3 py-2 bg-transparent text-sm focus:outline-none disabled:text-gray-500"
                        />
                      </div>
                      {!regOtpVerified ? (
                        <button
                          type="button"
                          onClick={handleSendRegistrationOtp}
                          disabled={regOtpLoading || signupForm.mobile.length !== 10 || regResendCooldown > 0}
                          className="px-3.5 py-2 bg-[#4A7B5B] text-white text-xs font-semibold rounded-xl hover:bg-[#3d6b4d] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                        >
                          {regOtpLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : regResendCooldown > 0 ? (
                            `${regResendCooldown}s`
                          ) : regOtpSent ? (
                            "Resend"
                          ) : (
                            "Send OTP"
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setRegOtpVerified(false);
                            setRegVerificationToken("");
                            setRegOtpSent(false);
                          }}
                          className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 underline whitespace-nowrap"
                        >
                          Change
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline OTP Input when OTP is sent & not yet verified */}
                  {regOtpSent && !regOtpVerified && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs text-emerald-900">
                        <span>OTP sent to +91 {signupForm.mobile}</span>
                        {regResendCooldown > 0 ? (
                          <span className="text-gray-400">Resend in {regResendCooldown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendRegistrationOtp}
                            disabled={regOtpLoading}
                            className="text-[#4A7B5B] font-semibold hover:underline"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>


                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit OTP"
                          value={regOtp}
                          onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ""))}
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:border-[#4A7B5B]"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyRegistrationOtp}
                          disabled={regOtpLoading || regOtp.length !== 6}
                          className="px-4 py-2 bg-[#4A7B5B] text-white text-xs font-semibold rounded-xl hover:bg-[#3d6b4d] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                          {regOtpLoading ? <Loader2 size={13} className="animate-spin" /> : null}
                          Verify
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Email Address (Optional) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="student@example.com"
                      value={signupForm.email}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, email: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B]"
                    />
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPass ? "text" : "password"}
                          placeholder="Min 6 characters"
                          value={signupForm.password}
                          onChange={(e) =>
                            setSignupForm({ ...signupForm, password: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B] pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? "text" : "password"}
                          placeholder="Confirm password"
                          value={signupForm.confirmPassword}
                          onChange={(e) =>
                            setSignupForm({ ...signupForm, confirmPassword: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B] pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* State (Compulsory) & Dynamic District (Compulsory) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        State *
                      </label>
                      <select
                        value={signupForm.state}
                        onChange={(e) => {
                          const newState = e.target.value;
                          setSignupForm({
                            ...signupForm,
                            state: newState,
                            district: "", // Reset old district on state change (Requirement 1)
                          });
                        }}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B]"
                      >
                        <option value="">
                          {statesLoading ? "Loading States..." : "Select State *"}
                        </option>
                        {statesList.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        District *
                      </label>
                      <select
                        value={signupForm.district}
                        disabled={!signupForm.state || districtsLoading}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, district: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B] disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">
                          {!signupForm.state
                            ? "Select State First"
                            : districtsLoading
                            ? "Loading Districts..."
                            : "Select District *"}
                        </option>
                        {districtsList.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Referral Code (Optional) - Placeholder: E.G. SWY-JOHN-A1B2 (no FREE COUNSELLING) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Referral Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="E.G. SWY-JOHN-A1B2"
                      value={signupForm.referralCode}
                      onChange={(e) =>
                        setSignupForm({
                          ...signupForm,
                          referralCode: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:border-[#4A7B5B]"
                    />
                  </div>

                  {/* Mandatory Registration Consent Section */}
                  <div className="pt-1">
                    <ActionConsentSection
                      actionType="REGISTRATION"
                      onChange={(isValid, policies) => {
                        setRegConsentValid(isValid);
                        setRegAcceptedPolicies(policies);
                      }}
                    />
                  </div>

                  {/* Create Account Action */}
                  <button
                    type="button"
                    onClick={handleSignupSubmit}
                    disabled={authLoading || !regOtpVerified || !regConsentValid}
                    className="w-full bg-[#4A7B5B] text-white py-3 rounded-xl hover:bg-[#3d6b4d] transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-semibold shadow-sm"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-500 pt-1">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchTab("login")}
                      className="text-[#4A7B5B] hover:underline font-semibold"
                    >
                      Sign In
                    </button>
                  </p>
                </>
              )}
            </div>
          )}

          {/* ===================== FORGOT / RESET TAB ===================== */}
          {tab === "forgot" && (
            <div className="space-y-4">
              {forgotMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs text-center font-medium">
                  {forgotMessage}
                </div>
              )}

              {/* STEP 1: Choice of Mobile or Email */}
              {forgotStep === "input" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Reset Password Using:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotMethod("MOBILE");
                          setForgotIdentifier("");
                          setLocalError(null);
                        }}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                          forgotMethod === "MOBILE"
                            ? "border-[#4A7B5B] bg-[#E8F3EC]/50 text-[#4A7B5B]"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <Smartphone size={16} />
                        Mobile Number
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setForgotMethod("EMAIL");
                          setForgotIdentifier("");
                          setLocalError(null);
                        }}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                          forgotMethod === "EMAIL"
                            ? "border-[#4A7B5B] bg-[#E8F3EC]/50 text-[#4A7B5B]"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <Mail size={16} />
                        Email Address
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      {forgotMethod === "MOBILE"
                        ? "Registered Mobile Number"
                        : "Registered Email Address"}
                    </label>
                    {forgotMethod === "MOBILE" ? (
                      <div className="flex rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#4A7B5B] overflow-hidden">
                        <span className="flex items-center px-3 text-xs font-semibold text-gray-500 bg-gray-100 border-r border-gray-200">
                          +91
                        </span>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="10-digit mobile number"
                          value={forgotIdentifier}
                          onChange={(e) =>
                            setForgotIdentifier(e.target.value.replace(/\D/g, ""))
                          }
                          onKeyDown={(e) => e.key === "Enter" && handleSendForgotOtp()}
                          className="w-full px-3 py-2.5 bg-transparent text-sm focus:outline-none"
                        />
                      </div>
                    ) : (
                      <input
                        type="email"
                        placeholder="student@example.com"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendForgotOtp()}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B]"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSendForgotOtp}
                    disabled={forgotLoading || !forgotIdentifier.trim()}
                    className="w-full bg-[#4A7B5B] text-white py-3 rounded-xl hover:bg-[#3d6b4d] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm font-semibold shadow-sm"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Sending OTP...
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => switchTab("login")}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      ← Back to Login
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Verify OTP */}
              {forgotStep === "otp" && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                    <div>
                      <span>OTP sent via {forgotMethod === "MOBILE" ? "SMS to " : "Email to "}</span>
                      <span className="font-semibold">
                        {forgotMethod === "MOBILE"
                          ? `+91 ${forgotIdentifier}`
                          : forgotIdentifier}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForgotStep("input")}
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
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyForgotOtp()}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-lg tracking-widest font-mono font-bold focus:outline-none focus:border-[#4A7B5B]"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Valid for 5 mins</span>
                    {forgotCooldown > 0 ? (
                      <span className="text-gray-400">Resend in {forgotCooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendForgotOtp}
                        disabled={forgotLoading}
                        className="text-[#4A7B5B] font-semibold hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyForgotOtp}
                    disabled={forgotLoading || forgotOtp.length !== 6}
                    className="w-full bg-[#4A7B5B] text-white py-3 rounded-xl hover:bg-[#3d6b4d] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm font-semibold shadow-sm"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Verifying...
                      </>
                    ) : (
                      "Verify OTP & Set New Password"
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep("input")}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      ← Back
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Set New Password & Confirm Password (Only opens once OTP matches) */}
              {forgotStep === "new_password" && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
                    <span>OTP verified! Please create your new secure password.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        placeholder="Min 6 characters"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? "text" : "password"}
                        placeholder="Re-enter new password"
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetPasswordSubmit}
                    disabled={
                      forgotLoading ||
                      forgotNewPassword.length < 6 ||
                      forgotNewPassword !== forgotConfirmPassword
                    }
                    className="w-full bg-[#4A7B5B] text-white py-3 rounded-xl hover:bg-[#3d6b4d] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm font-semibold shadow-sm"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Updating Password...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => switchTab("login")}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      ← Back to Login
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
