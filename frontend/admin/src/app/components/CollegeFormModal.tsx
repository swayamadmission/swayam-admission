import React, { useState, useEffect } from "react";
import { X, Save, Upload, MapPin, Building, Globe, ShieldCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collegesApi, College } from "../../api/colleges.api";

interface CollegeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  college?: College | null;
}

export default function CollegeFormModal({ isOpen, onClose, college }: CollegeFormModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<College>>({});

  useEffect(() => {
    if (college) {
      setFormData({
        ...college,
        approvals: college.approvals || [],
      });
    } else {
      setFormData({
        status: "DRAFT",
        type: "PRIVATE",
        ownership: "PRIVATE",
        approvals: [],
        featured: false,
      });
    }
  }, [college, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: Partial<College>) => {
      if (college?.id) {
        return collegesApi.update(college.id, data);
      }
      return collegesApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_colleges"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      onClose();
    },
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: value === "" ? undefined : Number(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#F1F5F9]">
          <h2 className="text-xl font-semibold text-[#0F172A]">
            {college ? "Edit College" : "Add New College"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F1F5F9] text-[#64748B]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#F8FAFC]">
          <form id="collegeForm" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Basic Info */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                <Building className="w-4 h-4 text-[#4A7B5B]" /> Basic Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">College Name *</label>
                  <input required name="name" value={formData.name || ""} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] outline-none text-sm" placeholder="e.g. Indian Institute of Technology" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Established Year</label>
                  <input type="number" name="establishedYear" value={formData.establishedYear || ""} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] outline-none text-sm" placeholder="e.g. 1951" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Ownership</label>
                  <select name="ownership" value={formData.ownership || "PRIVATE"} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] bg-white focus:border-[#4A7B5B] outline-none text-sm">
                    <option value="PRIVATE">Private</option>
                    <option value="GOVERNMENT">Government</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Type</label>
                  <select name="type" value={formData.type || "PRIVATE"} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] bg-white focus:border-[#4A7B5B] outline-none text-sm">
                    <option value="PRIVATE">Private</option>
                    <option value="DEEMED">Deemed</option>
                    <option value="AUTONOMOUS">Autonomous</option>
                    <option value="GOVERNMENT">Government</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Short Description</label>
                <textarea name="shortDescription" value={formData.shortDescription || ""} onChange={handleChange} rows={2} className="w-full p-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] focus:ring-1 focus:ring-[#4A7B5B] outline-none text-sm" placeholder="Brief summary of the college" />
              </div>
            </div>

            {/* Location & Contact */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#4A7B5B]" /> Location & Contact
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">City *</label>
                  <input required name="city" value={formData.city || ""} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">State *</label>
                  <input required name="state" value={formData.state || ""} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Pincode</label>
                  <input name="pincode" value={formData.pincode || ""} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-[#475569] mb-1">Full Address</label>
                  <input name="address" value={formData.address || ""} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Email</label>
                  <input type="email" name="email" value={formData.email || ""} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Phone</label>
                  <input name="phone" value={formData.phone || ""} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Website</label>
                  <input name="website" value={formData.website || ""} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm" placeholder="https://" />
                </div>
              </div>
            </div>

            {/* Approval & SEO */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4A7B5B]" /> Approvals & Settings
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">University Affiliation</label>
                  <input name="university" value={formData.university || ""} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">NAAC Grade</label>
                  <input name="naacGrade" value={formData.naacGrade || ""} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm" placeholder="e.g. A++" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Approvals (comma separated)</label>
                  <input 
                    name="approvals" 
                    value={formData.approvals?.join(", ") || ""} 
                    onChange={(e) => setFormData(prev => ({ ...prev, approvals: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} 
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm" 
                    placeholder="e.g. AICTE, UGC, PCI" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Status</label>
                  <select name="status" value={formData.status || "DRAFT"} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] bg-white focus:border-[#4A7B5B] outline-none text-sm">
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-4 border-t border-[#F1F5F9]">
                <label className="flex items-center gap-2 text-sm text-[#475569] cursor-pointer">
                  <input type="checkbox" name="featured" checked={!!formData.featured} onChange={handleChange} className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]" />
                  Featured College
                </label>
                <label className="flex items-center gap-2 text-sm text-[#475569] cursor-pointer">
                  <input type="checkbox" name="verified" checked={!!formData.verified} onChange={handleChange} className="rounded text-[#4A7B5B] focus:ring-[#4A7B5B]" />
                  Verified
                </label>
              </div>
            </div>

            {/* Media */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#4A7B5B]" /> Media Links
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Logo URL</label>
                  <input name="logo" value={formData.logo || ""} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm" placeholder="https://" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Banner URL</label>
                  <input name="banner" value={formData.banner || ""} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] focus:border-[#4A7B5B] outline-none text-sm" placeholder="https://" />
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#F1F5F9] flex justify-end gap-3 bg-white">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC]">
            Cancel
          </button>
          <button type="submit" form="collegeForm" disabled={mutation.isPending} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 disabled:opacity-70 transition-colors" style={{ background: "#4A7B5B" }}>
            <Save className="w-4 h-4" /> {mutation.isPending ? "Saving..." : "Save College"}
          </button>
        </div>

      </div>
    </div>
  );
}
