import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Building2,
  UserCheck,
  Clock,
  Filter,
  FileText,
  AlertOctagon,
  MessageSquare,
  BadgeCheck,
} from 'lucide-react';
import {
  reviewsRankingApi,
  ModerationQueueItem,
} from '../../api/reviews-ranking.api';

export const ReviewModerationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'college' | 'counselor' | 'complaints'>('college');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_MODERATION');
  const [selectedItem, setSelectedItem] = useState<ModerationQueueItem | null>(null);
  const [actionReason, setActionReason] = useState<string>('');

  // Fetch queue items
  const { data: queueRes, isLoading } = useQuery({
    queryKey: ['reviews_moderation_queue', activeTab, statusFilter],
    queryFn: () =>
      reviewsRankingApi.getModerationQueue({
        type: activeTab,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  // College Review Moderation Mutation
  const moderateCollegeMutation = useMutation({
    mutationFn: (vars: { id: string; action: 'APPROVE' | 'REJECT' | 'HIDE' | 'FLAG'; reason?: string }) =>
      reviewsRankingApi.moderateCollegeReview(vars.id, { action: vars.action, reason: vars.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews_moderation_queue'] });
      setSelectedItem(null);
      setActionReason('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Moderation action failed');
    },
  });

  // Counselor Review Moderation Mutation
  const moderateCounselorMutation = useMutation({
    mutationFn: (vars: { id: string; action: 'APPROVE' | 'REJECT' | 'HIDE' | 'FLAG'; reason?: string }) =>
      reviewsRankingApi.moderateCounselorReview(vars.id, { action: vars.action, reason: vars.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews_moderation_queue'] });
      setSelectedItem(null);
      setActionReason('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Counselor review moderation failed');
    },
  });

  const handleAction = (action: 'APPROVE' | 'REJECT' | 'HIDE' | 'FLAG') => {
    if (!selectedItem) return;
    if (activeTab === 'college') {
      moderateCollegeMutation.mutate({
        id: selectedItem.id,
        action,
        reason: actionReason.trim() || undefined,
      });
    } else if (activeTab === 'counselor') {
      moderateCounselorMutation.mutate({
        id: selectedItem.id,
        action,
        reason: actionReason.trim() || undefined,
      });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={14}
            className={s <= rating ? 'fill-[#F0AE1A] text-[#F0AE1A]' : 'text-slate-200 fill-slate-100'}
          />
        ))}
        <span className="text-xs font-bold text-slate-700 ml-1.5">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const counts = queueRes?.meta?.counts || { pending: 0, published: 0, flagged: 0, rejected: 0 };
  const items: ModerationQueueItem[] = queueRes?.data || [];

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-[#4A7B5B]" size={24} />
            <h1 className="text-2xl font-bold text-[#4A7B5B]">Review & Complaint Moderation Hub</h1>
          </div>
          <p className="text-sm text-slate-500">
            Verify student reviews, protect counseling integrity, and triage confidential student concerns.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200/60">
          <button
            onClick={() => {
              setActiveTab('college');
              setStatusFilter('PENDING_MODERATION');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'college' ? 'bg-[#4A7B5B] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={14} /> College Reviews
          </button>
          <button
            onClick={() => {
              setActiveTab('counselor');
              setStatusFilter('all');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'counselor' ? 'bg-[#4A7B5B] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck size={14} /> Counselor Feedback
          </button>
          <button
            onClick={() => {
              setActiveTab('complaints');
              setStatusFilter('all');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'complaints' ? 'bg-[#4A7B5B] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertOctagon size={14} /> Confidential Complaints
          </button>
        </div>
      </div>

      {/* Metrics Row (for College tab) */}
      {activeTab === 'college' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => setStatusFilter('PENDING_MODERATION')}
            className={`cursor-pointer bg-white p-4 rounded-xl border transition-all ${
              statusFilter === 'PENDING_MODERATION'
                ? 'border-[#4A7B5B] ring-2 ring-[#4A7B5B]/10 bg-[#E8F3EC]/30'
                : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Awaiting Review</span>
              <Clock className="text-amber-500" size={16} />
            </div>
            <div className="text-2xl font-bold text-[#4A7B5B] mt-2">{counts.pending}</div>
          </div>

          <div
            onClick={() => setStatusFilter('PUBLISHED')}
            className={`cursor-pointer bg-white p-4 rounded-xl border transition-all ${
              statusFilter === 'PUBLISHED'
                ? 'border-[#4A7B5B] ring-2 ring-[#4A7B5B]/10 bg-[#E8F3EC]/30'
                : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified & Published</span>
              <CheckCircle2 className="text-[#4A7B5B]" size={16} />
            </div>
            <div className="text-2xl font-bold text-[#4A7B5B] mt-2">{counts.published}</div>
          </div>

          <div
            onClick={() => setStatusFilter('FLAGGED')}
            className={`cursor-pointer bg-white p-4 rounded-xl border transition-all ${
              statusFilter === 'FLAGGED'
                ? 'border-amber-500 ring-2 ring-amber-500/10 bg-amber-50/30'
                : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Flagged Concerns</span>
              <AlertTriangle className="text-amber-600" size={16} />
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-2">{counts.flagged}</div>
          </div>

          <div
            onClick={() => setStatusFilter('REJECTED')}
            className={`cursor-pointer bg-white p-4 rounded-xl border transition-all ${
              statusFilter === 'REJECTED'
                ? 'border-red-500 ring-2 ring-red-500/10 bg-red-50/30'
                : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rejected</span>
              <XCircle className="text-red-500" size={16} />
            </div>
            <div className="text-2xl font-bold text-red-600 mt-2">{counts.rejected}</div>
          </div>
        </div>
      )}

      {/* Main Content Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-[#4A7B5B] text-sm">
            <Filter size={16} className="text-[#4A7B5B]" />
            {activeTab === 'college' && 'College Reviews Queue'}
            {activeTab === 'counselor' && 'Counselor Performance Reviews'}
            {activeTab === 'complaints' && 'Confidential Safety & Ethics Reports'}
          </div>
          <span className="text-xs text-slate-500 font-medium">Total: {items.length} records</span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-slate-400">Loading moderation records...</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <CheckCircle2 className="mx-auto text-slate-300" size={36} />
            <p className="text-slate-600 font-bold text-sm">No records pending in this queue</p>
            <p className="text-xs text-slate-400">All submissions in this category have been processed.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {/* Subject and Verified Student Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    {activeTab === 'college' && (
                      <span className="font-bold text-[#4A7B5B] text-base">{item.college?.name}</span>
                    )}
                    {activeTab === 'counselor' && (
                      <span className="font-bold text-[#4A7B5B] text-base">
                        Counselor: {item.counselor?.fullName || item.counselor?.email}
                      </span>
                    )}
                    {activeTab === 'complaints' && (
                      <span className="font-bold text-red-600 text-sm flex items-center gap-1">
                        <AlertOctagon size={14} /> {item.category} • Severity: {item.severity}
                      </span>
                    )}

                    {item.isVerifiedStudent && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] text-xs font-bold rounded-full border border-[#4A7B5B]/20">
                        <BadgeCheck size={13} /> Verified Enrolled Student
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        item.status === 'PUBLISHED' || item.status === 'RESOLVED'
                          ? 'bg-[#E8F3EC] text-[#4A7B5B]'
                          : item.status === 'PENDING_MODERATION' || item.status === 'RECEIVED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Rating & Content */}
                  {item.rating && renderStars(item.rating)}
                  {item.title && <div className="text-xs font-bold text-slate-800">{item.title}</div>}
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    {item.content || item.comment || item.description}
                  </p>

                  {/* Author / Metadata Context */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                    <span>
                      Author: {item.user?.fullName || item.student?.fullName || 'Student'} ({item.user?.email || item.student?.email})
                    </span>
                    {item.enrollment && (
                      <span>Enrollment: <strong className="text-slate-600">{item.enrollment.enrollmentNumber}</strong></span>
                    )}
                    {item.application && (
                      <span>App: <strong className="text-slate-600">{item.application.applicationNumber}</strong></span>
                    )}
                    <span>Submitted: {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Moderate Action Button */}
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-[#4A7B5B] hover:text-white text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Eye size={13} /> Moderate / Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Moderation Detail Drawer / Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#4A7B5B] text-lg flex items-center gap-2">
                <ShieldCheck className="text-[#4A7B5B]" size={20} /> Review Moderation Action
              </h3>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setActionReason('');
                }}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100 text-xs text-slate-700">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">
                  {selectedItem.college?.name || selectedItem.counselor?.fullName || 'Record'}
                </span>
                {selectedItem.rating && renderStars(selectedItem.rating)}
              </div>
              <p className="italic text-slate-600">"{selectedItem.content || selectedItem.comment || selectedItem.description}"</p>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-200/60">
                Author: {selectedItem.user?.fullName || selectedItem.student?.fullName} ({selectedItem.user?.email || selectedItem.student?.email})
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Moderation Reason / Quality Note (Optional)
              </label>
              <textarea
                rows={2}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Add explanation for approval, flagging, or rejection..."
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4A7B5B]/20"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => handleAction('APPROVE')}
                disabled={moderateCollegeMutation.isPending || moderateCounselorMutation.isPending}
                className="py-2.5 px-3 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 size={14} /> Approve & Publish
              </button>
              <button
                onClick={() => handleAction('FLAG')}
                disabled={moderateCollegeMutation.isPending || moderateCounselorMutation.isPending}
                className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <AlertTriangle size={14} /> Flag Concern
              </button>
              <button
                onClick={() => handleAction('REJECT')}
                disabled={moderateCollegeMutation.isPending || moderateCounselorMutation.isPending}
                className="py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <XCircle size={14} /> Reject / Hide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
