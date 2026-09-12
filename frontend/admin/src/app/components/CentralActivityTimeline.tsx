import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Phone, MessageSquare, Calendar, FileText, Activity, Clock,
  Filter, Search, RefreshCw, AlertCircle, Plus, Shield, Sparkles,
  ArrowUpRight, ArrowDownLeft, Trash2, CheckCircle2, ChevronRight,
  PhoneCall, Users
} from "lucide-react";
import { crmActivityApi, TimelineEventItem } from "../../api/crm-activity.api";
import LogInteractionModal from "./LogInteractionModal";
import { toast } from "sonner";

interface CentralActivityTimelineProps {
  contextType: "LEAD" | "STUDENT" | "APPLICATION";
  contextId: string;
  studentName?: string;
  leadName?: string;
  assignedCounselorId?: string;
  applicationId?: string;
}

const OUTCOME_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CONNECTED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  INTERESTED: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  CALL_BACK_REQUESTED: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  NO_ANSWER: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  BUSY: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  WRONG_NUMBER: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  NOT_INTERESTED: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  CONVERTED: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
};

export default function CentralActivityTimeline({
  contextType,
  contextId,
  studentName,
  leadName,
  assignedCounselorId,
  applicationId,
}: CentralActivityTimelineProps) {
  const queryClient = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [defaultLogTab, setDefaultLogTab] = useState<"call" | "whatsapp" | "meeting" | "note" | "task">("call");

  const [voidingActivityId, setVoidingActivityId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const { data: timelineRes, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["crm_timeline", contextType, contextId, selectedChannel, selectedCategory, search, page],
    queryFn: () =>
      crmActivityApi.getTimeline(contextType, contextId, {
        channel: selectedChannel !== "ALL" ? selectedChannel : undefined,
        category: selectedCategory !== "ALL" ? selectedCategory : undefined,
        search: search.trim() || undefined,
        page,
        limit: 50,
      }),
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      crmActivityApi.voidActivity(id, reason),
    onSuccess: () => {
      toast.success("Activity voided from timeline");
      queryClient.invalidateQueries({ queryKey: ["crm_timeline"] });
      setVoidingActivityId(null);
      setVoidReason("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to void activity");
    },
  });

  const events: TimelineEventItem[] = timelineRes?.data?.data || [];
  const meta = timelineRes?.data?.meta || { total: 0, page: 1, limit: 50, totalPages: 1 };

  const handleOpenModal = (tab: "call" | "whatsapp" | "meeting" | "note" | "task") => {
    setDefaultLogTab(tab);
    setIsLogModalOpen(true);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "CALL":
        return <Phone className="w-4 h-4 text-[#4A7B5B]" />;
      case "WHATSAPP":
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case "MEETING":
      case "COUNSELING":
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case "NOTE":
        return <FileText className="w-4 h-4 text-amber-600" />;
      case "FOLLOW_UP":
        return <Clock className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar & Quick Actions */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#0F172A]">Central Activity & Contact Journal</h3>
              <span className="px-2 py-0.5 rounded-full bg-[#E8F3EC] text-[#4A7B5B] text-xs font-bold">
                {meta.total} records
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Authoritative chronological timeline of counselor interactions and verified system events.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleOpenModal("call")}
              className="h-8 px-3 rounded-xl bg-[#4A7B5B] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs"
            >
              <PhoneCall className="w-3.5 h-3.5" /> Log Call
            </button>
            <button
              onClick={() => handleOpenModal("whatsapp")}
              className="h-8 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </button>
            <button
              onClick={() => handleOpenModal("meeting")}
              className="h-8 px-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" /> Meeting
            </button>
            <button
              onClick={() => handleOpenModal("note")}
              className="h-8 px-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] text-xs font-bold hover:bg-white transition-all flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> Note
            </button>
            <button
              onClick={() => handleOpenModal("task")}
              className="h-8 px-3 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition-all flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" /> Task
            </button>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-[#F1F5F9]">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timeline notes, call summaries, staff..."
              className="w-full h-8 pl-8 pr-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs focus:outline-none focus:border-[#4A7B5B]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "CALL", "WHATSAPP", "MEETING", "NOTE", "FOLLOW_UP", "SYSTEM_EVENT"].map((ch) => (
              <button
                key={ch}
                onClick={() => setSelectedChannel(ch)}
                className={`h-8 px-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedChannel === ch
                    ? "bg-[#0F172A] text-white"
                    : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-white"
                }`}
              >
                {ch === "SYSTEM_EVENT" ? "System" : ch.replace("_", " ")}
              </button>
            ))}

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="w-8 h-8 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Activity Timeline Stream */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0] space-y-2">
          <div className="w-6 h-6 border-2 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading centralized timeline...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0] space-y-2">
          <Activity className="w-8 h-8 text-[#94A3B8] mx-auto opacity-50" />
          <h4 className="text-sm font-bold text-[#0F172A]">No Activities Recorded Yet</h4>
          <p className="text-xs text-[#64748B]">Log a phone call, WhatsApp conversation, or counselor note above.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E2E8F0]">
          {events.map((evt) => {
            const isStaff = evt.category === "STAFF_ACTIVITY";
            const outcomeStyle = evt.callOutcome ? OUTCOME_STYLES[evt.callOutcome] : null;

            return (
              <div key={evt.id} className="relative group">
                {/* Node icon */}
                <div className="absolute -left-6 top-3 w-6 h-6 rounded-full bg-white border-2 border-[#4A7B5B] flex items-center justify-center shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-[#4A7B5B]" />
                </div>

                {/* Card */}
                <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#CBD5E1] transition-all space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                        {getChannelIcon(evt.channel)}
                      </span>
                      <h4 className="text-sm font-bold text-[#0F172A]">{evt.title}</h4>

                      {/* Staff vs System Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isStaff
                            ? "bg-[#E8F3EC] text-[#4A7B5B] border-[#BBF7D0]"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {isStaff ? "STAFF ACTIVITY" : "SYSTEM EVENT"}
                      </span>

                      {/* Direction */}
                      {evt.direction && evt.direction !== "INTERNAL" && evt.direction !== "SYSTEM" && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] text-[10px] font-semibold flex items-center gap-0.5">
                          {evt.direction === "OUTBOUND" ? (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" /> Outbound
                            </>
                          ) : (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-blue-600" /> Inbound
                            </>
                          )}
                        </span>
                      )}

                      {/* Call Outcome Badge */}
                      {evt.callOutcome && outcomeStyle && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${outcomeStyle.bg} ${outcomeStyle.text} ${outcomeStyle.border}`}
                        >
                          {evt.callOutcome}
                        </span>
                      )}

                      {/* Meeting Mode */}
                      {evt.meetingMode && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                          {evt.meetingMode}
                        </span>
                      )}

                      {/* Student Visible Tag */}
                      {evt.visibility === "STUDENT_VISIBLE" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Student Visible
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-[#94A3B8] font-medium">
                        {new Date(evt.timestamp).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  {evt.content && (
                    <p className="text-xs text-[#475569] leading-relaxed bg-[#F8FAFC] p-3 rounded-xl border border-[#F1F5F9]">
                      {evt.content}
                    </p>
                  )}

                  {/* Footer Actor & Actions */}
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1">
                    <div className="flex items-center gap-1">
                      <span>Logged by:</span>
                      <strong className="text-[#0F172A]">{evt.actorName}</strong>
                      {evt.actorRole && (
                        <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[10px] text-slate-600">
                          {evt.actorRole}
                        </span>
                      )}
                    </div>

                    {/* Void action if source is CRM_ACTIVITY */}
                    {evt.source === "CRM_ACTIVITY" && (
                      <button
                        onClick={() => setVoidingActivityId(evt.id)}
                        className="text-slate-400 hover:text-red-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Void
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VOID ACTIVITY MODAL */}
      {voidingActivityId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl space-y-4 border border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-bold uppercase text-red-600">Void Operational Activity</span>
              <h3 className="text-base font-bold text-[#0F172A]">Confirm Retraction</h3>
              <p className="text-xs text-[#64748B] mt-1">
                This will mark the entry as voided in the authoritative journal while maintaining audit history.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">Reason for Voiding *</label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Explain why this record is being voided..."
                rows={3}
                className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setVoidingActivityId(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!voidReason.trim() || voidMutation.isPending}
                onClick={() =>
                  voidMutation.mutate({
                    id: voidingActivityId,
                    reason: voidReason,
                  })
                }
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {voidMutation.isPending ? "Voiding..." : "Confirm Void"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Interaction Modal */}
      <LogInteractionModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        contextType={contextType}
        contextId={contextId}
        studentName={studentName}
        leadName={leadName}
        assignedCounselorId={assignedCounselorId}
        applicationId={applicationId}
        defaultTab={defaultLogTab}
      />
    </div>
  );
}
