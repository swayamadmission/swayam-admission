import { useState } from "react";
import {
  Shield, Users, Plus, Edit, Trash2, Copy, ChevronRight, ChevronDown,
  X, Search, Check, Eye, FileEdit, FilePlus, FileX, Download, ThumbsUp,
  MapPin, UserCheck, AlertTriangle, Info, Lock, Unlock, Star, Settings,
  BarChart3, BookOpen, Building2, GraduationCap, Brain, Bell, CreditCard,
  Megaphone, Activity, Rss, FolderOpen, Library, Trophy, ZapOff, Zap,
  LayoutDashboard, ChevronUp, UserPlus, ArrowRight, Filter, RefreshCw, Layers,
  CheckCircle2, XCircle, Clock, Key, ArrowLeftRight, Award, Gift, Tag,
  HelpCircle, Headphones, FileText, Archive
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesApi, CreateRoleDto, GovernanceRequest, FormOptionsResponse } from "../../api/roles.api";
import { usePermissions } from "../../hooks/usePermissions";

const COMMON_STATES = [
  "Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "Uttar Pradesh",
  "West Bengal", "Gujarat", "Rajasthan", "Telangana", "Kerala",
  "Madhya Pradesh", "Bihar", "Punjab", "Haryana", "Odisha",
  "Assam", "Jharkhand", "Chhattisgarh", "Uttarakhand", "Himachal Pradesh"
];

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
  // Overview
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },

  // CRM & Staff
  { id: "leads", label: "Leads", icon: Users, group: "CRM & Staff" },
  { id: "tasks", label: "Tasks & Follow-ups", icon: CheckCircle2, group: "CRM & Staff" },
  { id: "students", label: "Students", icon: GraduationCap, group: "CRM & Staff" },
  { id: "referrals", label: "Student Referrals & Rewards", icon: Gift, group: "CRM & Staff" },
  { id: "counselors", label: "Counselors", icon: UserCheck, group: "CRM & Staff" },
  { id: "staff-onboarding", label: "Staff Onboarding & KYC", icon: Shield, group: "CRM & Staff" },
  { id: "applications", label: "Applications", icon: FileText, group: "CRM & Staff" },
  { id: "reporting", label: "Reporting & Enrollment", icon: Award, group: "CRM & Staff" },
  { id: "reviews", label: "Reviews & Moderation", icon: Shield, group: "CRM & Staff" },
  { id: "success-stories", label: "Success Stories", icon: Star, group: "CRM & Staff" },

  // Academic & Partner Portal
  { id: "college-portal", label: "College Partner Portal", icon: Building2, group: "Academic & Partner Portal" },
  { id: "college-rankings", label: "College Rankings Engine", icon: Trophy, group: "Academic & Partner Portal" },
  { id: "colleges", label: "Colleges Directory", icon: Building2, group: "Academic & Partner Portal" },
  { id: "courses", label: "Course Catalog", icon: BookOpen, group: "Academic & Partner Portal" },
  { id: "states", label: "State Management", icon: MapPin, group: "Academic & Partner Portal" },
  { id: "exams", label: "Exams", icon: Trophy, group: "Academic & Partner Portal" },
  { id: "scholarships", label: "Scholarships", icon: Star, group: "Academic & Partner Portal" },
  { id: "materials", label: "Study Materials", icon: Library, group: "Academic & Partner Portal" },

  // Content
  { id: "guides", label: "Career & Admission Guides / CMS", icon: Rss, group: "Content" },
  { id: "faqs", label: "FAQs", icon: HelpCircle, group: "Content" },
  { id: "documents", label: "Documents", icon: FolderOpen, group: "Content" },
  { id: "contacts", label: "Contact Management", icon: Headphones, group: "Content" },

  // Intelligence
  { id: "ai", label: "AI Counselor", icon: Brain, group: "Intelligence" },
  { id: "analytics", label: "Reports & Analytics", icon: BarChart3, group: "Intelligence" },
  { id: "marketing", label: "Marketing", icon: Megaphone, group: "Intelligence" },

  // Operations
  { id: "notifications", label: "Notifications", icon: Bell, group: "Operations" },
  { id: "payments", label: "Payments", icon: CreditCard, group: "Operations" },
  { id: "fee-catalog", label: "Fee Catalog", icon: CreditCard, group: "Operations" },
  { id: "coupons", label: "Coupons & Discounts", icon: Tag, group: "Operations" },
  { id: "support", label: "Help & Support", icon: HelpCircle, group: "Operations" },

  // System
  { id: "organization", label: "Organization Structure", icon: Building2, group: "System" },
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
  formOptions,
  onClose,
  onCreate,
  isSubmitting,
  errorMessage,
}: {
  roles: Role[];
  formOptions?: FormOptionsResponse;
  onClose: () => void;
  onCreate: (dto: CreateRoleDto) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [modalTab, setModalTab] = useState<"basic" | "permissions" | "scope" | "governance">("basic");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState(formOptions?.departments?.[0]?.name || "Admissions");
  const [level, setLevel] = useState(3);
  const [priority, setPriority] = useState(50);
  const [color, setColor] = useState("#4A7B5B");
  const [parentRoleId, setParentRoleId] = useState<string>("");
  const [dataScope, setDataScope] = useState<any>("GLOBAL");
  const [states, setStates] = useState<string[]>([]);
  const [isProtected, setIsProtected] = useState(false);
  const [selfRegistrable, setSelfRegistrable] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, Record<string, boolean>>>({});

  // Dynamic Departments loaded from DB form-options
  const departmentList = Array.from(new Set([
    ...(formOptions?.departments?.map(d => d.name) || []),
    ...roles.map(r => r.department).filter(Boolean) as string[],
    "Admissions", "Executive", "Management", "Finance", "Marketing", "Support", "Academic"
  ]));

  // Dynamic Hierarchy Levels loaded from DB / configuration
  const hierarchyLevels = (formOptions?.levels && formOptions.levels.length > 0)
    ? formOptions.levels.map(l => ({ level: l.level, label: l.label || `Level ${l.level} (${l.name})` }))
    : [
        { level: 1, label: "Level 1 (Executive)" },
        { level: 2, label: "Level 2 (Director)" },
        { level: 3, label: "Level 3 (Regional / State)" },
        { level: 4, label: "Level 4 (Senior)" },
        { level: 5, label: "Level 5 (Operational)" },
        { level: 6, label: "Level 6 (Support / Associate)" },
      ];

  // Dynamic Parent Roles: only active roles, filtered by hierarchy level (parent level must be <= child level)
  const allParentOptions = (formOptions?.parentRoles && formOptions.parentRoles.length > 0)
    ? formOptions.parentRoles
    : roles.filter(r => r.status === "ACTIVE");

  const validParentRoles = allParentOptions.filter(p => p.level <= level);
  const selectedParent = allParentOptions.find(p => p.id === parentRoleId);
  const isHierarchyValid = !selectedParent || level >= selectedParent.level;

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
    const selectedDeptObj = formOptions?.departments?.find(d => d.name.toLowerCase() === department.toLowerCase());
    onCreate({
      name: name.trim(),
      description,
      color,
      level,
      priority,
      department,
      departmentId: selectedDeptObj?.id,
      parentRoleId: parentRoleId || undefined,
      dataScope,
      states,
      stateRestricted: dataScope === "STATE" || dataScope === "DISTRICT" || states.length > 0,
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
              <h3 className="font-extrabold text-[#4A7B5B] text-lg leading-tight">Create Enterprise Access Role</h3>
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
                <label className="text-[#4A7B5B] text-xs font-bold block mb-1">Role Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Regional Finance Head"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#4A7B5B] font-semibold"
                />
              </div>

              <div>
                <label className="text-[#4A7B5B] text-xs font-bold block mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe role duties and operational privileges..."
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#4A7B5B] h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#4A7B5B] text-xs font-bold block mb-1">Department</label>
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
                  >
                    {departmentList.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#4A7B5B] text-xs font-bold block mb-1">Parent Role (Hierarchy)</label>
                  <select
                    value={parentRoleId}
                    onChange={e => setParentRoleId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
                  >
                    <option value="">No Parent (Root Role)</option>
                    {validParentRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.name} (Level {r.level})</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Filtered by selected Level {level} (authority ≥ child)
                  </span>
                </div>

                <div>
                  <label className="text-[#4A7B5B] text-xs font-bold block mb-1">Hierarchy Level</label>
                  <select
                    value={level}
                    onChange={e => setLevel(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
                  >
                    {hierarchyLevels.map(lvl => (
                      <option key={lvl.level} value={lvl.level}>{lvl.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!isHierarchyValid && selectedParent && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                  <span>Hierarchy warning: Child role level ({level}) cannot have higher authority than parent role (Level {selectedParent.level}).</span>
                </div>
              )}
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
                <label className="text-[#4A7B5B] text-xs font-bold block mb-1">Data Scope Access</label>
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

              {(dataScope === "STATE" || dataScope === "DISTRICT") && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="text-[#4A7B5B] text-xs font-bold block">Assigned Territory States</label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 rounded-xl bg-slate-50 border border-gray-100">
                    {COMMON_STATES.map(st => {
                      const isSelected = states.includes(st);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setStates(prev => isSelected ? prev.filter(s => s !== st) : [...prev, st]);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                            isSelected
                              ? "bg-[#4A7B5B] text-white shadow-2xs"
                              : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {st} {isSelected ? "✓" : "+"}
                        </button>
                      );
                    })}
                  </div>
                  {states.length > 0 && (
                    <p className="text-[11px] text-[#4A7B5B] font-medium">Selected: {states.join(", ")}</p>
                  )}
                </div>
              )}
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
            disabled={
              isSubmitting ||
              !name.trim() ||
              (!!roles.find(r => r.id === parentRoleId) && level < roles.find(r => r.id === parentRoleId)!.level)
            }
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

function EditRoleModal({
  role,
  roles,
  formOptions,
  onClose,
  onUpdate,
  isSubmitting,
  errorMessage,
}: {
  role: Role;
  roles: Role[];
  formOptions?: FormOptionsResponse;
  onClose: () => void;
  onUpdate: (dto: Partial<CreateRoleDto>) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [modalTab, setModalTab] = useState<"basic" | "permissions" | "scope" | "governance">("basic");
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || "");
  const [department, setDepartment] = useState(role.department || formOptions?.departments?.[0]?.name || "Admissions");
  const [level, setLevel] = useState(role.level || 5);
  const [priority, setPriority] = useState(role.priority || 50);
  const [color, setColor] = useState(role.color || "#4A7B5B");
  const [parentRoleId, setParentRoleId] = useState<string>(role.parentId || "");
  const [dataScope, setDataScope] = useState<any>(role.dataScope || "GLOBAL");
  const [states, setStates] = useState<string[]>(role.states || []);
  const [isProtected, setIsProtected] = useState(role.isProtected || false);
  const [selfRegistrable, setSelfRegistrable] = useState(role.selfRegistrable || false);
  const [approvalRequired, setApprovalRequired] = useState(role.approvalRequired !== false);
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, Record<string, boolean>>>(role.permissions || {});

  // Dynamic Departments loaded from DB form-options
  const departmentList = Array.from(new Set([
    ...(formOptions?.departments?.map(d => d.name) || []),
    ...roles.map(r => r.department).filter(Boolean) as string[],
    "Admissions", "Executive", "Management", "Finance", "Marketing", "Support", "Academic"
  ]));

  // Dynamic Hierarchy Levels loaded from DB / configuration
  const hierarchyLevels = (formOptions?.levels && formOptions.levels.length > 0)
    ? formOptions.levels.map(l => ({ level: l.level, label: l.label || `Level ${l.level} (${l.name})` }))
    : [
        { level: 1, label: "Level 1 (Executive)" },
        { level: 2, label: "Level 2 (Director)" },
        { level: 3, label: "Level 3 (Regional / State)" },
        { level: 4, label: "Level 4 (Senior)" },
        { level: 5, label: "Level 5 (Operational)" },
        { level: 6, label: "Level 6 (Support / Associate)" },
      ];

  // Dynamic Parent Roles: only active non-self roles, filtered by hierarchy level
  const allParentOptions = (formOptions?.parentRoles && formOptions.parentRoles.length > 0)
    ? formOptions.parentRoles.filter(p => p.id !== role.id)
    : roles.filter(r => r.status === "ACTIVE" && r.id !== role.id);

  const validParentRoles = allParentOptions.filter(p => p.level <= level);
  const selectedParent = allParentOptions.find(p => p.id === parentRoleId);
  const isHierarchyValid = !selectedParent || level >= selectedParent.level;
  const isFormValid = name.trim().length >= 2 && !!department && isHierarchyValid;

  const toggleModalPerm = (moduleId: string, perm: PermissionKey) => {
    setPermissionsMatrix(prev => {
      const current = prev[moduleId] || noAccess();
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
    const selectedDeptObj = formOptions?.departments?.find(d => d.name.toLowerCase() === department.toLowerCase());
    onUpdate({
      name: name.trim(),
      description,
      color,
      level,
      priority,
      department,
      departmentId: selectedDeptObj?.id,
      parentRoleId: parentRoleId || undefined,
      dataScope,
      states,
      stateRestricted: dataScope === "STATE" || dataScope === "DISTRICT" || states.length > 0,
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
              <h3 className="font-extrabold text-[#4A7B5B] text-lg leading-tight">Edit Access Role: {role.name}</h3>
              <p className="text-xs text-[#94A3B8]">Update hierarchy level, scope, and permissions matrix</p>
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
                <label className="text-[#4A7B5B] text-xs font-bold block mb-1">Role Name *</label>
                <input
                  type="text"
                  value={name}
                  disabled={role.isProtected}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Senior Regional Counselor"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#4A7B5B] font-semibold disabled:bg-gray-100 disabled:text-gray-500"
                />
                {role.isProtected && (
                  <span className="text-[10px] text-amber-700 mt-1 block">Protected role names cannot be renamed directly.</span>
                )}
              </div>

              <div>
                <label className="text-[#4A7B5B] text-xs font-bold block mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe role duties and operational privileges..."
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#4A7B5B] h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#4A7B5B] text-xs font-bold block mb-1">Department</label>
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
                  >
                    {departmentList.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#4A7B5B] text-xs font-bold block mb-1">Parent Role (Hierarchy)</label>
                  <select
                    value={parentRoleId}
                    onChange={e => setParentRoleId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
                  >
                    <option value="">No Parent (Root Role)</option>
                    {validParentRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.name} (Level {r.level})</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Filtered by selected Level {level} (authority ≥ child)
                  </span>
                </div>

                <div>
                  <label className="text-[#4A7B5B] text-xs font-bold block mb-1">Hierarchy Level</label>
                  <select
                    value={level}
                    onChange={e => setLevel(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
                  >
                    {hierarchyLevels.map(lvl => (
                      <option key={lvl.level} value={lvl.level}>{lvl.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!isHierarchyValid && selectedParent && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                  <span>Hierarchy warning: Child role level ({level}) cannot have higher authority than parent role (Level {selectedParent.level}).</span>
                </div>
              )}
            </div>
          )}

          {modalTab === "permissions" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Configure direct permission matrix. Changes apply to the database immediately upon saving.</p>
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
                <label className="text-[#4A7B5B] text-xs font-bold block mb-1">Data Scope Access</label>
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

              {(dataScope === "STATE" || dataScope === "DISTRICT") && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="text-[#4A7B5B] text-xs font-bold block">Assigned Territory States</label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 rounded-xl bg-slate-50 border border-gray-100">
                    {COMMON_STATES.map(st => {
                      const isSelected = states.includes(st);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setStates(prev => isSelected ? prev.filter(s => s !== st) : [...prev, st]);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                            isSelected
                              ? "bg-[#4A7B5B] text-white shadow-2xs"
                              : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {st} {isSelected ? "✓" : "+"}
                        </button>
                      );
                    })}
                  </div>
                  {states.length > 0 && (
                    <p className="text-[11px] text-[#4A7B5B] font-medium">Selected: {states.join(", ")}</p>
                  )}
                </div>
              )}
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
                    Protected roles require 2-person approval / governance request for mutation or deletion.
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
                  <span className="text-xs font-bold text-blue-950 block">Self-Registration (Staff Onboarding Portal)</span>
                  <span className="text-[11px] text-blue-700 block">
                    Allows candidate onboarding self-selection.
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
                  <span className="text-xs font-bold text-amber-950 block">KYC Verification Required</span>
                  <span className="text-[11px] text-amber-700 block">
                    Staff applicants must submit KYC documents and require Admin approval.
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
            disabled={isSubmitting || !isFormValid}
            className="px-5 py-2 rounded-xl text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            style={{ background: "#4A7B5B" }}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignUserModal({
  role,
  onClose,
  onAssign,
  onRemove,
  isMutating,
}: {
  role: Role;
  onClose: () => void;
  onAssign: (userId: string) => void;
  onRemove: (userId: string) => void;
  isMutating: boolean;
}) {
  const [search, setSearch] = useState("");
  const { data: roleDetailRes } = useQuery({
    queryKey: ["admin_role_users_detail", role.id],
    queryFn: () => rolesApi.getRole(role.id),
  });

  const { data: searchUsersRes } = useQuery({
    queryKey: ["admin_users_search", search],
    queryFn: () => rolesApi.getUsers({ q: search, limit: 10 }),
    enabled: search.trim().length > 1,
  });

  const userRoles: any[] = roleDetailRes?.data?.userRoles || [];
  const searchResults: any[] = searchUsersRes?.data?.data || searchUsersRes?.data || [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs font-bold text-white text-sm" style={{ background: role.color || "#4A7B5B" }}>
              <Users size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">Assign Staff / Users</h3>
              <p className="text-xs text-gray-500">Manage assigned users for role: <span className="font-bold text-slate-800">{role.name}</span></p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Search to assign */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">Search User to Assign</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by full name, email, or mobile..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#4A7B5B]"
              />
            </div>

            {search.trim().length > 1 && (
              <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 bg-slate-50/50 max-h-48 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-xs text-gray-400 text-center">No matching users found</div>
                ) : (
                  searchResults.map((u: any) => {
                    const isAlreadyAssigned = userRoles.some((ur: any) => ur.user?.id === u.id);
                    return (
                      <div key={u.id} className="p-2.5 flex items-center justify-between hover:bg-white transition-colors">
                        <div>
                          <div className="text-xs font-bold text-slate-800">{u.fullName || "User"}</div>
                          <div className="text-[11px] text-gray-400">{u.email} • {u.role}</div>
                        </div>
                        {isAlreadyAssigned ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Assigned
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={() => onAssign(u.id)}
                            className="px-2.5 py-1 rounded-lg text-white font-bold text-[11px] shadow-2xs transition-all disabled:opacity-50"
                            style={{ background: "#4A7B5B" }}
                          >
                            Assign Role
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Currently Assigned Users */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">Currently Assigned Users ({userRoles.length})</span>
            </div>
            {userRoles.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                No users currently assigned to this role.
              </div>
            ) : (
              <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
                {userRoles.map((ur: any) => (
                  <div key={ur.id || ur.user?.id} className="p-3 flex items-center justify-between hover:bg-gray-50/50">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{ur.user?.fullName || "User"}</div>
                      <div className="text-[11px] text-gray-400">{ur.user?.email} • {ur.user?.role}</div>
                    </div>
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => onRemove(ur.user?.id)}
                      title="Remove Role from User"
                      className="px-2.5 py-1 rounded-lg text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-[11px] font-bold transition-all disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-slate-50/50 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-slate-800">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleDetailDrawer({
  role,
  onClose,
  onEdit,
  onAssignUsers,
  onReparent,
  onClone,
  onDisable,
  onEnable,
  onLock,
  onUnlock,
  onArchive,
  onRestore,
  onDeletePermanent,
}: {
  role: Role;
  onClose: () => void;
  onEdit: () => void;
  onAssignUsers: () => void;
  onReparent: () => void;
  onClone: () => void;
  onDisable: () => void;
  onEnable: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDeletePermanent?: () => void;
}) {
  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-lg shadow-sm" style={{ background: role.color || "#4A7B5B" }}>
            {(role.name || "R").charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{role.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={role.status || "ACTIVE"} />
              <span className="text-xs font-semibold text-gray-400">• Level {role.level}</span>
              <span className="text-xs font-semibold text-gray-400">• {role.department || "General"}</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-slate-700 rounded-lg hover:bg-gray-100">
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
        {role.status === "ARCHIVED" && (
          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-slate-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-xs block text-slate-900">Role is Archived</span>
              <span className="text-[11px] text-slate-600 block leading-relaxed">
                This role is deactivated, excluded from active user assignment dropdowns, and removed from role hierarchy trees. You can restore it to Active status or permanently delete it according to RBAC governance rules.
              </span>
            </div>
          </div>
        )}

        <div>
          <span className="text-gray-400 font-bold uppercase text-[10px] block mb-1">Description</span>
          <p className="text-slate-700 leading-relaxed">{role.description || "No description provided."}</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-gray-400 font-bold block text-[10px] uppercase">Data Scope</span>
            <span className="font-extrabold text-[#4A7B5B] text-sm mt-0.5 block">{role.dataScope || "GLOBAL"}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-gray-400 font-bold block text-[10px] uppercase">Assigned Users</span>
            <span className="font-extrabold text-[#4A7B5B] text-sm mt-0.5 block">{role.userCount || 0} Staff</span>
          </div>
        </div>

        {/* Hierarchy Information */}
        <div className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/50 space-y-2">
          <div className="font-bold text-slate-800 flex items-center justify-between">
            <span>Hierarchy Relationship</span>
            {role.status !== "ARCHIVED" && (
              <button
                type="button"
                onClick={onReparent}
                className="text-[#4A7B5B] hover:underline font-semibold text-[11px]"
              >
                Re-parent
              </button>
            )}
          </div>
          <div className="text-gray-600">
            Reports to: <span className="font-bold text-slate-900">{role.parentRole?.name || "Root (No Parent)"}</span>
          </div>
        </div>

        {/* Governance Settings */}
        <div className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/50 space-y-2">
          <div className="font-bold text-slate-800">Governance & Security Controls</div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Protected System Role:</span>
              <span className={`font-bold ${role.isProtected ? "text-emerald-700" : "text-gray-400"}`}>
                {role.isProtected ? "Yes (Guarded)" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Self-Registration:</span>
              <span className="font-bold text-slate-700">{role.selfRegistrable ? "Enabled" : "Disabled"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">KYC & Admin Approval:</span>
              <span className="font-bold text-slate-700">{role.approvalRequired !== false ? "Mandatory" : "Optional"}</span>
            </div>
          </div>
        </div>

        {/* Permissions Matrix Overview */}
        <div>
          <div className="font-bold text-slate-800 mb-2 flex items-center justify-between">
            <span>Permissions Matrix ({MODULES.length} Modules)</span>
          </div>
          <div className="space-y-1 max-h-56 overflow-y-auto border border-gray-100 rounded-xl p-2 bg-slate-50/30">
            {MODULES.map(m => {
              const perms = role.permissions?.[m.id] || noAccess();
              const hasAny = PERM_KEYS.some(k => perms[k]);
              if (!hasAny) return null;
              return (
                <div key={m.id} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-white">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <m.icon size={13} className="text-[#4A7B5B]" />
                    <span>{m.label}</span>
                  </div>
                  <div className="flex gap-1">
                    {PERM_KEYS.map(k => (
                      <PermBadge key={k} perm={k} active={perms[k]} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="p-4 border-t border-gray-100 bg-slate-50/50 flex flex-wrap items-center gap-2">
        {role.status === "ARCHIVED" ? (
          <div className="w-full flex items-center gap-2">
            <button
              type="button"
              onClick={onRestore}
              className="flex-1 py-2 px-3 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw size={14} /> Restore Role to Active
            </button>
            {!role.isProtected && onDeletePermanent && (
              <button
                type="button"
                onClick={onDeletePermanent}
                className="py-2 px-3 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
              >
                <Trash2 size={14} /> Delete Permanently
              </button>
            )}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 py-2 px-3 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
              style={{ background: "#4A7B5B" }}
            >
              <Edit size={14} /> Edit Role
            </button>

            <button
              type="button"
              onClick={onAssignUsers}
              className="py-2 px-3 rounded-xl bg-white border border-gray-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 hover:bg-gray-50"
            >
              <Users size={14} /> Users ({role.userCount})
            </button>

            <button
              type="button"
              onClick={onClone}
              title="Clone Role"
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-slate-800 hover:bg-gray-50"
            >
              <Copy size={14} />
            </button>

            {role.status === "ACTIVE" ? (
              <button
                type="button"
                onClick={onDisable}
                className="py-2 px-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-100"
              >
                <ZapOff size={14} /> Disable
              </button>
            ) : (
              <button
                type="button"
                onClick={onRestore}
                className="py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-100"
              >
                <RefreshCw size={14} /> Restore
              </button>
            )}

            {role.status === "LOCKED" ? (
              <button
                type="button"
                onClick={onUnlock}
                className="py-2 px-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 hover:bg-rose-100"
              >
                <Unlock size={14} /> Unlock
              </button>
            ) : (
              <button
                type="button"
                onClick={onLock}
                className="py-2 px-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 hover:bg-rose-100"
              >
                <Lock size={14} /> Lock
              </button>
            )}

            {!role.isProtected && (
              <button
                type="button"
                onClick={onArchive}
                className="py-2 px-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-700 font-bold text-xs flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Archive
              </button>
            )}
          </>
        )}
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
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [userAssignModalRole, setUserAssignModalRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [searchModules, setSearchModules] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["super-admin", "director"]));
  const [reparentModalRole, setReparentModalRole] = useState<Role | null>(null);
  const [newParentId, setNewParentId] = useState<string>("");
  const [securityLockRole, setSecurityLockRole] = useState<Role | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<Role | null>(null);
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

  const { data: formOptionsRes } = useQuery({
    queryKey: ["admin_roles_form_options"],
    queryFn: () => rolesApi.getFormOptions(),
  });
  const formOptions = formOptionsRes?.data;

  const { data: rolesRes, refetch: refetchRoles } = useQuery({
    queryKey: ["admin_roles"],
    queryFn: () => rolesApi.getRoles({ includeArchived: true }),
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
      queryClient.invalidateQueries({ queryKey: ["admin_roles_audit"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_matrix"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_form_options"] });
      setShowCreateModal(false);
      setModalError(null);
      toast.success("Role created successfully!");
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Failed to create role";
      setModalError(msg);
      toast.error(msg);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateRoleDto> }) =>
      rolesApi.updateRole(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_audit"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_matrix"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_form_options"] });
      setEditingRole(null);
      setSelectedRole(null);
      setModalError(null);
      toast.success("Role updated successfully!");
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Failed to update role";
      setModalError(msg);
      toast.error(msg);
    },
  });

  const updateMatrixMutation = useMutation({
    mutationFn: ({ id, matrix }: { id: string; matrix: any }) => rolesApi.updatePermissionsMatrix(id, matrix),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_matrix"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_audit"] });
      toast.success("Permissions matrix updated successfully!");
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to update permissions matrix");
    },
  });

  const reparentMutation = useMutation({
    mutationFn: ({ id, parentRoleId }: { id: string; parentRoleId: string | null }) =>
      rolesApi.reparentRole(id, parentRoleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_audit"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_form_options"] });
      setReparentModalRole(null);
      toast.success("Role hierarchy updated successfully!");
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to reparent role");
    },
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => rolesApi.disableRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_audit"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_form_options"] });
      toast.success("Role disabled.");
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to disable role");
    },
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => rolesApi.enableRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_audit"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_form_options"] });
      toast.success("Role enabled.");
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to enable role");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => rolesApi.restoreRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_audit"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_matrix"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_form_options"] });
      setSelectedRole(null);
      toast.success("Role restored to Active status.");
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to restore role");
    },
  });

  const lockMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rolesApi.lockRole(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_audit"] });
      setSecurityLockRole(null);
      setLockReason("");
      toast.success("Role locked.");
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to lock role");
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => rolesApi.unlockRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_audit"] });
      toast.success("Role unlocked.");
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to unlock role");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => rolesApi.archiveRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_audit"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_matrix"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_form_options"] });
      setSelectedRole(null);
      toast.success("Role moved to Archived repository.");
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to archive role");
    },
  });

  const deletePermanentMutation = useMutation({
    mutationFn: (id: string) => rolesApi.deleteRole(id, { permanent: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_audit"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_matrix"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_form_options"] });
      setDeleteConfirmRole(null);
      setSelectedRole(null);
      toast.success("Role permanently deleted from database.");
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to permanently delete role");
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      rolesApi.cloneRole(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_roles_audit"] });
      toast.success("Role cloned successfully.");
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to clone role");
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      rolesApi.assignUser(roleId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_role_users_detail"] });
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      rolesApi.removeUser(roleId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin_role_users_detail"] });
      window.dispatchEvent(new CustomEvent("swayam:refresh-permissions"));
    },
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

  const roleCounts: Record<string, number> = {
    ALL: rolesList.length,
    ACTIVE: rolesList.filter(r => r.status === "ACTIVE").length,
    DISABLED: rolesList.filter(r => r.status === "DISABLED").length,
    LOCKED: rolesList.filter(r => r.status === "LOCKED").length,
    ARCHIVED: rolesList.filter(r => r.status === "ARCHIVED").length,
    PROTECTED: rolesList.filter(r => r.isProtected).length,
  };

  const filteredRoles = rolesList.filter(r => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "PROTECTED") return r.isProtected;
    return r.status === statusFilter;
  });

  const activeMatrixRoles = rolesList.filter(r => r.status === "ACTIVE");
  const activeHierarchyRoles = rolesList.filter(r => r.status === "ACTIVE");

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
    { label: "Active Roles", value: stats.activeRoles ?? roleCounts.ACTIVE, icon: CheckCircle2, color: "#10B981", bg: "#D1FAE5", sub: "Live in Production" },
    { label: "Protected Roles", value: stats.protectedRoles ?? roleCounts.PROTECTED, icon: Lock, color: "#7C3AED", bg: "#EDE9FE", sub: "2-Person Guarded" },
    { label: "Pending Approvals", value: stats.pendingApprovals ?? governanceRequests.filter(g => g.status === "PENDING").length, icon: Clock, color: "#F0AE1A", bg: "#FEF3C7", sub: "Governance Queue" },
  ];

  return (
    <div className="p-5 lg:p-8 space-y-6" style={{ background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[#4A7B5B] text-2xl font-extrabold tracking-tight">Enterprise IAM, Role Hierarchy & Governance</h2>
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
              <div className="text-2xl font-extrabold text-[#4A7B5B]">{card.value}</div>
              <div className="text-xs font-bold text-[#4A7B5B] mt-0.5">{card.label}</div>
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
            {tab === "matrix" && (
              <span className="flex items-center gap-1.5">
                Permission Matrix
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                  {activeMatrixRoles.length} Active
                </span>
              </span>
            )}
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === filter
                    ? "bg-[#4A7B5B] text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {filter === "ARCHIVED" && <Archive size={12} />}
                <span>{filter}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    statusFilter === filter
                      ? "bg-white/20 text-white"
                      : filter === "ARCHIVED" && (roleCounts.ARCHIVED || 0) > 0
                      ? "bg-slate-200 text-slate-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {roleCounts[filter] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {statusFilter === "ARCHIVED" && (
            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  <Archive size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Archived Roles Repository</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Archived roles are deactivated and hidden from active user assignments and role hierarchy trees. Admins can restore them to Active status or permanently delete them according to RBAC governance rules.
                  </p>
                </div>
              </div>
            </div>
          )}

          {filteredRoles.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400">
              {statusFilter === "ARCHIVED" ? "No archived roles found in the repository." : "No roles match the selected filter."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRoles.map((role) => (
                <div
                  key={role.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button")) return;
                    setSelectedRole(role);
                  }}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-2xs hover:border-[#4A7B5B]/50 transition-all space-y-4 flex flex-col justify-between cursor-pointer"
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
                    {role.status === "ARCHIVED" ? (
                      <span
                        className="text-xs text-slate-400 font-semibold flex items-center gap-1 px-1 py-0.5"
                        title="Archived roles cannot have users assigned until restored."
                      >
                        <Users size={13} /> {role.userCount} Users
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setUserAssignModalRole(role)}
                        className="text-xs text-gray-500 hover:text-[#4A7B5B] font-semibold flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-100"
                        title="Manage assigned users"
                      >
                        <Users size={13} /> {role.userCount} Users
                      </button>
                    )}

                    {role.status === "ARCHIVED" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => restoreMutation.mutate(role.id)}
                          title="Restore Role to Active"
                          className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <RefreshCw size={13} /> Restore
                        </button>
                        {!role.isProtected && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmRole(role)}
                            title="Permanently Delete Role from Database"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setModalError(null);
                            setEditingRole(role);
                          }}
                          title="Edit Role"
                          className="p-1.5 text-gray-400 hover:text-[#4A7B5B] rounded-lg hover:bg-emerald-50 transition-colors"
                        >
                          <Edit size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => cloneMutation.mutate({ id: role.id })}
                          title="Clone Role"
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Copy size={14} />
                        </button>

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
                        ) : (
                          <button
                            type="button"
                            onClick={() => restoreMutation.mutate(role.id)}
                            title="Restore / Re-enable Role"
                            className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}

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

                        {!role.isProtected && (
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
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MATRIX TAB */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Permissions Grid Matrix</h3>
              <p className="text-xs text-gray-500">Live operational permissions matrix for all active enterprise roles ({activeMatrixRoles.length}).</p>
            </div>
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
                  {activeMatrixRoles.map(r => (
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
                    {activeMatrixRoles.map(r => {
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
              <p className="text-xs text-gray-500">Parent roles automatically inherit all downstream permissions across sub-trees ({activeHierarchyRoles.length} active roles).</p>
            </div>
          </div>
          <div className="space-y-1">
            {activeHierarchyRoles.filter(r => !r.parentId || r.level === 1).map(r => (
              <HierarchyNode
                key={r.id}
                role={r}
                roles={activeHierarchyRoles}
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
          formOptions={formOptions}
          onClose={() => {
            setShowCreateModal(false);
            setModalError(null);
          }}
          onCreate={dto => createMutation.mutate(dto)}
          isSubmitting={createMutation.isPending}
          errorMessage={modalError}
        />
      )}

      {/* Role Details Drawer */}
      {selectedRole && (
        <RoleDetailDrawer
          role={selectedRole}
          onClose={() => setSelectedRole(null)}
          onEdit={() => {
            setModalError(null);
            setEditingRole(selectedRole);
          }}
          onAssignUsers={() => {
            setUserAssignModalRole(selectedRole);
          }}
          onReparent={() => {
            setReparentModalRole(selectedRole);
            setNewParentId(selectedRole.parentId || "");
          }}
          onClone={() => {
            cloneMutation.mutate({ id: selectedRole.id });
          }}
          onDisable={() => disableMutation.mutate(selectedRole.id)}
          onEnable={() => enableMutation.mutate(selectedRole.id)}
          onLock={() => {
            setSecurityLockRole(selectedRole);
            setLockReason("");
          }}
          onUnlock={() => unlockMutation.mutate(selectedRole.id)}
          onArchive={() => archiveMutation.mutate(selectedRole.id)}
          onRestore={() => restoreMutation.mutate(selectedRole.id)}
          onDeletePermanent={() => setDeleteConfirmRole(selectedRole)}
        />
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <EditRoleModal
          role={editingRole}
          roles={rolesList}
          formOptions={formOptions}
          onClose={() => {
            setEditingRole(null);
            setModalError(null);
          }}
          onUpdate={dto => updateRoleMutation.mutate({ id: editingRole.id, dto })}
          isSubmitting={updateRoleMutation.isPending}
          errorMessage={modalError}
        />
      )}

      {/* Assign Users Modal */}
      {userAssignModalRole && (
        <AssignUserModal
          role={userAssignModalRole}
          onClose={() => setUserAssignModalRole(null)}
          onAssign={userId => assignUserMutation.mutate({ roleId: userAssignModalRole.id, userId })}
          onRemove={userId => removeUserMutation.mutate({ roleId: userAssignModalRole.id, userId })}
          isMutating={assignUserMutation.isPending || removeUserMutation.isPending}
        />
      )}

      {/* Permanent Delete Confirmation Modal */}
      {deleteConfirmRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 border border-rose-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">Permanently Delete Role</h3>
                <p className="text-xs text-rose-600 font-semibold">Irreversible Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete role <strong className="text-slate-900 font-extrabold">{deleteConfirmRole.name}</strong>?
              This will permanently purge this role and its module permissions from the database. Any child roles will be safely re-parented to the root.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmRole(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletePermanentMutation.isPending}
                onClick={() => deletePermanentMutation.mutate(deleteConfirmRole.id)}
                className="px-4 py-2 rounded-xl text-white text-xs font-extrabold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {deletePermanentMutation.isPending ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
