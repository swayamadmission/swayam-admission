import React from "react";
import { Link } from "react-router";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  Github,
  ArrowRight,
} from "lucide-react";
import logoImg from "../../assets/SA_logo-removebg-preview.png";
import { usePublicSettings } from "../../context/PublicSettingsContext";

// Clean custom SVG icons for platforms not built into lucide
function RedditIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.56 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.703zM9.25 12C8.56 12 8 12.56 8 13.25c0 .688.56 1.25 1.25 1.25.688 0 1.25-.562 1.25-1.25 0-.69-.562-1.25-1.25-1.25zm5.5 0c-.69 0-1.25.56-1.25 1.25 0 .688.56 1.25 1.25 1.25.688 0 1.25-.562 1.25-1.25 0-.69-.562-1.25-1.25-1.25zm-5.465 4.015a.51.51 0 0 0-.094.708c.573.743 1.62 1.152 2.809 1.152 1.189 0 2.236-.409 2.809-1.152a.512.512 0 0 0-.094-.708.513.513 0 0 0-.71.094c-.42.544-1.196.844-2.005.844-.809 0-1.585-.3-2.005-.844a.513.513 0 0 0-.71-.094z" />
    </svg>
  );
}

function TelegramIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.939z" />
    </svg>
  );
}

function DiscordIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function Footer() {
  const { settings } = usePublicSettings();

  const brandName = settings.brandName || settings.platformName || "Swayam Admission";
  const mainTagline = settings.mainTagline || settings.tagline || "India Ka Mission Swayam Admission";
  const brandPromise = settings.brandPromise || "Your Trusted Education Partner";
  const primaryColor = settings.primaryColor || "#4A7B5B";

  const contact1 = settings.contactNumber1 || settings.supportPhone || "6284308664";
  const contact2 = settings.contactNumber2 || "6399102731";
  const whatsappNum = settings.whatsappNumber || settings.whatsappPhone || "6284308664";
  const cleanWhatsapp = whatsappNum.replace(/\D/g, "");
  const whatsappHref = `https://wa.me/91${cleanWhatsapp.slice(-10)}`;

  const supportEmail = settings.supportEmail || "support@swayamadmision.com";
  const admissionEmail = settings.admissionEmail || "getadmission@swayamadmission.com";

  // Build social list dynamically. If URL is blank/missing, it is excluded automatically.
  const telegramHref = settings.social?.telegram
    ? settings.social.telegram.startsWith("http")
      ? settings.social.telegram
      : `https://t.me/${settings.social.telegram.replace(/^@/, "")}`
    : "";

  const socialLinks = [
    { name: "Instagram", url: settings.social?.instagram, icon: Instagram },
    { name: "Facebook", url: settings.social?.facebook, icon: Facebook },
    { name: "YouTube", url: settings.social?.youtube, icon: Youtube },
    { name: "LinkedIn", url: settings.social?.linkedin, icon: Linkedin },
    { name: "X", url: settings.social?.x, icon: Twitter },
    { name: "GitHub", url: settings.social?.github, icon: Github },
    { name: "Reddit", url: settings.social?.reddit, icon: RedditIcon },
    { name: "Telegram", url: telegramHref, icon: TelegramIcon },
    { name: "Discord", url: settings.social?.discord, icon: DiscordIcon },
  ].filter((item) => item.url && item.url.trim().length > 0);

  return (
    <footer
      className="relative overflow-hidden border-t border-slate-200/80"
      style={{ backgroundColor: "#F6F7F9" }}
    >
      {/* Decorative Brand #4A7B5B Grainy Horizon Waves */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Soft upper #4A7B5B tint wash */}
        <div
          className="absolute inset-x-0 top-0 h-56"
          style={{
            background:
              "radial-gradient(ellipse 75% 80% at 15% 0%, rgba(74, 123, 91, 0.14) 0%, transparent 65%), radial-gradient(ellipse 65% 70% at 85% 5%, rgba(74, 123, 91, 0.10) 0%, transparent 65%)",
          }}
        />

        {/* Bottom layered #4A7B5B brand wave hills */}
        <div
          className="absolute inset-x-0 bottom-0 h-56 sm:h-72 opacity-95"
          style={{
            background:
              "radial-gradient(ellipse 65% 85% at 12% 100%, rgba(74, 123, 91, 0.62) 0%, rgba(74, 123, 91, 0.28) 45%, transparent 75%), radial-gradient(ellipse 55% 90% at 48% 100%, rgba(56, 98, 70, 0.56) 0%, rgba(74, 123, 91, 0.24) 50%, transparent 78%), radial-gradient(ellipse 60% 88% at 84% 100%, rgba(74, 123, 91, 0.60) 0%, rgba(98, 150, 116, 0.28) 45%, transparent 76%), radial-gradient(ellipse 45% 70% at 62% 72%, rgba(135, 183, 151, 0.30) 0%, transparent 70%), radial-gradient(ellipse 50% 70% at 28% 68%, rgba(74, 123, 91, 0.24) 0%, transparent 72%)",
          }}
        />

        {/* SVG flowing ridge waves in #4A7B5B shades */}
        <svg
          className="absolute inset-x-0 bottom-0 w-full h-44 sm:h-60 opacity-65 mix-blend-multiply"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="swayamFooterWave1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#87B797" stopOpacity="0.6" />
              <stop offset="35%" stopColor="#4A7B5B" stopOpacity="0.72" />
              <stop offset="70%" stopColor="#629674" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#4A7B5B" stopOpacity="0.78" />
            </linearGradient>
            <linearGradient id="swayamFooterWave2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4A7B5B" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#3B644A" stopOpacity="0.72" />
              <stop offset="75%" stopColor="#629674" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#4A7B5B" stopOpacity="0.82" />
            </linearGradient>
          </defs>
          <path
            fill="url(#swayamFooterWave1)"
            d="M0,192 C240,110 420,250 690,158 C940,72 1180,195 1440,122 L1440,320 L0,320 Z"
          />
          <path
            fill="url(#swayamFooterWave2)"
            d="M0,248 C280,175 510,285 780,210 C1020,145 1230,245 1440,188 L1440,320 L0,320 Z"
          />
        </svg>

        {/* Fine paper/film grain texture overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.14]" aria-hidden="true">
          <filter id="swayamFooterNoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#swayamFooterNoise)" />
        </svg>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10">
          {/* Left Brand Block */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
              <img
                src={settings.logo || logoImg}
                alt={brandName}
                className="h-9 w-auto"
              />
              <div>
                <div className="text-[16px] font-extrabold text-slate-900 leading-tight">
                  {brandName}
                </div>
                <div
                  className="text-[10px] font-semibold leading-tight mt-0.5"
                  style={{ color: primaryColor }}
                >
                  {mainTagline}
                </div>
              </div>
            </Link>

            <p className="text-[13px] text-slate-600 leading-relaxed max-w-xs mb-2">
              {brandPromise}. Connecting students across India with accredited colleges, scholarships, and verified counseling.
            </p>
            <p className="text-[12px] text-slate-500 max-w-xs mb-5">
              {settings.primaryAudience || "Students seeking admission guidance across India."}
            </p>

            {/* Outlined Square Social Icons */}
            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {socialLinks.map(({ name, url, icon: Icon }) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    title={name}
                    className="w-8 h-8 rounded-lg border border-slate-300/80 bg-white/80 backdrop-blur-xs flex items-center justify-center text-slate-700 hover:border-slate-900 hover:text-slate-900 hover:bg-white transition-all shadow-2xs"
                  >
                    <Icon size={14} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="text-[13px] font-bold text-slate-900 mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "Home", href: "/" },
                { label: "Courses", href: "/courses" },
                { label: "Colleges", href: "/colleges" },
                { label: "Study Materials", href: "/study-materials" },
                { label: "Top States", href: "/states" },
                { label: "Ziaf AI", href: "/ai-counselor" },
                { label: "Apply Now", href: "/apply-now" },
                { label: "Scholarships", href: "/scholarships" },
                { label: "Blogs", href: "/blogs" },
                { label: "Frequently Asked Questions", href: "/faq" },
                { label: "Contact Us", href: "/contact" },
                { label: "Careers", href: "/careers" },
                { label: "Student Dashboard", href: "/dashboard" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="group inline-flex items-center text-[13px] font-medium text-slate-600 hover:text-[#4A7B5B] active:text-[#4A7B5B] focus-visible:text-[#4A7B5B] transition-colors duration-200"
                  >
                    <ArrowRight
                      size={12}
                      strokeWidth={2.5}
                      className="w-0 opacity-0 -translate-x-1.5 mr-0 text-[#4A7B5B] group-hover:w-3.5 group-hover:opacity-100 group-hover:translate-x-0 group-hover:mr-1.5 group-active:w-3.5 group-active:opacity-100 group-active:translate-x-0 group-active:mr-1.5 group-focus-visible:w-3.5 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:mr-1.5 transition-all duration-200 shrink-0"
                    />
                    <span className="group-hover:font-semibold group-active:font-semibold transition-all duration-200">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Courses */}
          <div className="lg:col-span-3">
            <h4 className="text-[13px] font-bold text-slate-900 mb-4">
              Popular Courses
            </h4>
            <ul className="space-y-2.5">
              {[
                "B.Tech Engineering",
                "MBA Management",
                "BCA Computer Applications",
                "MCA Technology",
                "BBA Business",
                "Nursing & Paramedical",
                "Polytechnic Diploma",
                "Law (LLB / BA LLB)",
                "Hotel Management",
              ].map((c) => (
                <li key={c}>
                  <Link
                    to={`/courses?search=${encodeURIComponent(c)}`}
                    className="group inline-flex items-center text-[13px] font-medium text-slate-600 hover:text-[#4A7B5B] active:text-[#4A7B5B] focus-visible:text-[#4A7B5B] transition-colors duration-200"
                  >
                    <ArrowRight
                      size={12}
                      strokeWidth={2.5}
                      className="w-0 opacity-0 -translate-x-1.5 mr-0 text-[#4A7B5B] group-hover:w-3.5 group-hover:opacity-100 group-hover:translate-x-0 group-hover:mr-1.5 group-active:w-3.5 group-active:opacity-100 group-active:translate-x-0 group-active:mr-1.5 group-focus-visible:w-3.5 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:mr-1.5 transition-all duration-200 shrink-0"
                    />
                    <span className="group-hover:font-semibold group-active:font-semibold transition-all duration-200">
                      {c}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Us */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[13px] font-bold text-slate-900">
                Contact Us
              </h4>
              <Link
                to="/contact"
                className="group inline-flex items-center text-[12px] font-semibold transition-colors"
                style={{ color: primaryColor }}
              >
                <ArrowRight
                  size={12}
                  strokeWidth={2.5}
                  className="w-0 opacity-0 -translate-x-1.5 mr-0 group-hover:w-3 group-hover:opacity-100 group-hover:translate-x-0 group-hover:mr-1 group-active:w-3 group-active:opacity-100 group-active:translate-x-0 group-active:mr-1 transition-all duration-200 shrink-0"
                />
                <span>Helpdesk &amp; Form</span>
              </Link>
            </div>

            <div className="space-y-2.5 mb-5">
              <a
                href={`tel:${contact1}`}
                className="group flex items-center gap-2.5 text-[13px] font-medium text-slate-600 hover:text-[#4A7B5B] active:text-[#4A7B5B] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-white/85 border border-slate-200/80 group-hover:border-[#4A7B5B]/40 group-hover:text-[#4A7B5B] flex items-center justify-center shrink-0 text-slate-700 shadow-2xs transition-colors">
                  <Phone size={13} />
                </div>
                <span className="group-hover:translate-x-0.5 transition-transform duration-200">+91 {contact1}</span>
              </a>

              {contact2 && (
                <a
                  href={`tel:${contact2}`}
                  className="group flex items-center gap-2.5 text-[13px] font-medium text-slate-600 hover:text-[#4A7B5B] active:text-[#4A7B5B] transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-white/85 border border-slate-200/80 group-hover:border-[#4A7B5B]/40 group-hover:text-[#4A7B5B] flex items-center justify-center shrink-0 text-slate-700 shadow-2xs transition-colors">
                    <Phone size={13} />
                  </div>
                  <span className="group-hover:translate-x-0.5 transition-transform duration-200">+91 {contact2}</span>
                </a>
              )}

              <a
                href={`mailto:${supportEmail}`}
                className="group flex items-center gap-2.5 text-[13px] font-medium text-slate-600 hover:text-[#4A7B5B] active:text-[#4A7B5B] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-white/85 border border-slate-200/80 group-hover:border-[#4A7B5B]/40 group-hover:text-[#4A7B5B] flex items-center justify-center shrink-0 text-slate-700 shadow-2xs transition-colors">
                  <Mail size={13} />
                </div>
                <span className="truncate group-hover:translate-x-0.5 transition-transform duration-200">{supportEmail}</span>
              </a>

              <a
                href={`mailto:${admissionEmail}`}
                className="group flex items-center gap-2.5 text-[13px] font-medium text-slate-600 hover:text-[#4A7B5B] active:text-[#4A7B5B] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-white/85 border border-slate-200/80 group-hover:border-[#4A7B5B]/40 group-hover:text-[#4A7B5B] flex items-center justify-center shrink-0 text-slate-700 shadow-2xs transition-colors">
                  <Mail size={13} />
                </div>
                <span className="truncate group-hover:translate-x-0.5 transition-transform duration-200">{admissionEmail}</span>
              </a>

              <div className="flex items-center gap-2.5 text-[13px] text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-white/85 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-700 shadow-2xs">
                  <MapPin size={13} />
                </div>
                <span>{settings.address || "New Delhi, India"}</span>
              </div>
            </div>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#1ebe5d] transition-colors shadow-sm"
            >
              <MessageCircle size={15} /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-20 sm:pb-24">
        <div className="border-t border-slate-400/35 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-800/85 font-medium">
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { label: "Terms & Conditions", href: "/terms" },
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Refund Policy", href: "/refund" },
              { label: "Grievance Redressal", href: "/policies/grievance-redressal-policy" },
            ].map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="group inline-flex items-center text-xs text-slate-800/85 hover:text-[#4A7B5B] active:text-[#4A7B5B] font-medium transition-colors"
              >
                <ArrowRight
                  size={11}
                  strokeWidth={2.5}
                  className="w-0 opacity-0 -translate-x-1 mr-0 text-[#4A7B5B] group-hover:w-3 group-hover:opacity-100 group-hover:translate-x-0 group-hover:mr-1 group-active:w-3 group-active:opacity-100 group-active:translate-x-0 group-active:mr-1 transition-all duration-200 shrink-0"
                />
                <span className="group-hover:font-semibold transition-all duration-200">
                  {item.label}
                </span>
              </Link>
            ))}
            <Link
              to="/policies"
              className="group inline-flex items-center text-xs text-slate-900 hover:text-[#4A7B5B] active:text-[#4A7B5B] font-bold underline underline-offset-4 transition-colors"
            >
              <span>All Policies →</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
