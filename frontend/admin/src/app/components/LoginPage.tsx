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
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  Building2,
  Loader2,
  FileText,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import type { LoginPayload } from "../../api/auth.api";
import { staffOnboardingApi } from "../../api/staff-onboarding.api";
import { organizationApi } from "../../api/organization.api";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import saLogo from "../../assets/SA_logo-removebg-preview.png";

type Screen = "login" | "register" | "otp" | "forgot" | "reset" | "pending";
type LoginMode = "admin" | "staff";

interface LoginPageProps {
  onLogin: (data: LoginPayload) => Promise<boolean>;
  authError: string | null;
  authLoading: boolean;
  clearError: () => void;
}

export default function LoginPage({
  onLogin,
  authError,
  authLoading,
  clearError,
}: LoginPageProps) {
  const [screen, setScreen] = useState<Screen>("login");
  const [loginMode, setLoginMode] = useState<LoginMode>("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [otpType, setOtpType] = useState<"mobile" | "email">("mobile");
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [localError, setLocalError] = useState<string | null>(null);

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

  const handleRealLogin = async () => {
    if (authLoading) return;
    setLocalError(null);
    clearError();
    if (!loginForm.identifier.trim() || !loginForm.password.trim()) {
      setLocalError("Please enter your company email/mobile and password.");
      return;
    }
    const success = await onLogin({
      email: loginForm.identifier.trim(),
      password: loginForm.password,
    });

    // Check if current user has mustChangePassword flag
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.mustChangePassword) {
          setFirstLoginPassForm((f) => ({
            ...f,
            currentPassword: loginForm.password,
          }));
          setMustChangePasswordModal(true);
        }
      } catch {}
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
            <div className="font-semibold text-[#0F172A]">Swayam Admission</div>
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
                  Admin & System Login
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
                  Enterprise Staff Login
                </button>
              </div>

              <div className="mb-6">
                <h2 className="text-[#0F172A] text-2xl font-bold mb-1">
                  {loginMode === "admin" ? "Admin & System Portal" : "Enterprise Staff Portal"}
                </h2>
                <p className="text-[#64748B] text-xs">
                  {loginMode === "admin"
                    ? "Sign in with your Super Admin, Director, or IAM Administrator credentials."
                    : "Sign in using your continuous Company Post Email or personal staff credentials."}
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
                  <Label className="text-[#0F172A] text-sm mb-1.5 block">
                    {loginMode === "admin" ? "Admin Email or Username" : "Company Email, Personal Email or Mobile"}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <Input
                      placeholder={
                        loginMode === "admin"
                          ? "admin@swayamadmission.in"
                          : "senior.madhubani@swayamadmission.com"
                      }
                      className="pl-10 h-11 border-[#E2E8F0] focus:border-[#4A7B5B] rounded-xl"
                      value={loginForm.identifier}
                      onChange={(e) =>
                        setLoginForm((f) => ({ ...f, identifier: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-[#0F172A] text-sm">Password</Label>
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
                      {loginMode === "admin" ? "Sign In as Administrator" : "Sign In to Position"} <ArrowRight className="w-4 h-4" />
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
                className="flex items-center gap-1.5 text-[#64748B] text-sm mb-4 hover:text-[#0F172A] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to login
              </button>

              <div className="mb-5">
                <h2 className="text-[#0F172A] text-xl font-bold mb-1">
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
                    <Label className="text-[#0F172A] text-xs mb-1 block">
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
                    <Label className="text-[#0F172A] text-xs mb-1 block">
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
                  <Label className="text-[#0F172A] text-xs mb-1 block">
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
                    <Label className="text-[#0F172A] text-xs mb-1 block">
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
                    <Label className="text-[#0F172A] text-xs mb-1 block">
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
                    <Label className="text-[#0F172A] text-xs font-medium">
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
                      className="w-full h-9 pl-8 pr-4 text-xs border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] focus:outline-none focus:border-[#4A7B5B] disabled:bg-slate-50 disabled:text-slate-400"
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
                    <Label className="text-[#0F172A] text-xs mb-1 block font-medium">
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
                    <Label className="text-[#0F172A] text-xs mb-1 block font-medium">
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
                      <Label className="text-[11px] text-[#0F172A] mb-0.5 block">
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
                      <Label className="text-[11px] text-[#0F172A] mb-0.5 block">
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
                className="flex items-center gap-1.5 text-[#64748B] text-sm mb-6 hover:text-[#0F172A] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: "#E8F3EC" }}
              >
                <Phone className="w-7 h-7" style={{ color: "#4A7B5B" }} />
              </div>

              <h2 className="text-[#0F172A] text-xl font-bold mb-2">
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
                    className="w-11 h-12 border-2 border-[#E2E8F0] rounded-xl text-center text-lg font-semibold text-[#0F172A] focus:outline-none focus:border-[#4A7B5B]"
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
              <h2 className="text-[#0F172A] text-xl font-bold mb-2">
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
                      style={{ color: item.done ? "#0F172A" : "#94A3B8" }}
                    >
                      {item.step}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setScreen("login")}
                className="w-full h-11 rounded-xl border border-[#E2E8F0] text-[#0F172A] font-medium hover:bg-[#F8FAFC]"
              >
                Return to Login
              </button>
            </div>
          )}

          {/* === FORGOT PASSWORD (POLICY GATED) === */}
          {screen === "forgot" && (
            <div>
              <button
                onClick={() => setScreen("login")}
                className="flex items-center gap-1.5 text-[#64748B] text-sm mb-6 hover:text-[#0F172A]"
              >
                <ChevronLeft className="w-4 h-4" /> Back to login
              </button>
              <div className="mb-6">
                <h2 className="text-[#0F172A] text-xl font-bold mb-1">
                  Password Recovery
                </h2>
                <p className="text-[#64748B] text-xs">
                  Self-service recovery is available for Counselor personal logins. Organizational Position Accounts require IAM Administrator reset.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs mb-4">
                <strong>Enterprise Security Policy:</strong> Company email position accounts (e.g. senior.*@swayamadmission.com) have self-service reset disabled by policy. Please contact your IAM Admin.
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-[#0F172A] text-sm mb-1.5 block">
                    Personal Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <Input
                      placeholder="counselor.personal@gmail.com"
                      className="pl-10 h-11 border-[#E2E8F0] rounded-xl"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setScreen("otp")}
                  className="w-full h-11 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:opacity-90"
                  style={{ background: "#4A7B5B" }}
                >
                  Send Recovery Link <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === FIRST LOGIN PERMANENT PASSWORD MODAL === */}
      {mustChangePasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-100">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-center text-[#0F172A] mb-1">
              Establish Your Permanent Password
            </h3>
            <p className="text-xs text-center text-[#64748B] mb-6">
              You are logging in with a temporary password. To secure your corporate post, please set your private permanent password now.
            </p>

            {localError && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                {localError}
              </div>
            )}

            {passChangeSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm text-center font-medium">
                ✅ Permanent password established! Redirecting to workspace...
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-[#0F172A] mb-1 block">
                    Current Temporary Password
                  </Label>
                  <Input
                    type="password"
                    value={firstLoginPassForm.currentPassword}
                    onChange={(e) =>
                      setFirstLoginPassForm((f) => ({
                        ...f,
                        currentPassword: e.target.value,
                      }))
                    }
                    className="h-10 text-sm border-[#CBD5E1]"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#0F172A] mb-1 block">
                    New Private Password (min 6 characters)
                  </Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={firstLoginPassForm.newPassword}
                      onChange={(e) =>
                        setFirstLoginPassForm((f) => ({
                          ...f,
                          newPassword: e.target.value,
                        }))
                      }
                      className="h-10 text-sm border-[#CBD5E1] pr-10"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#0F172A] mb-1 block">
                    Confirm New Password
                  </Label>
                  <Input
                    type="password"
                    value={firstLoginPassForm.confirmNewPassword}
                    onChange={(e) =>
                      setFirstLoginPassForm((f) => ({
                        ...f,
                        confirmNewPassword: e.target.value,
                      }))
                    }
                    className="h-10 text-sm border-[#CBD5E1]"
                    placeholder="Confirm new password"
                  />
                </div>

                <button
                  onClick={handleFirstLoginPasswordSubmit}
                  disabled={passChangeLoading}
                  className="w-full h-11 rounded-xl text-white font-medium flex items-center justify-center gap-2 mt-2 bg-[#4A7B5B] hover:opacity-90 disabled:opacity-50"
                >
                  {passChangeLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save & Continue to Dashboard"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
