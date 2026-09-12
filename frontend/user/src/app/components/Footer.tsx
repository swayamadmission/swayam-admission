import React from "react";
import { Link } from "react-router";
import { Phone, Mail, MapPin, MessageCircle, Facebook, Instagram, Youtube, Twitter } from "lucide-react";
import logoImg from "../../assets/SA_logo-removebg-preview.png";

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#0F172A" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src={logoImg} alt="Swayam Admission" className="h-9 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>Swayam Admission</div>
                <div style={{ fontSize: "9px", color: "#64748b" }}>Desh ki Shiksha</div>
              </div>
            </div>
            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.7 }} className="mb-5">
              India's trusted AI-powered admission platform. Connecting students across India with the right colleges and courses.
            </p>
            <div className="flex gap-2">
              {[Facebook, Instagram, Youtube, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-[#4A7B5B] transition-colors">
                  <Icon size={14} className="text-gray-400 hover:text-white" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "16px" }}>Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Home", href: "/" },
                { label: "Courses", href: "/courses" },
                { label: "Colleges", href: "/colleges" },
                { label: "AI Counselor", href: "/ai-counselor" },
                { label: "Apply Now", href: "/apply-now" },
                { label: "Scholarships", href: "/courses" },
                { label: "Blogs", href: "/blogs" },
                { label: "Student Dashboard", href: "/dashboard" },
              ].map(link => (
                <li key={link.label}>
                  <Link to={link.href} className="flex items-center gap-2 hover:text-[#4A7B5B] transition-colors" style={{ fontSize: "12px", color: "#94a3b8" }}>
                    <span className="w-1 h-1 rounded-full bg-[#4A7B5B]" />{link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Courses */}
          <div>
            <h4 style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "16px" }}>Popular Courses</h4>
            <ul className="space-y-2.5">
              {["B.Tech Engineering", "MBA Management", "BCA Computer", "MCA Technology", "BBA Business", "Nursing", "Polytechnic", "Law (LLB)", "Hotel Management"].map(c => (
                <li key={c}>
                  <Link to="/courses" className="flex items-center gap-2 hover:text-[#4A7B5B] transition-colors" style={{ fontSize: "12px", color: "#94a3b8" }}>
                    <span className="w-1 h-1 rounded-full bg-[#F0AE1A]" />{c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "16px" }}>Contact Us</h4>
            <div className="space-y-3 mb-5">
              {[
                { Icon: Phone, text: "+91 90000 00000", href: "tel:+919000000000" },
                { Icon: Mail, text: "info@swayamadmission.in", href: "mailto:info@swayamadmission.in" },
                { Icon: MapPin, text: "Delhi NCR, India", href: "#" },
              ].map(({ Icon, text, href }) => (
                <a key={text} href={href} className="flex items-center gap-3 hover:text-white transition-colors" style={{ fontSize: "12px", color: "#94a3b8" }}>
                  <div className="w-7 h-7 rounded-lg bg-[#4A7B5B]/20 flex items-center justify-center shrink-0">
                    <Icon size={13} className="text-[#4A7B5B]" />
                  </div>
                  {text}
                </a>
              ))}
            </div>
            <a href="https://wa.me/919000000000" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 bg-[#25D366] text-white rounded-xl text-sm hover:bg-[#1ebe5d] transition-colors"
              style={{ fontWeight: 600 }}>
              <MessageCircle size={15} /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p style={{ fontSize: "11px", color: "#475569" }}>© 2024 Swayam Admission. All rights reserved.</p>
          <div className="flex gap-5">
            {["Privacy Policy", "Terms of Service", "Refund Policy"].map(l => (
              <a key={l} href="#" style={{ fontSize: "11px", color: "#475569" }} className="hover:text-gray-300 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
