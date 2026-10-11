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
  const accentColor = settings.accentColor || "#F0AE1A";

  const contact1 = settings.contactNumber1 || settings.supportPhone || "6284308664";
  const contact2 = settings.contactNumber2 || "6399102731";
  const whatsappNum = settings.whatsappNumber || settings.whatsappPhone || "6284308664";
  const cleanWhatsapp = whatsappNum.replace(/\D/g, "");
  const whatsappHref = `https://wa.me/91${cleanWhatsapp.slice(-10)}`;

  const generalEmail = settings.generalEmail || "swayamadmissions@gmail.com";
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
    <footer style={{ backgroundColor: primaryColor }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src={settings.logo || logoImg}
                alt={brandName}
                className="h-9 w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>{brandName}</div>
                <div style={{ fontSize: "10px", color: accentColor, fontWeight: 600 }}>{mainTagline}</div>
              </div>
            </div>
            <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.7 }} className="mb-2">
              {brandPromise}. Connecting students across India with accredited colleges, scholarships, and verified counseling.
            </p>
            <p style={{ fontSize: "11px", color: "#cbd5e1" }} className="mb-5">
              {settings.primaryAudience || "Students seeking admission guidance across India."}
            </p>

            {/* Social Icons — dynamic & hides blank optional links (e.g. Discord) */}
            <div className="flex flex-wrap gap-2">
              {socialLinks.map(({ name, url, icon: Icon }) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  title={name}
                  className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/25 transition-colors text-white"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "16px" }}>
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "Home", href: "/" },
                { label: "Courses", href: "/courses" },
                { label: "Colleges", href: "/colleges" },
                { label: "Study Materials", href: "/study-materials" },
                { label: "Top States", href: "/states" },
                { label: "AI Counselor", href: "/ai-counselor" },
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
                    className="flex items-center gap-2 hover:text-white transition-colors"
                    style={{ fontSize: "12px", color: "#cbd5e1" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Courses */}
          <div>
            <h4 style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "16px" }}>
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
                    className="flex items-center gap-2 hover:text-white transition-colors"
                    style={{ fontSize: "12px", color: "#cbd5e1" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>
                Contact Us
              </h4>
              <Link
                to="/contact"
                className="hover:underline flex items-center gap-1 text-[11px] transition-colors"
                style={{ color: accentColor }}
              >
                Helpdesk & Form →
              </Link>
            </div>
            <div className="space-y-3 mb-5">
              {/* Phone 1 & 2 */}
              <a
                href={`tel:${contact1}`}
                className="flex items-center gap-3 hover:text-white transition-colors"
                style={{ fontSize: "12px", color: "#cbd5e1" }}
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Phone size={13} className="text-white" />
                </div>
                <span>+91 {contact1}</span>
              </a>

              {contact2 && (
                <a
                  href={`tel:${contact2}`}
                  className="flex items-center gap-3 hover:text-white transition-colors"
                  style={{ fontSize: "12px", color: "#cbd5e1" }}
                >
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <Phone size={13} className="text-white" />
                  </div>
                  <span>+91 {contact2}</span>
                </a>
              )}

              {/* Support & Admission Emails */}
              <a
                href={`mailto:${supportEmail}`}
                className="flex items-center gap-3 hover:text-white transition-colors"
                style={{ fontSize: "12px", color: "#cbd5e1" }}
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Mail size={13} className="text-white" />
                </div>
                <span className="truncate">{supportEmail}</span>
              </a>

              <a
                href={`mailto:${admissionEmail}`}
                className="flex items-center gap-3 hover:text-white transition-colors"
                style={{ fontSize: "12px", color: "#cbd5e1" }}
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Mail size={13} className="text-white" />
                </div>
                <span className="truncate">{admissionEmail}</span>
              </a>

              {/* Address */}
              <div
                className="flex items-center gap-3"
                style={{ fontSize: "12px", color: "#cbd5e1" }}
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <MapPin size={13} className="text-white" />
                </div>
                <span>{settings.address || "New Delhi, India"}</span>
              </div>
            </div>

            {/* WhatsApp CTA with official format */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 bg-[#25D366] text-white rounded-xl text-sm hover:bg-[#1ebe5d] transition-colors shadow-sm"
              style={{ fontWeight: 600 }}
            >
              <MessageCircle size={15} /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p style={{ fontSize: "11px", color: "#cbd5e1" }}>
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              to="/terms"
              style={{ fontSize: "11px", color: "#cbd5e1" }}
              className="hover:text-white transition-colors"
            >
              Terms & Conditions
            </Link>
            <Link
              to="/privacy"
              style={{ fontSize: "11px", color: "#cbd5e1" }}
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/refund"
              style={{ fontSize: "11px", color: "#cbd5e1" }}
              className="hover:text-white transition-colors"
            >
              Refund Policy
            </Link>
            <Link
              to="/policies/grievance-redressal-policy"
              style={{ fontSize: "11px", color: "#cbd5e1" }}
              className="hover:text-white transition-colors"
            >
              Grievance Redressal
            </Link>
            <Link
              to="/policies"
              style={{ fontSize: "11px", color: accentColor, fontWeight: 600 }}
              className="hover:underline transition-colors"
            >
              All Policies →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
