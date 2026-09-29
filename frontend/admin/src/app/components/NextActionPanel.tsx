import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock, CheckCircle2, Calendar, AlertTriangle, Plus, ChevronRight,
  RotateCcw, Sparkles, UserCheck, Shield, PhoneCall
} from "lucide-react";
import { tasksApi, TaskItem } from "../../api/tasks.api";
import { toast } from "sonner";

interface NextActionPanelProps {
  contextType: "LEAD" | "STUDENT" | "APPLICATION";
  contextId: string;
  assignedCounselorId?: string;
  studentName?: string;
  leadName?: string;
  onOpenLogModal?: (defaultTab: "call" | "task") => void;
}

export default function NextActionPanel({
  contextType,
  contextId,
  assignedCounselorId,
  studentName,
  leadName,
  onOpenLogModal,
}: NextActionPanelProps) {
  const queryClient = useQueryClient();

  const [completingTask, setCompletingTask] = useState<TaskItem | null>(null);
  const [completeOutcome, setCompleteOutcome] = useState("CONNECTED");
  const [completeNotes, setCompleteNotes] = useState("");

  const [reschedulingTask, setReschedulingTask] = useState<TaskItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("Student requested callback later");

  // Query tasks for this specific entity
  const { data: tasksRes, isLoading, refetch } = useQuery({
    queryKey: ["next_action_tasks", contextType, contextId],
    queryFn: () =>
      tasksApi.getMyTasks({
        leadId: contextType === "LEAD" ? contextId : undefined,
        studentId: contextType === "STUDENT" ? contextId : undefined,
        applicationId: contextType === "APPLICATION" ? contextId : undefined,
        status: "ALL",
        limit: 10,
      }),
  });

  const allTasks = tasksRes?.data?.data || [];
  // Find immediate pending or overdue task
  const activeTask = allTasks.find(
    (t) => t.status === "PENDING" || t.status === "IN_PROGRESS" || t.status === "OVERDUE" || t.isOverdue,
  );

  const completeMutation = useMutation({
    mutationFn: () =>
      tasksApi.complete(completingTask!.id, {
        outcome: completeOutcome,
        notes: completeNotes,
      }),
    onSuccess: () => {
      toast.success("Task completed successfully");
      queryClient.invalidateQueries({ queryKey: ["next_action_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["crm_timeline"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_stats"] });
      setCompletingTask(null);
      setCompleteNotes("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to complete task");
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      tasksApi.reschedule(reschedulingTask!.id, {
        newDueDate: rescheduleDate,
        reason: rescheduleReason,
      }),
    onSuccess: () => {
      toast.success("Task rescheduled successfully");
      queryClient.invalidateQueries({ queryKey: ["next_action_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["crm_timeline"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setReschedulingTask(null);
      setRescheduleDate("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to reschedule task");
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
        <div className="h-6 bg-slate-200 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#4A7B5B] animate-pulse" />
          <h4 className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider">
            CRM Next Operational Action
          </h4>
        </div>
        {activeTask?.isOverdue && (
          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold flex items-center gap-1 border border-red-200">
            <AlertTriangle className="w-3 h-3" /> OVERDUE
          </span>
        )}
      </div>

      {!activeTask ? (
        <div className="p-4 rounded-xl bg-white border border-dashed border-[#CBD5E1] text-center space-y-2">
          <p className="text-xs text-[#64748B]">No pending follow-up scheduled for this student.</p>
          <div className="flex items-center justify-center gap-2 pt-1">
            {onOpenLogModal && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenLogModal("call")}
                  className="px-3 py-1.5 rounded-lg bg-[#E8F3EC] text-[#4A7B5B] text-xs font-bold hover:bg-[#4A7B5B] hover:text-white transition-all flex items-center gap-1"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Log Call
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLogModal("task")}
                  className="px-3 py-1.5 rounded-lg bg-[#4A7B5B] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Set Follow-Up
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  activeTask.priority === "URGENT" || activeTask.priority === "HIGH"
                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {activeTask.priority} PRIORITY
              </span>
              <h5 className="font-bold text-sm text-[#4A7B5B] mt-1.5">{activeTask.title}</h5>
              {activeTask.description && (
                <p className="text-xs text-[#64748B] mt-0.5">{activeTask.description}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] text-[#64748B] block font-medium">Due Date & Time</span>
              <span
                className={`text-xs font-bold ${
                  activeTask.isOverdue ? "text-red-600" : "text-[#4A7B5B]"
                }`}
              >
                {new Date(activeTask.dueDate).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9] text-xs">
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <UserCheck className="w-3.5 h-3.5 text-[#4A7B5B]" />
              <span>Assigned: <strong className="text-[#4A7B5B]">{activeTask.User?.fullName || "Counselor"}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReschedulingTask(activeTask)}
                className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[#475569] font-semibold text-xs hover:bg-[#F8FAFC]"
              >
                Reschedule
              </button>
              <button
                type="button"
                onClick={() => setCompletingTask(activeTask)}
                className="px-3.5 py-1.5 rounded-lg bg-[#4A7B5B] text-white font-bold text-xs hover:opacity-90 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK COMPLETE MODAL */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl space-y-4 border border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#4A7B5B]">Complete Task</span>
              <h3 className="text-base font-bold text-[#4A7B5B]">{completingTask.title}</h3>
            </div>

            <div>
              <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Outcome *</label>
              <select
                value={completeOutcome}
                onChange={(e) => setCompleteOutcome(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="CONNECTED">Connected & Discussed</option>
                <option value="INTERESTED">Student Highly Interested</option>
                <option value="CALLBACK">Callback Requested</option>
                <option value="NO_ANSWER">No Answer / Ringing</option>
                <option value="NOT_INTERESTED">Not Interested</option>
                <option value="CONVERTED">Admission Application Submitted</option>
                <option value="COMPLETED">Completed Successfully</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Completion Notes / Remarks</label>
              <textarea
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Brief summary of follow-up completion..."
                rows={3}
                className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setCompletingTask(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#4A7B5B] hover:opacity-90 disabled:opacity-50"
              >
                {completeMutation.isPending ? "Completing..." : "Confirm Complete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK RESCHEDULE MODAL */}
      {reschedulingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl space-y-4 border border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#4A7B5B]">Reschedule Follow-Up</span>
              <h3 className="text-base font-bold text-[#4A7B5B]">{reschedulingTask.title}</h3>
            </div>

            <div>
              <label className="text-xs font-bold text-[#4A7B5B] block mb-1">New Due Date & Time *</label>
              <input
                type="datetime-local"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Reason for Rescheduling *</label>
              <textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Explain why this follow-up is being deferred..."
                rows={3}
                className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setReschedulingTask(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rescheduleDate || !rescheduleReason.trim() || rescheduleMutation.isPending}
                onClick={() => rescheduleMutation.mutate()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#4A7B5B] hover:opacity-90 disabled:opacity-50"
              >
                {rescheduleMutation.isPending ? "Rescheduling..." : "Confirm Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
