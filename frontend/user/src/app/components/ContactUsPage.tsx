import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Send,
  MessageCircle,
  Copy,
  Check,
  ShieldCheck,
  Building,
  GraduationCap,
  Headphones,
  Briefcase,
  HelpCircle,
  Wrench,
  ExternalLink,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Linkedin,
  Github,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  contactApi,
  ContactEnquirySubmission,
  DepartmentContactItem,
} from "../../api/contact.api";
import { usePublicSettings } from "../../context/PublicSettingsContext";

// Clean custom SVG icons for platforms not built into lucide
function RedditIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.56 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.703zM9.25 12C8.56 12 8 12.56 8 13.25c0 .688.56 1.25 1.25 1.25.688 0 1.25-.562 1.25-1.25 0-.69-.562-1.25-1.25-1.25zm5.5 0c-.69 0-1.25.56-1.25 1.25 0 .688.56 1.25 1.25 1.25.688 0 1.25-.562 1.25-1.25 0-.69-.562-1.25-1.25-1.25zm-5.465 4.015a.51.51 0 0 0-.094.708c.573.743 1.62 1.152 2.809 1.152 1.189 0 2.236-.409 2.809-1.152a.512.512 0 0 0-.094-.708.513.513 0 0 0-.71.094c-.42.544-1.196.844-2.005.844-.809 0-1.585-.3-2.005-.844a.513.513 0 0 0-.71-.094z" />
    </svg>
  );
}

function TelegramIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.939z" />
    </svg>
  );
}

function DiscordIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

// Fallback departments in case of network latency
const FALLBACK_DEPARTMENTS: DepartmentContactItem[] = [
  {
    id: "fb-1",
    name: "Admissions & Counselling",
    badge: "Primary Helpline",
    description:
      "Dedicated counselor desk for NEET, JEE, CUET, Management, and state counseling. Get college recommendations, eligibility checks, and seat availability.",
    phone: "6284308664",
    whatsapp: "6284308664",
    email: "getadmission@swayamadmission.com",
    officeHours: "Mon – Sat: 9:30 AM – 6:30 PM",
    workingDays: "Monday to Saturday",
    address: "New Delhi, India",
    ctaText: "Call Now",
    ctaAction: "CALL",
    ctaUrl: "tel:6284308664",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "fb-2",
    name: "General Enquiries",
    badge: "Email & Desk",
    description:
      "Parent queries, official institutional verifications, portal feedback, and general information regarding educational offerings and scholarships.",
    phone: "6284308664",
    whatsapp: "6284308664",
    email: "swayamadmissions@gmail.com",
    officeHours: "24/7 (Replies within 2 to 4 business hours)",
    workingDays: "Monday to Saturday",
    address: "New Delhi, India",
    ctaText: "Email Us",
    ctaAction: "EMAIL",
    ctaUrl: "mailto:swayamadmissions@gmail.com",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "fb-3",
    name: "Student Application Support",
    badge: "Form & Status Desk",
    description:
      "Direct assistance for ongoing applications, document verification, application fee confirmation, and status tracking.",
    phone: "6399102731",
    whatsapp: "6399102731",
    email: "swayamadmissions@gmail.com",
    officeHours: "Mon – Sat: 9:30 AM – 6:30 PM",
    workingDays: "Monday to Saturday",
    address: "New Delhi, India",
    ctaText: "Call Support",
    ctaAction: "CALL",
    ctaUrl: "tel:6399102731",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "fb-4",
    name: "College Partnerships & Institutional Relations",
    badge: "Partnership Desk",
    description:
      "University collaborations, college listing verifications, institutional onboarding, and official educational alliances across India.",
    phone: "6284308664",
    whatsapp: "6284308664",
    email: "swayamadmissions@gmail.com",
    officeHours: "Mon – Fri: 10:00 AM – 6:00 PM",
    workingDays: "Monday to Friday",
    address: "New Delhi, India",
    ctaText: "Partner With Us",
    ctaAction: "EMAIL",
    ctaUrl: "mailto:swayamadmissions@gmail.com",
    sortOrder: 4,
    isActive: true,
  },
  {
    id: "fb-5",
    name: "Technical & Portal Support",
    badge: "Platform & IT",
    description:
      "Assistance with login problems, OTP verification, document upload glitches, or password recovery on the Swayam Admission portal.",
    phone: "6399102731",
    whatsapp: "6399102731",
    email: "swayamadmissions@gmail.com",
    officeHours: "Mon – Sat: 10:00 AM – 7:00 PM",
    workingDays: "Monday to Saturday",
    address: "New Delhi, India",
    ctaText: "Report Issue",
    ctaAction: "EMAIL",
    ctaUrl: "mailto:swayamadmissions@gmail.com",
    sortOrder: 5,
    isActive: true,
  },
  {
    id: "fb-6",
    name: "Swayam Admission Central Office",
    badge: "Headquarters",
    description:
      "Central administrative headquarters overseeing counseling centers and partner networks nationwide.",
    phone: "6284308664",
    whatsapp: "6284308664",
    email: "swayamadmissions@gmail.com",
    officeHours: "Mon – Sat: 9:30 AM – 6:30 PM",
    workingDays: "Monday to Saturday",
    address: "New Delhi, India",
    ctaText: "Get Directions",
    ctaAction: "URL",
    ctaUrl: "https://maps.google.com/?q=New+Delhi+India",
    sortOrder: 6,
    isActive: true,
  },
];

const DEFAULT_CATEGORIES = [
  "Admission Counselling",
  "College and Course Information",
  "Application Support",
  "Payment and Fee Enquiry",
  "College Partnership",
  "Technical Support",
  "Other",
];

// Helper to pick matching department icon
function getDepartmentIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("admission") || lower.includes("counsel")) {
    return <GraduationCap size={22} />;
  }
  if (lower.includes("application")) {
    return <Headphones size={22} />;
  }
  if (lower.includes("partner") || lower.includes("college")) {
    return <Building size={22} />;
  }
  if (lower.includes("tech") || lower.includes("portal") || lower.includes("it")) {
    return <Wrench size={22} />;
  }
  if (lower.includes("office") || lower.includes("headquarter")) {
    return <MapPin size={22} />;
  }
  if (lower.includes("general") || lower.includes("enquir")) {
    return <Mail size={22} />;
  }
  return <Briefcase size={22} />;
}

export default function ContactUsPage() {
  const { settings } = usePublicSettings();

  // Branding Tokens
  const brandName = "Swayam Admission";
  const primaryColor = "#4A7B5B";
  const accentColor = "#F0AE1A";
  const bgColor = "#F8FAF9";
  const textColor = "#1F2D26";
  const mutedTextColor = "#6C7D73";

  // Fetch live backend contact directory, department contacts, and page settings
  const { data: contactData } = useQuery({
    queryKey: ["publicContactData"],
    queryFn: async () => {
      const res = await contactApi.getPublicContactData();
      return res.data;
    },
    staleTime: 60 * 1000, // 1 minute fresh cache
  });

  // Dynamic Page Settings
  const pageHeading =
    contactData?.pageSettings?.pageHeading || "Contact Swayam Admission";
  const pageSubheading =
    contactData?.pageSettings?.pageSubheading ||
    "India Ka Mission Swayam Admission — Your Trusted Education Partner. Get help with college admissions, courses, applications and counselling.";
  const helpdeskBadge =
    contactData?.pageSettings?.helpdeskBadge || "Official Swayam Admission Helpdesk";

  const businessHours = contactData?.pageSettings || {
    officeHours: "Monday – Saturday: 9:30 AM – 6:30 PM",
    workingDays: "Monday to Saturday",
    holidayNotice: "Closed on Sundays & National Holidays",
    expectedResponseTime: "Within 2 to 4 business hours",
    address: settings?.address || "New Delhi, India",
    googleMapsUrl: "",
  };

  const categories = contactData?.categories || DEFAULT_CATEGORIES;

  // Real Department Contacts from Database (fall back to preserved array if initial query pending)
  const departments: DepartmentContactItem[] =
    contactData?.departments && contactData.departments.length > 0
      ? contactData.departments
      : FALLBACK_DEPARTMENTS;

  // SEO document title
  useEffect(() => {
    document.title = `${pageHeading} | Swayam Admission Guidance & Helpline`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Official Swayam Admission contact channels, helpline numbers, admissions desk, and online enquiry submission."
      );
    }
    window.scrollTo(0, 0);
  }, [pageHeading]);

  // Form State
  const [formData, setFormData] = useState<ContactEnquirySubmission>({
    fullName: "",
    mobile: "",
    subject: "",
    category: "Admission Counselling",
    email: "",
    message: "",
    consent: false,
    department: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{
    referenceNo: string;
    message: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Client-side Validation: ONLY Full Name, Mobile, Subject, Category are mandatory
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errors.fullName = "Please enter your full name (minimum 2 characters)";
    }

    const cleanMobile = (formData.mobile || "").replace(/\D/g, "");
    if (cleanMobile.length !== 10 || !["6", "7", "8", "9"].includes(cleanMobile[0])) {
      errors.mobile = "Please enter a valid 10-digit Indian mobile number";
    }

    if (!formData.subject.trim() || formData.subject.trim().length < 3) {
      errors.subject = "Please enter a subject (minimum 3 characters)";
    }

    if (!formData.category) {
      errors.category = "Please select an enquiry category";
    }

    // Email is optional, but if provided, must be valid
    if (formData.email && formData.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = "Please enter a valid email address or leave it blank";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isSubmitting) return; // Prevent duplicate rapid submission

    if (!validateForm()) {
      toast.error("Please resolve the highlighted form errors.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: ContactEnquirySubmission = {
        fullName: formData.fullName.trim(),
        mobile: formData.mobile.replace(/\D/g, ""),
        subject: formData.subject.trim(),
        category: formData.category,
      };

      if (formData.email && formData.email.trim().length > 0) {
        payload.email = formData.email.trim().toLowerCase();
      }

      if (formData.message && formData.message.trim().length > 0) {
        payload.message = formData.message.trim();
      }

      if (formData.consent !== undefined) {
        payload.consent = formData.consent;
      }

      if (formData.department) {
        payload.department = formData.department;
      }

      const response = await contactApi.submitEnquiry(payload);

      if (response.data?.success) {
        setSubmitSuccess({
          referenceNo: response.data.referenceNo,
          message: response.data.message,
        });
        toast.success(`Enquiry submitted! Reference: ${response.data.referenceNo}`);
      } else {
        throw new Error(response.data?.message || "Failed to submit enquiry");
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to submit enquiry at this moment. Please call our helpline directly.";
      setSubmitError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    toast.success("Enquiry reference copied to clipboard");
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleResetForm = () => {
    setFormData({
      fullName: "",
      mobile: "",
      subject: "",
      category: "Admission Counselling",
      email: "",
      message: "",
      consent: false,
      department: "",
    });
    setSubmitSuccess(null);
    setSubmitError(null);
    setFormErrors({});
  };

  // Build social list from verified admin URLs
  const verifiedSocials = contactData?.socials || {};
  const socialIconsConfig: { key: string; name: string; icon: any }[] = [
    { key: "instagram", name: "Instagram", icon: Instagram },
    { key: "facebook", name: "Facebook", icon: Facebook },
    { key: "youtube", name: "YouTube", icon: Youtube },
    { key: "linkedin", name: "LinkedIn", icon: Linkedin },
    { key: "x", name: "X (Twitter)", icon: Twitter },
    { key: "github", name: "GitHub", icon: Github },
    { key: "reddit", name: "Reddit", icon: RedditIcon },
    { key: "telegram", name: "Telegram", icon: TelegramIcon },
    { key: "discord", name: "Discord", icon: DiscordIcon },
  ];

  const activeSocials = socialIconsConfig
    .filter((s) => verifiedSocials[s.key] && verifiedSocials[s.key].trim().length > 0)
    .map((s) => ({
      name: s.name,
      url: verifiedSocials[s.key],
      icon: s.icon,
    }));

  return (
    <div style={{ backgroundColor: bgColor, minHeight: "100vh", color: textColor }}>
      {/* ─── HERO HEADER ──────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b"
        style={{
          background: `linear-gradient(135deg, rgba(74, 123, 91, 0.08) 0%, rgba(240, 174, 26, 0.06) 100%)`,
          borderColor: "rgba(74, 123, 91, 0.15)",
        }}
      >
        <div className="max-w-7xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4 shadow-xs"
            style={{
              backgroundColor: "#FFFFFF",
              color: primaryColor,
              border: `1px solid rgba(74, 123, 91, 0.2)`,
            }}
          >
            <ShieldCheck size={14} style={{ color: primaryColor }} />
            <span>{helpdeskBadge}</span>
          </div>

          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4"
            style={{ color: primaryColor }}
          >
            {pageHeading}
          </h1>

          <p
            className="text-base sm:text-lg max-w-3xl mx-auto leading-relaxed"
            style={{ color: mutedTextColor }}
          >
            {pageSubheading}
          </p>

          {/* Quick Highlight Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white shadow-2xs border border-gray-100">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
              <span>Free Admission Guidance</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white shadow-2xs border border-gray-100">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
              <span>Pan-India College Network</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white shadow-2xs border border-gray-100">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
              <span>Response within 2–4 hours</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT CONTAINER ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ─── SECTION A: DIRECT DEPARTMENT CONTACTS ──────────────────────────── */}
        <section className="mb-14" aria-labelledby="department-contacts-heading">
          <div className="mb-8">
            <h2
              id="department-contacts-heading"
              className="text-2xl font-bold tracking-tight mb-2"
              style={{ color: textColor }}
            >
              Direct Department Contacts
            </h2>
            <p className="text-sm" style={{ color: mutedTextColor }}>
              Select the dedicated communication channel for your specific query to ensure swift resolution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => {
              const cleanPhone = dept.phone ? dept.phone.replace(/\D/g, "") : "";
              const cleanWhatsapp = dept.whatsapp ? dept.whatsapp.replace(/\D/g, "") : "";

              return (
                <article
                  key={dept.id}
                  className="rounded-2xl p-6 transition-all duration-200 hover:shadow-md flex flex-col justify-between"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div>
                    {/* Header: Icon + Name + Badge */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: "rgba(74, 123, 91, 0.12)",
                          color: primaryColor,
                        }}
                      >
                        {getDepartmentIcon(dept.name)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base truncate" style={{ color: textColor }}>
                          {dept.name}
                        </h3>
                        {dept.badge && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 truncate"
                            style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}
                          >
                            {dept.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description (if present) */}
                    {dept.description && (
                      <p
                        className="text-xs sm:text-sm leading-relaxed mb-4"
                        style={{ color: mutedTextColor }}
                      >
                        {dept.description}
                      </p>
                    )}

                    {/* Available details only */}
                    <div className="space-y-2 mb-6">
                      {/* Phone Number */}
                      {dept.phone && (
                        <div
                          className="flex items-center gap-2 text-sm font-semibold"
                          style={{ color: textColor }}
                        >
                          <Phone size={16} style={{ color: primaryColor }} />
                          <a href={`tel:${dept.phone}`} className="hover:underline">
                            +91 {dept.phone}
                          </a>
                        </div>
                      )}

                      {/* Email Address */}
                      {dept.email && (
                        <div
                          className="flex items-center gap-2 text-sm font-semibold truncate"
                          style={{ color: textColor }}
                        >
                          <Mail size={16} style={{ color: primaryColor }} />
                          <a
                            href={`mailto:${dept.email}`}
                            className="hover:underline truncate"
                            title={dept.email}
                          >
                            {dept.email}
                          </a>
                        </div>
                      )}

                      {/* Office Hours */}
                      {dept.officeHours && (
                        <div
                          className="flex items-center gap-2 text-xs"
                          style={{ color: mutedTextColor }}
                        >
                          <Clock size={14} />
                          <span>{dept.officeHours}</span>
                        </div>
                      )}

                      {/* Working Days */}
                      {dept.workingDays && (
                        <div
                          className="flex items-center gap-2 text-xs"
                          style={{ color: mutedTextColor }}
                        >
                          <Calendar size={14} />
                          <span>{dept.workingDays}</span>
                        </div>
                      )}

                      {/* Physical Address */}
                      {dept.address && (
                        <div
                          className="flex items-start gap-2 text-xs"
                          style={{ color: mutedTextColor }}
                        >
                          <MapPin size={14} className="shrink-0 mt-0.5" />
                          <span>{dept.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions / CTA Buttons */}
                  <div className="pt-2 border-t border-gray-100">
                    {/* If custom CTA text specified */}
                    {dept.ctaText ? (
                      <div className="w-full">
                        {dept.ctaAction === "CALL" && dept.phone ? (
                          <a
                            href={`tel:${dept.phone}`}
                            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-2xs"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Phone size={14} /> {dept.ctaText}
                          </a>
                        ) : dept.ctaAction === "WHATSAPP" && dept.whatsapp ? (
                          <a
                            href={`https://wa.me/91${cleanWhatsapp}?text=${encodeURIComponent(
                              `Hello Swayam Admission team, I would like to get assistance regarding ${dept.name}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-2xs"
                            style={{ backgroundColor: "#25D366" }}
                          >
                            <MessageCircle size={14} /> {dept.ctaText}
                          </a>
                        ) : dept.ctaAction === "EMAIL" && dept.email ? (
                          <a
                            href={`mailto:${dept.email}?subject=${encodeURIComponent(
                              `Enquiry regarding ${dept.name}`
                            )}`}
                            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-2xs"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Mail size={14} /> {dept.ctaText}
                          </a>
                        ) : (
                          <a
                            href={dept.ctaUrl || "#contact-form-section"}
                            target={dept.ctaUrl?.startsWith("http") ? "_blank" : undefined}
                            rel={dept.ctaUrl?.startsWith("http") ? "noopener noreferrer" : undefined}
                            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-2xs"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {dept.ctaText}
                          </a>
                        )}
                      </div>
                    ) : (
                      /* Standard Action Pair (Phone + WhatsApp, or Email + Call) */
                      <div className="grid grid-cols-2 gap-2">
                        {dept.phone && (
                          <a
                            href={`tel:${dept.phone}`}
                            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-2xs"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Phone size={14} /> Call Now
                          </a>
                        )}

                        {dept.whatsapp && (
                          <a
                            href={`https://wa.me/91${cleanWhatsapp}?text=${encodeURIComponent(
                              `Hello Swayam Admission team, I would like to get guidance regarding ${dept.name}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-2xs"
                            style={{ backgroundColor: "#25D366" }}
                          >
                            <MessageCircle size={14} /> WhatsApp
                          </a>
                        )}

                        {!dept.whatsapp && dept.email && (
                          <a
                            href={`mailto:${dept.email}`}
                            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors shadow-2xs"
                          >
                            <Mail size={14} /> Email Us
                          </a>
                        )}

                        {!dept.phone && !dept.whatsapp && dept.email && (
                          <a
                            href={`mailto:${dept.email}`}
                            className="col-span-2 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-2xs"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Mail size={14} /> Send Email
                          </a>
                        )}

                        {!dept.phone && !dept.whatsapp && !dept.email && dept.address && (
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(dept.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="col-span-2 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-2xs"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <MapPin size={14} /> Get Directions
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ─── SECTION B: INTERACTIVE CONTACT & ENQUIRY FORM ─────────────────── */}
        <div id="contact-form-section" className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Form Card */}
          <div className="lg:col-span-7">
            <div
              className="rounded-3xl p-6 sm:p-10 shadow-xs border"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
            >
              <div className="mb-6">
                <span
                  className="text-xs font-bold tracking-wide uppercase px-3 py-1 rounded-full mb-3 inline-block"
                  style={{ backgroundColor: "rgba(74, 123, 91, 0.12)", color: primaryColor }}
                >
                  Send An Enquiry
                </span>
                <h2 className="text-2xl font-bold" style={{ color: textColor }}>
                  How Can We Help You?
                </h2>
                <p className="text-sm mt-1" style={{ color: mutedTextColor }}>
                  Fill in your details below. Our senior counselor will connect with you via phone or WhatsApp.
                </p>
              </div>

              {/* SUCCESS STATE CARD */}
              {submitSuccess ? (
                <div
                  className="rounded-2xl p-6 sm:p-8 text-center border"
                  style={{
                    backgroundColor: "rgba(74, 123, 91, 0.04)",
                    borderColor: "rgba(74, 123, 91, 0.3)",
                  }}
                  role="status"
                >
                  <div
                    className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 shadow-xs"
                    style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
                  >
                    <CheckCircle2 size={32} />
                  </div>

                  <h3 className="text-xl font-bold mb-2" style={{ color: primaryColor }}>
                    Enquiry Submitted Successfully!
                  </h3>

                  <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                    Thank you for reaching out to {brandName}. Your enquiry has been recorded in our system
                    and routed to the academic counseling team.
                  </p>

                  <div className="bg-white p-4 rounded-xl border border-gray-200 max-w-sm mx-auto mb-6 shadow-2xs">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Your Unique Reference Number
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-lg font-bold text-gray-900 tracking-wide">
                        {submitSuccess.referenceNo}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyReference(submitSuccess.referenceNo)}
                        title="Copy Reference Number"
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                      >
                        {copiedRef ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-6">
                    Expected Response:{" "}
                    <strong className="text-gray-700">{businessHours.expectedResponseTime}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Submit Another Query
                  </button>
                </div>
              ) : (
                /* THE ACTUAL ENQUIRY FORM */
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="space-y-5"
                  aria-label="Public Contact Enquiry Form"
                >
                  {submitError && (
                    <div
                      className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3"
                      role="alert"
                    >
                      <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
                      <div>
                        <div className="font-semibold">Unable to submit enquiry</div>
                        <div>{submitError}</div>
                      </div>
                    </div>
                  )}

                  {/* Full Name & Mobile Number (Both Mandatory) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="fullName" className="block text-xs font-bold text-gray-700 mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="e.g. Aarav Sharma"
                        className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all ${
                          formErrors.fullName
                            ? "border-red-400 focus:ring-red-200"
                            : "border-gray-200 focus:border-[#4A7B5B] focus:ring-emerald-100"
                        }`}
                        aria-invalid={!!formErrors.fullName}
                        aria-describedby={formErrors.fullName ? "fullName-error" : undefined}
                      />
                      {formErrors.fullName && (
                        <p id="fullName-error" className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {formErrors.fullName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="mobile" className="block text-xs font-bold text-gray-700 mb-1.5">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-gray-400 select-none">
                          +91
                        </span>
                        <input
                          type="tel"
                          id="mobile"
                          name="mobile"
                          maxLength={10}
                          value={formData.mobile}
                          onChange={handleInputChange}
                          placeholder="9876543210"
                          className={`w-full pl-12 pr-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all ${
                            formErrors.mobile
                              ? "border-red-400 focus:ring-red-200"
                              : "border-gray-200 focus:border-[#4A7B5B] focus:ring-emerald-100"
                          }`}
                          aria-invalid={!!formErrors.mobile}
                          aria-describedby={formErrors.mobile ? "mobile-error" : undefined}
                        />
                      </div>
                      {formErrors.mobile && (
                        <p id="mobile-error" className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {formErrors.mobile}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Enquiry Category & Subject (Both Mandatory) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="category" className="block text-xs font-bold text-gray-700 mb-1.5">
                        Enquiry Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B] focus:ring-2 focus:ring-emerald-100 transition-all text-gray-800"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-xs font-bold text-gray-700 mb-1.5">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="e.g. Admission guidance for B.Tech CSE"
                        className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all ${
                          formErrors.subject
                            ? "border-red-400 focus:ring-red-200"
                            : "border-gray-200 focus:border-[#4A7B5B] focus:ring-emerald-100"
                        }`}
                        aria-invalid={!!formErrors.subject}
                        aria-describedby={formErrors.subject ? "subject-error" : undefined}
                      />
                      {formErrors.subject && (
                        <p id="subject-error" className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {formErrors.subject}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Optional Email Address */}
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-gray-700 mb-1.5">
                      Email Address <span className="text-xs font-normal text-gray-400">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="name@example.com (optional)"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all ${
                        formErrors.email
                          ? "border-red-400 focus:ring-red-200"
                          : "border-gray-200 focus:border-[#4A7B5B] focus:ring-emerald-100"
                      }`}
                      aria-invalid={!!formErrors.email}
                      aria-describedby={formErrors.email ? "email-error" : undefined}
                    />
                    {formErrors.email && (
                      <p id="email-error" className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {formErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Optional Message */}
                  <div>
                    <label htmlFor="message" className="block text-xs font-bold text-gray-700 mb-1.5">
                      Message <span className="text-xs font-normal text-gray-400">(Optional)</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Please share details such as your preferred course, state/location, qualifying scores, or specific queries..."
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#4A7B5B] focus:ring-2 focus:ring-emerald-100 transition-all"
                    />
                  </div>

                  {/* Optional Consent Checkbox */}
                  <div>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        id="consent"
                        name="consent"
                        checked={formData.consent}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#4A7B5B] focus:ring-[#4A7B5B]"
                      />
                      <span className="text-xs text-gray-600 leading-relaxed">
                        I agree to receive admission updates & call from {brandName} counselors.
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    id="btn-submit-contact-enquiry"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm text-white shadow-xs transition-all hover:opacity-95 disabled:opacity-50 cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Your Enquiry...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Submit Admission Enquiry</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Office Location, Working Hours & Verified Socials */}
          <div className="lg:col-span-5 space-y-6">
            {/* Office & Visiting Info */}
            <div
              className="rounded-3xl p-6 sm:p-8 border shadow-2xs"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
            >
              <h3 className="font-bold text-lg mb-4" style={{ color: textColor }}>
                Visiting Hours & Location
              </h3>
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: "rgba(74, 123, 91, 0.12)", color: primaryColor }}
                  >
                    <MapPin size={18} />
                  </div>
                  <div>
                    <strong className="font-semibold text-gray-900 block">Office Address</strong>
                    <p className="text-xs text-gray-600 mt-0.5">{businessHours.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: "rgba(240, 174, 26, 0.15)", color: "#D97706" }}
                  >
                    <Clock size={18} />
                  </div>
                  <div>
                    <strong className="font-semibold text-gray-900 block">Working Hours</strong>
                    <p className="text-xs text-gray-600 mt-0.5">{businessHours.officeHours}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{businessHours.workingDays}</p>
                  </div>
                </div>

                {businessHours.holidayNotice && (
                  <div className="flex items-start gap-2.5 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>{businessHours.holidayNotice}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Verified Social Media Channels */}
            <div
              className="rounded-3xl p-6 sm:p-8 border shadow-2xs"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg" style={{ color: textColor }}>
                  Official Social Channels
                </h3>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {contactData?.brand?.socialHandle || "@swayamadmission"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                Stay updated with latest cutoff announcements, scholarship alerts, and counselling guidelines through
                our verified official profiles.
              </p>

              {activeSocials.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {activeSocials.map(({ name, url, icon: Icon }) => (
                    <a
                      key={name}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-100/80 transition-colors text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      <Icon size={16} style={{ color: primaryColor }} />
                      <span className="truncate">{name}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">No social media links published yet.</div>
              )}
            </div>

            {/* Quick Link to FAQs */}
            <div
              className="rounded-3xl p-6 border shadow-2xs flex items-center justify-between"
              style={{
                backgroundColor: "rgba(74, 123, 91, 0.04)",
                borderColor: "rgba(74, 123, 91, 0.2)",
              }}
            >
              <div>
                <h4 className="font-bold text-sm text-gray-900">Have a quick question?</h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  Check our Frequently Asked Questions for instant answers.
                </p>
              </div>
              <Link
                to="/faq"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                Browse FAQs
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
