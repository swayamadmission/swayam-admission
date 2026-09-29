import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Eye, EyeOff, Phone, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { authApi, type LoginPayload, type SignupPayload } from "../../api/auth.api";

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

const STATES = ["Bihar","Uttar Pradesh","Delhi NCR","Haryana","Punjab","Rajasthan","Madhya Pradesh","Maharashtra","Gujarat","West Bengal","Jharkhand","Uttarakhand"];
const COURSES = ["B.Tech","MBA","BCA","MCA","BBA","Nursing","Polytechnic","Law","Hotel Management","B.Sc","M.Tech","MBBS"];

export default function AuthModal({ open, onClose, onLogin, authLogin, authSignup, authError, authLoading, clearError }: Props) {
  const [tab, setTab] = useState<AuthTab>("login");
  const [loginMethod, setLoginMethod] = useState<"mobile"|"email">("email");
  const [showPass, setShowPass] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState({ name:"", mobile:"", email:"", password:"", state:"", course:"", referralCode:"" });
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const switchTab = (t: AuthTab) => {
    setTab(t);
    clearError();
    setLocalError(null);
    setSignupSuccess(false);
  };

  const handleLogin = async () => {
    setLocalError(null);
    if (!identifier.trim() || !password.trim()) {
      setLocalError("Please fill in all fields.");
      return;
    }
    const success = await authLogin({ email: identifier.trim(), password });
    if (success) {
      onLogin();
      // Reset form
      setIdentifier("");
      setPassword("");
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    const googleEmail = prompt("Enter Google Email for Sign-In / Registration:", "student.google@swayam.test");
    if (!googleEmail) return;
    try {
      const res = await authApi.googleAuth({
        email: googleEmail,
        fullName: googleEmail.split('@')[0],
      });
      if (res.data?.access_token) {
        localStorage.setItem('swayam_token', res.data.access_token);
        window.location.reload();
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.message || "Google login failed.");
    }
  };

  const handleSignup = async () => {
    setLocalError(null);
    if (!signup.name.trim() || !signup.email.trim() || !signup.mobile.trim() || !signup.password.trim()) {
      setLocalError("Please fill in all required fields.");
      return;
    }
    if (signup.password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    const success = await authSignup({
      fullName: signup.name.trim(),
      email: signup.email.trim(),
      mobile: signup.mobile.trim(),
      password: signup.password,
      referralCode: signup.referralCode?.trim() || undefined,
    });
    if (success) {
      setSignupSuccess(true);
      setSignup({ name:"", mobile:"", email:"", password:"", state:"", course:"", referralCode:"" });
    }
  };

  const displayError = localError || authError;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl gap-0">
        {/* Green header */}
        <div className="bg-[#4A7B5B] px-6 pt-7 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <DialogTitle className="text-white" style={{ fontSize: "20px", fontWeight: 700 }}>
              {tab === "login" && "Welcome Back"}
              {tab === "signup" && "Create Account"}
              {tab === "forgot" && "Reset Password"}
            </DialogTitle>
          </div>
          <p className="text-white/75" style={{ fontSize: "13px" }}>
            {tab === "login" && "Sign in to your Swayam account"}
            {tab === "signup" && (signupSuccess ? "Account created successfully!" : "Start your admission journey today")}
            {tab === "forgot" && "We'll send a reset link to your email"}
          </p>
        </div>

        <div className="px-6 py-5">
          {/* Error display */}
          {displayError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
              {displayError}
            </div>
          )}

          {/* LOGIN */}
          {tab === "login" && (
            <div className="space-y-4">
              <div className="flex bg-gray-100 rounded-xl p-1">
                {[{id:"mobile",label:"Mobile",Icon:Phone},{id:"email",label:"Email",Icon:Mail}].map(m => (
                  <button key={m.id} onClick={() => { setLoginMethod(m.id as any); setLocalError(null); clearError(); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm transition-all ${loginMethod===m.id?"bg-white shadow-sm text-[#4A7B5B]":"text-gray-500"}`}>
                    <m.Icon size={13}/>{m.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">{loginMethod==="mobile"?"Mobile Number":"Email Address"}</label>
                <input type={loginMethod==="mobile"?"tel":"email"} placeholder={loginMethod==="mobile"?"10-digit mobile":"Email address"}
                  value={identifier} onChange={e=>setIdentifier(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B] focus:ring-2 focus:ring-[#4A7B5B]/10"
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPass?"text":"password"} placeholder="Enter password" value={password} onChange={e=>setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B] focus:ring-2 focus:ring-[#4A7B5B]/10 pr-10"
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                  />
                  <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={()=>switchTab("forgot")} className="text-xs text-[#4A7B5B] hover:underline">Forgot password?</button>
              </div>
              <button
                onClick={handleLogin}
                disabled={authLoading}
                className="w-full bg-[#4A7B5B] text-white py-3 rounded-xl hover:bg-[#3d6b4d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{fontWeight:600}}
              >
                {authLoading ? <><Loader2 size={16} className="animate-spin"/> Signing in...</> : "Sign In"}
              </button>
              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200"/><span className="text-xs text-gray-400">or</span><div className="flex-1 h-px bg-gray-200"/>
              </div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.659 14.035 17.64 11.727 17.64 9.2z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                Continue with Google
              </button>
              <p className="text-center text-xs text-gray-500">Don't have an account?{" "}
                <button onClick={()=>switchTab("signup")} className="text-[#4A7B5B] hover:underline font-medium">Sign up free</button>
              </p>
            </div>
          )}

          {/* SIGNUP */}
          {tab === "signup" && (
            <div className="space-y-3">
              {signupSuccess ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-[#E8F3EC] rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7B5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h3 className="text-lg font-semibold text-[#4A7B5B] mb-1">Account Created!</h3>
                  <p className="text-sm text-gray-500 mb-4">You can now sign in with your credentials.</p>
                  <button
                    onClick={() => { setSignupSuccess(false); switchTab("login"); }}
                    className="w-full bg-[#4A7B5B] text-white py-3 rounded-xl hover:bg-[#3d6b4d] transition-colors"
                    style={{fontWeight:600}}
                  >
                    Go to Login
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      {label:"Full Name",key:"name",type:"text",placeholder:"Your name"},
                      {label:"Mobile Number",key:"mobile",type:"tel",placeholder:"10-digit mobile"},
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                        <input type={f.type} placeholder={f.placeholder} value={(signup as any)[f.key]}
                          onChange={e=>setSignup({...signup,[f.key]:e.target.value})}
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B]"/>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                    <input type="email" placeholder="Email address" value={signup.email} onChange={e=>setSignup({...signup,email:e.target.value})}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B]"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Password</label>
                    <div className="relative">
                      <input type={showPass?"text":"password"} placeholder="Create password (min 6 chars)" value={signup.password} onChange={e=>setSignup({...signup,password:e.target.value})}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B] pr-9"/>
                      <button onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPass?<EyeOff size={13}/>:<Eye size={13}/>}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">State</label>
                      <select value={signup.state} onChange={e=>setSignup({...signup,state:e.target.value})}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B]">
                        <option value="">Select State</option>
                        {STATES.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Interested Course</label>
                      <select value={signup.course} onChange={e=>setSignup({...signup,course:e.target.value})}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B]">
                        <option value="">Select Course</option>
                        {COURSES.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Referral Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. SWY-JOHN-A1B2 (Get 100% Free Counselling)"
                      value={signup.referralCode}
                      onChange={e => setSignup({...signup, referralCode: e.target.value.toUpperCase()})}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:border-[#4A7B5B]"
                    />
                  </div>
                  <button
                    onClick={handleSignup}
                    disabled={authLoading}
                    className="w-full bg-[#4A7B5B] text-white py-3 rounded-xl hover:bg-[#3d6b4d] transition-colors mt-1 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{fontWeight:600}}
                  >
                    {authLoading ? <><Loader2 size={16} className="animate-spin"/> Creating Account...</> : "Create Account"}
                  </button>
                  <p className="text-center text-xs text-gray-500">Already have an account?{" "}
                    <button onClick={()=>switchTab("login")} className="text-[#4A7B5B] hover:underline font-medium">Sign in</button>
                  </p>
                </>
              )}
            </div>
          )}

          {/* FORGOT */}
          {tab === "forgot" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Registered Email Address</label>
                <input type="email" placeholder="Enter email address"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4A7B5B]"/>
              </div>
              <button className="w-full bg-[#4A7B5B] text-white py-3 rounded-xl hover:bg-[#3d6b4d] transition-colors" style={{fontWeight:600}}>
                Send Reset Link
              </button>
              <button onClick={()=>switchTab("login")} className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Back to Login
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
