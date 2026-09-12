import { useState } from "react";
import {
  Shield, Users, Plus, Edit, Trash2, Copy, ChevronRight, ChevronDown,
  X, Search, Check, Eye, FileEdit, FilePlus, FileX, Download, ThumbsUp,
  MapPin, UserCheck, AlertTriangle, Info, Lock, Unlock, Star, Settings,
  BarChart3, BookOpen, Building2, GraduationCap, Brain, Bell, CreditCard,
  Megaphone, Activity, Rss, FolderOpen, Library, Trophy, ZapOff, Zap,
  LayoutDashboard, ChevronUp, UserPlus, ArrowRight, Filter, RefreshCw, Layers,
  CheckCircle2, XCircle, Clock, Key, ArrowLeftRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesApi, CreateRoleDto, GovernanceRequest } from "../../api/roles.api";
import { usePermissions } from "../../hooks/usePermissions";

// ─── Types ────────────────────────────────────────────────────────────────────

type PermissionKey = "view" | "create" | "edit" | "delete" | "export" | "approve";
type ModulePermissions = Record<PermissionKey, boolean>;
type RolePermissionsMap = Record<string, ModulePermissions>;

interface Role {
  id: string;
  name: string;
  slug?: string;
  description: string;
  color: string;
  level: number;
  priority?: number;
  department?: string;
  parentId?: string | null;
  parentRole?: { id: string; name: string; slug: string } | null;
  userCount: number;
  status: "ACTIVE" | "DISABLED" | "LOCKED" | "ARCHIVED";
  isProtected: boolean;
  selfRegistrable?: boolean;
  approvalRequired?: boolean;
  dataScope: string;
  roleType?: string;
  lockReason?: string | null;
  stateRestricted: boolean;
  states: string[];
  permissions: RolePermissionsMap;
  reportingTo?: string | null;
  canApprove?: boolean;
  isSystem?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULES = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { id: "leads", label: "Leads", icon: Users, group: "CRM" },
  { id: "students", label: "Students", icon: GraduationCap, group: "CRM" },
  { id: "counselors", label: "Counselors", icon: UserCheck, group: "CRM" },
  { id: "applications", label: "Applications", icon: FileEdit, group: "CRM" },
  { id: "colleges", label: "Colleges", icon: Building2, group: "Academic" },
  { id: "courses", label: "Courses", icon: BookOpen, group: "Academic" },
  { id: "exams", label: "Exams", icon: Trophy, group: "Academic" },
  { id: "scholarships", label: "Scholarships", icon: Star, group: "Academic" },
  { id: "materials", label: "Study Materials", icon: Library, group: "Academic" },
  { id: "documents", label: "Documents", icon: FolderOpen, group: "Content" },
  { id: "blogs", label: "Blogs & SEO", icon: Rss, group: "Content" },
  { id: "ai", label: "AI Counselor", icon: Brain, group: "Intelligence" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "Intelligence" },
  { id: "marketing", label: "Marketing", icon: Megaphone, group: "Intelligence" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Operations" },
  { id: "payments", label: "Payments", icon: CreditCard, group: "Operations" },
  { id: "rbac", label: "Roles & Permissions", icon: Shield, group: "System" },
  { id: "settings", label: "Settings", icon: Settings, group: "System" },
  { id: "logs", label: "Activity Logs", icon: Activity, group: "System" },
];

const PERM_KEYS: PermissionKey[] = ["view", "create", "edit", "delete", "export", "approve"];

const PERM_LABELS: Record<PermissionKey, { short: string; color: string; bg: string; icon: any }> = {
  view: { short: "V", color: "#2563EB", bg: "#DBEAFE", icon: Eye },
  create: { short: "C", color: "#059669", bg: "#D1FAE5", icon: FilePlus },
  edit: { short: "E", color: "#D97706", bg: "#FEF3C7", icon: FileEdit },
  delete: { short: "D", color: "#DC2626", bg: "#FEE2E2", icon: FileX },
  export: { short: "X", color: "#7C3AED", bg: "#EDE9FE", icon: Download },
  approve: { short: "A", color: "#4A7B5B", bg: "#E8F3EC", icon: ThumbsUp },
};

function noAccess(): ModulePermissions {
  return { view: false, create: false, edit: false, delete: false, export: false, approve: false };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PermBadge({ perm, active, onClick }: { perm: PermissionKey; active: boolean; onClick?: () => void }) {
  const conf = PERM_LABELS[perm];
  return (
    <button
      type="button"
      onClick={onClick}
      title={perm.charAt(0).toUpperCase() + perm.slice(1)}
      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-all border"
      style={{
        background: active ? conf.bg : "#F8FAFC",
        color: active ? conf.color : "#CBD5E1",
        borderColor: active ? conf.color + "40" : "#F1F5F9",
        cursor: onClick ? "pointer" : "default"
      }}
    >
      {conf.short}
    </button>
  );
}

function StatusBadge({ status }: { status: Role["status"] }) {
  switch (status) {
    case "ACTIVE":
      return <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">ACTIVE</span>;
    case "DISABLED":
      return <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-amber-50 text-amber-700 border border-amber-200">DISABLED</span>;
    case "LOCKED":
      return <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><Lock size={10} /> LOCKED</span>;
    case "ARCHIVED":
      return <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-slate-100 text-slate-600 border border-slate-300">ARCHIVED</span>;
    default:
      return <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-gray-100 text-gray-600">{status}</span>;
  }
}

function AccessLevelBadge({ role }: { role: Role }) {
  const active = PERM_KEYS.filter(p => Object.values(role.permissions || {}).some(m => m[p])).length;
  const pct = Math.round((active / PERM_KEYS.length) * 100);
  let label = "Limited", bg = "#F1F5F9", color = "#64748B";
  if (pct === 100) { label = "Full Access"; bg = "#E8F3EC"; color = "#4A7B5B"; }
  else if (pct >= 60) { label = "High Access"; bg = "#DBEAFE"; color = "#2563EB"; }
  else if (pct >= 30) { label = "Moderate"; bg = "#FEF3C7"; color = "#D97706"; }
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: bg, color }}>{label}</span>;
}

function HierarchyNode({
  role, roles, depth, expandedNodes, onToggle, onSelect
}: {
  role: Role; roles: Role[]; depth: number; expandedNodes: Set<string>;
  onToggle: (id: string) => void; onSelect: (r: Role) => void;
}) {
  const children = roles.filter(r => r.parentId === role.id);
  const isExpanded = expandedNodes.has(role.id);

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 bg-white hover:border-[#4A7B5B]/50 transition-all cursor-pointer"
        style={{ marginLeft: `${depth * 20}px` }}
        onClick={() => onSelect(role)}
      >
        {children.length > 0 ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(role.id); }}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-slate-700"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <div className="w-5" />
        )}
        <div className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-white text-[10px]" style={{ background: role.color }}>
          {(role.name || "R").charAt(0)}
        </div>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900">{role.name}</span>
          <span className="text-[10px] text-gray-400 font-semibold">Level {role.level}</span>
          {role.isProtected && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <Shield size={10} /> Protected
            </span>
          )}
          <StatusBadge status={role.status || "ACTIVE"} />
        </div>
        <span className="text-[11px] font-semibold text-gray-500">{role.userCount} Users</span>
      </div>

      {isExpanded && children.map(child => (
        <HierarchyNode
          key={child.id}
          role={child}
          roles={roles}
          depth={depth + 1}
          expandedNodes={expandedNodes}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// ─── Modals ────────────────────────────────────────────────────────────────────

function CreateRoleModal({
  roles,
  onClose,
  onCreate,
  isSubmitting,
  errorMessage,
}: {
  roles: Role[];
  onClose: () => void;
  onCreate: (dto: CreateRoleDto) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [modalTab, setModalTab] = useState<"basic" | "permissions" | "scope" | "governance">("basic");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("Admissions");
  const [level, setLevel] = useState(3);
  const [priority, setPriority] = useState(50);
  const [color, setColor] = useState("#4A7B5B");
  const [parentRoleId, setParentRoleId] = useState<string>("");
  const [dataScope, setDataScope] = useState<any>("GLOBAL");
  const [isProtected, setIsProtected] = useState(false);
  const [selfRegistrable, setSelfRegistrable] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, Record<string, boolean>>>({});

  const toggleModalPerm = (moduleId: string, perm: PermissionKey) => {
    setPermissionsMatrix(prev => {
      const current = prev[moduleId] || { view: false, create: false, edit: false, delete: false, export: false, approve: false };
      return {
        ...prev,
        [moduleId]: {
          ...current,
          [perm]: !current[perm],
        },
      };
    });
  };

  const handleFormSubmit = () => {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      description,
      color,
      level,
      priority,
      department,
      parentRoleId: parentRoleId || undefined,
      dataScope,
      isProtected,
      selfRegistrable,
      approvalRequired,
      permissionsMatrix,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9] bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs" style={{ background: color + "15" }}>
              <Shield className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <h3 className="font-extrabold text-[#0F172A] text-lg leading-tight">Create Enterprise Access Role</h3>
              <p className="text-xs text-[#94A3B8]">Configure role hierarchy, data scope & backend permission matrix</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-[#94A3B8]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-100 px-6 py-3 flex items-center gap-2 text-rose-800 text-xs font-bold">
            <AlertTriangle size={16} className="shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Tabs */}
        <div className="flex border-b border-gray-100 bg-white px-6">
          {(["basic", "permissions", "scope", "governance"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setModalTab(tab)}
              className="py-3 px-4 text-xs font-extrabold capitalize border-b-2 transition-all flex items-center gap-1.5"
              style={{
                borderColor: modalTab === tab ? "#4A7B5B" : "transparent",
                color: modalTab === tab ? "#4A7B5B" : "#94A3B8",
              }}
            >
              {tab === "basic" && <Info size={14} />}
              {tab === "permissions" && <Lock size={14} />}
              {tab === "scope" && <MapPin size={14} />}
              {tab === "governance" && <Shield size={14} />}
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {modalTab === "basic" && (
            <div className="space-y-4">
              <div>
                <label className="text-[#0F172A] text-xs font-bold block mb-1">Role Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Regional Finance Head"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#4A7B5B] font-semibold"
                />
              </div>

              <div>
                <label className="text-[#0F172A] text-xs font-bold block mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe role duties and operational privileges..."
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#4A7B5B] h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#0F172A] text-xs font-bold block mb-1">Department</label>
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
                  >
                    <option value="Executive">Executive</option>
                    <option value="Admissions">Admissions</option>
                    <option value="Management">Management</option>
                    <option value="Finance">Finance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Support">Support</option>
                    <option value="Academic">Academic</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#0F172A] text-xs font-bold block mb-1">Parent Role (Hierarchy)</label>
                  <select
                    value={parentRoleId}
                    onChange={e => setParentRoleId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
                  >
                    <option value="">No Parent (Root Role)</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name} (Level {r.level})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#0F172A] text-xs font-bold block mb-1">Hierarchy Level</label>
                  <select
                    value={level}
                    onChange={e => setLevel(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
                  >
                    <option value={1}>Level 1 (Executive)</option>
                    <option value={2}>Level 2 (Director)</option>
                    <option value={3}>Level 3 (Regional / State)</option>
                    <option value={4}>Level 4 (Senior)</option>
                    <option value={5}>Level 5 (Operational)</option>
                    <option value={6}>Level 6 (Support / Associate)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {modalTab === "permissions" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Configure direct permission matrix. Inherited permissions from parent roles apply automatically.</p>
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {MODULES.map(m => {
                  const currentMod = permissionsMatrix[m.id] || noAccess();
                  return (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-xl border border-gray-100 hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <m.icon size={14} className="text-[#4A7B5B]" />
                        <span className="text-xs font-bold text-slate-800">{m.label}</span>
                      </div>
                      <div className="flex gap-1">
                        {PERM_KEYS.map(k => (
                          <PermBadge key={k} perm={k} active={currentMod[k]} onClick={() => toggleModalPerm(m.id, k)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {modalTab === "scope" && (
            <div className="space-y-4">
              <div>
                <label className="text-[#0F172A] text-xs font-bold block mb-1">Data Scope Access</label>
                <select
                  value={dataScope}
                  onChange={e => setDataScope(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
                >
                  <option value="GLOBAL">GLOBAL (Full enterprise-wide access)</option>
                  <option value="DEPARTMENT">DEPARTMENT (Limited to assigned department)</option>
                  <option value="TEAM">TEAM (Limited to assigned organizational team)</option>
                  <option value="REGION">REGION (Regional territory)</option>
                  <option value="STATE">STATE (Assigned states)</option>
                  <option value="DISTRICT">DISTRICT (District branch level)</option>
                  <option value="ASSIGNED">ASSIGNED (Only directly assigned leads/students)</option>
                  <option value="SELF">SELF (Own records only)</option>
                </select>
              </div>
            </div>
          )}

          {modalTab === "governance" && (
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isProtected}
                  onChange={e => setIsProtected(e.target.checked)}
                  className="mt-0.5 rounded text-[#4A7B5B]"
                />
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">Mark as Protected Role</span>
                  <span className="text-[11px] text-emerald-700 block">
                    Protected roles require 2-person approval / governance request for mutation or deletion, and are guarded against accidental lockout.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-blue-100 bg-blue-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selfRegistrable}
                  onChange={e => setSelfRegistrable(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600"
                />
                <div>
                  <span className="text-xs font-bold text-blue-950 block">Self-Registration (Open on Staff Onboarding Portal)</span>
                  <span className="text-[11px] text-blue-700 block">
                    When enabled, candidates on the public Staff Onboarding Portal can select and apply for this dynamic role.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-100 bg-amber-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approvalRequired}
                  onChange={e => setApprovalRequired(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600"
                />
                <div>
                  <span className="text-xs font-bold text-amber-950 block">Administrative Approval & KYC Required</span>
                  <span className="text-[11px] text-amber-700 block">
                    Staff applicants must submit KYC documents and require Admin approval before accessing corporate systems.
                  </span>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F1F5F9] bg-slate-50/50 flex items-center justify-between">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-slate-800">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={isSubmitting || !name.trim()}
            className="px-5 py-2 rounded-xl text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            style={{ background: "#4A7B5B" }}
          >
            {isSubmitting ? "Creating..." : "Create Role"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main RBAC Page Component ──────────────────────────────────────────────────

type Tab = "overview" | "matrix" | "hierarchy" | "governance" | "audit";

export default function RBACPage() {
  const queryClient = useQueryClient();
  const { user, isSuperAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [searchModules, setSearchModules] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["super-admin", "director"]));
  const [reparentModalRole, setReparentModalRole] = useState<Role | null>(null);
  const [newParentId, setNewParentId] = useState<string>("");
  const [securityLockRole, setSecurityLockRole] = useState<Role | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [governanceModal, setGovernanceModal] = useState<{ isOpen: boolean; actionType: string; roleId?: string; roleName?: string }>({
    isOpen: false,
    actionType: "",
  });
  const [governanceReason, setGovernanceReason] = useState("");

  // Live Queries
  const { data: statsRes } = useQuery({
    queryKey: ["admin_roles_stats"],
    queryFn: () => rolesApi.getStats(),
  });

  const { data: rolesRes, refetch: refetchRoles } = useQuery({
    queryKey: ["admin_roles"],
    queryFn: () => rolesApi.getRoles(),
  });

  const { data: hierarchyRes } = useQuery({
    queryKey: ["admin_roles_hierarchy"],
    queryFn: () => rolesApi.getHierarchy(),
  });

  const { data: governanceRes, refetch: refetchGovernance } = useQuery({
    queryKey: ["admin_governance_requests"],
    queryFn: () => rolesApi.getGovernanceRequests(),
  });

  const { data: auditRes } = useQuery({
    queryKey: ["admin_roles_audit"],
    queryFn: () => rolesApi.getAuditLogs(),
  });

  // Reparent preview query
  const { data: previewRes } = useQuery({
    queryKey: ["admin_roles_preview_reparent", reparentModalRole?.id, newParentId],
    queryFn: () => rolesApi.previewReparent(reparentModalRole!.id, newParentId || undefined),
    enabled: !!reparentModalRole,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (dto: CreateRoleDto) => rolesApi.createRole(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_hierarchy"] });
      setShowCreateModal(false);
      setModalError(null);
    },
    onError: (err: any) => {
      setModalError(err.response?.data?.message || err.message || "Failed to create role");
    },
  });

  const updateMatrixMutation = useMutation({
    mutationFn: ({ id, matrix }: { id: string; matrix: any }) => rolesApi.updatePermissionsMatrix(id, matrix),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
    },
  });

  const reparentMutation = useMutation({
    mutationFn: ({ id, parentRoleId }: { id: string; parentRoleId: string | null }) =>
      rolesApi.reparentRole(id, parentRoleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_hierarchy"] });
      setReparentModalRole(null);
    },
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => rolesApi.disableRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_roles"] }),
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => rolesApi.enableRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_roles"] }),
  });

  const lockMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rolesApi.lockRole(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      setSecurityLockRole(null);
      setLockReason("");
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => rolesApi.unlockRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_roles"] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => rolesApi.archiveRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_roles"] }),
  });

  const approveGovMutation = useMutation({
    mutationFn: (id: string) => rolesApi.approveGovernanceRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_governance_requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
    },
  });

  const rejectGovMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rolesApi.rejectGovernanceRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_governance_requests"] });
    },
  });

  const stats = statsRes?.data || {};
  const rolesList: Role[] = rolesRes?.data?.data || [];
  const governanceRequests: GovernanceRequest[] = governanceRes?.data?.requests || [];
  const auditLogs = auditRes?.data?.logs || [];

  const filteredRoles = rolesList.filter(r => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "PROTECTED") return r.isProtected;
    return r.status === statusFilter;
  });

  const handlePermissionChange = (roleId: string, moduleId: string, perm: PermissionKey) => {
    const role = rolesList.find(r => r.id === roleId);
    if (!role) return;

    const currentMatrix = role.permissions || {};
    const modPerms = currentMatrix[moduleId] || noAccess();
    const updatedMod = { ...modPerms, [perm]: !modPerms[perm] };
    const updatedMatrix = { ...currentMatrix, [moduleId]: updatedMod };
    updateMatrixMutation.mutate({ id: roleId, matrix: updatedMatrix });
  };

  const toggleNode = (id: string) =>
    setExpandedNodes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const summaryCards = [
    { label: "Total Roles", value: stats.totalRoles ?? rolesList.length, icon: Shield, color: "#4A7B5B", bg: "#E8F3EC", sub: "Defined Roles" },
    { label: "Active Roles", value: stats.activeRoles ?? 0, icon: CheckCircle2, color: "#10B981", bg: "#D1FAE5", sub: "Live in Production" },
    { label: "Protected Roles", value: stats.protectedRoles ?? 0, icon: Lock, color: "#7C3AED", bg: "#EDE9FE", sub: "2-Person Guarded" },
    { label: "Pending Approvals", value: stats.pendingApprovals ?? governanceRequests.filter(g => g.status === "PENDING").length, icon: Clock, color: "#F0AE1A", bg: "#FEF3C7", sub: "Governance Queue" },
  ];

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[#0F172A] text-2xl font-extrabold tracking-tight">Enterprise IAM, Role Hierarchy & Governance</h2>
          <p className="text-[#94A3B8] text-xs mt-0.5">Dynamic Role-Based Access Control (RBAC), Inheritance, Lifecycle & Two-Person Approval</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { refetchRoles(); refetchGovernance(); }}
            className="p-2 bg-white border border-[#E2E8F0] rounded-xl text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs"
            title="Refresh Roles"
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setModalError(null);
              setShowCreateModal(true);
            }}
            className="h-10 px-4 rounded-xl text-white text-xs font-extrabold flex items-center gap-2 transition-colors shadow-sm"
            style={{ background: "#4A7B5B" }}
          >
            <Plus className="w-4 h-4" /> Create Access Role
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl p-4 border border-[#F1F5F9] shadow-2xs">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: card.color }} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">{card.value}</div>
              <div className="text-xs font-bold text-[#0F172A] mt-0.5">{card.label}</div>
              <div className="text-xs text-[#94A3B8]">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-4">
        {(["overview", "matrix", "hierarchy", "governance", "audit"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="py-3 px-2 text-xs font-extrabold capitalize border-b-2 transition-all flex items-center gap-1.5"
            style={{
              borderColor: activeTab === tab ? "#4A7B5B" : "transparent",
              color: activeTab === tab ? "#4A7B5B" : "#94A3B8",
            }}
          >
            {tab === "overview" && "Roles Overview"}
            {tab === "matrix" && "Permission Matrix"}
            {tab === "hierarchy" && "Role Hierarchy"}
            {tab === "governance" && (
              <span className="flex items-center gap-1.5">
                Governance Approvals
                {governanceRequests.filter(g => g.status === "PENDING").length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                    {governanceRequests.filter(g => g.status === "PENDING").length}
                  </span>
                )}
              </span>
            )}
            {tab === "audit" && "Audit Trail"}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {["ALL", "ACTIVE", "DISABLED", "LOCKED", "ARCHIVED", "PROTECTED"].map(filter => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === filter
                    ? "bg-[#4A7B5B] text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRoles.map((role) => (
              <div
                key={role.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-2xs hover:border-[#4A7B5B]/50 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-2xs" style={{ background: role.color || "#4A7B5B" }}>
                        {(role.name || "R").charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{role.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-bold text-gray-400">{role.department || "General"}</span>
                          <span className="text-[10px] text-slate-400">• Level {role.level}</span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={role.status || "ACTIVE"} />
                  </div>

                  <p className="text-xs text-gray-500 line-clamp-2 min-h-[32px]">{role.description}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {role.isProtected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <Shield size={10} /> Protected
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                      Scope: {role.dataScope || "GLOBAL"}
                    </span>
                    {role.parentRole && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                        Reports to: {role.parentRole.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Role Lifecycle Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-1">
                  <span className="text-xs text-gray-500 font-semibold">{role.userCount} Users</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setReparentModalRole(role);
                        setNewParentId(role.parentId || "");
                      }}
                      title="Re-parent Role Hierarchy"
                      className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      <ArrowLeftRight size={14} />
                    </button>

                    {role.status === "ACTIVE" ? (
                      <button
                        type="button"
                        onClick={() => disableMutation.mutate(role.id)}
                        title="Disable Role"
                        className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                      >
                        <ZapOff size={14} />
                      </button>
                    ) : role.status === "DISABLED" ? (
                      <button
                        type="button"
                        onClick={() => enableMutation.mutate(role.id)}
                        title="Enable Role"
                        className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        <Zap size={14} />
                      </button>
                    ) : null}

                    {role.status === "LOCKED" ? (
                      <button
                        type="button"
                        onClick={() => unlockMutation.mutate(role.id)}
                        title="Unlock Role"
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Unlock size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSecurityLockRole(role);
                          setLockReason("");
                        }}
                        title="Emergency Security Lock"
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Lock size={14} />
                      </button>
                    )}

                    {role.status !== "ARCHIVED" && !role.isProtected && (
                      <button
                        type="button"
                        onClick={() => archiveMutation.mutate(role.id)}
                        title="Archive Role"
                        className="p-1.5 text-gray-400 hover:text-slate-700 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MATRIX TAB */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-base font-bold text-slate-900">Permissions Grid Matrix</h3>
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchModules}
                onChange={e => setSearchModules(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                  <th className="p-3">Module</th>
                  {rolesList.map(r => (
                    <th key={r.id} className="p-3 text-center min-w-[120px]" style={{ color: r.color }}>{r.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MODULES.filter(m => m.label.toLowerCase().includes(searchModules.toLowerCase())).map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                      <m.icon size={14} className="text-[#4A7B5B]" />
                      {m.label}
                    </td>
                    {rolesList.map(r => {
                      const p = r.permissions?.[m.id] || noAccess();
                      return (
                        <td key={r.id} className="p-3 text-center">
                          <div className="flex justify-center gap-1">
                            {PERM_KEYS.map(k => (
                              <PermBadge key={k} perm={k} active={p[k]} onClick={() => handlePermissionChange(r.id, m.id, k)} />
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HIERARCHY TAB */}
      {activeTab === "hierarchy" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Organizational Role Hierarchy</h3>
              <p className="text-xs text-gray-500">Parent roles automatically inherit all downstream permissions across sub-trees.</p>
            </div>
          </div>
          <div className="space-y-1">
            {rolesList.filter(r => !r.parentId || r.level === 1).map(r => (
              <HierarchyNode
                key={r.id}
                role={r}
                roles={rolesList}
                depth={0}
                expandedNodes={expandedNodes}
                onToggle={toggleNode}
                onSelect={role => setSelectedRole(role)}
              />
            ))}
          </div>
        </div>
      )}

      {/* GOVERNANCE APPROVALS TAB */}
      {activeTab === "governance" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Governance & Two-Person Approval Requests</h3>
              <p className="text-xs text-gray-500">Critical operations on protected IAM roles require peer authorization from an independent Super Admin.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                  <th className="p-3">Action</th>
                  <th className="p-3">Target Role</th>
                  <th className="p-3">Requested By</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {governanceRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400 font-medium">No governance approval requests found.</td>
                  </tr>
                ) : (
                  governanceRequests.map((req) => {
                    const isSelf = user?.id === req.requestedById;
                    return (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-slate-800">{req.actionType}</td>
                        <td className="p-3 font-semibold text-[#4A7B5B]">{req.targetRole?.name || "System"}</td>
                        <td className="p-3 text-slate-700">
                          <div>{req.requestedBy?.fullName || "Admin"}</div>
                          <div className="text-[10px] text-gray-400">{req.requestedBy?.email}</div>
                        </td>
                        <td className="p-3 text-gray-600 max-w-xs">{req.reason}</td>
                        <td className="p-3">
                          {req.status === "PENDING" && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px]">PENDING</span>}
                          {req.status === "APPROVED" && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">APPROVED</span>}
                          {req.status === "REJECTED" && <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[10px]">REJECTED</span>}
                        </td>
                        <td className="p-3">
                          {req.status === "PENDING" && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => approveGovMutation.mutate(req.id)}
                                title={isSelf ? "Self-approval forbidden (Two-Person Rule)" : "Approve & Execute"}
                                className={`px-2.5 py-1 rounded-lg text-white font-bold text-[10px] shadow-2xs ${
                                  isSelf ? "bg-gray-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                                }`}
                              >
                                {isSelf ? "Two-Person Rule" : "Approve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const reason = prompt("Enter rejection reason:");
                                  if (reason) rejectGovMutation.mutate({ id: req.id, reason });
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] hover:bg-rose-100"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {req.status === "APPROVED" && (
                            <span className="text-[10px] text-gray-400">By {req.approvedBy?.fullName || "Super Admin"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUDIT TAB */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-900">IAM Activity & Audit Trail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                  <th className="p-3">Action</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">No IAM audit logs recorded yet.</td>
                  </tr>
                ) : (
                  auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-slate-800">{log.action}</td>
                      <td className="p-3 font-semibold text-[#4A7B5B]">{log.role?.name || "System"}</td>
                      <td className="p-3 text-slate-700">{log.user?.fullName || "System Admin"}</td>
                      <td className="p-3 text-gray-500">{log.reason || "Updated via IAM"}</td>
                      <td className="p-3 text-gray-400">{new Date(log.createdAt).toLocaleString("en-IN")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RE-PARENT MODAL WITH PREVIEW */}
      {reparentModalRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Re-parent Role Hierarchy</h3>
              <button onClick={() => setReparentModalRole(null)} className="text-gray-400 hover:text-slate-800">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Select new parent role for <span className="font-bold text-slate-900">{reparentModalRole.name}</span>. Cycles are dynamically prevented by the backend.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">New Parent Role</label>
              <select
                value={newParentId}
                onChange={e => setNewParentId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
              >
                <option value="">No Parent (Root Role)</option>
                {rolesList.filter(r => r.id !== reparentModalRole.id).map(r => (
                  <option key={r.id} value={r.id}>{r.name} (Level {r.level})</option>
                ))}
              </select>
            </div>

            {previewRes?.data && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-800">Inheritance Preview:</div>
                <div className="text-emerald-700 font-semibold">
                  + Gained Permissions: {previewRes.data.gainedInheritedPermissions?.length || 0}
                </div>
                <div className="text-amber-700 font-semibold">
                  - Lost Permissions: {previewRes.data.lostInheritedPermissions?.length || 0}
                </div>
                {previewRes.data.isCycle && (
                  <div className="text-rose-700 font-bold flex items-center gap-1">
                    <AlertTriangle size={14} /> Cycle detected: Cannot set descendant as parent!
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReparentModalRole(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={previewRes?.data?.isCycle || reparentMutation.isPending}
                onClick={() => reparentMutation.mutate({ id: reparentModalRole.id, parentRoleId: newParentId || null })}
                className="px-4 py-2 rounded-xl text-white text-xs font-extrabold bg-[#4A7B5B] disabled:opacity-50"
              >
                {reparentMutation.isPending ? "Applying..." : "Apply Re-parenting"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY LOCK MODAL */}
      {securityLockRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 border border-gray-100">
            <div className="flex items-center gap-2 text-rose-600">
              <Lock size={20} />
              <h3 className="text-base font-extrabold">Emergency Security Lock</h3>
            </div>
            <p className="text-xs text-gray-600">
              Locking <span className="font-bold text-slate-900">{securityLockRole.name}</span> will immediately revoke active sessions for all assigned users.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">Reason for Security Lock *</label>
              <textarea
                value={lockReason}
                onChange={e => setLockReason(e.target.value)}
                placeholder="e.g. Suspected credential compromise or urgent audit"
                className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-rose-500 h-20 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSecurityLockRole(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!lockReason.trim() || lockMutation.isPending}
                onClick={() => lockMutation.mutate({ id: securityLockRole.id, reason: lockReason.trim() })}
                className="px-4 py-2 rounded-xl text-white text-xs font-extrabold bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              >
                {lockMutation.isPending ? "Locking..." : "Execute Lock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateRoleModal
          roles={rolesList}
          onClose={() => {
            setShowCreateModal(false);
            setModalError(null);
          }}
          onCreate={dto => createMutation.mutate(dto)}
          isSubmitting={createMutation.isPending}
          errorMessage={modalError}
        />
      )}
    </div>
  );
}
