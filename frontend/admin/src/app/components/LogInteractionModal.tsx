import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X, Phone, MessageSquare, Calendar, FileText, CheckCircle2,
  Clock, AlertTriangle, UserCheck, Sparkles, Send, Shield
} from "lucide-react";
import { crmActivityApi } from "../../api/crm-activity.api";
import { tasksApi } from "../../api/tasks.api";
import { toast } from "sonner";

interface LogInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextType: "LEAD" | "STUDENT" | "APPLICATION";
  contextId: string;
  studentName?: string;
  leadName?: string;
  assignedCounselorId?: string;
  applicationId?: string;
  defaultTab?: "call" | "whatsapp" | "meeting" | "note" | "task";
}

const CALL_OUTCOMES = [
  { value: "CONNECTED", label: "Connected / Discussed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "INTERESTED", label: "Interested in Admission", color: "bg-green-50 text-green-700 border-green-200" },
  { value: "CALL_BACK_REQUESTED", label: "Callback Requested", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "NO_ANSWER", label: "No Answer / Ringing", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "BUSY", label: "Line Busy", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "WRONG_NUMBER", label: "Wrong / Invalid Number", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "NOT_INTERESTED", label: "Not Interested", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "CONVERTED", label: "Converted / Form Submitted", color: "bg-teal-50 text-teal-700 border-teal-200" },
];

export default function LogInteractionModal({
  isOpen,
  onClose,
  contextType,
  contextId,
  studentName,
  leadName,
  assignedCounselorId,
  applicationId,
  defaultTab = "call",
}: LogInteractionModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"call" | "whatsapp" | "meeting" | "note" | "task">(defaultTab);

  // Form States - Call
  const [callOutcome, setCallOutcome] = useState("CONNECTED");
  const [callDirection, setCallDirection] = useState("OUTBOUND");
  const [callDurationMins, setCallDurationMins] = useState(3);
  const [callNotes, setCallNotes] = useState("");
  const [scheduleNextFollowUp, setScheduleNextFollowUp] = useState(false);
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");

  // Form States - WhatsApp
  const [waDirection, setWaDirection] = useState("OUTBOUND");
  const [waNotes, setWaNotes] = useState("");

  // Form States - Meeting
  const [meetingTitle, setMeetingTitle] = useState("One-on-One Admission Counseling");
  const [meetingMode, setMeetingMode] = useState("CALL");
  const [meetingOutcome, setMeetingOutcome] = useState("COMPLETED");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingDuration, setMeetingDuration] = useState(30);

  // Form States - Note
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"INTERNAL" | "STUDENT_VISIBLE">("INTERNAL");

  // Form States - Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskDesc, setTaskDesc] = useState("");

  const targetDisplayName = studentName || leadName || "Student";

  // Mutations
  const logCallMutation = useMutation({
    mutationFn: () =>
      crmActivityApi.logCall({
        leadId: contextType === "LEAD" ? contextId : undefined,
        studentId: contextType === "STUDENT" ? contextId : undefined,
        applicationId: applicationId || undefined,
        outcome: callOutcome,
        direction: callDirection,
        durationSecs: callDurationMins * 60,
        notes: callNotes,
        nextFollowUpDate: scheduleNextFollowUp && nextFollowUpDate ? nextFollowUpDate : undefined,
      }),
    onSuccess: () => {
      toast.success("Call interaction logged successfully");
      invalidateAll();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to log call");
    },
  });

  const logWhatsAppMutation = useMutation({
    mutationFn: () =>
      crmActivityApi.logActivity({
        leadId: contextType === "LEAD" ? contextId : undefined,
        studentId: contextType === "STUDENT" ? contextId : undefined,
        applicationId: applicationId || undefined,
        channel: "WHATSAPP",
        direction: waDirection,
        category: "STAFF_ACTIVITY",
        title: `WhatsApp Message (${waDirection === "OUTBOUND" ? "Sent to" : "Received from"} student)`,
        content: waNotes,
        visibility: "INTERNAL",
      }),
    onSuccess: () => {
      toast.success("WhatsApp interaction recorded");
      invalidateAll();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to record WhatsApp note");
    },
  });

  const logMeetingMutation = useMutation({
    mutationFn: () =>
      crmActivityApi.logMeeting({
        leadId: contextType === "LEAD" ? contextId : undefined,
        studentId: contextType === "STUDENT" ? contextId : undefined,
        applicationId: applicationId || undefined,
        title: meetingTitle,
        mode: meetingMode,
        outcome: meetingOutcome,
        notes: meetingNotes,
        durationMins: meetingDuration,
        nextFollowUpDate: scheduleNextFollowUp && nextFollowUpDate ? nextFollowUpDate : undefined,
      }),
    onSuccess: () => {
      toast.success("Counseling session recorded successfully");
      invalidateAll();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to log meeting");
    },
  });

  const logNoteMutation = useMutation({
    mutationFn: () =>
      crmActivityApi.logActivity({
        leadId: contextType === "LEAD" ? contextId : undefined,
        studentId: contextType === "STUDENT" ? contextId : undefined,
        applicationId: applicationId || undefined,
        channel: "NOTE",
        direction: "INTERNAL",
        category: "STAFF_ACTIVITY",
        title: noteTitle || (noteVisibility === "INTERNAL" ? "Internal Counselor Note" : "Counselor Note (Student Visible)"),
        content: noteContent,
        visibility: noteVisibility,
      }),
    onSuccess: () => {
      toast.success("Note added to timeline");
      invalidateAll();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to save note");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: () =>
      tasksApi.create({
        title: taskTitle,
        description: taskDesc,
        dueDate: taskDueDate,
        priority: taskPriority,
        assignedTo: assignedCounselorId || "",
        leadId: contextType === "LEAD" ? contextId : undefined,
        studentId: contextType === "STUDENT" ? contextId : undefined,
        applicationId: applicationId || undefined,
        contextType,
      }),
    onSuccess: () => {
      toast.success("Follow-up task created successfully");
      invalidateAll();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create follow-up task");
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["crm_timeline"] });
    queryClient.invalidateQueries({ queryKey: ["student_activity"] });
    queryClient.invalidateQueries({ queryKey: ["student_notes"] });
    queryClient.invalidateQueries({ queryKey: ["leads_list"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["task_stats"] });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E2E8F0] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A7B5B]">
              CRM Interaction & Follow-Up
            </span>
            <h3 className="text-base font-bold text-[#4A7B5B]">
              Log Activity for {targetDisplayName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F1F5F9] text-[#64748B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E2E8F0] bg-white px-5 pt-2 gap-2">
          {[
            { id: "call", label: "Log Call", icon: Phone },
            { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
            { id: "meeting", label: "Meeting / Session", icon: Calendar },
            { id: "note", label: "Add Note", icon: FileText },
            { id: "task", label: "Create Follow-up", icon: Clock },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`pb-3 px-3 flex items-center gap-1.5 text-xs font-bold transition-all border-b-2 ${
                  isActive
                    ? "border-[#4A7B5B] text-[#4A7B5B]"
                    : "border-transparent text-[#64748B] hover:text-[#4A7B5B]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: CALL */}
          {activeTab === "call" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-2">
                  Call Outcome *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CALL_OUTCOMES.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setCallOutcome(o.value)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                        callOutcome === o.value
                          ? "border-[#4A7B5B] bg-[#E8F3EC] text-[#4A7B5B]"
                          : "border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569]"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Direction</label>
                  <select
                    value={callDirection}
                    onChange={(e) => setCallDirection(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                  >
                    <option value="OUTBOUND">Outbound (Counselor called student)</option>
                    <option value="INBOUND">Inbound (Student called counselor)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Duration (Approx. mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={callDurationMins}
                    onChange={(e) => setCallDurationMins(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Counseling Discussion Notes</label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Summarize the discussion, student queries, course/college preferences, or next steps..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              {/* Schedule Next Follow-up Checkbox */}
              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#4A7B5B]">
                  <input
                    type="checkbox"
                    checked={scheduleNextFollowUp}
                    onChange={(e) => setScheduleNextFollowUp(e.target.checked)}
                    className="w-4 h-4 rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                  />
                  Schedule Next Follow-Up Task
                </label>
                {scheduleNextFollowUp && (
                  <div className="pt-2">
                    <label className="text-[11px] text-[#64748B] block mb-1">Next Follow-Up Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WHATSAPP */}
          {activeTab === "whatsapp" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Direction</label>
                <select
                  value={waDirection}
                  onChange={(e) => setWaDirection(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="OUTBOUND">Outbound (Message sent to student)</option>
                  <option value="INBOUND">Inbound (Message received from student)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">WhatsApp Message Summary / Details *</label>
                <textarea
                  value={waNotes}
                  onChange={(e) => setWaNotes(e.target.value)}
                  placeholder="Record what information, brochure, or fee breakdown was shared on WhatsApp..."
                  rows={4}
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
            </div>
          )}

          {/* TAB 3: MEETING */}
          {activeTab === "meeting" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Meeting Title *</label>
                <input
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. B.Tech CSE Counseling Session"
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Meeting Mode</label>
                  <select
                    value={meetingMode}
                    onChange={(e) => setMeetingMode(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                  >
                    <option value="CALL">Phone Call</option>
                    <option value="VIDEO">Video Conference (Google Meet / Zoom)</option>
                    <option value="IN_PERSON">In-Person Campus Counseling</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={meetingDuration}
                    onChange={(e) => setMeetingDuration(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Outcome & Next Steps</label>
                <textarea
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  placeholder="Detailed meeting notes, student doubts resolved, colleges recommended..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
            </div>
          )}

          {/* TAB 4: NOTE */}
          {activeTab === "note" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Note Title (Optional)</label>
                <input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Budget & Scholarship Preference"
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Note Content *</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write note details..."
                  rows={4}
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <label className="text-xs font-bold text-[#4A7B5B] block mb-2">Privacy & Visibility</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNoteVisibility("INTERNAL")}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      noteVisibility === "INTERNAL"
                        ? "border-[#4A7B5B] bg-[#E8F3EC] text-[#4A7B5B]"
                        : "border-[#E2E8F0] bg-white text-[#64748B]"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-[#4A7B5B]" /> Internal Staff Only
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-0.5">Hidden from student portal</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteVisibility("STUDENT_VISIBLE")}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      noteVisibility === "STUDENT_VISIBLE"
                        ? "border-[#4A7B5B] bg-[#E8F3EC] text-[#4A7B5B]"
                        : "border-[#E2E8F0] bg-white text-[#64748B]"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Student Visible
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-0.5">Visible on student dashboard</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CREATE TASK */}
          {activeTab === "task" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Task Title *</label>
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Call student regarding GKU B.Tech CSE admission"
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Due Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium / Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Task Description / Instructions</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Specific follow-up objectives, documents to request, fee deadlines to remind..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B] hover:bg-white"
          >
            Cancel
          </button>

          {activeTab === "call" && (
            <button
              disabled={logCallMutation.isPending}
              onClick={() => logCallMutation.mutate()}
              className="h-10 px-5 rounded-xl text-xs font-bold text-white bg-[#4A7B5B] hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              <Phone className="w-3.5 h-3.5" />
              {logCallMutation.isPending ? "Logging Call..." : "Save Call Log"}
            </button>
          )}

          {activeTab === "whatsapp" && (
            <button
              disabled={!waNotes.trim() || logWhatsAppMutation.isPending}
              onClick={() => logWhatsAppMutation.mutate()}
              className="h-10 px-5 rounded-xl text-xs font-bold text-white bg-[#4A7B5B] hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {logWhatsAppMutation.isPending ? "Saving..." : "Record WhatsApp"}
            </button>
          )}

          {activeTab === "meeting" && (
            <button
              disabled={!meetingTitle.trim() || logMeetingMutation.isPending}
              onClick={() => logMeetingMutation.mutate()}
              className="h-10 px-5 rounded-xl text-xs font-bold text-white bg-[#4A7B5B] hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5" />
              {logMeetingMutation.isPending ? "Saving Session..." : "Save Session"}
            </button>
          )}

          {activeTab === "note" && (
            <button
              disabled={!noteContent.trim() || logNoteMutation.isPending}
              onClick={() => logNoteMutation.mutate()}
              className="h-10 px-5 rounded-xl text-xs font-bold text-white bg-[#4A7B5B] hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              {logNoteMutation.isPending ? "Saving Note..." : "Add Note"}
            </button>
          )}

          {activeTab === "task" && (
            <button
              disabled={!taskTitle.trim() || !taskDueDate || createTaskMutation.isPending}
              onClick={() => createTaskMutation.mutate()}
              className="h-10 px-5 rounded-xl text-xs font-bold text-white bg-[#4A7B5B] hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              <Clock className="w-3.5 h-3.5" />
              {createTaskMutation.isPending ? "Creating Task..." : "Create Follow-up Task"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
