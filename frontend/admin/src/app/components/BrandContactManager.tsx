import React, { useState, useEffect, useMemo } from "react";
import {
  Palette,
  Phone,
  Mail,
  Globe,
  Sparkles,
  Check,
  Save,
  RotateCcw,
  AlertCircle,
  Copy,
  ExternalLink,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Twitter,
  Github,
  Send,
  Info,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  settingsApi,
  BrandContactSettings,
  SettingAuditLog,
} from "../../api/settings.api";

interface BrandContactManagerProps {
  triggerNotice: (message: string, type?: "success" | "error") => void;
}

// Canonical defaults as mandated by product specification
const BRAND_CONTACT_DEFAULTS: BrandContactSettings = {
  brandName: "Swayam Admission",
  mainTagline: "India Ka Mission Swayam Admission",
  brandPromise: "Your Trusted Education Partner",
  primaryAudience: "Students seeking admission guidance across India.",
  primaryColor: "#4A7B5B",
  accentColor: "#F0AE1A",
  generalEmail: "swayamadmissions@gmail.com",
  admissionEmail: "getadmission@swayamadmission.com",
  supportEmail: "support@swayamadmision.com",
  contactNumber1: "6284308664",
  contactNumber2: "6399102731",
  whatsappNumber: "6284308664",
  websiteUrl: "https://www.swayamadmission.com/",
  instagramUrl: "https://www.instagram.com/swayamadmission",
  facebookUrl: "https://www.facebook.com/swayamadmission",
  youtubeUrl: "https://www.youtube.com/@swayamadmission",
  linkedinUrl: "https://www.linkedin.com/company/swayamadmission",
  xUrl: "https://x.com/swayamadmission",
  githubUrl: "https://github.com/swayamadmission",
  redditUrl: "https://www.reddit.com/user/swayamadmission/",
  telegramUrl: "https://t.me/swayamadmission",
  discordUrl: "",
  socialHandle: "@swayamadmission",
};

// Precise brand SVGs for platforms not in lucide
const RedditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.703zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.562-1.249-1.25-1.249zm-4.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.094z" />
  </svg>
);

const TelegramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.941z" />
  </svg>
);

const DiscordIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

export default function BrandContactManager({ triggerNotice }: BrandContactManagerProps) {
  const queryClient = useQueryClient();

  // Local Form state initialized with standard platform values
  const [formData, setFormData] = useState<BrandContactSettings>(BRAND_CONTACT_DEFAULTS);
  const [initialData, setInitialData] = useState<BrandContactSettings | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch current database settings
  const {
    data: brandRes,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin_brand_contact_settings"],
    queryFn: () => settingsApi.getBrandContact(),
  });

  // Fetch audit trail history
  const { data: auditRes, refetch: refetchAudit } = useQuery({
    queryKey: ["admin_settings_audit_history"],
    queryFn: () => settingsApi.getHistory(),
  });

  // Sync server data to form when loaded
  useEffect(() => {
    if (brandRes?.data && !isDirty) {
      const serverData = brandRes.data;
      const merged: BrandContactSettings = {
        brandName: serverData.brandName ?? BRAND_CONTACT_DEFAULTS.brandName,
        mainTagline: serverData.mainTagline ?? BRAND_CONTACT_DEFAULTS.mainTagline,
        brandPromise: serverData.brandPromise ?? BRAND_CONTACT_DEFAULTS.brandPromise,
        primaryAudience: serverData.primaryAudience ?? BRAND_CONTACT_DEFAULTS.primaryAudience,
        primaryColor: serverData.primaryColor ?? BRAND_CONTACT_DEFAULTS.primaryColor,
        accentColor: serverData.accentColor ?? BRAND_CONTACT_DEFAULTS.accentColor,
        generalEmail: serverData.generalEmail ?? BRAND_CONTACT_DEFAULTS.generalEmail,
        admissionEmail: serverData.admissionEmail ?? BRAND_CONTACT_DEFAULTS.admissionEmail,
        supportEmail: serverData.supportEmail ?? BRAND_CONTACT_DEFAULTS.supportEmail,
        contactNumber1: serverData.contactNumber1 ?? BRAND_CONTACT_DEFAULTS.contactNumber1,
        contactNumber2: serverData.contactNumber2 ?? BRAND_CONTACT_DEFAULTS.contactNumber2,
        whatsappNumber: serverData.whatsappNumber ?? BRAND_CONTACT_DEFAULTS.whatsappNumber,
        websiteUrl: serverData.websiteUrl ?? BRAND_CONTACT_DEFAULTS.websiteUrl,
        instagramUrl: serverData.instagramUrl ?? BRAND_CONTACT_DEFAULTS.instagramUrl,
        facebookUrl: serverData.facebookUrl ?? BRAND_CONTACT_DEFAULTS.facebookUrl,
        youtubeUrl: serverData.youtubeUrl ?? BRAND_CONTACT_DEFAULTS.youtubeUrl,
        linkedinUrl: serverData.linkedinUrl ?? BRAND_CONTACT_DEFAULTS.linkedinUrl,
        xUrl: serverData.xUrl ?? BRAND_CONTACT_DEFAULTS.xUrl,
        githubUrl: serverData.githubUrl ?? BRAND_CONTACT_DEFAULTS.githubUrl,
        redditUrl: serverData.redditUrl ?? BRAND_CONTACT_DEFAULTS.redditUrl,
        telegramUrl: serverData.telegramUrl ?? BRAND_CONTACT_DEFAULTS.telegramUrl,
        discordUrl: serverData.discordUrl ?? "",
        socialHandle: serverData.socialHandle ?? BRAND_CONTACT_DEFAULTS.socialHandle,
        updatedAt: serverData.updatedAt,
      };
      setFormData(merged);
      setInitialData(merged);
    }
  }, [brandRes?.data]);

  // Validation
  const validationErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

    if (formData.generalEmail && !emailRegex.test(formData.generalEmail.trim())) {
      errs.generalEmail = "Invalid email format";
    }
    if (formData.admissionEmail && !emailRegex.test(formData.admissionEmail.trim())) {
      errs.admissionEmail = "Invalid email format";
    }
    if (formData.supportEmail && !emailRegex.test(formData.supportEmail.trim())) {
      errs.supportEmail = "Invalid email format";
    }
    if (formData.primaryColor && !hexRegex.test(formData.primaryColor.trim())) {
      errs.primaryColor = "Valid hex code required (e.g. #4A7B5B)";
    }
    if (formData.accentColor && !hexRegex.test(formData.accentColor.trim())) {
      errs.accentColor = "Valid hex code required (e.g. #F0AE1A)";
    }
    return errs;
  }, [formData]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data: Partial<BrandContactSettings>) => settingsApi.updateBrandContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_brand_contact_settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin_settings_audit_history"] });
      queryClient.invalidateQueries({ queryKey: ["admin_legacy_settings"] });
      setIsDirty(false);
      triggerNotice("Brand, Contact & Social coordinates published successfully across platform!", "success");
    },
    onError: (err: any) => {
      triggerNotice(err?.response?.data?.message || err.message || "Failed to update brand settings", "error");
    },
  });

  const handleChange = (field: keyof BrandContactSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (hasErrors) {
      triggerNotice("Please fix validation errors before saving.", "error");
      return;
    }
    updateMutation.mutate(formData);
  };

  const handleDiscard = () => {
    if (initialData) {
      setFormData(initialData);
      setIsDirty(false);
      triggerNotice("Unsaved changes discarded.", "success");
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset all Brand, Contact & Social coordinates to platform baseline defaults? You must click 'Save & Publish Changes' to persist.")) {
      setFormData(BRAND_CONTACT_DEFAULTS);
      setIsDirty(true);
      triggerNotice("Baseline values restored to form. Click 'Save & Publish Changes' to commit.", "success");
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const cleanWhatsappPhone = (formData.whatsappNumber || "6284308664").replace(/\D/g, "");
  const whatsappPreviewHref = `https://wa.me/91${cleanWhatsappPhone}`;

  // Filter audit logs for relevant brand/contact keys
  const relevantAuditLogs: SettingAuditLog[] = useMemo(() => {
    const logs = auditRes?.data || [];
    return logs.slice(0, 15);
  }, [auditRes?.data]);

  if (isLoading && !initialData) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-[#F1F5F9] text-center shadow-sm">
        <div className="w-8 h-8 border-3 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-[#4A7B5B]">Loading Centralized Brand & Contact System...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Action Header Banner ── */}
      <div className="bg-gradient-to-r from-white via-[#F8FAFC] to-[#F1F5F9] p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#E8F3EC] text-[#4A7B5B]">
              <Palette className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-[#2D5A3C]">
              Brand, Contact & Social Media Master Settings
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F3EC] text-[#4A7B5B]">
              Global Scope
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl">
            Authoritative source of truth for Swayam Admission identity, official contact channels, and social media footprints synchronized across header, footer, mobile bar, and student panels.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Reset form fields to platform baseline defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          {isDirty && (
            <button
              type="button"
              onClick={handleDiscard}
              className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              Discard Changes
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending || hasErrors || !isDirty}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-all ${
              !isDirty || hasErrors
                ? "bg-slate-300 cursor-not-allowed text-slate-500"
                : "bg-[#4A7B5B] hover:bg-[#3D674C] active:scale-95"
            }`}
          >
            {updateMutation.isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save & Publish Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dirty State Warning Pill */}
      {isDirty && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>You have unsaved modifications in Brand, Contact & Social coordinates. Click <strong>Save & Publish Changes</strong> to push live.</span>
          </div>
          <span className="font-mono text-[10px] bg-amber-100 px-2 py-0.5 rounded font-bold uppercase">Unpublished Draft</span>
        </div>
      )}

      {/* ── Main 2-Column Grid: Form Fields on Left, Live Preview on Right ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Form Area (7 cols on xl) */}
        <div className="xl:col-span-7 space-y-6">

          {/* ══ SECTION 1: BRAND IDENTITY ══ */}
          <div className="bg-white p-5 rounded-2xl border border-[#F1F5F9] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4A7B5B]" />
                <h3 className="text-sm font-bold text-[#2D5A3C]">1. Centralized Brand Identity</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Brand Core</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Brand Name */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={(e) => handleChange("brandName", e.target.value)}
                  placeholder="e.g. Swayam Admission"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#2D5A3C] bg-white focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B]"
                />
              </div>

              {/* Main Tagline */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Main Tagline <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.mainTagline}
                  onChange={(e) => handleChange("mainTagline", e.target.value)}
                  placeholder="e.g. India Ka Mission Swayam Admission"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#2D5A3C] bg-white focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B]"
                />
              </div>

              {/* Brand Promise */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Brand Promise
                </label>
                <input
                  type="text"
                  value={formData.brandPromise}
                  onChange={(e) => handleChange("brandPromise", e.target.value)}
                  placeholder="e.g. Your Trusted Education Partner"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#2D5A3C] bg-white focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B]"
                />
              </div>

              {/* Primary Audience */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Audience Scope
                </label>
                <textarea
                  rows={2}
                  value={formData.primaryAudience}
                  onChange={(e) => handleChange("primaryAudience", e.target.value)}
                  placeholder="e.g. Students seeking admission guidance across India."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B]"
                />
              </div>

              {/* Primary Color */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Primary Colour</span>
                  <span className="text-[10px] font-mono font-bold text-[#4A7B5B]">{formData.primaryColor}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor || "#4A7B5B"}
                    onChange={(e) => handleChange("primaryColor", e.target.value.toUpperCase())}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => handleChange("primaryColor", e.target.value.toUpperCase())}
                    placeholder="#4A7B5B"
                    maxLength={7}
                    className={`flex-1 h-10 px-3 font-mono text-xs font-bold uppercase rounded-xl border ${
                      validationErrors.primaryColor ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-white"
                    } focus:outline-none focus:border-[#4A7B5B]`}
                  />
                </div>
                {validationErrors.primaryColor && (
                  <p className="text-[10px] text-rose-600 mt-1">{validationErrors.primaryColor}</p>
                )}
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Accent Colour</span>
                  <span className="text-[10px] font-mono font-bold text-amber-600">{formData.accentColor}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.accentColor || "#F0AE1A"}
                    onChange={(e) => handleChange("accentColor", e.target.value.toUpperCase())}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={formData.accentColor}
                    onChange={(e) => handleChange("accentColor", e.target.value.toUpperCase())}
                    placeholder="#F0AE1A"
                    maxLength={7}
                    className={`flex-1 h-10 px-3 font-mono text-xs font-bold uppercase rounded-xl border ${
                      validationErrors.accentColor ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-white"
                    } focus:outline-none focus:border-[#4A7B5B]`}
                  />
                </div>
                {validationErrors.accentColor && (
                  <p className="text-[10px] text-rose-600 mt-1">{validationErrors.accentColor}</p>
                )}
              </div>
            </div>
          </div>

          {/* ══ SECTION 2: PUBLIC CONTACT DETAILS ══ */}
          <div className="bg-white p-5 rounded-2xl border border-[#F1F5F9] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#4A7B5B]" />
                <h3 className="text-sm font-bold text-[#2D5A3C]">2. Official Contact Information</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Direct Reach</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* General Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  General Inquiries Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={formData.generalEmail}
                    onChange={(e) => handleChange("generalEmail", e.target.value.trim())}
                    placeholder="swayamadmissions@gmail.com"
                    className={`w-full h-10 pl-9 pr-3 rounded-xl border ${
                      validationErrors.generalEmail ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-white"
                    } text-xs font-medium text-slate-800 focus:outline-none focus:border-[#4A7B5B]`}
                  />
                </div>
                {validationErrors.generalEmail && (
                  <p className="text-[10px] text-rose-600 mt-1">{validationErrors.generalEmail}</p>
                )}
              </div>

              {/* Admission Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Admission Department Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={formData.admissionEmail}
                    onChange={(e) => handleChange("admissionEmail", e.target.value.trim())}
                    placeholder="getadmission@swayamadmission.com"
                    className={`w-full h-10 pl-9 pr-3 rounded-xl border ${
                      validationErrors.admissionEmail ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-white"
                    } text-xs font-medium text-slate-800 focus:outline-none focus:border-[#4A7B5B]`}
                  />
                </div>
                {validationErrors.admissionEmail && (
                  <p className="text-[10px] text-rose-600 mt-1">{validationErrors.admissionEmail}</p>
                )}
              </div>

              {/* Support Email */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Support & Helpdesk Email</span>
                  <span className="text-[10px] text-slate-400 font-normal">Exact spelling editable at any time</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={formData.supportEmail}
                    onChange={(e) => handleChange("supportEmail", e.target.value.trim())}
                    placeholder="support@swayamadmision.com"
                    className={`w-full h-10 pl-9 pr-3 rounded-xl border ${
                      validationErrors.supportEmail ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-white"
                    } text-xs font-medium text-slate-800 focus:outline-none focus:border-[#4A7B5B]`}
                  />
                </div>
                {validationErrors.supportEmail && (
                  <p className="text-[10px] text-rose-600 mt-1">{validationErrors.supportEmail}</p>
                )}
              </div>

              {/* Contact Number 1 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Contact Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={formData.contactNumber1}
                    onChange={(e) => handleChange("contactNumber1", e.target.value.trim())}
                    placeholder="6284308664"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* Contact Number 2 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Secondary Contact Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={formData.contactNumber2}
                    onChange={(e) => handleChange("contactNumber2", e.target.value.trim())}
                    placeholder="6399102731"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* WhatsApp Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official WhatsApp Number
                </label>
                <div className="relative">
                  <MessageCircle className="w-4 h-4 absolute left-3 top-3 text-emerald-600" />
                  <input
                    type="text"
                    value={formData.whatsappNumber}
                    onChange={(e) => handleChange("whatsappNumber", e.target.value.trim())}
                    placeholder="6284308664"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* Official Website URL */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official Website Canonical URL
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => handleChange("websiteUrl", e.target.value.trim())}
                    placeholder="https://www.swayamadmission.com/"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ══ SECTION 3: SOCIAL MEDIA LINKS ══ */}
          <div className="bg-white p-5 rounded-2xl border border-[#F1F5F9] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#4A7B5B]" />
                <h3 className="text-sm font-bold text-[#2D5A3C]">3. Official Social Channels</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Omnichannel</span>
            </div>

            <div className="space-y-3">
              {/* Instagram */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 sm:col-span-3 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="p-1 rounded-lg bg-pink-50 text-pink-600">
                    <Instagram className="w-3.5 h-3.5" />
                  </span>
                  <span>Instagram</span>
                </div>
                <div className="col-span-8 sm:col-span-9">
                  <input
                    type="url"
                    value={formData.instagramUrl}
                    onChange={(e) => handleChange("instagramUrl", e.target.value.trim())}
                    placeholder="https://www.instagram.com/swayamadmission"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* Facebook */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 sm:col-span-3 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
                    <Facebook className="w-3.5 h-3.5" />
                  </span>
                  <span>Facebook</span>
                </div>
                <div className="col-span-8 sm:col-span-9">
                  <input
                    type="url"
                    value={formData.facebookUrl}
                    onChange={(e) => handleChange("facebookUrl", e.target.value.trim())}
                    placeholder="https://www.facebook.com/swayamadmission"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* YouTube */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 sm:col-span-3 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="p-1 rounded-lg bg-red-50 text-red-600">
                    <Youtube className="w-3.5 h-3.5" />
                  </span>
                  <span>YouTube</span>
                </div>
                <div className="col-span-8 sm:col-span-9">
                  <input
                    type="url"
                    value={formData.youtubeUrl}
                    onChange={(e) => handleChange("youtubeUrl", e.target.value.trim())}
                    placeholder="https://www.youtube.com/@swayamadmission"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* LinkedIn */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 sm:col-span-3 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="p-1 rounded-lg bg-sky-50 text-sky-700">
                    <Linkedin className="w-3.5 h-3.5" />
                  </span>
                  <span>LinkedIn</span>
                </div>
                <div className="col-span-8 sm:col-span-9">
                  <input
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={(e) => handleChange("linkedinUrl", e.target.value.trim())}
                    placeholder="https://www.linkedin.com/company/swayamadmission"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* X / Twitter */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 sm:col-span-3 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="p-1 rounded-lg bg-slate-100 text-slate-900">
                    <Twitter className="w-3.5 h-3.5" />
                  </span>
                  <span>X (Twitter)</span>
                </div>
                <div className="col-span-8 sm:col-span-9">
                  <input
                    type="url"
                    value={formData.xUrl}
                    onChange={(e) => handleChange("xUrl", e.target.value.trim())}
                    placeholder="https://x.com/swayamadmission"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* GitHub */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 sm:col-span-3 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="p-1 rounded-lg bg-slate-100 text-slate-800">
                    <Github className="w-3.5 h-3.5" />
                  </span>
                  <span>GitHub</span>
                </div>
                <div className="col-span-8 sm:col-span-9">
                  <input
                    type="url"
                    value={formData.githubUrl}
                    onChange={(e) => handleChange("githubUrl", e.target.value.trim())}
                    placeholder="https://github.com/swayamadmission"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* Reddit */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 sm:col-span-3 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="p-1 rounded-lg bg-orange-50 text-orange-600">
                    <RedditIcon className="w-3.5 h-3.5" />
                  </span>
                  <span>Reddit</span>
                </div>
                <div className="col-span-8 sm:col-span-9">
                  <input
                    type="url"
                    value={formData.redditUrl}
                    onChange={(e) => handleChange("redditUrl", e.target.value.trim())}
                    placeholder="https://www.reddit.com/user/swayamadmission/"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* Telegram */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 sm:col-span-3 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className="p-1 rounded-lg bg-sky-50 text-sky-500">
                    <TelegramIcon className="w-3.5 h-3.5" />
                  </span>
                  <span>Telegram</span>
                </div>
                <div className="col-span-8 sm:col-span-9">
                  <input
                    type="text"
                    value={formData.telegramUrl}
                    onChange={(e) => handleChange("telegramUrl", e.target.value.trim())}
                    placeholder="https://t.me/swayamadmission or @swayamadmission"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* Discord (Optional / Blank) */}
              <div className="grid grid-cols-12 gap-2 items-center bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                <div className="col-span-4 sm:col-span-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
                      <DiscordIcon className="w-3.5 h-3.5" />
                    </span>
                    <span>Discord</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block ml-6">Optional / Hidden</span>
                </div>
                <div className="col-span-8 sm:col-span-9">
                  <input
                    type="text"
                    value={formData.discordUrl}
                    onChange={(e) => handleChange("discordUrl", e.target.value.trim())}
                    placeholder="Leave blank to keep hidden on website"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {formData.discordUrl.trim()
                      ? "✓ Discord URL set — Discord badge will be visible across public pages."
                      : "ⓘ Blank — Discord icon will remain safely hidden on all public pages until entered."}
                  </p>
                </div>
              </div>

              {/* Social Handle */}
              <div className="grid grid-cols-12 gap-2 items-center pt-2">
                <div className="col-span-4 sm:col-span-3 text-xs font-bold text-slate-700">
                  <span>Uniform Handle</span>
                </div>
                <div className="col-span-8 sm:col-span-9">
                  <input
                    type="text"
                    value={formData.socialHandle}
                    onChange={(e) => handleChange("socialHandle", e.target.value.trim())}
                    placeholder="@swayamadmission"
                    className="w-full h-9 px-3 font-mono rounded-xl border border-slate-200 text-xs font-bold text-[#4A7B5B] bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Area: Omnichannel Live Preview + Audit Log (5 cols on xl) */}
        <div className="xl:col-span-5 space-y-6">

          {/* ══ LIVE PREVIEW CARD ══ */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="bg-[#2D5A3C] p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#A7F3D0]">
                  Live Omnichannel Preview
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white">
                  Reactive Sync
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-inner"
                  style={{ backgroundColor: formData.primaryColor || "#4A7B5B" }}
                >
                  {formData.brandName?.charAt(0) || "S"}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{formData.brandName || "Swayam Admission"}</h4>
                  <p className="text-[11px] text-[#A7F3D0]">{formData.mainTagline || "India Ka Mission Swayam Admission"}</p>
                </div>
              </div>

              {formData.brandPromise && (
                <div className="mt-3 pt-2.5 border-t border-white/10 text-[11px] text-white/80 italic">
                  &ldquo;{formData.brandPromise}&rdquo;
                </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* Color Swatches */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Brand Color Palette Tokens
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded-lg shadow-sm border border-black/10 shrink-0"
                      style={{ backgroundColor: formData.primaryColor || "#4A7B5B" }}
                    />
                    <div className="overflow-hidden">
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">Primary</span>
                      <span className="text-xs font-mono font-bold text-slate-800">{formData.primaryColor || "#4A7B5B"}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded-lg shadow-sm border border-black/10 shrink-0"
                      style={{ backgroundColor: formData.accentColor || "#F0AE1A" }}
                    />
                    <div className="overflow-hidden">
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">Accent</span>
                      <span className="text-xs font-mono font-bold text-slate-800">{formData.accentColor || "#F0AE1A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Click-to-Action Testing */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Instant Link Previews
                </span>
                <div className="space-y-2">
                  {/* WhatsApp CTA */}
                  <a
                    href={whatsappPreviewHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-between transition-colors border border-emerald-200"
                  >
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp Click-to-Chat (+91 {formData.whatsappNumber})</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-emerald-600" />
                  </a>

                  {/* Phone CTA */}
                  <a
                    href={`tel:${formData.contactNumber1}`}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-between transition-colors border border-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#4A7B5B]" />
                      <span>Primary Call ({formData.contactNumber1})</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">tel:</span>
                  </a>

                  {/* General Email */}
                  <a
                    href={`mailto:${formData.generalEmail}`}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-between transition-colors border border-slate-200 truncate"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-4 h-4 text-[#4A7B5B] shrink-0" />
                      <span className="truncate">{formData.generalEmail}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">mailto:</span>
                  </a>
                </div>
              </div>

              {/* Social Footprint Status */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Omnichannel Social Channels
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {formData.instagramUrl && (
                    <span className="px-2 py-1 rounded-lg bg-pink-50 text-pink-700 text-[10px] font-bold flex items-center gap-1 border border-pink-100">
                      <Instagram className="w-3 h-3" /> Instagram
                    </span>
                  )}
                  {formData.facebookUrl && (
                    <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center gap-1 border border-blue-100">
                      <Facebook className="w-3 h-3" /> Facebook
                    </span>
                  )}
                  {formData.youtubeUrl && (
                    <span className="px-2 py-1 rounded-lg bg-red-50 text-red-700 text-[10px] font-bold flex items-center gap-1 border border-red-100">
                      <Youtube className="w-3 h-3" /> YouTube
                    </span>
                  )}
                  {formData.linkedinUrl && (
                    <span className="px-2 py-1 rounded-lg bg-sky-50 text-sky-700 text-[10px] font-bold flex items-center gap-1 border border-sky-100">
                      <Linkedin className="w-3 h-3" /> LinkedIn
                    </span>
                  )}
                  {formData.xUrl && (
                    <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-bold flex items-center gap-1 border border-slate-200">
                      <Twitter className="w-3 h-3" /> X
                    </span>
                  )}
                  {formData.githubUrl && (
                    <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-bold flex items-center gap-1 border border-slate-200">
                      <Github className="w-3 h-3" /> GitHub
                    </span>
                  )}
                  {formData.redditUrl && (
                    <span className="px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-[10px] font-bold flex items-center gap-1 border border-orange-100">
                      <RedditIcon className="w-3 h-3" /> Reddit
                    </span>
                  )}
                  {formData.telegramUrl && (
                    <span className="px-2 py-1 rounded-lg bg-sky-50 text-sky-600 text-[10px] font-bold flex items-center gap-1 border border-sky-100">
                      <TelegramIcon className="w-3 h-3" /> Telegram
                    </span>
                  )}
                  {formData.discordUrl?.trim() ? (
                    <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-bold flex items-center gap-1 border border-indigo-100">
                      <DiscordIcon className="w-3 h-3" /> Discord (Active)
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-semibold flex items-center gap-1 border border-slate-200 line-through">
                      Discord (Hidden)
                    </span>
                  )}
                </div>
              </div>

              {formData.updatedAt && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Last Persisted:
                  </span>
                  <span className="font-mono">{new Date(formData.updatedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* ══ AUDIT TRAIL ══ */}
          <div className="bg-white p-4 rounded-2xl border border-[#F1F5F9] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4A7B5B]" />
                <h4 className="text-xs font-bold text-[#2D5A3C]">Governance Audit Trail</h4>
              </div>
              <button
                type="button"
                onClick={() => refetchAudit()}
                className="text-[10px] text-[#4A7B5B] font-bold hover:underline"
              >
                Refresh
              </button>
            </div>

            {relevantAuditLogs.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-3 text-center">
                No recent setting audit records found.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {relevantAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#2D5A3C]">{log.key || log.module}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {log.userName || "System Administrator"}
                      </span>
                      <span className="font-mono text-[9px] text-slate-400">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
