import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock, CheckCircle2, AlertTriangle, AlertCircle, Calendar,
  UserCheck, Users, Search, Filter, Plus, ArrowUpDown, ChevronRight,
  Shield, Check, X, RotateCcw, Flame, Sparkles, Building2, PhoneCall
} from "lucide-react";
import { tasksApi, TaskItem, CounselorWorkload } from "../../api/tasks.api";
import { counselorsApi } from "../../api/counselors.api";
import { toast } from "sonner";

export default function CrmTasksPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "my" | "today" | "overdue" | "team" | "escalated" | "workload"
  >("my");

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [contextFilter, setContextFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");
  const [newTaskContextType, setNewTaskContextType] = useState("GENERAL");
  const [newTaskDesc, setNewTaskDesc] = useState("");

  const [completingTask, setCompletingTask] = useState<TaskItem | null>(null);
  const [completeOutcome, setCompleteOutcome] = useState("CONNECTED");
  const [completeNotes, setCompleteNotes] = useState("");
  const [completeNextDate, setCompleteNextDate] = useState("");

  const [reschedulingTask, setReschedulingTask] = useState<TaskItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

  const [reassigningTask, setReassigningTask] = useState<TaskItem | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState("");
  const [reassignReason, setReassignReason] = useState("");

  // Stats Query
  const { data: statsRes } = useQuery({
    queryKey: ["task_stats"],
    queryFn: () => tasksApi.getStats(),
  });
  const stats = statsRes?.data || {
    totalTasks: 0,
    activeTotal: 0,
    dueToday: 0,
    overdue: 0,
    upcoming: 0,
    completed: 0,
    escalated: 0,
    completionRate: 0,
  };

  // Counselors Query (for reassign and create)
  const { data: counselorsRes } = useQuery({
    queryKey: ["counselors_list"],
    queryFn: () => counselorsApi.getAll({ limit: 100 }),
  });
  const counselors = counselorsRes?.data?.data || [];

  // Tasks Query
  const { data: tasksRes, isLoading, refetch } = useQuery({
    queryKey: ["tasks", activeTab, priorityFilter, contextFilter, search, page],
    queryFn: () => {
      const queryParams = {
        priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
        contextType: contextFilter !== "ALL" ? contextFilter : undefined,
        search: search.trim() || undefined,
        page,
        limit: 30,
      };

      if (activeTab === "my") {
        return tasksApi.getMyTasks(queryParams);
      } else if (activeTab === "today") {
        return tasksApi.getMyTasks({ ...queryParams, dateFilter: "TODAY" });
      } else if (activeTab === "overdue") {
        return tasksApi.getMyTasks({ ...queryParams, status: "OVERDUE" });
      } else if (activeTab === "team") {
        return tasksApi.getTeamTasks(queryParams);
      } else if (activeTab === "escalated") {
        return tasksApi.getAdminTasks({ ...queryParams, status: "ESCALATED" });
      }
      return tasksApi.getMyTasks(queryParams);
    },
    enabled: activeTab !== "workload",
  });

  // Workload Query
  const { data: workloadRes, isLoading: isWorkloadLoading } = useQuery({
    queryKey: ["team_workload"],
    queryFn: () => tasksApi.getTeamWorkload(),
    enabled: activeTab === "workload",
  });
  const workloads: CounselorWorkload[] = workloadRes?.data || [];

  const tasksList: TaskItem[] = tasksRes?.data?.data || [];
  const meta = tasksRes?.data?.meta || { total: 0, page: 1, limit: 30, totalPages: 1 };

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: () =>
      tasksApi.create({
        title: newTaskTitle,
        description: newTaskDesc,
        dueDate: newTaskDueDate,
        priority: newTaskPriority,
        assignedTo: newTaskAssignedTo,
        contextType: newTaskContextType,
      }),
    onSuccess: () => {
      toast.success("Task created successfully");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_stats"] });
      setIsCreateModalOpen(false);
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setNewTaskDesc("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create task");
    },
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      tasksApi.complete(completingTask!.id, {
        outcome: completeOutcome,
        notes: completeNotes,
        nextFollowUpDate: completeNextDate || undefined,
      }),
    onSuccess: () => {
      toast.success("Task marked completed");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_stats"] });
      queryClient.invalidateQueries({ queryKey: ["team_workload"] });
      setCompletingTask(null);
      setCompleteNotes("");
      setCompleteNextDate("");
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
      toast.success("Task rescheduled");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_stats"] });
      setReschedulingTask(null);
      setRescheduleDate("");
      setRescheduleReason("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to reschedule task");
    },
  });

  const reassignMutation = useMutation({
    mutationFn: () =>
      tasksApi.reassign(reassigningTask!.id, {
        newAssignedToId: reassignTargetId,
        reason: reassignReason,
      }),
    onSuccess: () => {
      toast.success("Task reassigned successfully");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["team_workload"] });
      setReassigningTask(null);
      setReassignTargetId("");
      setReassignReason("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to reassign task");
    },
  });

  const cancelTaskMutation = useMutation({
    mutationFn: (id: string) => tasksApi.cancel(id, "Cancelled by staff"),
    onSuccess: () => {
      toast.success("Task cancelled");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_stats"] });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A7B5B]">
            Operational Workflow Engine
          </span>
          <h1 className="text-2xl font-black text-[#4A7B5B]">CRM Follow-Up & Task Command Center</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time follow-ups, scheduled counseling reminders, and senior counselor escalation queues.
          </p>
        </div>

        <button
          onClick={() => {
            if (counselors.length > 0 && !newTaskAssignedTo) {
              setNewTaskAssignedTo(counselors[0].user?.id || counselors[0].id);
            }
            setIsCreateModalOpen(true);
          }}
          className="h-10 px-5 rounded-2xl bg-[#4A7B5B] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Follow-Up Task
        </button>
      </div>

      {/* Authoritative Live Counter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] block">Active Follow-ups</span>
          <span className="text-xl font-black text-[#4A7B5B] mt-1 block">{stats.activeTotal}</span>
          <span className="text-[10px] text-[#4A7B5B] font-semibold">Total Assigned</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200 bg-amber-50/30 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 block">Due Today</span>
          <span className="text-xl font-black text-amber-900 mt-1 block">{stats.dueToday}</span>
          <span className="text-[10px] text-amber-700 font-semibold">Action Required</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-red-200 bg-red-50/30 shadow-xs">
          <span className="text-[11px] font-bold text-red-800 block">Overdue</span>
          <span className="text-xl font-black text-red-900 mt-1 block">{stats.overdue}</span>
          <span className="text-[10px] text-red-600 font-semibold">Past SLA Threshold</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-purple-200 bg-purple-50/30 shadow-xs">
          <span className="text-[11px] font-bold text-purple-800 block">Escalations</span>
          <span className="text-xl font-black text-purple-900 mt-1 block">{stats.escalated}</span>
          <span className="text-[10px] text-purple-600 font-semibold">Senior Queue</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] block">Upcoming</span>
          <span className="text-xl font-black text-[#4A7B5B] mt-1 block">{stats.upcoming}</span>
          <span className="text-[10px] text-[#64748B] font-semibold">Next 7 Days</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200 bg-[#E8F3EC]/50 shadow-xs">
          <span className="text-[11px] font-bold text-[#4A7B5B] block">Completion Rate</span>
          <span className="text-xl font-black text-[#4A7B5B] mt-1 block">{stats.completionRate}%</span>
          <span className="text-[10px] text-[#4A7B5B] font-semibold">{stats.completed} Completed</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0] bg-white rounded-2xl px-4 pt-2 gap-2 shadow-xs flex-wrap">
        {[
          { id: "my", label: "My Follow-up Queue", count: stats.activeTotal },
          { id: "today", label: "Due Today", count: stats.dueToday },
          { id: "overdue", label: "Overdue Queue", count: stats.overdue },
          { id: "team", label: "Senior Team Queue", count: null },
          { id: "escalated", label: "Escalated Follow-ups", count: stats.escalated },
          { id: "workload", label: "Counselor Workload & Capacity", count: null },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-3 px-3.5 flex items-center gap-2 text-xs font-bold transition-all border-b-2 ${
                isActive
                  ? "border-[#4A7B5B] text-[#4A7B5B]"
                  : "border-transparent text-[#64748B] hover:text-[#4A7B5B]"
              }`}
            >
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive
                      ? "bg-[#4A7B5B] text-white"
                      : "bg-[#F1F5F9] text-[#475569]"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: WORKLOAD TABLE */}
      {activeTab === "workload" ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h3 className="text-sm font-bold text-[#4A7B5B]">Senior Counselor Team Workload Overview</h3>
            <p className="text-xs text-[#64748B]">Real-time task distribution, overdue alerts, and completion performance.</p>
          </div>

          {isWorkloadLoading ? (
            <div className="p-8 text-center text-xs text-[#64748B]">Loading counselor workloads...</div>
          ) : workloads.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64748B]">No counselors assigned in your team hierarchy.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                  <tr>
                    <th className="p-3.5 pl-5">Counselor Name</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5 text-center">Open Tasks</th>
                    <th className="p-3.5 text-center">Due Today</th>
                    <th className="p-3.5 text-center">Overdue</th>
                    <th className="p-3.5 text-center">Done (Week)</th>
                    <th className="p-3.5 text-center">Completion %</th>
                    <th className="p-3.5 pr-5 text-right">Capacity Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {workloads.map((w) => (
                    <tr key={w.counselorId} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3.5 pl-5">
                        <span className="font-bold text-[#4A7B5B] block">{w.fullName}</span>
                        <span className="text-[11px] text-[#64748B]">{w.email}</span>
                      </td>
                      <td className="p-3.5 text-[#475569] font-medium">{w.department}</td>
                      <td className="p-3.5 text-center font-bold text-[#4A7B5B]">{w.openTasks}</td>
                      <td className="p-3.5 text-center font-bold text-amber-700">{w.dueToday}</td>
                      <td className="p-3.5 text-center font-bold text-red-700">
                        {w.overdue > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black">
                            {w.overdue} Overdue
                          </span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold text-[#4A7B5B]">{w.completedThisWeek}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#4A7B5B] rounded-full"
                              style={{ width: `${w.completionRatePct}%` }}
                            />
                          </div>
                          <span className="font-bold text-[11px]">{w.completionRatePct}%</span>
                        </div>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            w.capacityStatus === "FULL"
                              ? "bg-red-100 text-red-800"
                              : w.capacityStatus === "HIGH_LOAD"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {w.capacityStatus.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* TAB CONTENT: TASK LIST & FILTERS */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, task title, counselor..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#475569] focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>

              <select
                value={contextFilter}
                onChange={(e) => setContextFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#475569] focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="ALL">All Contexts</option>
                <option value="LEAD">Lead</option>
                <option value="STUDENT">Student</option>
                <option value="APPLICATION">Application</option>
                <option value="PAYMENT">Payment</option>
              </select>
            </div>
          </div>

          {/* Task Cards Grid */}
          {isLoading ? (
            <div className="p-12 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
              <div className="w-6 h-6 border-2 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading tasks queue...
            </div>
          ) : tasksList.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E8F0] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#4A7B5B] mx-auto opacity-50" />
              <h4 className="text-sm font-bold text-[#4A7B5B]">All Clear! No Tasks in this Queue</h4>
              <p className="text-xs text-[#64748B]">You're up to date on all follow-ups.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasksList.map((task) => {
                const isOverdue = task.isOverdue || task.status === "OVERDUE";
                const isEscalated = task.isEscalated || task.status === "ESCALATED";
                const isCompleted = task.status === "COMPLETED";

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl bg-white border shadow-xs transition-all space-y-3 ${
                      isOverdue
                        ? "border-red-200 hover:border-red-300 bg-red-50/10"
                        : isEscalated
                        ? "border-purple-200 bg-purple-50/10"
                        : isCompleted
                        ? "border-emerald-200 bg-emerald-50/10 opacity-75"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              task.priority === "URGENT"
                                ? "bg-rose-100 text-rose-700 border-rose-200"
                                : task.priority === "HIGH"
                                ? "bg-orange-100 text-orange-700 border-orange-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {task.priority}
                          </span>

                          <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] text-[10px] font-bold">
                            {task.contextType}
                          </span>

                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-black border border-red-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> OVERDUE
                            </span>
                          )}

                          {isEscalated && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-black border border-purple-200 flex items-center gap-1">
                              <Flame className="w-3 h-3" /> ESCALATED
                            </span>
                          )}

                          {isCompleted && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-black border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> DONE
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-[#4A7B5B] mt-1.5">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{task.description}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-[#94A3B8] block font-medium">Due Date</span>
                        <span
                          className={`text-xs font-bold ${
                            isOverdue ? "text-red-600" : "text-[#4A7B5B]"
                          }`}
                        >
                          {new Date(task.dueDate).toLocaleString([], {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Associated Target (Student / Lead) */}
                    {(task.student || task.lead) && (
                      <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-[#94A3B8] uppercase font-bold block">Contact</span>
                          <strong className="text-[#4A7B5B]">
                            {task.student?.fullName || task.lead?.fullName}
                          </strong>
                          <span className="text-[11px] text-[#64748B] ml-2">
                            {task.student?.mobile || task.lead?.mobile}
                          </span>
                        </div>

                        {task.lead?.preferredCourse && (
                          <span className="text-[11px] text-[#4A7B5B] font-semibold">
                            {task.lead.preferredCourse}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9] text-xs">
                      <div className="flex items-center gap-1.5 text-[#64748B]">
                        <UserCheck className="w-3.5 h-3.5 text-[#4A7B5B]" />
                        <span>Counselor: <strong className="text-[#4A7B5B]">{task.User?.fullName || "Assigned"}</strong></span>
                      </div>

                      {!isCompleted && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setReassigningTask(task);
                              setReassignTargetId(counselors[0]?.user?.id || counselors[0]?.id || "");
                            }}
                            className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[11px] font-bold text-[#475569] hover:bg-[#F8FAFC]"
                          >
                            Reassign
                          </button>
                          <button
                            onClick={() => setReschedulingTask(task)}
                            className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[11px] font-bold text-[#475569] hover:bg-[#F8FAFC]"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => setCompletingTask(task)}
                            className="px-3 py-1 rounded-lg bg-[#4A7B5B] text-white text-[11px] font-bold hover:opacity-90 flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Complete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-[#E2E8F0]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#4A7B5B]">New Follow-Up</span>
                <h3 className="text-base font-bold text-[#4A7B5B]">Create Follow-Up Task</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC]"
              >
                <X className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Task Title *</label>
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Call student to discuss scholarship eligibility"
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Due Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Assign to Counselor *</label>
                <select
                  value={newTaskAssignedTo}
                  onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                >
                  {counselors.map((c) => {
                    const counselorUserId = c.user?.id || c.id;
                    const counselorName = c.user?.fullName || c.name || c.user?.email;
                    return (
                      <option key={c.id} value={counselorUserId}>
                        {counselorName} ({c.department || "Admission"})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Instructions / Description</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Task instructions and guidelines..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newTaskTitle.trim() || !newTaskDueDate || !newTaskAssignedTo || createTaskMutation.isPending}
                onClick={() => createTaskMutation.mutate()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#4A7B5B] hover:opacity-90 disabled:opacity-50"
              >
                {createTaskMutation.isPending ? "Creating..." : "Save Follow-up"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE MODAL */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#4A7B5B]">Complete Follow-Up</span>
              <h3 className="text-base font-bold text-[#4A7B5B]">{completingTask.title}</h3>
            </div>

            <div className="space-y-3">
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
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Completion Notes</label>
                <textarea
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="Summary of outcome and key points discussed..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">
                  Schedule Next Follow-Up (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={completeNextDate}
                  onChange={(e) => setCompleteNextDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
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
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#4A7B5B] hover:opacity-90 disabled:opacity-50"
              >
                {completeMutation.isPending ? "Completing..." : "Confirm Done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {reschedulingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#4A7B5B]">Reschedule Follow-Up</span>
              <h3 className="text-base font-bold text-[#4A7B5B]">{reschedulingTask.title}</h3>
            </div>

            <div className="space-y-3">
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
                  placeholder="Explain why the follow-up is being deferred..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
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
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#4A7B5B] hover:opacity-90 disabled:opacity-50"
              >
                {rescheduleMutation.isPending ? "Rescheduling..." : "Save Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REASSIGN MODAL */}
      {reassigningTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#4A7B5B]">Reassign Follow-Up</span>
              <h3 className="text-base font-bold text-[#4A7B5B]">{reassigningTask.title}</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">New Assigned Counselor *</label>
                <select
                  value={reassignTargetId}
                  onChange={(e) => setReassignTargetId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                >
                  {counselors.map((c) => {
                    const cid = c.user?.id || c.id;
                    const cname = c.user?.fullName || c.name || c.user?.email;
                    return (
                      <option key={c.id} value={cid}>
                        {cname} ({c.department || "Admission"})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#4A7B5B] block mb-1">Reason for Reassignment *</label>
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Explain why the follow-up is being transferred..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4A7B5B]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setReassigningTask(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reassignTargetId || !reassignReason.trim() || reassignMutation.isPending}
                onClick={() => reassignMutation.mutate()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#4A7B5B] hover:opacity-90 disabled:opacity-50"
              >
                {reassignMutation.isPending ? "Reassigning..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
