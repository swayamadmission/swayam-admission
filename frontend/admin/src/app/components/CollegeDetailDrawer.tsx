import React from "react";
import { X, MapPin, Building, Globe, Star, Users, Phone, Mail, FileText, CheckCircle2 } from "lucide-react";
import { College } from "../../api/colleges.api";

interface CollegeDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  college: College | null;
  onEdit: (college: College) => void;
}

export default function CollegeDetailDrawer({ isOpen, onClose, college, onEdit }: CollegeDetailDrawerProps) {
  if (!isOpen || !college) return null;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} 
        onClick={onClose} 
      />
      <div 
        className={`fixed inset-y-0 right-0 w-full max-w-md md:max-w-xl bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="h-48 relative shrink-0">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: college.banner ? `url(${college.banner})` : 'linear-gradient(135deg, #E8F3EC, #D1FAE5)',
              backgroundColor: "#E8F3EC"
            }}
          >
            <div className="absolute inset-0 bg-black/30" />
          </div>
          
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute -bottom-10 left-6 flex items-end gap-4">
            <div className="w-24 h-24 rounded-2xl bg-white shadow-lg p-2 flex items-center justify-center border-4 border-white overflow-hidden">
              {college.logo ? (
                <img src={college.logo} alt={college.name} className="w-full h-full object-contain" />
              ) : (
                <Building className="w-10 h-10 text-[#4A7B5B]" />
              )}
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-white mb-1 drop-shadow-md">{college.name}</h2>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <MapPin className="w-4 h-4" /> {college.city}, {college.state}
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-end p-4 border-b border-[#F1F5F9] mt-6 gap-3 shrink-0">
          <button 
            onClick={() => { onClose(); onEdit(college); }}
            className="px-4 py-2 rounded-xl text-sm font-medium" 
            style={{ background: "#E8F3EC", color: "#4A7B5B" }}
          >
            Edit College
          </button>
          <a href={college.website} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl text-sm font-medium border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]">
            Visit Website
          </a>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#F8FAFC]">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#F1F5F9]">
              <div className="text-xs text-[#94A3B8] font-medium mb-1">Established</div>
              <div className="text-sm font-semibold text-[#0F172A]">{college.establishedYear || 'N/A'}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#F1F5F9]">
              <div className="text-xs text-[#94A3B8] font-medium mb-1">Ownership</div>
              <div className="text-sm font-semibold text-[#0F172A] capitalize">{college.ownership?.toLowerCase() || 'N/A'}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#F1F5F9]">
              <div className="text-xs text-[#94A3B8] font-medium mb-1">Type</div>
              <div className="text-sm font-semibold text-[#0F172A] capitalize">{college.type?.toLowerCase() || 'N/A'}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#F1F5F9]">
              <div className="text-xs text-[#94A3B8] font-medium mb-1">NAAC Grade</div>
              <div className="text-sm font-semibold text-[#0F172A]">{college.naacGrade || 'N/A'}</div>
            </div>
          </div>

          {/* Description */}
          {college.shortDescription && (
            <div className="bg-white p-5 rounded-2xl border border-[#F1F5F9]">
              <h3 className="text-sm font-semibold text-[#0F172A] mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#4A7B5B]" /> Overview
              </h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                {college.shortDescription}
              </p>
            </div>
          )}

          {/* Contact Details */}
          <div className="bg-white p-5 rounded-2xl border border-[#F1F5F9]">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#4A7B5B]" /> Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4">
              <div className="flex items-center gap-2 text-sm text-[#475569]">
                <Mail className="w-4 h-4 text-[#94A3B8]" />
                <span className="truncate">{college.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#475569]">
                <Phone className="w-4 h-4 text-[#94A3B8]" />
                <span>{college.phone || 'N/A'}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-[#475569] md:col-span-2">
                <MapPin className="w-4 h-4 text-[#94A3B8] mt-0.5 shrink-0" />
                <span>{college.address || 'Address not provided'}, {college.city}, {college.state} {college.pincode}</span>
              </div>
            </div>
          </div>

          {/* Approvals */}
          {college.approvals && college.approvals.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-[#F1F5F9]">
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4A7B5B]" /> Approvals & Accreditations
              </h3>
              <div className="flex flex-wrap gap-2">
                {college.approvals.map(a => (
                  <span key={a} className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: "#F1F5F9", color: "#475569" }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Relations Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#F1F5F9] flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#E8F3EC] flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-[#4A7B5B]" />
              </div>
              <div className="text-2xl font-bold text-[#0F172A]">{college._count?.applications || 0}</div>
              <div className="text-xs text-[#64748B] mt-1">Total Applications</div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-[#F1F5F9] flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#FEF3C7] flex items-center justify-center mb-3">
                <Star className="w-6 h-6 text-[#D97706]" />
              </div>
              <div className="text-2xl font-bold text-[#0F172A]">{college.courses?.length || 0}</div>
              <div className="text-xs text-[#64748B] mt-1">Active Courses</div>
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
}
