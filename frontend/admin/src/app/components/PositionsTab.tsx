import React, { useState, useEffect } from 'react';
import {
  Building,
  Users,
  Mail,
  Shield,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  ChevronRight,
  X,
  Lock,
  KeyRound,
  FileText,
  MapPin,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { positionsApi, PositionItem } from '../../api/positions.api';
import { staffOnboardingApi } from '../../api/staff-onboarding.api';
import { organizationApi, Department, Unit, StateItem, DistrictItem } from '../../api/organization.api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

interface PositionsTabProps {
  departments: Department[];
  states: StateItem[];
}

export const PositionsTab: React.FC<PositionsTabProps> = ({ departments, states }) => {
  const queryClient = useQueryClient();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vacantOnly, setVacantOnly] = useState(false);

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PositionItem | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetPosition, setTargetPosition] = useState<PositionItem | null>(null);

  // Form State for Create/Edit Position
  const [positionForm, setPositionForm] = useState({
    title: '',
    code: '',
    description: '',
    departmentId: '',
    unitId: '',
    roleId: '',
    stateId: '',
    districtId: '',
    companyEmail: '',
    isMultiHolder: false,
    selfServicePasswordReset: false,
  });

  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<DistrictItem[]>([]);
  const [previewEmailAddress, setPreviewEmailAddress] = useState('');

  // Assign form
  const [assignForm, setAssignForm] = useState({
    userId: '',
    reason: 'MANUAL_ASSIGNMENT',
    notes: '',
    forcePasswordChange: true,
  });

  // Transfer form
  const [transferForm, setTransferForm] = useState({
    targetPositionId: '',
    reason: 'TRANSFER',
    notes: '',
  });

  // Admin Security Reset Modal State
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [securityTargetUser, setSecurityTargetUser] = useState<any>(null);
  const [passwordResetReason, setPasswordResetReason] = useState('Security Incident');
  const [passwordResetCustomReason, setPasswordResetCustomReason] = useState('');
  const [customTempPassword, setCustomTempPassword] = useState('');
  const [resetSuccessData, setResetSuccessData] = useState<any>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedTempPass, setCopiedTempPass] = useState(false);

  // Query: All Positions
  const {
    data: positions = [],
    isLoading,
    refetch,
  } = useQuery<PositionItem[]>({
    queryKey: [
      'positions',
      searchTerm,
      departmentFilter,
      stateFilter,
      statusFilter,
      vacantOnly,
    ],
    queryFn: () =>
      positionsApi.getPositions({
        search: searchTerm || undefined,
        departmentId: departmentFilter !== 'ALL' ? departmentFilter : undefined,
        stateId: stateFilter !== 'ALL' ? stateFilter : undefined,
        positionStatus: statusFilter !== 'ALL' ? statusFilter : undefined,
        vacantOnly,
      }),
  });

  // Query: Position 360 Detail
  const { data: positionDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['position360', selectedPositionId],
    queryFn: () => positionsApi.getPositionById(selectedPositionId!),
    enabled: !!selectedPositionId,
  });

  // Query: Available Staff Candidates for Assignment
  const { data: staffList } = useQuery({
    queryKey: ['staffCandidatesList'],
    queryFn: () => staffOnboardingApi.getRequests({ limit: 100 }),
  });

  // Live Email Generator Preview
  useEffect(() => {
    if (!positionForm.departmentId) return;

    let rSlug = 'senior-counselor';
    let sCode = '';
    let dName = '';

    if (positionForm.stateId) {
      const st = states.find((s) => s.id === positionForm.stateId);
      if (st) sCode = st.code;
    }
    if (positionForm.districtId) {
      const dst = availableDistricts.find((d) => d.id === positionForm.districtId);
      if (dst) dName = dst.name;
    }

    positionsApi
      .previewEmail({
        roleSlug: rSlug,
        stateCode: sCode,
        districtName: dName,
      })
      .then((res) => {
        setPreviewEmailAddress(res.generatedEmail);
      })
      .catch(() => {});
  }, [positionForm.departmentId, positionForm.stateId, positionForm.districtId]);

  const handleDeptChange = async (deptId: string) => {
    setPositionForm((f) => ({ ...f, departmentId: deptId, unitId: '' }));
    if (deptId) {
      try {
        const u = await organizationApi.getUnits({ departmentId: deptId });
        setAvailableUnits(u);
      } catch {
        setAvailableUnits([]);
      }
    } else {
      setAvailableUnits([]);
    }
  };

  const handleStateChange = async (stId: string) => {
    setPositionForm((f) => ({ ...f, stateId: stId, districtId: '' }));
    if (stId) {
      try {
        const d = await organizationApi.getDistricts(stId);
        setAvailableDistricts(d);
      } catch {
        setAvailableDistricts([]);
      }
    } else {
      setAvailableDistricts([]);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPosition(null);
    setPositionForm({
      title: '',
      code: '',
      description: '',
      departmentId: departments[0]?.id || '',
      unitId: '',
      roleId: '',
      stateId: '',
      districtId: '',
      companyEmail: '',
      isMultiHolder: false,
      selfServicePasswordReset: false,
    });
    if (departments[0]?.id) {
      handleDeptChange(departments[0].id);
    }
    setIsCreateModalOpen(true);
  };

  const handleCreateOrUpdateSubmit = async () => {
    if (!positionForm.title.trim() || !positionForm.departmentId) {
      alert('Please fill in title and select department.');
      return;
    }

    try {
      if (editingPosition) {
        await positionsApi.updatePosition(editingPosition.id, {
          title: positionForm.title.trim(),
          description: positionForm.description.trim() || undefined,
          departmentId: positionForm.departmentId,
          unitId: positionForm.unitId || undefined,
          roleId: positionForm.roleId || undefined,
          stateId: positionForm.stateId || undefined,
          districtId: positionForm.districtId || undefined,
          selfServicePasswordReset: positionForm.selfServicePasswordReset,
        });
      } else {
        await positionsApi.createPosition({
          title: positionForm.title.trim(),
          code: positionForm.code.trim() || undefined,
          description: positionForm.description.trim() || undefined,
          departmentId: positionForm.departmentId,
          unitId: positionForm.unitId || undefined,
          roleId: positionForm.roleId || undefined,
          companyEmail: positionForm.companyEmail.trim() || undefined,
          stateId: positionForm.stateId || undefined,
          districtId: positionForm.districtId || undefined,
          isMultiHolder: positionForm.isMultiHolder,
          selfServicePasswordReset: positionForm.selfServicePasswordReset,
        });
      }

      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save position.');
    }
  };

  const handleAssignSubmit = async () => {
    if (!targetPosition || !assignForm.userId) {
      alert('Please select a staff member to assign.');
      return;
    }

    try {
      await positionsApi.assignEmployee(targetPosition.id, {
        userId: assignForm.userId,
        reason: assignForm.reason,
        notes: assignForm.notes.trim() || undefined,
        forcePasswordChange: assignForm.forcePasswordChange,
      });

      alert(
        `Staff member assigned to ${targetPosition.code} (${targetPosition.companyEmail}) successfully.`,
      );
      setIsAssignModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['position360'] });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Assignment failed.');
    }
  };

  const handleTransferSubmit = async () => {
    if (!targetPosition || !transferForm.targetPositionId) {
      alert('Please select a target position.');
      return;
    }

    try {
      await positionsApi.transferEmployee(targetPosition.id, {
        targetPositionId: transferForm.targetPositionId,
        reason: transferForm.reason,
        notes: transferForm.notes.trim() || undefined,
      });

      alert(`Staff transfer completed successfully.`);
      setIsTransferModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['position360'] });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Transfer failed.');
    }
  };

  const handleRetirePosition = async (pos: PositionItem) => {
    const reason = prompt(
      `Are you sure you want to retire ${pos.code} (${pos.title})? Enter reason:`,
      'Administrative restructuring',
    );
    if (reason === null) return;

    try {
      await positionsApi.retirePosition(pos.id, reason);
      alert(`Position ${pos.code} retired successfully.`);
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Retire operation failed.');
    }
  };

  const handleOpenSecurityReset = (user: any) => {
    setSecurityTargetUser(user);
    setPasswordResetReason('Security Incident');
    setPasswordResetCustomReason('');
    const randomTemp = `Sw@yam${Math.random().toString(36).slice(-5)}77!`;
    setCustomTempPassword(randomTemp);
    setResetSuccessData(null);
    setSecurityModalOpen(true);
  };

  const handleExecuteSecurityReset = async () => {
    if (!securityTargetUser) return;
    if (passwordResetReason === 'Other' && !passwordResetCustomReason.trim()) {
      alert('Please enter a custom reason.');
      return;
    }

    try {
      const res = await staffOnboardingApi.adminPasswordReset(
        securityTargetUser.id,
        {
          reason: passwordResetReason,
          customReason: passwordResetCustomReason.trim() || undefined,
          temporaryPassword: customTempPassword.trim() || undefined,
          forcePasswordChange: true,
        },
      );
      setResetSuccessData({
        temporaryPassword: res.temporaryPassword,
        message: res.message,
      });
      queryClient.invalidateQueries({ queryKey: ['position360'] });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Password reset failed.');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(id);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="p-4 rounded-xl bg-white border border-[#F1F5F9] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by position code, title, or company email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-[#4A7B5B] placeholder-slate-400 focus:outline-none focus:border-[#4A7B5B]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#4A7B5B] focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#4A7B5B] focus:outline-none"
          >
            <option value="ALL">All Regions</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#4A7B5B] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Posts</option>
            <option value="VACANT">Vacant Posts</option>
            <option value="RETIRED">Retired Posts</option>
          </select>

          <button
            onClick={() => setVacantOnly(!vacantOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              vacantOnly
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            Vacant Only
          </button>

          <Button
            onClick={handleOpenCreateModal}
            size="sm"
            className="bg-[#4A7B5B] hover:bg-[#3D664B] text-white text-xs h-9 font-semibold shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" /> Create Position
          </Button>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-white hover:bg-gray-50 text-gray-600 border border-[#E2E8F0] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#4A7B5B]">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold tracking-wider border-b border-[#F1F5F9] text-[#64748B]">
              <tr>
                <th className="px-6 py-4">Position / Seat</th>
                <th className="px-6 py-4">Continuous Company Email</th>
                <th className="px-6 py-4">Department & Unit</th>
                <th className="px-6 py-4">Region / Scope</th>
                <th className="px-6 py-4">Current Active Holder</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4A7B5B]" />
                    Loading enterprise positions...
                  </td>
                </tr>
              ) : positions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No organizational positions found.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => {
                  const holder = pos.currentHolder?.user;
                  const isVacant = pos.isVacant || !holder;

                  return (
                    <tr
                      key={pos.id}
                      className="hover:bg-slate-50 transition-colors group text-xs"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                            <Building className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-[#4A7B5B]">{pos.title}</div>
                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {pos.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-emerald-800 font-semibold">
                            {pos.companyEmail}
                          </span>
                          <button
                            onClick={() => handleCopy(pos.companyEmail, pos.id)}
                            className="text-slate-400 hover:text-emerald-700 transition-colors"
                            title="Copy Company Email"
                          >
                            {copiedEmail === pos.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Continuous Organizational Mailbox
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-[#4A7B5B]">
                          {pos.department?.name || 'Central'}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {pos.unit?.name ? `Unit: ${pos.unit.name}` : 'General Dept'}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-[#4A7B5B]">
                          {pos.state?.name || 'All India'}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {pos.district?.name ? `District: ${pos.district.name}` : 'State Scope'}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {isVacant ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-700" /> VACANT
                          </span>
                        ) : (
                          <div>
                            <div className="font-semibold text-[#4A7B5B] flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              {holder.fullName}
                            </div>
                            <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                              <span>ID: {holder.employeeId || 'Active'}</span>
                              <span>•</span>
                              <span>{holder.mobile}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={
                            pos.positionStatus === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]'
                              : pos.positionStatus === 'VACANT'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 text-[10px]'
                              : 'bg-rose-50 text-rose-800 border-rose-200 text-[10px]'
                          }
                        >
                          {pos.positionStatus}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPositionId(pos.id)}
                            className="h-7 text-xs font-semibold text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                          >
                            Position 360
                          </Button>

                          <button
                            onClick={() => {
                              setTargetPosition(pos);
                              setIsAssignModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-white hover:bg-[#E8F3EC] text-slate-500 hover:text-[#4A7B5B] border border-slate-200 shadow-2xs"
                            title="Assign / Reassign Staff"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>

                          {holder && (
                            <button
                              onClick={() => handleOpenSecurityReset(holder)}
                              className="p-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-700 border border-slate-200 shadow-2xs"
                              title="Admin Password Reset"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleRetirePosition(pos)}
                            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 shadow-2xs"
                            title="Retire Position"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === POSITION 360 DRAWER === */}
      {selectedPositionId && positionDetail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl h-full bg-white border-l border-[#E2E8F0] p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#4A7B5B]">
                    {positionDetail.title}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-[#64748B] mt-0.5">
                    <span className="font-mono font-semibold text-emerald-800">
                      {positionDetail.code}
                    </span>
                    <span>•</span>
                    <span className="font-mono">{positionDetail.companyEmail}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPositionId(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#4A7B5B] hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Holder 360 Card */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Current Occupant / Post Holder
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTargetPosition(positionDetail);
                      setIsAssignModalOpen(true);
                    }}
                    className="h-7 text-xs bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1" /> Reassign
                  </Button>
                  {positionDetail.currentHolder && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTargetPosition(positionDetail);
                        setIsTransferModalOpen(true);
                      }}
                      className="h-7 text-xs bg-white border-blue-300 text-blue-800 hover:bg-blue-50"
                    >
                      Transfer
                    </Button>
                  )}
                </div>
              </div>

              {positionDetail.currentHolder ? (
                <div className="bg-white p-4 rounded-xl border border-emerald-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-[#4A7B5B]">
                        {positionDetail.currentHolder.user.fullName}
                      </div>
                      <div className="text-xs text-[#64748B]">
                        Personal Email: {positionDetail.currentHolder.user.personalEmail} • Phone: {positionDetail.currentHolder.user.personalMobile}
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                      ACTIVE HOLDER
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-[#64748B] pt-2 border-t border-slate-100">
                    <div>
                      <span>Occupying Since: </span>
                      <strong className="text-[#4A7B5B]">
                        {new Date(positionDetail.currentHolder.joinedAt).toLocaleDateString()}
                      </strong>
                    </div>
                    <div>
                      <span>Mailbox Access: </span>
                      <strong className="text-emerald-700">GRANTED</strong>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        handleOpenSecurityReset(positionDetail.currentHolder.user)
                      }
                      className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Admin Password Reset
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-white rounded-xl border border-dashed border-amber-300 text-center space-y-2">
                  <div className="text-amber-700 font-bold text-sm">
                    This post is currently VACANT
                  </div>
                  <p className="text-xs text-[#64748B]">
                    No active employee is assigned. All mailbox logins for this post are temporarily paused until an employee is assigned.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setTargetPosition(positionDetail);
                      setIsAssignModalOpen(true);
                    }}
                    className="bg-[#4A7B5B] hover:bg-[#3D664B] text-white text-xs h-8"
                  >
                    Assign Employee to Post
                  </Button>
                </div>
              )}
            </div>

            {/* Historical Assignments Trail */}
            <div className="space-y-3 flex-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#4A7B5B]" />
                Complete Historical Assignment Trail ({positionDetail.assignments?.length || 0})
              </h3>

              <div className="space-y-3">
                {positionDetail.assignments && positionDetail.assignments.length > 0 ? (
                  positionDetail.assignments.map((as: any, idx: number) => {
                    const isActive = as.status === 'ACTIVE';
                    return (
                      <div
                        key={as.id}
                        className={`p-4 rounded-xl border relative pl-6 text-xs space-y-2 ${
                          isActive
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-[#F8FAFC] border-[#E2E8F0]'
                        }`}
                      >
                        <div
                          className={`absolute left-2.5 top-4 w-2.5 h-2.5 rounded-full ${
                            isActive
                              ? 'bg-[#4A7B5B] ring-4 ring-emerald-100'
                              : 'bg-slate-400'
                          }`}
                        />
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#4A7B5B]">
                            {idx + 1}. {as.user?.fullName} ({as.user?.personalEmail})
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 font-bold'
                                : 'bg-slate-100 text-slate-600'
                            }
                          >
                            {as.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[#64748B] text-[11px]">
                          <div>
                            <span>Period: </span>
                            <strong className="text-[#4A7B5B]">
                              {new Date(as.joinedAt).toLocaleDateString()}
                            </strong>{' '}
                            to{' '}
                            <strong className="text-[#4A7B5B]">
                              {as.endedAt ? new Date(as.endedAt).toLocaleDateString() : 'Present'}
                            </strong>
                          </div>
                          <div>
                            <span>Reason: </span>
                            <strong className="text-[#4A7B5B]">{as.changeReason}</strong>
                          </div>
                          <div>
                            <span>Mailbox Handover: </span>
                            <strong
                              className={
                                as.mailboxHandoverStatus === 'GRANTED'
                                  ? 'text-emerald-700'
                                  : 'text-rose-700'
                              }
                            >
                              {as.mailboxHandoverStatus}
                            </strong>
                          </div>
                          <div>
                            <span>Approved By: </span>
                            <strong className="text-[#4A7B5B]">
                              {as.approvedBy?.fullName || 'System'}
                            </strong>
                          </div>
                        </div>

                        {as.notes && (
                          <div className="text-[11px] text-[#475569] bg-white p-2 rounded-md border border-slate-200">
                            Notes: {as.notes}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No historical assignments recorded for this post.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === CREATE / EDIT POSITION MODAL === */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#4A7B5B]">
              {editingPosition ? 'Edit Position' : 'Create Organizational Position / Seat'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs mb-1 block">Position Title *</Label>
                <Input
                  placeholder="e.g. Senior Counselor — Madhubani"
                  value={positionForm.title}
                  onChange={(e) =>
                    setPositionForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="h-9 text-xs border-[#CBD5E1]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Department *</Label>
                  <select
                    value={positionForm.departmentId}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Unit / Team</Label>
                  <select
                    value={positionForm.unitId}
                    onChange={(e) =>
                      setPositionForm((f) => ({ ...f, unitId: e.target.value }))
                    }
                    className="w-full h-9 px-2.5 text-xs border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    <option value="">General Unit</option>
                    {availableUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">State / Region</Label>
                  <select
                    value={positionForm.stateId}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    <option value="">All India Scope</option>
                    {states.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs mb-1 block">District Territory</Label>
                  <select
                    value={positionForm.districtId}
                    onChange={(e) =>
                      setPositionForm((f) => ({ ...f, districtId: e.target.value }))
                    }
                    className="w-full h-9 px-2.5 text-xs border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    <option value="">State-wide</option>
                    {availableDistricts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Preview Email Address */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-emerald-800">
                  Provisioned Continuous Company Email:
                </span>
                <div className="font-mono text-sm font-bold text-emerald-950">
                  {previewEmailAddress || 'senior.counselor@swayamadmission.com'}
                </div>
                <p className="text-[10px] text-emerald-700">
                  This company email belongs continuously to this post.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateOrUpdateSubmit}
                className="bg-[#4A7B5B] hover:bg-[#3D664B] text-white text-xs h-9 font-semibold"
              >
                {editingPosition ? 'Save Changes' : 'Create Position & Mailbox'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* === ASSIGN EMPLOYEE MODAL === */}
      {isAssignModalOpen && targetPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#4A7B5B]">
              Assign Employee to {targetPosition.code}
            </h3>
            <p className="text-xs text-[#64748B]">
              Post: {targetPosition.title} • Email: {targetPosition.companyEmail}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs mb-1 block">Select Staff Member *</Label>
                <select
                  value={assignForm.userId}
                  onChange={(e) =>
                    setAssignForm((f) => ({ ...f, userId: e.target.value }))
                  }
                  className="w-full h-9 px-2.5 text-xs border border-[#CBD5E1] rounded-lg bg-white"
                >
                  <option value="">Select candidate...</option>
                  {staffList?.data?.map((s) => (
                    <option key={s.userId} value={s.userId}>
                      {s.fullName} ({s.personalEmail}) - {s.requestedRoleSlug}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Assignment Reason</Label>
                <select
                  value={assignForm.reason}
                  onChange={(e) =>
                    setAssignForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  className="w-full h-9 px-2.5 text-xs border border-[#CBD5E1] rounded-lg bg-white"
                >
                  <option value="INITIAL_ASSIGNMENT">Initial Assignment</option>
                  <option value="REPLACEMENT">Replacement of Previous Holder</option>
                  <option value="PROMOTION">Promotion</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="MANUAL_ASSIGNMENT">Administrative Override</option>
                </select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Notes</Label>
                <Input
                  placeholder="Optional assignment handover notes"
                  value={assignForm.notes}
                  onChange={(e) =>
                    setAssignForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="h-9 text-xs border-[#CBD5E1]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="forcePassAssign"
                  checked={assignForm.forcePasswordChange}
                  onChange={(e) =>
                    setAssignForm((f) => ({
                      ...f,
                      forcePasswordChange: e.target.checked,
                    }))
                  }
                  className="w-3.5 h-3.5 rounded accent-[#4A7B5B]"
                />
                <Label
                  htmlFor="forcePassAssign"
                  className="text-[11px] text-[#64748B] cursor-pointer"
                >
                  Require candidate password change on login
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAssignSubmit}
                className="bg-[#4A7B5B] hover:bg-[#3D664B] text-white text-xs h-9 font-semibold"
              >
                Confirm Assignment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* === ADMIN PASSWORD RESET MODAL === */}
      {securityModalOpen && securityTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-4">
            <h3 className="text-base font-bold text-[#4A7B5B]">
              Admin Staff Password Reset
            </h3>
            <p className="text-xs text-[#64748B]">
              Staff: {securityTargetUser.fullName} ({securityTargetUser.email})
            </p>

            {resetSuccessData ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{resetSuccessData.message}</span>
                </div>
                <div className="p-3 bg-white border border-emerald-200 rounded-lg flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#4A7B5B]">
                    {resetSuccessData.temporaryPassword}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        resetSuccessData.temporaryPassword || '',
                      );
                      setCopiedTempPass(true);
                      setTimeout(() => setCopiedTempPass(false), 2000);
                    }}
                    className="h-8 text-xs"
                  >
                    {copiedTempPass ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={() => setSecurityModalOpen(false)}
                  className="w-full bg-[#4A7B5B] text-white text-xs h-9"
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  <strong>Instant Session Revocation:</strong> Resetting password invalidates all current sessions for this staff member immediately.
                </div>

                <div>
                  <Label className="text-xs mb-1 block font-semibold">
                    Mandatory Reason *
                  </Label>
                  <select
                    value={passwordResetReason}
                    onChange={(e) => setPasswordResetReason(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    <option value="Security Incident">Security Incident</option>
                    <option value="Resignation">Resignation</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Replacement">Replacement</option>
                    <option value="Forgotten Password">Forgotten Password</option>
                    <option value="Account Recovery">Account Recovery</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {passwordResetReason === 'Other' && (
                  <div>
                    <Label className="text-xs mb-1 block">Custom Reason</Label>
                    <Input
                      placeholder="Specify justification..."
                      value={passwordResetCustomReason}
                      onChange={(e) =>
                        setPasswordResetCustomReason(e.target.value)
                      }
                      className="h-9 text-xs border-[#CBD5E1]"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs mb-1 block">Temporary Password</Label>
                  <Input
                    value={customTempPassword}
                    onChange={(e) => setCustomTempPassword(e.target.value)}
                    className="h-9 text-xs border-[#CBD5E1] font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSecurityModalOpen(false)}
                    className="text-xs h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExecuteSecurityReset}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 font-semibold"
                  >
                    Reset & Revoke Sessions
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
