import { useState } from "react";
import {
  Search, Plus, Phone, Mail, Clock, Filter, Edit3, UserCheck, UserX,
  ShieldAlert, Award, Calendar, CheckCircle2, AlertCircle, FileText,
  Users, Briefcase, ChevronRight, RefreshCw, X, Shield, Lock, Laptop,
  Activity, ArrowRight, Eye, Globe, Sparkles, Key, Check, AlertTriangle, LogOut
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi, EmployeeListItem, CreateEmployeePayload, UpdateEmployeePayload } from "../../api/employees.api";
import { useDebounce } from "../../hooks/useDebounce";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  ACTIVE: { bg: "#ECFDF5", text: "#059669", label: "Active", icon: CheckCircle2 },
  SUSPENDED: { bg: "#FEF2F2", text: "#DC2626", label: "Suspended", icon: AlertTriangle },
  DEACTIVATED: { bg: "#F1F5F9", text: "#64748B", label: "Deactivated", icon: UserX },
  PENDING: { bg: "#FFFBEB", text: "#D97706", label: "Pending Setup", icon: Clock },
};

const ROLE_OPTIONS = [
  "SUPER_ADMIN", "ADMIN", "HR_MANAGER", "RECRUITER", "COUNSELOR",
  "SENIOR_COUNSELOR", "TEAM_LEAD", "FINANCE_EXECUTIVE", "SUPPORT_AGENT", "TELECALLER"
];

const DEPARTMENT_OPTIONS = [
  "Human Resources", "Admissions & Counseling", "Academic Operations",
  "Technology & IT", "Marketing & Growth", "Finance & Accounts", "Student Support"
];

export default function EmployeeManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [page, setPage] = useState(1);

  // Selected Employee for 360 View Drawer
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [active360Tab, setActive360Tab] = useState<
    "overview" | "personal" | "recruitment" | "security" | "sessions" | "activity" | "preferences"
  >("overview");

  // Add Employee Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateEmployeePayload>({
    fullName: "",
    email: "",
    mobile: "",
    role: "COUNSELOR",
    department: "Admissions & Counseling",
    designation: "Admission Counselor",
    gender: "Male",
    joiningDate: new Date().toISOString().split("T")[0],
    city: "",
    state: "",
    sendWelcomeEmail: true,
  });

  // Status Change Dialog
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    employee: EmployeeListItem | null;
    newStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
    reason: string;
  }>({
    open: false,
    employee: null,
    newStatus: "ACTIVE",
    reason: "",
  });

  // Edit Employee State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<UpdateEmployeePayload & { id: string }>({ id: "" });

  // Query Employee Directory
  const { data: listRes, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin_employees_list", page, debouncedSearch, selectedDept, selectedRole, selectedStatus],
    queryFn: () =>
      employeesApi.getEmployees({
        page,
        limit: 12,
        search: debouncedSearch || undefined,
        department: selectedDept || undefined,
        role: selectedRole || undefined,
        status: selectedStatus || undefined,
      }),
  });

  // Query 360 Employee Detail
  const { data: detailRes, isLoading: detailLoading, refetch: refetchDetail } = useQuery({
    queryKey: ["admin_employee_360", selectedEmpId],
    queryFn: () => (selectedEmpId ? employeesApi.getEmployee360(selectedEmpId) : null),
    enabled: !!selectedEmpId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreateEmployeePayload) => employeesApi.createEmployee(payload),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Employee created successfully with temporary credentials.");
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin_employees_list"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create employee.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeePayload }) =>
      employeesApi.updateEmployee(id, data),
    onSuccess: () => {
      toast.success("Employee details updated successfully.");
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin_employees_list"] });
      if (selectedEmpId) refetchDetail();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update employee details.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED"; reason?: string }) =>
      employeesApi.updateStatus(id, { status, reason }),
    onSuccess: () => {
      toast.success(`Employee status updated to ${statusDialog.newStatus}.`);
      setStatusDialog({ open: false, employee: null, newStatus: "ACTIVE", reason: "" });
      queryClient.invalidateQueries({ queryKey: ["admin_employees_list"] });
      if (selectedEmpId) refetchDetail();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update status.");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => employeesApi.resetPassword(id, true),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Temporary password generated and sent to official email.");
      if (selectedEmpId) refetchDetail();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to reset password.");
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: (id: string) => employeesApi.revokeSessions(id),
    onSuccess: () => {
      toast.success("All active sessions revoked for this employee.");
      if (selectedEmpId) refetchDetail();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to revoke sessions.");
    },
  });

  const employees = listRes?.data || [];
  const metrics = listRes?.metrics || {
    totalEmployees: 0,
    activeEmployees: 0,
    suspendedEmployees: 0,
    newJoinersThisMonth: 0,
  };
  const totalPages = listRes?.meta?.totalPages || 1;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.fullName.trim() || !createForm.email.trim() || !createForm.mobile.trim()) {
      toast.error("Please fill in name, email, and mobile number.");
      return;
    }
    createMutation.mutate(createForm);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { id, ...data } = editForm;
    updateMutation.mutate({ id, data });
  };

  const openEditModal = (emp: any) => {
    setEditForm({
      id: emp.id,
      fullName: emp.fullName || "",
      email: emp.email || "",
      mobile: emp.mobile || "",
      personalEmail: emp.personalEmail || "",
      personalMobile: emp.personalMobile || "",
      department: emp.department || "",
      designation: emp.designation || "",
      role: emp.role || "",
      gender: emp.gender || "",
      city: emp.city || "",
      state: emp.state || "",
      address: emp.address || "",
      pincode: emp.pincode || "",
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split("T")[0] : "",
      bio: emp.bio || "",
      qualification: emp.qualification || "",
      experience: emp.experience || "",
    });
    setEditModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#E8F3EC" }}>
              <Users className="w-5 h-5 text-[#4A7B5B]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Employee Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#4A7B5B]/10 text-[#4A7B5B]">
              Enterprise HRMS
            </span>
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            Directory, role permissions, recruitment links, temporary credentials, and 360-degree employee profiles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl border border-gray-200 hover:border-gray-300 text-gray-600 bg-white transition hover:bg-gray-50"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-[#4A7B5B]" : ""}`} />
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white shadow-sm transition hover:shadow"
            style={{ background: "#4A7B5B" }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 text-[#4A7B5B]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E293B]">{metrics.totalEmployees}</div>
            <div className="text-xs text-gray-500 font-medium">Total Employees</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E293B]">{metrics.activeEmployees}</div>
            <div className="text-xs text-gray-500 font-medium">Active Accounts</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-50 text-red-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E293B]">{metrics.suspendedEmployees}</div>
            <div className="text-xs text-gray-500 font-medium">Suspended / Inactive</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E293B]">{metrics.newJoinersThisMonth}</div>
            <div className="text-xs text-gray-500 font-medium">Joined This Month</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Employee ID, Name, Email, Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B] transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
          >
            <option value="">All Departments</option>
            {DEPARTMENT_OPTIONS.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
          >
            <option value="">All Roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>

          {(search || selectedDept || selectedRole || selectedStatus) && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedDept("");
                setSelectedRole("");
                setSelectedStatus("");
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#1E293B]">
            <thead className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Employee ID</th>
                <th className="py-3.5 px-4">Role & Dept</th>
                <th className="py-3.5 px-4">Designation</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Joining Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4A7B5B]" />
                    Loading employee directory...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-400" />
                    No employees found matching current filters.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const statusCfg = STATUS_CONFIG[emp.status || (emp.isActive ? "ACTIVE" : "DEACTIVATED")] || STATUS_CONFIG.ACTIVE;
                  const isProtected = emp.role === "SUPER_ADMIN" || emp.role === "ADMIN";
                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-gray-50/60 transition group cursor-pointer"
                      onClick={() => setSelectedEmpId(emp.id)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ background: isProtected ? "#F0AE1A" : "#4A7B5B" }}>
                            {emp.avatar ? (
                              <img src={emp.avatar} alt={emp.fullName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              emp.fullName?.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 group-hover:text-[#4A7B5B] transition flex items-center gap-1.5">
                              {emp.fullName}
                              {isProtected && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  PROTECTED
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{emp.email || "No official email"}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-gray-100 text-gray-800">
                          {emp.employeeId || "UNASSIGNED"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-xs font-semibold text-gray-800">{emp.role}</div>
                        <div className="text-[11px] text-gray-500">{emp.department || "General"}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-gray-700">
                        {emp.designation || "Staff Member"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: statusCfg.bg, color: statusCfg.text }}
                        >
                          <statusCfg.icon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                        {emp.mustChangePassword && (
                          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                            Temp Password
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-gray-500">
                        {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "—"}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedEmpId(emp.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#4A7B5B] hover:bg-emerald-50 transition"
                            title="View 360 Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Edit Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {emp.status !== "SUSPENDED" ? (
                            <button
                              onClick={() =>
                                setStatusDialog({
                                  open: true,
                                  employee: emp,
                                  newStatus: "SUSPENDED",
                                  reason: "",
                                })
                              }
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
                              title="Suspend Employee"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setStatusDialog({
                                  open: true,
                                  employee: emp,
                                  newStatus: "ACTIVE",
                                  reason: "",
                                })
                              }
                              className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition"
                              title="Activate Employee"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div>
              Showing Page {page} of {totalPages} ({metrics.totalEmployees} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 360 DEGREE PROFILE DRAWER / MODAL */}
      {selectedEmpId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-emerald-50/50 to-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-xl shadow" style={{ background: "#4A7B5B" }}>
                  {detailRes?.user?.avatar ? (
                    <img src={detailRes.user.avatar} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    detailRes?.user?.fullName?.slice(0, 2).toUpperCase() || "EM"
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">{detailRes?.user?.fullName || "Employee"}</h2>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                      {detailRes?.user?.employeeId || "UNASSIGNED"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                    <span>{detailRes?.user?.email || "No email"}</span>
                    <span>•</span>
                    <span>{detailRes?.user?.department || "General"}</span>
                    <span>•</span>
                    <span className="font-medium text-[#4A7B5B]">{detailRes?.user?.role}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmpId(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-100 px-6 gap-6 text-xs font-semibold overflow-x-auto shrink-0 bg-white">
              {[
                { id: "overview", label: "Overview & Stats" },
                { id: "personal", label: "Personal & Work" },
                { id: "recruitment", label: "Recruitment Link" },
                { id: "security", label: "Security & Portal" },
                { id: "sessions", label: "Sessions & History" },
                { id: "activity", label: "Activity Log" },
                { id: "preferences", label: "Preferences" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActive360Tab(t.id as any)}
                  className={`py-3.5 border-b-2 transition whitespace-nowrap ${
                    active360Tab === t.id
                      ? "border-[#4A7B5B] text-[#4A7B5B]"
                      : "border-transparent text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC]">
              {detailLoading ? (
                <div className="text-center py-20 text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4A7B5B]" />
                  Loading 360° employee data...
                </div>
              ) : !detailRes?.user ? (
                <div className="text-center py-20 text-gray-400">
                  Employee profile details not available.
                </div>
              ) : (
                <>
                  {/* TAB 1: OVERVIEW */}
                  {active360Tab === "overview" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white p-4 rounded-xl border border-gray-100">
                          <div className="text-xl font-bold text-gray-900">{detailRes.stats?.assignedLeads ?? 0}</div>
                          <div className="text-xs text-gray-500 mt-1">Assigned Leads</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100">
                          <div className="text-xl font-bold text-gray-900">{detailRes.stats?.applicationsProcessed ?? 0}</div>
                          <div className="text-xs text-gray-500 mt-1">Applications Handled</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100">
                          <div className="text-xl font-bold text-gray-900">{detailRes.stats?.documentsVerified ?? 0}</div>
                          <div className="text-xs text-gray-500 mt-1">Verified Docs</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100">
                          <div className="text-xl font-bold text-gray-900">{detailRes.stats?.supportTicketsCount ?? 0}</div>
                          <div className="text-xs text-gray-500 mt-1">Support Tickets</div>
                        </div>
                      </div>

                      {/* Linked Recruitment Snapshot */}
                      {detailRes.recruitment ? (
                        <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                              Recruited via HR Onboarding
                            </span>
                            <span className="text-xs text-gray-500">
                              App ID: {detailRes.recruitment.applicationId}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="text-gray-400">Hired For Vacancy</div>
                              <div className="font-semibold text-gray-800">{detailRes.recruitment.vacancyTitle} ({detailRes.recruitment.vacancyCode})</div>
                            </div>
                            <div>
                              <div className="text-gray-400">Department / Role</div>
                              <div className="font-semibold text-gray-800">{detailRes.recruitment.hiredDepartment} — {detailRes.recruitment.hiredDesignation}</div>
                            </div>
                            <div>
                              <div className="text-gray-400">Work Mode & Location</div>
                              <div className="font-semibold text-gray-800">{detailRes.recruitment.workMode} ({detailRes.recruitment.workLocation || "Head Office"})</div>
                            </div>
                            <div>
                              <div className="text-gray-400">Onboarding Status</div>
                              <div className="font-semibold text-emerald-600">{detailRes.recruitment.status}</div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Key Account Info */}
                      <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-3">
                        <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Account Identity</h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-gray-500">Official Email:</span>
                            <div className="font-medium text-gray-900">{detailRes.user.email || "—"}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Official Mobile:</span>
                            <div className="font-medium text-gray-900">{detailRes.user.mobile || "—"}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Joining Date:</span>
                            <div className="font-medium text-gray-900">{detailRes.user.joiningDate ? new Date(detailRes.user.joiningDate).toLocaleDateString() : "—"}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Last Login:</span>
                            <div className="font-medium text-gray-900">{detailRes.user.lastLogin ? new Date(detailRes.user.lastLogin).toLocaleString() : "Never"}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PERSONAL & WORK */}
                  {active360Tab === "personal" && (
                    <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Personal & Professional Info</h3>
                        <button
                          onClick={() => openEditModal(detailRes.user)}
                          className="flex items-center gap-1.5 text-xs text-[#4A7B5B] font-semibold hover:underline"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit Profile
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-400">Personal Email:</span>
                          <div className="font-medium text-gray-800">{detailRes.user.personalEmail || "—"}</div>
                        </div>
                        <div>
                          <span className="text-gray-400">Personal Mobile:</span>
                          <div className="font-medium text-gray-800">{detailRes.user.personalMobile || "—"}</div>
                        </div>
                        <div>
                          <span className="text-gray-400">Gender & DOB:</span>
                          <div className="font-medium text-gray-800">{detailRes.user.gender || "—"}, {detailRes.user.dateOfBirth ? new Date(detailRes.user.dateOfBirth).toLocaleDateString() : "—"}</div>
                        </div>
                        <div>
                          <span className="text-gray-400">Blood Group:</span>
                          <div className="font-medium text-gray-800">{detailRes.user.bloodGroup || "—"}</div>
                        </div>
                        <div>
                          <span className="text-gray-400">City, State, Pincode:</span>
                          <div className="font-medium text-gray-800">{[detailRes.user.city, detailRes.user.state, detailRes.user.pincode].filter(Boolean).join(", ") || "—"}</div>
                        </div>
                        <div>
                          <span className="text-gray-400">Full Address:</span>
                          <div className="font-medium text-gray-800">{detailRes.user.address || "—"}</div>
                        </div>
                        <div>
                          <span className="text-gray-400">Qualification:</span>
                          <div className="font-medium text-gray-800">{detailRes.user.qualification || "—"}</div>
                        </div>
                        <div>
                          <span className="text-gray-400">Experience:</span>
                          <div className="font-medium text-gray-800">{detailRes.user.experience || "—"}</div>
                        </div>
                      </div>

                      {detailRes.user.bio && (
                        <div className="pt-2 border-t border-gray-100 text-xs">
                          <span className="text-gray-400">Bio:</span>
                          <p className="text-gray-700 mt-1">{detailRes.user.bio}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: RECRUITMENT */}
                  {active360Tab === "recruitment" && (
                    <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-4">
                      <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">HR Recruitment Linkage</h3>
                      {detailRes.recruitment ? (
                        <div className="space-y-4 text-xs">
                          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100">
                            <div className="font-bold text-emerald-900 text-sm">
                              {detailRes.recruitment.vacancyTitle}
                            </div>
                            <div className="text-emerald-700 mt-1">
                              Vacancy Code: {detailRes.recruitment.vacancyCode} • Application ID: {detailRes.recruitment.applicationId}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-gray-400">Hired Department:</span>
                              <div className="font-semibold text-gray-800">{detailRes.recruitment.hiredDepartment}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Hired Designation:</span>
                              <div className="font-semibold text-gray-800">{detailRes.recruitment.hiredDesignation}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Employment Type:</span>
                              <div className="font-semibold text-gray-800">{detailRes.recruitment.employmentType}</div>
                            </div>
                            <div>
                              <span className="text-gray-400">Work Mode & Location:</span>
                              <div className="font-semibold text-gray-800">{detailRes.recruitment.workMode} - {detailRes.recruitment.workLocation || "HO"}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400 text-xs">
                          This employee was directly created by an administrator and does not have a linked recruitment application.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: SECURITY & PORTAL */}
                  {active360Tab === "security" && (
                    <div className="space-y-4">
                      {/* Portal Eligibility Card */}
                      <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-3">
                        <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Portal Access Control</h3>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                          <div>
                            <div className="text-xs font-semibold text-gray-900">
                              {detailRes.user.role === "SUPER_ADMIN" || detailRes.user.role === "ADMIN"
                                ? "Protected Admin Portal"
                                : "Employee ERP Portal"}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                              {detailRes.user.role === "SUPER_ADMIN" || detailRes.user.role === "ADMIN"
                                ? "https://admin.swayamadmission.com"
                                : "https://erp.swayamadmission.com"}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#4A7B5B]/10 text-[#4A7B5B]">
                            AUTHORIZED
                          </span>
                        </div>
                      </div>

                      {/* Password & Security Actions */}
                      <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-4">
                        <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Credentials & Access Actions</h3>

                        <div className="flex items-center justify-between py-2 border-b border-gray-50 text-xs">
                          <div>
                            <div className="font-semibold text-gray-900">Mandatory First-Login Password Change</div>
                            <div className="text-gray-500">
                              {detailRes.user.mustChangePassword ? "Pending change on next login" : "Completed / Standard password set"}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${detailRes.user.mustChangePassword ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
                            {detailRes.user.mustChangePassword ? "PENDING" : "SET"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-2">
                          <button
                            onClick={() => {
                              if (confirm("Generate new temporary password and email credentials to this employee?")) {
                                resetPasswordMutation.mutate(detailRes.user.id);
                              }
                            }}
                            disabled={resetPasswordMutation.isPending}
                            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border border-gray-200 hover:border-gray-300 text-gray-700 bg-white transition hover:bg-gray-50"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reset Credentials (Temp Password Email)</span>
                          </button>

                          <button
                            onClick={() => {
                              if (confirm("Revoke all active device sessions for this employee?")) {
                                revokeSessionsMutation.mutate(detailRes.user.id);
                              }
                            }}
                            disabled={revokeSessionsMutation.isPending}
                            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Revoke All Sessions</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: SESSIONS & LOGIN HISTORY */}
                  {active360Tab === "sessions" && (
                    <div className="space-y-4">
                      {/* Active Sessions */}
                      <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Active Device Sessions</h3>
                          <span className="text-xs text-gray-400">{detailRes.deviceSessions?.length || 0} active</span>
                        </div>

                        {detailRes.deviceSessions?.length ? (
                          <div className="divide-y divide-gray-100 text-xs">
                            {detailRes.deviceSessions.map((s: any) => (
                              <div key={s.id} className="py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Laptop className="w-4 h-4 text-gray-400" />
                                  <div>
                                    <div className="font-semibold text-gray-800">{s.browser || "Browser"} on {s.os || "Device"}</div>
                                    <div className="text-[11px] text-gray-400">IP: {s.ipAddress || "Unknown"} • Last active: {new Date(s.lastActiveAt).toLocaleString()}</div>
                                  </div>
                                </div>
                                {s.isCurrent && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">CURRENT</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 py-3">No active sessions recorded.</div>
                        )}
                      </div>

                      {/* Login History */}
                      <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-3">
                        <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Recent Login Attempts</h3>
                        {detailRes.loginHistories?.length ? (
                          <div className="divide-y divide-gray-100 text-xs">
                            {detailRes.loginHistories.map((h: any) => (
                              <div key={h.id} className="py-2.5 flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-gray-800">{new Date(h.createdAt).toLocaleString()}</div>
                                  <div className="text-[11px] text-gray-400">IP: {h.ipAddress || "—"} • {h.browser || "Client"} ({h.os || "OS"})</div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.status === "SUCCESS" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                  {h.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 py-3">No past login history recorded.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 6: ACTIVITY TIMELINE */}
                  {active360Tab === "activity" && (
                    <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-4">
                      <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Employee Audit Activity</h3>
                      {detailRes.activityTimeline?.length ? (
                        <div className="relative pl-6 space-y-4 border-l-2 border-gray-100">
                          {detailRes.activityTimeline.map((act: any) => (
                            <div key={act.id} className="relative">
                              <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-[#4A7B5B] ring-4 ring-white" />
                              <div className="text-xs font-semibold text-gray-900">{act.action}</div>
                              <div className="text-[11px] text-gray-600 mt-0.5">{act.description || act.module}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(act.createdAt).toLocaleString()} {act.ipAddress ? `• IP: ${act.ipAddress}` : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-400 text-xs">No activity timeline entries found.</div>
                      )}
                    </div>
                  )}

                  {/* TAB 7: PREFERENCES */}
                  {active360Tab === "preferences" && (
                    <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-4 text-xs">
                      <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">System Preferences</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-400">Language:</span>
                          <div className="font-semibold text-gray-800">{detailRes.user.language || "English"}</div>
                        </div>
                        <div>
                          <span className="text-gray-400">Timezone:</span>
                          <div className="font-semibold text-gray-800">{detailRes.user.timezone || "Asia/Kolkata"}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE EMPLOYEE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-50 text-[#4A7B5B]">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900">Add New Employee</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                    placeholder="name@swayamadmission.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={createForm.mobile}
                    onChange={(e) => setCreateForm({ ...createForm, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                    placeholder="e.g. +91 9876543210"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Role *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Department</label>
                  <select
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                  >
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Designation</label>
                  <input
                    type="text"
                    value={createForm.designation}
                    onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                    placeholder="e.g. Senior Counselor"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Joining Date</label>
                  <input
                    type="date"
                    value={createForm.joiningDate}
                    onChange={(e) => setCreateForm({ ...createForm, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">City / State</label>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                    placeholder="e.g. Chandigarh, PB"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.sendWelcomeEmail}
                    onChange={(e) => setCreateForm({ ...createForm, sendWelcomeEmail: e.target.checked })}
                    className="w-4 h-4 text-[#4A7B5B] rounded border-gray-300"
                  />
                  <span className="font-semibold text-emerald-900">
                    Generate Temporary Password & Email Joining Credentials
                  </span>
                </label>
                <p className="text-[11px] text-emerald-700">
                  A unique Employee ID and temporary password will be cryptographically generated and sent to the official email with login instructions. First-login password change will be enforced.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 rounded-xl font-medium text-white shadow-sm transition hover:shadow flex items-center gap-2"
                  style={{ background: "#4A7B5B" }}
                >
                  {createMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Employee</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-bold text-gray-900">Edit Employee Details</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={editForm.fullName || ""}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Official Mobile</label>
                  <input
                    type="tel"
                    value={editForm.mobile || ""}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Department</label>
                  <select
                    value={editForm.department || ""}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                  >
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Designation</label>
                  <input
                    type="text"
                    value={editForm.designation || ""}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Personal Email</label>
                  <input
                    type="email"
                    value={editForm.personalEmail || ""}
                    onChange={(e) => setEditForm({ ...editForm, personalEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Personal Mobile</label>
                  <input
                    type="tel"
                    value={editForm.personalMobile || ""}
                    onChange={(e) => setEditForm({ ...editForm, personalMobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    value={editForm.city || ""}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">State</label>
                  <input
                    type="text"
                    value={editForm.state || ""}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  value={editForm.address || ""}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 rounded-xl font-medium text-white shadow-sm transition hover:shadow flex items-center gap-2"
                  style={{ background: "#4A7B5B" }}
                >
                  {updateMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS CHANGE CONFIRMATION DIALOG */}
      {statusDialog.open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusDialog.newStatus === "SUSPENDED" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  Confirm Account {statusDialog.newStatus}
                </h3>
                <p className="text-xs text-gray-500">
                  Employee: {statusDialog.employee?.fullName} ({statusDialog.employee?.employeeId})
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-medium text-gray-700">Reason for Status Change</label>
              <textarea
                value={statusDialog.reason}
                onChange={(e) => setStatusDialog({ ...statusDialog, reason: e.target.value })}
                placeholder="Enter audit reason for this status modification..."
                className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 h-20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setStatusDialog({ open: false, employee: null, newStatus: "ACTIVE", reason: "" })}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (statusDialog.employee) {
                    statusMutation.mutate({
                      id: statusDialog.employee.id,
                      status: statusDialog.newStatus,
                      reason: statusDialog.reason,
                    });
                  }
                }}
                disabled={statusMutation.isPending}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition ${statusDialog.newStatus === "SUSPENDED" ? "bg-red-600 hover:bg-red-700" : "bg-[#4A7B5B] hover:bg-[#3D664A]"}`}
              >
                {statusMutation.isPending ? "Updating..." : `Confirm ${statusDialog.newStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
