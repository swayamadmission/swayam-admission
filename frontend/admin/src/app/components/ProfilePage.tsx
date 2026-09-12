import { useState, useEffect } from "react";
import {
  User, Shield, Key, Smartphone, Clock, History, FileText, CheckCircle2,
  AlertTriangle, Upload, Download, RefreshCw, Lock, Mail, Phone, MapPin,
  Briefcase, Award, Check, X, QrCode, Monitor, Laptop, Globe, LogOut, Save, Camera, Edit3
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi, UserProfileResponse } from "../../api/profile.api";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "personal" | "media" | "security" | "sessions" | "preferences">("overview");

  const { data: profileRes, isLoading, refetch } = useQuery({
    queryKey: ["user_profile_detail"],
    queryFn: () => profileApi.getProfile(),
  });

  const { data: loginHistoryRes } = useQuery({
    queryKey: ["user_login_history"],
    queryFn: () => profileApi.getLoginHistory(),
    enabled: activeTab === "sessions",
  });

  const { data: deviceSessionsRes } = useQuery({
    queryKey: ["user_device_sessions"],
    queryFn: () => profileApi.getDevices(),
    enabled: activeTab === "sessions",
  });

  const profileData: UserProfileResponse | null = profileRes?.data || null;
  const user = profileData?.user;
  const stats = profileData?.stats;

  // Personal Info Form State
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    email: "",
    mobile: "",
    alternatePhone: "",
    gender: "",
    dateOfBirth: "",
    bloodGroup: "",
    designation: "",
    department: "",
    employeeId: "",
    qualification: "",
    experience: "",
    bio: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    timezone: "Asia/Kolkata",
    language: "English",
  });

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Avatar & Media URLs
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || user.fullName?.split(" ")[0] || "",
        lastName: user.lastName || user.fullName?.split(" ").slice(1).join(" ") || "",
        displayName: user.displayName || user.fullName || "",
        email: user.email || "",
        mobile: user.mobile || "",
        alternatePhone: user.alternatePhone || "",
        gender: user.gender || "Male",
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "",
        bloodGroup: user.bloodGroup || "O+",
        designation: user.designation || "Senior Administrator",
        department: user.department || "Admissions Management",
        employeeId: user.employeeId || `EMP-${user.id.slice(0, 6).toUpperCase()}`,
        qualification: user.qualification || "Post Graduate / MBA",
        experience: user.experience || "5+ Years",
        bio: user.bio || "Dedicated higher education counseling consultant.",
        address: user.address || "",
        city: user.city || "New Delhi",
        state: user.state || "Delhi",
        country: user.country || "India",
        pincode: user.pincode || "110001",
        timezone: user.timezone || "Asia/Kolkata",
        language: user.language || "English",
      });
      setAvatarUrl(user.avatar || "");
      setCoverUrl(user.coverImage || "");
      setSignatureUrl(user.signature || "");
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => profileApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_profile_detail"] });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => profileApi.changePassword(data),
    onSuccess: () => {
      setPasswordMsg({ type: "success", text: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      setPasswordMsg({ type: "error", text: err?.response?.data?.message || "Failed to update password." });
    },
  });

  const toggle2FAmuation = useMutation({
    mutationFn: (enable: boolean) => profileApi.toggleTwoFactor(enable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_profile_detail"] });
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: (id: string) => profileApi.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_device_sessions"] });
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => profileApi.logoutAllDevices(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_device_sessions"] });
    },
  });

  const handleExport = async (format: "csv" | "json") => {
    try {
      const res = await profileApi.exportProfile(format);
      const payload = res.data?.data || res.data;
      if (format === "csv") {
        const blob = new Blob([payload], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `my_profile_${Date.now()}.csv`;
        a.click();
      } else {
        const jsonStr = JSON.stringify(payload, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `my_profile_${Date.now()}.json`;
        a.click();
      }
    } catch (e) {
      console.error("Export error:", e);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        <div className="w-8 h-8 border-3 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading Enterprise Account Profile...
      </div>
    );
  }

  const completionPct = profileData?.completionPercentage || 85;
  const loginHistoryList = loginHistoryRes?.data || [];
  const deviceSessionsList = deviceSessionsRes?.data || [];

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100%" }}>
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
        <div
          className="h-36 w-full bg-gradient-to-r from-[#1B3629] via-[#4A7B5B] to-[#2D5A40] relative"
          style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : undefined, backgroundSize: "cover" }}
        >
          <button
            onClick={() => {
              const url = prompt("Enter cover image URL:", coverUrl);
              if (url !== null) {
                setCoverUrl(url);
                profileApi.updateCover(url);
              }
            }}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5"
          >
            <Camera size={14} /> Change Cover
          </button>
        </div>

        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-10">
          <div className="flex items-end gap-4">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-slate-700 font-black text-3xl">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0) || "A"
                )}
              </div>
              <button
                onClick={() => {
                  const url = prompt("Enter profile avatar image URL:", avatarUrl);
                  if (url !== null) {
                    setAvatarUrl(url);
                    profileApi.updateAvatar(url);
                  }
                }}
                className="absolute bottom-1 right-1 bg-[#4A7B5B] text-white p-2 rounded-xl shadow-lg hover:bg-[#396247] transition-all"
              >
                <Edit3 size={14} />
              </button>
            </div>

            <div className="mb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{user?.fullName || "Administrator"}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F3EC] text-[#4A7B5B] border border-[#d2e7d9]">
                  {user?.role || "ADMIN"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{form.designation} • {form.department}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("csv")}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={() => refetch()}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Profile Completion Bar */}
        <div className="px-6 py-3 bg-slate-50 border-t border-gray-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <span className="font-bold text-slate-700 text-xs">Profile Completion: {completionPct}%</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#4A7B5B] transition-all duration-500" style={{ width: `${completionPct}%` }} />
            </div>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">Emp ID: {form.employeeId}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1 text-xs font-bold">
        {[
          { id: "overview", label: "Dashboard Overview", icon: User },
          { id: "personal", label: "Personal & Professional", icon: Briefcase },
          { id: "media", label: "Avatar & Signature", icon: Camera },
          { id: "security", label: "Security & 2FA", icon: Shield },
          { id: "sessions", label: "Sessions & History", icon: Clock },
          { id: "preferences", label: "Preferences & Social", icon: Globe },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-[#4A7B5B] text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-slate-900"
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Students Managed</span>
              <span className="text-2xl font-black text-[#4A7B5B]">{stats?.studentsManaged || 0}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Admissions Confirmed</span>
              <span className="text-2xl font-black text-blue-600">{stats?.admissionsConfirmed || 0}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Assigned Leads</span>
              <span className="text-2xl font-black text-amber-600">{stats?.assignedLeads || 0}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">My Applications</span>
              <span className="text-2xl font-black text-purple-600">{stats?.myApplications || 0}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Support Tickets</span>
              <span className="text-2xl font-black text-rose-600">{stats?.supportTicketsCount || 0}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User size={16} className="text-[#4A7B5B]" /> Identity & Verification Badges
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                  <span className="font-semibold text-slate-700">Account Verification</span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">Verified Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                  <span className="font-semibold text-slate-700">Two-Factor Authentication</span>
                  <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${user?.twoFactorEnabled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {user?.twoFactorEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                  <span className="font-semibold text-slate-700">Primary Email</span>
                  <span className="font-mono text-slate-800">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                  <span className="font-semibold text-slate-700">Mobile Number</span>
                  <span className="font-mono text-slate-800">{user?.mobile}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase size={16} className="text-[#4A7B5B]" /> Employment & Role Details
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                  <span className="font-semibold text-slate-700">Role Designation</span>
                  <span className="font-bold text-slate-800">{form.designation}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                  <span className="font-semibold text-slate-700">Department</span>
                  <span className="font-bold text-slate-800">{form.department}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                  <span className="font-semibold text-slate-700">Experience</span>
                  <span className="font-bold text-slate-800">{form.experience}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                  <span className="font-semibold text-slate-700">Location</span>
                  <span className="font-bold text-slate-800">{form.city}, {form.state}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERSONAL & PROFESSIONAL INFO */}
      {activeTab === "personal" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Personal & Professional Information</h3>
              <p className="text-xs text-slate-400 mt-0.5">Update your personal contact, employment details, and location.</p>
            </div>
            <button
              disabled={updateProfileMutation.isPending}
              onClick={() => updateProfileMutation.mutate(form)}
              className="px-5 py-2.5 bg-[#4A7B5B] hover:bg-[#386046] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-40"
            >
              <Save size={15} /> Save Changes
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Display Name</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mobile Phone</label>
              <input
                type="text"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Alternate Phone</label>
              <input
                type="text"
                value={form.alternatePhone}
                onChange={(e) => setForm({ ...form, alternatePhone: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Blood Group</label>
              <select
                value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Designation</label>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Employee ID</label>
              <input
                type="text"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="font-bold text-slate-700 block mb-1">Professional Bio</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pincode</label>
              <input
                type="text"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AVATAR & DIGITAL SIGNATURE */}
      {activeTab === "media" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera size={16} className="text-[#4A7B5B]" /> Profile Avatar Image
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 border overflow-hidden flex items-center justify-center text-xl font-bold">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : "A"}
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const url = prompt("Enter Avatar Image URL:", avatarUrl);
                    if (url !== null) {
                      setAvatarUrl(url);
                      profileApi.updateAvatar(url);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-[#4A7B5B] text-white text-xs font-bold rounded-xl"
                >
                  Upload New Avatar
                </button>
                <button
                  onClick={() => {
                    setAvatarUrl("");
                    profileApi.deleteAvatar();
                  }}
                  className="block text-xs text-rose-600 font-bold hover:underline"
                >
                  Remove Avatar
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Edit3 size={16} className="text-[#4A7B5B]" /> Digital Signature (for Receipts & Documents)
            </h3>
            <div className="p-4 border border-dashed border-gray-300 rounded-2xl bg-slate-50 text-center space-y-2">
              {signatureUrl ? (
                <img src={signatureUrl} alt="Signature" className="h-16 mx-auto object-contain" />
              ) : (
                <p className="text-xs text-slate-400">No digital signature uploaded yet.</p>
              )}
              <button
                onClick={() => {
                  const url = prompt("Enter Digital Signature Image URL:", signatureUrl);
                  if (url !== null) {
                    setSignatureUrl(url);
                    profileApi.updateSignature(url);
                  }
                }}
                className="px-3.5 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Upload / Update Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY & 2FA */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key size={16} className="text-[#4A7B5B]" /> Change Password
            </h3>

            {passwordMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold ${passwordMsg.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                {passwordMsg.text}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>

              <button
                disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || changePasswordMutation.isPending}
                onClick={() => changePasswordMutation.mutate({ currentPassword, newPassword })}
                className="w-full py-2.5 bg-[#4A7B5B] text-white font-bold rounded-xl hover:bg-[#396247] disabled:opacity-40"
              >
                {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield size={16} className="text-[#4A7B5B]" /> Two-Factor Authentication (2FA)
            </h3>
            <p className="text-xs text-slate-500">Secure your account with TOTP Authenticator apps (Google Authenticator, Authy).</p>

            <div className="p-4 rounded-2xl bg-slate-50 border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">2FA Status</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${user?.twoFactorEnabled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {user?.twoFactorEnabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>

              <button
                disabled={toggle2FAmuation.isPending}
                onClick={() => toggle2FAmuation.mutate(!user?.twoFactorEnabled)}
                className={`w-full py-2 rounded-xl text-xs font-bold ${user?.twoFactorEnabled ? "bg-rose-100 text-rose-800 hover:bg-rose-200" : "bg-[#4A7B5B] text-white hover:bg-[#386046]"}`}
              >
                {user?.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA Protection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SESSIONS & LOGIN HISTORY */}
      {activeTab === "sessions" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Active Device Sessions</h3>
              <button
                onClick={() => logoutAllMutation.mutate()}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 hover:bg-rose-100"
              >
                Logout All Other Devices
              </button>
            </div>

            <div className="space-y-2">
              {deviceSessionsList.map((sess: any) => (
                <div key={sess.id} className="p-3.5 rounded-2xl bg-slate-50 border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <Monitor size={18} className="text-slate-600" />
                    <div>
                      <div className="font-bold text-slate-800">{sess.device} • {sess.browser} ({sess.os})</div>
                      <div className="text-[11px] text-slate-400 font-mono">IP: {sess.ipAddress} • {sess.location}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sess.isCurrent && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Current Session</span>}
                    {!sess.isCurrent && (
                      <button onClick={() => deleteDeviceMutation.mutate(sess.id)} className="text-rose-600 font-bold hover:underline">
                        Terminate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Login Logs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-400 font-bold uppercase text-[10px]">
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Device / Browser</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700 font-mono text-[11px]">
                  {loginHistoryList.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3">{log.ipAddress || "127.0.0.1"}</td>
                      <td className="p-3">{log.browser || "Chrome"} ({log.os || "Windows"})</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${log.status === "SUCCESS" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PREFERENCES & SOCIAL */}
      {activeTab === "preferences" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 border-b pb-3">Localization & Interface Preferences</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="UTC">UTC (GMT +0:00)</option>
                <option value="America/New_York">America/New_York (EST)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">System Language</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={() => updateProfileMutation.mutate(form)}
              className="px-5 py-2.5 bg-[#4A7B5B] text-white font-bold rounded-xl text-xs"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
