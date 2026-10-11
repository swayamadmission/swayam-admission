import React, { useState, useEffect } from "react";
import { X, Star, User, GraduationCap, Building2, MapPin, Image, CheckCircle2 } from "lucide-react";
import { TestimonialDto } from "../../api/testimonials.api";

interface TestimonialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TestimonialDto) => void;
  initialData?: TestimonialDto | null;
  isLoading?: boolean;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi NCR", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export default function TestimonialFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}: TestimonialFormModalProps) {
  const [form, setForm] = useState<TestimonialDto>({
    name: "",
    role: "Student",
    course: "",
    college: "",
    state: "",
    text: "",
    rating: 5,
    image: "",
    videoUrl: "",
    featured: false,
    isVerified: true,
    status: "PUBLISHED",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        rating: initialData.rating ?? 5,
        status: initialData.status ?? "PUBLISHED",
        featured: Boolean(initialData.featured),
        isVerified: initialData.isVerified ?? true,
      });
    } else {
      setForm({
        name: "",
        role: "Student",
        course: "",
        college: "",
        state: "",
        text: "",
        rating: 5,
        image: "",
        videoUrl: "",
        featured: false,
        isVerified: true,
        status: "PUBLISHED",
      });
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.text.trim()) return;

    onSubmit({
      ...form,
      name: form.name.trim(),
      course: form.course?.trim() || undefined,
      college: form.college?.trim() || undefined,
      state: form.state?.trim() || undefined,
      text: form.text.trim(),
      image: form.image?.trim() || undefined,
      videoUrl: form.videoUrl?.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-[#4A7B5B] rounded-xl">
              <Star size={20} className="fill-[#4A7B5B]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {initialData ? "Edit Success Story" : "Add Student Success Story"}
              </h2>
              <p className="text-xs text-gray-500">
                Verified Student Testimonial & Placement Outcome Management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Student Name *
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g., Rahul Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Student State *
              </label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  list="states-list"
                  placeholder="e.g., Bihar, Uttar Pradesh"
                  value={form.state || ""}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20"
                />
                <datalist id="states-list">
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Course Enrolled
              </label>
              <div className="relative">
                <GraduationCap size={15} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g., B.Tech – Computer Science"
                  value={form.course || ""}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                College / University
              </label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g., Delhi Technological University (DTU)"
                  value={form.college || ""}
                  onChange={(e) => setForm({ ...form, college: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Testimonial / Success Story *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Share student's genuine journey, counselor experience, and admission outcome..."
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Rating (1 - 5 Stars)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setForm({ ...form, rating: star })}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      size={20}
                      className={
                        (form.rating ?? 5) >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }
                    />
                  </button>
                ))}
                <span className="font-bold text-gray-700 ml-2">
                  {form.rating ?? 5} / 5
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Publication Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20"
              >
                <option value="PUBLISHED">Published (Live on Home Page)</option>
                <option value="DRAFT">Draft (Hidden)</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Profile Photo URL (Optional)
              </label>
              <div className="relative">
                <Image size={15} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={form.image || ""}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-5">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className="w-4 h-4 text-[#4A7B5B] rounded border-gray-300 focus:ring-[#4A7B5B]"
                />
                Featured on Top
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isVerified}
                  onChange={(e) => setForm({ ...form, isVerified: e.target.checked })}
                  className="w-4 h-4 text-[#4A7B5B] rounded border-gray-300 focus:ring-[#4A7B5B]"
                />
                Verified Student
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onSubmit({ ...form, status: "DRAFT" })}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-[#4A7B5B] hover:bg-[#3d694d] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              {isLoading ? "Saving..." : initialData ? "Update Story" : "Publish Story"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
