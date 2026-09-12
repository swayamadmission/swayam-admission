import React from "react";
import {
  X,
  Edit,
  Globe,
  Sparkles,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Layers,
  Building2,
  GraduationCap,
  Award,
  FileText,
  BookOpen,
} from "lucide-react";

interface FAQDetailDrawerProps {
  faq: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (faq: any) => void;
}

export default function FAQDetailDrawer({
  faq,
  isOpen,
  onClose,
  onEdit,
}: FAQDetailDrawerProps) {
  if (!isOpen || !faq) return null;

  const totalVotes = (faq.helpfulCount || 0) + (faq.notHelpfulCount || 0);
  const helpfulPercent =
    totalVotes > 0
      ? Math.round(((faq.helpfulCount || 0) / totalVotes) * 100)
      : 100;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">FAQ Item Inspector</h2>
              <p className="text-xs text-gray-500">
                Knowledge Base Analytics & Entity Relations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(faq)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Edit size={14} /> Edit FAQ
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Question & Answer */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
            <div>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                {faq.category || "General"}
              </span>
              <h3 className="text-base font-extrabold text-gray-900 mt-1.5">
                {faq.question}
              </h3>
            </div>
            <div className="text-gray-700 leading-relaxed bg-white p-3.5 rounded-xl border border-gray-200">
              {faq.answer}
            </div>
            <div className="flex items-center gap-3 text-gray-400 text-[11px]">
              <span>Slug: /faq/{faq.slug}</span>
              <span>•</span>
              <span>Status: {faq.status}</span>
            </div>
          </div>

          {/* Analytics Cards */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-xs">
              <Eye size={15} className="text-blue-600" /> Engagement & Feedback Metrics
            </h4>
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs">
                <div className="text-gray-400 text-[10px]">Total Views</div>
                <div className="text-base font-extrabold text-gray-900 mt-0.5">
                  {(faq.views || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs">
                <div className="text-gray-400 text-[10px]">Helpful Votes</div>
                <div className="text-base font-extrabold text-emerald-600 mt-0.5 flex items-center gap-1">
                  <ThumbsUp size={14} /> {faq.helpfulCount || 0}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs">
                <div className="text-gray-400 text-[10px]">Unhelpful Votes</div>
                <div className="text-base font-extrabold text-red-500 mt-0.5 flex items-center gap-1">
                  <ThumbsDown size={14} /> {faq.notHelpfulCount || 0}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs">
                <div className="text-gray-400 text-[10px]">Satisfaction</div>
                <div className="text-base font-extrabold text-purple-600 mt-0.5">
                  {helpfulPercent}%
                </div>
              </div>
            </div>
          </div>

          {/* AI & GEO Summary */}
          {faq.aiSummary && (
            <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-1">
              <div className="font-bold text-purple-900 flex items-center gap-1.5">
                <Sparkles size={15} className="text-purple-600" /> AI Answer Summary
              </div>
              <p className="text-purple-800 text-xs leading-relaxed">
                {faq.aiSummary}
              </p>
            </div>
          )}

          {/* Linked Knowledge Graph Entities */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-xs">
              <Layers size={15} className="text-blue-600" /> Linked Knowledge Graph Entities
            </h4>
            <div className="space-y-2">
              {faq.college ? (
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-gray-800">
                    <Building2 size={15} className="text-blue-600" /> College: {faq.college.name}
                  </span>
                  <span className="text-gray-400 text-[10px]">{faq.college.slug}</span>
                </div>
              ) : null}

              {faq.course ? (
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-gray-800">
                    <GraduationCap size={15} className="text-purple-600" /> Course: {faq.course.name}
                  </span>
                  <span className="text-gray-400 text-[10px]">{faq.course.slug}</span>
                </div>
              ) : null}

              {faq.exam ? (
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-gray-800">
                    <Award size={15} className="text-amber-600" /> Exam: {faq.exam.examName}
                  </span>
                  <span className="text-gray-400 text-[10px]">{faq.exam.slug}</span>
                </div>
              ) : null}

              {faq.scholarship ? (
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-gray-800">
                    <FileText size={15} className="text-emerald-600" /> Scholarship: {faq.scholarship.scholarshipName}
                  </span>
                  <span className="text-gray-400 text-[10px]">{faq.scholarship.slug}</span>
                </div>
              ) : null}

              {!faq.college && !faq.course && !faq.exam && !faq.scholarship && !faq.blog && (
                <div className="p-3 text-center text-gray-400 bg-gray-50 rounded-xl">
                  No linked entities. (Global Platform FAQ)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
