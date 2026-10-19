import { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Phone,
  Mail,
  Lock,
  User,
  MapPin,
  Shield,
  ShieldAlert,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  Building2,
  Loader2,
  FileText,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { authApi, type LoginPayload, type AuthUser } from "../../api/auth.api";
import { staffOnboardingApi } from "../../api/staff-onboarding.api";
import { organizationApi } from "../../api/organization.api";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import saLogo from "../../assets/SA_logo-removebg-preview.png";

type Screen = "login" | "register" | "otp" | "forgot" | "reset" | "pending" | "first-login-change-password";
type LoginMode = "admin" | "staff";

interface LoginPageProps {
  onLogin: (data: LoginPayload) => Promise<boolean>;
  authError: string | null;
  authLoading: boolean;
  clearError: () => void;
  forcedChangePasswordUser?: AuthUser | null;
}

export default function LoginPage({
  onLogin,
  authError,
  authLoading,
  clearError,
  forcedChangePasswordUser,
}: LoginPageProps) {
  // Domain and portal detection
  const isHostAdmin = typeof window !== "undefined" && window.location.hostname.includes("admin.swayamadmission");
  const isHostErp = typeof window !== "undefined" && window.location.hostname.includes("erp.swayamadmission");
  const queryPortal = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("portal") : null;

  const defaultPortal: LoginMode = (isHostAdmin || queryPortal === "admin") ? "admin" : ((isHostErp || queryPortal === "erp") ? "staff" : "admin");

  const [screen, setScreen] = useState<Screen>(forcedChangePasswordUser ? "first-login-change-password" : "login");
  const [loginMode, setLoginMode] = useState<LoginMode>(defaultPortal);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [otpType, setOtpType] = useState<"mobile" | "email">("mobile");
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [localError, setLocalError] = useState<string | null>(null);

  // First Login Mandatory Setup States
  const [firstLoginUserId, setFirstLoginUserId] = useState<string>(forcedChangePasswordUser?.id || "");
  const [firstLoginMaskedEmail, setFirstLoginMaskedEmail] = useState<string>("");
  const [firstLoginOtpSent, setFirstLoginOtpSent] = useState(false);
  const [firstLoginOtpSending, setFirstLoginOtpSending] = useState(false);
  const [firstLoginOtpCooldown, setFirstLoginOtpCooldown] = useState(0);
  const [firstLoginOtpValue, setFirstLoginOtpValue] = useState("");
  const [firstLoginTempPassword, setFirstLoginTempPassword] = useState("");
  const [firstLoginNewPassword, setFirstLoginNewPassword] = useState("");
  const [firstLoginConfirmPassword, setFirstLoginConfirmPassword] = useState("");
  const [firstLoginSubmitting, setFirstLoginSubmitting] = useState(false);
  const [firstLoginSuccess, setFirstLoginSuccess] = useState(false);

  // Production-Ready Forgot Password Recovery States
  const [forgotStep, setForgotStep] = useState<"request" | "otp" | "password" | "protected_notice">("request");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMaskedDestination, setForgotMaskedDestination] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotResetToken, setForgotResetToken] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotShowNewPassword, setForgotShowNewPassword] = useState(false);
  const [forgotShowConfirmPassword, setForgotShowConfirmPassword] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Dynamic Allowed Roles
  const [allowedRoles, setAllowedRoles] = useState<
    { id: string; name: string; slug: string; description?: string; department?: string }[]
  >([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  // Authoritative Geography
  const [statesList, setStatesList] = useState<{ id: string; name: string; code: string; type?: string }[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [districtsList, setDistrictsList] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Registration Form
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    personalMobile: "",
    personalEmail: "",
    password: "",
    confirmPassword: "",
    requestedRoleSlug: "",
    requestedStateId: "",
    requestedDistrictId: "",
    city: "",
    referralCode: "",
    aadhaarNumber: "",
    panNumber: "",
    aadhaarFile: null as File | null,
    panFile: null as File | null,
    resumeFile: null as File | null,
  });

  // First Login Password Setup Modal
  const [mustChangePasswordModal, setMustChangePasswordModal] = useState(false);
  const [firstLoginPassForm, setFirstLoginPassForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passChangeLoading, setPassChangeLoading] = useState(false);
  const [passChangeSuccess, setPassChangeSuccess] = useState(false);

  const fetchAllowedRoles = async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const roles = await staffOnboardingApi.getAllowedRoles();
      setAllowedRoles(roles);
      if (roles.length > 0) {
        setRegisterForm((f) => ({
          ...f,
          requestedRoleSlug: f.requestedRoleSlug || roles[0].slug,
        }));
      }
    } catch (err: any) {
      console.error("Error loading allowed roles", err);
      setRolesError("Unable to load open roles. Click retry to load.");
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchStates = async () => {
    setStatesLoading(true);
    try {
      const states = await organizationApi.getStates();
      setStatesList(states);
    } catch (err) {
      console.error("Error loading states", err);
    } finally {
      setStatesLoading(false);
    }
  };

  useEffect(() => {
    fetchAllowedRoles();
    fetchStates();
  }, []);

  // Cooldown countdown for first-login OTP
  useEffect(() => {
    let timer: any;
    if (firstLoginOtpCooldown > 0) {
      timer = setTimeout(() => setFirstLoginOtpCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [firstLoginOtpCooldown]);

  // If forcedChangePasswordUser provided, initiate OTP
  useEffect(() => {
    if (forcedChangePasswordUser) {
      setFirstLoginUserId(forcedChangePasswordUser.id);
      setScreen("first-login-change-password");
      if (forcedChangePasswordUser.email) {
        const parts = forcedChangePasswordUser.email.split("@");
        setFirstLoginMaskedEmail(parts[0].slice(0, 2) + "***@" + parts[1]);
      }
      authApi.firstLoginSendOtp(forcedChangePasswordUser.id)
        .then((res) => {
          if (res.data?.maskedEmail) setFirstLoginMaskedEmail(res.data.maskedEmail);
          setFirstLoginOtpSent(true);
          setFirstLoginOtpCooldown(60);
        })
        .catch(() => {});
    }
  }, [forcedChangePasswordUser]);

  const handleStateChange = async (stateId: string) => {
    // Crucial: Reset district when state changes
    setRegisterForm((f) => ({ ...f, requestedStateId: stateId, requestedDistrictId: "" }));
    if (stateId) {
      setDistrictsLoading(true);
      try {
        const districts = await organizationApi.getDistricts(stateId);
        setDistrictsList(districts);
      } catch (err) {
        console.error("Error loading districts", err);
        setDistrictsList([]);
      } finally {
        setDistrictsLoading(false);
      }
    } else {
      setDistrictsList([]);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const next = [...otpValues];
    next[index] = value;
    setOtpValues(next);
    if (value && index < 5) {
      const el = document.getElementById(`otp-${index + 1}`);
      el?.focus();
    }
  };

  const handleSendFirstLoginOtp = async () => {
    if (!firstLoginUserId || firstLoginOtpSending || firstLoginOtpCooldown > 0) return;
    setFirstLoginOtpSending(true);
    setLocalError(null);
    try {
      const res = await authApi.firstLoginSendOtp(firstLoginUserId);
      if (res.data?.maskedEmail) {
        setFirstLoginMaskedEmail(res.data.maskedEmail);
      }
      setFirstLoginOtpSent(true);
      setFirstLoginOtpCooldown(60);
      toast.success("Verification code sent to your official email.");
    } catch (err: any) {
      setLocalError(err.response?.data?.message || "Failed to deliver OTP to official email.");
    } finally {
      setFirstLoginOtpSending(false);
    }
  };

  const handleFirstLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!firstLoginTempPassword) {
      setLocalError("Please enter your current temporary password.");
      return;
    }
    if (!firstLoginOtpValue.trim() || firstLoginOtpValue.trim().length !== 6) {
      setLocalError("Please enter the 6-digit OTP sent to your registered official email.");
      return;
    }
    if (!firstLoginNewPassword || firstLoginNewPassword.length < 6) {
      setLocalError("New permanent password must be at least 6 characters long.");
      return;
    }
    if (firstLoginNewPassword !== firstLoginConfirmPassword) {
      setLocalError("New password and confirm password do not match.");
      return;
    }

    setFirstLoginSubmitting(true);
    try {
      const res = await authApi.firstLoginChangePassword({
        userId: firstLoginUserId,
        currentPassword: firstLoginTempPassword,
        otp: firstLoginOtpValue.trim(),
        newPassword: firstLoginNewPassword,
        confirmPassword: firstLoginConfirmPassword,
      });

      if (res.data?.accessToken) {
        localStorage.setItem("swayam_token", res.data.accessToken);
        if (res.data.refreshToken) {
          localStorage.setItem("swayam_refresh_token", res.data.refreshToken);
        }
      }
      if (res.data?.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }

      setFirstLoginSuccess(true);
      toast.success("Permanent password created! Entering workspace...");
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setLocalError(err.response?.data?.message || "Verification or password change failed.");
    } finally {
      setFirstLoginSubmitting(false);
    }
  };

  // Cooldown timer for Forgot Password OTP resend
  useEffect(() => {
    let timer: any;
    if (forgotCooldown > 0) {
      timer = setTimeout(() => setForgotCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [forgotCooldown]);

  // Password Complexity Validation Helpers for Forgot Password
  const forgotHasMinLength = forgotNewPassword.length >= 8;
  const forgotHasUpper = /[A-Z]/.test(forgotNewPassword);
  const forgotHasLower = /[a-z]/.test(forgotNewPassword);
  const forgotHasNumber = /[0-9]/.test(forgotNewPassword);
  const forgotHasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(forgotNewPassword);
  const forgotPasswordsMatch = forgotNewPassword.length > 0 && forgotNewPassword === forgotConfirmPassword;
  const isForgotPassValid =
    forgotHasMinLength && forgotHasUpper && forgotHasLower && forgotHasNumber && forgotHasSpecial && forgotPasswordsMatch;

  // Step 1: Send Recovery OTP to Registered Personal Email
  const handleForgotSendOtp = async (isResend = false) => {
    const cleanInput = forgotEmail.trim();
    if (!cleanInput) {
      setForgotError("Please enter your Employee ID or registered personal email address.");
      return;
    }
    if (cleanInput.includes("@")) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanInput)) {
        setForgotError("Please enter a valid email address format.");
        return;
      }
    } else {
      if (cleanInput.length < 3) {
        setForgotError("Please enter a valid Employee ID.");
        return;
      }
    }

    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await authApi.forgotPasswordSendOtp({
        identifier: cleanInput,
        method: "EMAIL",
      });

      if (res.isProtected) {
        setForgotStep("protected_notice");
        setForgotMaskedDestination(res.maskedDestination || cleanInput);
        return;
      }

      setForgotMaskedDestination(res.maskedDestination || cleanInput);
      setForgotCooldown(60);
      if (!isResend) {
        setForgotStep("otp");
      }
      toast.success(res.message || "A 6-digit verification code has been dispatched to your registered personal email.");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to dispatch verification code. Please try again.";
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP & Receive Single-Use Reset Token
  const handleForgotVerifyOtp = async () => {
    const cleanOtp = forgotOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setForgotError("Please enter the complete 6-digit verification code.");
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await authApi.forgotPasswordVerifyOtp({
        identifier: forgotEmail.trim(),
        otp: cleanOtp,
        method: "EMAIL",
      });

      setForgotResetToken(res.resetToken);
      setForgotStep("password");
      toast.success("Identity verified successfully! Please set your new password.");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Invalid or expired verification code.";
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Set New Password with Token
  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (!isForgotPassValid) {
      setForgotError("Please ensure your new password satisfies all security requirements.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authApi.resetPasswordWithToken({
        resetToken: forgotResetToken,
        newPassword: forgotNewPassword,
        confirmPassword: forgotConfirmPassword,
      });

      setForgotSuccess(true);
      toast.success(res.message || "Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        setScreen("login");
        setForgotStep("request");
        setForgotEmail("");
        setForgotOtp("");
        setForgotResetToken("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
        setForgotSuccess(false);
        setForgotError(null);
      }, 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to update password. Please request a new recovery code.";
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRealLogin = async () => {
    if (authLoading) return;
    setLocalError(null);
    clearError();
    const cleanIdentifier = loginForm.identifier.trim();
    if (!cleanIdentifier || !loginForm.password.trim()) {
      setLocalError(
        loginMode === "admin"
          ? "Please enter your Employee ID (or Admin Email) and password."
          : "Please enter your Employee ID and password."
      );
      return;
    }

    const targetDomain = loginMode === "admin" ? "ADMIN" : "ERP";

    try {
      // Direct call to check mustChangePassword response
      const res = await authApi.login({
        email: cleanIdentifier,
        password: loginForm.password,
        domain: targetDomain,
      });

      if (res.data?.mustChangePassword) {
        // Enforce dedicated first-login screen with official email OTP
        const u = res.data.user;
        setFirstLoginUserId(u.id);
        setFirstLoginTempPassword(loginForm.password);
        if (u.email) {
          const parts = u.email.split("@");
          setFirstLoginMaskedEmail(parts[0].slice(0, 2) + "***@" + parts[1]);
        }
        setScreen("first-login-change-password");
        // Dispatch OTP to employee's official email
        authApi.firstLoginSendOtp(u.id)
          .then((otpRes) => {
            if (otpRes.data?.maskedEmail) setFirstLoginMaskedEmail(otpRes.data.maskedEmail);
            setFirstLoginOtpSent(true);
            setFirstLoginOtpCooldown(60);
          })
          .catch(() => {});
        return;
      }

      // Normal login proceeds to onLogin
      await onLogin({
        email: cleanIdentifier,
        password: loginForm.password,
        domain: targetDomain,
      });
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.message || "Invalid credentials.";
      setLocalError(serverMsg);
    }
  };

  const handleRegisterSubmit = async () => {
    setLocalError(null);
    if (
      !registerForm.fullName.trim() ||
      !registerForm.personalEmail.trim() ||
      !registerForm.personalMobile.trim() ||
      !registerForm.password.trim() ||
      !registerForm.requestedRoleSlug
    ) {
      setLocalError("Please fill in all required fields marked with *.");
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    setRegLoading(true);
    try {
      const res = await staffOnboardingApi.register({
        fullName: registerForm.fullName.trim(),
        personalEmail: registerForm.personalEmail.trim(),
        personalMobile: registerForm.personalMobile.trim(),
        password: registerForm.password,
        requestedRoleSlug: registerForm.requestedRoleSlug,
        requestedStateId: registerForm.requestedStateId || undefined,
        requestedDistrictId: registerForm.requestedDistrictId || undefined,
        city: registerForm.city.trim() || undefined,
        referralCode: registerForm.referralCode.trim() || undefined,
      });

      // Upload KYC Documents if provided
      if (res.user?.id) {
        const userId = res.user.id;
        if (registerForm.aadhaarNumber || registerForm.aadhaarFile) {
          await staffOnboardingApi.uploadKyc({
            userId,
            documentType: "AADHAAR",
            documentNumber: registerForm.aadhaarNumber || undefined,
            fileName: registerForm.aadhaarFile?.name || "aadhaar_card.pdf",
            fileUrl: "/uploads/kyc/sample_aadhaar.pdf",
          });
        }
        if (registerForm.panNumber || registerForm.panFile) {
          await staffOnboardingApi.uploadKyc({
            userId,
            documentType: "PAN",
            documentNumber: registerForm.panNumber || undefined,
            fileName: registerForm.panFile?.name || "pan_card.pdf",
            fileUrl: "/uploads/kyc/sample_pan.pdf",
          });
        }
      }

      setScreen("otp");
    } catch (err: any) {
      setLocalError(
        err?.response?.data?.message || "Registration failed. Please verify your details.",
      );
    } finally {
      setRegLoading(false);
    }
  };

  const handleFirstLoginPasswordSubmit = async () => {
    if (!firstLoginPassForm.newPassword || firstLoginPassForm.newPassword.length < 6) {
      setLocalError("New password must be at least 6 characters long.");
      return;
    }
    if (firstLoginPassForm.newPassword !== firstLoginPassForm.confirmNewPassword) {
      setLocalError("New passwords do not match.");
      return;
    }

    setPassChangeLoading(true);
    setLocalError(null);
    try {
      await staffOnboardingApi.changePasswordFirstLogin({
        currentPassword: firstLoginPassForm.currentPassword,
        newPassword: firstLoginPassForm.newPassword,
      });
      setPassChangeSuccess(true);
      setTimeout(() => {
        setMustChangePasswordModal(false);
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setLocalError(
        err?.response?.data?.message || "Failed to update permanent password.",
      );
    } finally {
      setPassChangeLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen flex" style={{ background: "#F8FAFC" }}>
      {/* Left panel - Brand */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-10 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #2D553D 0%, #3a6b4c 50%, #4A7B5B 100%)",
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-10"
            style={{ background: "#fff" }}
          />
          <div
            className="absolute bottom-20 -left-16 w-56 h-56 rounded-full opacity-10"
            style={{ background: "#F0AE1A" }}
          />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              <img
                src={saLogo}
                alt="Swayam Admission"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <div className="text-white font-semibold text-lg leading-tight">
                Swayam Admission
              </div>
              <div className="text-green-200 text-xs">Enterprise Post Identity</div>
            </div>
          </div>
          <h1 className="text-white text-3xl font-semibold leading-snug mb-3">
            Enterprise Admissions CRM & Post IAM
          </h1>
          <p className="text-green-200 text-sm leading-relaxed">
            "Continuous Organizational Posts, Secure KYC & Dynamic Scope."
          </p>
        </div>

        {/* Stats */}
        <div className="relative z-10 space-y-4">
          {[
            { label: "Active Enterprise Posts", value: "1,240+", icon: "🏢" },
            { label: "Affiliated Colleges", value: "4,500+", icon: "🏛️" },
            { label: "Secured KYC Admissions", value: "82,000+", icon: "🎓" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm"
            >
              <span className="text-xl">{stat.icon}</span>
              <div>
                <div className="text-white font-semibold">{stat.value}</div>
                <div className="text-green-200 text-xs">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10">
          <p className="text-green-200 text-xs text-center">
            Zero Shared Credentials • Post-Continuous Company Email Architecture
          </p>
        </div>
      </div>

      {/* Right panel - Forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[440px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-green-200">
              <img src={saLogo} alt="SA" className="w-full h-full object-contain" />
            </div>
            <div className="font-semibold text-[#4A7B5B]">Swayam Admission</div>
          </div>

          {/* === LOGIN SCREEN === */}
          {screen === "login" && (
            <div>
              {/* Dual Mode Tab Selector */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("admin");
                    setLocalError(null);
                    clearError();
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    loginMode === "admin"
                      ? "bg-white text-[#2D553D] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Protected Admin Portal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("staff");
                    setLocalError(null);
                    clearError();
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    loginMode === "staff"
                      ? "bg-white text-[#4A7B5B] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Employee ERP Portal
                </button>
              </div>

              <div className="mb-6">
                <h2 className="text-[#4A7B5B] text-2xl font-bold mb-1">
                  {loginMode === "admin" ? "Protected Admin Portal" : "Employee ERP Portal"}
                </h2>
                <div className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-gray-100 text-gray-700 mb-2">
                  {loginMode === "admin" ? "https://admin.swayamadmission.com" : "https://erp.swayamadmission.com"}
                </div>
                <p className="text-[#64748B] text-xs">
                  {loginMode === "admin"
                    ? "Restricted administrative environment for Super Admin and designated system administrators."
                    : "Official organizational workspace for faculty, counselors, recruitment, and operating personnel."}
                </p>
              </div>

              <div className="space-y-4">
                {displayError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{displayError}</span>
                  </div>
                )}
                <div>
                  <Label className="text-[#4A7B5B] text-sm mb-1.5 block font-semibold">
                    Employee ID
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <Input
                      placeholder=""
                      className="pl-10 h-11 border-[#E2E8F0] focus:border-[#4A7B5B] rounded-xl text-sm"
                      value={loginForm.identifier}
                      onChange={(e) =>
                        setLoginForm((f) => ({ ...f, identifier: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRealLogin();
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {loginMode === "admin"
                      ? "Authorized administrators may sign in using their registered administrator email or assigned Employee ID."
                      : "Normal employees must sign in using their assigned Employee ID."}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-[#4A7B5B] text-sm">Password</Label>
                    <button
                      onClick={() => setScreen("forgot")}
                      className="text-[#4A7B5B] text-xs hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      className="pl-10 pr-10 h-11 border-[#E2E8F0] focus:border-[#4A7B5B] rounded-xl"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((f) => ({ ...f, password: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRealLogin();
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberSession}
                    onChange={(e) => setRememberSession(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#4A7B5B]"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm text-[#64748B] cursor-pointer"
                  >
                    Remember active session
                  </Label>
                </div>

                <button
                  onClick={handleRealLogin}
                  disabled={authLoading}
                  className="w-full h-11 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  style={{ background: loginMode === "admin" ? "#2D553D" : "#4A7B5B" }}
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                    </>
                  ) : (
                    <>
                      {loginMode === "admin" ? "Sign In to Admin Portal" : "Sign In to Employee ERP"} <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {loginMode === "staff" && (
                <p className="text-center text-sm text-[#64748B] mt-6">
                  New candidate applying for counselor post?{" "}
                  <button
                    onClick={() => setScreen("register")}
                    className="text-[#4A7B5B] font-semibold hover:underline"
                  >
                    Register Candidate KYC
                  </button>
                </p>
              )}
            </div>
          )}

          {/* === REGISTER SCREEN (STRICTLY GATED ROLES + KYC) === */}
          {screen === "register" && (
            <div>
              <button
                onClick={() => setScreen("login")}
                className="flex items-center gap-1.5 text-[#64748B] text-sm mb-4 hover:text-[#4A7B5B] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to login
              </button>

              <div className="mb-5">
                <h2 className="text-[#4A7B5B] text-xl font-bold mb-1">
                  Staff Candidate Onboarding & KYC
                </h2>
                <p className="text-[#64748B] text-xs">
                  Apply for open admissions seats with confidential KYC verification.
                </p>
              </div>

              {displayError && (
                <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{displayError}</span>
                </div>
              )}

              <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                {/* Full Name & Mobile */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[#4A7B5B] text-xs mb-1 block">
                      Full Name *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                      <Input
                        placeholder="Ramesh Kumar"
                        className="pl-8 h-9 text-xs border-[#E2E8F0] rounded-lg"
                        value={registerForm.fullName}
                        onChange={(e) =>
                          setRegisterForm((f) => ({ ...f, fullName: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[#4A7B5B] text-xs mb-1 block">
                      Personal Mobile *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                      <Input
                        placeholder="9876543210"
                        className="pl-8 h-9 text-xs border-[#E2E8F0] rounded-lg"
                        value={registerForm.personalMobile}
                        onChange={(e) =>
                          setRegisterForm((f) => ({
                            ...f,
                            personalMobile: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Personal Email */}
                <div>
                  <Label className="text-[#4A7B5B] text-xs mb-1 block">
                    Personal Email Address *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                    <Input
                      placeholder="ramesh.personal@gmail.com"
                      className="pl-8 h-9 text-xs border-[#E2E8F0] rounded-lg"
                      value={registerForm.personalEmail}
                      onChange={(e) =>
                        setRegisterForm((f) => ({
                          ...f,
                          personalEmail: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <p className="text-[10px] text-[#64748B] mt-0.5">
                    Your continuous corporate company email (e.g. senior.madhubani@swayamadmission.com) will be provisioned upon administrative approval.
                  </p>
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[#4A7B5B] text-xs mb-1 block">
                      Password *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="pl-8 h-9 text-xs border-[#E2E8F0] rounded-lg"
                        value={registerForm.password}
                        onChange={(e) =>
                          setRegisterForm((f) => ({ ...f, password: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[#4A7B5B] text-xs mb-1 block">
                      Confirm *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="pl-8 h-9 text-xs border-[#E2E8F0] rounded-lg"
                        value={registerForm.confirmPassword}
                        onChange={(e) =>
                          setRegisterForm((f) => ({
                            ...f,
                            confirmPassword: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Dynamic Role Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[#4A7B5B] text-xs font-medium">
                      Applying Role *
                    </Label>
                    {rolesError && (
                      <button
                        type="button"
                        onClick={fetchAllowedRoles}
                        className="text-[10px] text-rose-600 font-bold hover:underline"
                      >
                        Retry Loading Roles
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] z-10" />
                    <select
                      disabled={rolesLoading || allowedRoles.length === 0}
                      className="w-full h-9 pl-8 pr-4 text-xs border border-[#E2E8F0] rounded-lg bg-white text-[#4A7B5B] focus:outline-none focus:border-[#4A7B5B] disabled:bg-slate-50 disabled:text-slate-400"
                      value={registerForm.requestedRoleSlug}
                      onChange={(e) =>
                        setRegisterForm((f) => ({
                          ...f,
                          requestedRoleSlug: e.target.value,
                        }))
                      }
                    >
                      {rolesLoading ? (
                        <option value="">Loading available roles...</option>
                      ) : allowedRoles.length === 0 ? (
                        <option value="">No roles open for self-registration</option>
                      ) : (
                        allowedRoles.map((r) => (
                          <option key={r.id} value={r.slug}>
                            {r.name} ({r.department || "Admissions"})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  {rolesError && (
                    <p className="text-[10px] text-rose-600 mt-1">{rolesError}</p>
                  )}
                </div>

                {/* State & District Dropdowns */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[#4A7B5B] text-xs mb-1 block font-medium">
                      State / Territory *
                    </Label>
                    <select
                      disabled={statesLoading}
                      className="w-full h-9 px-2 text-xs border border-[#E2E8F0] rounded-lg bg-white focus:outline-none focus:border-[#4A7B5B] disabled:bg-slate-50"
                      value={registerForm.requestedStateId}
                      onChange={(e) => handleStateChange(e.target.value)}
                    >
                      <option value="">{statesLoading ? "Loading States..." : "Select State / UT..."}</option>
                      {statesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[#4A7B5B] text-xs mb-1 block font-medium">
                      District Territory
                    </Label>
                    <select
                      disabled={!registerForm.requestedStateId || districtsLoading}
                      className="w-full h-9 px-2 text-xs border border-[#E2E8F0] rounded-lg bg-white focus:outline-none focus:border-[#4A7B5B] disabled:bg-slate-50 disabled:text-slate-400"
                      value={registerForm.requestedDistrictId}
                      onChange={(e) =>
                        setRegisterForm((f) => ({
                          ...f,
                          requestedDistrictId: e.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {!registerForm.requestedStateId
                          ? "Choose State First"
                          : districtsLoading
                          ? "Loading Districts..."
                          : districtsList.length === 0
                          ? "State-wide (No districts)"
                          : "Select District (Optional)..."}
                      </option>
                      {districtsList.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* KYC Aadhaar & PAN Card */}
                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2D553D]">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Confidential KYC Verification</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-[#4A7B5B] mb-0.5 block">
                        Aadhaar Number
                      </Label>
                      <Input
                        placeholder="12-digit Aadhaar"
                        maxLength={12}
                        className="h-8 text-xs border-[#CBD5E1] rounded-md"
                        value={registerForm.aadhaarNumber}
                        onChange={(e) =>
                          setRegisterForm((f) => ({
                            ...f,
                            aadhaarNumber: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-[#4A7B5B] mb-0.5 block">
                        PAN Number
                      </Label>
                      <Input
                        placeholder="10-digit PAN"
                        maxLength={10}
                        className="h-8 text-xs border-[#CBD5E1] rounded-md uppercase"
                        value={registerForm.panNumber}
                        onChange={(e) =>
                          setRegisterForm((f) => ({
                            ...f,
                            panNumber: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRegisterSubmit}
                disabled={regLoading}
                className="w-full h-10 rounded-xl text-white font-medium flex items-center justify-center gap-2 mt-4 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "#4A7B5B" }}
              >
                {regLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Registering...
                  </>
                ) : (
                  <>
                    Submit KYC Registration <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* === OTP SCREEN === */}
          {screen === "otp" && (
            <div className="text-center">
              <button
                onClick={() => setScreen("login")}
                className="flex items-center gap-1.5 text-[#64748B] text-sm mb-6 hover:text-[#4A7B5B] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: "#E8F3EC" }}
              >
                <Phone className="w-7 h-7" style={{ color: "#4A7B5B" }} />
              </div>

              <h2 className="text-[#4A7B5B] text-xl font-bold mb-2">
                Verify OTP
              </h2>
              <p className="text-[#64748B] text-sm mb-1">
                Enter test verification code (e.g. 123456)
              </p>

              <div className="flex justify-center gap-2.5 my-6">
                {otpValues.map((val, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    className="w-11 h-12 border-2 border-[#E2E8F0] rounded-xl text-center text-lg font-semibold text-[#4A7B5B] focus:outline-none focus:border-[#4A7B5B]"
                  />
                ))}
              </div>

              <button
                onClick={() => setScreen("pending")}
                className="w-full h-11 rounded-xl text-white font-medium flex items-center justify-center gap-2 mb-4 hover:opacity-90"
                style={{ background: "#4A7B5B" }}
              >
                Verify & Submit for Approval <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* === PENDING SCREEN === */}
          {screen === "pending" && (
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: "#FEF3C7" }}
              >
                <CheckCircle2 className="w-9 h-9" style={{ color: "#F0AE1A" }} />
              </div>
              <h2 className="text-[#4A7B5B] text-xl font-bold mb-2">
                KYC Registration Submitted!
              </h2>
              <p className="text-[#64748B] text-sm mb-6 leading-relaxed">
                Your staff onboarding request and confidential KYC documents have been submitted to IAM Administration for verification and position assignment.
              </p>

              <div
                className="rounded-xl p-4 mb-6 text-left"
                style={{ background: "#E8F3EC" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4" style={{ color: "#4A7B5B" }} />
                  <span className="text-sm font-medium" style={{ color: "#4A7B5B" }}>
                    Onboarding Verification Steps
                  </span>
                </div>
                {[
                  { step: "OTP Verified", done: true },
                  { step: "Confidential KYC Documents Submitted", done: true },
                  { step: "Administrative IAM & KYC Review", done: false },
                  { step: "Organizational Post & Company Email Provisioning", done: false },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-2.5 mb-2">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        item.done ? "" : "border-2 border-[#CBD5E1]"
                      }`}
                      style={item.done ? { background: "#4A7B5B" } : {}}
                    >
                      {item.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span
                      className="text-xs"
                      style={{ color: item.done ? "#4A7B5B" : "#94A3B8" }}
                    >
                      {item.step}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setScreen("login")}
                className="w-full h-11 rounded-xl border border-[#E2E8F0] text-[#4A7B5B] font-medium hover:bg-[#F8FAFC]"
              >
                Return to Login
              </button>
            </div>
          )}

          {/* === PRODUCTION-READY EMPLOYEE FORGOT PASSWORD & RECOVERY FLOW === */}
          {screen === "forgot" && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setScreen("login");
                  setForgotStep("request");
                  setForgotError(null);
                }}
                className="flex items-center gap-1.5 text-[#64748B] text-sm mb-5 hover:text-[#4A7B5B] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to login
              </button>

              {/* Inline Error Banner */}
              {forgotError && (
                <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{forgotError}</span>
                </div>
              )}

              {/* STATE: Success Notification */}
              {forgotSuccess ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-center space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto text-[#4A7B5B]">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-gray-900">Password Reset Complete!</h3>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Your credentials have been securely updated and all previous sessions revoked. Returning you to the login screen...
                    </p>
                  </div>
                </div>
              ) : forgotStep === "protected_notice" ? (
                /* STATE: Protected Account Notice (Super Admin / IAM Admin / Protected Roles) */
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-xs">
                    <ShieldAlert className="w-6 h-6" />
                  </div>

                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                      PROTECTED SYSTEM ROLE
                    </span>
                    <h2 className="text-[#4A7B5B] text-xl font-bold mt-1.5 mb-1">
                      Administrator-Controlled Recovery Required
                    </h2>
                    <p className="text-[#64748B] text-xs leading-relaxed">
                      Self-service password recovery is strictly disabled for Super Admin, IAM Administrator, and organizational position accounts under Swayam corporate security policy.
                    </p>
                  </div>

                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-950 space-y-2">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-900">
                      <Shield className="w-4 h-4 text-amber-700" />
                      <span>Authorized Recovery Protocol</span>
                    </div>
                    <p className="leading-relaxed text-[11px] text-amber-900">
                      To initiate a secure password reset for this account, please contact an authorized IAM Administrator. The administrator can dispatch a cryptographically verified, single-use recovery link to your registered official address.
                    </p>
                    {forgotMaskedDestination && (
                      <div className="pt-2 border-t border-amber-200/80 flex justify-between text-[11px]">
                        <span className="text-amber-800">Target Account:</span>
                        <span className="font-mono font-semibold text-amber-950">{forgotMaskedDestination}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScreen("login");
                        setForgotStep("request");
                        setForgotError(null);
                      }}
                      className="w-full h-11 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 shadow-xs"
                      style={{ background: "#4A7B5B" }}
                    >
                      Return to Secure Login <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-[11px] text-center text-gray-400">
                      Need urgent assistance? Official IAM Helpdesk:{" "}
                      <a href="mailto:swayamadmissions@gmail.com" className="text-[#4A7B5B] underline font-medium">
                        swayamadmissions@gmail.com
                      </a>
                    </p>
                  </div>
                </div>
              ) : forgotStep === "request" ? (
                /* STEP 1: Request Recovery via Registered Official Email */
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#4A7B5B] flex items-center justify-center shadow-xs">
                    <KeyRound className="w-6 h-6" />
                  </div>

                  <div>
                    <h2 className="text-[#4A7B5B] text-xl font-bold mb-1">
                      Account Recovery
                    </h2>
                    <p className="text-[#64748B] text-xs">
                      Enter your Employee ID or registered personal email address to receive a secure six-digit identity verification code.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="recovery-identifier" className="text-[#4A7B5B] text-sm mb-1.5 block font-semibold">
                        Employee ID or Registered Personal Email <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                        <Input
                          id="recovery-identifier"
                          type="text"
                          required
                          placeholder=""
                          className="pl-10 h-11 border-[#E2E8F0] focus:border-[#4A7B5B] rounded-xl text-sm"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleForgotSendOtp(false);
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Recovery verification codes are delivered strictly to your registered personal email address.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleForgotSendOtp(false)}
                      disabled={forgotLoading}
                      className="w-full h-11 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition shadow-xs disabled:opacity-60"
                      style={{ background: "#4A7B5B" }}
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Dispatching Security Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Verification Code</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : forgotStep === "otp" ? (
                /* STEP 2: Verify 6-digit OTP */
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#4A7B5B] flex items-center justify-center shadow-xs">
                    <Mail className="w-6 h-6" />
                  </div>

                  <div>
                    <h2 className="text-[#4A7B5B] text-xl font-bold mb-1">
                      Verify Your Identity
                    </h2>
                    <p className="text-[#64748B] text-xs leading-relaxed">
                      We dispatched a 6-digit security code to{" "}
                      <strong className="text-gray-800 font-mono">{forgotMaskedDestination}</strong>.
                      The code expires strictly in 10 minutes.
                    </p>
                  </div>

                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-[11px] text-gray-600">
                    <span>Single-use OTP code</span>
                    <span className="font-semibold text-amber-700">Max 5 attempts</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-[#4A7B5B] text-sm mb-1.5 block font-semibold">
                        Enter 6-Digit Code <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        maxLength={6}
                        autoFocus
                        placeholder="••••••"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && forgotOtp.trim().length === 6) {
                            handleForgotVerifyOtp();
                          }
                        }}
                        className="h-12 text-center font-mono text-xl tracking-[0.4em] border-[#E2E8F0] focus:border-[#4A7B5B] rounded-xl"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleForgotVerifyOtp}
                      disabled={forgotLoading || forgotOtp.trim().length !== 6}
                      className="w-full h-11 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition shadow-xs disabled:opacity-50"
                      style={{ background: "#4A7B5B" }}
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Identity...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify Code & Proceed</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep("request");
                          setForgotOtp("");
                          setForgotError(null);
                        }}
                        className="text-gray-500 hover:text-gray-800 underline transition"
                      >
                        Change Email Address
                      </button>

                      <button
                        type="button"
                        onClick={() => handleForgotSendOtp(true)}
                        disabled={forgotLoading || forgotCooldown > 0}
                        className="font-semibold text-[#4A7B5B] hover:underline disabled:opacity-50 disabled:no-underline transition"
                      >
                        {forgotCooldown > 0 ? `Resend Code (${forgotCooldown}s)` : "Resend Code"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* STEP 3: Set New Password & Confirm */
                <form onSubmit={handleForgotResetPassword} className="space-y-5 animate-in fade-in duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#4A7B5B] flex items-center justify-center shadow-xs">
                    <Lock className="w-6 h-6" />
                  </div>

                  <div>
                    <h2 className="text-[#4A7B5B] text-xl font-bold mb-1">
                      Set New Password
                    </h2>
                    <p className="text-[#64748B] text-xs">
                      Establish your confidential password. All prior sessions will be revoked across all devices.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <Label className="text-[#4A7B5B] text-xs font-semibold mb-1 block">
                        New Password <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type={forgotShowNewPassword ? "text" : "password"}
                          required
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="h-10 text-sm border-gray-200 rounded-xl pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => setForgotShowNewPassword(!forgotShowNewPassword)}
                        >
                          {forgotShowNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[#4A7B5B] text-xs font-semibold mb-1 block">
                        Confirm New Password <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type={forgotShowConfirmPassword ? "text" : "password"}
                          required
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="h-10 text-sm border-gray-200 rounded-xl pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => setForgotShowConfirmPassword(!forgotShowConfirmPassword)}
                        >
                          {forgotShowConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Security Checklist */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 text-[11px]">
                      <div className="font-semibold text-gray-700 uppercase tracking-wider text-[10px]">
                        Password Requirements
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className={`flex items-center gap-1 ${forgotHasMinLength ? "text-emerald-700 font-medium" : "text-gray-400"}`}>
                          <CheckCircle2 className={`w-3.5 h-3.5 ${forgotHasMinLength ? "text-emerald-600" : "text-gray-300"}`} />
                          <span>At least 8 chars</span>
                        </div>
                        <div className={`flex items-center gap-1 ${forgotHasUpper ? "text-emerald-700 font-medium" : "text-gray-400"}`}>
                          <CheckCircle2 className={`w-3.5 h-3.5 ${forgotHasUpper ? "text-emerald-600" : "text-gray-300"}`} />
                          <span>1 Uppercase (A-Z)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${forgotHasLower ? "text-emerald-700 font-medium" : "text-gray-400"}`}>
                          <CheckCircle2 className={`w-3.5 h-3.5 ${forgotHasLower ? "text-emerald-600" : "text-gray-300"}`} />
                          <span>1 Lowercase (a-z)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${forgotHasNumber ? "text-emerald-700 font-medium" : "text-gray-400"}`}>
                          <CheckCircle2 className={`w-3.5 h-3.5 ${forgotHasNumber ? "text-emerald-600" : "text-gray-300"}`} />
                          <span>1 Numeric digit</span>
                        </div>
                        <div className={`flex items-center gap-1 ${forgotHasSpecial ? "text-emerald-700 font-medium" : "text-gray-400"}`}>
                          <CheckCircle2 className={`w-3.5 h-3.5 ${forgotHasSpecial ? "text-emerald-600" : "text-gray-300"}`} />
                          <span>1 Special symbol</span>
                        </div>
                        <div className={`flex items-center gap-1 ${forgotPasswordsMatch ? "text-emerald-700 font-medium" : "text-gray-400"}`}>
                          <CheckCircle2 className={`w-3.5 h-3.5 ${forgotPasswordsMatch ? "text-emerald-600" : "text-gray-300"}`} />
                          <span>Passwords match</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading || !isForgotPassValid}
                      className="w-full h-11 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition shadow-xs disabled:opacity-50"
                      style={{ background: "#4A7B5B" }}
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <span>Update Password & Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* === FIRST LOGIN MANDATORY SECURITY SETUP SCREEN === */}
          {screen === "first-login-change-password" && (
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#4A7B5B] flex items-center justify-center mb-4 shadow-sm">
                <KeyRound className="w-6 h-6" />
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-[#4A7B5B] text-2xl font-bold">
                    Security Setup Required
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    FIRST LOGIN
                  </span>
                </div>
                <p className="text-[#64748B] text-xs leading-relaxed">
                  You are logging in with a temporary joining password. To secure your corporate account, verify your official email via OTP and establish your permanent password.
                </p>
              </div>

              {localError && (
                <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{localError}</span>
                </div>
              )}

              {firstLoginSuccess ? (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="font-bold text-sm">Permanent Password Established!</div>
                  <p className="text-xs text-emerald-700">
                    Your credentials have been updated and confirmation email sent. Redirecting to your workspace...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleFirstLoginSubmit} className="space-y-4">
                  {/* Masked Email & OTP Action */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Registered Official Email:</span>
                      <span className="font-mono font-semibold text-gray-800">{firstLoginMaskedEmail || "Official Inbox"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit OTP"
                          value={firstLoginOtpValue}
                          onChange={(e) => setFirstLoginOtpValue(e.target.value.replace(/\D/g, ""))}
                          className="h-10 text-sm font-mono tracking-widest text-center border-gray-200 rounded-xl"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendFirstLoginOtp}
                        disabled={firstLoginOtpSending || firstLoginOtpCooldown > 0}
                        className="px-3.5 h-10 rounded-xl text-xs font-semibold border border-gray-200 hover:border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition shrink-0 disabled:opacity-50"
                      >
                        {firstLoginOtpSending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                        ) : firstLoginOtpCooldown > 0 ? (
                          `Resend in ${firstLoginOtpCooldown}s`
                        ) : firstLoginOtpSent ? (
                          "Resend OTP"
                        ) : (
                          "Send OTP"
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-[#4A7B5B] mb-1 block">
                      Current Temporary Password *
                    </Label>
                    <Input
                      type="password"
                      required
                      value={firstLoginTempPassword}
                      onChange={(e) => setFirstLoginTempPassword(e.target.value)}
                      placeholder="Enter the password received in your email"
                      className="h-10 text-sm border-gray-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-[#4A7B5B] mb-1 block">
                      New Permanent Password * (min 6 characters)
                    </Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={firstLoginNewPassword}
                        onChange={(e) => setFirstLoginNewPassword(e.target.value)}
                        placeholder="Create strong permanent password"
                        className="h-10 text-sm border-gray-200 rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-[#4A7B5B] mb-1 block">
                      Confirm Permanent Password *
                    </Label>
                    <Input
                      type="password"
                      required
                      value={firstLoginConfirmPassword}
                      onChange={(e) => setFirstLoginConfirmPassword(e.target.value)}
                      placeholder="Re-enter new permanent password"
                      className="h-10 text-sm border-gray-200 rounded-xl"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={firstLoginSubmitting}
                    className="w-full h-11 rounded-xl text-white font-medium flex items-center justify-center gap-2 shadow-sm transition hover:shadow disabled:opacity-60"
                    style={{ background: "#4A7B5B" }}
                  >
                    {firstLoginSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying OTP & Updating...
                      </>
                    ) : (
                      <>
                        Verify OTP & Set Permanent Password <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScreen("login");
                        setLocalError(null);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-800 transition"
                    >
                      Cancel & Return to Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
