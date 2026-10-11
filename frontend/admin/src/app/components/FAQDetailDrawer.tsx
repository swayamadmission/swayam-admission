import React, { useState } from "react";
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
  CheckCircle2,
  Clock,
  Send,
  Archive,
  User,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { faqsApi } from "../../api/faqs.api";

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

  const queryClient = useQueryClient();
  const [staffAnswer, setStaffAnswer] = useState(faq.answer || "");
  const [isEditingAnswer, setIsEditingAnswer] = useState(false);

  const invalidateFaqs = () => {
    queryClient.invalidateQueries({ queryKey: ["admin_faqs"] });
    queryClient.invalidateQueries({ queryKey: ["admin_faq_stats"] });
    queryClient.invalidateQueries({ queryKey: ["public_faqs"] });
  };

  const publishMutation = useMutation({
    mutationFn: () => faqsApi.publish(faq.id),
    onSuccess: () => {
      toast.success("FAQ published successfully! It is now live for students.");
      invalidateFaqs();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to publish FAQ");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => faqsApi.unpublish(faq.id),
    onSuccess: () => {
      toast.success("FAQ unpublished and moved to Draft state.");
      invalidateFaqs();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to unpublish FAQ");
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: () => faqsApi.submitForReview(faq.id),
    onSuccess: () => {
      toast.success("FAQ submitted for editorial review.");
      invalidateFaqs();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to submit for review");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => faqsApi.archive(faq.id),
    onSuccess: () => {
      toast.success("FAQ archived successfully.");
      invalidateFaqs();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to archive FAQ");
    },
  });

  const answerMutation = useMutation({
    mutationFn: (data: { answer: string; submitForReview?: boolean; publishNow?: boolean }) =>
      faqsApi.answerQuestion(faq.id, data),
    onSuccess: (res: any, vars) => {
      if (vars.publishNow) {
        toast.success("Staff answer saved and FAQ published live!");
      } else if (vars.submitForReview) {
        toast.success("Staff answer submitted for review!");
      } else {
        toast.success("Draft answer saved successfully.");
      }
      setIsEditingAnswer(false);
      invalidateFaqs();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to save staff answer");
    },
  });

  const totalVotes = (faq.helpfulCount || 0) + (faq.notHelpfulCount || 0);
  const helpfulPercent =
    totalVotes > 0
      ? Math.round(((faq.helpfulCount || 0) / totalVotes) * 100)
      : 100;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1">
            <CheckCircle2 size={12} /> Published
          </span>
        );
      case "PENDING_REVIEW":
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold inline-flex items-center gap-1">
            <Clock size={12} /> Pending Review
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold inline-flex items-center gap-1">
            <Archive size={12} /> Archived
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1">
            Draft
          </span>
        );
    }
  };

  const isPendingWorkflow =
    publishMutation.isPending ||
    unpublishMutation.isPending ||
    submitReviewMutation.isPending ||
    archiveMutation.isPending ||
    answerMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-[#4A7B5B] rounded-xl">
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">FAQ Item Inspector & Staff Workflow</h2>
              <p className="text-xs text-gray-500">
                Knowledge Base Editorial & Staff Answering Center
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(faq)}
              className="px-3.5 py-2 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Edit size={14} /> Full Edit
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
          {/* Status & Quick Workflow Action Bar */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium text-xs">Status:</span>
              {getStatusBadge(faq.status)}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {faq.status === "DRAFT" && (
                <>
                  <button
                    type="button"
                    onClick={() => submitReviewMutation.mutate()}
                    disabled={isPendingWorkflow}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    <Send size={12} /> Submit for Review
                  </button>
                  <button
                    type="button"
                    onClick={() => publishMutation.mutate()}
                    disabled={isPendingWorkflow}
                    className="px-3 py-1.5 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle2 size={12} /> Publish Live
                  </button>
                </>
              )}

              {faq.status === "PENDING_REVIEW" && (
                <>
                  <button
                    type="button"
                    onClick={() => publishMutation.mutate()}
                    disabled={isPendingWorkflow}
                    className="px-3 py-1.5 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle2 size={12} /> Approve & Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => unpublishMutation.mutate()}
                    disabled={isPendingWorkflow}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    Return to Draft
                  </button>
                </>
              )}

              {faq.status === "PUBLISHED" && (
                <>
                  <button
                    type="button"
                    onClick={() => unpublishMutation.mutate()}
                    disabled={isPendingWorkflow}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    Unpublish to Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => archiveMutation.mutate()}
                    disabled={isPendingWorkflow}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    <Archive size={12} /> Archive
                  </button>
                </>
              )}

              {faq.status === "ARCHIVED" && (
                <button
                  type="button"
                  onClick={() => unpublishMutation.mutate()}
                  disabled={isPendingWorkflow}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Restore to Draft
                </button>
              )}
            </div>
          </div>

          {/* Question & Answer Card */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
            <div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-[#4A7B5B] text-[10px] font-bold uppercase">
                {faq.category || "General"}
              </span>
              <h3 className="text-base font-extrabold text-gray-900 mt-1.5">
                {faq.question}
              </h3>
            </div>

            {/* Answer Display or Staff Editor */}
            {!isEditingAnswer ? (
              <div className="space-y-2">
                <div className="text-gray-700 leading-relaxed bg-white p-3.5 rounded-xl border border-gray-200">
                  {faq.answer || <span className="text-gray-400 italic">No answer provided yet.</span>}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setStaffAnswer(faq.answer || "");
                      setIsEditingAnswer(true);
                    }}
                    className="px-3 py-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Edit size={12} /> Write / Update Staff Answer
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-white p-4 rounded-xl border border-[#4A7B5B]/30 shadow-xs">
                <label className="block text-xs font-bold text-gray-800">
                  Staff / Counselor Answer
                </label>
                <textarea
                  rows={5}
                  value={staffAnswer}
                  onChange={(e) => setStaffAnswer(e.target.value)}
                  placeholder="Provide a clear, accurate, and helpful response for students..."
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-[#4A7B5B]"
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsEditingAnswer(false)}
                    className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isPendingWorkflow || !staffAnswer.trim()}
                      onClick={() =>
                        answerMutation.mutate({ answer: staffAnswer, submitForReview: false })
                      }
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Save Draft Answer
                    </button>
                    <button
                      type="button"
                      disabled={isPendingWorkflow || !staffAnswer.trim()}
                      onClick={() =>
                        answerMutation.mutate({ answer: staffAnswer, submitForReview: true })
                      }
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Submit for Review
                    </button>
                    <button
                      type="button"
                      disabled={isPendingWorkflow || !staffAnswer.trim()}
                      onClick={() =>
                        answerMutation.mutate({ answer: staffAnswer, publishNow: true })
                      }
                      className="px-3 py-1.5 bg-[#4A7B5B] hover:bg-[#3d674c] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Publish Live
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata & Audit Trail */}
            <div className="pt-2 border-t border-gray-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-500 text-[11px]">
              <div>
                <span className="text-gray-400 block text-[10px]">Author:</span>
                <span className="font-semibold text-gray-700">{faq.createdBy || "Platform Staff"}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Last Updated By:</span>
                <span className="font-semibold text-gray-700">{faq.updatedBy || "Platform Staff"}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Created Date:</span>
                <span>{faq.createdAt ? new Date(faq.createdAt).toLocaleDateString() : "N/A"}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Published Date:</span>
                <span>{faq.publishedAt ? new Date(faq.publishedAt).toLocaleDateString() : "Not Published"}</span>
              </div>
            </div>
          </div>

          {/* Analytics Cards */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-xs">
              <Eye size={15} className="text-[#4A7B5B]" /> Engagement & Student Feedback Metrics
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
                <div className="text-base font-extrabold text-[#4A7B5B] mt-0.5">
                  {helpfulPercent}%
                </div>
              </div>
            </div>
          </div>

          {/* AI & GEO Summary */}
          {faq.aiSummary && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-1">
              <div className="font-bold text-[#4A7B5B] flex items-center gap-1.5">
                <Sparkles size={15} className="text-[#4A7B5B]" /> AI Answer Summary
              </div>
              <p className="text-emerald-900 text-xs leading-relaxed">
                {faq.aiSummary}
              </p>
            </div>
          )}

          {/* Linked Knowledge Graph Entities */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-xs">
              <Layers size={15} className="text-[#4A7B5B]" /> Linked Knowledge Graph Entities
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
