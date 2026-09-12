import { useState } from "react";
import {
  X,
  Send,
  User,
  Paperclip,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Shield,
  Star,
  Lock,
  UserCheck,
  RotateCcw,
  Building,
  GraduationCap,
  CreditCard,
  FileText,
  Check,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supportApi, SupportTicketItem } from "../../api/support.api";

interface SupportTicketDrawerProps {
  ticketId: string | null;
  onClose: () => void;
}

export default function SupportTicketDrawer({ ticketId, onClose }: SupportTicketDrawerProps) {
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [resolutionCode, setResolutionCode] = useState("RESOLVED_SATISFACTORY");
  const [reopenReason, setReopenReason] = useState("");
  const [showReopenModal, setShowReopenModal] = useState(false);

  const { data: ticketRes, isLoading } = useQuery({
    queryKey: ["support_ticket_detail", ticketId],
    queryFn: () => supportApi.getTicket(ticketId!),
    enabled: !!ticketId,
    refetchInterval: 5000,
  });

  const replyMutation = useMutation({
    mutationFn: (data: { message: string; isInternal: boolean }) =>
      supportApi.replyTicket(ticketId!, data),
    onSuccess: () => {
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["support_ticket_detail", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin_support_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support_dashboard"] });
    },
  });

  const claimMutation = useMutation({
    mutationFn: () => supportApi.claimTicket(ticketId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support_ticket_detail", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin_support_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support_dashboard"] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (data: { resolutionSummary: string; resolutionCode?: string }) =>
      supportApi.resolveTicket(ticketId!, data),
    onSuccess: () => {
      setShowResolveModal(false);
      setResolutionSummary("");
      queryClient.invalidateQueries({ queryKey: ["support_ticket_detail", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin_support_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support_dashboard"] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => supportApi.closeTicket(ticketId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support_ticket_detail", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin_support_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support_dashboard"] });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (reason?: string) => supportApi.reopenTicket(ticketId!, reason),
    onSuccess: () => {
      setShowReopenModal(false);
      setReopenReason("");
      queryClient.invalidateQueries({ queryKey: ["support_ticket_detail", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin_support_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support_dashboard"] });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: () => supportApi.escalateTicket(ticketId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support_ticket_detail", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin_support_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support_dashboard"] });
    },
  });

  if (!ticketId) return null;

  const ticket: SupportTicketItem = ticketRes?.data || ticketRes;

  const priorityBadges: Record<string, string> = {
    LOW: "bg-slate-100 text-slate-700 border-slate-200",
    MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
    HIGH: "bg-amber-50 text-amber-700 border-amber-200",
    URGENT: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
    CRITICAL: "bg-red-100 text-red-900 border-red-300 font-extrabold animate-pulse",
  };

  const statusBadges: Record<string, string> = {
    OPEN: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
    IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200 font-semibold",
    WAITING_FOR_STUDENT: "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
    WAITING_STUDENT: "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
    RESOLVED: "bg-teal-50 text-teal-800 border-teal-200 font-bold",
    CLOSED: "bg-gray-100 text-gray-700 border-gray-200",
    ESCALATED: "bg-rose-100 text-rose-800 border-rose-300 font-extrabold",
    REOPENED: "bg-orange-50 text-orange-800 border-orange-200 font-bold",
  };

  const slaBadges: Record<string, string> = {
    ON_TRACK: "bg-emerald-50 text-emerald-700 border-emerald-200",
    DUE_SOON: "bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse",
    BREACHED: "bg-rose-50 text-rose-800 border-rose-300 font-extrabold",
    COMPLETED: "bg-slate-50 text-slate-500 border-slate-200",
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-black text-slate-900">{ticket?.ticketId || ticketId}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityBadges[ticket?.priority] || ""}`}>
              {ticket?.priority}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadges[ticket?.status] || ""}`}>
              {ticket?.status}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${slaBadges[ticket?.slaStatus || "ON_TRACK"]}`}>
              {ticket?.slaStatus || "ON TRACK"}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm max-w-md truncate">{ticket?.subject || "Support Ticket Conversation"}</h3>
        </div>

        <div className="flex items-center gap-1.5">
          {!ticket?.assignedTo && ticket?.status !== "CLOSED" && (
            <button
              onClick={() => claimMutation.mutate()}
              disabled={claimMutation.isPending}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center gap-1 shadow-sm transition-all"
            >
              <UserCheck size={13} />
              {claimMutation.isPending ? "Claiming..." : "Claim"}
            </button>
          )}

          {ticket?.status !== "CLOSED" && ticket?.status !== "RESOLVED" && (
            <>
              <button
                onClick={() => setShowResolveModal(true)}
                className="px-2.5 py-1.5 rounded-xl border border-teal-300 bg-teal-50 text-teal-800 text-xs font-bold hover:bg-teal-100 flex items-center gap-1 transition-all"
              >
                <CheckCircle2 size={13} />
                Resolve
              </button>
              <button
                onClick={() => escalateMutation.mutate()}
                className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 flex items-center gap-1 transition-all"
              >
                <AlertOctagon size={13} />
                Escalate
              </button>
            </>
          )}

          {ticket?.status === "RESOLVED" && (
            <button
              onClick={() => closeMutation.mutate()}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1 transition-all"
            >
              <CheckCircle2 size={13} />
              Close Ticket
            </button>
          )}

          {ticket?.status === "CLOSED" && (
            <button
              onClick={() => setShowReopenModal(true)}
              className="px-2.5 py-1.5 rounded-xl border border-orange-300 bg-orange-50 text-orange-800 text-xs font-bold hover:bg-orange-100 flex items-center gap-1 transition-all"
            >
              <RotateCcw size={13} />
              Reopen
            </button>
          )}

          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-200 text-gray-400 hover:text-slate-700 transition-colors ml-1">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Context Metadata Inspector */}
      <div className="px-6 py-3 bg-slate-100/60 border-b border-gray-200/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
        <div>
          <span className="text-gray-400 block">Student Requester:</span>
          <strong className="text-slate-800 truncate block">{ticket?.user?.fullName || "Student"}</strong>
          <span className="text-gray-400 text-[10px]">{ticket?.user?.mobile || ticket?.user?.email}</span>
        </div>
        <div>
          <span className="text-gray-400 block">Category:</span>
          <strong className="text-slate-800 block">{ticket?.category}</strong>
        </div>
        <div>
          <span className="text-gray-400 block">Assigned Agent:</span>
          <strong className="text-slate-800 block">{ticket?.assignedTo?.fullName || "Unassigned"}</strong>
        </div>
        <div>
          <span className="text-gray-400 block">SLA Target:</span>
          <strong className="text-slate-800 block">
            {ticket?.slaDeadline ? new Date(ticket.slaDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "24h"}
          </strong>
        </div>
      </div>

      {/* Application / Payment Context Link (If present) */}
      {(ticket?.applicationId || ticket?.paymentId) && (
        <div className="px-6 py-2 bg-emerald-50/50 border-b border-emerald-100 flex items-center gap-4 text-[11px] text-emerald-900">
          {ticket?.applicationId && (
            <div className="flex items-center gap-1 font-semibold">
              <FileText size={12} className="text-emerald-700" />
              <span>Linked Application: <span className="font-mono font-bold">{ticket.applicationId.slice(0, 10)}...</span></span>
            </div>
          )}
          {ticket?.paymentId && (
            <div className="flex items-center gap-1 font-semibold">
              <CreditCard size={12} className="text-emerald-700" />
              <span>Payment ID: <span className="font-mono font-bold">{ticket.paymentId}</span></span>
            </div>
          )}
        </div>
      )}

      {/* Thread Conversation */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
        {isLoading ? (
          <div className="text-center py-10 text-gray-400">Loading conversation thread...</div>
        ) : (
          ticket?.messages?.map((msg: any) => {
            const isStudent = msg.sender?.role === "STUDENT";
            return (
              <div
                key={msg.id}
                className={`p-4 rounded-2xl border transition-all ${
                  msg.isInternal
                    ? "bg-amber-50/70 border-amber-200 ring-1 ring-amber-300/40"
                    : isStudent
                    ? "bg-slate-50 border-gray-200"
                    : "bg-emerald-50/40 border-emerald-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span>{msg.sender?.fullName || (isStudent ? "Student" : "Staff")}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white border text-gray-500 font-mono">
                      {msg.sender?.role || (isStudent ? "STUDENT" : "SUPPORT_AGENT")}
                    </span>
                    {msg.isInternal && (
                      <span className="text-[10px] font-extrabold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <Lock size={10} /> INTERNAL STAFF NOTE
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-gray-200/50 flex flex-wrap gap-2">
                    {msg.attachments.map((att: any) => (
                      <a
                        key={att.id}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-slate-700 text-[11px] font-semibold hover:bg-gray-50 transition-colors"
                      >
                        <Paperclip size={11} className="text-gray-400" />
                        {att.fileName}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reply & Internal Note Input Box */}
      {ticket?.status !== "CLOSED" && (
        <div className="p-4 border-t border-gray-100 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span className={isInternal ? "text-amber-800 font-extrabold flex items-center gap-1" : ""}>
                {isInternal && <Lock size={12} />}
                Internal Staff Note (Never visible to student)
              </span>
            </label>
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder={
                isInternal
                  ? "Write internal note for team members, supervisors, or counselors..."
                  : "Type public reply to student / requester..."
              }
              className={`w-full p-3.5 rounded-2xl border text-xs text-slate-900 focus:outline-none transition-all ${
                isInternal
                  ? "border-amber-300 bg-amber-50/40 focus:border-amber-500"
                  : "border-gray-200 bg-gray-50/50 focus:border-emerald-600"
              }`}
            />
            <button
              disabled={!replyMessage.trim() || replyMutation.isPending}
              onClick={() => replyMutation.mutate({ message: replyMessage, isInternal })}
              className={`absolute right-3 bottom-3 h-8 px-4 rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 shadow-sm transition-all ${
                isInternal
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-[#4A7B5B] hover:bg-[#3d694d] text-white"
              }`}
            >
              <Send size={12} />
              {replyMutation.isPending ? "Sending..." : isInternal ? "Add Note" : "Send Reply"}
            </button>
          </div>
        </div>
      )}

      {/* RESOLVE TICKET MODAL */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="text-teal-600" size={18} />
                Resolve Support Ticket
              </h3>
              <button onClick={() => setShowResolveModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Resolution Code</label>
                <select
                  value={resolutionCode}
                  onChange={(e) => setResolutionCode(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                >
                  <option value="RESOLVED_SATISFACTORY">Issue Resolved Satisfactorily</option>
                  <option value="DOCUMENT_VERIFIED">Document Successfully Verified</option>
                  <option value="PAYMENT_RECONCILED">Payment Successfully Reconciled</option>
                  <option value="ADMISSION_UPDATED">Admission / Choice Successfully Updated</option>
                  <option value="INFORMATION_PROVIDED">Complete Information Provided</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Resolution Summary for Student</label>
                <textarea
                  rows={4}
                  placeholder="Explain clearly what action was taken to solve the student's request..."
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={!resolutionSummary.trim() || resolveMutation.isPending}
                onClick={() => resolveMutation.mutate({ resolutionSummary, resolutionCode })}
                className="px-5 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 disabled:opacity-40"
              >
                {resolveMutation.isPending ? "Resolving..." : "Confirm Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN MODAL */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <RotateCcw className="text-orange-600" size={18} />
                Reopen Support Ticket
              </h3>
              <button onClick={() => setShowReopenModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Reopening</label>
                <textarea
                  rows={3}
                  placeholder="Explain why this closed ticket is being reopened..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={!reopenReason.trim() || reopenMutation.isPending}
                onClick={() => reopenMutation.mutate(reopenReason)}
                className="px-5 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 disabled:opacity-40"
              >
                {reopenMutation.isPending ? "Reopening..." : "Confirm Reopen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
